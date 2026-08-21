import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X, CheckCircle, ChevronDown, Search } from 'lucide-react'
import { useAlmacenRecepcionDetail } from '../../hooks/useAlmacenMovimientos'
import { useAlmacenPedidoDetail } from '../../hooks/useAlmacenPedidos'
import { useAlmacenEquipos } from '../../hooks/useAlmacenEquipos'
import { useAlmacenUbicaciones } from '../../hooks/useAlmacenUbicaciones'
import type { AlmacenRecepcionEstado, AlmacenRecepcionItem, AlmacenEquipo } from '../../lib/types'
import { ALMACEN_RECEPCION_ESTADOS } from '../../lib/types'

const estadoColor: Record<AlmacenRecepcionEstado, { bg: string; color: string }> = {
  'Pendiente':   { bg: 'var(--n-100)', color: 'var(--n-600)' },
  'Parcial':    { bg: 'var(--amber-50)', color: 'var(--amber-600)' },
  'Completada': { bg: 'var(--green-50)', color: 'var(--green-600)' },
}

const EMPTY_ITEM = {
  equipo_id: null as string | null,
  pedido_item_id: null as string | null,
  descripcion: '',
  cantidad: 1,
  unidad: 'UND',
  precio_unitario: 0,
  observacion: null as string | null,
  ubicacion_destino_id: null as string | null,
}

