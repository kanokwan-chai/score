// src/app/api/admin/assignments/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb, Score } from '@/lib/db';
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

// PUT: Update assignment details
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
    const { 
      subject_id, 
      title, 
      type, 
      category,
      full_score, 
      keep_score, 
      due_date, 
      classroom 
    } = await request.json();

    if (!subject_id || !title || !type || !category || !full_score || !keep_score || !due_date || !classroom) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลงานที่มอบหมายให้ครบถ้วน' }, { status: 400 });
    }

    const db = await readDb();
    const asmIndex = db.assignments.findIndex(a => a.id === id);

    if (asmIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลงานที่มอบหมายนี้ในระบบ' }, { status: 404 });
    }

    const oldClassroom = db.assignments[asmIndex].classroom;
    const newClassroom = classroom;
    const newFullScore = Number(full_score);
    const newKeepScore = Number(keep_score);

    // 1. Update assignment record
    db.assignments[asmIndex] = {
      id,
      subject_id,
      title: title.trim(),
      type,
      category,
      full_score: newFullScore,
      keep_score: newKeepScore,
      due_date,
      classroom: newClassroom
    };

    // 2. Adjust scores target students if classroom changed
    if (oldClassroom !== newClassroom) {
      // Delete scores for old classroom students
      const oldStudentIds = db.users.filter(u => u.role === 'student' && u.classroom === oldClassroom).map(u => u.id);
      db.scores = db.scores.filter(s => !(s.assignment_id === id && oldStudentIds.includes(s.student_id)));

      // Create scores for new classroom students
      const newStudents = db.users.filter(u => u.role === 'student' && u.classroom === newClassroom);
      newStudents.forEach(student => {
        const scoreExists = db.scores.some(s => s.student_id === student.id && s.assignment_id === id);
        if (!scoreExists) {
          db.scores.push({
            id: `sc-${Math.random().toString(36).substring(2, 9)}`,
            assignment_id: id,
            student_id: student.id,
            raw_score: -1, // Ungraded
            calculated_score: 0,
            feedback: '',
            note: '',
            created_at: new Date().toISOString()
          });
        }
      });
    } else {
      // Classroom did not change, but scores weight might have changed. Recalculate graded scores!
      db.scores = db.scores.map(score => {
        if (score.assignment_id === id) {
          if (score.raw_score === -1) {
            return { ...score, calculated_score: 0 };
          }
          const recalculated = Math.round(((score.raw_score / newFullScore) * newKeepScore) * 100) / 100;
          return { ...score, calculated_score: recalculated };
        }
        return score;
      });
    }

    await writeDb(db);

    return NextResponse.json({
      success: true,
      assignment: db.assignments[asmIndex],
      message: 'แก้ไขข้อมูลงานมอบหมายและปรับปรุงคะแนนสะสมย้อนหลังสำเร็จ'
    });
  } catch (error) {
    console.error('PUT Assignment API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// DELETE: Delete assignment & cascade delete scores
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
    const asmIndex = db.assignments.findIndex(a => a.id === id);

    if (asmIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบชิ้นงานที่ต้องการลบ' }, { status: 404 });
    }

    // 1. Remove assignment
    db.assignments.splice(asmIndex, 1);

    // 2. Cascade delete scores
    db.scores = db.scores.filter(s => s.assignment_id !== id);

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'ลบภาระงานมอบหมายและล้างประวัติคะแนนสอบที่เกี่ยวข้องสำเร็จ'
    });
  } catch (error) {
    console.error('DELETE Assignment API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
