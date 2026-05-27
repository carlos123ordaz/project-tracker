import type { SemKind } from '../../hooks/useConfigData'

const PALETTES: Record<string, { ring: string; dot: string }> = {
  green: { ring: '#10B98122', dot: '#10B981' },
  amber: { ring: '#F59E0B22', dot: '#F59E0B' },
  red:   { ring: '#EF444422', dot: '#EF4444' },
  gray:  { ring: '#A8AEBA22', dot: '#A8AEBA' },
}

export function Semaforo({ kind, label, size = 'md' }: {
  kind: SemKind; label?: string; size?: 'md' | 'lg'
}) {
  const p     = PALETTES[kind] || PALETTES.gray
  const inner = size === 'lg' ? 10 : 8
  const outer = size === 'lg' ? 20 : 16
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: outer, height: outer, borderRadius: 999,
        background: p.ring,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flex: '0 0 auto',
      }}>
        <span style={{ width: inner, height: inner, borderRadius: 999, background: p.dot, boxShadow: `0 0 0 2px ${p.ring}` }} />
      </span>
      {label && <span style={{ fontSize: 12, color: 'var(--n-700)', fontWeight: 500 }}>{label}</span>}
    </span>
  )
}
