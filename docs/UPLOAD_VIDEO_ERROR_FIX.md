# Lỗi upload video và phương án sửa

Ngày ghi nhận: 20/06/2026

## 1. Hiện tượng

Từ màn hình người dùng gửi lại, hệ thống có các biểu hiện:

- Upload video xong nhưng vùng preview video bị đen hoặc không phát được.
- Frame Gallery vẫn có số lượng frame/lọc frame, nhưng ảnh thumbnail có thể không hiện đúng.
- Card frame hiển thị nhiều giá trị `N/A`, ví dụ góc vai/khuỷu, REF hoặc delta không rõ ràng.
- Với video đã phân tích, dữ liệu frame có thể tồn tại nhưng frontend không hiển thị được góc đo.

Ảnh chụp cho thấy video bài tập đã được chọn trong giao diện React, frame gallery đã tải trang frame, nhưng phần video/ảnh/góc bị lỗi hiển thị.

## 2. Ảnh hưởng

- Bệnh nhân tưởng upload thành công nhưng bác sĩ/NCV không xem được video gốc.
- NCV có thể chạy phân tích trên file khó decode, dẫn tới lỗi đọc frame, frame hợp lệ thấp, hoặc kết quả không ổn định.
- Bác sĩ/NCV thấy `N/A` trong frame gallery dù dữ liệu góc thực tế vẫn có trong JSON dưới dạng góc trái/phải.
- Lỗi khó truy vết vì file có header đúng định dạng nhưng codec/container không tương thích trình duyệt hoặc OpenCV.

## 3. Nguyên nhân kỹ thuật

### 3.1. API upload chỉ lưu file, chưa chuẩn hóa video

Endpoint `POST /videos/upload` trong `backend/main.py` trước đó chỉ:

- kiểm tra extension,
- kiểm tra magic header,
- lưu file vào `patient_uploads`,
- ghi metadata vào `database/video_list.json`.

Luồng này chưa kiểm tra video có thật sự decode được bằng `ffprobe`, và chưa đảm bảo video là MP4 H.264. Nhiều video từ điện thoại có thể là:

- MP4 dùng HEVC/H.265,
- MOV/AVI/MKV cần convert,
- MP4 có metadata/container khiến browser preview bị đen,
- file header đúng nhưng stream video không đọc được.

Kết quả là frontend nhận metadata hợp lệ nhưng browser hoặc AI runner không phát/đọc frame ổn định.

### 3.2. Payload frame trả góc thô nên frontend hiện `N/A`

Trong `backend/analysis_parity.py`, `frame_public_payload()` trước đó trả:

- `goc_vai` từ `record.get("goc_vai")`,
- `goc_khuyu` từ `record.get("goc_khuyu")`.

Với bài tập gậy/pulley/stick, dữ liệu thường nằm ở:

- `goc_vai_trai`,
- `goc_vai_phai`,
- `goc_khuyu_trai`,
- `goc_khuyu_phai`.

Backend đã có helper tính góc chuẩn hóa bằng cách lấy giá trị đơn hoặc trung bình hai bên, nhưng payload gallery chưa dùng helper này. Vì vậy frontend nhận `goc_vai = null` và hiển thị `N/A` dù các trường trái/phải vẫn có dữ liệu.

### 3.3. Race nhỏ ở HF workflow

Khi chạy test rộng, phát hiện thêm race nhỏ trong `backend/hf_workflow.py`: job HF đã ghi trạng thái `success`, nhưng cờ `_running_job_id` có thể chưa kịp xóa. Request kế tiếp đôi khi nhận `already_running` và trả HTTP 200 thay vì tạo job mới 202.

Đây không phải nguyên nhân chính của lỗi upload video, nhưng đã được sửa kèm để ổn định luồng job nền.

## 4. Phương án sửa đã áp dụng

### 4.1. Chuẩn hóa video ngay sau upload

File: `backend/main.py`

Thêm hàm `_browser_playable_upload_path()`:

- gọi `validate_video_file_for_processing()` để xác nhận file đọc được bằng `ffprobe`;
- đọc codec bằng `ffprobe_video_codecs()`;
- nếu file đã là `.mp4` và video codec là H.264 thì giữ nguyên;
- nếu chưa tương thích, dùng `ffmpeg` qua `build_upload_h264_command()` để convert sang MP4 H.264;
- kiểm tra lại file convert bằng `validate_video_file_for_processing()`;
- cập nhật `stored_filename` và `video_path` trỏ tới file MP4 đã chuẩn hóa;
- dọn file tạm/file gốc không còn dùng.

