import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X, Save, ChevronDown, Search } from 'lucide-react'
import { useAlmacenPedidoDetail } from '../../hooks/useAlmacenPedidos'
import { useAlmacenEquipos } from '../../hooks/useAlmacenEquipos'
import type { AlmacenPedidoEstado, AlmacenPedidoItem } from '../../lib/types'
import { ALMACEN_PEDIDO_ESTADOS } from '../../lib/types'

const estadoColor: Record<AlmacenPedidoEstado, { bg: string; color: string }> = {
  'Borrador':   { bg: 'var(--n-100)', color: 'var(--n-600)' },
  'Pendiente':  { bg: 'var(--amber-50)', color: 'var(--amber-600)' },
  'Aprobado':   { bg: 'var(--blue-50)', color: 'var(--blue-600)' },
  'Enviado':    { bg: 'var(--purple-50)', color: 'var(--purple-600)' },
  'Completado': { bg: 'var(--green-50)', color: 'var(--green-600)' },
  'Cancelado':  { bg: 'var(--red-50)', color: 'var(--red-600)' },
}

const EMPTY_ITEM = {
  equipo_id: null as string | null,
  descripcion: '',
  cantidad: 1,
  cantidad_aprobada: null as number | null,
  unidad: 'UND',
  precio_unitario: 0,
  observacion: null as string | null,
}

