import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession, createUserSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { uploadAvatarToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let url = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('avatar');

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
      }

      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image size exceeds 8MB limit' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await uploadAvatarToCloudinary(buffer, user.id);
      url = result.url;
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      const { image } = body;
      if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
      }
      const result = await uploadAvatarToCloudinary(image, user.id);
      url = result.url;
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
    }

    // Save avatar_url to users table in database
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: url })
      .eq('id', user.id);

    if (dbError) {
      console.error('Supabase avatar update error:', dbError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Refresh session cookie
    const token = await createUserSession(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365 * 100);

    const response = NextResponse.json({ success: true, avatar_url: url });
    response.cookies.set('sl_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (err: any) {
    console.error('Error in /api/user/avatar POST:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (dbError) {
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    const token = await createUserSession(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365 * 100);

    const response = NextResponse.json({ success: true });
    response.cookies.set('sl_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (err: any) {
    console.error('Error in /api/user/avatar DELETE:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to remove profile picture' },
      { status: 500 }
    );
  }
}
