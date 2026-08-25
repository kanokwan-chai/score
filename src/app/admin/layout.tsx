// src/app/admin/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, BookOpen, School, Users, 
  FileSpreadsheet, ClipboardList, BarChart3, Settings, 
  LogOut, Menu, X, Sun, Moon, CheckSquare
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import styles from './admin.module.css';

interface UserInfo {
  first_name: string;
  last_name: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast, theme, toggleTheme } = useApp();
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUserInfo(data.user);
          if (data.user.role !== 'admin') {
            showToast('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'warning');
            router.push(data.user.role === 'student' ? '/student/dashboard' : '/login');
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
    fetchUser();
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
    { name: 'แดชบอร์ด', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'จัดการรายวิชา', path: '/admin/subjects', icon: <BookOpen size={20} /> },
    { name: 'ห้องเรียน & นักเรียน', path: '/admin/students', icon: <School size={20} /> },
    { name: 'เช็คชื่อเข้าเรียน', path: '/admin/attendance', icon: <CheckSquare size={20} /> },
    { name: 'มอบหมายงาน', path: '/admin/assignments', icon: <ClipboardList size={20} /> },
    { name: 'บันทึกคะแนน', path: '/admin/scores', icon: <FileSpreadsheet size={20} /> },
    { name: 'รายงานผล (Reports)', path: '/admin/reports', icon: <BarChart3 size={20} /> },
    { name: 'ตั้งค่าระบบ', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  const getPageTitle = () => {
    const activeMenu = menuItems.find(item => pathname.startsWith(item.path));
    return activeMenu ? activeMenu.name : 'ระบบอาจารย์';
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

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarActive : ''}`}>
        <Logo className={styles.logoContainer} size={36} />

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
            {userInfo && (
              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  {userInfo.first_name.charAt(0)}
                </div>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{userInfo.first_name} {userInfo.last_name}</span>
                  <span className={styles.userRole}>
                    {userInfo.role === 'admin' ? 'อาจารย์ผู้จัดการระบบ' : userInfo.role}
                  </span>
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
