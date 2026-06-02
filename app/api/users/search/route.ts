import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getUserFromSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ users: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ users: [] });

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, username, name, avatar_url')
    .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
    .neq('id', user.id)
    .eq('is_active', true)
    .limit(8);

  return NextResponse.json({ users: data ?? [] });
}
