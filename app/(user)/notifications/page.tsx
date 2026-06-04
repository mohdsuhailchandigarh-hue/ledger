import { Metadata } from 'next';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getPendingActionsAction } from '@/lib/actions/transaction.actions';
import NotificationsClient from '@/components/notifications/NotificationsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Approvals | Shared Ledger' };

export default async function NotificationsPage() {
  const user = await getUserFromSession();
  if (!user) redirect('/login');

  const { actions } = await getPendingActionsAction();

  return (
    <NotificationsClient
      approvals={(actions ?? []) as any[]}
      currentUserId={user.id}
    />
  );
}
