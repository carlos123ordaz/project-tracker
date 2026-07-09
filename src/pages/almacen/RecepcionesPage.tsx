import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Plus, ArrowDownToLine, Trash2, X, Search } from 'lucide-react'
import { useAlmacenRecepciones } from '../../hooks/useAlmacenMovimientos'
import { useAlmacenPedidos } from '../../hooks/useAlmacenPedidos'
import type { AlmacenRecepcion, AlmacenRecepcionEstado } from '../../lib/types'
import { ALMACEN_RECEPCION_ESTADOS } from '../../lib/types'
import { Pagination } from '../../components/ui/Pagination'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const estadoColor: Record<AlmacenRecepcionEstado, { bg: string; color: string }> = {
  'Borrador':   { bg: 'var(--n-100)',    color: 'var(--n-600)'     },
  'Parcial':    { bg: 'var(--amber-50)', color: 'var(--amber-700)' },
  'Completada': { bg: 'var(--green-50)', color: 'var(--green-600)' },
}

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 11, fontWeight: 700, color: 'var(--n-500)',
  letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = { padding: '10px 12px', fontSize: 12.5 }

export default function RecepcionesPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const canAdd    = hasPermission('almacen:recepciones', 'add')
  const canDelete = hasPermission('almacen:recepciones', 'delete')
  const [filterEstado, setFilterEstado] = useState<AlmacenRecepcionEstado | 'Todos'>('Todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const { recepciones, total, loading, createRecepcion, deleteRecepcion } = useAlmacenRecepciones({
    estado: filterEstado, page, pageSize, search,
  })
  const { pedidos } = useAlmacenPedidos()

  useEffect(() => { setPage(0) }, [filterEstado, search])

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    pedido_id: null as string | null,
    proveedor: '', nro_factura: '', guia_remision: '',
    fecha_recepcion: new Date().toISOString().split('T')[0],
    estado: 'Borrador' as AlmacenRecepcionEstado,
    observaciones: '',
    created_by: user?.id ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AlmacenRecepcion | null>(null)

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      const rec = await createRecepcion({
        ...form,
        proveedor: form.proveedor || null,
        nro_factura: form.nro_factura || null,
        guia_remision: form.guia_remision || null,
        observaciones: form.observaciones || null,
      })
      setShowModal(false)
      navigate(`/almacen/recepciones/${rec.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear')
    } finally { setSaving(false) }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', background: 'var(--n-0)', color: 'var(--n-900)', ...style,
  })

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Recepciones Logísticas</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', margin: '2px 0 0' }}>Ingreso de materiales al almacén</p>
        </div>
        {canAdd && (
          <button
            onClick={() => { setForm(f => ({ ...f, pedido_id: null, proveedor: '', nro_factura: '', guia_remision: '', observaciones: '', estado: 'Borrador' })); setError(null); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              background: 'var(--brand-600)', color: '#fff',
              border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Nueva recepción
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 14, background: 'var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
        {(['Todos', ...ALMACEN_RECEPCION_ESTADOS] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => { setFilterEstado(s as AlmacenRecepcionEstado | 'Todos'); setPage(0) }}
            style={{
              flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer',
              background: filterEstado === s ? 'var(--n-0)' : 'transparent',
              textAlign: 'center',
              borderRight: i < ALMACEN_RECEPCION_ESTADOS.length ? '1px solid var(--n-200)' : 'none',
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, lineHeight: 1,
              color: s === 'Todos' ? 'var(--n-700)' : (estadoColor[s as AlmacenRecepcionEstado]?.color ?? 'var(--n-700)'),
            }}>
              {filterEstado === s ? total : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 2 }}>{s}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 340, marginBottom: 14 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por proveedor, factura, G/R…"
          style={{
            width: '100%', paddingLeft: 30, paddingRight: 10, height: 30,
            border: '1px solid var(--n-200)', borderRadius: 7,
            fontSize: 12, color: 'var(--n-800)', background: 'var(--n-0)', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : recepciones.length === 0 ? (
        <div style={{ padding: '56px 24px', textAlign: 'center', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12 }}>
          <ArrowDownToLine size={36} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-600)' }}>
            {search ? 'Sin resultados' : 'Sin recepciones registradas'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginTop: 4 }}>
            {search ? 'Prueba con otros filtros' : 'Registra tu primera recepción con el botón de arriba'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
                    {['#', 'Proveedor', 'Factura / G/R', 'Pedido asociado', 'Fecha', 'Estado', ''].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recepciones.map((r, idx) => {
                    const ec = estadoColor[r.estado]
                    const pedido = r.pedido as { numero: number; solicitado_por?: string } | null
                    return (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/almacen/recepciones/${r.id}`)}
                        style={{ borderBottom: idx < recepciones.length - 1 ? '1px solid var(--n-100)' : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ ...TD, color: 'var(--n-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          #{String(r.numero).padStart(4, '0')}
                        </td>
                        <td style={TD}>
                          <div style={{ fontWeight: 600, color: 'var(--n-900)' }}>
                            {r.proveedor || <span style={{ color: 'var(--n-400)', fontWeight: 400 }}>Sin proveedor</span>}
                          </div>
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)' }}>
                          {r.nro_factura && <div style={{ fontSize: 12 }}>{r.nro_factura}</div>}
                          {r.guia_remision && <div style={{ fontSize: 11, color: 'var(--n-400)' }}>G/R: {r.guia_remision}</div>}
                          {!r.nro_factura && !r.guia_remision && <span style={{ color: 'var(--n-300)' }}>—</span>}
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)' }}>
                          {pedido
                            ? <span>#{String(pedido.numero).padStart(4, '0')}{pedido.solicitado_por ? ` · ${pedido.solicitado_por}` : ''}</span>
                            : <span style={{ color: 'var(--n-300)' }}>—</span>
                          }
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
                          {format(new Date(r.fecha_recepcion), "d MMM yyyy", { locale: es })}
                        </td>
                        <td style={TD}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20, ...ec }}>
                            {r.estado}
                          </span>
                        </td>
                        {canDelete && (
                          <td style={{ ...TD, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setConfirmDelete(r)}
                              style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)', borderRadius: 5 }}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={setPageSize} loading={loading} />
        </>
      )}

      {/* Modal nueva recepción */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Nueva recepción</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Pedido asociado (opcional)</label>
                <select value={form.pedido_id ?? ''} onChange={e => setForm(f => ({ ...f, pedido_id: e.target.value || null }))} style={inp({ marginTop: 4 })}>
                  <option value="">— Sin pedido —</option>
                  {pedidos.filter(p => ['OC Emitida', 'En Tránsito', 'Recibido Parcialmente'].includes(p.estado)).map(p => (
                    <option key={p.id} value={p.id}>#{String(p.numero).padStart(4, '0')} — {p.solicitado_por ?? 'Sin solicitante'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Proveedor</label>
                <input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Nro. Factura</label>
                  <input value={form.nro_factura} onChange={e => setForm(f => ({ ...f, nro_factura: e.target.value }))} style={inp({ marginTop: 4 })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Guía de remisión</label>
                  <input value={form.guia_remision} onChange={e => setForm(f => ({ ...f, guia_remision: e.target.value }))} style={inp({ marginTop: 4 })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Fecha de recepción</label>
                <input type="date" value={form.fecha_recepcion} onChange={e => setForm(f => ({ ...f, fecha_recepcion: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} style={{ ...inp({ marginTop: 4 }), height: 60, resize: 'vertical' }} />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red-600)', fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Creando…' : 'Crear y editar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Eliminar recepción?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>
              Se eliminará la recepción <strong>#{String(confirmDelete.numero).padStart(4, '0')}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={async () => { await deleteRecepcion(confirmDelete.id); setConfirmDelete(null) }} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--red-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
