# React Frontend

Frontend React/Vite moi, dung song song voi Streamlit trong giai doan tach frontend/backend.

## Chay local

Backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd web
npm install
npm run dev
```

Mo `http://127.0.0.1:5173`.

## Smoke test

Chay smoke React + backend bang Playwright:

```powershell
cd web
npx playwright install chromium
npm run e2e:smoke
```

Smoke test tao database tam trong `scratch/web-e2e-smoke/`, chay backend tren
`8010`, frontend tren `5183`, dang nhap qua UI va kiem tra dashboard benh nhan.

## Design

Giao dien dung token tu `DESIGN.md`:

- `#F8FAFC` cho nen workspace.
- `#FFFFFF` + border `#E2E8F0` + radius `8px` cho panel/card.
- `#0284C7` cho CTA va active/focus.
- Grid spacing 8/16/24/32px.

## Pham vi hien tai

- Login va dang ky benh nhan bang backend API.
- Benh nhan co form khai bao trieu chung trong tab `Trieu chung`, luu qua backend API.
- Benh nhan co form upload video trong tab `Video`, luu file va metadata qua backend API.
- Tab `Video` co the xem/an video upload bang authenticated media endpoint cua backend.
- Tab `Video` co cot tien do phan tich; admin/nghien cuu vien co the tao job, cac role duoc scope co the poll tien do, va dashboard tu reload mot lan khi job `success`.
- Workspace doc du lieu theo vai tro:
  - Video va danh gia.
  - Ho so benh nhan.
  - Khai bao trieu chung.
  - Lich nhac cho admin/bac si/benh nhan.
  - Du lieu nghien cuu cho admin/nghien cuu vien.
- Sidebar tab va metric cards cap nhat tu backend API.
- Dang ky self-service chi tao role `Benh nhan`; cac role nhay cam do admin cap.
- Backend job da validate/transcode H.264 va co hook AI runner de cap nhat `video_list.json`; runner phan tich AI/MediaPipe that chua migrate khoi Streamlit mac dinh.
