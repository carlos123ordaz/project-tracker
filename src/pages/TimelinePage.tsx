import { useMemo, useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useConfigData } from '../hooks/useConfigData'
import { IconButton } from '../components/ui/Button'
import { TODAY, addDays, isoDay, parseISO, fmtDate, MONTHS_FULL, getProjectColor } from '../lib/helpers'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKS = 14
const DAY_W = 12

export default function TimelinePage() {
  const { projects } = useProjects()
  const { tasks }    = useTasks()
  const { team }     = useConfigData()

  const [projectFilter, setProjectFilter] = useState('')
  const [memberFilter,  setMemberFilter]  = useState('')
  const [weekOffset,    setWeekOffset]    = useState(0)

  const TODAY_DOW    = (TODAY.getDay() + 6) % 7
  const startMonday  = addDays(TODAY, -TODAY_DOW + weekOffset * 7 - 7)
  const days         = useMemo(() => Array.from({ length: WEEKS * 7 }, (_, i) => addDays(startMonday, i)), [startMonday])
  const rangeStart   = days[0]
  const rangeEnd     = days[days.length - 1]
  const WEEK_W       = DAY_W * 7
  const todayLeft    = Math.round((TODAY.getTime() - rangeStart.getTime()) / 86400000) * DAY_W + DAY_W / 2

  const monthSpans = useMemo(() => {
    const spans: { key: string; label: string; count: number }[] = []
    let cur: (typeof spans)[0] | null = null
    days.forEach(d => {
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!cur || cur.key !== key) {
        cur = { key, label: `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`, count: 0 }
        spans.push(cur)
      }
      cur.count++
    })
    return spans
  }, [days])

  const visibleProjects = useMemo(() =>
    projects.filter(p => !projectFilter || p.id === projectFilter)
  , [projects, projectFilter])

  const visibleTasksFor = useMemo(() => {
    const map: Record<string, typeof tasks> = {}
    visibleProjects.forEach(p => {
      map[p.id] = tasks.filter(t => {
        if (t.project_id !== p.id) return false
        if (memberFilter && t.assigned_to !== memberFilter) return false
        if (!t.start_date && !t.end_date) return false
        const ts = parseISO(t.start_date || t.end_date!)
        const te = parseISO(t.end_date || t.start_date!)
        return te >= rangeStart && ts <= rangeEnd
      })
    })
    return map
  }, [visibleProjects, tasks, memberFilter, rangeStart, rangeEnd])

  const taskGeom = (t: (typeof tasks)[0]) => {
    const ts  = parseISO(t.start_date || t.end_date!)
    const te  = parseISO(t.end_date || t.start_date!)
    const sIdx = Math.max(0, Math.round((ts.getTime() - rangeStart.getTime()) / 86400000))
    const eIdx = Math.min(days.length - 1, Math.round((te.getTime() - rangeStart.getTime()) / 86400000))
    const left  = sIdx * DAY_W
    const width = Math.max(DAY_W * 0.7, (eIdx - sIdx + 1) * DAY_W - 2)
    return { left, width }
  }

  const totalWidth = WEEKS * WEEK_W

  const SEL: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5,
    border: '1px solid var(--n-200)', borderRadius: 6,
    background: 'var(--n-0)', color: 'var(--n-800)', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filters */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--n-150)', background: 'var(--n-0)', display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={SEL}>
          <option value="">Todos los proyectos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)} style={SEL}>
          <option value="">Todo el equipo</option>
          {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'inline-flex', gap: 0, border: '1px solid var(--n-200)', borderRadius: 6, overflow: 'hidden' }}>
          <IconButton icon={ChevronLeft}  onClick={() => setWeekOffset(w => w - 1)} title="Semana anterior" size={30} />
          <button
            onClick={() => setWeekOffset(0)}
            style={{ padding: '0 10px', fontSize: 12, fontWeight: 550, color: 'var(--n-700)', cursor: 'pointer', borderLeft: '1px solid var(--n-200)', borderRight: '1px solid var(--n-200)' }}
          >Hoy</button>
          <IconButton icon={ChevronRight} onClick={() => setWeekOffset(w => w + 1)} title="Semana siguiente" size={30} />
        </div>
      </div>

      {/* Gantt */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--n-0)' }}>
        <div style={{ display: 'flex', minWidth: 'min-content' }}>
          {/* Left panel — sticky */}
          <div style={{ flex: '0 0 280px', borderRight: '1px solid var(--n-150)', background: 'var(--n-25)', position: 'sticky', left: 0, zIndex: 3 }}>
            <div style={{ height: 68, borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'flex-end', padding: '0 14px 8px' }}>
              <span style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Proyecto / Tarea</span>
            </div>
            {visibleProjects.map(p => {
              const ptasks = visibleTasksFor[p.id] || []
              const color  = getProjectColor(p.color)
              return (
                <div key={p.id}>
                  <div style={{ height: 30, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)', fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>
                    <span style={{ width: 4, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                    <span className="mono tnum" style={{ fontSize: 10.5, color: 'var(--n-500)', fontWeight: 500 }}>{ptasks.length}</span>
                  </div>
                  {ptasks.map(t => (
                    <div key={t.id} style={{ height: 26, padding: '0 14px 0 26px', display: 'flex', alignItems: 'center', fontSize: 11.5, color: 'var(--n-700)', borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Right panel — bars */}
          <div style={{ position: 'relative', flex: 1, minWidth: totalWidth }}>
            {/* Month header */}
            <div style={{ height: 44, display: 'flex', borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)', position: 'sticky', top: 0, zIndex: 2 }}>
              {monthSpans.map((m, i) => (
                <div key={i} style={{ width: m.count * DAY_W, borderRight: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.005em', textTransform: 'capitalize' }}>
                  {m.label}
                </div>
              ))}
            </div>
            {/* Day numbers header */}
            <div style={{ height: 24, display: 'flex', borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)', position: 'sticky', top: 44, zIndex: 2 }}>
              {days.map((d, i) => {
                const isToday   = isoDay(d) === isoDay(TODAY)
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                const isWeekStart = i % 7 === 0
                return (
                  <div key={i} style={{ width: DAY_W, flex: `0 0 ${DAY_W}px`, borderRight: isWeekStart ? '1px solid var(--n-200)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: isToday ? 'var(--brand-700)' : (isWeekend ? 'var(--n-400)' : 'var(--n-600)'), fontWeight: isToday ? 700 : 500, background: isToday ? 'var(--brand-50)' : 'transparent' }}>
                    {d.getDate()}
                  </div>
                )
              })}
            </div>

            {/* Grid + rows */}
            <div style={{ position: 'relative' }}>
              {/* Weekend stripes */}
              {days.map((d, i) => {
                if (d.getDay() !== 0 && d.getDay() !== 6) return null
                return (
                  <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * DAY_W, width: DAY_W, background: 'var(--n-25)', pointerEvents: 'none', zIndex: 0 }} />
                )
              })}
              {/* Today line */}
              {todayLeft >= 0 && todayLeft <= totalWidth && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 2, background: 'var(--red-500)', pointerEvents: 'none', zIndex: 5, boxShadow: '0 0 0 1px rgba(239,68,68,0.18)' }}>
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateY(-7px)', width: 10, height: 10, borderRadius: 999, background: 'var(--red-500)', border: '2px solid var(--n-0)' }} />
                </div>
              )}

              {/* Project rows */}
              {visibleProjects.map(p => {
                const ptasks = visibleTasksFor[p.id] || []
                const color  = getProjectColor(p.color)
                return (
                  <div key={p.id} style={{ position: 'relative' }}>
                    {/* Project spacer row */}
                    <div style={{ height: 30, borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }} />
                    {ptasks.map(t => {
                      const { left, width } = taskGeom(t)
                      const isLate = t.status === 'Retrasado'
                      const isDone = t.status === 'Completado'
                      const fillW  = width * Math.max(0, Math.min(1, t.progress))
                      return (
                        <div key={t.id} style={{ height: 26, borderBottom: '1px solid var(--n-150)', position: 'relative' }}>
                          <div
                            title={`${t.name} • ${t.status} • ${fmtDate(t.start_date)} → ${fmtDate(t.end_date)} • ${Math.round(t.progress * 100)}%`}
                            style={{
                              position: 'absolute', top: 4, left, width, height: 18,
                              borderRadius: 5,
                              background: isLate
                                ? `repeating-linear-gradient(135deg, ${color}80 0 6px, ${color}40 6px 12px)`
                                : isDone ? color + '40' : color + '22',
                              border: '1px solid ' + color + (isLate ? '' : '66'),
                              overflow: 'hidden', cursor: 'pointer',
                              transition: 'transform .12s, box-shadow .12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 2px 6px ${color}55`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                          >
                            {/* Progress fill */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fillW, background: color, opacity: isDone ? 0.85 : 1 }} />
                            {/* Label */}
                            {width > 60 && (
                              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: '100%', padding: '0 8px', fontSize: 10.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.25)', gap: 4 }}>
                                {isLate && <AlertTriangle size={10} />}
                                {t.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {visibleProjects.every(p => (visibleTasksFor[p.id] || []).length === 0) && (
                <div style={{ padding: '64px 24px', textAlign: 'center', fontSize: 13, color: 'var(--n-400)' }}>
                  No hay tareas con fechas para mostrar en este período
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
