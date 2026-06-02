import { getAdminSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin | Shared Ledger' };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect('/login?role=admin');

  return (
    <div className="sidebar-layout">
      <AdminSidebar />
      <main
        className="main-content"
        style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}
      >
        {children}
      </main>
      <AdminBottomNav />
    </div>
  );
}
