import { useState } from 'react'
import { MapPin, Plus, X, Pencil, Power, Trash2 } from 'lucide-react'
import { useAlmacenUbicaciones, useStockPorUbicacion } from '../../hooks/useAlmacenUbicaciones'
import type { AlmacenUbicacion, AlmacenUbicacionTipo } from '../../lib/types'
import { ALMACEN_UBICACION_TIPOS } from '../../lib/types'

const tipoColor: Record<AlmacenUbicacionTipo, { bg: string; color: string }> = {
  'Almacén': { bg: 'var(--brand-50)', color: 'var(--brand-700)' },
  'Estante':  { bg: '#eff6ff', color: '#2563eb' },
  'Bin':      { bg: '#f0fdf4', color: '#16a34a' },
  'Obra':     { bg: '#fffbeb', color: '#d97706' },
  'Taller':   { bg: '#fdf4ff', color: '#9333ea' },
  'Externo':  { bg: 'var(--n-100)', color: 'var(--n-600)' },
}

const EMPTY_FORM = {
  codigo: '' as string,
  nombre: '',
  descripcion: '' as string,
  tipo: 'Almacén' as AlmacenUbicacionTipo,
  activa: true,
}

export default function UbicacionesPage() {
  const { ubicaciones, loading, createUbicacion, updateUbicacion, deleteUbicacion, toggleActiva } = useAlmacenUbicaciones()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AlmacenUbicacion | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AlmacenUbicacion | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (u: AlmacenUbicacion) => {
    setEditing(u)
    setForm({ codigo: u.codigo ?? '', nombre: u.nombre, descripcion: u.descripcion ?? '', tipo: u.tipo, activa: u.activa })
    setError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, codigo: form.codigo || null, descripcion: form.descripcion || null }
      if (editing) await updateUbicacion(editing.id, payload)
      else await createUbicacion(payload)
      setShowModal(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try { await deleteUbicacion(confirmDelete.id) } catch {}
    setConfirmDelete(null)
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', ...style,
  })

  const activas  = ubicaciones.filter(u => u.activa)
  const inactivas = ubicaciones.filter(u => !u.activa)

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Ubicaciones</h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '3px 0 0' }}>
            Catálogo de ubicaciones físicas del almacén (WMS)
          </p>
        </div>
        <button
          onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-600)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={15} /> Nueva ubicación
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : ubicaciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-400)' }}>
          <MapPin size={40} style={{ opacity: .3, marginBottom: 8 }} />
          <p style={{ fontSize: 13 }}>Sin ubicaciones registradas</p>
        </div>
      ) : (
        <>
          <UbicacionGroup
            title="Activas"
            items={activas}
            expandedId={expandedId}
            onToggleExpand={id => setExpandedId(prev => prev === id ? null : id)}
            onEdit={openEdit}
            onToggleActiva={u => toggleActiva(u.id, !u.activa)}
            onDelete={setConfirmDelete}
            tipoColor={tipoColor}
          />
          {inactivas.length > 0 && (
            <UbicacionGroup
              title="Inactivas"
              items={inactivas}
              expandedId={expandedId}
              onToggleExpand={id => setExpandedId(prev => prev === id ? null : id)}
              onEdit={openEdit}
              onToggleActiva={u => toggleActiva(u.id, !u.activa)}
              onDelete={setConfirmDelete}
              tipoColor={tipoColor}
              dimmed
            />
          )}
        </>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{editing ? 'Editar ubicación' : 'Nueva ubicación'}</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Código</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="ALM-01" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="Almacén Central" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Tipo</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {ALMACEN_UBICACION_TIPOS.map(t => {
                    const tc = tipoColor[t]
                    const active = form.tipo === t
                    return (
                      <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                        style={{ padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: active ? tc.color : 'var(--n-200)', background: active ? tc.bg : '#fff', color: active ? tc.color : 'var(--n-500)' }}
                      >{t}</button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={{ ...inp({ marginTop: 4 }), height: 60, resize: 'vertical' }} />
              </div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Eliminar ubicación?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>
              Se eliminará <strong>{confirmDelete.nombre}</strong>. El stock asignado a esta ubicación se perderá.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────
interface GroupProps {
  title: string
  items: AlmacenUbicacion[]
  expandedId: string | null
  onToggleExpand: (id: string) => void
  onEdit: (u: AlmacenUbicacion) => void
  onToggleActiva: (u: AlmacenUbicacion) => void
  onDelete: (u: AlmacenUbicacion) => void
  tipoColor: Record<AlmacenUbicacionTipo, { bg: string; color: string }>
  dimmed?: boolean
}

function UbicacionGroup({ title, items, expandedId, onToggleExpand, onEdit, onToggleActiva, onDelete, tipoColor, dimmed }: GroupProps) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 10px' }}>{title} ({items.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(u => (
          <UbicacionRow
            key={u.id}
            u={u}
            expanded={expandedId === u.id}
            onToggleExpand={() => onToggleExpand(u.id)}
            onEdit={() => onEdit(u)}
            onToggleActiva={() => onToggleActiva(u)}
            onDelete={() => onDelete(u)}
            tipoColor={tipoColor}
            dimmed={dimmed}
          />
        ))}
      </div>
    </div>
  )
}

interface RowProps {
  u: AlmacenUbicacion
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onToggleActiva: () => void
  onDelete: () => void
  tipoColor: Record<AlmacenUbicacionTipo, { bg: string; color: string }>
  dimmed?: boolean
}

function UbicacionRow({ u, expanded, onToggleExpand, onEdit, onToggleActiva, onDelete, tipoColor, dimmed }: RowProps) {
  const { stock } = useStockPorUbicacion(expanded ? u.id : undefined)
  const tc = tipoColor[u.tipo]

  return (
    <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden', opacity: dimmed ? .6 : 1 }}>
      <div
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={onToggleExpand}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <MapPin size={16} color={tc.color} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-900)' }}>{u.nombre}</span>
            {u.codigo && <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--n-400)', background: 'var(--n-100)', padding: '1px 6px', borderRadius: 4 }}>{u.codigo}</span>}
            <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, ...tc }}>{u.tipo}</span>
          </div>
          {u.descripcion && <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 2 }}>{u.descripcion}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <button title={u.activa ? 'Desactivar' : 'Activar'} onClick={onToggleActiva}
            style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: u.activa ? '#16a34a' : 'var(--n-400)', borderRadius: 5 }}>
            <Power size={14} />
          </button>
          <button title="Editar" onClick={onEdit}
            style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)', borderRadius: 5 }}>
            <Pencil size={14} />
          </button>
          <button title="Eliminar" onClick={onDelete}
            style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', borderRadius: 5 }}>
            <Trash2 size={14} />
          </button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--n-400)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Panel de stock expandible */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--n-100)', padding: '12px 16px', background: 'var(--n-25)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', marginBottom: 8 }}>
            Stock en esta ubicación ({stock.length} materiales)
          </div>
          {stock.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--n-400)', margin: 0 }}>Sin stock registrado en esta ubicación</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {stock.map(s => {
                const eq = s.equipo as { id: string; nombre: string; codigo: string | null; unidad: string; categoria: string | null } | null
                return (
                  <div key={s.id} style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 7, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>{eq?.nombre ?? '—'}</div>
                    {eq?.codigo && <div style={{ fontSize: 11, color: 'var(--n-400)', fontFamily: 'monospace' }}>{eq.codigo}</div>}
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-700)', marginTop: 4 }}>
                      {s.stock_actual} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--n-500)' }}>{eq?.unidad}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
