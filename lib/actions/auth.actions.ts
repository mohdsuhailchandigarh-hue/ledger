'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  createUserSession,
  createAdminSession,
  deleteUserSession,
  deleteAdminSession,
} from '@/lib/auth/session';
import { z } from 'zod';
import { upgradePersonalContactsForPhone } from './connection.actions';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(['user', 'admin']).default('user'),
});

export type AuthState = {
  error?: string;
  success?: boolean;
};

// ─── Login ───────────────────────────────────────────────────
export async function loginAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    role: formData.get('role') ?? 'user',
  });

  if (!parsed.success) {
    return { error: 'Invalid credentials format' };
  }

  const { username, password, role } = parsed.data;

  // ── Admin login ──────────────────────────────────────────────
  if (role === 'admin') {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return { error: 'Admin credentials not configured' };
    }

    if (username !== adminUsername || password !== adminPassword) {
      return { error: 'Invalid admin credentials' };
    }

    await createAdminSession();
    redirect('/admin');
  }

  // ── User login ───────────────────────────────────────────────
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, username, name, password_hash, is_active')
    .eq('username', username.toLowerCase().trim())
    .single();

  if (error || !user) {
    return { error: 'Invalid username or password' };
  }

  if (!user.is_active) {
    return { error: 'Your account has been disabled. Contact admin.' };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return { error: 'Invalid username or password' };
  }

  await createUserSession(user.id);
  redirect('/dashboard');
}

// ─── Logout ──────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  await deleteUserSession();
  redirect('/login');
}

export async function adminLogoutAction(): Promise<void> {
  await deleteAdminSession();
  redirect('/login?role=admin');
}

// ─── Register (admin creates users) ──────────────────────────
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export async function createUserAction(formData: FormData): Promise<{ error?: string; user?: { id: string; username: string } }> {
  const parsed = registerSchema.safeParse({
    username: formData.get('username'),
    name: formData.get('name'),
    password: formData.get('password'),
    phone: formData.get('phone') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed' };
  }

  const { username, name, password, phone } = parsed.data;

  // Check if username exists
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username.toLowerCase())
    .single();

  if (existing) {
    return { error: 'Username already taken' };
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      username: username.toLowerCase(),
      name,
      password_hash,
      phone,
    })
    .select('id, username')
    .single();

  if (error || !user) {
    console.error("Create user failed in Supabase:", error);
    return { error: error?.message || 'Failed to create user' };
  }

  // Check if any existing personal contacts match this phone number
  if (phone) {
    await upgradePersonalContactsForPhone(phone, user.id);
  }

  return { user };
}

export async function resetPasswordAction(userId: string, newPassword: string): Promise<{ error?: string }> {
  if (newPassword.length < 6) return { error: 'Password too short' };

  const password_hash = await bcrypt.hash(newPassword, 12);
  const { error } = await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', userId);

  if (error) return { error: 'Failed to reset password' };

  // Invalidate all sessions for this user
  await supabaseAdmin.from('sessions').delete().eq('user_id', userId);

  return {};
}

export async function toggleUserStatusAction(userId: string, isActive: boolean): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) return { error: 'Failed to update user status' };

  if (!isActive) {
    await supabaseAdmin.from('sessions').delete().eq('user_id', userId);
  }

  return {};
}

export async function changePasswordAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const username = formData.get('username') as string;
  const oldPassword = formData.get('old_password') as string;
  const newPassword = formData.get('new_password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  if (!username || !oldPassword || !newPassword || !confirmPassword) {
    return { error: 'All fields are required' };
  }
  if (newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters' };
  }
  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match' };
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, password_hash, is_active')
    .eq('username', username.toLowerCase().trim())
    .single();

  if (error || !user) return { error: 'User not found' };
  if (!user.is_active) return { error: 'Account is disabled. Contact admin.' };

  const passwordMatch = await bcrypt.compare(oldPassword, user.password_hash);
  if (!passwordMatch) return { error: 'Current password is incorrect' };

  const newHash = await bcrypt.hash(newPassword, 12);
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash: newHash })
    .eq('id', user.id);

  if (updateError) return { error: 'Failed to update password. Try again.' };

  // Invalidate all existing sessions — user must re-login on every device
  await supabaseAdmin.from('sessions').delete().eq('user_id', user.id);

  return { success: true };
}
