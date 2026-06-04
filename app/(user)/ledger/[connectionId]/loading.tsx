export default function LedgerLoading() {
  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header Back & Info Skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <div>
            <div className="skeleton" style={{ width: '120px', height: '1.125rem', marginBottom: '6px' }} />
            <div className="skeleton" style={{ width: '80px', height: '0.75rem' }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
      </div>

      {/* Balance Box Skeleton */}
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
        <div className="skeleton" style={{ width: '100px', height: '0.75rem', margin: '0 auto 0.75rem' }} />
        <div className="skeleton" style={{ width: '180px', height: '2.5rem', margin: '0 auto 1.5rem' }} />
        
        {/* Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: '340px', margin: '0 auto' }}>
          <div className="skeleton" style={{ height: '40px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '40px', borderRadius: '10px' }} />
        </div>
      </div>

      {/* Transaction List Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="skeleton" style={{ width: '100px', height: '1rem', marginBottom: '0.25rem' }} />
        
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton" style={{ width: '140px', height: '0.875rem' }} />
              <div className="skeleton" style={{ width: '90px', height: '0.75rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div className="skeleton" style={{ width: '70px', height: '0.875rem' }} />
              <div className="skeleton" style={{ width: '50px', height: '0.625rem' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
