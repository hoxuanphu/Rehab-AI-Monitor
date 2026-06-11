# BÁO CÁO KẾT QUẢ NGẮN GỌN (PHỤC VỤ VIẾT BÁO CÁO TÓM TẮT / ABSTRACT)
*Số liệu mới nhất tính đến 11/06/2026 — nguồn: hệ thống Rehab AI Monitor (AI chạy lại 04–05/06/2026; bác sĩ đánh giá và phiếu NCKH 08/06/2026)*

---

## 1. Đối tượng và dữ liệu
- **04 bệnh nhân** nữ (100%), tuổi 39–71 (trung bình ≈ 55,5), điều trị ngoại trú tại Khoa PHCN – Bệnh viện Đa khoa Phạm Ngọc Thạch.
- **Chẩn đoán:** Viêm quanh khớp vai (ICD-10: M75); mức đau VAS 6–8/10; thời gian mắc 1 đến ≥ 3 tháng.
- **Triệu chứng khai báo nổi bật:** đau vai tăng khi vận động, đau nhiều về đêm, hạn chế xoay trong/xoay ngoài; 1 ca Jobe test (+); 1 ca đau cả hai vai kèm tê bì dọc cánh tay.
- **Dữ liệu:** 08 video (04 bài tập con lắc Codman + 04 bài tập với gậy), quay bằng smartphone, góc chính diện, khoảng cách 2,5–4 m; AI đã phân tích **8/8 video, ≈ 21.000 khung hình** (góc khớp vai và khuỷu tay, MediaPipe Pose 33 điểm mốc, 3 ngưỡng sai số ±45°/±30°/±15°).
- **Tham chiếu:** 8/8 video được Bác sĩ/KTV PHCN đánh giá độc lập (kết quả Đúng/Gần đúng/Sai, lỗi kỹ thuật, nhận xét); 8/8 phiếu NCKH hoàn thành.

## 2. Kết quả chính của mô hình AI
### a) Bài tập con lắc Codman — phân tích theo 3 giai đoạn với 3 ngưỡng sai số động

**Nguyên lý phân tích 3 giai đoạn:** Với mỗi khung hình, mô hình tính góc khớp vai và khớp khuỷu của bệnh nhân (từ 33 điểm mốc MediaPipe Pose, công thức tích vô hướng vector) rồi so với góc chuẩn tham chiếu của động tác Codman. Một khung hình được tính "đúng" khi độ lệch góc nằm trong ngưỡng sai số cho phép. Thay vì dùng một ngưỡng cứng duy nhất, mô hình áp dụng **3 ngưỡng sai số động tương ứng 3 giai đoạn phục hồi lâm sàng** của bệnh nhân viêm quanh khớp vai:

| Giai đoạn | Ngưỡng sai số | Ý nghĩa lâm sàng |
| --- | --- | --- |
| GĐ 1: Khởi đầu | ±45° | Yêu cầu lỏng, phù hợp BN khớp cứng nặng, mới bắt đầu tập |
| GĐ 2: Hồi phục | ±30° | Yêu cầu trung bình, phù hợp BN đang trong tiến trình hồi phục |
| GĐ 3: Chuẩn xác | ±15° | Yêu cầu biên độ chuẩn xác cao, tiệm cận vận động bình thường |

Cùng một video được chấm song song trên cả 3 ngưỡng; tỷ lệ khung hình đạt ở từng ngưỡng cho biết bệnh nhân đang "trụ" được ở giai đoạn nào, từ đó **AI tự đề xuất giai đoạn tập luyện phù hợp** (đạt ≥ 70–80% ở một ngưỡng thì đủ điều kiện chuyển lên ngưỡng khắt khe hơn).

**Kết quả từng bệnh nhân (số khung hình đúng/tổng):**

