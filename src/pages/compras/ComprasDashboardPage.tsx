import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { parseISO, differenceInDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBitrixTareas } from '../../hooks/useBitrixTareas'
import { BitrixNavTabs } from '../../components/bitrix/BitrixNavTabs'

// ── Colores ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  'Nueva':         '#94a3b8',
  'Pendiente':     '#f59e0b',
  'En proceso':    '#6366f1',
  'Por verificar': '#a855f7',
  'Completada':    '#22c55e',
  'Rechazada':     '#ef4444',
  'Diferida':      '#cbd5e1',
}

const PRIORITY_COLOR: Record<string, string> = {
  'Alta':   '#ef4444',
  'Normal': '#6366f1',
  'Baja':   '#22c55e',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM', { locale: es }) }
  catch { return iso }
}

function isOverdue(t: { deadline: string; status: string }) {
  if (!t.deadline || t.status === 'Completada' || t.status === 'Rechazada') return false
  try { return parseISO(t.deadline) < new Date() }
  catch { return false }
}

function daysLeft(deadline: string): number {
  try { return differenceInDays(parseISO(deadline), new Date()) }
  catch { return 0 }
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KPIProps {
  label: string
  value: number | string
  sub?: string
  accent: string
  bg: string
  border: string
}
function KPICard({ label, value, sub, accent, bg, border }: KPIProps) {
  return (
    <div style={{ flex: 1, minWidth: 110, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: accent, opacity: 0.7, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}


// ── Tooltip personalizado ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; fill: string }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--n-200)', borderRadius: 7, padding: '7px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <span style={{ color: payload[0].fill, fontWeight: 700 }}>{payload[0].name}: </span>
      <span style={{ color: 'var(--n-900)', fontWeight: 600 }}>{payload[0].value}</span>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ComprasDashboardPage() {
  const { groupId = '91' } = useParams<{ groupId: string }>()
  const { tareas, groupName, lastSync, source, loading, syncing, error, sync } = useBitrixTareas(groupId)

  const stats = useMemo(() => {
    const total       = tareas.length
    const completadas = tareas.filter(t => t.status === 'Completada').length
    const enProceso   = tareas.filter(t => t.status === 'En proceso').length
    const vencidas    = tareas.filter(t => isOverdue(t)).length
    const sinFecha    = tareas.filter(t => !t.deadline).length
    const pct         = total ? Math.round((completadas / total) * 100) : 0
    return { total, completadas, enProceso, vencidas, sinFecha, pct }
  }, [tareas])

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {}
    tareas.forEach(t => { map[t.status] = (map[t.status] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [tareas])

  const byPriority = useMemo(() => {
    const order = ['Alta', 'Normal', 'Baja']
    const map: Record<string, number> = {}
    tareas.forEach(t => { map[t.priority] = (map[t.priority] || 0) + 1 })
    return order.filter(p => map[p]).map(name => ({ name, value: map[name] }))
  }, [tareas])

  const byResponsible = useMemo(() => {
    const map: Record<string, number> = {}
    tareas.forEach(t => {
      const name = t.responsible_name || 'Sin asignar'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }))
  }, [tareas])

  const proximasVencer = useMemo(() =>
    tareas
      .filter(t => t.deadline && t.status !== 'Completada' && t.status !== 'Rechazada' && daysLeft(t.deadline) >= 0 && daysLeft(t.deadline) <= 14)
      .sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline))
      .slice(0, 8)
  , [tareas])

  const vencidasList = useMemo(() =>
    tareas.filter(t => isOverdue(t)).sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline)).slice(0, 6)
  , [tareas])

  const busy = loading || syncing

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            {groupName || `Grupo ${groupId}`} · Dashboard
          </h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>
            Bitrix24 · Grupo {groupId}
            {lastSync && (
              <span style={{ marginLeft: 8, color: source === 'cache' ? 'var(--amber-600)' : 'var(--green-600)' }}>
                · {source === 'cache' ? 'Caché' : 'Sincronizado'} {fmtDate(lastSync)}
              </span>
            )}
          </p>
        </div>
        <BitrixNavTabs groupId={groupId} active="dashboard" />
        <button
          onClick={sync} disabled={busy}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 7, border: 'none', background: syncing ? 'var(--brand-400)' : 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} />
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--red-50)', border: '1px solid var(--red-200)', color: 'var(--red-700)', fontSize: 12.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {busy ? (
        <div style={{ padding: 64, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
          {syncing ? 'Consultando Bitrix24…' : 'Cargando…'}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <KPICard label="Total tareas"   value={stats.total}       accent="var(--n-700)"      bg="var(--n-50)"      border="var(--n-200)"    />
            <KPICard label="En proceso"     value={stats.enProceso}   accent="var(--brand-700)"  bg="var(--brand-50)"  border="var(--brand-100)" />
            <KPICard label="Completadas"    value={stats.completadas} sub={`${stats.pct}% del total`} accent="var(--green-700)" bg="var(--green-50)" border="var(--green-100)" />
            <KPICard label="Vencidas"       value={stats.vencidas}    accent="var(--red-700)"    bg="var(--red-50)"    border="var(--red-100)"   />
            <KPICard label="Sin vencimiento" value={stats.sinFecha}   accent="var(--amber-700)"  bg="var(--amber-50)"  border="var(--amber-100)" />
          </div>

          {/* Fila de gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>

            {/* Donut — por estado */}
            <ChartCard title="Distribución por estado">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {byStatus.map((e, i) => <Cell key={i} fill={STATUS_COLOR[e.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <Legend items={byStatus.map(e => ({ name: e.name, value: e.value, color: STATUS_COLOR[e.name] || '#94a3b8' }))} />
            </ChartCard>

            {/* Barras — por prioridad */}
            <ChartCard title="Por prioridad">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byPriority} layout="vertical" margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--n-100)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--n-500)' }} />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11.5, fill: 'var(--n-700)', fontWeight: 600 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {byPriority.map((e, i) => <Cell key={i} fill={PRIORITY_COLOR[e.name] || '#6366f1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Barras — top responsables */}
            <ChartCard title="Top responsables">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byResponsible} layout="vertical" margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--n-100)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--n-500)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'var(--n-700)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Listas inferiores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Próximas a vencer */}
            <ChartCard title="Próximas a vencer (14 días)">
              {proximasVencer.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
                  <CheckCircle2 size={20} style={{ marginBottom: 6, color: 'var(--green-400)' }} />
                  <div>No hay tareas próximas a vencer</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {proximasVencer.map(t => {
                    const dl = daysLeft(t.deadline)
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--n-100)' }}>
                        <Clock size={12} style={{ color: dl <= 3 ? 'var(--red-500)' : 'var(--amber-500)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--n-500)' }}>{t.responsible_name || '—'}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: dl <= 3 ? 'var(--red-600)' : 'var(--amber-600)' }}>
                            {dl === 0 ? 'Hoy' : dl === 1 ? 'Mañana' : `${dl}d`}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--n-400)' }}>{fmtDate(t.deadline)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ChartCard>

            {/* Vencidas */}
            <ChartCard title={`Tareas vencidas (${stats.vencidas})`}>
              {vencidasList.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
                  <CheckCircle2 size={20} style={{ marginBottom: 6, color: 'var(--green-400)' }} />
                  <div>No hay tareas vencidas</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {vencidasList.map(t => {
                    const dl = Math.abs(daysLeft(t.deadline))
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--n-100)' }}>
                        <AlertTriangle size={12} style={{ color: 'var(--red-500)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--n-500)' }}>{t.responsible_name || '—'}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--red-600)' }}>−{dl}d</div>
                          <div style={{ fontSize: 10.5, color: 'var(--n-400)' }}>{fmtDate(t.deadline)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-700)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      {children}
    </div>
  )
}

function Legend({ items }: { items: { name: string; value: number; color: string }[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
      {items.map(it => (
        <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--n-700)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />
          {it.name} <span style={{ fontWeight: 700, color: 'var(--n-900)' }}>{it.value}</span>
        </div>
      ))}
    </div>
  )
}
