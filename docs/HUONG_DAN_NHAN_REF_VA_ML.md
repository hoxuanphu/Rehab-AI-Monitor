# Hướng dẫn đọc nhãn REF (PASS) và ML (%) trên khung hình

Tài liệu này giải thích cách đọc **hai nhãn độc lập** hiển thị trên mỗi khung hình trích xuất trong Rehab AI Monitor: nhãn **REF** (rule-based, so góc với video chuẩn YouTube) và nhãn **ML** (mô hình RandomForest học từ dữ liệu đã phân tích).

---

## 1. Tổng quan: Mỗi khung hình có 2 nhãn

| Nhãn trên ảnh | Tên gọi | Cách chấm |
|---------------|---------|-----------|
| **PASS / NEAR / FAIL** | **REF** (Reference / Rule) | So góc vai & khuỷu với video chuẩn YouTube |
| **ML · Đúng / Gần đúng / Sai · tin cậy X%** | **ML** (Machine Learning) | Mô hình RandomForest dự đoán từ góc khớp + tọa độ 8 khớp quan trọng |

Hai nhãn **độc lập** — có thể khác nhau trên cùng một khung hình. Ví dụ: REF = **PASS** nhưng ML = **Gần đúng · tin cậy 33%**.

---

## 2. Nhãn REF (PASS / NEAR / FAIL)

### 2.1. Cách tính

Hệ thống so **sai số góc (Δ)** giữa góc đo được và góc chuẩn từ video YouTube tham chiếu:

- **Vai (shoulder):** Δ vai = |góc vai đo − góc vai chuẩn|
- **Khuỷu (elbow):** Δ khuỷu = |góc khuỷu đo − góc khuỷu chuẩn|

**Cả vai và khuỷu** phải thỏa điều kiện mới được xếp vào một nhóm.

### 2.2. Ngưỡng phân loại REF

| Nhãn REF | Màu | Điều kiện (cả Δ vai **và** Δ khuỷu) |
|----------|-----|--------------------------------------|
| **PASS** | Xanh | Δ ≤ **ngưỡng giai đoạn** |
| **NEAR** | Cam | Δ ≤ ngưỡng × **1,5** (chưa đạt PASS) |
| **FAIL** | Đỏ | Δ **vượt** ngưỡng × 1,5 |

### 2.3. Ngưỡng theo giai đoạn (bài Codman)

| Giai đoạn | Ngưỡng PASS | Ngưỡng NEAR (× 1,5) |
|-----------|-------------|---------------------|
| **G1** | ≤ 45° | ≤ 67,5° |
| **G2** | ≤ 30° | ≤ 45° |
| **G3** | ≤ 15° | ≤ 22,5° |

### 2.4. Bài tập với gậy (Stick / Pulley)

Đánh giá **cả hai bên** (trái và phải): vai trái, vai phải, khuỷu trái, khuỷu phải đều phải nằm trong ngưỡng tương ứng.

### 2.5. Dòng số dưới mỗi khung hình (REF)

```
Vai: 96° / 60° | Δ 36.2°
Khuỷu: 139° / 171° | Δ 32.1°
```

| Thành phần | Ý nghĩa |
|------------|---------|
| **96°** | Góc vai đo được từ MediaPipe |
| **60°** | Góc vai chuẩn (video YouTube) |
| **Δ 36.2°** | Sai số so với chuẩn |

---

## 3. Nhãn ML (Đúng / Gần đúng / Sai)

### 3.1. Mô hình dùng gì?

- **Thuật toán:** RandomForest Classifier (200 cây)
- **Đầu vào mỗi frame:** góc vai, góc khuỷu + tọa độ 8 khớp (2 vai, 2 khuỷu, 2 cổ tay, 2 hông)
- **Huấn luyện:** từ các file CSV trong `processed_results/`, nhãn gốc lấy từ cột `dung` và `gan_dung` (rule REF)

### 3.2. Ba lớp phân loại ML

| Nhãn ML | Mã lớp | Ý nghĩa |
|---------|--------|---------|
| **Sai** | 0 | Động tác sai |
| **Gần đúng** | 1 | Động tác gần đúng |
| **Đúng** | 2 | Động tác đúng |

### 3.3. ML **không** dùng ngưỡng % cố định kiểu “≥ 80% = Đúng”

Cách gán nhãn ML:

