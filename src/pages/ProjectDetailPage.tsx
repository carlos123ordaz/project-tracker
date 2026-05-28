import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useConfigData } from '../hooks/useConfigData'
import Modal from '../components/ui/Modal'
import TaskForm from '../components/tasks/TaskForm'
import TaskDrawer from '../components/ui/TaskDrawer'
import { StatusBadge, PriorityBadge } from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { Avatar } from '../components/ui/Avatar'
import { Semaforo } from '../components/ui/Semaforo'
import { DaysLeftChip, EmptyState } from '../components/ui/Chips'
import { Button, IconButton } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import type { Task } from '../lib/types'
import { fmtDate, fmtDateFull, fmtMoney, fmtMoneyCompact, getProjectColor } from '../lib/helpers'
import { Plus, Pencil, Trash2, ArrowLeft, FolderOpen, AlertTriangle, List, TrendingUp, DollarSign } from 'lucide-react'

const TH_STYLE: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap' }
const TD_STYLE: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle', color: 'var(--n-700)', whiteSpace: 'nowrap' }

export default function ProjectDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { projects } = useProjects()
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(id)
  const { projectMetrics, semaphoreFor, getMember, statuses } = useConfigData()

  const [statusFilter,   setStatusFilter]   = useState('')
  const [modalOpen,      setModalOpen]      = useState(false)
  const [drawerTask,     setDrawerTask]     = useState<Task | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<Task | null>(null)

  const project = projects.find(p => p.id === id)
  if (!project && !loading) return (
    <div style={{ padding: 32 }}>
      <EmptyState icon={FolderOpen} title="Proyecto no encontrado" description="Vuelve al catálogo." action={<Button icon={ArrowLeft} onClick={() => navigate('/projects')}>Volver</Button>} />
    </div>
  )

  const color  = getProjectColor(project?.color)
  const m      = project ? projectMetrics(project, tasks) : { total: 0, completed: 0, late: 0, pending: 0, progress: 0, totalBudget: 0, totalCost: 0 }
  const sem    = project ? semaphoreFor(project, tasks) : { kind: 'gray' as const, label: 'Sin planificar' }
  const lead   = getMember(project?.leader || '')

  const filtered = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks

  const statusCounts = useMemo(() =>
    statuses.reduce((acc, s) => { acc[s.name] = tasks.filter(t => t.status === s.name).length; return acc }, {} as Record<string, number>)
  , [statuses, tasks])

  const handleCreate = async (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => {
    await createTask(data); setModalOpen(false)
  }
  const handleDrawerSave = async (taskId: string, changes: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>>) => {
    await updateTask(taskId, changes as any)
  }
  const handleDelete = async () => {
    if (!confirmDelete) return; await deleteTask(confirmDelete.id); setConfirmDelete(null)
  }

  return (
    <div className="page-content" style={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* Project header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 4px 12px ${color}40`, flex: '0 0 auto' }}>
          <FolderOpen size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--n-500)', marginBottom: 4 }}>
            <button onClick={() => navigate('/projects')} style={{ cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--n-600)' }}>
              <ArrowLeft size={11} /> Proyectos
            </button>
            <span style={{ color: 'var(--n-300)' }}>/</span>
            <span>{project?.focus_area} · {project?.initiative}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 20 }}>{project?.name}</h1>
            <Semaforo kind={sem.kind} label={sem.label} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 11.5, color: 'var(--n-600)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Avatar member={lead} size={18} />
              <span>Líder: <strong style={{ color: 'var(--n-800)', fontWeight: 600 }}>{lead?.name || project?.leader || '—'}</strong></span>
            </span>
            <span className="mono tnum">{fmtDateFull(project?.start_date)} → {fmtDateFull(project?.end_date)}</span>
            <DaysLeftChip endIso={project?.end_date} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={Plus} variant="primary" onClick={() => setModalOpen(true)}>Nueva tarea</Button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="resp-4col" style={{ marginBottom: 16 }}>
        <StatCard icon={List}          label="Total Tareas"   numericValue={m.total}                          sub={`${m.completed} completadas`}  accent="neutral" />
        <StatCard icon={TrendingUp}    label="Avance"         value={Math.round(m.progress * 100) + '%'}      sub="Promedio ponderado"             accent="brand" />
        <StatCard icon={DollarSign}    label="Presupuesto"    value={fmtMoneyCompact(m.totalBudget)}          sub={`${m.total} tareas`}            accent="green" />
        <StatCard icon={AlertTriangle} label="Costo Actual"   value={fmtMoneyCompact(m.totalCost)}            sub={m.totalBudget > 0 ? `${Math.round(m.totalCost / m.totalBudget * 100)}% del presupuesto` : '—'} accent={m.totalCost > m.totalBudget ? 'red' : 'amber'} urgent={m.totalCost > m.totalBudget} />
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[{ name: 'Todas', count: tasks.length, color: '' }, ...statuses.map(s => ({ name: s.name, count: statusCounts[s.name] || 0, color: s.dot }))].map(s => {
          const active = s.name === 'Todas' ? !statusFilter : statusFilter === s.name
          return (
            <button key={s.name}
              onClick={() => setStatusFilter(s.name === 'Todas' ? '' : s.name)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6,
                fontSize: 12, fontWeight: 550, cursor: 'pointer',
                background: active ? (s.color || 'var(--brand-600)') : 'var(--n-100)',
                color: active ? (s.name === 'Todas' ? '#fff' : s.color || '#fff') : 'var(--n-700)',
                border: active ? 'none' : '1px solid var(--n-200)',
                transition: 'all .15s',
              }}
            >
              {s.color && <span style={{ width: 6, height: 6, borderRadius: 999, background: active ? '#fff' : s.color }} />}
              {s.name}
              <span style={{ fontSize: 11, opacity: 0.75 }}>({s.count})</span>
            </button>
          )
        })}
      </div>

      {/* Task table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, border: '2px solid var(--brand-500)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)' }}>
                <th style={{ ...TH_STYLE, width: 44, textAlign: 'right' }}>#</th>
                <th style={{ ...TH_STYLE, minWidth: 240 }}>Tarea</th>
                <th style={{ ...TH_STYLE, width: 120 }}>Estado</th>
                <th style={{ ...TH_STYLE, width: 80 }}>Prioridad</th>
                <th style={{ ...TH_STYLE, width: 90 }}>Inicio</th>
                <th style={{ ...TH_STYLE, width: 90 }}>Fin</th>
                <th style={{ ...TH_STYLE, width: 140 }}>Avance</th>
                <th style={{ ...TH_STYLE, width: 110, textAlign: 'right' }}>Presupuesto</th>
                <th style={{ ...TH_STYLE, width: 76, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const isLate = t.status === 'Retrasado'
                const isDone = t.status === 'Completado'
                return (
                  <tr key={t.id} className="show-actions"
                    onClick={() => setDrawerTask(t)}
                    style={{ borderTop: '1px solid var(--n-150)', background: isLate ? 'rgba(254,226,226,0.35)' : 'transparent', transition: 'background .12s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = isLate ? 'rgba(254,226,226,0.6)' : 'var(--n-25)'}
                    onMouseLeave={e => e.currentTarget.style.background = isLate ? 'rgba(254,226,226,0.35)' : 'transparent'}
                  >
                    <td style={{ ...TD_STYLE, textAlign: 'right', color: 'var(--n-400)' }} className="mono tnum">{t.number}</td>
                    <td style={TD_STYLE}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isLate && <AlertTriangle size={13} style={{ color: 'var(--red-500)', flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 550, color: 'var(--n-900)', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1 }}>{t.type}</div>
                        </div>
                      </div>
                    </td>
                    <td style={TD_STYLE}><StatusBadge status={t.status} size="sm" /></td>
                    <td style={TD_STYLE}><PriorityBadge priority={t.priority} size="sm" /></td>
                    <td style={TD_STYLE} className="mono tnum"><span style={{ color: 'var(--n-600)' }}>{fmtDate(t.start_date)}</span></td>
                    <td style={TD_STYLE} className="mono tnum"><span style={{ color: isLate ? 'var(--red-700)' : 'var(--n-600)', fontWeight: isLate ? 600 : 400 }}>{fmtDate(t.end_date)}</span></td>
                    <td style={TD_STYLE}><ProgressBar value={t.progress} showLabel /></td>
                    <td style={{ ...TD_STYLE, textAlign: 'right' }} className="mono tnum">
                      <div style={{ color: 'var(--n-800)' }}>{fmtMoney(t.budget)}</div>
                      <div style={{ fontSize: 10.5, color: t.actual_cost > t.budget ? 'var(--red-600)' : 'var(--n-500)' }}>{fmtMoney(t.actual_cost)}</div>
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div className="row-actions" style={{ display: 'inline-flex', gap: 2 }}>
                        <IconButton icon={Pencil} title="Editar" size={26} onClick={() => setDrawerTask(t)} />
                        <IconButton icon={Trash2} title="Eliminar" size={26} danger onClick={() => setConfirmDelete(t)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <EmptyState title="Sin tareas" description="Cambia el filtro o agrega una tarea nueva."
            action={<Button icon={Plus} variant="primary" onClick={() => setModalOpen(true)}>Nueva tarea</Button>} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva tarea" size="lg">
        {id && <TaskForm projectId={id} nextNumber={tasks.length + 1} onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />}
      </Modal>
      <TaskDrawer
        task={drawerTask}
        projects={projects}
        onClose={() => setDrawerTask(null)}
        onSave={handleDrawerSave}
        onDelete={t => { setDrawerTask(null); setConfirmDelete(t) }}
      />
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar tarea" size="sm">
        {confirmDelete && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16 }}>¿Eliminar <strong>{confirmDelete.name}</strong>?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
