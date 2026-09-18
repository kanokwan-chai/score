// src/app/admin/import-scores/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, BookOpen, CheckCircle, AlertCircle, FileSpreadsheet, Info } from "lucide-react";
import * as XLSX from "xlsx";
import { useApp } from "@/context/AppContext";
import filterStyles from "../scores/scores.module.css";
import tableStyles from "../subjects/subjects.module.css";

interface Subject { id: string; name: string; code: string; }
interface Classroom { id: string; name: string; }

interface ParsedRow {
  student_code: string;
  first_name: string;
  last_name: string;
  classroom: string;
  assignment: number;
  quiz: number;
  final: number;
  behavior: number;
}

const COL_MAP = {
  student_code: 1,   // คอลัมน์ B (index 1)
  first_name:   2,   // C
  last_name:    3,   // D
  classroom:    4,   // E
  assignment:   5,   // F
  quiz:         6,   // G
  final:        7,   // H
  behavior:     8,   // I
};

export default function ImportScoresPage() {
  const { showToast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ updatedCount: number; skippedCount: number; errors: string[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch("/api/admin/subjects"),
          fetch("/api/public/classrooms"),
        ]);
        const sData = await sRes.json();
        const cData = await cRes.json();
        if (sData.success) { setSubjects(sData.subjects); setSelectedSubject(sData.subjects[0]?.id || ""); }
        if (cData.success) { setClassrooms(cData.classrooms); setSelectedClassroom(cData.classrooms[0]?.name || ""); }
      } finally {
        setIsLoadingFilters(false);
      }
    };
    load();
  }, []);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      const rows: ParsedRow[] = [];
      for (let i = 2; i < raw.length; i++) {
        const r = raw[i] as unknown[];
        const code = String(r[COL_MAP.student_code] ?? "").trim();
        if (!code || isNaN(Number(code))) continue;
        const assignment = Number(r[COL_MAP.assignment]);
        const quiz      = Number(r[COL_MAP.quiz]);
        const fin       = Number(r[COL_MAP.final]);
        const behavior  = Number(r[COL_MAP.behavior]);
        if (isNaN(assignment) && isNaN(quiz) && isNaN(fin) && isNaN(behavior)) continue;
        rows.push({
          student_code: code,
          first_name: String(r[COL_MAP.first_name] ?? ""),
          last_name:  String(r[COL_MAP.last_name] ?? ""),
          classroom:  String(r[COL_MAP.classroom] ?? ""),
          assignment: isNaN(assignment) ? 0 : assignment,
          quiz:       isNaN(quiz)       ? 0 : quiz,
          final:      isNaN(fin)        ? 0 : fin,
          behavior:   isNaN(behavior)   ? 0 : behavior,
        });
      }
      setParsedRows(rows);
      if (rows.length === 0) showToast("ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบรูปแบบชีต", "warning");
      else showToast(`พบข้อมูล ${rows.length} คน กดยืนยันเพื่อนำเข้า`, "success");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!selectedSubject || !selectedClassroom || parsedRows.length === 0) {
      showToast("กรุณาเลือกวิชา ห้องเรียน และอัปโหลดไฟล์ก่อน", "warning");
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch("/api/admin/scores/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: selectedSubject, classroom: selectedClassroom, rows: parsedRows }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ updatedCount: data.updatedCount, skippedCount: data.skippedCount, errors: data.errors });
        showToast(data.message, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "danger");
      }
    } catch {
      showToast("ระบบผิดพลาด", "danger");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Filter card */}
      <div className={`${filterStyles.filterCard} glass-card`}>
        <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--text-main)" }}>
          <FileSpreadsheet size={18} color="var(--primary)" />
          <span>นำเข้าคะแนนจาก Excel / Google Sheet</span>
        </h4>

        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "16px",
          background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: "8px", padding: "12px 14px", fontSize: "0.85rem", color: "var(--text-sub)" }}>
          <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: "var(--text-main)" }}>รูปแบบชีตที่รองรับ:</strong>{" "}
            คอลัมน์ B=รหัสนักเรียน | C=ชื่อ | D=นามสกุล | E=ห้อง |{" "}
            <strong>F=งาน(30)</strong> | <strong>G=สอบย่อย(20)</strong> |{" "}
            <strong>H=ปลายภาค(30)</strong> | <strong>I=จิตพิสัย(20)</strong><br />
            ข้อมูลเริ่มจากแถวที่ 3 (แถว 1 = ชื่อวิชา, แถว 2 = หัวข้อคอลัมน์)
          </div>
        </div>

        {isLoadingFilters ? (
          <p className="text-muted">กำลังโหลด...</p>
        ) : (
          <div className={filterStyles.filterRow}>
            <div className={filterStyles.filterGroup}>
              <label className={tableStyles.label}>รายวิชา</label>
              <select className={tableStyles.input} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div className={filterStyles.filterGroup}>
              <label className={tableStyles.label}>ห้องเรียน</label>
              <select className={tableStyles.input} value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)}>
                {classrooms.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: "2px dashed var(--primary)",
          borderRadius: "12px",
          padding: "48px 24px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: "24px",
          background: parsedRows.length > 0 ? "rgba(16,185,129,0.04)" : "rgba(99,102,241,0.03)",
          transition: "all 0.2s",
        }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        {parsedRows.length > 0 ? (
          <>
            <CheckCircle size={44} color="#10B981" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 700, color: "#10B981", fontSize: "1.1rem" }}>โหลดสำเร็จ: {fileName}</p>
            <p style={{ color: "var(--text-sub)" }}>พบข้อมูล <strong>{parsedRows.length}</strong> คน — คลิกเพื่อเปลี่ยนไฟล์</p>
          </>
        ) : (
          <>
            <Upload size={44} color="var(--primary)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "1.1rem" }}>คลิกหรือลากไฟล์มาวางที่นี่</p>
            <p style={{ color: "var(--text-sub)", fontSize: "0.9rem" }}>รองรับ .xlsx, .xls, .csv</p>
          </>
        )}
      </div>

      {/* Preview table */}
      {parsedRows.length > 0 && (
        <div className="glass-card" style={{ marginBottom: "24px", padding: "20px" }}>
          <h5 style={{ fontWeight: 700, marginBottom: "12px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
            <BookOpen size={16} />
            ตัวอย่างข้อมูล (แสดง {Math.min(5, parsedRows.length)} จาก {parsedRows.length} คน)
          </h5>
          <div className={tableStyles.tableContainer} style={{ border: "1px solid #eee", borderRadius: "8px" }}>
            <table className={tableStyles.table}>
              <thead className={tableStyles.thead}>
                <tr>
                  <th className={tableStyles.th}>รหัสนักเรียน</th>
                  <th className={tableStyles.th}>ชื่อ-นามสกุล</th>
                  <th className={tableStyles.th} style={{ textAlign: "center" }}>งาน (30)</th>
                  <th className={tableStyles.th} style={{ textAlign: "center" }}>สอบย่อย (20)</th>
                  <th className={tableStyles.th} style={{ textAlign: "center" }}>ปลายภาค (30)</th>
                  <th className={tableStyles.th} style={{ textAlign: "center" }}>จิตพิสัย (20)</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((r, i) => (
                  <tr key={i} className={tableStyles.tr}>
                    <td className={tableStyles.td}><span className={tableStyles.codeBadge}>{r.student_code}</span></td>
                    <td className={tableStyles.td}>{r.first_name} {r.last_name}</td>
                    <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.assignment}</td>
                    <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.quiz}</td>
                    <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.final}</td>
                    <td className={tableStyles.td} style={{ textAlign: "center", fontWeight: 600 }}>{r.behavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="glass-card" style={{
          padding: "20px", marginBottom: "24px",
          border: `1px solid ${result.skippedCount > 0 ? "#FCD34D" : "#6EE7B7"}`,
          background: result.skippedCount > 0 ? "rgba(252,211,77,0.06)" : "rgba(110,231,183,0.06)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <CheckCircle size={20} color="#10B981" />
            <strong style={{ color: "var(--text-main)" }}>นำเข้าเสร็จสิ้น</strong>
          </div>
          <p style={{ color: "var(--text-sub)", fontSize: "0.9rem" }}>
            ✅ อัปเดตสำเร็จ <strong>{result.updatedCount}</strong> คน
            {result.skippedCount > 0 && <> &nbsp;⚠️ ข้ามไป <strong>{result.skippedCount}</strong> คน (ไม่พบรหัสนักเรียนในระบบ)</>}
          </p>
          {result.errors.length > 0 && (
            <ul style={{ marginTop: "8px", fontSize: "0.8rem", color: "#EF4444", paddingLeft: "20px" }}>
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Import button */}
      {parsedRows.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleImport}
            disabled={isImporting}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "var(--primary)", color: "#fff", border: "none",
              borderRadius: "8px", padding: "12px 28px", fontWeight: 700,
              fontSize: "1rem", cursor: isImporting ? "not-allowed" : "pointer",
              opacity: isImporting ? 0.7 : 1,
            }}
          >
            {isImporting ? (
              <>กำลังนำเข้า...</>
            ) : (
              <><Upload size={18} /> ยืนยันนำเข้าคะแนน {parsedRows.length} คน</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
