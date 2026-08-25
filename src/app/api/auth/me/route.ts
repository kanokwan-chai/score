// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-token';
import { readDb, ensureDbSynced } from '@/lib/db';

export async function GET() {
    await ensureDbSynced();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้ล็อกอิน' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'เซสชันหมดอายุหรือรหัสตรวจสอบไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // ดึงข้อมูลสดใหม่ล่าสุดจากฐานข้อมูลโดยตรง
    const db = await readDb();
    const dbUser = db.users.find((u: any) => u.id === payload.id);

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบบัญชีผู้ใช้งานในระบบ' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        student_id: dbUser.student_id,
        username: dbUser.username,
        role: dbUser.role,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        classroom: dbUser.classroom
      }
    });
  } catch (error) {
    console.error('Auth Me API error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
