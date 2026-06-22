import { useMemo } from 'react'
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useSeguimientoGestion } from '../../hooks/useSeguimientoGestion'
import { SeguimientoNavTabs } from './SeguimientoNavTabs'
import { differenceInDays, parseISO } from 'date-fns'

const STATUS_COLOR = {
  'CULMINADO':  '#22c55e',
  'EN PROCESO': '#6366f1',
  'PENDIENTE':  '#94a3b8',
}

const PRIO_COLOR = {
  'ALTO':  '#ef4444',
  'MEDIO': '#f59e0b',
  'BAJO':  '#22c55e',
}

function KpiCard({ label, value, sub, color, Icon }: {
  label: string; value: string | number; sub?: string; color: string; Icon: React.ElementType
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--n-900)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color, fontWeight: 600, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function SeguimientoDashboardPage() {
  const { tareas, loading } = useSeguimientoGestion()

  const stats = useMemo(() => {
    const total       = tareas.length
    const culminados  = tareas.filter(t => t.status_final === 'CULMINADO').length
    const enProceso   = tareas.filter(t => t.status_final === 'EN PROCESO').length
    const pendientes  = tareas.filter(t => t.status_final === 'PENDIENTE').length
    const avgProgress = total ? Math.round(tareas.reduce((s, t) => s + t.status, 0) / total * 100) : 0

    const now = new Date()
    const vencidas = tareas.filter(t =>
      t.status_final !== 'CULMINADO' && t.vence && parseISO(t.vence) < now
    ).length

    // Por estado (pie)
    const byStatus = [
      { name: 'Culminado',  value: culminados,  color: STATUS_COLOR['CULMINADO']  },
      { name: 'En proceso', value: enProceso,   color: STATUS_COLOR['EN PROCESO'] },
      { name: 'Pendiente',  value: pendientes,  color: STATUS_COLOR['PENDIENTE']  },
    ].filter(d => d.value > 0)

    // Por prioridad
    const byPrio = [
      { name: 'Alto',  value: tareas.filter(t => t.prioridad === 'ALTO').length,  color: PRIO_COLOR['ALTO']  },
      { name: 'Medio', value: tareas.filter(t => t.prioridad === 'MEDIO').length, color: PRIO_COLOR['MEDIO'] },
      { name: 'Bajo',  value: tareas.filter(t => t.prioridad === 'BAJO').length,  color: PRIO_COLOR['BAJO']  },
    ].filter(d => d.value > 0)

    // Por solicitante (top 10)
    const solMap = new Map<string, number>()
    tareas.forEach(t => solMap.set(t.solicitante, (solMap.get(t.solicitante) ?? 0) + 1))
    const bySolicitante = [...solMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // Por responsable
    const respMap = new Map<string, { total: number; done: number }>()
    tareas.forEach(t => {
      const r = t.responsable || '—'
      const prev = respMap.get(r) ?? { total: 0, done: 0 }
      respMap.set(r, { total: prev.total + 1, done: prev.done + (t.status_final === 'CULMINADO' ? 1 : 0) })
    })
    const byResponsable = [...respMap.entries()]
      .map(([name, v]) => ({ name, total: v.total, done: v.done, pct: Math.round(v.done / v.total * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    // Tareas próximas a vencer (no terminadas, con fecha)
    const proximas = tareas
      .filter(t => t.status_final !== 'CULMINADO' && t.vence)
      .map(t => ({ ...t, daysLeft: differenceInDays(parseISO(t.vence!), now) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8)

    return { total, culminados, enProceso, pendientes, vencidas, avgProgress, byStatus, byPrio, bySolicitante, byResponsable, proximas }
  }, [tareas])

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando…</div>

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Seguimiento de Gestión</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>{stats.total} tareas en total</p>
        </div>
        <SeguimientoNavTabs active="dashboard" />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Total tareas"  value={stats.total}        color="#6366f1" Icon={TrendingUp}   />
        <KpiCard label="Culminadas"    value={stats.culminados}   color="#22c55e" Icon={CheckCircle2} sub={`${Math.round(stats.culminados / Math.max(stats.total,1) * 100)}% del total`} />
        <KpiCard label="En proceso"    value={stats.enProceso}    color="#6366f1" Icon={Clock}        />
        <KpiCard label="Pendientes"    value={stats.pendientes}   color="#94a3b8" Icon={AlertCircle}  />
        <KpiCard label="Avance promedio" value={`${stats.avgProgress}%`} color="#f59e0b" Icon={TrendingUp} />
        {stats.vencidas > 0 && (
          <KpiCard label="Vencidas" value={stats.vencidas} color="#ef4444" Icon={AlertCircle} sub="Sin completar" />
        )}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Pie por estado */}
        <div style={cardS}>
          <SectionTitle>Por estado</SectionTitle>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" cx="50%" cy="45%" outerRadius={65} innerRadius={32}>
                {stats.byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v as number, name as string]} />
              <Legend
                iconType="circle" iconSize={8}
                formatter={(value) => <span style={{ fontSize: 11, color: 'var(--n-700)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pie por prioridad */}
        <div style={cardS}>
          <SectionTitle>Por prioridad</SectionTitle>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={stats.byPrio} dataKey="value" cx="50%" cy="45%" outerRadius={65} innerRadius={32}>
                {stats.byPrio.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v as number, name as string]} />
              <Legend
                iconType="circle" iconSize={8}
                formatter={(value) => <span style={{ fontSize: 11, color: 'var(--n-700)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar por solicitante */}
        <div style={cardS}>
          <SectionTitle>Tareas por solicitante (top 10)</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.bySolicitante} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 3, 3, 0]} name="Tareas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Responsable + Próximas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Responsable table */}
        <div style={cardS}>
          <SectionTitle>Eficiencia por responsable</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--n-100)' }}>
                {['Responsable', 'Total', 'Completadas', 'Avance'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.byResponsable.map((r, i) => (
                <tr key={r.name} style={{ borderBottom: i < stats.byResponsable.length - 1 ? '1px solid var(--n-100)' : undefined }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--n-800)' }}>{r.name}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--n-600)', textAlign: 'center' }}>{r.total}</td>
                  <td style={{ padding: '6px 8px', color: '#22c55e', fontWeight: 600, textAlign: 'center' }}>{r.done}</td>
                  <td style={{ padding: '6px 8px', minWidth: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--n-150)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${r.pct}%`, background: r.pct === 100 ? '#22c55e' : '#6366f1', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, minWidth: 26 }}>{r.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Próximas a vencer */}
        <div style={cardS}>
          <SectionTitle>Próximas a vencer / vencidas</SectionTitle>
          {stats.proximas.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>Sin tareas pendientes con fecha</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {stats.proximas.map(t => {
                const overdue = t.daysLeft < 0
                const soon    = t.daysLeft >= 0 && t.daysLeft <= 3
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: overdue ? '#fef2f2' : soon ? '#fefce8' : 'var(--n-50)', border: `1px solid ${overdue ? '#fecaca' : soon ? '#fde68a' : 'var(--n-150)'}` }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tarea}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--n-400)' }}>{t.solicitante}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: overdue ? '#dc2626' : soon ? '#ca8a04' : 'var(--n-600)' }}>
                        {overdue ? `${Math.abs(t.daysLeft)}d vencida` : t.daysLeft === 0 ? 'Hoy' : `${t.daysLeft}d`}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--n-400)' }}>
                        {({ CULMINADO: 'Culminado', 'EN PROCESO': 'En proceso', PENDIENTE: 'Pendiente' } as Record<string,string>)[t.status_final]}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em', marginBottom: 2 }}>{children}</div>
}

const cardS: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: '12px 14px',
}
