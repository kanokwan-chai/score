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
    const classroomAsmIds = classroomAssignments.map(a => a.id);

    // Get all scores belonging to this student for these assignments
    const studentScores = db.scores.filter(
      s => s.student_id === student.id && classroomAsmIds.includes(s.assignment_id)
    );

    // Join scores with assignment and subject details
    const joinedScores = studentScores.map(score => {
      const assignment = classroomAssignments.find(a => a.id === score.assignment_id);
      let subjectName = 'ไม่ระบุรายวิชา';
      let subjectCode = '';

      if (assignment) {
        const subject = db.subjects.find(s => s.id === assignment.subject_id);
        if (subject) {
          subjectName = subject.name;
          subjectCode = subject.code;
        }
      }

      return {
        id: score.id,
        assignment_title: assignment ? assignment.title : 'ไม่พบหัวข้อชิ้นงาน',
        assignment_type: assignment ? assignment.type : 'Assignment',
        category: assignment ? assignment.category : 'assignment',
        full_score: assignment ? assignment.full_score : 0,
        keep_score: assignment ? assignment.keep_score : 0,
        due_date: assignment ? assignment.due_date : '',
        raw_score: score.raw_score, // -1 means ungraded
        calculated_score: score.calculated_score,
        feedback: score.feedback,
        graded_date: score.created_at,
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
