// src/app/api/admin/students/[id]/route.ts
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

// PUT: Update student details
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
    const { firstName, lastName, classroom, status } = await request.json();

    if (!firstName || !lastName || !classroom) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน' }, { status: 400 });
    }

    const db = await readDb();
    const studentIndex = db.users.findIndex(u => u.id === id && u.role === 'student');

    if (studentIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลนักเรียนนี้ในระบบ' }, { status: 404 });
    }

    const oldClassroom = db.users[studentIndex].classroom;
    const newClassroom = classroom.trim();

    // 1. Update basic info
    db.users[studentIndex].first_name = firstName.trim();
    db.users[studentIndex].last_name = lastName.trim();
    db.users[studentIndex].classroom = newClassroom;
    if (status) {
      db.users[studentIndex].status = status;
    }

    // 2. If classroom has changed, adjust their scores list
    if (oldClassroom !== newClassroom) {
      // Find assignment IDs of the old classroom
      const oldAsmIds = db.assignments.filter(a => a.classroom === oldClassroom).map(a => a.id);
      
      // Delete scores for assignments of the old classroom
      db.scores = db.scores.filter(s => !(s.student_id === id && oldAsmIds.includes(s.assignment_id)));

      // Find assignment IDs of the new classroom
      const newAssignments = db.assignments.filter(a => a.classroom === newClassroom);
      
      // Create new scores for new assignments (if not already existing)
      newAssignments.forEach(asm => {
        const scoreExists = db.scores.some(s => s.student_id === id && s.assignment_id === asm.id);
        if (!scoreExists) {
          const newScore: Score = {
            id: `score-${Math.random().toString(36).substring(2, 9)}`,
            assignment_id: asm.id,
            student_id: id,
            raw_score: -1, // Ungraded
            calculated_score: 0,
            feedback: '',
            note: '',
            created_at: new Date().toISOString()
          };
          db.scores.push(newScore);
        }
      });
    }

    await writeDb(db);

    return NextResponse.json({
      success: true,
      student: db.users[studentIndex],
      message: 'แก้ไขข้อมูลนักเรียนสำเร็จ'
    });
  } catch (error) {
    console.error('PUT Student API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// DELETE: Delete student
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
    const studentIndex = db.users.findIndex(u => u.id === id && u.role === 'student');

    if (studentIndex === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบนักเรียนที่ต้องการลบ' }, { status: 404 });
    }

    // 1. Remove student record
    db.users.splice(studentIndex, 1);

    // 2. Cascade delete scores belonging to this student
    db.scores = db.scores.filter(s => s.student_id !== id);

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลนักเรียนและประวัติคะแนนสอบทั้งหมดสำเร็จ'
    });
  } catch (error) {
    console.error('DELETE Student API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
