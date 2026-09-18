export const dynamic = 'force-dynamic';
export const revalidate = 0;
// src/app/api/admin/scores/sheet-proxy/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { readDb, writeDb } from "@/lib/db";

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

function extractSheetId(url: string): string {
  const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : "";
}

// Use Google Visualization (gviz) JSON API â€” handles Unicode correctly
async function fetchSheetData(sheetId: string) {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(gvizUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.text();
  // Strip JSONP wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonStr = raw.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, "");
  const data = JSON.parse(jsonStr);

  if (data.status !== "ok") throw new Error("gviz error: " + data.status);

  const table = data.table;
  // row 0 = à¸Šà¸·à¹ˆà¸­à¸§à¸´à¸Šà¸² (from cell A1), row 1 = header, row 2+ = student data
  const getCell = (row: any, col: number): string => {
    const c = row?.c?.[col];
    if (!c) return "";
    return c.f ?? (c.v !== null && c.v !== undefined ? String(c.v) : "");
  };

  const title = getCell(table.rows[0], 0).trim() || "à¸ªà¸£à¸¸à¸›à¸„à¸°à¹à¸™à¸™";
  const rows = [];

  for (let i = 0; i < table.rows.length; i++) {
    const r = table.rows[i];
    const code = getCell(r, 1).trim();
    if (!code || isNaN(Number(code))) continue;
    rows.push({
      no: Number(getCell(r, 0)) || i - 1,
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
  if (!subjectId) return NextResponse.json({ success: false, error: "à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸§à¸´à¸Šà¸²" }, { status: 400 });

  const db = await readDb();
  const subject = db.subjects.find((s) => s.id === subjectId);
  if (!subject?.sheet_url) {
    return NextResponse.json({ success: false, error: "à¸§à¸´à¸Šà¸²à¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ Google Sheet URL" }, { status: 404 });
  }

  const sheetId = extractSheetId(subject.sheet_url);
  if (!sheetId) return NextResponse.json({ success: false, error: "URL à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡" }, { status: 400 });

  try {
    const { title, rows } = await fetchSheetData(sheetId);
    return NextResponse.json({ success: true, title, rows, subject_name: subject.name, subject_code: subject.code });
  } catch (e) {
    console.error("sheet-proxy error:", e);
    return NextResponse.json({ success: false, error: "à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸²à¸ Google Sheet à¹„à¸¡à¹ˆà¹„à¸”à¹‰ à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š URL à¹à¸¥à¸°à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸à¸²à¸£à¹à¸Šà¸£à¹Œ (Anyone with the link)" }, { status: 502 });
  }
}

// PATCH â€” save sheet_url
export async function PATCH(request: Request) {
  const user = await checkAuth();
  if (!user || user.role !== "admin") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { subject_id, sheet_url } = await request.json();
  if (!subject_id) return NextResponse.json({ success: false, error: "à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸§à¸´à¸Šà¸²" }, { status: 400 });

  const db = await readDb();
  const idx = db.subjects.findIndex((s) => s.id === subject_id);
  if (idx === -1) return NextResponse.json({ success: false, error: "à¹„à¸¡à¹ˆà¸žà¸šà¸§à¸´à¸Šà¸²" }, { status: 404 });

  db.subjects[idx].sheet_url = (sheet_url ?? "").trim();
  await writeDb(db);
  return NextResponse.json({ success: true });
}

