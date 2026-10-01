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
