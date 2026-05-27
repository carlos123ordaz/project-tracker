import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, GripVertical, Database, CheckCircle } from 'lucide-react'
import { useTeamMembers, useTaskStatuses, useTaskPriorities, useTaskTypes, type TeamMember } from '../hooks/useConfig'
import { Avatar } from '../components/ui/Avatar'
import { StatusBadge, PriorityBadge } from '../components/ui/StatusBadge'
import { Button, IconButton } from '../components/ui/Button'
import { getMemberColor, getInitials } from '../lib/helpers'

// ─── Shared ───────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = { height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', width: '100%' }

function SettingsPanel({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-900)' }}>{title}</h2>
          {sub && <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 1 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Team ─────────────────────────────────────────────────────────────────────

function TeamSection() {
  const { items, loading, create, update, remove } = useTeamMembers()
  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [form,     setForm]     = useState({ name: '', role: '', email: '' })
  const [editForm, setEditForm] = useState({ name: '', role: '', email: '' })
  const [busy,     setBusy]     = useState(false)

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      await create({ name: form.name.trim(), role: form.role.trim(), email: form.email.trim() || null, sort_order: items.length } as any)
      setForm({ name: '', role: '', email: '' }); setAdding(false)
    } finally { setBusy(false) }
  }
  const startEdit = (m: TeamMember) => { setEditing(m.id); setEditForm({ name: m.name, role: m.role, email: m.email || '' }) }
  const handleUpdate = async (id: string) => {
    setBusy(true)
    try { await update(id, { name: editForm.name.trim(), role: editForm.role.trim(), email: editForm.email.trim() || null }); setEditing(null) }
    finally { setBusy(false) }
  }

  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando...</div>

  return (
    <SettingsPanel
      title="Miembros del equipo"
      sub="Personas a las que se pueden asignar tareas"
      action={<Button icon={Plus} variant="primary" onClick={() => setAdding(true)}>Agregar</Button>}
    >
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {adding && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--brand-50)', borderBottom: '1px solid var(--n-150)' }}>
            <GripVertical size={14} style={{ color: 'var(--n-300)', flexShrink: 0 }} />
            <input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre *" style={{ ...INPUT, flex: 1 }} />
            <input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Rol" style={{ ...INPUT, width: 140 }} />
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" style={{ ...INPUT, width: 180 }} />
            <IconButton icon={Check} onClick={handleAdd} disabled={busy || !form.name.trim()} size={28} title="Guardar" />
            <IconButton icon={X} onClick={() => { setAdding(false); setForm({ name: '', role: '', email: '' }) }} size={28} title="Cancelar" />
          </div>
        )}
        {items.map((m, i) => (
          <div key={m.id}
            style={{ display: 'grid', gridTemplateColumns: '40px 1.3fr 1fr 1.4fr 80px', gap: 14, alignItems: 'center', padding: '10px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--n-150)', transition: 'background .12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Avatar member={{ id: m.id, name: m.name, initials: getInitials(m.name), color: getMemberColor(i), role: m.role, email: m.email }} size={32} />
            {editing === m.id ? (
              <>
                <input autoFocus value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={INPUT} />
                <input value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} placeholder="Rol" style={INPUT} />
                <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" style={INPUT} />
                <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <IconButton icon={Check} onClick={() => handleUpdate(m.id)} disabled={busy} size={28} title="Guardar" />
                  <IconButton icon={X} onClick={() => setEditing(null)} size={28} title="Cancelar" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 550, color: 'var(--n-900)' }}>{m.name}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--n-700)' }}>{m.role}</div>
                <div style={{ fontSize: 12, color: 'var(--n-600)', fontFamily: 'monospace' }}>{m.email}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <IconButton icon={Pencil} onClick={() => startEdit(m)} size={26} title="Editar" />
                  <IconButton icon={Trash2} onClick={() => remove(m.id)} size={26} title="Eliminar" danger />
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && !adding && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Sin miembros. Agrega el equipo.</div>
        )}
      </div>
    </SettingsPanel>
  )
}

// ─── Generic item list ────────────────────────────────────────────────────────

type ItemBase = { id: string; name: string; sort_order: number }

