import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronRight } from 'lucide-react'
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

type PanelKey = 'proximas' | 'vencidas' | 'sinFecha' | 'enProceso' | 'completadas'

export default function ComprasDashboardPage() {
  const { groupId = '91' } = useParams<{ groupId: string }>()
  const { tareas, groupName, lastSync, source, loading, syncing, error, sync } = useBitrixTareas(groupId)
  const isMobile = useIsMobile()

  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>({
    proximas: true, vencidas: true, sinFecha: false, enProceso: false, completadas: false,
  })
  const togglePanel = (k: PanelKey) => setOpenPanels(p => ({ ...p, [k]: !p[k] }))

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

  // Grupos para paneles desplegables
  const grupoProximas = useMemo(() =>
    tareas
      .filter(t => t.deadline && t.status !== 'Completada' && t.status !== 'Rechazada' && daysLeft(t.deadline) >= 0 && daysLeft(t.deadline) <= 14)
      .sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline))
  , [tareas])

  const grupoVencidas = useMemo(() =>
    tareas.filter(t => isOverdue(t)).sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline))
  , [tareas])

  const grupoSinFecha = useMemo(() =>
    tareas.filter(t => !t.deadline && t.status !== 'Completada' && t.status !== 'Rechazada')
  , [tareas])

  const grupoEnProceso = useMemo(() =>
    tareas.filter(t => t.status === 'En proceso')
  , [tareas])

  const grupoCompletadas = useMemo(() =>
    tareas.filter(t => t.status === 'Completada')
  , [tareas])

  const busy = loading || syncing

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '20px 24px', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {groupName || `Grupo ${groupId}`} · Dashboard
          </h1>
          <p style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>
            Bitrix24 · Grupo {groupId}
            {!isMobile && lastSync && (
              <span style={{ marginLeft: 8, color: source === 'cache' ? 'var(--amber-600)' : 'var(--green-600)' }}>
                · {source === 'cache' ? 'Caché' : 'Sincronizado'} {fmtDate(lastSync)}
              </span>
            )}
          </p>
        </div>
        {!isMobile && <BitrixNavTabs groupId={groupId} active="dashboard" />}
        <button
          onClick={sync} disabled={busy}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: 'none', background: syncing ? 'var(--brand-400)' : 'var(--brand-600)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0 }}
        >
          <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} />
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>
      {isMobile && <div style={{ marginBottom: 12 }}><BitrixNavTabs groupId={groupId} active="dashboard" /></div>}

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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
            <KPICard label="Total tareas"   value={stats.total}       accent="var(--n-700)"      bg="var(--n-50)"      border="var(--n-200)"    />
            <KPICard label="En proceso"     value={stats.enProceso}   accent="var(--brand-700)"  bg="var(--brand-50)"  border="var(--brand-100)" />
            <KPICard label="Completadas"    value={stats.completadas} sub={`${stats.pct}%`} accent="var(--green-700)" bg="var(--green-50)" border="var(--green-100)" />
            <KPICard label="Vencidas"       value={stats.vencidas}    accent="var(--red-700)"    bg="var(--red-50)"    border="var(--red-100)"   />
            <KPICard label="Sin fecha"      value={stats.sinFecha}    accent="var(--amber-700)"  bg="var(--amber-50)"  border="var(--amber-100)" />
          </div>

          {/* Fila de gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>

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

          {/* Paneles desplegables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>

            <CollapsePanel panelKey="vencidas" open={openPanels.vencidas} onToggle={togglePanel}
              label="Tareas vencidas" count={grupoVencidas.length}
              accentColor="#ef4444" bgColor="#fef2f2" borderColor="#fecaca">
              {grupoVencidas.length === 0
                ? <PanelEmpty icon={<CheckCircle2 size={16} />} text="No hay tareas vencidas" />
                : grupoVencidas.map(t => (
                  <BitrixTaskRow key={t.id} title={t.title} responsible={t.responsible_name}
                    badge={`−${Math.abs(daysLeft(t.deadline))}d`} badgeColor="#dc2626" badgeBg="#fee2e2"
                    sub={fmtDate(t.deadline)} priority={t.priority} icon={<AlertTriangle size={11} style={{ color: '#ef4444' }} />} />
                ))}
            </CollapsePanel>

            <CollapsePanel panelKey="proximas" open={openPanels.proximas} onToggle={togglePanel}
              label="Próximas a vencer (≤14 días)" count={grupoProximas.length}
              accentColor="#f59e0b" bgColor="#fefce8" borderColor="#fde68a">
              {grupoProximas.length === 0
                ? <PanelEmpty icon={<CheckCircle2 size={16} />} text="No hay tareas próximas a vencer" />
                : grupoProximas.map(t => {
                    const dl = daysLeft(t.deadline)
                    return (
                      <BitrixTaskRow key={t.id} title={t.title} responsible={t.responsible_name}
                        badge={dl === 0 ? 'Hoy' : dl === 1 ? 'Mañana' : `${dl}d`}
                        badgeColor={dl <= 3 ? '#92400e' : '#78350f'} badgeBg={dl <= 3 ? '#fef3c7' : '#fef9c3'}
                        sub={fmtDate(t.deadline)} priority={t.priority} icon={<Clock size={11} style={{ color: '#f59e0b' }} />} />
                    )
                  })}
            </CollapsePanel>

            <CollapsePanel panelKey="sinFecha" open={openPanels.sinFecha} onToggle={togglePanel}
              label="Sin fecha de vencimiento" count={grupoSinFecha.length}
              accentColor="#94a3b8" bgColor="var(--n-50)" borderColor="var(--n-200)">
              {grupoSinFecha.length === 0
                ? <PanelEmpty icon={<CheckCircle2 size={16} />} text="Todas las tareas activas tienen fecha" />
                : grupoSinFecha.map(t => (
                  <BitrixTaskRow key={t.id} title={t.title} responsible={t.responsible_name}
                    badge="Sin fecha" badgeColor="var(--n-500)" badgeBg="var(--n-100)"
                    sub={t.status} priority={t.priority} />
                ))}
            </CollapsePanel>

            <CollapsePanel panelKey="enProceso" open={openPanels.enProceso} onToggle={togglePanel}
              label="En proceso" count={grupoEnProceso.length}
              accentColor="#6366f1" bgColor="#eef2ff" borderColor="#c7d2fe">
              {grupoEnProceso.length === 0
                ? <PanelEmpty icon={<Clock size={16} />} text="No hay tareas en proceso" />
                : grupoEnProceso.map(t => (
                  <BitrixTaskRow key={t.id} title={t.title} responsible={t.responsible_name}
                    badge={t.deadline ? fmtDate(t.deadline) : 'Sin fecha'}
                    badgeColor="#4338ca" badgeBg="#e0e7ff"
                    sub={t.deadline ? (daysLeft(t.deadline) >= 0 ? `${daysLeft(t.deadline)}d restantes` : `${Math.abs(daysLeft(t.deadline))}d vencida`) : ''}
                    priority={t.priority} />
                ))}
            </CollapsePanel>

            <CollapsePanel panelKey="completadas" open={openPanels.completadas} onToggle={togglePanel}
              label="Completadas" count={grupoCompletadas.length}
              accentColor="#22c55e" bgColor="#f0fdf4" borderColor="#bbf7d0">
              {grupoCompletadas.length === 0
                ? <PanelEmpty icon={<CheckCircle2 size={16} />} text="Sin tareas completadas aún" />
                : grupoCompletadas.map(t => (
                  <BitrixTaskRow key={t.id} title={t.title} responsible={t.responsible_name}
                    badge="Completada" badgeColor="#15803d" badgeBg="#dcfce7"
                    sub={t.deadline ? fmtDate(t.deadline) : ''} priority={t.priority}
                    icon={<CheckCircle2 size={11} style={{ color: '#22c55e' }} />} />
                ))}
            </CollapsePanel>

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

const PRIO_DOT: Record<string, string> = { Alta: '#ef4444', Normal: '#6366f1', Baja: '#22c55e' }

function CollapsePanel({ panelKey, open, onToggle, label, count, accentColor, bgColor, borderColor, children }: {
  panelKey: PanelKey; open: boolean; onToggle: (k: PanelKey) => void
  label: string; count: number; accentColor: string; bgColor: string; borderColor: string
  children: React.ReactNode
}) {
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
      <button onClick={() => onToggle(panelKey)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: open ? bgColor : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }}>
        {open
          ? <ChevronDown size={14} style={{ color: accentColor, flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: 'var(--n-400)', flexShrink: 0 }} />}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-800)', flex: 1 }}>{label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: accentColor + '20', color: accentColor }}>{count}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${borderColor}`, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 440, overflowY: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function BitrixTaskRow({ title, responsible, badge, badgeColor, badgeBg, sub, priority, icon }: {
  title: string; responsible: string; badge: string; badgeColor: string; badgeBg: string
  sub?: string; priority: string; icon?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 7, background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
      {icon
        ? <span style={{ marginTop: 3, flexShrink: 0 }}>{icon}</span>
        : <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIO_DOT[priority] ?? '#94a3b8', marginTop: 5, flexShrink: 0, display: 'inline-block' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-800)', wordBreak: 'break-word' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--n-400)', marginTop: 1 }}>
          {responsible || '—'}{sub ? ` · ${sub}` : ''}
        </div>
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: badgeBg, color: badgeColor, whiteSpace: 'nowrap', flexShrink: 0 }}>{badge}</span>
    </div>
  )
}

function PanelEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {icon}{text}
    </div>
  )
}
