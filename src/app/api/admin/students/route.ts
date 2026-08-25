// src/app/api/admin/students/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced, writeDb, User, Score } from '@/lib/db';
import { verifyToken } from '@/lib/auth-token';
import { hashPassword } from '@/lib/hash';

// Helper to check admin permission
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') return null;
  return user;
}

// GET: List all students
export async function GET() {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const db = await readDb();
    const students = db.users.filter(u => u.role === 'student');
    
    return NextResponse.json({
      success: true,
      students
    });
  } catch (error) {
    console.error('GET Students API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Add student (Supports single or bulk import)
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const body = await request.json();
    const db = await readDb();

    // Check if it is a bulk import
    if (body.students && Array.isArray(body.students)) {
      const { students } = body;
      const importedStudents: User[] = [];
      const skippedCount: string[] = [];

      for (const item of students) {
        const { studentId, firstName, lastName, classroom } = item;

        if (!studentId || !firstName || !lastName || !classroom) {
          continue; // Skip invalid rows
        }

        const cleanId = studentId.trim();

        // Check if student_id already exists in db
        const exists = db.users.some(
          u => u.student_id && u.student_id.toLowerCase() === cleanId.toLowerCase()
        );

        if (exists) {
          skippedCount.push(cleanId);
          continue; // Skip duplicates
        }

        // Ensure classroom exists in classrooms table
        const cleanClassroom = classroom.trim();
        const classroomExists = db.classrooms.some(
          c => c.name.toLowerCase() === cleanClassroom.toLowerCase()
        );
        if (!classroomExists) {
          db.classrooms.push({
            id: `classroom-${Math.random().toString(36).substring(2, 9)}`,
            name: cleanClassroom
          });
        }

        const newStudentId = `student-user-${Math.random().toString(36).substring(2, 9)}`;
        const newStudent: User = {
          id: newStudentId,
          student_id: cleanId,
          username: cleanId,
          passwordHash: hashPassword(cleanId), // Auto-generate password as student ID
          role: 'student',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          classroom: classroom.trim(),
          status: 'active',
          created_at: new Date().toISOString()
        };

        db.users.push(newStudent);
        importedStudents.push(newStudent);

        // Populate scores for existing assignments in this classroom
        const classAssignments = db.assignments.filter(a => a.classroom === classroom.trim());
        classAssignments.forEach(asm => {
          const newScore: Score = {
            id: `score-${Math.random().toString(36).substring(2, 9)}`,
            assignment_id: asm.id,
            student_id: newStudentId,
            raw_score: -1, // Ungraded
            calculated_score: 0,
            feedback: '',
            note: '',
            created_at: new Date().toISOString()
          };
          db.scores.push(newScore);
        });
      }

      await writeDb(db);

      return NextResponse.json({
        success: true,
        message: `นำเข้านักเรียนสำเร็จ ${importedStudents.length} คน (ข้ามรายการซ้ำ ${skippedCount.length} คน)`,
        importedCount: importedStudents.length,
        skippedCount: skippedCount.length
      });
    }

    // Single student creation
    const { studentId, firstName, lastName, classroom } = body;

    if (!studentId || !firstName || !lastName || !classroom) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน' }, { status: 400 });
    }

    const cleanId = studentId.trim();

    // Check duplicate
    const exists = db.users.some(
      u => u.student_id && u.student_id.toLowerCase() === cleanId.toLowerCase()
    );
    if (exists) {
      return NextResponse.json({ success: false, error: 'มีรหัสนักเรียนนี้ในระบบแล้ว' }, { status: 400 });
    }

    // Ensure classroom exists in classrooms table
    const cleanClassroom = classroom.trim();
    const classroomExists = db.classrooms.some(
      c => c.name.toLowerCase() === cleanClassroom.toLowerCase()
    );
    if (!classroomExists) {
      db.classrooms.push({
        id: `classroom-${Math.random().toString(36).substring(2, 9)}`,
        name: cleanClassroom
      });
    }

    const newStudentId = `student-user-${Math.random().toString(36).substring(2, 9)}`;
    const newStudent: User = {
      id: newStudentId,
      student_id: cleanId,
      username: cleanId,
      passwordHash: hashPassword(cleanId), // Auto-generate password as student ID
      role: 'student',
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      classroom: classroom.trim(),
      status: 'active',
      created_at: new Date().toISOString()
    };

    db.users.push(newStudent);

    // Populate scores for existing assignments in this classroom
    const classAssignments = db.assignments.filter(a => a.classroom === classroom.trim());
    classAssignments.forEach(asm => {
      const newScore: Score = {
        id: `score-${Math.random().toString(36).substring(2, 9)}`,
        assignment_id: asm.id,
        student_id: newStudentId,
        raw_score: -1, // Ungraded
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
      student: newStudent,
      message: 'เพิ่มข้อมูลนักเรียนใหม่และสร้างช่องคะแนนสำเร็จ'
    });
  } catch (error) {
    console.error('POST Student API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
