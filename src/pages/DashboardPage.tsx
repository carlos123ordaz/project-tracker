import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useConfigData } from '../hooks/useConfigData'
import { useAuditLogs } from '../hooks/useAuditLogs'
import { useAuth } from '../hooks/useAuth'
import { StatCard } from '../components/ui/StatCard'
import ProgressBar from '../components/ui/ProgressBar'
import { Avatar } from '../components/ui/Avatar'
import { Semaforo } from '../components/ui/Semaforo'
import { PriorityBadge } from '../components/ui/StatusBadge'
import { DaysLeftChip } from '../components/ui/Chips'
import { PulseDot, LiveBadge, CountUpNumber } from '../components/ui/Motion'
import { Button } from '../components/ui/Button'
import {
  FolderOpen, CheckCircle2, AlertTriangle, Play, DollarSign, TrendingUp,
  Plus, Check, ArrowRight, Pencil, Trash2,
} from 'lucide-react'
import { fmtDate, fmtMoneyCompact, TODAY, MONTHS_FULL, DAYS_ES, getProjectColor } from '../lib/helpers'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const ACTION_META: Record<string, { icon: React.ElementType; accent: string }> = {
  crear:      { icon: Plus,           accent: 'neutral' },
  actualizar: { icon: Pencil,         accent: 'brand'   },
  mover:      { icon: ArrowRight,     accent: 'brand'   },
  eliminar:   { icon: Trash2,         accent: 'red'     },
}

function accentColor(accent: string) {
  if (accent === 'red')   return { color: 'var(--red-600)',   bg: 'var(--red-50)'   }
  if (accent === 'green') return { color: 'var(--green-600)', bg: 'var(--green-50)' }
  if (accent === 'brand') return { color: 'var(--brand-600)', bg: 'var(--brand-50)' }
  return { color: 'var(--n-600)', bg: 'var(--n-100)' }
}

