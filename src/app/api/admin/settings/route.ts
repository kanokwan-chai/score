// src/app/api/admin/settings/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth-token';
import { hashPassword, verifyPassword } from '@/lib/hash';

// Helper to check admin permission
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') return null;
  return user;
}

// GET: Get current admin user info
export async function GET() {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();
    const adminUser = db.users.find(u => u.id === admin.id);

    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้นี้' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      admin: {
        username: adminUser.username,
        first_name: adminUser.first_name,
        last_name: adminUser.last_name,
        role: adminUser.role,
        created_at: adminUser.created_at
      }
    });
  } catch (error) {
    console.error('GET Admin Settings API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Update admin profile or change password
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const body = await request.json();
    const { action, firstName, lastName, currentPassword, newPassword } = body;

    const db = await readDb();
    const adminIndex = db.users.findIndex(u => u.id === admin.id);

    if (adminIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้งานนี้' }, { status: 404 });
    }

    const adminUser = db.users[adminIndex];

    if (action === 'update_profile') {
      if (!firstName || !lastName) {
        return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อและนามสกุล' }, { status: 400 });
      }

      db.users[adminIndex].first_name = firstName.trim();
      db.users[adminIndex].last_name = lastName.trim();
      await writeDb(db);

      return NextResponse.json({
        success: true,
        message: 'อัปเดตข้อมูลโปรไฟล์ส่วนตัวสำเร็จ'
      });
    }

    if (action === 'change_password') {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ success: false, error: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
      }

      // Verify current password
      const isCurrentCorrect = verifyPassword(currentPassword, adminUser.passwordHash);
      if (!isCurrentCorrect) {
        return NextResponse.json({ success: false, error: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 401 });
      }

      // Hash and save new password
      db.users[adminIndex].passwordHash = hashPassword(newPassword);
      await writeDb(db);

      return NextResponse.json({
        success: true,
        message: 'เปลี่ยนรหัสผ่านส่วนตัวสำเร็จเรียบร้อยแล้ว'
      });
    }

    return NextResponse.json({ success: false, error: 'ระบุการกระทำ (Action) ไม่ถูกต้อง' }, { status: 400 });
  } catch (error) {
    console.error('POST Admin Settings API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
