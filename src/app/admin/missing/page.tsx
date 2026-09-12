// src/app/admin/missing/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Printer, BookOpen, AlertCircle, Download } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import * as XLSX from 'xlsx';
import styles from '../students/students.module.css';
import filterStyles from '../scores/scores.module.css';
import tableStyles from '../subjects/subjects.module.css';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  type: string;
  category: 'assignment' | 'quiz' | 'behavior' | 'final';
  full_score: number;
  keep_score: number;
  due_date: string;
}

interface ReportRow {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  scores: { assignment_id: string; raw_score: number; calculated_score: number }[];
  keep_score_sum: number;
  percentage: number;
  grade: string;
  rank: number;
}

interface ReportData {
  subject: Subject;
  classroom: string;
  assignments: Assignment[];
  totalWeightMax: number;
  reportRows: ReportRow[];
}

const categories = [
  { key: 'assignment', name: 'งานที่มอบหมาย' },
  { key: 'quiz', name: 'แบบทดสอบ' },
  { key: 'behavior', name: 'จิตพิสัย' },
  { key: 'final', name: 'สอบปลายภาค' },
];

export default function AdminMissingPage() {
  const { showToast } = useApp();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const loadFilters = async () => {
    setIsLoadingFilters(true);
    try {
      const subjRes = await fetch('/api/admin/subjects');
      const subjData = await subjRes.json();
      if (subjData.success && subjData.subjects.length > 0) {
        setSubjects(subjData.subjects);
        setSelectedSubject(subjData.subjects[0].id);
      }
      const classRes = await fetch('/api/public/classrooms');
      const classData = await classRes.json();
      if (classData.success && classData.classrooms.length > 0) {
        setClassrooms(classData.classrooms);
        setSelectedClassroom(classData.classrooms[0].name);
      }
    } catch (error) {
      console.error('Load filters error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดตัวเลือก', 'danger');
    } finally {
      setIsLoadingFilters(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  const loadReport = async () => {
    if (!selectedSubject || !selectedClassroom) return;
    setIsLoadingReport(true);
    try {
      const res = await fetch(
        `/api/admin/reports?subject_id=${selectedSubject}&classroom=${encodeURIComponent(selectedClassroom)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReportData(data);
        } else {
          showToast(data.error || 'โหลดรายงานล้มเหลว', 'danger');
        }
      }
    } catch (error) {
      console.error('Load report error:', error);
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูล', 'danger');
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedSubject, selectedClassroom]);

  const filteredRows = reportData?.reportRows.filter(
    row =>
      row.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (!reportData || filteredRows.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
      return;
    }

    const { subject, classroom, assignments } = reportData;

    // สร้าง sheet แบบ 1 แถว = 1 งานค้างของนักเรียน 1 คน
    const rows: (string | number)[][] = [];

    // Header
    rows.push([
      'ลำดับ',
      'รหัสนักเรียน',
      'ชื่อ',
      'นามสกุล',
      'ชื่องานที่ค้าง',
      'หมวดหมู่',
      'คะแนนเต็ม',
    ]);

    let rowIndex = 0;
    filteredRows.forEach(student => {
      const missingAsms = assignments.filter(asm => {
        const sc = student.scores.find(s => s.assignment_id === asm.id);
        return !sc || sc.raw_score === -1;
      });

      if (missingAsms.length === 0) return;
      rowIndex++;

      missingAsms.forEach((asm, asmIdx) => {
        const catName = categories.find(c => c.key === asm.category)?.name || asm.category;
        rows.push([
          asmIdx === 0 ? rowIndex : '',        // ลำดับ (ขึ้นเฉพาะแถวแรกของนักเรียน)
          asmIdx === 0 ? student.student_id : '',
          asmIdx === 0 ? student.first_name : '',
          asmIdx === 0 ? student.last_name : '',
          asm.title,
          catName,
          asm.full_score,
        ]);
      });
    });

    if (rows.length <= 1) {
      showToast('ไม่มีนักเรียนค้างส่งงานในห้องนี้', 'success');
      return;
    }

    const ws = XLSX.utils.aoa_to_sheet([
      [`สรุปงานค้างรายวิชา`],
      [`วิชา: ${subject.code} ${subject.name} | ห้องเรียน: ${classroom}`],
      [`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`],
      [],
      ...rows,
    ]);

    // ปรับความกว้างคอลัมน์
    ws['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 40 }, { wch: 18 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'งานค้าง');
    XLSX.writeFile(wb, `งานค้าง_${subject.code}_ห้อง_${classroom}.xlsx`);
    showToast('ดาวน์โหลด Excel เรียบร้อยแล้ว', 'success');
  };

  return (
    <div className="animate-fade-in print-area">
      {/* Filters */}
      <div className={`${filterStyles.filterCard} glass-card no-print`}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
          <BookOpen size={18} color="var(--primary)" />
          <span>ตัวกรองสรุปงานค้าง</span>
        </h4>
        {isLoadingFilters ? (
          <p className="text-muted">กำลังโหลดตัวเลือก...</p>
        ) : (
          <div className={filterStyles.filterRow}>
            <div className={filterStyles.filterGroup}>
              <label className={tableStyles.label}>รายวิชา</label>
              <select
                className={tableStyles.input}
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <div className={filterStyles.filterGroup}>
              <label className={tableStyles.label}>ห้องเรียน</label>
              <select
                className={tableStyles.input}
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
              >
                {classrooms.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoadingReport ? (
        <div style={{ textAlign: 'center', padding: '50px' }} className="no-print">
          <div style={{
            width: '35px', height: '35px',
            border: '4px solid rgba(79, 70, 229, 0.1)',
            borderRadius: '50%', borderTopColor: 'var(--primary)',
            animation: 'spin 1s linear infinite', margin: '0 auto 12px'
          }} />
          <p className="text-muted">กำลังโหลดข้อมูล...</p>
        </div>
      ) : !reportData || reportData.reportRows.length === 0 ? (
        <div className="glass-card text-center no-print" style={{ padding: '50px 20px' }}>
          <AlertCircle size={44} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
          <h3>ไม่มีข้อมูลนักเรียน/งานมอบหมาย</h3>
          <p className="text-muted">ไม่พบข้อมูลรายชื่อนักเรียนในห้อง หรือห้องเรียนนี้ยังไม่เคยสั่งงาน</p>
        </div>
      ) : (
        <>
          {/* Action bar */}
          <div className={`${tableStyles.headerActions} no-print`}>
            <div className={tableStyles.searchBar} style={{ maxWidth: '280px' }}>
              <Search size={18} className={tableStyles.searchIcon} />
              <input
                type="text"
                className={tableStyles.searchInput}
                placeholder="ค้นหารายชื่อ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.btnRow}>
              <button
                className={styles.exportBtn}
                onClick={handlePrint}
                style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
              >
                <Printer size={18} />
                <span>พิมพ์รายงาน / PDF</span>
              </button>
              <button
                className={styles.exportBtn}
                onClick={handleExportExcel}
              >
                <Download size={18} />
                <span>ส่งออกเป็น Excel</span>
              </button>
            </div>
          </div>

          {/* Report */}
          <div className="glass-card animate-fade-in" style={{ padding: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                สรุปงานค้างรายวิชา
              </h2>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem', marginTop: '6px' }}>
                วิชา: <strong style={{ color: 'var(--text-main)' }}>{reportData.subject.code} {reportData.subject.name}</strong>{' '}
                | ห้องเรียน: <strong style={{ color: 'var(--text-main)' }}>{reportData.classroom}</strong>
              </p>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', marginTop: '4px' }}>
                วันที่พิมพ์เอกสาร: {new Date().toLocaleDateString('th-TH')}
              </p>
            </div>

            <div className={tableStyles.tableContainer} style={{ border: '1px solid #ddd', borderRadius: '8px' }}>
              <table className={tableStyles.table}>
                <thead className={tableStyles.thead} style={{ background: '#f5f5f5' }}>
                  <tr>
                    <th className={tableStyles.th} style={{ width: '60px', textAlign: 'center' }}>ลำดับ</th>
                    <th className={tableStyles.th} style={{ width: '110px' }}>รหัส</th>
                    <th className={tableStyles.th} style={{ width: '200px' }}>ชื่อ - นามสกุล</th>
                    <th className={tableStyles.th} style={{ width: '110px', textAlign: 'center' }}>จำนวนงานค้าง</th>
                    <th className={tableStyles.th}>รายชื่องานที่ยังไม่ส่ง</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const studentsWithMissing = filteredRows
                      .map(student => {
                        const missingAsms = reportData.assignments.filter(asm => {
                          const sc = student.scores.find(s => s.assignment_id === asm.id);
                          return !sc || sc.raw_score === -1;
                        });
                        return { ...student, missingAsms };
                      })
                      .filter(s => s.missingAsms.length > 0);

                    if (studentsWithMissing.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#10B981', fontWeight: 600 }}>
                            🎉 ไม่มีนักเรียนค้างส่งงานในห้องนี้
                          </td>
                        </tr>
                      );
                    }

                    return studentsWithMissing.map((student, idx) => (
                      <tr key={student.id} className={tableStyles.tr}>
                        <td className={tableStyles.td} style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td className={tableStyles.td}>
                          <span className={tableStyles.codeBadge} style={{ background: 'none', border: '1px solid #ddd' }}>
                            {student.student_id}
                          </span>
                        </td>
                        <td className={tableStyles.td} style={{ fontWeight: 600 }}>
                          {student.first_name} {student.last_name}
                        </td>
                        <td className={tableStyles.td} style={{ textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>
                          {student.missingAsms.length}
                        </td>
                        <td className={tableStyles.td}>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                            {student.missingAsms.map(asm => (
                              <li key={asm.id} style={{ marginBottom: '4px' }}>
                                {asm.title}{' '}
                                <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>
                                  ({categories.find(c => c.key === asm.category)?.name})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Print footer */}
            <div style={{
              display: 'none', justifyContent: 'space-between',
              marginTop: '50px', padding: '0 20px'
            }} className="show-on-print">
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '40px' }}>ลงชื่อ .............................................................. ผู้ตรวจสอบ</p>
                <p>( .............................................................. )</p>
                <p>ตำแหน่ง ..............................................................</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '40px' }}>ลงชื่อ .............................................................. อาจารย์ผู้สอน</p>
                <p>วันที่ .......... / .......... / ..........</p>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @media screen { .show-on-print { display: none !important; } }
        @media print {
          .show-on-print { display: flex !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
