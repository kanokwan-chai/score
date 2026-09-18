// src/app/api/admin/scores/sheet-proxy/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { readDb, writeDb } from "@/lib/db";

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  const user = verifyToken(token);
  if (!user) return null;
  return user;
}

function sheetIdToCSV(url: string): string {
  const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return "";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
}

function parseCSVText(text: string) {
  // strip BOM if present
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/);
  const title = lines[0]?.split(",")[0]?.trim() ?? "";
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const code = (cols[1] ?? "").trim();
    if (!code || isNaN(Number(code))) continue;
    rows.push({
      no: Number(cols[0]) || i - 1,
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
    });
  }
  return { title, rows };
}

// GET /api/admin/scores/sheet-proxy?subject_id=xxx
export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // decode explicitly as UTF-8 to avoid mojibake
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buf);
    const { title, rows } = parseCSVText(text);
    return NextResponse.json({ success: true, title, rows, subject_name: subject.name, subject_code: subject.code });
  } catch (e) {
    console.error("sheet-proxy error:", e);
    return NextResponse.json({ success: false, error: "ดึงข้อมูลจาก Google Sheet ไม่ได้ ตรวจสอบ URL และสิทธิ์การแชร์" }, { status: 502 });
  }
}

// PATCH — save sheet_url for a subject
export async function PATCH(request: Request) {
  const user = await checkAuth();
  if (!user || user.role !== "admin") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { subject_id, sheet_url } = await request.json();
  if (!subject_id) return NextResponse.json({ success: false, error: "ไม่ระบุวิชา" }, { status: 400 });

  const db = await readDb();
  const idx = db.subjects.findIndex((s) => s.id === subject_id);
  if (idx === -1) return NextResponse.json({ success: false, error: "ไม่พบวิชา" }, { status: 404 });

  db.subjects[idx].sheet_url = (sheet_url ?? "").trim();
  await writeDb(db);
  return NextResponse.json({ success: true });
}
