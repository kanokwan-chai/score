// src/app/student/subjects/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, BookMarked, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from '../../admin/subjects/subjects.module.css';

interface SubjectGroup {
  subject_code: string;
  subject_name: string;
  assignments_count: number;
  graded_count: number;
}

export default function StudentSubjectsPage() {
  const { showToast } = useApp();
  const [subjectsList, setSubjectsList] = useState<SubjectGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSubjectsData() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/student/scores');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.scores) {
            // Group scores by subject to count assignments
            const groups: Record<string, {
              code: string;
              name: string;
              totalAsms: number;
              graded: number;
            }> = {};

            data.scores.forEach((score: any) => {
              const key = score.subject_code;
              if (!groups[key]) {
                groups[key] = {
                  code: score.subject_code,
                  name: score.subject_name,
                  totalAsms: 0,
                  graded: 0
                };
              }
              
              groups[key].totalAsms += 1;
              if (score.raw_score !== -1) {
                groups[key].graded += 1;
              }
            });

            const result: SubjectGroup[] = Object.values(groups).map(g => ({
              subject_code: g.code,
              subject_name: g.name,
              assignments_count: g.totalAsms,
              graded_count: g.graded
            }));

            setSubjectsList(result);
          }
        }
      } catch (error) {
        console.error('Load student subjects error:', error);
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadSubjectsData();
  }, [showToast]);

  const filteredSubjects = subjectsList.filter(
    s => s.subject_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Search Header */}
      <div className={styles.headerActions}>
        <div className={styles.searchBar} style={{ maxWidth: '300px' }}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาตามรหัส หรือชื่อวิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Subjects Grid */}
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
          <p className="text-muted">กำลังโหลดข้อมูลรายวิชาเรียน...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '40px' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
          <h3>ไม่พบข้อมูลรายวิชา</h3>
          <p className="text-muted">คุณยังไม่มีรายวิชาที่มีภาระงานในห้องเรียนนี้</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredSubjects.map(sub => {
            const progressPercent = sub.assignments_count > 0 
              ? Math.round((sub.graded_count / sub.assignments_count) * 100) 
              : 0;

            return (
              <div 
                key={sub.subject_code} 
                className="glass-card animate-scale-in" 
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className={styles.codeBadge}>{sub.subject_code}</span>
                  <BookMarked size={22} color="var(--primary)" />
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {sub.subject_name}
                  </h3>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                    วิชาเรียนที่ลงทะเบียนในชั้นเรียน
                  </p>
                </div>

                {/* Progress bar of task completion */}
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span className="text-muted">ความคืบหน้าการส่งงาน</span>
                    <span style={{ color: 'var(--primary)' }}>
                      {sub.graded_count} / {sub.assignments_count} งาน ({progressPercent}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${progressPercent}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)', 
                        borderRadius: '4px' 
                      }} 
                    />
                  </div>
                </div>

                {/* Status indicators */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', borderTop: '1px solid rgba(79, 70, 229, 0.04)', paddingTop: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
                    <CheckCircle2 size={14} />
                    <span>ตรวจแล้ว {sub.graded_count}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: sub.assignments_count - sub.graded_count > 0 ? 'var(--warning)' : 'var(--text-sub)' }}>
                    <Clock size={14} />
                    <span>ค้างส่ง {sub.assignments_count - sub.graded_count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
