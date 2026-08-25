// src/app/api/admin/classrooms/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb } from '@/lib/db';
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

// PUT: Update classroom
export async function PUT(
  request: Request,
  {
    params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSynced();
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { id } = await params;
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อห้องเรียน' }, { status: 400 });
    }

    const db = await readDb();
    const classIndex = db.classrooms.findIndex(c => c.id === id);

    if (classIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสห้องเรียนนี้ในระบบ' }, { status: 404 });
    }

    const oldName = db.classrooms[classIndex].name;
    const newName = name.trim();

    // Check duplicate
    const exists = db.classrooms.some(
      c => c.id !== id && c.name.toLowerCase() === newName.toLowerCase()
    );
    if (exists) {
      return NextResponse.json({ success: false, error: 'มีชื่อห้องเรียนนี้อยู่ในระบบแล้ว' }, { status: 400 });
    }

    // 1. Update classroom name
    db.classrooms[classIndex].name = newName;

    // 2. Update students in this classroom
    db.users = db.users.map(u => {
      if (u.role === 'student' && u.classroom === oldName) {
        return { ...u, classroom: newName };
      }
      return u;
    });

    // 3. Update assignments targeted at this classroom
    db.assignments = db.assignments.map(a => {
      if (a.classroom === oldName) {
        return { ...a, classroom: newName };
      }
      return a;
    });

    await writeDb(db);

    return NextResponse.json({
      success: true,
      classroom: db.classrooms[classIndex]
    });
  } catch (error) {
    console.error('PUT Classroom API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// DELETE: Delete classroom
export async function DELETE(
  request: Request,
  {
    params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSynced();
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { id } = await params;

    const db = await readDb();
    const classIndex = db.classrooms.findIndex(c => c.id === id);

    if (classIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบห้องเรียนที่ต้องการลบ' }, { status: 404 });
    }

    const className = db.classrooms[classIndex].name;

    // 1. Remove classroom record
    db.classrooms.splice(classIndex, 1);

    // 2. Remove students' classroom assignment (set to null)
    db.users = db.users.map(u => {
      if (u.role === 'student' && u.classroom === className) {
        return { ...u, classroom: null };
      }
      return u;
    });

    // 3. Cascade delete assignments and scores targeted to this class
    const classAssignments = db.assignments.filter(a => a.classroom === className);
    const classAssignmentIds = classAssignments.map(a => a.id);

    db.assignments = db.assignments.filter(a => a.classroom !== className);
    db.scores = db.scores.filter(s => !classAssignmentIds.includes(s.assignment_id));

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'ลบห้องเรียนและยกเลิกข้อมูลนักเรียน/งานที่เกี่ยวข้องสำเร็จ'
    });
  } catch (error) {
    console.error('DELETE Classroom API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
