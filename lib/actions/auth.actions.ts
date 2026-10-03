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


const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or phone is required'),
  password: z.string().min(1, 'Password is required'),
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
  const rawIdentifier = (formData.get('identifier') ?? formData.get('username') ?? '') as string;
  const rawPassword = (formData.get('password') ?? '') as string;
  const rawRole = (formData.get('role') ?? 'user') as string;

  const parsed = loginSchema.safeParse({
    identifier: rawIdentifier.trim(),
    password: rawPassword,
    role: rawRole,
  });

  if (!parsed.success) {
    return { error: 'Please enter your username/mobile and password.' };
  }

  const { identifier, password, role } = parsed.data;

  // ── Check if credentials match Admin ─────────────────────────
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const cleanIdentifier = identifier.trim().replace(/^@+/, '');

  if (
    adminUsername &&
    adminPassword &&
    cleanIdentifier.toLowerCase() === adminUsername.trim().replace(/^@+/, '').toLowerCase()
  ) {
    if (password === adminPassword) {
      await createAdminSession();
      redirect('/admin');
    } else {
      return { error: 'Invalid username/mobile or password' };
    }
  }

  // ── User login (by username or phone) ────────────────────────
  // 1. Try finding user by username (case-insensitive, without @)
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username, name, password_hash, is_active, phone')
    .eq('username', cleanIdentifier.toLowerCase())
    .maybeSingle();

  // 2. If not found by username, try finding user by phone
  if (!user) {
    const digitsOnly = cleanIdentifier.replace(/\D/g, '');

    // Exact phone match
    const { data: exactPhoneUser } = await supabaseAdmin
      .from('users')
      .select('id, username, name, password_hash, is_active, phone')
      .eq('phone', cleanIdentifier)
      .maybeSingle();

    if (exactPhoneUser) {
      user = exactPhoneUser;
    } else if (digitsOnly.length >= 10) {
      // Match 10-digit mobile or suffix
      const last10 = digitsOnly.slice(-10);
      const { data: suffixUser } = await supabaseAdmin
        .from('users')
        .select('id, username, name, password_hash, is_active, phone')
        .or(`phone.eq.${last10},phone.eq.+91${last10},phone.ilike.%${last10}`)
        .maybeSingle();

      if (suffixUser) {
        user = suffixUser;
      }
    }
  }

  if (!user) {
    return { error: 'Invalid username/mobile or password' };
  }

  if (!user.is_active) {
    return { error: 'Your account has been disabled. Contact admin.' };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return { error: 'Invalid username/mobile or password' };
  }

  await createUserSession(user.id);
  redirect('/dashboard');
}

// ─── Sign Up (Public Registration) ──────────────────────────
const signUpSchema = z.object({
  username: z
    .string()
    .transform((val) => val.trim().replace(/^@+/, '').toLowerCase())
    .refine((val) => val.length >= 3, 'Username must be at least 3 characters')
    .refine((val) => val.length <= 30, 'Username must be at most 30 characters')
    .refine((val) => /^[a-z0-9]+$/.test(val), 'Username can only contain lowercase letters and numbers'),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10, 'Please enter a valid 10-digit mobile number')
    .transform((val) => val.slice(-10)),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), 'Please choose a strong password'),
  confirm_password: z.string().min(1, 'Confirm password is required'),
});

export async function signUpAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    username: formData.get('username'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed' };
  }

  const { username, phone, password, confirm_password } = parsed.data;

  if (password !== confirm_password) {
    return { error: 'Passwords do not match' };
  }

  // 1. Check if username exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existingUser) {
    return { error: 'Username is already taken' };
  }

  // 2. Check if phone number already registered (match exact 10 digits or +91 format)
  const { data: existingPhone } = await supabaseAdmin
    .from('users')
    .select('id')
    .or(`phone.eq.${phone},phone.eq.+91${phone},phone.ilike.%${phone}`)
    .maybeSingle();

  if (existingPhone) {
    return { error: 'Mobile number is already registered. Please sign in.' };
  }

  // 3. Hash password and insert user
  const password_hash = await bcrypt.hash(password, 12);

  const { data: newUser, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      username,
      name: username,
      password_hash,
      phone,
      is_active: true,
      is_admin: false,
    })
    .select('id, username')
    .single();

  if (insertError || !newUser) {
    console.error('Sign up error in Supabase:', insertError);
    return { error: insertError?.message || 'Failed to create account. Please try again.' };
  }

  // Note: We do NOT auto-upgrade personal contacts silently here.
  // Both parties must connect via connection request to unlock and share the ledger.

  // 4. Establish session & redirect to dashboard
  await createUserSession(newUser.id);
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

export async function checkSignUpUsernameAction(
  username: string
): Promise<{ available: boolean; error?: string }> {
  const clean = username.trim().replace(/^@+/, '').toLowerCase();

  if (clean.length < 3) {
    return { available: false, error: 'Username must be at least 3 characters' };
  }
  if (clean.length > 30) {
    return { available: false, error: 'Username must be at most 30 characters' };
  }
  if (!/^[a-z0-9]+$/.test(clean)) {
    return { available: false, error: 'Only lowercase letters and numbers allowed' };
  }

  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase().replace(/^@+/, '');
  if (clean === adminUsername) {
    return { available: false, error: 'Username is already taken' };
  }

  try {
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', clean)
      .maybeSingle();

    if (error) {
      console.error('Error checking signup username:', error);
      return { available: false, error: 'Error checking availability' };
    }

    if (existingUser) {
      return { available: false, error: 'Username is already taken' };
    }

    return { available: true };
  } catch (err) {
    console.error('checkSignUpUsernameAction exception:', err);
    return { available: false, error: 'Error checking availability' };
  }
}

