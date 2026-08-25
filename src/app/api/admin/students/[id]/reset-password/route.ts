import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth-token';
import { hashPassword } from '@/lib/hash';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSynced();
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { id } = await params;

    const db = await readDb();
    const studentIndex = db.users.findIndex(u => u.id === id && u.role === 'student');

    if (studentIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลนักเรียนนี้ในระบบ' }, { status: 404 });
    }

    // Reset status to active and set password to student_id
    db.users[studentIndex].status = 'active';
    const studentId = db.users[studentIndex].student_id;
    if (studentId) {
      db.users[studentIndex].passwordHash = hashPassword(studentId);
    } else {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสนักเรียน' }, { status: 400 });
    }

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านกลับไปเป็นรหัสนักเรียนสำเร็จ'
    });
  } catch (error) {
    console.error('Reset Password API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
