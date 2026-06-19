import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { RefreshCw, Info, Settings } from 'lucide-react'
import {
  format, parseISO, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, startOfYear, getDayOfYear, getDaysInMonth,
  isWithinInterval,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useDeals, type Deal } from '../../hooks/useDeals'
import { useActivities, type Activity } from '../../hooks/useActivities'
import { useUnitTargets } from '../../hooks/useUnitTargets'
import { PageLoader } from '../../components/ui/Loader'

// ── constants ─────────────────────────────────────────────────────────────────

const UNIT_TABS = ['PROSER', 'UNAI', 'UNAP', 'UNAU', 'UNEPC', 'UNVA'] as const
type UnitTab = typeof UNIT_TABS[number]

const SUB_TABS = ['N/A', 'PAU', 'PIC', 'Proyectos', 'Servicio'] as const
type SubTab = typeof SUB_TABS[number]

const CONTENT_TABS = ['Semana Actual', 'Semana Anterior', 'Individual'] as const
type ContentTab = typeof CONTENT_TABS[number]

// Chart colors
const C_NAVY  = '#1e3a5f'
const C_AMBER = '#f59e0b'
const C_SKY   = '#0ea5e9'

// ── helpers ───────────────────────────────────────────────────────────────────

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

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).join(' ')
}

function parseAmt(d: Deal): number {
  return parseFloat(d.opportunity) || 0
}

function inWeek(dateStr: string, start: Date, end: Date): boolean {
  if (!dateStr) return false
  try {
    return isWithinInterval(parseISO(dateStr), { start, end })
  } catch { return false }
}

function fmtTimestamp(iso: string): string {
  if (!iso) return ''
  try {
    const d = parseISO(iso)
    return format(d, "d 'de' MMM. 'del' yyyy hh:mm aaa", { locale: es })
  } catch { return iso }
}

// ── filtering ─────────────────────────────────────────────────────────────────

function filterByUnit(deals: Deal[], unit: UnitTab): Deal[] {
  return deals.filter(d => {
    // Primary: check the "Unidades de Negocio Involucradas" field (UF_CRM_1579123522)
    if (d.business_units) {
      return d.business_units.split(',').includes(unit)
    }
    // Fallback: category_name for old cached data without business_units
    return d.category_name.includes(unit)
  })
}

function filterBySub(deals: Deal[], sub: SubTab): Deal[] {
  if (sub === 'N/A') return deals
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

// ── reusable UI ───────────────────────────────────────────────────────────────

function Card({ title, children, style }: {
  title?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-700)' }}>{title}</span>
          <Info size={12} style={{ color: 'var(--n-400)', flexShrink: 0 }} />
        </div>
      )}
      {children}
    </div>
  )
}

function NoData({ msg = 'Sin datos' }: { msg?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--n-400)', fontSize: 12 }}>
      {msg}
    </div>
  )
}

function MultiTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--n-200)', borderRadius: 7, padding: '7px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
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
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 999 }} />
    </div>
  )
}

// ── semicircle gauge ──────────────────────────────────────────────────────────

