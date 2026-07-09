import { useState, useEffect, Fragment } from 'react'
import {
  Plus, Pencil, Shield, UserX, UserCheck,
  Check, AlertCircle, Mail, Search, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useUserProfiles, useModulePermissions } from '../../hooks/useUserProfiles'
import { useAuth } from '../../hooks/useAuth'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Button, IconButton } from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SCREENS_LIST, type UserProfile, type ModulePermission } from '../../lib/types'

const INPUT: React.CSSProperties = {
  height: 36, padding: '0 10px', fontSize: 13,
  border: '1px solid var(--n-200)', borderRadius: 6,
  background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', width: '100%',
}
const LABEL: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--n-600)', marginBottom: 4, display: 'block',
}
const FIELD = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={LABEL}>{label}</span>
    {children}
  </div>
)

function Avatar({ name, email, size = 36 }: { name: string; email: string; size?: number }) {
  const initials = (name || email).slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--brand-100)', color: 'var(--brand-700)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}

// ── Modal de permisos ─────────────────────────────────────────

function PermissionsModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const { permissions, loading, upsertPermission } = useModulePermissions(user.id)
  const [busy, setBusy] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(SCREENS_LIST.map(g => g.group)))

  if (user.is_superadmin) {
    return (
      <Modal open onClose={onClose} title={`Permisos — ${user.full_name || user.email}`} size="md">
        <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--brand-700)' }}>
          <Shield size={16} />
          <span style={{ fontSize: 13 }}>Superadmin tiene acceso completo a todos los módulos.</span>
        </div>
      </Modal>
    )
  }

  const getPermission = (key: string): ModulePermission | undefined =>
    permissions.find(p => p.module === key)

  const toggle = async (key: string, field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => {
    setBusy(`${key}-${field}`)
    const current = getPermission(key)
    const currentVal = current ? current[field] : false
    try {
      await upsertPermission(key, { [field]: !currentVal })
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  const toggleGroupAll = async (group: typeof SCREENS_LIST[number], field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => {
    const allOn = group.screens.every(s => getPermission(s.key)?.[field])
    const newVal = !allOn
    for (const screen of group.screens) {
      const current = getPermission(screen.key)
      if ((current?.[field] ?? false) !== newVal) {
        setBusy(`${screen.key}-${field}`)
        try {
          await upsertPermission(screen.key, { [field]: newVal })
        } catch (e: any) {
          alert(e.message)
        }
      }
    }
    setBusy(null)
  }

  const toggleGroupOpen = (group: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <Modal open onClose={onClose} title={`Permisos — ${user.full_name || user.email}`} size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--n-400)', fontSize: 12.5 }}>Cargando...</div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--n-150)', position: 'sticky', top: 0, background: 'var(--n-0)', zIndex: 1 }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--n-700)', fontSize: 11.5 }}>Pantalla</th>
                {(['Ver', 'Agregar', 'Editar', 'Eliminar'] as const).map(h => (
                  <th key={h} style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, color: 'var(--n-700)', fontSize: 11.5, width: 72 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCREENS_LIST.map(group => {
                const isOpen = openGroups.has(group.group)
                const FIELDS = ['can_view', 'can_add', 'can_edit', 'can_delete'] as const
                return (
                  <Fragment key={group.group}>
                    {/* Group header */}
                    <tr
                      style={{ background: 'var(--n-50)', cursor: 'pointer', borderTop: '1px solid var(--n-150)' }}
                      onClick={() => toggleGroupOpen(group.group)}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--n-800)', fontSize: 12.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {group.group}
                          <span style={{ fontSize: 10.5, color: 'var(--n-400)', fontWeight: 500 }}>
                            ({group.screens.length})
                          </span>
                        </div>
                      </td>
                      {FIELDS.map(field => {
                        const allOn = group.screens.every(s => getPermission(s.key)?.[field])
                        const someOn = !allOn && group.screens.some(s => getPermission(s.key)?.[field])
                        return (
                          <td key={field} style={{ textAlign: 'center', padding: '8px 12px' }}>
                            <button
                              onClick={e => { e.stopPropagation(); toggleGroupAll(group, field) }}
                              style={{
                                width: 24, height: 24, borderRadius: 6,
                                border: '1.5px solid',
                                borderColor: allOn ? 'var(--brand-600)' : someOn ? 'var(--brand-300)' : 'var(--n-300)',
                                background: allOn ? 'var(--brand-600)' : someOn ? 'var(--brand-100)' : 'var(--n-0)',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              }}
                              title={`${allOn ? 'Quitar' : 'Dar'} acceso a todo el grupo`}
                            >
                              {allOn && <Check size={13} color="#fff" />}
                              {someOn && <span style={{ width: 8, height: 2, background: 'var(--brand-600)', borderRadius: 1 }} />}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                    {/* Screen rows */}
                    {isOpen && group.screens.map((screen, i) => {
                      const perm = getPermission(screen.key)
                      return (
                        <tr key={screen.key} style={{ borderTop: '1px solid var(--n-100)', background: i % 2 === 0 ? 'transparent' : 'var(--n-25)' }}>
                          <td style={{ padding: '8px 12px 8px 32px', fontWeight: 500, color: 'var(--n-800)' }}>
                            {screen.label}
                            <span style={{ fontSize: 10.5, color: 'var(--n-400)', marginLeft: 6, fontFamily: 'monospace' }}>{screen.path}</span>
                          </td>
                          {FIELDS.map(field => (
                            <td key={field} style={{ textAlign: 'center', padding: '8px 12px' }}>
                              <button
                                disabled={busy === `${screen.key}-${field}`}
                                onClick={() => toggle(screen.key, field)}
                                style={{
                                  width: 24, height: 24, borderRadius: 6,
                                  border: '1.5px solid',
                                  borderColor: perm?.[field] ? 'var(--brand-600)' : 'var(--n-300)',
                                  background: perm?.[field] ? 'var(--brand-600)' : 'var(--n-0)',
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  opacity: busy === `${screen.key}-${field}` ? 0.5 : 1,
                                }}
                              >
                                {perm?.[field] && <Check size={13} color="#fff" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

// ── Modal crear / editar usuario ─────────────────────────────

type UserForm = {
  email: string; password: string; full_name: string; role: string
  check_in_time: string; check_out_time: string; shift: string; is_superadmin: boolean
}

const EMPTY_FORM: UserForm = {
  email: '', password: '', full_name: '', role: '',
  check_in_time: '', check_out_time: '', shift: 'Día', is_superadmin: false,
}

function UserFormModal({
  title, initial, onSave, onClose, isEdit = false,
}: {
  title: string
  initial?: Partial<UserForm>
  onSave: (form: UserForm) => Promise<void>
  onClose: () => void
  isEdit?: boolean
}) {
  const isMobile = useIsMobile()
  const [form, setForm] = useState<UserForm>({ ...EMPTY_FORM, ...initial })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const set = (k: keyof UserForm, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.email.trim()) return setErr('El correo es obligatorio')
    if (!isEdit && !form.password.trim()) return setErr('La contraseña es obligatoria')
    if (!form.full_name.trim()) return setErr('El nombre es obligatorio')
    setBusy(true)
    setErr(null)
    try {
      await onSave(form)
      onClose()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={title} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--red-50)', borderRadius: 6, color: 'var(--red-700)', fontSize: 12.5 }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <FIELD label="Nombre completo *">
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} style={INPUT} placeholder="Ej. Juan Pérez" />
          </FIELD>
          <FIELD label="Correo electrónico *">
            <input value={form.email} onChange={e => set('email', e.target.value)} style={INPUT} placeholder="usuario@empresa.com" type="email" disabled={isEdit} />
          </FIELD>
          {!isEdit && (
            <FIELD label="Contraseña *">
              <input value={form.password} onChange={e => set('password', e.target.value)} style={INPUT} placeholder="Mínimo 6 caracteres" type="password" />
            </FIELD>
          )}
          <FIELD label="Cargo / Rol">
            <input value={form.role} onChange={e => set('role', e.target.value)} style={INPUT} placeholder="Ej. Ingeniero de Proyectos" />
          </FIELD>
          <FIELD label="Hora de ingreso">
            <input value={form.check_in_time} onChange={e => set('check_in_time', e.target.value)} style={INPUT} type="time" />
          </FIELD>
          <FIELD label="Hora de salida">
            <input value={form.check_out_time} onChange={e => set('check_out_time', e.target.value)} style={INPUT} type="time" />
          </FIELD>
          <FIELD label="Turno">
            <select value={form.shift} onChange={e => set('shift', e.target.value)} style={{ ...INPUT }}>
              <option value="Día">Día</option>
              <option value="Noche">Noche</option>
            </select>
          </FIELD>
          <FIELD label="Rol del sistema">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.is_superadmin} onChange={e => set('is_superadmin', e.target.checked)} style={{ width: 16, height: 16 }} />
              <span>Superadmin</span>
            </label>
          </FIELD>
        </div>
      </div>
    </Modal>
  )
}

// ── Tarjeta móvil ─────────────────────────────────────────────

function UserCard({
  p, myId,
  onEdit, onPerms, onReset, onToggle,
  resetBusy, toggleBusy,
}: {
  p: UserProfile
  myId: string | undefined
  onEdit: () => void
  onPerms: () => void
  onReset: () => void
  onToggle: () => void
  resetBusy: boolean
  toggleBusy: boolean
}) {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--n-100)',
      opacity: p.is_active ? 1 : 0.6,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar name={p.full_name} email={p.email} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-900)' }}>
            {p.full_name || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--n-500)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {p.email}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {p.is_superadmin && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--brand-100)' }}>
                SUPERADMIN
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: p.is_active ? 'var(--green-50)' : 'var(--n-100)', color: p.is_active ? 'var(--green-700)' : 'var(--n-500)' }}>
              {p.is_active ? 'Activo' : 'Inactivo'}
            </span>
            {p.role && (
              <span style={{ fontSize: 11, color: 'var(--n-600)' }}>{p.role}</span>
            )}
          </div>
        </div>
      </div>

      {/* Details row */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingLeft: 54, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--n-600)' }}>
          <span style={{ color: 'var(--n-400)', marginRight: 4 }}>Turno:</span>
          <span style={{
            padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            background: p.shift === 'Día' ? 'var(--amber-50)' : 'var(--brand-50)',
            color: p.shift === 'Día' ? 'var(--amber-700)' : 'var(--brand-700)',
          }}>
            {p.shift || '—'}
          </span>
        </div>
        {(p.check_in_time || p.check_out_time) && (
          <div style={{ fontSize: 12, color: 'var(--n-600)', fontFamily: 'monospace' }}>
            {p.check_in_time?.slice(0, 5) ?? '—'} → {p.check_out_time?.slice(0, 5) ?? '—'}
          </div>
        )}
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingLeft: 54 }}>
        <button
          onClick={onPerms}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer' }}
        >
          <Shield size={13} /> Permisos
        </button>
        <button
          onClick={onReset}
          disabled={resetBusy}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer', opacity: resetBusy ? 0.5 : 1 }}
        >
          <Mail size={13} /> Reset
        </button>
        <button
          onClick={onEdit}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer' }}
        >
          <Pencil size={13} /> Editar
        </button>
        {p.id !== myId && (
          <button
            onClick={onToggle}
            disabled={toggleBusy}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid', borderColor: p.is_active ? 'var(--red-200)' : 'var(--green-200)', background: p.is_active ? 'var(--red-50)' : 'var(--green-50)', color: p.is_active ? 'var(--red-700)' : 'var(--green-700)', cursor: 'pointer', opacity: toggleBusy ? 0.5 : 1 }}
          >
            {p.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
            {p.is_active ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

export default function UsersPage() {
  const { profile: myProfile, isSuperAdmin } = useAuth()
  const { profiles, loading, createUser, updateProfile, sendPasswordReset, toggleActive } = useUserProfiles()
  const isMobile = useIsMobile()

  const [query,       setQuery]       = useState('')
  const [page,        setPage]        = useState(0)
  const [pageSize,    setPageSize]    = useState(15)
  const [showCreate,  setShowCreate]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<UserProfile | null>(null)
  const [permsTarget, setPermsTarget] = useState<UserProfile | null>(null)
  const [resetBusy,   setResetBusy]   = useState<string | null>(null)
  const [toggleBusy,  setToggleBusy]  = useState<string | null>(null)

  useEffect(() => { setPage(0) }, [query, pageSize])

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--n-500)' }}>
        <Shield size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Acceso restringido</div>
        <div style={{ fontSize: 12.5, marginTop: 4 }}>Solo el superadmin puede gestionar usuarios.</div>
      </div>
    )
  }

  const handleCreate = async (form: UserForm) => {
    await createUser({
      ...form,
      check_in_time:  form.check_in_time  || null,
      check_out_time: form.check_out_time || null,
    })
  }

  const handleUpdate = async (form: UserForm) => {
    if (!editTarget) return
    await updateProfile(editTarget.id, {
      full_name:      form.full_name,
      role:           form.role,
      check_in_time:  form.check_in_time  || null,
      check_out_time: form.check_out_time || null,
      shift:          form.shift as any,
      is_superadmin:  form.is_superadmin,
    })
  }

  const handleSendReset = async (p: UserProfile) => {
    if (!confirm(`Se enviará un email de restablecimiento a ${p.email}. ¿Continuar?`)) return
    setResetBusy(p.id)
    try {
      await sendPasswordReset(p.id)
      alert(`Email enviado a ${p.email}`)
    } catch (e: any) { alert(e.message) }
    finally { setResetBusy(null) }
  }

  const handleToggleActive = async (p: UserProfile) => {
    if (p.id === myProfile?.id) return alert('No puedes desactivar tu propia cuenta.')
    const action = p.is_active ? 'desactivar' : 'activar'
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a ${p.full_name || p.email}?`)) return
    setToggleBusy(p.id)
    try { await toggleActive(p.id, !p.is_active) }
    catch (e: any) { alert(e.message) }
    finally { setToggleBusy(null) }
  }

  const q = query.toLowerCase()
  const filtered = profiles.filter(p =>
    !q ||
    p.full_name?.toLowerCase().includes(q) ||
    p.email?.toLowerCase().includes(q) ||
    p.role?.toLowerCase().includes(q)
  )
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated  = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const pad = isMobile ? '16px 16px 24px' : '20px 28px 28px'

  return (
    <div style={{ padding: pad }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: 'var(--n-900)' }}>Usuarios</h1>
        <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginTop: 2 }}>
          Gestión de cuentas y permisos de acceso
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, email o cargo…"
            style={{ ...INPUT, paddingLeft: 30, width: '100%' }}
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--n-500)', flexShrink: 0 }}>
          {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button icon={Plus} variant="primary" onClick={() => setShowCreate(true)}>Nuevo usuario</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando...</div>
        ) : profiles.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
            Sin usuarios. Crea el primero.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
            Sin resultados para "{query}"
          </div>
        ) : isMobile ? (
          /* ── Tarjetas móvil ── */
          paginated.map(p => (
            <UserCard
              key={p.id}
              p={p}
              myId={myProfile?.id}
              onEdit={() => setEditTarget(p)}
              onPerms={() => setPermsTarget(p)}
              onReset={() => handleSendReset(p)}
              onToggle={() => handleToggleActive(p)}
              resetBusy={resetBusy === p.id}
              toggleBusy={toggleBusy === p.id}
            />
          ))
        ) : (
          /* ── Tabla escritorio ── */
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.8fr 1.4fr 1fr 90px 90px 80px 130px',
              gap: 12, padding: '8px 16px',
              borderBottom: '1px solid var(--n-150)',
              background: 'var(--n-25)',
            }}>
              {['Nombre', 'Correo', 'Cargo', 'Ingreso', 'Salida', 'Turno', 'Acciones'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>

            {paginated.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.8fr 1.4fr 1fr 90px 90px 80px 130px',
                  gap: 12, alignItems: 'center',
                  padding: '10px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--n-100)',
                  opacity: p.is_active ? 1 : 0.5,
                  transition: 'background .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Nombre */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Avatar name={p.full_name} email={p.email} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 550, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.full_name || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      {p.is_superadmin && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--brand-100)' }}>
                          SUPERADMIN
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: p.is_active ? 'var(--green-600)' : 'var(--n-400)' }}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--n-600)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.email}
                </div>
                <div style={{ fontSize: 12, color: 'var(--n-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.role || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--n-700)', fontFamily: 'monospace' }}>
                  {p.check_in_time ? p.check_in_time.slice(0, 5) : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--n-700)', fontFamily: 'monospace' }}>
                  {p.check_out_time ? p.check_out_time.slice(0, 5) : '—'}
                </div>
                <div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: p.shift === 'Día' ? 'var(--amber-50)' : 'var(--brand-50)',
                    color: p.shift === 'Día' ? 'var(--amber-700)' : 'var(--brand-700)',
                  }}>
                    {p.shift}
                  </span>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <IconButton icon={Shield} onClick={() => setPermsTarget(p)} size={26} title="Permisos" />
                  <IconButton
                    icon={Mail}
                    onClick={() => handleSendReset(p)}
                    size={26}
                    title="Enviar reset de contraseña"
                    disabled={resetBusy === p.id}
                  />
                  <IconButton icon={Pencil} onClick={() => setEditTarget(p)} size={26} title="Editar" />
                  {p.id !== myProfile?.id && (
                    <IconButton
                      icon={p.is_active ? UserX : UserCheck}
                      onClick={() => handleToggleActive(p)}
                      size={26}
                      title={p.is_active ? 'Desactivar' : 'Activar'}
                      danger={p.is_active}
                      disabled={toggleBusy === p.id}
                    />
                  )}
                </div>
              </div>
            ))}
          </>
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

      {showCreate && (
        <UserFormModal
          title="Nuevo usuario"
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editTarget && (
        <UserFormModal
          title={`Editar — ${editTarget.full_name || editTarget.email}`}
          initial={{
            email:          editTarget.email,
            full_name:      editTarget.full_name,
            role:           editTarget.role,
            check_in_time:  editTarget.check_in_time?.slice(0, 5) ?? '',
            check_out_time: editTarget.check_out_time?.slice(0, 5) ?? '',
            shift:          editTarget.shift,
            is_superadmin:  editTarget.is_superadmin,
          }}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
          isEdit
        />
      )}
      {permsTarget && (
        <PermissionsModal user={permsTarget} onClose={() => setPermsTarget(null)} />
      )}
    </div>
  )
}
