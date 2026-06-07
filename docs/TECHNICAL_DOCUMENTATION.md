# TÀI LIỆU CHI TIẾT KIẾN TRÚC FRONTEND VÀ BACKEND HỆ THỐNG
## HỆ THỐNG GIÁM SÁT TẬP LUYỆN PHỤC HỒI CHỨC NĂNG (REHAB AI MONITOR)

> **Phiên bản tài liệu:** v3.2 | **Cập nhật lần cuối:** Tháng 6/2026

Tài liệu này trình bày chi tiết về kiến trúc kỹ thuật của hệ thống **Rehab AI Monitor**, bao gồm cả phần giao diện người dùng (Frontend) và logic xử lý ngầm (Backend) cùng các công nghệ AI đi kèm.

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Hệ thống được phát triển theo mô hình **Full-stack tích hợp** bằng ngôn ngữ **Python** kết hợp với framework **Streamlit**. Sự kết hợp này giúp đồng bộ hóa logic AI và hiển thị trực quan dữ liệu mà không cần thông qua các tầng API trung gian phức tạp, tối ưu hóa tốc độ xử lý video trên hạ tầng máy chủ Cloud hoặc máy trạm cục bộ.

```mermaid
graph TD
    User([Người dùng / Chuyên gia]) <--> Frontend[Giao diện Web - Streamlit + Custom CSS + JS]
    Frontend <--> Backend_Core[Python Backend Controller - app.py]
    Backend_Core <--> Auth_Engine[Hệ thống Xác thực SHA-256]
    Backend_Core <--> Database_JSON[(Cơ sở dữ liệu JSON - /database/)]
    Backend_Core <--> AI_Core[AI & Computer Vision - MediaPipe Pose]
    Backend_Core <--> Media_Engine[Bộ xử lý Video - FFmpeg H.264]
    Backend_Core <--> Plotly_Engine[Trực quan hóa - Plotly Engine]
    Backend_Core <--> Cloud_Sync[Hugging Face Cloud Dataset Sync]
```

### 1.1. Cấu trúc Thư mục Dự án

Dự án được tổ chức theo cấu trúc thư mục ngăn nắp, phân chia rõ ràng theo chức năng:

```
Rehab-AI-Monitor/
├── app.py                    # Bộ điều phối trung tâm toàn hệ thống
├── assets/                   # Logo cơ quan (HUPH, Khoa KHDT) - định dạng PNG/Base64
├── database/                 # Toàn bộ cơ sở dữ liệu JSON (users, videos, evaluations...)
│   ├── users.json
│   ├── video_list.json
│   ├── patient_symptoms.json
│   ├── doctor_evaluations.json
│   ├── schedules.json
│   ├── lich_su_tap_luyen.json
│   └── reference_*.json      # Góc khớp chuẩn lâm sàng cho từng bài tập
├── docs/                     # Tài liệu kỹ thuật, đề cương nghiên cứu, báo cáo kết quả
│   ├── README_UI.md
│   ├── TECHNICAL_DOCUMENTATION.md
│   ├── DE_CUONG_NGHIEN_CUU.md
│   └── KET_QUA_NCV_VA_BAC_SI.md
├── scripts/                  # Script dọn dẹp và bảo trì hệ thống định kỳ
└── processed_results/        # Kết quả xử lý tạm thời (đã thêm vào .gitignore)
```

---

## 2. CHI TIẾT PHẦN FRONTEND (GIAO DIỆN NGƯỜI DÙNG)

Frontend của ứng dụng được xây dựng dựa trên các thành phần trực quan của Streamlit, kết hợp với các kỹ thuật **CSS Injection** và **JavaScript Injection** sâu để tạo ra trải nghiệm người dùng cao cấp (Premium UX) theo phong cách **Clinical Aesthetics** (Thẩm mỹ Lâm sàng).

### 2.1. Thiết kế Giao diện & Thẩm mỹ (UI/UX)

