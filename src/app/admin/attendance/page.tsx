'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Save, Calendar, BookOpen, Users, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import * as XLSX from 'xlsx';
import tableStyles from '../subjects/subjects.module.css';
import filterStyles from '../scores/scores.module.css';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface AttendanceStudent {
  student_id_key: string;
  student_id: string;
  first_name: string;
  last_name: string;
  status: 'present' | 'absent' | 'late' | 'leave_business' | 'leave_sick';
}

export default function AdminAttendancePage() {
  const { showToast } = useApp();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceStudent['status']>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const attendanceFileInputRef = useRef<HTMLInputElement>(null);
  const [excelDataRows, setExcelDataRows] = useState<any[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [selectedExcelCol, setSelectedExcelCol] = useState<number>(-1);
  const [showColSelector, setShowColSelector] = useState(false);
  const [studentIdColIdx, setStudentIdColIdx] = useState<number>(0);

  const handleExcelAttendanceImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || students.length === 0) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (rows.length < 2) {
          showToast('ไม่พบข้อมูลการเช็คชื่อที่ถูกต้องในไฟล์ Excel', 'warning');
          return;
        }

        const rawHeaders = rows[0].map(h => String(h || '').trim());
        const headersLower = rawHeaders.map(h => h.toLowerCase());
        
        let idIdx = headersLower.findIndex(h => h.includes('รหัส') || h.includes('id') || h.includes('code') || h.includes('student'));
        if (idIdx === -1) idIdx = 1; // ค่าตั้งต้นไปที่คอลัมน์ที่ 2 (ดัชนี 1) ของตารางเด็ก

        setStudentIdColIdx(idIdx);
        setExcelHeaders(rawHeaders);
        setExcelDataRows(rows);

        // คำนวณหาวันที่ตรงกันใน Excel อัตโนมัติ (เช่น เลือกวันที่ 2026-05-18 ระบบจะจับคู่ 18/5 หรือ 18-5)
        const dateParts = selectedDate.split('-');
        let matchedColIdx = -1;
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[2], 10);
          const month = parseInt(dateParts[1], 10);
          const searchPattern1 = `${day}/${month}`;
          const searchPattern2 = `${day}-${month}`;
          
          matchedColIdx = rawHeaders.findIndex(h => 
            h.includes(searchPattern1) || h.includes(searchPattern2)
          );
        }

        // หากไม่เจอลายแทงวันที่ ให้มองหาคีย์เวิร์ดทั่วไป
        if (matchedColIdx === -1) {
          matchedColIdx = headersLower.findIndex(h => h.includes('สถานะ') || h.includes('status') || h.includes('เช็ค') || h.includes('เข้าเรียน'));
        }

        // ค่าตั้งต้นฉุกเฉิน
        if (matchedColIdx === -1) {
          matchedColIdx = rawHeaders.length > 5 ? 5 : 2;
        }

        setSelectedExcelCol(matchedColIdx);
        setShowColSelector(true);
        showToast('กรุณาเลือกคอลัมน์วันที่/สถานะเช็คชื่อจากเมนูด้านล่างค่ะ', 'info');
      } catch (error) {
        console.error('Excel parse error:', error);
        showToast('ไม่สามารถแยกวิเคราะห์ไฟล์ Excel นี้ได้', 'danger');
      } finally {
        if (attendanceFileInputRef.current) {
          attendanceFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const applyExcelAttendance = () => {
    if (selectedExcelCol === -1 || excelDataRows.length === 0 || students.length === 0) return;

    const importedStatusMap: Record<string, 'present' | 'absent' | 'late' | 'leave_business' | 'leave_sick'> = {};

    for (let i = 1; i < excelDataRows.length; i++) {
      const r = excelDataRows[i];
      if (!r || r.length === 0) continue;

      const studentCode = String(r[studentIdColIdx] || '').trim();
      const statusText = String(r[selectedExcelCol] || '').trim().toLowerCase();

      if (studentCode) {
        let status: 'present' | 'absent' | 'late' | 'leave_business' | 'leave_sick' = 'present';
        
        // เช็ควิเคราะห์คำใน Excel
        // รองรับทั้งไอคอน 🟢 หรือคำย่อ ข, ส, ล หรือข้อความ ขาดเรียน, สาย, ลา
        if (statusText.includes('ขาด') || statusText.includes('absent') || statusText === 'ข') {
          status = 'absent';
        } else if (statusText.includes('สาย') || statusText.includes('late') || statusText === 'ส') {
          status = 'late';
        } else if (statusText.includes('กิจ') || statusText.includes('business') || statusText.includes('ลากิจ') || statusText === 'ล') {
          status = 'leave_business';
        } else if (statusText.includes('ป่วย') || statusText.includes('sick') || statusText.includes('ลาป่วย') || statusText === 'ป') {
          status = 'leave_sick';
        } else {
          // ค่ามาตรฐานคือมาเรียน ( present )
          status = 'present';
        }

        importedStatusMap[studentCode.toLowerCase()] = status;
      }
    }

    let matchCount = 0;
    const updatedRecords = { ...records };
    students.forEach(s => {
      const sCodeLower = s.student_id.toLowerCase();
      if (importedStatusMap[sCodeLower] !== undefined) {
        updatedRecords[s.student_id_key] = importedStatusMap[sCodeLower];
        matchCount++;
      }
    });

    if (matchCount === 0) {
      showToast('ไม่สามารถจับคู่รหัสนักเรียนเข้าเรียนจากคอลัมน์ที่เลือกได้ โปรดตรวจสอบหัวข้อตารางและรหัสนักเรียนค่ะ', 'warning');
    } else {
      setRecords(updatedRecords);
      setShowColSelector(false);
      showToast(`ดึงประวัติเช็คชื่อสำเร็จ! จับคู่เช็คชื่อได้ ${matchCount} คนค่ะ อย่าลืมตรวจสอบและกดบันทึกข้อมูลเวลารวมนะคะ`, 'success');
    }
  };

  // Initialize today's date in YYYY-MM-DD
  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Load subject and classroom filters
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
      console.error('Load attendance filters error:', error);
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูลวิชา/ห้องเรียน', 'danger');
    } finally {
      setIsLoadingFilters(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  // Load students and attendance records
  const loadAttendanceData = async () => {
    if (!selectedSubject || !selectedClassroom || !selectedDate) return;

    setIsLoadingStudents(true);
    try {
      const res = await fetch(
        `/api/admin/attendance?subject_id=${selectedSubject}&classroom=${encodeURIComponent(selectedClassroom)}&date=${selectedDate}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStudents(data.students);
          
          // Set records state map: { student_id_key: status }
          const initialRecords: Record<string, AttendanceStudent['status']> = {};
          data.students.forEach((s: AttendanceStudent) => {
            initialRecords[s.student_id_key] = s.status;
          });
          setRecords(initialRecords);
        } else {
          showToast(data.error || 'โหลดรายชื่อล้มเหลว', 'danger');
        }
      }
    } catch (error) {
      console.error('Load attendance data error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลนักเรียน', 'danger');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [selectedSubject, selectedClassroom, selectedDate]);

  // Handle status toggle for a student
  const handleStatusChange = (studentIdKey: string, status: AttendanceStudent['status']) => {
    setRecords(prev => ({
      ...prev,
      [studentIdKey]: status
    }));
  };

  // Set all students to present (มาเรียน) as quick action
  const handleSetAllPresent = () => {
    const updated = { ...records };
    students.forEach(s => {
      updated[s.student_id_key] = 'present';
    });
    setRecords(updated);
    showToast('เช็คชื่อเป็น "มาเรียน" สำหรับทุกคนชั่วคราวแล้วค่ะ', 'info');
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: selectedSubject,
          classroom: selectedClassroom,
          date: selectedDate,
          records
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'บันทึกเวลาเข้าเรียนเรียบร้อยแล้วค่ะ', 'success');
      } else {
        showToast(data.error || 'บันทึกล้มเหลว', 'danger');
      }
    } catch (error) {
      console.error('Save attendance error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter(
    s => s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Filters Card */}
      <div className={`${filterStyles.filterCard} glass-card`}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
          <BookOpen size={18} color="var(--primary)" />
          <span>ข้อมูลห้องเรียนและวันที่สืบค้น</span>
        </h4>
        
        {isLoadingFilters ? (
          <p className="text-muted">กำลังโหลดตัวเลือกวิชาและห้องเรียน...</p>
        ) : (
          <div className={filterStyles.filterRow}>
            {/* Subject */}
            <div className={filterStyles.filterGroup}>
              <label className={tableStyles.label}>วิชาเรียน</label>
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

            {/* Date Picker */}
            <div className={filterStyles.filterGroup}>
              <label className={tableStyles.label}>วันที่เช็คชื่อ</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  className={tableStyles.input}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ paddingLeft: '14px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action panel and student list */}
      {isLoadingStudents ? (
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
          <p className="text-muted">กำลังโหลดข้อมูลนักเรียน...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '50px 20px' }}>
          <AlertCircle size={44} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
          <h3>ไม่พบข้อมูลนักเรียน</h3>
          <p className="text-muted">ห้องเรียนนี้ยังไม่มีนักเรียนลงทะเบียนหรือรายชื่อวิชานี้ไม่มีผู้เรียนค่ะ</p>
        </div>
      ) : (
        <>
          <div className={tableStyles.headerActions}>
            <div className={tableStyles.searchBar} style={{ maxWidth: '280px' }}>
              <Search size={18} className={tableStyles.searchIcon} />
              <input
                type="text"
                className={tableStyles.searchInput}
                placeholder="ค้นหารายชื่อในห้องเรียน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={() => attendanceFileInputRef.current?.click()} 
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Upload size={16} />
                <span>นำเข้า Excel</span>
              </button>
              <input
                ref={attendanceFileInputRef}
                type="file"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleExcelAttendanceImport}
              />

              <button 
                type="button" 
                onClick={handleSetAllPresent} 
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={16} />
                <span>มาเรียนทั้งหมด</span>
              </button>

              <button 
                type="button" 
                onClick={handleSaveAttendance}
                disabled={isSaving}
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)'
                }}
              >
                <Save size={16} />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเวลาเรียน'}</span>
              </button>
            </div>
          </div>

          {/* แผงดึงคอลัมน์เช็คชื่อเข้าเรียนจาก Excel */}
          {showColSelector && (
            <div className="glass-card animate-scale-in" style={{ padding: '16px', marginBottom: '16px', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', border: '1px dashed var(--success)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>📊 ตรวจพบประวัติเช็คชื่อหลายวัน! โปรดเลือกคอลัมน์วันที่ใน Excel ที่จะดึง:</span>
                <select
                  className={tableStyles.input}
                  style={{ width: '250px', padding: '6px 12px', height: '38px', cursor: 'pointer' }}
                  value={selectedExcelCol}
                  onChange={(e) => setSelectedExcelCol(Number(e.target.value))}
                >
                  <option value={-1}>-- เลือกคอลัมน์หัวข้อวันที่ --</option>
                  {excelHeaders.map((header, idx) => (
                    <option key={idx} value={idx}>{header || `คอลัมน์ที่ ${idx + 1}`}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={tableStyles.addBtn}
                  onClick={applyExcelAttendance}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--success)' }}
                >
                  ดึงประวัติเข้าตาราง
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

          {/* Attendance Check Grid */}
          <div className={tableStyles.tableContainer} style={{ border: '1px solid #eee', borderRadius: '8px' }}>
            <table className={tableStyles.table}>
              <thead className={tableStyles.thead}>
                <tr>
                  <th className={tableStyles.th} style={{ width: '60px', textAlign: 'center' }}>ลำดับ</th>
                  <th className={tableStyles.th} style={{ width: '120px' }}>รหัส</th>
                  <th className={tableStyles.th}>ชื่อ - นามสกุล</th>
                  <th className={tableStyles.th} style={{ textAlign: 'center' }}>สถานะเวลาเรียน</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const currentStatus = records[student.student_id_key] || 'present';
                  
                  return (
                    <tr key={student.student_id_key} className={tableStyles.tr}>
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td className={tableStyles.td}>
                        <span className={tableStyles.codeBadge} style={{ background: 'none', border: '1px solid #ddd' }}>
                          {student.student_id}
                        </span>
                      </td>
                      <td className={tableStyles.td} style={{ fontWeight: 600 }}>
                        {student.first_name} {student.last_name}
                      </td>
                      <td className={tableStyles.td}>
                        {/* Radio controls with custom class toggles */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          {/* Present (มาเรียน) */}
                          <label style={getRadioLabelStyle('present', currentStatus === 'present')}>
                            <input
                              type="radio"
                              name={`status-${student.student_id_key}`}
                              checked={currentStatus === 'present'}
                              onChange={() => handleStatusChange(student.student_id_key, 'present')}
                              style={{ display: 'none' }}
                            />
                            <span>มาเรียน</span>
                          </label>

                          {/* Absent (ขาด) */}
                          <label style={getRadioLabelStyle('absent', currentStatus === 'absent')}>
                            <input
                              type="radio"
                              name={`status-${student.student_id_key}`}
                              checked={currentStatus === 'absent'}
                              onChange={() => handleStatusChange(student.student_id_key, 'absent')}
                              style={{ display: 'none' }}
                            />
                            <span>ขาด</span>
                          </label>

                          {/* Late (สาย) */}
                          <label style={getRadioLabelStyle('late', currentStatus === 'late')}>
                            <input
                              type="radio"
                              name={`status-${student.student_id_key}`}
                              checked={currentStatus === 'late'}
                              onChange={() => handleStatusChange(student.student_id_key, 'late')}
                              style={{ display: 'none' }}
                            />
                            <span>สาย</span>
                          </label>

                          {/* Leave Business (ลากิจ) */}
                          <label style={getRadioLabelStyle('leave_business', currentStatus === 'leave_business')}>
                            <input
                              type="radio"
                              name={`status-${student.student_id_key}`}
                              checked={currentStatus === 'leave_business'}
                              onChange={() => handleStatusChange(student.student_id_key, 'leave_business')}
                              style={{ display: 'none' }}
                            />
                            <span>ลากิจ</span>
                          </label>

                          {/* Leave Sick (ลาป่วย) */}
                          <label style={getRadioLabelStyle('leave_sick', currentStatus === 'leave_sick')}>
                            <input
                              type="radio"
                              name={`status-${student.student_id_key}`}
                              checked={currentStatus === 'leave_sick'}
                              onChange={() => handleStatusChange(student.student_id_key, 'leave_sick')}
                              style={{ display: 'none' }}
                            />
                            <span>ลาป่วย</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Helper to generate dynamic colored label style for radio inputs
const getRadioLabelStyle = (status: AttendanceStudent['status'], isActive: boolean): React.CSSProperties => {
  const colors: Record<AttendanceStudent['status'], { text: string; bg: string; border: string }> = {
    present: { text: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: '#10B981' },
    absent: { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444' },
    late: { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B' },
    leave_business: { text: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: '#3B82F6' },
    leave_sick: { text: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)', border: '#06B6D4' }
  };

  const style = colors[status];

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.2s ease',
    border: '1px solid',
    color: isActive ? '#ffffff' : style.text,
    backgroundColor: isActive ? style.border : 'transparent',
    borderColor: style.border,
    boxShadow: isActive ? `0 2px 6px ${style.border}30` : 'none'
  };
};
