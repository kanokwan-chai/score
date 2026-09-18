// src/app/student/scores/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { BookOpen, AlertCircle, Star } from "lucide-react";

interface SubjectScore {
  subject_id: string; subject_name: string; subject_code: string;
  title: string; student_code: string; first_name: string; last_name: string;
  classroom: string; assignment: number; quiz: number; final: number;
  behavior: number; total: number; grade: string;
}

const GRADE_STYLE: Record<string, { bg: string; color: string }> = {
  "4.0":  { bg: "#ECFDF5", color: "#059669" }, "4.00": { bg: "#ECFDF5", color: "#059669" },
  "3.5":  { bg: "#D1FAE5", color: "#10B981" }, "3.50": { bg: "#D1FAE5", color: "#10B981" },
  "3.0":  { bg: "#A7F3D0", color: "#059669" }, "3.00": { bg: "#A7F3D0", color: "#059669" },
  "2.5":  { bg: "#FEF9C3", color: "#B45309" }, "2.50": { bg: "#FEF9C3", color: "#B45309" },
  "2.0":  { bg: "#FEF3C7", color: "#D97706" }, "2.00": { bg: "#FEF3C7", color: "#D97706" },
  "1.5":  { bg: "#FFEDD5", color: "#C2410C" }, "1.50": { bg: "#FFEDD5", color: "#C2410C" },
  "1.0":  { bg: "#FEE2E2", color: "#DC2626" }, "1.00": { bg: "#FEE2E2", color: "#DC2626" },
  "0.0":  { bg: "#F3F4F6", color: "#6B7280" }, "0.00": { bg: "#F3F4F6", color: "#6B7280" },
};
const gs = (g: string) => GRADE_STYLE[g] || { bg: "#F3F4F6", color: "#6B7280" };

const CATS = [
  { key: "assignment", label: "งานที่มอบหมาย", max: 30, color: "#6366F1" },
  { key: "quiz",       label: "สอบย่อย",        max: 20, color: "#8B5CF6" },
  { key: "final",      label: "ปลายภาค",         max: 30, color: "#EC4899" },
  { key: "behavior",   label: "จิตพิสัย",        max: 20, color: "#14B8A6" },
] as const;

export default function StudentScoresPage() {
  const [scores, setScores] = useState<SubjectScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/student/sheet-scores")
      .then(r => r.json())
      .then(d => { if (d.success) setScores(d.scores); else setErr(d.error || "เกิดข้อผิดพลาด"); })
      .catch(() => setErr("ไม่สามารถโหลดคะแนนได้"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ width: 36, height: 36, border: "4px solid #E0E7FF",
        borderTopColor: "#6366F1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
      <p style={{ color: "var(--text-sub)" }}>กำลังโหลดคะแนน...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (err) return (
    <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
      <AlertCircle size={44} color="#EF4444" style={{ margin: "0 auto 12px" }} />
      <h3>โหลดคะแนนไม่ได้</h3><p style={{ color: "var(--text-sub)" }}>{err}</p>
    </div>
  );

  if (scores.length === 0) return (
    <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
      <BookOpen size={52} color="#D1D5DB" style={{ margin: "0 auto 16px" }} />
      <h3>ยังไม่มีข้อมูลคะแนน</h3>
      <p style={{ color: "var(--text-sub)" }}>ครูยังไม่ได้เพิ่มคะแนนสำหรับวิชานี้</p>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: "0 auto" }}>

      {/* page title */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.4rem", color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Star size={22} color="#6366F1" /> คะแนนของฉัน
        </h2>
        <p style={{ color: "var(--text-sub)", marginTop: 4, fontSize: "0.88rem" }}>
          {scores[0]?.first_name} {scores[0]?.last_name} &nbsp;•&nbsp; {scores[0]?.classroom} &nbsp;•&nbsp; รหัส {scores[0]?.student_code}
        </p>
      </div>

      {/* one card per subject */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {scores.map(s => {
          const style = gs(s.grade);
          const pct = Math.round((s.total / 100) * 100);
          return (
            <div key={s.subject_id} className="glass-card animate-fade-in"
              style={{ padding: 0, overflow: "hidden", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)" }}>

              {/* ── header ── */}
              <div style={{ padding: "20px 24px", background: "rgba(99,102,241,0.04)", borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-main)" }}>
                      {s.subject_code} — {s.subject_name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-sub)", marginTop: 3 }}>{s.title || "ตัดเกรด"}</div>
                  </div>

                  {/* grade + total */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* total */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-sub)", marginBottom: 2 }}>คะแนนรวม</div>
                      <div style={{ fontWeight: 900, fontSize: "2rem", lineHeight: 1, color: "#6366F1" }}>
                        {s.total}
                        <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-sub)" }}>/100</span>
                      </div>
                    </div>
                    {/* grade badge */}
                    <div style={{
                      width: 64, height: 64, borderRadius: 14,
                      background: style.bg, border: `2px solid ${style.color}30`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 4px 14px ${style.color}25`
                    }}>
                      <div style={{ fontSize: "0.6rem", color: style.color, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 1 }}>เกรด</div>
                      <div style={{ fontWeight: 900, fontSize: "1.3rem", color: style.color }}>{s.grade}</div>
                    </div>
                  </div>
                </div>

                {/* overall progress bar */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-sub)", marginBottom: 4 }}>
                    <span>คะแนนรวม {s.total}/100</span><span>{pct}%</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(0,0,0,0.07)", borderRadius: 4 }}>
                    <div style={{ height: "100%", borderRadius: 4, width: `${pct}%`,
                      background: `linear-gradient(90deg, ${style.color}, ${style.color}99)`,
                      transition: "width 0.8s ease" }} />
                  </div>
                </div>
              </div>

              {/* ── breakdown ── */}
              <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                {CATS.map(cat => {
                  const val = s[cat.key];
                  const p = Math.round((val / cat.max) * 100);
                  return (
                    <div key={cat.key} style={{ background: "var(--bg-card)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(0,0,0,0.04)" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-sub)", marginBottom: 6 }}>{cat.label}</div>
                      <div style={{ fontWeight: 800, fontSize: "1.3rem", color: cat.color }}>
                        {val}<span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-sub)" }}>/{cat.max}</span>
                      </div>
                      <div style={{ marginTop: 6, height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2 }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${p}%`, background: cat.color, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