* **Phong cách Thiết kế Hiện đại:** Sử dụng ngôn ngữ thiết kế phẳng pha trộn xu hướng kính mờ (Glassmorphism), viền phát sáng (glow border) cho các biểu tượng logo học viện và các khối banner thông tin.
* **Typography:** Sử dụng font chữ **Times New Roman** làm font chủ đạo cho toàn bộ hệ thống (tiêu đề, nội dung, footer) thông qua CSS Injection nhằm tạo môi trường học thuật và y tế chuyên nghiệp.
* **Đồng bộ hóa Chủ đề (Theme Sync):** Hệ thống tự động phát hiện và đồng bộ màu sắc văn bản, màu nền thẻ card, nút bấm theo 2 chế độ:
  * **Dark Mode (Chế độ Tối):** Nền tối sâu `#0d0d1a`, văn bản trắng, viền neon xanh cyan `#00c6ff` tạo cảm giác công nghệ cao. Phù hợp cho việc phân tích video và biểu đồ AI.
  * **Light Mode (Chế độ Sáng):** Nền trắng `#ffffff`, chữ đen `#000000`, viền xám mỏng và các nút bấm chuyển sắc xanh dịu mắt. Phù hợp cho môi trường văn phòng bác sĩ và bệnh nhân sử dụng ban ngày.
* **Tương thích Thiết bị Di động (Mobile-First Responsive):**
  * Tự động điều chỉnh kích cỡ của 3 logo trên đầu trang từ `100px` xuống `70px` và cố định trên 1 hàng (`flex-wrap: nowrap`) để tránh bị đẩy xuống dòng trên màn hình hẹp.
  * Thiết kế lại thanh Tab điều hướng dạng cuộn ngang (`overflow-x: auto`) với `min-width: fit-content` và `white-space: nowrap` để ngăn cắt chữ, cho phép vuốt ngang mượt mà.
  * Giảm cỡ chữ của toàn bộ Sidebar xuống `0.88rem` để tăng mật độ thông tin hiển thị trên màn hình nhỏ.
* **Robust Path Resolution:** Hệ thống giải quyết đường dẫn đa tầng được thiết kế riêng để tự động dò tìm các tệp tin logo base64 và file tham chiếu chuẩn (`reference_*.json`) trong `assets/` và `database/`, hạn chế tối đa lỗi thiếu file trên Cloud (Hugging Face Space).

### 2.2. Giao diện Đăng nhập & Xác thực chung (Common Login & Registration Page)

Trang đăng nhập là điểm tiếp cận đầu tiên của toàn bộ người dùng và chuyên gia y khoa, được thiết kế để phân quyền truy cập ngay từ đầu:

* **Hộp lựa chọn vai trò (Role Selector Dropdown):**
  * Cho phép người dùng xác định rõ tư cách truy cập hệ thống trước khi đăng nhập, bao gồm: **Bệnh nhân**, **Bác sĩ / KTV PHCN**, **Nghiên cứu viên**, và **Quản trị viên**.
  * Dựa trên vai trò được chọn, giao diện chính bên trong sẽ hiển thị đúng các phân hệ chức năng tương ứng.
* **Các Tab chức năng đăng nhập:**
  * **Tab 🔐 ĐĂNG NHẬP:** Nhập tên tài khoản (Username) và mật khẩu (Password). Có chức năng **Đặt lại mật khẩu** thông qua điền Email đăng ký dự phòng nếu nhập sai thông tin.
  * **Tab 📋 ĐĂNG KÝ:** Dành riêng cho bệnh nhân tự tạo tài khoản mới trên hệ thống bằng cách khai báo Họ tên, Username, Email liên hệ và Mật khẩu cá nhân.
  * **Tab 🚀 GOOGLE ID:** Đăng nhập một chạm dựa trên dịch vụ danh tính tích hợp của Google (Streamlit Cloud Identity), thích hợp khi chạy thử nghiệm trên nền tảng đám mây.
