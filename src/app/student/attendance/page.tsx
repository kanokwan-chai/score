// src/app/student/attendance/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, BookOpen, Clock, CheckCircle2, UserMinus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import tableStyles from '../../admin/subjects/subjects.module.css'; // Reuse tables

interface AttendanceLog {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave_business' | 'leave_sick';
  subject_id: string;
  subject_name: string;
  subject_code: string;
}

interface SummaryBySubject {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave_business: number;
  leave_sick: number;
}

export default function StudentAttendancePage() {
  const { showToast } = useApp();
  
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [summary, setSummary] = useState<SummaryBySubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/student/attendance');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLogs(data.logs);
            setSummary(data.summaryBySubject);
          }
        }
      } catch (error) {
        console.error('Load student attendance error:', error);
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูลเวลาเรียน', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadAttendance();
  }, [showToast]);

  const getStatusBadge = (status: AttendanceLog['status']) => {
    const badges: Record<AttendanceLog['status'], { text: string; style: React.CSSProperties }> = {
      present: { text: 'มาเรียน', style: { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' } },
      absent: { text: 'ขาดเรียน', style: { backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' } },
      late: { text: 'เข้าเรียนสาย', style: { backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' } },
      leave_business: { text: 'ลากิจ', style: { backgroundColor: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)' } },
      leave_sick: { text: 'ลาป่วย', style: { backgroundColor: 'rgba(6, 182, 212, 0.12)', color: 'var(--cyan)' } }
    };
    const b = badges[status] || { text: status, style: {} };
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '0.8rem',
        fontWeight: 600,
        ...b.style
      }}>
        {b.text}
      </span>
    );
  };

  // Overall Statistics calculated from logs
  const totalDays = logs.length;
  const presentDays = logs.filter(l => l.status === 'present').length;
  const lateDays = logs.filter(l => l.status === 'late').length;
  const leaveDays = logs.filter(l => l.status === 'leave_sick' || l.status === 'leave_business').length;
  const absentDays = logs.filter(l => l.status === 'absent').length;

  const attendanceRate = totalDays > 0 
    ? Math.round(((presentDays + lateDays + leaveDays) / totalDays) * 100)
    : 100;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Attendance Stats Cards Grid */}
      {totalDays > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Attendance Rate */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: 'rgba(79, 70, 229, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>อัตราการเข้าเรียนรวม</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>{attendanceRate}%</strong>
            </div>
          </div>

          {/* Present count */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>มาเรียนทั้งหมด</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--success)' }}>{presentDays} วัน</strong>
            </div>
          </div>

          {/* Late count */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>เข้าเรียนสาย</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--warning)' }}>{lateDays} วัน</strong>
            </div>
          </div>

          {/* Absent count */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserMinus size={24} />
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>ขาดเรียนสะสม</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--danger)' }}>{absentDays} วัน</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main layout: summary and history */}
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
          <p className="text-muted">กำลังดึงข้อมูลเวลาเรียนส่วนบุคคล...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '40px' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--text-sub)' }} />
          <h3>ไม่พบประวัติการเข้าเรียน</h3>
          <p className="text-muted">อาจารย์ผู้สอนยังไม่เริ่มบันทึกเวลาเรียนสำหรับวิชาที่คุณเรียนค่ะ</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* 1. Summary by subject */}
          <div className="glass-card" style={{ flex: 1, minWidth: '320px', padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
              <BookOpen size={18} color="var(--primary)" />
              <span>สรุปเวลาเรียนสะสมแยกรายวิชา</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {summary.map(sub => {
                const subRate = sub.total > 0 
                  ? Math.round(((sub.present + sub.late + sub.leave_business + sub.leave_sick) / sub.total) * 100)
                  : 100;
                  
                return (
                  <div key={sub.subject_id} style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(79, 70, 229, 0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{sub.subject_code} - {sub.subject_name}</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                          เช็คชื่อทั้งหมด {sub.total} คาบ | ขาด: {sub.absent} | สาย: {sub.late} | ลา: {sub.leave_business + sub.leave_sick}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: subRate >= 80 ? 'var(--success)' : 'var(--danger)' }}>
                        {subRate}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${subRate}%`,
                        height: '100%',
                        background: subRate >= 80 ? 'var(--success)' : 'var(--danger)',
                        borderRadius: '3px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Detailed History Logs list */}
          <div className="glass-card" style={{ flex: 1.5, minWidth: '320px', padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
              <Calendar size={18} color="var(--primary)" />
              <span>ประวัติการเช็คชื่อเข้าเรียนรายวัน</span>
            </h3>

            <div className={tableStyles.tableContainer} style={{ border: '1px solid #eee', borderRadius: '8px' }}>
              <table className={tableStyles.table}>
                <thead className={tableStyles.thead}>
                  <tr>
                    <th className={tableStyles.th} style={{ width: '100px' }}>วันที่</th>
                    <th className={tableStyles.th}>วิชาเรียน</th>
                    <th className={tableStyles.th} style={{ width: '120px', textAlign: 'center' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className={tableStyles.tr}>
                      <td className={tableStyles.td} style={{ fontSize: '0.85rem' }}>
                        {new Date(log.date).toLocaleDateString('th-TH')}
                      </td>
                      <td className={tableStyles.td}>
                        <span className={tableStyles.codeBadge}>{log.subject_code}</span>
                        <span style={{ marginLeft: '6px', fontSize: '0.85rem', fontWeight: 600 }}>{log.subject_name}</span>
                      </td>
                      <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                        {getStatusBadge(log.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
