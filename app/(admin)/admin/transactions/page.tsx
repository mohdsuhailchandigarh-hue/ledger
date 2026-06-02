import { Metadata } from 'next';
import { adminGetAllTransactionsAction, adminForceTransactionAction } from '@/lib/actions/transaction.actions';
import AdminTransactionsClient from '@/components/admin/AdminTransactionsClient';

export const metadata: Metadata = { title: 'Transactions | Admin' };

export default async function AdminTransactionsPage() {
  const { transactions, total } = await adminGetAllTransactionsAction();
  return <AdminTransactionsClient transactions={(transactions ?? []) as any[]} total={total} />;
}
