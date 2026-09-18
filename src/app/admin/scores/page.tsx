// src/app/admin/scores/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Link2, RefreshCw, Search, Printer, CheckCircle, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import filterStyles from "./scores.module.css";
import tableStyles from "../subjects/subjects.module.css";

interface Subject { id: string; name: string; code: string; sheet_url?: string; }

interface SheetRow {
  no: number; student_code: string; first_name: string; last_name: string;
  classroom: string; assignment: number; quiz: number; final: number;
  behavior: number; total: number; grade: string;
}

const GRADE_COLOR: Record<string, string> = {
  "4.0": "#10B981","4.00": "#10B981","3.5": "#34D399","3.50": "#34D399",
  "3.0": "#6EE7B7","3.00": "#6EE7B7","2.5": "#FCD34D","2.50": "#FCD34D",
  "2.0": "#FBBF24","2.00": "#FBBF24","1.5": "#F97316","1.50": "#F97316",
  "1.0": "#EF4444","1.00": "#EF4444","0.0": "#6B7280","0.00": "#6B7280",
};
const gc = (g: string) => GRADE_COLOR[g] || "#6B7280";

export default function AdminScoresPage() {
  const { showToast } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selSubject, setSelSubject] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [sheetTitle, setSheetTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/subjects").then(r => r.json()).then(d => {
      if (d.success) { setSubjects(d.subjects); setSelSubject(d.subjects[0]?.id || ""); }
    });
  }, []);

  useEffect(() => {
    const s = subjects.find(x => x.id === selSubject);
    setSheetUrl(s?.sheet_url || "");
    setRows([]); setSheetTitle("");
  }, [selSubject, subjects]);

  const saveUrl = async () => {
    setIsSavingUrl(true);
    const res = await fetch("/api/admin/scores/sheet-proxy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_id: selSubject, sheet_url: sheetUrl }),
    });
    const d = await res.json();
    if (d.success) {
      showToast("บันทึก URL สำเร็จ", "success");
      setSubjects(prev => prev.map(s => s.id === selSubject ? { ...s, sheet_url: sheetUrl } : s));
    } else showToast(d.error, "danger");
    setIsSavingUrl(false);
  };

  const loadSheet = async () => {
    if (!selSubject) return;
    setIsLoading(true); setRows([]);
    const res = await fetch(`/api/admin/scores/sheet-proxy?subject_id=${selSubject}`);
    const d = await res.json();
    setIsLoading(false);
    if (d.success) { setRows(d.rows); setSheetTitle(d.title); showToast(`โหลดข้อมูล ${d.rows.length} คน`, "success"); }
    else showToast(d.error, "danger");
  };

  const filtered = rows.filter(r =>
    r.student_code.includes(search) || r.first_name.includes(search) || r.last_name.includes(search)
  );
  const avg = rows.length > 0 ? (rows.reduce((s,r) => s+r.total,0)/rows.length).toFixed(2) : "—";
  const gradeCounts: Record<string,number> = {};
  rows.forEach(r => { gradeCounts[r.grade] = (gradeCounts[r.grade]||0)+1; });
  const curSubject = subjects.find(s => s.id === selSubject);

  return (
    <div className="animate-fade-in print-area">

      {/* ── ตัวกรอง ── */}
      <div className={`${filterStyles.filterCard} glass-card no-print`}>
        <h4 style={{ fontWeight:700, color:"var(--text-main)", marginBottom:"16px", display:"flex", alignItems:"center", gap:"8px" }}>
          <Link2 size={18} color="var(--primary)" /> คะแนนจาก Google Sheet แยกตามวิชา
        </h4>
        <div className={filterStyles.filterRow} style={{ alignItems:"flex-end", gap:"12px", flexWrap:"wrap" }}>
          {/* เลือกวิชา */}
          <div className={filterStyles.filterGroup}>
            <label className={tableStyles.label}>รายวิชา</label>
            <select className={tableStyles.input} value={selSubject} onChange={e => setSelSubject(e.target.value)}>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          {/* URL ชีต */}
          <div className={filterStyles.filterGroup} style={{ flex:2, minWidth:"260px" }}>
            <label className={tableStyles.label}>Google Sheet URL (ตัดเกรดวิชานี้)</label>
            <div style={{ display:"flex", gap:"8px" }}>
              <input type="text" className={tableStyles.input}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
                style={{ flex:1 }} />
              <button onClick={saveUrl} disabled={isSavingUrl}
                style={{ padding:"0 14px", background:"var(--primary)", color:"#fff", border:"none",
                  borderRadius:"8px", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>
                {isSavingUrl ? "..." : "บันทึก URL"}
              </button>
            </div>
          </div>
          {/* โหลดข้อมูล */}
          <button onClick={loadSheet} disabled={isLoading || !curSubject?.sheet_url}
            style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 18px",
              background: curSubject?.sheet_url ? "var(--primary)" : "#ccc",
              color:"#fff", border:"none", borderRadius:"8px", cursor: curSubject?.sheet_url ? "pointer" : "not-allowed",
              fontWeight:700, height:"42px" }}>
            <RefreshCw size={16} className={isLoading ? "spin" : ""} />
            {isLoading ? "กำลังโหลด..." : "โหลดคะแนน"}
          </button>
        </div>
      </div>

      {/* ── ข้อมูลคะแนน ── */}
      {rows.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="no-print" style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"12px", marginBottom:"16px" }}>
            <div className={tableStyles.searchBar} style={{ maxWidth:"240px" }}>
              <Search size={16} className={tableStyles.searchIcon} />
              <input className={tableStyles.searchInput} placeholder="ค้นหาชื่อ/รหัส..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => window.print()}
              style={{ display:"flex", alignItems:"center", gap:"6px", padding:"9px 16px",
                border:"1px solid #ddd", borderRadius:"8px", background:"var(--bg-card)", cursor:"pointer" }}>
              <Printer size={16} /> พิมพ์ / PDF
            </button>
          </div>

          {/* Document header */}
          <div style={{ textAlign:"center", marginBottom:"16px" }}>
            <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:"var(--text-main)", margin:0 }}>
              {sheetTitle || `สรุปคะแนน ${curSubject?.code} ${curSubject?.name}`}
            </h2>
            <p style={{ color:"var(--text-sub)", fontSize:"0.85rem", marginTop:"4px" }}>
              {rows.length} คน &nbsp;|&nbsp; คะแนนเฉลี่ย <strong style={{color:"var(--primary)"}}>{avg}</strong>
            </p>
          </div>

          {/* Grade chips */}
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"16px" }} className="no-print">
            {Object.entries(gradeCounts).sort((a,b) => Number(b[0])-Number(a[0])).map(([g,c]) => (
              <div key={g} style={{ padding:"5px 14px", borderRadius:"20px", fontSize:"0.8rem", fontWeight:700,
                background:gc(g)+"20", color:gc(g), border:`1px solid ${gc(g)}50` }}>
                เกรด {g}: {c} คน
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="glass-card" style={{ padding:0, overflow:"hidden", borderRadius:"12px" }}>
            <div className={tableStyles.tableContainer} style={{ margin:0 }}>
              <table className={tableStyles.table}>
                <thead className={tableStyles.thead}>
                  <tr>
                    <th className={tableStyles.th} style={{ width:"50px", textAlign:"center" }}>ลำดับ</th>
                    <th className={tableStyles.th} style={{ width:"120px" }}>รหัสนักเรียน</th>
                    <th className={tableStyles.th}>ชื่อ - นามสกุล</th>
                    <th className={tableStyles.th} style={{ width:"110px" }}>ห้อง</th>
                    <th className={tableStyles.th} style={{ width:"75px", textAlign:"center" }}>งาน<br/><small style={{fontWeight:400,color:"#888"}}>/30</small></th>
                    <th className={tableStyles.th} style={{ width:"80px", textAlign:"center" }}>สอบย่อย<br/><small style={{fontWeight:400,color:"#888"}}>/20</small></th>
                    <th className={tableStyles.th} style={{ width:"85px", textAlign:"center" }}>ปลายภาค<br/><small style={{fontWeight:400,color:"#888"}}>/30</small></th>
                    <th className={tableStyles.th} style={{ width:"80px", textAlign:"center" }}>จิตพิสัย<br/><small style={{fontWeight:400,color:"#888"}}>/20</small></th>
                    <th className={tableStyles.th} style={{ width:"75px", textAlign:"center", background:"rgba(99,102,241,0.06)" }}><strong>รวม</strong></th>
                    <th className={tableStyles.th} style={{ width:"75px", textAlign:"center" }}>เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.student_code} className={tableStyles.tr}>
                      <td className={tableStyles.td} style={{ textAlign:"center", color:"var(--text-sub)" }}>{r.no}</td>
                      <td className={tableStyles.td}><span className={tableStyles.codeBadge}>{r.student_code}</span></td>
                      <td className={tableStyles.td} style={{ fontWeight:600 }}>{r.first_name} {r.last_name}</td>
                      <td className={tableStyles.td} style={{ fontSize:"0.85rem", color:"var(--text-sub)" }}>{r.classroom}</td>
                      <td className={tableStyles.td} style={{ textAlign:"center", fontWeight:600 }}>{r.assignment}</td>
                      <td className={tableStyles.td} style={{ textAlign:"center", fontWeight:600 }}>{r.quiz}</td>
                      <td className={tableStyles.td} style={{ textAlign:"center", fontWeight:600 }}>{r.final}</td>
                      <td className={tableStyles.td} style={{ textAlign:"center", fontWeight:600 }}>{r.behavior}</td>
                      <td className={tableStyles.td} style={{ textAlign:"center", background:"rgba(99,102,241,0.04)" }}>
                        <strong style={{ fontSize:"1rem", color:"var(--primary)" }}>{r.total}</strong>
                      </td>
                      <td className={tableStyles.td} style={{ textAlign:"center" }}>
                        <span style={{ display:"inline-block", padding:"3px 12px", borderRadius:"20px",
                          fontWeight:800, fontSize:"0.88rem", background:gc(r.grade)+"20",
                          color:gc(r.grade), border:`1px solid ${gc(r.grade)}50` }}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* empty states */}
      {rows.length === 0 && !isLoading && selSubject && (
        <div className="glass-card text-center" style={{ padding:"48px 24px", marginTop:"24px" }}>
          <AlertCircle size={40} color="var(--text-sub)" style={{ margin:"0 auto 12px" }} />
          <h3 style={{ color:"var(--text-main)" }}>
            {curSubject?.sheet_url ? "กดโหลดคะแนนเพื่อดูข้อมูล" : "ยังไม่ได้ตั้ง Google Sheet URL สำหรับวิชานี้"}
          </h3>
          <p style={{ color:"var(--text-sub)", fontSize:"0.9rem" }}>
            {curSubject?.sheet_url ? "คลิกปุ่ม \"โหลดคะแนน\" ด้านบน" : "ใส่ URL ชีตตัดเกรดในช่องด้านบนแล้วกด \"บันทึก URL\""}
          </p>
        </div>
      )}

      <style jsx global>{`
        @media print { .no-print { display:none!important; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
