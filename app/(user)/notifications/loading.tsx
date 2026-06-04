export default function ApprovalsLoading() {
  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="skeleton" style={{ width: '130px', height: '1.75rem', marginBottom: '8px' }} />
        <div className="skeleton" style={{ width: '210px', height: '0.9375rem' }} />
      </div>

      {/* Tabs Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <div className="skeleton" style={{ height: '40px', borderRadius: '9px' }} />
        <div style={{ height: '40px' }} />
      </div>

      {/* Pending Items List Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'var(--bg-surface)',
            }}
          >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '10px' }} />
                <div>
                  <div className="skeleton" style={{ width: '130px', height: '0.875rem', marginBottom: '6px' }} />
                  <div className="skeleton" style={{ width: '70px', height: '0.75rem' }} />
                </div>
              </div>
              <div className="skeleton" style={{ width: '60px', height: '0.875rem' }} />
            </div>

            {/* Note & Amount */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div className="skeleton" style={{ width: '100px', height: '0.75rem' }} />
              <div className="skeleton" style={{ width: '80px', height: '1.125rem' }} />
            </div>

            {/* Actions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="skeleton" style={{ height: '36px', borderRadius: '8px' }} />
              <div className="skeleton" style={{ height: '36px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
