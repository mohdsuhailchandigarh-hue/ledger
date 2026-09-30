export default function ConnectionsLoading() {
  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="skeleton" style={{ width: '160px', height: '1.75rem', marginBottom: '8px' }} />
        <div className="skeleton" style={{ width: '240px', height: '0.9375rem' }} />
      </div>

      {/* Tabs Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <div className="skeleton" style={{ height: '40px', borderRadius: '9px' }} />
        <div style={{ height: '40px' }} />
      </div>

      {/* Search Input Skeleton */}
      <div className="skeleton" style={{ width: '100%', height: '48px', borderRadius: '12px', marginBottom: '1.5rem' }} />

      {/* Connections List Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="skeleton" style={{ width: '130px', height: '1rem', marginBottom: '0.25rem' }} />

        {[1, 2, 3, 4].map((i) => (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '10px' }} />
              <div>
                <div className="skeleton" style={{ width: '120px', height: '0.875rem', marginBottom: '6px' }} />
                <div className="skeleton" style={{ width: '70px', height: '0.75rem' }} />
              </div>
            </div>
            
            <div className="skeleton" style={{ width: '90px', height: '32px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
