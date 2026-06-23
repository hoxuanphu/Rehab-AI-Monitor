# De xuat nang cap du an Rehab-AI-Monitor

Ngay tao: 2026-06-20

## Tong quan

Du an hien da co nen tang kha tot: backend API rieng, frontend React/Vite, test unit, CI, tai lieu roadmap va cac phase sua loi bao mat. Huong nang cap phu hop nhat luc nay la chot an toan du lieu, hoan thien migration khoi Streamlit legacy, sau do moi mo rong tinh nang lam sang va AI.

## Uu tien cao nhat

### 1. Dua React va backend thanh luong chinh

`app.py` van con rat lon va mang nhieu di san Streamlit, trong khi backend va React da co nhieu workflow quan trong. Nen dat muc tieu:

- React/backend la giao dien van hanh chinh.
- Streamlit chi con che do legacy, demo hoac fallback noi bo.
- Tinh nang moi uu tien them vao backend API va React, khong bo sung tiep vao `app.py` tru khi bat buoc.

### 2. Chay va khoa production gate

Can bam sat `docs/PRODUCTION_GATE_CHECKLIST.md` va xem day la dieu kien truoc deploy:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\unit
.\.venv\Scripts\python.exe scripts\migrate_json_to_sqlite.py --repo-root . --dry-run
cd web
npm run lint
npm run build
npm run e2e:smoke
```

Sau khi co ket qua, sua tung loi gate theo cum nho. Khong nen them tinh nang moi neu gate hien tai chua xanh.

### 3. Siet tiep bao mat UI

Du an da cai thien nhieu diem bao mat, nhung van con nhieu `unsafe_allow_html=True` trong `app.py` va cac module `ui/`. Nen audit theo nguyen tac:

- Chi giu HTML unsafe cho noi dung tinh, noi bo, khong co du lieu nguoi dung.
- Moi du lieu do benh nhan, bac si, ky thuat vien hoac nghien cuu vien nhap phai duoc escape truoc khi render.
- Noi nao khong can HTML tuy bien thi doi sang component Streamlit/React an toan hon.

### 4. Quyet dinh storage runtime

Hien du an da co tooling JSON -> SQLite, nhung runtime van con thien ve JSON. Nen chon mot huong ro rang:

- Neu deploy mot instance: uu tien SQLite de giam do phuc tap.
- Neu can multi-instance, concurrent writes hoac production lon hon: thiet ke repository layer cho Postgres.
- Truoc khi doi runtime can co migration, backup, rollback va test row-count.

## Nang cap san pham

### 5. Hoan thien dashboard lam sang

Cho bac si va ky thuat vien, nen co man hinh ket qua AI theo benh nhan gom:

- Video goc va video da phan tich.
- Bieu do ROM va xu huong qua cac buoi tap.
- Gallery frame PASS/NEAR/FAIL.
- Nhan xet bac si.
- Ke hoach tiep theo.
- Lich su tap luyen theo timeline.

### 6. Cai thien trai nghiem benh nhan

Benh nhan khong can thay qua nhieu chi so ky thuat. Nen thiet ke trai nghiem theo ngon ngu de hieu:

- Buoi tap gan nhat.
- Muc dau truoc/sau tap.
- Tien bo ROM.
- Viec can lam tiep theo.
- Lich nhac sap toi.
- Nhan xet cua bac si.

### 7. Nang chat luong AI/ML

Can co bo benchmark nho, on dinh, de danh gia model qua tung phien ban:

- Cung mot tap video chuan.
- So sanh goc khop, so lan lap, nhan dung/sai.
- Doi chieu MediaPipe Heavy/Full/Lite.
- Luu ket qua theo model version va ngay chay.

Muc tieu la biet model moi thuc su tot hon hay chi thay doi ve cam tinh.

### 8. Them observability

Nen them cac metric va audit log phuc vu van hanh:

- Upload loi.
- Analysis job loi.
- Thoi gian xu ly trung binh.
- Dung luong storage.
- So job pending/running/failed.
- Lich su xoa, reset, sync, export.

Voi he thong lien quan du lieu y te, kha nang truy vet loi rat quan trong.

## Thu tu trien khai de xuat

1. Chay full production gate va sua loi dang do.
2. Chon SQLite hoac Postgres cho runtime.
3. Giam phu thuoc vao `app.py`, dua workflow chinh sang React/backend.
4. Audit `unsafe_allow_html=True` va du lieu nhay cam.
5. Lam dashboard lam sang va timeline benh nhan.
6. Them benchmark AI va monitoring.

## Viec nen lam ngay

Neu chi chon mot viec bat dau ngay, nen chay production gate day du, ghi lai loi, roi sua den khi backend, frontend va e2e deu xanh. Day la nen tang tot nhat de du an tiep tuc phat trien ma khong bi no ky thuat keo lai.
