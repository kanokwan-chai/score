// src/app/student/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  GraduationCap, LayoutDashboard, BookOpen, FileSpreadsheet, 
  ClipboardList, MessageSquare, UserCheck, LogOut, Menu, X, Sun, Moon, Calendar
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import styles from '../admin/admin.module.css'; // Reuse CSS from Admin layout for visual consistency

interface StudentInfo {
  first_name: string;
  last_name: string;
  student_id: string;
  classroom: string;
  role: string;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast, theme, toggleTheme } = useApp();
  
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchStudent = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setStudentInfo(data.user);
          if (data.user.role !== 'student') {
            showToast('บัญชีนี้ไม่ใช่บัญชีนักเรียน', 'warning');
            router.push(data.user.role === 'admin' ? '/admin/dashboard' : '/login');
          }
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Fetch me error:', error);
      router.push('/login');
    }
  };

  useEffect(() => {
    fetchStudent();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('ออกจากระบบสำเร็จ', 'success');
        router.push('/login');
      } else {
        showToast('เกิดข้อผิดพลาดในการออกจากระบบ', 'danger');
      }
    } catch (error) {
      console.error('Logout error:', error);
      showToast('เกิดข้อผิดพลาดในการออกจากระบบ', 'danger');
    }
  };

  const menuItems = [
    { name: 'แดชบอร์ดหลัก', path: '/student/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'วิชาเรียนของฉัน', path: '/student/subjects', icon: <BookOpen size={20} /> },
    { name: 'ประวัติเข้าเรียน', path: '/student/attendance', icon: <Calendar size={20} /> },
    { name: 'งานและคะแนนเก็บ', path: '/student/scores', icon: <FileSpreadsheet size={20} /> },
  ];

  const getPageTitle = () => {
    const activeMenu = menuItems.find(item => pathname.startsWith(item.path));
    return activeMenu ? activeMenu.name : 'ระบบนักเรียน';
  };

  return (
    <div className={`${styles.layoutContainer} ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {/* Background blobs for Glassmorphism effect */}
      <div 
        style={{
          position: 'absolute',
          top: '-10%',
          right: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)',
          filter: 'blur(60px)',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />

      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarActive : ''}`}>
        <Logo className={styles.logoContainer} size={36} title="Student Portal" subtitle="ระบบบริหารการเรียนรู้" />

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ul className={styles.menuList}>
            {menuItems.map(item => {
              const isActive = pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link 
                    href={item.path} 
                    className={`${styles.menuItemLink} ${isActive ? styles.activeMenuLink : ''}`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <span>© 2026. Antigravity.</span>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`${styles.drawerOverlay} ${isSidebarOpen ? styles.showDrawer : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.menuToggleBtn}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
            <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          </div>

          <div className={styles.headerRight}>
            {/* Theme Switcher */}
            <button 
              className={styles.themeToggle} 
              onClick={toggleTheme}
              title="สลับโหมดสี"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Profile widget */}
            {studentInfo && (
              <div className={styles.userInfo}>
                <div className={styles.userAvatar} style={{ background: 'var(--primary-light)' }}>
                  {studentInfo.first_name.charAt(0)}
                </div>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{studentInfo.first_name} {studentInfo.last_name}</span>
                  <span className={styles.userRole}>{studentInfo.role} | {studentInfo.classroom}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className={styles.contentBody}>
          {children}
        </main>
      </div>
    </div>
  );
}
