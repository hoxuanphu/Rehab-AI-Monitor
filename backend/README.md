# Backend API

Backend API rieng cho du an, tach khoi Streamlit frontend theo tung buoc.

Chay backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Endpoint hien co:

- `GET /health`
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /patients`
- `GET /videos`
- `GET /videos/media/{stored_filename}`
- `POST /videos/upload`
- `POST /videos/{stored_filename}/analysis-jobs`
- `GET /videos/{stored_filename}/analysis-jobs/latest`
- `GET /evaluations`
- `GET /symptoms`
- `POST /symptoms`
- `GET /schedules`
- `GET /research-records`

Vi du dang nhap:

```powershell
$login = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/auth/login `
  -ContentType 'application/json' `
  -Body '{"username":"admin","password":"your-password"}'

Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/videos `
  -Headers @{ Authorization = "Bearer $($login.access_token)" }
```

Vi du dang ky benh nhan:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/auth/register `
  -ContentType 'application/json' `
  -Body '{"username":"patient01","full_name":"Patient One","email":"patient01@example.test","password":"patientpass","confirm_password":"patientpass"}'
```

`/auth/register` chi tao tai khoan `Benh nhan`. Tai khoan Bac si, Nghien cuu vien va Quan tri vien can duoc cap boi admin.

Vi du benh nhan khai bao trieu chung:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/symptoms `
  -Headers @{ Authorization = "Bearer $($login.access_token)" } `
  -ContentType 'application/json' `
  -Body '{"full_name":"Patient One","patient_id":"BN001","age":40,"gender":"Nu","exercise":"Codman","symptoms":"Dau vai khi nang tay","vas":5}'
```

Vi du benh nhan upload video:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/videos/upload `
  -Headers @{ Authorization = "Bearer $($login.access_token)" } `
  -Form @{ full_name = "Patient One"; exercise = "Codman"; file = Get-Item ".\sample.mp4" }
```

Vi du xem video da upload qua backend:

```powershell
Invoke-WebRequest `
  -Uri "http://127.0.0.1:8000/videos/media/patient01_clip.mp4" `
  -Headers @{ Authorization = "Bearer $($login.access_token)" } `
  -OutFile ".\preview.mp4"
```

`/videos/media/{stored_filename}` chi tra file nam trong media root cho phep va thuoc video record actor duoc xem theo role/patient scope.

Vi du tao job phan tich cho video:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/videos/patient01_clip.mp4/analysis-jobs" `
  -Headers @{ Authorization = "Bearer $($login.access_token)" }

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/videos/patient01_clip.mp4/analysis-jobs/latest" `
  -Headers @{ Authorization = "Bearer $($login.access_token)" }
```

`POST /videos/{stored_filename}/analysis-jobs` hien chi cho `Nghien cuu vien` va `Quan tri vien`. Endpoint ghi progress JSON theo convention `processed_results/progress_<md5(video_path)>.json`; runner backend hien kiem tra ffprobe, transcode sang MP4/H.264 khi can. Mac dinh job dung o trang thai `ready_for_ai_worker`. Dat `REHAB_BACKEND_ENABLE_AI_RUNNER=1` de backend gan MediaPipe runner opt-in, goi `video.processing.xu_ly_video_day_du`, ghi CSV/metrics/processed video va cap nhat `video_list.json` khi thanh cong.

Frontend Streamlit hien van chay doc lap:

```powershell
.\.venv\Scripts\python.exe -m streamlit run app.py --server.port 8501
```

Bat frontend goi backend API theo tung phan:

```powershell
$env:REHAB_BACKEND_URL="http://127.0.0.1:8000"
$env:REHAB_FRONTEND_USE_BACKEND="1"
.\.venv\Scripts\python.exe -m streamlit run app.py --server.port 8501
```

Neu khong dat `REHAB_FRONTEND_USE_BACKEND=1`, frontend van dung flow JSON local hien co.

Giai doan hien tai:

- Backend doc JSON qua `backend.repository`, khong import `app.py`.
- Auth dung password verifier hien co trong `auth.passwords`.
- Dang ky benh nhan tu phuc vu dung Argon2 va ghi JSON qua locked storage helper.
- Benh nhan co the tao khai bao trieu chung qua API; record duoc gan username theo bearer token.
- Benh nhan co the upload video qua multipart API; file luu vao `patient_uploads/`, metadata ghi `video_list.json`.
- Backend co endpoint media de phuc vu video upload theo bearer token va scope actor.
- Backend co contract job progress cho phan tich video; React co the start/poll job, backend da validate/transcode H.264 va co MediaPipe runner opt-in (`REHAB_BACKEND_ENABLE_AI_RUNNER=1`) de persist metrics/processed_path vao `video_list.json` khi thanh cong.
- Scope theo role/patient dung `auth.permissions`.
- `backend.access` gom response shaping va pseudonymize cho NCV.
- Frontend co `frontend.api_client` va opt-in qua `REHAB_FRONTEND_USE_BACKEND=1`.
- Worker AI/MediaPipe that da co adapter backend opt-in, chua bat mac dinh de tranh thay doi runtime khi chua smoke test tren video that.

AI runner env tuy chon:

- `REHAB_BACKEND_ENABLE_AI_RUNNER=1`: bat backend MediaPipe runner.
- `REHAB_BACKEND_AI_MODEL_TYPE`: mac dinh `MediaPipe Heavy`.
- `REHAB_BACKEND_AI_MIN_CONFIDENCE`: mac dinh `0.5`.
- `REHAB_BACKEND_AI_SKIP_STEP`: mac dinh `0`.
- `REHAB_BACKEND_AI_RESIZE_WIDTH`: mac dinh `720`.
- `REHAB_BACKEND_AI_ENABLE_POSE_CLASSIFIER=1`: bat classifier phu neu dependency/model san sang.
