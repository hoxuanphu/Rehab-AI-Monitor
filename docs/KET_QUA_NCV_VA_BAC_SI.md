# 🧬 BÁO CÁO TỔNG HỢP KẾT QUẢ AI & ĐÁNH GIÁ LÂM SÀNG CỦA BÁC SĨ (PHCN & NCV)
*Cập nhật kết quả mới nhất: 11/06/2026 (dữ liệu AI chạy lại ngày 04–05/06/2026; đánh giá lâm sàng và phiếu NCKH ngày 08/06/2026)*

Tài liệu này tổng hợp toàn bộ dữ liệu chạy thử nghiệm của mô hình AI, kết quả thu thập NCKH từ Nghiên cứu viên (NCV) và các đánh giá lâm sàng từ Chuyên gia (Bác sĩ/Kỹ thuật viên PHCN) tại Bệnh viện Đa khoa Phạm Ngọc Thạch. Dữ liệu được đồng bộ trực tiếp từ hệ thống Cloud.

---

## 📊 THỐNG KÊ TỔNG QUAN HỆ THỐNG
- **Tổng số bệnh nhân tham gia:** 4 bệnh nhân (100% nữ, tuổi 39–71, trung bình ≈ 55,5 tuổi)
- **Chẩn đoán chung:** Viêm quanh khớp vai (ICD-10: M75); mức đau VAS 6–8/10
- **Tổng số video bài tập:** 8 video (4 video Bài tập con lắc Codman + 4 video Bài tập với gậy), quay bằng điện thoại, góc chính diện, khoảng cách 2,5–4 m
- **Tổng số khung hình AI đã phân tích (lần chạy mới nhất):** ≈ 21.000 khung hình (góc vai và khuỷu tay, 30 fps)
- **Tổng số bản ghi đánh giá PHCN:**
  - 🤖 **Do AI tự động phân tích (NCV):** 8/8 video đã có kết quả AI
  - 🩺 **Do Bác sĩ / KTV đánh giá độc lập:** 8/8 video (doctor1, ngày 08/06/2026)
- **Tổng số phiếu NCKH (NCV thu thập):** 8 phiếu khảo sát đã hoàn thành (08/06/2026)

### Tóm tắt đối chiếu AI – Bác sĩ (kết quả mới nhất)
| Bệnh nhân | Bài tập | ACC AI (±30°) | Kết luận AI | Kết luận Bác sĩ | Lỗi bác sĩ ghi nhận |
| --- | --- | --- | --- | --- | --- |
| Hoàng Hạnh Nguyên | Codman | 94,8% | Đúng | Gần đúng | Sai tư thế thân người |
| Nguyễn Thị Nga | Codman | 64,0% | Gần đúng | Gần đúng | Sai tư thế thân người |
| Vũ Thị Hòa | Codman | 100,0% | Đúng | Sai | Sai tư thế thân người |
| Cao Thị Thường | Codman | 34,3% | Sai | Gần đúng | Sai tư thế thân người |
| Hoàng Hạnh Nguyên | Với gậy | 48,3% | Sai | Gần đúng | Vị trí tay chưa đúng |
| Nguyễn Thị Nga | Với gậy | 32,7% | Sai | Gần đúng | Sai tư thế thân người |
| Vũ Thị Hòa | Với gậy | 18,8% | Sai | Gần đúng | Biên độ chưa đạt |
| Cao Thị Thường | Với gậy | 38,5% | Sai | Sai | Vị trí tay chưa đúng |

**Nhận xét chính:**
- Bài tập con lắc Codman: tỷ lệ khung hình đúng ở ngưỡng ±30° đạt 34,3–100% (trung bình ≈ 73,3%); ở ngưỡng ±45° đạt 78,7–99,9% (3 video phân tích 3 giai đoạn); ở ngưỡng chuẩn xác ±15° chỉ đạt 28,8–41,9%, phản ánh khớp vai còn cứng/lệch biên độ. Video Codman của BN Cao Thị Thường (71 tuổi) đạt thấp nhất (34,3%) chủ yếu do sai góc vai (vai đúng chỉ 48,1% so với khuỷu đúng 78,4%), hệ thống cảnh báo lặp lại "khuỷu tay gập quá mức".
- Bài tập với gậy: độ chính xác thấp hơn rõ rệt (18,8–48,3%, trung bình ≈ 34,6%), thống nhất với việc bác sĩ ghi nhận lỗi kỹ thuật ở cả 4/4 bệnh nhân.
- AI phát hiện tốt sai lệch biên độ góc vai/khuỷu, nhưng **chưa phát hiện được lỗi bù trừ tư thế thân người** (gập thân chưa song song mặt sàn, xoay thân, chân trước chân sau) — đây là lỗi bác sĩ ghi nhận nhiều nhất (5/8 video).