export default function RecepcionEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    recepcion, items, loading, error,
    updateRecepcion, addItem, updateItem, removeItem, completarRecepcion,
  } = useAlmacenRecepcionDetail(id!)
  const { equipos } = useAlmacenEquipos()
  const { ubicaciones } = useAlmacenUbicaciones()

  // Cargar ítems del pedido asociado para filtrar el combo
  const pedidoId = recepcion?.pedido_id ?? ''
  const { items: pedidoItems } = useAlmacenPedidoDetail(pedidoId)

  // Equipos disponibles: si hay pedido, solo los del pedido; si no, todos
  const equiposDisponibles: AlmacenEquipo[] = pedidoId
    ? equipos.filter(e => pedidoItems.some(pi => pi.equipo_id === e.id))
    : equipos

  // ── Modal item state ──
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<AlmacenRecepcionItem | null>(null)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [savingItem, setSavingItem] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importUbicacionId, setImportUbicacionId] = useState<string | null>(null)

  // ── Combo buscador ──
  const [comboSearch, setComboSearch] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const equiposFiltrados = equiposDisponibles.filter(e => {
    const q = comboSearch.toLowerCase()
    return (
      e.nombre.toLowerCase().includes(q) ||
      (e.codigo ?? '').toLowerCase().includes(q) ||
      (e.categoria ?? '').toLowerCase().includes(q)
    )
  })

  const openNewItem = () => {
    setEditingItem(null)
    setItemForm(EMPTY_ITEM)
    setComboSearch('')
    setComboOpen(false)
    setItemError(null)
    setShowItemModal(true)
  }

  const openEditItem = (it: AlmacenRecepcionItem) => {
    setEditingItem(it)
    setItemForm({
      equipo_id: it.equipo_id,
      pedido_item_id: it.pedido_item_id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidad: it.unidad,
      precio_unitario: it.precio_unitario,
      observacion: it.observacion,
      ubicacion_destino_id: it.ubicacion_destino_id,
    })
    const eq = equipos.find(e => e.id === it.equipo_id)
    setComboSearch(eq?.nombre ?? '')
    setComboOpen(false)
    setItemError(null)
    setShowItemModal(true)
  }

  const handleEquipoSelect = (equipo: AlmacenEquipo) => {
    // Si viene de pedido, buscar pedido_item_id correspondiente
    const pedidoItem = pedidoItems.find(pi => pi.equipo_id === equipo.id)
    setItemForm(f => ({
      ...f,
      equipo_id: equipo.id,
      pedido_item_id: pedidoItem?.id ?? null,
      descripcion: equipo.nombre,
      unidad: equipo.unidad,
      precio_unitario: equipo.precio_unitario,
      cantidad: pedidoItem?.cantidad ?? f.cantidad,
    }))
    setComboSearch(equipo.nombre)
    setComboOpen(false)
  }

  const handleSaveItem = async () => {
    if (!itemForm.descripcion.trim()) { setItemError('La descripción es requerida'); return }
    if (itemForm.cantidad <= 0) { setItemError('La cantidad debe ser mayor a 0'); return }
    setSavingItem(true)
    setItemError(null)
    try {
      if (editingItem) await updateItem(editingItem.id, itemForm)
      else await addItem(itemForm)
      setShowItemModal(false)
    } catch (e: unknown) {
      setItemError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingItem(false)
    }
  }

  const handleImportarDesdePedido = async () => {
    setImporting(true)
    setShowImportModal(false)
    try {
      const yaAgregados = new Set(items.map(i => i.pedido_item_id).filter(Boolean))
      const pendientes = pedidoItems.filter(pi => !yaAgregados.has(pi.id))
      for (const pi of pendientes) {
        await addItem({
          equipo_id: pi.equipo_id,
          pedido_item_id: pi.id,
          descripcion: pi.descripcion,
          cantidad: pi.cantidad_aprobada ?? pi.cantidad,
          unidad: pi.unidad,
          precio_unitario: pi.precio_unitario,
          observacion: null,
          ubicacion_destino_id: importUbicacionId,
        })
      }
    } catch {}
    setImporting(false)
    setImportUbicacionId(null)
  }

  const handleCompletar = async () => {
    setCompleting(true)
    try {
      await completarRecepcion()
      setConfirmComplete(false)
    } catch {}
    setCompleting(false)
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', background: 'var(--n-0)', color: 'var(--n-900)', ...style,
  })

  if (loading) return <div style={{ padding: 24, color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
  if (error || !recepcion) return <div style={{ padding: 24, color: 'var(--red-600)', fontSize: 13 }}>{error ?? 'No encontrado'}</div>

  const ec = estadoColor[recepcion.estado]
  const totalValor = items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0)

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/almacen/recepciones')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)', padding: 4 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            Recepción #{String(recepcion.numero).padStart(4, '0')}
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '2px 0 0' }}>
            {recepcion.proveedor ?? 'Sin proveedor'} · {new Date(recepcion.fecha_recepcion).toLocaleDateString('es-PE')}
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={recepcion.estado}
            onChange={e => updateRecepcion({ estado: e.target.value as AlmacenRecepcionEstado })}
            style={{
              padding: '6px 32px 6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
              border: `2px solid ${ec.color}`, background: ec.bg, color: ec.color,
              cursor: 'pointer', appearance: 'none',
            }}
          >
            {ALMACEN_RECEPCION_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: ec.color, pointerEvents: 'none' }} />
        </div>

        {recepcion.estado !== 'Completada' && items.length > 0 && (
          <button
            onClick={() => setConfirmComplete(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#16a34a', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <CheckCircle size={15} /> Completar recepción
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
        {[
          { label: 'Proveedor', value: recepcion.proveedor ?? '—' },
          { label: 'Nro. Factura', value: recepcion.nro_factura ?? '—' },
          { label: 'Guía de remisión', value: recepcion.guia_remision ?? '—' },
          { label: 'Fecha recepción', value: new Date(recepcion.fecha_recepcion).toLocaleDateString('es-PE') },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-800)' }}>{f.value}</div>
          </div>
        ))}
        {recepcion.observaciones && (
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginBottom: 2 }}>Observaciones</div>
            <div style={{ fontSize: 13, color: 'var(--n-700)' }}>{recepcion.observaciones}</div>
          </div>
        )}
      </div>

      {recepcion.estado === 'Completada' && (
        <div style={{ background: 'var(--green-50)', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--green-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={15} /> Recepción completada. El stock fue actualizado y el kardex registrado.
        </div>
      )}

      {/* Items */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--n-800)' }}>Ítems recibidos ({items.length})</h3>
        {recepcion.estado !== 'Completada' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {pedidoId && pedidoItems.length > 0 && pedidoItems.some(pi => !items.map(i => i.pedido_item_id).includes(pi.id)) && (
              <button
                onClick={() => setShowImportModal(true)}
                disabled={importing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--n-0)', color: 'var(--brand-700)',
                  border: '1px solid var(--brand-200)', borderRadius: 7, padding: '7px 12px',
                  fontSize: 12.5, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer',
                  opacity: importing ? 0.6 : 1,
                }}
              >
                <CheckCircle size={13} />
                {importing ? 'Importando…' : 'Importar ítems del pedido'}
              </button>
            )}
            <button onClick={openNewItem} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--brand-600)', color: '#fff',
              border: 'none', borderRadius: 7, padding: '7px 12px',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={13} /> Agregar ítem
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--n-400)', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10 }}>
          <p style={{ fontSize: 13 }}>Sin ítems. Agrega los materiales recibidos.</p>
        </div>
      ) : (() => {
        // Agrupar por categoría
        const grupos = items.reduce<Record<string, typeof items>>((acc, it) => {
          const cat = (it.equipo as (AlmacenRecepcionItem['equipo'] & { categoria?: string | null }) | null)?.categoria || 'Sin categoría'
          if (!acc[cat]) acc[cat] = []
          acc[cat].push(it)
          return acc
        }, {})

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(grupos).map(([categoria, grupoItems]) => {
              const totalGrupo = grupoItems.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0)
              return (
                <div key={categoria} style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Cabecera del grupo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {categoria}
                      <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--n-400)', textTransform: 'none', letterSpacing: 0 }}>({grupoItems.length} ítem{grupoItems.length !== 1 ? 's' : ''})</span>
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)' }}>S/ {totalGrupo.toFixed(2)}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--n-100)' }}>
                        {['Descripción', 'Cantidad', 'Unidad', 'P. Unitario', 'Total', 'Ub. Destino', 'Observación', ''].map(h => (
                          <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--n-400)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grupoItems.map(it => (
                        <tr key={it.id} style={{ borderBottom: '1px solid var(--n-100)' }}>
                          <td style={{ padding: '9px 12px', fontWeight: 500, color: 'var(--n-900)' }}>{it.descripcion}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-700)' }}>{it.cantidad}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-500)' }}>{it.unidad}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-700)' }}>S/ {it.precio_unitario.toFixed(2)}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 600 }}>S/ {(it.cantidad * it.precio_unitario).toFixed(2)}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-500)', fontSize: 12 }}>
                            {(it.ubicacion_destino as { nombre: string } | null)?.nombre ?? (it.ubicacion_destino_id ? '…' : '—')}
                          </td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-500)', fontSize: 12 }}>{it.observacion ?? '—'}</td>
                          <td style={{ padding: '9px 12px' }}>
                            {recepcion.estado !== 'Completada' && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => openEditItem(it)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}>✏️</button>
                                <button onClick={() => removeItem(it.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-600)' }}><Trash2 size={13} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
            {/* Total general */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-700)', marginRight: 16 }}>Total recibido</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-700)' }}>S/ {totalValor.toFixed(2)}</span>
            </div>
          </div>
        )
      })()}

      {/* Modal ítem */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 500, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{editingItem ? 'Editar ítem' : 'Agregar ítem'}</h2>
              <button onClick={() => setShowItemModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Combo buscador */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>
                  {pedidoId ? 'Material del pedido' : 'Equipo del catálogo (opcional)'}
                </label>
                {pedidoId && equiposDisponibles.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--n-400)', margin: '4px 0 0' }}>
                    El pedido asociado no tiene ítems con equipo vinculado.
                  </p>
                ) : (
                  <div ref={comboRef} style={{ position: 'relative', marginTop: 4 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
                      <input
                        value={comboSearch}
                        onChange={e => { setComboSearch(e.target.value); setComboOpen(true) }}
                        onFocus={() => setComboOpen(true)}
                        placeholder="Buscar por nombre, código…"
                        style={{ ...inp(), paddingLeft: 32, paddingRight: 30 }}
                      />
                      <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${comboOpen ? '180deg' : '0deg'})`, color: 'var(--n-400)', transition: 'transform .2s', pointerEvents: 'none' }} />
                    </div>
                    {comboOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300, background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto' }}>
                        {/* Opción vacía */}
                        <button
                          onMouseDown={() => { setItemForm(f => ({ ...f, equipo_id: null, pedido_item_id: null })); setComboSearch(''); setComboOpen(false) }}
                          style={{ display: 'block', width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 12.5, color: 'var(--n-400)', borderBottom: '1px solid var(--n-100)' }}
                        >
                          — Descripción libre —
                        </button>
                        {equiposFiltrados.length === 0 ? (
                          <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--n-400)' }}>Sin resultados</div>
                        ) : equiposFiltrados.map(e => {
                          const pedidoItem = pedidoItems.find(pi => pi.equipo_id === e.id)
                          const isSelected = e.id === itemForm.equipo_id
                          return (
                            <button
                              key={e.id}
                              onMouseDown={() => handleEquipoSelect(e)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', background: isSelected ? 'var(--brand-50)' : 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--n-75)' }}
                              onMouseEnter={ev => { if (!isSelected) ev.currentTarget.style.background = 'var(--n-50)' }}
                              onMouseLeave={ev => { if (!isSelected) ev.currentTarget.style.background = 'transparent' }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--brand-700)' : 'var(--n-900)' }}>{e.nombre}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--n-400)', marginTop: 1 }}>
                                  {e.codigo && <span style={{ fontFamily: 'monospace', marginRight: 8 }}>{e.codigo}</span>}
                                  {pedidoItem && <span style={{ color: 'var(--amber-600)' }}>Pedido: {pedidoItem.cantidad} {e.unidad}</span>}
                                </div>
                              </div>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
                                Stock: {e.stock_actual} {e.unidad}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Descripción *</label>
                <input value={itemForm.descripcion} onChange={e => setItemForm(f => ({ ...f, descripcion: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Cantidad *</label>
                  <input type="number" min={0.01} step={0.01} value={itemForm.cantidad} onChange={e => setItemForm(f => ({ ...f, cantidad: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Unidad</label>
                  <input value={itemForm.unidad} onChange={e => setItemForm(f => ({ ...f, unidad: e.target.value }))} style={inp({ marginTop: 4 })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>P. Unitario (S/)</label>
                  <input type="number" min={0} step={0.01} value={itemForm.precio_unitario} onChange={e => setItemForm(f => ({ ...f, precio_unitario: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
                </div>
              </div>
              {ubicaciones.filter(u => u.activa).length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación destino (opcional)</label>
                  <select value={itemForm.ubicacion_destino_id ?? ''} onChange={e => setItemForm(f => ({ ...f, ubicacion_destino_id: e.target.value || null }))} style={inp({ marginTop: 4 })}>
                    <option value="">— Sin especificar —</option>
                    {ubicaciones.filter(u => u.activa).map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''} · {u.tipo}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Observación</label>
                <input value={itemForm.observacion ?? ''} onChange={e => setItemForm(f => ({ ...f, observacion: e.target.value || null }))} style={inp({ marginTop: 4 })} />
              </div>
            </div>

            {itemError && <p style={{ color: 'var(--red-600)', fontSize: 12.5, marginTop: 10 }}>{itemError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowItemModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleSaveItem} disabled={savingItem} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: savingItem ? .6 : 1 }}>
                {savingItem ? 'Guardando…' : editingItem ? 'Guardar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importar desde pedido */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowImportModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Importar ítems del pedido</h3>
              <button onClick={() => setShowImportModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)' }}><X size={16} /></button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--n-600)' }}>
              Se agregarán <strong>{pedidoItems.filter(pi => !items.map(i => i.pedido_item_id).includes(pi.id)).length}</strong> ítem(s) pendientes del pedido.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)', display: 'block', marginBottom: 4 }}>
                Ubicación destino
              </label>
              <select
                value={importUbicacionId ?? ''}
                onChange={e => setImportUbicacionId(e.target.value || null)}
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', color: 'var(--n-900)' }}
              >
                <option value="">— Sin especificar —</option>
                {ubicaciones.filter(u => u.activa).map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''} · {u.tipo}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowImportModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleImportarDesdePedido} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm completar */}
      {confirmComplete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmComplete(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Completar recepción?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>
              Se actualizará el stock de <strong>{items.filter(i => i.equipo_id).length}</strong> equipo(s) y se registrará el kardex. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmComplete(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleCompletar} disabled={completing} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: completing ? .6 : 1 }}>
                {completing ? 'Procesando…' : 'Completar y actualizar stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
