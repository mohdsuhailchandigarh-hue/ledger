import { Metadata } from 'next';
import { Suspense } from 'react';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import DashboardData from '@/components/dashboard/DashboardData';
import DashboardSkeletonContent from '@/components/dashboard/DashboardSkeletonContent';

export const metadata: Metadata = { title: 'Dashboard | Shared Ledger' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getUserFromSession();
  if (!user) redirect('/login');

  return (
    <>
      {/* Permanent Fixed/Sticky Top Bar attached flush to top with Windows 11 acrylic blur */}
      <DashboardTopBar
        userName={user.name}
        userUsername={user.username}
        avatarUrl={user.avatar_url}
        greeting={getGreeting()}
        pendingActions={0}
        netPosition={0}
        monthlyNet={0}
      />

      <div
        style={{
          padding: '0 clamp(0.875rem, 2.5vw, 2rem) 4rem',
          maxWidth: '1400px',
          width: '100%',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
      >
        {/* Instant Skeleton Loading with React Suspense Stream */}
        <Suspense fallback={<DashboardSkeletonContent />}>
          <DashboardData user={user} />
        </Suspense>
      </div>
    </>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
