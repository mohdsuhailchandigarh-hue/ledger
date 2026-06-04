import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'sl_session';
const ADMIN_COOKIE = 'sl_admin_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-123456';

// Stateless Web Crypto HMAC-SHA256 verification (100% compatible with Edge & Node environments)
async function verifyHmacToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert hex signature back to Uint8Array bytes
    const sigBytes = signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16));
    if (!sigBytes) return false;
    const sigBuf = new Uint8Array(sigBytes);

    return await crypto.subtle.verify('HMAC', key, sigBuf, data);
  } catch (e) {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const userSession = req.cookies.get(SESSION_COOKIE)?.value;
  const adminSession = req.cookies.get(ADMIN_COOKIE)?.value;

  let isUserAuth = false;
  let isAdminAuth = false;

  const response = NextResponse.next();
  let cookiesCleared = false;

  // Statelessly verify the cookie signatures in the middleware
  if (userSession) {
    const isValid = await verifyHmacToken(userSession, SESSION_SECRET);
    if (isValid) {
      isUserAuth = true;
    } else {
      // Clear invalid cookie to prevent infinite redirect loops on project restart or secret rotation
      response.cookies.delete(SESSION_COOKIE);
      cookiesCleared = true;
    }
  }

  if (adminSession) {
    const isValid = await verifyHmacToken(adminSession, SESSION_SECRET);
    if (isValid) {
      isAdminAuth = true;
    } else {
      response.cookies.delete(ADMIN_COOKIE);
      cookiesCleared = true;
    }
  }

  // ── Admin routes ────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!isAdminAuth) {
      const redirectRes = NextResponse.redirect(new URL('/login?role=admin', req.url));
      if (cookiesCleared) redirectRes.cookies.delete(ADMIN_COOKIE);
      return redirectRes;
    }
    return response;
  }

  // ── Protected user routes ───────────────────────────────────
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/ledger') ||
    pathname.startsWith('/connections') ||
    pathname.startsWith('/notifications')
  ) {
    if (!isUserAuth) {
      const redirectRes = NextResponse.redirect(new URL('/login', req.url));
      if (cookiesCleared) redirectRes.cookies.delete(SESSION_COOKIE);
      return redirectRes;
    }
    return response;
  }

  // ── Login redirect if already authenticated ─────────────────
  // Exception: allow authenticated users through to /login when tab=change
  // so they can self-service update their password from the sidebar/bottom nav.
  const tab = req.nextUrl.searchParams.get('tab');
  if ((pathname === '/login' || pathname === '/') && tab !== 'change') {
    if (isAdminAuth) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (isUserAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp).*)',
  ],
};
