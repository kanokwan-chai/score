// src/app/api/admin/subjects/[id]/route.ts
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

// PUT: Update subject
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
    const { name, code } = await request.json();

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลรหัสวิชาและชื่อวิชา' }, { status: 400 });
    }

    const db = await readDb();
    const subjectIndex = db.subjects.findIndex(s => s.id === id);

    if (subjectIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสรายวิชานี้ในระบบ' }, { status: 404 });
    }

    // Check code conflicts if code is changing
    const codeConflicting = db.subjects.some(
      s => s.id !== id && s.code.toLowerCase() === code.trim().toLowerCase()
    );
    if (codeConflicting) {
      return NextResponse.json({ success: false, error: 'มีรหัสวิชานี้อยู่ในระบบแล้ว' }, { status: 400 });
    }

    db.subjects[subjectIndex].name = name.trim();
    db.subjects[subjectIndex].code = code.trim().toUpperCase();

    await writeDb(db);

    return NextResponse.json({
      success: true,
      subject: db.subjects[subjectIndex]
    });
  } catch (error) {
    console.error('PUT Subject API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// DELETE: Delete subject (cascades to assignments and scores)
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
    const subjectIndex = db.subjects.findIndex(s => s.id === id);

    if (subjectIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายวิชาที่ต้องการลบ' }, { status: 404 });
    }

    // 1. Remove subject
    db.subjects.splice(subjectIndex, 1);

    // 2. Cascade delete: find assignments belonging to this subject
    const subjectAssignments = db.assignments.filter(a => a.subject_id === id);
    const subjectAssignmentIds = subjectAssignments.map(a => a.id);

    // Filter assignments out
    db.assignments = db.assignments.filter(a => a.subject_id !== id);

    // Cascade delete: filter scores belonging to these assignments
    db.scores = db.scores.filter(s => !subjectAssignmentIds.includes(s.assignment_id));

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'ลบรายวิชาและข้อมูลงาน/คะแนนที่เกี่ยวข้องสำเร็จ'
    });
  } catch (error) {
    console.error('DELETE Subject API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
