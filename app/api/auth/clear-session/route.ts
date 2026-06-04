import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('sl_session');

  const url = new URL(request.url);
  const loginUrl = new URL('/login?expired=1', url.origin);

  return NextResponse.redirect(loginUrl);
}
