import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X, Save, ChevronDown, Search, Mail } from 'lucide-react'
import { useAlmacenPedidoDetail, usePedidoEstadoHistorial } from '../../hooks/useAlmacenPedidos'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const API_BASE   = import.meta.env.VITE_API_URL   ?? 'http://localhost:8000'
const LS_DESTINATARIOS_KEY = 'almacen_pedido_email_destinatarios'
import type { AlmacenPedidoEstado, AlmacenPedidoItem } from '../../lib/types'
import { ALMACEN_PEDIDO_ESTADOS } from '../../lib/types'

const estadoColor: Record<AlmacenPedidoEstado, { bg: string; color: string }> = {
  'En Revisión':            { bg: 'var(--n-100)',     color: 'var(--n-600)'     },
  'En Cotización':          { bg: 'var(--blue-50)',   color: 'var(--blue-600)'  },
  'Pendiente de Aprobación':{ bg: 'var(--amber-50)',  color: 'var(--amber-600)' },
  'Aprobado':               { bg: 'var(--green-50)',  color: 'var(--green-600)' },
  'OC Emitida':             { bg: 'var(--purple-50)', color: 'var(--purple-600)'},
  'En Tránsito':            { bg: 'var(--indigo-50)', color: 'var(--indigo-600)'},
  'Recibido Parcialmente':  { bg: 'var(--orange-50)', color: 'var(--orange-600)'},
  'Recibido':               { bg: 'var(--green-50)',  color: 'var(--green-600)' },
  'Enviado':                { bg: 'var(--brand-50)',  color: 'var(--brand-700)' },
  'Completado':             { bg: 'var(--green-50)',  color: 'var(--green-700)' },
  'Cancelado':              { bg: 'var(--red-50)',    color: 'var(--red-600)'   },
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
  const { historial } = usePedidoEstadoHistorial(id!)
  const { user, profile } = useAuth()

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({
    destinatarios: '',
    firma: '',
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<AlmacenPedidoItem | null>(null)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [savingItem, setSavingItem] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [savingEstado, setSavingEstado] = useState(false)
  const [comboSearch, setComboSearch] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const [equipoOptions, setEquipoOptions] = useState<{ id: string; nombre: string; codigo: string | null; unidad: string; precio_unitario: number }[]>([])
  const [comboLoading, setComboLoading] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Server-side search: fetch matching equipos from Supabase
  useEffect(() => {
    if (!comboOpen) return
    clearTimeout(comboTimerRef.current)
    comboTimerRef.current = setTimeout(async () => {
      setComboLoading(true)
      let q = supabase
        .from('almacen_equipos')
        .select('id,nombre,codigo,unidad,precio_unitario')
        .order('nombre')
        .limit(50)
      if (comboSearch.trim()) {
        q = q.or(`nombre.ilike.%${comboSearch.trim()}%,codigo.ilike.%${comboSearch.trim()}%`)
      }
      const { data } = await q
      setEquipoOptions(data || [])
      setComboLoading(false)
    }, 200)
    return () => clearTimeout(comboTimerRef.current)
  }, [comboSearch, comboOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
        const sel = equipoOptions.find(eq => eq.id === itemForm.equipo_id)
        setComboSearch(sel ? sel.nombre : itemForm.equipo_id ? comboSearch : '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [equipoOptions, itemForm.equipo_id, comboSearch])

  const openEmailModal = () => {
    const savedDestinatarios = localStorage.getItem(LS_DESTINATARIOS_KEY) ?? ''
    setEmailForm({ destinatarios: savedDestinatarios, firma: profile?.full_name || user?.email || '' })
    setEmailError(null)
    setEmailSent(false)
    setShowEmailModal(true)
  }

  const handleSendEmail = async () => {
    const destinatarios = emailForm.destinatarios.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
    if (destinatarios.length === 0) { setEmailError('Ingresa al menos un destinatario'); return }
    localStorage.setItem(LS_DESTINATARIOS_KEY, emailForm.destinatarios)
    setSendingEmail(true)
    setEmailError(null)
    try {
      const res = await fetch(`${API_BASE}/almacen/pedidos/notificar-seguimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: pedido!.numero,
          asunto: pedido!.asunto,
          estado: pedido!.estado,
          from_email: user?.email ?? null,
          firma: emailForm.firma || null,
          destinatarios,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Error al enviar')
      }
      setEmailSent(true)
    } catch (e: unknown) {
      setEmailError(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setSendingEmail(false)
    }
  }

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
    setComboOpen(false)
    if (it.equipo_id) {
      supabase
        .from('almacen_equipos')
        .select('id,nombre,codigo,unidad,precio_unitario')
        .eq('id', it.equipo_id)
        .single()
        .then(({ data }) => {
          if (data) { setComboSearch(data.nombre); setEquipoOptions([data]) }
        })
    } else {
      setComboSearch('')
    }
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
    const eq = equipoOptions.find(e => e.id === equipoId)
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

  const ec = estadoColor[pedido.estado] ?? { bg: 'var(--n-100)', color: 'var(--n-600)' }

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
        <button
          onClick={openEmailModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
            background: 'var(--n-0)', color: 'var(--n-700)',
            border: '1px solid var(--n-200)', cursor: 'pointer',
          }}
        >
          <Mail size={14} /> Enviar correo
        </button>

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
        {pedido.asunto && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginBottom: 2 }}>Asunto</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-800)' }}>{pedido.asunto}</div>
          </div>
        )}
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
      ) : (() => {
        // Agrupar por categoría
        const grupos = items.reduce<Record<string, typeof items>>((acc, it) => {
          const cat = (it.equipo as (AlmacenPedidoItem['equipo'] & { categoria?: string | null }) | null)?.categoria || 'Sin categoría'
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
                        {['Descripción', 'Cantidad', 'Aprobada', 'Unidad', 'P. Unitario', 'Total', 'Observación', ''].map(h => (
                          <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--n-400)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grupoItems.map(it => (
                        <tr key={it.id} style={{ borderBottom: '1px solid var(--n-100)' }}>
                          <td style={{ padding: '9px 12px', color: 'var(--n-900)', fontWeight: 500 }}>{it.descripcion}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-700)' }}>{it.cantidad}</td>
                          <td style={{ padding: '9px 12px', color: it.cantidad_aprobada != null ? 'var(--green-600)' : 'var(--n-400)' }}>
                            {it.cantidad_aprobada ?? '—'}
                          </td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-500)' }}>{it.unidad}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-700)' }}>S/ {it.precio_unitario.toFixed(2)}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--n-900)' }}>S/ {(it.cantidad * it.precio_unitario).toFixed(2)}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--n-500)', fontSize: 12 }}>{it.observacion ?? '—'}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => openEditItem(it)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }} title="Editar"><Save size={13} /></button>
                              <button onClick={() => removeItem(it.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-600)' }} title="Eliminar"><Trash2 size={13} /></button>
                            </div>
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-700)', marginRight: 16 }}>Total estimado</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-700)' }}>S/ {total.toFixed(2)}</span>
            </div>
          </div>
        )
      })()}

      {/* Historial de estados */}
      {historial.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--n-800)' }}>
            Historial de estados
          </h3>
          <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '20px 24px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>
              {historial.map((h, i) => {
                const ec = estadoColor[h.estado_nuevo as AlmacenPedidoEstado] ?? { bg: 'var(--n-100)', color: 'var(--n-600)' }
                const fecha = new Date(h.created_at)
                const esUltimo = i === historial.length - 1
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                    {/* Paso */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 120, maxWidth: 150 }}>
                      {/* dot + badge */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: ec.color,
                          border: '2px solid var(--n-0)',
                          boxShadow: `0 0 0 2px ${ec.color}`,
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 11.5, fontWeight: 600, textAlign: 'center',
                          background: ec.bg, color: ec.color,
                          padding: '3px 8px', borderRadius: 5, lineHeight: 1.3,
                        }}>
                          {h.estado_nuevo}
                        </span>
                      </div>
                      {/* fecha y usuario */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--n-500)' }}>
                          {fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--n-400)' }}>
                          {fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {h.usuario_nombre && (
                          <div style={{ fontSize: 10.5, color: 'var(--n-400)', marginTop: 2 }}>
                            {h.usuario_nombre}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* conector */}
                    {!esUltimo && (
                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: 6, flexShrink: 0 }}>
                        <div style={{ width: 40, height: 2, background: 'var(--n-200)' }} />
                        <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--n-200)' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal enviar correo */}
      {showEmailModal && pedido && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowEmailModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Enviar correo de seguimiento</h2>
              <button onClick={() => setShowEmailModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>

            {emailSent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-700)' }}>Correo enviado correctamente</div>
                <button onClick={() => setShowEmailModal(false)} style={{ marginTop: 16, padding: '8px 20px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cerrar</button>
              </div>
            ) : (
              <>
                {/* Preview del mensaje */}
                <div style={{ background: 'var(--n-25)', border: '1px solid var(--n-150)', borderRadius: 8, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--n-700)', lineHeight: 1.7 }}>
                  <p style={{ margin: '0 0 8px' }}>Estimados,</p>
                  <p style={{ margin: '0 0 8px' }}>
                    Se comunica que la solicitud de pedido correspondiente al{' '}
                    <strong>{pedido.asunto || `Pedido #${String(pedido.numero).padStart(4, '0')}`}</strong>{' '}
                    se encuentra actualmente{' '}
                    <span style={{ fontWeight: 700, color: ec.color }}>{pedido.estado}</span>.
                  </p>
                  <p style={{ margin: '0 0 8px' }}>Se viene realizando el seguimiento correspondiente a los equipos, materiales y consumibles requeridos, a fin de asegurar su correcta atención dentro de los plazos establecidos.</p>
                  <p style={{ margin: '0 0 16px' }}>Cualquier actualización será comunicada oportunamente.</p>
                  <p style={{ margin: 0, color: 'var(--n-500)' }}>Atentamente,<br /><strong style={{ color: 'var(--n-800)' }}>{emailForm.firma || '[Firma]'}</strong></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {user?.email && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)', display: 'block', marginBottom: 4 }}>Desde</label>
                      <div style={{ padding: '7px 10px', fontSize: 13, border: '1px solid var(--n-150)', borderRadius: 7, background: 'var(--n-50)', color: 'var(--n-500)' }}>
                        {user.email}
                      </div>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)', display: 'block', marginBottom: 4 }}>Destinatarios <span style={{ color: 'var(--red-600)' }}>*</span></label>
                    <input
                      value={emailForm.destinatarios}
                      onChange={e => setEmailForm(f => ({ ...f, destinatarios: e.target.value }))}
                      placeholder="correo@empresa.com, otro@empresa.com"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--n-400)' }}>Separa múltiples correos con coma o punto y coma</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)', display: 'block', marginBottom: 4 }}>Firma</label>
                    <input
                      value={emailForm.firma}
                      onChange={e => setEmailForm(f => ({ ...f, firma: e.target.value }))}
                      placeholder="Tu nombre o área"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {emailError && <p style={{ color: 'var(--red-600)', fontSize: 12.5, marginTop: 10 }}>{emailError}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                  <button onClick={() => setShowEmailModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                  <button onClick={handleSendEmail} disabled={sendingEmail} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: sendingEmail ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: sendingEmail ? .6 : 1 }}>
                    <Mail size={13} /> {sendingEmail ? 'Enviando…' : 'Enviar correo'}
                  </button>
                </div>
              </>
            )}
          </div>
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
                      {comboLoading && (
                        <div style={{ padding: '7px 10px', fontSize: 12, color: 'var(--n-400)' }}>Buscando…</div>
                      )}
                      {equipoOptions.map(e => (
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