* **Cấu hình giao diện nhanh (Quick Theme Toggle):**
  * Nút gạt (Toggle switch) ngay đầu sidebar của trang đăng nhập để chuyển đổi nhanh giữa chế độ Sáng (Light Mode) và Tối (Dark Mode) trước khi đăng nhập.

### 2.3. Chi tiết Phân hệ Giao diện theo Vai trò (Role-based Dashboards)

#### A. Giao diện Bệnh nhân (Patient Portal)

Giao diện được thiết kế trực quan, dễ hiểu giúp bệnh nhân tự thực hiện khai báo triệu chứng và bài tập mà không cần sự trợ giúp kỹ thuật phức tạp:

* **Hồ sơ thông tin cá nhân & Triệu chứng:**
  * **Form hành chính:** Ô nhập Họ tên, tuổi, giới tính và mã định danh duy nhất (VD: BN0001).
  * **Khai báo triệu chứng:** Ô nhập mô tả cảm giác đau chi tiết (ví dụ: đau khớp vai khi giơ tay qua đầu).
  * **Thang đo mức độ đau VAS (Visual Analog Scale):** Thanh trượt từ 0 (Không đau) đến 10 (Đau dữ dội nhất) kèm dòng chú thích tình trạng đau lâm sàng tương ứng với mốc chọn.
  * **Nút gửi thông tin:** Nút "Gửi thông tin cho Bác sĩ/KTV và NCV" để đẩy trực tiếp dữ liệu khai báo vào `database/patient_symptoms.json`.
* **Khu vực lựa chọn bài tập & Hướng dẫn tập luyện:**
  * **Hộp chọn bài tập:** Danh sách bài tập phục hồi chức năng khớp vai (Tập với gậy, tập Codman đung đưa tay,...).
  * **Thông tin bài tập:** Card thông tin hiển thị Thời gian tập (giây/lần), Số lần lặp lại (lần/ngày), và Lợi ích y tế cụ thể của động tác.
  * **Trình phát video mẫu đối chiếu:** Hộp video chuẩn mẫu phát trực tiếp trên web giúp bệnh nhân bắt chước động tác đúng biên độ vai.
* **Khu vực tải video tập luyện cá nhân:**
  * Bộ tải file kéo-thả (File Uploader) thiết kế pill-shape màu xanh nổi bật để bệnh nhân tải video quay lại quá trình tập lên.
  * Hỗ trợ tự động chuẩn hóa định dạng và nén dung lượng video thông qua FFmpeg tích hợp.
* **Trang Kết quả đánh giá:**
  * Xem độ chính xác chuyển động do AI chấm điểm kèm theo phân tích chi tiết của 3 giai đoạn biên độ khớp vai ($45°$, $30°$, $15°$).
  * Đọc nhận xét lâm sàng, ghi chú và kế hoạch luyện tập (phác đồ) do Bác sĩ điều trị trực tiếp gửi xuống.
* **Trang Lịch nhắc nhở (Schedules):**
  * Xem ngày tái khám định kỳ và các mốc thời gian nhắc nhở tập luyện trong tuần.
* **Trang Đạo đức & Thông tin Nghiên cứu (Ethics & Consent):**
  * **Bioethics Panel:** Tích hợp Trang thông tin nghiên cứu (PIS) chuyên nghiệp dưới dạng các hộp co giãn linh hoạt (Expander): Giới thiệu, Quy trình, Nguy cơ, Quyền lợi, Bảo mật, và Đóng góp đề tài.
  * **Contact Cards:** Thẻ thông tin liên hệ phân màu trực quan: màu xanh dương cho Nghiên cứu viên chính (NCV), màu đỏ/cam cảnh báo cho Hội đồng Đạo đức (IRB).

#### B. Giao diện Bác sĩ / Kỹ thuật viên (Clinician Portal)

Hỗ trợ các chuyên gia y tế theo dõi tình trạng phục hồi của bệnh nhân và chẩn đoán từ xa:

