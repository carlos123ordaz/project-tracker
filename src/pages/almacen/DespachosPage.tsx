import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Plus, Truck, Trash2, X, Search } from 'lucide-react'
import { useAlmacenDespachos } from '../../hooks/useAlmacenMovimientos'
import { useAlmacenPedidos } from '../../hooks/useAlmacenPedidos'
import type { AlmacenDespacho, AlmacenDespachoEstado } from '../../lib/types'
import { ALMACEN_DESPACHO_ESTADOS } from '../../lib/types'
import { Pagination } from '../../components/ui/Pagination'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const estadoColor: Record<AlmacenDespachoEstado, { bg: string; color: string }> = {
  'Borrador':   { bg: 'var(--n-100)',     color: 'var(--n-600)'      },
  'Despachado': { bg: 'var(--purple-50)', color: 'var(--purple-600)' },
  'Entregado':  { bg: 'var(--green-50)',  color: 'var(--green-600)'  },
  'Cancelado':  { bg: 'var(--red-50)',    color: 'var(--red-600)'    },
}

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 11, fontWeight: 700, color: 'var(--n-500)',
  letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = { padding: '10px 12px', fontSize: 12.5 }

export default function DespachosPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const canAdd    = hasPermission('almacen:despachos', 'add')
  const canDelete = hasPermission('almacen:despachos', 'delete')
  const [filterEstado, setFilterEstado] = useState<AlmacenDespachoEstado | 'Todos'>('Todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const { despachos, total, loading, createDespacho, deleteDespacho } = useAlmacenDespachos({
    estado: filterEstado, page, pageSize, search,
  })
  const { pedidos } = useAlmacenPedidos()

  useEffect(() => { setPage(0) }, [filterEstado, search])

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    pedido_id: null as string | null,
    destinatario: '', direccion: '', movilidad: '', conductor: '', placa: '', guia_remision: '',
    fecha_despacho: new Date().toISOString().split('T')[0],
    estado: 'Borrador' as AlmacenDespachoEstado,
    observaciones: '',
    proyecto_id: null as string | null,
    created_by: user?.id ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AlmacenDespacho | null>(null)

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      const desp = await createDespacho({
        ...form,
        destinatario: form.destinatario || null,
        direccion: form.direccion || null,
        movilidad: form.movilidad || null,
        conductor: form.conductor || null,
        placa: form.placa || null,
        guia_remision: form.guia_remision || null,
        observaciones: form.observaciones || null,
      })
      setShowModal(false)
      navigate(`/almacen/despachos/${desp.id}`)
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
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Despachos</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', margin: '2px 0 0' }}>Salida de materiales con guía de remisión</p>
        </div>
        {canAdd && (
          <button
            onClick={() => { setForm(f => ({ ...f, pedido_id: null, destinatario: '', direccion: '', movilidad: '', conductor: '', placa: '', guia_remision: '', observaciones: '', estado: 'Borrador' })); setError(null); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              background: 'var(--brand-600)', color: '#fff',
              border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Nuevo despacho
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 14, background: 'var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
        {(['Todos', ...ALMACEN_DESPACHO_ESTADOS] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => { setFilterEstado(s as AlmacenDespachoEstado | 'Todos'); setPage(0) }}
            style={{
              flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer',
              background: filterEstado === s ? 'var(--n-0)' : 'transparent',
              textAlign: 'center',
              borderRight: i < ALMACEN_DESPACHO_ESTADOS.length ? '1px solid var(--n-200)' : 'none',
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, lineHeight: 1,
              color: s === 'Todos' ? 'var(--n-700)' : (estadoColor[s as AlmacenDespachoEstado]?.color ?? 'var(--n-700)'),
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
          placeholder="Buscar por destinatario, G/R, conductor…"
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
      ) : despachos.length === 0 ? (
        <div style={{ padding: '56px 24px', textAlign: 'center', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12 }}>
          <Truck size={36} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-600)' }}>
            {search ? 'Sin resultados' : 'Sin despachos registrados'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginTop: 4 }}>
            {search ? 'Prueba con otros filtros' : 'Crea tu primer despacho con el botón de arriba'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
                    {['#', 'Destinatario', 'G/R', 'Movilidad / Conductor', 'Fecha', 'Estado', ''].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {despachos.map((d, idx) => {
                    const ec = estadoColor[d.estado]
                    return (
                      <tr
                        key={d.id}
                        onClick={() => navigate(`/almacen/despachos/${d.id}`)}
                        style={{ borderBottom: idx < despachos.length - 1 ? '1px solid var(--n-100)' : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ ...TD, color: 'var(--n-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          #{String(d.numero).padStart(4, '0')}
                        </td>
                        <td style={TD}>
                          <div style={{ fontWeight: 600, color: 'var(--n-900)' }}>
                            {d.destinatario || <span style={{ color: 'var(--n-400)', fontWeight: 400 }}>Sin destinatario</span>}
                          </div>
                          {d.direccion && <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 1 }}>{d.direccion}</div>}
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)' }}>
                          {d.guia_remision || <span style={{ color: 'var(--n-300)' }}>—</span>}
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)' }}>
                          {d.movilidad && <div style={{ fontSize: 12 }}>{d.movilidad}{d.placa ? ` · ${d.placa}` : ''}</div>}
                          {d.conductor && <div style={{ fontSize: 11, color: 'var(--n-400)' }}>{d.conductor}</div>}
                          {!d.movilidad && !d.conductor && <span style={{ color: 'var(--n-300)' }}>—</span>}
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
                          {format(new Date(d.fecha_despacho), "d MMM yyyy", { locale: es })}
                        </td>
                        <td style={TD}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20, ...ec }}>
                            {d.estado}
                          </span>
                        </td>
                        {canDelete && (
                          <td style={{ ...TD, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setConfirmDelete(d)}
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

      {/* Modal nuevo despacho */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Nuevo despacho</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Pedido asociado (opcional)</label>
                <select value={form.pedido_id ?? ''} onChange={e => setForm(f => ({ ...f, pedido_id: e.target.value || null }))} style={inp({ marginTop: 4 })}>
                  <option value="">— Sin pedido —</option>
                  {pedidos.filter(p => ['Recibido', 'Recibido Parcialmente', 'Enviado'].includes(p.estado)).map(p => (
                    <option key={p.id} value={p.id}>#{String(p.numero).padStart(4, '0')} — {p.solicitado_por ?? 'Sin solicitante'} · {p.estado}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Destinatario</label>
                <input value={form.destinatario} onChange={e => setForm(f => ({ ...f, destinatario: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="Nombre / empresa" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Dirección de entrega</label>
                <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Movilidad</label>
                <input value={form.movilidad} onChange={e => setForm(f => ({ ...f, movilidad: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="Ej. Camión, Furgón…" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Conductor</label>
                <input value={form.conductor} onChange={e => setForm(f => ({ ...f, conductor: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Placa</label>
                <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="ABC-123" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Guía de remisión</label>
                <input value={form.guia_remision} onChange={e => setForm(f => ({ ...f, guia_remision: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Fecha despacho</label>
                <input type="date" value={form.fecha_despacho} onChange={e => setForm(f => ({ ...f, fecha_despacho: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
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
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Eliminar despacho?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>
              Se eliminará el despacho <strong>#{String(confirmDelete.numero).padStart(4, '0')}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={async () => { await deleteDespacho(confirmDelete.id); setConfirmDelete(null) }} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--red-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
