import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Truck, ChevronRight, Trash2, X } from 'lucide-react'
import { useAlmacenDespachos } from '../../hooks/useAlmacenMovimientos'
import type { AlmacenDespacho, AlmacenDespachoEstado } from '../../lib/types'
import { ALMACEN_DESPACHO_ESTADOS } from '../../lib/types'
import { Pagination } from '../../components/ui/Pagination'

const estadoColor: Record<AlmacenDespachoEstado, { bg: string; color: string }> = {
  'Borrador':   { bg: 'var(--n-100)', color: 'var(--n-600)' },
  'Despachado': { bg: '#f5f3ff', color: '#7c3aed' },
  'Entregado':  { bg: '#f0fdf4', color: '#16a34a' },
  'Cancelado':  { bg: '#fef2f2', color: '#dc2626' },
}

export default function DespachosPage() {
  const navigate = useNavigate()
  const [filterEstado, setFilterEstado] = useState<AlmacenDespachoEstado | 'Todos'>('Todos')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const { despachos, total, loading, createDespacho, deleteDespacho } = useAlmacenDespachos({ estado: filterEstado, page, pageSize })

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    destinatario: '',
    direccion: '',
    movilidad: '',
    conductor: '',
    placa: '',
    guia_remision: '',
    fecha_despacho: new Date().toISOString().split('T')[0],
    estado: 'Borrador' as AlmacenDespachoEstado,
    observaciones: '',
    proyecto_id: null as string | null,
    created_by: null as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AlmacenDespacho | null>(null)

  useEffect(() => { setPage(0) }, [filterEstado])

  const filtered = despachos // filtro aplicado en el servidor

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
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
    } finally {
      setSaving(false)
    }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', ...style,
  })

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Despachos</h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '3px 0 0' }}>Salida de materiales con guía de remisión</p>
        </div>
        <button
          onClick={() => { setForm(f => ({ ...f, destinatario: '', direccion: '', movilidad: '', conductor: '', placa: '', guia_remision: '', observaciones: '', estado: 'Borrador' })); setError(null); setShowModal(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--brand-600)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '8px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Nuevo despacho
        </button>
      </div>

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['Todos', ...ALMACEN_DESPACHO_ESTADOS] as const).map(s => {
          const active = filterEstado === s
          const ec = s !== 'Todos' ? estadoColor[s] : { bg: 'var(--n-100)', color: 'var(--n-600)' }
          return (
            <button key={s} onClick={() => setFilterEstado(s as AlmacenDespachoEstado | 'Todos')}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid',
                borderColor: active ? ec.color : 'var(--n-200)',
                background: active ? ec.bg : '#fff',
                color: active ? ec.color : 'var(--n-500)', cursor: 'pointer',
              }}
            >{s}</button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-400)' }}>
          <Truck size={40} style={{ opacity: .3, marginBottom: 8 }} />
          <p style={{ fontSize: 13 }}>Sin despachos registrados</p>
        </div>
      ) : (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => {
            const ec = estadoColor[d.estado]
            return (
              <div
                key={d.id}
                onClick={() => navigate(`/almacen/despachos/${d.id}`)}
                style={{
                  background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10,
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16,
                  cursor: 'pointer', transition: 'box-shadow .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.07)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-400)', minWidth: 48 }}>
                  #{String(d.numero).padStart(4, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-900)' }}>
                    {d.destinatario ?? 'Sin destinatario'}
                    {d.guia_remision && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--n-500)', marginLeft: 8 }}>G/R: {d.guia_remision}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {d.movilidad && <span>🚚 {d.movilidad}</span>}
                    {d.conductor && <span>👤 {d.conductor}</span>}
                    {d.placa && <span>🔢 {d.placa}</span>}
                    {d.direccion && <span>📍 {d.direccion}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 5, ...ec }}>{d.estado}</span>
                <div style={{ fontSize: 11.5, color: 'var(--n-400)', whiteSpace: 'nowrap' }}>
                  {new Date(d.fecha_despacho).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setConfirmDelete(d)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', borderRadius: 5 }}><Trash2 size={14} /></button>
                  <button onClick={() => navigate(`/almacen/despachos/${d.id}`)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)', borderRadius: 5 }}><ChevronRight size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={setPageSize} loading={loading} />
        </>
      )}

      {/* Modal nuevo despacho */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Nuevo despacho</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                <input value={form.movilidad} onChange={e => setForm(f => ({ ...f, movilidad: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="Ej. Camión, Furgón, Moto…" />
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

            {error && <p style={{ color: '#dc2626', fontSize: 12.5, marginTop: 10 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Creando…' : 'Crear y editar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Eliminar despacho?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>
              Se eliminará el despacho <strong>#{String(confirmDelete.numero).padStart(4, '0')}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={async () => { await deleteDespacho(confirmDelete.id); setConfirmDelete(null) }} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
