r"""Standalone backend API.

Run locally:

    .\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

The existing Streamlit app remains available while this API is introduced
incrementally.
"""

from __future__ import annotations

import os
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from auth.accounts import find_user_key, find_user_key_by_email, normalize_auth_text
from auth.passwords import password_record_update, verify_password_record
from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse
from starlette.routing import Route

from auth.permissions import (
    require_actor_patient_scope,
    require_actor_role,
    researcher_view_records_for_actor,
    scope_records_for_actor,
)
from models.schemas import ADMIN_ROLE, DOCTOR_ROLE, PATIENT_ROLE, RESEARCHER_ROLE
from storage.app_json import update_app_json
from video.validation import (
    ALLOWED_UPLOAD_VIDEO_EXTENSIONS,
    MAX_UPLOAD_SIZE_BYTES,
    sanitize_filename,
    upload_video_magic_matches,
)
from video.serving import allowed_media_file_path, video_media_allowed_roots

from backend.access import patient_records_for_actor, scoped_records_for_response
from backend.analysis_jobs import AnalysisJobRequest, BackendAnalysisJobs
from backend.auth import (
    RegistrationError,
    TokenStore,
    authenticate_user,
    bearer_token_from_header,
    public_user_record,
    register_patient_user,
)
from backend.config import BackendConfig
from backend.repository import JsonRepository


config = BackendConfig.from_env()
repo = JsonRepository(config)
tokens = TokenStore()
analysis_jobs = BackendAnalysisJobs(
    repo_root=config.repo_root,
    upload_dir=config.upload_dir,
    processed_dir=config.processed_dir,
)


def json_error(message: str, status_code: int) -> JSONResponse:
    return JSONResponse({"detail": message}, status_code=status_code)


async def health(_request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok"})


async def login(request: Request) -> JSONResponse:
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)
    username = str(payload.get("username") or "")
    password = str(payload.get("password") or "")
    actor = authenticate_user(repo, username, password)
    if not actor:
        return json_error("invalid credentials", 401)
    token = tokens.issue(actor)
    return JSONResponse({"access_token": token, "token_type": "bearer", "user": actor})


async def change_password(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)

    old_password = str(payload.get("old_password") or "")
    new_password = str(payload.get("new_password") or "")
    confirm_password = str(payload.get("confirm_password") or "")
    if not old_password or not new_password:
        return json_error("old_password and new_password are required", 400)
    if len(new_password) < 6:
        return json_error("new password must be at least 6 characters", 400)
    if new_password != confirm_password:
        return json_error("password confirmation does not match", 400)

    username = _clean_text(actor.get("username"))
    updated_user: dict[str, Any] | None = None

    def _update(current: Any) -> dict[str, Any]:
        nonlocal updated_user
        users = current if isinstance(current, dict) else {}
        user_key = find_user_key(users, username)
        if not user_key:
            raise RegistrationError("user not found", 404)
        record = users.get(user_key) or {}
        if not verify_password_record(old_password, record).ok:
            raise RegistrationError("old password is incorrect", 400)
        next_record = {
            **record,
            **password_record_update(new_password, updated_at=_now_iso(), must_change_password=False),
        }
        updated = dict(users)
        updated[user_key] = next_record
        updated_user = public_user_record(user_key, next_record)
        return updated

    try:
        update_app_json(repo.config.users_file, _update, default={})
    except RegistrationError as exc:
        return json_error(str(exc), exc.status_code)
    if not updated_user:
        return json_error("password change failed", 500)

    token = bearer_token_from_header(request.headers.get("authorization"))
    if token and token in tokens._tokens:
        tokens._tokens[token] = dict(updated_user)
    return JSONResponse({"user": updated_user})


async def register(request: Request) -> JSONResponse:
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)
    try:
        actor = register_patient_user(
            repo,
            username=str(payload.get("username") or ""),
            password=str(payload.get("password") or ""),
            confirm_password=str(payload.get("confirm_password") or ""),
            full_name=str(payload.get("full_name") or ""),
            email=str(payload.get("email") or ""),
        )
    except RegistrationError as exc:
        return json_error(str(exc), exc.status_code)
    token = tokens.issue(actor)
    return JSONResponse({"access_token": token, "token_type": "bearer", "user": actor}, status_code=201)


def current_actor(request: Request) -> dict[str, Any] | None:
    token = bearer_token_from_header(request.headers.get("authorization"))
    return tokens.get(token)


def auth_error_if_missing(actor: dict[str, Any] | None) -> JSONResponse | None:
    if not actor:
        return json_error("not authenticated", 401)
    return None


async def me(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    return JSONResponse({"user": actor})


async def logout(request: Request) -> JSONResponse:
    token = bearer_token_from_header(request.headers.get("authorization"))
    tokens.revoke(token)
    return JSONResponse({"ok": True})


def scoped_records(records: list[dict[str, Any]], actor: dict[str, Any]) -> list[dict[str, Any]]:
    users = repo.users()
    return scoped_records_for_response(records, actor, users)


def json_items(items: list[dict[str, Any]]) -> JSONResponse:
    return JSONResponse({"items": items, "count": len(items)})


def _record_api_id(kind: str, record: dict[str, Any], index: int) -> str:
    raw_id = record.get("id")
    if raw_id not in (None, ""):
        return str(raw_id)
    identity = {
        "kind": kind,
        "patient_username": record.get("patient_username") or record.get("username") or record.get("subject_code"),
        "video_name": record.get("video_name") or record.get("video_code"),
        "exercise": record.get("exercise") or record.get("exercise_name"),
        "doctor_username": record.get("doctor_username"),
        "submitted_by": record.get("submitted_by"),
        "time": record.get("time") or record.get("timestamp") or record.get("datetime"),
    }
    blob = json.dumps(identity, ensure_ascii=False, sort_keys=True, default=str)
    digest = hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]
    return f"{kind}:{digest}"


