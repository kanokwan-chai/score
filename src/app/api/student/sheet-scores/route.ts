// src/app/api/student/sheet-scores/route.ts
// Returns this student score row from the subject Sheet
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { readDb } from "@/lib/db";

function sheetIdToCSV(url: string): string {
  const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return "";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.split(","));
  const title = String(lines[0]?.[0] ?? "").trim();
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const r = lines[i];
    const code = String(r[1] ?? "").trim();
    if (!code || isNaN(Number(code))) continue;
    rows.push({
      student_code: code,
      first_name: String(r[2] ?? ""),
      last_name: String(r[3] ?? ""),
      classroom: String(r[4] ?? ""),
      assignment: Number(r[5]) || 0,
      quiz: Number(r[6]) || 0,
      final: Number(r[7]) || 0,
      behavior: Number(r[8]) || 0,
      total: Number(r[9]) || 0,
      grade: String(r[10] ?? "").trim(),
    });
  }
  return { title, rows };
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 401 });
  const user = verifyToken(token);
  if (!user || user.role !== "student") return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 401 });

  const db = await readDb();
  const studentUser = db.users.find((u) => u.id === user.id);
  if (!studentUser || !studentUser.student_id) return NextResponse.json({ success: false, error: "ไม่พบข้อมูลนักเรียน" }, { status: 404 });

  const subjectsWithSheet = db.subjects.filter((s) => s.sheet_url);

  const results = await Promise.allSettled(
    subjectsWithSheet.map(async (subject) => {
      const csvUrl = sheetIdToCSV(subject.sheet_url!);
      if (!csvUrl) return null;
      const res = await fetch(csvUrl, { cache: "no-store" });
      if (!res.ok) return null;
      const text = await res.text();
      const { title, rows } = parseCSV(text);
      const myRow = rows.find((r) => r.student_code === studentUser.student_id);
      if (!myRow) return null;
      return {
        subject_id: subject.id,
        subject_name: subject.name,
        subject_code: subject.code,
        sheet_title: title,
        ...myRow,
      };
    })
  );

  const scores = results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<unknown>).value);

  return NextResponse.json({ success: true, scores });
}
