// src/app/admin/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, Save, KeyRound } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import loginStyles from '../../login/login.module.css'; // Reuse login form styles for visual consistency

export default function AdminSettingsPage() {
  const { showToast } = useApp();

  // Profile Form States
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load current admin settings info
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUsername(data.admin.username);
            setFirstName(data.admin.first_name);
            setLastName(data.admin.last_name);
          }
        }
      } catch (error) {
        console.error('Load settings error:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดโปรไฟล์', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [showToast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      showToast('กรุณากรอกชื่อและนามสกุล', 'warning');
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'บันทึกประวัติตัวตนใหม่สำเร็จ', 'success');
        // Refresh page layout user details
        window.location.reload();
      } else {
        showToast(data.error || 'บันทึกข้อมูลล้มเหลว', 'danger');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast('กรุณากรอกรหัสผ่านให้ครบถ้วนทุกช่อง', 'warning');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast('รหัสผ่านใหม่และการยืนยันรหัสผ่านใหม่ไม่ตรงกัน', 'danger');
      return;
    }

    if (newPassword.length < 6) {
      showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'เปลี่ยนรหัสผ่านบัญชีเรียบร้อยแล้ว', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        showToast(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'danger');
      }
    } catch (error) {
      console.error('Change password error:', error);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
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
        <p className="text-muted">กำลังดึงข้อมูลบัญชีผู้ใช้...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Profile Form Card */}
      <div className="glass-card" style={{ flex: 1, minWidth: '320px', padding: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
          <User size={20} color="var(--primary)" />
          <span>ข้อมูลโปรไฟล์ส่วนตัว</span>
        </h3>

        <form onSubmit={handleUpdateProfile}>
          <div className={loginStyles.formGroup}>
            <label className={loginStyles.label}>ชื่อผู้ใช้งานระบบ (Username)</label>
            <div className={loginStyles.inputWrapper}>
              <User size={18} className={loginStyles.inputIcon} />
              <input
                type="text"
                className={loginStyles.input}
                value={username}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className={loginStyles.formGroup} style={{ flex: 1, minWidth: '140px' }}>
              <label className={loginStyles.label}>ชื่อจริง</label>
              <input
                type="text"
                className={loginStyles.input}
                style={{ paddingLeft: '16px' }}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isUpdatingProfile}
                required
              />
            </div>

            <div className={loginStyles.formGroup} style={{ flex: 1, minWidth: '140px' }}>
              <label className={loginStyles.label}>นามสกุล</label>
              <input
                type="text"
                className={loginStyles.input}
                style={{ paddingLeft: '16px' }}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isUpdatingProfile}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={loginStyles.submitBtn}
            disabled={isUpdatingProfile}
            style={{ width: '100%', marginTop: '10px' }}
          >
            <Save size={18} />
            <span>{isUpdatingProfile ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลโปรไฟล์'}</span>
          </button>
        </form>
      </div>

      {/* Change Password Form Card */}
      <div className="glass-card" style={{ flex: 1, minWidth: '320px', padding: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
          <KeyRound size={20} color="var(--primary)" />
          <span>เปลี่ยนรหัสผ่านความปลอดภัย</span>
        </h3>

        <form onSubmit={handleChangePassword}>
          <div className={loginStyles.formGroup}>
            <label className={loginStyles.label}>รหัสผ่านปัจจุบัน (Current Password)</label>
            <div className={loginStyles.inputWrapper}>
              <Lock size={18} className={loginStyles.inputIcon} />
              <input
                type="password"
                className={loginStyles.input}
                placeholder="กรอกรหัสผ่านที่ใช้งานในขณะนี้"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isChangingPassword}
                required
              />
            </div>
          </div>

          <div className={loginStyles.formGroup}>
            <label className={loginStyles.label}>รหัสผ่านใหม่ (New Password)</label>
            <div className={loginStyles.inputWrapper}>
              <Lock size={18} className={loginStyles.inputIcon} />
              <input
                type="password"
                className={loginStyles.input}
                placeholder="กรอกรหัสผ่านใหม่ 6 ตัวอักษรขึ้นไป"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isChangingPassword}
                required
              />
            </div>
          </div>

          <div className={loginStyles.formGroup}>
            <label className={loginStyles.label}>ยืนยันรหัสผ่านใหม่ (Confirm Password)</label>
            <div className={loginStyles.inputWrapper}>
              <Lock size={18} className={loginStyles.inputIcon} />
              <input
                type="password"
                className={loginStyles.input}
                placeholder="ป้อนรหัสผ่านใหม่อีกครั้งเพื่อยืนยัน"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={isChangingPassword}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={loginStyles.submitBtn}
            disabled={isChangingPassword}
            style={{ width: '100%', marginTop: '10px', background: 'var(--primary-light)' }}
          >
            <KeyRound size={18} />
            <span>{isChangingPassword ? 'กำลังดำเนินการ...' : 'อัปเดตรหัสผ่านใหม่'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
