// src/app/api/admin/scores/sheet-proxy/route.ts
// Fetch Google Sheet CSV server-side (avoids CORS) and return parsed rows
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { readDb, writeDb } from "@/lib/db";

async function checkAuth(role: "admin" | "student" | "any" = "any") {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  const user = verifyToken(token);
  if (!user) return null;
  if (role !== "any" && user.role !== role) return null;
  return user;
}

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
      no: Number(r[0]) || i - 1,
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

// GET /api/admin/scores/sheet-proxy?subject_id=xxx
export async function GET(request: Request) {
  const user = await checkAuth("any");
  if (!user) return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subject_id");
  if (!subjectId) return NextResponse.json({ success: false, error: "ไม่ระบุวิชา" }, { status: 400 });

  const db = await readDb();
  const subject = db.subjects.find((s) => s.id === subjectId);
  if (!subject?.sheet_url) {
    return NextResponse.json({ success: false, error: "วิชานี้ยังไม่มี Google Sheet URL" }, { status: 404 });
  }

  const csvUrl = sheetIdToCSV(subject.sheet_url);
  if (!csvUrl) return NextResponse.json({ success: false, error: "URL ไม่ถูกต้อง" }, { status: 400 });

  try {
    const res = await fetch(csvUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    const text = await res.text();
    const { title, rows } = parseCSV(text);
    return NextResponse.json({ success: true, title, rows, subject_name: subject.name, subject_code: subject.code });
  } catch {
    return NextResponse.json({ success: false, error: "ดึงข้อมูลจาก Google Sheet ไม่ได้ กรุณาตรวจสอบ URL และสิทธิ์การแชร์" }, { status: 502 });
  }
}

// PATCH /api/admin/scores/sheet-proxy  — set sheet_url for a subject
export async function PATCH(request: Request) {
  const user = await checkAuth("admin");
  if (!user) return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 401 });

  const { subject_id, sheet_url } = await request.json();
  if (!subject_id) return NextResponse.json({ success: false, error: "ไม่ระบุวิชา" }, { status: 400 });

  const db = await readDb();
  const idx = db.subjects.findIndex((s) => s.id === subject_id);
  if (idx === -1) return NextResponse.json({ success: false, error: "ไม่พบวิชา" }, { status: 404 });

  db.subjects[idx].sheet_url = (sheet_url || "").trim();
  await writeDb(db);
  return NextResponse.json({ success: true, message: "บันทึก URL สำเร็จ" });
}
