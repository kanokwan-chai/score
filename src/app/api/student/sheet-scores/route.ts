// src/app/api/student/sheet-scores/route.ts
// Returns ONLY this student own score row from each subject Sheet
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { readDb } from "@/lib/db";

function sheetIdToCSV(url: string): string {
  const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return "";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
}

function findStudentRow(text: string, studentCode: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/);
  const title = lines[0]?.split(",")[0]?.trim() ?? "";
  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const code = (cols[1] ?? "").trim();
    if (code !== studentCode) continue;
    return {
      title,
      student_code: code,
      first_name: (cols[2] ?? "").trim(),
      last_name: (cols[3] ?? "").trim(),
      classroom: (cols[4] ?? "").trim(),
      assignment: Number(cols[5]) || 0,
      quiz: Number(cols[6]) || 0,
      final: Number(cols[7]) || 0,
      behavior: Number(cols[8]) || 0,
      total: Number(cols[9]) || 0,
      grade: (cols[10] ?? "").trim(),
    };
  }
  return null;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 401 });

  const user = verifyToken(token);
  if (!user || user.role !== "student") return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 401 });

  const db = await readDb();
  const studentUser = db.users.find((u) => u.id === user.id);
  if (!studentUser?.student_id) return NextResponse.json({ success: false, error: "ไม่พบข้อมูลนักเรียน" }, { status: 404 });

  const subjectsWithSheet = db.subjects.filter((s) => s.sheet_url);
  if (subjectsWithSheet.length === 0) return NextResponse.json({ success: true, scores: [] });

  const results = await Promise.allSettled(
    subjectsWithSheet.map(async (subject) => {
      const csvUrl = sheetIdToCSV(subject.sheet_url!);
      if (!csvUrl) return null;
      const res = await fetch(csvUrl, { cache: "no-store" });
      if (!res.ok) return null;
      // decode UTF-8 properly
      const buf = await res.arrayBuffer();
      const text = new TextDecoder("utf-8").decode(buf);
      const row = findStudentRow(text, studentUser.student_id!);
      if (!row) return null;
      return {
        subject_id: subject.id,
        subject_name: subject.name,
        subject_code: subject.code,
        ...row,
      };
    })
  );

  const scores = results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<unknown>).value);

  return NextResponse.json({ success: true, scores });
}
