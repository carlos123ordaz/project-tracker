import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X, Truck, ChevronDown, Search } from 'lucide-react'
import { useAlmacenDespachoDetail } from '../../hooks/useAlmacenMovimientos'
import { useAlmacenEquipos } from '../../hooks/useAlmacenEquipos'
import { useAlmacenUbicaciones } from '../../hooks/useAlmacenUbicaciones'
import type { AlmacenDespachoEstado, AlmacenDespachoItem } from '../../lib/types'
import { ALMACEN_DESPACHO_ESTADOS } from '../../lib/types'

const estadoColor: Record<AlmacenDespachoEstado, { bg: string; color: string }> = {
  'Borrador':   { bg: 'var(--n-100)', color: 'var(--n-600)' },
  'Despachado': { bg: 'var(--purple-50)', color: 'var(--purple-600)' },
  'Entregado':  { bg: 'var(--green-50)', color: 'var(--green-600)' },
  'Cancelado':  { bg: 'var(--red-50)', color: 'var(--red-600)' },
}

const EMPTY_ITEM = {
  equipo_id: null as string | null,
  descripcion: '',
  cantidad: 1,
  unidad: 'UND',
  observacion: null as string | null,
  ubicacion_origen_id: null as string | null,
}

export default function DespachoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    despacho, items, loading, error,
    updateDespacho, addItem, updateItem, removeItem, confirmarDespacho,
  } = useAlmacenDespachoDetail(id!)
  const { equipos } = useAlmacenEquipos()
  const { ubicaciones } = useAlmacenUbicaciones()

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<AlmacenDespachoItem | null>(null)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [savingItem, setSavingItem] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmDispatch, setConfirmDispatch] = useState(false)
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

  const openNewItem = () => {
    setEditingItem(null)
    setItemForm(EMPTY_ITEM)
    setItemError(null)
    setComboSearch('')
    setComboOpen(false)
    setShowItemModal(true)
  }

  const openEditItem = (it: AlmacenDespachoItem) => {
    setEditingItem(it)
    const sel = equipos.find(eq => eq.id === it.equipo_id)
    setComboSearch(sel ? sel.nombre : '')
    setComboOpen(false)
    setItemForm({
      equipo_id: it.equipo_id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidad: it.unidad,
      observacion: it.observacion,
      ubicacion_origen_id: it.ubicacion_origen_id,
    })
    setItemError(null)
    setShowItemModal(true)
  }

  const handleEquipoSelect = (equipoId: string) => {
    const eq = equipos.find(e => e.id === equipoId)
    setItemForm(f => ({
      ...f,
      equipo_id: equipoId || null,
      descripcion: eq ? eq.nombre : f.descripcion,
      unidad: eq ? eq.unidad : f.unidad,
    }))
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

  const handleConfirmarDespacho = async () => {
    setConfirming(true)
    try {
      await confirmarDespacho()
      setConfirmDispatch(false)
    } catch {}
    setConfirming(false)
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', background: 'var(--n-0)', color: 'var(--n-900)', ...style,
  })

  if (loading) return <div style={{ padding: 24, color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
  if (error || !despacho) return <div style={{ padding: 24, color: 'var(--red-600)', fontSize: 13 }}>{error ?? 'No encontrado'}</div>

  const ec = estadoColor[despacho.estado]
  const isEditable = despacho.estado === 'Borrador'

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/almacen/despachos')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)', padding: 4 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            Despacho #{String(despacho.numero).padStart(4, '0')}
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '2px 0 0' }}>
            {despacho.destinatario ?? 'Sin destinatario'} · {new Date(despacho.fecha_despacho).toLocaleDateString('es-PE')}
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={despacho.estado}
            onChange={e => updateDespacho({ estado: e.target.value as AlmacenDespachoEstado })}
            style={{
              padding: '6px 32px 6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
              border: `2px solid ${ec.color}`, background: ec.bg, color: ec.color,
              cursor: 'pointer', appearance: 'none',
            }}
          >
            {ALMACEN_DESPACHO_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: ec.color, pointerEvents: 'none' }} />
        </div>

        {isEditable && items.length > 0 && (
          <button
            onClick={() => setConfirmDispatch(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Truck size={15} /> Confirmar despacho
          </button>
        )}
      </div>

      {/* Info del despacho */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: despacho.observaciones ? 16 : 0 }}>
          {[
            { label: 'Destinatario', value: despacho.destinatario ?? '—' },
            { label: 'Dirección', value: despacho.direccion ?? '—' },
            { label: 'Movilidad', value: despacho.movilidad ?? '—' },
            { label: 'Conductor', value: despacho.conductor ?? '—' },
            { label: 'Placa', value: despacho.placa ?? '—' },
            { label: 'Guía de remisión', value: despacho.guia_remision ?? '—' },
            { label: 'Fecha despacho', value: new Date(despacho.fecha_despacho).toLocaleDateString('es-PE') },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: 'var(--n-400)', marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-800)' }}>{f.value}</div>
            </div>
          ))}
        </div>
        {despacho.observaciones && (
          <div style={{ borderTop: '1px solid var(--n-100)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginBottom: 2 }}>Observaciones</div>
            <div style={{ fontSize: 13, color: 'var(--n-700)' }}>{despacho.observaciones}</div>
          </div>
        )}
      </div>

      {despacho.estado === 'Despachado' && (
        <div style={{ background: 'var(--purple-50)', border: '1px solid #c4b5fd', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--purple-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={15} /> Despacho confirmado. El stock fue descontado y el kardex registrado.
        </div>
      )}

      {/* Items */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--n-800)' }}>Ítems a despachar ({items.length})</h3>
        {isEditable && (
          <button onClick={openNewItem} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--brand-600)', color: '#fff',
            border: 'none', borderRadius: 7, padding: '7px 12px',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={13} /> Agregar ítem
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--n-400)', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10 }}>
          <p style={{ fontSize: 13 }}>Sin ítems. Agrega los materiales a despachar.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                {['Descripción', 'Cantidad', 'Unidad', 'Stock total', 'Ub. Origen', 'Observación', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const stockActual = it.equipo ? (it.equipo as { stock_actual: number }).stock_actual : null
                const sinStock = stockActual !== null && it.cantidad > stockActual
                return (
                  <tr key={it.id} style={{ borderBottom: '1px solid var(--n-100)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 500, color: 'var(--n-900)' }}>{it.descripcion}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: sinStock ? 'var(--red-600)' : 'var(--n-900)' }}>{it.cantidad}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--n-500)' }}>{it.unidad}</td>
                    <td style={{ padding: '9px 12px', color: sinStock ? 'var(--red-600)' : 'var(--n-600)' }}>
                      {stockActual !== null ? (
                        <span>{stockActual} {sinStock && '⚠️'}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--n-500)', fontSize: 12 }}>
                      {(it.ubicacion_origen as { nombre: string } | null)?.nombre ?? (it.ubicacion_origen_id ? '…' : '—')}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--n-500)', fontSize: 12 }}>{it.observacion ?? '—'}</td>
                    <td style={{ padding: '9px 12px' }}>
                      {isEditable && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEditItem(it)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}>✏️</button>
                          <button onClick={() => removeItem(it.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-600)' }}><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal ítem */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
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
                          <span style={{ color: 'var(--n-400)', marginLeft: 8, fontSize: 12 }}>Stock: {e.stock_actual} {e.unidad}</span>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Cantidad *</label>
                  <input type="number" min={0.01} step={0.01} value={itemForm.cantidad} onChange={e => setItemForm(f => ({ ...f, cantidad: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Unidad</label>
                  <input value={itemForm.unidad} onChange={e => setItemForm(f => ({ ...f, unidad: e.target.value }))} style={inp({ marginTop: 4 })} />
                </div>
              </div>
              {ubicaciones.filter(u => u.activa).length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación origen (opcional)</label>
                  <select value={itemForm.ubicacion_origen_id ?? ''} onChange={e => setItemForm(f => ({ ...f, ubicacion_origen_id: e.target.value || null }))} style={inp({ marginTop: 4 })}>
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

      {/* Confirm despacho */}
      {confirmDispatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDispatch(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Confirmar despacho?</h3>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--n-600)' }}>
              Se descontará el stock de <strong>{items.filter(i => i.equipo_id).length}</strong> equipo(s) y se registrará en el kardex.
            </p>
            {items.some(it => it.equipo_id && it.equipo && (it.equipo as { stock_actual: number }).stock_actual < it.cantidad) && (
              <div style={{ background: 'var(--red-50)', border: '1px solid #fca5a5', borderRadius: 7, padding: '8px 12px', marginBottom: 12, fontSize: 12.5, color: 'var(--red-600)' }}>
                ⚠️ Algunos ítems tienen stock insuficiente. El stock no bajará de 0.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setConfirmDispatch(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleConfirmarDespacho} disabled={confirming} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: confirming ? .6 : 1 }}>
                {confirming ? 'Procesando…' : 'Confirmar y descontar stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
