import { useState, useMemo, useRef } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useConfigData } from '../hooks/useConfigData'
import { Button, IconButton } from '../components/ui/Button'
import { PriorityBadge } from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { Avatar } from '../components/ui/Avatar'
import { ProjectTag } from '../components/ui/Chips'
import Modal from '../components/ui/Modal'
import TaskForm from '../components/tasks/TaskForm'
import TaskDrawer from '../components/ui/TaskDrawer'
import { Plus, AlertTriangle } from 'lucide-react'
import { fmtDate, getProjectColor } from '../lib/helpers'
import type { Task } from '../lib/types'

interface DropTarget {
  cardId: string
  pos: 'before' | 'after'
}

export default function KanbanPage() {
  const { tasks, createTask, updateTask, deleteTask, reorderTask } = useTasks()
  const { projects }                                               = useProjects()
  const { statuses, types, getMember }                             = useConfigData()

  const [projectFilter, setProjectFilter] = useState('')
  const [dragId,      setDragId]      = useState<string | null>(null)
  const [overCol,     setOverCol]     = useState<string | null>(null)
  const [dropTarget,  setDropTarget]  = useState<DropTarget | null>(null)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [modalStatus,  setModalStatus]  = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)

  const dragged = useRef(false)

  const visibleTasks = projectFilter
    ? tasks.filter(t => t.project_id === projectFilter)
    : tasks

  const byStatus = useMemo(() => {
    const map: Record<string, Task[]> = {}
    statuses.forEach(s => { map[s.name] = [] })
    visibleTasks.forEach(t => { if (map[t.status]) map[t.status].push(t) })
    return map
  }, [statuses, visibleTasks])

  const colTint = (hex: string, alpha: number) =>
    hex + Math.round(alpha * 255).toString(16).padStart(2, '0')

  // ── Drag handlers ──────────────────────────────────────────

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    dragged.current = true
    setDragId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', taskId) } catch (_) {}
  }

  const onDragEnd = () => {
    setDragId(null)
    setOverCol(null)
    setDropTarget(null)
    setTimeout(() => { dragged.current = false }, 0)
  }

  // Fired when hovering over a CARD — determines before/after position
  const onCardDragOver = (e: React.DragEvent, card: Task) => {
    e.preventDefault()
    e.stopPropagation()
    if (card.id === dragId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    setOverCol(card.status)
    setDropTarget(prev =>
      prev?.cardId === card.id && prev?.pos === pos ? prev : { cardId: card.id, pos }
    )
  }

  // Fired when hovering over the column (outside a card — e.g. empty area)
  const onColDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault()
    setOverCol(col)
  }

  const onColDragLeave = (statusName: string) => {
    setOverCol(o => o === statusName ? null : o)
    setDropTarget(null)
  }

  const onDrop = async (e: React.DragEvent, statusName: string) => {
    e.preventDefault()
    const id = dragId || e.dataTransfer.getData('text/plain')
    if (!id) return

    let insertBeforeId: string | null = null

    if (dropTarget) {
      const colTasks = byStatus[statusName] || []
      const targetIdx = colTasks.findIndex(t => t.id === dropTarget.cardId)
      if (dropTarget.pos === 'before') {
        insertBeforeId = dropTarget.cardId
      } else {
        insertBeforeId = targetIdx < colTasks.length - 1 ? colTasks[targetIdx + 1].id : null
      }
    }

    await reorderTask(id, statusName, insertBeforeId)
    setDragId(null)
    setOverCol(null)
    setDropTarget(null)
  }

  // ── Task CRUD ───────────────────────────────────────────────

  const handleCreate = async (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => {
    await createTask(data)
    setModalOpen(false)
  }

  const handleSave = async (id: string, changes: Partial<Task>) => {
    await updateTask(id, changes)
    const updated = tasks.find(t => t.id === id)
    if (updated) setSelectedTask({ ...updated, ...changes })
  }

  const handleDelete = async (task: Task) => {
    setSelectedTask(null)
    await deleteTask(task.id)
    setConfirmDelete(null)
  }

  const openCard = (t: Task) => {
    if (dragged.current) return
    setSelectedTask(t)
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filters */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--n-0)', flex: '0 0 auto', flexWrap: 'wrap' }}>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          style={{ height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', cursor: 'pointer' }}
        >
          <option value="">Todos los proyectos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-500)' }}>{visibleTasks.length} tareas</span>
        <Button icon={Plus} variant="primary" onClick={() => { setModalStatus(''); setModalOpen(true) }}>Nueva tarea</Button>
      </div>

      {/* Board */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 24px', background: 'var(--n-50)' }}>
        <div style={{ display: 'flex', gap: 12, height: '100%', minWidth: 'min-content' }}>
          {statuses.map(status => {
            const list   = byStatus[status.name] || []
            const isOver = overCol === status.name
            return (
              <div
                key={status.id}
                onDragOver={e => onColDragOver(e, status.name)}
                onDragLeave={() => onColDragLeave(status.name)}
                onDrop={e => onDrop(e, status.name)}
                style={{
                  width: 296, flex: '0 0 296px',
                  display: 'flex', flexDirection: 'column',
                  background: colTint(status.dot, 0.06),
                  border: '1px solid ' + (isOver ? status.dot : colTint(status.dot, 0.18)),
                  borderRadius: 12, height: '100%',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                {/* Column header */}
                <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: status.dot }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>{status.name}</span>
                    <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-600)', fontWeight: 600, padding: '1px 6px', background: 'var(--n-0)', borderRadius: 4, border: '1px solid ' + colTint(status.dot, 0.18) }}>
                      {list.length}
                    </span>
                  </div>
                  <IconButton icon={Plus} size={24} title="Agregar" onClick={() => { setModalStatus(status.name); setModalOpen(true) }} />
                </div>

                {/* Cards */}
                <div style={{ padding: '0 8px 8px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 60 }}>
                  {list.map(t => {
                    const project    = projects.find(p => p.id === t.project_id)
                    const projColor  = getProjectColor(project?.color)
                    const assignee   = getMember(t.assigned_to || '')
                    const type       = types.find(tt => tt.name === t.type)
                    const isLate     = t.status === 'Retrasado'
                    const isDragging = dragId === t.id
                    const isSelected = selectedTask?.id === t.id

                    const showLineBefore = dropTarget?.cardId === t.id && dropTarget.pos === 'before' && !isDragging
                    const showLineAfter  = dropTarget?.cardId === t.id && dropTarget.pos === 'after'  && !isDragging

                    return (
                      <div key={t.id}>
                        {showLineBefore && (
                          <div style={{ height: 3, background: 'var(--brand-500)', borderRadius: 2, margin: '2px 4px' }} />
                        )}
                        <div
                          draggable
                          onDragStart={e => onDragStart(e, t.id)}
                          onDragEnd={onDragEnd}
                          onDragOver={e => onCardDragOver(e, t)}
                          onClick={() => openCard(t)}
                          style={{
                            background: 'var(--n-0)',
                            border: '1px solid ' + (isSelected ? 'var(--brand-400)' : 'var(--n-200)'),
                            borderRadius: 9, padding: 11, margin: '3px 0',
                            boxShadow: isDragging ? 'var(--shadow-md)' : isSelected ? '0 0 0 2px var(--brand-200)' : 'var(--shadow-xs)',
                            cursor: 'grab',
                            opacity: isDragging ? 0.4 : 1,
                            transform: isDragging ? 'rotate(1.5deg) scale(0.98)' : 'none',
                            transition: 'box-shadow .15s, transform .15s, border-color .15s, opacity .15s',
                            display: 'flex', flexDirection: 'column', gap: 8,
                            position: 'relative', overflow: 'hidden',
                          }}
                          onMouseEnter={e => { if (!isDragging && !isSelected) { e.currentTarget.style.borderColor = 'var(--n-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' } }}
                          onMouseLeave={e => { if (!isDragging && !isSelected) { e.currentTarget.style.borderColor = 'var(--n-200)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' } }}
                        >
                          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: projColor }} />
                          {isLate && (
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--red-50) 0%, transparent 30%)', pointerEvents: 'none' }} />
                          )}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, position: 'relative' }}>
                            <div style={{ fontSize: 13, fontWeight: 550, color: 'var(--n-900)', lineHeight: 1.35, letterSpacing: '-0.005em' }}>{t.name}</div>
                            <PriorityBadge priority={t.priority} size="sm" />
                          </div>
                          <div style={{ position: 'relative' }}>
                            {project && <ProjectTag project={{ name: project.name, color: projColor }} />}
                          </div>
                          <ProgressBar value={t.progress} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--n-100)', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="mono tnum" style={{ fontSize: 10.5, color: isLate ? 'var(--red-700)' : 'var(--n-500)', fontWeight: isLate ? 600 : 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {isLate && <AlertTriangle size={10} />}
                                {fmtDate(t.end_date)}
                              </span>
                              {type && <><span style={{ fontSize: 10.5, color: 'var(--n-400)' }}>·</span><span style={{ fontSize: 10.5, color: 'var(--n-500)' }}>{type.name}</span></>}
                            </div>
                            {assignee && <Avatar member={assignee} size={18} />}
                          </div>
                        </div>
                        {showLineAfter && (
                          <div style={{ height: 3, background: 'var(--brand-500)', borderRadius: 2, margin: '2px 4px' }} />
                        )}
                      </div>
                    )
                  })}
                  {list.length === 0 && (
                    <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 11.5, color: isOver ? status.dot : 'var(--n-400)', border: '1.5px dashed ' + (isOver ? status.dot : colTint(status.dot, 0.20)), borderRadius: 8, margin: '4px 4px', transition: 'border-color .15s, color .15s' }}>
                      {isOver ? 'Suelta aquí' : 'Sin tareas'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* New task modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setModalStatus('') }} title="Nueva tarea" size="lg">
        <TaskForm
          projects={projects}
          nextNumber={tasks.length + 1}
          initial={modalStatus ? { status: modalStatus } : undefined}
          onSubmit={handleCreate}
          onCancel={() => { setModalOpen(false); setModalStatus('') }}
        />
      </Modal>

      {/* Confirm delete modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar tarea" size="sm">
        {confirmDelete && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16 }}>
              ¿Eliminar <strong>{confirmDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Task drawer */}
      <TaskDrawer
        task={selectedTask}
        projects={projects}
        onClose={() => setSelectedTask(null)}
        onSave={handleSave}
        onDelete={task => setConfirmDelete(task)}
      />
    </div>
  )
}