* **Thống kê nhanh trong Sidebar:**
  * Hiển thị thông tin hồ sơ bác sĩ và cơ sở y tế đang công tác.
  * Ô đếm số lượng video bệnh nhân đang chờ đánh giá chuyên môn và tổng số bệnh nhân đang quản lý.
* **Giao diện quản lý & Phê duyệt video:**
  * Bảng danh sách video bệnh nhân gửi lên kèm các thông tin về thời gian, trạng thái.
  * **Workflow Tối ưu (JavaScript Auto-Tab):** Bác sĩ chọn video từ danh sách → hệ thống tự động kích hoạt JavaScript để chuyển sang Tab Đánh giá → nhập nhận xét lâm sàng. Không cần điều hướng thủ công.
  * Trình xem video kép: Bác sĩ bấm vào nút phát sẽ xem video tập luyện của bệnh nhân song song với việc kiểm tra biểu đồ đo góc khớp sinh học vẽ bởi AI.
* **Bộ Đánh giá Lâm sàng chuyên môn (Ground Truth Entry):**
  * Bác sĩ chọn đánh giá biên độ tập thực tế của bệnh nhân (Đạt/Không đạt/Cần tập lại).
  * Nhập nhận xét chuyên môn và soạn phác đồ điều trị tiếp theo cho bệnh nhân.
  * Nhập ghi chú nội bộ gửi riêng cho Nghiên cứu viên để tối ưu mô hình Pose.
  * Dữ liệu đánh giá được lưu vào `database/doctor_evaluations.json` và đồng bộ lên Cloud.
* **Hợp nhất Dữ liệu:** Hiển thị song song kết quả khai báo của bệnh nhân và kết quả phân tích AI để bác sĩ đưa ra chỉ định chính xác nhất.

#### C. Giao diện Nghiên cứu viên (AI Researcher Portal)

Bộ công cụ phân tích dữ liệu thị giác máy tính chuyên sâu cho kỹ sư AI:

* **Cấu hình tham số mô hình Pose:**
  * Thanh trượt điều chỉnh ngưỡng tự tin (Confidence threshold) của MediaPipe để tăng độ bám sát khớp xương.
  * Dropdown cấu hình tốc độ bỏ qua frame (Skip frames: 0, 1, 2, 4) giúp tăng tốc độ phân tích video dài gấp 3–5 lần khi chạy trên CPU đám mây hạn chế.
  * Lựa chọn chất lượng độ phân giải video đầu vào và phiên bản mô hình MediaPipe (Lite, Full, Heavy).
* **Phân tích sâu & Trích xuất tọa độ:**
  * Xem chi tiết từng frame hình đã vẽ xương: Hiển thị dạng lưới ảnh của tất cả khung hình với chỉ số góc vai/khuỷu thực tế, độ lệch so với góc chuẩn, nhãn đánh giá (PASS/FAIL) theo sai số tùy chỉnh.
  * Cho phép tải xuống bộ dữ liệu tọa độ 33 khớp xương dạng CSV/JSON của toàn bộ phiên tập để phục vụ huấn luyện mô hình học máy.
* **Biểu đồ trực quan hóa đa chiều (Multi-Chart Analytics) - Plotly:**
  * **ROM Trend:** Biểu đồ đường thể hiện thay đổi góc khớp vai/khuỷu theo thời gian.
  * **ROM Distribution (Boxplot):** Biểu đồ hộp để đánh giá độ biến thiên và tính ổn định của chuyển động qua các phiên tập.
  * **Radar Chart (7 chỉ số):** Trực quan hóa cùng lúc 7 chỉ số chất lượng bài tập: Accuracy (ACC), Mean Absolute Error (MAE), Root Mean Square Error (RMSE), Intraclass Correlation Coefficient (ICC), F1-Score, Precision và Recall. Hỗ trợ xuất ảnh PNG trực tiếp.