Lợi ích:

- video mới upload phát ổn định hơn trên browser;
- AI runner/OpenCV đọc frame ổn định hơn;
- metadata không còn trỏ tới MOV/HEVC/file khó decode;
- nếu file hỏng, API trả lỗi rõ ràng thay vì lưu vào hệ thống.

### 4.2. Trả góc frame đã chuẩn hóa

File: `backend/analysis_parity.py`

Trong `frame_public_payload()`:

- `goc_vai` dùng `shoulder_angle(record)`;
- `goc_khuyu` dùng `elbow_angle(record)`;
- thêm alias:
  - `vai_chuan`,
  - `khuyu_chuan`,
  - `delta_vai`,
  - `delta_khuyu`;
- vẫn giữ các trường cũ:
  - `shoulder_ref`,
  - `elbow_ref`,
  - `shoulder_delta`,
  - `elbow_delta`,
  - `goc_vai_trai/phai`,
  - `goc_khuyu_trai/phai`.

Lợi ích:

- frame gallery không còn hiện `N/A` khi chỉ có dữ liệu trái/phải;
- chart và gallery dùng cùng cách hiểu góc;
- frontend cũ và mới đều tương thích.

### 4.3. Cập nhật UI frame gallery

File: `web/src/App.tsx`

Card frame và modal frame hiển thị thêm REF thực tế:

- Vai đo / REF vai;
- Khuỷu đo / REF khuỷu;
- delta vai/khuỷu.

Lợi ích:

- người xem thấy rõ góc đo so với góc chuẩn;
- bớt nhầm giữa ngưỡng REF `±15/30/45°` và góc chuẩn thực tế.

### 4.4. Ổn định HF workflow

File: `backend/hf_workflow.py`

Trong `HfWorkflowJobs.start()`:

- nếu `_running_job_id` còn giữ job đã có trạng thái terminal (`success`, `error`, `canceled`), tự xóa cờ running trước khi quyết định `already_running`.

Lợi ích:

- tránh race khi tạo job HF liên tiếp;
- test và vận hành job nền ổn định hơn.

## 5. Test đã bổ sung/cập nhật

File: `tests/unit/test_backend_api.py`

Bổ sung/cập nhật các test:

- upload MP4 H.264 giữ nguyên file và metadata;
- upload MOV/HEVC được convert sang MP4 H.264 và metadata trỏ tới `.mp4`;
- frame gallery trả góc chuẩn hóa khi frame chỉ có góc trái/phải;
- frame gallery trả REF/delta đầy đủ.

## 6. Lệnh kiểm chứng đã chạy

```powershell
.\.venv\Scripts\python.exe -m pytest tests\unit\test_backend_api.py tests\unit\test_video_io.py tests\unit\test_video_validation.py tests\unit\test_video_serving.py -q
```

Kết quả: pass.

```powershell
npm --prefix web run build
```

Kết quả: pass.

## 7. Cách kiểm tra thủ công

1. Đăng nhập bằng tài khoản bệnh nhân trên giao diện React.
2. Upload một video từ điện thoại, ưu tiên thử cả `.mp4` và `.mov`.
3. Kiểm tra `database/video_list.json`:
   - `stored_filename` nên kết thúc bằng `.mp4`;
   - `video_path` nên nằm trong `patient_uploads/...mp4`.
4. Mở danh sách video và bấm xem video:
   - video phải phát được, không chỉ hiện màn đen.
5. Chạy phân tích AI hoặc mở kết quả đã có.
6. Mở Frame Gallery:
   - card frame phải có góc vai/khuỷu;
   - REF và delta hiển thị rõ;
   - không còn `N/A` nếu JSON có dữ liệu góc trái/phải.

## 8. Lưu ý vận hành

- Các video đã upload trước khi sửa vẫn có thể trỏ tới file cũ. Với các bản ghi đang lỗi, nên upload lại video hoặc chạy lại phân tích sau khi đã chuẩn hóa file.
- Máy/server chạy backend cần có `ffmpeg` và `ffprobe`. Repo đã có `ffmpeg` trong `packages.txt`, cần đảm bảo môi trường triển khai cài đúng.
- Nếu upload thất bại với thông báo không đọc được video, nên kiểm tra file gốc có bị hỏng hoặc bị đổi đuôi sai định dạng không.

