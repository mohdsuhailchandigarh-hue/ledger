import { redirect } from 'next/navigation';
import { getUserFromSession, getAdminSession } from '@/lib/auth/session';

export default async function HomePage() {
  const isAdmin = await getAdminSession();
  if (isAdmin) redirect('/admin');

  const user = await getUserFromSession();
  if (user) redirect('/dashboard');

  redirect('/login');
}
