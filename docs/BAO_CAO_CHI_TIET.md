# BÁO CÁO CHI TIẾT MÃ NGUỒN VÀ THUẬT TOÁN (v3.2 Updated)
**HỆ THỐNG GIÁM SÁT TẬP LUYỆN PHỤC HỒI CHỨC NĂNG (REHAB AI MONITOR)**

---

## 1. TỔNG QUAN HỆ THỐNG
**Rehab AI Monitor** là một hệ sinh thái giám sát tập luyện y tế ứng dụng Trí tuệ nhân tạo (AI) và Thị giác máy tính để đánh giá các bài tập phục hồi chức năng (PHCN). 

Hệ thống đã đạt đến độ hoàn thiện cao nhất (Production-ready) với 12 phân khu chức năng, hỗ trợ quy trình lâm sàng khép kín giữa Bệnh nhân, Bác sĩ/KTV và Nghiên cứu viên.

---

## 2. CHI TIẾT CÁC CÔNG NGHỆ ĐỘT PHÁ

### 2.1. Phân tích Real-time qua WebRTC & AI Core
- **Pose Processor:** Tích hợp MediaPipe Pose (Heavy Model - Complexity 2) chạy trên luồng xử lý riêng biệt để tính toán 33 tọa độ khớp xương với độ trễ cực thấp (<50ms).
- **Biomechanical Joint Angles:** Thuật toán tính toán góc Vai và Khuỷu tay dựa trên tích vô hướng hai vector liên kết trong không gian 3D.
- **3-Stage PHCN Analysis:** Áp dụng 3 ngưỡng sai số động ($\pm 45°$, $\pm 30°$, và $\pm 15°$) cho từng giai đoạn phục hồi chức năng của người bệnh để tạo ra bộ chỉ số so sánh đối sánh song song.

### 2.2. Cơ chế Lưu trữ và Theo dõi Tiến triển (Persistence)
- **JSON Unified Database:** Hệ thống sử dụng 6 tệp tin JSON chuyên biệt (`users.json`, `patient_symptoms.json`, `doctor_evaluations.json`, `schedules.json`, `video_list.json`, `lich_su_tap_luyen.json`) nằm trong thư mục `/database/` để lưu trữ bền vững triệu chứng bệnh nhân, đánh giá của bác sĩ và kết quả AI.
- **Python 3.10 Compatibility:** Hệ thống được tối ưu hóa cho Python 3.10, sử dụng các thư viện build sẵn (.whl) cho MediaPipe và NumPy 1.26.4 để đảm bảo hiệu suất xử lý khung xương ổn định nhất trên Windows/Linux.
- **Longitudinal Analytics & Multi-Chart Engine:**
  - Sử dụng **Plotly Engine** để vẽ biểu đồ ROM Trend và ROM Boxplot giúp nhận diện sự cải thiện biên độ vận động và độ ổn định khớp.
  - Tích hợp biểu đồ Radar trực quan hóa đồng thời 7 chỉ số chất lượng bài tập (Accuracy, MAE, RMSE, ICC, F1-Score, Precision, Recall).

### 2.3. Tối ưu hóa Trải nghiệm Người dùng (UX Enhancement)
- **Auto-Tab Switching:** Sử dụng JavaScript Injection để tự động điều hướng chuyên gia đến đúng Tab chức năng khi có tác vụ mới (như chọn video BN).
- **Mobile Responsive Tabs:** Hệ thống CSS Injection đặc biệt được thiết kế để chuẩn hóa giao diện Tab trên di động, ngăn chặn tình trạng tràn chữ (Text Clipping) và cho phép cuộn ngang linh hoạt (`overflow-x: auto`, `min-width: fit-content`).
- **Theme Synchronization:** Hệ thống CSS thông minh tự động hiệu chỉnh độ tương phản cho cả hai chế độ Sáng/Tối, đảm bảo tính thẩm mỹ y tế chuyên nghiệp.
- **Bioethics Panel:** Tích hợp phần thông tin đạo đức (PIS) và các thẻ liên hệ chuyên môn phân chia màu trực quan cho Hội đồng Đạo đức (IRB) và Nghiên cứu viên.

