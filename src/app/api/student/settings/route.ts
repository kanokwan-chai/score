// src/app/api/student/settings/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth-token';
import { hashPassword, verifyPassword } from '@/lib/hash';

// Helper to check student permission
async function checkStudentAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  
  const user = verifyToken(token);
  if (!user || user.role !== 'student') return null;
  return user;
}

// GET: Get current student user details
export async function GET() {
    await ensureDbSynced();
  try {
    const student = await checkStudentAuth();
    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();
    const studentUser = db.users.find(u => u.id === student.id);

    if (!studentUser) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลนักเรียนคนนี้ในระบบ' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      student: {
        student_id: studentUser.student_id,
        first_name: studentUser.first_name,
        last_name: studentUser.last_name,
        classroom: studentUser.classroom,
        status: studentUser.status,
        created_at: studentUser.created_at
      }
    });
  } catch (error) {
    console.error('GET Student Settings API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Change student password
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const student = await checkStudentAuth();
    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const db = await readDb();
    const studentIndex = db.users.findIndex(u => u.id === student.id && u.role === 'student');

    if (studentIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบัญชีนักเรียนนี้' }, { status: 404 });
    }

    const studentUser = db.users[studentIndex];

    // Verify current password
    const isCurrentCorrect = verifyPassword(currentPassword, studentUser.passwordHash);
    if (!isCurrentCorrect) {
      return NextResponse.json({ success: false, error: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 401 });
    }

    // Update password
    db.users[studentIndex].passwordHash = hashPassword(newPassword);
    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านส่วนตัวสำเร็จเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('POST Student Settings API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
