import { useMemo, useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useConfigData } from '../hooks/useConfigData'
import { Avatar } from '../components/ui/Avatar'
import ProgressBar from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/Chips'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { TODAY, addDays, isoDay, parseISO, DAYS_ES, MONTHS_FULL, getProjectColor } from '../lib/helpers'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

export default function CalendarPage() {
  const { projects }  = useProjects()
  const { tasks }     = useTasks()
  const { team, getMember } = useConfigData()

  const [projectFilter, setProjectFilter] = useState('')
  const [memberFilter,  setMemberFilter]  = useState('')
  const [view,          setView]          = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() })
  const [selectedDay,   setSelectedDay]   = useState(isoDay(TODAY))

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (projectFilter && t.project_id !== projectFilter) return false
    if (memberFilter  && t.assigned_to !== memberFilter) return false
    return true
  }), [tasks, projectFilter, memberFilter])

  // 42-cell grid starting on Monday before the 1st
  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1)
    const dow   = (first.getDay() + 6) % 7
    const start = addDays(first, -dow)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [view])

  const tasksOnDay = (d: Date) => {
    const ds = isoDay(d)
    return filteredTasks.filter(t =>
      t.start_date && t.end_date && t.start_date <= ds && t.end_date >= ds
    )
  }

  const goMonth = (delta: number) => {
    setView(v => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  const goToday = () => {
    setView({ year: TODAY.getFullYear(), month: TODAY.getMonth() })
    setSelectedDay(isoDay(TODAY))
  }

  const selectedTasks = useMemo(() => {
    const sel = parseISO(selectedDay)
    return tasksOnDay(sel).sort((a, b) => {
      const pa = projects.findIndex(p => p.id === a.project_id)
      const pb = projects.findIndex(p => p.id === b.project_id)
      return pa - pb
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, filteredTasks, projects])

  const SEL: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5,
    border: '1px solid var(--n-200)', borderRadius: 6,
    background: 'var(--n-0)', color: 'var(--n-800)', cursor: 'pointer',
  }

  const selDate = parseISO(selectedDay)

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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IconButton icon={ChevronLeft}  onClick={() => goMonth(-1)} title="Mes anterior"  size={30} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)', minWidth: 140, textAlign: 'center', textTransform: 'capitalize', letterSpacing: '-0.012em' }}>
            {MONTHS_FULL[view.month]} {view.year}
          </span>
          <IconButton icon={ChevronRight} onClick={() => goMonth(1)}  title="Mes siguiente" size={30} />
          <Button onClick={goToday}>Hoy</Button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, padding: '16px 24px 24px', overflow: 'auto' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Day name header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
              {DAYS_ES.map(d => (
                <div key={d} style={{ padding: '8px 6px', fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, textAlign: 'center' }}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', flex: 1, minHeight: 540 }}>
              {days.map((d, i) => {
                const ds           = isoDay(d)
                const isOtherMonth = d.getMonth() !== view.month
                const isToday      = ds === isoDay(TODAY)
                const isSelected   = ds === selectedDay
                const dayTasks     = tasksOnDay(d)
                const visible      = dayTasks.slice(0, 3)
                const extra        = dayTasks.length - visible.length
                const col = i % 7
                const row = Math.floor(i / 7)
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(ds)}
                    style={{
                      position: 'relative',
                      padding: 6,
                      borderRight:  col < 6 ? '1px solid var(--n-150)' : 'none',
                      borderBottom: row < 5 ? '1px solid var(--n-150)' : 'none',
                      background: isOtherMonth ? 'var(--n-25)' : 'var(--n-0)',
                      cursor: 'pointer', transition: 'background .12s',
                      display: 'flex', flexDirection: 'column', gap: 4,
                      minHeight: 90,
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--n-50)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isOtherMonth ? 'var(--n-25)' : 'var(--n-0)' }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--brand-500)', borderRadius: 4, pointerEvents: 'none', zIndex: 2 }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span className="mono tnum" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 999, fontSize: 11, fontWeight: 600, background: isToday ? 'var(--brand-600)' : 'transparent', color: isToday ? '#fff' : (isOtherMonth ? 'var(--n-400)' : 'var(--n-900)') }}>
                        {d.getDate()}
                      </span>
                      {dayTasks.length > 0 && !isToday && (
                        <span className="mono tnum" style={{ position: 'absolute', right: 0, fontSize: 10, color: 'var(--n-500)', fontWeight: 600 }}>{dayTasks.length}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', minWidth: 0 }}>
                      {visible.map(t => {
                        const p     = projects.find(pj => pj.id === t.project_id)
                        const color = getProjectColor(p?.color)
                        return (
                          <div key={t.id} title={t.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 5px', background: color + '14', borderRadius: 4, fontSize: 10.5, color: 'var(--n-800)', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', borderLeft: `2px solid ${color}`, opacity: isOtherMonth ? 0.55 : 1 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                          </div>
                        )
                      })}
                      {extra > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, padding: '0 5px', marginTop: 1 }}>+{extra} más</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside style={{ flex: '0 0 340px', borderLeft: '1px solid var(--n-150)', background: 'var(--n-25)', padding: '16px 18px 24px', overflow: 'auto' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {DAYS_ES[(selDate.getDay() + 6) % 7]}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.015em', marginTop: 2 }}>
              {selDate.getDate()} de {MONTHS_FULL[selDate.getMonth()]}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 4 }}>
              {selectedTasks.length} tarea{selectedTasks.length === 1 ? '' : 's'} activa{selectedTasks.length === 1 ? '' : 's'}
            </div>
          </div>

          {selectedTasks.length === 0 ? (
            <EmptyState icon={Calendar} title="Sin tareas" description="No hay tareas activas este día." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedTasks.map(t => {
                const p      = projects.find(pj => pj.id === t.project_id)
                const color  = getProjectColor(p?.color)
                const member = getMember(t.assigned_to || '')
                return (
                  <div key={t.id} className="card card-hover" style={{ padding: 10, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
                    <div style={{ paddingLeft: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--n-900)', marginBottom: 4 }}>{t.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--n-500)' }}>{p?.name}</span>
                        {member && <Avatar member={member} size={18} />}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <ProgressBar value={t.progress} projectColor={color} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
