// src/app/api/admin/scores/route.ts
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

// Standard Thai grading calculator
function calculateGrade(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'D+';
  if (percentage >= 50) return 'D';
  return 'F';
}

// GET: Retrieve student scores and overall subject grades
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
    const assignmentId = searchParams.get('assignment_id');

    if (!subjectId || !classroom || !assignmentId) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุข้อมูลวิชา ห้องเรียน และงานมอบหมาย' }, { status: 400 });
    }

    const db = await readDb();

    // Verify assignment exists and matches
    const assignment = db.assignments.find(a => a.id === assignmentId && a.subject_id === subjectId && a.classroom === classroom);
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'ไม่พบชิ้นงานที่สอดคล้องตามเงื่อนไข' }, { status: 404 });
    }

    // Find all assignments of this subject for this classroom (for overall grade sum)
    const subjectAssignments = db.assignments.filter(
      a => a.subject_id === subjectId && a.classroom === classroom
    );
    const subjectAssignmentIds = subjectAssignments.map(a => a.id);

    // Get all students in this classroom
    const classroomStudents = db.users.filter(
      u => u.role === 'student' && u.classroom === classroom
    );

    // Prepare student list with current assignment score AND overall stats
    const studentScores = classroomStudents.map(student => {
      // Find current score record for the target assignment
      let currentScore = db.scores.find(
        s => s.assignment_id === assignmentId && s.student_id === student.id
      );

      // Safe creation if not exists
      if (!currentScore) {
        currentScore = {
          id: `sc-${Math.random().toString(36).substring(2, 9)}`,
          assignment_id: assignmentId,
          student_id: student.id,
          raw_score: -1, // Ungraded
          calculated_score: 0,
          feedback: '',
          note: '',
          created_at: new Date().toISOString()
        };
        db.scores.push(currentScore);
      }

      // Calculate overall stats for this subject
      // Find all scores of this student in the current subject
      const studentSubjectScores = db.scores.filter(
        s => s.student_id === student.id && 
             subjectAssignmentIds.includes(s.assignment_id) && 
             s.raw_score !== -1
      );

      const categoryWeights = {
        assignment: 30,
        quiz: 20,
        behavior: 20,
        final: 30
      };

      // Find active categories that have assignments created in this subject for this classroom
      const activeCategories = Array.from(new Set(subjectAssignments.map(a => a.category))) as ('assignment' | 'quiz' | 'behavior' | 'final')[];
      const totalKeepScoreMax = activeCategories.reduce((sum, cat) => sum + (categoryWeights[cat] || 0), 0);

      let totalEarnedWeight = 0;
      activeCategories.forEach(catKey => {
        const catAsms = subjectAssignments.filter(a => a.category === catKey);
        let catFullSum = 0;
        let catRawSum = 0;
        let hasGraded = false;

        catAsms.forEach(asm => {
          const score = db.scores.find(s => s.assignment_id === asm.id && s.student_id === student.id);
          if (score && score.raw_score !== -1) {
            catFullSum += asm.full_score;
            catRawSum += score.raw_score;
            hasGraded = true;
          }
        });

        if (hasGraded && catFullSum > 0) {
          const catWeight = categoryWeights[catKey] || 0;
          totalEarnedWeight += (catRawSum / catFullSum) * catWeight;
        }
      });

      const overallPercentage = totalKeepScoreMax > 0 
        ? (totalEarnedWeight / totalKeepScoreMax) * 100 
        : 0;

      const overallGrade = totalKeepScoreMax > 0 ? calculateGrade(overallPercentage) : 'ไม่มีข้อมูล';

      return {
        student_id: student.id,
        student_code: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        score_id: currentScore.id,
        raw_score: currentScore.raw_score,
        calculated_score: currentScore.calculated_score,
        feedback: currentScore.feedback,
        note: currentScore.note,
        overall_keep_sum: Math.round(totalEarnedWeight * 100) / 100,
        overall_keep_max: totalKeepScoreMax,
        overall_grade: overallGrade,
        overall_percentage: Math.round(overallPercentage * 100) / 100
      };
    });

    // Save changes if new score records were initialized
    await writeDb(db);

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        category: assignment.category,
        full_score: assignment.full_score,
        keep_score: assignment.keep_score,
        due_date: assignment.due_date
      },
      studentScores
    });
  } catch (error) {
    console.error('GET Scores API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}

// POST: Save/update multiple student scores
export async function POST(request: Request) {
    await ensureDbSynced();
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าใช้งาน' }, { status: 401 });
    }

    const { assignment_id, scores } = await request.json();

    if (!assignment_id || !scores || !Array.isArray(scores)) {
      return NextResponse.json({ success: false, error: 'ข้อมูลส่งมาไม่ครบถ้วน' }, { status: 400 });
    }

    const db = await readDb();
    const assignment = db.assignments.find(a => a.id === assignment_id);

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'ไม่พบงานที่ต้องการบันทึกคะแนน' }, { status: 404 });
    }

    // Update each score
    scores.forEach((inputScore: any) => {
      const { score_id, raw_score, feedback, note } = inputScore;
      const scoreIndex = db.scores.findIndex(s => s.id === score_id);

      if (scoreIndex !== -1) {
        const raw = Number(raw_score);
        
        if (raw_score === '' || raw === -1) {
          // Keep as ungraded
          db.scores[scoreIndex].raw_score = -1;
          db.scores[scoreIndex].calculated_score = 0;
        } else {
          // Clamp score between 0 and full_score
          const clampedRaw = Math.max(0, Math.min(assignment.full_score, raw));
          const calculated = Math.round(((clampedRaw / assignment.full_score) * assignment.keep_score) * 100) / 100;
          
          db.scores[scoreIndex].raw_score = clampedRaw;
          db.scores[scoreIndex].calculated_score = calculated;
        }
        
        db.scores[scoreIndex].feedback = (feedback || '').trim();
        db.scores[scoreIndex].note = (note || '').trim();
        db.scores[scoreIndex].created_at = new Date().toISOString();
      }
    });

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: 'บันทึกคะแนนและคำนวณเกรดสะสมสำเร็จเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('POST Save Scores API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
