// src/app/admin/students/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Edit2, Trash2, X, AlertCircle, 
  Upload, Download, Clipboard, CheckCircle, Info, Key 
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import * as XLSX from 'xlsx';
import styles from './students.module.css';
import tableStyles from '../subjects/subjects.module.css'; // Import shared table styles

const toggleBtnStyle: React.CSSProperties = {
  padding: '0 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--glass-border)',
  background: 'rgba(79, 70, 229, 0.08)',
  color: 'var(--primary)',
  fontSize: '0.85rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  classroom: string | null;
  status: 'pending' | 'active';
  created_at: string;
}

interface ParsedStudentInput {
  studentId: string;
  firstName: string;
  lastName: string;
  classroom: string;
}

export default function AdminStudentsPage() {
  const { showToast, showConfirm } = useApp();
  
  const [activeTab, setActiveTab] = useState<'list' | 'bulk' | 'excel'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Single Add/Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [classroomInput, setClassroomInput] = useState('');
  const [isCustomClassroom, setIsCustomClassroom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Paste states
  const [pasteText, setPasteText] = useState('');
  const [defaultClassroom, setDefaultClassroom] = useState('');
  const [isCustomDefaultClassroom, setIsCustomDefaultClassroom] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentInput[]>([]);

  // Excel Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelStudents, setExcelStudents] = useState<ParsedStudentInput[]>([]);

  // Load students & classrooms
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load Students
      const studentRes = await fetch('/api/admin/students');
      const studentData = await studentRes.json();
      if (studentData.success) {
        setStudents(studentData.students);
      } else {
        showToast(studentData.error || 'โหลดข้อมูลนักเรียนล้มเหลว', 'danger');
      }

      // Load Classrooms
      const classRes = await fetch('/api/public/classrooms');
      const classData = await classRes.json();
      if (classData.success && classData.classrooms) {
        const names = classData.classrooms.map((c: any) => c.name);
        setClassrooms(names);
        if (names.length > 0) {
          setDefaultClassroom(names[0]);
          setClassroomInput(names[0]);
          setIsCustomClassroom(false);
          setIsCustomDefaultClassroom(false);
        } else {
          setIsCustomClassroom(true);
          setIsCustomDefaultClassroom(true);
        }
      }
    } catch (error) {
      console.error('Load students error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync inputs on tab/modal change
  useEffect(() => {
    if (classrooms.length > 0 && !classroomInput) {
      setClassroomInput(classrooms[0]);
    }
    if (classrooms.length > 0 && !defaultClassroom) {
      setDefaultClassroom(classrooms[0]);
    }
  }, [classrooms, classroomInput, defaultClassroom]);

  // Parse bulk paste text line by line
  useEffect(() => {
    if (!pasteText.trim()) {
      setParsedStudents([]);
      return;
    }

    const lines = pasteText.split('\n');
    const results: ParsedStudentInput[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Split by spaces or tabs
      const parts = trimmed.split(/\s+/);

      if (parts.length >= 3) {
        results.push({
          studentId: parts[0],
          firstName: parts[1],
          lastName: parts[2],
          classroom: parts[3] || defaultClassroom || 'ม.6/1'
        });
      }
    });

    setParsedStudents(results);
  }, [pasteText, defaultClassroom]);

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesClass = 
      classFilter === 'all' || 
      student.classroom === classFilter;

    return matchesSearch && matchesClass;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter]);

  // Actions
  const openAddModal = () => {
    setModalMode('add');
    setStudentIdInput('');
    setFirstNameInput('');
    setLastNameInput('');
    if (classrooms.length > 0) {
      setClassroomInput(classrooms[0]);
      setIsCustomClassroom(false);
    } else {
      setClassroomInput('');
      setIsCustomClassroom(true);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (std: Student) => {
    setModalMode('edit');
    setEditingId(std.id);
    setStudentIdInput(std.student_id);
    setFirstNameInput(std.first_name);
    setLastNameInput(std.last_name);
    setClassroomInput(std.classroom || classrooms[0] || '');
    setIsCustomClassroom(false);
    setIsModalOpen(true);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentIdInput.trim() || !firstNameInput.trim() || !lastNameInput.trim() || !classroomInput) {
      showToast('กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: studentIdInput.trim(),
            firstName: firstNameInput.trim(),
            lastName: lastNameInput.trim(),
            classroom: classroomInput
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'เพิ่มนักเรียนใหม่สำเร็จ', 'success');
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(data.error || 'เพิ่มนักเรียนล้มเหลว', 'danger');
        }
      } else {
        const res = await fetch(`/api/admin/students/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: firstNameInput.trim(),
            lastName: lastNameInput.trim(),
            classroom: classroomInput
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'แก้ไขข้อมูลนักเรียนสำเร็จ', 'success');
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(data.error || 'แก้ไขข้อมูลนักเรียนล้มเหลว', 'danger');
        }
      }
    } catch (error) {
      console.error('Submit single error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = (std: Student) => {
    showConfirm({
      title: 'ยืนยันการลบรายชื่อนักเรียน',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${std.first_name} ${std.last_name} (${std.student_id})"? ประวัติคะแนนและการส่งงานทั้งหมดของนักเรียนรายนี้จะถูกลบออกไปถาวร ไม่สามารถกู้คืนได้`,
      confirmText: 'ลบนักเรียนออก',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/students/${std.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('ลบนักเรียนและคะแนนเรียบร้อยแล้ว', 'success');
            loadData();
          } else {
            showToast(data.error || 'ลบข้อมูลล้มเหลว', 'danger');
          }
        } catch (error) {
          console.error('Delete error:', error);
          showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'danger');
        }
      }
    });
  };

  const handleResetPassword = (std: Student) => {
    showConfirm({
      title: 'ยืนยันการรีเซ็ตรหัสผ่าน',
      message: `คุณต้องการรีเซ็ตรหัสผ่านของ "${std.first_name} ${std.last_name}" ใช่หรือไม่? รหัสผ่านใหม่จะถูกตั้งกลับไปเป็น "รหัสนักเรียน" ของเด็กทันที (คะแนนสอบยังคงอยู่ตามปกติ)`,
      confirmText: 'ยืนยันรีเซ็ตรหัสผ่าน',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/students/${std.id}/reset-password`, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('รีเซ็ตรหัสผ่านเรียบร้อย รหัสผ่านใหม่คือรหัสนักเรียน', 'success');
            loadData();
          } else {
            showToast(data.error || 'รีเซ็ตรหัสผ่านล้มเหลว', 'danger');
          }
        } catch (error) {
          console.error('Reset password error:', error);
          showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
        }
      }
    });
  };

  // Submit Bulk Paste Import
  const handleBulkSubmit = async () => {
    if (parsedStudents.length === 0) {
      showToast('ไม่มีรายชื่อที่ตรวจสอบพบเพื่อนำเข้า', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedStudents })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'นำเข้ารายชื่อกลุ่มนักเรียนสำเร็จ', 'success');
        setPasteText('');
        setParsedStudents([]);
        setActiveTab('list');
        loadData();
      } else {
        showToast(data.error || 'นำเข้าข้อมูลล้มเหลว', 'danger');
      }
    } catch (error) {
      console.error('Bulk submit error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse Excel File on client side
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const results: ParsedStudentInput[] = [];

        // Parse starting from row index 1 (skipping header)
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 3) continue;

          // Expecting format: [StudentId, FirstName, LastName, Classroom]
          results.push({
            studentId: String(r[0] || '').trim(),
            firstName: String(r[1] || '').trim(),
            lastName: String(r[2] || '').trim(),
            classroom: String(r[3] || defaultClassroom || 'ม.6/1').trim()
          });
        }

        if (results.length === 0) {
          showToast('ไม่พบข้อมูลนักเรียนที่ถูกต้องในไฟล์ Excel (โปรดตรวจสอบการจัดวางหัวตาราง)', 'warning');
        } else {
          setExcelStudents(results);
          showToast(`แกะวิเคราะห์ไฟล์ Excel สำเร็จ ตรวจพบนักเรียน ${results.length} คน`, 'success');
        }
      } catch (error) {
        console.error('Excel parse error:', error);
        showToast('ไม่สามารถแยกวิเคราะห์ไฟล์ Excel นี้ได้ กรุณาใช้ตามตัวอย่างเทมเพลต', 'danger');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Excel Import
  const handleExcelSubmit = async () => {
    if (excelStudents.length === 0) {
      showToast('ไม่มีข้อมูลรายชื่อเพื่อนำเข้า', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: excelStudents })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'นำเข้านักเรียนจาก Excel สำเร็จ', 'success');
        setExcelStudents([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setActiveTab('list');
        loadData();
      } else {
        showToast(data.error || 'นำเข้าข้อมูลล้มเหลว', 'danger');
      }
    } catch (error) {
      console.error('Excel submit error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export all students to Excel
  const handleExportExcel = () => {
    if (students.length === 0) {
      showToast('ไม่มีข้อมูลนักเรียนที่จะส่งออก', 'warning');
      return;
    }

    // Format data for spreadsheet
    const dataToExport = students.map((std, idx) => ({
      'ลำดับ': idx + 1,
      'รหัสนักเรียน': std.student_id,
      'ชื่อ': std.first_name,
      'นามสกุล': std.last_name,
      'ห้องเรียน': std.classroom || 'ไม่มีห้องเรียน',
      'สถานะบัญชี': std.status === 'active' ? 'ลงทะเบียนแล้ว' : 'ยังไม่ได้ลงทะเบียน',
      'วันที่บันทึกระบบ': new Date(std.created_at).toLocaleDateString('th-TH')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักเรียน');
    
    // Write and download
    XLSX.writeFile(wb, 'รายชื่อนักเรียนทั้งหมด.xlsx');
    showToast('ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว', 'success');
  };

  // Download template Excel
  const handleDownloadTemplate = () => {
    const headers = [['รหัสนักเรียน', 'ชื่อจริง', 'นามสกุล', 'ห้องเรียน']];
    const sample = [['STD021', 'สมฤดี', 'ดีงาม', 'ม.6/1']];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'เทมเพลตนำเข้านักเรียน.xlsx');
    showToast('ดาวน์โหลดเทมเพลต Excel สำเร็จ', 'info');
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      {/* Tab Select Header */}
      <div className={styles.tabHeader}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'list' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('list')}
        >
          รายชื่อนักเรียน ({filteredStudents.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'bulk' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          คัดลอก-วางรายชื่อ (Bulk Paste)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'excel' ? styles.activeTabBtn : ''}`}
          onClick={() => setActiveTab('excel')}
        >
          นำเข้าผ่าน Excel
        </button>
      </div>

      {/* Tab 1: Student List (Search, Filter, Export, Add Single, Table) */}
      {activeTab === 'list' && (
        <>
          <div className={tableStyles.headerActions}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
              {/* Search */}
              <div className={tableStyles.searchBar}>
                <Search size={18} className={tableStyles.searchIcon} />
                <input
                  type="text"
                  className={tableStyles.searchInput}
                  placeholder="ค้นหาด้วยรหัส หรือชื่อนักเรียน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Classroom Filter */}
              <select
                className={tableStyles.searchInput}
                style={{ maxWidth: '160px', paddingLeft: '14px', cursor: 'pointer' }}
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="all">ห้องเรียนทั้งหมด</option>
                {classrooms.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className={styles.btnRow}>
              <button className={styles.exportBtn} onClick={handleExportExcel}>
                <Download size={18} />
                <span>Export Excel</span>
              </button>
              <button className={tableStyles.addBtn} onClick={openAddModal}>
                <Plus size={18} />
                <span>เพิ่มนักเรียนใหม่</span>
              </button>
            </div>
          </div>

          {isLoading ? (
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
              <p className="text-muted">กำลังโหลดรายชื่อนักเรียน...</p>
            </div>
          ) : paginatedStudents.length === 0 ? (
            <div className={`${tableStyles.tableContainer} ${tableStyles.emptyState}`}>
              <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
              <h3>ไม่พบข้อมูลนักเรียน</h3>
              <p>ไม่มีรายชื่อนักเรียนตามคำค้นหาที่กรองไว้</p>
            </div>
          ) : (
            <>
              <div className={tableStyles.tableContainer}>
                <table className={tableStyles.table}>
                  <thead className={tableStyles.thead}>
                    <tr>
                      <th className={tableStyles.th} style={{ width: '80px' }}>ลำดับ</th>
                      <th className={tableStyles.th} style={{ width: '150px' }}>รหัสนักเรียน</th>
                      <th className={tableStyles.th}>ชื่อ - นามสกุล</th>
                      <th className={tableStyles.th} style={{ width: '120px' }}>ห้องเรียน</th>
                      <th className={tableStyles.th} style={{ width: '180px' }}>สถานะบัญชี</th>
                      <th className={tableStyles.th} style={{ width: '120px', textAlign: 'center' }}>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((std, index) => (
                      <tr key={std.id} className={tableStyles.tr}>
                        <td className={tableStyles.td} style={{ fontWeight: 500 }}>
                          {startIndex + index + 1}
                        </td>
                        <td className={tableStyles.td}>
                          <span className={tableStyles.codeBadge} style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                            {std.student_id}
                          </span>
                        </td>
                        <td className={tableStyles.td} style={{ fontWeight: 600 }}>
                          {std.first_name} {std.last_name}
                        </td>
                        <td className={tableStyles.td}>
                          <span className={tableStyles.codeBadge} style={{ textTransform: 'uppercase' }}>
                            {std.classroom || 'ไม่มีห้อง'}
                          </span>
                        </td>
                        <td className={tableStyles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                            <span className={`${styles.statusDot} ${styles.statusActive}`} />
                            <span className="text-muted">
                              พร้อมใช้งาน
                            </span>
                          </div>
                        </td>
                        <td className={tableStyles.td}>
                          <div className={tableStyles.actionsArea} style={{ justifyContent: 'center' }}>
                            <button 
                              className={`${tableStyles.iconBtn}`} 
                              style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}
                              onClick={() => handleResetPassword(std)}
                              title="รีเซ็ตรหัสผ่านกลับเป็นรหัสนักเรียน"
                            >
                              <Key size={15} />
                            </button>
                            <button 
                              className={`${tableStyles.iconBtn} ${tableStyles.editIconBtn}`} 
                              onClick={() => openEditModal(std)}
                              title="แก้ไขข้อมูลนักเรียน"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              className={`${tableStyles.iconBtn} ${tableStyles.deleteIconBtn}`} 
                              onClick={() => handleDeleteStudent(std)}
                              title="ลบนักเรียน"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={tableStyles.pagination}>
                  <span>
                    แสดงรายการที่ {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredStudents.length)} จากทั้งหมด {filteredStudents.length} รายการ
                  </span>
                  <div className={tableStyles.paginationBtns}>
                    <button
                      className={tableStyles.pageBtn}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      ย้อนกลับ
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`${tableStyles.pageBtn} ${currentPage === page ? tableStyles.activePageBtn : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className={tableStyles.pageBtn}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab 2: Bulk Paste (Text area input, auto parser preview) */}
      {activeTab === 'bulk' && (
        <div className={styles.importPanel}>
          {/* Left panel: paste inputs */}
          <div className="glass-card">
            <div className={styles.instructionBox}>
              <h5 className={styles.instructionTitle}>
                <Clipboard size={16} color="var(--primary)" />
                <span>คำแนะนำการวางรายชื่อนักเรียน</span>
              </h5>
              <p>คัดลอกข้อมูลรายชื่อมาวางในกล่องข้อความบรรทัดละ 1 คน โดยใช้ช่องว่างหรือแท็บคั่นข้อมูล เช่น:</p>
              <code style={{ display: 'block', background: 'rgba(0,0,0,0.04)', padding: '6px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace' }}>
                STD025 สมชาย รักสงบ ม.6/1<br/>
                STD026 ดวงใจ งามพรรณ ม.6/1<br/>
                STD027 นารา พงษ์สิทธิ์ ม.6/2
              </code>
              <p style={{ marginTop: '6px' }}>*หากไม่มีข้อมูลห้องเรียน ระบบจะคัดให้เข้าห้องเรียนเริ่มต้นที่เลือกด้านล่างโดยอัตโนมัติ</p>
            </div>

            <div className={tableStyles.formGroup}>
              <label className={tableStyles.label}>ห้องเรียนเริ่มต้น (Default Classroom)</label>
              {isCustomDefaultClassroom ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className={tableStyles.input}
                    placeholder="พิมพ์ชื่อห้องเรียน เช่น ม.6/1"
                    value={defaultClassroom}
                    onChange={(e) => setDefaultClassroom(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  {classrooms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDefaultClassroom(false);
                        setDefaultClassroom(classrooms[0]);
                      }}
                      style={toggleBtnStyle}
                    >
                      เลือกจากห้องที่มี
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className={tableStyles.input}
                    value={defaultClassroom}
                    onChange={(e) => setDefaultClassroom(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {classrooms.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomDefaultClassroom(true);
                      setDefaultClassroom('');
                    }}
                    style={toggleBtnStyle}
                  >
                    พิมพ์ระบุเอง
                  </button>
                </div>
              )}
            </div>

            <div className={tableStyles.formGroup}>
              <label className={tableStyles.label}>วางข้อความรายชื่อนักเรียนด้านล่าง</label>
              <textarea
                className={styles.textarea}
                placeholder="วางรายชื่อ รหัส ชื่อ นามสกุล ห้อง คั่นด้วยเว้นวรรค..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <button 
              className={tableStyles.saveBtn} 
              style={{ width: '100%' }}
              onClick={handleBulkSubmit}
              disabled={isSubmitting || parsedStudents.length === 0}
            >
              {isSubmitting ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้าข้อมูล (${parsedStudents.length} คน)`}
            </button>
          </div>

          {/* Right panel: real-time parser preview */}
          <div className="glass-card styles.previewSection">
            <div className={styles.previewHeader}>
              <h4 className={styles.previewTitle}>รายการวิเคราะห์ข้อมูลรายชื่อที่พบ</h4>
              <span className={`${styles.badge} ${parsedStudents.length > 0 ? styles.badgeSuccess : styles.badgeWarning}`}>
                ตรวจพบ {parsedStudents.length} คน
              </span>
            </div>
            
            {parsedStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-sub)' }}>
                <Info size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <p>กรุณาวางรายชื่อในช่องข้อความทางซ้ายเพื่อเริ่มต้นการวิเคราะห์พรีวิว</p>
              </div>
            ) : (
              <div className={tableStyles.tableContainer} style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead className={tableStyles.thead}>
                    <tr>
                      <th className={tableStyles.th} style={{ padding: '10px' }}>รหัส</th>
                      <th className={tableStyles.th} style={{ padding: '10px' }}>ชื่อ - นามสกุล</th>
                      <th className={tableStyles.th} style={{ padding: '10px', width: '100px' }}>ห้องเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedStudents.map((item, idx) => (
                      <tr key={idx} className={tableStyles.tr}>
                        <td className={tableStyles.td} style={{ padding: '10px', fontSize: '0.85rem' }}>{item.studentId}</td>
                        <td className={tableStyles.td} style={{ padding: '10px', fontWeight: 600, fontSize: '0.85rem' }}>{item.firstName} {item.lastName}</td>
                        <td className={tableStyles.td} style={{ padding: '10px', fontSize: '0.85rem' }}>{item.classroom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Excel Import (File upload, SheetJS client parsing) */}
      {activeTab === 'excel' && (
        <div className={styles.importPanel}>
          {/* Left panel: File Upload */}
          <div className="glass-card">
            <div className={styles.instructionBox}>
              <h5 className={styles.instructionTitle}>
                <Upload size={16} color="var(--primary)" />
                <span>คำแนะนำการอัปโหลดไฟล์ Excel</span>
              </h5>
              <p>จัดวางหัวตาราง Excel ในแถวแรก (แถว 1) โดยเรียงลำดับหัวข้อดังนี้:</p>
              <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: '4px 0' }}>
                [รหัสนักเรียน] | [ชื่อจริง] | [นามสกุล] | [ห้องเรียน]
              </p>
              <button 
                type="button" 
                onClick={handleDownloadTemplate} 
                style={{ 
                  background: 'none', border: 'none', color: 'var(--primary)', 
                  fontWeight: 600, cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.8rem' 
                }}
              >
                <Download size={14} /> ดาวน์โหลดเทมเพลต Excel ตัวอย่าง
              </button>
            </div>

            {/* Drag drop click select */}
            <div 
              className={styles.fileUploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} color="var(--primary)" />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>คลิกเพื่อเลือกไฟล์ Excel (.xlsx, .xls)</span>
              <span style={{ fontSize: '0.8rem' }}>หรือลากไฟล์มาวางในบริเวณนี้</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className={styles.hiddenInput}
                onChange={handleExcelUpload}
              />
            </div>

            <button 
              className={tableStyles.saveBtn} 
              style={{ width: '100%' }}
              onClick={handleExcelSubmit}
              disabled={isSubmitting || excelStudents.length === 0}
            >
              {isSubmitting ? 'กำลังบันทึกรายชื่อ...' : `ยืนยันนำเข้ารายชื่อจาก Excel (${excelStudents.length} คน)`}
            </button>
          </div>

          {/* Right panel: Excel parsing preview */}
          <div className="glass-card styles.previewSection">
            <div className={styles.previewHeader}>
              <h4 className={styles.previewTitle}>ข้อมูลวิเคราะห์พบจากไฟล์ Excel</h4>
              <span className={`${styles.badge} ${excelStudents.length > 0 ? styles.badgeSuccess : styles.badgeWarning}`}>
                ตรวจพบ {excelStudents.length} คน
              </span>
            </div>

            {excelStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-sub)' }}>
                <Info size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <p>กรุณาเลือกไฟล์ Excel เพื่อแกะวิเคราะห์และแสดงผลลัพธ์พรีวิวก่อนบันทึก</p>
              </div>
            ) : (
              <div className={tableStyles.tableContainer} style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className={tableStyles.table}>
                  <thead className={tableStyles.thead}>
                    <tr>
                      <th className={tableStyles.th} style={{ padding: '10px' }}>รหัส</th>
                      <th className={tableStyles.th} style={{ padding: '10px' }}>ชื่อ - นามสกุล</th>
                      <th className={tableStyles.th} style={{ padding: '10px', width: '100px' }}>ห้องเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelStudents.map((item, idx) => (
                      <tr key={idx} className={tableStyles.tr}>
                        <td className={tableStyles.td} style={{ padding: '10px', fontSize: '0.85rem' }}>{item.studentId}</td>
                        <td className={tableStyles.td} style={{ padding: '10px', fontWeight: 600, fontSize: '0.85rem' }}>{item.firstName} {item.lastName}</td>
                        <td className={tableStyles.td} style={{ padding: '10px', fontSize: '0.85rem' }}>{item.classroom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className={tableStyles.modalOverlay}>
          <div className={`${tableStyles.modalCard} glass-card animate-scale-in`}>
            <div className={tableStyles.modalHeader}>
              <h3 className={tableStyles.modalTitle}>
                {modalMode === 'add' ? 'เพิ่มนักเรียนใหม่' : 'แก้ไขข้อมูลนักเรียน'}
              </h3>
              <button className={tableStyles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit}>
              {/* Student ID */}
              <div className={tableStyles.formGroup}>
                <label className={tableStyles.label}>รหัสนักเรียน (Student ID)</label>
                <input
                  type="text"
                  className={tableStyles.input}
                  placeholder="เช่น STD021"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  disabled={isSubmitting || modalMode === 'edit'} // Don't let edit student ID
                  required
                />
              </div>

              {/* Names */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className={tableStyles.formGroup} style={{ flex: 1 }}>
                  <label className={tableStyles.label}>ชื่อจริง (First Name)</label>
                  <input
                    type="text"
                    className={tableStyles.input}
                    placeholder="ภาษาไทย"
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className={tableStyles.formGroup} style={{ flex: 1 }}>
                  <label className={tableStyles.label}>นามสกุล (Last Name)</label>
                  <input
                    type="text"
                    className={tableStyles.input}
                    placeholder="ภาษาไทย"
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Classroom Selection */}
              <div className={tableStyles.formGroup}>
                <label className={tableStyles.label}>ห้องเรียน (Classroom)</label>
                {isCustomClassroom ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className={tableStyles.input}
                      placeholder="พิมพ์ชื่อห้องเรียน เช่น ม.6/1"
                      value={classroomInput}
                      onChange={(e) => setClassroomInput(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    {classrooms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomClassroom(false);
                          setClassroomInput(classrooms[0]);
                        }}
                        style={toggleBtnStyle}
                      >
                        เลือกจากห้องที่มี
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className={tableStyles.input}
                      value={classroomInput}
                      onChange={(e) => setClassroomInput(e.target.value)}
                      disabled={isSubmitting}
                      required
                      style={{ flex: 1 }}
                    >
                      {classrooms.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomClassroom(true);
                        setClassroomInput('');
                      }}
                      style={toggleBtnStyle}
                    >
                      พิมพ์ระบุเอง
                    </button>
                  </div>
                )}
              </div>

              <div className={tableStyles.formActions}>
                <button 
                  type="button" 
                  className={tableStyles.cancelBtn} 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className={tableStyles.saveBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