---

## 👤 BỆNH NHÂN 1: Cao Thị Thường
- **Mã BN:** 26001385 | **Tuổi:** 71 | **Giới:** Nữ | **VAS:** 6/10
- **Triệu chứng khai báo:** Đau khớp vai (P) nhiều tháng, đau xuất hiện tự nhiên, tăng khi vận động, đau nhức nhiều về đêm, chưa điều trị gì. Tiền sử: đau dạ dày.
- **Tổng số video bài tập đã nộp:** 2

### 🎬 Video 1: Cao Thị Thường - Bài tập với gậy.mov
- **Tên bài tập:** `Bài tập với gậy (Pulley Exercise)`

#### 🤖 Chỉ số Phân tích AI (mới nhất 04/06/2026 — Phân tích Tổng quan):
| Chỉ số | Giá trị |
| --- | --- |
| Độ chính xác (ACC) | 38,5% (2076/5386 khung hình đúng) |
| ACC mô hình ML | 37,8% |
| Kết luận AI | Sai — Cần chuyên gia y tế hướng dẫn |

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Sai` | **Lỗi:** Vị trí tay chưa đúng
- **Nhận xét:** Cử động gập khớp vai cánh tay cần duỗi thẳng; cử động duỗi khớp vai cánh tay cần để xoay trong; cử động xoay trong/xoay ngoài cánh tay để áp sát thân mình.
- **Kế hoạch:** Tiếp tục

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Chẩn đoán: Viêm quanh khớp vai (P), M75; vai tổn thương: phải; thời gian ≥ 3 tháng; mức đau trung bình (4–6); tập cả hai vai; quay điện thoại chính diện, cách 4 m.

---

### 🎬 Video 2: Cao Thị Thường - Codman.mov
- **Tên bài tập:** `Bài tập con lắc Codman`

#### 🤖 Chỉ số Phân tích AI (chạy 04/06, đồng bộ lại 10/06/2026 — Giai đoạn 2: Hồi phục, sai số ±30°):
| Chỉ số | Giá trị |
| --- | --- |
| Độ chính xác (ACC) | 34,3% (949/2763 khung hình đúng) |
| Tỷ lệ gần đúng | 25,7% (709/2763 khung hình) |
| Tỷ lệ vai đúng / khuỷu đúng | 48,1% / 78,4% |
| Góc vai trung bình (chuẩn) | 84,7° (56,5°) — min 2,3° / max 179,8° |
| Góc khuỷu trung bình (chuẩn) | 153,6° (171,5°) — min 13,0° / max 180,0° |
| MAE tổng | 24,4° |
| Precision / Recall / F1-Score | 0,44 / 0,41 / 0,42 |
| ICC | 0,50 |
| Cảnh báo hệ thống | "ELBOW TOO BENT" (khuỷu tay gập quá mức, lặp lại nhiều lần) |

- **Kết luận AI:** `Sai` — Cần rèn luyện thêm để giảm sai số.

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Gần đúng` | **Lỗi:** Sai tư thế thân người
- **Nhận xét:** Cử động dang áp khớp vai, hai chân đứng rộng ngang vai, không đứng chân trước chân sau.
- **Kế hoạch:** Tiếp tục

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Tập vai phải; quay điện thoại chính diện, cách 3 m.

---

## 👤 BỆNH NHÂN 2: Hoàng Hạnh Nguyên
- **Mã BN:** 25009284 | **Tuổi:** 39 | **Giới:** Nữ | **VAS:** 6/10
- **Triệu chứng khai báo:** Đau khớp vai (P) nhiều tháng, đau xuất hiện tự nhiên, vận động khớp vai (P) đau tăng, đau nhức nhiều về đêm, chưa điều trị gì. Tiền sử bản thân và gia đình khỏe mạnh.
- **Tổng số video bài tập đã nộp:** 2

### 🎬 Video 1: Hoàng Hạnh Nguyên - Bài tập với gậy.mp4
- **Tên bài tập:** `Bài tập với gậy (Pulley Exercise)`

#### 🤖 Chỉ số Phân tích AI (mới nhất 05/06/2026 — Phân tích Tổng quan):
| Chỉ số | Giá trị |
| --- | --- |
| Độ chính xác (ACC) | 48,3% (749/1550 khung hình đúng) |
| ACC mô hình ML | 6,2% |
| Kết luận AI | Sai — Cần chuyên gia y tế hướng dẫn |

