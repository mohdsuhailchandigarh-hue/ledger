'use client';

type Props = {
  className?: string;
  style?: React.CSSProperties;
  lines?: number;
  height?: number;
  width?: string;
  rounded?: string;
};

export function SkeletonBlock({
  className,
  style,
  height = 20,
  width = '100%',
  rounded = 'var(--radius-md)',
}: Props) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{ height, width, borderRadius: rounded, ...style }}
    />
  );
}

export function SkeletonCard({ className, style }: Props) {
  return (
    <div
      className={`card ${className ?? ''}`}
      style={{ padding: '1.5rem', ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <SkeletonBlock width="48px" height={48} rounded="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonBlock width="60%" height={16} />
          <SkeletonBlock width="40%" height={12} />
        </div>
      </div>
      <SkeletonBlock width="80%" height={32} rounded="var(--radius-lg)" />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <SkeletonBlock width="30%" height={14} />
        <SkeletonBlock width="20%" height={14} />
      </div>
    </div>
  );
}

export function SkeletonTransaction() {
  return (
    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <SkeletonBlock width="45%" height={15} />
          <SkeletonBlock width="65%" height={12} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-end' }}>
          <SkeletonBlock width="80px" height={18} />
          <SkeletonBlock width="60px" height={12} />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;