function ItemListSection<T extends ItemBase>({
  title, sub, items, loading, create, update, remove,
  renderBadge, extraFields,
}: {
  title: string; sub: string
  items: T[]; loading: boolean
  create: (item: Omit<T, 'id'>) => Promise<T>
  update: (id: string, changes: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
  renderBadge?: (item: T) => React.ReactNode
  extraFields?: (val: Partial<T>, set: (v: Partial<T>) => void) => React.ReactNode
}) {
  const [adding,  setAdding]  = useState(false)
  const [newVal,  setNewVal]  = useState<Partial<T>>({} as T)
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState<Partial<T>>({} as T)
  const [busy,    setBusy]    = useState(false)

  const handleAdd = async () => {
    if (!(newVal as any).name?.trim()) return
    setBusy(true)
    try { await create({ ...newVal, sort_order: items.length } as any); setNewVal({} as T); setAdding(false) }
    finally { setBusy(false) }
  }
  const handleUpdate = async (id: string) => {
    setBusy(true)
    try { await update(id, editVal); setEditing(null) }
    finally { setBusy(false) }
  }

  if (loading) return null

  return (
    <SettingsPanel title={title} sub={sub} action={<Button icon={Plus} variant="primary" onClick={() => setAdding(true)}>Agregar</Button>}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {adding && (
          <div style={{ padding: '12px 16px', background: 'var(--brand-50)', borderBottom: '1px solid var(--n-150)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GripVertical size={14} style={{ color: 'var(--n-300)', flexShrink: 0 }} />
              <input autoFocus value={(newVal as any).name || ''} onChange={e => setNewVal(p => ({ ...p, name: e.target.value }))} placeholder="Nombre *" style={{ ...INPUT, flex: 1 }} />
              <IconButton icon={Check} onClick={handleAdd} disabled={busy || !(newVal as any).name?.trim()} size={28} title="Guardar" />
              <IconButton icon={X} onClick={() => { setAdding(false); setNewVal({} as T) }} size={28} title="Cancelar" />
            </div>
            {extraFields && (
              <div style={{ paddingLeft: 22 }}>
                {extraFields(newVal, v => setNewVal(p => ({ ...p, ...v })))}
              </div>
            )}
          </div>
        )}
        {items.map((item, i) => (
          <div key={item.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--n-150)', transition: 'background .12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <GripVertical size={14} style={{ color: 'var(--n-300)', flexShrink: 0, cursor: 'grab' }} />
            {editing === item.id ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input autoFocus value={(editVal as any).name || ''} onChange={e => setEditVal(p => ({ ...p, name: e.target.value }))} style={{ ...INPUT, flex: 1 }} />
                  <IconButton icon={Check} onClick={() => handleUpdate(item.id)} disabled={busy} size={28} title="Guardar" />
                  <IconButton icon={X} onClick={() => setEditing(null)} size={28} title="Cancelar" />
                </div>
                {extraFields && extraFields(editVal, v => setEditVal(p => ({ ...p, ...v })))}
              </div>
            ) : (
              <>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {renderBadge ? renderBadge(item) : <span style={{ fontSize: 13, fontWeight: 550, color: 'var(--n-900)' }}>{item.name}</span>}
                  {(item as any).color && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: (item as any).color, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--n-500)' }}>{(item as any).color}</span>
                    </div>
                  )}
                  {(item as any).dot_color && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: (item as any).dot_color, flexShrink: 0 }} />
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--n-500)' }}>{(item as any).dot_color}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', flexShrink: 0 }}>
                  <IconButton icon={Pencil} onClick={() => { setEditing(item.id); setEditVal({ ...item } as any) }} size={26} title="Editar" />
                  <IconButton icon={Trash2} onClick={() => remove(item.id)} size={26} title="Eliminar" danger />
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && !adding && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Sin registros.</div>
        )}
      </div>
    </SettingsPanel>
  )
}

// ─── Connection ───────────────────────────────────────────────────────────────

