import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import crypto from 'crypto';
import { cache } from 'react';

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
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
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-123456';

// ─── Token Signing & Verification ───────────────────────────
function signToken(payload: string): string {
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!payload || !signature) return null;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  if (signature !== expectedSignature) return null;
  return payload;
}

// ─── User Session ────────────────────────────────────────────
export async function createUserSession(userId: string): Promise<string> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username, name, avatar_url, phone, is_admin, is_active')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  const payload = JSON.stringify(user);
  const token = signToken(payload);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  // Maintain DB session record
  try {
    await supabaseAdmin.from('sessions').upsert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Failed to save session to DB:', err);
  }

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

// Wrap session retrieval in React cache() to prevent duplicate database or cryptographic parsing on a single request
export const getUserFromSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  let user: SessionUser | null = null;
  try {
    user = JSON.parse(payload) as SessionUser;
  } catch (e) {
    return null;
  }

  if (!user || !user.is_active) return null;

  // Fallback if avatar_url or phone is missing in cached session cookie payload
  if (user.avatar_url === undefined || user.phone === undefined) {
    try {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('avatar_url, phone')
        .eq('id', user.id)
        .single();
      if (user.avatar_url === undefined) user.avatar_url = dbUser?.avatar_url ?? null;
      if (user.phone === undefined) user.phone = dbUser?.phone ?? null;
    } catch {
      if (user.avatar_url === undefined) user.avatar_url = null;
      if (user.phone === undefined) user.phone = null;
    }
  }

  // Hybrid session check: verify active session in DB on full navigations/page refreshes
  // (Skip DB hit during Server Actions to keep interactions fast)
  const reqHeaders = await headers();
  const isServerAction = reqHeaders.has('next-action');

  if (!isServerAction) {
    try {
      const { data: dbSession, error } = await supabaseAdmin
        .from('sessions')
        .select('user_id')
        .eq('token', token)
        .maybeSingle();

      if (error) {
        // Transient network or DB error: do not invalidate valid cryptographic HMAC session!
        console.warn('[getUserFromSession] DB session lookup non-fatal error:', error.message);
      } else if (!dbSession) {
        // Check if user was explicitly deactivated in the database
        const { data: dbUser } = await supabaseAdmin
          .from('users')
          .select('is_active')
          .eq('id', user.id)
          .maybeSingle();

        if (dbUser && !dbUser.is_active) {
          redirect('/api/auth/clear-session');
        }

        // Auto-heal session record in DB without throwing error
        void (async () => {
          try {
            await supabaseAdmin.from('sessions').upsert({
              user_id: user.id,
              token,
              expires_at: new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1000).toISOString(),
            });
          } catch {}
        })();
      }
    } catch (err: any) {
      if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
      console.warn('[getUserFromSession] Non-fatal check error:', err);
    }
  }

  return user;
});

export async function deleteUserSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    // Delete database session in background without blocking response
    (async () => {
      try {
        await supabaseAdmin.from('sessions').delete().eq('token', token);
      } catch (e) {}
    })();
    cookieStore.delete(SESSION_COOKIE);
  }
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

export const getAdminSession = cache(async (): Promise<boolean> => {
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
});

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

// ─── Get any session ────────────────────────────────────────
export const getSession = cache(async (): Promise<Session> => {
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
});

// ─── Cleanup expired sessions (run periodically) ─────────────
export async function cleanupExpiredSessions(): Promise<void> {
  await supabaseAdmin
    .from('sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());
}
