// src/app/api/admin/classrooms/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb, Classroom } from '@/lib/db';
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

// GET: List all classrooms
export async function GET() {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();
    return NextResponse.json({ success: true, classrooms: db.classrooms });
  } catch (error) {
    console.error('GET Classrooms API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Add new classroom
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อห้องเรียน' }, { status: 400 });
    }

    const db = await readDb();

    // Check duplicate
    const exists = db.classrooms.some(
      c => c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      return NextResponse.json({ success: false, error: 'มีชื่อห้องเรียนนี้อยู่ในระบบแล้ว' }, { status: 400 });
    }

    const newClassroom: Classroom = {
      id: `class-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim()
    };

    db.classrooms.push(newClassroom);
    await writeDb(db);

    return NextResponse.json({ success: true, classroom: newClassroom });
  } catch (error) {
    console.error('POST Classroom API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
