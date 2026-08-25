import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth-token';
import { hashPassword } from '@/lib/hash';

export async function GET() {
  try {
    await ensureDbSynced();
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาล็อกอินเป็นอาจารย์ก่อนเรียกใช้งาน' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();
    let updatedCount = 0;

    // บังคับรีเซ็ตรหัสผ่านนักเรียนทุกคนให้เป็นรหัสนักเรียน (Force Reset All)
    db.users.forEach(u => {
      if (u.role === 'student' && u.student_id) {
        u.status = 'active';
        u.passwordHash = hashPassword(u.student_id);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await writeDb(db);
    }

    return NextResponse.json({
      success: true,
      message: `🚨 บังคับรีเซ็ตรหัสผ่านสำเร็จทั้งหมด ${updatedCount} คน ตอนนี้นักเรียนทุกคนต้องใช้รหัสนักเรียนในการเข้าสู่ระบบครับ!`
    });
  } catch (error) {
    console.error('Auto patch API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
