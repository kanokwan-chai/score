// src/app/admin/reports/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Printer, BookOpen, AlertCircle, Info, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import * as XLSX from 'xlsx';
import styles from '../students/students.module.css'; // custom styles
import filterStyles from '../scores/scores.module.css'; // filter styles
import tableStyles from '../subjects/subjects.module.css'; // table styles

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

export default function AdminReportsPage() {
  const { showToast } = useApp();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const viewMode = 'missing';

  // Load subjects and classrooms on mount
  const loadFilters = async () => {
    setIsLoadingFilters(true);
    try {
      // 1. Subjects
      const subjRes = await fetch('/api/admin/subjects');
      const subjData = await subjRes.json();
      if (subjData.success && subjData.subjects.length > 0) {
        setSubjects(subjData.subjects);
        setSelectedSubject(subjData.subjects[0].id);
      }

      // 2. Classrooms
      const classRes = await fetch('/api/public/classrooms');
      const classData = await classRes.json();
      if (classData.success && classData.classrooms.length > 0) {
        setClassrooms(classData.classrooms);
        setSelectedClassroom(classData.classrooms[0].name);
      }
    } catch (error) {
      console.error('Load report filters error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดตัวเลือกวิชา/ห้องเรียน', 'danger');
    } finally {
      setIsLoadingFilters(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  // Fetch report data when subject or classroom changes
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
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน', 'danger');
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedSubject, selectedClassroom]);

  // Filter rows locally by name or student ID
  const filteredRows = reportData?.reportRows.filter(
    row => row.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
           row.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           row.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handlePrint = () => {
    window.print();
  };

  // Group configs
  const categories = [
    { key: 'assignment', name: 'งานที่มอบหมาย', weight: 30, color: '#4F46E5', bgColor: 'rgba(79, 70, 229, 0.04)' },
    { key: 'quiz', name: 'แบบทดสอบ', weight: 20, color: '#7C3AED', bgColor: 'rgba(124, 58, 237, 0.04)' },
    { key: 'behavior', name: 'จิตพิสัย', weight: 20, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.04)' },
    { key: 'final', name: 'สอบปลายภาค', weight: 30, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.04)' }
  ];

  const activeCategories = reportData ? categories.filter(cat => 
    reportData.assignments.some(asm => asm.category === cat.key)
  ) : [];

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.reportRows.length === 0) {
      showToast('ไม่มีข้อมูลเพียงพอสำหรับการส่งออก', 'warning');
      return;
    }

    const { subject, classroom, assignments, reportRows } = reportData;

    // Build headers organized by category
    const fileHeaders = [
      'อันดับที่',
      'รหัสนักเรียน',
      'ชื่อ - นามสกุล'
    ];

    const colMappings: { type: 'asm' | 'subtotal'; assignmentId?: string; categoryKey?: string }[] = [];

    activeCategories.forEach(cat => {
      const catAsms = assignments.filter(a => a.category === cat.key);
      catAsms.forEach(asm => {
        fileHeaders.push(`${cat.name}: ${asm.title} (เต็ม ${asm.full_score} ดิบ)`);
        colMappings.push({ type: 'asm', assignmentId: asm.id });
      });
      fileHeaders.push(`${cat.name}: รวมสัดส่วน (สัดส่วน ${cat.weight})`);
      colMappings.push({ type: 'subtotal', categoryKey: cat.key });
    });

    fileHeaders.push('คะแนนสะสมรวม', 'เปอร์เซ็นต์', 'เกรดวิชานี้');

    const dataRows = reportRows.map(row => {
      const studentName = `${row.first_name} ${row.last_name}`;
      
      const scoreValues = colMappings.map(mapping => {
        if (mapping.type === 'asm') {
          const sc = row.scores.find(s => s.assignment_id === mapping.assignmentId);
          return !sc || sc.raw_score === -1 ? 'ยังไม่ส่ง' : sc.raw_score;
        } else {
          const cat = categories.find(c => c.key === mapping.categoryKey)!;
          const catAsms = assignments.filter(a => a.category === cat.key);
          let catRawSum = 0;
          let catFullSum = 0;
          let hasSubmittedAny = false;
          catAsms.forEach(asm => {
            const sc = row.scores.find(s => s.assignment_id === asm.id);
            if (sc && sc.raw_score !== -1) {
              catRawSum += sc.raw_score;
              catFullSum += asm.full_score;
              hasSubmittedAny = true;
            }
          });
          const catEarned = catFullSum > 0 ? (catRawSum / catFullSum) * cat.weight : 0;
          return hasSubmittedAny ? Number(catEarned.toFixed(2)) : 0.00;
        }
      });
      
      return [
        row.rank,
        row.student_id,
        studentName,
        ...scoreValues,
        row.keep_score_sum,
        `${row.percentage}%`,
        row.grade
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      [`รายงานสมุดคะแนนและเกรดเฉลี่ยสะสมรายวิชา`],
      [`วิชา: ${subject.code} ${subject.name} | ห้องเรียน: ${classroom}`],
      [`พิมพ์โดยระบบบริหารจัดการคะแนน โรงเรียน - วันที่: ${new Date().toLocaleDateString('th-TH')}`],
      [],
      fileHeaders,
      ...dataRows
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, ' Master Gradebook');

    XLSX.writeFile(workbook, `สมุดคะแนน_${subject.code}_ห้อง_${classroom}.xlsx`);
    showToast('ดาวน์โหลดรายงาน Excel เรียบร้อยแล้ว', 'success');
  };

  const getGradeStyle = (grade: string) => {
    if (grade.startsWith('A')) return `${filterStyles.gradeBadge} ${filterStyles.gradeA}`;
    if (grade.startsWith('B')) return `${filterStyles.gradeBadge} ${filterStyles.gradeB}`;
    if (grade.startsWith('C')) return `${filterStyles.gradeBadge} ${filterStyles.gradeC}`;
    if (grade.startsWith('D')) return `${filterStyles.gradeBadge} ${filterStyles.gradeD}`;
    if (grade.startsWith('F')) return `${filterStyles.gradeBadge} ${filterStyles.gradeF}`;
    return filterStyles.gradeBadge;
  };

  return (
    <div className="animate-fade-in print-area">
      {/* 1. Filters Card (Hide on print) */}
      <div className={`${filterStyles.filterCard} glass-card no-print`}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
          <BookOpen size={18} color="var(--primary)" />
          <span>ตัวกรองรายงานสมุดคะแนนสะสม</span>
        </h4>
        
        {isLoadingFilters ? (
          <p className="text-muted">กำลังโหลดตัวเลือกวิชาและห้องเรียน...</p>
        ) : (
          <div className={filterStyles.filterRow}>
            {/* Subject */}
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

            {/* Classroom */}
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

      {/* 2. Loading state */}
      {isLoadingReport ? (
        <div style={{ textAlign: 'center', padding: '50px' }} className="no-print">
          <div style={{
            width: '35px',
            height: '35px',
            border: '4px solid rgba(79, 70, 229, 0.1)',
            borderRadius: '50%',
            borderTopColor: 'var(--primary)',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p className="text-muted">กำลังประมวลผลสรุปคะแนนและประเมินเกรดสะสมห้องเรียน...</p>
        </div>
      ) : !reportData || reportData.reportRows.length === 0 ? (
        <div className="glass-card text-center no-print" style={{ padding: '50px 20px' }}>
          <AlertCircle size={44} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
          <h3>ไม่มีข้อมูลนักเรียน/งานมอบหมาย</h3>
          <p className="text-muted">ไม่พบข้อมูลรายชื่อนักเรียนในห้อง หรือห้องเรียนนี้ยังไม่เคยสั่งงานเพื่อนำมาคิดคะแนนเก็บสะสม</p>
        </div>
      ) : (
        <>
          {/* Action Header area (Hide on print) */}
          <div className={`${tableStyles.headerActions} no-print`}>
            <div className={tableStyles.searchBar} style={{ maxWidth: '280px' }}>
              <Search size={18} className={tableStyles.searchIcon} />
              <input
                type="text"
                className={tableStyles.searchInput}
                placeholder="ค้นหารายชื่อในรายงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className={styles.btnRow}>
              <button className={styles.exportBtn} onClick={handlePrint} style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>
                <Printer size={18} />
                <span>พิมพ์รายงาน / PDF</span>
              </button>
              <button className={styles.exportBtn} onClick={handleExportExcel}>
                <Download size={18} />
                <span>ส่งออกเป็น Excel</span>
              </button>
            </div>
          </div>

          {/* Printable Report Sheet Document */}
          <div className="glass-card animate-fade-in" style={{ padding: '30px' }}>
            {/* Header Document (Visible on print & screen) */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                สรุปงานค้างรายวิชา
              </h2>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem', marginTop: '6px' }}>
                วิชา: <strong style={{ color: 'var(--text-main)' }}>{reportData.subject.code} {reportData.subject.name}</strong> | ห้องเรียน: <strong style={{ color: 'var(--text-main)' }}>{reportData.classroom}</strong>
              </p>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', marginTop: '4px' }}>
                วันที่พิมพ์เอกสาร: {new Date().toLocaleDateString('th-TH')}
              </p>
            </div>

            {/* Master Gradebook Table */}
            <div className={tableStyles.tableContainer} style={{ border: '1px solid #ddd', borderRadius: '8px' }}>
                <table className={tableStyles.table}>
                  <thead className={tableStyles.thead} style={{ background: '#f5f5f5' }}>
                    <tr>
                      <th className={tableStyles.th} style={{ width: '60px', textAlign: 'center' }}>ลำดับ</th>
                      <th className={tableStyles.th} style={{ width: '100px' }}>รหัส</th>
                      <th className={tableStyles.th} style={{ width: '200px' }}>ชื่อ - นามสกุล</th>
                      <th className={tableStyles.th} style={{ width: '100px', textAlign: 'center' }}>จำนวนงานค้าง</th>
                      <th className={tableStyles.th}>รายชื่องานที่ยังไม่ส่ง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const studentsWithMissing = filteredRows.map(student => {
                        const missingAsms = reportData.assignments.filter(asm => {
                          const sc = student.scores.find(s => s.assignment_id === asm.id);
                          return !sc || sc.raw_score === -1;
                        });
                        return { ...student, missingAsms };
                      }).filter(s => s.missingAsms.length > 0);

                      if (studentsWithMissing.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--success)', fontWeight: 600 }}>
                              ไม่มีนักเรียนค้างส่งงานในห้องนี้
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
                                  {asm.title} <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>({categories.find(c => c.key === asm.category)?.name})</span>
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

            {/* Document Footer Signature lines (Only visible on print) */}
            <div style={{
              display: 'none',
              justifyContent: 'space-between',
              marginTop: '50px',
              padding: '0 20px',
              fontFamily: 'inherit'
            }} className="show-on-print">
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '40px' }}>ลงชื่อ .............................................................. ผู้ตรวจสอบ</p>
                <p>( .............................................................. )</p>
                <p>ตำแหน่ง ..............................................................</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '40px' }}>ลงชื่อ .............................................................. อาจารย์ผู้สอน</p>
                <p>( {adminInfoStylePlaceholder} )</p>
                <p>วันที่ .......... / .......... / ..........</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CSS helper inline block to force show elements only on print */}
      <style jsx global>{`
        @media screen {
          .show-on-print {
            display: none !important;
          }
        }
        @media print {
          .show-on-print {
            display: flex !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

// Simple fallback since we fetch admin name dynamically
const adminInfoStylePlaceholder = 'อาจารย์สมศรี รักการสอน';
