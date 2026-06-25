import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts'
import { RefreshCw, Info, Settings, Calendar, Users } from 'lucide-react'
import {
  format, parseISO, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, startOfYear, getDayOfYear, getDaysInMonth,
  isWithinInterval, subMonths, subDays, differenceInDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useDeals, type Deal } from '../../hooks/useDeals'
import { useActivities, type Activity } from '../../hooks/useActivities'
import { useUnitTargets } from '../../hooks/useUnitTargets'
import { PageLoader } from '../../components/ui/Loader'

// ── constants ──────────────────────────────────────────────────────────────────

const UNIT_TABS = ['PROSER', 'UNAI', 'UNAP', 'UNAU', 'UNEPC', 'UNVA'] as const
type UnitTab = typeof UNIT_TABS[number]

const SUB_TABS = ['Todos', 'PAU', 'PIC', 'Proyectos', 'Servicio'] as const
type SubTab = typeof SUB_TABS[number]

const DATE_PRESETS = [
  { key: 'esta_semana',     label: 'Esta semana' },
  { key: 'semana_anterior', label: 'Sem. anterior' },
  { key: 'este_mes',        label: 'Este mes' },
  { key: 'mes_anterior',    label: 'Mes anterior' },
  { key: 'ultimos_30',      label: 'Últimos 30 días' },
  { key: 'ultimos_90',      label: 'Últimos 90 días' },
  { key: 'este_anio',       label: 'Este año' },
  { key: 'rango',           label: 'Rango…' },
] as const
type DatePreset = typeof DATE_PRESETS[number]['key']

const C_NAVY  = '#1e3a5f'
const C_AMBER = '#f59e0b'
const C_SKY   = '#0ea5e9'
const C_GREEN = '#16a34a'
const C_RED   = '#ef4444'

// ── helpers ────────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function fmtMoneyLong(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function pct(num: number, den: number): number {
  if (!den) return 0
  return Math.round((num / den) * 100)
}

function pctStr(num: number, den: number): string {
  return `${pct(num, den)}%`
}

function pctColor(p: number): string {
  if (p >= 100) return C_GREEN
  if (p >= 70)  return C_AMBER
  return C_RED
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).join(' ')
}

function parseAmt(d: Deal): number {
  return parseFloat(d.opportunity) || 0
}

function inRange(dateStr: string, start: Date, end: Date): boolean {
  if (!dateStr) return false
  try { return isWithinInterval(parseISO(dateStr), { start, end }) } catch { return false }
}

function fmtTimestamp(iso: string): string {
  if (!iso) return ''
  try { return format(parseISO(iso), "d 'de' MMM. 'del' yyyy hh:mm aaa", { locale: es }) } catch { return iso }
}

function fmtDate(iso: string): string {
  try { return iso ? format(parseISO(iso), 'dd/MM/yyyy') : '—' } catch { return '—' }
}

// ── date range ─────────────────────────────────────────────────────────────────

function getDateRange(
  now: Date, preset: DatePreset, customStart?: Date, customEnd?: Date,
): { start: Date; end: Date; label: string } {
  switch (preset) {
    case 'esta_semana':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'Esta semana' }
    case 'semana_anterior': {
      const prev = subWeeks(now, 1)
      return { start: startOfWeek(prev, { weekStartsOn: 1 }), end: endOfWeek(prev, { weekStartsOn: 1 }), label: 'Semana anterior' }
    }
    case 'este_mes':
      return { start: startOfMonth(now), end: now, label: 'Este mes' }
    case 'mes_anterior': {
      const prev = subMonths(now, 1)
      return { start: startOfMonth(prev), end: endOfMonth(prev), label: 'Mes anterior' }
    }
    case 'ultimos_30':
      return { start: subDays(now, 30), end: now, label: 'Últimos 30 días' }
    case 'ultimos_90':
      return { start: subDays(now, 90), end: now, label: 'Últimos 90 días' }
    case 'este_anio':
      return { start: startOfYear(now), end: now, label: 'Este año' }
    case 'rango':
      return {
        start: customStart ?? startOfMonth(now),
        end: customEnd ?? now,
        label: 'Rango personalizado',
      }
    default:
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'Esta semana' }
  }
}

// ── filtering ──────────────────────────────────────────────────────────────────

function filterByUnit(deals: Deal[], unit: UnitTab): Deal[] {
  return deals.filter(d => {
    if (d.business_units) return d.business_units.split(',').includes(unit)
    return d.category_name.includes(unit)
  })
}

function filterBySub(deals: Deal[], sub: SubTab): Deal[] {
  if (sub === 'Todos') return deals
  if (sub === 'PAU') return deals.filter(d => d.alcance_pau === 'Si Incluye')
  if (sub === 'PIC') return deals.filter(d => d.alcance_pic === 'Si Incluye')
  if (sub === 'Proyectos') return deals.filter(d =>
    d.category_name.includes('Proyect') || d.dept_cisac.includes('Proyectos')
  )
  if (sub === 'Servicio') return deals.filter(d =>
    d.category_name.includes('Servic') || d.dept_cisac.includes('Servicios')
  )
  return deals
}

// ── table styles ───────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: 'var(--n-600)',
  padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--n-200)',
  background: 'var(--n-50)', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = {
  fontSize: 11.5, padding: '5px 8px', borderBottom: '1px solid var(--n-100)',
  color: 'var(--n-800)',
}
const TD_NUM: React.CSSProperties = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const TD_TOTAL: React.CSSProperties = { ...TD, fontWeight: 700, color: C_NAVY, background: 'var(--n-50)' }
const TD_TOTAL_NUM: React.CSSProperties = { ...TD_NUM, fontWeight: 700, color: C_NAVY, background: 'var(--n-50)' }

// ── reusable UI ────────────────────────────────────────────────────────────────

function Card({ title, children, style, accent }: {
  title?: string
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
}) {
  return (
    <div className="card" style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      borderTop: accent ? `3px solid ${accent}` : undefined,
      ...style,
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </span>
          <Info size={12} style={{ color: 'var(--n-400)', flexShrink: 0 }} />
        </div>
      )}
      {children}
    </div>
  )
}

function NoData({ msg = 'Sin datos' }: { msg?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, color: 'var(--n-400)', fontSize: 12 }}>
      {msg}
    </div>
  )
}

function MultiTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 7, padding: '7px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      {label && <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 4, fontWeight: 600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--n-700)', fontWeight: 600 }}>{p.name}: </span>
          <span style={{ color: 'var(--n-900)', fontWeight: 700 }}>
            {typeof p.value === 'number' && p.value > 999 ? fmtMoney(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ value, max, color = C_NAVY }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ flex: 1, height: 6, background: 'var(--n-150)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 999, transition: 'width 0.3s ease' }} />
    </div>
  )
}

