import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import ProjectForm from '../components/projects/ProjectForm'
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
import { Plus, Pencil, Trash2, ArrowLeft, FolderOpen, AlertTriangle, List, TrendingUp, DollarSign, Receipt, GripVertical, Copy } from 'lucide-react'

const TH_STYLE: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap' }
const TD_STYLE: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle', color: 'var(--n-700)', whiteSpace: 'nowrap' }

function SortableTaskRow({
  task, canDrag, onOpen, onEdit, onDelete, onDuplicate,
}: {
  task: Task; canDrag: boolean
  onOpen: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onDuplicate: (t: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const isLate = task.status === 'Retrasado'
  const isDone = task.status === 'Completado'

  return (
    <tr
      ref={setNodeRef}
      className="show-actions"
      onClick={() => onOpen(task)}
      style={{
        borderTop: '1px solid var(--n-150)',
        background: isDragging ? 'var(--brand-50)' : isLate ? 'var(--red-50)' : 'transparent',
        transition: transition ?? 'background .12s',
        cursor: 'pointer',
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = isLate ? 'var(--red-100)' : 'var(--n-25)' }}
      onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background = isLate ? 'var(--red-50)' : 'transparent' }}
    >
      <td style={{ ...TD_STYLE, textAlign: 'right', width: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
          {canDrag && (
            <span
              {...listeners}
              {...attributes}
              onClick={e => e.stopPropagation()}
              style={{ cursor: 'grab', color: 'var(--n-300)', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              title="Arrastrar para reordenar"
            >
              <GripVertical size={12} />
            </span>
          )}
          <span className="mono tnum" style={{ color: 'var(--n-400)' }}>{task.number}</span>
        </div>
      </td>
      <td style={TD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLate && <AlertTriangle size={13} style={{ color: 'var(--red-500)', flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 550, color: 'var(--n-900)', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>{task.name}</div>
            <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1 }}>{task.type}</div>
          </div>
        </div>
      </td>
      <td style={TD_STYLE}><StatusBadge status={task.status} size="sm" /></td>
      <td style={TD_STYLE}><PriorityBadge priority={task.priority} size="sm" /></td>
      <td style={TD_STYLE} className="mono tnum"><span style={{ color: 'var(--n-600)' }}>{fmtDate(task.start_date)}</span></td>
      <td style={TD_STYLE} className="mono tnum"><span style={{ color: isLate ? 'var(--red-700)' : 'var(--n-600)', fontWeight: isLate ? 600 : 400 }}>{fmtDate(task.end_date)}</span></td>
      <td style={TD_STYLE}><ProgressBar value={task.progress} showLabel /></td>
      <td style={{ ...TD_STYLE, textAlign: 'right' }} className="mono tnum">
        <div style={{ color: 'var(--n-800)' }}>{fmtMoney(task.budget)}</div>
        <div style={{ fontSize: 10.5, color: task.actual_cost > task.budget ? 'var(--red-600)' : 'var(--n-500)' }}>{fmtMoney(task.actual_cost)}</div>
      </td>
      <td style={{ ...TD_STYLE, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
        <div className="row-actions" style={{ display: 'inline-flex', gap: 2 }}>
          <IconButton icon={Copy} title="Duplicar tarea" size={26} onClick={() => onDuplicate(task)} />
          <IconButton icon={Pencil} title="Editar" size={26} onClick={() => onEdit(task)} />
          <IconButton icon={Trash2} title="Eliminar" size={26} danger onClick={() => onDelete(task)} />
        </div>
      </td>
    </tr>
  )
}

export default function ProjectDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { projects, updateProject, deleteProject } = useProjects()
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(id)
  const { projectMetrics, semaphoreFor, getMember, statuses } = useConfigData()

  const [statusFilter,    setStatusFilter]    = useState('')
  const [modalOpen,       setModalOpen]       = useState(false)
  const [drawerTask,      setDrawerTask]      = useState<Task | null>(null)
  const [confirmDelete,   setConfirmDelete]   = useState<Task | null>(null)
  const [showEditProject, setShowEditProject] = useState(false)
  const [confirmDelProj,  setConfirmDelProj]  = useState(false)
  const [deletingProj,    setDeletingProj]    = useState(false)
  const [duplicating,     setDuplicating]     = useState(false)

  // Local ordered copy for drag-and-drop
  const [localTasks, setLocalTasks] = useState<Task[]>([])
  useEffect(() => { setLocalTasks(tasks) }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const project = projects.find(p => p.id === id)
  const color  = getProjectColor(project?.color)
  const m      = project ? projectMetrics(project, tasks) : { total: 0, completed: 0, late: 0, pending: 0, progress: 0, totalBudget: 0, totalCost: 0 }
  const sem    = project ? semaphoreFor(project, tasks) : { kind: 'gray' as const, label: 'Sin planificar' }
  const lead   = getMember(project?.leader || '')

  const displayTasks = statusFilter ? localTasks.filter(t => t.status === statusFilter) : localTasks
  const canDrag = !statusFilter

  const statusCounts = useMemo(() =>
    statuses.reduce((acc, s) => { acc[s.name] = tasks.filter(t => t.status === s.name).length; return acc }, {} as Record<string, number>)
  , [statuses, tasks])

  if (!project && !loading) return (
    <div style={{ padding: 32 }}>
      <EmptyState icon={FolderOpen} title="Proyecto no encontrado" description="Vuelve al catálogo." action={<Button icon={ArrowLeft} onClick={() => navigate('/projects')}>Volver</Button>} />
    </div>
  )

  const handleCreate = async (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => {
    await createTask(data); setModalOpen(false)
  }

  const handleDrawerSave = async (taskId: string, changes: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>>) => {
    await updateTask(taskId, changes as any)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return; await deleteTask(confirmDelete.id); setConfirmDelete(null)
  }

  async function handleDuplicate(task: Task) {
    if (duplicating) return
    setDuplicating(true)
    try {
      const copy = await createTask({
        project_id: task.project_id,
        number: tasks.length + 1,
        type: task.type,
        name: `Copia de ${task.name}`,
        status: task.status,
        priority: task.priority,
        start_date: task.start_date,
        end_date: task.end_date,
        assigned_to: task.assigned_to,
        budget: task.budget,
        actual_cost: 0,
        progress: 0,
        label: task.label,
        notes: task.notes,
        sort_order: tasks.length,
      } as any)
      if (copy) setDrawerTask(copy as unknown as Task)
    } finally {
      setDuplicating(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localTasks.findIndex(t => t.id === active.id)
    const newIndex = localTasks.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(localTasks, oldIndex, newIndex)
    setLocalTasks(reordered)

    await Promise.all(
      reordered.map((t, i) =>
        (t.sort_order ?? i) !== i ? updateTask(t.id, { sort_order: i } as any) : Promise.resolve()
      )
    )
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={Receipt} onClick={() => navigate(`/projects/${id}/valuations`)}>Valorizaciones</Button>
          <Button icon={Pencil} onClick={() => setShowEditProject(true)}>Editar proyecto</Button>
          <Button icon={Trash2} variant="danger" onClick={() => setConfirmDelProj(true)}>Eliminar</Button>
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
        {canDrag && (
          <span style={{ fontSize: 11, color: 'var(--n-400)', marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <GripVertical size={11} /> Arrastra para reordenar
          </span>
        )}
      </div>

      {/* Task table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, border: '2px solid var(--brand-500)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
                    <th style={{ ...TH_STYLE, width: 96, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTasks.map(t => (
                    <SortableTaskRow
                      key={t.id}
                      task={t}
                      canDrag={canDrag}
                      onOpen={setDrawerTask}
                      onEdit={setDrawerTask}
                      onDelete={setConfirmDelete}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
        {!loading && displayTasks.length === 0 && (
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

      {/* Edit project modal */}
      {showEditProject && project && (
        <Modal open onClose={() => setShowEditProject(false)} title="Editar proyecto" size="lg">
          <ProjectForm
            initial={project}
            onSubmit={async data => { await updateProject(project.id, data); setShowEditProject(false) }}
            onCancel={() => setShowEditProject(false)}
          />
        </Modal>
      )}

      {/* Delete project confirm */}
      <Modal open={confirmDelProj} onClose={() => setConfirmDelProj(false)} title="Eliminar proyecto" size="sm">
        <div>
          <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
            ¿Eliminar <strong>{project?.name}</strong>? Se eliminarán todas las tareas del proyecto. Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setConfirmDelProj(false)}>Cancelar</Button>
            <Button variant="danger" disabled={deletingProj} onClick={async () => {
              if (!project) return
              setDeletingProj(true)
              try { await deleteProject(project.id); navigate('/projects') }
              finally { setDeletingProj(false) }
            }}>
              {deletingProj ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
