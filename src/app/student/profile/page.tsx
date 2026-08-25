// src/app/student/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, KeyRound, Save, Calendar, Home, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import loginStyles from '../../login/login.module.css'; // Reuse form styles

interface StudentProfile {
  student_id: string;
  first_name: string;
  last_name: string;
  classroom: string;
  status: string;
  created_at: string;
}

export default function StudentProfilePage() {
  const { showToast } = useApp();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  
  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load student profile data on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/student/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setProfile(data.student);
          }
        }
      } catch (error) {
        console.error('Load profile error:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดโปรไฟล์', 'danger');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [showToast]);

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
      const res = await fetch('/api/student/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'เปลี่ยนรหัสผ่านสำเร็จแล้ว', 'success');
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
        <p className="text-muted">กำลังดึงข้อมูลบัญชีนักเรียน...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Student Profile Info Card (Read only) */}
      {profile && (
        <div className="glass-card" style={{ flex: 1, minWidth: '320px', padding: '30px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-main)' }}>
            <User size={20} color="var(--primary)" />
            <span>ประวัติส่วนตัวของนักเรียน</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Student ID */}
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>รหัสนักเรียน:</span>
              <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>{profile.student_id}</strong>
            </div>

            {/* Name */}
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>ชื่อ - นามสกุล:</span>
              <span style={detailValueStyle}>{profile.first_name} {profile.last_name}</span>
            </div>

            {/* Classroom */}
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>ห้องเรียน:</span>
              <span style={{ ...detailValueStyle, textTransform: 'uppercase' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(79, 70, 229, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, color: 'var(--primary)' }}>
                  <Home size={12} />
                  <span>{profile.classroom}</span>
                </span>
              </span>
            </div>

            {/* Account Status */}
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>สถานะผู้ใช้งาน:</span>
              <span style={{ ...detailValueStyle, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: 600 }}>
                <CheckCircle2 size={14} />
                <span>เปิดการใช้งานเรียบร้อย</span>
              </span>
            </div>

            {/* Registered date */}
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>วันที่เปิดใช้ระบบ:</span>
              <span style={{ ...detailValueStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} className="text-muted" />
                <span>{new Date(profile.created_at).toLocaleDateString('th-TH')}</span>
              </span>
            </div>
          </div>

          <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(79, 70, 229, 0.03)', border: '1px dashed rgba(79, 70, 229, 0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>* ข้อมูลจำกัดสิทธิ์ความปลอดภัย:</span>
            นักเรียนไม่มีสิทธิ์แก้ไขข้อมูลประจำตัวของตนเอง (รหัสผู้ใช้ ชื่อ นามสกุล และห้องเรียน) หากข้อมูลใดไม่ถูกต้อง กรุณาติดต่ออาจารย์ผู้สอนเพื่อดำเนินการแก้ไข
          </div>
        </div>
      )}

      {/* Change Password Form Card */}
      <div className="glass-card" style={{ flex: 1, minWidth: '320px', padding: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
          <KeyRound size={20} color="var(--primary)" />
          <span>เปลี่ยนรหัสผ่านเข้าสู่ระบบ</span>
        </h3>

        <form onSubmit={handleChangePassword}>
          <div className={loginStyles.formGroup}>
            <label className={loginStyles.label}>รหัสผ่านปัจจุบัน (Current Password)</label>
            <div className={loginStyles.inputWrapper}>
              <Lock size={18} className={loginStyles.inputIcon} />
              <input
                type="password"
                className={loginStyles.input}
                placeholder="กรอกรหัสผ่านเดิมปัจจุบัน"
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
                placeholder="กรอกรหัสผ่านใหม่ 6 ตัวขึ้นไป"
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
                placeholder="กรอกรหัสผ่านใหม่อีกครั้งเพื่อยืนยัน"
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
            style={{ width: '100%', marginTop: '10px' }}
          >
            <KeyRound size={18} />
            <span>{isChangingPassword ? 'กำลังดำเนินการ...' : 'อัปเดตรหัสผ่านเข้าสู่ระบบ'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// Inline styles for details
const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid rgba(79, 70, 229, 0.04)'
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--text-sub)',
  fontWeight: 500
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--text-main)',
  fontWeight: 600
};
