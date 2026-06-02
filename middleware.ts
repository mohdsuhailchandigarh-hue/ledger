import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const userSession = req.cookies.get('sl_session')?.value;
  const adminSession = req.cookies.get('sl_admin_session')?.value;

  const isUserAuth = !!userSession;
  const isAdminAuth = !!adminSession;

  // ── Admin routes ────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!isAdminAuth) {
      return NextResponse.redirect(new URL('/login?role=admin', req.url));
    }
    return NextResponse.next();
  }

  // ── Protected user routes ───────────────────────────────────
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/ledger') ||
    pathname.startsWith('/connections') ||
    pathname.startsWith('/notifications')
  ) {
    if (!isUserAuth) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // ── Login redirect if already authed ────────────────────────
  if (pathname === '/login' || pathname === '/') {
    if (isAdminAuth) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (isUserAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp).*)',
  ],
};
