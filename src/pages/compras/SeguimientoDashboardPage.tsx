import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, AlertCircle, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useSeguimientoGestion } from '../../hooks/useSeguimientoGestion'
import { SeguimientoNavTabs } from './SeguimientoNavTabs'
import { differenceInDays, parseISO } from 'date-fns'
import { useIsMobile } from '../../hooks/useIsMobile'

const STATUS_COLOR = {
  'CULMINADO':  'var(--green-500)',
  'EN PROCESO': 'var(--indigo-600)',
  'PENDIENTE':  'var(--n-500)',
}

const PRIO_COLOR = {
  'ALTO':  'var(--red-500)',
  'MEDIO': 'var(--amber-500)',
  'BAJO':  'var(--green-500)',
}

function KpiCard({ label, value, sub, color, Icon }: {
  label: string; value: string | number; sub?: string; color: string; Icon: React.ElementType
}) {
  return (
    <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--n-900)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

type PanelKey = 'vencidas' | 'proximas' | 'sinVencer' | 'enProceso' | 'completadas'

export default function SeguimientoDashboardPage() {
  const { tareas, loading } = useSeguimientoGestion()
  const isMobile = useIsMobile()

  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>({
    vencidas: true, proximas: true, sinVencer: false, enProceso: false, completadas: false,
  })
  const toggle = (k: PanelKey) => setOpenPanels(p => ({ ...p, [k]: !p[k] }))

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

    const byStatus = [
      { name: 'Culminado',  value: culminados,  color: STATUS_COLOR['CULMINADO']  },
      { name: 'En proceso', value: enProceso,   color: STATUS_COLOR['EN PROCESO'] },
      { name: 'Pendiente',  value: pendientes,  color: STATUS_COLOR['PENDIENTE']  },
    ].filter(d => d.value > 0)

    const byPrio = [
      { name: 'Alto',  value: tareas.filter(t => t.prioridad === 'ALTO').length,  color: PRIO_COLOR['ALTO']  },
      { name: 'Medio', value: tareas.filter(t => t.prioridad === 'MEDIO').length, color: PRIO_COLOR['MEDIO'] },
      { name: 'Bajo',  value: tareas.filter(t => t.prioridad === 'BAJO').length,  color: PRIO_COLOR['BAJO']  },
    ].filter(d => d.value > 0)

    const solMap = new Map<string, number>()
    tareas.forEach(t => solMap.set(t.solicitante, (solMap.get(t.solicitante) ?? 0) + 1))
    const bySolicitante = [...solMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

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

    // Grupos para paneles desplegables
    const withDays = tareas
      .filter(t => t.status_final !== 'CULMINADO' && t.vence)
      .map(t => ({ ...t, daysLeft: differenceInDays(parseISO(t.vence!), now) }))

    const grupoVencidas    = withDays.filter(t => t.daysLeft < 0).sort((a, b) => a.daysLeft - b.daysLeft)
    const grupoProximas    = withDays.filter(t => t.daysLeft >= 0 && t.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft)
    const grupoSinVencer   = tareas.filter(t => t.status_final !== 'CULMINADO' && !t.vence)
    const grupoEnProceso   = tareas.filter(t => t.status_final === 'EN PROCESO')
    const grupoCompletadas = tareas.filter(t => t.status_final === 'CULMINADO')

    return { total, culminados, enProceso, pendientes, vencidas, avgProgress, byStatus, byPrio, bySolicitante, byResponsable, grupoVencidas, grupoProximas, grupoSinVencer, grupoEnProceso, grupoCompletadas }
  }, [tareas])

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando…</div>

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Seguimiento de Gestión</h1>
          <p style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>{stats.total} tareas en total</p>
        </div>
        <SeguimientoNavTabs active="dashboard" />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 }}>
        <KpiCard label="Total tareas"    value={stats.total}        color="var(--indigo-600)" Icon={TrendingUp}   />
        <KpiCard label="Culminadas"      value={stats.culminados}   color="var(--green-500)" Icon={CheckCircle2} sub={`${Math.round(stats.culminados / Math.max(stats.total,1) * 100)}%`} />
        <KpiCard label="En proceso"      value={stats.enProceso}    color="var(--indigo-600)" Icon={Clock}        />
        <KpiCard label="Pendientes"      value={stats.pendientes}   color="var(--n-500)" Icon={AlertCircle}  />
        <KpiCard label="Avance prom."    value={`${stats.avgProgress}%`} color="var(--amber-500)" Icon={TrendingUp} />
        {stats.vencidas > 0 && (
          <KpiCard label="Vencidas" value={stats.vencidas} color="var(--red-500)" Icon={AlertCircle} sub="Sin completar" />
        )}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>

        <div style={cardS}>
          <SectionTitle>Por estado</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
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

        <div style={cardS}>
          <SectionTitle>Por prioridad</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
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

        <div style={cardS}>
          <SectionTitle>Tareas por solicitante (top 10)</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.bySolicitante} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--indigo-600)" radius={[0, 3, 3, 0]} name="Tareas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Eficiencia por responsable */}
      <div style={{ ...cardS, marginBottom: 12, overflowX: 'auto' }}>
        <SectionTitle>Eficiencia por responsable</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--n-100)' }}>
              {['Responsable', 'Total', 'Complet.', 'Avance'].map(h => (
                <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.byResponsable.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: i < stats.byResponsable.length - 1 ? '1px solid var(--n-100)' : undefined }}>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--n-800)', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ padding: '6px 8px', color: 'var(--n-600)', textAlign: 'center' }}>{r.total}</td>
                <td style={{ padding: '6px 8px', color: 'var(--green-500)', fontWeight: 600, textAlign: 'center' }}>{r.done}</td>
                <td style={{ padding: '6px 8px', minWidth: 90 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 5, background: 'var(--n-150)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.pct}%`, background: r.pct === 100 ? 'var(--green-500)' : 'var(--indigo-600)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, minWidth: 26 }}>{r.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Listas desplegables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        <CollapsePanel panelKey="vencidas" open={openPanels.vencidas} onToggle={toggle}
          label="Tareas vencidas" count={stats.grupoVencidas.length}
          accentColor="var(--red-500)" bgColor="var(--red-50)" borderColor="var(--red-200)">
          {stats.grupoVencidas.length === 0
            ? <EmptyMsg text="Sin tareas vencidas" />
            : stats.grupoVencidas.map(t => (
              <TaskRow key={t.id} tarea={t.tarea} sub={t.solicitante} responsable={t.responsable}
                badge={`${Math.abs((t as any).daysLeft)}d vencida`} badgeColor="var(--red-600)" badgeBg="var(--red-100)"
                prioridad={t.prioridad} nota={t.nota} />
            ))}
        </CollapsePanel>

        <CollapsePanel panelKey="proximas" open={openPanels.proximas} onToggle={toggle}
          label="Próximas a vencer (≤7 días)" count={stats.grupoProximas.length}
          accentColor="var(--amber-500)" bgColor="var(--amber-50)" borderColor="var(--amber-200)">
          {stats.grupoProximas.length === 0
            ? <EmptyMsg text="Sin tareas próximas a vencer" />
            : stats.grupoProximas.map(t => (
              <TaskRow key={t.id} tarea={t.tarea} sub={t.solicitante} responsable={t.responsable}
                badge={(t as any).daysLeft === 0 ? 'Hoy' : `${(t as any).daysLeft}d`}
                badgeColor="var(--amber-700)" badgeBg="var(--amber-100)"
                prioridad={t.prioridad} nota={t.nota} />
            ))}
        </CollapsePanel>

        <CollapsePanel panelKey="sinVencer" open={openPanels.sinVencer} onToggle={toggle}
          label="Sin fecha de vencimiento" count={stats.grupoSinVencer.length}
          accentColor="var(--n-500)" bgColor="var(--n-50)" borderColor="var(--n-200)">
          {stats.grupoSinVencer.length === 0
            ? <EmptyMsg text="Todas las tareas pendientes tienen fecha" />
            : stats.grupoSinVencer.map(t => (
              <TaskRow key={t.id} tarea={t.tarea} sub={t.solicitante} responsable={t.responsable}
                badge="Sin fecha" badgeColor="var(--n-500)" badgeBg="var(--n-100)"
                prioridad={t.prioridad} nota={t.nota} />
            ))}
        </CollapsePanel>

        <CollapsePanel panelKey="enProceso" open={openPanels.enProceso} onToggle={toggle}
          label="En proceso" count={stats.grupoEnProceso.length}
          accentColor="var(--indigo-600)" bgColor="var(--indigo-50)" borderColor="var(--indigo-200)">
          {stats.grupoEnProceso.length === 0
            ? <EmptyMsg text="Sin tareas en proceso" />
            : stats.grupoEnProceso.map(t => (
              <TaskRow key={t.id} tarea={t.tarea} sub={t.solicitante} responsable={t.responsable}
                badge={`${Math.round(t.status * 100)}%`} badgeColor="var(--indigo-700)" badgeBg="var(--indigo-100)"
                prioridad={t.prioridad} nota={t.nota} />
            ))}
        </CollapsePanel>

        <CollapsePanel panelKey="completadas" open={openPanels.completadas} onToggle={toggle}
          label="Completadas" count={stats.grupoCompletadas.length}
          accentColor="var(--green-500)" bgColor="var(--green-50)" borderColor="var(--green-200)">
          {stats.grupoCompletadas.length === 0
            ? <EmptyMsg text="Sin tareas completadas aún" />
            : stats.grupoCompletadas.map(t => (
              <TaskRow key={t.id} tarea={t.tarea} sub={t.solicitante} responsable={t.responsable}
                badge="Culminado" badgeColor="var(--green-700)" badgeBg="var(--green-100)"
                prioridad={t.prioridad} nota={t.nota} />
            ))}
        </CollapsePanel>

      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em', marginBottom: 2 }}>{children}</div>
}

