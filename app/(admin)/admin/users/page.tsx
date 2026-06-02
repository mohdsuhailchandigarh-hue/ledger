import { Metadata } from 'next';
import { adminGetAllUsersAction } from '@/lib/actions/admin.actions';
import UsersClient from '@/components/admin/UsersClient';

export const metadata: Metadata = { title: 'Users | Admin' };

export default async function AdminUsersPage() {
  const { users } = await adminGetAllUsersAction();
  return <UsersClient users={(users ?? []) as any[]} />;
}