1. Mô hình tính **3 xác suất**: P(Sai), P(Gần đúng), P(Đúng) — tổng ≈ 100%
2. Chọn lớp có **xác suất cao nhất** → đó là nhãn ML hiển thị
3. Con số **%** kèm theo = **độ tin cậy vào đúng nhãn ML đang hiển thị** (`ml_confidence`)

> **Lưu ý:** % **không** phải “% đúng động tác” hay “% giống video chuẩn”. Đó là mức tin cậy thống kê của mô hình vào nhãn vừa dự đoán.

### 3.4. Bảng đọc mức tin cậy ML

| Tin cậy ML | Ý nghĩa khi đọc kết quả |
|------------|-------------------------|
| **≥ 70%** | **Tin cậy cao** — có thể tham khảo mạnh |
| **50–69%** | **Tin cậy vừa** — nên xem kèm nhãn REF và Δ góc |
| **< 50%** | **Không chắc chắn** — mô hình phân vân giữa các lớp |

### 3.5. Định dạng hiển thị trên UI

```
ML · Gần đúng · tin cậy 42%
```

Dòng phụ (khi có dữ liệu đầy đủ):

```
Xác suất 3 lớp: Sai 18% · Gần đúng 42% · Đúng 40%
```

---

## 4. Ví dụ thực tế

### Ví dụ A — REF PASS, ML Gần đúng · tin cậy 33%

| Thành phần | Giá trị | Giải thích |
|------------|---------|------------|
| REF | **PASS** | Góc vai & khuỷu nằm trong ngưỡng giai đoạn đang xem (vd. G1: Δ ≤ 45°) |
| ML | **Gần đúng · tin cậy 33%** | Mô hình chọn lớp “Gần đúng” nhưng chỉ 33% tin — dưới 50% → **không chắc chắn** |
| Δ vai / Δ khuỷu | 36,2° / 32,1° | REF đạt ở G1; ML vẫn thấy tư thế tổng thể “gần đúng” hơn “đúng hoàn toàn” |

### Ví dụ B — REF và ML cùng hướng

| REF | ML | Ý nghĩa |
|-----|-----|---------|
| PASS | Đúng · tin cậy 85% | Góc đạt chuẩn, ML cũng tin mạnh là đúng |
| NEAR | Gần đúng · tin cậy 62% | Cả hai đồng thuận “gần đúng” |
| FAIL | Sai · tin cậy 78% | Góc lệch nhiều, ML cũng phân loại sai |

---

## 5. So sánh nhanh REF vs ML

| Tiêu chí | REF (PASS/NEAR/FAIL) | ML (Đúng/Gần đúng/Sai) |
|----------|----------------------|------------------------|
| **Cơ sở** | Góc chuẩn YouTube | Học từ dữ liệu nhiều video |
| **Ngưỡng** | Góc cố định theo G1/G2/G3 | Không có ngưỡng % cố định |
| **% hiển thị** | Không có | Tin cậy vào nhãn ML |
| **Mục đích** | Đối chiếu chuẩn lâm sàng | Gợi ý bổ sung từ kinh nghiệm dữ liệu |

**Khuyến nghị:** Luôn đọc **REF + Δ góc** trước; dùng **ML + tin cậy %** như tham khảo thứ hai, đặc biệt khi tin cậy ≥ 70%.

---

## 6. Cập nhật dữ liệu ML trên video cũ

Video phân tích **trước** bản cập nhật hiển thị ML có thể thiếu dòng **Xác suất 3 lớp**. Để cập nhật:

1. Bấm **Chạy lại phân tích AI**, hoặc
2. Bấm **ÁP DỤNG ML CHO VIDEO ĐÃ PHÂN TÍCH** trong tab kết quả

---

## 7. Liên quan trong mã nguồn

| Thành phần | File |
|------------|------|
| Logic REF (PASS/NEAR/FAIL) | `app.py` — hàm đánh giá góc vs chuẩn YouTube |
| Huấn luyện & dự đoán ML | `pose_classifier_utils.py` |
| Hiển thị badge trên frame | `pose_classifier_utils.py` — `format_ml_display()`, `draw_ml_badge()` |
| Giải thích ngắn trên UI | `app.py` — expander “📖 Giải thích nhãn REF (PASS) và ML (%)” |

---

*Tài liệu cập nhật: tháng 6/2026 — Rehab AI Monitor*
