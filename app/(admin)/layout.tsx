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
  // Temporary environment variable audit for production debugging
  const REQUIRED_VARS = [
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'SESSION_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const auditResult: Record<string, string> = {};
  const undefinedVars: string[] = [];

  REQUIRED_VARS.forEach((v) => {
    const val = process.env[v];
    if (val && val.trim() !== '') {
      auditResult[v] = `DEFINED (length: ${val.length})`;
    } else {
      auditResult[v] = 'UNDEFINED';
      undefinedVars.push(v);
    }
  });

  console.log('[ADMIN AUDIT] Environment Variables Status:', auditResult);
  if (undefinedVars.length > 0) {
    console.error('[ADMIN AUDIT] [ERROR] The following env variables are UNDEFINED:', undefinedVars);
  }

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
