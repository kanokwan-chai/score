// src/app/admin/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  School, Users, BookOpen, ClipboardList, GraduationCap, 
  AlertTriangle, TrendingUp, PieChart as PieIcon, BarChart3,
  FileSpreadsheet, ClipboardCopy, Settings
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import styles from './dashboard.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface DashboardData {
  stats: {
    classroomsCount: number;
    studentsCount: number;
    subjectsCount: number;
    assignmentsCount: number;
    averageScorePercent: number;
    ungradedAssignmentsCount: number;
  };
  charts: {
    subjectAverages: { name: string; code: string; average: number }[];
    studentsPerClassroom: { classroom: string; count: number }[];
    assignmentTrends: { title: string; dueDate: string; average: number }[];
  };
}

export default function AdminDashboardPage() {
  const { showToast } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setData(result);
          } else {
            showToast(result.error || 'โหลดข้อมูลแดชบอร์ดล้มเหลว', 'danger');
          }
        } else {
          showToast('ไม่สามารถดึงข้อมูลแดชบอร์ดจากเซิร์ฟเวอร์', 'danger');
        }
      } catch (error) {
        console.error('Load dashboard error:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [showToast]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>กำลังประมวลผลสถิติและข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card text-center" style={{ padding: '40px' }}>
        <AlertTriangle size={48} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
        <h3>เกิดข้อผิดพลาดในการแสดงผล</h3>
        <p className="text-muted">ไม่สามารถโหลดข้อมูลที่ต้องการแสดงผลได้ กรุณาลองใหม่อีกครั้ง</p>
      </div>
    );
  }

  const { stats, charts } = data;

  // Chart 1: Bar Chart Data - Average Scores per Subject
  const barChartData = {
    labels: charts.subjectAverages.map(s => s.name),
    datasets: [
      {
        label: 'คะแนนเฉลี่ย (%)',
        data: charts.subjectAverages.map(s => s.average),
        backgroundColor: 'rgba(79, 70, 229, 0.65)',
        borderColor: 'var(--primary)',
        borderWidth: 1,
        borderRadius: 8,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` คะแนนเฉลี่ย: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(79, 70, 229, 0.05)' },
        ticks: { color: 'var(--text-sub)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-sub)' }
      }
    }
  };

  // Chart 2: Pie Chart Data - Students per Classroom
  const pieChartData = {
    labels: charts.studentsPerClassroom.map(c => c.classroom),
    datasets: [
      {
        data: charts.studentsPerClassroom.map(c => c.count),
        backgroundColor: [
          'rgba(79, 70, 229, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
        ],
        borderColor: 'var(--card-border)',
        borderWidth: 2,
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: 'var(--text-sub)', padding: 16 }
      }
    }
  };

  // Chart 3: Line Chart Data - Assignment Trend
  const lineChartData = {
    labels: charts.assignmentTrends.map(a => a.title),
    datasets: [
      {
        label: 'คะแนนเฉลี่ย (%) ของงานที่สั่ง',
        data: charts.assignmentTrends.map(a => a.average),
        borderColor: 'var(--primary)',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'var(--primary)',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` คะแนนเฉลี่ย: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(79, 70, 229, 0.05)' },
        ticks: { color: 'var(--text-sub)' }
      },
      x: {
        grid: { color: 'rgba(79, 70, 229, 0.05)' },
        ticks: { color: 'var(--text-sub)', maxRotation: 45, minRotation: 0 }
      }
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 1. Stats Grid */}
      <div className={styles.statsGrid}>
        {/* Classrooms */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
            <School size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>ห้องเรียนทั้งหมด</span>
            <span className={styles.statValue}>{stats.classroomsCount} ห้อง</span>
          </div>
        </div>

        {/* Students */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)' }}>
            <Users size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>นักเรียนทั้งหมด</span>
            <span className={styles.statValue}>{stats.studentsCount} คน</span>
          </div>
        </div>

        {/* Subjects */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
            <BookOpen size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>รายวิชาทั้งหมด</span>
            <span className={styles.statValue}>{stats.subjectsCount} วิชา</span>
          </div>
        </div>

        {/* Assignments */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' }}>
            <ClipboardList size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>ชิ้นงานที่มอบหมาย</span>
            <span className={styles.statValue}>{stats.assignmentsCount} งาน</span>
          </div>
        </div>

        {/* Avg Score */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}>
            <GraduationCap size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>คะแนนเฉลี่ยทั้งระบบ</span>
            <span className={styles.statValue}>{stats.averageScorePercent}%</span>
          </div>
        </div>

        {/* Ungraded */}
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconWrapper} style={{ 
            background: stats.ungradedAssignmentsCount > 0 
              ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
              : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
          }}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statTitle}>งานที่ค้างตรวจ</span>
            <span className={styles.statValue} style={{ color: stats.ungradedAssignmentsCount > 0 ? 'var(--warning)' : 'inherit' }}>
              {stats.ungradedAssignmentsCount} งาน
            </span>
          </div>
        </div>
      </div>

      {/* 2. Charts Layout Row 1 */}
      <div className={styles.chartsGridRow1}>
        {/* Bar Chart */}
        <div className={"glass-card " + styles.chartCard}>
          <h4 className={styles.chartTitle}>
            <BarChart3 size={18} color="var(--primary)" />
            <span>คะแนนเฉลี่ยร้อยละรายวิชา (Average Score per Subject)</span>
          </h4>
          <div className={styles.chartContainer}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Pie Chart */}
        <div className={"glass-card " + styles.chartCard}>
          <h4 className={styles.chartTitle}>
            <PieIcon size={18} color="var(--primary)" />
            <span>สัดส่วนนักเรียนแยกตามห้องเรียน (Students per Class)</span>
          </h4>
          <div className={styles.chartContainer}>
            <Pie data={pieChartData} options={pieChartOptions} />
          </div>
        </div>
      </div>

      {/* 3. Charts Layout Row 2 */}
      <div className={styles.chartsGridRow2}>
        {/* Line Chart */}
        <div className={"glass-card " + styles.chartCard}>
          <h4 className={styles.chartTitle}>
            <TrendingUp size={18} color="var(--primary)" />
            <span>แนวโน้มคะแนนเฉลี่ยผลการส่งงานล่าสุด (Last 10 Assignments Progress Trend)</span>
          </h4>
          <div className={styles.chartContainer}>
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* 4. Quick Actions */}
      <div className={styles.quickActionsSection}>
        <h3 className={styles.sectionTitle}>เมนูลัดของอาจารย์ (Quick Actions)</h3>
        <div className={styles.actionsGrid}>
          {/* Record score */}
          <Link href="/admin/scores" className={styles.actionButton}>
            <FileSpreadsheet size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>บันทึกคะแนนนักเรียน</span>
            <span className={styles.actionDesc}>กรอกคะแนนดิบ ข้อเสนอแนะ และคำนวณคะแนนเก็บ</span>
          </Link>

          {/* Add Student */}
          <Link href="/admin/students" className={styles.actionButton}>
            <Users size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>จัดการรายชื่อนักเรียน</span>
            <span className={styles.actionDesc}>เพิ่ม/แก้ไข หรือวางรายชื่อแบบคัดลอก-วาง (Bulk)</span>
          </Link>

          {/* Add Assignment */}
          <Link href="/admin/assignments" className={styles.actionButton}>
            <ClipboardCopy size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>มอบหมายงานชิ้นใหม่</span>
            <span className={styles.actionDesc}>สร้างการทดสอบ การบ้าน หรือหัวข้อโปรเจกต์งาน</span>
          </Link>

          {/* Settings */}
          <Link href="/admin/settings" className={styles.actionButton}>
            <Settings size={28} className={styles.actionIcon} />
            <span className={styles.actionText}>การตั้งค่าระบบ</span>
            <span className={styles.actionDesc}>แก้ไขข้อมูลโปรไฟล์ของตนเองและเปลี่ยนรหัสผ่าน</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
