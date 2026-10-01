export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1rem', width: '100%' }}>
      {/* Top greeting + actions skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            className="skeleton"
            style={{ width: 40, height: 40, borderRadius: '50%' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton" style={{ width: 110, height: 16 }} />
            <div className="skeleton" style={{ width: 70, height: 12 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div
            className="skeleton"
            style={{ width: 34, height: 34, borderRadius: '9px' }}
          />
          <div
            className="skeleton"
            style={{ width: 34, height: 34, borderRadius: '9px' }}
          />
        </div>
      </div>

      {/* Hero Net Balance card skeleton */}
      <div
        style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div className="skeleton" style={{ width: 100, height: 13 }} />
        <div className="skeleton" style={{ width: 180, height: 40 }} />
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '0.5rem',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <div className="skeleton" style={{ width: 100, height: 24, borderRadius: '6px' }} />
          <div className="skeleton" style={{ width: 100, height: 24, borderRadius: '6px' }} />
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div
        className="skeleton"
        style={{
          width: '100%',
          height: 38,
          borderRadius: '9999px',
          marginBottom: '1rem',
        }}
      />

      {/* WhatsApp Chat-Style Account List Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.625rem 0.625rem',
                margin: '0.125rem -0.375rem',
              }}
            >
              {/* 50px Avatar Skeleton */}
              <div
                className="skeleton"
                style={{ width: 50, height: 50, borderRadius: '50%', flexShrink: 0 }}
              />

              {/* Account Info Skeleton */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flex: 1,
                  minWidth: 0,
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    className="skeleton"
                    style={{ width: i % 2 === 0 ? 130 : 95, height: 16 }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: i % 3 === 0 ? 160 : 110, height: 12 }}
                  />
                </div>

                <div
                  className="skeleton"
                  style={{ width: 68, height: 22, borderRadius: '9999px', flexShrink: 0 }}
                />
              </div>
            </div>

            {i < 6 && (
              <div
                style={{
                  height: 1,
                  background: 'rgba(255, 255, 255, 0.06)',
                  marginLeft: '4.25rem',
                  marginRight: '0.375rem',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
