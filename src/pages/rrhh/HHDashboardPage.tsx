import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { useAttendance } from '../../hooks/useAttendance'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useAuth } from '../../hooks/useAuth'
import { Shield } from 'lucide-react'
import type { AttendanceCondition } from '../../lib/types'

// ── Constantes ────────────────────────────────────────────────

const DAYS_ES    = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAYS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const ALL_CONDITIONS: AttendanceCondition[] = [
  'Asistencia', 'Falta', 'Descanso Médico', 'Enfermedad', 'Días Compensados', 'Vacaciones', 'Permiso',
]

const CONDITION_HEX: Record<AttendanceCondition, string> = {
  'Asistencia':       '#16a34a',
  'Falta':            '#dc2626',
  'Descanso Médico':  '#2563eb',
  'Enfermedad':       '#ea580c',
  'Días Compensados': '#4f46e5',
  'Vacaciones':       '#0d9488',
  'Permiso':          '#d97706',
}

const PROJECT_COLORS = ['#4f46e5', '#0d9488', '#d97706', '#dc2626', '#16a34a', '#7c3aed', '#2563eb']

// ── Helpers de período ────────────────────────────────────────

function getWeekRange() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d); mon.setDate(d.getDate() + diff)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return {
    from: mon.toISOString().split('T')[0],
    to:   sun.toISOString().split('T')[0],
  }
}

function getMonthRange() {
  const d = new Date()
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
  return { from, to }
}

function fmt1(n: number) { return n.toFixed(1) }
function fmt0(n: number) { return n.toFixed(0) }

// ── Sub-componentes UI ────────────────────────────────────────

type KPIColor = 'green' | 'red' | 'blue' | 'amber' | 'brand' | 'teal' | 'default'

const KPI_PALETTE: Record<KPIColor, { bg: string; accent: string; val: string }> = {
  green:   { bg: '#f0fdf4', accent: '#15803d', val: '#14532d' },
  red:     { bg: '#fef2f2', accent: '#dc2626', val: '#991b1b' },
  blue:    { bg: '#eff6ff', accent: '#2563eb', val: '#1e3a8a' },
  amber:   { bg: '#fffbeb', accent: '#d97706', val: '#78350f' },
  brand:   { bg: '#eef2ff', accent: '#4f46e5', val: '#312e81' },
  teal:    { bg: '#f0fdfa', accent: '#0d9488', val: '#134e4a' },
  default: { bg: 'var(--n-0)', accent: 'var(--n-500)', val: 'var(--n-900)' },
}

function KPICard({ label, value, sub, color = 'default', large = false }: {
  label: string; value: string; sub?: string; color?: KPIColor; large?: boolean
}) {
  const p = KPI_PALETTE[color]
  return (
    <div style={{
      background: p.bg, borderRadius: 12, flex: 1,
      padding: large ? '18px 20px' : '13px 16px',
      minWidth: large ? 130 : 110,
      border: '1px solid', borderColor: color === 'default' ? 'var(--n-150)' : 'transparent',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: p.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: large ? 30 : 22, fontWeight: 700, color: p.val, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: p.accent, marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-600)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

const TH: React.CSSProperties = {
  padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)',
  letterSpacing: '0.05em', textTransform: 'uppercase',
  background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)', textAlign: 'left',
}
const TD: React.CSSProperties = { padding: '8px 12px', fontSize: 12.5, color: 'var(--n-700)' }
const TD_NUM: React.CSSProperties = { ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--n-900)' }

// ── Tooltip personalizado ─────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 8,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,.08)',
    }}>
      {label && <div style={{ fontWeight: 700, color: 'var(--n-800)', marginBottom: 6 }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--n-600)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--n-900)' }}>{typeof p.value === 'number' ? fmt1(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

type Period = 'week' | 'month' | 'custom'

