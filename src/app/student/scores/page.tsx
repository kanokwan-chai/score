// src/app/student/scores/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import styles from "./scores.module.css";

interface SubjectScore {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  sheet_title: string;
  student_code: string;
  first_name: string;
  last_name: string;
  classroom: string;
  assignment: number;
  quiz: number;
  final: number;
  behavior: number;
  total: number;
  grade: string;
}

const GRADE_COLOR: Record<string, string> = {
  "4.0":"#10B981","4.00":"#10B981","3.5":"#34D399","3.50":"#34D399",
  "3.0":"#6EE7B7","3.00":"#6EE7B7","2.5":"#FCD34D","2.50":"#FCD34D",
  "2.0":"#FBBF24","2.00":"#FBBF24","1.5":"#F97316","1.50":"#F97316",
  "1.0":"#EF4444","1.00":"#EF4444","0.0":"#6B7280","0.00":"#6B7280",
};
const gc = (g: string) => GRADE_COLOR[g] || "#6B7280";

const GRADE_BG: Record<string, string> = {
  "4.0":"linear-gradient(135deg,#10B981,#059669)",
  "4.00":"linear-gradient(135deg,#10B981,#059669)",
  "3.5":"linear-gradient(135deg,#34D399,#10B981)",
  "3.50":"linear-gradient(135deg,#34D399,#10B981)",
  "3.0":"linear-gradient(135deg,#6EE7B7,#34D399)",
  "3.00":"linear-gradient(135deg,#6EE7B7,#34D399)",
  "2.5":"linear-gradient(135deg,#FCD34D,#F59E0B)",
  "2.50":"linear-gradient(135deg,#FCD34D,#F59E0B)",
  "2.0":"linear-gradient(135deg,#FBBF24,#F59E0B)",
  "2.00":"linear-gradient(135deg,#FBBF24,#F59E0B)",
  "1.5":"linear-gradient(135deg,#F97316,#EA580C)",
  "1.50":"linear-gradient(135deg,#F97316,#EA580C)",
  "1.0":"linear-gradient(135deg,#EF4444,#DC2626)",
  "1.00":"linear-gradient(135deg,#EF4444,#DC2626)",
  "0.0":"linear-gradient(135deg,#9CA3AF,#6B7280)",
  "0.00":"linear-gradient(135deg,#9CA3AF,#6B7280)",
};
const gbg = (g: string) => GRADE_BG[g] || "linear-gradient(135deg,#9CA3AF,#6B7280)";

export default function StudentScoresPage() {
  const [scores, setScores] = useState<SubjectScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/student/sheet-scores")
      .then(r => r.json())
      .then(d => {
        if (d.success) setScores(d.scores as SubjectScore[]);
        else setError(d.error || "เกิดข้อผิดพลาด");
      })
      .catch(() => setError("ไม่สามารถโหลดคะแนนได้"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ width:"36px", height:"36px", border:"4px solid rgba(99,102,241,0.15)",
        borderTopColor:"var(--primary)", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
      <p style={{ color:"var(--text-sub)" }}>กำลังโหลดคะแนน...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div className="glass-card text-center" style={{ padding:"48px 24px" }}>
      <AlertCircle size={44} color="var(--danger)" style={{ margin:"0 auto 12px" }} />
      <h3 style={{ color:"var(--text-main)" }}>โหลดคะแนนไม่ได้</h3>
      <p style={{ color:"var(--text-sub)" }}>{error}</p>
    </div>
  );

  if (scores.length === 0) return (
    <div className="glass-card text-center" style={{ padding:"60px 24px" }}>
      <BookOpen size={52} color="var(--text-sub)" style={{ margin:"0 auto 16px" }} />
      <h3 style={{ color:"var(--text-main)", marginBottom:"8px" }}>ยังไม่มีข้อมูลคะแนน</h3>
      <p style={{ color:"var(--text-sub)" }}>ครูยังไม่ได้เพิ่มคะแนนให้วิชานี้ กรุณารอสักครู่</p>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontWeight:800, fontSize:"1.5rem", color:"var(--text-main)", margin:0, display:"flex", alignItems:"center", gap:"10px" }}>
          <TrendingUp size={26} color="var(--primary)" /> คะแนนและเกรดของฉัน
        </h2>
        <p style={{ color:"var(--text-sub)", marginTop:"6px", fontSize:"0.9rem" }}>
          {scores[0]?.first_name} {scores[0]?.last_name} &nbsp;|&nbsp; {scores[0]?.classroom}
        </p>
      </div>

      {/* Cards per subject */}
      <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
        {scores.map(s => (
          <div key={s.subject_id} className="glass-card animate-fade-in" style={{ padding:0, overflow:"hidden", borderRadius:"16px" }}>

            {/* Header strip */}
            <div style={{ padding:"18px 24px", background:"rgba(99,102,241,0.05)",
              borderBottom:"1px solid rgba(99,102,241,0.1)", display:"flex",
              justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"38px", height:"38px", borderRadius:"10px",
                  background:"var(--primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <BookOpen size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:"1rem", color:"var(--text-main)" }}>{s.subject_code} — {s.subject_name}</div>
                  <div style={{ fontSize:"0.78rem", color:"var(--text-sub)", marginTop:"2px" }}>{s.sheet_title || "ตัดเกรด"}</div>
                </div>
              </div>
              {/* Grade badge big */}
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"0.75rem", color:"var(--text-sub)", marginBottom:"2px" }}>คะแนนรวม</div>
                  <div style={{ fontWeight:800, fontSize:"1.5rem", color:"var(--primary)" }}>{s.total}<span style={{ fontSize:"0.85rem", fontWeight:400, color:"var(--text-sub)" }}>/100</span></div>
                </div>
                <div style={{ width:"60px", height:"60px", borderRadius:"12px",
                  background: gbg(s.grade),
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"0 4px 12px " + gc(s.grade) + "40" }}>
                  <span style={{ color:"#fff", fontWeight:900, fontSize:"1.2rem" }}>{s.grade}</span>
                </div>
              </div>
            </div>

            {/* Score breakdown */}
            <div style={{ padding:"20px 24px", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:"16px" }}>
              {[
                { label:"งาน", value:s.assignment, max:30, color:"#6366F1" },
                { label:"สอบย่อย", value:s.quiz, max:20, color:"#8B5CF6" },
                { label:"ปลายภาค", value:s.final, max:30, color:"#EC4899" },
                { label:"จิตพิสัย", value:s.behavior, max:20, color:"#14B8A6" },
              ].map(cat => (
                <div key={cat.label} style={{ background:"var(--bg-card)", borderRadius:"12px",
                  padding:"14px 16px", border:"1px solid rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize:"0.78rem", color:"var(--text-sub)", marginBottom:"6px" }}>{cat.label}</div>
                  <div style={{ fontWeight:800, fontSize:"1.4rem", color:cat.color }}>
                    {cat.value}
                    <span style={{ fontSize:"0.8rem", fontWeight:400, color:"var(--text-sub)" }}>/{cat.max}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop:"8px", height:"4px", background:"rgba(0,0,0,0.07)", borderRadius:"2px" }}>
                    <div style={{ height:"100%", borderRadius:"2px", width:`${Math.min(100,(cat.value/cat.max)*100)}%`,
                      background:cat.color, transition:"width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
