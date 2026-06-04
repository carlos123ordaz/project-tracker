import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBudget } from '../hooks/useBudgets'
import { useBudgetItems } from '../hooks/useBudgetItems'
import { useBudgetResources, usePaginatedResources } from '../hooks/useBudgetResources'
import { useSchedules } from '../hooks/useSchedules'
import { useScheduleEditor } from '../hooks/useScheduleEditor'
import { useGastosGenerales } from '../hooks/useGastosGenerales'
import { PageLoader } from '../components/ui/Loader'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { EmbeddedGantt } from '../components/budget/EmbeddedGantt'
import {
  getStatusMeta, BUDGET_STATUSES,
  getItemUnitPrice, computeBudgetTotals, buildResourceMap,
  fmtCurrency, fmtNumber,
} from '../lib/budgetHelpers'
import { ggTotals } from '../lib/ggHelpers'
import { generatePeriods } from '../lib/scheduleHelpers'
import type { Budget, BudgetItem, BudgetResource, BudgetStatus, ApuLine } from '../lib/types'
import { ArrowLeft, Plus, Trash2, Pencil, ChevronDown, X, CalendarDays, List, Layers, Database, TrendingUp, DollarSign, CheckCircle, AlertTriangle, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import GastosGeneralesTab from './GastosGeneralesTab'
import { StatCard } from '../components/ui/StatCard'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'

// ── Editable cell ─────────────────────────────────────────────────────────────
function EditableCell({ value, onChange, decimals = 2 }: { value: number; onChange: (v: number) => void; decimals?: number }) {
  const [editing, setEditing] = useState(false)
  const [tmp, setTmp] = useState(value)

  const commit = () => { setEditing(false); onChange(tmp) }

  if (!editing) return (
    <span onClick={e => { e.stopPropagation(); setTmp(value); setEditing(true) }}
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
function SummaryPanel({ budget, items, apuLines, resources, ggTotal }: {
  budget: Budget; items: BudgetItem[]; apuLines: ApuLine[]; resources: BudgetResource[]
  ggTotal?: number
}) {
  const rMap = useMemo(() => buildResourceMap(resources), [resources])
  const t = computeBudgetTotals(budget, items, apuLines, rMap, ggTotal)
  const cur = budget.currency
  const itemCount = items.filter(i => i.type === 'item').length
  const hasGG = ggTotal != null && ggTotal > 0

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
        <SumRow label="Costo directo" value={t.direct} />
        <SumRow
          label={hasGG ? 'Gastos generales' : 'Costos indirectos'}
          sub={hasGG ? undefined : `${(budget.indirect_pct * 100).toFixed(0)}%`}
          value={t.indirect}
        />
        <SumRow label="Utilidad" sub={`${(budget.utility_pct * 100).toFixed(0)}%`} value={t.utility} />
        <SumRow label="Subtotal" value={t.subtotal} bold />
        <SumRow label="IGV" sub={`${(budget.igv_pct * 100).toFixed(0)}%`} value={t.igv} />
        <div style={{ height: 1, background: 'var(--n-200)', margin: '8px 0' }} />
        <SumRow label="Total" value={t.total} bold large />
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 6 }}>Distribución</div>
        <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
          {total > 0 && <>
            <div title="Costo directo" style={{ flex: t.direct, background: 'var(--brand-500)' }} />
            <div title="Indirectos" style={{ flex: t.indirect, background: '#A78BFA' }} />
            <div title="Utilidad" style={{ flex: t.utility, background: '#10B981' }} />
            <div title="IGV" style={{ flex: t.igv, background: 'var(--n-300)' }} />
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

// ── Resource picker (searchable combobox) ────────────────────────────────────
const PICKER_KIND_COLORS: Record<string, { bg: string; fg: string }> = {
  material:    { bg: '#EFF6FF', fg: '#1D4ED8' },
  labor:       { bg: '#FEF3C7', fg: '#B45309' },
  equipment:   { bg: '#E0E7FF', fg: '#4338CA' },
  subcontrato: { bg: '#F0FDFA', fg: '#0F766E' },
}
const PICKER_KINDS = [
  { value: 'material',    label: 'Materiales'   },
  { value: 'labor',       label: 'Mano de obra' },
  { value: 'equipment',   label: 'Equipos'      },
  { value: 'subcontrato', label: 'Subcontratos' },
]

function ResourcePicker({ value, onChange, options }: {
  value: string
  onChange: (id: string) => void
  options: BudgetResource[]
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = value ? options.find(r => r.id === value) : null

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? options.filter(r => r.name.toLowerCase().includes(q) || r.unit.toLowerCase().includes(q)) : options
  }, [options, search])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleOpen = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }
  const handleSelect = (id: string) => { onChange(id); setOpen(false); setSearch('') }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* trigger */}
      <div onClick={handleOpen} style={{
        height: 30, padding: '0 8px', fontSize: 12, borderRadius: 5, cursor: 'text',
        border: `1px solid ${open ? 'var(--brand-500)' : 'var(--n-200)'}`,
        background: 'var(--n-0)', display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: open ? '0 0 0 3px rgba(79,70,229,.1)' : 'none',
      }}>
        {open
          ? <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder={selected ? `${selected.name} (${selected.unit})` : 'Buscar insumo…'}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: '100%', color: 'var(--n-900)' }} />
          : <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--n-900)' : 'var(--n-400)' }}>
              {selected ? `${selected.name} (${selected.unit})` : '— Seleccionar insumo —'}
            </span>
        }
      </div>

      {/* dropdown */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,.13)', maxHeight: 280, overflowY: 'auto',
        }}>
          {filtered.length === 0
            ? <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>Sin resultados</div>
            : PICKER_KINDS.map(k => {
                const items = filtered.filter(r => r.kind === k.value)
                if (items.length === 0) return null
                const kc = PICKER_KIND_COLORS[k.value]
                return (
                  <div key={k.value}>
                    <div style={{ padding: '5px 10px 3px', fontSize: 9.5, fontWeight: 700, color: kc.fg, textTransform: 'uppercase', letterSpacing: '0.06em', background: kc.bg + 'aa', position: 'sticky', top: 0 }}>
                      {k.label} <span style={{ opacity: 0.6 }}>({items.length})</span>
                    </div>
                    {items.map(r => (
                      <div key={r.id}
                        onMouseDown={e => { e.preventDefault(); handleSelect(r.id) }}
                        style={{
                          padding: '7px 10px', fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          background: r.id === value ? 'var(--brand-50)' : 'transparent',
                          color: r.id === value ? 'var(--brand-700)' : 'var(--n-900)',
                        }}
                        onMouseEnter={e => { if (r.id !== value) e.currentTarget.style.background = 'var(--n-50)' }}
                        onMouseLeave={e => { if (r.id !== value) e.currentTarget.style.background = r.id === value ? 'var(--brand-50)' : 'transparent' }}
                      >
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                        <span className="mono" style={{ fontSize: 10.5, color: 'var(--n-500)', flexShrink: 0 }}>{r.unit}</span>
                      </div>
                    ))}
                  </div>
                )
              })
          }
        </div>
      )}
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
  const [tab, setTab] = useState<'all' | 'material' | 'labor' | 'equipment'>('all')
  const [selResource, setSelResource] = useState('')
  const [qty, setQty] = useState('1')
  const [adding, setAdding] = useState(false)

  const rMap = useMemo(() => buildResourceMap(resources), [resources])
  const myLines = apuLines.filter(l => l.item_id === item.id)

  const sections = useMemo(() => ({
    material: myLines.filter(l => rMap.get(l.resource_id)?.kind === 'material'),
    labor: myLines.filter(l => rMap.get(l.resource_id)?.kind === 'labor'),
    equipment: myLines.filter(l => rMap.get(l.resource_id)?.kind === 'equipment'),
  }), [myLines, rMap])

  const sectionTotals = {
    material: sections.material.reduce((s, l) => s + l.qty * (rMap.get(l.resource_id)?.price ?? 0), 0),
    labor: sections.labor.reduce((s, l) => s + l.qty * (rMap.get(l.resource_id)?.price ?? 0), 0),
    equipment: sections.equipment.reduce((s, l) => s + l.qty * (rMap.get(l.resource_id)?.price ?? 0), 0),
  }
  const total = sectionTotals.material + sectionTotals.labor + sectionTotals.equipment

  const kindColors = {
    material: { bg: '#EFF6FF', fg: '#1D4ED8' },
    labor: { bg: '#FEF3C7', fg: '#B45309' },
    equipment: { bg: '#E0E7FF', fg: '#4338CA' },
  }

  const tabs = [
    { id: 'all', label: 'Todo' },
    { id: 'material', label: 'Materiales' },
    { id: 'labor', label: 'M. de obra' },
    { id: 'equipment', label: 'Equipos' },
  ] as const

  const visibleRows = tab === 'all' ? myLines : myLines.filter(l => rMap.get(l.resource_id)?.kind === tab)
  const usedIds = new Set(myLines.map(l => l.resource_id))
  const available = resources.filter(r => !usedIds.has(r.id))

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
      <div style={{ flex: '0 0 auto', padding: '18px 18px 0', overflow: 'hidden' }}>
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

      {available.length > 0 && (
        <div style={{ flex: '0 0 auto', padding: '10px 18px 16px', borderTop: '1px solid var(--n-150)', background: 'var(--n-0)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', marginBottom: 6 }}>Agregar recurso</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ResourcePicker value={selResource} onChange={setSelResource} options={available} />
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" step="any" min="0" value={qty} onChange={e => setQty(e.target.value)}
                placeholder="Cantidad" style={{ ...INP, flex: 1, textAlign: 'right' }} />
              <Button variant="primary" size="sm" onClick={handleAdd} disabled={!selResource || adding} icon={Plus}
                style={{ flexShrink: 0 }}>
                {adding ? 'Agregando…' : 'Agregar'}
              </Button>
            </div>
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
  const r = rMap.get(line.resource_id)
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
function BudgetHeaderSection({ budget, view, onUpdate, navigate, onAddItem, onDelete }: {
  budget: Budget
  view: 'items' | 'schedule' | 'gastos' | 'prices' | 'reports'
  onUpdate: (u: Partial<Budget>) => Promise<void>
  navigate: (path: string) => void
  onAddItem: () => void
  onDelete: () => void
}) {
  const meta = getStatusMeta(budget.status)
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
          <Button icon={Trash2} variant="danger" onClick={onDelete}>Eliminar</Button>
          {view === 'items' && (
            <Button icon={Plus} variant="primary" onClick={onAddItem}>Agregar partida</Button>
          )}
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
  const [name, setName] = useState(budget.name)
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

// ── Add item modal ────────────────────────────────────────────────────────────
function AddItemModal({ budgetId, groups, defaultGroupId, onAdd, onClose }: {
  budgetId: string; groups: BudgetItem[]; defaultGroupId?: string
  onAdd: (payload: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const [type, setType] = useState<'item' | 'group'>('item')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('m2')
  const [qty, setQty] = useState('1')
  const [gid, setGid] = useState(defaultGroupId ?? '')
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
        unit_price: 0,
        description: '', rendimiento: '',
        sort_order: 0,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={type === 'group' ? 'Nuevo capítulo' : 'Nueva partida'}>
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

// ── Item edit modal ────────────────────────────────────────────────────────────
function ItemEditModal({ item, hasApu, onSave, onClose }: {
  item: BudgetItem
  hasApu: boolean
  onSave: (updates: Partial<BudgetItem>) => Promise<void>
  onClose: () => void
}) {
  const [code, setCode] = useState(item.code)
  const [name, setName] = useState(item.name)
  const [unit, setUnit] = useState(item.unit)
  const [qty, setQty] = useState(String(item.qty))
  const [unitPrice, setUnitPrice] = useState(String(item.unit_price))
  const [description, setDescription] = useState(item.description ?? '')
  const [rendimiento, setRendimiento] = useState(item.rendimiento ?? '')
  const [saving, setSaving] = useState(false)

  const INP: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5, width: '100%',
    border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)',
    outline: 'none', boxSizing: 'border-box', color: 'var(--n-900)',
  }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await onSave({
        code: code.trim(),
        name: name.trim(),
        unit: unit.trim() || 'm2',
        qty: parseFloat(qty) || 1,
        unit_price: hasApu ? item.unit_price : (parseFloat(unitPrice) || 0),
        description: description.trim(),
        rendimiento: rendimiento.trim(),
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Editar partida">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LBL}>Código</label>
            <input style={INP} value={code} onChange={e => setCode(e.target.value)} placeholder="01.01" />
          </div>
          <div>
            <label style={LBL}>Unidad</label>
            <input style={INP} value={unit} onChange={e => setUnit(e.target.value)} placeholder="m2, kg, glb…" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LBL}>Nombre *</label>
            <input style={INP} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label style={LBL}>Metrado</label>
            <input type="number" step="any" min="0" style={INP} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          {!hasApu && (
            <div>
              <label style={LBL}>Precio unit.</label>
              <input type="number" step="any" min="0" style={INP} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
            </div>
          )}
          {hasApu && (
            <div>
              <label style={LBL}>Precio unit.</label>
              <div style={{ ...INP, display: 'flex', alignItems: 'center', background: 'var(--n-50)', color: 'var(--n-500)', fontSize: 11.5 }}>
                Calculado desde APU
              </div>
            </div>
          )}
          <div>
            <label style={LBL}>Rendimiento</label>
            <input style={INP} value={rendimiento} onChange={e => setRendimiento(e.target.value)} placeholder="ej. 8 m²/día" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LBL}>Descripción / Notas</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Especificaciones técnicas, notas adicionales…"
              style={{
                ...INP, height: 'auto', padding: '8px 10px', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Inline schedule creator ───────────────────────────────────────────────────
function CreateScheduleInline({ budgetId, onCreated }: {
  budgetId: string
  onCreated: (data: { budget_id: string; name: string; start_date: string; end_date: string; period_type: 'week' }) => Promise<unknown>
}) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  const INP: React.CSSProperties = {
    height: 34, padding: '0 10px', fontSize: 12.5,
    border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)',
    color: 'var(--n-900)', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const valid = startDate && endDate && endDate >= startDate

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      await onCreated({ budget_id: budgetId, name: 'Cronograma Principal', start_date: startDate, end_date: endDate, period_type: 'week' })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handle} style={{
        width: 340, padding: 28, borderRadius: 12,
        border: '1px solid var(--n-150)', background: 'var(--n-0)',
        display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', marginBottom: 4 }}>Configurar cronograma</div>
          <div style={{ fontSize: 12.5, color: 'var(--n-500)', lineHeight: 1.5 }}>
            Define el rango de fechas para programar las partidas de este presupuesto.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LBL}>Fecha inicio *</label>
            <input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label style={LBL}>Fecha fin *</label>
            <input type="date" style={INP} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
        </div>
        <Button variant="primary" type="submit" disabled={!valid || saving} icon={CalendarDays}>
          {saving ? 'Creando…' : 'Crear cronograma'}
        </Button>
      </form>
    </div>
  )
}

// ── Resource management helpers ───────────────────────────────────────────────
const RKIND_COLORS: Record<string, { bg: string; fg: string }> = {
  material: { bg: '#EFF6FF', fg: '#1D4ED8' },
  labor: { bg: '#FEF3C7', fg: '#B45309' },
  equipment: { bg: '#E0E7FF', fg: '#4338CA' },
  subcontrato: { bg: '#F0FDFA', fg: '#0F766E' },
}
const RKINDS = [
  { value: 'material' as const, label: 'Material' },
  { value: 'labor' as const, label: 'Mano de obra' },
  { value: 'equipment' as const, label: 'Equipo' },
  { value: 'subcontrato' as const, label: 'Subcontrato' },
]

function InlineResourceForm({ initial, onSave, onClose }: {
  initial?: BudgetResource
  onSave: (data: Omit<BudgetResource, 'id' | 'created_at'>) => Promise<void>
  onClose: () => void
}) {
  const [kind, setKind] = useState<BudgetResource['kind']>(initial?.kind ?? 'material')
  const [name, setName] = useState(initial?.name ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? 'und')
  const [price, setPrice] = useState(initial?.price ?? 0)
  const [saving, setSaving] = useState(false)

  const INP: React.CSSProperties = { height: 32, padding: '0 10px', fontSize: 12.5, width: '100%', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', boxSizing: 'border-box' }
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
          <select style={{ ...INP, cursor: 'pointer' }} value={kind} onChange={e => setKind(e.target.value as BudgetResource['kind'])}>
            {RKINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
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

// ── S-curve chart ─────────────────────────────────────────────────────────────
function SCurve({ total }: { total: number }) {
  const chartData = useMemo(() => {
    const planned = Array.from({ length: 12 }, (_, i) =>
      (1 / (1 + Math.exp(-10 * (i / 11 - 0.5)))) * total
    )
    const actual = planned.slice(0, 8).map((p, i) =>
      p * (1 + Math.sin(i * 0.9) * 0.08 - i / 12 * 0.05)
    )
    return Array.from({ length: 12 }, (_, i) => ({
      week: `S${i + 1}`,
      planned: planned[i],
      actual: i <= 7 ? actual[i] : undefined,
    }))
  }, [total])

  const fmtTick = (v: number) => {
    if (total === 0) return '0'
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
    return `$${v.toFixed(0)}`
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="edPlanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="edActGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" stroke="var(--n-150)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--n-500)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10, fill: 'var(--n-500)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--n-150)', boxShadow: 'var(--shadow-sm)' }}
          formatter={(v: unknown, name: unknown) => [fmtNumber(Number(v ?? 0)), name === 'planned' ? 'Planificado' : 'Real']}
          labelStyle={{ fontWeight: 600, color: 'var(--n-900)' }}
        />
        <ReferenceLine x="S8" stroke="var(--red-500)" strokeDasharray="5 4" strokeWidth={1.5}
          label={{ value: 'HOY', position: 'top', fontSize: 9.5, fill: 'var(--red-500)', fontWeight: 700 }} />
        <Area type="monotone" dataKey="planned" stroke="#4F46E5" strokeWidth={2.2} fill="url(#edPlanGrad)" dot={{ r: 2.5, fill: '#4F46E5', opacity: 0.5 }} connectNulls />
        <Area type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2.5} fill="url(#edActGrad)" dot={{ r: 3.2, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BudgetEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { budget, loading: bLoad, updateBudget, deleteBudget } = useBudget(id)
  const { items, apuLines, loading: iLoad, createItem, updateItem, deleteItem, upsertApuLine, deleteApuLine } = useBudgetItems(id)
  const { resources, loading: rLoad, createResource, updateResource, deleteResource } = useBudgetResources()
  const { items: ggItems, loading: ggLoad, createItem: createGGItem, updateItem: updateGGItem, deleteItem: deleteGGItem } = useGastosGenerales(id)

  // Schedule data for "Programar" tab
  const { schedules, loading: sLoad, createSchedule } = useSchedules()
  const budgetSchedule = schedules.find(s => s.budget_id === id)
  const { tasks, actuals, upsertTask, deleteTask, replaceItemActuals } = useScheduleEditor(budgetSchedule?.id ?? '')

  const [view, setView] = useState<'items' | 'schedule' | 'gastos' | 'prices' | 'reports'>('items')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [apuItem, setApuItem] = useState<BudgetItem | null>(null)
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addGroupId, setAddGroupId] = useState<string | undefined>(undefined)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [confirmDelBudget, setConfirmDelBudget] = useState(false)
  const [deletingBudget, setDeletingBudget] = useState(false)

  const [resourceQuery, setResourceQuery] = useState('')
  const [resourceDebQuery, setResourceDebQuery] = useState('')
  const [resourceKindFilter, setResourceKindFilter] = useState('all')
  const [resourcePage, setResourcePage] = useState(0)
  const [exportingResources, setExportingResources] = useState(false)
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [editingResource, setEditingResource] = useState<BudgetResource | null>(null)
  const [confirmDelResource, setConfirmDelResource] = useState<BudgetResource | null>(null)
  const [deletingResource, setDeletingResource] = useState(false)

  // debounce resource search
  useEffect(() => {
    const t = setTimeout(() => setResourceDebQuery(resourceQuery), 300)
    return () => clearTimeout(t)
  }, [resourceQuery])

  // reset page when filters change
  useEffect(() => { setResourcePage(0) }, [resourceDebQuery, resourceKindFilter])

  const RESOURCE_PAGE_SIZE = 25
  const {
    resources: pagedResources,
    totalCount: resourceTotal,
    kindCounts: resourceKindCounts,
    refetch: refetchPaged,
  } = usePaginatedResources(resourcePage, RESOURCE_PAGE_SIZE, resourceDebQuery, resourceKindFilter)

  const resourceTotalPages = Math.max(1, Math.ceil(resourceTotal / RESOURCE_PAGE_SIZE))
  const resourceFrom = resourceTotal === 0 ? 0 : resourcePage * RESOURCE_PAGE_SIZE + 1
  const resourceTo   = Math.min((resourcePage + 1) * RESOURCE_PAGE_SIZE, resourceTotal)

  const exportResourcesToCSV = async () => {
    setExportingResources(true)
    try {
      const { data } = await supabase
        .from('budget_resources').select('*').order('kind').order('sort_order').order('name')
      if (!data) return
      const RKIND_LABELS: Record<string, string> = {
        material: 'Material', labor: 'Mano de obra', equipment: 'Equipo', subcontrato: 'Subcontrato',
      }
      const BOM = '﻿'
      const headers = ['Nombre', 'Tipo', 'Unidad', 'Precio']
      const rows = data.map(r => [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${(RKIND_LABELS[r.kind] ?? r.kind).replace(/"/g, '""')}"`,
        `"${r.unit.replace(/"/g, '""')}"`,
        String(r.price),
      ])
      const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'insumos.csv'; a.click()
      URL.revokeObjectURL(url)
    } finally { setExportingResources(false) }
  }

  const resourceMap = useMemo(() => buildResourceMap(resources), [resources])

  const groups = useMemo(() => items.filter(it => it.type === 'group').sort((a, b) => a.sort_order - b.sort_order), [items])
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

  // Schedule periods (always weekly for the embedded Gantt)
  const periods = useMemo(() =>
    budgetSchedule ? generatePeriods(budgetSchedule.start_date, budgetSchedule.end_date, 'day') : [],
    [budgetSchedule],
  )

  const itemUnitPrices = useMemo(() => {
    const m = new Map<string, number>()
    items.filter(it => it.type === 'item').forEach(it => m.set(it.id, getItemUnitPrice(it, apuLines, resourceMap)))
    return m
  }, [items, apuLines, resourceMap])

  // Direct cost (also used as GG reference)
  const ggDirectCost = useMemo(() =>
    items.filter(it => it.type === 'item').reduce((s, it) => s + it.qty * getItemUnitPrice(it, apuLines, resourceMap), 0),
    [items, apuLines, resourceMap],
  )

  const ggTotal = useMemo(() => {
    if (ggItems.length === 0) return undefined
    return ggTotals(ggItems, ggDirectCost).total
  }, [ggItems, ggDirectCost])

  const totals = useMemo(() =>
    budget ? computeBudgetTotals(budget, items, apuLines, resourceMap, ggTotal) : null,
    [budget, items, apuLines, resourceMap, ggTotal],
  )
  const reportPlanned = useMemo(() => {
    const v = totals?.total ?? 0
    return Array.from({ length: 12 }, (_, i) => (1 / (1 + Math.exp(-10 * (i / 11 - 0.5)))) * v)
  }, [totals])
  const reportActual = useMemo(() =>
    reportPlanned.slice(0, 8).map((p, i) => p * (1 + Math.sin(i * 0.9) * 0.08 - i / 12 * 0.05)),
    [reportPlanned],
  )
  const reportAdvancePct = (totals?.total ?? 0) > 0 ? (reportActual[7] ?? 0) / (totals?.total ?? 1) : 0
  const reportVariance = (reportActual[7] ?? 0) - (reportPlanned[7] ?? 0)

  if (bLoad || iLoad || rLoad || ggLoad) return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PageLoader /></div>
    </div>
  )
  if (!budget) return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-500)', fontSize: 13 }}>
        Presupuesto no encontrado.
        <Button onClick={() => navigate('/budgets')} style={{ marginLeft: 12 }}>Volver</Button>
      </div>
    </div>
  )

  let gCount = 0

  // ── View tabs ──────────────────────────────────────────────────────────────
  const VIEW_TABS = [
    { id: 'items', label: 'Partidas', Icon: List },
    { id: 'schedule', label: 'Programar', Icon: CalendarDays },
    { id: 'gastos', label: 'Gastos generales', Icon: Layers },
  ] as const

  const MODULE_TABS = [
    { id: 'prices', label: 'Insumos', Icon: Database, mv: 'prices' as const },
    { id: 'reports', label: 'Curva S', Icon: TrendingUp, mv: 'reports' as const },
  ] as const

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <BudgetHeaderSection
        budget={budget}
        view={view}
        onUpdate={async p => { await updateBudget(p) }}
        navigate={navigate}
        onAddItem={() => { setAddGroupId(undefined); setShowAdd(true) }}
        onDelete={() => setConfirmDelBudget(true)}
      />

      {/* Body: vertical section rail + content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Section rail */}
        <aside style={{
          flex: '0 0 200px', width: 200,
          borderRight: '1px solid var(--n-200)',
          background: 'var(--n-25)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <nav style={{ flex: 1, padding: 8 }}>
            {VIEW_TABS.map(({ id: tid, label, Icon }) => {
              const on = view === tid
              return (
                <button key={tid}
                  onClick={() => setView(tid as 'items' | 'gastos' | 'schedule')}
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
                  onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-700)'; } }}
                >
                  {on && <span style={{ position: 'absolute', left: 0, top: 7, bottom: 7, width: 2, background: 'var(--brand-600)', borderRadius: 2 }} />}
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              )
            })}

            <div style={{ height: 1, background: 'var(--n-200)', margin: '8px 4px' }} />

            {MODULE_TABS.map(({ id, label, Icon, mv }) => {
              const on = view === mv
              return (
                <button key={id}
                  onClick={() => setView(mv)}
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
                  onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-700)'; } }}
                >
                  {on && <span style={{ position: 'absolute', left: 0, top: 7, bottom: 7, width: 2, background: 'var(--brand-600)', borderRadius: 2 }} />}
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>

          {/* ── Gastos Generales tab ── */}
          {view === 'gastos' && (
            <GastosGeneralesTab
              budget={budget}
              items={ggItems}
              directCost={ggDirectCost}
              onUpdateBudget={async p => { await updateBudget(p) }}
              onCreateItem={createGGItem}
              onUpdateItem={updateGGItem}
              onDeleteItem={deleteGGItem}
            />
          )}

          {/* ── Programar tab ── */}
          {view === 'schedule' && (
            sLoad ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PageLoader /></div>
            ) : !budgetSchedule ? (
              <CreateScheduleInline budgetId={id!} onCreated={createSchedule} />
            ) : (
              <EmbeddedGantt
                periods={periods}
                groups={groups}
                itemsOnly={items.filter(it => it.type === 'item')}
                tasks={tasks}
                actuals={actuals}
                itemUnitPrices={itemUnitPrices}
                currency={budget.currency}
                replaceItemActuals={replaceItemActuals}
                onUpsert={upsertTask}
                onDelete={deleteTask}
              />
            )
          )}

          {/* ── Edición tab ── */}
          {view === 'items' && (
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
                      {groups.map(group => {
                        gCount++
                        const isOpen = !expanded.has(group.id)
                        const children = childOf(group.id)
                        let cCount = 0
                        return [
                          <tr key={group.id} style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)' }}>
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
                            const up = getItemUnitPrice(it, apuLines, resourceMap)
                            const subtotal = it.qty * up
                            const hasApu = apuLines.some(l => l.item_id === it.id)
                            const isSel = apuItem?.id === it.id
                            return (
                              <tr key={it.id}
                                style={{ borderTop: '1px solid var(--n-150)', background: isSel ? 'var(--brand-50)' : 'transparent', transition: 'background .12s', cursor: 'pointer' }}
                                onClick={() => setApuItem(isSel ? null : it)}
                                onMouseEnter={e => { e.currentTarget.style.background = isSel ? 'var(--brand-50)' : 'var(--n-25)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'var(--brand-50)' : 'transparent' }}
                              >
                                <td style={{ ...TD, padding: '6px 4px 6px 24px' }} />
                                <td style={{ ...TD, padding: '6px 12px' }} className="mono tnum">
                                  <span style={{ color: 'var(--n-500)', fontSize: 11 }}>{it.code}</span>
                                </td>
                                <td style={{ ...TD, padding: '6px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: 'var(--n-900)' }}>{it.name}</span>
                                    {it.rendimiento && (
                                      <span style={{ fontSize: 10, color: 'var(--n-500)', fontStyle: 'italic' }}>{it.rendimiento}</span>
                                    )}
                                    {hasApu && (
                                      <button onClick={e => { e.stopPropagation(); setApuItem(isSel ? null : it) }}
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
                                    <IconButton icon={Pencil} title="Editar partida" size={22} onClick={e => { e.stopPropagation(); setEditItem(it) }} />
                                    <IconButton icon={Trash2} title="Eliminar" size={22} danger onClick={e => { e.stopPropagation(); setConfirmDel(it.id) }} />
                                  </div>
                                </td>
                              </tr>
                            )
                          }) : []),
                        ]
                      })}

                      {orphans.map(it => {
                        const up = getItemUnitPrice(it, apuLines, resourceMap)
                        const subtotal = it.qty * up
                        const hasApu = apuLines.some(l => l.item_id === it.id)
                        const isSel = apuItem?.id === it.id
                        return (
                          <tr key={it.id}
                            style={{ borderTop: '1px solid var(--n-150)', background: isSel ? 'var(--brand-50)' : 'transparent', transition: 'background .12s', cursor: 'pointer' }}
                            onClick={() => setApuItem(isSel ? null : it)}
                            onMouseEnter={e => { e.currentTarget.style.background = isSel ? 'var(--brand-50)' : 'var(--n-25)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'var(--brand-50)' : 'transparent' }}
                          >
                            <td style={{ ...TD, padding: '6px 4px 6px 12px' }} />
                            <td style={{ ...TD, padding: '6px 12px' }} className="mono tnum">
                              <span style={{ color: 'var(--n-500)', fontSize: 11 }}>{it.code}</span>
                            </td>
                            <td style={{ ...TD, padding: '6px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--n-900)' }}>{it.name}</span>
                                {it.rendimiento && (
                                  <span style={{ fontSize: 10, color: 'var(--n-500)', fontStyle: 'italic' }}>{it.rendimiento}</span>
                                )}
                                {hasApu && (
                                  <button onClick={e => { e.stopPropagation(); setApuItem(isSel ? null : it) }}
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
                                <IconButton icon={Pencil} title="Editar partida" size={22} onClick={e => { e.stopPropagation(); setEditItem(it) }} />
                                <IconButton icon={Trash2} title="Eliminar" size={22} danger onClick={e => { e.stopPropagation(); setConfirmDel(it.id) }} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {items.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
                          Agrega capítulos y partidas con el botón de arriba.
                        </td></tr>
                      )}

                      {items.length > 0 && (
                        <tr style={{ borderTop: '2px solid var(--n-300)', background: 'var(--n-25)' }}>
                          <td colSpan={6} style={TD}>
                            <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--n-700)', paddingLeft: 6 }}>COSTO DIRECTO</span>
                          </td>
                          <td style={{ ...TD, textAlign: 'right' }} className="mono tnum">
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--n-900)' }}>{fmtNumber(ggDirectCost)}</span>
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
                    <SummaryPanel budget={budget} items={items} apuLines={apuLines} resources={resources} ggTotal={ggTotal} />
                  </div>
                )}
              </aside>
            </div>
          )}

          {/* ── Base de precios tab ── */}
          {view === 'prices' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* toolbar + chips – fixed */}
              <div style={{ flex: '0 0 auto', padding: '16px 24px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <input value={resourceQuery} onChange={e => setResourceQuery(e.target.value)}
                    placeholder="Buscar recurso…"
                    style={{ height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', outline: 'none', width: 280, color: 'var(--n-900)' }}
                  />
                  <div style={{ flex: 1 }} />
                  <Button icon={Download} onClick={exportResourcesToCSV} disabled={exportingResources}>
                    {exportingResources ? 'Exportando…' : 'Exportar CSV'}
                  </Button>
                  <Button variant="primary" icon={Plus} onClick={() => { setEditingResource(null); setShowResourceForm(true) }}>Nuevo recurso</Button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { id: 'all',         label: 'Todos',        color: undefined   },
                    { id: 'material',    label: 'Materiales',   color: '#1D4ED8'   },
                    { id: 'labor',       label: 'Mano de obra', color: '#B45309'   },
                    { id: 'equipment',   label: 'Equipos',      color: '#4338CA'   },
                    { id: 'subcontrato', label: 'Subcontratos', color: '#0F766E'   },
                  ].map(k => {
                    const active = resourceKindFilter === k.id
                    const count  = resourceKindCounts[k.id] ?? 0
                    return (
                      <button key={k.id} onClick={() => setResourceKindFilter(k.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        height: 30, padding: '0 12px', borderRadius: 99, cursor: 'pointer',
                        fontSize: 12, fontWeight: active ? 600 : 500,
                        border: active ? `1.5px solid ${k.color ?? 'var(--brand-600)'}` : '1px solid var(--n-200)',
                        background: active ? (k.color ? k.color + '15' : 'var(--brand-50)') : 'var(--n-0)',
                        color: active ? (k.color ?? 'var(--brand-700)') : 'var(--n-600)',
                      }}>
                        {k.label}
                        <span className="mono tnum" style={{ fontSize: 10.5, opacity: 0.75 }}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* scrollable table */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 24px 0' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--n-25)' }}>
                        <th style={{ ...TH, minWidth: 280 }}>Nombre</th>
                        <th style={{ ...TH, width: 140 }}>Tipo</th>
                        <th style={{ ...TH, width: 80, textAlign: 'center' }}>Unidad</th>
                        <th style={{ ...TH, width: 140, textAlign: 'right' }}>Precio</th>
                        <th style={{ ...TH, width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedResources.map(r => {
                        const kc = RKIND_COLORS[r.kind] ?? RKIND_COLORS['material']
                        const kindLabel = RKINDS.find(k => k.value === r.kind)?.label ?? r.kind
                        return (
                          <tr key={r.id} style={{ borderTop: '1px solid var(--n-150)', transition: 'background .12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ ...TD, fontWeight: 550, color: 'var(--n-900)' }}>{r.name}</td>
                            <td style={TD}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 5, background: kc.bg, color: kc.fg, fontSize: 11, fontWeight: 600 }}>
                                <span style={{ width: 5, height: 5, borderRadius: 999, background: kc.fg }} />
                                {kindLabel}
                              </span>
                            </td>
                            <td style={{ ...TD, textAlign: 'center', color: 'var(--n-600)' }} className="mono">{r.unit}</td>
                            <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--n-900)' }} className="mono tnum">
                              {fmtCurrency(r.price)}
                            </td>
                            <td style={{ ...TD, textAlign: 'right' }}>
                              <span style={{ display: 'inline-flex', gap: 2 }}>
                                <IconButton icon={Pencil} title="Editar" size={26} onClick={() => { setEditingResource(r); setShowResourceForm(true) }} />
                                <IconButton icon={Trash2} title="Eliminar" size={26} danger onClick={() => setConfirmDelResource(r)} />
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {pagedResources.length === 0 && (
                    <div style={{ padding: '48px 0', textAlign: 'center' }}>
                      <Database size={28} style={{ color: 'var(--n-300)', margin: '0 auto 10px' }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-700)' }}>Sin resultados</div>
                      <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 4 }}>Cambia los filtros o agrega un recurso.</div>
                    </div>
                  )}
                </div>
                {/* Pagination footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 20px', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--n-500)' }}>
                    {resourceTotal === 0 ? '0 resultados' : `${resourceFrom}–${resourceTo} de ${resourceTotal} resultados`}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setResourcePage(p => Math.max(0, p - 1))} disabled={resourcePage === 0}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, cursor: resourcePage === 0 ? 'default' : 'pointer', border: '1px solid var(--n-200)', background: 'var(--n-0)', color: resourcePage === 0 ? 'var(--n-300)' : 'var(--n-700)' }}>
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--n-700)', minWidth: 80, textAlign: 'center' }} className="mono">
                      {resourcePage + 1} / {resourceTotalPages}
                    </span>
                    <button onClick={() => setResourcePage(p => Math.min(resourceTotalPages - 1, p + 1))} disabled={resourcePage >= resourceTotalPages - 1}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, cursor: resourcePage >= resourceTotalPages - 1 ? 'default' : 'pointer', border: '1px solid var(--n-200)', background: 'var(--n-0)', color: resourcePage >= resourceTotalPages - 1 ? 'var(--n-300)' : 'var(--n-700)' }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Reportes tab ── */}
          {view === 'reports' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  <StatCard icon={DollarSign} label="Costo total" value={fmtCurrency(totals?.total ?? 0, budget.currency)} sub="con IGV" accent="brand" sparkSeed={2.1} sparkBase={50} />
                  <StatCard icon={TrendingUp} label="% de avance" numericValue={Math.round(reportAdvancePct * 100)} displaySuffix="%" sub="ejecutado a la fecha" accent="green" sparkSeed={3.3} sparkBase={Math.round(reportAdvancePct * 100)} />
                  <StatCard icon={CheckCircle} label="Planificado a hoy" value={fmtCurrency(reportPlanned[7] ?? 0, budget.currency)} sub="semana 8 de 12" accent="amber" sparkSeed={4.4} sparkBase={50} />
                  <StatCard icon={AlertTriangle} label="Variación"
                    value={(reportVariance >= 0 ? '+' : '') + fmtCurrency(Math.abs(reportVariance), budget.currency)}
                    sub={reportVariance >= 0 ? 'adelantado' : 'atrasado'}
                    accent={reportVariance >= 0 ? 'green' : 'red'} urgent={reportVariance < 0} sparkSeed={5.5} sparkBase={50} />
                </div>
                <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h2 style={{ fontSize: 14, color: 'var(--n-900)' }}>Curva S — Avance acumulado</h2>
                      <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>Costo planificado vs. ejecutado, semana a semana</div>
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {[['#4F46E5', 'Planificado'], ['#10B981', 'Real']].map(([color, label]) => (
                        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--n-700)', fontWeight: 500 }}>
                          <span style={{ width: 14, height: 3, background: color, borderRadius: 2 }} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <SCurve total={totals?.total ?? 0} />
                </div>
                <div className="card" style={{ padding: '16px 18px' }}>
                  <h2 style={{ fontSize: 14, marginBottom: 12, color: 'var(--n-900)' }}>Distribución por capítulo</h2>
                  {groups.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
                      Sin capítulos. Agrega grupos al presupuesto para ver la distribución.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {groups.map(g => {
                        const children = items.filter(it => it.parent_id === g.id && it.type === 'item')
                        const gValue = children.reduce((s, it) => s + it.qty * getItemUnitPrice(it, apuLines, resourceMap), 0)
                        const pct = ggDirectCost > 0 ? gValue / ggDirectCost : 0
                        return (
                          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px 110px', gap: 14, alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--n-900)' }}>{g.name}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--n-500)' }} className="mono">{g.code || '—'} · {children.length} partidas</div>
                            </div>
                            <div style={{ height: 8, background: 'var(--n-100)', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${pct * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-500), var(--brand-700))', borderRadius: 999 }} />
                            </div>
                            <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-600)', textAlign: 'right' }}>{(pct * 100).toFixed(1)}%</div>
                            <div className="mono tnum" style={{ fontSize: 12.5, color: 'var(--n-900)', fontWeight: 600, textAlign: 'right' }}>{fmtNumber(gValue)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>{/* end content column */}
      </div>{/* end body row */}

      {/* Add item modal */}
      {showAdd && (
        <AddItemModal budgetId={id!} groups={groups} defaultGroupId={addGroupId}
          onAdd={async p => { await createItem(p) }} onClose={() => setShowAdd(false)} />
      )}

      {/* Edit item modal */}
      {editItem && (
        <ItemEditModal
          item={editItem}
          hasApu={apuLines.some(l => l.item_id === editItem.id)}
          onSave={async updates => { await updateItem(editItem.id, updates) }}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Delete item confirm */}
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

      {/* Resource form modal */}
      <Modal open={showResourceForm} onClose={() => setShowResourceForm(false)} title={editingResource ? 'Editar recurso' : 'Nuevo insumo'}>
        <InlineResourceForm
          initial={editingResource ?? undefined}
          onSave={async data => {
            editingResource ? await updateResource(editingResource.id, data) : await createResource(data)
            refetchPaged()
          }}
          onClose={() => setShowResourceForm(false)}
        />
      </Modal>

      {/* Delete resource confirm */}
      <Modal open={!!confirmDelResource} onClose={() => setConfirmDelResource(null)} title="Eliminar recurso" size="sm">
        {confirmDelResource && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
              ¿Eliminar <strong>{confirmDelResource.name}</strong>? Las líneas APU que lo usen serán eliminadas.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setConfirmDelResource(null)}>Cancelar</Button>
              <Button variant="danger" disabled={deletingResource} onClick={async () => {
                setDeletingResource(true)
                try { await deleteResource(confirmDelResource.id); refetchPaged() } finally { setDeletingResource(false); setConfirmDelResource(null) }
              }}>
                {deletingResource ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete budget confirm */}
      <Modal open={confirmDelBudget} onClose={() => setConfirmDelBudget(false)} title="Eliminar presupuesto" size="sm">
        <div>
          <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
            ¿Eliminar <strong>{budget.name}</strong>? Se borrarán todas sus partidas y líneas APU. Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setConfirmDelBudget(false)}>Cancelar</Button>
            <Button variant="danger" disabled={deletingBudget} onClick={async () => {
              setDeletingBudget(true)
              try { await deleteBudget(); navigate('/budgets') }
              finally { setDeletingBudget(false) }
            }}>
              {deletingBudget ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
