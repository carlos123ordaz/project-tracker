import type { CSSProperties } from 'react'

export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 999,
        border: '2.5px solid var(--brand-100)',
        borderTopColor: 'var(--brand-600)',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

export function PageLoader({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div
      className="fade-in"
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, minHeight: 260, padding: 48,
      }}
    >
      <Spinner size={36} />
      {label && (
        <span style={{ fontSize: 12.5, color: 'var(--n-500)', fontWeight: 500 }}>
          {label}
        </span>
      )}
    </div>
  )
}

export function SkeletonBlock({
  height = 16,
  width = '100%',
  radius = 6,
  style,
}: {
  height?: number
  width?: number | string
  radius?: number
  style?: CSSProperties
}) {
  return (
    <div
      className="shimmer"
      style={{
        height, width, borderRadius: radius,
        background: 'var(--n-100)',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

export function SkeletonProjectCard() {
  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: 'var(--n-150)' }} />
      <div style={{ padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonBlock height={9} width={80} />
            <SkeletonBlock height={15} width="65%" />
          </div>
          <SkeletonBlock height={22} width={58} radius={99} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--n-150)', borderRadius: 8, overflow: 'hidden' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: 'var(--n-0)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <SkeletonBlock height={8} width={36} />
              <SkeletonBlock height={13} width={28} />
            </div>
          ))}
        </div>
        <SkeletonBlock height={6} radius={999} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--n-150)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SkeletonBlock height={22} width={22} radius={999} />
            <SkeletonBlock height={10} width={50} />
          </div>
          <SkeletonBlock height={10} width={60} />
        </div>
      </div>
    </div>
  )
}
