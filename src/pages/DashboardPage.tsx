import { useState, useEffect, useMemo, type ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useConfigData } from '../hooks/useConfigData'
import { useAuth } from '../hooks/useAuth'
import { Button, IconButton } from '../components/ui/Button'
import { PageLoader } from '../components/ui/Loader'
import { LiveBadge, PulseDot, CountUpNumber, useCountUp } from '../components/ui/Motion'
import {
  CheckCircle2, Play, Flame, Clock, FolderOpen, List,
  Gauge, Calendar, DollarSign, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react'
import {
  fmtDate, fmtMoneyCompact, TODAY, MONTHS_FULL, DAYS_ES, MONTHS_ES,
  daysBetween, daysFromToday, isoDay, addDays,
} from '../lib/helpers'
import type { Task } from '../lib/types'
import type { StatusObj } from '../hooks/useConfigData'

// ── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { projects, loading: projLoading } = useProjects()
  const { tasks, loading: taskLoading }    = useTasks()
  const { statuses, projectMetrics, loading: configLoading } = useConfigData()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [selectedPid, setSelectedPid] = useState('')
  const selectedProject = selectedPid ? (projects.find(p => p.id === selectedPid) ?? null) : null

  const scopedTasks    = selectedPid ? tasks.filter(t => t.project_id === selectedPid) : tasks
  const scopedProjects = selectedPid ? (selectedProject ? [selectedProject] : []) : projects

  const projectsActive = useMemo(() =>
    scopedProjects.filter(p => { const m = projectMetrics(p, tasks); return m.total > 0 && m.completed < m.total }).length
  , [scopedProjects, tasks, projectMetrics])

  const projectsDone = useMemo(() =>
    scopedProjects.filter(p => { const m = projectMetrics(p, tasks); return m.total > 0 && m.completed === m.total }).length
  , [scopedProjects, tasks, projectMetrics])

  const projectsLate = useMemo(() =>
    scopedProjects.filter(p => { const m = projectMetrics(p, tasks); return m.late > 0 }).length
  , [scopedProjects, tasks, projectMetrics])

  const tasksByStatus = useMemo(() =>
    statuses.reduce((acc, s) => {
      acc[s.id] = scopedTasks.filter(t => t.status === s.name).length
      return acc
    }, {} as Record<string, number>)
  , [statuses, scopedTasks])

  const totalTasks  = scopedTasks.length
  const tasksInProg = scopedTasks.filter(t => t.status === 'En Progreso').length
  const tasksCrit   = scopedTasks.filter(t => t.priority === 'Crítica' && t.status !== 'Completado').length
  const doneCount   = tasksByStatus[statuses.find(s => s.name === 'Completado')?.id ?? ''] ?? 0

  const avgProgress = scopedTasks.length === 0 ? 0
    : scopedTasks.reduce((s, t) => s + (t.progress || 0), 0) / scopedTasks.length

  const totalBudget = scopedTasks.reduce((s, t) => s + (t.budget || 0), 0)
  const totalCost   = scopedTasks.reduce((s, t) => s + (t.actual_cost || 0), 0)

  // Timeline progress
  let timelineProgress = 0
  let timelineLabel    = ''
  if (selectedProject) {
    if (selectedProject.start_date && selectedProject.end_date) {
      const tot     = daysBetween(selectedProject.start_date, selectedProject.end_date)
      const elapsed = daysBetween(selectedProject.start_date, isoDay(TODAY))
      timelineProgress = Math.max(0, Math.min(1, elapsed / (tot || 1)))
      timelineLabel = `${fmtDate(selectedProject.start_date)} → ${fmtDate(selectedProject.end_date)}`
    }
  } else {
    const allStarts = scopedProjects.map(p => p.start_date).filter(Boolean).sort() as string[]
    const allEnds   = scopedProjects.map(p => p.end_date).filter(Boolean).sort() as string[]
    const portStart = allStarts[0]
    const portEnd   = allEnds[allEnds.length - 1]
    if (portStart && portEnd) {
      const tot     = daysBetween(portStart, portEnd)
      const elapsed = daysBetween(portStart, isoDay(TODAY))
      timelineProgress = Math.max(0, Math.min(1, elapsed / (tot || 1)))
      timelineLabel = `${fmtDate(portStart)} → ${fmtDate(portEnd)}`
    }
  }

  const daysLeft = selectedProject
    ? (daysFromToday(selectedProject.end_date) ?? 0)
    : scopedProjects.length === 0 ? 0
    : Math.min(...scopedProjects.filter(p => p.end_date).map(p => daysFromToday(p.end_date) ?? 0))

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'equipo'
  const firstName   = displayName.split(' ')[0]

  if (projLoading || taskLoading || configLoading) return (
    <div className="dash-page fade-in"><PageLoader /></div>
  )

  return (
    <div className="dash-page fade-in">
      {/* Toolbar */}
      <div className="dash-toolbar">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <LiveBadge label="Sincronizado" color="var(--green-500)" />
          </div>
          <h1 style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
            {selectedProject ? selectedProject.name : `Hola, ${firstName}.`}
          </h1>
          <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginTop: 3, textTransform: 'capitalize' }}>
            {selectedProject
              ? <>{selectedProject.focus_area} · {selectedProject.initiative} · <span className="mono">{timelineLabel}</span></>
              : <>{DAYS_ES[(TODAY.getDay() + 6) % 7]}, {TODAY.getDate()} de {MONTHS_FULL[TODAY.getMonth()]} · revisión de portafolio</>}
          </div>
        </div>
        <div className="dash-actions">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 2px 0 10px',
            border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)',
          }}>
            <span style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginRight: 4 }}>
              Vista
            </span>
            <select
              value={selectedPid}
              onChange={e => setSelectedPid(e.target.value)}
              style={{
                appearance: 'none', border: 'none', outline: 'none',
                background: 'transparent', fontSize: 12.5, fontWeight: 550,
                color: 'var(--n-900)', paddingRight: 22, cursor: 'pointer',
                fontFamily: 'inherit', minWidth: 180,
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A818F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center',
              }}
            >
              <option value="">Todo el portafolio</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Button icon={Plus} onClick={() => navigate('/kanban')}>Tarea</Button>
          <Button icon={Plus} variant="primary" onClick={() => navigate('/projects')}>Proyecto</Button>
        </div>
      </div>

      {/* Row 1: calendar | Total proyectos | Status breakdown */}
      <div className="dash-row1">
        <MiniCalendar tasks={scopedTasks} />
        <TotalProjectsCard
          total={scopedProjects.length}
          active={projectsActive}
          done={projectsDone}
          late={projectsLate}
          isPortfolio={!selectedProject}
        />
        <StatusBreakdownCard statuses={statuses} counts={tasksByStatus} total={totalTasks} />
      </div>

      {/* Row 2: 4 quick stats */}
      <div className="dash-row2">
        <QuickStat icon={CheckCircle2} label="Total tareas"     value={totalTasks}  accent="green"
          sub={`${doneCount} completadas`} />
        <QuickStat icon={Play}         label="En progreso"       value={tasksInProg} accent="brand"
          sub={`${totalTasks > 0 ? Math.round(tasksInProg / totalTasks * 100) : 0}% del backlog`} />
        <QuickStat icon={Flame}        label="Prioridad crítica" value={tasksCrit}   accent="red"
          sub="Activas no completadas" pulse={tasksCrit > 0} />
        <QuickStat icon={Clock}        label="Días restantes"    value={daysLeft}    mono
          accent={daysLeft < 0 ? 'red' : daysLeft <= 7 ? 'amber' : 'neutral'}
          sub={selectedProject ? 'Hasta fin de proyecto' : 'Proyecto más próximo'} />
      </div>

      {/* Row 3: Gauge | Timeline | Donut */}
      <div className="dash-row3">
        <ProgressGaugeCard progress={avgProgress} totalTasks={totalTasks} />
        <TimelineProgressCard progress={timelineProgress} label={timelineLabel} />
        <BudgetDonutCard budget={totalBudget} spent={totalCost} />
      </div>
    </div>
  )
}

// ── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ tasks }: { tasks: Task[] }) {
  const [view, setView] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() })
  const first    = new Date(view.year, view.month, 1)
  const dow      = (first.getDay() + 6) % 7
  const gridStart = addDays(first, -dow)
  const days     = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const lastRowStart = days[35]
  const shouldShow42 = lastRowStart && lastRowStart.getMonth() === view.month
  const visibleDays  = shouldShow42 ? days : days.slice(0, 35)

  const hasTask = (d: Date) => {
    const ds = isoDay(d)
    return tasks.some(t => t.start_date && t.end_date && t.start_date <= ds && t.end_date >= ds)
  }

  const goMonth = (delta: number) => {
    setView(v => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {MONTHS_ES[view.month]}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.01em' }}>
            {view.year}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton icon={ChevronLeft}  size={22} onClick={() => goMonth(-1)} title="Mes anterior" />
          <IconButton icon={ChevronRight} size={22} onClick={() => goMonth(1)}  title="Mes siguiente" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['L','M','X','J','V','S','D'].map(d => (
          <div key={d} style={{
            fontSize: 9.5, color: 'var(--n-400)', fontWeight: 600,
            textAlign: 'center', letterSpacing: '0.04em', padding: '2px 0',
          }}>{d}</div>
        ))}
        {visibleDays.map((d, i) => {
          const isOther = d.getMonth() !== view.month
          const isToday = isoDay(d) === isoDay(TODAY)
          const has     = hasTask(d)
          return (
            <div key={i}
              className="mono tnum"
              style={{
                position: 'relative', aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10.5,
                color: isOther ? 'var(--n-300)' : isToday ? '#fff' : 'var(--n-700)',
                background: isToday ? 'var(--brand-600)' : 'transparent',
                borderRadius: 5, cursor: 'pointer',
                fontWeight: isToday ? 600 : 500,
                transition: 'background .15s',
              }}
              onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'var(--n-100)' }}
              onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'transparent' }}
            >
              {d.getDate()}
              {has && !isOther && !isToday && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 3, height: 3, borderRadius: 999, background: 'var(--brand-500)',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Total Projects Card ──────────────────────────────────────────────────────

function TotalProjectsCard({ total, active, done, late, isPortfolio }: {
  total: number; active: number; done: number; late: number; isPortfolio: boolean
}) {
  return (
    <div className="card" style={{
      padding: '14px 16px', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 12,
      background: 'linear-gradient(135deg, var(--n-0) 0%, var(--brand-50) 100%)',
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: -40, right: -30,
        width: 130, height: 130, borderRadius: 999,
        background: 'radial-gradient(circle, rgba(79,70,229,0.10), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
          color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(79,70,229,0.3)',
        }}>
          <FolderOpen size={16} />
        </span>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--n-600)', fontWeight: 500, letterSpacing: '-0.005em' }}>
            {isPortfolio ? 'Total proyectos' : 'Proyecto seleccionado'}
          </div>
          <div className="mono tnum" style={{ fontSize: 28, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            <CountUpNumber value={total} />
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, position: 'relative' }}>
        <MiniPill label="Activos"   value={active} color="var(--brand-600)" />
        <MiniPill label="Completos" value={done}   color="var(--green-600)" />
        <MiniPill label="Retrasado" value={late}   color="var(--red-600)"   pulse={late > 0} />
      </div>
    </div>
  )
}

function MiniPill({ label, value, color, pulse }: { label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      padding: '7px 10px', borderRadius: 7,
      background: 'var(--n-0)', border: '1px solid var(--n-200)',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--n-500)', fontWeight: 500, letterSpacing: '-0.005em' }}>
        {pulse
          ? <PulseDot color={color} size={6} />
          : <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />}
        {label}
      </span>
      <span className="mono tnum" style={{ fontSize: 15, fontWeight: 600, color: 'var(--n-900)', marginTop: 2, letterSpacing: '-0.012em' }}>
        <CountUpNumber value={value} />
      </span>
    </div>
  )
}