export default function HHDashboardPage() {
  const { isSuperAdmin } = useAuth()
  const isMobile = useIsMobile()
  const { records, loading } = useAttendance() // sin userId → todos los registros

  const [period, setPeriod] = useState<Period>('week')
  const weekRange  = getWeekRange()
  const monthRange = getMonthRange()
  const [from, setFrom] = useState(weekRange.from)
  const [to,   setTo]   = useState(weekRange.to)

  const applyPeriod = (p: Period) => {
    setPeriod(p)
    if (p === 'week')  { setFrom(weekRange.from);  setTo(weekRange.to)  }
    if (p === 'month') { setFrom(monthRange.from); setTo(monthRange.to) }
  }

  // ── Datos filtrados ──
  const filtered = useMemo(() =>
    records.filter(r => r.date >= from && r.date <= to),
    [records, from, to]
  )

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total      = filtered.length
    const asist      = filtered.filter(r => r.condition === 'Asistencia').length
    const faltas     = filtered.filter(r => r.condition === 'Falta').length
    const descMed    = filtered.filter(r => r.condition === 'Descanso Médico').length
    const enfer      = filtered.filter(r => r.condition === 'Enfermedad').length
    const hhProg     = filtered.reduce((s, r) => s + (r.scheduled_hours || 0), 0)
    const hhReal     = filtered.reduce((s, r) => s + (r.real_hours    || 0), 0)
    const hhExtra    = filtered.reduce((s, r) => s + (r.extra_hours   || 0), 0)
    const pctAsist   = total > 0 ? (asist  / total) * 100 : 0
    const pctAusent  = total > 0 ? (faltas / total) * 100 : 0
    const cumplHH    = hhProg > 0 ? (hhReal / hhProg) * 100 : 0
    return { total, asist, faltas, descMed, enfer, hhProg, hhReal, hhExtra, pctAsist, pctAusent, cumplHH }
  }, [filtered])

  // ── Resumen por condición ──
  const condSummary = useMemo(() =>
    ALL_CONDITIONS.map(c => ({ condition: c, count: filtered.filter(r => r.condition === c).length })),
    [filtered]
  )

  // ── HH por tipo de proyecto ──
  const hhByType = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(r => {
      const t = r.project_type || 'Sin proyecto'
      map[t] = (map[t] || 0) + (r.real_hours || 0)
    })
    return Object.entries(map).map(([type, hh]) => ({ type, hh })).sort((a, b) => b.hh - a.hh)
  }, [filtered])

  // ── Resumen diario ──
  const dailySummary = useMemo(() => {
    const map: Record<string, { asist: number; hhReal: number; hhProg: number }> = {}
    DAYS_ORDER.forEach(d => { map[d] = { asist: 0, hhReal: 0, hhProg: 0 } })
    filtered.forEach(r => {
      const name = DAYS_ES[new Date(r.date + 'T00:00:00').getDay()]
      if (map[name]) {
        if (r.condition === 'Asistencia') map[name].asist++
        map[name].hhReal += r.real_hours    || 0
        map[name].hhProg += r.scheduled_hours || 0
      }
    })
    return DAYS_ORDER.map(d => ({ day: d.slice(0, 3), dayFull: d, ...map[d] }))
  }, [filtered])

  // ── Datos para gráfico de torta ──
  const pieData = useMemo(() =>
    condSummary.filter(c => c.count > 0).map(c => ({
      name: c.condition,
      value: c.count,
    })),
    [condSummary]
  )

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--n-500)' }}>
        <Shield size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Acceso restringido</div>
        <div style={{ fontSize: 12.5, marginTop: 4 }}>Solo el superadmin puede ver el dashboard de HH.</div>
      </div>
    )
  }

  const pad = isMobile ? '16px' : '20px 28px 32px'

  return (
    <div style={{ padding: pad, maxWidth: 1400 }}>

      {/* ── Header + filtros ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 700, color: 'var(--n-900)' }}>
          Dashboard Horas Hombre
        </h1>
        <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginTop: 2 }}>
          Monitoreo de asistencia, ausentismo y cumplimiento de HH
        </div>
      </div>

      {/* Selector de período */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20,
        alignItems: 'center',
      }}>
        {(['week', 'month', 'custom'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => applyPeriod(p)}
            style={{
              height: 34, padding: '0 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 8,
              border: '1px solid',
              borderColor: period === p ? 'var(--brand-500)' : 'var(--n-200)',
              background: period === p ? 'var(--brand-600)' : 'var(--n-0)',
              color: period === p ? '#fff' : 'var(--n-700)',
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {p === 'week' ? 'Esta semana' : p === 'month' ? 'Este mes' : 'Personalizado'}
          </button>
        ))}

        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="date" value={from} max={to}
              onChange={e => setFrom(e.target.value)}
              style={{ height: 34, padding: '0 10px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--n-200)', background: 'var(--n-0)', outline: 'none', cursor: 'pointer' }}
            />
            <span style={{ color: 'var(--n-400)', fontSize: 12 }}>→</span>
            <input
              type="date" value={to} min={from}
              onChange={e => setTo(e.target.value)}
              style={{ height: 34, padding: '0 10px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--n-200)', background: 'var(--n-0)', outline: 'none', cursor: 'pointer' }}
            />
          </div>
        )}

        <span style={{ fontSize: 12, color: 'var(--n-400)', marginLeft: 4 }}>
          {from} — {to}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando datos...</div>
      ) : (
        <>
          {/* ── KPIs principales ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <KPICard label="Total Registros" value={String(kpis.total)}  color="default" large />
            <KPICard label="Asistencias"     value={String(kpis.asist)}  color="green"   large />
            <KPICard label="Inasistencias"   value={String(kpis.faltas)} color="red"     large sub="Faltas" />
            <KPICard label="HH Programadas"  value={fmt1(kpis.hhProg)}   color="blue"    large sub="horas" />
            <KPICard label="HH Reales"       value={fmt1(kpis.hhReal)}   color="brand"   large sub="horas" />
          </div>

          {/* ── KPIs indicadores ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            <KPICard label="% Asistencia"   value={`${fmt1(kpis.pctAsist)}%`}  color="green" />
            <KPICard label="% Ausentismo"   value={`${fmt1(kpis.pctAusent)}%`} color="red"   />
            <KPICard label="Cumplimiento HH" value={`${fmt1(kpis.cumplHH)}%`}  color="amber" />
            <KPICard label="HH Extra"        value={fmt1(kpis.hhExtra)}         color="teal"  sub="horas" />
            <KPICard label="Descanso Médico" value={String(kpis.descMed)}       color="blue"  />
            <KPICard label="Enfermedad"      value={String(kpis.enfer)}         color="default" />
          </div>

          {/* ── Tablas ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
            gap: 16, marginBottom: 24,
          }}>
            {/* Columna izquierda: tablas pequeñas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tabla: resumen por condición */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--n-100)' }}>
                  <SectionTitle>Resumen por condición</SectionTitle>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH}>Condición</th>
                      <th style={{ ...TH, textAlign: 'right' }}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {condSummary.map((row, i) => (
                      <tr key={row.condition} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--n-100)', background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-25)' }}>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CONDITION_HEX[row.condition], flexShrink: 0 }} />
                            {row.condition}
                          </div>
                        </td>
                        <td style={{ ...TD_NUM, color: row.count > 0 ? 'var(--n-900)' : 'var(--n-300)' }}>
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tabla: HH reales por tipo de proyecto */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--n-100)' }}>
                  <SectionTitle>HH reales por tipo de proyecto</SectionTitle>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH}>Tipo</th>
                      <th style={{ ...TH, textAlign: 'right' }}>HH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hhByType.length === 0 ? (
                      <tr><td colSpan={2} style={{ ...TD, textAlign: 'center', color: 'var(--n-400)' }}>Sin datos</td></tr>
                    ) : hhByType.map((row, i) => (
                      <tr key={row.type} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--n-100)', background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-25)' }}>
                        <td style={TD}>{row.type}</td>
                        <td style={TD_NUM}>{fmt1(row.hh)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Columna derecha: tabla diaria */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--n-100)' }}>
                <SectionTitle>Asistencias y HH por día</SectionTitle>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Día</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Asistencias</th>
                    <th style={{ ...TH, textAlign: 'right' }}>HH Reales</th>
                    <th style={{ ...TH, textAlign: 'right' }}>HH Prog.</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Cumplim.</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummary.map((row, i) => {
                    const cumpl = row.hhProg > 0 ? (row.hhReal / row.hhProg) * 100 : null
                    const isEmpty = row.asist === 0 && row.hhReal === 0
                    return (
                      <tr key={row.day} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--n-100)', background: isEmpty ? 'var(--n-25)' : (i % 2 === 0 ? 'var(--n-0)' : 'var(--n-25)'), opacity: isEmpty ? 0.5 : 1 }}>
                        <td style={{ ...TD, fontWeight: 600, color: 'var(--n-800)' }}>{row.dayFull}</td>
                        <td style={{ ...TD_NUM, color: row.asist > 0 ? '#16a34a' : 'var(--n-300)' }}>{row.asist}</td>
                        <td style={TD_NUM}>{fmt1(row.hhReal)}</td>
                        <td style={TD_NUM}>{fmt1(row.hhProg)}</td>
                        <td style={{ ...TD_NUM, color: cumpl === null ? 'var(--n-300)' : cumpl >= 100 ? '#16a34a' : '#d97706' }}>
                          {cumpl !== null ? `${fmt0(cumpl)}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Gráficos ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr 1fr',
            gap: 16,
          }}>

            {/* Gráfico de barras: HH por tipo de proyecto */}
            <div className="card" style={{ padding: '16px 16px 8px' }}>
              <SectionTitle>HH por tipo de proyecto</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hhByType} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="hh" name="HH Reales" radius={[6, 6, 0, 0]}>
                    {hhByType.map((_, i) => (
                      <Cell key={i} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de líneas: HH reales vs programadas */}
            <div className="card" style={{ padding: '16px 16px 8px' }}>
              <SectionTitle>HH reales vs programadas por día</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailySummary} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line
                    type="monotone" dataKey="hhReal" name="HH Reales"
                    stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4, fill: '#ea580c' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone" dataKey="hhProg" name="HH Programadas"
                    stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }}
                    strokeDasharray="6 3"
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de torta: condiciones */}
            <div className="card" style={{ padding: '16px 16px 8px' }}>
              <SectionTitle>Distribución por condición</SectionTitle>
              {pieData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-400)', fontSize: 13 }}>
                  Sin datos
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData} cx="50%" cy="50%"
                        outerRadius={75} innerRadius={38}
                        dataKey="value" paddingAngle={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={CONDITION_HEX[entry.name as AttendanceCondition] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [`${v} registros`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Leyenda manual */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: CONDITION_HEX[d.name as AttendanceCondition], flexShrink: 0 }} />
                        <span style={{ flex: 1, color: 'var(--n-700)' }}>{d.name}</span>
                        <span style={{ fontWeight: 700, color: 'var(--n-900)' }}>
                          {((d.value / kpis.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}