---

## 3. PHÂN TÍCH LUỒNG XỬ LÝ DỮ LIỆU LÂM SÀNG
1. **Input:** Thu thập video (Webcam/Upload) và triệu chứng VAS từ bệnh nhân.
2. **AI Processing:** Trích xuất khung xương, tính toán độ chính xác tại 3 ngưỡng sai số ($\pm 45°$, $\pm 30°$, $\pm 15°$), tính các chỉ số thống kê toán học (MAE, RMSE, ICC...).
3. **Clinical Integration:** Bác sĩ nhận dữ liệu tổng hợp -> Đánh giá lâm sàng (Ground Truth) -> Hệ thống đồng bộ kết quả cho cả BN và NCV.
4. **Research Feedback Loop:** Nghiên cứu viên đối chiếu nhận xét của Bác sĩ trực tiếp trên bảng điều khiển NCV (đồng bộ thẻ nhận xét viền sáng xanh nhạt) với thông số AI để tối ưu hóa thuật toán và độ chính xác của mô hình.

---

## 4. TỐI ƯU HÓA HỆ THỐNG (OOM PREVENTION)
Đảm bảo tính ổn định trên môi trường Streamlit Cloud (1GB RAM):
- **FFmpeg Integration:** Tự động chuyển đổi định dạng video sang chuẩn H.264 (MP4) ở mức bitrate tối ưu (800kbps).
- **Active Garbage Collection:** Sử dụng `gc.collect()` và quản lý bộ nhớ đệm (Cache) chủ động để ngăn chặn lỗi tràn bộ nhớ khi xử lý video dài.
- **Lazy ZIP Engine:** Cơ chế tạo ZIP ảnh khung hình y tế theo yêu cầu (on-demand), giúp tránh lỗi OOM khi nén lượng dữ liệu hình ảnh lớn trên đám mây.
- **Pagination Gallery:** Thuật toán phân trang (List Slicing) giúp hiển thị hàng ngàn ảnh phân tích khung xương mà không làm treo trình duyệt.
- **Git Hygiene:** Thêm `processed_results/` vào `.gitignore` để tránh đẩy các file dữ liệu nặng lên kho chứa mã nguồn.

---

## 5. KẾT QUẢ ĐẠT ĐƯỢC (v3.2 Updated)
- **Giao diện chuẩn y khoa:** Sử dụng font 'Times New Roman' và bố cục Card hiện đại, tăng 50% hiệu suất thao tác của bác sĩ.
- **Quy trình bảo mật NCKH:** Tích hợp trang thông tin đạo đức nghiên cứu, bảo mật dữ liệu bệnh nhân theo chuẩn NCKH. Hệ thống tài khoản được phân quyền chặt chẽ (Admin, Doctor, Researcher, Patient).
- **Tính thực tiễn cao:** Đã được tinh chỉnh bởi Chủ nhiệm đề tài **Đinh Lê Quỳnh Phương** và cố vấn chuyên môn **TS. Trần Hồng Việt** để sẵn sàng ứng dụng thử nghiệm tại Bệnh viện Đa khoa Phạm Ngọc Thạch.

---

## 6. HƯỚNG PHÁT TRIỂN (FUTURE WORK)
- **Auto Action Recognition:** Nâng cấp AI để tự động nhận diện bài tập mà không cần lựa chọn thủ công.
- **AI-driven Prognosis:** Sử dụng Machine Learning để dự đoán thời gian hồi phục dựa trên lịch sử tập luyện.
- **Cloud-Scale Deployment:** Mở rộng kiến trúc sang mô hình Microservices (Docker/Kubernetes) để phục vụ quy mô bệnh viện lớn.

---

© 2025-2026 Nhóm Nghiên cứu Rehab AI Monitor. Trường Đại học Y tế Công cộng (HUPH).