*(Lần chạy 3 giai đoạn trước đó 02/06: GĐ1 ±45°: 26,2% | GĐ2 ±30°: 19,5% | GĐ3 ±15°: 3,2%)*

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Gần đúng` | **Lỗi:** Vị trí tay chưa đúng
- **Nhận xét:** Cử động xoay trong, xoay ngoài cánh tay cần áp sát vào thân mình.
- **Kế hoạch:** Tiếp tục

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Chẩn đoán: Viêm quanh khớp vai (P), M75; thời gian ≥ 3 tháng; mức đau trung bình (4–6); tập cả hai vai; quay điện thoại chính diện, cách 3,5 m.

---

### 🎬 Video 2: Hoàng Hạnh Nguyên - Codman.mp4
- **Tên bài tập:** `Bài tập con lắc Codman`

#### 🤖 Chỉ số Phân tích AI (mới nhất 04/06/2026 — Ngưỡng sai số động, 3 giai đoạn):
| Giai đoạn phân tích | Độ chính xác (ACC) | ACC mô hình ML | Ngưỡng sai số | Khung hình đúng |
| --- | --- | --- | --- | --- |
| GĐ 1: Khởi đầu | 97,6% | 85,8% | $\pm 45^\circ$ | 491/503 |
| GĐ 2: Hồi phục | 94,8% | 78,1% | $\pm 30^\circ$ | 639/674 |
| GĐ 3: Chuẩn xác | 41,9% | 32,4% | $\pm 15^\circ$ | 205/489 |

- **Kết luận AI:** `Đúng` — Phù hợp tập luyện ở giai đoạn 3.

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Gần đúng` | **Lỗi:** Sai tư thế thân người
- **Nhận xét:** Cần gập thân người song song với mặt sàn, tay còn lại nên bám vào ghế hoặc vật cố định phía trước để đảm bảo đúng tư thế và tạo điểm tựa cho người bệnh.
- **Kế hoạch:** Tiếp tục

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Tập vai trái; quay điện thoại chính diện, cách 3 m.

---

## 👤 BỆNH NHÂN 3: Nguyễn Thị Nga
- **Mã BN:** 25007938 | **Tuổi:** 55 | **Giới:** Nữ | **VAS:** 8/10
- **Triệu chứng khai báo:** Đau khớp vai (P) vài tháng, đã điều trị VLTL – đông y, hiện đau tăng; đau điểm bám gân cơ trên gai khớp vai (P); Jobe test (+), Speed test (–). Tiền sử: viêm dạ dày.
- **Tổng số video bài tập đã nộp:** 2

### 🎬 Video 1: Nguyễn Thị Nga - Bài tập với gậy.mp4
- **Tên bài tập:** `Bài tập với gậy (Pulley Exercise)`

#### 🤖 Chỉ số Phân tích AI (mới nhất 04/06/2026 — Phân tích Tổng quan):
| Chỉ số | Giá trị |
| --- | --- |
| Độ chính xác (ACC) | 32,7% (1485/4535 khung hình đúng) |
| ACC mô hình ML | 32,0% |
| Kết luận AI | Sai — Cần chuyên gia y tế hướng dẫn |

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Gần đúng` | **Lỗi:** Sai tư thế thân người
- **Nhận xét:** Cử động gập vai thì cánh tay thẳng; động tác dang áp khớp vai chỉ dang đến 90°, không xoay thân mình; cử động xoay trong/xoay ngoài thì cánh tay cần áp sát thân mình.
- **Kế hoạch:** Tiếp tục

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Chẩn đoán: Viêm quanh khớp vai (P), M75; thời gian ≥ 3 tháng; mức đau nặng (7–10); tập cả hai vai; quay điện thoại chính diện, cách 2,5 m.

---

### 🎬 Video 2: Nguyễn Thị Nga - Codman.mp4
- **Tên bài tập:** `Bài tập con lắc Codman`

#### 🤖 Chỉ số Phân tích AI (03/06/2026 — Ngưỡng sai số động, 3 giai đoạn):
| Giai đoạn phân tích | Độ chính xác (ACC) | ACC mô hình ML | Ngưỡng sai số | Khung hình đúng |
| --- | --- | --- | --- | --- |
| GĐ 1: Khởi đầu | 78,7% | 91,6% | $\pm 45^\circ$ | 581/738 |
| GĐ 2: Hồi phục | 64,0% | 94,2% | $\pm 30^\circ$ | 701/1096 |
| GĐ 3: Chuẩn xác | 28,8% | 47,6% | $\pm 15^\circ$ | 229/794 |

- **Kết luận AI:** `Gần đúng` — Phù hợp tập luyện ở giai đoạn 2.

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Gần đúng` | **Lỗi:** Sai tư thế thân người
- **Nhận xét:** Gập thân người song song mặt sàn, tay còn lại bám vào ghế/vật cố định để tạo điểm tựa; cử động dang áp vai thì hai chân nên dang rộng bằng vai, không đứng chân trước chân sau.
- **Kế hoạch:** Tiếp tục

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Tập vai phải; quay điện thoại chính diện, cách 2,5 m.

