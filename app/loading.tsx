export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: 'var(--bg-base, #0b0f19)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.25rem 1rem',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '720px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Header Bar Skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton" style={{ width: 120, height: 16, borderRadius: '6px' }} />
              <div className="skeleton" style={{ width: 75, height: 12, borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '10px' }} />
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '10px' }} />
          </div>
        </div>

        {/* Hero Card Skeleton */}
        <div
          style={{
            padding: '1.75rem 1.5rem',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.875rem',
          }}
        >
          <div className="skeleton" style={{ width: 90, height: 14, borderRadius: '6px' }} />
          <div className="skeleton" style={{ width: 190, height: 42, borderRadius: '10px' }} />
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '0.5rem',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <div className="skeleton" style={{ width: 110, height: 28, borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: 110, height: 28, borderRadius: '8px' }} />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div
          className="skeleton"
          style={{
            width: '100%',
            height: 42,
            borderRadius: '9999px',
          }}
        />

        {/* List Items Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.75rem 0.5rem',
              }}
            >
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div className="skeleton" style={{ width: i % 2 === 0 ? '55%' : '40%', height: 15, borderRadius: '6px' }} />
                <div className="skeleton" style={{ width: '30%', height: 12, borderRadius: '4px' }} />
              </div>
              <div className="skeleton" style={{ width: 64, height: 24, borderRadius: '9999px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
