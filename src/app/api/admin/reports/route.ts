// src/app/api/admin/reports/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, ensureDbSynced } from '@/lib/db';
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

// Thai grade calculator
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

// GET: Generate report data
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

    if (!subjectId || !classroom) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุข้อมูลวิชาและห้องเรียน' }, { status: 400 });
    }

    const db = await readDb();

    // 1. Get classroom students
    const students = db.users.filter(u => u.role === 'student' && u.classroom === classroom);

    // 2. Get assignments in this subject for this classroom
    const subjectAssignments = db.assignments
      .filter(a => a.subject_id === subjectId && a.classroom === classroom)
      .sort((a, b) => a.due_date.localeCompare(b.due_date)); // chronological order

    const categoryWeights = {
      assignment: 30,
      quiz: 20,
      behavior: 20,
      final: 30
    };

    // Find which categories have assignments created in this subject for this classroom
    const activeCategories = Array.from(new Set(subjectAssignments.map(a => a.category))) as ('assignment' | 'quiz' | 'behavior' | 'final')[];
    const totalWeightMax = activeCategories.reduce((sum, cat) => sum + (categoryWeights[cat] || 0), 0);

    // 3. Compile report rows for each student
    let reportRows = students.map(student => {
      const studentScores = subjectAssignments.map(asm => {
        const score = db.scores.find(s => s.assignment_id === asm.id && s.student_id === student.id);
        return {
          assignment_id: asm.id,
          raw_score: score ? score.raw_score : -1,
          calculated_score: score ? score.calculated_score : 0,
        };
      });

      // Calculate weighted score sum based on active categories
      let totalEarnedWeight = 0;
      
      activeCategories.forEach(catKey => {
        const catAsms = subjectAssignments.filter(a => a.category === catKey);
        let catFullSum = 0;
        let catRawSum = 0;
        
        catAsms.forEach(asm => {
          const score = db.scores.find(s => s.assignment_id === asm.id && s.student_id === student.id);
          if (score && score.raw_score !== -1) {
            catFullSum += asm.full_score;
            catRawSum += score.raw_score;
          }
        });
        
        const catWeight = categoryWeights[catKey] || 0;
        const catEarned = catFullSum > 0 ? (catRawSum / catFullSum) * catWeight : 0;
        totalEarnedWeight += catEarned;
      });

      const overallPercentage = totalWeightMax > 0 
        ? (totalEarnedWeight / totalWeightMax) * 100 
        : 0;

      const grade = totalWeightMax > 0 ? calculateGrade(overallPercentage) : 'N/A';

      return {
        id: student.id,
        student_id: student.student_id || '',
        first_name: student.first_name,
        last_name: student.last_name,
        scores: studentScores, // matches order of subjectAssignments
        keep_score_sum: Math.round(totalEarnedWeight * 100) / 100,
        percentage: Math.round(overallPercentage * 100) / 100,
        grade,
        rank: 1 // default placeholder
      };
    });

    // 4. Calculate ranking based on total keep_score_sum descending
    reportRows.sort((a, b) => b.keep_score_sum - a.keep_score_sum);
    
    // Assign ranks, handling ties correctly
    let currentRank = 1;
    for (let i = 0; i < reportRows.length; i++) {
      if (i > 0 && reportRows[i].keep_score_sum < reportRows[i - 1].keep_score_sum) {
        currentRank = i + 1;
      }
      reportRows[i].rank = currentRank;
    }

    // Sort report rows back by student ID or name for readable list (or keep by rank)
    // Sorting by student ID is standard for transcripts
    reportRows.sort((a, b) => a.student_id.localeCompare(b.student_id));

    return NextResponse.json({
      success: true,
      subject: db.subjects.find(s => s.id === subjectId),
      classroom,
      assignments: subjectAssignments,
      totalWeightMax,
      reportRows
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: 'ระบบผิดพลาด' }, { status: 500 });
  }
}
