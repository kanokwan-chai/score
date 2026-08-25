// src/app/student/feedback/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, MessageSquare, Calendar, BookOpen, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from '../../admin/subjects/subjects.module.css'; // Shared styles

interface FeedbackItem {
  id: string;
  assignment_title: string;
  assignment_type: string;
  raw_score: number;
  full_score: number;
  feedback: string;
  graded_date: string;
  subject_name: string;
  subject_code: string;
}

export default function StudentFeedbackPage() {
  const { showToast } = useApp();
  
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeedbacks() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/student/scores');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Filter only items with feedback
            const itemsWithFeedback = data.scores.filter(
              (s: any) => s.feedback && s.feedback.trim() !== ''
            );
            
            setFeedbacks(itemsWithFeedback);
            
            // Extract unique subjects
            const uniqueSubj = Array.from(new Set(itemsWithFeedback.map((s: any) => `${s.subject_code} - ${s.subject_name}`))) as string[];
            setSubjects(uniqueSubj);
          }
        }
      } catch (error) {
        console.error('Load feedbacks error:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อเสนอแนะ', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadFeedbacks();
  }, [showToast]);

  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchesSearch = 
      fb.assignment_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.feedback.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSubject = 
      subjectFilter === 'all' || 
      `${fb.subject_code} - ${fb.subject_name}` === subjectFilter;

    return matchesSearch && matchesSubject;
  });

  return (
    <div className="animate-fade-in">
      {/* Search Filter Header */}
      <div className={styles.headerActions}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="ค้นหาข้อความ หรือชื่องาน..."
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

      {/* Feedbacks Grid Cards */}
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
          <p className="text-muted">กำลังโหลดข้อเสนอแนะจากอาจารย์...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '50px 20px' }}>
          <AlertCircle size={44} style={{ margin: '0 auto 16px', color: 'var(--text-sub)', opacity: 0.6 }} />
          <h3>ยังไม่มีข้อเสนอแนะ</h3>
          <p className="text-muted">คุณยังไม่มีชิ้นงานที่มีความคิดเห็นป้อนกลับจากอาจารย์ผู้จัดการระบบในขณะนี้</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredFeedbacks.map((fb) => (
            <div 
              key={fb.id} 
              className="glass-card animate-scale-in" 
              style={{ 
                padding: '24px', 
                borderLeft: '4px solid var(--primary-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Header: Subject & Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className={styles.codeBadge} style={{ fontSize: '0.8rem' }}>
                  {fb.subject_code} - {fb.subject_name}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                  <Calendar size={14} />
                  <span>ตรวจเมื่อ: {new Date(fb.graded_date).toLocaleDateString('th-TH')}</span>
                </div>
              </div>

              {/* Assignment Title & Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(79, 70, 229, 0.05)', paddingBottom: '10px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {fb.assignment_title}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                  <FileText size={15} className="text-muted" />
                  <span>คะแนนดิบ: <strong style={{ color: 'var(--primary)' }}>{fb.raw_score}</strong> / {fb.full_score}</span>
                </div>
              </div>

              {/* Feedback Content Box */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(79, 70, 229, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79, 70, 229, 0.05)' }}>
                <MessageSquare size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 600 }}>ความเห็นจากอาจารย์:</span>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5, fontWeight: 500 }}>
                    {fb.feedback}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
