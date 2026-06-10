import { useState } from 'react'
import { useSuppliers } from '../../hooks/useSuppliers'
import type { Supplier } from '../../lib/types'
import {
  Plus, Search, Pencil, Trash2, X, Building2,
  Phone, Mail, MapPin, Hash, User, CheckCircle2, XCircle,
} from 'lucide-react'

const EMPTY: Omit<Supplier, 'id' | 'created_at' | 'updated_at'> = {
  name: '', ruc: '', contact: '', phone: '', email: '',
  address: '', notes: '', is_active: true, sort_order: 0,
}

export default function ProveedoresPage() {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.ruc || '').includes(search) ||
    (s.contact || '').toLowerCase().includes(search.toLowerCase()),
  )

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setErr('')
    setShowModal(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({
      name: s.name, ruc: s.ruc ?? '', contact: s.contact ?? '',
      phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '',
      notes: s.notes ?? '', is_active: s.is_active, sort_order: s.sort_order,
    })
    setErr('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setErr('El nombre es requerido'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateSupplier(editing.id, { ...form, name: form.name.trim() })
      } else {
        await createSupplier({ ...form, name: form.name.trim() })
      }
      setShowModal(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try { await deleteSupplier(id) } catch { /* handled */ }
    setConfirmDelete(null)
  }

  const f = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header row: title + search + button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Proveedores</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, margin: 0 }}>
            Catálogo de proveedores
          </p>
        </div>
        <div style={{ flex: 1, position: 'relative', maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUC o contacto…"
            style={{
              width: '100%', paddingLeft: 30, paddingRight: 10, height: 30,
              border: '1px solid var(--n-200)', borderRadius: 7,
              fontSize: 12, color: 'var(--n-800)', background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Inline stats */}
          {[
            { label: 'Total', value: suppliers.length, color: 'var(--n-700)' },
            { label: 'Activos', value: suppliers.filter(s => s.is_active).length, color: 'var(--green-700)' },
            { label: 'Inactivos', value: suppliers.filter(s => !s.is_active).length, color: 'var(--n-400)' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {i > 0 && <div style={{ width: 1, height: 16, background: 'var(--n-200)' }} />}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 10.5, color: 'var(--n-400)', marginTop: 1 }}>{stat.label}</div>
              </div>
            </div>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--n-200)' }} />
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 7,
              background: 'var(--brand-600)', color: '#fff',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none',
            }}
          >
            <Plus size={13} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          background: '#fff', border: '1px solid var(--n-150)', borderRadius: 12,
        }}>
          <Building2 size={32} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-600)' }}>
            {search ? 'Sin resultados' : 'No hay proveedores aún'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginTop: 4 }}>
            {search ? 'Prueba con otro término de búsqueda' : 'Crea el primer proveedor con el botón de arriba'}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
                {['Proveedor', 'RUC', 'Contacto', 'Teléfono', 'Email', 'Estado', ''].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--n-500)',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--n-100)' : 'none',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'var(--brand-50)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Building2 size={13} style={{ color: 'var(--brand-600)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>{s.name}</div>
                        {s.address && (
                          <div style={{ fontSize: 11, color: 'var(--n-400)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                            <MapPin size={10} />{s.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-600)' }}>
                    {s.ruc ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Hash size={11} style={{ color: 'var(--n-400)' }} />{s.ruc}
                      </span>
                    ) : <span style={{ color: 'var(--n-300)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-700)' }}>
                    {s.contact ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={11} style={{ color: 'var(--n-400)' }} />{s.contact}
                      </span>
                    ) : <span style={{ color: 'var(--n-300)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-700)' }}>
                    {s.phone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} style={{ color: 'var(--n-400)' }} />{s.phone}
                      </span>
                    ) : <span style={{ color: 'var(--n-300)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-700)' }}>
                    {s.email ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} style={{ color: 'var(--n-400)' }} />{s.email}
                      </span>
                    ) : <span style={{ color: 'var(--n-300)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {s.is_active ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--green-700)', background: 'var(--green-50)', padding: '2px 8px', borderRadius: 20 }}>
                        <CheckCircle2 size={11} /> Activo
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', background: 'var(--n-100)', padding: '2px 8px', borderRadius: 20 }}>
                        <XCircle size={11} /> Inactivo
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEdit(s)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--n-200)', background: '#fff', cursor: 'pointer', color: 'var(--n-600)' }}
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--red-100)', background: 'var(--red-50)', cursor: 'pointer', color: 'var(--red-600)' }}
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            background: '#fff', borderRadius: 12, padding: '20px 22px 18px',
            width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
                {editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Nombre del Proveedor *</Label>
                <Input value={form.name} onChange={v => f('name', v)} placeholder="Ej: Ferretería Central SAC" autoFocus />
              </div>
              <div>
                <Label>RUC / NIT</Label>
                <Input value={form.ruc ?? ''} onChange={v => f('ruc', v)} placeholder="20123456789" />
              </div>
              <div>
                <Label>Persona de Contacto</Label>
                <Input value={form.contact ?? ''} onChange={v => f('contact', v)} placeholder="Ej: Juan Pérez" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone ?? ''} onChange={v => f('phone', v)} placeholder="999 999 999" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email ?? ''} onChange={v => f('email', v)} placeholder="ventas@proveedor.com" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Dirección</Label>
                <Input value={form.address ?? ''} onChange={v => f('address', v)} placeholder="Av. Industrial 123, Lima" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Notas</Label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={e => f('notes', e.target.value)}
                  placeholder="Condiciones de pago, observaciones…"
                  rows={2}
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--n-200)', fontSize: 12.5, resize: 'vertical',
                    color: 'var(--n-800)', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => f('is_active', e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: 'var(--brand-600)' }}
                  />
                  <span style={{ fontSize: 12.5, color: 'var(--n-700)' }}>Proveedor activo</span>
                </label>
              </div>
            </div>

            {err && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', padding: '8px 12px', borderRadius: 8 }}>
                {err}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12.5, cursor: 'pointer', color: 'var(--n-700)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '6px 16px', borderRadius: 7, border: 'none',
                  background: saving ? 'var(--brand-300)' : 'var(--brand-600)',
                  color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28,
            width: 360, boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', marginBottom: 6 }}>
              ¿Eliminar proveedor?
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginBottom: 18 }}>
              Esta acción no se puede deshacer. El proveedor será eliminado del catálogo.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12.5, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--red-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-600)', marginBottom: 5, letterSpacing: '0.02em' }}>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, autoFocus }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: '100%', height: 32, padding: '0 10px', borderRadius: 6,
        border: '1px solid var(--n-200)', fontSize: 12.5,
        color: 'var(--n-800)', boxSizing: 'border-box',
      }}
    />
  )
}
