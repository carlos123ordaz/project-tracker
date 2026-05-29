import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgetResources } from '../hooks/useBudgetResources'
import { PageLoader } from '../components/ui/Loader'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { fmtCurrency } from '../lib/budgetHelpers'
import type { BudgetResource, ResourceKind } from '../lib/types'
import { Plus, Pencil, Trash2, Database, TrendingUp } from 'lucide-react'

// ── kind colors ───────────────────────────────────────────────────────────────
const KIND_COLORS: Record<string, { bg: string; fg: string }> = {
  material:    { bg: '#EFF6FF', fg: '#1D4ED8' },
  labor:       { bg: '#FEF3C7', fg: '#B45309' },
  equipment:   { bg: '#E0E7FF', fg: '#4338CA' },
  subcontrato: { bg: '#F0FDFA', fg: '#0F766E' },
}
const KIND_LABELS: Record<string, string> = {
  material: 'Material', labor: 'Mano de obra', equipment: 'Equipo', subcontrato: 'Subcontrato',
}

// ── Form ─────────────────────────────────────────────────────────────────────
function ResourceForm({
  initial, onSave, onClose,
}: {
  initial?: BudgetResource
  onSave: (data: Omit<BudgetResource, 'id' | 'created_at'>) => Promise<void>
  onClose: () => void
}) {
  const [kind,   setKind]   = useState<ResourceKind>(initial?.kind  ?? 'material')
  const [name,   setName]   = useState(initial?.name   ?? '')
  const [unit,   setUnit]   = useState(initial?.unit   ?? 'und')
  const [price,  setPrice]  = useState(initial?.price  ?? 0)
  const [saving, setSaving] = useState(false)

  const INP: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5, width: '100%',
    border: '1px solid var(--n-200)', borderRadius: 6,
    background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', boxSizing: 'border-box',
  }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ kind, name: name.trim(), unit: unit.trim() || 'und', price: Number(price), sort_order: initial?.sort_order ?? 0 })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-grid">
        <div>
          <label style={LBL}>Tipo</label>
          <select style={{ ...INP, cursor: 'pointer' }} value={kind} onChange={e => setKind(e.target.value as ResourceKind)}>
            <option value="material">Material</option>
            <option value="labor">Mano de obra</option>
            <option value="equipment">Equipo</option>
            <option value="subcontrato">Subcontrato</option>
          </select>
        </div>
        <div>
          <label style={LBL}>Unidad</label>
          <input style={INP} value={unit} onChange={e => setUnit(e.target.value)} placeholder="m2, kg, hr, und…" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LBL}>Nombre / descripción *</label>
          <input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Cemento Portland Tipo I" required />
        </div>
        <div>
          <label style={LBL}>Precio unitario</label>
          <input type="number" step="0.01" min="0" style={INP} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose} type="button">Cancelar</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Agregar recurso'}
        </Button>
      </div>
    </form>
  )
}