---

## 👤 BỆNH NHÂN 4: Vũ Thị Hòa
- **Mã BN:** 26002558 | **Tuổi:** 57 | **Giới:** Nữ | **VAS:** 6/10
- **Triệu chứng khai báo:** Đau khớp vai hai bên vài tháng, gần đây đau tăng, hạn chế vận động; đau điểm bám gân cơ nhị đầu, gân cơ trên gai hai bên; tê bì dọc cánh tay hai bên; hạn chế xoay trong, xoay ngoài khớp vai (P). Tiền sử bình thường.
- **Tổng số video bài tập đã nộp:** 2

### 🎬 Video 1: Vũ Thị Hoà - Bài tập với gậy.mp4
- **Tên bài tập:** `Bài tập với gậy (Pulley Exercise)`

#### 🤖 Chỉ số Phân tích AI (03/06/2026 — Ngưỡng sai số động, 3 giai đoạn):
| Giai đoạn phân tích | Độ chính xác (ACC) | Ngưỡng sai số | Khung hình đúng |
| --- | --- | --- | --- |
| GĐ 1: Khởi đầu | 14,1% | $\pm 45^\circ$ | 420/2977 |
| GĐ 2: Hồi phục | 18,8% | $\pm 30^\circ$ | 691/3677 |
| GĐ 3: Chuẩn xác | 7,5% | $\pm 15^\circ$ | 190/2520 |

- **ACC mô hình ML:** 14,2% | **Kết luận AI:** `Sai` — Phù hợp tập luyện ở giai đoạn 1.

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Gần đúng` | **Lỗi:** Biên độ chưa đạt
- **Nhận xét:** Cử động gập vai cánh tay cần duỗi thẳng hơn; cử động dang áp khớp vai thì không xoay thân mình; cử động xoay trong/xoay ngoài cánh tay cần áp sát thân mình hơn.
- **Kế hoạch:** Tiếp tục

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Chẩn đoán: Viêm quanh khớp vai, M75; tổn thương cả hai vai; thời gian 1–3 tháng; mức đau trung bình (4–6); tập cả hai vai; quay điện thoại chính diện, cách 3,5 m.

---

### 🎬 Video 2: Vũ Thị Hoà - Codman.mp4
- **Tên bài tập:** `Bài tập con lắc Codman`

#### 🤖 Chỉ số Phân tích AI (mới nhất 04/06/2026 — Ngưỡng sai số động, 3 giai đoạn):
| Giai đoạn phân tích | Độ chính xác (ACC) | ACC mô hình ML | Ngưỡng sai số | Khung hình đúng |
| --- | --- | --- | --- | --- |
| GĐ 1: Khởi đầu | 99,9% | 94,2% | $\pm 45^\circ$ | 796/797 |
| GĐ 2: Hồi phục | 100,0% | 99,6% | $\pm 30^\circ$ | 1135/1135 |
| GĐ 3: Chuẩn xác | 31,6% | 38,4% | $\pm 15^\circ$ | 255/808 |

- **Kết luận AI:** `Đúng` — Phù hợp tập luyện ở giai đoạn 3.

#### 🩺 Đánh giá lâm sàng từ Chuyên gia PHCN (doctor1, 08/06/2026):
- **Kết quả:** `Sai` | **Lỗi:** Sai tư thế thân người
- **Nhận xét:** Thân người cần gập song song với sàn nhà; tay còn lại bám vào ghế hoặc vật cố định để tạo điểm tựa và giữ tư thế ổn định; cử động dang áp thì hai chân dang rộng bằng vai.
- **Kế hoạch:** Tiếp tục
- ⚠️ *Trường hợp bất đồng AI – Bác sĩ điển hình: góc vai/khuỷu đạt chuẩn (ACC ±30° = 100%) nhưng bác sĩ kết luận Sai do lỗi bù trừ tư thế thân người mà AI hiện chưa giám sát.*

#### 📄 Kết quả phiếu NCKH thu thập được:
✅ Đã hoàn thành (08/06/2026). Tập vai phải; quay điện thoại chính diện, cách 3 m.

---

© 2025-2026 Nhóm Nghiên cứu Rehab AI Monitor. Trường Đại học Y tế Công cộng (HUPH).
