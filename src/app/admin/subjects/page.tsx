// src/app/admin/subjects/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from './subjects.module.css';

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function AdminSubjectsPage() {
  const { showToast, showConfirm } = useApp();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Add/Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load subjects from API
  const loadSubjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/subjects');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubjects(data.subjects);
        } else {
          showToast(data.error || 'โหลดข้อมูลวิชาไม่สำเร็จ', 'danger');
        }
      } else {
        showToast('ไม่สามารถดึงข้อมูลรายวิชาจากเซิร์ฟเวอร์', 'danger');
      }
    } catch (error) {
      console.error('Fetch subjects error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  // Filter subjects based on search query (by code or name)
  const filteredSubjects = subjects.filter(
    s => s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
         s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubjects = filteredSubjects.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const openAddModal = () => {
    setModalMode('add');
    setSubjectCode('');
    setSubjectName('');
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setModalMode('edit');
    setEditingId(subject.id);
    setSubjectCode(subject.code);
    setSubjectName(subject.name);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectCode.trim() || !subjectName.trim()) {
      showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: subjectName, code: subjectCode })
        });
        const data = await res.json();
        if (data.success) {
          showToast('เพิ่มรายวิชาใหม่สำเร็จ', 'success');
          setIsModalOpen(false);
          loadSubjects();
        } else {
          showToast(data.error || 'เพิ่มรายวิชาไม่สำเร็จ', 'danger');
        }
      } else {
        const res = await fetch(`/api/admin/subjects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: subjectName, code: subjectCode })
        });
        const data = await res.json();
        if (data.success) {
          showToast('แก้ไขข้อมูลรายวิชาสำเร็จ', 'success');
          setIsModalOpen(false);
          loadSubjects();
        } else {
          showToast(data.error || 'แก้ไขข้อมูลวิชาไม่สำเร็จ', 'danger');
        }
      }
    } catch (error) {
      console.error('Modal submit error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = (subject: Subject) => {
    showConfirm({
      title: 'ยืนยันการลบรายวิชา',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบวิชา "${subject.name} (${subject.code})"? การลบวิชานี้จะส่งผลให้งานที่มอบหมายและคะแนนเก็บทั้งหมดของวิชานี้ถูกลบออกไปถาวร ไม่สามารถย้อนกลับได้`,
      confirmText: 'ลบข้อมูลรายวิชา',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/subjects/${subject.id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            showToast('ลบวิชาและข้อมูลเกี่ยวข้องเรียบร้อยแล้ว', 'success');
            loadSubjects();
          } else {
            showToast(data.error || 'ลบวิชาล้มเหลว', 'danger');
          }
        } catch (error) {
          console.error('Delete error:', error);
          showToast('เกิดข้อผิดพลาดในการสั่งลบข้อมูล', 'danger');
        }
      }
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Search and Action Header */}
      <div className={styles.headerActions}>
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาตามรหัสวิชา หรือชื่อวิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button className={styles.addBtn} onClick={openAddModal}>
          <Plus size={18} />
          <span>เพิ่มวิชาใหม่</span>
        </button>
      </div>

      {/* Subjects Data Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '35px',
            height: '35px',
            border: '4px solid rgba(79, 70, 229, 0.1)',
            borderRadius: '50%',
            borderTopColor: 'var(--primary)',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p className="text-muted">กำลังโหลดข้อมูลรายวิชา...</p>
        </div>
      ) : paginatedSubjects.length === 0 ? (
        <div className={`${styles.tableContainer} ${styles.emptyState}`}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
          <h3>ไม่พบวิชาในระบบ</h3>
          <p>กรุณาเพิ่มวิชาใหม่ หรือปรับเปลี่ยนคำค้นหา</p>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th} style={{ width: '80px' }}>ลำดับ</th>
                  <th className={styles.th} style={{ width: '180px' }}>รหัสวิชา</th>
                  <th className={styles.th}>ชื่อรายวิชา</th>
                  <th className={styles.th} style={{ width: '120px', textAlign: 'center' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubjects.map((subject, index) => (
                  <tr key={subject.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500 }}>
                      {startIndex + index + 1}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.codeBadge}>{subject.code}</span>
                    </td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>
                      {subject.name}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actionsArea} style={{ justifyContent: 'center' }}>
                        <button 
                          className={`${styles.iconBtn} ${styles.editIconBtn}`} 
                          onClick={() => openEditModal(subject)}
                          title="แก้ไขรายวิชา"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className={`${styles.iconBtn} ${styles.deleteIconBtn}`} 
                          onClick={() => handleDeleteSubject(subject)}
                          title="ลบรายวิชา"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span>
                แสดงรายการที่ {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredSubjects.length)} จากทั้งหมด {filteredSubjects.length} รายการ
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

      {/* Add / Edit Modal Overlay */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} glass-card animate-scale-in`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalMode === 'add' ? 'เพิ่มรายวิชาใหม่' : 'แก้ไขข้อมูลรายวิชา'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>รหัสวิชา (Subject Code)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="เช่น ค33201"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>ชื่อรายวิชา (Subject Name)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="เช่น คณิตศาสตร์เพิ่มเติม"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
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
