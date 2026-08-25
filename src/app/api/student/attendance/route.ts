// src/app/api/student/attendance/route.ts
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

    // 1. Fetch student's attendance records
    const studentLogs = db.attendance.filter(att => att.student_id === student.id);

    // 2. Join logs with subject names
    const joinedLogs = studentLogs.map(log => {
      const subject = db.subjects.find(s => s.id === log.subject_id);
      return {
        id: log.id,
        date: log.date,
        status: log.status,
        subject_id: log.subject_id,
        subject_name: subject ? subject.name : 'ไม่ระบุรายวิชา',
        subject_code: subject ? subject.code : ''
      };
    });

    // Sort logs by date descending (latest first)
    joinedLogs.sort((a, b) => b.date.localeCompare(a.date));

    // 3. Calculate statistics grouped by subject
    const subjectStats: Record<string, {
      subject_id: string;
      subject_name: string;
      subject_code: string;
      total: number;
      present: number;
      absent: number;
      late: number;
      leave_business: number;
      leave_sick: number;
    }> = {};

    joinedLogs.forEach(log => {
      const key = log.subject_id;
      if (!subjectStats[key]) {
        subjectStats[key] = {
          subject_id: log.subject_id,
          subject_name: log.subject_name,
          subject_code: log.subject_code,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave_business: 0,
          leave_sick: 0
        };
      }

      const stats = subjectStats[key];
      stats.total += 1;
      if (log.status === 'present') stats.present += 1;
      else if (log.status === 'absent') stats.absent += 1;
      else if (log.status === 'late') stats.late += 1;
      else if (log.status === 'leave_business') stats.leave_business += 1;
      else if (log.status === 'leave_sick') stats.leave_sick += 1;
    });

    return NextResponse.json({
      success: true,
      logs: joinedLogs,
      summaryBySubject: Object.values(subjectStats)
    });
  } catch (error) {
    console.error('GET Student Attendance API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
