import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Plus, ShoppingCart, Trash2, X, Search, Download } from 'lucide-react'
import { useAlmacenPedidos } from '../../hooks/useAlmacenPedidos'
import type { AlmacenPedido, AlmacenPedidoEstado } from '../../lib/types'
import { ALMACEN_PEDIDO_ESTADOS } from '../../lib/types'
import { useTeamMembers } from '../../hooks/useConfig'
import { Pagination } from '../../components/ui/Pagination'
import { exportPedidos } from '../../lib/exportAlmacenExcel'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const estadoColor: Record<AlmacenPedidoEstado, { bg: string; color: string }> = {
  'En Revisión': { bg: 'var(--n-100)', color: 'var(--n-600)' },
  'En Cotización': { bg: 'var(--blue-50)', color: 'var(--blue-600)' },
  'Pendiente de Aprobación': { bg: 'var(--amber-50)', color: 'var(--amber-700)' },
  'Aprobado': { bg: 'var(--green-50)', color: 'var(--green-600)' },
  'OC Emitida': { bg: 'var(--purple-50)', color: 'var(--purple-600)' },
  'En Tránsito': { bg: 'var(--indigo-50)', color: 'var(--indigo-600)' },
  'Recibido Parcialmente': { bg: 'var(--orange-50)', color: 'var(--orange-600)' },
  'Recibido': { bg: 'var(--green-50)', color: 'var(--green-600)' },
  'Enviado': { bg: 'var(--brand-50)', color: 'var(--brand-700)' },
  'Completado': { bg: 'var(--green-50)', color: 'var(--green-700)' },
  'Cancelado': { bg: 'var(--red-50)', color: 'var(--red-600)' },
}

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 11, fontWeight: 700, color: 'var(--n-500)',
  letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = { padding: '10px 12px', fontSize: 12.5 }

