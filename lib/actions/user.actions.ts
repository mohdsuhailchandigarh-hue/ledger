'use server';

import { revalidatePath } from 'next/cache';
import { getUserFromSession, createUserSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { uploadAvatarToCloudinary } from '@/lib/cloudinary';

export async function uploadAvatarAction(formData: FormData): Promise<{ error?: string; success?: boolean; avatarUrl?: string }> {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return { error: 'You must be logged in to update your avatar' };
    }

    const file = formData.get('avatar');
    if (!file) {
      return { error: 'No image file provided' };
    }

    let url = '';

    if (typeof file === 'string') {
      // Base64 data URL
      if (!file.startsWith('data:image/')) {
        return { error: 'Invalid image format' };
      }
      const result = await uploadAvatarToCloudinary(file, user.id);
      url = result.url;
    } else if (file instanceof Blob || (file as any) instanceof File) {
      const blob = file as Blob;
      if (!blob.type.startsWith('image/')) {
        return { error: 'Uploaded file must be an image' };
      }
      if (blob.size > 8 * 1024 * 1024) {
        return { error: 'Image size must be less than 8MB' };
      }
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await uploadAvatarToCloudinary(buffer, user.id);
      url = result.url;
    } else {
      return { error: 'Unsupported file payload' };
    }

    // Update in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: url })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user avatar_url in DB:', updateError);
      return { error: 'Failed to save avatar to profile' };
    }

    // Refresh session cookie
    await createUserSession(user.id);
    revalidatePath('/', 'layout');

    return { success: true, avatarUrl: url };
  } catch (err: any) {
    console.error('uploadAvatarAction error:', err);
    return { error: err?.message || 'Failed to upload profile picture' };
  }
}

export async function removeAvatarAction(): Promise<{ error?: string; success?: boolean }> {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return { error: 'You must be logged in to update your avatar' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (updateError) {
      return { error: 'Failed to remove avatar' };
    }

    await createUserSession(user.id);
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err: any) {
    console.error('removeAvatarAction error:', err);
    return { error: err?.message || 'Failed to remove profile picture' };
  }
}

export async function checkUsernameAvailabilityAction(
  rawUsername: string
): Promise<{
  available: boolean;
  isCurrent?: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return { available: false, error: 'Unauthorized' };
    }

    const clean = rawUsername.trim().replace(/^@+/, '').toLowerCase();

    // Validate length and format
    if (clean.length === 0) {
      return { available: false, error: 'Username cannot be empty' };
    }
    if (clean.length < 3) {
      return { available: false, error: 'Username must be at least 3 characters' };
    }
    if (clean.length > 30) {
      return { available: false, error: 'Username must be at most 30 characters' };
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      return { available: false, error: 'Only lowercase letters, numbers, and underscores allowed' };
    }

    // Check if it's the current user's username
    if (clean === user.username.toLowerCase()) {
      return { available: true, isCurrent: true, message: 'Current username' };
    }

    // Check if reserved (admin username)
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    if (clean === adminUsername) {
      return { available: false, error: 'This username is reserved' };
    }

    // Check in database for any user matching this username
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', clean)
      .neq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking username availability:', error);
      return { available: false, error: 'Error checking availability' };
    }

    if (existingUser) {
      return { available: false, error: 'Username is already taken' };
    }

    return { available: true, message: 'Username is available' };
  } catch (err: any) {
    console.error('checkUsernameAvailabilityAction exception:', err);
    return { available: false, error: err?.message || 'Server error' };
  }
}

export async function updateProfileNameAndUsernameAction(data: {
  name: string;
  username: string;
}): Promise<{
  success?: boolean;
  error?: string;
  name?: string;
  username?: string;
}> {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return { error: 'You must be logged in to update your profile' };
    }

    const cleanName = (data.name || '').trim();
    if (!cleanName || cleanName.length < 1) {
      return { error: 'Display name cannot be empty' };
    }
    if (cleanName.length > 50) {
      return { error: 'Display name must be at most 50 characters' };
    }

    const cleanUsername = (data.username || '').trim().replace(/^@+/, '').toLowerCase();
    if (cleanUsername.length < 3) {
      return { error: 'Username must be at least 3 characters' };
    }
    if (cleanUsername.length > 30) {
      return { error: 'Username must be at most 30 characters' };
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return { error: 'Username can only contain lowercase letters, numbers, and underscores' };
    }

    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    if (cleanUsername === adminUsername) {
      return { error: 'This username is reserved' };
    }

    // If username is changing, verify it's not taken by another user
    if (cleanUsername !== user.username.toLowerCase()) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle();

      if (existingUser) {
        return { error: 'Username is already taken' };
      }
    }

    // Update in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        name: cleanName,
        username: cleanUsername,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user profile in DB:', updateError);
      return { error: updateError.message || 'Failed to update profile' };
    }

    // Refresh session cookie
    await createUserSession(user.id);
    revalidatePath('/', 'layout');

    return {
      success: true,
      name: cleanName,
      username: cleanUsername,
    };
  } catch (err: any) {
    console.error('updateProfileNameAndUsernameAction error:', err);
    return { error: err?.message || 'Failed to update profile' };
  }
}

