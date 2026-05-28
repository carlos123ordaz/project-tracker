import React, { useMemo, useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useConfigData } from '../hooks/useConfigData'
import { StatusBadge, PriorityBadge } from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/Chips'
import { Button } from '../components/ui/Button'
import { fmtDate, fmtMoney, getProjectColor } from '../lib/helpers'
import { AlertTriangle, Layers, Search } from 'lucide-react'
import { PageLoader } from '../components/ui/Loader'
import type { Task } from '../lib/types'

const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle', color: 'var(--n-700)', whiteSpace: 'nowrap' }

export default function ConsolidatedPage() {
  const { tasks, loading }    = useTasks()
  const { projects } = useProjects()
  const { statuses, priorities, team, getMember } = useConfigData()

  const [query,          setQuery]          = useState('')
  const [projectFilter,  setProjectFilter]  = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [memberFilter,   setMemberFilter]   = useState('')
  const [grouped,        setGrouped]        = useState(true)

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false
      if (projectFilter  && t.project_id   !== projectFilter)  return false
      if (statusFilter   && t.status       !== statusFilter)   return false
      if (priorityFilter && t.priority     !== priorityFilter) return false
      if (memberFilter   && t.assigned_to  !== memberFilter)   return false
      return true
    })
  }, [tasks, query, projectFilter, statusFilter, priorityFilter, memberFilter])

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    filtered.forEach(t => {
      if (!groups[t.project_id]) groups[t.project_id] = []
      groups[t.project_id].push(t)
    })
    return Object.entries(groups)
      .map(([pjId, ts]) => ({ project: projects.find(p => p.id === pjId), tasks: ts }))
      .filter(g => g.project)
      .sort((a, b) => projects.findIndex(p => p.id === a.project!.id) - projects.findIndex(p => p.id === b.project!.id))
  }, [filtered, projects])

  const SEL: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5,
    border: '1px solid var(--n-200)', borderRadius: 6,
    background: 'var(--n-0)', color: 'var(--n-800)', cursor: 'pointer',
  }

  const TaskRow = ({ t, showProject }: { t: Task; showProject: boolean }) => {
    const isLate = t.status === 'Retrasado'
    const isDone = t.status === 'Completado'
    const p      = projects.find(pj => pj.id === t.project_id)
    const color  = getProjectColor(p?.color)
    const member = getMember(t.assigned_to || '')
    return (
      <tr
        style={{ borderTop: '1px solid var(--n-150)', background: isLate ? 'rgba(254,226,226,0.30)' : 'transparent', transition: 'background .12s', cursor: 'default' }}
        onMouseEnter={e => e.currentTarget.style.background = isLate ? 'rgba(254,226,226,0.55)' : 'var(--n-25)'}
        onMouseLeave={e => e.currentTarget.style.background = isLate ? 'rgba(254,226,226,0.30)' : 'transparent'}
      >
        {showProject && (
          <td style={TD}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--n-700)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.name}</span>
            </div>
          </td>
        )}
        <td style={{ ...TD, textAlign: 'right', color: 'var(--n-400)' }} className="mono tnum">{t.number}</td>
        <td style={TD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!showProject && <span style={{ width: 2, height: 16, background: color, borderRadius: 1, flexShrink: 0 }} />}
            {isLate && <AlertTriangle size={13} style={{ color: 'var(--red-500)', flexShrink: 0 }} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 550, color: 'var(--n-900)', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1 }}>{t.type}</div>
            </div>
          </div>
        </td>
        <td style={TD}><StatusBadge status={t.status} size="sm" /></td>
        <td style={TD}><PriorityBadge priority={t.priority} size="sm" /></td>
        <td style={TD} className="mono tnum"><span style={{ color: 'var(--n-600)' }}>{fmtDate(t.start_date)}</span></td>
        <td style={TD} className="mono tnum"><span style={{ color: isLate ? 'var(--red-700)' : 'var(--n-600)', fontWeight: isLate ? 600 : 400 }}>{fmtDate(t.end_date)}</span></td>
        <td style={TD}>
          {member
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar member={member} size={20} /><span style={{ fontSize: 12 }}>{member.name}</span></div>
            : <span style={{ color: 'var(--n-400)', fontSize: 12 }}>{t.assigned_to || '—'}</span>}
        </td>
        <td style={TD}><ProgressBar value={t.progress} showLabel /></td>
        <td style={{ ...TD, textAlign: 'right' }} className="mono tnum">
          <div style={{ color: 'var(--n-800)' }}>{fmtMoney(t.budget)}</div>
          <div style={{ fontSize: 10.5, color: t.actual_cost > t.budget ? 'var(--red-600)' : 'var(--n-500)' }}>{fmtMoney(t.actual_cost)}</div>
        </td>
      </tr>
    )
  }

  if (loading) return (
    <div className="page-content" style={{ maxWidth: 1700, margin: '0 auto' }}>
      <PageLoader />
    </div>
  )

  return (
    <div className="page-content" style={{ maxWidth: 1700, margin: '0 auto' }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar tareas…"
            style={{ height: 32, padding: '0 10px 0 32px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', width: 240, outline: 'none' }}
          />
        </div>
        <select value={projectFilter}  onChange={e => setProjectFilter(e.target.value)}  style={SEL}>
          <option value="">Proyecto</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={statusFilter}   onChange={e => setStatusFilter(e.target.value)}   style={SEL}>
          <option value="">Estado</option>
          {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={SEL}>
          <option value="">Prioridad</option>
          {priorities.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <select value={memberFilter}   onChange={e => setMemberFilter(e.target.value)}   style={SEL}>
          <option value="">Asignado</option>
          {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <Button icon={Layers} variant={grouped ? 'subtle' : 'ghost'} onClick={() => setGrouped(g => !g)}>
          {grouped ? 'Agrupado' : 'Vista plana'}
        </Button>
        <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-500)' }}>{filtered.length} tareas</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--n-25)' }}>
              {!grouped && <th style={{ ...TH, width: 180 }}>Proyecto</th>}
              <th style={{ ...TH, width: 44, textAlign: 'right' }}>#</th>
              <th style={{ ...TH, minWidth: 240 }}>Tarea</th>
              <th style={{ ...TH, width: 120 }}>Estado</th>
              <th style={{ ...TH, width: 80 }}>Prio.</th>
              <th style={{ ...TH, width: 90 }}>Inicio</th>
              <th style={{ ...TH, width: 90 }}>Fin</th>
              <th style={{ ...TH, width: 130 }}>Asignado</th>
              <th style={{ ...TH, width: 140 }}>Avance</th>
              <th style={{ ...TH, width: 110, textAlign: 'right' }}>Presup.</th>
            </tr>
          </thead>
          <tbody>
            {grouped ? (
              groupedTasks.length === 0 ? null :
              groupedTasks.map(({ project: p, tasks: ts }) => {
                const color = getProjectColor(p!.color)
                return (
                  <React.Fragment key={p!.id}>
                    <tr style={{ background: color + '0d', borderTop: '1px solid var(--n-150)' }}>
                      <td colSpan={9} style={{ padding: '8px 12px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>{p!.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--n-500)' }}>{p!.focus_area} · {p!.initiative}</span>
                          <span className="mono tnum" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--n-600)', fontWeight: 600 }}>{ts.length} tareas</span>
                        </div>
                      </td>
                    </tr>
                    {ts.map(t => <TaskRow key={t.id} t={t} showProject={false} />)}
                  </React.Fragment>
                )
              })
            ) : (
              filtered.map(t => <TaskRow key={t.id} t={t} showProject={true} />)
            )}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState title="Sin resultados" description="Ajusta los filtros o limpia la búsqueda." />
        )}
      </div>
    </div>
  )
}