export default function PedidoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pedido, items, loading, error, updatePedido, addItem, updateItem, removeItem } = useAlmacenPedidoDetail(id!)
  const { equipos } = useAlmacenEquipos()

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<AlmacenPedidoItem | null>(null)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [savingItem, setSavingItem] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [savingEstado, setSavingEstado] = useState(false)
  const [comboSearch, setComboSearch] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
        const sel = equipos.find(eq => eq.id === itemForm.equipo_id)
        setComboSearch(sel ? sel.nombre : '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [equipos, itemForm.equipo_id])

  const handleEstado = async (estado: AlmacenPedidoEstado) => {
    setSavingEstado(true)
    try { await updatePedido({ estado }) } catch {}
    setSavingEstado(false)
  }

  const openNewItem = () => {
    setEditingItem(null)
    setItemForm(EMPTY_ITEM)
    setItemError(null)
    setComboSearch('')
    setComboOpen(false)
    setShowItemModal(true)
  }

  const openEditItem = (it: AlmacenPedidoItem) => {
    setEditingItem(it)
    const sel = equipos.find(eq => eq.id === it.equipo_id)
    setComboSearch(sel ? sel.nombre : '')
    setComboOpen(false)
    setItemForm({
      equipo_id: it.equipo_id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      cantidad_aprobada: it.cantidad_aprobada,
      unidad: it.unidad,
      precio_unitario: it.precio_unitario,
      observacion: it.observacion,
    })
    setItemError(null)
    setShowItemModal(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.descripcion.trim()) { setItemError('La descripción es requerida'); return }
    if (itemForm.cantidad <= 0) { setItemError('La cantidad debe ser mayor a 0'); return }
    setSavingItem(true)
    setItemError(null)
    try {
      if (editingItem) {
        await updateItem(editingItem.id, itemForm)
      } else {
        await addItem(itemForm)
      }
      setShowItemModal(false)
    } catch (e: unknown) {
      setItemError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingItem(false)
    }
  }

  const handleEquipoSelect = (equipoId: string) => {
    const eq = equipos.find(e => e.id === equipoId)
    setItemForm(f => ({
      ...f,
      equipo_id: equipoId || null,
      descripcion: eq ? eq.nombre : f.descripcion,
      unidad: eq ? eq.unidad : f.unidad,
      precio_unitario: eq ? eq.precio_unitario : f.precio_unitario,
    }))
  }

  const total = items.reduce((sum, it) => sum + it.cantidad * it.precio_unitario, 0)

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', background: 'var(--n-0)', color: 'var(--n-900)', ...style,
  })

  if (loading) return <div style={{ padding: 24, color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
  if (error || !pedido) return <div style={{ padding: 24, color: 'var(--red-600)', fontSize: 13 }}>{error ?? 'Pedido no encontrado'}</div>

  const ec = estadoColor[pedido.estado]

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/almacen/pedidos')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)', padding: 4 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            Pedido #{String(pedido.numero).padStart(4, '0')}
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '2px 0 0' }}>
            {pedido.solicitado_por || 'Sin solicitante'} · {new Date(pedido.fecha_pedido).toLocaleDateString('es-PE')}
          </p>
        </div>
        {/* Estado selector */}
        <div style={{ position: 'relative' }}>
          <select
            value={pedido.estado}
            onChange={e => handleEstado(e.target.value as AlmacenPedidoEstado)}
            disabled={savingEstado}
            style={{
              padding: '6px 32px 6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
              border: `2px solid ${ec.color}`, background: ec.bg, color: ec.color,
              cursor: 'pointer', appearance: 'none',
            }}
          >
            {ALMACEN_PEDIDO_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: ec.color, pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Info cabecera */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'Solicitado por', value: pedido.solicitado_por ?? '—' },
          { label: 'Proveedor sugerido', value: pedido.proveedor_sugerido ?? '—' },
          { label: 'Fecha pedido', value: new Date(pedido.fecha_pedido).toLocaleDateString('es-PE') },
          { label: 'Fecha requerida', value: pedido.fecha_requerida ? new Date(pedido.fecha_requerida).toLocaleDateString('es-PE') : '—' },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-800)' }}>{f.value}</div>
          </div>
        ))}
        {pedido.observaciones && (
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginBottom: 2 }}>Observaciones</div>
            <div style={{ fontSize: 13, color: 'var(--n-700)' }}>{pedido.observaciones}</div>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--n-800)' }}>
          Ítems del pedido ({items.length})
        </h3>
        <button
          onClick={openNewItem}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--brand-600)', color: '#fff',
            border: 'none', borderRadius: 7, padding: '7px 12px',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={13} /> Agregar ítem
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--n-400)', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10 }}>
          <p style={{ fontSize: 13 }}>Sin ítems. Agrega materiales o equipos al pedido.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                {['Descripción', 'Cantidad', 'Aprobada', 'Unidad', 'P. Unitario', 'Total', 'Observación', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} style={{ borderBottom: '1px solid var(--n-100)' }}>
                  <td style={{ padding: '9px 12px', color: 'var(--n-900)', fontWeight: 500 }}>{it.descripcion}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--n-700)' }}>{it.cantidad}</td>
                  <td style={{ padding: '9px 12px', color: it.cantidad_aprobada != null ? 'var(--green-600)' : 'var(--n-400)' }}>
                    {it.cantidad_aprobada ?? '—'}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--n-500)' }}>{it.unidad}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--n-700)' }}>S/ {it.precio_unitario.toFixed(2)}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--n-900)' }}>
                    S/ {(it.cantidad * it.precio_unitario).toFixed(2)}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--n-500)', fontSize: 12 }}>{it.observacion ?? '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEditItem(it)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }} title="Editar">
                        <Save size={13} />
                      </button>
                      <button onClick={() => removeItem(it.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-600)' }} title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--n-150)', background: 'var(--n-25)' }}>
                <td colSpan={5} style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--n-700)', fontSize: 13 }}>Total estimado</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 14, color: 'var(--brand-700)' }}>
                  S/ {total.toFixed(2)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal ítem */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 500, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{editingItem ? 'Editar ítem' : 'Agregar ítem'}</h2>
              <button onClick={() => setShowItemModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Equipo del catálogo (opcional)</label>
                <div ref={comboRef} style={{ position: 'relative', marginTop: 4 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
                    <input
                      value={comboSearch}
                      onChange={e => { setComboSearch(e.target.value); setComboOpen(true) }}
                      onFocus={() => setComboOpen(true)}
                      placeholder="Buscar equipo… (opcional)"
                      style={{ ...inp(), paddingLeft: 28 }}
                    />
                  </div>
                  {comboOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
                      <div
                        onMouseDown={() => { handleEquipoSelect(''); setComboSearch(''); setComboOpen(false) }}
                        style={{ padding: '7px 10px', fontSize: 13, color: 'var(--n-400)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >— Descripción libre —</div>
                      {equipos.filter(e => `${e.codigo ?? ''} ${e.nombre}`.toLowerCase().includes(comboSearch.toLowerCase())).map(e => (
                        <div
                          key={e.id}
                          onMouseDown={() => { handleEquipoSelect(e.id); setComboSearch(e.nombre); setComboOpen(false) }}
                          style={{ padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: 'var(--n-800)', background: itemForm.equipo_id === e.id ? 'var(--n-50)' : '' }}
                          onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--n-50)')}
                          onMouseLeave={ev => (ev.currentTarget.style.background = itemForm.equipo_id === e.id ? 'var(--n-50)' : '')}
                        >
                          {e.codigo && <span style={{ color: 'var(--n-400)', marginRight: 6 }}>[{e.codigo}]</span>}{e.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Cant. aprobada</label>
                  <input type="number" min={0} step={0.01} value={itemForm.cantidad_aprobada ?? ''} onChange={e => setItemForm(f => ({ ...f, cantidad_aprobada: e.target.value ? Number(e.target.value) : null }))} style={inp({ marginTop: 4 })} placeholder="—" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Unidad</label>
                  <input value={itemForm.unidad} onChange={e => setItemForm(f => ({ ...f, unidad: e.target.value }))} style={inp({ marginTop: 4 })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Precio unitario (S/)</label>
                <input type="number" min={0} step={0.01} value={itemForm.precio_unitario} onChange={e => setItemForm(f => ({ ...f, precio_unitario: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
              </div>
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
    </div>
  )
}
