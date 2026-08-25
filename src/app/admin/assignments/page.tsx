// src/app/admin/assignments/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from '../subjects/subjects.module.css'; // Reuse CSS module for table consistency

interface Assignment {
  id: string;
  subject_id: string;
  subject_name?: string;
  title: string;
  type: 'Quiz' | 'Assignment' | 'Homework' | 'Lab' | 'Project' | 'Midterm' | 'Final';
  category: 'assignment' | 'quiz' | 'behavior' | 'final';
  full_score: number;
  keep_score: number;
  due_date: string;
  classroom: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function AdminAssignmentsPage() {
  const { showToast, showConfirm } = useApp();
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add/Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState('');
  
  // Form states
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Assignment['type']>('Assignment');
  const [category, setCategory] = useState<Assignment['category']>('assignment');
  const [fullScore, setFullScore] = useState('10');
  const [keepScore, setKeepScore] = useState('5');
  const [dueDate, setDueDate] = useState('');
  const [classroom, setClassroom] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Load Assignments
      const asmRes = await fetch('/api/admin/assignments');
      if (asmRes.ok) {
        const data = await asmRes.json();
        if (data.success) {
          setAssignments(data.assignments);
        }
      }

      // 2. Load Subjects
      const subjRes = await fetch('/api/admin/subjects');
      if (subjRes.ok) {
        const data = await subjRes.json();
        if (data.success && data.subjects.length > 0) {
          setSubjects(data.subjects);
          setSubjectId(data.subjects[0].id);
        }
      }

      // 3. Load Classrooms
      const classRes = await fetch('/api/public/classrooms');
      if (classRes.ok) {
        const data = await classRes.json();
        if (data.success && data.classrooms.length > 0) {
          const names = data.classrooms.map((c: any) => c.name);
          setClassrooms(names);
          setClassroom(names[0]);
        }
      }
    } catch (error) {
      console.error('Load assignments data error:', error);
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบ', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Default to today's date in YYYY-MM-DD for due date
    setDueDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Filter assignments
  const filteredAssignments = assignments.filter(asm => {
    const matchesSearch = 
      asm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asm.subject_name && asm.subject_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClass = 
      classFilter === 'all' || 
      asm.classroom === classFilter;

    return matchesSearch && matchesClass;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter]);

  // Actions
  const openAddModal = () => {
    if (subjects.length === 0) {
      showToast('กรุณาสร้างรายวิชาก่อนมอบหมายงาน', 'warning');
      return;
    }
    if (classrooms.length === 0) {
      showToast('กรุณาสร้างห้องเรียนก่อนมอบหมายงาน', 'warning');
      return;
    }

    setModalMode('add');
    setSubjectId(subjects[0].id);
    setTitle('');
    setType('Assignment');
    setCategory('assignment');
    setFullScore('10');
    setKeepScore('10');
    setDueDate(new Date().toISOString().split('T')[0]);
    setClassroom(classrooms[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (asm: Assignment) => {
    setModalMode('edit');
    setEditingId(asm.id);
    setSubjectId(asm.subject_id);
    setTitle(asm.title);
    setType(asm.type);
    setCategory(asm.category || 'assignment');
    setFullScore(String(asm.full_score));
    setKeepScore(String(asm.keep_score));
    setDueDate(asm.due_date);
    setClassroom(asm.classroom);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId || !title.trim() || !type || !category || !fullScore || !dueDate || !classroom) {
      showToast('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง', 'warning');
      return;
    }

    if (Number(fullScore) <= 0) {
      showToast('คะแนนเต็มต้องมากกว่า 0', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        subject_id: subjectId,
        title: title.trim(),
        type,
        category,
        full_score: Number(fullScore),
        keep_score: Number(fullScore),
        due_date: dueDate,
        classroom
      };

      if (modalMode === 'add') {
        const res = await fetch('/api/admin/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'มอบหมายงานชิ้นใหม่สำเร็จ', 'success');
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(data.error || 'สร้างงานมอบหมายไม่สำเร็จ', 'danger');
        }
      } else {
        const res = await fetch(`/api/admin/assignments/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'แก้ไขงานมอบหมายสำเร็จ', 'success');
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(data.error || 'แก้ไขงานมอบหมายไม่สำเร็จ', 'danger');
        }
      }
    } catch (error) {
      console.error('Submit assignment error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = (asm: Assignment) => {
    showConfirm({
      title: 'ยืนยันการลบงานที่มอบหมาย',
      message: `คุณต้องการลบงาน "${asm.title}" หรือไม่? การลบจะทำลายข้อมูลประวัติการส่งงานและคะแนนของนักเรียนทุกคนในห้อง ${asm.classroom} ต่องานนี้ถาวร`,
      confirmText: 'ลบล้างงานนี้',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/assignments/${asm.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('ลบชิ้นงานและประวัติคะแนนเรียบร้อยแล้ว', 'success');
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

  const getTypeName = (t: Assignment['type']) => {
    const types: Record<Assignment['type'], string> = {
      Quiz: 'แบบทดสอบย่อย (Quiz)',
      Assignment: 'งานมอบหมาย (Assignment)',
      Homework: 'การบ้าน (Homework)',
      Lab: 'งานแล็บ (Lab)',
      Project: 'โครงงาน (Project)',
      Midterm: 'สอบกลางภาค (Midterm)',
      Final: 'สอบปลายภาค (Final)'
    };
    return types[t] || t;
  };

  const getCategoryName = (c: Assignment['category']) => {
    const cats: Record<Assignment['category'], string> = {
      assignment: 'งานมอบหมาย (30%)',
      quiz: 'แบบทดสอบ (20%)',
      behavior: 'จิตพิสัย (20%)',
      final: 'สอบปลายภาค (30%)'
    };
    return cats[c] || c;
  };

  return (
    <div className="animate-fade-in">
      {/* Search and filter bar */}
      <div className={styles.headerActions}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="ค้นหาตามชื่องาน หรือชื่อวิชา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className={styles.searchInput}
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

        <button className={styles.addBtn} onClick={openAddModal}>
          <Plus size={18} />
          <span>สร้างงานชิ้นใหม่</span>
        </button>
      </div>

      {/* Assignments Table */}
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
          <p className="text-muted">กำลังโหลดข้อมูลงานที่มอบหมาย...</p>
        </div>
      ) : paginatedAssignments.length === 0 ? (
        <div className={`${styles.tableContainer} ${styles.emptyState}`}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
          <h3>ไม่พบภาระงานที่มอบหมาย</h3>
          <p>กรุณาสร้างงานใหม่ หรือตรวจสอบตัวกรองการสืบค้น</p>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th} style={{ width: '60px' }}>ลำดับ</th>
                  <th className={styles.th}>รายวิชา</th>
                  <th className={styles.th}>ชื่องาน</th>
                  <th className={styles.th} style={{ width: '130px' }}>ประเภท</th>
                  <th className={styles.th} style={{ width: '140px' }}>หมวดหมู่คะแนน</th>
                  <th className={styles.th} style={{ width: '100px' }}>ห้องเรียน</th>
                  <th className={styles.th} style={{ width: '100px', textAlign: 'center' }}>คะแนนเต็มดิบ</th>
                  <th className={styles.th} style={{ width: '110px' }}>กำหนดส่ง</th>
                  <th className={styles.th} style={{ width: '110px', textAlign: 'center' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssignments.map((asm, index) => (
                  <tr key={asm.id} className={styles.tr}>
                    <td className={styles.td}>{startIndex + index + 1}</td>
                    <td className={styles.td} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {asm.subject_name}
                    </td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>{asm.title}</td>
                    <td className={styles.td} style={{ fontSize: '0.85rem' }}>{getTypeName(asm.type)}</td>
                    <td className={styles.td}>
                      <span className={styles.codeBadge} style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', fontWeight: 600 }}>
                        {getCategoryName(asm.category)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.codeBadge}>{asm.classroom}</span>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'center', fontWeight: 600 }}>
                      {asm.full_score}
                    </td>
                    <td className={styles.td} style={{ fontSize: '0.85rem' }}>
                      {new Date(asm.due_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actionsArea} style={{ justifyContent: 'center' }}>
                        <button 
                          className={`${styles.iconBtn} ${styles.editIconBtn}`} 
                          onClick={() => openEditModal(asm)}
                          title="แก้ไขงานมอบหมาย"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          className={`${styles.iconBtn} ${styles.deleteIconBtn}`} 
                          onClick={() => handleDeleteAssignment(asm)}
                          title="ลบงานมอบหมาย"
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
            <div className={styles.pagination}>
              <span>
                แสดงรายการที่ {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredAssignments.length)} จากทั้งหมด {filteredAssignments.length} รายการ
              </span>
              <div className={styles.paginationBtns}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  ย้อนกลับ
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`${styles.pageBtn} ${currentPage === page ? styles.activePageBtn : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} glass-card animate-scale-in`} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalMode === 'add' ? 'มอบหมายงานชิ้นใหม่' : 'แก้ไขข้อมูลงานมอบหมาย'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              {/* Subject Selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>รายวิชา (Subject)</label>
                <select
                  className={styles.input}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className={styles.formGroup}>
                <label className={styles.label}>ชื่องานที่มอบหมาย (Title)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="เช่น การบ้านเรื่องแคลคูลัส 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Type & Classroom */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>ประเภทงาน (Type)</label>
                  <select
                    className={styles.input}
                    value={type}
                    onChange={(e) => setType(e.target.value as Assignment['type'])}
                    disabled={isSubmitting}
                    required
                  >
                    <option value="Homework">การบ้าน (Homework)</option>
                    <option value="Assignment">งานมอบหมาย (Assignment)</option>
                    <option value="Quiz">แบบทดสอบย่อย (Quiz)</option>
                    <option value="Lab">การทดลอง (Lab)</option>
                    <option value="Project">โครงงาน (Project)</option>
                    <option value="Midterm">สอบกลางภาค (Midterm)</option>
                    <option value="Final">สอบปลายภาค (Final)</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>ห้องเรียนที่มอบหมาย (Classroom)</label>
                  <select
                    className={styles.input}
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    disabled={isSubmitting || modalMode === 'edit'} // Lock classroom on edit
                    required
                  >
                    {classrooms.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div className={styles.formGroup}>
                <label className={styles.label}>หมวดหมู่คะแนนสะสม (Category)</label>
                <select
                  className={styles.input}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Assignment['category'])}
                  disabled={isSubmitting}
                  required
                >
                  <option value="assignment">งานที่มอบหมาย (สัดส่วน 30 คะแนน)</option>
                  <option value="quiz">แบบทดสอบ (สัดส่วน 20 คะแนน)</option>
                  <option value="behavior">จิตพิสัย (สัดส่วน 20 คะแนน)</option>
                  <option value="final">สอบปลายภาค (สัดส่วน 30 คะแนน)</option>
                </select>
              </div>

              {/* Scores & Due Date */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>คะแนนเต็มดิบ (Full Score)</label>
                  <input
                    type="number"
                    className={styles.input}
                    min="1"
                    value={fullScore}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFullScore(val);
                      setKeepScore(val);
                    }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className={styles.formGroup} style={{ flex: 1, display: 'none' }}>
                  <label className={styles.label}>คะแนนเก็บจริง (Keep Score)</label>
                  <input
                    type="number"
                    className={styles.input}
                    min="1"
                    value={keepScore}
                    onChange={(e) => setKeepScore(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                        fontWeight: 500
                      }}
                      onClick={() => setKeepScore(fullScore)}
                    >
                      เท่ากับคะแนนดิบ
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--border)' }}>|</span>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                        fontWeight: 500
                      }}
                      onClick={() => {
                        const catWeights = {
                          assignment: '30',
                          quiz: '20',
                          behavior: '20',
                          final: '30'
                        };
                        setKeepScore(catWeights[category] || '10');
                      }}
                    >
                      ตามสัดส่วนหมวด ({category === 'assignment' || category === 'final' ? '30' : '20'} คะแนน)
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ flex: 1.2 }}>
                  <label className={styles.label}>กำหนดส่ง (Due Date)</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className={styles.saveBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'กำลังมอบหมาย...' : 'บันทึกชิ้นงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
