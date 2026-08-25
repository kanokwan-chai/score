'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Save, FileText, AlertTriangle, BookOpen, Users, HelpCircle, Info, Upload } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import * as XLSX from 'xlsx';
import styles from './scores.module.css';
import tableStyles from '../subjects/subjects.module.css'; // Shared table styles

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
  subject_id: string;
  title: string;
  type: string;
  category: 'assignment' | 'quiz' | 'behavior' | 'final';
  full_score: number;
  keep_score: number;
  due_date: string;
  classroom: string;
}

interface StudentScoreInput {
  student_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  score_id: string;
  raw_score: number;
  calculated_score: number;
  feedback: string;
  note: string;
  overall_keep_sum: number;
  overall_keep_max: number;
  overall_grade: string;
  overall_percentage: number;
}

export default function AdminScoresPage() {
  const { showToast } = useApp();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

  // Selected filters
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');

  // Loaded Score Table data
  const [assignmentInfo, setAssignmentInfo] = useState<{ full_score: number; keep_score: number; category: string } | null>(null);
  const [studentScores, setStudentScores] = useState<StudentScoreInput[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const scoreFileInputRef = useRef<HTMLInputElement>(null);
  const [excelDataRows, setExcelDataRows] = useState<any[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [selectedExcelCol, setSelectedExcelCol] = useState<number>(-1);
  const [showColSelector, setShowColSelector] = useState(false);
  const [studentIdColIdx, setStudentIdColIdx] = useState<number>(0);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedScoresText, setPastedScoresText] = useState('');
  const [activeTab, setActiveTab] = useState<'individual' | 'categories'>('individual');
  const [categorySummaryData, setCategorySummaryData] = useState<any[]>([]);
  const [isCategorySummaryLoading, setIsCategorySummaryLoading] = useState(false);

  const handleExcelScoreImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assignmentInfo) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (rows.length < 2) {
          showToast('ไม่พบข้อมูลที่ต้องการในไฟล์ Excel', 'warning');
          return;
        }

        // คลีนรายชื่อคอลัมน์เพื่อจัดพรีวิว
        const rawHeaders = rows[0].map(h => String(h || '').trim());
        const headersLower = rawHeaders.map(h => h.toLowerCase());
        
        // ค้นหาคอลัมน์รหัสประจำตัวเด็กนักเรียน
        let idIdx = headersLower.findIndex(h => h.includes('รหัส') || h.includes('id') || h.includes('code') || h.includes('student'));
        if (idIdx === -1) idIdx = 1; // ค่าตั้งต้นเป็นคอลัมน์ที่ 2 (ดัชนี 1) ของตารางครู

        setStudentIdColIdx(idIdx);
        setExcelHeaders(rawHeaders);
        setExcelDataRows(rows);

        // ทดลองจับคู่หาชิ้นงานที่ตรงกันล่วงหน้าอัตโนมัติ
        const targetTitle = allAssignments.find(a => a.id === selectedAssignment)?.title || '';
        let matchedColIdx = -1;

        if (targetTitle) {
          matchedColIdx = rawHeaders.findIndex(h => 
            h.toLowerCase().includes(targetTitle.toLowerCase()) || 
            targetTitle.toLowerCase().includes(h.toLowerCase())
          );
        }

        // หากยังหาไม่เจอ ให้จับคู่คำทั่วไป
        if (matchedColIdx === -1) {
          matchedColIdx = headersLower.findIndex(h => h.includes('คะแนน') || h.includes('score') || h.includes('point') || h.includes('raw'));
        }

        // ค่าตั้งต้นฉุกเฉินกรณีไม่พบคีย์เวิร์ด
        if (matchedColIdx === -1) {
          matchedColIdx = rawHeaders.length > 5 ? 5 : 1;
        }

        setSelectedExcelCol(matchedColIdx);
        setShowColSelector(true);
        showToast('กรุณาเลือกคอลัมน์คะแนนที่ต้องการนำเข้าจากเมนูด้านล่างค่ะ', 'info');
      } catch (error) {
        console.error('Excel parse error:', error);
        showToast('ไม่สามารถแยกวิเคราะห์ไฟล์ Excel นี้ได้', 'danger');
      } finally {
        if (scoreFileInputRef.current) {
          scoreFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const applyExcelScores = () => {
    if (selectedExcelCol === -1 || excelDataRows.length === 0 || !assignmentInfo) return;

    const importedScoresMap: Record<string, number> = {};

    for (let i = 1; i < excelDataRows.length; i++) {
      const r = excelDataRows[i];
      if (!r || r.length === 0) continue;

      const studentCode = String(r[studentIdColIdx] || '').trim();
      const scoreVal = r[selectedExcelCol];

      if (studentCode && scoreVal !== undefined && scoreVal !== null && scoreVal !== '') {
        const rawScore = Number(scoreVal);
        if (!isNaN(rawScore)) {
          importedScoresMap[studentCode.toLowerCase()] = rawScore;
        }
      }
    }

    let matchCount = 0;
    const newScores = studentScores.map(student => {
      const studentCodeLower = student.student_code.toLowerCase();
      if (importedScoresMap[studentCodeLower] !== undefined) {
        const raw = importedScoresMap[studentCodeLower];
        const clampedRaw = Math.max(0, Math.min(assignmentInfo.full_score, raw));
        const calculated = Math.round(((clampedRaw / assignmentInfo.full_score) * assignmentInfo.keep_score) * 100) / 100;
        matchCount++;
        return {
          ...student,
          raw_score: clampedRaw,
          calculated_score: calculated
        };
      }
      return student;
    });

    if (matchCount === 0) {
      showToast('ไม่สามารถจับคู่รหัสนักเรียนจากไฟล์ Excel ได้เลย โปรดตรวจสอบคอลัมน์รหัสประจำตัวและตารางห้องเรียนค่ะ', 'warning');
    } else {
      setStudentScores(newScores);
      setShowColSelector(false);
      showToast(`นำเข้าคะแนนสำเร็จ! จับคู่เด็กได้ ${matchCount} คน กรุณากดตรวจสอบก่อนกดบันทึกคะแนนสะสมจริงค่ะ`, 'success');
    }
  };

  // Load initial dropdown data
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

      // 3. All assignments (we will filter locally)
      const asmRes = await fetch('/api/admin/assignments');
      const asmData = await asmRes.json();
      if (asmData.success) {
        setAllAssignments(asmData.assignments);
      }
    } catch (error) {
      console.error('Load score filters error:', error);
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูลเริ่มต้น', 'danger');
    } finally {
      setIsLoadingFilters(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  // Filter assignments based on subject & classroom selection
  const filteredAssignments = allAssignments.filter(
    a => a.subject_id === selectedSubject && a.classroom === selectedClassroom
  );

  // Update selected assignment dropdown when filters change
  useEffect(() => {
    if (filteredAssignments.length > 0) {
      // Select the first assignment in list
      setSelectedAssignment(filteredAssignments[0].id);
    } else {
      setSelectedAssignment('');
      setStudentScores([]);
      setAssignmentInfo(null);
    }
  }, [selectedSubject, selectedClassroom, allAssignments]);

  // Load scores table when selected assignment changes
  const loadScoresTable = async () => {
    if (!selectedAssignment) return;
    
    setIsLoadingScores(true);
    try {
      const res = await fetch(
        `/api/admin/scores?subject_id=${selectedSubject}&classroom=${encodeURIComponent(selectedClassroom)}&assignment_id=${selectedAssignment}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStudentScores(data.studentScores);
          setAssignmentInfo(data.assignment);
        } else {
          showToast(data.error || 'โหลดคะแนนล้มเหลว', 'danger');
        }
      }
    } catch (error) {
      console.error('Load scores error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดคะแนน', 'danger');
    } finally {
      setIsLoadingScores(false);
    }
  };

  useEffect(() => {
    loadScoresTable();
  }, [selectedAssignment]);

  const loadCategorySummary = async () => {
    if (!selectedSubject || !selectedClassroom) return;
    setIsCategorySummaryLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reports?subject_id=${selectedSubject}&classroom=${encodeURIComponent(selectedClassroom)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const assignments = data.assignments;
          const rows = data.reportRows.map((row: any) => {
            const catSums: Record<string, number> = { assignment: 0, quiz: 0, behavior: 0, final: 0 };
            const catMaxs: Record<string, number> = { assignment: 30, quiz: 20, behavior: 20, final: 30 };
            const categoryWeights: Record<string, number> = { assignment: 30, quiz: 20, behavior: 20, final: 30 };
            
            // Calculate weighted sum for each category
            Object.keys(categoryWeights).forEach(catKey => {
              const catAsms = assignments.filter((a: any) => (a.category || 'assignment') === catKey);
              let catFullSum = 0;
              let catRawSum = 0;
              let hasGraded = false;

              catAsms.forEach((asm: any) => {
                const s = row.scores.find((score: any) => score.assignment_id === asm.id);
                if (s && s.raw_score !== -1) {
                  catFullSum += asm.full_score;
                  catRawSum += s.raw_score;
                  hasGraded = true;
                }
              });

              if (hasGraded && catFullSum > 0) {
                catSums[catKey] = (catRawSum / catFullSum) * categoryWeights[catKey];
              }
            });
            
            return {
              ...row,
              catSums,
              catMaxs
            };
          });
          setCategorySummaryData(rows);
        }
      }
    } catch (error) {
      console.error('Load category summary error:', error);
      showToast('ไม่สามารถโหลดข้อมูลสรุปหมวดหมู่ได้', 'danger');
    } finally {
      setIsCategorySummaryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'categories') {
      loadCategorySummary();
    }
  }, [activeTab, selectedSubject, selectedClassroom]);

  // Handle client-side score typing & auto-calculation
  const handleScoreChange = (index: number, val: string) => {
    if (!assignmentInfo) return;

    const newScores = [...studentScores];
    
    if (val === '') {
      newScores[index].raw_score = -1; // Keep as ungraded
      newScores[index].calculated_score = 0;
      setStudentScores(newScores);
      return;
    }

    const raw = Number(val);
    if (isNaN(raw)) return;

    // Clamp score
    const clampedRaw = Math.max(0, Math.min(assignmentInfo.full_score, raw));
    
    // Auto-calculate keep score
    const calculated = Math.round(((clampedRaw / assignmentInfo.full_score) * assignmentInfo.keep_score) * 100) / 100;
    
    newScores[index].raw_score = clampedRaw;
    newScores[index].calculated_score = calculated;
    setStudentScores(newScores);
  };

  const handleFeedbackChange = (index: number, val: string) => {
    const newScores = [...studentScores];
    newScores[index].feedback = val;
    setStudentScores(newScores);
  };

  const handleNoteChange = (index: number, val: string) => {
    const newScores = [...studentScores];
    newScores[index].note = val;
    setStudentScores(newScores);
  };

  // Submit all scores
  const handleSaveScores = async () => {
    if (!selectedAssignment) return;

    setIsSaving(true);
    try {
      const payload = {
        assignment_id: selectedAssignment,
        scores: studentScores.map(s => ({
          score_id: s.score_id,
          raw_score: s.raw_score,
          feedback: s.feedback,
          note: s.note
        }))
      };

      const res = await fetch('/api/admin/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'บันทึกคะแนนและคำนวณเกรดสำเร็จ', 'success');
        // Reload table to get updated overall subject averages & grades from backend
        loadScoresTable();
      } else {
        showToast(data.error || 'บันทึกข้อมูลล้มเหลว', 'danger');
      }
    } catch (error) {
      console.error('Save scores error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter student rows locally by name or student ID
  const filteredStudentScores = studentScores.filter(
    s => s.student_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryName = (c: string) => {
    const cats: Record<string, string> = {
      assignment: 'งานมอบหมาย (30%)',
      quiz: 'แบบทดสอบ (20%)',
      behavior: 'จิตพิสัย (20%)',
      final: 'สอบปลายภาค (30%)'
    };
    return cats[c] || c;
  };

  const getGradeStyle = (grade: string) => {
    if (grade.startsWith('A')) return `${styles.gradeBadge} ${styles.gradeA}`;
    if (grade.startsWith('B')) return `${styles.gradeBadge} ${styles.gradeB}`;
    if (grade.startsWith('C')) return `${styles.gradeBadge} ${styles.gradeC}`;
    if (grade.startsWith('D')) return `${styles.gradeBadge} ${styles.gradeD}`;
    if (grade.startsWith('F')) return `${styles.gradeBadge} ${styles.gradeF}`;
    return styles.gradeBadge;
  };

  const getGroupedAssignments = () => {
    const groups: Record<string, Assignment[]> = {
      assignment: [],
      quiz: [],
      behavior: [],
      final: []
    };
    filteredAssignments.forEach(a => {
      const cat = a.category || 'assignment';
      if (groups[cat]) {
        groups[cat].push(a);
      }
    });
    return groups;
  };

  const groupedAssignments = getGroupedAssignments();

  return (
    <div className="animate-fade-in">
      {/* 1. Selection Filters Card */}
      <div className={`${styles.filterCard} glass-card`}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
          <BookOpen size={18} color="var(--primary)" />
          <span>เลือกงานที่ต้องการกรอกคะแนน</span>
        </h4>
        
        {isLoadingFilters ? (
          <p className="text-muted">กำลังโหลดวิชาและห้องเรียน...</p>
        ) : (
          <div className={styles.filterRow}>
            {/* Subject */}
            <div className={styles.filterGroup}>
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
            <div className={styles.filterGroup}>
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

            {/* Assignment */}
            <div className={styles.filterGroup} style={{ flex: 1.5, opacity: activeTab === 'categories' ? 0.6 : 1 }}>
              <label className={tableStyles.label}>งานมอบหมาย / ข้อสอบในห้องนี้</label>
              {activeTab === 'categories' ? (
                <select className={tableStyles.input} disabled style={{ cursor: 'not-allowed' }}>
                  <option>-- แสดงคะแนนรวมทุกชิ้นงานสะสมแยกหมวดหมู่ --</option>
                </select>
              ) : filteredAssignments.length === 0 ? (
                <select className={tableStyles.input} disabled>
                  <option>-- ไม่มีงานมอบหมายในเงื่อนไขนี้ --</option>
                </select>
              ) : (
                <select
                  className={tableStyles.input}
                  value={selectedAssignment}
                  onChange={(e) => setSelectedAssignment(e.target.value)}
                >
                  {groupedAssignments.assignment.length > 0 && (
                    <optgroup label="งานที่มอบหมาย (สัดส่วน 30 คะแนน)">
                      {groupedAssignments.assignment.map(a => (
                        <option key={a.id} value={a.id}>{a.title} ({a.full_score} คะแนนเต็ม)</option>
                      ))}
                    </optgroup>
                  )}
                  {groupedAssignments.quiz.length > 0 && (
                    <optgroup label="แบบทดสอบ (สัดส่วน 20 คะแนน)">
                      {groupedAssignments.quiz.map(a => (
                        <option key={a.id} value={a.id}>{a.title} ({a.full_score} คะแนนเต็ม)</option>
                      ))}
                    </optgroup>
                  )}
                  {groupedAssignments.behavior.length > 0 && (
                    <optgroup label="จิตพิสัย (สัดส่วน 20 คะแนน)">
                      {groupedAssignments.behavior.map(a => (
                        <option key={a.id} value={a.id}>{a.title} ({a.full_score} คะแนนเต็ม)</option>
                      ))}
                    </optgroup>
                  )}
                  {groupedAssignments.final.length > 0 && (
                    <optgroup label="สอบปลายภาค (สัดส่วน 30 คะแนน)">
                      {groupedAssignments.final.map(a => (
                        <option key={a.id} value={a.id}>{a.title} ({a.full_score} คะแนนเต็ม)</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* แท็บสลับโหมดการทำงาน */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        paddingBottom: '12px'
      }}>
        <button
          type="button"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'individual' ? 'var(--primary)' : 'rgba(99, 102, 241, 0.06)',
            color: activeTab === 'individual' ? '#fff' : 'var(--text-main)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'individual' ? '0 4px 10px rgba(99, 102, 241, 0.25)' : 'none'
          }}
          onClick={() => setActiveTab('individual')}
        >
          📝 กรอกคะแนนรายชิ้นงาน
        </button>
        <button
          type="button"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'categories' ? 'var(--primary)' : 'rgba(99, 102, 241, 0.06)',
            color: activeTab === 'categories' ? '#fff' : 'var(--text-main)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'categories' ? '0 4px 10px rgba(99, 102, 241, 0.25)' : 'none'
          }}
          onClick={() => setActiveTab('categories')}
        >
          📊 ดูคะแนนรวมแยกหมวดหมู่
        </button>
      </div>

      {activeTab === 'individual' ? (
        <>
          {/* 2. Score Gradebook Table Section */}
          {!selectedAssignment ? (
            <div className="glass-card text-center" style={{ padding: '50px 20px' }}>
              <AlertTriangle size={44} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
              <h3>ไม่มีงานมอบหมาย</h3>
              <p className="text-muted">ห้องเรียนและรายวิชานี้ยังไม่มีชิ้นงานที่มอบหมาย กรุณาไปที่เมนู &quot;สร้างงาน&quot; เพื่อสร้างงานมอบหมายชิ้นแรก</p>
            </div>
          ) : isLoadingScores ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div style={{
                width: '35px',
                height: '35px',
                border: '4px solid rgba(79, 70, 229, 0.1)',
                borderRadius: '50%',
                borderTopColor: 'var(--primary)',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px'
              }} />
              <p className="text-muted">กำลังดึงข้อมูลรายชื่อนักเรียนและช่องกรอกคะแนน...</p>
            </div>
          ) : (
            <>
              {/* Assignment stats & Search */}
              <div className={styles.tableHeaderRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                {assignmentInfo && (
                  <div className={styles.assignmentInfo} style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span className={styles.infoLabel}>คะแนนเต็มดิบ:</span> {assignmentInfo.full_score} คะแนน
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(79, 70, 229, 0.15)', paddingLeft: '12px' }}>
                      <span className={styles.infoLabel}>คะแนนเก็บจริง:</span> {assignmentInfo.keep_score} คะแนน
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(79, 70, 229, 0.15)', paddingLeft: '12px' }}>
                      <span className={styles.infoLabel}>หมวดหมู่คะแนน:</span> <strong style={{ color: 'var(--primary)' }}>{getCategoryName(assignmentInfo.category)}</strong>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(79, 70, 229, 0.15)', paddingLeft: '12px' }}>
                      <span className={styles.infoLabel}>จำนวนนักเรียน:</span> {studentScores.length} คน
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* ปุ่มกรอกคะแนนเท่ากันทุกคน */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    background: 'rgba(99, 102, 241, 0.06)', 
                    padding: '4px 10px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid rgba(99, 102, 241, 0.12)' 
                  }}>
                    <input
                      type="number"
                      style={{ 
                        width: '75px', 
                        padding: '8px', 
                        borderRadius: '6px', 
                        border: '1px solid rgba(0, 0, 0, 0.15)', 
                        fontSize: '0.9rem', 
                        textAlign: 'center',
                        background: 'var(--bg-main)',
                        color: 'var(--text-main)'
                      }}
                      placeholder="คะแนน"
                      min="0"
                      max={assignmentInfo?.full_score}
                      step="0.5"
                      id="bulk-score-input"
                    />
                    <button
                      type="button"
                      className={tableStyles.addBtn}
                      style={{ 
                        padding: '8px 14px', 
                        fontSize: '0.85rem', 
                        background: 'var(--primary)', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 600,
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.15)'
                      }}
                      onClick={() => {
                        const val = (document.getElementById('bulk-score-input') as HTMLInputElement)?.value;
                        if (val === '' || val === undefined) {
                          showToast('กรุณากรอกตัวเลขคะแนนที่ต้องการก่อนกดปุ่มค่ะ', 'warning');
                          return;
                        }
                        const scoreNum = Number(val);
                        if (isNaN(scoreNum) || !assignmentInfo) return;
                        
                        const clampedScore = Math.max(0, Math.min(assignmentInfo.full_score, scoreNum));
                        const calculated = Math.round(((clampedScore / assignmentInfo.full_score) * assignmentInfo.keep_score) * 100) / 100;
                        
                        const newScores = studentScores.map(student => ({
                          ...student,
                          raw_score: clampedScore,
                          calculated_score: calculated
                        }));
                        setStudentScores(newScores);
                        showToast(`ใส่คะแนนดิบ ${clampedScore} คะแนน ให้ทุกคนเรียบร้อย! โปรดอย่าลืมกดปุ่มบันทึกด้านล่างด้วยนะคะ`, 'success');
                      }}
                    >
                      กรอกให้ทุกคนเท่ากัน
                    </button>
                  </div>

                  <button
                    type="button"
                    className={tableStyles.addBtn}
                    style={{ 
                      background: 'var(--primary)', 
                      color: '#fff', 
                      border: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '10px 16px', 
                      borderRadius: 'var(--radius-md)', 
                      cursor: 'pointer', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)'
                    }}
                    onClick={handleSaveScores}
                    disabled={isSaving}
                  >
                    <Save size={16} />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}</span>
                  </button>

                  <button
                    type="button"
                    className={tableStyles.addBtn}
                    style={{ 
                      background: '#8B5CF6', 
                      color: '#fff', 
                      border: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '10px 16px', 
                      borderRadius: 'var(--radius-md)', 
                      cursor: 'pointer', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      boxShadow: '0 4px 10px rgba(139, 92, 246, 0.15)'
                    }}
                    onClick={() => setIsPasteModalOpen(true)}
                  >
                    <FileText size={16} />
                    <span>วางคะแนนเรียงคน</span>
                  </button>

                  <button
                    type="button"
                    className={tableStyles.addBtn}
                    style={{ 
                      background: 'var(--success)', 
                      color: '#fff', 
                      border: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '10px 16px', 
                      borderRadius: 'var(--radius-md)', 
                      cursor: 'pointer', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.15)'
                    }}
                    onClick={() => scoreFileInputRef.current?.click()}
                  >
                    <Upload size={16} />
                    <span>นำเข้าคะแนน Excel</span>
                  </button>
                  <input
                    ref={scoreFileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    onChange={handleExcelScoreImport}
                  />

                  <div className={tableStyles.searchBar} style={{ maxWidth: '280px', margin: 0 }}>
                    <Search size={18} className={tableStyles.searchIcon} />
                    <input
                      type="text"
                      className={tableStyles.searchInput}
                      placeholder="ค้นหานักเรียนในตาราง..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* แผงดึงคอลัมน์คะแนนสะสมจาก Excel */}
              {showColSelector && (
                <div className="glass-card animate-scale-in" style={{ padding: '16px', marginBottom: '16px', background: 'rgba(99, 102, 241, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', border: '1px dashed var(--primary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>📊 ตรวจพบข้อมูลหลายช่อง! โปรดเลือกหัวข้อคะแนนใน Excel ที่จะดึง:</span>
                    <select
                      className={tableStyles.input}
                      style={{ width: '250px', padding: '6px 12px', height: '38px', cursor: 'pointer' }}
                      value={selectedExcelCol}
                      onChange={(e) => setSelectedExcelCol(Number(e.target.value))}
                    >
                      <option value={-1}>-- เลือกหัวข้อคอลัมน์คะแนน --</option>
                      {excelHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>{header || `คอลัมน์ที่ ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={tableStyles.addBtn}
                      onClick={applyExcelScores}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      ดึงข้อมูลคะแนนเข้าตาราง
                    </button>
                    <button
                      type="button"
                      className={tableStyles.cancelBtn}
                      onClick={() => setShowColSelector(false)}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {/* Scores Grading Matrix Table */}
              {filteredStudentScores.length === 0 ? (
                <div className={`${tableStyles.tableContainer} ${tableStyles.emptyState}`}>
                  <Info size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                  <p>ไม่พบรายชื่อนักเรียนที่สอดคล้องกับคำค้นหา</p>
                </div>
              ) : (
                <>
                  <div className={tableStyles.tableContainer}>
                    <table className={tableStyles.table}>
                      <thead className={tableStyles.thead}>
                        <tr>
                          <th className={tableStyles.th} style={{ width: '60px' }}>ลำดับ</th>
                          <th className={tableStyles.th} style={{ width: '130px' }}>รหัส</th>
                          <th className={tableStyles.th} style={{ width: '180px' }}>ชื่อ - นามสกุล</th>
                          <th className={tableStyles.th} style={{ width: '135px', textAlign: 'center' }}>คะแนนดิบที่ได้</th>
                          <th className={tableStyles.th} style={{ width: '180px', textAlign: 'center' }}>เกรดสะสมวิชานี้ (ครูเห็น)</th>
                          <th className={tableStyles.th}>ข้อเสนอแนะ (Feedback สำหรับนักเรียน)</th>
                          <th className={tableStyles.th}>บันทึกส่วนตัวของครู (นักเรียนไม่เห็น)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudentScores.map((student, index) => (
                          <tr key={student.student_id} className={tableStyles.tr}>
                            <td className={tableStyles.td}>{index + 1}</td>
                            <td className={tableStyles.td}>
                              <span className={tableStyles.codeBadge} style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                                {student.student_code}
                              </span>
                            </td>
                            <td className={tableStyles.td} style={{ fontWeight: 600 }}>
                              {student.first_name} {student.last_name}
                            </td>
                            <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <input
                                  type="number"
                                  className={styles.scoreInput}
                                  min="0"
                                  max={assignmentInfo?.full_score}
                                  step="0.5"
                                  value={student.raw_score === -1 ? '' : student.raw_score}
                                  onChange={(e) => handleScoreChange(index, e.target.value)}
                                  placeholder="-"
                                  disabled={isSaving}
                                />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                                  / {assignmentInfo?.full_score}
                                </span>
                              </div>
                            </td>
                            <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                              {student.overall_keep_max > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                  <span className={getGradeStyle(student.overall_grade)}>
                                    เกรด {student.overall_grade}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>
                                    ({student.overall_keep_sum} / {student.overall_keep_max} คะแนน)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.85rem' }}>ไม่มีข้อมูล</span>
                              )}
                            </td>
                            <td className={tableStyles.td}>
                              <input
                                type="text"
                                className={styles.feedbackInput}
                                placeholder="ข้อเสนอแนะต่อนักเรียน..."
                                value={student.feedback}
                                onChange={(e) => handleFeedbackChange(index, e.target.value)}
                                disabled={isSaving}
                              />
                            </td>
                            <td className={tableStyles.td}>
                              <input
                                type="text"
                                className={styles.noteInput}
                                placeholder="บันทึกย่อส่วนตัว..."
                                value={student.note}
                                onChange={(e) => handleNoteChange(index, e.target.value)}
                                disabled={isSaving}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Scores Actions Bar */}
                  <div className={styles.saveFooter}>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={handleSaveScores}
                      disabled={isSaving}
                    >
                      <Save size={18} />
                      <span>{isSaving ? 'กำลังบันทึกคะแนน...' : 'บันทึกและคำนวณคะแนนทั้งหมด'}</span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {/* ตารางสรุปคะแนนรวมแยกตาม 4 หมวดหมู่สัดส่วนน้ำหนักสะสม */}
          {isCategorySummaryLoading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div style={{
                width: '35px',
                height: '35px',
                border: '4px solid rgba(79, 70, 229, 0.1)',
                borderRadius: '50%',
                borderTopColor: 'var(--primary)',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px'
              }} />
              <p className="text-muted">กำลังดึงและคำนวณข้อมูลสรุปรายหมวดหมู่...</p>
            </div>
          ) : categorySummaryData.length === 0 ? (
            <div className="glass-card text-center" style={{ padding: '50px 20px' }}>
              <AlertTriangle size={44} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
              <h3>ไม่มีข้อมูลนักเรียน</h3>
              <p className="text-muted">ไม่พบข้อมูลคะแนนวิชานี้สำหรับห้องเรียนที่เลือก</p>
            </div>
          ) : (
            <div className={tableStyles.tableContainer} style={{ background: 'var(--bg-card)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--radius-md)' }}>
              <table className={tableStyles.table}>
                <thead className={tableStyles.thead} style={{ background: 'rgba(99, 102, 241, 0.04)' }}>
                  <tr>
                    <th className={tableStyles.th} style={{ width: '60px', textAlign: 'center' }}>ลำดับ</th>
                    <th className={tableStyles.th} style={{ width: '130px' }}>รหัสประจำตัว</th>
                    <th className={tableStyles.th} style={{ width: '180px' }}>ชื่อ - นามสกุล</th>
                    <th className={tableStyles.th} style={{ textAlign: 'center' }}>งานมอบหมาย (30%)</th>
                    <th className={tableStyles.th} style={{ textAlign: 'center' }}>แบบทดสอบ (20%)</th>
                    <th className={tableStyles.th} style={{ textAlign: 'center' }}>จิตพิสัย (20%)</th>
                    <th className={tableStyles.th} style={{ textAlign: 'center' }}>สอบปลายภาค (30%)</th>
                    <th className={tableStyles.th} style={{ textAlign: 'center', width: '130px' }}>คะแนนเก็บสะสมรวม</th>
                    <th className={tableStyles.th} style={{ textAlign: 'center', width: '120px' }}>เกรดสะสมวิชานี้</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySummaryData.map((row, index) => (
                    <tr key={row.student_id} className={tableStyles.tr}>
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td className={tableStyles.td}>
                        <span className={tableStyles.codeBadge} style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                          {row.student_id}
                        </span>
                      </td>
                      <td className={tableStyles.td} style={{ fontWeight: 600 }}>{row.first_name} {row.last_name}</td>
                      
                      {/* Categories weights */}
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                        <strong style={{ fontSize: '1rem', color: '#6B7280' }}>{Math.round(row.catSums.assignment * 100) / 100}</strong>
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}> / {row.catMaxs.assignment}</span>
                      </td>
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{Math.round(row.catSums.quiz * 100) / 100}</strong>
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}> / {row.catMaxs.quiz}</span>
                      </td>
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                        <strong style={{ fontSize: '1rem', color: '#10B981' }}>{Math.round(row.catSums.behavior * 100) / 100}</strong>
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}> / {row.catMaxs.behavior}</span>
                      </td>
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                        <strong style={{ fontSize: '1rem', color: '#EF4444' }}>{Math.round(row.catSums.final * 100) / 100}</strong>
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}> / {row.catMaxs.final}</span>
                      </td>
                      
                      {/* Overall Sum & Grade */}
                      <td className={tableStyles.td} style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>
                        {row.keep_score_sum}
                      </td>
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                        <span className={getGradeStyle(row.grade)}>
                          เกรด {row.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* โมดอลสำหรับคัดลอกคะแนนมาวางเรียงลำดับคน */}
      {isPasteModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(5px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-card" style={{
            width: '460px',
            padding: '24px',
            background: 'var(--bg-card-solid)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary-light)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            zIndex: 10000
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontWeight: 700, color: 'var(--text-main)', fontSize: '1.2rem' }}>
              วางคะแนนสะสมเรียงตามลำดับรายชื่อ
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: '16px', lineHeight: 1.4 }}>
              คัดลอกคะแนน 1 คอลัมน์จาก Excel/Google Sheets มาวางด้านล่างได้เลยค่ะ ระบบจะใส่คะแนนให้เด็กๆ เรียงจากคนแรกไล่ลงไปตามลำดับในตารางขณะนี้:
            </p>
            <textarea
              style={{
                width: '100%',
                height: '180px',
                padding: '12px',
                borderRadius: '8px',
                border: '1.5px solid var(--primary-light)',
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)',
                marginBottom: '16px',
                resize: 'none',
                lineHeight: '1.5',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
              }}
              placeholder="ตัวอย่างเช่น:&#10;15&#10;18.5&#10;ค้างส่ง (ปล่อยว่าง)&#10;20"
              value={pastedScoresText}
              onChange={(e) => setPastedScoresText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className={tableStyles.cancelBtn}
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPastedScoresText('');
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className={tableStyles.addBtn}
                style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
                onClick={() => {
                  if (!assignmentInfo) return;
                  const lines = pastedScoresText.split('\n').map(l => l.trim());
                  
                  const newScores = [...studentScores];
                  let matchCount = 0;
                  
                  filteredStudentScores.forEach((visibleStudent, idx) => {
                    if (idx < lines.length) {
                      const val = lines[idx];
                      const targetIdx = newScores.findIndex(s => s.student_id === visibleStudent.student_id);
                      
                      if (targetIdx !== -1) {
                        if (val === '' || val.toLowerCase().includes('ค้าง') || val === '-') {
                          newScores[targetIdx].raw_score = -1;
                          newScores[targetIdx].calculated_score = 0;
                          matchCount++;
                        } else {
                          const raw = Number(val);
                          if (!isNaN(raw)) {
                            const clampedRaw = Math.max(0, Math.min(assignmentInfo.full_score, raw));
                            const calculated = Math.round(((clampedRaw / assignmentInfo.full_score) * assignmentInfo.keep_score) * 100) / 100;
                            newScores[targetIdx].raw_score = clampedRaw;
                            newScores[targetIdx].calculated_score = calculated;
                            matchCount++;
                          }
                        }
                      }
                    }
                  });
                  
                  setStudentScores(newScores);
                  setIsPasteModalOpen(false);
                  setPastedScoresText('');
                  showToast(`วางคะแนนด่วนสำเร็จเรียบร้อย ${matchCount} คน! อย่าลืมกดปุ่มบันทึกคะแนนสะสมจริงด้านล่างตารางนะคะ`, 'success');
                }}
              >
                ยืนยันการวางคะแนน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