def _with_record_ids(kind: str, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{**record, "id": _record_api_id(kind, record, index)} for index, record in enumerate(records)]


def _scoped_items_with_ids(kind: str, records: list[dict[str, Any]], actor: dict[str, Any]) -> list[dict[str, Any]]:
    visible = scope_records_for_actor(records, actor, repo.users())
    return researcher_view_records_for_actor(_with_record_ids(kind, visible), actor)


def _find_record_by_api_id(kind: str, records: list[dict[str, Any]], record_id: str) -> tuple[int, dict[str, Any]] | None:
    target = str(record_id or "")
    for index, record in enumerate(records):
        if _record_api_id(kind, record, index) == target:
            return index, record
    return None


def _new_record_id(prefix: str) -> str:
    stamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
    return f"{prefix}_{stamp}"


def _clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _clean_text_list(value: Any) -> list[str]:
    if isinstance(value, list):
        raw_items = value
    elif isinstance(value, str):
        raw_items = value.split(",")
    else:
        raw_items = []
    return [_clean_text(item) for item in raw_items if _clean_text(item)]


def _bounded_int(value: Any, *, default: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(maximum, number))


def _now_compact() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _now_display() -> str:
    return datetime.now().strftime("%H:%M - %d/%m/%Y")


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _patient_name_from_users(patient_username: str) -> str:
    record = repo.users().get(patient_username) or {}
    if isinstance(record, dict):
        return _clean_text(record.get("full_name")) or patient_username
    return patient_username


def _public_user_management_record(username: str, record: dict[str, Any]) -> dict[str, Any]:
    return {
        **public_user_record(username, record),
        "assigned_patient_usernames": _clean_text_list(record.get("assigned_patient_usernames")),
        "assigned_doctor_username": _clean_text(record.get("assigned_doctor_username")),
        "team_usernames": _clean_text_list(record.get("team_usernames")),
        "created_at": _clean_text(record.get("created_at")),
        "updated_at": _clean_text(record.get("updated_at")),
    }


def _safe_media_filename(value: Any) -> str | None:
    filename = str(value or "").strip()
    if not filename or filename != os.path.basename(filename):
        return None
    if "\\" in filename or "/" in filename or ".." in filename:
        return None
    return filename


def _path_basename(value: Any) -> str:
    return str(value or "").strip().replace("\\", "/").rsplit("/", maxsplit=1)[-1]


def _relative_media_path(value: str) -> Path:
    return Path(*[part for part in value.replace("\\", "/").split("/") if part])


def _video_record_media_filename(record: dict[str, Any]) -> str:
    stored_filename = str(record.get("stored_filename") or "").strip()
    if stored_filename:
        return _path_basename(stored_filename)
    path = str(record.get("video_path") or record.get("processed_path") or record.get("video_name") or "").strip()
    return _path_basename(path)


def _video_record_media_path(record: dict[str, Any], filename: str) -> Path:
    raw_paths = [
        str(record.get("video_path") or "").strip(),
        str(record.get("processed_path") or "").strip(),
    ]
    for raw_path in raw_paths:
        if not raw_path or _path_basename(raw_path) != filename:
            continue
        path = Path(raw_path)
        if path.is_absolute():
            return path
        return repo.config.repo_root / _relative_media_path(raw_path)
    return repo.config.upload_dir / filename


