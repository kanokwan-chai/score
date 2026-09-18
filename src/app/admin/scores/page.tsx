// src/app/admin/scores/page.tsx
"use client";

import React, { useState, useRef } from "react";
import {
  Upload, Save, Search, FileSpreadsheet, CheckCircle,
  Info, Printer, Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { useApp } from "@/context/AppContext";
import filterStyles from "./scores.module.css";
import tableStyles from "../subjects/subjects.module.css";

// ————————————————————————————————
// Types
// ————————————————————————————————
interface Subject { id: string; name: string; code: string; }
interface Classroom { id: string; name: string; }

interface ScoreRow {
  no: number;
  student_code: string;
  first_name: string;
  last_name: string;
  classroom: string;
  assignment: number;   // งาน 30
  quiz: number;         // สอบย่อย 20
  final: number;        // ปลายภาค 30
  behavior: number;     // จิตพิสัย 20
  total: number;
  grade: string;
}

// คอลัมน์ตามชีตของครู (0-index)
// row 0 = ชื่อวิชา, row 1 = header, row 2+ = ข้อมูล
const COL = {
  no:         0,
  studentCode: 1,
  firstName:  2,
  lastName:   3,
  classroom:  4,
  assignment: 5,
  quiz:       6,
  final:      7,
  behavior:   8,
  total:      9,
  grade:      10,
};

const GRADE_COLORS: Record<string, string> = {
  "4.00": "#10B981",
  "3.50": "#34D399",
  "3.00": "#6EE7B7",
  "2.50": "#FCD34D",
  "2.00": "#FBBF24",
  "1.50": "#F97316",
  "1.00": "#EF4444",
  "0.00": "#6B7280",
};

function gradeColor(grade: string) {
  return GRADE_COLORS[grade] || "#6B7280";
}

// ————————————————————————————————
// Page
// ————————————————————————————————
export default function AdminScoresPage() {
  const { showToast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [sheetTitle, setSheetTitle] = useState("");
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // ————————————————————————————————
  // Parse file
  // ————————————————————————————————
  const parseFile = (file: File) => {
    setFileName(file.name);
    setSavedOk(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // แถว 0 = ชื่อวิชา
      const title = String(raw[0]?.[0] ?? "").trim();
      setSheetTitle(title);

      const parsed: ScoreRow[] = [];
      for (let i = 2; i < raw.length; i++) {
        const r = raw[i] as unknown[];
        const code = String(r[COL.studentCode] ?? "").trim();
        if (!code || isNaN(Number(code))) continue;

        const assignment = Number(r[COL.assignment]);
        const quiz       = Number(r[COL.quiz]);
        const fin        = Number(r[COL.final]);
        const behavior   = Number(r[COL.behavior]);
        const total      = Number(r[COL.total]);
        const grade      = String(r[COL.grade] ?? "").trim();

        parsed.push({
          no:           Number(r[COL.no]) || i - 1,
          student_code: code,
          first_name:   String(r[COL.firstName] ?? ""),
          last_name:    String(r[COL.lastName] ?? ""),
          classroom:    String(r[COL.classroom] ?? ""),
          assignment:   isNaN(assignment) ? 0 : assignment,
          quiz:         isNaN(quiz) ? 0 : quiz,
          final:        isNaN(fin) ? 0 : fin,
          behavior:     isNaN(behavior) ? 0 : behavior,
          total:        isNaN(total) ? 0 : total,
          grade,
        });
      }

      setRows(parsed);
      if (parsed.length === 0) showToast("ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบรูปแบบชีต", "warning");
      else showToast(`โหลดข้อมูลสำเร็จ ${parsed.length} คน`, "success");
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredRows = rows.filter((r) =>
    r.student_code.includes(search) ||
    r.first_name.includes(search) ||
    r.last_name.includes(search)
  );

  // ————————————————————————————————
  // Save to DB via import-sheet API
  // ————————————————————————————————
  const handleSave = async (subjectId: string, classroom: string) => {
    if (!subjectId || !classroom) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/scores/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          classroom,
          rows: rows.map((r) => ({
            student_code: r.student_code,
            assignment: r.assignment,
            quiz: r.quiz,
            final: r.final,
            behavior: r.behavior,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedOk(true);
        showToast(data.message, "success");
      } else {
        showToast(data.error || "บันทึกล้มเหลว", "danger");
      }
    } catch {
      showToast("ระบบผิดพลาด", "danger");
    } finally {
      setIsSaving(false);
    }
  };

  // ————————————————————————————————
  // Save dialog state (subject + classroom selection)
  // ————————————————————————————————
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selSubject, setSelSubject] = useState("");
  const [selClassroom, setSelClassroom] = useState("");
  const [modalLoaded, setModalLoaded] = useState(false);

  const openSaveModal = async () => {
    setShowSaveModal(true);
    if (!modalLoaded) {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/admin/subjects"),
        fetch("/api/public/classrooms"),
      ]);
      const sData = await sRes.json();
      const cData = await cRes.json();
      if (sData.success) { setSubjects(sData.subjects); setSelSubject(sData.subjects[0]?.id || ""); }
      if (cData.success) { setClassrooms(cData.classrooms); setSelClassroom(cData.classrooms[0]?.name || ""); }
      setModalLoaded(true);
    }
  };

  // ————————————————————————————————
  // Summary stats
  // ————————————————————————————————
  const gradeCounts: Record<string, number> = {};
  rows.forEach((r) => { gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1; });
  const avg = rows.length > 0 ? (rows.reduce((s, r) => s + r.total, 0) / rows.length).toFixed(2) : "—";

  // ————————————————————————————————
  // Render
  // ————————————————————————————————
  return (
    <div className="animate-fade-in print-area">

      {/* ───── Upload zone ───── */}
      {rows.length === 0 && (
        <div
          className="glass-card"
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: "2px dashed var(--primary)", borderRadius: "16px",
            padding: "72px 24px", textAlign: "center", cursor: "pointer",
            background: "rgba(99,102,241,0.03)",
          }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }}
          />
          <FileSpreadsheet size={56} color="var(--primary)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ color: "var(--text-main)", fontWeight: 700, marginBottom: "8px" }}>
            อัปโหลดไฟล์ชีตตัดเกรด
          </h3>
          <p style={{ color: "var(--text-sub)", fontSize: "0.9rem" }}>
            ลากไฟล์มาวาง หรือคลิกเพื่อเลือก — รองรับ .xlsx, .xls, .csv
          </p>
          <div style={{
            marginTop: "24px", display: "inline-flex", alignItems: "flex-start", gap: "8px",
            background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: "10px", padding: "12px 16px", textAlign: "left",
            fontSize: "0.82rem", color: "var(--text-sub)", maxWidth: "500px"
          }}>
            <Info size={15} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              <strong style={{ color: "var(--text-main)" }}>รูปแบบชีต:</strong> แถว 1 = ชื่อวิชา | แถว 2 = หัวคอลัมน์ | แถว 3+ = ข้อมูลนักเรียน<br />
              คอลัมน์: B=รหัส | C=ชื่อ | D=นามสกุล | E=ห้อง | <strong>F=งาน(30)</strong> | <strong>G=สอบย่อย(20)</strong> | <strong>H=ปลายภาค(30)</strong> | <strong>I=จิตพิสัย(20)</strong> | J=รวม | K=เกรด
            </span>
          </div>
        </div>
      )}

      {/* ───── Loaded view ───── */}
      {rows.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {/* search */}
              <div className={tableStyles.searchBar} style={{ maxWidth: "240px" }}>
                <Search size={16} className={tableStyles.searchIcon} />
                <input type="text" className={tableStyles.searchInput}
                  placeholder="ค้นหาชื่อ/รหัส..."
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {/* change file */}
              <button
                onClick={() => { setRows([]); setFileName(""); setSearch(""); setSavedOk(false); }}
                style={{ padding: "8px 14px", border: "1px solid #ddd", borderRadius: "8px",
                  background: "var(--bg-card)", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-sub)" }}
              >
                เปลี่ยนไฟล์
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => window.print()}
                style={{ display: "flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", border: "1px solid #ddd", borderRadius: "8px",
                  background: "var(--bg-card)", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-main)" }}
              >
                <Printer size={16} /> พิมพ์ / PDF
              </button>
              <button
                onClick={openSaveModal}
                disabled={savedOk}
                style={{ display: "flex", alignItems: "center", gap: "6px",
                  padding: "9px 18px", border: "none", borderRadius: "8px",
                  background: savedOk ? "#10B981" : "var(--primary)", color: "#fff",
                  cursor: savedOk ? "default" : "pointer", fontWeight: 700, fontSize: "0.9rem" }}
              >
                {savedOk ? <><CheckCircle size={16} /> บันทึกแล้ว</> : <><Save size={16} /> บันทึกเข้าระบบ</>}
              </button>
            </div>
          </div>

          {/* Document header (print) */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ fontWeight: 800, fontSize: "1.4rem", color: "var(--text-main)", margin: 0 }}>
              {sheetTitle || "สรุปคะแนนและตัดเกรด"}
            </h2>
            <p style={{ color: "var(--text-sub)", fontSize: "0.85rem", marginTop: "4px" }}>
              {fileName} &nbsp;|&nbsp; {rows.length} คน &nbsp;|&nbsp; คะแนนเฉลี่ย {avg}
            </p>
          </div>

          {/* Summary chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }} className="no-print">
            {Object.entries(gradeCounts).sort((a, b) => Number(b[0]) - Number(a[0])).map(([g, c]) => (
              <div key={g} style={{
                padding: "6px 14px", borderRadius: "20px", fontSize: "0.82rem", fontWeight: 700,
                background: gradeColor(g) + "20", color: gradeColor(g), border: `1px solid ${gradeColor(g)}50`
              }}>
                เกรด {g} : {c} คน
              </div>
            ))}
          </div>

          {/* Main table */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden", borderRadius: "12px" }}>
            <div className={tableStyles.tableContainer} style={{ margin: 0 }}>
              <table className={tableStyles.table}>
                <thead className={tableStyles.thead}>
                  <tr>
                    <th className={tableStyles.th} style={{ width: "50px", textAlign: "center" }}>ลำดับ</th>
                    <th className={tableStyles.th} style={{ width: "120px" }}>รหัสนักเรียน</th>
                    <th className={tableStyles.th}>ชื่อ - นามสกุล</th>
                    <th className={tableStyles.th} style={{ width: "100px" }}>ห้อง</th>
                    <th className={tableStyles.th} style={{ width: "80px", textAlign: "center" }}>งาน<br/><small style={{fontWeight:400,color:"#888"}}>/30</small></th>
                    <th className={tableStyles.th} style={{ width: "80px", textAlign: "center" }}>สอบย่อย<br/><small style={{fontWeight:400,color:"#888"}}>/20</small></th>
                    <th className={tableStyles.th} style={{ width: "90px", textAlign: "center" }}>ปลายภาค<br/><small style={{fontWeight:400,color:"#888"}}>/30</small></th>
                    <th className={tableStyles.th} style={{ width: "80px", textAlign: "center" }}>จิตพิสัย<br/><small style={{fontWeight:400,color:"#888"}}>/20</small></th>
                    <th className={tableStyles.th} style={{ width: "80px", textAlign: "center", background: "rgba(99,102,241,0.06)" }}>
                      <strong>รวม</strong><br/><small style={{fontWeight:400,color:"#888"}}>/100</small>
                    </th>
                    <th className={tableStyles.th} style={{ width: "80px", textAlign: "center" }}>เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "30px", color: "var(--text-sub)" }}>
                        ไม่พบข้อมูลที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr key={r.student_code} className={tableStyles.tr}>
                        <td className={tableStyles.td} style={{ textAlign: "center", color: "var(--text-sub)" }}>{r.no}</td>
                        <td className={tableStyles.td}>
                          <span className={tableStyles.codeBadge}>{r.student_code}</span>
                        </td>
                        <td className={tableStyles.td} style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</td>
                        <td className={tableStyles.td} style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>{r.classroom}</td>
                        <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.assignment}</td>
                        <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.quiz}</td>
                        <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.final}</td>
                        <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.behavior}</td>
                        <td className={tableStyles.td} style={{ textAlign: "center", background: "rgba(99,102,241,0.04)" }}>
                          <strong style={{ fontSize: "1rem", color: "var(--primary)" }}>{r.total}</strong>
                        </td>
                        <td className={tableStyles.td} style={{ textAlign: "center" }}>
                          <span style={{
                            display: "inline-block", padding: "3px 12px", borderRadius: "20px",
                            fontWeight: 800, fontSize: "0.9rem",
                            background: gradeColor(r.grade) + "20",
                            color: gradeColor(r.grade),
                            border: `1px solid ${gradeColor(r.grade)}50`
                          }}>
                            {r.grade}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer stats */}
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "20px", fontSize: "0.85rem", color: "var(--text-sub)" }} className="no-print">
            <span>ทั้งหมด <strong>{rows.length}</strong> คน</span>
            <span>กรองแล้ว <strong>{filteredRows.length}</strong> คน</span>
            <span>คะแนนเฉลี่ย <strong style={{ color: "var(--primary)" }}>{avg}</strong></span>
          </div>
        </>
      )}

      {/* ───── Save Modal ───── */}
      {showSaveModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div className="glass-card" style={{ width: "400px", padding: "28px", borderRadius: "16px" }}>
            <h3 style={{ marginBottom: "16px", fontWeight: 700, color: "var(--text-main)" }}>
              บันทึกคะแนนเข้าระบบ
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", marginBottom: "20px" }}>
              เลือกวิชาและห้องเรียนที่ต้องการบันทึกคะแนนจากชีตนี้
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              <div>
                <label className={tableStyles.label}>รายวิชา</label>
                <select className={tableStyles.input} value={selSubject} onChange={(e) => setSelSubject(e.target.value)}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={tableStyles.label}>ห้องเรียน</label>
                <select className={tableStyles.input} value={selClassroom} onChange={(e) => setSelClassroom(e.target.value)}>
                  {classrooms.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowSaveModal(false)}
                style={{ padding: "9px 18px", border: "1px solid #ddd", borderRadius: "8px",
                  background: "var(--bg-card)", cursor: "pointer", color: "var(--text-sub)" }}>
                ยกเลิก
              </button>
              <button
                disabled={isSaving}
                onClick={async () => { await handleSave(selSubject, selClassroom); setShowSaveModal(false); }}
                style={{ padding: "9px 20px", border: "none", borderRadius: "8px",
                  background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer" }}>
                {isSaving ? "กำลังบันทึก..." : "ยืนยันบันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
