import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRef } from 'react'
import { Plus, Search, Package, AlertTriangle, Edit2, Trash2, X, ChevronRight, Download, FileText, Upload } from 'lucide-react'
import { useAlmacenEquipos } from '../../hooks/useAlmacenEquipos'
import { useAlmacenUbicaciones } from '../../hooks/useAlmacenUbicaciones'
import { supabase } from '../../lib/supabase'
import type { AlmacenEquipo, AlmacenEquipoEstado } from '../../lib/types'
import { ALMACEN_EQUIPO_ESTADOS } from '../../lib/types'
import { Pagination } from '../../components/ui/Pagination'
import { exportMateriales } from '../../lib/exportAlmacenExcel'

const CATEGORIAS = ['Herramienta', 'Equipo Eléctrico', 'EPP', 'Material', 'Consumible', 'Vehículo', 'Otro']

const estadoColor: Record<AlmacenEquipoEstado, { bg: string; color: string }> = {
  'Activo': { bg: 'var(--green-50)', color: 'var(--green-600)' },
  'Inactivo': { bg: 'var(--n-100)', color: 'var(--n-500)' },
  'En Reparación': { bg: 'var(--amber-50)', color: 'var(--amber-600)' },
  'Dado de Baja': { bg: 'var(--red-50)', color: 'var(--red-600)' },
}

