import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
<<<<<<< HEAD
=======
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { supabaseAdmin } from '@/lib/supabase/server';
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
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

<<<<<<< HEAD
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
=======
  // Get pending count for badges (only pending approvals for counterparty)
  const pendingCount = actions.filter(
    (a: any) => a.status === 'pending' && a.counterparty_id === user.id
  ).length;

  return (
    <div className="sidebar-layout">
      <GlobalPendingOverlay actions={actions as any} currentUserId={user.id} />
      <Sidebar
        user={{ name: user.name, username: user.username }}
        pendingCount={pendingCount}
      />
      <main
        className="main-content"
        style={{
          minHeight: '100dvh',
          background: 'var(--bg-base)',
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
        }}
      >
        {children}
      </main>
<<<<<<< HEAD
=======
      <BottomNav pendingCount={pendingCount} />
>>>>>>> 90955cf5404937548f44cc14d69b3374d37d4fde
    </div>
  );
}