// ── metric card ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent = C_NAVY }: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div style={{
      flex: 1,
      minWidth: 110,
      background: 'var(--n-0)',
      border: '1px solid var(--n-150)',
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--n-400)' }}>{sub}</div>}
    </div>
  )
}

// ── semicircle gauge ───────────────────────────────────────────────────────────

function SemiCircleGauge({ label, value, target, sub }: {
  label: string; value: number; target: number; sub?: string
}) {
  const R = 68
  const cx = 88, cy = 86
  const circumHalf = Math.PI * R
  const ratio    = target > 0 ? Math.min(1, value / target) : 0
  const filled   = ratio * circumHalf
  const gap      = circumHalf - filled + 1
  const arcColor = ratio >= 1 ? C_GREEN : ratio >= 0.7 ? C_AMBER : C_NAVY

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--n-600)', textAlign: 'center', maxWidth: 145 }}>{label}</div>
      <svg width="150" height="92" viewBox="0 0 176 102" style={{ overflow: 'visible' }}>
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="var(--n-150)" strokeWidth="13" strokeLinecap="round" />
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke={arcColor} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${filled} ${gap}`} />
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize="21" fontWeight="700" fill={C_NAVY} fontFamily="inherit">{Math.round(ratio * 100)}%</text>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9.5" fill="#1d4ed8" fontFamily="inherit" fontWeight="600">{fmtMoney(value)}</text>
        <text x={cx - R} y={cy + 14} textAnchor="middle" fontSize="8" fill="var(--n-400)" fontFamily="inherit">$0</text>
        <text x={cx + R} y={cy + 14} textAnchor="middle" fontSize="8" fill="var(--n-400)" fontFamily="inherit">{fmtMoney(target)}</text>
      </svg>
      {sub && <div style={{ fontSize: 9.5, color: 'var(--n-500)', marginTop: -4, textAlign: 'center', maxWidth: 145 }}>{sub}</div>}
    </div>
  )
}

// ── stage badge ────────────────────────────────────────────────────────────────

function StageBadge({ sem }: { sem: string }) {
  const map: Record<string, [string, string]> = {
    S: ['Ganado', C_GREEN],
    F: ['Perdido', C_RED],
    P: ['En proceso', '#6366f1'],
  }
  const [label, color] = map[sem] ?? ['En proceso', '#6366f1']
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: color + '18', color }}>
      {label}
    </span>
  )
}

// ── settings modal ─────────────────────────────────────────────────────────────

function SettingsModal({ targets, saving, onSave, onClose }: {
  targets: Record<string, { monthly_target: number; annual_target: number }>
  saving: boolean
  onSave: (unitId: string, monthly: number, annual: number) => Promise<void>
  onClose: () => void
}) {
  function fmtInputNum(raw: string): string {
    const clean = raw.replace(/[^0-9.]/g, '')
    const [intPart, decPart] = clean.split('.')
    const formatted = (intPart || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    if (decPart !== undefined) return `${formatted}.${decPart.slice(0, 2)}`
    return formatted
  }
  function parseInputNum(val: string): number {
    return Number(val.replace(/,/g, '')) || 0
  }

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(UNIT_TABS.map(u => [u, fmtInputNum(String(targets[u]?.annual_target ?? 0))]))
  )
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

  const handleChange = (unitId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const cursor = el.selectionStart ?? 0
    const raw = el.value
    const digitsBeforeCursor = raw.slice(0, cursor).replace(/[^0-9]/g, '').length
    const stripped  = raw.replace(/,/g, '')
    const onlyValid = stripped.replace(/[^0-9.]/g, '')
    const parts     = onlyValid.split('.')
    const limited   = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}` : parts[0]
    const formatted = fmtInputNum(limited)
    setDrafts(prev => ({ ...prev, [unitId]: formatted }))
    requestAnimationFrame(() => {
      const input = inputRefs.current[unitId]
      if (!input) return
      let digits = 0, pos = 0
      for (; pos < formatted.length; pos++) {
        if (/[0-9]/.test(formatted[pos])) digits++
        if (digits === digitsBeforeCursor) { pos++; break }
      }
      input.setSelectionRange(pos, pos)
    })
  }

  const handleSave = async (unitId: string) => {
    const annual  = parseInputNum(drafts[unitId])
    const monthly = Math.round(annual / 12)
    await onSave(unitId, monthly, annual)
    setSaved(prev => ({ ...prev, [unitId]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [unitId]: false })), 1500)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: '24px 28px', minWidth: 420, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C_NAVY }}>Configurar Metas por Unidad</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--n-400)', lineHeight: 1 }}>×</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Unidad</th>
              <th style={{ ...TH, textAlign: 'right' }}>Meta Anual ($)</th>
              <th style={{ ...TH, textAlign: 'right' }}>Meta Mensual (auto)</th>
              <th style={TH}></th>
            </tr>
          </thead>
          <tbody>
            {UNIT_TABS.map(u => {
              const annual  = parseInputNum(drafts[u] ?? '0')
              const monthly = Math.round(annual / 12)
              return (
                <tr key={u}>
                  <td style={{ ...TD, fontWeight: 700 }}>{u}</td>
                  <td style={TD_NUM}>
                    <input
                      ref={el => { inputRefs.current[u] = el }}
                      type="text" inputMode="decimal" value={drafts[u] ?? ''}
                      onChange={e => handleChange(u, e)}
                      style={{ width: 150, textAlign: 'right', border: '1px solid var(--n-200)', borderRadius: 5, padding: '3px 8px', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
                    />
                  </td>
                  <td style={{ ...TD_NUM, color: 'var(--n-500)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoneyLong(monthly)}</td>
                  <td style={TD}>
                    <button
                      onClick={() => handleSave(u)} disabled={saving}
                      style={{ padding: '3px 14px', borderRadius: 6, fontSize: 11.5, border: 'none', cursor: 'pointer', background: saved[u] ? C_GREEN : C_NAVY, color: '#fff' }}
                    >
                      {saved[u] ? '✓ Guardado' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 18, textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '6px 22px', borderRadius: 7, background: 'var(--n-100)', color: 'var(--n-700)', border: 'none', cursor: 'pointer', fontSize: 12.5 }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── activity chart ─────────────────────────────────────────────────────────────

function ActivityBarChart({ data }: { data: { name: string; llamadas: number; reuniones: number; visitas: number }[] }) {
  if (!data.length) return <NoData msg="Sin actividades en el período" />
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
          <XAxis dataKey="name" tick={{ fontSize: 9.5 }} angle={-20} textAnchor="end" />
          <YAxis tick={{ fontSize: 9.5 }} allowDecimals={false} />
          <Tooltip content={<MultiTooltip />} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="llamadas"  name="Llamadas"  fill={C_NAVY}  radius={[3,3,0,0]} />
          <Bar dataKey="reuniones" name="Reuniones" fill={C_AMBER} radius={[3,3,0,0]} />
          <Bar dataKey="visitas"   name="Visitas"   fill={C_SKY}   radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function groupActivityByName(activities: Activity[]): { name: string; llamadas: number; reuniones: number; visitas: number }[] {
  const map: Record<string, { llamadas: number; reuniones: number; visitas: number }> = {}
  activities.forEach(a => {
    const name = shortName(a.responsible_name || 'Sin asignar')
    if (!map[name]) map[name] = { llamadas: 0, reuniones: 0, visitas: 0 }
    if (a.type_id === '2') map[name].llamadas++
    else if (a.type_id === '1') map[name].reuniones++
    else if (a.type_id === '8') map[name].visitas++
  })
  return Object.entries(map).map(([name, v]) => ({ name, ...v }))
}

// ── section label ──────────────────────────────────────────────────────────────

// ── searchable select ──────────────────────────────────────────────────────────

function SearchableSelect({ value, options, onChange }: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const containerRef        = React.useRef<HTMLDivElement>(null)
  const inputRef            = React.useRef<HTMLInputElement>(null)

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  React.useEffect(() => {
    if (!open) { setQuery(''); return }
    inputRef.current?.focus()
  }, [open])

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '5px 10px 5px 12px', borderRadius: 7,
          border: '1px solid var(--n-200)', fontSize: 12.5,
          background: 'var(--n-0)', color: 'var(--n-800)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          minWidth: 160, justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <span style={{ fontSize: 10, color: 'var(--n-400)', flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: 'var(--n-0)', border: '1px solid var(--n-200)',
          borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,.12)',
          zIndex: 200, minWidth: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--n-150)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
              placeholder="Buscar…"
              style={{
                width: '100%', padding: '4px 8px', fontSize: 12,
                border: '1px solid var(--n-200)', borderRadius: 5,
                outline: 'none', background: 'var(--n-50)',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-400)' }}>Sin resultados</div>
              : filtered.map(o => (
                <div
                  key={o}
                  onMouseDown={() => { onChange(o); setOpen(false) }}
                  style={{
                    padding: '7px 12px', fontSize: 12.5, cursor: 'pointer',
                    background: o === value ? C_NAVY + '12' : undefined,
                    color: o === value ? C_NAVY : 'var(--n-800)',
                    fontWeight: o === value ? 700 : 400,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--n-50)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = o === value ? C_NAVY + '12' : '' }}
                >
                  {o}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}


// ── main page ──────────────────────────────────────────────────────────────────

export default function DealsDashboardPage() {
  const { deals: allDeals, lastSync, loading: dealsLoading, syncing, sync } = useDeals()
  const { activities } = useActivities()
  const { targets, saving: targetsSaving, upsert } = useUnitTargets()

  const [activeUnit, setActiveUnit]     = useState<UnitTab>('PROSER')
  const [activeSub, setActiveSub]       = useState<SubTab>('Todos')
  const [datePreset, setDatePreset]     = useState<DatePreset>('esta_semana')
  const [customStart, setCustomStart]   = useState('')
  const [customEnd, setCustomEnd]       = useState('')
  const [selectedRep, setSelectedRep]   = useState('Todos')
  const [showSettings, setShowSettings] = useState(false)

  const now = useMemo(() => new Date(), [])

  // Date range
  const customStartDate = useMemo(() => customStart ? parseISO(customStart) : undefined, [customStart])
  const customEndDate   = useMemo(() => customEnd   ? parseISO(customEnd)   : undefined, [customEnd])
  const dateRange = useMemo(
    () => getDateRange(now, datePreset, customStartDate, customEndDate),
    [now, datePreset, customStartDate, customEndDate],
  )

  // Unit + sub filter
  const unitDeals = useMemo(() => filterByUnit(allDeals, activeUnit), [allDeals, activeUnit])
  const subDeals  = useMemo(() => filterBySub(unitDeals, activeSub),  [unitDeals, activeSub])

  const subDealIds     = useMemo(() => new Set(subDeals.map(d => d.id)), [subDeals])
  const unitActivities = useMemo(() => activities.filter(a => subDealIds.has(a.owner_id)), [activities, subDealIds])

  // Responsable list
  const allReps = useMemo(() => {
    const s = new Set<string>()
    subDeals.forEach(d => { if (d.assigned_by_name) s.add(d.assigned_by_name) })
    return ['Todos', ...Array.from(s).sort()]
  }, [subDeals])

  // Responsable filter
  const repDeals = useMemo(() =>
    selectedRep === 'Todos' ? subDeals : subDeals.filter(d => d.assigned_by_name === selectedRep),
    [subDeals, selectedRep],
  )
  const repActivities = useMemo(() =>
    selectedRep === 'Todos' ? unitActivities : unitActivities.filter(a => a.responsible_name === selectedRep),
    [unitActivities, selectedRep],
  )

  // Date-range filtered
  const rangeDeals = useMemo(() =>
    repDeals.filter(d => inRange(d.date_create, dateRange.start, dateRange.end)),
    [repDeals, dateRange],
  )
  const rangeWonDeals = useMemo(() =>
    repDeals.filter(d => d.stage_semantic_id === 'S' && inRange(d.closedate, dateRange.start, dateRange.end)),
    [repDeals, dateRange],
  )
  const rangeActivities = useMemo(() =>
    repActivities.filter(a => inRange(a.end_time || a.created, dateRange.start, dateRange.end)),
    [repActivities, dateRange],
  )

  // Calendar-based values for gauges
  const mStart = useMemo(() => startOfMonth(now), [now])
  const yStart = useMemo(() => startOfYear(now), [now])
  const doy    = getDayOfYear(now)
  const dim    = getDaysInMonth(now)

  const unitTarget    = targets[activeUnit] ?? { monthly_target: 0, annual_target: 0 }
  const monthlyTarget = unitTarget.monthly_target
  const annualTarget  = unitTarget.annual_target

  const mtdWon = useMemo(() =>
    unitDeals.filter(d => {
      if (d.stage_semantic_id !== 'S') return false
      try { const dt = parseISO(d.closedate); return dt >= mStart && dt <= now } catch { return false }
    }).reduce((s, d) => s + parseAmt(d), 0),
    [unitDeals, mStart, now],
  )
  const ytdWon = useMemo(() =>
    unitDeals.filter(d => {
      if (d.stage_semantic_id !== 'S') return false
      try { const dt = parseISO(d.closedate); return dt >= yStart && dt <= now } catch { return false }
    }).reduce((s, d) => s + parseAmt(d), 0),
    [unitDeals, yStart, now],
  )

  const prevYear      = now.getFullYear() - 1
  const prevYearStart = new Date(prevYear, 0, 1)
  const prevYearEnd   = new Date(prevYear, 11, 31, 23, 59, 59)
  const prevYearWon   = useMemo(() =>
    unitDeals.filter(d => {
      if (d.stage_semantic_id !== 'S') return false
      try { const dt = parseISO(d.closedate); return dt >= prevYearStart && dt <= prevYearEnd } catch { return false }
    }).reduce((s, d) => s + parseAmt(d), 0),
    [unitDeals],
  )
  const ytdTarget = prevYearWon > 0 ? prevYearWon : annualTarget * (doy / 365)

  // Active reps for progress tables
  const now90 = useMemo(() => subDays(now, 90), [now])
  const activeReps = useMemo(() => {
    const s = new Set<string>()
    repDeals.forEach(d => {
      try { if (parseISO(d.date_create) >= now90) s.add(d.assigned_by_name) } catch {}
    })
    return Array.from(s).filter(Boolean).sort()
  }, [repDeals, now90])
  const repCount = activeReps.length || 1

  const repMonthly = monthlyTarget / repCount
  const repAnnual  = annualTarget  / repCount
  const targetMTD  = repMonthly * (now.getDate() / dim)
  const targetYTD  = repAnnual  * (doy / 365)

  const mtdByRep = useMemo(() => {
    const map: Record<string, number> = {}
    repDeals.forEach(d => {
      if (d.stage_semantic_id !== 'S') return
      try { const dt = parseISO(d.closedate); if (dt >= mStart && dt <= now) map[d.assigned_by_name] = (map[d.assigned_by_name] || 0) + parseAmt(d) } catch {}
    })
    return map
  }, [repDeals, mStart, now])

  const ytdByRep = useMemo(() => {
    const map: Record<string, number> = {}
    repDeals.forEach(d => {
      if (d.stage_semantic_id !== 'S') return
      try { const dt = parseISO(d.closedate); if (dt >= yStart && dt <= now) map[d.assigned_by_name] = (map[d.assigned_by_name] || 0) + parseAmt(d) } catch {}
    })
    return map
  }, [repDeals, yStart, now])

  // KPI summary
  const kpiCreados     = rangeDeals.length
  const kpiMontoCreado = rangeDeals.reduce((s, d) => s + parseAmt(d), 0)
  const kpiMontoGanado = rangeWonDeals.reduce((s, d) => s + parseAmt(d), 0)
  const kpiActividades = rangeActivities.length
  const kpiFallas      = repDeals.filter(d =>
    (!d.company_id || d.company_id === '0') || !d.closedate || (d.probability === '0' && d.stage_semantic_id !== 'F')
  ).length

  // Chart data
  const activityChartData = useMemo(() => groupActivityByName(rangeActivities), [rangeActivities])

  const createdWonData = useMemo(() => {
    const map: Record<string, { creado: number; ganado: number }> = {}
    rangeDeals.forEach(d => {
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      if (!map[name]) map[name] = { creado: 0, ganado: 0 }
      map[name].creado += parseAmt(d)
    })
    rangeWonDeals.forEach(d => {
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      if (!map[name]) map[name] = { creado: 0, ganado: 0 }
      map[name].ganado += parseAmt(d)
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.creado - a.creado)
  }, [rangeDeals, rangeWonDeals])

  const oppCountData = useMemo(() => {
    const map: Record<string, { sinCod: number; conCod: number }> = {}
    rangeDeals.forEach(d => {
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      if (!map[name]) map[name] = { sinCod: 0, conCod: 0 }
      if (d.title.includes('||')) map[name].conCod++
      else map[name].sinCod++
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
  }, [rangeDeals])

  // Fallas (all-time, filtered by rep)
  const fallasByRep = useMemo(() => {
    const repNames = Array.from(new Set(repDeals.map(d => d.assigned_by_name))).filter(Boolean).sort()
    return repNames.map(rep => {
      const rd = repDeals.filter(d => d.assigned_by_name === rep)
      return {
        name: shortName(rep),
        total: rd.length,
        sinCompany:  rd.filter(d => !d.company_id || d.company_id === '0').length,
        sinDeadline: rd.filter(d => !d.closedate).length,
        probErrada:  rd.filter(d => d.probability === '0' && d.stage_semantic_id !== 'F').length,
      }
    })
  }, [repDeals])

  const fallasTotals = useMemo(() => fallasByRep.reduce(
    (acc, r) => ({ total: acc.total + r.total, sinCompany: acc.sinCompany + r.sinCompany, sinDeadline: acc.sinDeadline + r.sinDeadline, probErrada: acc.probErrada + r.probErrada }),
    { total: 0, sinCompany: 0, sinDeadline: 0, probErrada: 0 },
  ), [fallasByRep])

  // Progress table data
  const progressData = useMemo(() => activeReps.map(rep => ({
    name: shortName(rep),
    mtd: mtdByRep[rep] || 0,
    ytd: ytdByRep[rep] || 0,
  })), [activeReps, mtdByRep, ytdByRep])

  const totalMtd = progressData.reduce((s, r) => s + r.mtd, 0)
  const totalYtd = progressData.reduce((s, r) => s + r.ytd, 0)

  // Priority deals (in-process, by rep filter)
  const priorityDeals = useMemo(() =>
    repDeals
      .filter(d => (d.stage_semantic_id || 'P') === 'P')
      .sort((a, b) => parseInt(b.probability) - parseInt(a.probability))
      .slice(0, 8),
    [repDeals],
  )

  // Full deals list (range filtered)
  const dealsList = useMemo(() =>
    [...rangeDeals]
      .sort((a, b) => (b.date_modify > a.date_modify ? 1 : -1))
      .slice(0, 30),
    [rangeDeals],
  )

  // ── Forecast del mes (pipeline ponderado por probabilidad) ────────────────
  const forecastData = useMemo(() => {
    const monthEnd = endOfMonth(now)
    const inProcess = repDeals.filter(d =>
      d.stage_semantic_id === 'P' && inRange(d.closedate, mStart, monthEnd)
    )
    const ponderado   = inProcess.reduce((s, d) => s + parseAmt(d) * (parseInt(d.probability) || 0) / 100, 0)
    const sinPonderar = inProcess.reduce((s, d) => s + parseAmt(d), 0)
    const byRep = Object.entries(
      inProcess.reduce<Record<string, { ponderado: number; total: number }>>((acc, d) => {
        const name = shortName(d.assigned_by_name || 'Sin asignar')
        if (!acc[name]) acc[name] = { ponderado: 0, total: 0 }
        acc[name].ponderado += parseAmt(d) * (parseInt(d.probability) || 0) / 100
        acc[name].total     += parseAmt(d)
        return acc
      }, {})
    ).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.ponderado - a.ponderado)
    return { ponderado, sinPonderar, deals: inProcess.length, byRep }
  }, [repDeals, mStart, now])

  // ── Win rate por responsable ───────────────────────────────────────────────
  const winRateData = useMemo(() => {
    const map: Record<string, { won: number; lost: number }> = {}
    repDeals.forEach(d => {
      if (d.stage_semantic_id !== 'S' && d.stage_semantic_id !== 'F') return
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      if (!map[name]) map[name] = { won: 0, lost: 0 }
      if (d.stage_semantic_id === 'S') map[name].won++
      else map[name].lost++
    })
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        won:  v.won,
        lost: v.lost,
        rate: v.won + v.lost > 0 ? Math.round(v.won / (v.won + v.lost) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
  }, [repDeals])

  // ── Tendencia últimos 12 meses ─────────────────────────────────────────────
  const tendenciaData = useMemo(() => {
    const months: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const key = format(subMonths(now, i), 'MMM yy', { locale: es })
      months[key] = 0
    }
    repDeals.forEach(d => {
      if (d.stage_semantic_id !== 'S' || !d.closedate) return
      try {
        const key = format(parseISO(d.closedate), 'MMM yy', { locale: es })
        if (key in months) months[key] += parseAmt(d)
      } catch {}
    })
    return Object.entries(months).map(([mes, ganado]) => ({ mes, ganado }))
  }, [repDeals, now])

  // ── Embudo por etapa ───────────────────────────────────────────────────────
  const embudoData = useMemo(() => {
    const map: Record<string, { count: number; monto: number }> = {}
    repDeals.filter(d => d.stage_semantic_id === 'P').forEach(d => {
      const stage = d.stage_name || 'Sin etapa'
      if (!map[stage]) map[stage] = { count: 0, monto: 0 }
      map[stage].count++
      map[stage].monto += parseAmt(d)
    })
    return Object.entries(map)
      .map(([stage, v]) => ({ stage, ...v }))
      .sort((a, b) => b.monto - a.monto)
  }, [repDeals])

  // ── Deals estancados (sin movimiento ≥14 días) ─────────────────────────────
  const dealsEstancados = useMemo(() =>
    repDeals
      .filter(d => {
        if (d.stage_semantic_id !== 'P') return false
        try { return differenceInDays(now, parseISO(d.date_modify)) >= 14 } catch { return false }
      })
      .map(d => ({ ...d, diasSinMov: differenceInDays(now, parseISO(d.date_modify)) }))
      .sort((a, b) => b.diasSinMov - a.diasSinMov)
      .slice(0, 25),
    [repDeals, now],
  )

  const today = format(now, "EEEE, d 'de' MMM yyyy", { locale: es })

  if (dealsLoading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', background: 'var(--n-50)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px', background: 'var(--n-0)',
        borderBottom: '1px solid var(--n-150)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--n-600)', textTransform: 'capitalize' }}>{today}</span>
          <button
            onClick={sync} disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--n-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <RefreshCw size={11} className={syncing ? 'spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <SemiCircleGauge
            label={`Meta Mensual · ${activeUnit}`}
            value={mtdWon}
            target={monthlyTarget}
            sub={`${fmtMoney(mtdWon)} / ${fmtMoney(monthlyTarget)}`}
          />
          <SemiCircleGauge
            label={`YTD vs Año Anterior · ${activeUnit}`}
            value={ytdWon}
            target={ytdTarget}
            sub={prevYearWon > 0
              ? `${now.getFullYear()}: ${fmtMoney(ytdWon)} | ${prevYear}: ${fmtMoney(prevYearWon)}`
              : `YTD: ${fmtMoney(ytdWon)} / est. ${fmtMoney(ytdTarget)}`
            }
          />
          <SemiCircleGauge
            label={`Meta Anual · ${activeUnit}`}
            value={ytdWon}
            target={annualTarget}
            sub={`${fmtMoney(ytdWon)} / ${fmtMoney(annualTarget)}`}
          />
        </div>

        <button
          onClick={() => setShowSettings(true)}
          title="Configurar metas"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── Unit tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', background: '#1e293b', flexShrink: 0, padding: '0 16px' }}>
        {UNIT_TABS.map(u => (
          <button
            key={u}
            onClick={() => { setActiveUnit(u); setActiveSub('Todos'); setSelectedRep('Todos') }}
            style={{
              height: 36, padding: '0 20px',
              background: activeUnit === u ? '#334155' : 'transparent',
              color: '#fff', fontSize: 12.5, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              borderBottom: activeUnit === u ? '2px solid #60a5fa' : '2px solid transparent',
              transition: 'background .15s',
            }}
          >
            {u}
          </button>
        ))}
      </div>

      {/* ── Sub-tabs ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', background: 'var(--n-100)', flexShrink: 0, padding: '4px 16px', gap: 4, borderBottom: '1px solid var(--n-200)' }}>
        {SUB_TABS.map(s => (
          <button
            key={s}
            onClick={() => setActiveSub(s)}
            style={{
              padding: '3px 14px', borderRadius: 6,
              background: activeSub === s ? '#1d4ed8' : 'transparent',
              color: activeSub === s ? '#fff' : 'var(--n-700)',
              fontSize: 12, fontWeight: activeSub === s ? 600 : 500,
              border: 'none', cursor: 'pointer',
              transition: 'background .15s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        padding: '8px 20px', background: 'var(--n-0)',
        borderBottom: '1px solid var(--n-150)', flexShrink: 0,
      }}>
        {/* Date presets */}
        <Calendar size={13} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--n-500)', marginRight: 2 }}>PERÍODO</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              style={{
                padding: '4px 12px', borderRadius: 6,
                background: datePreset === p.key ? C_NAVY : 'var(--n-100)',
                color: datePreset === p.key ? '#fff' : 'var(--n-700)',
                fontSize: 11.5, fontWeight: datePreset === p.key ? 600 : 500,
                border: datePreset === p.key ? 'none' : '1px solid var(--n-200)',
                cursor: 'pointer', transition: 'background .15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === 'rango' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ fontSize: 12, padding: '3px 8px', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)' }}
            />
            <span style={{ color: 'var(--n-400)', fontSize: 13 }}>→</span>
            <input
              type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ fontSize: 12, padding: '3px 8px', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)' }}
            />
          </div>
        )}

        {/* Responsable */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={13} style={{ color: 'var(--n-500)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--n-500)' }}>RESPONSABLE</span>
          <SearchableSelect value={selectedRep} options={allReps} onChange={setSelectedRep} />
        </div>
      </div>

      {/* ── Dashboard content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── KPI row ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MetricCard
            label="Opps Creadas"
            value={kpiCreados}
            sub={dateRange.label}
            accent={C_NAVY}
          />
          <MetricCard
            label="Monto Creado"
            value={fmtMoney(kpiMontoCreado)}
            sub={dateRange.label}
            accent={C_SKY}
          />
          <MetricCard
            label="Monto Ganado"
            value={fmtMoney(kpiMontoGanado)}
            sub={`${kpiCreados > 0 ? pctStr(kpiMontoGanado, kpiMontoCreado) : '0%'} del creado`}
            accent={C_GREEN}
          />
          <MetricCard
            label="Actividades"
            value={kpiActividades}
            sub={`${rangeActivities.filter(a => a.type_id === '2').length} llamadas · ${rangeActivities.filter(a => a.type_id === '1').length} reuniones · ${rangeActivities.filter(a => a.type_id === '8').length} visitas`}
            accent={C_AMBER}
          />
          <MetricCard
            label="Fallas en Opps"
            value={kpiFallas}
            sub="Sin company · sin cierre · prob. errónea"
            accent={kpiFallas > 0 ? C_RED : C_GREEN}
          />
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Card title={`Actividades por responsable · ${dateRange.label}`} accent={C_NAVY}>
            <ActivityBarChart data={activityChartData} />
          </Card>
          <Card title={`Monto creado / ganado · ${dateRange.label}`} accent={C_SKY}>
            {createdWonData.length === 0 ? <NoData msg="Sin deals creados en el período" /> : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={createdWonData} margin={{ top: 4, right: 8, left: 0, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9.5 }} angle={-20} textAnchor="end" />
                    <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 9.5 }} />
                    <Tooltip content={<MultiTooltip />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="creado" name="Monto Creado" fill={C_NAVY}  radius={[3,3,0,0]} />
                    <Bar dataKey="ganado" name="Monto Ganado" fill={C_AMBER} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* ── Analytics row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Card title={`Cantidad de Opps creadas · ${dateRange.label}`} accent={C_AMBER}>
            {oppCountData.length === 0 ? <NoData /> : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oppCountData} margin={{ top: 4, right: 8, left: 0, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9.5 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 9.5 }} allowDecimals={false} />
                    <Tooltip content={<MultiTooltip />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="sinCod" name="Sin código" fill={C_NAVY} radius={[3,3,0,0]} />
                    <Bar dataKey="conCod" name="Con código" fill={C_SKY}  radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Detección de fallas en Opps" accent={C_RED}>
            <div style={{ overflowX: 'auto', maxHeight: 220, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>RESPONSABLE</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Total</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Sin Company</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Sin Cierre</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Prob. Errada</th>
                  </tr>
                </thead>
                <tbody>
                  {fallasByRep.length === 0
                    ? <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)' }}>Sin datos</td></tr>
                    : fallasByRep.map(r => (
                      <tr key={r.name} style={{ background: (r.sinCompany + r.sinDeadline + r.probErrada) > 0 ? '#fef2f218' : undefined }}>
                        <td style={TD}>{r.name}</td>
                        <td style={TD_NUM}>{r.total}</td>
                        <td style={{ ...TD_NUM, color: r.sinCompany  > 0 ? C_RED   : 'var(--n-400)' }}>{r.sinCompany}</td>
                        <td style={{ ...TD_NUM, color: r.sinDeadline > 0 ? C_RED   : 'var(--n-400)' }}>{r.sinDeadline}</td>
                        <td style={{ ...TD_NUM, color: r.probErrada  > 0 ? C_AMBER : 'var(--n-400)' }}>{r.probErrada}</td>
                      </tr>
                    ))
                  }
                  <tr>
                    <td style={TD_TOTAL}>Total</td>
                    <td style={TD_TOTAL_NUM}>{fallasTotals.total}</td>
                    <td style={{ ...TD_TOTAL_NUM, color: fallasTotals.sinCompany > 0 ? C_RED : C_NAVY }}>{fallasTotals.sinCompany}</td>
                    <td style={{ ...TD_TOTAL_NUM, color: fallasTotals.sinDeadline > 0 ? C_RED : C_NAVY }}>{fallasTotals.sinDeadline}</td>
                    <td style={{ ...TD_TOTAL_NUM, color: fallasTotals.probErrada > 0 ? C_AMBER : C_NAVY }}>{fallasTotals.probErrada}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── Progress tables row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Card title="Avance de Ventas Mensual (MTD)" accent={C_SKY}>
            <div style={{ overflowX: 'auto', maxHeight: 220, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>RESPONSABLE</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Meta Mensual</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Target MTD</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>MTD</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {progressData.length === 0
                    ? <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)' }}>Sin datos</td></tr>
                    : progressData.map(r => {
                        const p = pct(r.mtd, targetMTD)
                        return (
                          <tr key={r.name}>
                            <td style={TD}>{r.name}</td>
                            <td style={TD_NUM}>{fmtMoneyLong(repMonthly)}</td>
                            <td style={TD_NUM}>{fmtMoneyLong(targetMTD)}</td>
                            <td style={TD_NUM}>{fmtMoneyLong(r.mtd)}</td>
                            <td style={TD_NUM}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: pctColor(p), minWidth: 36, fontWeight: 700 }}>{p}%</span>
                                <ProgressBar value={r.mtd} max={targetMTD} color={pctColor(p)} />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  }
                  <tr>
                    <td style={TD_TOTAL}>Total</td>
                    <td style={TD_TOTAL_NUM}>{fmtMoneyLong(monthlyTarget)}</td>
                    <td style={TD_TOTAL_NUM}>{fmtMoneyLong(targetMTD * repCount)}</td>
                    <td style={TD_TOTAL_NUM}>{fmtMoneyLong(totalMtd)}</td>
                    <td style={TD_TOTAL_NUM}>
                      <span style={{ color: pctColor(pct(totalMtd, targetMTD * repCount)) }}>
                        {pctStr(totalMtd, targetMTD * repCount)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Avance de Ventas Anual (YTD)" accent={C_GREEN}>
            <div style={{ overflowX: 'auto', maxHeight: 220, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>RESPONSABLE</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Meta Anual</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Target YTD</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>YTD</th>
                    <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {progressData.length === 0
                    ? <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)' }}>Sin datos</td></tr>
                    : progressData.map(r => {
                        const p = pct(r.ytd, targetYTD)
                        return (
                          <tr key={r.name}>
                            <td style={TD}>{r.name}</td>
                            <td style={TD_NUM}>{fmtMoneyLong(repAnnual)}</td>
                            <td style={TD_NUM}>{fmtMoneyLong(targetYTD)}</td>
                            <td style={TD_NUM}>{fmtMoneyLong(r.ytd)}</td>
                            <td style={TD_NUM}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: pctColor(p), minWidth: 36, fontWeight: 700 }}>{p}%</span>
                                <ProgressBar value={r.ytd} max={targetYTD} color={pctColor(p)} />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  }
                  <tr>
                    <td style={TD_TOTAL}>Total</td>
                    <td style={TD_TOTAL_NUM}>{fmtMoneyLong(annualTarget)}</td>
                    <td style={TD_TOTAL_NUM}>{fmtMoneyLong(targetYTD * repCount)}</td>
                    <td style={TD_TOTAL_NUM}>{fmtMoneyLong(totalYtd)}</td>
                    <td style={TD_TOTAL_NUM}>
                      <span style={{ color: pctColor(pct(totalYtd, targetYTD * repCount)) }}>
                        {pctStr(totalYtd, targetYTD * repCount)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── Forecast + Win rate ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          <Card title="Forecast del mes (pipeline ponderado)" accent="#7c3aed">
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, background: 'var(--n-50)', borderRadius: 8, padding: '12px 14px', borderLeft: `4px solid #7c3aed` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecast ponderado</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#7c3aed', lineHeight: 1.1, marginTop: 2 }}>{fmtMoney(forecastData.ponderado)}</div>
                <div style={{ fontSize: 10, color: 'var(--n-400)', marginTop: 2 }}>{forecastData.deals} deal{forecastData.deals !== 1 ? 's' : ''} · pipeline bruto {fmtMoney(forecastData.sinPonderar)}</div>
              </div>
              <div style={{ flex: 1, background: 'var(--n-50)', borderRadius: 8, padding: '12px 14px', borderLeft: `4px solid ${C_SKY}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobertura vs Meta Mensual</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: pctColor(pct(forecastData.ponderado, monthlyTarget)), lineHeight: 1.1, marginTop: 2 }}>
                  {pctStr(forecastData.ponderado, monthlyTarget)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <ProgressBar value={forecastData.ponderado} max={monthlyTarget} color={pctColor(pct(forecastData.ponderado, monthlyTarget))} />
                </div>
              </div>
            </div>
            {forecastData.byRep.length > 0 && (
              <div style={{ overflowX: 'auto', maxHeight: 180, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>RESPONSABLE</th>
                      <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Pipeline bruto</th>
                      <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Forecast ponderado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.byRep.map((r, i) => (
                      <tr key={r.name} style={{ background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-50)' }}>
                        <td style={TD}>{r.name}</td>
                        <td style={TD_NUM}>{fmtMoney(r.total)}</td>
                        <td style={{ ...TD_NUM, color: '#7c3aed', fontWeight: 700 }}>{fmtMoney(r.ponderado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {forecastData.deals === 0 && <NoData msg="Sin deals con cierre este mes" />}
          </Card>

          <Card title="Win rate por responsable" accent={C_GREEN}>
            {winRateData.length === 0 ? <NoData msg="Sin deals cerrados" /> : (
              <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>RESPONSABLE</th>
                      <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Ganados</th>
                      <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Perdidos</th>
                      <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Total</th>
                      <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winRateData.map((r, i) => (
                      <tr key={r.name} style={{ background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-50)' }}>
                        <td style={TD}>{r.name}</td>
                        <td style={{ ...TD_NUM, color: C_GREEN, fontWeight: 600 }}>{r.won}</td>
                        <td style={{ ...TD_NUM, color: C_RED }}>{r.lost}</td>
                        <td style={TD_NUM}>{r.won + r.lost}</td>
                        <td style={{ ...TD, minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ minWidth: 36, fontWeight: 700, color: pctColor(r.rate) }}>{r.rate}%</span>
                            <ProgressBar value={r.won} max={r.won + r.lost} color={pctColor(r.rate)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(() => {
                      const totWon  = winRateData.reduce((s, r) => s + r.won, 0)
                      const totLost = winRateData.reduce((s, r) => s + r.lost, 0)
                      const totRate = totWon + totLost > 0 ? Math.round(totWon / (totWon + totLost) * 100) : 0
                      return (
                        <tr>
                          <td style={TD_TOTAL}>Total</td>
                          <td style={{ ...TD_TOTAL_NUM, color: C_GREEN }}>{totWon}</td>
                          <td style={{ ...TD_TOTAL_NUM, color: C_RED }}>{totLost}</td>
                          <td style={TD_TOTAL_NUM}>{totWon + totLost}</td>
                          <td style={TD_TOTAL}>
                            <span style={{ fontWeight: 700, color: pctColor(totRate) }}>{totRate}%</span>
                          </td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ── Tendencia 12 meses + Embudo ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>

          <Card title="Tendencia de ventas — últimos 12 meses" accent={C_SKY}>
            {tendenciaData.every(d => d.ganado === 0) ? <NoData msg="Sin ventas ganadas en los últimos 12 meses" /> : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tendenciaData} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 9.5 }} angle={-20} textAnchor="end" />
                    <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 9.5 }} />
                    <Tooltip content={<MultiTooltip />} />
                    {monthlyTarget > 0 && (
                      <ReferenceLine y={monthlyTarget} stroke={C_AMBER} strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: `Meta ${fmtMoney(monthlyTarget)}`, position: 'insideTopRight', fontSize: 9, fill: C_AMBER, fontWeight: 700 }}
                      />
                    )}
                    <Bar dataKey="ganado" name="Ganado" radius={[3,3,0,0]}>
                      {tendenciaData.map((entry, i) => (
                        <Cell key={i} fill={entry.ganado >= monthlyTarget ? C_GREEN : entry.ganado >= monthlyTarget * 0.7 ? C_AMBER : C_NAVY} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Embudo de ventas (pipeline activo)" accent="#7c3aed">
            {embudoData.length === 0 ? <NoData msg="Sin deals en proceso" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                {(() => {
                  const maxMonto = Math.max(...embudoData.map(e => e.monto), 1)
                  return embudoData.map((e, i) => {
                    const w = (e.monto / maxMonto) * 100
                    const colors = [C_NAVY, C_SKY, C_AMBER, C_GREEN, '#7c3aed', '#ec4899', '#14b8a6']
                    const color  = colors[i % colors.length]
                    return (
                      <div key={e.stage}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--n-700)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                            {e.stage}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--n-500)', flexShrink: 0 }}>
                            {e.count} deal{e.count !== 1 ? 's' : ''} · {fmtMoney(e.monto)}
                          </span>
                        </div>
                        <div style={{ height: 10, background: 'var(--n-150)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })
                })()}
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--n-500)', borderTop: '1px solid var(--n-150)', paddingTop: 6 }}>
                  <span>{embudoData.reduce((s, e) => s + e.count, 0)} deals en proceso</span>
                  <span>{fmtMoney(embudoData.reduce((s, e) => s + e.monto, 0))} en pipeline</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Deals estancados ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: C_AMBER, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Deals estancados — sin movimiento ≥ 14 días
              </span>
              <Info size={12} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {dealsEstancados.length} deal{dealsEstancados.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, paddingLeft: 16, position: 'sticky', top: 0, zIndex: 1 }}>Deal</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>Responsable</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>Etapa</th>
                  <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Monto</th>
                  <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Prob.</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>Cierre</th>
                  <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Días sin mov.</th>
                </tr>
              </thead>
              <tbody>
                {dealsEstancados.length === 0
                  ? <tr><td colSpan={7} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)', paddingLeft: 16 }}>Sin deals estancados</td></tr>
                  : dealsEstancados.map((d, i) => {
                      const urgente = d.diasSinMov >= 30
                      return (
                        <tr key={d.id} style={{ background: urgente ? '#fef3c718' : i % 2 === 0 ? 'var(--n-0)' : 'var(--n-50)' }}>
                          <td style={{ ...TD, paddingLeft: 16, maxWidth: 230 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                              {d.title.length > 55 ? d.title.slice(0, 55) + '…' : d.title}
                            </div>
                          </td>
                          <td style={{ ...TD, fontSize: 11 }}>{shortName(d.assigned_by_name)}</td>
                          <td style={{ ...TD, fontSize: 11 }}>{d.stage_name}</td>
                          <td style={{ ...TD_NUM, fontWeight: 600 }}>{fmtMoney(parseAmt(d))}</td>
                          <td style={TD_NUM}>{d.probability}%</td>
                          <td style={{ ...TD, fontSize: 11 }}>{fmtDate(d.closedate)}</td>
                          <td style={{ ...TD_NUM, fontWeight: 700, color: urgente ? C_RED : C_AMBER }}>
                            {d.diasSinMov}d
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Priority deals ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: C_NAVY, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deals en proceso — Alta prioridad
            </span>
            <Info size={12} style={{ color: '#94a3b8' }} />
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 240, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, paddingLeft: 16, position: 'sticky', top: 0, zIndex: 1 }}>Deal</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>Responsable</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>Etapa</th>
                  <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Prob.</th>
                  <th style={{ ...TH, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Monto</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, zIndex: 1 }}>Cierre</th>
                </tr>
              </thead>
              <tbody>
                {priorityDeals.length === 0
                  ? <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)', paddingLeft: 16 }}>Sin deals en proceso</td></tr>
                  : priorityDeals.map((d, i) => (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-50)' }}>
                      <td style={{ ...TD, paddingLeft: 16, maxWidth: 240 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {d.title.length > 55 ? d.title.slice(0, 55) + '…' : d.title}
                        </div>
                      </td>
                      <td style={{ ...TD, fontSize: 11 }}>{shortName(d.assigned_by_name)}</td>
                      <td style={{ ...TD, fontSize: 11 }}>{d.stage_name}</td>
                      <td style={{ ...TD_NUM, color: parseInt(d.probability) >= 70 ? C_GREEN : parseInt(d.probability) >= 40 ? C_AMBER : 'var(--n-800)', fontWeight: 700 }}>
                        {d.probability}%
                      </td>
                      <td style={{ ...TD_NUM, fontWeight: 600 }}>{fmtMoney(parseAmt(d))}</td>
                      <td style={{ ...TD, fontSize: 11 }}>{fmtDate(d.closedate)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Deals list ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lista de Deals · {dateRange.label}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--n-400)' }}>({rangeDeals.length} deals)</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, position: 'sticky', top: 0, paddingLeft: 16 }}>Deal</th>
                  <th style={{ ...TH, position: 'sticky', top: 0 }}>Responsable</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, textAlign: 'right' }}>Monto</th>
                  <th style={{ ...TH, position: 'sticky', top: 0, textAlign: 'right' }}>Prob.</th>
                  <th style={{ ...TH, position: 'sticky', top: 0 }}>Cierre</th>
                  <th style={{ ...TH, position: 'sticky', top: 0 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {dealsList.length === 0
                  ? <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)', paddingLeft: 16 }}>Sin deals en el período seleccionado</td></tr>
                  : dealsList.map((d, i) => (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-50)' }}>
                      <td style={{ ...TD, paddingLeft: 16, maxWidth: 240 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {d.title.length > 55 ? d.title.slice(0, 55) + '…' : d.title}
                        </div>
                      </td>
                      <td style={{ ...TD, fontSize: 11 }}>{shortName(d.assigned_by_name)}</td>
                      <td style={{ ...TD_NUM, fontWeight: 600 }}>{fmtMoney(parseAmt(d))}</td>
                      <td style={TD_NUM}>{d.probability}%</td>
                      <td style={{ ...TD, fontSize: 11 }}>{fmtDate(d.closedate)}</td>
                      <td style={TD}><StageBadge sem={d.stage_semantic_id || 'P'} /></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 24px', background: 'var(--n-0)', borderTop: '1px solid var(--n-150)', flexShrink: 0, fontSize: 11.5, color: 'var(--n-500)', textAlign: 'right' }}>
        Última actualización: {fmtTimestamp(lastSync)}
      </div>

      {/* ── Settings modal ──────────────────────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          targets={targets}
          saving={targetsSaving}
          onSave={upsert}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  )
}
