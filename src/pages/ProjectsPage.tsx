import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useConfigData } from '../hooks/useConfigData'
import Modal from '../components/ui/Modal'
import ProjectForm from '../components/projects/ProjectForm'
import ProgressBar from '../components/ui/ProgressBar'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'
import { Semaforo } from '../components/ui/Semaforo'
import { Button, IconButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Chips'
import { SkeletonProjectCard } from '../components/ui/Loader'
import type { Project } from '../lib/types'
import { fmtDate, fmtMoneyCompact, getProjectColor } from '../lib/helpers'

export default function ProjectsPage() {
  const { projects, loading: projLoading, createProject, updateProject, deleteProject } = useProjects()
  const { tasks, loading: taskLoading }  = useTasks()
  const { semaphoreFor, projectMetrics, getMember } = useConfigData()
  const navigate   = useNavigate()

  const [query, setQuery]               = useState('')
  const [view,  setView]                = useState<'grid' | 'list'>('grid')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState<Project | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [sort, setSort]                 = useState({ key: 'name', dir: 'asc' as 'asc' | 'desc' })

  const enriched = useMemo(() => projects.map(p => {
    const m   = projectMetrics(p, tasks)
    const sem = semaphoreFor(p, tasks)
    const lead  = getMember(p.leader || '')
    const memberNames = Array.from(new Set(tasks.filter(t => t.project_id === p.id).map(t => t.assigned_to).filter(Boolean)))
    const teamMembers = memberNames.map(n => getMember(n!)).filter(Boolean) as ReturnType<typeof getMember>[]
    return { ...p, _m: m, _sem: sem, _lead: lead, _team: teamMembers }
  }), [projects, tasks, projectMetrics, semaphoreFor, getMember])

  const filtered = useMemo(() =>
    enriched.filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()))
  , [enriched, query])

  const sorted = useMemo(() => {
    const list = [...filtered]
    const dir  = sort.dir === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      if (sort.key === 'name')     { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
      if (sort.key === 'health')   { av = { red: 0, amber: 1, gray: 2, green: 3 }[a._sem.kind]; bv = { red: 0, amber: 1, gray: 2, green: 3 }[b._sem.kind] }
      if (sort.key === 'progress') { av = a._m.progress; bv = b._m.progress }
      if (sort.key === 'late')     { av = a._m.late; bv = b._m.late }
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
  }, [filtered, sort])

  const toggleSort = (k: string) =>
    setSort(s => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })

  const handleCreate = async (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    await createProject(data); setModalOpen(false)
  }
  const handleUpdate = async (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editing) return; await updateProject(editing.id, data); setEditing(null)
  }
  const handleDelete = async () => {
    if (!confirmDelete) return; await deleteProject(confirmDelete.id); setConfirmDelete(null)
  }

  return (
    <div className="page-content" style={{ paddingBottom: 28 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 6, height: 32, padding: '0 10px', width: 280, transition: 'border-color .15s, box-shadow .15s' }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--brand-500)'; e.currentTarget.style.boxShadow = 'var(--ring)' }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--n-200)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <Search size={14} style={{ color: 'var(--n-500)', marginRight: 7 }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre…"
            style={{ border: 0, outline: 0, background: 'transparent', fontSize: 12.5, color: 'var(--n-800)', flex: 1 }} />
        </div>
        <div style={{ flex: 1 }} />
        <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-500)' }}>{filtered.length} de {projects.length}</span>
        <ViewToggle value={view} onChange={setView} />
        <Button icon={Plus} variant="primary" onClick={() => setModalOpen(true)}>Nuevo proyecto</Button>
      </div>

      {(projLoading || taskLoading) ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(312px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonProjectCard key={i} />)}
        </div>
      ) : view === 'grid'
        ? <ProjectsGrid rows={sorted} onEdit={setEditing} onDelete={setConfirmDelete} navigate={navigate} />
        : <ProjectsList rows={sorted} onEdit={setEditing} onDelete={setConfirmDelete} navigate={navigate} sort={sort} toggleSort={toggleSort} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo proyecto" size="lg">
        <ProjectForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar proyecto" size="lg">
        {editing && <ProjectForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar proyecto" size="sm">
        {confirmDelete && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16 }}>
              ¿Eliminar <strong>{confirmDelete.name}</strong>? Se eliminarán también todas sus tareas.
            </p>
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

