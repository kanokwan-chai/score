// src/app/api/admin/dashboard/route.ts
import { NextResponse } from 'next/server';
import { readDb, ensureDbSynced } from '@/lib/db';

export async function GET() {
    await ensureDbSynced();
  try {
    const db = await readDb();
    
    // 1. Calculate General Statistics
    const classroomsCount = db.classrooms.length;
    const students = db.users.filter(u => u.role === 'student');
    const studentsCount = students.length;
    const subjectsCount = db.subjects.length;
    const assignmentsCount = db.assignments.length;

    // Filter graded scores (we define ungraded scores as raw_score = -1)
    const gradedScores = db.scores.filter(s => s.raw_score !== -1);
    
    let averageScorePercent = 0;
    if (gradedScores.length > 0) {
      let totalPercent = 0;
      gradedScores.forEach(score => {
        const assignment = db.assignments.find(a => a.id === score.assignment_id);
        if (assignment && assignment.full_score > 0) {
          totalPercent += (score.raw_score / assignment.full_score) * 100;
        }
      });
      averageScorePercent = Math.round((totalPercent / gradedScores.length) * 100) / 100;
    }

    // Ungraded assignments (at least one student has raw_score = -1)
    const ungradedAssignmentsCount = db.assignments.filter(asm => {
      const asmScores = db.scores.filter(s => s.assignment_id === asm.id);
      return asmScores.length === 0 || asmScores.some(s => s.raw_score === -1);
    }).length;

    // 2. Bar Chart: Average Score Percent per Subject
    const subjectAverages = db.subjects.map(subj => {
      const subjAssignments = db.assignments.filter(a => a.subject_id === subj.id);
      const subjAsmIds = subjAssignments.map(a => a.id);
      const subjScores = db.scores.filter(s => subjAsmIds.includes(s.assignment_id) && s.raw_score !== -1);
      
      let avgPercent = 0;
      if (subjScores.length > 0) {
        let totalPercent = 0;
        subjScores.forEach(score => {
          const assignment = subjAssignments.find(a => a.id === score.assignment_id);
          if (assignment) {
            totalPercent += (score.raw_score / assignment.full_score) * 100;
          }
        });
        avgPercent = Math.round((totalPercent / subjScores.length) * 100) / 100;
      }
      
      return {
        name: subj.name,
        code: subj.code,
        average: avgPercent
      };
    });

    // 3. Pie Chart: Students count per classroom
    const studentsPerClassroom = db.classrooms.map(c => {
      const count = students.filter(s => s.classroom === c.name).length;
      return {
        classroom: c.name,
        count: count
      };
    });

    // 4. Line Chart: Average Score Percent trend over assignments chronologically
    // Sort assignments by due date
    const sortedAssignments = [...db.assignments].sort((a, b) => a.due_date.localeCompare(b.due_date));
    const assignmentTrends = sortedAssignments.map(asm => {
      const asmScores = db.scores.filter(s => s.assignment_id === asm.id && s.raw_score !== -1);
      
      let avgPercent = 0;
      if (asmScores.length > 0) {
        const totalRaw = asmScores.reduce((sum, s) => sum + s.raw_score, 0);
        avgPercent = Math.round(((totalRaw / (asm.full_score * asmScores.length)) * 100) * 100) / 100;
      }
      
      return {
        title: asm.title,
        dueDate: asm.due_date,
        average: avgPercent
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        classroomsCount,
        studentsCount,
        subjectsCount,
        assignmentsCount,
        averageScorePercent,
        ungradedAssignmentsCount
      },
      charts: {
        subjectAverages,
        studentsPerClassroom,
        assignmentTrends: assignmentTrends.slice(-10) // get last 10 assignments for graph clarity
      }
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด' },
      { status: 500 }
    );
  }
}