export default function EquiposAlmacenPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<AlmacenEquipoEstado | 'Todos'>('Todos')
  const [filterBajoStock, setFilterBajoStock] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const { equipos, total, loading, createEquipo, updateEquipo, deleteEquipo } = useAlmacenEquipos(
    search,
    { estado: filterEstado, bajoStock: filterBajoStock, page: filterBajoStock ? undefined : page, pageSize },
  )
  const { ubicaciones } = useAlmacenUbicaciones()

  type FormState = Omit<AlmacenEquipo, 'id' | 'sort_order' | 'created_at' | 'updated_at'>

  const emptyForm = (): FormState => ({
    codigo: '', nombre: '', descripcion: null, categoria: null,
    marca: null, modelo: null, serie: null,
    estado: 'Activo', ubicacion: null,
    stock_actual: 0, stock_minimo: 0, unidad: 'UND', precio_unitario: 0,
    ficha_tecnica_url: null,
    created_by: user?.id ?? null,
  })

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AlmacenEquipo | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AlmacenEquipo | null>(null)
  const [fichaFile, setFichaFile] = useState<File | null>(null)
  const fichaRef = useRef<HTMLInputElement>(null)

  const filtered = equipos // filters now applied server-side

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, filterEstado, filterBajoStock])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm())
    setFichaFile(null)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (e: AlmacenEquipo) => {
    setEditing(e)
    setForm({
      codigo: e.codigo ?? '', nombre: e.nombre, descripcion: e.descripcion,
      categoria: e.categoria, marca: e.marca, modelo: e.modelo, serie: e.serie,
      estado: e.estado, ubicacion: e.ubicacion,
      stock_actual: e.stock_actual, stock_minimo: e.stock_minimo,
      unidad: e.unidad, precio_unitario: e.precio_unitario,
      ficha_tecnica_url: e.ficha_tecnica_url,
      created_by: e.created_by,
    })
    setFichaFile(null)
    setError(null)
    setShowModal(true)
  }

  const uploadFicha = async (equipoId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${equipoId}/ficha_tecnica.${ext}`
    const { error: upErr } = await supabase.storage
      .from('almacen-fichas')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) throw new Error(upErr.message)
    const { data } = supabase.storage.from('almacen-fichas').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, codigo: form.codigo || null }

      if (editing) {
        let url = form.ficha_tecnica_url
        if (fichaFile) url = await uploadFicha(editing.id, fichaFile)
        await updateEquipo(editing.id, { ...payload, ficha_tecnica_url: url })
      } else {
        const equipo = await createEquipo({ ...payload, ficha_tecnica_url: null })
        if (fichaFile) {
          const url = await uploadFicha(equipo.id, fichaFile)
          await updateEquipo(equipo.id, { ficha_tecnica_url: url })
        }
      }
      setShowModal(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteEquipo(confirmDelete.id)
    } catch { }
    setConfirmDelete(null)
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box',
    background: 'var(--n-0)', color: 'var(--n-900)', ...style,
  })

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Equipos & Consumibles</h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '3px 0 0' }}>
            {filtered.length} ítem{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => exportMateriales(equipos)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--n-0)', color: 'var(--n-700)',
              border: '1px solid var(--n-200)', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={14} /> Exportar Excel
          </button>
          <button
            onClick={openNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--brand-600)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Nuevo material
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…"
            style={{ ...inp(), width: 220, paddingLeft: 30 }}
          />
        </div>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value as AlmacenEquipoEstado | 'Todos')}
          style={{ ...inp(), width: 160 }}
        >
          <option value="Todos">Todos los estados</option>
          {ALMACEN_EQUIPO_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setFilterBajoStock(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 500,
            border: '1px solid',
            borderColor: filterBajoStock ? 'var(--red-600)' : 'var(--n-200)',
            background: filterBajoStock ? 'var(--red-50)' : 'var(--n-0)',
            color: filterBajoStock ? 'var(--red-600)' : 'var(--n-600)',
            cursor: 'pointer',
          }}
        >
          <AlertTriangle size={13} /> Bajo stock
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-400)' }}>
          <Package size={40} style={{ opacity: .3, marginBottom: 8 }} />
          <p style={{ fontSize: 13 }}>No hay equipos registrados</p>
          <button onClick={openNew} style={{ fontSize: 13, color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Crear el primero
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                {['Código', 'Nombre', 'Categoría', 'Estado', 'Stock', 'Mín.', 'Unidad', 'Ubicación', 'Ficha', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const bajStock = e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo
                const ec = estadoColor[e.estado] ?? { bg: 'var(--n-100)', color: 'var(--n-500)' }
                return (
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid var(--n-100)', cursor: 'pointer' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--n-25)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'var(--n-0)')}
                    onClick={() => navigate(`/almacen/kardex?equipo=${e.id}`)}
                  >
                    <td style={{ padding: '10px 14px', color: 'var(--n-500)', fontFamily: 'monospace', fontSize: 12 }}>{e.codigo ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--n-900)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {e.nombre}
                        {bajStock && <AlertTriangle size={13} color="var(--red-600)" />}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--n-600)' }}>{e.categoria ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, ...ec }}>
                        {e.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: bajStock ? 'var(--red-600)' : 'var(--n-900)' }}>
                      {e.stock_actual}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--n-500)' }}>{e.stock_minimo}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--n-600)' }}>{e.unidad}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--n-500)' }}>{e.ubicacion ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }} onClick={ev => ev.stopPropagation()}>
                      {e.ficha_tecnica_url
                        ? <a href={e.ficha_tecnica_url} target="_blank" rel="noreferrer" title="Descargar ficha técnica" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, background: 'var(--blue-50)', color: 'var(--blue-600)', fontSize: 11.5, fontWeight: 600, textDecoration: 'none' }}>
                            <FileText size={12} /> PDF
                          </a>
                        : <span style={{ color: 'var(--n-300)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }} onClick={ev => ev.stopPropagation()}>
                        <button onClick={() => openEdit(e)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)', borderRadius: 5 }} title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(e)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-600)', borderRadius: 5 }} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => navigate(`/almacen/kardex?equipo=${e.id}`)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brand-600)', borderRadius: 5 }} title="Ver kardex">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filterBajoStock && <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={setPageSize} loading={loading} />}
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? 'Editar equipo' : 'Nuevo material'}</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Código</label>
                <input value={form.codigo ?? ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="SKU-001" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="Nombre del equipo" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Descripción</label>
                <textarea value={form.descripcion ?? ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value || null }))} style={{ ...inp({ marginTop: 4 }), height: 60, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Categoría</label>
                <select value={form.categoria ?? ''} onChange={e => setForm(f => ({ ...f, categoria: e.target.value || null }))} style={inp({ marginTop: 4 })}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as AlmacenEquipoEstado }))} style={inp({ marginTop: 4 })}>
                  {ALMACEN_EQUIPO_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Marca</label>
                <input value={form.marca ?? ''} onChange={e => setForm(f => ({ ...f, marca: e.target.value || null }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Modelo</label>
                <input value={form.modelo ?? ''} onChange={e => setForm(f => ({ ...f, modelo: e.target.value || null }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>N° Serie</label>
                <input value={form.serie ?? ''} onChange={e => setForm(f => ({ ...f, serie: e.target.value || null }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación</label>
                <select value={form.ubicacion ?? ''} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value || null }))} style={inp({ marginTop: 4 })}>
                  <option value="">— Sin ubicación —</option>
                  {ubicaciones.filter(u => u.activa).map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''} · {u.tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Unidad</label>
                <input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="UND / m / kg" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Stock inicial</label>
                <input type="number" min={0} value={form.stock_actual} onChange={e => setForm(f => ({ ...f, stock_actual: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Stock mínimo</label>
                <input type="number" min={0} value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Precio unitario (S/)</label>
                <input type="number" min={0} step={0.01} value={form.precio_unitario} onChange={e => setForm(f => ({ ...f, precio_unitario: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ficha técnica (PDF)</label>
                <input
                  ref={fichaRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => setFichaFile(e.target.files?.[0] ?? null)}
                />
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fichaRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', color: 'var(--n-700)', fontSize: 12.5, cursor: 'pointer' }}
                  >
                    <Upload size={13} /> {fichaFile ? 'Cambiar archivo' : 'Subir PDF'}
                  </button>
                  {fichaFile
                    ? <span style={{ fontSize: 12, color: 'var(--green-600)', display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={13} />{fichaFile.name}</span>
                    : form.ficha_tecnica_url
                      ? <a href={form.ficha_tecnica_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue-600)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><FileText size={13} /> Ver ficha actual</a>
                      : <span style={{ fontSize: 12, color: 'var(--n-400)' }}>Sin ficha cargada</span>
                  }
                </div>
              </div>
            </div>

            {error && <p style={{ color: 'var(--red-600)', fontSize: 12.5, marginTop: 12 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Eliminar equipo?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>
              Se eliminará <strong>{confirmDelete.nombre}</strong> y todo su historial de kardex.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
