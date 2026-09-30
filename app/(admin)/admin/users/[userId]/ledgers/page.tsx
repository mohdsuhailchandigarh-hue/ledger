import { Metadata } from 'next';
import { adminGetUserConnectionsAction } from '@/lib/actions/admin.actions';
import AdminUserLedgersClient from '@/components/admin/AdminUserLedgersClient';
import { notFound } from 'next/navigation';

type Params = Promise<{ userId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { userId } = await params;
  return { title: `User Ledgers | Admin` };
}

export default async function AdminUserLedgersPage({ params }: { params: Params }) {
  const { userId } = await params;
  const data = await adminGetUserConnectionsAction(userId);

  if (data.error || !data.user) {
    notFound();
  }

  return (
    <AdminUserLedgersClient
      user={data.user as any}
      connections={(data.connections ?? []) as any[]}
    />
  );
}
