import os
import json
import re
import sys
from datetime import datetime

# Auto-install huggingface_hub if missing
try:
    import huggingface_hub
except ImportError:
    print("[HF Sync] Thư viện huggingface_hub chưa được cài đặt. Tiến hành cài đặt...")
    import subprocess
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub"])
        import huggingface_hub
    except Exception as e:
        print(f"❌ Không thể cài đặt huggingface_hub tự động: {e}")
        print("Vui lòng cài đặt thủ công: pip install huggingface_hub")

# Configuration
HF_DATASET_ID = "quynhphuong1209/Rehab-AI-Monitor-2026-data"
DATABASE_DIR = "database"
README_PATH = "README.md"

def download_latest_data(token=None):
    if not token:
        token = os.environ.get("HF_TOKEN", "").strip() or None
        
    if not token:
        print("⚠️ Không tìm thấy HF_TOKEN trong biến môi trường.")
        token_input = input("Nhập Hugging Face Write/Read Token (hoặc nhấn Enter để bỏ qua và sử dụng dữ liệu local): ").strip()
        if token_input:
            token = token_input
            
    if not token:
        print("⚠️ Sử dụng dữ liệu local hiện có (không đồng bộ từ Hugging Face Cloud)...")
        return False
        
    files_to_download = [
        "doctor_evaluations.json",
        "research_data.json",
        "patient_symptoms.json",
        "video_list.json",
        "users.json"
    ]
    
    os.makedirs(DATABASE_DIR, exist_ok=True)
    print(f"📥 Đang đồng bộ dữ liệu từ Hugging Face Dataset: {HF_DATASET_ID}...")
    
    success_count = 0
    from huggingface_hub import hf_hub_download
    for file_name in files_to_download:
        try:
            hf_hub_download(
                repo_id=HF_DATASET_ID,
                filename=file_name,
                repo_type="dataset",
                token=token,
                local_dir=DATABASE_DIR,
                local_dir_use_symlinks=False
            )
            # Copy to root directory for safety and backwards compatibility
            import shutil
            local_db_path = os.path.join(DATABASE_DIR, file_name)
            if os.path.exists(local_db_path):
                shutil.copy2(local_db_path, file_name)
            print(f"✅ Đã tải và đồng bộ: {file_name}")
            success_count += 1
        except Exception as e:
            print(f"❌ Lỗi khi tải {file_name}: {e}")
            
    return success_count > 0