def _video_media_type(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".webm":
        return "video/webm"
    if ext == ".avi":
        return "video/x-msvideo"
    if ext == ".mkv":
        return "video/x-matroska"
    if ext == ".mov":
        return "video/quicktime"
    return "video/mp4"


ARTIFACT_DEFINITIONS = {
    "processed-video": {
        "label": "Video khung xương",
        "fields": ("processed_path",),
        "extensions": frozenset({".mp4", ".mov", ".m4v", ".webm"}),
        "media_type": "video/mp4",
    },
    "angle-csv": {
        "label": "Tọa độ góc khớp CSV",
        "fields": ("df_path",),
        "extensions": frozenset({".csv"}),
        "media_type": "text/csv",
    },
    "frames-json": {
        "label": "Dữ liệu khung hình JSON",
        "fields": ("all_frames_data_path",),
        "extensions": frozenset({".json"}),
        "media_type": "application/json",
    },
    "frames-zip": {
        "label": "Toàn bộ khung hình ZIP",
        "fields": ("frames_zip_path", "frames_zip"),
        "extensions": frozenset({".zip"}),
        "media_type": "application/zip",
    },
}


def _artifact_candidate_path(record: dict[str, Any], kind: str) -> Path | None:
    definition = ARTIFACT_DEFINITIONS.get(kind)
    if not definition:
        return None
    for field in definition["fields"]:
        raw_path = str(record.get(field) or "").strip()
        if not raw_path:
            continue
        path = Path(raw_path)
        if path.is_absolute():
            return path
        return repo.config.repo_root / _relative_media_path(raw_path)
    return None


def _artifact_roots() -> dict[str, str]:
    return video_media_allowed_roots(
        data_dir=repo.config.repo_root,
        upload_dir=repo.config.upload_dir,
        processed_dir=repo.config.processed_dir,
    )


def _resolve_artifact_path(record: dict[str, Any], kind: str) -> str | None:
    definition = ARTIFACT_DEFINITIONS.get(kind)
    if not definition:
        return None
    return allowed_media_file_path(
        _artifact_candidate_path(record, kind),
        _artifact_roots(),
        allowed_extensions=definition["extensions"],
    )


def _artifact_manifest_item(record: dict[str, Any], stored_filename: str, kind: str) -> dict[str, Any]:
    definition = ARTIFACT_DEFINITIONS[kind]
    path = _resolve_artifact_path(record, kind)
    filename = os.path.basename(path) if path else os.path.basename(str(_artifact_candidate_path(record, kind) or ""))
    item: dict[str, Any] = {
        "kind": kind,
        "label": definition["label"],
        "filename": filename,
        "available": bool(path),
        "download_url": f"/videos/{stored_filename}/analysis-artifacts/{kind}",
    }
    if path:
        try:
            item["size"] = os.path.getsize(path)
        except OSError:
            item["size"] = 0
    return item


def _normalized_path_key(value: Any) -> str:
    return str(value or "").strip().replace("\\", "/")


def _float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _accuracy_from_analysis_result(result: dict[str, Any], metrics: dict[str, Any]) -> float | None:
    for value in (
        result.get("accuracy"),
        metrics.get("do_chinh_xac"),
        metrics.get("ty_le_tong_the"),
        metrics.get("ai_accuracy"),
    ):
        number = _float_or_none(value)
        if number is not None:
            return round(number, 1)
    return None


def _exercise_name_from_analysis_result(request: AnalysisJobRequest, result: dict[str, Any]) -> str:
    exercise = result.get("exercise")
    if isinstance(exercise, dict):
        return _clean_text(exercise.get("ten") or exercise.get("name")) or request.exercise
    return _clean_text(exercise) or request.exercise


def _analysis_result_video_patch(request: AnalysisJobRequest, result: dict[str, Any]) -> dict[str, Any]:
    metrics = result.get("metrics") if isinstance(result.get("metrics"), dict) else {}
    if not metrics and isinstance(result.get("stats"), dict):
        metrics = result["stats"]

    patch: dict[str, Any] = {
        "username": request.username,
        "video_name": request.video_name,
        "exercise": _exercise_name_from_analysis_result(request, result),
        "time": _now_display(),
        "video_path": request.video_path,
        "status": "Đã phân tích",
    }
    optional_fields = {
        "processed_path": result.get("processed_path") or result.get("processed_video_path"),
        "df_path": result.get("df_path"),
        "all_frames_data_path": result.get("all_frames_data_path"),
        "frames_zip": result.get("frames_zip") or result.get("frames_zip_path"),
        "frames_zip_path": result.get("frames_zip_path") or result.get("frames_zip"),
        "sai_so": result.get("sai_so"),
        "giai_doan": result.get("giai_doan"),
    }
    for key, value in optional_fields.items():
        if value not in (None, ""):
            patch[key] = value

    if metrics:
        patch["metrics"] = metrics
    accuracy = _accuracy_from_analysis_result(result, metrics)
    if accuracy is not None:
        patch["accuracy"] = accuracy
    return patch


def _analysis_request_matches_video_record(request: AnalysisJobRequest, record: dict[str, Any]) -> bool:
    request_username = _clean_text(request.username)
    record_username = _clean_text(record.get("username") or record.get("patient_username"))
    if request_username and record_username and record_username != request_username:
        return False

    request_video_path = _normalized_path_key(request.video_path)
    request_basename = _path_basename(request.video_path)
    record_values = [
        record.get("video_path"),
        record.get("processed_path"),
        record.get("stored_filename"),
        record.get("video_name"),
        record.get("original_filename"),
    ]
    for value in record_values:
        record_path = _normalized_path_key(value)
        if request_video_path and record_path == request_video_path:
            return True
        if request_basename and _path_basename(record_path) == request_basename:
            return True
    return bool(request.video_name and _clean_text(record.get("video_name")) == request.video_name)


def _apply_analysis_result_to_video_list(request: AnalysisJobRequest, result: dict[str, Any]) -> None:
    patch = _analysis_result_video_patch(request, result)

    def _update(current: Any) -> list[dict[str, Any]]:
        records = [record for record in (current if isinstance(current, list) else []) if isinstance(record, dict)]
        for record in records:
            if _analysis_request_matches_video_record(request, record):
                record.update({key: value for key, value in patch.items() if value not in (None, "")})
                return records
        return records + [patch]

    update_app_json(repo.config.videos_file, _update, default=[])


def _build_backend_ai_runner() -> Any:
    from backend.ai_runner import BackendAIOptions, BackendMediaPipeAIRunner

    return BackendMediaPipeAIRunner(
        repo_root=repo.config.repo_root,
        database_dir=repo.config.database_dir,
        processed_dir=repo.config.processed_dir,
        options=BackendAIOptions(
            model_type=repo.config.ai_model_type,
            min_confidence=repo.config.ai_min_confidence,
            skip_step=repo.config.ai_skip_step,
            resize_width=repo.config.ai_resize_width,
            force_train_classifier=repo.config.ai_force_train_classifier,
            enable_pose_classifier=repo.config.ai_enable_pose_classifier,
            ffmpeg_threads=repo.config.ai_ffmpeg_threads,
        ),
    )


def _sync_analysis_jobs_config() -> None:
    analysis_jobs.configure(
        repo_root=repo.config.repo_root,
        upload_dir=repo.config.upload_dir,
        processed_dir=repo.config.processed_dir,
    )
    analysis_jobs.result_handler = _apply_analysis_result_to_video_list
    if repo.config.enable_ai_runner:
        analysis_jobs.ai_runner = _build_backend_ai_runner()
    elif getattr(analysis_jobs.ai_runner, "is_backend_mediapipe_ai_runner", False):
        analysis_jobs.ai_runner = None


def _visible_video_record(actor: dict[str, Any], stored_filename: str) -> dict[str, Any] | None:
    visible_videos = scope_records_for_actor(repo.videos(), actor, repo.users())
    return next((item for item in visible_videos if _video_record_media_filename(item) == stored_filename), None)


def _analysis_request_from_record(actor: dict[str, Any], record: dict[str, Any]) -> AnalysisJobRequest:
    filename = _video_record_media_filename(record)
    video_path = str(record.get("video_path") or (Path("patient_uploads") / filename))
    return AnalysisJobRequest(
        actor_username=_clean_text(actor.get("username")),
        username=_clean_text(record.get("username") or record.get("patient_username")),
        video_name=_clean_text(record.get("video_name") or record.get("original_filename") or filename),
        video_path=video_path,
        exercise=_clean_text(record.get("exercise")),
        options={},
    )


async def _save_upload_file(upload: Any, target_path: Path) -> tuple[int, bytes]:
    size = 0
    prefix = b""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with target_path.open("wb") as handle:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                if not isinstance(chunk, bytes):
                    chunk = bytes(chunk)
                if len(prefix) < 64:
                    prefix += chunk[: 64 - len(prefix)]
                size += len(chunk)
                if size > MAX_UPLOAD_SIZE_BYTES:
                    raise ValueError(f"file exceeds {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB")
                handle.write(chunk)
    except Exception:
        try:
            target_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise
    finally:
        try:
            await upload.close()
        except Exception:
            pass
    return size, prefix


async def list_videos(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    videos = scoped_records(repo.videos(), actor)
    return json_items(videos)


async def video_media(request: Request) -> JSONResponse | FileResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error

    filename = _safe_media_filename(request.path_params.get("stored_filename"))
    if not filename:
        return json_error("invalid media filename", 400)

    record = _visible_video_record(actor, filename)
    if record is None:
        return json_error("video not found", 404)

    roots = video_media_allowed_roots(data_dir=repo.config.repo_root, upload_dir=repo.config.upload_dir)
    media_path = allowed_media_file_path(
        _video_record_media_path(record, filename),
        roots,
        allowed_extensions=frozenset(ALLOWED_UPLOAD_VIDEO_EXTENSIONS),
    )
    if not media_path:
        return json_error("video not found", 404)
    return FileResponse(media_path, media_type=_video_media_type(media_path), filename=os.path.basename(media_path))


async def start_analysis_job(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, RESEARCHER_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)

    filename = _safe_media_filename(request.path_params.get("stored_filename"))
    if not filename:
        return json_error("invalid media filename", 400)
    record = _visible_video_record(actor, filename)
    if record is None:
        return json_error("video not found", 404)

    _sync_analysis_jobs_config()
    job_request = _analysis_request_from_record(actor, record)
    result = analysis_jobs.start(job_request)
    return JSONResponse(result, status_code=202 if result.get("started") else 200)


async def latest_analysis_job(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error

    filename = _safe_media_filename(request.path_params.get("stored_filename"))
    if not filename:
        return json_error("invalid media filename", 400)
    record = _visible_video_record(actor, filename)
    if record is None:
        return json_error("video not found", 404)

    _sync_analysis_jobs_config()
    job_request = _analysis_request_from_record(actor, record)
    job = analysis_jobs.read_progress(job_request.video_path)
    if not job:
        return JSONResponse({"job": None})
    return JSONResponse({"job": job})


async def list_analysis_artifacts(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error

    filename = _safe_media_filename(request.path_params.get("stored_filename"))
    if not filename:
        return json_error("invalid media filename", 400)
    record = _visible_video_record(actor, filename)
    if record is None:
        return json_error("video not found", 404)

    items = [_artifact_manifest_item(record, filename, kind) for kind in ARTIFACT_DEFINITIONS]
    metrics = record.get("metrics") if isinstance(record.get("metrics"), dict) else {}
    return JSONResponse(
        {
            "video": {
                "stored_filename": filename,
                "video_name": record.get("video_name") or record.get("original_filename") or filename,
                "exercise": record.get("exercise") or "",
                "status": record.get("status") or "",
                "accuracy": record.get("accuracy"),
            },
            "metrics": metrics,
            "items": items,
            "count": len(items),
        }
    )


async def download_analysis_artifact(request: Request) -> JSONResponse | FileResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error

    filename = _safe_media_filename(request.path_params.get("stored_filename"))
    kind = _clean_text(request.path_params.get("artifact_kind"))
    if not filename:
        return json_error("invalid media filename", 400)
    if kind not in ARTIFACT_DEFINITIONS:
        return json_error("unknown artifact kind", 404)
    record = _visible_video_record(actor, filename)
    if record is None:
        return json_error("video not found", 404)

    artifact_path = _resolve_artifact_path(record, kind)
    if not artifact_path:
        return json_error("artifact not found", 404)
    definition = ARTIFACT_DEFINITIONS[kind]
    return FileResponse(
        artifact_path,
        media_type=definition["media_type"],
        filename=os.path.basename(artifact_path),
    )


async def upload_video(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [PATIENT_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    try:
        form = await request.form()
    except Exception:
        return json_error("invalid multipart form", 400)

    upload = form.get("file")
    original_name = getattr(upload, "filename", "") or ""
    if not upload or not original_name:
        return json_error("video file is required", 400)

    safe_upload_name = sanitize_filename(original_name, fallback="video.mp4")
    base_name, ext = os.path.splitext(safe_upload_name)
    ext = ext.lower()
    if ext not in ALLOWED_UPLOAD_VIDEO_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_UPLOAD_VIDEO_EXTENSIONS))
        return json_error(f"unsupported video format. allowed: {allowed}", 400)

    safe_username = sanitize_filename(str(actor.get("username") or "user"), fallback="user")
    stored_filename = f"{safe_username}_{_now_compact()}_{base_name}{ext}"
    target_path = repo.config.upload_dir / stored_filename
    try:
        size, prefix = await _save_upload_file(upload, target_path)
    except ValueError as exc:
        return json_error(str(exc), 400)
    except OSError as exc:
        return json_error(f"could not save upload: {exc}", 500)

    if size <= 0:
        target_path.unlink(missing_ok=True)
        return json_error("uploaded file is empty", 400)
    if not upload_video_magic_matches(ext, prefix):
        target_path.unlink(missing_ok=True)
        return json_error("uploaded file header does not match video format", 400)

    full_name = _clean_text(form.get("full_name")) or _clean_text(actor.get("full_name")) or _clean_text(actor.get("username"))
    exercise = _clean_text(form.get("exercise"))
    if not exercise:
        target_path.unlink(missing_ok=True)
        return json_error("exercise is required", 400)

    rel_path = Path("patient_uploads") / stored_filename
    item = {
        "username": _clean_text(actor.get("username")),
        "full_name": full_name,
        "video_name": original_name,
        "original_filename": original_name,
        "stored_filename": stored_filename,
        "exercise": exercise,
        "accuracy": 0,
        "time": _now_display(),
        "video_path": str(rel_path),
        "processed_path": None,
        "status": "Chờ NCV phân tích",
    }

    def _append(current: Any) -> list[dict[str, Any]]:
        records = current if isinstance(current, list) else []
        return [record for record in records if isinstance(record, dict)] + [item]

    update_app_json(repo.config.videos_file, _append, default=[])
    return JSONResponse({"item": item}, status_code=201)


async def list_evaluations(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    evaluations = scoped_records(repo.evaluations(), actor)
    return json_items(evaluations)


async def list_patients(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    patients = patient_records_for_actor(repo.users(), actor)
    return json_items(patients)


async def list_admin_users(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    items = [
        _public_user_management_record(username, record)
        for username, record in sorted(repo.users().items())
        if isinstance(record, dict)
    ]
    return json_items(items)


async def create_admin_user(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)

    username = normalize_auth_text(payload.get("username"))
    password = str(payload.get("password") or "")
    role = normalize_auth_text(payload.get("role")) or PATIENT_ROLE
    full_name = normalize_auth_text(payload.get("full_name")) or username
    email = normalize_auth_text(payload.get("email"))
    allowed_roles = {PATIENT_ROLE, DOCTOR_ROLE, RESEARCHER_ROLE, ADMIN_ROLE}
    if not username or not password:
        return json_error("username and password are required", 400)
    if len(username) < 3:
        return json_error("username must be at least 3 characters", 400)
    if len(password) < 6:
        return json_error("password must be at least 6 characters", 400)
    if role not in allowed_roles:
        return json_error("unsupported role", 400)

    created: dict[str, Any] | None = None

    def _add_user(current: Any) -> dict[str, Any]:
        nonlocal created
        users = current if isinstance(current, dict) else {}
        if find_user_key(users, username):
            raise RegistrationError("username already exists", 409)
        if email and find_user_key_by_email(users, email):
            raise RegistrationError("email already exists", 409)
        now = _now_iso()
        record = {
            **password_record_update(password, updated_at=now, must_change_password=True),
            "username": username,
            "full_name": full_name,
            "email": email,
            "role": role,
            "created_at": now,
            "active": True,
            "assigned_patient_usernames": _clean_text_list(payload.get("assigned_patient_usernames")),
            "assigned_doctor_username": _clean_text(payload.get("assigned_doctor_username")),
            "team_usernames": _clean_text_list(payload.get("team_usernames")),
        }
        updated = dict(users)
        updated[username] = record
        created = _public_user_management_record(username, record)
        return updated

    try:
        update_app_json(repo.config.users_file, _add_user, default={})
    except RegistrationError as exc:
        return json_error(str(exc), exc.status_code)
    if not created:
        return json_error("user creation failed", 500)
    return JSONResponse({"item": created}, status_code=201)


async def delete_admin_user(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)

    target_username = normalize_auth_text(request.path_params.get("username"))
    if not target_username:
        return json_error("username is required", 400)
    if target_username.casefold() == "admin" or target_username == actor.get("username"):
        return json_error("this account cannot be deleted from the API", 400)

    deleted: str | None = None

    def _delete(current: Any) -> dict[str, Any]:
        nonlocal deleted
        users = current if isinstance(current, dict) else {}
        user_key = find_user_key(users, target_username)
        if not user_key:
            raise RegistrationError("user not found", 404)
        updated = dict(users)
        updated.pop(user_key, None)
        deleted = user_key
        return updated

    try:
        update_app_json(repo.config.users_file, _delete, default={})
    except RegistrationError as exc:
        return json_error(str(exc), exc.status_code)
    return JSONResponse({"ok": True, "username": deleted})


async def list_symptoms(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    symptoms = scoped_records(repo.symptoms(), actor)
    return json_items(symptoms)


async def create_symptom(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [PATIENT_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)

    symptoms_text = _clean_text(payload.get("symptoms"))
    exercise = _clean_text(payload.get("exercise"))
    full_name = _clean_text(payload.get("full_name")) or _clean_text(actor.get("full_name")) or _clean_text(actor.get("username"))
    patient_id = _clean_text(payload.get("patient_id")) or _clean_text(actor.get("username"))
    gender = _clean_text(payload.get("gender"))
    age = _bounded_int(payload.get("age"), default=0, minimum=0, maximum=120)
    vas = _bounded_int(payload.get("vas"), default=0, minimum=0, maximum=10)

    if not symptoms_text:
        return json_error("symptoms are required", 400)
    if not exercise:
        return json_error("exercise is required", 400)

    item = {
        "username": _clean_text(actor.get("username")),
        "full_name": full_name,
        "patient_id": patient_id,
        "age": age,
        "gender": gender,
        "exercise": exercise,
        "exercises": [exercise],
        "symptoms": symptoms_text,
        "vas": vas,
        "time": _clean_text(payload.get("time")) or "",
    }

    def _append(current: Any) -> list[dict[str, Any]]:
        records = current if isinstance(current, list) else []
        return [record for record in records if isinstance(record, dict)] + [item]

    update_app_json(repo.config.symptoms_file, _append, default=[])
    return JSONResponse({"item": item}, status_code=201)


async def create_evaluation(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)

    patient_username = _clean_text(payload.get("patient_username") or payload.get("username"))
    video_name = _clean_text(payload.get("video_name"))
    exercise = _clean_text(payload.get("exercise"))
    doctor_result = _clean_text(payload.get("doctor_result"))
    if not patient_username:
        return json_error("patient_username is required", 400)
    if not video_name:
        return json_error("video_name is required", 400)
    if doctor_result not in {"Đúng", "Sai", "Gần đúng"}:
        return json_error("doctor_result must be Đúng, Sai, or Gần đúng", 400)
    try:
        require_actor_patient_scope(actor, patient_username, repo.users())
    except PermissionError as exc:
        return json_error(str(exc), 403)

    item = {
        "patient_username": patient_username,
        "doctor_username": _clean_text(actor.get("username")),
        "doctor_name": _clean_text(actor.get("full_name")) or _clean_text(actor.get("username")),
        "video_name": video_name,
        "exercise": exercise,
        "doctor_result": doctor_result,
        "errors": _clean_text_list(payload.get("errors")),
        "comments": _clean_text(payload.get("comments")),
        "comments_ncv": _clean_text(payload.get("comments_ncv")),
        "plan": _clean_text(payload.get("plan")) or "Tiếp tục",
        "time": _now_display(),
    }

    def _upsert(current: Any) -> list[dict[str, Any]]:
        records = [record for record in (current if isinstance(current, list) else []) if isinstance(record, dict)]
        def _same_evaluation(record: dict[str, Any]) -> bool:
            record_exercise = _clean_text(record.get("exercise"))
            same_core = (
                _clean_text(record.get("patient_username")) == item["patient_username"]
                and _clean_text(record.get("video_name")) == item["video_name"]
                and _clean_text(record.get("doctor_username")) == item["doctor_username"]
            )
            exercise_matches = not record_exercise or not item["exercise"] or record_exercise == item["exercise"]
            return same_core and exercise_matches

        records = [
            record
            for record in records
            if not _same_evaluation(record)
        ]
        return records + [item]

    updated = update_app_json(repo.config.evaluations_file, _upsert, default=[])
    item_with_id = _with_record_ids("evaluation", updated)[-1]
    return JSONResponse({"item": item_with_id}, status_code=201)


async def delete_evaluation(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)

    record_id = _clean_text(request.path_params.get("record_id"))
    if not record_id:
        return json_error("record id is required", 400)
    deleted: dict[str, Any] | None = None

    def _delete(current: Any) -> list[dict[str, Any]]:
        nonlocal deleted
        records = [record for record in (current if isinstance(current, list) else []) if isinstance(record, dict)]
        found = _find_record_by_api_id("evaluation", records, record_id)
        if not found:
            raise RegistrationError("evaluation not found", 404)
        index, record = found
        patient_username = _clean_text(record.get("patient_username"))
        require_actor_patient_scope(actor, patient_username, repo.users())
        if actor.get("role") == DOCTOR_ROLE and _clean_text(record.get("doctor_username")) != actor.get("username"):
            raise RegistrationError("only the authoring doctor can delete this evaluation", 403)
        deleted = record
        return records[:index] + records[index + 1 :]

    try:
        update_app_json(repo.config.evaluations_file, _delete, default=[])
    except RegistrationError as exc:
        return json_error(str(exc), exc.status_code)
    except PermissionError as exc:
        return json_error(str(exc), 403)
    return JSONResponse({"ok": True, "item": deleted})


async def list_schedules(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE, PATIENT_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    schedules = scoped_records_for_response(repo.schedules(), actor, repo.users())
    return json_items(_with_record_ids("schedule", schedules))


async def create_schedule(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)

    patient_username = _clean_text(payload.get("patient_username") or payload.get("username"))
    schedule_type = _clean_text(payload.get("type")) or "appointment"
    if schedule_type not in {"appointment", "exercise", "medication"}:
        return json_error("unsupported schedule type", 400)
    if not patient_username:
        return json_error("patient_username is required", 400)
    try:
        require_actor_patient_scope(actor, patient_username, repo.users())
    except PermissionError as exc:
        return json_error(str(exc), 403)

    title = _clean_text(payload.get("title"))
    exercise_name = _clean_text(payload.get("exercise_name"))
    medication_name = _clean_text(payload.get("medication_name"))
    if schedule_type == "appointment" and not title:
        return json_error("title is required for appointment schedules", 400)
    if schedule_type == "exercise" and not exercise_name:
        return json_error("exercise_name is required for exercise schedules", 400)
    if schedule_type == "medication" and not medication_name:
        return json_error("medication_name is required for medication schedules", 400)

    item = {
        "id": _new_record_id("sch"),
        "type": schedule_type,
        "title": title or exercise_name or medication_name,
        "datetime": _clean_text(payload.get("datetime")),
        "date": _clean_text(payload.get("date")),
        "time": _clean_text(payload.get("time")),
        "notes": _clean_text(payload.get("notes")),
        "patient_username": patient_username,
        "patient_name": _patient_name_from_users(patient_username),
        "doctor_username": _clean_text(actor.get("username")),
        "doctor_name": _clean_text(actor.get("full_name")) or _clean_text(actor.get("username")),
        "exercise_name": exercise_name,
        "frequency": _clean_text(payload.get("frequency")),
        "medication_name": medication_name,
        "dosage": _clean_text(payload.get("dosage")),
        "taken": False,
        "status": "Đang theo dõi",
    }

    def _append(current: Any) -> list[dict[str, Any]]:
        records = [record for record in (current if isinstance(current, list) else []) if isinstance(record, dict)]
        return records + [item]

    update_app_json(repo.config.schedules_file, _append, default=[])
    return JSONResponse({"item": item}, status_code=201)


async def delete_schedule(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    record_id = _clean_text(request.path_params.get("record_id"))
    if not record_id:
        return json_error("record id is required", 400)
    deleted: dict[str, Any] | None = None

    def _delete(current: Any) -> list[dict[str, Any]]:
        nonlocal deleted
        records = [record for record in (current if isinstance(current, list) else []) if isinstance(record, dict)]
        found = _find_record_by_api_id("schedule", records, record_id)
        if not found:
            raise RegistrationError("schedule not found", 404)
        index, record = found
        require_actor_patient_scope(actor, _clean_text(record.get("patient_username")), repo.users())
        deleted = record
        return records[:index] + records[index + 1 :]

    try:
        update_app_json(repo.config.schedules_file, _delete, default=[])
    except RegistrationError as exc:
        return json_error(str(exc), exc.status_code)
    except PermissionError as exc:
        return json_error(str(exc), 403)
    return JSONResponse({"ok": True, "item": deleted})


async def list_research_records(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE, RESEARCHER_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    records = _scoped_items_with_ids("research", repo.research_records(), actor)
    return json_items(records)


async def create_research_record(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE, RESEARCHER_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    try:
        payload = await request.json()
    except Exception:
        return json_error("invalid JSON body", 400)

    actor_username = _clean_text(actor.get("username"))
    patient_username = _clean_text(payload.get("patient_username") or payload.get("username"))
    if not patient_username:
        return json_error("patient_username is required", 400)
    try:
        require_actor_patient_scope(actor, patient_username, repo.users())
    except PermissionError as exc:
        return json_error(str(exc), 403)

    exercise = _clean_text(payload.get("exercise"))
    exercises = _clean_text_list(payload.get("exercises")) or ([exercise] if exercise else [])
    item = {
        "id": _new_record_id("res"),
        "patient_username": patient_username,
        "subject_code": _clean_text(payload.get("subject_code")) or patient_username,
        "interviewer": _clean_text(payload.get("interviewer")) or _clean_text(actor.get("full_name")) or actor_username,
        "interview_date": _clean_text(payload.get("interview_date")) or datetime.now().date().isoformat(),
        "age": _bounded_int(payload.get("age"), default=0, minimum=0, maximum=120),
        "gender": _clean_text(payload.get("gender")),
        "region": _clean_text(payload.get("region")),
        "job": _clean_text(payload.get("job")),
        "education": _clean_text(payload.get("education")),
        "department": _clean_text(payload.get("department")),
        "treatment_type": _clean_text(payload.get("treatment_type")),
        "diagnosis": _clean_text(payload.get("diagnosis")),
        "lesion_side": _clean_text(payload.get("lesion_side")),
        "duration": _clean_text(payload.get("duration")),
        "training_side": _clean_text(payload.get("training_side")),
        "pain_level": _clean_text(payload.get("pain_level")),
        "disease_severity": _clean_text(payload.get("disease_severity")),
        "exercises": exercises,
        "exercise": exercise or (exercises[0] if exercises else ""),
        "general_result": _clean_text(payload.get("general_result")),
        "errors": _clean_text_list(payload.get("errors")),
        "plan": _clean_text(payload.get("plan")),
        "specialist_comment": _clean_text(payload.get("specialist_comment")),
        "video_code": _clean_text(payload.get("video_code") or payload.get("video_name")),
        "video_name": _clean_text(payload.get("video_name") or payload.get("video_code")),
        "recording_device": _clean_text(payload.get("recording_device")),
        "recording_angle": _clean_text(payload.get("recording_angle")),
        "camera_distance": _clean_text(payload.get("camera_distance")),
        "submitted_by": actor_username,
        "role": _clean_text(actor.get("role")),
        "timestamp": _now_iso(),
    }

    def _append(current: Any) -> list[dict[str, Any]]:
        records = [record for record in (current if isinstance(current, list) else []) if isinstance(record, dict)]
        return records + [item]

    update_app_json(repo.config.research_file, _append, default=[])
    returned = researcher_view_records_for_actor([item], actor)[0]
    return JSONResponse({"item": returned}, status_code=201)


async def delete_research_record(request: Request) -> JSONResponse:
    actor = current_actor(request)
    auth_error = auth_error_if_missing(actor)
    if auth_error:
        return auth_error
    try:
        require_actor_role(actor, [ADMIN_ROLE, DOCTOR_ROLE, RESEARCHER_ROLE])
    except PermissionError as exc:
        return json_error(str(exc), 403)
    record_id = _clean_text(request.path_params.get("record_id"))
    if not record_id:
        return json_error("record id is required", 400)
    deleted: dict[str, Any] | None = None

    def _delete(current: Any) -> list[dict[str, Any]]:
        nonlocal deleted
        records = [record for record in (current if isinstance(current, list) else []) if isinstance(record, dict)]
        found = _find_record_by_api_id("research", records, record_id)
        if not found:
            raise RegistrationError("research record not found", 404)
        index, record = found
        require_actor_patient_scope(
            actor,
            _clean_text(record.get("patient_username") or record.get("subject_code")),
            repo.users(),
        )
        deleted = record
        return records[:index] + records[index + 1 :]

    try:
        update_app_json(repo.config.research_file, _delete, default=[])
    except RegistrationError as exc:
        return json_error(str(exc), exc.status_code)
    except PermissionError as exc:
        return json_error(str(exc), 403)
    return JSONResponse({"ok": True, "item": deleted})


routes = [
    Route("/health", health, methods=["GET"]),
    Route("/auth/login", login, methods=["POST"]),
    Route("/auth/register", register, methods=["POST"]),
    Route("/auth/me", me, methods=["GET"]),
    Route("/auth/change-password", change_password, methods=["POST"]),
    Route("/auth/logout", logout, methods=["POST"]),
    Route("/admin/users", list_admin_users, methods=["GET"]),
    Route("/admin/users", create_admin_user, methods=["POST"]),
    Route("/admin/users/{username}", delete_admin_user, methods=["DELETE"]),
    Route("/patients", list_patients, methods=["GET"]),
    Route("/videos", list_videos, methods=["GET"]),
    Route("/videos/media/{stored_filename}", video_media, methods=["GET"]),
    Route("/videos/upload", upload_video, methods=["POST"]),
    Route("/videos/{stored_filename}/analysis-jobs", start_analysis_job, methods=["POST"]),
    Route("/videos/{stored_filename}/analysis-jobs/latest", latest_analysis_job, methods=["GET"]),
    Route("/videos/{stored_filename}/analysis-artifacts", list_analysis_artifacts, methods=["GET"]),
    Route("/videos/{stored_filename}/analysis-artifacts/{artifact_kind}", download_analysis_artifact, methods=["GET"]),
    Route("/evaluations", list_evaluations, methods=["GET"]),
    Route("/evaluations", create_evaluation, methods=["POST"]),
    Route("/evaluations/{record_id}", delete_evaluation, methods=["DELETE"]),
    Route("/symptoms", list_symptoms, methods=["GET"]),
    Route("/symptoms", create_symptom, methods=["POST"]),
    Route("/schedules", list_schedules, methods=["GET"]),
    Route("/schedules", create_schedule, methods=["POST"]),
    Route("/schedules/{record_id}", delete_schedule, methods=["DELETE"]),
    Route("/research-records", list_research_records, methods=["GET"]),
    Route("/research-records", create_research_record, methods=["POST"]),
    Route("/research-records/{record_id}", delete_research_record, methods=["DELETE"]),
]


app = Starlette(debug=False, routes=routes)
if config.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.cors_origins),
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
