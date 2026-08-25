// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  
  // Clear cookie
  response.cookies.set('session_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });

  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', 'http://localhost:3000')); // fallback
  response.cookies.set('session_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  return response;
}