def load_json_file(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Lỗi đọc file {file_path}: {e}")
    return []

def generate_report():
    # Detect files from database/ first, fallback to root
    research_file = os.path.join(DATABASE_DIR, "research_data.json")
    if not os.path.exists(research_file) or os.path.getsize(research_file) <= 2:
        research_file = "research_data.json"
        
    eval_file = os.path.join(DATABASE_DIR, "doctor_evaluations.json")
    if not os.path.exists(eval_file) or os.path.getsize(eval_file) <= 2:
        eval_file = "doctor_evaluations.json"
        
    research_data = load_json_file(research_file)
    doctor_evals = load_json_file(eval_file)
    
    if not research_data and not doctor_evals:
        print("⚠️ Không tìm thấy dữ liệu lâm sàng hoặc nghiên cứu để phân tích.")
        return ""
        
    # --- PART 1: RESEARCHER (NCV) COLLECTED STATS ---
    total_subjects = len(research_data)
    
    # Gender distribution
    gender_map = {}
    for r in research_data:
        g = r.get("gender", "Không rõ").strip()
        gender_map[g] = gender_map.get(g, 0) + 1
        
    # Age distribution
    ages = [r.get("age") for r in research_data if isinstance(r.get("age"), (int, float))]
    avg_age = sum(ages) / len(ages) if ages else 0
    min_age = min(ages) if ages else 0
    max_age = max(ages) if ages else 0
    
    # Region distribution
    region_map = {}
    for r in research_data:
        reg = r.get("region", "Không rõ").strip()
        region_map[reg] = region_map.get(reg, 0) + 1
        
    # Pain level (VAS) distribution
    pain_map = {}
    for r in research_data:
        p = r.get("pain_level", "Không rõ").strip()
        pain_map[p] = pain_map.get(p, 0) + 1
        
    # Disease severity distribution
    severity_map = {}
    for r in research_data:
        s = r.get("disease_severity", "Không rõ").strip()
        severity_map[s] = severity_map.get(s, 0) + 1
        
    # Duration of symptoms
    duration_map = {}
    for r in research_data:
        d = r.get("duration", "Không rõ").strip()
        duration_map[d] = duration_map.get(d, 0) + 1

    # Lesion side
    lesion_map = {}
    for r in research_data:
        l = r.get("lesion_side", "Không rõ").strip()
        lesion_map[l] = lesion_map.get(l, 0) + 1

    # Recording device
    device_map = {}
    for r in research_data:
        dev = r.get("recording_device", "Không rõ").strip()
        device_map[dev] = device_map.get(dev, 0) + 1
        
    # --- PART 2: CLINICIAN (BÁC SĨ) EVALUATION STATS ---
    # Filter clinical evaluations (doctor_username != "AI_Researcher")
    doc_evals = [e for e in doctor_evals if e.get("doctor_username") != "AI_Researcher"]
    total_doc_evals = len(doc_evals)
    
    # Results distribution
    result_map = {}
    for e in doc_evals:
        res = e.get("doctor_result", "Không rõ").strip()
        result_map[res] = result_map.get(res, 0) + 1
        
    # Common errors list
    error_map = {}
    for e in doc_evals:
        errs = e.get("errors", [])
        if isinstance(errs, list):
            for err in errs:
                err = err.strip()
                error_map[err] = error_map.get(err, 0) + 1
                
    # Treatment plan
    plan_map = {}
    for e in doc_evals:
        pl = e.get("plan", "Không rõ").strip()
        plan_map[pl] = plan_map.get(pl, 0) + 1
        
    # Recent qualitative clinician comments
    recent_comments = []
    for e in reversed(doc_evals[-8:]):  # Get up to last 8 evaluations
        recent_comments.append({
            "patient": e.get("patient_username", "N/A"),
            "exercise": e.get("exercise", "N/A"),
            "result": e.get("doctor_result", "N/A"),
            "comment": e.get("comments", "N/A"),
            "time": e.get("time", "N/A")
        })

    # Prepare markdown tables and details
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    # Format maps to helper strings
    def format_distribution(dist_map):
        return ", ".join([f"**{k}**: {v}" for k, v in dist_map.items()])

    markdown_content = f"""
## 📊 Kết quả Nghiên cứu & Đánh giá Lâm sàng (Clinical & Research Findings)

> [!NOTE]
> Báo cáo kết quả nghiên cứu khoa học và đánh giá lâm sàng được cập nhật tự động từ cơ sở dữ liệu Hugging Face Dataset.
> *Thời gian cập nhật dữ liệu gần nhất: **{now_str}***

### 1. Số liệu Thống kê Nghiên cứu viên (NCV) Thu thập (n = {total_subjects} bệnh án)

Hệ thống đã ghi nhận **{total_subjects}** hồ sơ bệnh án chi tiết từ các phiên tập luyện của bệnh nhân phục hồi chức năng:

*   **Thông tin Nhân khẩu học & Lâm sàng:**
    *   **Giới tính:** {format_distribution(gender_map)}
    *   **Độ tuổi trung bình:** **{avg_age:.1f} tuổi** (Dao động từ {min_age} đến {max_age} tuổi)
    *   **Khu vực sinh sống:** {format_distribution(region_map)}
    *   **Bên vai tổn thương:** {format_distribution(lesion_map)}
*   **Tình trạng Bệnh lý:**
    *   **Thời gian mắc bệnh:** {format_distribution(duration_map)}
    *   **Mức độ đau (VAS):** {format_distribution(pain_map)}
    *   **Mức độ nghiêm trọng:** {format_distribution(severity_map)}
*   **Phương thức ghi hình thu thập dữ liệu:**
    *   **Thiết bị ghi hình:** {format_distribution(device_map)}

### 2. Kết quả Đánh giá Phục hồi Chức năng (PHCN) của Bác sĩ (n = {total_doc_evals} lượt đánh giá)

Đội ngũ Bác sĩ và Kỹ thuật viên (KTV) từ **Bệnh viện Đa khoa Phạm Ngọc Thạch** đã tiến hành đánh giá lâm sàng (Ground Truth) song song với hệ thống AI:

| Chỉ số Đánh giá | Số lượng lượt đánh giá | Tỷ lệ phần trăm (%) |
| :--- | :---: | :---: |
| 🟢 **Tập luyện Đúng (Đạt yêu cầu)** | {result_map.get("Đúng", 0)} | {result_map.get("Đúng", 0) / total_doc_evals * 100 if total_doc_evals else 0:.1f}% |
| 🟡 **Tập luyện Gần đúng (Cần sửa)** | {result_map.get("Gần đúng", 0)} | {result_map.get("Gần đúng", 0) / total_doc_evals * 100 if total_doc_evals else 0:.1f}% |
| 🔴 **Tập luyện Sai (Không đạt)** | {result_map.get("Sai", 0)} | {result_map.get("Sai", 0) / total_doc_evals * 100 if total_doc_evals else 0:.1f}% |
| **Tổng số lượt đánh giá** | **{total_doc_evals}** | **100%** |

*   **Phác đồ đề xuất tiếp theo của Bác sĩ:**
    *   {format_distribution(plan_map)}

### 3. Phân tích các Lỗi cử động phổ biến của Bệnh nhân

Dựa trên dữ liệu dán nhãn của Bác sĩ, các lỗi kỹ thuật tập luyện bệnh nhân thường mắc phải bao gồm:

| Thứ tự | Loại lỗi kỹ thuật | Số lần ghi nhận | Tỷ lệ gặp (%) |
| :---: | :--- | :---: | :---: |
"""
    
    sorted_errors = sorted(error_map.items(), key=lambda x: x[1], reverse=True)
    for idx, (err, count) in enumerate(sorted_errors, 1):
        pct = (count / total_doc_evals * 100) if total_doc_evals else 0
        markdown_content += f"| {idx} | ❌ **{err}** | {count} | {pct:.1f}% |\n"
        
    markdown_content += """
### 4. Nhận xét Lâm sàng Chi tiết từ Bác sĩ (Các ca đánh giá gần đây nhất)

> [!TIP]
> Dưới đây là các ý kiến chuyên môn lâm sàng trực tiếp từ Bác sĩ điều trị đối với từng ca tập luyện:

"""
    
    for idx, comm in enumerate(recent_comments, 1):
        markdown_content += f"""*   **Ca số {idx} - Bệnh nhân: {comm['patient']}**
    *   *Bài tập:* {comm['exercise']} | *Bác sĩ đánh giá:* **{comm['result']}** ({comm['time']})
    *   *Nhận xét chuyên môn:* `"{comm['comment']}"`
"""
        
    return markdown_content

def update_readme(report_content):
    if not report_content:
        return False
        
    if not os.path.exists(README_PATH):
        print(f"❌ Không tìm thấy file {README_PATH}")
        return False
        
    with open(README_PATH, "r", encoding="utf-8") as f:
        readme_content = f.read()
        
    start_marker = "<!-- CLINICAL_FINDINGS_START -->"
    end_marker = "<!-- CLINICAL_FINDINGS_END -->"
    
    pattern = f"{start_marker}.*?{end_marker}"
    new_findings_section = f"{start_marker}\n{report_content}\n{end_marker}"
    
    if start_marker in readme_content and end_marker in readme_content:
        updated_content = re.sub(pattern, new_findings_section, readme_content, flags=re.DOTALL)
    else:
        # Insert before "## 🏗️ Kiến trúc hệ thống"
        target_header = "## 🏗️ Kiến trúc hệ thống (Architecture Overview)"
        if target_header in readme_content:
            updated_content = readme_content.replace(target_header, f"{new_findings_section}\n\n{target_header}")
        else:
            updated_content = readme_content + f"\n\n{new_findings_section}\n"
            
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(updated_content)
        
    print(f"🎉 Đã cập nhật thành công báo cáo lâm sàng vào file {README_PATH}!")
    return True

if __name__ == "__main__":
    print("🚀 Rehab AI Monitor - Công cụ Đồng bộ Dữ liệu & Cập nhật Báo cáo Lâm sàng")
    print("=======================================================================")
    
    # 1. Sync from HF
    download_latest_data()
    
    # 2. Run analysis
    report_content = generate_report()
    
    # 3. Update README
    if report_content:
        update_readme(report_content)
    else:
        print("❌ Lỗi: Không thể phân tích dữ liệu và cập nhật README.")
