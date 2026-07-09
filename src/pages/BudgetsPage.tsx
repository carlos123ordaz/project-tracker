import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBudgets } from '../hooks/useBudgets'
import { useProjects } from '../hooks/useProjects'
import { PageLoader } from '../components/ui/Loader'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import Modal from '../components/ui/Modal'
import { getStatusMeta, BUDGET_STATUSES } from '../lib/budgetHelpers'
import type { Budget, BudgetStatus } from '../lib/types'
import { Plus, Pencil, Trash2, FileText, ExternalLink, CheckCircle, Users, DollarSign, LayoutGrid, List } from 'lucide-react'

// ── status badge (with dot) ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const m = getStatusMeta(status)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 6,
      background: m.bg, color: m.color,
      fontSize: 11.5, fontWeight: 550,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.color }} />
      {status}
    </span>
  )
}

// ── Budget form ───────────────────────────────────────────────────────────────
function BudgetForm({
  initial, projects, onSave, onClose,
}: {
  initial?: Budget
  projects: { id: string; name: string }[]
  onSave: (data: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const [name,     setName]     = useState(initial?.name        ?? '')
  const [client,   setClient]   = useState(initial?.client      ?? '')
  const [projId,   setProjId]   = useState(initial?.project_id  ?? '')
  const [status,   setStatus]   = useState<BudgetStatus>(initial?.status ?? 'Borrador')
  const [currency, setCurrency] = useState(initial?.currency    ?? 'USD')
  const [indPct,   setIndPct]   = useState(((initial?.indirect_pct ?? 0.10) * 100).toFixed(1))
  const [utilPct,  setUtilPct]  = useState(((initial?.utility_pct  ?? 0.08) * 100).toFixed(1))
  const [igvPct,   setIgvPct]   = useState(((initial?.igv_pct      ?? 0.18) * 100).toFixed(1))
  const [saving,   setSaving]   = useState(false)

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
      await onSave({
        name: name.trim(), client: client.trim(), project_id: projId || null,
        status, currency,
        indirect_pct: parseFloat(indPct) / 100,
        utility_pct:  parseFloat(utilPct)  / 100,
        igv_pct:      parseFloat(igvPct)   / 100,
        gg_months: 3,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-grid">
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LBL}>Nombre del presupuesto *</label>
          <input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Edificio Torre Norte" required />
        </div>
        <div>
          <label style={LBL}>Cliente</label>
          <input style={INP} value={client} onChange={e => setClient(e.target.value)} placeholder="Nombre del cliente" />
        </div>
        <div>
          <label style={LBL}>Proyecto vinculado</label>
          <select style={{ ...INP, cursor: 'pointer' }} value={projId} onChange={e => setProjId(e.target.value)}>
            <option value="">— Sin proyecto —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={LBL}>Estado</label>
          <select style={{ ...INP, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value as BudgetStatus)}>
            {BUDGET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
          </select>
        </div>
        <div>
          <label style={LBL}>Moneda</label>
          <select style={{ ...INP, cursor: 'pointer' }} value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="PEN">PEN (Soles)</option>
          </select>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--n-150)', paddingTop: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 10 }}>Porcentajes de cálculo</div>
        <div className="form-grid">
          {([['Gastos generales (%)', indPct, setIndPct], ['Utilidad (%)', utilPct, setUtilPct], ['IGV (%)', igvPct, setIgvPct]] as const).map(([lbl, val, set]) => (
            <div key={lbl}>
              <label style={LBL}>{lbl}</label>
              <input type="number" step="0.1" min="0" max="100" style={INP} value={val} onChange={e => set(e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose} type="button">Cancelar</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Crear presupuesto'}
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

// ── page ──────────────────────────────────────────────────────────────────────
export default function BudgetsPage() {
  const { hasPermission } = useAuth()
  const canAdd    = hasPermission('ventas:presupuestos', 'add')
  const canEdit   = hasPermission('ventas:presupuestos', 'edit')
  const canDelete = hasPermission('ventas:presupuestos', 'delete')

  const { budgets, loading, createBudget, updateBudget, deleteBudget } = useBudgets()
  const { projects } = useProjects()
  const navigate     = useNavigate()

  const [query,    setQuery]    = useState('')
  const [statusF,  setStatusF]  = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<Budget | null>(null)
  const [confirmDel, setConfirmDel] = useState<Budget | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const filtered = useMemo(() => budgets.filter(b => {
    if (statusF && b.status !== statusF) return false
    if (query && !(b.name.toLowerCase().includes(query.toLowerCase()) || b.client.toLowerCase().includes(query.toLowerCase()))) return false
    return true
  }), [budgets, statusF, query])

  const approved  = budgets.filter(b => b.status === 'Aprobado').length
  const clients   = new Set(budgets.map(b => b.client).filter(Boolean)).size
  const executing = budgets.filter(b => b.status === 'Ejecutando').length

  if (loading) return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PageLoader />
      </div>
    </div>
  )

  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try { await deleteBudget(confirmDel.id) } finally { setDeleting(false); setConfirmDel(null) }
  }

  const openCreate = () => { setEditing(null); setShowForm(true) }
  const openEdit   = (b: Budget) => { setEditing(b); setShowForm(true) }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>


      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatCard icon={FileText}     label="Presupuestos"    numericValue={filtered.length}  sub="visibles según filtros" accent="brand"   sparkSeed={1.5} sparkBase={filtered.length} />
          <StatCard icon={CheckCircle}  label="Aprobados"       numericValue={approved}         sub="listos para ejecutar"   accent="green"  sparkSeed={2.1} sparkBase={approved + 2} />
          <StatCard icon={DollarSign}   label="En ejecución"    numericValue={executing}        sub="presupuestos activos"   accent="amber"  sparkSeed={3.4} sparkBase={executing + 1} />
          <StatCard icon={Users}        label="Clientes"        numericValue={clients}          sub="empresas o personas"    accent="neutral" />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o cliente…"
            style={{ height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', outline: 'none', width: 300, color: 'var(--n-900)' }}
          />
          <select value={statusF} onChange={e => setStatusF(e.target.value)}
            style={{ height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer', outline: 'none' }}>
            <option value="">Todos los estados</option>
            {BUDGET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-500)' }}>{filtered.length} de {budgets.length}</span>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--n-100)', borderRadius: 7 }}>
            {([['cards', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 5, cursor: 'pointer', border: 'none',
                  background: viewMode === mode ? 'var(--n-0)' : 'transparent',
                  color: viewMode === mode ? 'var(--n-900)' : 'var(--n-500)',
                  boxShadow: viewMode === mode ? 'var(--shadow-xs)' : 'none',
                  transition: 'all .15s',
                }}>
                <Icon size={14} />
              </button>
            ))}
          </div>

          {canAdd && <Button variant="primary" icon={Plus} onClick={openCreate}>Nuevo presupuesto</Button>}
        </div>

        {/* Cards view */}
        {viewMode === 'cards' && (
          filtered.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <FileText size={28} style={{ color: 'var(--n-300)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-700)' }}>Sin presupuestos</div>
              <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 4 }}>
                {query || statusF ? 'Cambia los filtros o crea uno nuevo.' : 'Crea tu primer presupuesto.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filtered.map(b => (
                <div key={b.id} className="card"
                  onClick={() => navigate(`/budgets/${b.id}`)}
                  style={{ padding: 16, cursor: 'pointer', transition: 'box-shadow .15s', display: 'flex', flexDirection: 'column', gap: 10 }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = ''}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--n-900)', lineHeight: 1.35, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--n-600)' }}>
                    {b.client || <span style={{ color: 'var(--n-400)' }}>Sin cliente</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: 11, background: 'var(--n-100)', padding: '2px 8px', borderRadius: 4, color: 'var(--n-700)', fontWeight: 600 }}>{b.currency}</span>
                    <span style={{ fontSize: 11, color: 'var(--n-500)' }}>GG {(b.indirect_pct * 100).toFixed(0)}%</span>
                    <span style={{ fontSize: 11, color: 'var(--n-500)' }}>IGV {(b.igv_pct * 100).toFixed(0)}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                    {canEdit && <IconButton icon={Pencil} title="Editar" size={26} onClick={() => openEdit(b)} />}
                    {canDelete && <IconButton icon={Trash2} title="Eliminar" size={26} danger onClick={() => setConfirmDel(b)} />}
                    <IconButton icon={ExternalLink} title="Abrir editor" size={26} onClick={() => navigate(`/budgets/${b.id}`)} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* List (table) view */}
        {viewMode === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--n-25)' }}>
                  <th style={{ ...TH, width: 44, textAlign: 'right' }}>#</th>
                  <th style={{ ...TH, minWidth: 280 }}>Proyecto</th>
                  <th style={{ ...TH, minWidth: 160 }}>Cliente</th>
                  <th style={{ ...TH, width: 130 }}>Estado</th>
                  <th style={{ ...TH, width: 60, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id}
                    onClick={() => navigate(`/budgets/${b.id}`)}
                    style={{ borderTop: '1px solid var(--n-150)', cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--n-400)' }} className="mono tnum">{i + 1}</td>
                    <td style={TD}>
                      <div style={{ fontWeight: 550, color: 'var(--n-900)' }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1 }}>
                        {b.currency} · GG {(b.indirect_pct * 100).toFixed(0)}% · IGV {(b.igv_pct * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td style={{ ...TD, color: 'var(--n-700)' }}>{b.client || <span style={{ color: 'var(--n-400)' }}>—</span>}</td>
                    <td style={TD}><StatusBadge status={b.status} /></td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', gap: 2 }}>
                        {canEdit && <IconButton icon={Pencil} title="Editar" size={26} onClick={e => { e.stopPropagation(); openEdit(b) }} />}
                        {canDelete && <IconButton icon={Trash2} title="Eliminar" size={26} danger onClick={e => { e.stopPropagation(); setConfirmDel(b) }} />}
                        <IconButton icon={ExternalLink} title="Abrir" size={26} onClick={e => { e.stopPropagation(); navigate(`/budgets/${b.id}`) }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <FileText size={28} style={{ color: 'var(--n-300)', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-700)' }}>Sin presupuestos</div>
                <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 4 }}>
                  {query || statusF ? 'Cambia los filtros o crea uno nuevo.' : 'Crea tu primer presupuesto.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'} size="lg">
        <BudgetForm initial={editing ?? undefined} projects={projects}
          onSave={async data => { editing ? await updateBudget(editing.id, data) : await createBudget(data) }}
          onClose={() => setShowForm(false)} />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Eliminar presupuesto" size="sm">
        {confirmDel && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
              ¿Eliminar <strong>{confirmDel.name}</strong>? Se borrarán todas sus partidas y líneas APU.
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
