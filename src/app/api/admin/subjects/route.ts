// src/app/api/admin/subjects/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb, Subject } from '@/lib/db';
import { verifyToken } from '@/lib/auth-token';

// Helper to check admin permission
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') return null;
  return user;
}

// GET: List all subjects
export async function GET() {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();
    return NextResponse.json({ success: true, subjects: db.subjects });
  } catch (error) {
    console.error('GET Subjects API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Add new subject
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { name, code } = await request.json();

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกรหัสวิชาและชื่อวิชา' }, { status: 400 });
    }

    const db = await readDb();

    // Check if code already exists
    const codeExists = db.subjects.some(
      s => s.code.toLowerCase() === code.trim().toLowerCase()
    );
    if (codeExists) {
      return NextResponse.json({ success: false, error: 'มีรหัสวิชานี้อยู่ในระบบแล้ว' }, { status: 400 });
    }

    const newSubject: Subject = {
      id: `subj-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      code: code.trim().toUpperCase()
    };

    db.subjects.push(newSubject);
    await writeDb(db);

    return NextResponse.json({ success: true, subject: newSubject });
  } catch (error) {
    console.error('POST Subject API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
