// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth-token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip API routes, static assets, and Next.js internals
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') || 
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next();
  }

  // Get session token
  const token = request.cookies.get('session_token')?.value;
  const user = token ? verifyToken(token) : null;

  // Protected paths
  const isAdminPath = pathname.startsWith('/admin');
  const isStudentPath = pathname.startsWith('/student');
  const isAuthPath = pathname === '/login' || pathname === '/register' || pathname === '/';

  // 1. Not logged in
  if (!user) {
    if (isAdminPath || isStudentPath) {
      // Redirect to login if trying to access protected paths
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    // Let user proceed to login/register or public files
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 2. Logged in - check authorization
  if (user.role === 'admin') {
    // Admin trying to access student portal or login/register pages
    if (isStudentPath || isAuthPath) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  } else if (user.role === 'student') {
    // Student trying to access admin portal or login/register pages
    if (isAdminPath || isAuthPath) {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// Configure which paths middleware should run on
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