const cardS: React.CSSProperties = {
  background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '12px 14px',
}

const PRIO_DOT: Record<string, string> = { ALTO: 'var(--red-500)', MEDIO: 'var(--amber-500)', BAJO: 'var(--green-500)' }

function CollapsePanel({ panelKey, open, onToggle, label, count, accentColor, bgColor, borderColor, children }: {
  panelKey: PanelKey; open: boolean; onToggle: (k: PanelKey) => void
  label: string; count: number; accentColor: string; bgColor: string; borderColor: string
  children: React.ReactNode
}) {
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 10, background: 'var(--n-0)', overflow: 'hidden' }}>
      <button onClick={() => onToggle(panelKey)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: open ? bgColor : 'var(--n-0)', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }}>
        {open
          ? <ChevronDown size={14} style={{ color: accentColor, flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: 'var(--n-400)', flexShrink: 0 }} />}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-800)', flex: 1 }}>{label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: accentColor + '20', color: accentColor }}>{count}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${borderColor}`, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 420, overflowY: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function TaskRow({ tarea, sub, responsable, badge, badgeColor, badgeBg, prioridad, nota }: {
  tarea: string; sub: string; responsable: string
  badge: string; badgeColor: string; badgeBg: string
  prioridad: string; nota: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 7, background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIO_DOT[prioridad] ?? 'var(--n-500)', marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-800)', wordBreak: 'break-word' }}>{tarea}</div>
        <div style={{ fontSize: 10.5, color: 'var(--n-400)', marginTop: 1 }}>
          {sub}{responsable && sub !== responsable ? ` · ${responsable}` : ''}
        </div>
        {nota && (
          <div style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 2, fontStyle: 'italic', wordBreak: 'break-word' }}>{nota}</div>
        )}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: badgeBg, color: badgeColor, whiteSpace: 'nowrap', flexShrink: 0 }}>{badge}</span>
    </div>
  )
}

function EmptyMsg({ text }: { text: string }) {
  return <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>{text}</div>
}
