// src/app/api/student/sheet-scores/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { readDb } from "@/lib/db";

function extractSheetId(url: string): string {
  const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : "";
}

async function findMyRow(sheetId: string, studentCode: string) {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(gvizUrl, { cache: "no-store" });
  if (!res.ok) return null;
  const raw = await res.text();
  const jsonStr = raw.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, "");
  const data = JSON.parse(jsonStr);
  if (data.status !== "ok") return null;

  const table = data.table;
  const getCell = (row: any, col: number): string => {
    const c = row?.c?.[col];
    if (!c) return "";
    return c.f ?? (c.v !== null && c.v !== undefined ? String(c.v) : "");
  };

  const title = getCell(table.rows[0], 0).trim() || "สรุปคะแนน";

  for (let i = 0; i < table.rows.length; i++) {
    const r = table.rows[i];
    const code = getCell(r, 1).trim();
    if (code !== studentCode) continue;
    return {
      title,
      student_code: code,
      first_name: getCell(r, 2).trim(),
      last_name: getCell(r, 3).trim(),
      classroom: getCell(r, 4).trim(),
      assignment: Number(getCell(r, 5)) || 0,
      quiz: Number(getCell(r, 6)) || 0,
      final: Number(getCell(r, 7)) || 0,
      behavior: Number(getCell(r, 8)) || 0,
      total: Number(getCell(r, 9)) || 0,
      grade: getCell(r, 10).trim(),
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
      const sheetId = extractSheetId(subject.sheet_url!);
      if (!sheetId) return null;
      const row = await findMyRow(sheetId, studentUser.student_id!);
      if (!row) return null;
      return { subject_id: subject.id, subject_name: subject.name, subject_code: subject.code, ...row };
    })
  );

  const scores = results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<unknown>).value);

  return NextResponse.json({ success: true, scores });
}
