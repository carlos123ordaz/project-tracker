import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBudget } from '../hooks/useBudgets'
import { useBudgetItems } from '../hooks/useBudgetItems'
import { useBudgetResources } from '../hooks/useBudgetResources'
import { PageLoader } from '../components/ui/Loader'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import BudgetsSubNav from '../components/budget/BudgetsSubNav'
import {
  getStatusMeta, BUDGET_STATUSES, RESOURCE_KINDS,
  getItemUnitPrice, computeBudgetTotals, buildResourceMap,
  fmtCurrency, fmtNumber,
} from '../lib/budgetHelpers'
import type { Budget, BudgetItem, BudgetResource, BudgetStatus, ApuLine } from '../lib/types'
import { ArrowLeft, Plus, Trash2, Pencil, ChevronDown, X } from 'lucide-react'
import Modal from '../components/ui/Modal'

// ── Editable cell (number only, qty/unit_price) ───────────────────────────────
function EditableCell({ value, onChange, decimals = 2 }: { value: number; onChange: (v: number) => void; decimals?: number }) {
  const [editing, setEditing] = useState(false)
  const [tmp,     setTmp]     = useState(value)

  const commit = () => { setEditing(false); onChange(tmp) }

  if (!editing) return (
    <span onClick={() => { setTmp(value); setEditing(true) }}
      className="mono tnum"
      style={{ display: 'inline-block', minWidth: 60, padding: '2px 6px', borderRadius: 4, cursor: 'text', color: 'var(--n-800)', transition: 'background .12s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--n-100)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
  return (
    <input autoFocus type="number" value={tmp}
      onChange={e => setTmp(parseFloat(e.target.value) || 0)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      style={{
        width: 84, padding: '2px 6px',
        border: '1.5px solid var(--brand-500)', borderRadius: 4, outline: 'none',
        textAlign: 'right', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--n-900)',
        background: '#fff', boxShadow: '0 0 0 3px rgba(79,70,229,.12)',
      }}
    />
  )
}

// ── Summary panel ─────────────────────────────────────────────────────────────
function SummaryPanel({ budget, items, apuLines, resources }: {
  budget: Budget; items: BudgetItem[]; apuLines: ApuLine[]; resources: BudgetResource[]
}) {
  const rMap = useMemo(() => buildResourceMap(resources), [resources])
  const t    = computeBudgetTotals(budget, items, apuLines, rMap)
  const cur  = budget.currency
  const itemCount = items.filter(i => i.type === 'item').length

  const SumRow = ({ label, sub, value, bold = false, large = false }: { label: string; sub?: string; value: number; bold?: boolean; large?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontSize: large ? 13 : 12, color: bold ? 'var(--n-900)' : 'var(--n-700)', fontWeight: bold ? 600 : 500 }}>
        {label}
        {sub && <span className="mono" style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--n-500)', fontWeight: 500 }}>{sub}</span>}
      </span>
      <span className="mono tnum" style={{ fontSize: large ? 15 : 12.5, fontWeight: bold ? 700 : 550, color: 'var(--n-900)' }}>
        {fmtCurrency(value, cur)}
      </span>
    </div>
  )

  const total = t.direct + t.indirect + t.utility + t.igv

  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Resumen</div>
      <h2 style={{ fontSize: 15, marginBottom: 14, color: 'var(--n-900)' }}>Total del presupuesto</h2>

      <div className="mono tnum" style={{ fontSize: 30, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 4 }}>
        {fmtCurrency(t.total, cur)}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginBottom: 18 }}>
        {cur} · {itemCount} partida{itemCount !== 1 ? 's' : ''}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <SumRow label="Costo directo"     value={t.direct} />
        <SumRow label="Costos indirectos" sub={`${(budget.indirect_pct * 100).toFixed(0)}%`} value={t.indirect} />
        <SumRow label="Utilidad"          sub={`${(budget.utility_pct  * 100).toFixed(0)}%`} value={t.utility} />
        <SumRow label="Subtotal"          value={t.subtotal} bold />
        <SumRow label="IGV"               sub={`${(budget.igv_pct * 100).toFixed(0)}%`}      value={t.igv} />
        <div style={{ height: 1, background: 'var(--n-200)', margin: '8px 0' }} />
        <SumRow label="Total" value={t.total} bold large />
      </div>

      {/* Distribution bar */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 6 }}>Distribución</div>
        <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
          {total > 0 && <>
            <div title="Costo directo" style={{ flex: t.direct,   background: 'var(--brand-500)' }} />
            <div title="Indirectos"    style={{ flex: t.indirect, background: '#A78BFA' }} />
            <div title="Utilidad"      style={{ flex: t.utility,  background: '#10B981' }} />
            <div title="IGV"           style={{ flex: t.igv,      background: 'var(--n-300)' }} />
          </>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, fontSize: 10.5, color: 'var(--n-600)' }}>
          {[['var(--brand-500)', 'Directo'], ['#A78BFA', 'Indir.'], ['#10B981', 'Utilidad'], ['var(--n-300)', 'IGV']].map(([color, label]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── APU panel ─────────────────────────────────────────────────────────────────
function APUPanel({
  item, apuLines, resources, onUpsert, onDeleteLine, onClose,
}: {
  item: BudgetItem; apuLines: ApuLine[]; resources: BudgetResource[]
  onUpsert: (itemId: string, resourceId: string, qty: number) => Promise<void>
  onDeleteLine: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [tab,         setTab]        = useState<'all' | 'material' | 'labor' | 'equipment'>('all')
  const [selResource, setSelResource] = useState('')
  const [qty,         setQty]        = useState('1')
  const [adding,      setAdding]     = useState(false)

  const rMap    = useMemo(() => buildResourceMap(resources), [resources])
  const myLines = apuLines.filter(l => l.item_id === item.id)

  const sections = useMemo(() => ({
    material:  myLines.filter(l => rMap.get(l.resource_id)?.kind === 'material'),
    labor:     myLines.filter(l => rMap.get(l.resource_id)?.kind === 'labor'),
    equipment: myLines.filter(l => rMap.get(l.resource_id)?.kind === 'equipment'),
  }), [myLines, rMap])

  const sectionTotals = {
    material:  sections.material.reduce((s, l)  => s + l.qty * (rMap.get(l.resource_id)?.price ?? 0), 0),
    labor:     sections.labor.reduce((s, l)     => s + l.qty * (rMap.get(l.resource_id)?.price ?? 0), 0),
    equipment: sections.equipment.reduce((s, l) => s + l.qty * (rMap.get(l.resource_id)?.price ?? 0), 0),
  }
  const total = sectionTotals.material + sectionTotals.labor + sectionTotals.equipment

  const kindColors = {
    material:  { bg: '#EFF6FF', fg: '#1D4ED8' },
    labor:     { bg: '#FEF3C7', fg: '#B45309' },
    equipment: { bg: '#E0E7FF', fg: '#4338CA' },
  }

  const tabs = [
    { id: 'all',       label: 'Todo' },
    { id: 'material',  label: 'Materiales' },
    { id: 'labor',     label: 'M. de obra' },
    { id: 'equipment', label: 'Equipos' },
  ] as const

  const visibleRows = tab === 'all' ? myLines : myLines.filter(l => rMap.get(l.resource_id)?.kind === tab)
  const usedIds     = new Set(myLines.map(l => l.resource_id))
  const available   = resources.filter(r => !usedIds.has(r.id))

  const handleAdd = async () => {
    if (!selResource) return
    setAdding(true)
    try { await onUpsert(item.id, selResource, parseFloat(qty) || 1) }
    finally { setAdding(false); setSelResource(''); setQty('1') }
  }

  const INP: React.CSSProperties = {
    height: 30, padding: '0 8px', fontSize: 12, border: '1px solid var(--n-200)',
    borderRadius: 5, background: 'var(--n-0)', outline: 'none', color: 'var(--n-900)',
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── TOP: header + total card + tabs (fixed) ── */}
      <div style={{ flex: '0 0 auto', padding: '18px 18px 0', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              APU · {item.code || 'Sin código'}
            </div>
            <h2 style={{ fontSize: 14, marginTop: 2, color: 'var(--n-900)' }}>{item.name}</h2>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 4 }}>
              Costo unitario por <strong className="mono" style={{ color: 'var(--n-900)' }}>{item.unit}</strong>
            </div>
          </div>
          <IconButton icon={X} onClick={onClose} size={26} />
        </div>

        {/* Total card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-50) 0%, transparent 70%)',
          border: '1px solid var(--brand-100)', borderRadius: 10,
          padding: '12px 14px', marginBottom: 14, marginTop: 8,
        }}>
          <div style={{ fontSize: 10.5, color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Costo unitario
          </div>
          <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.02em', marginTop: 2 }}>
            {fmtNumber(total)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
            {(['material', 'labor', 'equipment'] as const).map(k => (
              <div key={k} style={{ padding: '6px 8px', borderRadius: 6, background: kindColors[k].bg, color: kindColors[k].fg }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.9 }}>
                  {k === 'material' ? 'Mat.' : k === 'labor' ? 'M.O.' : 'Equipo'}
                </div>
                <div className="mono tnum" style={{ fontSize: 11.5, fontWeight: 700, marginTop: 1 }}>
                  {fmtNumber(sectionTotals[k])}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, padding: 2, background: 'var(--n-100)', borderRadius: 7 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '5px 8px', fontSize: 11, fontWeight: 600, borderRadius: 5,
                background: tab === t.id ? 'var(--n-0)' : 'transparent',
                color: tab === t.id ? 'var(--n-900)' : 'var(--n-600)',
                boxShadow: tab === t.id ? 'var(--shadow-xs)' : 'none',
                cursor: 'pointer', border: 'none', transition: 'all .15s',
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── MIDDLE: resource rows (scrollable) ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 18px' }}>
        {tab === 'all'
          ? (['material', 'labor', 'equipment'] as const).map(k =>
              sections[k].length === 0 ? null : (
                <div key={k}>
                  <div style={{ padding: '7px 8px 4px', fontSize: 10, fontWeight: 700, color: kindColors[k].fg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {k === 'material' ? 'Materiales' : k === 'labor' ? 'Mano de obra' : 'Equipos'}
                  </div>
                  {sections[k].map(l => <APURow key={l.id} line={l} rMap={rMap} onDeleteLine={onDeleteLine} onUpdate={newQty => onUpsert(item.id, l.resource_id, newQty)} />)}
                </div>
              )
            )
          : visibleRows.map(l => <APURow key={l.id} line={l} rMap={rMap} onDeleteLine={onDeleteLine} onUpdate={newQty => onUpsert(item.id, l.resource_id, newQty)} />)}
        {myLines.length === 0 && (
          <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
            Sin recursos. Agrega uno abajo.
          </div>
        )}
      </div>

      {/* ── BOTTOM: add resource (always visible) ── */}
      {available.length > 0 && (
        <div style={{ flex: '0 0 auto', padding: '10px 18px 18px', borderTop: '1px solid var(--n-150)', background: 'var(--n-0)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', marginBottom: 6 }}>Agregar recurso</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={selResource} onChange={e => setSelResource(e.target.value)}
              style={{ ...INP, flex: 1, cursor: 'pointer' }}>
              <option value="">— Seleccionar —</option>
              {RESOURCE_KINDS.map(k => (
                <optgroup key={k.value} label={k.label}>
                  {available.filter(r => r.kind === k.value).map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input type="number" step="any" min="0" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="Cant." style={{ ...INP, width: 52, textAlign: 'right' }} />
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={!selResource || adding} icon={Plus}>
              {adding ? '…' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function APURow({ line, rMap, onDeleteLine, onUpdate }: {
  line: ApuLine; rMap: Map<string, BudgetResource>
  onDeleteLine: (id: string) => Promise<void>; onUpdate: (qty: number) => void
}) {
  const r       = rMap.get(line.resource_id)
  const partial = line.qty * (r?.price ?? 0)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 36px 50px 60px 32px',
      gap: 6, alignItems: 'center', padding: '6px 8px', borderRadius: 5, transition: 'background .12s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r?.name ?? '—'}</div>
      </div>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--n-500)', textAlign: 'center' }}>{r?.unit}</div>
      <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-700)', textAlign: 'right' }}>
        <input type="number" step="any" min="0" defaultValue={line.qty}
          onBlur={e => { const v = parseFloat(e.target.value); if (v !== line.qty) onUpdate(v) }}
          style={{ width: 44, padding: '1px 4px', border: '1px solid var(--n-200)', borderRadius: 4, outline: 'none', textAlign: 'right', fontSize: 11.5, fontFamily: 'inherit', background: 'var(--n-0)' }}
        />
      </div>
      <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-900)', textAlign: 'right', fontWeight: 600 }}>{fmtNumber(partial)}</div>
      <button onClick={() => onDeleteLine(line.id)}
        style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--n-400)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-50)'; e.currentTarget.style.color = 'var(--red-600)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-400)' }}
      >
        <X size={11} />
      </button>
    </div>
  )
}

// ── Table helpers ─────────────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '8px 12px', fontWeight: 600, fontSize: 10.5,
  color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap', textAlign: 'left',
}
const TD: React.CSSProperties = { padding: '6px 12px', verticalAlign: 'middle', fontSize: 12.5 }

// ── Budget header ─────────────────────────────────────────────────────────────
function BudgetHeaderSection({ budget, onUpdate, navigate }: {
  budget: Budget; onUpdate: (u: Partial<Budget>) => Promise<void>; navigate: (path: string) => void
}) {
  const meta   = getStatusMeta(budget.status)
  const [showEditModal, setShowEditModal] = useState(false)

  return (
    <>
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--n-150)',
        background: 'var(--n-0)', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16, flex: '0 0 auto',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--n-500)', marginBottom: 4 }}>
            <button onClick={() => navigate('/budgets')} style={{ cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--n-500)', fontSize: 11.5 }}>
              <ArrowLeft size={11} /> Presupuestos
            </button>
            <span style={{ color: 'var(--n-300)' }}>/</span>
            <span>{budget.client || 'Sin cliente'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 18, color: 'var(--n-900)', margin: 0 }}>{budget.name}</h1>
            <select value={budget.status} onChange={e => onUpdate({ status: e.target.value as BudgetStatus })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 9px', borderRadius: 6,
                background: meta.bg, color: meta.color,
                fontSize: 11.5, fontWeight: 550, cursor: 'pointer',
                border: `1px solid ${meta.color}40`, outline: 'none',
              }}>
              {BUDGET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button icon={Pencil} onClick={() => setShowEditModal(true)}>Editar metadatos</Button>
        </div>
      </div>

      {showEditModal && (
        <BudgetMetaModal budget={budget} onSave={async data => { await onUpdate(data); setShowEditModal(false) }} onClose={() => setShowEditModal(false)} />
      )}
    </>
  )
}

function BudgetMetaModal({ budget, onSave, onClose }: {
  budget: Budget; onSave: (data: Partial<Budget>) => Promise<void>; onClose: () => void
}) {
  const [name,   setName]   = useState(budget.name)
  const [client, setClient] = useState(budget.client)
  const [saving, setSaving] = useState(false)
  const INP: React.CSSProperties = { height: 32, padding: '0 10px', fontSize: 12.5, width: '100%', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', outline: 'none', boxSizing: 'border-box', color: 'var(--n-900)' }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }
  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await onSave({ name: name.trim(), client: client.trim() }) } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title="Editar metadatos">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={LBL}>Nombre</label><input style={INP} value={name} onChange={e => setName(e.target.value)} required /></div>
        <div><label style={LBL}>Cliente</label><input style={INP} value={client} onChange={e => setClient(e.target.value)} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Add item form modal ───────────────────────────────────────────────────────
function AddItemModal({ budgetId, groups, defaultGroupId, onAdd, onClose }: {
  budgetId: string; groups: BudgetItem[]; defaultGroupId?: string
  onAdd: (payload: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const [type,   setType]   = useState<'item' | 'group'>('item')
  const [code,   setCode]   = useState('')
  const [name,   setName]   = useState('')
  const [unit,   setUnit]   = useState('m2')
  const [qty,    setQty]    = useState('1')
  const [uprice, setUprice] = useState('0')
  const [gid,    setGid]    = useState(defaultGroupId ?? '')
  const [saving, setSaving] = useState(false)

  const INP: React.CSSProperties = { height: 32, padding: '0 10px', fontSize: 12.5, width: '100%', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', outline: 'none', boxSizing: 'border-box', color: 'var(--n-900)' }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await onAdd({
        budget_id: budgetId, type,
        parent_id: type === 'item' ? (gid || null) : null,
        code: code.trim(), name: name.trim(),
        unit: type === 'group' ? '' : unit.trim() || 'm2',
        qty: parseFloat(qty) || 1,
        unit_price: parseFloat(uprice) || 0,
        sort_order: 0,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={type === 'group' ? 'Nuevo capítulo' : 'Nueva partida'}>
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, padding: 3, background: 'var(--n-100)', borderRadius: 8 }}>
          {(['item', 'group'] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)} style={{
              flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: 'none',
              background: type === t ? 'var(--n-0)' : 'transparent',
              color: type === t ? 'var(--n-900)' : 'var(--n-600)',
              boxShadow: type === t ? 'var(--shadow-xs)' : 'none',
            }}>
              {t === 'group' ? 'Capítulo / Grupo' : 'Partida'}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <div>
            <label style={LBL}>Código</label>
            <input style={INP} value={code} onChange={e => setCode(e.target.value)} placeholder="01.01" />
          </div>
          {type === 'item' && (
            <div>
              <label style={LBL}>Unidad</label>
              <input style={INP} value={unit} onChange={e => setUnit(e.target.value)} placeholder="m2, kg…" />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LBL}>Descripción *</label>
            <input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la partida o capítulo" required />
          </div>
          {type === 'item' && <>
            <div>
              <label style={LBL}>Metrado</label>
              <input type="number" step="any" min="0" style={INP} value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Precio unit.</label>
              <input type="number" step="any" min="0" style={INP} value={uprice} onChange={e => setUprice(e.target.value)} />
            </div>
            {groups.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LBL}>Capítulo (opcional)</label>
                <select style={{ ...INP, cursor: 'pointer' }} value={gid} onChange={e => setGid(e.target.value)}>
                  <option value="">— Sin capítulo —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.code ? `${g.code} ` : ''}{g.name}</option>)}
                </select>
              </div>
            )}
          </>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Creando…' : 'Agregar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BudgetEditorPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const { budget, loading: bLoad, updateBudget } = useBudget(id)
  const { items, apuLines, loading: iLoad, createItem, updateItem, deleteItem, upsertApuLine, deleteApuLine } = useBudgetItems(id)
  const { resources, loading: rLoad } = useBudgetResources()

  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [apuItem,    setApuItem]    = useState<BudgetItem | null>(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [addGroupId, setAddGroupId] = useState<string | undefined>(undefined)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const resourceMap = useMemo(() => buildResourceMap(resources), [resources])

  const groups  = useMemo(() => items.filter(it => it.type === 'group').sort((a, b) => a.sort_order - b.sort_order), [items])
  const childOf = useCallback((gid: string) => items.filter(it => it.parent_id === gid && it.type === 'item').sort((a, b) => a.sort_order - b.sort_order), [items])
  const orphans = useMemo(() => items.filter(it => it.type === 'item' && !it.parent_id).sort((a, b) => a.sort_order - b.sort_order), [items])

  const toggleGroup = (gid: string) => setExpanded(prev => { const s = new Set(prev); s.has(gid) ? s.delete(gid) : s.add(gid); return s })

  const handleDelete = async (itemId: string) => {
    if (apuItem?.id === itemId) setApuItem(null)
    await deleteItem(itemId)
    setConfirmDel(null)
  }

  const groupTotals = useMemo(() => {
    const m: Record<string, number> = {}
    items.forEach(it => {
      if (it.type === 'item' && it.parent_id) {
        m[it.parent_id] = (m[it.parent_id] || 0) + it.qty * getItemUnitPrice(it, apuLines, resourceMap)
      }
    })
    return m
  }, [items, apuLines, resourceMap])

  const totalDirect = useMemo(() =>
    items.filter(it => it.type === 'item').reduce((s, it) => s + it.qty * getItemUnitPrice(it, apuLines, resourceMap), 0),
    [items, apuLines, resourceMap]
  )

  if (bLoad || iLoad || rLoad) return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BudgetsSubNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PageLoader /></div>
    </div>
  )
  if (!budget) return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BudgetsSubNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-500)', fontSize: 13 }}>
        Presupuesto no encontrado.
        <Button onClick={() => navigate('/budgets')} style={{ marginLeft: 12 }}>Volver</Button>
      </div>
    </div>
  )

  let gCount = 0

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <BudgetsSubNav />
      <BudgetHeaderSection budget={budget} onUpdate={async p => { await updateBudget(p) }} navigate={navigate} />

      {/* Editor body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--n-50)' }}>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 14px 24px' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                  <th style={{ ...TH, width: 26, padding: '8px 4px 8px 12px' }}></th>
                  <th style={{ ...TH, width: 80 }}>Código</th>
                  <th style={{ ...TH, minWidth: 320 }}>Descripción</th>
                  <th style={{ ...TH, width: 56, textAlign: 'center' }}>Und</th>
                  <th style={{ ...TH, width: 100, textAlign: 'right' }}>Metrado</th>
                  <th style={{ ...TH, width: 120, textAlign: 'right' }}>P. Unit.</th>
                  <th style={{ ...TH, width: 130, textAlign: 'right' }}>Parcial</th>
                  <th style={{ ...TH, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {/* Groups */}
                {groups.map(group => {
                  gCount++
                  const isOpen = !expanded.has(group.id)
                  const children = childOf(group.id)
                  let cCount = 0
                  return [
                    <tr key={group.id}
                      style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)' }}
                    >
                      <td style={{ ...TD, padding: '8px 4px 8px 12px', cursor: 'pointer' }} onClick={() => toggleGroup(group.id)}>
                        <ChevronDown size={14} style={{ color: 'var(--brand-700)', transform: isOpen ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} />
                      </td>
                      <td style={TD} className="mono tnum">
                        <span style={{ fontWeight: 700, color: 'var(--brand-700)' }}>{group.code}</span>
                      </td>
                      <td style={TD}>
                        <span style={{ fontWeight: 600, color: 'var(--n-900)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11.5 }}>
                          {group.name}
                        </span>
                      </td>
                      <td style={TD} /><td style={TD} /><td style={TD} />
                      <td style={{ ...TD, textAlign: 'right' }} className="mono tnum">
                        <span style={{ fontWeight: 600, color: 'var(--brand-700)' }}>{fmtNumber(groupTotals[group.id] ?? 0)}</span>
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 2 }}>
                          <IconButton icon={Plus} title="Agregar partida en este capítulo" size={22}
                            onClick={() => { setAddGroupId(group.id); setShowAdd(true) }} />
                          <IconButton icon={Trash2} title="Eliminar capítulo" size={22} danger
                            onClick={() => setConfirmDel(group.id)} />
                        </div>
                      </td>
                    </tr>,
                    ...(isOpen ? children.map(it => {
                      cCount++
                      const up       = getItemUnitPrice(it, apuLines, resourceMap)
                      const subtotal = it.qty * up
                      const hasApu   = apuLines.some(l => l.item_id === it.id)
                      const isSel    = apuItem?.id === it.id
                      return (
                        <tr key={it.id}
                          style={{ borderTop: '1px solid var(--n-150)', background: isSel ? 'var(--brand-50)' : 'transparent', transition: 'background .12s', cursor: 'pointer' }}
                          onClick={() => setApuItem(isSel ? null : it)}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--n-25)' }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                        >
                          <td style={{ ...TD, padding: '6px 4px 6px 24px' }} />
                          <td style={{ ...TD, padding: '6px 12px' }} className="mono tnum">
                            <span style={{ color: 'var(--n-500)', fontSize: 11 }}>{it.code}</span>
                          </td>
                          <td style={{ ...TD, padding: '6px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'var(--n-900)' }}>{it.name}</span>
                              {hasApu && (
                                <button onClick={() => setApuItem(isSel ? null : it)}
                                  style={{
                                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, cursor: 'pointer',
                                    background: isSel ? 'var(--brand-600)' : 'var(--brand-50)',
                                    color: isSel ? '#fff' : 'var(--brand-700)',
                                    border: `1px solid ${isSel ? 'var(--brand-600)' : 'var(--brand-200)'}`,
                                  }}>APU</button>
                              )}
                            </div>
                          </td>
                          <td style={{ ...TD, padding: '6px 12px', textAlign: 'center', color: 'var(--n-600)' }} className="mono">{it.unit}</td>
                          <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
                            <EditableCell value={it.qty} onChange={v => updateItem(it.id, { qty: v })} decimals={2} />
                          </td>
                          <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
                            {it.unit_price > 0 ? (
                              <EditableCell value={it.unit_price} onChange={v => updateItem(it.id, { unit_price: v })} decimals={2} />
                            ) : (
                              <span className="mono tnum" style={{ color: 'var(--brand-700)', fontStyle: 'italic', fontSize: 11.5 }}
                                onClick={() => setApuItem(it)} title="Precio derivado del APU. Haz clic para editar.">
                                {fmtNumber(up)}*
                              </span>
                            )}
                          </td>
                          <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }} className="mono tnum">
                            <span style={{ fontWeight: 600, color: 'var(--n-900)' }}>{fmtNumber(subtotal)}</span>
                          </td>
                          <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 2 }}>
                              <IconButton icon={Pencil} title="Ver/editar APU" size={22} onClick={e => { e.stopPropagation(); setApuItem(isSel ? null : it) }} />
                              <IconButton icon={Trash2} title="Eliminar" size={22} danger onClick={e => { e.stopPropagation(); setConfirmDel(it.id) }} />
                            </div>
                          </td>
                        </tr>
                      )
                    }) : []),
                  ]
                })}

                {/* Orphan items (no group) */}
                {orphans.map(it => {
                  const up       = getItemUnitPrice(it, apuLines, resourceMap)
                  const subtotal = it.qty * up
                  const hasApu   = apuLines.some(l => l.item_id === it.id)
                  const isSel    = apuItem?.id === it.id
                  return (
                    <tr key={it.id}
                      style={{ borderTop: '1px solid var(--n-150)', background: isSel ? 'var(--brand-50)' : 'transparent', transition: 'background .12s', cursor: 'pointer' }}
                      onClick={() => setApuItem(isSel ? null : it)}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--n-25)' }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ ...TD, padding: '6px 4px 6px 12px' }} />
                      <td style={{ ...TD, padding: '6px 12px' }} className="mono tnum">
                        <span style={{ color: 'var(--n-500)', fontSize: 11 }}>{it.code}</span>
                      </td>
                      <td style={{ ...TD, padding: '6px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--n-900)' }}>{it.name}</span>
                          {hasApu && (
                            <button onClick={() => setApuItem(isSel ? null : it)}
                              style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, cursor: 'pointer', background: isSel ? 'var(--brand-600)' : 'var(--brand-50)', color: isSel ? '#fff' : 'var(--brand-700)', border: `1px solid ${isSel ? 'var(--brand-600)' : 'var(--brand-200)'}` }}>APU</button>
                          )}
                        </div>
                      </td>
                      <td style={{ ...TD, padding: '6px 12px', textAlign: 'center', color: 'var(--n-600)' }} className="mono">{it.unit}</td>
                      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
                        <EditableCell value={it.qty} onChange={v => updateItem(it.id, { qty: v })} decimals={2} />
                      </td>
                      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
                        {it.unit_price > 0 ? (
                          <EditableCell value={it.unit_price} onChange={v => updateItem(it.id, { unit_price: v })} decimals={2} />
                        ) : (
                          <span className="mono tnum" style={{ color: 'var(--brand-700)', fontStyle: 'italic', fontSize: 11.5 }}>
                            {fmtNumber(up)}*
                          </span>
                        )}
                      </td>
                      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }} className="mono tnum">
                        <span style={{ fontWeight: 600, color: 'var(--n-900)' }}>{fmtNumber(subtotal)}</span>
                      </td>
                      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 2 }}>
                          <IconButton icon={Pencil} title="Ver/editar APU" size={22} onClick={e => { e.stopPropagation(); setApuItem(isSel ? null : it) }} />
                          <IconButton icon={Trash2} title="Eliminar" size={22} danger onClick={e => { e.stopPropagation(); setConfirmDel(it.id) }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* Empty */}
                {items.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
                    Agrega capítulos y partidas con el botón de arriba.
                  </td></tr>
                )}

                {/* COSTO DIRECTO footer */}
                {items.length > 0 && (
                  <tr style={{ borderTop: '2px solid var(--n-300)', background: 'var(--n-25)' }}>
                    <td colSpan={6} style={TD}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--n-700)', paddingLeft: 6 }}>COSTO DIRECTO</span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }} className="mono tnum">
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--n-900)' }}>{fmtNumber(totalDirect)}</span>
                    </td>
                    <td style={TD} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {apuLines.some(l => items.find(it => it.id === l.item_id)?.unit_price === 0) && (
            <div style={{ fontSize: 11, color: 'var(--n-500)', padding: '8px 4px 0' }}>
              <em>*</em> Precio unitario derivado del análisis APU.
            </div>
          )}

          {/* Add button */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button icon={Plus} variant="subtle" onClick={() => { setAddGroupId(undefined); setShowAdd(true) }}>
              Agregar partida
            </Button>
          </div>
        </div>

        {/* Right rail */}
        <aside style={{ flex: '0 0 360px', borderLeft: '1px solid var(--n-150)', background: 'var(--n-0)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {apuItem ? (
            <APUPanel item={apuItem} apuLines={apuLines} resources={resources}
              onUpsert={upsertApuLine} onDeleteLine={deleteApuLine}
              onClose={() => setApuItem(null)} />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <SummaryPanel budget={budget} items={items} apuLines={apuLines} resources={resources} />
            </div>
          )}
        </aside>
      </div>

      {/* Add item modal */}
      {showAdd && (
        <AddItemModal budgetId={id!} groups={groups} defaultGroupId={addGroupId}
          onAdd={async p => { await createItem(p) }} onClose={() => setShowAdd(false)} />
      )}

      {/* Delete confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Eliminar" size="sm">
        {confirmDel && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
              ¿Eliminar esta partida o capítulo? Si es un capítulo, también se eliminarán todas sus partidas.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setConfirmDel(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDel)}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