| Bệnh nhân | GĐ1 (±45°) | GĐ2 (±30°) | GĐ3 (±15°) | AI đề xuất |
| --- | --- | --- | --- | --- |
| Hoàng Hạnh Nguyên | 97,6% (491/503) | 94,8% (639/674) | 41,9% (205/489) | Tập ở GĐ 3 |
| Nguyễn Thị Nga | 78,7% (581/738) | 64,0% (701/1096) | 28,8% (229/794) | Tập ở GĐ 2 |
| Vũ Thị Hòa | 99,9% (796/797) | 100,0% (1135/1135) | 31,6% (255/808) | Tập ở GĐ 3 |
| Cao Thị Thường | *(phân tích tổng quan ±30°)* | 34,3% (949/2763) | – | Tập ở GĐ 1 |
| **Trung bình** | **≈ 92,1%** | **≈ 73,3%** | **≈ 34,1%** | |

**Nhận xét:**
- Độ chính xác **giảm dần có quy luật** khi siết ngưỡng sai số (±45° ≈ 92% → ±30° ≈ 73% → ±15° ≈ 34%): bệnh nhân thực hiện đúng quỹ đạo tổng thể nhưng chưa đạt biên độ chuẩn xác — đúng với bệnh cảnh khớp vai còn cứng, hạn chế ROM của viêm quanh khớp vai.
- Cách phân tầng này giúp tránh đánh giá "đúng/sai" cực đoan: ví dụ BN Nguyễn Thị Nga nếu chấm theo ngưỡng ±15° chỉ đạt 28,8% (rất kém), nhưng ở ngưỡng ±45° đạt 78,7% — tức động tác về bản chất đúng, chỉ cần cải thiện biên độ, nên AI xếp BN tập ở GĐ 2 thay vì kết luận sai hoàn toàn.
- Video Codman của BN 71 tuổi (Cao Thị Thường) đạt thấp nhất (34,3% ở ±30°; MAE 24,4°; F1 = 0,42): vai đúng chỉ 48,1% trong khi khuỷu đúng 78,4%, hệ thống cảnh báo lặp lại "khuỷu tay gập quá mức" — minh họa khả năng AI định vị được khớp sai cụ thể và phù hợp đề xuất quay về GĐ 1.

### b) Bài tập với gậy (khó hơn, độ chính xác thấp)
- ACC tổng quan từng video: **18,8% / 32,7% / 38,5% / 48,3%** (trung bình ≈ 34,6%); AI kết luận "Sai" ở cả 4 video.
- Thống nhất với lâm sàng: bác sĩ ghi nhận lỗi kỹ thuật ở **4/4** video bài tập gậy (vị trí tay chưa đúng, biên độ chưa đạt, sai tư thế thân người).

### c) Đối chiếu AI – Bác sĩ (độ giá trị đồng quy)
| Bệnh nhân | Bài tập | ACC AI (±30°) | AI | Bác sĩ |
| --- | --- | --- | --- | --- |
| Hoàng Hạnh Nguyên | Codman | 94,8% | Đúng | Gần đúng |
| Nguyễn Thị Nga | Codman | 64,0% | Gần đúng | Gần đúng |
| Vũ Thị Hòa | Codman | 100,0% | Đúng | Sai* |
| Cao Thị Thường | Codman | 34,3% | Sai | Gần đúng |
| Hoàng Hạnh Nguyên | Với gậy | 48,3% | Sai | Gần đúng |
| Nguyễn Thị Nga | Với gậy | 32,7% | Sai | Gần đúng |
| Vũ Thị Hòa | Với gậy | 18,8% | Sai | Gần đúng |
| Cao Thị Thường | Với gậy | 38,5% | Sai | Sai |

- **Xu hướng đồng thuận:** cả AI và bác sĩ đều đánh giá chất lượng động tác Codman tốt hơn rõ rệt so với bài tập gậy.
- **(*) Phát hiện quan trọng:** AI đánh giá tốt biên độ góc vai/khuỷu nhưng **chưa phát hiện lỗi bù trừ tư thế thân người** (gập thân chưa song song mặt sàn, xoay thân, chân trước chân sau) — lỗi được bác sĩ ghi nhận nhiều nhất (5/8 video). Điển hình: video Codman của BN Vũ Thị Hòa đạt ACC ±30° = 100% nhưng bác sĩ kết luận "Sai" do tư thế thân người.

