// src/app/api/student/scores/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced } from '@/lib/db';
import { verifyToken } from '@/lib/auth-token';

// Helper to check student permission
async function checkStudentAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  
  const user = verifyToken(token);
  if (!user || user.role !== 'student') return null;
  return user;
}

export async function GET() {
    await ensureDbSynced();
  try {
    const student = await checkStudentAuth();
    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();

    // Get all assignments targeted to the student's classroom
    const classroomAssignments = db.assignments.filter(a => a.classroom === student.classroom);

    // Build joined list from ALL assignments (not just graded ones)
    // so students can see every assignment even if ungraded
    const joinedScores = classroomAssignments.map(assignment => {
      const score = db.scores.find(
        s => s.student_id === student.id && s.assignment_id === assignment.id
      );

      let subjectName = 'ไม่ระบุรายวิชา';
      let subjectCode = '';
      const subject = db.subjects.find(s => s.id === assignment.subject_id);
      if (subject) {
        subjectName = subject.name;
        subjectCode = subject.code;
      }

      return {
        id: score ? score.id : `placeholder-${assignment.id}`,
        assignment_title: assignment.title,
        assignment_type: assignment.type,
        category: assignment.category,
        full_score: assignment.full_score,
        keep_score: assignment.keep_score,
        due_date: assignment.due_date,
        raw_score: score ? score.raw_score : -1,  // -1 = ยังไม่ตรวจ
        calculated_score: score ? score.calculated_score : 0,
        feedback: score ? score.feedback : '',
        graded_date: score ? score.created_at : '',
        subject_name: subjectName,
        subject_code: subjectCode
      };
    });

    // Sort by due date chronologically
    joinedScores.sort((a, b) => a.due_date.localeCompare(b.due_date));

    return NextResponse.json({
      success: true,
      scores: joinedScores
    });
  } catch (error) {
    console.error('Student GET Scores API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
