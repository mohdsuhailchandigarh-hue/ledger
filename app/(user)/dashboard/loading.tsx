export default function DashboardLoading() {
  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Greeting Skeleton */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="skeleton" style={{ width: '220px', height: '1.75rem', marginBottom: '8px' }} />
        <div className="skeleton" style={{ width: '160px', height: '0.9375rem' }} />
      </div>

      {/* Monthly Summary Box Skeleton */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '120px', height: '0.875rem' }} />
          <div className="skeleton" style={{ width: '100px', height: '0.875rem' }} />
        </div>
      </div>

      {/* Net Position / Balance cards Skeletons */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
            <div className="skeleton" style={{ width: '80px', height: '0.75rem', marginBottom: '10px' }} />
            <div className="skeleton" style={{ width: '140px', height: '2rem' }} />
          </div>
          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
            <div className="skeleton" style={{ width: '80px', height: '0.75rem', marginBottom: '10px' }} />
            <div className="skeleton" style={{ width: '140px', height: '2rem' }} />
          </div>
          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
            <div className="skeleton" style={{ width: '80px', height: '0.75rem', marginBottom: '10px' }} />
            <div className="skeleton" style={{ width: '140px', height: '2rem' }} />
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }} className="loading-grid-class">
        {/* Left Column - Connections */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="skeleton" style={{ width: '100px', height: '1rem' }} />
            <div className="skeleton" style={{ width: '60px', height: '0.8125rem' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card" style={{ padding: '1.25rem', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px' }} />
                  <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
                </div>
                <div className="skeleton" style={{ width: '120px', height: '0.9375rem', marginBottom: '6px' }} />
                <div className="skeleton" style={{ width: '80px', height: '0.8125rem', marginBottom: '1rem' }} />
                <div className="skeleton" style={{ width: '100%', height: '34px', borderRadius: '9px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <style>{`
        @media (min-width: 901px) {
          .loading-grid-class {
            grid-template-columns: minmax(0, 1fr) 320px !important;
          }
        }
      `}</style>
    </div>
  );
}
