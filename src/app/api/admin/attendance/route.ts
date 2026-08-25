// src/app/api/admin/attendance/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb, Attendance } from '@/lib/db';
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

// GET: Load attendance list for classroom and subject on specific date
export async function GET(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');
    const classroom = searchParams.get('classroom');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!subjectId || !classroom || !date) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุวิชา ห้องเรียน และวันที่เช็คชื่อ' }, { status: 400 });
    }

    const db = await readDb();

    // 1. Get students of classroom
    const students = db.users.filter(u => u.role === 'student' && u.classroom === classroom);

    // 2. Get attendance logs for this classroom, subject, and date
    const attendanceLogs = db.attendance.filter(
      att => att.subject_id === subjectId && att.classroom === classroom && att.date === date
    );

    // Combine: For each student, find if there is an attendance log
    const list = students.map(student => {
      const log = attendanceLogs.find(l => l.student_id === student.id);
      return {
        student_id_key: student.id,
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        status: log ? log.status : 'present' // default to present (มาเรียน) if not checked yet
      };
    });

    // Sort by student ID
    list.sort((a, b) => (a.student_id || '').localeCompare(b.student_id || ''));

    return NextResponse.json({
      success: true,
      students: list,
      isAlreadyChecked: attendanceLogs.length > 0
    });
  } catch (error) {
    console.error('GET Admin Attendance API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Save/Update attendance list
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const body = await request.json();
    const { subject_id, classroom, date, records } = body; // records: { [student_id_key]: status }

    if (!subject_id || !classroom || !date || !records) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const db = await readDb();

    // Filter out existing records for this classroom, subject, and date
    db.attendance = db.attendance.filter(
      att => !(att.subject_id === subject_id && att.classroom === classroom && att.date === date)
    );

    let counter = db.attendance.length + 1;

    // Add new/updated records
    Object.entries(records).forEach(([studentIdKey, status]) => {
      db.attendance.push({
        id: `att-${Date.now()}-${counter++}`,
        student_id: studentIdKey,
        subject_id,
        classroom,
        date,
        status: status as Attendance['status'],
        created_at: new Date().toISOString()
      });
    });

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'บันทึกเวลาเรียนเรียบร้อยแล้วค่ะ'
    });
  } catch (error) {
    console.error('POST Admin Attendance API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
