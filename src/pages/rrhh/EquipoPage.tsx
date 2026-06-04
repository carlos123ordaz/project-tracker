import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTeamMembers, type TeamMember } from '../../hooks/useConfig'
import { Avatar } from '../../components/ui/Avatar'
import { Button, IconButton } from '../../components/ui/Button'
import { useIsMobile } from '../../hooks/useIsMobile'
import { getMemberColor, getInitials } from '../../lib/helpers'

const INPUT: React.CSSProperties = {
  height: 36, padding: '0 10px', fontSize: 13,
  border: '1px solid var(--n-200)', borderRadius: 6,
  background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', width: '100%',
}
const LABEL: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--n-600)', marginBottom: 4, display: 'block',
}

export default function EquipoPage() {
  const { items, loading, create, update, remove } = useTeamMembers()
  const isMobile = useIsMobile()

  const [query,    setQuery]    = useState('')
  const [page,     setPage]     = useState(0)
  const [pageSize, setPageSize] = useState(15)
  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [form,     setForm]     = useState({ name: '', role: '', email: '' })
  const [editForm, setEditForm] = useState({ name: '', role: '', email: '' })
  const [busy,     setBusy]     = useState(false)

  useEffect(() => { setPage(0) }, [query, pageSize])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      await create({ name: form.name.trim(), role: form.role.trim(), email: form.email.trim() || null, sort_order: items.length } as any)
      setForm({ name: '', role: '', email: '' })
      setAdding(false)
    } finally { setBusy(false) }
  }

  const startEdit = (m: TeamMember) => {
    setEditing(m.id)
    setEditForm({ name: m.name, role: m.role, email: m.email || '' })
  }

  const handleUpdate = async (id: string) => {
    setBusy(true)
    try {
      await update(id, { name: editForm.name.trim(), role: editForm.role.trim(), email: editForm.email.trim() || null })
      setEditing(null)
    } finally { setBusy(false) }
  }

  const cancelAdd = () => { setAdding(false); setForm({ name: '', role: '', email: '' }) }

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando...</div>
  )

  const q = query.toLowerCase()
  const filtered = items.filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
  )
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated  = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const pad = isMobile ? '16px 16px 24px' : '20px 28px 28px'

  return (
    <div style={{ padding: pad }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: 'var(--n-900)' }}>Equipo</h1>
        <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginTop: 2 }}>
          Colaboradores disponibles para asignación de tareas
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, rol o email…"
            style={{ ...INPUT, paddingLeft: 30, width: '100%' }}
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--n-500)', flexShrink: 0 }}>
          {filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button icon={Plus} variant="primary" onClick={() => setAdding(true)}>Agregar</Button>
        </div>
      </div>

      {/* Formulario de nuevo miembro */}
      {adding && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={LABEL}>Nombre *</span>
                <input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" style={INPUT} />
              </div>
              <div>
                <span style={LABEL}>Rol</span>
                <input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Ej. Ingeniero civil" style={INPUT} />
              </div>
              <div>
                <span style={LABEL}>Email</span>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@empresa.com" type="email" style={INPUT} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <Button variant="secondary" onClick={cancelAdd}>Cancelar</Button>
                <Button variant="primary" onClick={handleAdd} disabled={busy || !form.name.trim()}>
                  {busy ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input autoFocus value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nombre *" style={{ ...INPUT, flex: 1 }} />
              <input value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                placeholder="Rol" style={{ ...INPUT, width: 160 }} />
              <input value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Email" style={{ ...INPUT, width: 200 }} />
              <IconButton icon={Check} onClick={handleAdd} disabled={busy || !form.name.trim()} size={28} title="Guardar" />
              <IconButton icon={X} onClick={cancelAdd} size={28} title="Cancelar" />
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {items.length === 0 && !adding ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
            Sin miembros. Agrega el equipo.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
            Sin resultados para "{query}"
          </div>
        ) : isMobile ? (
          /* ── Tarjetas móvil ── */
          paginated.map((m, i) => (
            <div key={m.id} style={{ padding: '14px 16px', borderBottom: i < paginated.length - 1 ? '1px solid var(--n-100)' : 'none' }}>
              {editing === m.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <span style={LABEL}>Nombre *</span>
                    <input autoFocus value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={INPUT} />
                  </div>
                  <div>
                    <span style={LABEL}>Rol</span>
                    <input value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} placeholder="Rol" style={INPUT} />
                  </div>
                  <div>
                    <span style={LABEL}>Email</span>
                    <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" style={INPUT} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
                    <Button variant="primary" onClick={() => handleUpdate(m.id)} disabled={busy}>
                      {busy ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Avatar
                    member={{ id: m.id, name: m.name, initials: getInitials(m.name), color: getMemberColor(i), role: m.role, email: m.email }}
                    size={44}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-900)' }}>{m.name}</div>
                    {m.role && <div style={{ fontSize: 12, color: 'var(--n-600)', marginTop: 1 }}>{m.role}</div>}
                    {m.email && <div style={{ fontSize: 12, color: 'var(--n-500)', fontFamily: 'monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => startEdit(m)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer' }}
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid var(--red-200)', background: 'var(--red-50)', color: 'var(--red-700)', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          /* ── Tabla escritorio ── */
          paginated.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'grid', gridTemplateColumns: '40px 1.3fr 1fr 1.4fr 80px',
                gap: 14, alignItems: 'center', padding: '10px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--n-150)',
                transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar
                member={{ id: m.id, name: m.name, initials: getInitials(m.name), color: getMemberColor(i), role: m.role, email: m.email }}
                size={32}
              />
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
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--n-400)' }}>Filas:</span>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            style={{ height: 30, padding: '0 8px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer' }}
          >
            {[15, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div style={{ width: 1, height: 16, background: 'var(--n-200)', margin: '0 4px' }} />
          <span style={{ fontSize: 12.5, color: 'var(--n-500)' }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} de {filtered.length}
          </span>
          <IconButton icon={ChevronLeft} onClick={() => setPage(p => p - 1)} disabled={page === 0} size={28} title="Anterior" />
          <IconButton icon={ChevronRight} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} size={28} title="Siguiente" />
        </div>
      )}
    </div>
  )
}
