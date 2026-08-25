// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { readDb, ensureDbSynced } from '@/lib/db';
import { verifyPassword } from '@/lib/hash';
import { signToken } from '@/lib/auth-token';

export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' },
        { status: 400 }
      );
    }

    const db = await readDb();
    
    // Find user (username works for admin, student_id/username works for student)
    const user = db.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() || 
           (u.student_id && u.student_id.toLowerCase() === username.toLowerCase())
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ' },
        { status: 401 }
      );
    }

    if (user.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'บัญชีนี้ยังไม่ได้ลงทะเบียน กรุณาลงทะเบียนก่อนเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const isPasswordCorrect = verifyPassword(password, user.passwordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Sign token
    const token = signToken({
      id: user.id,
      student_id: user.student_id,
      username: user.username,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      classroom: user.classroom
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        student_id: user.student_id,
        username: user.username,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        classroom: user.classroom
      }
    });

    // Set cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 120 * 60, // 2 hours
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดของระบบ' },
      { status: 500 }
    );
  }
}
