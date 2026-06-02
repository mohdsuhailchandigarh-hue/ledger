import { Metadata } from 'next';
import { adminGetConnectionTransactionsAction } from '@/lib/actions/admin.actions';
import AdminLedgerTimelineClient from '@/components/admin/AdminLedgerTimelineClient';
import { notFound } from 'next/navigation';

type Params = Promise<{ userId: string; connectionId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: 'Ledger History | Admin' };
}

export default async function AdminUserLedgerDetailPage({ params }: { params: Params }) {
  const { userId, connectionId } = await params;
  const data = await adminGetConnectionTransactionsAction(connectionId);

  if (data.error || !data.connection) {
    notFound();
  }

  return (
    <AdminLedgerTimelineClient
      userId={userId}
      connection={data.connection as any}
      transactions={(data.transactions ?? []) as any[]}
    />
  );
}
