// src/app/api/public/classrooms/route.ts
import { NextResponse } from 'next/server';
import { readDb, ensureDbSynced } from '@/lib/db';

export async function GET() {
    await ensureDbSynced();
  try {
    const db = await readDb();
    
    // Sort classrooms by name
    const sortedClassrooms = [...db.classrooms].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    
    return NextResponse.json({
      success: true,
      classrooms: sortedClassrooms
    });
  } catch (error) {
    console.error('Public classrooms API error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการโหลดห้องเรียน' },
      { status: 500 }
    );
  }
}