function ConnectionSection() {
  const tables = [
    { name: 'projects',        desc: 'Proyectos' },
    { name: 'tasks',           desc: 'Tareas' },
    { name: 'team_members',    desc: 'Equipo de trabajo' },
    { name: 'task_statuses',   desc: 'Status de tareas' },
    { name: 'task_priorities', desc: 'Prioridades' },
    { name: 'task_types',      desc: 'Tipos de tarea' },
  ]
  return (
    <SettingsPanel title="Conexión Supabase" sub="Estado de la base de datos y configuración de entorno">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--green-50)', color: 'var(--green-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--green-100)' }}>
              <CheckCircle size={15} />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>Conectado</div>
              <div style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Supabase (PostgreSQL)</div>
            </div>
          </div>
          <div style={{ background: 'var(--n-900)', borderRadius: 8, padding: '12px 14px', fontSize: 11.5, fontFamily: 'monospace', lineHeight: 2 }}>
            <div style={{ color: '#4ADE80' }}># .env</div>
            <div style={{ color: '#D1D5DB' }}>VITE_SUPABASE_URL=<span style={{ color: '#FCD34D' }}>tu-url</span></div>
            <div style={{ color: '#D1D5DB' }}>VITE_SUPABASE_ANON_KEY=<span style={{ color: '#FCD34D' }}>tu-key</span></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 8 }}>Encuéntralas en Supabase → Settings → API</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--n-900)' }}>Tablas activas</div>
          {tables.map((t, i) => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--n-150)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Database size={13} style={{ color: 'var(--n-500)' }} />
                <span className="mono" style={{ fontSize: 12, color: 'var(--n-800)' }}>{t.name}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--n-500)' }}>{t.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </SettingsPanel>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['Equipo', 'Status', 'Prioridades', 'Tipos', 'Conexión'] as const
type Tab = typeof TABS[number]

export default function SettingsPage() {
  const [tab,  setTab]  = useState<Tab>('Equipo')
  const statuses   = useTaskStatuses()
  const priorities = useTaskPriorities()
  const types      = useTaskTypes()

  return (
    <div style={{ padding: '20px 28px 28px', maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--n-900)' }}>Configuración</h1>
        <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginTop: 2 }}>Datos maestros del workspace</div>
      </div>

      {/* Tab underline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid var(--n-150)', marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 14px', fontSize: 12.5, fontWeight: 550, color: tab === t ? 'var(--brand-700)' : 'var(--n-600)', borderBottom: '2px solid ' + (tab === t ? 'var(--brand-600)' : 'transparent'), marginBottom: -1, cursor: 'pointer', transition: 'color .15s, border-color .15s' }}
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = 'var(--n-900)' }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = 'var(--n-600)' }}
          >{t}</button>
        ))}
      </div>

      {tab === 'Equipo' && <TeamSection />}

      {tab === 'Status' && (
        <ItemListSection
          title="Estados de tarea"
          sub="Estos estados alimentan dinámicamente las columnas del Kanban"
          {...statuses}
          renderBadge={s => <StatusBadge status={s.name} size="sm" />}
          extraFields={(val, set) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 5 }}>Color de fondo</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#6B7280','#0EA5E9','#14B8A6','#F3F4F6','#FEF3C7'].map(c => (
                    <button key={c} type="button" onClick={() => set({ color: c } as any)}
                      style={{ width: 18, height: 18, borderRadius: 4, background: c, border: (val as any).color === c ? '2px solid var(--n-700)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 5 }}>Color del punto</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#6B7280','#0EA5E9','#14B8A6'].map(c => (
                    <button key={c} type="button" onClick={() => set({ dot_color: c } as any)}
                      style={{ width: 18, height: 18, borderRadius: 999, background: c, border: (val as any).dot_color === c ? '2px solid var(--n-700)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        />
      )}

      {tab === 'Prioridades' && (
        <ItemListSection
          title="Prioridades"
          sub="Niveles de urgencia para asignar a las tareas"
          {...priorities}
          renderBadge={p => <PriorityBadge priority={p.name} size="sm" />}
          extraFields={(val, set) => (
            <div>
              <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 5 }}>Color de fondo</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#6B7280','#FEF2F2','#FFF7ED','#FEFCE8','#EFF6FF'].map(c => (
                  <button key={c} type="button" onClick={() => set({ color: c } as any)}
                    style={{ width: 18, height: 18, borderRadius: 4, background: c, border: (val as any).color === c ? '2px solid var(--n-700)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )}
        />
      )}

      {tab === 'Tipos' && (
        <ItemListSection
          title="Tipos de tarea"
          sub="Categorías para clasificar las tareas"
          {...types}
        />
      )}

      {tab === 'Conexión' && <ConnectionSection />}
    </div>
  )
}