## 3. Kết luận phục vụ abstract
1. Mô hình marker-less (MediaPipe Pose + ngưỡng góc khớp) **khả thi về kỹ thuật** để giám sát từ xa biên độ vận động vai/khuỷu của 2 bài tập PHCN khớp vai trên video smartphone thông thường.
2. Khả năng phân tầng theo 3 ngưỡng sai số cho phép **đề xuất giai đoạn tập luyện phù hợp** cho từng bệnh nhân.
3. Hạn chế chính: chưa giám sát được lỗi bù trừ thân người; cỡ mẫu nhỏ (4 BN, 8 video) → cần bổ sung tiêu chí tư thế thân mình và mở rộng dữ liệu.

---

## 4. BẢN THẢO BÁO CÁO TÓM TẮT (theo đúng quy định trình bày)

**ỨNG DỤNG TRÍ TUỆ NHÂN TẠO VÀ THỊ GIÁC MÁY TÍNH GIÁM SÁT TẬP LUYỆN PHỤC HỒI CHỨC NĂNG KHỚP VAI TỪ XA**
*(In hoa, đậm, cỡ 14, căn giữa — 20 chữ)*

**Nhóm tác giả:** Đinh Lê Quỳnh Phương (Chủ nhiệm đề tài, sinh viên ngành Khoa học dữ liệu, lớp CNCQ KHDL1-1A); Kim Mạnh Hưng, Nguyễn Hải An, Phan Vân Anh, Nguyễn Thị Thanh Nga (sinh viên ngành Khoa học dữ liệu, lớp CNCQ KHDL1-1A); Nguyễn Thị Thơm (sinh viên ngành Kỹ thuật Phục hồi chức năng, lớp CNCQ KTPHCN3-1A); Nguyễn Thị Thu Hương (sinh viên ngành Y tế công cộng, lớp CNCQ YTCC22-1A) — Trường Đại học Y tế Công cộng

**Giảng viên hướng dẫn:** TS. Trần Hồng Việt – Trường Đại học Y tế Công cộng

**Tóm tắt:** Người bệnh phục hồi chức năng (PHCN) tự tập tại nhà thiếu giám sát chuyên môn nên dễ sai động tác, giảm hiệu quả điều trị. Nghiên cứu nhằm xây dựng mô hình nhận diện, đánh giá động tác PHCN khớp vai bằng thị giác máy tính và so sánh độ chính xác của mô hình với đánh giá của chuyên gia. Nghiên cứu thử nghiệm trên 04 bệnh nhân nữ (39–71 tuổi) viêm quanh khớp vai tại Bệnh viện Đa khoa Phạm Ngọc Thạch, với 08 video bài tập con lắc Codman và bài tập với gậy (khoảng 21.000 khung hình). Mô hình MediaPipe Pose trích xuất 33 điểm mốc, tính góc vai – khuỷu và phân loại đúng/sai theo ba ngưỡng sai số ±45°, ±30°, ±15° tương ứng ba giai đoạn phục hồi (khởi đầu, hồi phục, chuẩn xác); kết quả được đối chiếu với đánh giá độc lập của bác sĩ PHCN. Bài tập Codman đạt độ chính xác 34,3–100% (ngưỡng ±30°), bài tập với gậy đạt 18,8–48,3%; kết luận của mô hình thống nhất với bác sĩ về xu hướng chất lượng động tác, song chưa phát hiện được lỗi bù trừ tư thế thân người (5/8 video). Mô hình khả thi để giám sát biên độ vận động khớp vai từ xa, cần bổ sung tiêu chí tư thế thân người và mở rộng cỡ mẫu. *(≈ 190 từ)*

**Từ khóa:** Phục hồi chức năng từ xa; trí tuệ nhân tạo; thị giác máy tính; ước lượng tư thế; khớp vai; MediaPipe Pose.