// ── table helpers ─────────────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 10.5,
  color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle', fontSize: 12.5 }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BudgetResourcesPage() {
  const { resources, loading, createResource, updateResource, deleteResource } = useBudgetResources()

  const [query,    setQuery]    = useState('')
  const [kind,     setKind]     = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<BudgetResource | null>(null)
  const [confirmDel, setConfirmDel] = useState<BudgetResource | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const kinds = useMemo(() => [
    { id: 'all',         label: 'Todos',        count: resources.length },
    { id: 'material',    label: 'Materiales',   count: resources.filter(r => r.kind === 'material').length,    color: '#1D4ED8' },
    { id: 'labor',       label: 'Mano de obra', count: resources.filter(r => r.kind === 'labor').length,       color: '#B45309' },
    { id: 'equipment',   label: 'Equipos',      count: resources.filter(r => r.kind === 'equipment').length,   color: '#4338CA' },
    { id: 'subcontrato', label: 'Subcontratos', count: resources.filter(r => r.kind === 'subcontrato').length, color: '#0F766E' },
  ], [resources])

  const filtered = useMemo(() => resources.filter(r => {
    if (kind !== 'all' && r.kind !== kind) return false
    if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [resources, kind, query])

  const navigate = useNavigate()

  if (loading) return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  )

  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try { await deleteResource(confirmDel.id) } finally { setDeleting(false); setConfirmDel(null) }
  }
  const openEdit   = (r: BudgetResource) => { setEditing(r); setShowForm(true) }
  const openCreate = () => { setEditing(null); setShowForm(true) }

  return (
    <div className="fade-in" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Vertical module rail */}
      <aside style={{ flex: '0 0 200px', width: 200, borderRight: '1px solid var(--n-200)', background: 'var(--n-25)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <nav style={{ flex: 1, padding: 8 }}>
          {[
            { id: 'prices',  label: 'Base de precios', Icon: Database,   path: '/budgets/resources', active: true  },
            { id: 'reports', label: 'Reportes',        Icon: TrendingUp, path: '/budgets/reports',   active: false },
          ].map(({ id, label, Icon, path, active: on }) => (
            <button key={id} onClick={() => navigate(path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                padding: '0 10px', height: 33, borderRadius: 7, marginBottom: 1,
                cursor: 'pointer', textAlign: 'left', position: 'relative',
                background: on ? 'var(--brand-50)' : 'transparent',
                color: on ? 'var(--brand-700)' : 'var(--n-700)',
                fontWeight: on ? 600 : 500, fontSize: 12.5,
                border: 'none', transition: 'background .14s, color .14s',
              }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.background = 'var(--n-100)'; e.currentTarget.style.color = 'var(--n-900)'; } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.background = on ? 'var(--brand-50)' : 'transparent'; e.currentTarget.style.color = on ? 'var(--brand-700)' : 'var(--n-700)'; } }}
            >
              {on && <span style={{ position: 'absolute', left: 0, top: 7, bottom: 7, width: 2, background: 'var(--brand-600)', borderRadius: 2 }} />}
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar recurso…"
            style={{ height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', outline: 'none', width: 280, color: 'var(--n-900)' }}
          />
          <div style={{ flex: 1 }} />
          <Button variant="primary" icon={Plus} onClick={openCreate}>Nuevo recurso</Button>
        </div>

        {/* Kind chips with counts */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {kinds.map(k => {
            const active = kind === k.id
            return (
              <button key={k.id} onClick={() => setKind(k.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 30, padding: '0 12px', borderRadius: 99, cursor: 'pointer',
                fontSize: 12, fontWeight: active ? 600 : 500,
                border: active ? `1.5px solid ${k.color ?? 'var(--brand-600)'}` : '1px solid var(--n-200)',
                background: active ? ((k.color ?? '') + '15' || 'var(--brand-50)') : 'var(--n-0)',
                color: active ? (k.color ?? 'var(--brand-700)') : 'var(--n-600)',
              }}>
                {k.label}
                <span className="mono tnum" style={{ fontSize: 10.5, opacity: 0.75 }}>{k.count}</span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)' }}>
                <th style={{ ...TH, minWidth: 280 }}>Nombre</th>
                <th style={{ ...TH, width: 140 }}>Tipo</th>
                <th style={{ ...TH, width: 80, textAlign: 'center' }}>Unidad</th>
                <th style={{ ...TH, width: 140, textAlign: 'right' }}>Precio</th>
                <th style={{ ...TH, width: 80, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const kc = KIND_COLORS[r.kind] ?? KIND_COLORS['material']
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--n-150)', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...TD, fontWeight: 550, color: 'var(--n-900)' }}>{r.name}</td>
                    <td style={TD}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 5, background: kc.bg, color: kc.fg, fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: kc.fg }} />
                        {KIND_LABELS[r.kind] ?? r.kind}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center', color: 'var(--n-600)' }} className="mono">{r.unit}</td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--n-900)' }} className="mono tnum">
                      {fmtCurrency(r.price)}
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', gap: 2 }}>
                        <IconButton icon={Pencil} title="Editar" size={26} onClick={() => openEdit(r)} />
                        <IconButton icon={Trash2} title="Eliminar" size={26} danger onClick={() => setConfirmDel(r)} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <Database size={28} style={{ color: 'var(--n-300)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-700)' }}>Sin resultados</div>
              <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 4 }}>Cambia los filtros o agrega un recurso.</div>
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar recurso' : 'Nuevo recurso'}>
        <ResourceForm initial={editing ?? undefined}
          onSave={async data => { editing ? await updateResource(editing.id, data) : await createResource(data) }}
          onClose={() => setShowForm(false)} />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Eliminar recurso" size="sm">
        {confirmDel && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
              ¿Eliminar <strong>{confirmDel.name}</strong>? Las líneas APU que lo usen serán eliminadas.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setConfirmDel(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
