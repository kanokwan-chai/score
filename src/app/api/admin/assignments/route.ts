// src/app/api/admin/assignments/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb, Assignment, Score } from '@/lib/db';
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

// GET: List all assignments with subject names
export async function GET() {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();
    
    // Join assignment with subject name
    const joinedAssignments = db.assignments.map(asm => {
      const subject = db.subjects.find(s => s.id === asm.subject_id);
      return {
        ...asm,
        subject_name: subject ? `${subject.code} - ${subject.name}` : 'ไม่ระบุรายวิชา'
      };
    });

    return NextResponse.json({
      success: true,
      assignments: joinedAssignments
    });
  } catch (error) {
    console.error('GET Assignments API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Add new assignment & cascade create scores for all students in target classroom
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

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

    // Create assignment object
    const newAssignmentId = `asm-${Math.random().toString(36).substring(2, 9)}`;
    const newAssignment: Assignment = {
      id: newAssignmentId,
      subject_id,
      title: title.trim(),
      type,
      category,
      full_score: Number(full_score),
      keep_score: Number(keep_score),
      due_date,
      classroom
    };

    db.assignments.push(newAssignment);

    // Cascade Score Creation: Find all student users in this classroom
    const targetStudents = db.users.filter(
      u => u.role === 'student' && u.classroom === classroom
    );

    targetStudents.forEach(student => {
      const newScore: Score = {
        id: `sc-${Math.random().toString(36).substring(2, 9)}`,
        assignment_id: newAssignmentId,
        student_id: student.id,
        raw_score: -1, // Ungraded initially
        calculated_score: 0,
        feedback: '',
        note: '',
        created_at: new Date().toISOString()
      };
      db.scores.push(newScore);
    });

    await writeDb(db);

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      createdScoresCount: targetStudents.length,
      message: `สร้างงานสำเร็จและเตรียมช่องบันทึกคะแนนให้นักเรียน ${targetStudents.length} คนเรียบร้อยแล้ว`
    });
  } catch (error) {
    console.error('POST Assignment API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
