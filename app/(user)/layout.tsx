import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getPendingActionsAction } from '@/lib/actions/transaction.actions';
import GlobalPendingOverlay from '@/components/notifications/GlobalPendingOverlay';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();
  if (!user) redirect('/login');

  const { actions } = await getPendingActionsAction();

  return (
    <div style={{ width: '100%', minHeight: '100dvh' }}>
      <GlobalPendingOverlay actions={actions as any} currentUserId={user.id} />
      <main
        style={{
          minHeight: '100dvh',
          background: 'var(--bg-base)',
          width: '100%',
          boxSizing: 'border-box',
          paddingBottom: '5rem',
        }}
      >
        {children}
      </main>
    </div>
  );
}
