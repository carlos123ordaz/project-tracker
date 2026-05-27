import { useConfigData, type StatusObj, type PriorityObj } from '../../hooks/useConfigData'

export function StatusBadge({ status, obj, size = 'md', bgColor, dotColor }: {
  status?: string; obj?: StatusObj; size?: 'sm' | 'md'; bgColor?: string; dotColor?: string
}) {
  const { getStatus } = useConfigData()
  const resolved = obj || (status ? getStatus(status) : undefined)
  const bg    = bgColor  || resolved?.bg  || 'var(--n-100)'
  const dot   = dotColor || resolved?.dot || 'var(--n-500)'
  const label = resolved?.name || status || '—'
  const pad   = size === 'sm' ? '2px 7px' : '3px 9px'
  const fs    = size === 'sm' ? 11 : 11.5
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: pad, borderRadius: 6,
      background: bg, color: dot,
      fontSize: fs, fontWeight: 550, lineHeight: 1.2,
      letterSpacing: '-0.005em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, flex: '0 0 auto' }} />
      {label}
    </span>
  )
}

export function PriorityBadge({ priority, obj, size = 'md' }: {
  priority?: string; obj?: PriorityObj; size?: 'sm' | 'md'
}) {
  const { getPriority } = useConfigData()
  const resolved = obj || (priority ? getPriority(priority) : undefined)
  const bg    = resolved?.bg || 'var(--n-100)'
  const fg    = resolved?.fg || 'var(--n-600)'
  const label = resolved?.name || priority || '—'
  const pad   = size === 'sm' ? '1px 6px' : '2px 8px'
  const fs    = size === 'sm' ? 10.5 : 11
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: pad, borderRadius: 4,
      background: bg, color: fg,
      fontSize: fs, fontWeight: 600,
      letterSpacing: '0.01em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
