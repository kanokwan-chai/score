// src/app/student/scores/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Info, Calendar, MessageSquare, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from '../../admin/subjects/subjects.module.css'; // Reuse table stylesheet

interface StudentScore {
  id: string;
  assignment_title: string;
  assignment_type: 'Quiz' | 'Assignment' | 'Homework' | 'Lab' | 'Project' | 'Midterm' | 'Final';
  category: 'assignment' | 'quiz' | 'behavior' | 'final';
  full_score: number;
  keep_score: number;
  due_date: string;
  raw_score: number; // -1 means ungraded
  calculated_score: number;
  feedback: string;
  graded_date: string;
  subject_name: string;
  subject_code: string;
}

export default function StudentScoresPage() {
  const { showToast } = useApp();
  
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load student scores
  const loadScores = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/student/scores');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScores(data.scores);
          
          // Extract unique subjects
          const uniqueSubj = Array.from(new Set(data.scores.map((s: StudentScore) => `${s.subject_code} - ${s.subject_name}`))) as string[];
          setSubjects(uniqueSubj);
          if (uniqueSubj.length > 0) {
            setSubjectFilter(uniqueSubj[0]);
          }
        }
      }
    } catch (error) {
      console.error('Load student scores error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดสมุดคะแนน', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  // Filter scores
  const filteredScores = scores.filter(score => {
    const matchesSearch = 
      score.assignment_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      score.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      score.subject_code.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSubject = 
      subjectFilter === 'all' || 
      `${score.subject_code} - ${score.subject_name}` === subjectFilter;

    return matchesSearch && matchesSubject;
  });

  // Calculate dynamic category-weighted summaries (matching backend formula)
  const getWeightedSummaries = () => {
    const categoryWeights = {
      assignment: 30,
      quiz: 20,
      behavior: 20,
      final: 30
    };

    let totalEarnedWeight = 0;
    let totalWeightMax = 0;

    const catData: Record<string, { earned: number; max: number; hasAssignments: boolean }> = {
      assignment: { earned: 0, max: 30, hasAssignments: false },
      quiz: { earned: 0, max: 20, hasAssignments: false },
      behavior: { earned: 0, max: 20, hasAssignments: false },
      final: { earned: 0, max: 30, hasAssignments: false }
    };

    (Object.keys(categoryWeights) as Array<keyof typeof categoryWeights>).forEach(catKey => {
      const catScores = filteredScores.filter(s => s.category === catKey);
      let catFullSum = 0;
      let catRawSum = 0;
      
      catScores.forEach(s => {
        if (s.raw_score !== -1) {
          catFullSum += s.full_score;
          catRawSum += s.raw_score;
        }
      });

      const weight = categoryWeights[catKey];
      const hasAssignments = catScores.length > 0;
      const earned = catFullSum > 0 ? (catRawSum / catFullSum) * weight : 0;

      catData[catKey] = {
        earned: Math.round(earned * 100) / 100,
        max: weight,
        hasAssignments
      };

      if (hasAssignments) {
        totalWeightMax += weight;
        totalEarnedWeight += earned;
      }
    });

    return {
      catData,
      totalEarnedWeight: Math.round(totalEarnedWeight * 100) / 100,
      totalWeightMax
    };
  };

  const { catData, totalEarnedWeight, totalWeightMax } = getWeightedSummaries();

  const getTypeName = (t: StudentScore['assignment_type']) => {
    const types: Record<StudentScore['assignment_type'], string> = {
      Quiz: 'แบบทดสอบ (Quiz)',
      Assignment: 'งานมอบหมาย (Assignment)',
      Homework: 'การบ้าน (Homework)',
      Lab: 'งานทดลอง (Lab)',
      Project: 'โครงงาน (Project)',
      Midterm: 'สอบกลางภาค (Midterm)',
      Final: 'สอบปลายภาค (Final)'
    };
    return types[t] || t;
  };

  return (
    <div className="animate-fade-in">
      {/* Filters Area */}
      <div className={styles.headerActions}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="ค้นหาตามชื่องาน หรือวิชาเรียน..."
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

      {/* Scores Table */}
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
          <p className="text-muted">กำลังดึงข้อมูลสมุดคะแนนสอบส่วนตัว...</p>
        </div>
      ) : subjectFilter === 'all' ? (
        <div className="glass-card text-center" style={{ padding: '40px 20px' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <h3>กรุณาเลือกรายวิชา</h3>
          <p className="text-muted">โปรดเลือกรายวิชาที่คุณต้องการตรวจสอบคะแนนจากเมนูด้านบน เพื่อดูรายงานแยกตามหมวดหมู่คะแนนสะสมค่ะ</p>
        </div>
      ) : filteredScores.length === 0 ? (
        <div className={`${styles.tableContainer} ${styles.emptyState}`}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
          <h3>ไม่พบข้อมูลคะแนน</h3>
          <p>ยังไม่มีรายการบันทึกคะแนนสะสมในวิชานี้</p>
        </div>
      ) : (
        <div>
          {/* ส่วนแสดงคะแนนสะสมรวมวิชานี้ถูกซ่อนตามความต้องการ */}
          <div className="glass-card" style={{ 
            padding: '20px', 
            marginBottom: '24px', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(79, 70, 229, 0.03) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '1.25rem' }}>
                สถานะการส่งงานวิชา: {subjectFilter}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                ตรวจสอบรายการงานที่คุณได้ส่งไปแล้ว หรือยังค้างส่งในวิชานี้
              </p>
            </div>
          </div>

          {/* ตารางแยก 4 หมวดหมู่ตามสัดส่วน */}
          {[
            { key: 'assignment', name: 'งานที่มอบหมาย (สัดส่วนน้ำหนัก 30%)', weight: 30, color: '#777777' },
            { key: 'quiz', name: 'แบบทดสอบ (สัดส่วนน้ำหนัก 20%)', weight: 20, color: '#4F46E5' },
            { key: 'behavior', name: 'จิตพิสัย (สัดส่วนน้ำหนัก 20%)', weight: 20, color: '#10B981' },
            { key: 'final', name: 'สอบปลายภาค (สัดส่วนน้ำหนัก 30%)', weight: 30, color: '#EF4444' }
          ].map(cat => {
            const catScores = filteredScores.filter(s => s.category === cat.key);
            const { earned, max } = catData[cat.key] || { earned: 0, max: cat.weight };

            return (
              <div key={cat.key} style={{ marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                {/* หัวข้อหมวดหมู่ */}
                <div style={{
                  background: cat.color,
                  color: '#fff',
                  padding: '14px 20px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={16} />
                    <span>{cat.name}</span>
                  </div>
                </div>

                {/* ตารางงานในหมวดหมู่ */}
                {catScores.length === 0 ? (
                  <div style={{ 
                    padding: '24px', 
                    textAlign: 'center', 
                    color: 'var(--text-sub)', 
                    background: 'var(--bg-card)', 
                    fontSize: '0.9rem',
                    fontStyle: 'italic'
                  }}>
                    ยังไม่มีรายการในหมวดหมู่นี้
                  </div>
                ) : (
                  <div className={styles.tableContainer} style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                    <table className={styles.table}>
                      <thead className={styles.thead}>
                        <tr>
                          <th className={styles.th} style={{ width: '60px' }}>ลำดับ</th>
                          <th className={styles.th}>ชื่องานที่มอบหมาย</th>
                          <th className={styles.th} style={{ width: '150px' }}>ประเภทงาน</th>
                          <th className={styles.th} style={{ width: '150px', textAlign: 'center' }}>สถานะการส่งงาน</th>
                          <th className={styles.th} style={{ width: '120px' }}>วันที่ส่งตรวจ</th>
                          <th className={styles.th}>ข้อสะท้อนกลับของอาจารย์ (Feedback)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catScores.map((score, index) => (
                          <tr key={score.id} className={styles.tr}>
                            <td className={styles.td}>{index + 1}</td>
                            <td className={styles.td} style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {score.assignment_title}
                            </td>
                            <td className={styles.td} style={{ fontSize: '0.85rem' }}>
                              {getTypeName(score.assignment_type)}
                            </td>
                            <td className={styles.td} style={{ textAlign: 'center' }}>
                              {score.raw_score === -1 ? (
                                <span style={{ color: 'var(--danger)', fontStyle: 'italic', fontSize: '0.85rem', fontWeight: 500 }}>
                                  ค้างส่ง/ยังไม่ตรวจ
                                </span>
                              ) : (
                                <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>
                                  ✓ ส่งแล้ว (ตรวจแล้ว)
                                </span>
                              )}
                            </td>
                            <td className={styles.td} style={{ fontSize: '0.85rem' }}>
                              {score.raw_score === -1 ? (
                                <span className="text-muted">-</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={13} className="text-muted" />
                                  <span>{new Date(score.graded_date).toLocaleDateString('th-TH')}</span>
                                </div>
                              )}
                            </td>
                            <td className={styles.td} style={{ fontSize: '0.85rem' }}>
                              {score.feedback ? (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                  <MessageSquare size={13} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                  <span style={{ fontWeight: 500 }}>{score.feedback}</span>
                                </div>
                              ) : (
                                <span className="text-muted" style={{ fontStyle: 'italic' }}>-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