* **Bảng phân tích 3 giai đoạn PHCN (Stage-based Table):**
  * Bảng đối sánh 3 giai đoạn phục hồi chức năng khớp vai hiển thị song song:
    * **Giai đoạn 1:** Ngưỡng sai số $\pm 45°$ (PHCN khởi đầu).
    * **Giai đoạn 2:** Ngưỡng sai số $\pm 30°$ (PHCN tiến triển).
    * **Giai đoạn 3:** Ngưỡng sai số $\pm 15°$ (PHCN nâng cao).
  * Giúp NCV dễ dàng phát hiện mức độ hoàn thành bài tập tại từng ngưỡng yêu cầu lâm sàng khác nhau.
* **Đồng bộ Ground Truth:** Hiển thị thẻ nhận xét và phác đồ điều trị của Bác sĩ dưới dạng thẻ viền sáng màu xanh dương nhạt (Light blue border) trực tiếp trên giao diện NCV để phục vụ đối soát thuật toán và kiểm định mô hình.
* **Bộ Xuất báo cáo Hợp nhất (Consolidated Export Tab):**
  * Xuất hình ảnh PNG trực tiếp cho mọi biểu đồ (Pie chart, ROM vai, ROM khuỷu, Boxplots, Radar chart).
  * Tải file CSV chứa toàn bộ dữ liệu thô tọa độ góc khớp theo khung hình (Frame ID).
  * **Lazy ZIP Engine:** Cơ chế tạo ZIP danh sách khung hình y tế theo yêu cầu (chỉ nén khi người dùng click), tránh tình trạng tràn RAM (OOM) khi xử lý video dung lượng lớn trên máy chủ Cloud.

#### D. Giao diện Quản trị viên (Admin Portal)

Hệ thống quản trị tổng thể toàn bộ tài nguyên, tài khoản và dữ liệu của website:

* **Bộ Metric Cards tổng quan:** Hiển thị 4 thẻ thông tin lớn về số lượng người dùng (BN và BS), tổng số video, tổng số bản ghi đánh giá và tổng số frames hình mà AI đã xử lý.
* **Biểu đồ thống kê trực quan:**
  * Biểu đồ cột thể hiện mức độ phổ biến của từng bài tập y tế (Bar chart).
  * Biểu đồ tròn thể hiện cơ cấu vai trò người dùng trong hệ thống (Pie chart).
* **Bảng thống kê chi tiết kết quả phân tích & đánh giá (Bảng quản trị cốt lõi):**
  * Hiển thị bảng tổng hợp toàn bộ video trong hệ thống với các cột chi tiết: Họ tên BN, Username, Mã BN, Tuổi/Giới tính, Triệu chứng lâm sàng & mức độ đau VAS khai báo, Bài tập lựa chọn, Thời gian upload.
  * Thống kê chi tiết số lượng khung hình của phiên tập (Tổng số frames, số frames đúng, số frames gần đúng, số frames sai).
  * Hiển thị kết quả chấm điểm của AI và nội dung nhận xét lâm sàng thực tế của Bác sĩ điều trị.
* **Xem và xuất lịch sử hệ thống (System Log):**
  * Xem bảng nhật ký hoạt động hệ thống thời gian thực (Admin Unified Log).
  * Hỗ trợ lọc nhật ký theo thời gian và loại sự kiện.
  * Nút xuất toàn bộ hoạt động ra tệp tin CSV phục vụ kiểm toán và báo cáo.
* **Phân khu dọn dẹp hệ thống (System Cleanup & Reset):**
  * Nút xóa nhanh cơ sở dữ liệu đánh giá và triệu chứng.
  * Nút xóa các file video tạm thời và thư mục ảnh rác để giải phóng dung lượng đĩa.
  * Nút reset hệ thống toàn cục về trạng thái sạch ban đầu.

---

## 3. CHI TIẾT PHẦN BACKEND (LOGIC & XỬ LÝ DỮ LIỆU)

