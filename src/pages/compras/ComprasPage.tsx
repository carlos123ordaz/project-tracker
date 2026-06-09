import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePurchaseComparisons } from '../../hooks/usePurchaseComparisons'
import { useProjects } from '../../hooks/useProjects'
import type { PurchaseComparison, ComparisonStatus } from '../../lib/types'
import { COMPARISON_STATUSES } from '../../lib/types'
import {
  Plus, Search, ShoppingCart, Building2, X,
  FileText, TrendingDown, ChevronRight, Trash2,
  Calendar, FolderOpen,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_STYLE: Record<ComparisonStatus, { bg: string; color: string; border: string }> = {
  'Borrador':      { bg: 'var(--n-100)',    color: 'var(--n-600)',     border: 'var(--n-200)' },
  'En Evaluación': { bg: 'var(--amber-50)', color: 'var(--amber-700)', border: 'var(--amber-200)' },
  'Aprobado':      { bg: 'var(--green-50)', color: 'var(--green-700)', border: 'var(--green-200)' },
  'Cerrado':       { bg: 'var(--brand-50)', color: 'var(--brand-700)', border: 'var(--brand-200)' },
}

const STATUS_COUNT_COLOR: Record<ComparisonStatus, string> = {
  'Borrador':      'var(--n-700)',
  'En Evaluación': 'var(--amber-600)',
  'Aprobado':      'var(--green-700)',
  'Cerrado':       'var(--brand-600)',
}

export default function ComprasPage() {
  const navigate = useNavigate()
  const { comparisons, loading, createComparison, deleteComparison } = usePurchaseComparisons()
  const { projects } = useProjects()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ComparisonStatus | 'Todos'>('Todos')
  const [showNewModal, setShowNewModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const [newForm, setNewForm] = useState({
    title: '', currency: 'PEN', notes: '', status: 'Borrador' as ComparisonStatus,
    project_id: '',
  })

  const filtered = comparisons.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'Todos' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const statCounts = COMPARISON_STATUSES.reduce((acc, s) => {
    acc[s] = comparisons.filter(c => c.status === s).length
    return acc
  }, {} as Record<ComparisonStatus, number>)

  function openNew() {
    setFormErr('')
    setNewForm({ title: '', currency: 'PEN', notes: '', status: 'Borrador', project_id: '' })
    setShowNewModal(true)
  }

  async function handleCreate() {
    if (!newForm.project_id) { setFormErr('Debes seleccionar un proyecto'); return }
    if (!newForm.title.trim()) { setFormErr('El título es requerido'); return }
    setSaving(true)
    try {
      const created = await createComparison({
        title: newForm.title.trim(),
        currency: newForm.currency,
        notes: newForm.notes || null,
        status: newForm.status,
        project_id: newForm.project_id,
      })
      setShowNewModal(false)
      navigate(`/compras/${created.id}`)
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  const projectMap = new Map(projects.map(p => [p.id, p.name]))

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={17} style={{ color: 'var(--brand-600)' }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Compras</h1>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', marginLeft: 44 }}>
            Comparativos de precios entre proveedores
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/compras/proveedores')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--n-200)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--n-700)' }}
          >
            <Building2 size={14} /> Proveedores
          </button>
          <button
            onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={15} /> Nuevo Comparativo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <StatCard label="Total" value={comparisons.length} color="var(--n-700)" />
        {COMPARISON_STATUSES.map(s => (
          <StatCard
            key={s} label={s} value={statCounts[s]}
            color={STATUS_COUNT_COLOR[s]}
            active={filterStatus === s}
            onClick={() => setFilterStatus(prev => (prev === s ? 'Todos' : s))}
          />
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar comparativo…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 10, height: 34, border: '1px solid var(--n-200)', borderRadius: 8, fontSize: 12.5, color: 'var(--n-800)', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as ComparisonStatus | 'Todos')}
          style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12.5, color: 'var(--n-700)', cursor: 'pointer' }}
        >
          <option value="Todos">Todos los estados</option>
          {COMPARISON_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState hasFilter={!!search || filterStatus !== 'Todos'} onNew={openNew} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => (
            <ComparisonCard
              key={c.id}
              comparison={c}
              projectName={c.project_id ? projectMap.get(c.project_id) : undefined}
              onOpen={() => navigate(`/compras/${c.id}`)}
              onDelete={() => setConfirmDelete(c.id)}
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
          <div style={{ background: '#fff', borderRadius: 14, padding: '26px 26px 22px', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Nuevo Comparativo</h2>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <FL>Proyecto *</FL>
                <select
                  value={newForm.project_id}
                  onChange={e => setNewForm(p => ({ ...p, project_id: e.target.value }))}
                  autoFocus
                  style={{ ...iStyle, cursor: 'pointer' }}
                >
                  <option value="">— Seleccionar proyecto —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <FL>Título *</FL>
                <input
                  value={newForm.title}
                  onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Materiales construcción — Lote 3"
                  style={iStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FL>Moneda</FL>
                  <select value={newForm.currency} onChange={e => setNewForm(p => ({ ...p, currency: e.target.value }))} style={{ ...iStyle, cursor: 'pointer' }}>
                    <option value="PEN">PEN — Soles</option>
                    <option value="USD">USD — Dólares</option>
                  </select>
                </div>
                <div>
                  <FL>Estado inicial</FL>
                  <select value={newForm.status} onChange={e => setNewForm(p => ({ ...p, status: e.target.value as ComparisonStatus }))} style={{ ...iStyle, cursor: 'pointer' }}>
                    {COMPARISON_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <FL>Notas (opcional)</FL>
                <textarea value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Descripción o contexto…" style={{ ...iStyle, resize: 'vertical' as const }} />
              </div>
            </div>

            {formErr && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', padding: '8px 12px', borderRadius: 8 }}>{formErr}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowNewModal(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--n-200)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--n-700)' }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: saving ? 'var(--brand-300)' : 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creando…' : 'Crear y abrir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 26, width: 360, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', marginBottom: 8 }}>¿Eliminar comparativo?</div>
            <div style={{ fontSize: 13, color: 'var(--n-500)', marginBottom: 22 }}>Se eliminarán todos los ítems y cotizaciones asociadas. Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--n-200)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => { await deleteComparison(confirmDelete); setConfirmDelete(null) }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--red-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, active, onClick }: { label: string; value: number; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: active ? 'var(--brand-50)' : '#fff', border: active ? '1.5px solid var(--brand-300)' : '1px solid var(--n-150)', borderRadius: 10, padding: '10px 16px', cursor: onClick ? 'pointer' : 'default', textAlign: 'left', transition: 'all .15s' }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1, whiteSpace: 'nowrap' }}>{label}</div>
    </button>
  )
}

function ComparisonCard({ comparison, projectName, onOpen, onDelete }: { comparison: PurchaseComparison; projectName?: string; onOpen: () => void; onDelete: () => void }) {
  const st = STATUS_STYLE[comparison.status]
  return (
    <div
      onClick={onOpen}
      style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-200)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--n-150)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText size={17} style={{ color: 'var(--brand-600)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-400)', letterSpacing: '0.06em' }}>
            PC-{String(comparison.number).padStart(3, '0')}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {comparison.status}
          </span>
          <span style={{ fontSize: 11, color: 'var(--n-400)', fontWeight: 500 }}>{comparison.currency}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-900)', marginBottom: 3 }}>{comparison.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {projectName && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand-600)', fontWeight: 500 }}>
              <FolderOpen size={11} />{projectName}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--n-400)' }}>
            <Calendar size={11} />
            {format(new Date(comparison.created_at), "d MMM yyyy", { locale: es })}
          </span>
          {comparison.notes && (
            <span style={{ fontSize: 11.5, color: 'var(--n-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
              {comparison.notes}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ padding: '6px 7px', borderRadius: 7, border: '1px solid var(--red-100)', background: 'var(--red-50)', cursor: 'pointer', color: 'var(--red-500)' }}
        >
          <Trash2 size={12} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 12.5, fontWeight: 600 }}>
          Ver <ChevronRight size={13} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ hasFilter, onNew }: { hasFilter: boolean; onNew: () => void }) {
  return (
    <div style={{ padding: '52px 24px', textAlign: 'center', background: '#fff', border: '1px solid var(--n-150)', borderRadius: 12 }}>
      <TrendingDown size={36} style={{ color: 'var(--n-300)', marginBottom: 12 }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-700)', marginBottom: 6 }}>
        {hasFilter ? 'Sin resultados' : 'No hay comparativos aún'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--n-400)', marginBottom: 20 }}>
        {hasFilter ? 'Ajusta los filtros para ver más' : 'Crea un comparativo para empezar a cotizar con diferentes proveedores'}
      </div>
      {!hasFilter && (
        <button onClick={onNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Crear comparativo
        </button>
      )}
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-600)', marginBottom: 5 }}>{children}</div>
}

const iStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--n-200)', fontSize: 13,
  color: 'var(--n-800)', boxSizing: 'border-box', background: '#fff',
}
