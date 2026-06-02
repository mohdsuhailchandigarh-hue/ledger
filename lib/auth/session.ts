import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import crypto from 'crypto';

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  is_admin: boolean;
  is_active: boolean;
};

export type AdminSession = {
  type: 'admin';
  username: string;
};

export type UserSession = {
  type: 'user';
  user: SessionUser;
};

export type Session = AdminSession | UserSession | null;

const SESSION_COOKIE = 'sl_session';
const ADMIN_COOKIE = 'sl_admin_session';
const SESSION_DURATION_DAYS = 365 * 100; // 100 years

// ─── Token Generation ────────────────────────────────────────
export function generateToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

// ─── User Session ────────────────────────────────────────────
export async function createUserSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await supabaseAdmin.from('sessions').insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

export async function getUserFromSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await supabaseAdmin.from('sessions').delete().eq('token', token);
    return null;
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username, name, is_admin, is_active')
    .eq('id', session.user_id)
    .single();

  if (!user || !user.is_active) return null;
  return user as SessionUser;
}

export async function deleteUserSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await supabaseAdmin.from('sessions').delete().eq('token', token);
    cookieStore.delete(SESSION_COOKIE);
  }
}

// ─── Admin Cryptographic Session Helpers ──────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-123456';

function signToken(payload: string): string {
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  if (signature !== expectedSignature) return null;
  return payload;
}

// ─── Admin Session ────────────────────────────────────────────
export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const username = process.env.ADMIN_USERNAME || 'admin';
  const expiresAt = Date.now() + 60 * 60 * 24 * 365 * 100 * 1000; // 100 years
  const payload = `${username}:${expiresAt}`;
  const token = signToken(payload);

  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 100, // 100 years
  });
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  const payload = verifyToken(token);
  if (!payload) return false;

  const [username, expiresAtStr] = payload.split(':');
  if (username !== (process.env.ADMIN_USERNAME || 'admin')) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || expiresAt < Date.now()) return false;

  return true;
}

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

// ─── Get any session ────────────────────────────────────────
export async function getSession(): Promise<Session> {
  const isAdmin = await getAdminSession();
  if (isAdmin) {
    return {
      type: 'admin',
      username: process.env.ADMIN_USERNAME ?? 'admin',
    };
  }

  const user = await getUserFromSession();
  if (user) {
    return { type: 'user', user };
  }

  return null;
}

// ─── Cleanup expired sessions (run periodically) ─────────────
export async function cleanupExpiredSessions(): Promise<void> {
  await supabaseAdmin
    .from('sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());
}