function SemiCircleGauge({ label, value, target, sub }: {
  label: string; value: number; target: number; sub?: string
}) {
  const R = 76
  const cx = 100, cy = 98
  // Arc from (cx-R, cy) counter-clockwise over top to (cx+R, cy)
  // Full semi-circle length = π * R
  const circumHalf = Math.PI * R
  const ratio = target > 0 ? Math.min(1, value / target) : 0
  const filled = ratio * circumHalf
  const gap    = circumHalf - filled + 1

  const arcColor = ratio >= 1 ? '#16a34a' : ratio >= 0.7 ? C_AMBER : C_NAVY

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 180 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-700)', marginBottom: 0, textAlign: 'center' }}>{label}</div>
      <svg width="170" height="100" viewBox="0 0 200 115" style={{ overflow: 'visible' }}>
        {/* background arc */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="var(--n-150)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        {/* value arc */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke={arcColor}
          strokeWidth="15"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${gap}`}
        />
        {/* percentage */}
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize="22" fontWeight="700" fill={C_NAVY} fontFamily="inherit">
          {Math.round(ratio * 100)}%
        </text>
        {/* value label */}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize="10" fill="#1d4ed8" fontFamily="inherit" fontWeight="600">
          {fmtMoney(value)}
        </text>
        {/* scale labels */}
        <text x={cx - R} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--n-400)" fontFamily="inherit">$0</text>
        <text x={cx + R} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--n-400)" fontFamily="inherit">{fmtMoney(target)}</text>
      </svg>
      {sub && <div style={{ fontSize: 10, color: 'var(--n-500)', marginTop: -6 }}>{sub}</div>}
    </div>
  )
}

// ── settings modal ────────────────────────────────────────────────────────────

function SettingsModal({ targets, saving, onSave, onClose }: {
  targets: Record<string, { monthly_target: number; annual_target: number }>
  saving: boolean
  onSave: (unitId: string, monthly: number, annual: number) => Promise<void>
  onClose: () => void
}) {
  // Format a raw numeric string with thousands separator, max 2 decimals
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
    Object.fromEntries(
      UNIT_TABS.map(u => [u, fmtInputNum(String(targets[u]?.annual_target ?? 0))])
    )
  )
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

  const handleChange = (unitId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const el      = e.target
    const cursor  = el.selectionStart ?? 0
    const raw     = el.value

    // Count digits before cursor in the raw (user-typed) value
    const digitsBeforeCursor = raw.slice(0, cursor).replace(/[^0-9]/g, '').length

    // Clean and format
    const stripped  = raw.replace(/,/g, '')
    const onlyValid = stripped.replace(/[^0-9.]/g, '')
    const parts     = onlyValid.split('.')
    const limited   = parts.length > 1
      ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
      : parts[0]
    const formatted = fmtInputNum(limited)

    setDrafts(prev => ({ ...prev, [unitId]: formatted }))

    // Restore cursor: find position after N digits in the new formatted string
    requestAnimationFrame(() => {
      const input = inputRefs.current[unitId]
      if (!input) return
      let digits = 0
      let pos    = 0
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
      <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', minWidth: 420, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
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
              const annual  = Number(drafts[u]) || 0
              const monthly = Math.round(annual / 12)
              return (
                <tr key={u}>
                  <td style={{ ...TD, fontWeight: 700 }}>{u}</td>
                  <td style={TD_NUM}>
                    <input
                      ref={el => { inputRefs.current[u] = el }}
                      type="text"
                      inputMode="decimal"
                      value={drafts[u] ?? ''}
                      onChange={e => handleChange(u, e)}
                      style={{ width: 150, textAlign: 'right', border: '1px solid var(--n-200)', borderRadius: 5, padding: '3px 8px', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
                    />
                  </td>
                  <td style={{ ...TD_NUM, color: 'var(--n-500)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoneyLong(monthly)}</td>
                  <td style={TD}>
                    <button
                      onClick={() => handleSave(u)}
                      disabled={saving}
                      style={{
                        padding: '3px 14px', borderRadius: 6, fontSize: 11.5, border: 'none', cursor: 'pointer',
                        background: saved[u] ? '#16a34a' : C_NAVY, color: '#fff',
                      }}
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
          <button
            onClick={onClose}
            style={{ padding: '6px 22px', borderRadius: 7, background: 'var(--n-100)', color: 'var(--n-700)', border: 'none', cursor: 'pointer', fontSize: 12.5 }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── KPI number card ───────────────────────────────────────────────────────────

function KpiNum({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ flex: 1, minWidth: 100, background: 'var(--n-50)', border: '1px solid var(--n-200)', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C_NAVY, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--n-500)', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── activity bar chart ────────────────────────────────────────────────────────

function ActivityBarChart({ data }: { data: { name: string; llamadas: number; reuniones: number; visitas: number }[] }) {
  if (!data.length) return <NoData msg="Sin datos de actividades" />
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
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

// ── build activity chart data ─────────────────────────────────────────────────
// Uses end_time when available, falls back to created

function buildActivityData(
  activities: Activity[],
  start: Date,
  end: Date,
): { name: string; llamadas: number; reuniones: number; visitas: number }[] {
  const map: Record<string, { llamadas: number; reuniones: number; visitas: number }> = {}
  activities.forEach(a => {
    const dateStr = a.end_time || a.created
    if (!inWeek(dateStr, start, end)) return
    const name = shortName(a.responsible_name || 'Sin asignar')
    if (!map[name]) map[name] = { llamadas: 0, reuniones: 0, visitas: 0 }
    if (a.type_id === '2') map[name].llamadas++
    else if (a.type_id === '1') map[name].reuniones++
    else if (a.type_id === '8') map[name].visitas++
  })
  return Object.entries(map).map(([name, v]) => ({ name, ...v }))
}

// ── table styles ──────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: 'var(--n-600)',
  padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid var(--n-200)',
  background: 'var(--n-50)', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = {
  fontSize: 11.5, padding: '4px 6px', borderBottom: '1px solid var(--n-100)',
  color: 'var(--n-800)',
}
const TD_NUM: React.CSSProperties = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const TD_TOTAL: React.CSSProperties = { ...TD, fontWeight: 700, color: C_NAVY }
const TD_TOTAL_NUM: React.CSSProperties = { ...TD_NUM, fontWeight: 700, color: C_NAVY }

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Semana Actual
// ─────────────────────────────────────────────────────────────────────────────

function TabSemanaActual({ deals, activities }: { deals: Deal[]; activities: Activity[] }) {
  const now    = useMemo(() => new Date(), [])
  const wStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [now])
  const wEnd   = useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), [now])
  const mStart = useMemo(() => startOfMonth(now), [now])

  const actWeekData = useMemo(() => buildActivityData(activities, wStart, wEnd), [activities, wStart, wEnd])

  const amtWeekData = useMemo(() => {
    const map: Record<string, { creado: number; ganado: number }> = {}
    // Creado: deals creados esta semana (por date_create)
    deals.forEach(d => {
      if (!inWeek(d.date_create, wStart, wEnd)) return
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      if (!map[name]) map[name] = { creado: 0, ganado: 0 }
      map[name].creado += parseAmt(d)
    })
    // Ganado: deals ganados esta semana (por closedate)
    deals.forEach(d => {
      if (d.stage_semantic_id !== 'S') return
      if (!inWeek(d.closedate, wStart, wEnd)) return
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      if (!map[name]) map[name] = { creado: 0, ganado: 0 }
      map[name].ganado += parseAmt(d)
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.creado - a.creado)
  }, [deals, wStart, wEnd])

  const totalCreado = amtWeekData.reduce((s, r) => s + r.creado, 0)
  const totalGanado = amtWeekData.reduce((s, r) => s + r.ganado, 0)

  const repNames = useMemo(() => {
    const s = new Set<string>()
    deals.forEach(d => { if (d.assigned_by_name) s.add(d.assigned_by_name) })
    return Array.from(s).sort()
  }, [deals])

  const fallas = useMemo(() => repNames.map(rep => {
    const rDeals = deals.filter(d => d.assigned_by_name === rep)
    return {
      name: shortName(rep),
      vendidas: rDeals.length,
      sinCompany: rDeals.filter(d => !d.company_id || d.company_id === '0').length,
      sinDeadline: rDeals.filter(d => !d.closedate).length,
      probErrada: rDeals.filter(d => d.probability === '0' && d.stage_semantic_id !== 'F').length,
    }
  }), [deals, repNames])

  const fallasTotals = useMemo(() => fallas.reduce(
    (acc, r) => ({ vendidas: acc.vendidas + r.vendidas, sinCompany: acc.sinCompany + r.sinCompany, sinDeadline: acc.sinDeadline + r.sinDeadline, probErrada: acc.probErrada + r.probErrada }),
    { vendidas: 0, sinCompany: 0, sinDeadline: 0, probErrada: 0 }
  ), [fallas])

  const visitasByRep = useMemo(() => {
    const map: Record<string, number> = {}
    activities.forEach(a => {
      if (a.type_id !== '8') return
      const dateStr = a.end_time || a.created
      if (!inWeek(dateStr, mStart, now)) return
      const name = shortName(a.responsible_name || 'Sin asignar')
      map[name] = (map[name] || 0) + 1
    })
    return map
  }, [activities, mStart, now])

  const visitasReps = useMemo(() =>
    repNames.map(rep => ({ name: shortName(rep), acumulado: visitasByRep[shortName(rep)] ?? 0 })),
    [repNames, visitasByRep]
  )

  const weekDays = useMemo(() => {
    const days = []
    let d = new Date(wStart)
    while (d <= wEnd) {
      days.push(format(d, 'EEE dd', { locale: es }))
      d = new Date(d.getTime() + 86400000)
    }
    return days
  }, [wStart, wEnd])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <Card title="Actividades en la semana" style={{ flex: 1 }}>
          <ActivityBarChart data={actWeekData} />
        </Card>

        <Card style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-700)' }}>Monto Creado/Ganado en la semana</span>
            <Info size={12} style={{ color: 'var(--n-400)' }} />
          </div>
          <div style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600 }}>
            ha creado {fmtMoney(totalCreado)} y ha ganado {fmtMoney(totalGanado)}
          </div>
          {amtWeekData.length === 0 ? <NoData msg="Sin deals creados esta semana" /> : (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amtWeekData} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
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

      <div style={{ display: 'flex', gap: 14 }}>
        <Card title="Detección de fallas en las Opps" style={{ flex: 1 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>RESPONSABLE</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Vendidas</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Sin Company</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Sin Deadline</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Prob. Errada</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Sin Producto</th>
                </tr>
              </thead>
              <tbody>
                {fallas.map(r => (
                  <tr key={r.name}>
                    <td style={TD}>{r.name}</td>
                    <td style={TD_NUM}>{r.vendidas}</td>
                    <td style={{ ...TD_NUM, color: r.sinCompany > 0 ? '#ef4444' : undefined }}>{r.sinCompany}</td>
                    <td style={{ ...TD_NUM, color: r.sinDeadline > 0 ? '#ef4444' : undefined }}>{r.sinDeadline}</td>
                    <td style={{ ...TD_NUM, color: r.probErrada > 0 ? '#f59e0b' : undefined }}>{r.probErrada}</td>
                    <td style={TD_NUM}>N/D</td>
                  </tr>
                ))}
                <tr>
                  <td style={TD_TOTAL}>Total</td>
                  <td style={TD_TOTAL_NUM}>{fallasTotals.vendidas}</td>
                  <td style={TD_TOTAL_NUM}>{fallasTotals.sinCompany}</td>
                  <td style={TD_TOTAL_NUM}>{fallasTotals.sinDeadline}</td>
                  <td style={TD_TOTAL_NUM}>{fallasTotals.probErrada}</td>
                  <td style={TD_TOTAL_NUM}>N/D</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Visitas a clientes" style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>RESPONSABLE</th>
                <th style={{ ...TH, textAlign: 'right' }}>META MENSUAL</th>
                <th style={{ ...TH, textAlign: 'right' }}>Acumulado del mes</th>
              </tr>
            </thead>
            <tbody>
              {visitasReps.map(r => (
                <tr key={r.name}>
                  <td style={TD}>{r.name}</td>
                  <td style={TD_NUM}>5</td>
                  <td style={TD_NUM}>{activities.length === 0 ? '-' : r.acumulado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-700)' }}>Registro de horas</span>
            <Info size={12} style={{ color: 'var(--n-400)' }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>RESPONSABLE</th>
                  {weekDays.map(d => <th key={d} style={{ ...TH, textAlign: 'center' }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {repNames.slice(0, 6).map(rep => (
                  <tr key={rep}>
                    <td style={TD}>{shortName(rep)}</td>
                    {weekDays.map(d => <td key={d} style={{ ...TD, textAlign: 'center', background: 'var(--n-50)' }}>N/D</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Semana Anterior
// ─────────────────────────────────────────────────────────────────────────────

function TabSemanaAnterior({
  deals, activities, monthlyTarget, annualTarget,
}: { deals: Deal[]; activities: Activity[]; monthlyTarget: number; annualTarget: number }) {
  const now    = useMemo(() => new Date(), [])
  const prev   = useMemo(() => subWeeks(now, 1), [now])
  const pStart = useMemo(() => startOfWeek(prev, { weekStartsOn: 1 }), [prev])
  const pEnd   = useMemo(() => endOfWeek(prev, { weekStartsOn: 1 }), [prev])
  const mStart = useMemo(() => startOfMonth(now), [now])
  const yStart = useMemo(() => startOfYear(now), [now])

  const doy = getDayOfYear(now)
  const dim = getDaysInMonth(now)

  const cantData = useMemo(() => {
    const map: Record<string, { sinCod: number; conCod: number }> = {}
    deals.forEach(d => {
      if (!inWeek(d.date_create, pStart, pEnd)) return
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      if (!map[name]) map[name] = { sinCod: 0, conCod: 0 }
      if (d.title.includes('||')) map[name].conCod++
      else map[name].sinCod++
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
  }, [deals, pStart, pEnd])

  const montoData = useMemo(() => {
    const map: Record<string, number> = {}
    deals.forEach(d => {
      if (!inWeek(d.date_create, pStart, pEnd)) return
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      map[name] = (map[name] || 0) + parseAmt(d)
    })
    return Object.entries(map).map(([name, monto]) => ({ name, monto })).sort((a, b) => b.monto - a.monto)
  }, [deals, pStart, pEnd])

  const ganadoData = useMemo(() => {
    const map: Record<string, number> = {}
    deals.forEach(d => {
      if (d.stage_semantic_id !== 'S') return
      if (!inWeek(d.closedate, pStart, pEnd)) return
      const name = shortName(d.assigned_by_name || 'Sin asignar')
      map[name] = (map[name] || 0) + parseAmt(d)
    })
    return Object.entries(map).map(([name, ganado]) => ({ name, ganado })).sort((a, b) => b.ganado - a.ganado)
  }, [deals, pStart, pEnd])

  const actPrevData = useMemo(() => buildActivityData(activities, pStart, pEnd), [activities, pStart, pEnd])

  const now90 = useMemo(() => { const d = new Date(now); d.setDate(d.getDate() - 90); return d }, [now])
  const activeReps = useMemo(() => {
    const s = new Set<string>()
    deals.forEach(d => {
      try { if (parseISO(d.date_create) >= now90) s.add(d.assigned_by_name) } catch { /* skip */ }
    })
    return Array.from(s).filter(Boolean).sort()
  }, [deals, now90])
  const repCount = activeReps.length || 1

  const repMonthly = monthlyTarget / repCount
  const repAnnual  = annualTarget  / repCount

  const mtdByRep = useMemo(() => {
    const map: Record<string, number> = {}
    deals.forEach(d => {
      if (d.stage_semantic_id !== 'S') return
      try {
        const dt = parseISO(d.closedate)
        if (dt >= mStart && dt <= now) {
          const name = d.assigned_by_name || 'Sin asignar'
          map[name] = (map[name] || 0) + parseAmt(d)
        }
      } catch { /* skip */ }
    })
    return map
  }, [deals, mStart, now])

  const ytdByRep = useMemo(() => {
    const map: Record<string, number> = {}
    deals.forEach(d => {
      if (d.stage_semantic_id !== 'S') return
      try {
        const dt = parseISO(d.closedate)
        if (dt >= yStart && dt <= now) {
          const name = d.assigned_by_name || 'Sin asignar'
          map[name] = (map[name] || 0) + parseAmt(d)
        }
      } catch { /* skip */ }
    })
    return map
  }, [deals, yStart, now])

  const targetMTD = repMonthly * (now.getDate() / dim)
  const targetYTD = repAnnual  * (doy / 365)

  const repsMonthly = activeReps.map(rep => {
    const mtd = mtdByRep[rep] || 0
    return { name: shortName(rep), meta: repMonthly, targetMtd: targetMTD, mtd, pct: pct(mtd, targetMTD) }
  })
  const repsAnnual = activeReps.map(rep => {
    const ytd = ytdByRep[rep] || 0
    return { name: shortName(rep), meta: repAnnual, targetYtd: targetYTD, ytd, pct: pct(ytd, targetYTD) }
  })

  const totalMtd = repsMonthly.reduce((s, r) => s + r.mtd, 0)
  const totalYtd = repsAnnual.reduce((s, r) => s + r.ytd, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <Card title="Cantidad de Opp. creadas: Semana Anterior" style={{ flex: 1 }}>
          {cantData.length === 0 ? <NoData /> : (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cantData} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
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

        <Card title="Monto Creado: Semana Anterior" style={{ flex: 1 }}>
          {montoData.length === 0 ? <NoData /> : (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={montoData} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9.5 }} angle={-20} textAnchor="end" />
                  <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 9.5 }} />
                  <Tooltip content={<MultiTooltip />} />
                  <Bar dataKey="monto" name="Monto" fill={C_NAVY} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Monto Ganado: Semana Anterior" style={{ flex: 1 }}>
          {ganadoData.length === 0 ? <NoData /> : (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ganadoData} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9.5 }} angle={-20} textAnchor="end" />
                  <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 9.5 }} />
                  <Tooltip content={<MultiTooltip />} />
                  <Bar dataKey="ganado" name="Ganado" fill={C_AMBER} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <Card title="Actividades Comerciales: Semana Anterior" style={{ flex: 1 }}>
          <ActivityBarChart data={actPrevData} />
        </Card>

        <Card title="Avance de Ventas Mensual por Unidad" style={{ flex: 1 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>RESPONSABLE</th>
                  <th style={{ ...TH, textAlign: 'right' }}>META MENSUAL</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Target MTD</th>
                  <th style={{ ...TH, textAlign: 'right' }}>MTD</th>
                  <th style={{ ...TH, textAlign: 'right' }}>%Avance</th>
                </tr>
              </thead>
              <tbody>
                {repsMonthly.map(r => (
                  <tr key={r.name}>
                    <td style={TD}>{r.name}</td>
                    <td style={TD_NUM}>{fmtMoneyLong(r.meta)}</td>
                    <td style={TD_NUM}>{fmtMoneyLong(r.targetMtd)}</td>
                    <td style={TD_NUM}>{fmtMoneyLong(r.mtd)}</td>
                    <td style={TD_NUM}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#1d4ed8', minWidth: 36 }}>{r.pct}%</span>
                        <ProgressBar value={r.mtd} max={r.targetMtd} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={TD_TOTAL}>Total</td>
                  <td style={TD_TOTAL_NUM}>{fmtMoneyLong(monthlyTarget)}</td>
                  <td style={TD_TOTAL_NUM}>{fmtMoneyLong(targetMTD * repCount)}</td>
                  <td style={TD_TOTAL_NUM}>{fmtMoneyLong(totalMtd)}</td>
                  <td style={TD_TOTAL_NUM}>
                    <span style={{ color: '#1d4ed8' }}>{pctStr(totalMtd, targetMTD * repCount)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Avance de Ventas Anual por unidad" style={{ flex: 1 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>RESPONSABLE</th>
                  <th style={{ ...TH, textAlign: 'right' }}>META ANUAL</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Target YTD</th>
                  <th style={{ ...TH, textAlign: 'right' }}>YTD</th>
                  <th style={{ ...TH, textAlign: 'right' }}>%Avance</th>
                </tr>
              </thead>
              <tbody>
                {repsAnnual.map(r => (
                  <tr key={r.name}>
                    <td style={TD}>{r.name}</td>
                    <td style={TD_NUM}>{fmtMoneyLong(r.meta)}</td>
                    <td style={TD_NUM}>{fmtMoneyLong(r.targetYtd)}</td>
                    <td style={TD_NUM}>{fmtMoneyLong(r.ytd)}</td>
                    <td style={TD_NUM}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#1d4ed8', minWidth: 36 }}>{r.pct}%</span>
                        <ProgressBar value={r.ytd} max={r.targetYtd} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={TD_TOTAL}>Total</td>
                  <td style={TD_TOTAL_NUM}>{fmtMoneyLong(annualTarget)}</td>
                  <td style={TD_TOTAL_NUM}>{fmtMoneyLong(targetYTD * repCount)}</td>
                  <td style={TD_TOTAL_NUM}>{fmtMoneyLong(totalYtd)}</td>
                  <td style={TD_TOTAL_NUM}>
                    <span style={{ color: '#1d4ed8' }}>{pctStr(totalYtd, targetYTD * repCount)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Individual
// ─────────────────────────────────────────────────────────────────────────────

function MiniProgressCard({ label, value, target }: { label: string; value: number; target: number }) {
  const p = pct(value, target)
  const bars = [25, 50, 75, 100]
  return (
    <div className="card" style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-600)' }}>{label}</div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32 }}>
        {bars.map(b => (
          <div key={b} style={{
            flex: 1, borderRadius: 2,
            background: p >= b ? C_NAVY : 'var(--n-150)',
            height: `${(b / 100) * 100}%`,
            minHeight: 4,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C_NAVY }}>{p} %</div>
    </div>
  )
}

function TabIndividual({
  deals, activities, monthlyTarget, annualTarget,
}: { deals: Deal[]; activities: Activity[]; monthlyTarget: number; annualTarget: number }) {
  const now    = useMemo(() => new Date(), [])
  const mStart = useMemo(() => startOfMonth(now), [now])
  const yStart = useMemo(() => startOfYear(now), [now])
  const doy    = getDayOfYear(now)
  const dim    = getDaysInMonth(now)

  const allReps = useMemo(() => {
    const s = new Set<string>()
    deals.forEach(d => { if (d.assigned_by_name) s.add(d.assigned_by_name) })
    return ['Todos', ...Array.from(s).sort()]
  }, [deals])

  const [selectedRep, setSelectedRep] = useState('Todos')

  const filtered = useMemo(() =>
    selectedRep === 'Todos' ? deals : deals.filter(d => d.assigned_by_name === selectedRep),
    [deals, selectedRep]
  )

  const filteredActs = useMemo(() =>
    selectedRep === 'Todos' ? activities : activities.filter(a => a.responsible_name === selectedRep),
    [activities, selectedRep]
  )

  const sinCompany  = filtered.filter(d => !d.company_id || d.company_id === '0').length
  const sinDeadline = filtered.filter(d => !d.closedate).length
  const probErrada  = filtered.filter(d => d.probability === '0' && d.stage_semantic_id !== 'F').length

  const now90 = useMemo(() => { const d = new Date(now); d.setDate(d.getDate() - 90); return d }, [now])
  const activeReps = useMemo(() => {
    const s = new Set<string>()
    deals.forEach(d => {
      try { if (parseISO(d.date_create) >= now90) s.add(d.assigned_by_name) } catch { /* skip */ }
    })
    return Array.from(s).filter(Boolean)
  }, [deals, now90])
  const repCount = activeReps.length || 1

  const isAll       = selectedRep === 'Todos'
  const metaAnual   = isAll ? annualTarget   : annualTarget   / repCount
  const metaMensual = isAll ? monthlyTarget  : monthlyTarget  / repCount
  const targetMTD   = metaMensual * (now.getDate() / dim)
  const targetYTD  = metaAnual   * (doy / 365)

  const mtd = useMemo(() =>
    filtered.filter(d => {
      if (d.stage_semantic_id !== 'S') return false
      try { const dt = parseISO(d.closedate); return dt >= mStart && dt <= now } catch { return false }
    }).reduce((s, d) => s + parseAmt(d), 0),
    [filtered, mStart, now]
  )

  const ytd = useMemo(() =>
    filtered.filter(d => {
      if (d.stage_semantic_id !== 'S') return false
      try { const dt = parseISO(d.closedate); return dt >= yStart && dt <= now } catch { return false }
    }).reduce((s, d) => s + parseAmt(d), 0),
    [filtered, yStart, now]
  )

  const actMonthData = useMemo(() => {
    const map: Record<string, { llamadas: number; reuniones: number; visitas: number }> = {}
    filteredActs.forEach(a => {
      const dateStr = a.end_time || a.created
      try {
        const dt = parseISO(dateStr)
        if (dt < mStart || dt > now) return
      } catch { return }
      const name = shortName(a.responsible_name || 'Sin asignar')
      if (!map[name]) map[name] = { llamadas: 0, reuniones: 0, visitas: 0 }
      if (a.type_id === '2') map[name].llamadas++
      else if (a.type_id === '1') map[name].reuniones++
      else if (a.type_id === '8') map[name].visitas++
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
  }, [filteredActs, mStart, now])

  const totalLlamadas  = filteredActs.filter(a => a.type_id === '2').length
  const totalReuniones = filteredActs.filter(a => a.type_id === '1').length
  const totalVisitas   = filteredActs.filter(a => a.type_id === '8').length
  const actComerciales = totalLlamadas + totalReuniones
  const actMeta        = 120
  const visitasMeta    = 20

  const priorityDeals = useMemo(() =>
    filtered
      .filter(d => (d.stage_semantic_id || 'P') === 'P')
      .sort((a, b) => parseInt(b.probability) - parseInt(a.probability))
      .slice(0, 8),
    [filtered]
  )

  const fullDeals = useMemo(() =>
    [...filtered]
      .sort((a, b) => (b.date_modify > a.date_modify ? 1 : -1))
      .slice(0, 20),
    [filtered]
  )

  const fmtDate = (iso: string) => {
    try { return iso ? format(parseISO(iso), 'dd/MM/yyyy') : '—' } catch { return '—' }
  }

  const stageBadge = (sem: string) => {
    const map: Record<string, [string, string]> = {
      S: ['Ganado', '#16a34a'],
      F: ['Perdido', '#ef4444'],
      P: ['En proceso', '#6366f1'],
    }
    const [label, color] = map[sem] ?? ['En proceso', '#6366f1']
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: color + '18', color }}>
        {label}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-600)', letterSpacing: '0.06em' }}>RESPONSABLE</span>
        <select
          value={selectedRep}
          onChange={e => setSelectedRep(e.target.value)}
          style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--n-200)', fontSize: 12.5, background: '#fff', color: 'var(--n-800)' }}
        >
          {allReps.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <KpiNum label="Total Deals"  value={filtered.length} />
        <KpiNum label="Sin Company"  value={sinCompany} />
        <KpiNum label="Sin Deadline" value={sinDeadline} />
        <KpiNum label="Prob. Errada" value={probErrada} />
        <KpiNum label="Sin Producto" value="N/D" />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto' }}>
          <div className="card" style={{ padding: '12px 18px', minWidth: 150 }}>
            <div style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, marginBottom: 4 }}>META ANUAL</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C_NAVY, lineHeight: 1 }}>{fmtMoney(metaAnual)}</div>
          </div>
          <div className="card" style={{ padding: '12px 18px', minWidth: 150 }}>
            <div style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, marginBottom: 4 }}>META MENSUAL</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C_NAVY, lineHeight: 1 }}>{fmtMoney(metaMensual)}</div>
          </div>
        </div>

        <MiniProgressCard label="Avance en Meta Anual"       value={ytd} target={metaAnual} />
        <MiniProgressCard label="Venta Anual vs Target YTD"  value={ytd} target={targetYTD} />
        <MiniProgressCard label="Venta Mensual vs Target MTD" value={mtd} target={targetMTD} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto' }}>
          <div className="card" style={{ padding: '12px 18px', minWidth: 150 }}>
            <div style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, marginBottom: 4 }}>YTD ACTUAL</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C_NAVY, lineHeight: 1 }}>{fmtMoney(ytd)}</div>
          </div>
          <div className="card" style={{ padding: '12px 18px', minWidth: 150 }}>
            <div style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, marginBottom: 4 }}>MTD ACTUAL</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C_NAVY, lineHeight: 1 }}>{fmtMoney(mtd)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        <Card title="Actividades del mes" style={{ flex: '0 0 280px' }}>
          <ActivityBarChart data={actMonthData} />
        </Card>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ background: C_NAVY, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>Deals en proceso — Alta prioridad</span>
              <Info size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, paddingLeft: 14 }}>Deal</th>
                    <th style={TH}>RESPONSABLE</th>
                    <th style={TH}>Etapa</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Prob.</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Monto</th>
                    <th style={TH}>Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityDeals.length === 0
                    ? <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)', paddingLeft: 14 }}>Sin deals en proceso</td></tr>
                    : priorityDeals.map((d, i) => (
                      <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={{ ...TD, paddingLeft: 14, maxWidth: 220 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                            {d.title.length > 50 ? d.title.slice(0, 50) + '…' : d.title}
                          </div>
                        </td>
                        <td style={{ ...TD, fontSize: 11 }}>{shortName(d.assigned_by_name)}</td>
                        <td style={{ ...TD, fontSize: 11 }}>{d.stage_name}</td>
                        <td style={{ ...TD_NUM, color: parseInt(d.probability) >= 70 ? '#16a34a' : 'var(--n-800)' }}>
                          {d.probability}%
                        </td>
                        <td style={TD_NUM}>{fmtMoney(parseAmt(d))}</td>
                        <td style={{ ...TD, fontSize: 11 }}>{fmtDate(d.closedate)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-700)' }}>Lista de Deals</span>
              <Info size={12} style={{ color: 'var(--n-400)', flexShrink: 0 }} />
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, paddingLeft: 14 }}>Deal</th>
                    <th style={TH}>RESPONSABLE</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Monto</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Prob.</th>
                    <th style={TH}>Cierre</th>
                    <th style={TH}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {fullDeals.map((d, i) => (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...TD, paddingLeft: 14, maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {d.title.length > 50 ? d.title.slice(0, 50) + '…' : d.title}
                        </div>
                      </td>
                      <td style={{ ...TD, fontSize: 11 }}>{shortName(d.assigned_by_name)}</td>
                      <td style={TD_NUM}>{fmtMoney(parseAmt(d))}</td>
                      <td style={TD_NUM}>{d.probability}%</td>
                      <td style={{ ...TD, fontSize: 11 }}>{fmtDate(d.closedate)}</td>
                      <td style={TD}>{stageBadge(d.stage_semantic_id || 'P')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div className="card" style={{ flex: 1, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-700)', marginBottom: 8 }}>
            Actividades comerciales (Llamadas + Reuniones)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C_NAVY }}>{actComerciales} / {actMeta}</span>
            <ProgressBar value={actComerciales} max={actMeta} />
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>{pctStr(actComerciales, actMeta)}</span>
          </div>
        </div>
        <div className="card" style={{ flex: 1, padding: '12px 16px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-700)', marginBottom: 8 }}>
            Visitas técnico comerciales
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C_NAVY }}>{totalVisitas} / {visitasMeta}</span>
            <ProgressBar value={totalVisitas} max={visitasMeta} />
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>{pctStr(totalVisitas, visitasMeta)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-700)' }}>Distribución de tiempos</span>
          <Info size={12} style={{ color: 'var(--n-400)' }} />
        </div>
        {(() => {
          const monthMap: Record<string, number> = {}
          filtered.forEach(d => {
            try {
              const mo = format(parseISO(d.date_create), 'MMM yy', { locale: es })
              monthMap[mo] = (monthMap[mo] || 0) + 1
            } catch { /* skip */ }
          })
          const entries = Object.entries(monthMap).slice(-12)
          const maxVal  = Math.max(...entries.map(([, v]) => v), 1)
          if (!entries.length) return <NoData msg="Sin datos" />
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {entries.map(([mo, cnt]) => (
                <div key={mo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--n-600)', width: 52, flexShrink: 0 }}>{mo}</span>
                  <div style={{ flex: 1, height: 14, background: 'var(--n-100)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(cnt / maxVal) * 100}%`, background: C_NAVY, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--n-600)', width: 24, textAlign: 'right', flexShrink: 0 }}>{cnt}</span>
                </div>
              ))}
            </div>
          )
        })()}
        <div style={{ fontSize: 10, color: 'var(--n-400)', marginTop: 8, textAlign: 'right' }}>
          Horas en el Sistema Pasado
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function DealsDashboardPage() {
  const { deals: allDeals, lastSync, loading: dealsLoading, syncing, sync } = useDeals()
  const { activities } = useActivities()
  const { targets, saving: targetsSaving, upsert } = useUnitTargets()

  const [activeUnit, setActiveUnit]       = useState<UnitTab>('PROSER')
  const [activeSub, setActiveSub]         = useState<SubTab>('N/A')
  const [activeContent, setActiveContent] = useState<ContentTab>('Semana Actual')
  const [showSettings, setShowSettings]   = useState(false)

  // Only block on deals; activities load independently
  if (dealsLoading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  )

  const now    = new Date()
  const mStart = startOfMonth(now)
  const yStart = startOfYear(now)
  const doy    = getDayOfYear(now)
  const today  = format(now, "EEEE, d 'de' MMM yyyy", { locale: es })

  const unitTarget = targets[activeUnit] ?? { monthly_target: 0, annual_target: 0 }
  const monthlyTarget = unitTarget.monthly_target
  const annualTarget  = unitTarget.annual_target

  // Filter deals
  const unitDeals      = filterByUnit(allDeals, activeUnit)
  const deals          = filterBySub(unitDeals, activeSub)

  // Filter activities to only those linked to deals in the selected unit
  const unitDealIds    = new Set(unitDeals.map(d => d.id))
  const unitActivities = activities.filter(a => unitDealIds.has(a.owner_id))

  // Header gauge values
  const mtdWon = unitDeals.filter(d => {
    if (d.stage_semantic_id !== 'S') return false
    try { const dt = parseISO(d.closedate); return dt >= mStart && dt <= now } catch { return false }
  }).reduce((s, d) => s + parseAmt(d), 0)

  const ytdWon = unitDeals.filter(d => {
    if (d.stage_semantic_id !== 'S') return false
    try { const dt = parseISO(d.closedate); return dt >= yStart && dt <= now } catch { return false }
  }).reduce((s, d) => s + parseAmt(d), 0)

  // YTD target = same period of the previous year (Jan 1 → mismo día del año anterior)
  // Así la comparación es manzanas con manzanas: ene–jun 2025 vs ene–jun 2026
  const prevYear = now.getFullYear() - 1
  const prevYearStart = new Date(prevYear, 0, 1)
  const prevYearEnd   = new Date(prevYear, 11, 31, 23, 59, 59)  // enero–diciembre completo
  const prevYearWon = unitDeals.filter(d => {
    if (d.stage_semantic_id !== 'S') return false
    try {
      const dt = parseISO(d.closedate)
      return dt >= prevYearStart && dt <= prevYearEnd
    } catch { return false }
  }).reduce((s, d) => s + parseAmt(d), 0)
  // Fallback to proportional annual target if no prior year data
  const ytdTarget = prevYearWon > 0 ? prevYearWon : annualTarget * (doy / 365)

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', background: '#f8fafc' }}>

      {/* ── Top header bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px', background: '#fff',
        borderBottom: '1px solid var(--n-150)', flexShrink: 0,
      }}>
        {/* Date + sync */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--n-600)' }}>{today}</span>
          <button
            onClick={sync}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--n-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <RefreshCw size={11} className={syncing ? 'spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </div>

        {/* Gauges */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <SemiCircleGauge
            label={`Meta Mensual ${activeUnit}`}
            value={mtdWon}
            target={monthlyTarget}
            sub={`${fmtMoney(mtdWon)} / ${fmtMoney(monthlyTarget)}`}
          />
          <SemiCircleGauge
            label={`YTD vs Año Anterior ${activeUnit}`}
            value={ytdWon}
            target={ytdTarget}
            sub={prevYearWon > 0
              ? `${now.getFullYear()}: ${fmtMoney(ytdWon)} | ${prevYear}: ${fmtMoney(prevYearWon)}`
              : `${now.getFullYear()} YTD: ${fmtMoney(ytdWon)} / est. ${fmtMoney(ytdTarget)}`
            }
          />
          <SemiCircleGauge
            label={`Meta Anual ${activeUnit}`}
            value={ytdWon}
            target={annualTarget}
            sub={`${fmtMoney(ytdWon)} / ${fmtMoney(annualTarget)}`}
          />
        </div>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          title="Configurar metas"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── Unit tabs (dark) ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', background: '#1e293b', flexShrink: 0, padding: '0 16px' }}>
        {UNIT_TABS.map(u => (
          <button
            key={u}
            onClick={() => { setActiveUnit(u); setActiveSub('N/A') }}
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

      {/* ── Sub-tabs (light) ──────────────────────────────────────────────── */}
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

      {/* ── Content tabs (pills) ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', padding: '8px 20px', gap: 6, flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--n-150)' }}>
        {CONTENT_TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveContent(t)}
            style={{
              padding: '5px 16px', borderRadius: 20,
              background: activeContent === t ? C_NAVY : 'var(--n-100)',
              color: activeContent === t ? '#fff' : 'var(--n-700)',
              fontSize: 12.5, fontWeight: activeContent === t ? 600 : 500,
              border: 'none', cursor: 'pointer',
              transition: 'background .15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {activeContent === 'Semana Actual' && (
          <TabSemanaActual deals={deals} activities={unitActivities} />
        )}
        {activeContent === 'Semana Anterior' && (
          <TabSemanaAnterior
            deals={deals}
            activities={unitActivities}
            monthlyTarget={monthlyTarget}
            annualTarget={annualTarget}
          />
        )}
        {activeContent === 'Individual' && (
          <TabIndividual
            deals={deals}
            activities={unitActivities}
            monthlyTarget={monthlyTarget}
            annualTarget={annualTarget}
          />
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 24px', background: '#fff', borderTop: '1px solid var(--n-150)', flexShrink: 0, fontSize: 11.5, color: 'var(--n-500)', textAlign: 'right' }}>
        Última Actualización: {fmtTimestamp(lastSync)}
      </div>

      {/* ── Settings modal ─────────────────────────────────────────────────── */}
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
