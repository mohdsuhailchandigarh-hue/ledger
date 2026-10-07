import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import PendingOverlayLoader from '@/components/notifications/PendingOverlayLoader';
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

  return (
    <div style={{ width: '100%', minHeight: '100dvh' }}>
      <Suspense fallback={null}>
        <PendingOverlayLoader currentUserId={user.id} />
      </Suspense>
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
