import { redirect } from 'next/navigation';
import { getUserFromSession, getAdminSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [isAdmin, user] = await Promise.all([
    getAdminSession(),
    getUserFromSession(),
  ]);

  if (isAdmin) redirect('/admin');
  if (user) redirect('/dashboard');

  redirect('/login');
}