function ViewToggle({ value, onChange }: { value: string; onChange: (v: 'grid' | 'list') => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--n-100)', borderRadius: 7, padding: 2, gap: 1 }}>
      {([['grid', 'Tarjetas', '⊞'], ['list', 'Lista', '☰']] as const).map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} title={label} style={{
          display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 5,
          fontSize: 12, fontWeight: 550,
          background: value === id ? 'var(--n-0)' : 'transparent',
          color: value === id ? 'var(--n-900)' : 'var(--n-600)',
          boxShadow: value === id ? 'var(--shadow-xs)' : 'none',
          cursor: 'pointer', transition: 'background .15s, color .15s',
        }}>
          {label}
        </button>
      ))}
    </div>
  )
}


function ProjectsGrid({ rows, onEdit, onDelete, navigate }: {
  rows: any[]; onEdit: (p: Project) => void; onDelete: (p: Project) => void; navigate: (p: string) => void
}) {
  return (
    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(312px, 1fr))', gap: 14 }}>
      {rows.map((p: any) => (
        <ProjectCard key={p.id} p={p} onEdit={onEdit} onDelete={onDelete} navigate={navigate} />
      ))}
      <div
        onClick={() => {}} /* handled by parent modal */
        style={{ background: 'transparent', border: '1.5px dashed var(--n-300)', borderRadius: 12, minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--n-500)', transition: 'all .18s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-400)'; e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.color = 'var(--brand-700)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--n-300)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-500)' }}
      >
        <span style={{ width: 36, height: 36, borderRadius: 999, background: 'currentColor', color: 'var(--n-0)', opacity: 0.9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <Plus size={18} />
        </span>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Nuevo proyecto</div>
      </div>
    </div>
  )
}

