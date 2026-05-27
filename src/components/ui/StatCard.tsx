import type { ElementType } from 'react'
import { CountUpNumber, Sparkline } from './Motion'
import { makeSpark } from '../../lib/helpers'

type Accent = 'brand' | 'red' | 'amber' | 'green' | 'neutral'

const PALETTES: Record<Accent, { bg: string; fg: string; edge: string; spark: string }> = {
  brand:   { bg: 'var(--brand-50)',  fg: 'var(--brand-600)', edge: 'var(--brand-200)', spark: '#4F46E5' },
  red:     { bg: 'var(--red-50)',    fg: 'var(--red-600)',   edge: 'var(--red-100)',   spark: '#EF4444' },
  amber:   { bg: 'var(--amber-50)',  fg: 'var(--amber-600)', edge: 'var(--amber-100)', spark: '#F59E0B' },
  green:   { bg: 'var(--green-50)',  fg: 'var(--green-600)', edge: 'var(--green-100)', spark: '#10B981' },
  neutral: { bg: 'var(--n-100)',     fg: 'var(--n-600)',     edge: 'var(--n-150)',     spark: '#565D6B' },
}

export function StatCard({ icon: Icon, label, value, sub, accent = 'brand', trend, urgent = false, sparkSeed, sparkBase, numericValue, displaySuffix = '', displayPrefix = '' }: {
  icon: ElementType
  label: string
  value?: string
  sub?: string
  accent?: Accent
  trend?: number
  urgent?: boolean
  sparkSeed?: number
  sparkBase?: number
  numericValue?: number
  displaySuffix?: string
  displayPrefix?: string
}) {
  const p         = PALETTES[accent] || PALETTES.brand
  const showSpark = sparkSeed !== undefined
  const sparkData = showSpark ? makeSpark(sparkSeed!, 14, sparkBase ?? 50, 18) : null
  const showCount = numericValue !== undefined

  return (
    <div
      className="card"
      style={{ padding: 14, position: 'relative', overflow: 'hidden', borderColor: urgent ? p.edge : 'var(--n-200)', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px -8px ${p.spark}33, 0 2px 4px -2px rgba(15,17,22,0.04)` }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
    >
      {urgent && (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${p.bg} 0%, transparent 55%)`, pointerEvents: 'none' }} />
      )}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7, background: p.bg, color: p.fg,
          }}>
            <Icon size={15} />
          </span>
          {trend !== undefined && (
            <span className="mono tnum" style={{
              fontSize: 10.5, fontWeight: 600,
              color:      trend > 0 ? 'var(--green-600)' : trend < 0 ? 'var(--red-600)' : 'var(--n-500)',
              padding: '2px 6px', borderRadius: 4,
              background: trend > 0 ? 'var(--green-50)' : trend < 0 ? 'var(--red-50)' : 'var(--n-100)',
              display: 'inline-flex', alignItems: 'center', gap: 2,
            }}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500, marginBottom: 4, letterSpacing: '-0.005em' }}>
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <div className="mono tnum" style={{ fontSize: 24, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.025em', lineHeight: 1 }}>
              {showCount
                ? <CountUpNumber value={numericValue!} prefix={displayPrefix} suffix={displaySuffix} />
                : value}
            </div>
            {showSpark && sparkData && (
              <div style={{ flex: '0 0 auto' }}>
                <Sparkline data={sparkData} color={p.spark} width={72} height={26} />
              </div>
            )}
          </div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 6 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}