Phần Backend hoạt động hoàn toàn bằng Python dưới nền, thực hiện các tác vụ nặng về tính toán hình học, quản lý tệp tin và bảo mật.

### 3.1. Hệ thống Cơ sở dữ liệu và Xác thực

* **Cơ sở dữ liệu JSON (Flat File):** Lưu trữ trong thư mục `database/` thông qua các tệp tin JSON chuyên biệt:
  * `users.json`: Lưu thông tin tài khoản người dùng, email, mã số sinh viên/bệnh nhân, vai trò và mật khẩu đã mã hóa.
  * `video_list.json`: Quản lý siêu dữ liệu video (Đường dẫn lưu trữ, độ chính xác AI, thời gian tải lên, trạng thái phân tích).
  * `patient_symptoms.json`: Lưu thông tin khai báo sức khỏe và mức độ đau VAS của bệnh nhân.
  * `doctor_evaluations.json`: Lưu trữ kết quả chẩn đoán, lời khuyên và kế hoạch điều trị từ bác sĩ (Ground Truth).
  * `schedules.json` & `lich_su_tap_luyen.json`: Lưu lịch nhắc nhở và nhật ký tập luyện.
  * `reference_*.json`: Dữ liệu góc khớp chuẩn lâm sàng của từng bài tập PHCN, dùng làm ngưỡng so sánh của AI.
* **Xác thực bảo mật:** Sử dụng thuật toán băm **SHA-256** qua thư viện `hashlib` của Python để mã hóa mật khẩu trước khi lưu trữ, đảm bảo không lưu mật khẩu dạng văn bản thuần (plaintext).

### 3.2. Core xử lý AI & Thị giác máy tính (Computer Vision)

* **MediaPipe Pose Engine:**
  * Sử dụng phiên bản **MediaPipe Heavy Model** (Complexity 2) để tăng tối đa độ chính xác của việc nhận diện 33 điểm mốc khớp xương, đặc biệt hữu ích trong môi trường lâm sàng có nhiều vật cản.
  * Áp dụng kỹ thuật lọc làm mượt dữ liệu (Data Smoothing) để giảm nhiễu rung lắc của camera điện thoại.
* **Thuật toán hình học sinh học (Joint Angle Calculation):**
  * Sử dụng lượng giác để tính góc giữa 3 điểm mốc xương (Ví dụ: Vai – Khuỷu – Cổ tay để tính góc khuỷu tay).
  * Công thức tính góc dựa trên tích vô hướng của hai vector khớp:
    $$\theta = \arccos\left(\frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}\right) \times \frac{180}{\pi}$$
  * So sánh trực tiếp góc của bệnh nhân theo thời gian với góc chuẩn từ `reference_*.json` để tính toán sai số Euclidean và đưa ra độ chính xác phần trăm (Accuracy Score).
* **Phân tích 3 giai đoạn PHCN:**
  * Hàm `xu_ly_video_day_du` trong `app.py` là Core xử lý chính, phân tích mỗi video qua 3 ngưỡng lâm sàng song song ($\pm 45°$, $\pm 30°$, $\pm 15°$) để tạo ra bộ chỉ số đầy đủ cho NCV và Bác sĩ.
  * Đầu ra gồm: Accuracy (ACC), MAE, RMSE, ICC, F1-Score, Precision, Recall.

### 3.3. Engine xử lý Video & Tối ưu hóa đám mây

