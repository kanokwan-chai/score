// src/app/student/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, ClipboardList, CheckCircle2, AlertCircle, 
  User, Award, FileText, MessageSquare, KeyRound, Info 
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend
} from 'chart.js';
import styles from '../../admin/dashboard/dashboard.module.css'; // Reuse dashboard layout styles

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
);

interface StudentDashboardData {
  studentInfo: {
    first_name: string;
    last_name: string;
    student_id: string;
    classroom: string;
  };
  stats: {
    enrolledSubjectsCount: number;
    assignedTasksCount: number;
    submittedTasksCount: number;
    pendingTasksCount: number;
    attendanceRate: number;
  };
  charts: {
    subjectPerformance: { subjectName: string; submittedCount: number; totalCount: number }[];
  };
}

export default function StudentDashboardPage() {
  const { showToast } = useApp();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/student/dashboard');
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setData(result);
          } else {
            showToast(result.error || 'โหลดข้อมูลแดชบอร์ดล้มเหลว', 'danger');
          }
        }
      } catch (error) {
        console.error('Load student dashboard error:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [showToast]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>กำลังประมวลผลสรุปประวัติผลการเรียนส่วนตัว...</p>
      </div>
    );
  }

  if (!data || !data.studentInfo) {
    return (
      <div className="glass-card text-center" style={{ padding: '40px' }}>
        <AlertCircle size={48} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
        <h3>เกิดข้อผิดพลาดในการโหลดระบบ</h3>
        <p className="text-muted">ไม่สามารถดึงข้อมูลบัญชีนักเรียนได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>
      </div>
    );
  }

  const { studentInfo, stats, charts } = data;

  // Chart data: Comparing submitted count vs total count per subject
  const barChartData = {
    labels: charts.subjectPerformance.map(item => item.subjectName),
    datasets: [
      {
        label: 'จำนวนงานที่ส่งตรวจแล้ว',
        data: charts.subjectPerformance.map(item => item.submittedCount),
        backgroundColor: 'rgba(79, 70, 229, 0.75)',
        borderColor: 'var(--primary)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'จำนวนงานมอบหมายทั้งหมด',
        data: charts.subjectPerformance.map(item => item.totalCount),
        backgroundColor: 'rgba(156, 163, 175, 0.15)',
        borderColor: 'rgba(156, 163, 175, 0.3)',
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: 'var(--text-sub)' }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        min: 0,
        grid: { color: 'rgba(79, 70, 229, 0.04)' },
        ticks: { color: 'var(--text-sub)', stepSize: 1 }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-sub)' }
      }
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Welcome Card banner */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
        }}>
          <User size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            สวัสดีค่ะ, {studentInfo.first_name} {studentInfo.last_name}
          </h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            รหัสนักเรียน: <strong>{studentInfo.student_id}</strong> | ห้องเรียน: <strong>{studentInfo.classroom}</strong> | อัตราเข้าเรียนสะสม: <strong style={{ color: 'var(--primary)' }}>{stats.attendanceRate}%</strong>
          </p>
        </div>
      </div>

      {/* Stats Cards grid */}
      <div className={styles.statsGrid}>
        {/* Enrolled Subjects */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
            <BookOpen size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>วิชาเรียนที่เรียน</span>
            <span className={styles.statValue}>{stats.enrolledSubjectsCount} วิชา</span>
          </div>
        </div>

        {/* Assigned */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}>
            <ClipboardList size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>งานที่ได้รับทั้งหมด</span>
            <span className={styles.statValue}>{stats.assignedTasksCount} งาน</span>
          </div>
        </div>

        {/* Submitted */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>ตรวจ/ส่งสำเร็จแล้ว</span>
            <span className={styles.statValue} style={{ color: 'var(--success)' }}>{stats.submittedTasksCount} งาน</span>
          </div>
        </div>

        {/* Pending */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ 
            background: stats.pendingTasksCount > 0 
              ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
              : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
          }}>
            <AlertCircle size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>ยังค้างตรวจ/ค้างส่ง</span>
            <span className={styles.statValue} style={{ color: stats.pendingTasksCount > 0 ? 'var(--warning)' : 'inherit' }}>
              {stats.pendingTasksCount} งาน
            </span>
          </div>
        </div>
      </div>

      {/* Subject Performance comparison chart */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '30px' }}>
        <h4 className={styles.chartTitle}>
          <Award size={18} color="var(--primary)" />
          <span>สถิติจำนวนชิ้นงานส่งตรวจแยกตามรายวิชาของฉัน (My Assignments Status)</span>
        </h4>
        <div className={styles.chartContainer} style={{ minHeight: '350px' }}>
          {charts.subjectPerformance.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-sub)' }}>
              <Info size={32} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
              <p>ยังไม่มีรายงานคะแนนบันทึกในห้องเรียนนี้</p>
            </div>
          ) : (
            <Bar data={barChartData} options={barChartOptions} />
          )}
        </div>
      </div>

      {/* Quick Menu shortcuts */}
      <div className={styles.quickActionsSection}>
        <h3 className={styles.sectionTitle}>เมนูใช้งานด่วนของนักเรียน</h3>
        <div className={styles.actionsGrid}>
          {/* My subjects */}
          <Link href="/student/subjects" className={styles.actionButton}>
            <BookOpen size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>วิชาเรียนของฉัน</span>
            <span className={styles.actionDesc}>รายชื่อวิชาและข้อมูลรายละเอียดวิชาเรียน</span>
          </Link>

          {/* My Scores */}
          <Link href="/student/scores" className={styles.actionButton}>
            <FileText size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>ดูสมุดคะแนนสอบ</span>
            <span className={styles.actionDesc}>ตรวจสอบคะแนนสอบดิบและคะแนนเก็บคำนวณสะสม</span>
          </Link>

          {/* Feedback */}
          <Link href="/student/feedback" className={styles.actionButton}>
            <MessageSquare size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>ข้อคิดเห็นครูผู้สอน</span>
            <span className={styles.actionDesc}>อ่านข้อเสนอแนะและสะท้อนผลการเรียนของครู</span>
          </Link>

          {/* Profile change password */}
          <Link href="/student/profile" className={styles.actionButton}>
            <KeyRound size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>โปรไฟล์ & ความปลอดภัย</span>
            <span className={styles.actionDesc}>เปลี่ยนรหัสผ่านและตรวจสอบข้อมูลส่วนตัว</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
