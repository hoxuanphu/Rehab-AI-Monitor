# Roadmap React/Backend va Streamlit tuong duong 100%

Ngay tao: 2026-06-21

Muc tieu cua roadmap nay la dua React/backend dat parity 100% voi Streamlit legacy o cac workflow can thiet, sau do co the chuyen React/backend thanh luong van hanh chinh va dong bang Streamlit o che do legacy/demo.

## Dinh nghia parity 100%

React/backend duoc xem la tuong duong 100% voi Streamlit khi:

1. Moi workflow nguoi dung dang can trong Streamlit co API backend, UI React, test va smoke tuong ung.
2. Ket qua phan tich AI, metrics, artifact va report trong React khop voi Streamlit tren cung bo video fixture.
3. Cac tac vu nhay cam an toan hon hoac bang Streamlit: auth, role scope, delete/reset, HF sync, export, audit, backup.
4. Khong con phu thuoc vao Streamlit de xu ly cong viec production hang ngay.
5. Nhung tinh nang Streamlit khong port phai duoc ghi ro la debug/legacy/internal va khong nam trong production scope.

## Trang thai hien tai

React/backend da gan parity cho cac workflow chinh:

- Auth, dang ky, doi mat khau.
- Dashboard theo role.
- Khai bao trieu chung, upload/xem video.
- Ket qua chi tiet, metrics, timeline, artifact download.
- Frame gallery G1/G2/G3 va PASS/NEAR/FAIL.
- Preview chart tu CSV/JSON.
- Analysis job lifecycle: start, cancel, retry, rerun, history.
- Pose classifier train/apply dry-run.
- Hugging Face sync/report co guard.
- Admin audit, revoke session, user ops, cleanup/reset co confirm/backup/audit.
- Static/info pages va feedback.
- CI/build/e2e smoke gate.

Khoang trong can xu ly de dat 100%:

- AI/MediaPipe runner that cua backend dang opt-in, chua bat mac dinh.
- Runtime storage van dung JSON, SQLite/Postgres chua thanh runtime repository.
- Chua co parity export anh chart PNG/SVG neu production van can.
- Chua co API/export cat video theo G1/G2/G3 neu Streamlit workflow can dung.
- Can bo fixture doi chieu Streamlit vs React/backend cho metrics/artifacts/report.
- Can quyet dinh ro cac tinh nang debug/legacy Streamlit se khong port.

## Phase P0 - Lap ma tran parity

Muc tieu: biet chinh xac Streamlit co gi, React/backend co gi, va muc nao can port.

Viec can lam:

- [ ] Liet ke tat ca tab/role/workflow trong Streamlit:
  - Benh nhan.
  - Bac si/KTV.
  - Nghien cuu vien.
  - Quan tri vien.
- [ ] Lap bang doi chieu theo cot:
  - Workflow Streamlit.
  - API backend hien co.
  - UI React hien co.
  - Test/unit/e2e hien co.
  - Trang thai: done / partial / missing / legacy-only.
- [ ] Danh dau cac workflow khong port vi chi la debug/noi bo.
- [ ] Tao file `docs/REACT_STREAMLIT_PARITY_MATRIX.md`.

Tieu chi xong:

- [ ] Khong con noi chung chung "gan tuong duong"; moi workflow co trang thai ro.
- [ ] Moi muc missing/partial co phase xu ly hoac ly do legacy-only.

Verify:

```powershell
rg -n "def hien_thi|with st\\.tabs|st\\.tabs|role|vai trò|Benh nhan|Bac si|Nghien cuu|Quan tri" app.py ui
rg -n "Route\\(|GET /|POST /|DELETE /" backend README.md backend\\README.md
```

## Phase P1 - Bat va verify AI runner backend

Muc tieu: React/backend phan tich video that duoc nhu Streamlit, khong chi tao job/progress.

Viec can lam:

- [ ] Bat `REHAB_BACKEND_ENABLE_AI_RUNNER=1` tren moi truong staging/local.
- [ ] Chay voi bo video fixture nho cho tung bai tap dang ho tro.
- [ ] Doi chieu output voi Streamlit:
  - processed video path.
  - CSV toa do/goc.
  - metrics tong.
  - metrics G1/G2/G3.
  - frame labels PASS/NEAR/FAIL.
  - artifact manifest.
