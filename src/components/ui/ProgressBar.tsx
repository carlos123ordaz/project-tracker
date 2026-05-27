export default function ProgressBar({ value = 0, projectColor, height = 6, showLabel = false, width }: {
  value?: number; projectColor?: string; height?: number; showLabel?: boolean; width?: string | number
}) {
  const pct = Math.max(0, Math.min(1, value))
  let color = 'var(--green-500)'
  if (pct < 0.30)      color = 'var(--red-500)'
  else if (pct < 0.70) color = 'var(--amber-500)'
  if (projectColor)    color = projectColor
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: width || '100%' }}>
      <div style={{ flex: 1, height, background: 'var(--n-100)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: (pct * 100) + '%', height: '100%',
          background: color, borderRadius: 999,
          transition: 'width .35s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      {showLabel && (
        <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-600)', minWidth: 32, textAlign: 'right' }}>
          {Math.round(pct * 100)}%
        </span>
      )}
    </div>
  )
}
