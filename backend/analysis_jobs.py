"""Backend analysis job progress helpers.

This module keeps the backend API contract for analysis jobs separate from the
legacy Streamlit orchestration. It uses the same progress_<md5>.json convention
as the Streamlit app so a future worker can pick up the same files.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from storage.json_store import read_json, write_json
from video.io import (
    build_background_upload_h264_command,
    ffprobe_video_codecs,
    ffprobe_video_has_readable_duration,
    final_h264_path,
    temp_h264_path,
)
from video.serving import allowed_media_file_path, video_media_allowed_roots
from video.validation import ALLOWED_UPLOAD_VIDEO_EXTENSIONS


TERMINAL_STATUSES = frozenset({"success", "error", "ready_for_ai_worker"})


@dataclass(frozen=True)
class AnalysisJobRequest:
    actor_username: str
    username: str
    video_name: str
    video_path: str
    exercise: str
    options: dict[str, Any]


class BackendAnalysisJobs:
    def __init__(
        self,
        *,
        repo_root: Path,
        upload_dir: Path,
        processed_dir: Path | None = None,
        runner: Callable[[AnalysisJobRequest, Callable[..., None]], dict[str, Any]] | None = None,
        ai_runner: Callable[[AnalysisJobRequest, str, Callable[..., None]], dict[str, Any]] | None = None,
        result_handler: Callable[[AnalysisJobRequest, dict[str, Any]], None] | None = None,
        command_runner: Callable[..., Any] = subprocess.run,
        ffmpeg_threads: int = 2,
        transcode_timeout_seconds: int = 1800,
    ) -> None:
        self.repo_root = repo_root
        self.upload_dir = upload_dir
        self.processed_dir = processed_dir or repo_root / "processed_results"
        self.runner = runner or self._validate_transcode_runner
        self.ai_runner = ai_runner
        self.result_handler = result_handler
        self.command_runner = command_runner
        self.ffmpeg_threads = max(1, int(ffmpeg_threads or 1))
        self.transcode_timeout_seconds = max(30, int(transcode_timeout_seconds or 30))
        self._lock = threading.Lock()
        self._running: dict[str, threading.Thread] = {}

    def configure(self, *, repo_root: Path, upload_dir: Path, processed_dir: Path | None = None) -> None:
        self.repo_root = repo_root
        self.upload_dir = upload_dir
        self.processed_dir = processed_dir or repo_root / "processed_results"

    def job_id_for_video_path(self, video_path: str | os.PathLike[str] | None) -> str:
        normalized = str(video_path or "").replace("\\", "/")
        return hashlib.md5(normalized.encode("utf-8")).hexdigest()

    def progress_file_for_video_path(self, video_path: str | os.PathLike[str] | None) -> Path:
        return self.processed_dir / f"progress_{self.job_id_for_video_path(video_path)}.json"

    def read_progress(self, video_path: str | os.PathLike[str] | None) -> dict[str, Any] | None:
        progress_path = self.progress_file_for_video_path(video_path)
        data = read_json(progress_path, None)
        return data if isinstance(data, dict) else None

    def write_progress(
        self,
        request: AnalysisJobRequest,
        *,
        status: str,
        progress: float,
        status_msg: str = "",
        error_msg: str = "",
        result: dict[str, Any] | None = None,
        start_time: float | None = None,
    ) -> dict[str, Any]:
        existing = self.read_progress(request.video_path) or {}
        started_at = start_time if start_time is not None else existing.get("start_time") or time.time()
        elapsed = max(0.0, time.time() - float(started_at or time.time()))
        data = {
            "job_id": self.job_id_for_video_path(request.video_path),
            "video_path": request.video_path,
            "username": request.username,
            "video_name": request.video_name,
            "exercise": request.exercise,
            "status": status,
            "progress": max(0.0, min(1.0, float(progress or 0.0))),
            "elapsed": elapsed,
            "start_time": started_at,
            "heartbeat": time.time(),
            "status_msg": status_msg,
            "error_msg": error_msg,
            "result": result,
            "job_meta": {
                "requested_by": request.actor_username,
                "options": request.options,
            },
        }
        write_json(self.progress_file_for_video_path(request.video_path), data)
        return data

    def resolve_media_path(self, video_path: str | os.PathLike[str] | None) -> str | None:
        if not video_path:
            return None
        path = Path(str(video_path))
        if not path.is_absolute():
            path = self.repo_root / Path(*[part for part in str(video_path).replace("\\", "/").split("/") if part])
        roots = video_media_allowed_roots(
            data_dir=self.repo_root,
            upload_dir=self.upload_dir,
            processed_dir=self.processed_dir,
        )
        return allowed_media_file_path(path, roots, allowed_extensions=frozenset(ALLOWED_UPLOAD_VIDEO_EXTENSIONS))

    def is_running(self, video_path: str | os.PathLike[str] | None) -> bool:
        job_id = self.job_id_for_video_path(video_path)
        thread = self._running.get(job_id)
        return bool(thread and thread.is_alive())

    def start(self, request: AnalysisJobRequest) -> dict[str, Any]:
        job_id = self.job_id_for_video_path(request.video_path)
        with self._lock:
            thread = self._running.get(job_id)
            if thread and thread.is_alive():
                current = self.read_progress(request.video_path) or {}
                return {
                    "started": False,
                    "reason": "already_running",
                    "job": current,
                }

            started_at = time.time()
            job = self.write_progress(
                request,
                status="processing",
                progress=0.01,
                status_msg="Đã nhận yêu cầu phân tích, đang chuẩn bị video.",
                start_time=started_at,
            )

            def _target() -> None:
                try:
                    self.write_progress(
                        request,
                        status="processing",
                        progress=0.05,
                        status_msg="Đang kiểm tra file video trên backend.",
                        start_time=started_at,
                    )
                    media_path = self.resolve_media_path(request.video_path)
                    if not media_path:
                        self.write_progress(
                            request,
                            status="error",
                            progress=1.0,
                            status_msg="Không tìm thấy file video hợp lệ để phân tích.",
                            error_msg="video file is missing or outside allowed media roots",
                            start_time=started_at,
                        )
                        return

                    def _progress(**kwargs: Any) -> None:
                        self.write_progress(request, start_time=started_at, **kwargs)

                    runner_request = AnalysisJobRequest(
                        actor_username=request.actor_username,
                        username=request.username,
                        video_name=request.video_name,
                        video_path=request.video_path,
                        exercise=request.exercise,
                        options={**request.options, "media_path": media_path},
                    )
                    result = self.runner(runner_request, _progress) or {}
                    if not isinstance(result, dict):
                        result = {}

                    terminal_request = runner_request
                    terminal_status = str(result.get("status") or "ready_for_ai_worker")
                    terminal_result = result
                    terminal_payload = result.get("result") if isinstance(result.get("result"), dict) else None
                    if terminal_status == "ready_for_ai_worker" and self.ai_runner:
                        analysis_input_path = str((terminal_payload or {}).get("analysis_input_path") or media_path)
                        self.write_progress(
                            request,
                            status="processing",
                            progress=max(float(result.get("progress") or 0.0), 0.42),
                            status_msg="Video đã sẵn sàng, đang chạy worker AI.",
                            result=terminal_payload,
                            start_time=started_at,
                        )
                        terminal_request = AnalysisJobRequest(
                            actor_username=runner_request.actor_username,
                            username=runner_request.username,
                            video_name=runner_request.video_name,
                            video_path=runner_request.video_path,
                            exercise=runner_request.exercise,
                            options={
                                **runner_request.options,
                                "analysis_input_path": analysis_input_path,
                                "prep_result": result,
                            },
                        )
                        terminal_result = self.ai_runner(terminal_request, analysis_input_path, _progress) or {}
                        if not isinstance(terminal_result, dict):
                            terminal_result = {}
                        terminal_status = str(terminal_result.get("status") or "success")
                        terminal_payload = (
                            terminal_result.get("result") if isinstance(terminal_result.get("result"), dict) else None
                        )

                    terminal_progress = 1.0 if terminal_status in {"success", "error"} else 0.12
                    if terminal_status == "success" and terminal_payload and self.result_handler:
                        self.result_handler(terminal_request, terminal_payload)
                    self.write_progress(
                        request,
                        status=terminal_status,
                        progress=float(terminal_result.get("progress", terminal_progress)),
                        status_msg=str(
                            terminal_result.get("status_msg") or "Video đã sẵn sàng, đang chờ worker AI/transcode."
                        ),
                        error_msg=str(terminal_result.get("error_msg") or ""),
                        result=terminal_payload,
                        start_time=started_at,
                    )
                except Exception as exc:
                    self.write_progress(
                        request,
                        status="error",
                        progress=1.0,
                        status_msg="Lỗi khi chuẩn bị job phân tích.",
                        error_msg=str(exc),
                        start_time=started_at,
                    )
                finally:
                    self._running.pop(job_id, None)

            thread = threading.Thread(target=_target, daemon=True)
            self._running[job_id] = thread
            thread.start()
            return {"started": True, "reason": "", "job": job}

    def _validate_transcode_runner(
        self,
        request: AnalysisJobRequest,
        progress: Callable[..., None],
    ) -> dict[str, Any]:
        media_path = str(request.options.get("media_path") or self.resolve_media_path(request.video_path) or "")
        if not media_path:
            return {
                "status": "error",
                "progress": 1.0,
                "status_msg": "Không tìm thấy file video để chuẩn bị phân tích.",
                "error_msg": "media path is missing",
            }

        progress(
            status="processing",
            progress=0.08,
            status_msg="Đang đọc metadata video bằng ffprobe.",
        )
        if not ffprobe_video_has_readable_duration(media_path, runner=self.command_runner, timeout=10):
            return {
                "status": "error",
                "progress": 1.0,
                "status_msg": "Không đọc được metadata video.",
                "error_msg": "ffprobe could not read video duration",
            }

        video_codec, audio_codec = ffprobe_video_codecs(media_path, runner=self.command_runner, timeout=10)
        ext = Path(media_path).suffix.lower()
        is_h264_mp4 = ext == ".mp4" and video_codec == "h264"
        if is_h264_mp4:
            progress(
                status="processing",
                progress=0.18,
                status_msg="Video đã là MP4/H.264, sẵn sàng cho worker AI.",
            )
            return {
                "status": "ready_for_ai_worker",
                "progress": 0.22,
                "status_msg": "Video đã sẵn sàng cho worker AI.",
                "result": {
                    "analysis_input_path": media_path,
                    "transcoded": False,
                    "video_codec": video_codec,
                    "audio_codec": audio_codec,
                },
            }

        output_path = final_h264_path(media_path)
        if not output_path:
            return {
                "status": "error",
                "progress": 1.0,
                "status_msg": "Không tạo được đường dẫn H.264 đầu ra.",
                "error_msg": "invalid H.264 output path",
            }

        temp_output_path = temp_h264_path(output_path)
        try:
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)
        except OSError:
            pass

        progress(
            status="processing",
            progress=0.24,
            status_msg="Đang chuyển video sang MP4/H.264.",
        )
        cmd = build_background_upload_h264_command(
            media_path,
            temp_output_path,
            ffmpeg_threads=self.ffmpeg_threads,
        )
        result = self.command_runner(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=self.transcode_timeout_seconds,
        )
        if result.returncode != 0:
            return {
                "status": "error",
                "progress": 1.0,
                "status_msg": "FFmpeg không chuyển mã được video.",
                "error_msg": str(getattr(result, "stderr", "") or "ffmpeg failed"),
            }
        if not os.path.exists(temp_output_path) or os.path.getsize(temp_output_path) <= 0:
            return {
                "status": "error",
                "progress": 1.0,
                "status_msg": "FFmpeg không tạo file đầu ra hợp lệ.",
                "error_msg": "transcoded output is missing or empty",
            }

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        os.replace(temp_output_path, output_path)
        progress(
            status="processing",
            progress=0.34,
            status_msg="Đã tạo MP4/H.264, đang kiểm tra file đầu ra.",
        )
        out_video_codec, out_audio_codec = ffprobe_video_codecs(output_path, runner=self.command_runner, timeout=10)
        if out_video_codec != "h264":
            return {
                "status": "error",
                "progress": 1.0,
                "status_msg": "File sau transcode chưa phải H.264.",
                "error_msg": f"unexpected output codec: {out_video_codec or 'unknown'}",
            }

        return {
            "status": "ready_for_ai_worker",
            "progress": 0.40,
            "status_msg": "Video H.264 đã sẵn sàng cho worker AI.",
            "result": {
                "analysis_input_path": output_path,
                "transcoded": True,
                "source_path": media_path,
                "video_codec": out_video_codec,
                "audio_codec": out_audio_codec,
            },
        }