- [ ] Sua sai khac neu backend runner chua persist du lieu giong Streamlit.
- [ ] Them Playwright smoke hoac integration smoke cho job thanh cong that voi fixture nho.

Tieu chi xong:

- [ ] React co the upload -> run AI -> xem ket qua chi tiet ma khong mo Streamlit.
- [ ] Output backend khop Streamlit trong nguong chap nhan da ghi ro.
- [ ] Loi runner khong leak path/token/PII ra UI.

Verify:

```powershell
$env:REHAB_BACKEND_ENABLE_AI_RUNNER="1"
.\.venv\Scripts\python.exe -m pytest tests\unit
cd web
npm run e2e:smoke
```

## Phase P2 - Fixture parity va regression tests

Muc tieu: co bo test chong lech ket qua giua Streamlit logic va backend/React.

Viec can lam:

- [ ] Tao thu muc fixture nho, da sanitize, khong chua PII.
- [ ] Tao script sinh baseline tu Streamlit/core processing.
- [ ] Tao script chay backend pipeline tren cung fixture.
- [ ] So sanh:
  - so frame hop le.
  - max/min/mean angle.
  - rep count neu co.
  - PASS/NEAR/FAIL count.
  - phase summary.
  - artifact list.
- [ ] Dua parity compare vao CI o che do nhe neu fixture du nho.

Tieu chi xong:

- [ ] Co lenh mot dong de kiem tra parity xu ly video.
- [ ] Moi thay doi processing lam lech ket qua se bi phat hien truoc deploy.

Verify:

```powershell
.\.venv\Scripts\python.exe scripts\verify_report_numbers.py
.\.venv\Scripts\python.exe scripts\validate_video_metadata.py
```

## Phase P3 - Dong bo feature UI con thieu

Muc tieu: moi tinh nang production cua Streamlit co trai nghiem React tuong ung.

Viec can lam:

- [ ] Hoan thien symptom form neu React con thieu field nao Streamlit dang dung.
- [ ] Hoan thien doctor/KTV workflow:
  - loc nang cao.
  - export CSV.
  - comment/ket luan gui lai benh nhan.
  - man hinh AI detail phuc vu lam sang.
- [ ] Hoan thien researcher workflow:
  - chon benh nhan/video/bai tap/model.
  - rerun voi cau hinh khac.
  - gui bao cao AI chinh thuc cho bac si/benh nhan.
  - xem audit lich su sua ground-truth.
- [ ] Hoan thien patient workflow:
  - video huong dan/bai tap tham khao.
  - timeline tien trinh.
  - nhan xet bac si va ke hoach tiep theo.
- [ ] Hoan thien admin workflow:
  - storage/model status.
  - export audit log.
  - monitor job/storage/disk.

Tieu chi xong:

- [ ] Tat ca workflow production trong parity matrix deu la done.
- [ ] Playwright smoke co it nhat mot luong cho patient, doctor/KTV, researcher, admin.

Verify:

```powershell
cd web
npm run lint
npm run build
npm run e2e:smoke
```

## Phase P4 - Export va artifact parity

Muc tieu: React/backend tai/xem duoc cac artifact production ma Streamlit dang cung cap.

Viec can lam:

- [ ] Xac nhan production co can export anh chart PNG/SVG hay khong.
- [ ] Neu can:
  - [ ] Them backend endpoint tao/tra chart image.
  - [ ] Them artifact metadata cho chart image.
  - [ ] Them UI download chart image.
  - [ ] Them test size/PII/scope.
- [ ] Xac nhan co can cat video theo G1/G2/G3 hay khong.
- [ ] Neu can:
  - [ ] Them backend job hoac endpoint export clip theo phase.
  - [ ] Them artifact manifest cho phase clips.
  - [ ] Them UI download/play phase clips.
- [ ] Doi chieu danh sach artifact React vs Streamlit.

Tieu chi xong:

- [ ] Khong co artifact production nao chi xem/tai duoc bang Streamlit.
- [ ] Artifact endpoint khong tra local path va ton trong role scope.

## Phase P5 - Storage runtime parity va production switch

