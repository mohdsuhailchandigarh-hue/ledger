import { getPendingActionsAction } from '@/lib/actions/transaction.actions';
import GlobalPendingOverlay from '@/components/notifications/GlobalPendingOverlay';

export default async function PendingOverlayLoader({ currentUserId }: { currentUserId: string }) {
  const { actions } = await getPendingActionsAction();
  return <GlobalPendingOverlay actions={(actions as any) || []} currentUserId={currentUserId} />;
}
