import { useState, useEffect, useRef, type CSSProperties } from 'react'

/* ── useCountUp ── */
export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  const startRef    = useRef<number | null>(null)
  const startValRef = useRef(0)
  useEffect(() => {
    startRef.current    = null
    startValRef.current = val
    let raf: number
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = startValRef.current + (target - startValRef.current) * eased
      setVal(v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return val
}

/* ── CountUpNumber ── */
export function CountUpNumber({ value, decimals = 0, prefix = '', suffix = '', duration = 900, style }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; style?: CSSProperties
}) {
  const v     = useCountUp(value || 0, duration)
  const shown = decimals === 0 ? Math.round(v).toLocaleString('en-US') : v.toFixed(decimals)
  return (
    <span className="mono tnum" style={style}>
      {prefix}{shown}{suffix}
    </span>
  )
}

/* ── Sparkline ── */
export function Sparkline({ data, color = 'var(--brand-600)', height = 28, width = 96, fill = true, strokeWidth = 1.5 }: {
  data: number[]; color?: string; height?: number; width?: number; fill?: boolean; strokeWidth?: number
}) {
  if (!data || data.length < 2) return null
  const min   = Math.min(...data)
  const max   = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const pts   = data.map((v, i) => {
    const x = i * stepX
    const y = height - 2 - ((v - min) / range) * (height - 4)
    return [x, y] as [number, number]
  })
  const path     = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  const areaPath = path + ` L${width},${height} L0,${height} Z`
  const lastPt   = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <defs>
          <linearGradient id={'sg-' + color.replace(/[^a-z0-9]/gi, '')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaPath} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, '')})`} />}
      <path d={path} stroke={color} fill="none" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round"
        style={{ strokeDasharray: 200, strokeDashoffset: 200, animation: 'sparkDraw .9s cubic-bezier(.4,0,.2,1) forwards' }} />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="2.4" fill={color} stroke="#fff" strokeWidth="1.2"
        style={{ animation: 'fadeIn .4s ease .8s both' }} />
    </svg>
  )
}

/* ── PulseDot ── */
export function PulseDot({ color = 'var(--red-500)', size = 8, ring = true }: {
  color?: string; size?: number; ring?: boolean
}) {
  return (
    <span style={{ display: 'inline-block', position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <span style={{ position: 'absolute', inset: 0, background: color, borderRadius: 999, boxShadow: `0 0 0 2px ${color}26` }} />
      {ring && (
        <span style={{
          position: 'absolute', inset: 0,
          background: color, borderRadius: 999,
          opacity: 0.5, animation: 'pulseRing 1.8s cubic-bezier(0,0,.2,1) infinite',
        }} />
      )}
    </span>
  )
}

/* ── LiveBadge ── */
export function LiveBadge({ label = 'En vivo', color = 'var(--green-500)' }: {
  label?: string; color?: string
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px 2px 7px', borderRadius: 999,
      background: 'var(--green-50)', color: 'var(--green-700)',
      fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em',
      border: '1px solid var(--green-100)',
    }}>
      <PulseDot color={color} size={6} />
      {label}
    </span>
  )
}