Muc tieu: backend co storage production on dinh, khong chi doc/ghi JSON runtime neu can deploy that.

Viec can lam:

- [ ] Quyet dinh SQLite hay Postgres.
- [ ] Neu mot instance/staging nho: uu tien SQLite.
- [ ] Neu multi-instance/concurrent writes: thiet ke Postgres repository.
- [ ] Them repository switch sau config.
- [ ] Migration apply/rollback tren staging copy.
- [ ] Row-count verification giua JSON va DB.
- [ ] Cap nhat backup/restore procedure.

Tieu chi xong:

- [ ] Backend runtime khong bi khoa vao `JsonRepository` neu deploy production yeu cau DB.
- [ ] Migration dry-run/apply/rollback pass.
- [ ] Co tai lieu van hanh storage.

Verify:

```powershell
.\.venv\Scripts\python.exe scripts\migrate_json_to_sqlite.py --repo-root . --dry-run
.\.venv\Scripts\python.exe -m pytest tests\unit
```

## Phase P6 - Security va permission parity

Muc tieu: React/backend khong chi bang Streamlit ma phai an toan hon.

Viec can lam:

- [ ] Patient khong xem duoc du lieu benh nhan khac.
- [ ] Bac si/KTV chi xem benh nhan duoc gan.
- [ ] NCV nhan du lieu pseudonymized theo dung policy.
- [ ] Admin-only routes co test permission.
- [ ] HF token khong xuat hien trong DOM/API response/log client.
- [ ] Delete/reset/export/sync deu co confirm, audit, backup neu can.
- [ ] XSS smoke voi cac field comments/name/notes.

Tieu chi xong:

- [ ] Security grep pass.
- [ ] Unit tests permission pass.
- [ ] Manual smoke khong thay token/PII ngoai scope.

Verify:

```powershell
rg -n "\\?token=|token=\\{HF_TOKEN\\}|HF_TOKEN.*st\\.|st\\..*HF_TOKEN" app.py backend web scripts README.md
rg -n "unsafe_allow_html=True" app.py ui
.\.venv\Scripts\python.exe -m pytest tests\unit
```

## Phase P7 - Cutover va dong bang Streamlit

Muc tieu: React/backend thanh luong chinh; Streamlit khong con la noi phai vao de van hanh production.

Viec can lam:

- [ ] Chay production gate day du.
- [ ] Chay smoke theo 4 role tren staging.
- [ ] Cap nhat README: React/backend la primary app.
- [ ] Ghi ro Streamlit la legacy/demo/internal.
- [ ] Them banner trong Streamlit neu can: "Legacy interface".
- [ ] Dong bang feature moi tren Streamlit.
- [ ] Tao rollback plan neu React/backend deploy loi.

Tieu chi xong:

- [ ] Team co the dung React/backend de hoan thanh toan bo workflow production.
- [ ] Khong co task van hanh hang ngay nao bat buoc mo Streamlit.
- [ ] Release notes ghi ro parity, known limitations va rollback.

Verify:

```powershell
.\.venv\Scripts\python.exe -m compileall backend auth cloud models storage video utils scripts tests
.\.venv\Scripts\python.exe -m pytest tests\unit
.\.venv\Scripts\python.exe scripts\migrate_json_to_sqlite.py --repo-root . --dry-run
cd web
npm run lint
npm run build
npm run e2e:smoke
```

## Danh sach quyet dinh can chot

- [ ] AI runner backend co duoc bat mac dinh trong production khong?
- [ ] Storage runtime se la JSON, SQLite hay Postgres?
- [ ] Export chart PNG/SVG co nam trong production scope khong?
- [ ] Cat video theo G1/G2/G3 co nam trong production scope khong?
- [ ] Nhung debug/recovery tool nao cua Streamlit se giu legacy-only?
- [ ] Khi nao dong bang feature moi tren Streamlit?

## Thu tu uu tien gan nhat

1. Phase P0: lap parity matrix.
2. Phase P1: bat va verify AI runner backend voi video fixture.
3. Phase P2: them fixture parity regression.
4. Phase P3/P4: port cac feature/artifact con thieu theo matrix.
5. Phase P5/P6: chot storage va security parity.
6. Phase P7: cutover React/backend, dong bang Streamlit.
