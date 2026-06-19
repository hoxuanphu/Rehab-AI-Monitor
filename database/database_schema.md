# JSON Database Schema

Ứng dụng vẫn dùng JSON flat-file trong `database/` hoặc `/data` trên HF Spaces. Tất cả file runtime nên được đọc/ghi qua `load_data()` / `save_data()` trong app hoặc `storage/json_store.py`; dữ liệu được normalize bằng `models/schemas.py` trước khi render UI.

## users.json

Root type: object keyed by username.

Required/effective fields per user:

- `username`: string, trùng key.
- `password`: password hash.
- `hash_version`: ví dụ `argon2`.
- `role`: `Bệnh nhân`, `Bác sĩ / KTV PHCN`, `Nghiên cứu viên`, hoặc `Quản trị viên`.
- `full_name`: display name.
- `email`: optional.
- `must_change_password`: boolean.
- `assigned_patient_usernames`: list username bệnh nhân do bác sĩ/KTV phụ trách.
- `assigned_doctor_username`: optional username bác sĩ phụ trách bệnh nhân.
- `team_usernames`: optional list cho nhóm chăm sóc.
- `active`, `created_at`, `updated_at`: metadata.

## video_list.json

Root type: list.

Core fields:

- `username`, `full_name`: bệnh nhân sở hữu video.
- `video_name`, `original_filename`, `stored_filename`.
- `exercise`.
- `video_path`, `processed_path`, `df_path`, `frames_zip_path`, `all_frames_data_path`.
- `accuracy`, `metrics`, `status`, `time`.

UI access is scoped by current actor. Patients see self records, doctors/KTV see assigned patients, researchers see research workflow data, admins see all.

## doctor_evaluations.json

Root type: list.

Fields:

- `patient_username`, `doctor_username`, `doctor_name`.
- `video_name`, `exercise`.
- `doctor_result`, `errors`, `comments`, `comments_ncv`, `plan`.
- `time`.

Records with missing optional fields are filled with defaults. Broken rows missing both `patient_username` and `video_name` are skipped by schema normalization.

## schedules.json

Root type: list.

Fields:

- `id`, `type`: `appointment`, `exercise`, or `medication`.
- `patient_username`, `patient_name`.
- `doctor_username`, `doctor_name`.
- `title`, `datetime`, `notes`.
- Type-specific: `exercise_name`, `frequency`, `medication_name`, `dosage`, `taken`.

Schedule UI is patient-scoped using the same assignment rules as videos/evaluations.

## patient_symptoms.json

Root type: list.

Fields:

- `username`, `full_name`, `patient_id`.
- `age`, `gender`, `symptoms`, `vas`.
- `exercise`, `exercises`, `time`.

Missing `patient_id` is normalized from `username`.

## research_data.json

Root type: list.

Fields:

- `patient_username`, `subject_code`.
- `interviewer`, `interview_date`, `timestamp`.
- `age`, `gender`, `diagnosis`, `duration`, `training_side`, `pain_level`, `disease_severity`.
- `exercises`, `general_result`, `errors`, `plan`, `specialist_comment`.
- `video_code`, `recording_device`, `recording_angle`, `camera_distance`.
- `submitted_by`, `role`.

NCV/researcher views and exports use pseudonymized records by default: direct identifiers and clinical free-text notes are removed before display/export.

## lich_su_tap_luyen.json

Root type: list.

Fields:

- `username`, `full_name`.
- `bai_tap`, `accuracy`, `ngay`, `thoi_gian_tap`.
- Optional AI/metrics fields may be present.

## processed_results/progress_*.json

Root type: object.

Fields:

- `job_id`: md5 of normalized `video_path`.
- `video_path`, `username`, `video_name`, `exercise`.
- `status`: `processing`, `ready_for_ai_worker`, `success`, or `error`.
- `progress`: number from 0 to 1.
- `elapsed`, `start_time`, `heartbeat`.
- `status_msg`, `error_msg`.
- `result`: optional object when analysis finishes or when video is ready for the next stage. For `ready_for_ai_worker`, it can include `analysis_input_path`, `transcoded`, `source_path`, `video_codec`, and `audio_codec`. For `success`, backend AI runners should include fields that can update `video_list.json`, such as `processed_path` or `processed_video_path`, `metrics` or `stats`, `df_path`, `all_frames_data_path`, `frames_zip_path`, `accuracy`, `sai_so`, and `giai_doan`.
- `job_meta`: optional object, including backend request metadata such as `requested_by`.

Backend job endpoints and legacy Streamlit progress use the same file convention so the worker can share progress state. Backend API supports an injectable AI runner hook. Without that hook, jobs stop at `ready_for_ai_worker`. With `REHAB_BACKEND_ENABLE_AI_RUNNER=1`, the backend MediaPipe runner calls `video.processing.xu_ly_video_day_du`; a successful result is persisted back into `video_list.json`.

## Migration

Run an idempotent dry-run first:

```powershell
python -m models.migrate_json --data-dir database --dry-run
```

Apply migration with automatic backups:

```powershell
python -m models.migrate_json --data-dir database
```

## Privacy Configuration

- `ALLOW_NETWORK_TTS=false` by default. When false, audio feedback uses local beep fallback instead of calling gTTS.
- `WEBRTC_STUN_URLS` is empty by default. Set comma-separated STUN/TURN URLs only when the deployment policy permits external WebRTC traversal services.
