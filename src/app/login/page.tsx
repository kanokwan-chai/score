// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, LogIn, Sun, Moon, AlertCircle } from 'lucide-react';
import { LogoIcon } from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { showToast, theme, toggleTheme } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      const data = await res.json();

      if (data.success) {
        showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับค่ะ', 'success');
        
        // Redirect based on role
        if (data.user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
        router.refresh();
      } else {
        showToast(data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง', 'danger');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authWrapper}>
      {/* Background blobs for Glassmorphism effect */}
      <div className={`${styles.bgBlob} ${styles.blob1}`}></div>
      <div className={`${styles.bgBlob} ${styles.blob2}`}></div>

      {/* Dark/Light mode toggle */}
      <button 
        onClick={toggleTheme} 
        className={styles.themeToggleBtn}
        title="สลับโหมดสี"
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {/* Main Login Card */}
      <div className={`${styles.authCard} glass-card animate-scale-in`}>
        <div className={styles.logoArea} style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <LogoIcon size={72} />
        </div>
        <h2 className={styles.title}>Student Progress Tracker</h2>
        <p className={styles.subtitle}>ระบบติดตามผลการเรียนรู้ของนักเรียน</p>

        {/* Role Selector Tabs */}
        <div className={styles.roleTabs}>
          <button
            type="button"
            className={`${styles.roleTab} ${role === 'student' ? styles.activeTab : ''}`}
            onClick={() => setRole('student')}
          >
            นักเรียน (Student)
          </button>
          <button
            type="button"
            className={`${styles.roleTab} ${role === 'admin' ? styles.activeTab : ''}`}
            onClick={() => setRole('admin')}
          >
            อาจารย์ (Admin)
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {role === 'student' ? 'รหัสนักเรียน (Username)' : 'ชื่อผู้ใช้งาน (Admin Username)'}
            </label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder={role === 'student' ? 'กรอกรหัสนักเรียน เช่น STD001' : 'กรอกชื่อผู้ใช้งานอาจารย์'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>รหัสผ่าน (Password)</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                type="password"
                className={styles.input}
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : (
              <>
                <span>เข้าสู่ระบบ</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        {/* Instructional text for Students */}
        {role === 'student' && (
          <div className={styles.footer} style={{ color: 'var(--text-sub)' }}>
            <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            <span>
              สำหรับการเข้าใช้งานครั้งแรก ให้ใช้ <strong style={{ color: 'var(--primary)' }}>รหัสนักเรียน</strong> เป็นรหัสผ่านเริ่มต้น
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