// ── Status Breakdown Card ────────────────────────────────────────────────────

function StatusBreakdownCard({ statuses, counts, total }: {
  statuses: StatusObj[]; counts: Record<string, number>; total: number
}) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--amber-50)', color: 'var(--amber-600)',
            border: '1px solid var(--amber-100)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <List size={16} />
          </span>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500 }}>Tareas por estado</div>
            <div className="mono tnum" style={{ fontSize: 13, color: 'var(--n-900)', fontWeight: 600 }}>
              {total} tareas en total
            </div>
          </div>
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
        {statuses.map(s => (
          counts[s.id] > 0 ? (
            <div key={s.id} style={{ flex: counts[s.id], background: s.dot, transition: 'flex .3s' }}
              title={`${s.name}: ${counts[s.id]}`} />
          ) : null
        ))}
      </div>

      {/* Status chips */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: `repeat(${statuses.length}, 1fr)`, gap: 6 }}>
        {statuses.map(s => (
          <div key={s.id}
            style={{
              border: `1px solid ${s.dot}33`,
              background: s.bg,
              borderRadius: 8, padding: '8px 9px',
              display: 'flex', flexDirection: 'column',
              position: 'relative', overflow: 'hidden',
              transition: 'transform .15s, box-shadow .15s',
              cursor: 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 10px -2px ${s.dot}33` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: s.dot, fontWeight: 600, letterSpacing: '-0.005em' }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: s.dot }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            </span>
            <span className="mono tnum" style={{ fontSize: 18, fontWeight: 600, color: 'var(--n-900)', marginTop: 2, letterSpacing: '-0.02em', lineHeight: 1 }}>
              <CountUpNumber value={counts[s.id] || 0} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Quick Stat ───────────────────────────────────────────────────────────────

type Accent = 'brand' | 'red' | 'amber' | 'green' | 'neutral'

function QuickStat({ icon: Icon, label, value, sub, accent = 'brand', pulse = false, mono = false }: {
  icon: ElementType; label: string; value: number; sub?: string
  accent?: Accent; pulse?: boolean; mono?: boolean
}) {
  const palettes: Record<Accent, { bg: string; fg: string }> = {
    brand:   { bg: 'var(--brand-50)',  fg: 'var(--brand-600)' },
    red:     { bg: 'var(--red-50)',    fg: 'var(--red-600)'   },
    amber:   { bg: 'var(--amber-50)',  fg: 'var(--amber-600)' },
    green:   { bg: 'var(--green-50)',  fg: 'var(--green-600)' },
    neutral: { bg: 'var(--n-100)',     fg: 'var(--n-600)'     },
  }
  const p = palettes[accent]
  return (
    <div className="card card-hover" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        width: 38, height: 38, borderRadius: 10,
        background: p.bg, color: p.fg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flex: '0 0 auto', position: 'relative',
      }}>
        <Icon size={18} />
        {pulse && (
          <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8 }}>
            <PulseDot color="var(--red-500)" size={8} />
          </span>
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500, marginBottom: 1 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className={mono ? 'mono tnum' : 'tnum'} style={{ fontSize: 22, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.022em', lineHeight: 1 }}>
            <CountUpNumber value={value} />
          </span>
          {sub && <span style={{ fontSize: 11, color: 'var(--n-500)' }}>{sub}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Progress Gauge (semi-circle) ─────────────────────────────────────────────

function ProgressGaugeCard({ progress, totalTasks }: { progress: number; totalTasks: number }) {
  const pct = Math.max(0, Math.min(1, progress))
  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimPct(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  const r  = 64
  const W  = 200
  const H  = 120
  const cx = W / 2
  const cy = H - 10
  const C  = Math.PI * r

  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--brand-50)', color: 'var(--brand-600)',
          border: '1px solid var(--brand-100)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Gauge size={16} />
        </span>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500 }}>Progreso global</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>Promedio por tarea</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 4 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="var(--brand-500)" />
              <stop offset="100%" stopColor="var(--brand-700)" />
            </linearGradient>
          </defs>
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="var(--n-100)" strokeWidth="14" strokeLinecap="round" />
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="url(#gauge-grad)" strokeWidth="14" strokeLinecap="round"
            style={{
              strokeDasharray: C,
              strokeDashoffset: C * (1 - animPct),
              transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)',
            }} />
        </svg>
        <div style={{ position: 'absolute', top: H - 50, left: 0, right: 0, textAlign: 'center' }}>
          <div className="mono tnum" style={{ fontSize: 28, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.025em', lineHeight: 1 }}>
            <CountUpNumber value={Math.round(pct * 100)} suffix="%" />
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 2 }}>de {totalTasks} tareas</div>
        </div>
      </div>
      <div className="mono tnum" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--n-400)', padding: '0 4px' }}>
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
    </div>
  )
}

// ── Timeline Progress Bar ────────────────────────────────────────────────────

function TimelineProgressCard({ progress, label }: { progress: number; label: string }) {
  const pct = Math.max(0, Math.min(1, progress))
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#F5F3FF', color: '#7C3AED',
            border: '1px solid #DDD6FE',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={16} />
          </span>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500 }}>Timeline</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>Tiempo transcurrido</div>
          </div>
        </div>
        <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.022em' }}>
          <CountUpNumber value={Math.round(pct * 100)} suffix="%" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ position: 'relative', height: 14, background: 'var(--n-100)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, var(--brand-500) 0%, #7C3AED 100%)',
            borderRadius: 999,
            transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
            boxShadow: '0 1px 2px rgba(79,70,229,0.3)',
          }}>
            <div className="shimmer" style={{ position: 'absolute', inset: 0, borderRadius: 999, opacity: 0.45 }} />
          </div>
          <div style={{
            position: 'absolute', top: -3, bottom: -3,
            left: `calc(${pct * 100}% - 1px)`,
            width: 2, background: '#fff', borderRadius: 1,
            boxShadow: '0 0 0 1px var(--n-200), 0 2px 4px rgba(0,0,0,0.1)',
            transition: 'left 1.2s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
        <div className="mono tnum" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--n-400)' }}>
          <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--n-600)' }}>
        <span className="mono">{label || '—'}</span>
      </div>
    </div>
  )
}

// ── Budget Donut ─────────────────────────────────────────────────────────────

function BudgetDonutCard({ budget, spent }: { budget: number; spent: number }) {
  const pct        = budget > 0 ? spent / budget : 0
  const animPct    = useCountUp(Math.min(1, pct), 1100)
  const safePct    = Math.max(0, Math.min(1, animPct))
  const overBudget = spent > budget
  const r          = 42
  const C          = 2 * Math.PI * r
  const size       = 120

  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--green-50)', color: 'var(--green-600)',
          border: '1px solid var(--green-100)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DollarSign size={16} />
        </span>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500 }}>Presupuesto</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>
            {overBudget ? 'Sobre el presupuesto' : 'Gastado de presupuesto'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: '0 0 auto' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--n-100)" strokeWidth="12" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={overBudget ? 'var(--red-500)' : 'var(--green-500)'} strokeWidth="12"
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              strokeDasharray: C,
              strokeDashoffset: C * (1 - safePct),
              transition: 'stroke-dashoffset .15s linear',
            }} />
          <text x={size / 2} y={size / 2 - 2} textAnchor="middle"
            style={{ fontSize: 22, fontWeight: 600, fill: 'var(--n-900)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
            {Math.round(safePct * 100)}%
          </text>
          <text x={size / 2} y={size / 2 + 14} textAnchor="middle"
            style={{ fontSize: 9, fill: 'var(--n-500)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            usado
          </text>
        </svg>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <BudgetLine label="Total presupuesto"             value={fmtMoneyCompact(budget)}              color="var(--n-700)"                                                 dot="var(--n-300)" />
          <BudgetLine label="Total gastado"                 value={fmtMoneyCompact(spent)}               color={overBudget ? 'var(--red-700)' : 'var(--green-700)'}           dot={overBudget ? 'var(--red-500)' : 'var(--green-500)'} />
          <BudgetLine label={overBudget ? 'Excedido' : 'Restante'} value={fmtMoneyCompact(Math.abs(budget - spent))} color="var(--n-700)"                                   dot="var(--brand-500)" />
        </div>
      </div>
    </div>
  )
}

function BudgetLine({ label, value, color, dot }: { label: string; value: string; color: string; dot: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--n-600)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }} />
        {label}
      </span>
      <span className="mono tnum" style={{ fontSize: 12.5, fontWeight: 600, color }}>{value}</span>
    </div>
  )
}
