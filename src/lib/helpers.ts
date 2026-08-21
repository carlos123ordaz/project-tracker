import { PROJECT_COLORS } from './colors'

export const MONTHS_ES   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const DAYS_ES     = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

export const TODAY = (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()

export const parseISO = (s: string): Date => s.includes('T') ? new Date(s) : new Date(s + 'T00:00:00')

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}

export const isoDay = (d: Date): string => d.toISOString().slice(0, 10)

export const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

export const fmtDateFull = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

export const fmtMoney = (n: number): string => '$' + (n || 0).toLocaleString('en-US')

export const fmtMoneyCompact = (n: number): string => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n
}

export const daysFromToday = (iso?: string | null): number | null => {
  if (!iso) return null
  return Math.round((parseISO(iso).getTime() - TODAY.getTime()) / 86_400_000)
}

export const daysBetween = (a: string, b: string): number =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)

export function getProjectColor(colorNameOrHex?: string | null): string {
  if (!colorNameOrHex) return '#64748B'
  if (colorNameOrHex.startsWith('#')) return colorNameOrHex
  return PROJECT_COLORS[colorNameOrHex] || '#64748B'
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  '#7C3AED','#06B6D4','#EC4899','#10B981',
  '#F59E0B','#3B82F6','#DC2626','#64748B',
  '#0891B2','#9333EA','#16A34A','#EA580C',
]

export function getMemberColor(idx: number): string {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length]
}

export function makeSpark(seed: number, n = 14, base = 50, amp = 22): number[] {
  const data: number[] = []
  let v = base
  for (let i = 0; i < n; i++) {
    const s = Math.sin(seed + i * 0.7) * 0.5 + Math.cos(seed * 0.3 + i * 1.4) * 0.5
    v += s * amp * 0.18 + Math.sin(seed * 2 + i) * 2
    v = Math.max(base - amp, Math.min(base + amp, v))
    data.push(v)
  }
  return data
}

/** Pick the text color that stays legible on an arbitrary background hex.
 *  Avatar/tag colors come from config, and mid-tone ones (amber, cyan, lime)
 *  drop white text to ~2:1. Threshold is the WCAG relative-luminance crossover. */
export function readableTextOn(bg?: string | null): string {
  if (!bg || bg[0] !== '#') return '#fff'
  const h = bg.length === 4
    ? bg.slice(1).split('').map(c => parseInt(c + c, 16))
    : [bg.slice(1, 3), bg.slice(3, 5), bg.slice(5, 7)].map(c => parseInt(c, 16))
  if (h.some(isNaN)) return '#fff'
  const lin = h.map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) })
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  // Compare both candidates instead of using a luminance cutoff: mid-tone hues
  // (cyan, emerald, blue) sit right at the crossover and a fixed threshold
  // keeps handing them white at ~2.4:1.
  const onWhite = 1.05 / (lum + 0.05)
  const onDark  = (lum + 0.05) / 0.0596
  return onDark >= onWhite ? '#15171c' : '#fff'
}
