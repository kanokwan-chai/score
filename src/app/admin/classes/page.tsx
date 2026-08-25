// src/app/admin/classes/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from '../subjects/subjects.module.css'; // Reuse CSS file for visual consistency

interface Classroom {
  id: string;
  name: string;
}

export default function AdminClassroomsPage() {
  const { showToast, showConfirm } = useApp();
  
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Add/Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load classrooms from API
  const loadClassrooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/classrooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setClassrooms(data.classrooms);
        } else {
          showToast(data.error || 'โหลดข้อมูลห้องเรียนไม่สำเร็จ', 'danger');
        }
      } else {
        showToast('ไม่สามารถดึงข้อมูลห้องเรียนจากเซิร์ฟเวอร์', 'danger');
      }
    } catch (error) {
      console.error('Fetch classrooms error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลห้องเรียน', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  // Filter classrooms based on search query
  const filteredClassrooms = classrooms.filter(
    c => c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredClassrooms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClassrooms = filteredClassrooms.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const openAddModal = () => {
    setModalMode('add');
    setClassroomName('');
    setIsModalOpen(true);
  };

  const openEditModal = (cls: Classroom) => {
    setModalMode('edit');
    setEditingId(cls.id);
    setClassroomName(cls.name);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!classroomName.trim()) {
      showToast('กรุณากรอกชื่อห้องเรียน', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/classrooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: classroomName })
        });
        const data = await res.json();
        if (data.success) {
          showToast('เพิ่มห้องเรียนสำเร็จ', 'success');
          setIsModalOpen(false);
          loadClassrooms();
        } else {
          showToast(data.error || 'เพิ่มห้องเรียนไม่สำเร็จ', 'danger');
        }
      } else {
        const res = await fetch(`/api/admin/classrooms/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: classroomName })
        });
        const data = await res.json();
        if (data.success) {
          showToast('แก้ไขข้อมูลห้องเรียนสำเร็จ', 'success');
          setIsModalOpen(false);
          loadClassrooms();
        } else {
          showToast(data.error || 'แก้ไขข้อมูลห้องเรียนไม่สำเร็จ', 'danger');
        }
      }
    } catch (error) {
      console.error('Modal submit error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClassroom = (cls: Classroom) => {
    showConfirm({
      title: 'ยืนยันการลบห้องเรียน',
      message: `คุณต้องการลบห้องเรียน "${cls.name}" หรือไม่? การลบนี้จะส่งผลให้นักเรียนในห้องนี้ทั้งหมดมีสถานะว่างห้องเรียน และงานที่มอบหมายของห้องเรียนนี้พร้อมคะแนนจะถูกลบถาวร`,
      confirmText: 'ลบห้องเรียน',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/classrooms/${cls.id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            showToast('ลบห้องเรียนและปรับปรุงข้อมูลนักเรียนเรียบร้อยแล้ว', 'success');
            loadClassrooms();
          } else {
            showToast(data.error || 'ลบห้องเรียนล้มเหลว', 'danger');
          }
        } catch (error) {
          console.error('Delete error:', error);
          showToast('เกิดข้อผิดพลาดในการสั่งลบห้องเรียน', 'danger');
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
            placeholder="ค้นหาห้องเรียน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button className={styles.addBtn} onClick={openAddModal}>
          <Plus size={18} />
          <span>เพิ่มห้องเรียนใหม่</span>
        </button>
      </div>

      {/* Classrooms Data Table */}
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
          <p className="text-muted">กำลังโหลดข้อมูลห้องเรียน...</p>
        </div>
      ) : paginatedClassrooms.length === 0 ? (
        <div className={`${styles.tableContainer} ${styles.emptyState}`}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
          <h3>ไม่พบห้องเรียนในระบบ</h3>
          <p>กรุณาเพิ่มห้องเรียนใหม่ หรือปรับเปลี่ยนคำค้นหา</p>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer} style={{ maxWidth: '600px', margin: '0 auto 20px' }}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th} style={{ width: '80px' }}>ลำดับ</th>
                  <th className={styles.th}>ชื่อห้องเรียน</th>
                  <th className={styles.th} style={{ width: '120px', textAlign: 'center' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClassrooms.map((cls, index) => (
                  <tr key={cls.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500 }}>
                      {startIndex + index + 1}
                    </td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>
                      <span className={styles.codeBadge}>{cls.name}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actionsArea} style={{ justifyContent: 'center' }}>
                        <button 
                          className={`${styles.iconBtn} ${styles.editIconBtn}`} 
                          onClick={() => openEditModal(cls)}
                          title="แก้ไขห้องเรียน"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className={`${styles.iconBtn} ${styles.deleteIconBtn}`} 
                          onClick={() => handleDeleteClassroom(cls)}
                          title="ลบห้องเรียน"
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
            <div className={styles.pagination} style={{ maxWidth: '600px', margin: '0 auto' }}>
              <span>
                แสดงรายการที่ {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredClassrooms.length)} จากทั้งหมด {filteredClassrooms.length} รายการ
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
                {modalMode === 'add' ? 'เพิ่มห้องเรียนใหม่' : 'แก้ไขชื่อห้องเรียน'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>ชื่อห้องเรียน (Classroom Name)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="เช่น ม.6/1"
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
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
