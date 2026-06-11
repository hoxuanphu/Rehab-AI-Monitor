#!/usr/bin/env python3
"""Xuất số liệu chính xác từ database — dùng cùng logic ưu tiên như app."""
import json
import os
from datetime import datetime

BASE = os.path.join(os.path.dirname(__file__), "..", "database")
OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "_VERIFIED_METRICS.txt")


def parse_t(s):
    if not s:
        return datetime.min
    for fmt in ("%H:%M - %d/%m/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except Exception:
            pass
    return datetime.min


def lay_metrics_chinh(m):
    """Metrics chính ±30° — ưu tiên lần chạy mới nhất (top-level nếu nhiều frame hơn g2)."""
    if not isinstance(m, dict):
        return {}
    g2 = m.get("metrics_g2") if isinstance(m.get("metrics_g2"), dict) else {}
    top_tf = int(m.get("tong_frame_hop_le") or 0)
    g2_tf = int(g2.get("tong_frame_hop_le") or 0)
    if m.get("do_chinh_xac") is not None and (not g2_tf or top_tf >= g2_tf):
        return m
    if g2.get("do_chinh_xac") is not None:
        return g2
    return m


def ai_ket_luan(acc):
    if acc >= 80:
        return "Đúng"
    if acc >= 50:
        return "Gần đúng"
    return "Sai"


def main():
    vl = json.load(open(os.path.join(BASE, "video_list.json"), encoding="utf-8"))
    ev = json.load(open(os.path.join(BASE, "doctor_evaluations.json"), encoding="utf-8"))

    latest = {}
    for e in ev:
        k = (e.get("patient_username"), e.get("exercise"), e.get("doctor_username"))
        if k not in latest or parse_t(e.get("time")) >= parse_t(latest[k].get("time")):
            latest[k] = e

    lines = []
    total_frames = 0
    codman_acc = []
    gay_acc = []

    lines.append("VERIFIED FROM database/video_list.json + doctor_evaluations.json")
    lines.append(f"Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    lines.append("")

    for i, v in enumerate(vl, 1):
        m = v.get("metrics") or {}
        mc = lay_metrics_chinh(m)
        acc = round(float(mc.get("do_chinh_xac") or m.get("do_chinh_xac") or v.get("accuracy") or 0), 1)
        fd = mc.get("frame_dung") or m.get("frame_dung")
        tot = mc.get("tong_frame_hop_le") or m.get("tong_frame_hop_le") or 0
        total_frames += int(tot or 0)

        ex = v.get("exercise") or ""
        if "Codman" in ex:
            codman_acc.append(acc)
        elif "gậy" in ex.lower() or "gay" in ex.lower():
            gay_acc.append(acc)

        g1, g2, g3 = m.get("metrics_g1") or {}, m.get("metrics_g2") or {}, m.get("metrics_g3") or {}
        kai = (v.get("username"), ex, "AI_Researcher")
        kdoc = (v.get("username"), ex, "doctor1")
        ai_e = latest.get(kai, {})
        doc_e = latest.get(kdoc, {})

        lines.append(f"[{i}] {v.get('full_name')} | {ex}")
        lines.append(f"  video_list.time: {v.get('time')}")
        lines.append(f"  ACC chinh (±30°): {acc}% | frames: {fd}/{tot}")
        lines.append(
            f"  MAE={round(mc.get('mae_tong') or m.get('mae_tong') or 0, 1)} "
            f"F1={round(mc.get('f1_score') or m.get('f1_score') or 0, 2)} "
            f"ICC={round(mc.get('icc') or m.get('icc') or 0, 2)}"
        )
        lines.append(
            f"  goc_vai TB={round(m.get('tb_goc_vai') or mc.get('tb_goc_vai') or 0, 1)} "
            f"std={round(m.get('std_goc_vai') or mc.get('std_goc_vai') or 0, 1)} "
            f"min={round(m.get('min_goc_vai') or mc.get('min_goc_vai') or 0, 1)} "
            f"max={round(m.get('max_goc_vai') or mc.get('max_goc_vai') or 0, 1)}"
        )
        lines.append(
            f"  goc_khuyu TB={round(m.get('tb_goc_khuyu') or mc.get('tb_goc_khuyu') or 0, 1)} "
            f"std={round(m.get('std_goc_khuyu') or mc.get('std_goc_khuyu') or 0, 1)}"
        )
        if g1.get("do_chinh_xac"):
            lines.append(
                f"  3GD: G1={g1.get('do_chinh_xac')}% G2={g2.get('do_chinh_xac')}% G3={g3.get('do_chinh_xac')}%"
            )
        else:
            lines.append("  3GD: (chi phan tich tong quan ±30°, khong co 3 giai doan)")
        lines.append(f"  AI ket luan (rule): {ai_ket_luan(acc)} | AI eval DB: {ai_e.get('doctor_result')} ({ai_e.get('time')})")
        lines.append(f"  BS: {doc_e.get('doctor_result')} | errors={doc_e.get('errors')} ({doc_e.get('time')})")
        lines.append("")

    lines.append("--- TONG KET ---")
    lines.append(f"Tong khung hop le (8 video): {total_frames}")
    if codman_acc:
        lines.append(f"Codman ACC: {min(codman_acc)}% - {max(codman_acc)}% TB={round(sum(codman_acc)/len(codman_acc),1)}%")
    if gay_acc:
        lines.append(f"Gay ACC: {min(gay_acc)}% - {max(gay_acc)}% TB={round(sum(gay_acc)/len(gay_acc),1)}%")

    text = "\n".join(lines)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