function ProjectCard({ p, onEdit, onDelete, navigate }: { p: any; onEdit: (p: Project) => void; onDelete: (p: Project) => void; navigate: (path: string) => void }) {
  const { _m: m, _lead, _team } = p
  const color = getProjectColor(p.color)
  return (
    <div
      onClick={() => navigate(`/projects/${p.id}`)}
      style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 12, padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'box-shadow .22s, transform .22s, border-color .22s', boxShadow: 'var(--shadow-xs)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px -8px ${color}33, 0 2px 4px -2px rgba(15,17,22,0.04)`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--n-300)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--n-200)' }}
    >
      <div style={{ height: 6, background: `linear-gradient(90deg, ${color} 0%, ${color}dd 70%, ${color}88 100%)`, flex: '0 0 6px', position: 'relative' }}>
        <div className="card-actions" style={{ position: 'absolute', top: 10, right: 8, display: 'flex', gap: 2, zIndex: 4 }} onClick={e => e.stopPropagation()}>
          <span style={{ background: 'var(--n-0)', borderRadius: 7, border: '1px solid var(--n-200)', boxShadow: 'var(--shadow-sm)', display: 'inline-flex', padding: 1 }}>
            <IconButton icon={Pencil} size={26} title="Editar" onClick={() => onEdit(p)} />
            <IconButton icon={Trash2} size={26} danger title="Eliminar" onClick={() => onDelete(p)} />
          </span>
        </div>
      </div>
      <div style={{ padding: '14px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: '0 0 auto' }} />
              <span style={{ fontSize: 11, color: 'var(--n-500)', fontWeight: 500 }}>{p.focus_area} · {p.initiative}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.012em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          </div>
          <Semaforo kind={p._sem.kind} label={p._sem.label} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--n-150)', border: '1px solid var(--n-150)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Tareas', value: `${m.completed}/${m.total}` },
            { label: 'Retrasadas', value: m.late, accent: m.late > 0 ? 'red' : null },
            { label: 'Costo', value: fmtMoneyCompact(m.totalCost) },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--n-0)', padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
              <div className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: s.accent === 'red' ? 'var(--red-700)' : 'var(--n-900)' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: 'var(--n-500)', fontWeight: 500 }}>Avance</span>
            <span className="mono tnum" style={{ color: 'var(--n-700)', fontWeight: 600 }}>{Math.round(m.progress * 100)}%</span>
          </div>
          <ProgressBar value={m.progress} projectColor={color} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--n-150)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar member={_lead} size={22} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--n-500)' }}>Líder</div>
              <div style={{ fontSize: 12, color: 'var(--n-800)', fontWeight: 500 }}>{_lead?.name.split(' ')[0] || p.leader || '—'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {_team.length > 0 && <AvatarGroup members={_team} max={3} size={20} />}
            <span className="mono tnum" style={{ fontSize: 10.5, color: 'var(--n-500)' }}>{fmtDate(p.end_date)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectsList({ rows, onEdit, onDelete, navigate, sort, toggleSort }: {
  rows: any[]; onEdit: (p: Project) => void; onDelete: (p: Project) => void; navigate: (p: string) => void
  sort: { key: string; dir: string }; toggleSort: (k: string) => void
}) {
  const Th = ({ k, children, align = 'left', width }: { k: string; children: React.ReactNode; align?: string; width?: number }) => (
    <th onClick={() => toggleSort(k)} style={{ textAlign: align as any, padding: '10px 12px', fontWeight: 600, fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', width }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--n-900)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--n-500)'}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        <span style={{ opacity: sort.key === k ? 1 : 0.25, color: sort.key === k ? 'var(--brand-600)' : 'var(--n-400)', fontSize: 10 }}>
          {sort.key === k && sort.dir === 'desc' ? '↓' : '↑'}
        </span>
      </span>
    </th>
  )
  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
      <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: 'var(--n-25)' }}>
            <th style={{ width: 8, padding: 0 }} />
            <Th k="name">Proyecto</Th>
            <Th k="health" width={140}>Salud</Th>
            <Th k="progress" width={200}>Avance</Th>
            <Th k="late" width={110}>Retrasadas</Th>
            <th style={{ width: 120, padding: '10px 12px', fontWeight: 600, fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--n-150)' }}>Vence</th>
            <th style={{ width: 80, padding: '10px 12px', borderBottom: '1px solid var(--n-150)' }} />
          </tr>
        </thead>
        <tbody className="stagger">
          {rows.map((p: any) => {
            const color = getProjectColor(p.color)
            return (
              <tr key={p.id} className="show-actions" onClick={() => navigate(`/projects/${p.id}`)}
                style={{ borderTop: '1px solid var(--n-150)', cursor: 'pointer', transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: 0, width: 8, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: color, borderRadius: 2 }} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.005em', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--n-500)' }}>{p.focus_area} · {p.initiative}</div>
                </td>
                <td style={{ padding: '10px 12px' }}><Semaforo kind={p._sem.kind} label={p._sem.label} /></td>
                <td style={{ padding: '10px 12px' }}><ProgressBar value={p._m.progress} showLabel projectColor={color} /></td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  {p._m.late > 0
                    ? <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--red-700)', fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--red-50)' }}>{p._m.late}</span>
                    : <span className="mono tnum" style={{ color: 'var(--n-400)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-600)' }}>{fmtDate(p.end_date)}</span>
                </td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                  <div className="row-actions" style={{ display: 'inline-flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                    <IconButton icon={Pencil} size={26} title="Editar" onClick={() => onEdit(p)} />
                    <IconButton icon={Trash2} size={26} danger title="Eliminar" onClick={() => onDelete(p)} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && <EmptyState title="Sin resultados" description="Ajusta los filtros o crea un nuevo proyecto." />}
    </div>
  )
}
