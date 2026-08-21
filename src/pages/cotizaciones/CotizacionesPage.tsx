import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCotizaciones } from '../../hooks/useCotizaciones'
import type { Cotizacion, CotizacionStatus, CotizacionSegmento } from '../../lib/types'
import { COTIZACION_STATUSES } from '../../lib/types'
import {
  Plus, Search, X, FileText, Calculator,
  ChevronRight, Trash2, Calendar, Users2,
  MapPin, User,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_STYLE: Record<CotizacionStatus, { bg: string; color: string; border: string }> = {
  'Borrador':    { bg: 'var(--n-100)',      color: 'var(--n-600)',      border: 'var(--n-200)'      },
  'En revisión': { bg: 'var(--amber-50)',   color: 'var(--amber-700)',  border: 'var(--amber-200)'  },
  'Enviada':     { bg: 'var(--blue-50)',    color: 'var(--blue-500)',   border: 'var(--blue-100)'   },
  'Aprobada':    { bg: 'var(--green-50)',   color: 'var(--green-700)',  border: 'var(--green-200)'  },
  'Rechazada':   { bg: 'var(--red-50)',     color: 'var(--red-600)',    border: 'var(--red-100)'    },
}

const SEG_STYLE: Record<CotizacionSegmento, { bg: string; color: string }> = {
  'A': { bg: 'var(--brand-50)',  color: 'var(--brand-700)'  },
  'B': { bg: 'var(--amber-50)',  color: 'var(--amber-700)'  },
  'C': { bg: 'var(--green-50)',  color: 'var(--green-700)'  },
}

export default function CotizacionesPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canAdd    = hasPermission('ventas:cotizaciones', 'add')
  const canDelete = hasPermission('ventas:cotizaciones', 'delete')

  const { cotizaciones, loading, createCotizacion, deleteCotizacion } = useCotizaciones()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<CotizacionStatus | 'Todos'>('Todos')
  const [showNewModal, setShowNewModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const [newForm, setNewForm] = useState({
    titulo: '',
    cliente: '',
    proyecto: '',
    ubicacion: '',
    segmento: 'A' as CotizacionSegmento,
    tipo_cambio: 3.50,
  })

  const filtered = cotizaciones.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = c.titulo.toLowerCase().includes(q)
      || (c.cliente ?? '').toLowerCase().includes(q)
      || (c.proyecto ?? '').toLowerCase().includes(q)
    const matchStatus = filterStatus === 'Todos' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const statCounts = COTIZACION_STATUSES.reduce((acc, s) => {
    acc[s] = cotizaciones.filter(c => c.status === s).length
    return acc
  }, {} as Record<CotizacionStatus, number>)

  function openNew() {
    setFormErr('')
    setNewForm({ titulo: '', cliente: '', proyecto: '', ubicacion: '', segmento: 'A', tipo_cambio: 3.50 })
    setShowNewModal(true)
  }

  async function handleCreate() {
    if (!newForm.titulo.trim()) { setFormErr('El título es requerido'); return }
    setSaving(true)
    try {
      const created = await createCotizacion({
        titulo: newForm.titulo.trim(),
        cliente: newForm.cliente.trim() || null,
        proyecto: newForm.proyecto.trim() || null,
        ubicacion: newForm.ubicacion.trim() || null,
        descripcion: null,
        segmento: newForm.segmento,
        tipo_cambio: newForm.tipo_cambio,
        status: 'Borrador',
        plazo_semanas: null,
        garantia_meses: 12,
        validez_dias: 30,
        notas: null,
        created_by: null,
      })
      setShowNewModal(false)
      navigate(`/cotizaciones/${created.id}`)
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Cotizaciones de Proyectos</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>
            Gestión de propuestas técnico-económicas
          </p>
        </div>

        <div style={{ position: 'relative', flex: '0 0 260px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cotización…"
            style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 30, border: '1px solid var(--n-200)', borderRadius: 7, fontSize: 12, color: 'var(--n-800)', background: 'var(--n-0)', boxSizing: 'border-box' }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as CotizacionStatus | 'Todos')}
          style={{ height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer' }}
        >
          <option value="Todos">Todos los estados</option>
          {COTIZACION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setFilterStatus('Todos')}
              style={{ padding: '3px 10px', borderRadius: 20, border: filterStatus === 'Todos' ? '1.5px solid var(--brand-300)' : '1px solid var(--n-200)', background: filterStatus === 'Todos' ? 'var(--brand-50)' : 'var(--n-0)', cursor: 'pointer', fontSize: 12, color: filterStatus === 'Todos' ? 'var(--brand-700)' : 'var(--n-600)', fontWeight: 600 }}
            >
              {cotizaciones.length} total
            </button>
            {COTIZACION_STATUSES.map(s => {
              const active = filterStatus === s
              const st = STATUS_STYLE[s]
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(prev => prev === s ? 'Todos' : s)}
                  style={{ padding: '3px 10px', borderRadius: 20, border: active ? `1.5px solid ${st.border}` : '1px solid var(--n-200)', background: active ? st.bg : 'var(--n-0)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: active ? st.color : 'var(--n-500)' }}
                >
                  {statCounts[s]} {s}
                </button>
              )
            })}
          </div>

          <div style={{ width: 1, height: 16, background: 'var(--n-200)' }} />

          <Link
            to="/cotizaciones/personal"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', color: 'var(--n-700)', textDecoration: 'none' }}
          >
            <Users2 size={13} /> Personal
          </Link>
          {canAdd && (
            <button
              onClick={openNew}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={13} /> Nueva Cotización
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState hasFilter={!!search || filterStatus !== 'Todos'} onNew={openNew} canAdd={canAdd} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(c => (
            <CotizacionCard
              key={c.id}
              cotizacion={c}
              onOpen={() => navigate(`/cotizaciones/${c.id}`)}
              onDelete={canDelete ? () => setConfirmDelete(c.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* New Modal */}
      {showNewModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewModal(false) }}
        >
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: '20px 22px 18px', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Nueva Cotización</h2>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={14} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <FL>Título *</FL>
                <input autoFocus value={newForm.titulo} onChange={e => setNewForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Automatización planta Ilo" style={iStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <FL>Cliente</FL>
                  <input value={newForm.cliente} onChange={e => setNewForm(p => ({ ...p, cliente: e.target.value }))} placeholder="Nombre del cliente" style={iStyle} />
                </div>
                <div>
                  <FL>Proyecto</FL>
                  <input value={newForm.proyecto} onChange={e => setNewForm(p => ({ ...p, proyecto: e.target.value }))} placeholder="Nombre del proyecto" style={iStyle} />
                </div>
              </div>
              <div>
                <FL>Ubicación</FL>
                <input value={newForm.ubicacion} onChange={e => setNewForm(p => ({ ...p, ubicacion: e.target.value }))} placeholder="Ej: Moquegua, Perú" style={iStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <FL>Segmento</FL>
                  <select value={newForm.segmento} onChange={e => setNewForm(p => ({ ...p, segmento: e.target.value as CotizacionSegmento }))} style={{ ...iStyle, cursor: 'pointer' }}>
                    <option value="A">A — Minería</option>
                    <option value="B">B — Aguas / Saneamiento</option>
                    <option value="C">C — Otros</option>
                  </select>
                </div>
                <div>
                  <FL>Tipo de cambio (S/. por USD)</FL>
                  <input type="number" step="0.01" value={newForm.tipo_cambio} onChange={e => setNewForm(p => ({ ...p, tipo_cambio: parseFloat(e.target.value) || 3.5 }))} style={iStyle} />
                </div>
              </div>
            </div>

            {formErr && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', padding: '7px 11px', borderRadius: 7 }}>{formErr}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowNewModal(false)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12.5, cursor: 'pointer', color: 'var(--n-700)' }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: saving ? 'var(--brand-300)' : 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creando…' : 'Crear y abrir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: '20px 22px', width: 360, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', marginBottom: 6 }}>¿Eliminar cotización?</div>
            <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginBottom: 18 }}>Se eliminarán todas las disciplinas, secciones y partidas. Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12.5, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => { await deleteCotizacion(confirmDelete); setConfirmDelete(null) }} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--danger-fill)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CotizacionCard({ cotizacion: c, onOpen, onDelete }: { cotizacion: Cotizacion; onOpen: () => void; onDelete?: () => void }) {
  const st = STATUS_STYLE[c.status as CotizacionStatus] ?? STATUS_STYLE['Borrador']
  const sg = SEG_STYLE[c.segmento as CotizacionSegmento] ?? SEG_STYLE['B']
  return (
    <div
      onClick={onOpen}
      style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s', display: 'flex', alignItems: 'center', gap: 12 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-200)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.05)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--n-150)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Calculator size={15} style={{ color: 'var(--brand-700)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-400)', letterSpacing: '0.06em' }}>
            COT-{String(c.numero).padStart(3, '0')}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {c.status}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: sg.bg, color: sg.color }}>
            Seg. {c.segmento}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)', marginBottom: 2 }}>{c.titulo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {c.cliente && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--n-600)', fontWeight: 500 }}>
              <User size={10} />{c.cliente}
            </span>
          )}
          {c.ubicacion && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--n-500)' }}>
              <MapPin size={10} />{c.ubicacion}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--n-400)' }}>
            <Calendar size={10} />
            {format(new Date(c.created_at), "d MMM yyyy", { locale: es })}
          </span>
          <span style={{ fontSize: 11, color: 'var(--n-400)' }}>TC: S/. {c.tipo_cambio.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ padding: '5px 6px', borderRadius: 6, border: '1px solid var(--red-100)', background: 'var(--red-50)', cursor: 'pointer', color: 'var(--red-500)' }}
          >
            <Trash2 size={11} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 12, fontWeight: 600 }}>
          Ver <ChevronRight size={12} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ hasFilter, onNew, canAdd }: { hasFilter: boolean; onNew: () => void; canAdd?: boolean }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10 }}>
      <FileText size={26} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-700)', marginBottom: 5 }}>
        {hasFilter ? 'Sin resultados' : 'No hay cotizaciones aún'}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginBottom: 16 }}>
        {hasFilter ? 'Ajusta los filtros para ver más' : 'Crea una cotización para empezar a armar tu propuesta técnico-económica'}
      </div>
      {!hasFilter && canAdd && (
        <button onClick={onNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={13} /> Nueva Cotización
        </button>
      )}
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-600)', marginBottom: 4 }}>{children}</div>
}

const iStyle: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 10px', borderRadius: 6,
  border: '1px solid var(--n-200)', fontSize: 12.5,
  color: 'var(--n-800)', boxSizing: 'border-box', background: 'var(--n-0)',
}