export default function PedidosPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const canAdd    = hasPermission('almacen:pedidos', 'add')
  const canDelete = hasPermission('almacen:pedidos', 'delete')
  const [filterEstado, setFilterEstado] = useState<AlmacenPedidoEstado | 'Todos'>('Todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const { pedidos, total, loading, createPedido, deletePedido } = useAlmacenPedidos(filterEstado, page, pageSize, search)

  useEffect(() => { setPage(0) }, [filterEstado, search])

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    solicitado_por: '', asunto: '', proveedor_sugerido: '',
    fecha_pedido: new Date().toISOString().split('T')[0],
    fecha_requerida: '', observaciones: '',
    estado: 'En Revisión' as AlmacenPedidoEstado,
    proyecto_id: null as string | null,
    created_by: user?.id ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AlmacenPedido | null>(null)

  const { items: teamMembers } = useTeamMembers()
  const [solicitanteSearch, setSolicitanteSearch] = useState('')
  const [solicitanteOpen, setSolicitanteOpen] = useState(false)
  const solicitanteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (solicitanteRef.current && !solicitanteRef.current.contains(e.target as Node))
        setSolicitanteOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      const newPedido = await createPedido({
        ...form,
        asunto: form.asunto || null,
        proveedor_sugerido: form.proveedor_sugerido || null,
        fecha_requerida: form.fecha_requerida || null,
        observaciones: form.observaciones || null,
      })
      setShowModal(false)
      navigate(`/almacen/pedidos/${newPedido.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try { await deletePedido(confirmDelete.id) } catch { }
    setConfirmDelete(null)
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
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Pedidos</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', margin: '2px 0 0' }}>Solicitudes de reposición de materiales</p>
        </div>
        <button
          onClick={() => exportPedidos()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7,
            background: 'var(--n-0)', color: 'var(--n-700)',
            border: '1px solid var(--n-200)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Download size={13} /> Exportar
        </button>
        {canAdd && (
          <button
            onClick={() => { setForm(f => ({ ...f, solicitado_por: '', asunto: '', proveedor_sugerido: '', fecha_requerida: '', observaciones: '', estado: 'En Revisión' })); setError(null); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              background: 'var(--brand-600)', color: '#fff',
              border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Nuevo pedido
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 14, background: 'var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
        {(['Todos', ...ALMACEN_PEDIDO_ESTADOS] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => { setFilterEstado(s as AlmacenPedidoEstado | 'Todos'); setPage(0) }}
            style={{
              flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer',
              background: filterEstado === s ? 'var(--n-0)' : 'transparent',
              textAlign: 'center',
              borderRight: i < ALMACEN_PEDIDO_ESTADOS.length ? '1px solid var(--n-200)' : 'none',
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, lineHeight: 1,
              color: s === 'Todos' ? 'var(--n-700)' : (estadoColor[s as AlmacenPedidoEstado]?.color ?? 'var(--n-700)'),
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
          placeholder="Buscar por solicitante o proveedor…"
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
      ) : pedidos.length === 0 ? (
        <div style={{ padding: '56px 24px', textAlign: 'center', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12 }}>
          <ShoppingCart size={36} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-600)' }}>
            {search ? 'Sin resultados' : 'No hay pedidos registrados'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginTop: 4 }}>
            {search ? 'Prueba con otros filtros' : 'Crea tu primer pedido con el botón de arriba'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
                    {['#', 'Solicitado por', 'Asunto', 'Proveedor sugerido', 'Fecha pedido', 'Requerido', 'Estado', ''].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p, idx) => {
                    const ec = estadoColor[p.estado]
                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/almacen/pedidos/${p.id}`)}
                        style={{ borderBottom: idx < pedidos.length - 1 ? '1px solid var(--n-100)' : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ ...TD, color: 'var(--n-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          #{String(p.numero).padStart(4, '0')}
                        </td>
                        <td style={TD}>
                          <div style={{ fontWeight: 600, color: 'var(--n-900)' }}>
                            {p.solicitado_por || <span style={{ color: 'var(--n-400)', fontWeight: 400 }}>Sin solicitante</span>}
                          </div>
                        </td>
                        <td style={{ ...TD, color: 'var(--n-700)', maxWidth: 220 }}>
                          {p.asunto || <span style={{ color: 'var(--n-300)' }}>—</span>}
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)' }}>
                          {p.proveedor_sugerido || <span style={{ color: 'var(--n-300)' }}>—</span>}
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
                          {format(new Date(p.fecha_pedido), "d MMM yyyy", { locale: es })}
                        </td>
                        <td style={{ ...TD, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
                          {p.fecha_requerida
                            ? format(new Date(p.fecha_requerida), "d MMM yyyy", { locale: es })
                            : <span style={{ color: 'var(--n-300)' }}>—</span>
                          }
                        </td>
                        <td style={TD}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20, ...ec }}>
                            {p.estado}
                          </span>
                        </td>
                        {canDelete && (
                          <td style={{ ...TD, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setConfirmDelete(p)}
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

      {/* Modal nuevo pedido */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Nuevo pedido</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Solicitado por</label>
                <div ref={solicitanteRef} style={{ position: 'relative', marginTop: 4 }}>
                  <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none', zIndex: 1 }} />
                  <input
                    value={solicitanteSearch || form.solicitado_por}
                    onChange={e => { setSolicitanteSearch(e.target.value); setForm(f => ({ ...f, solicitado_por: e.target.value })); setSolicitanteOpen(true) }}
                    onFocus={() => { setSolicitanteSearch(''); setSolicitanteOpen(true) }}
                    placeholder="Buscar colaborador"
                    style={inp({ paddingLeft: 28, paddingRight: form.solicitado_por ? 28 : 10 })}
                  />
                  {form.solicitado_por && (
                    <button onMouseDown={e => { e.preventDefault(); setForm(f => ({ ...f, solicitado_por: '' })); setSolicitanteSearch('') }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)', display: 'flex', padding: 2 }}>
                      <X size={13} />
                    </button>
                  )}
                  {solicitanteOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300, background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto' }}>
                      {teamMembers.filter(m => {
                        const q = (solicitanteSearch || form.solicitado_por).toLowerCase()
                        return m.name.toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q)
                      }).map(m => (
                        <button key={m.id} onMouseDown={() => { setForm(f => ({ ...f, solicitado_por: m.name })); setSolicitanteSearch(''); setSolicitanteOpen(false) }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '8px 12px', border: 'none', background: form.solicitado_por === m.name ? 'var(--brand-50)' : 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--n-100)' }}
                          onMouseEnter={ev => { if (form.solicitado_por !== m.name) ev.currentTarget.style.background = 'var(--n-50)' }}
                          onMouseLeave={ev => { if (form.solicitado_por !== m.name) ev.currentTarget.style.background = 'transparent' }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500, color: form.solicitado_por === m.name ? 'var(--brand-700)' : 'var(--n-900)' }}>{m.name}</span>
                          {m.role && <span style={{ fontSize: 11.5, color: 'var(--n-400)', marginTop: 1 }}>{m.role}</span>}
                        </button>
                      ))}
                      {teamMembers.filter(m => { const q = (solicitanteSearch || form.solicitado_por).toLowerCase(); return m.name.toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q) }).length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--n-400)' }}>Sin resultados</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Asunto</label>
                <input value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))} placeholder="# Deal || # Presupuesto || .." style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Proveedor sugerido</label>
                <input value={form.proveedor_sugerido} onChange={e => setForm(f => ({ ...f, proveedor_sugerido: e.target.value }))} style={inp({ marginTop: 4 })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Fecha pedido</label>
                  <input type="date" value={form.fecha_pedido} onChange={e => setForm(f => ({ ...f, fecha_pedido: e.target.value }))} style={inp({ marginTop: 4 })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Fecha requerida</label>
                  <input type="date" value={form.fecha_requerida} onChange={e => setForm(f => ({ ...f, fecha_requerida: e.target.value }))} style={inp({ marginTop: 4 })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} style={{ ...inp({ marginTop: 4 }), height: 70, resize: 'vertical' }} />
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

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Eliminar pedido?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>
              Se eliminará el pedido <strong>#{String(confirmDelete.numero).padStart(4, '0')}</strong> y sus ítems.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--red-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
