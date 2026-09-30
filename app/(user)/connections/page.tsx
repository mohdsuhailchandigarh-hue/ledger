import { Metadata } from 'next';
import { getUserFromSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getMyConnectionsAction, getPendingRequestsAction } from '@/lib/actions/connection.actions';
import ConnectionsClient from '@/components/connections/ConnectionsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Connections | Shared Ledger' };

export default async function ConnectionsPage() {
  const user = await getUserFromSession();
  if (!user) redirect('/login');

  const [connectionsResult, requestsResult] = await Promise.all([
    getMyConnectionsAction(),
    getPendingRequestsAction(),
  ]);

  return (
    <ConnectionsClient
      currentUserId={user.id}
      pendingRequests={(requestsResult.requests ?? []) as any[]}
      connections={(connectionsResult.connections ?? []) as any[]}
    />
  );
}