export default function DashboardPage() {
  const { projects } = useProjects()
  const { tasks }    = useTasks()
  const { team, semaphoreFor, projectMetrics, getPriority } = useConfigData()
  const { logs: auditLogs } = useAuditLogs(6)
  const { user } = useAuth()
  const navigate = useNavigate()

  const tasksDone   = tasks.filter(t => t.status === 'Completado').length
  const tasksLate   = tasks.filter(t => t.status === 'Retrasado').length
  const tasksInProg = tasks.filter(t => t.status === 'En Progreso').length
  const avgProgress = tasks.length === 0 ? 0 : tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length

  const rows = useMemo(() => projects.map(p => ({
    p, m: projectMetrics(p, tasks), sem: semaphoreFor(p, tasks),
  })), [projects, tasks, projectMetrics, semaphoreFor])

  const counts = useMemo(() => ({
    green: rows.filter(r => r.sem.kind === 'green').length,
    amber: rows.filter(r => r.sem.kind === 'amber').length,
    red:   rows.filter(r => r.sem.kind === 'red').length,
    gray:  rows.filter(r => r.sem.kind === 'gray').length,
  }), [rows])

  const activeProjects = useMemo(() =>
    [...rows].sort((a, b) => b.m.late - a.m.late).slice(0, 6)
  , [rows])

  const priorityTasks = useMemo(() =>
    tasks
      .filter(t => t.status !== 'Completado')
      .map(t => ({
        ...t,
        _priority: getPriority(t.priority),
        _project: projects.find(p => p.id === t.project_id),
      }))
      .sort((a, b) => {
        const aLate = a.status === 'Retrasado' ? 0 : 1
        const bLate = b.status === 'Retrasado' ? 0 : 1
        if (aLate !== bLate) return aLate - bLate
        return (a._priority?.sort_order ?? 99) - (b._priority?.sort_order ?? 99)
      })
      .slice(0, 7)
  , [tasks, projects, getPriority])

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'equipo'
  const firstName   = displayName.split(' ')[0]
  const dayLabel    = `${DAYS_ES[(TODAY.getDay() + 6) % 7]}, ${TODAY.getDate()} de ${MONTHS_FULL[TODAY.getMonth()]}`

  const gauges = [
    { label: 'En curso',       count: counts.green, color: '#10B981' },
    { label: 'En riesgo',      count: counts.amber, color: '#F59E0B' },
    { label: 'Crítico',        count: counts.red,   color: '#EF4444', pulse: counts.red > 0 },
    { label: 'Sin planificar', count: counts.gray,  color: '#A8AEBA' },
  ]

  return (
    <div className="fade-in page-content" style={{ maxWidth: 1480, margin: '0 auto' }}>
      {/* Hero */}
      <div className="resp-hero">
        <div className="card" style={{
          position: 'relative', overflow: 'hidden', padding: '20px 22px',
          background: 'linear-gradient(135deg, #ffffff 0%, #fbfbff 60%, #f4f3ff 100%)',
          border: '1px solid var(--n-200)',
        }}>
          <div aria-hidden style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 999, background: 'radial-gradient(circle at 30% 30%, rgba(79,70,229,0.18), transparent 70%)', filter: 'blur(8px)', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: -50, left: 60, width: 160, height: 160, borderRadius: 999, background: 'radial-gradient(circle, rgba(236,72,153,0.10), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <LiveBadge label="Sincronizado" color="var(--green-500)" />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginBottom: 4, textTransform: 'capitalize' }}>{dayLabel}</div>
              <h1 style={{ fontSize: 24, letterSpacing: '-0.02em', marginBottom: 6 }}>Hola, {firstName}.</h1>
              <div style={{ fontSize: 13, color: 'var(--n-700)', lineHeight: 1.55, maxWidth: 480 }}>
                {tasksLate > 0
                  ? <><strong style={{ color: 'var(--red-700)' }}>{tasksLate} tareas retrasadas</strong> — empezá por lo crítico. <strong style={{ color: 'var(--n-900)' }}>{tasksInProg} en progreso</strong>.</>
                  : <>Todo en orden. <strong style={{ color: 'var(--n-900)' }}>{tasksInProg} tareas</strong> avanzando esta semana.</>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <Button icon={Plus} variant="primary" onClick={() => navigate('/projects')}>Nuevo proyecto</Button>
              <Button icon={Plus} onClick={() => navigate('/kanban')}>Nueva tarea</Button>
            </div>
          </div>

          <div className="resp-4col" style={{
            position: 'relative', marginTop: 18,
            paddingTop: 16, borderTop: '1px solid var(--n-150)',
          }}>
            {gauges.map(g => (
              <button key={g.label} onClick={() => navigate('/overview')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--n-100)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  {g.pulse
                    ? <PulseDot color={g.color} size={9} />
                    : <span style={{ width: 9, height: 9, borderRadius: 999, background: g.color, display: 'inline-block', boxShadow: `0 0 0 2px ${g.color}26` }} />}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontSize: 11, color: 'var(--n-500)', fontWeight: 500 }}>{g.label}</span>
                  <span className="mono tnum" style={{ fontSize: 17, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>
                    <CountUpNumber value={g.count} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity feed — real audit logs */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--n-150)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 13 }}>Actividad reciente</h2>
              <LiveBadge label="Live" color="var(--green-500)" />
            </div>
          </div>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column' }}>
            {auditLogs.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: 12.5, color: 'var(--n-400)' }}>
                Sin actividad reciente
              </div>
            )}
            {auditLogs.map((log, i) => {
              const meta = ACTION_META[log.action] ?? { icon: Check, accent: 'neutral' }
              const { color, bg } = accentColor(
                log.action === 'eliminar' ? 'red'
                  : log.action === 'crear' ? 'neutral'
                  : 'brand'
              )
              const IcIcon = meta.icon
              const who    = log.user_name || log.user_email || 'Sistema'
              const whoShort = who.includes('@') ? who.split('@')[0] : who.split(' ')[0]
              const when   = formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })

              // Detect "completed" task moves
              const isCompleted = log.action === 'mover' && (log.details as Record<string, unknown>)?.to === 'Completado'
              const displayAccent = isCompleted ? accentColor('green') : { color, bg }
              const DisplayIcon   = isCompleted ? Check : IcIcon

              return (
                <div key={log.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, borderTop: i === 0 ? 'none' : '1px solid var(--n-150)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: displayAccent.bg, color: displayAccent.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1 }}>
                    <DisplayIcon size={11} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--n-700)', lineHeight: 1.45 }}>
                      <strong style={{ color: 'var(--n-900)', fontWeight: 600 }}>{whoShort}</strong>{' '}
                      <span style={{ color: 'var(--n-500)' }}>{log.action}</span>{' '}
                      <span style={{ color: 'var(--n-800)' }}>{log.entity_type}</span>
                      {log.entity_name && (
                        <span style={{ color: 'var(--n-600)' }}> · <em>{log.entity_name}</em></span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--n-400)', marginTop: 2 }}>{when}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stagger resp-stats">
        <StatCard icon={FolderOpen}    label="Proyectos"          numericValue={projects.length} sub={`${projects.length} activos`} accent="brand"   sparkSeed={1.3} sparkBase={projects.length} />
        <StatCard icon={CheckCircle2}  label="Tareas completadas" numericValue={tasksDone}       sub={`de ${tasks.length}`}        accent="green"   sparkSeed={2.7} sparkBase={tasksDone} />
        <StatCard icon={AlertTriangle} label="Tareas retrasadas"  numericValue={tasksLate}       sub={tasksLate > 0 ? 'Requieren atención' : 'Todo en orden'} accent="red" sparkSeed={4.1} sparkBase={tasksLate + 3} urgent={tasksLate > 0} />
        <StatCard icon={Play}          label="En progreso"        numericValue={tasksInProg}     sub={tasks.length > 0 ? `${Math.round((tasksInProg / tasks.length) * 100)}% del backlog` : '—'} accent="brand" sparkSeed={5.5} sparkBase={tasksInProg} />
        <StatCard icon={DollarSign}    label="Presupuesto"        value={fmtMoneyCompact(tasks.reduce((s, t) => s + (t.budget || 0), 0))} sub="Portafolio" accent="neutral" sparkSeed={6.2} sparkBase={50} />
        <StatCard icon={TrendingUp}    label="Avance promedio"    numericValue={Math.round(avgProgress * 100)} displaySuffix="%" sub="Progreso global" accent="amber" trend={4} sparkSeed={3.4} sparkBase={Math.round(avgProgress * 100)} />
      </div>

      {/* Two columns */}
      <div className="resp-2col">
        {/* Active projects */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--n-150)' }}>
            <div>
              <h2 style={{ fontSize: 13 }}>Proyectos activos</h2>
              <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1 }}>Ordenados por riesgo</div>
            </div>
            <button onClick={() => navigate('/projects')} style={{ fontSize: 11.5, color: 'var(--brand-700)', fontWeight: 550, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div className="stagger">
            {activeProjects.map(({ p, m, sem }, i) => {
              const color = getProjectColor(p.color)
              const lead  = team.find(t => t.name === p.leader)
              return (
                <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                  style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '4px 1fr 100px 90px 80px', gap: 12, alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid var(--n-150)', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: 4, height: 28, borderRadius: 2, background: color, boxShadow: `0 0 0 3px ${color}11` }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <Semaforo kind={sem.kind} />
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>{p.focus_area} · {p.initiative}</div>
                  </div>
                  <ProgressBar value={m.progress} showLabel projectColor={color} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.late > 0 ? (
                      <span className="mono tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--red-700)', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--red-50)' }}>
                        <PulseDot color="var(--red-500)" size={6} />{m.late} retr.
                      </span>
                    ) : (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--n-500)' }}>{m.completed}/{m.total}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Avatar member={lead} size={22} />
                  </div>
                </div>
              )
            })}
            {activeProjects.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: 12.5, color: 'var(--n-400)' }}>
                No hay proyectos activos
              </div>
            )}
          </div>
        </div>

        {/* Priority tasks */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--n-150)' }}>
            <div>
              <h2 style={{ fontSize: 13 }}>Tareas prioritarias</h2>
              <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1 }}>Lo más urgente esta semana</div>
            </div>
            <button onClick={() => navigate('/consolidated')} style={{ fontSize: 11.5, color: 'var(--brand-700)', fontWeight: 550, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="stagger">
            {priorityTasks.map((t, i) => {
              const isLate = t.status === 'Retrasado'
              const projColor = getProjectColor(t._project?.color)
              return (
                <div key={t.id}
                  style={{
                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    borderTop: i === 0 ? 'none' : '1px solid var(--n-150)',
                    background: isLate ? 'linear-gradient(90deg, var(--red-50) 0%, transparent 60%)' : 'transparent',
                    transition: 'background .15s', cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isLate ? 'linear-gradient(90deg, rgba(254,226,226,0.7) 0%, var(--n-25) 70%)' : 'var(--n-25)'}
                  onMouseLeave={e => e.currentTarget.style.background = isLate ? 'linear-gradient(90deg, var(--red-50) 0%, transparent 60%)' : 'transparent'}
                >
                  <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: projColor }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--n-500)', marginTop: 2 }}>
                      <span>{t._project?.name}</span>
                      <span>·</span>
                      <span className="mono tnum">{fmtDate(t.end_date)}</span>
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} size="sm" />
                  <DaysLeftChip endIso={t.end_date} condensed />
                </div>
              )
            })}
            {priorityTasks.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: 12.5, color: 'var(--n-400)' }}>Sin tareas pendientes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
