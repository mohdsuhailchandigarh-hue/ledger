import LedgerSkeleton from '@/components/ledger/LedgerSkeleton';

export default function LedgerLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-base)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <LedgerSkeleton />
    </div>
  );
}
