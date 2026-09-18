// src/app/api/admin/scores/import-sheet/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDb, writeDb } from "@/lib/db";
import { verifyToken } from "@/lib/auth-token";

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  const user = verifyToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์เข้าใช้งาน" }, { status: 401 });
    }

    const body = await request.json();
    const { subject_id, classroom, rows } = body as {
      subject_id: string;
      classroom: string;
      rows: { student_code: string; assignment: number; quiz: number; final: number; behavior: number }[];
    };

    if (!subject_id || !classroom || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const db = await readDb();

    const subjectAssignments = db.assignments.filter(
      (a) => a.subject_id === subject_id && a.classroom === classroom
    );

    if (subjectAssignments.length === 0) {
      return NextResponse.json({
        success: false,
        error: "ไม่พบงานที่มอบหมายในวิชา/ห้องที่เลือก กรุณาสร้างงานก่อน",
      }, { status: 404 });
    }

    const categoryWeights: Record<string, number> = {
      assignment: 30,
      quiz: 20,
      behavior: 20,
      final: 30,
    };

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const student = db.users.find(
        (u) => u.role === "student" && u.student_id === String(row.student_code).trim()
      );
      if (!student) {
        skippedCount++;
        if (errors.length < 10) errors.push(`ไม่พบนักเรียนรหัส ${row.student_code}`);
        continue;
      }

      for (const cat of ["assignment", "quiz", "final", "behavior"] as const) {
        const categoryScore = Number((row as Record<string, unknown>)[cat]);
        if (isNaN(categoryScore)) continue;

        const catAsms = subjectAssignments.filter((a) => a.category === cat);
        if (catAsms.length === 0) continue;

        const catWeight = categoryWeights[cat] || 0;
        const catFullTotal = catAsms.reduce((s, a) => s + a.full_score, 0);
        const proportion = catWeight > 0 ? categoryScore / catWeight : 0;
        const rawTotal = proportion * catFullTotal;

        for (const asm of catAsms) {
          const asmProportion = catFullTotal > 0 ? asm.full_score / catFullTotal : 0;
          const rawForAsm = Math.round(rawTotal * asmProportion * 100) / 100;
          const clampedRaw = Math.max(0, Math.min(asm.full_score, rawForAsm));
          const calculated =
            asm.full_score > 0
              ? Math.round((clampedRaw / asm.full_score) * asm.keep_score * 100) / 100
              : 0;

          const scoreIdx = db.scores.findIndex(
            (s) => s.assignment_id === asm.id && s.student_id === student.id
          );

          if (scoreIdx !== -1) {
            db.scores[scoreIdx].raw_score = clampedRaw;
            db.scores[scoreIdx].calculated_score = calculated;
            db.scores[scoreIdx].created_at = new Date().toISOString();
          } else {
            db.scores.push({
              id: `sc-${Math.random().toString(36).substring(2, 9)}`,
              assignment_id: asm.id,
              student_id: student.id,
              raw_score: clampedRaw,
              calculated_score: calculated,
              feedback: "",
              note: "นำเข้าจาก Excel",
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      updatedCount++;
    }

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: `อัปเดตคะแนนสำเร็จ ${updatedCount} คน, ข้ามไป ${skippedCount} คน`,
      updatedCount,
      skippedCount,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Import sheet error:", error);
    return NextResponse.json({ success: false, error: "ระบบผิดพลาด" }, { status: 500 });
  }
}
