// src/app/student/assignments/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Info, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from '../../admin/subjects/subjects.module.css';

interface AssignmentRow {
  id: string;
  assignment_title: string;
  assignment_type: 'Quiz' | 'Assignment' | 'Homework' | 'Lab' | 'Project' | 'Midterm' | 'Final';
  due_date: string;
  raw_score: number;
  subject_name: string;
  subject_code: string;
}

export default function StudentAssignmentsPage() {
  const { showToast } = useApp();

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAssignments() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/student/scores');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAssignments(data.scores);
            
            // Extract unique subjects
            const uniqueSubj = Array.from(new Set(data.scores.map((s: any) => `${s.subject_code} - ${s.subject_name}`))) as string[];
            setSubjects(uniqueSubj);
          }
        }
      } catch (error) {
        console.error('Load student assignments error:', error);
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูลงานที่มอบหมาย', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadAssignments();
  }, [showToast]);

  const filteredAssignments = assignments.filter(asm => {
    const matchesSearch = 
      asm.assignment_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asm.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asm.subject_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = 
      subjectFilter === 'all' || 
      `${asm.subject_code} - ${asm.subject_name}` === subjectFilter;

    return matchesSearch && matchesSubject;
  });

  const getTypeName = (t: AssignmentRow['assignment_type']) => {
    const types: Record<AssignmentRow['assignment_type'], string> = {
      Quiz: 'แบบทดสอบ (Quiz)',
      Assignment: 'งานมอบหมาย (Assignment)',
      Homework: 'การบ้าน (Homework)',
      Lab: 'งานแล็บ (Lab)',
      Project: 'โครงงาน (Project)',
      Midterm: 'สอบกลางภาค (Midterm)',
      Final: 'สอบปลายภาค (Final)'
    };
    return types[t] || t;
  };

  const isOverdue = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  return (
    <div className="animate-fade-in">
      {/* Search Header */}
      <div className={styles.headerActions}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="ค้นหาตามชื่องาน หรือรายวิชา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className={styles.searchInput}
            style={{ maxWidth: '200px', paddingLeft: '14px', cursor: 'pointer' }}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">รายวิชาทั้งหมด</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
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
          <p className="text-muted">กำลังดึงข้อมูลรายการงานมอบหมาย...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className={`${styles.tableContainer} ${styles.emptyState}`}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
          <h3>ไม่พบภาระงานมอบหมาย</h3>
          <p>ไม่มีงานที่มอบหมายตรงกับคำค้นหาในเงื่อนไขนี้</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th} style={{ width: '60px' }}>ลำดับ</th>
                <th className={styles.th}>รายวิชา</th>
                <th className={styles.th}>หัวข้อชิ้นงาน</th>
                <th className={styles.th} style={{ width: '150px' }}>ประเภท</th>
                <th className={styles.th} style={{ width: '130px' }}>กำหนดส่ง</th>
                <th className={styles.th} style={{ width: '150px', textAlign: 'center' }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((asm, index) => {
                const submitted = asm.raw_score !== -1;
                const overdue = isOverdue(asm.due_date);
                
                return (
                  <tr key={asm.id} className={styles.tr}>
                    <td className={styles.td}>{index + 1}</td>
                    <td className={styles.td} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span className={styles.codeBadge}>{asm.subject_code}</span> {asm.subject_name}
                    </td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>{asm.assignment_title}</td>
                    <td className={styles.td} style={{ fontSize: '0.85rem' }}>{getTypeName(asm.assignment_type)}</td>
                    <td className={styles.td} style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} className="text-muted" />
                        <span>{new Date(asm.due_date).toLocaleDateString('th-TH')}</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {submitted ? (
                          <span style={{ 
                            background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)',
                            padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', 
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' 
                          }}>
                            <CheckCircle size={12} />
                            <span>ส่งตรวจแล้ว</span>
                          </span>
                        ) : overdue ? (
                          <span style={{ 
                            background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)',
                            padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', 
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' 
                          }}>
                            <Clock size={12} />
                            <span>ค้างส่ง (เกินกำหนด)</span>
                          </span>
                        ) : (
                          <span style={{ 
                            background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)',
                            padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', 
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' 
                          }}>
                            <Clock size={12} />
                            <span>รอดำเนินการส่ง</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