* **Tích hợp FFmpeg:** Gọi trình xử lý FFmpeg thông qua Python `subprocess` để tự động mã hóa (transcode) và nén video của bệnh nhân sang codec chuẩn **H.264 (MP4)** với mức bitrate tối ưu (800kbps), giúp video phát mượt mà trên tất cả các trình duyệt di động.
* **Hugging Face Cloud Dataset Sync:** Tự động đồng bộ các video và kết quả phân tích lên bộ lưu trữ đám mây của Hugging Face theo cơ chế bất đồng bộ (Asynchronous thread) để tránh làm nghẽn luồng xử lý chính, giải quyết triệt để vấn đề mất dữ liệu khi máy chủ Docker của Space khởi động lại.
* **Quản lý bộ nhớ đệm chống tràn RAM (OOM Prevention):**
  * Gọi bộ dọn rác hệ thống `gc.collect()` định kỳ sau mỗi lần phân tích AI.
  * **Lazy ZIP Engine:** Cơ chế nén file lười (on-demand) chỉ được kích hoạt khi người dùng thực sự yêu cầu tải, giải quyết vấn đề OOM khi thư viện ảnh y tế có dung lượng lớn.
  * Tự động xóa các file khung hình ảnh tạm thời sau khi trích xuất dữ liệu tọa độ hoàn tất.
  * Thư mục `processed_results/` được thêm vào `.gitignore` để tránh commit vô tình các file CSV lớn làm nghẽn Git push.

### 3.4. Engine Trực quan hóa (Plotly Analytics)

* **Plotly Express & Graph Objects:** Toàn bộ biểu đồ phân tích được vẽ bằng thư viện Plotly, đảm bảo tính tương tác (zoom, hover, pan) và hỗ trợ xuất PNG nội tuyến.
* **Các loại biểu đồ triển khai:**
  * `go.Scattergl` / `px.line` – ROM Trend theo thời gian.
  * `px.box` – ROM Distribution (Boxplot).
  * `go.Scatterpolar` – Radar Chart 7 chỉ số chất lượng AI.
  * `px.pie` – Cơ cấu vai trò người dùng (Admin).
  * `px.bar` – Phổ biến bài tập (Admin).

---

## 4. BẢNG TỔNG HỢP SO SÁNH CÔNG NGHỆ

| Thành phần | Công nghệ sử dụng | Vai trò chính |
| :--- | :--- | :--- |
| **Frontend UI** | Streamlit + Custom CSS Injection | Hiển thị giao diện điều khiển, biểu đồ trực quan hóa, video phát trực tuyến. |
| **Typography** | Times New Roman (CSS Force) | Font chữ học thuật & y tế, đồng bộ toàn hệ thống. |
| **Responsive Logic** | CSS Media Queries | Định dạng lại layout di động, co giãn kích thước logo và khoảng cách. |
| **Tab Controller** | Segmented Control + JavaScript | Điều hướng tab thông minh, tự động chuyển tab theo tác vụ (Auto-Tab). |
| **Analytics Engine** | Plotly (Express & Graph Objects) | Radar chart, ROM trend, Boxplot, Pie chart, Bar chart – có tương tác và xuất PNG. |
| **Database** | JSON Files (`/database/`) | Cơ sở dữ liệu nhẹ, truy xuất nhanh, dễ dàng đồng bộ lên đám mây. |
| **Authentication** | hashlib (SHA-256) | Mã hóa mật khẩu người dùng, kiểm soát phân quyền đăng nhập. |
| **AI Engine** | MediaPipe Pose Landmark (Heavy) | Nhận dạng 33 điểm khớp xương người trên video, tính góc khớp sinh học. |
| **Video Engine** | FFmpeg (subprocess H.264) | Nén, tối ưu hóa và chuyển đổi định dạng video sang chuẩn web H.264. |
| **Export Engine** | Lazy ZIP + Plotly PNG + CSV | Xuất dữ liệu theo yêu cầu, chống OOM, hỗ trợ nghiên cứu & kiểm toán. |
| **Cloud Sync** | Hugging Face Dataset API (async) | Đồng bộ hóa dữ liệu bền vững chống reset môi trường Docker. |
| **Path Resolution** | Multi-tier fallback (`assets/`, `database/`) | Dò tìm file tự động, tương thích cả môi trường Local và Cloud. |

---

© 2025–2026 Rehab AI Monitor Research Team. Trường Đại học Y tế Công cộng (HUPH).
