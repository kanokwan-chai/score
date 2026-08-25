// src/app/api/student/dashboard/route.ts
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
    
    // 1. Get student classroom
    const classroom = student.classroom;
    if (!classroom) {
      return NextResponse.json({
        success: true,
        stats: {
          enrolledSubjectsCount: 0,
          assignedTasksCount: 0,
          submittedTasksCount: 0,
          pendingTasksCount: 0
        },
        charts: {
          subjectPerformance: []
        }
      });
    }

    // 2. Get assignments targeted to this classroom
    const classAssignments = db.assignments.filter(a => a.classroom === classroom);
    const classAssignmentIds = classAssignments.map(a => a.id);

    // Get unique subjects that have assignments in this classroom
    const enrolledSubjectIds = Array.from(new Set(classAssignments.map(a => a.subject_id)));
    const enrolledSubjectsCount = enrolledSubjectIds.length;

    // Get student's scores for these assignments
    const studentScores = db.scores.filter(
      s => s.student_id === student.id && classAssignmentIds.includes(s.assignment_id)
    );

    const assignedTasksCount = classAssignments.length;
    const submittedTasksCount = studentScores.filter(s => s.raw_score !== -1).length;
    const pendingTasksCount = assignedTasksCount - submittedTasksCount;

    // Calculate attendance rate
    const studentAttendance = db.attendance.filter(att => att.student_id === student.id);
    const totalAttendance = studentAttendance.length;
    const presentCount = studentAttendance.filter(att => att.status === 'present').length;
    const lateCount = studentAttendance.filter(att => att.status === 'late').length;
    const leaveCount = studentAttendance.filter(att => att.status === 'leave_sick' || att.status === 'leave_business').length;
    
    const attendanceRate = totalAttendance > 0 
      ? Math.round(((presentCount + lateCount + leaveCount) / totalAttendance) * 100)
      : 100;

    // 3. Compile personal performance per subject (Chart data: Task completion counts, NOT score sums)
    const subjectPerformance = enrolledSubjectIds.map(subjId => {
      const subject = db.subjects.find(s => s.id === subjId);
      const subjectAsms = classAssignments.filter(a => a.subject_id === subjId);
      const subjectAsmIds = subjectAsms.map(a => a.id);

      // Student's scores in this subject
      const subScores = studentScores.filter(
        s => s.student_id === student.id && 
             subjectAsmIds.includes(s.assignment_id) && 
             s.raw_score !== -1
      );

      return {
        subjectName: subject ? subject.name : 'ไม่ระบุวิชา',
        submittedCount: subScores.length,
        totalCount: subjectAsms.length
      };
    });

    return NextResponse.json({
      success: true,
      studentInfo: {
        first_name: student.first_name,
        last_name: student.last_name,
        student_id: student.student_id,
        classroom: student.classroom
      },
      stats: {
        enrolledSubjectsCount,
        assignedTasksCount,
        submittedTasksCount,
        pendingTasksCount,
        attendanceRate
      },
      charts: {
        subjectPerformance
      }
    });
  } catch (error) {
    console.error('Student Dashboard API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
