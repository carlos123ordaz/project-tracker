import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useBudget, useBudgets } from '../hooks/useBudgets'
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
  getItemUnitPrice, computeBudgetTotals, buildResourceMap,
  fmtCurrency, fmtNumber,
} from '../lib/budgetHelpers'
import { ggTotals } from '../lib/ggHelpers'
import { generatePeriods } from '../lib/scheduleHelpers'
import type { Budget, BudgetItem, BudgetResource, ApuLine } from '../lib/types'
import { ArrowLeft, Plus, Trash2, Pencil, ChevronDown, X, CalendarDays, List, Layers, Database, TrendingUp, DollarSign, CheckCircle, AlertTriangle, Download, ChevronLeft, ChevronRight, Printer, FileDown, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { exportBudgetToExcel } from '../lib/exportBudgetExcel'
import Modal from '../components/ui/Modal'
import GastosGeneralesTab from './GastosGeneralesTab'
import PieDePresupuestoTab from './PieDePresupuestoTab'
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
        background: 'var(--n-0)', boxShadow: '0 0 0 3px rgba(79,70,229,.12)',
      }}
    />
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
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0, openUp: false })
  const inputRef   = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)

  const selected = value ? options.find(r => r.id === value) : null

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? options.filter(r => r.name.toLowerCase().includes(q) || r.unit.toLowerCase().includes(q)) : options
  }, [options, search])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        dropRef.current    && !dropRef.current.contains(t)
      ) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const dropH = 280
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < dropH && r.top > spaceBelow
      setDropPos({
        top:    openUp ? r.top - dropH - 4 : r.bottom + 4,
        left:   r.left,
        width:  r.width,
        openUp,
      })
    }
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const handleSelect = (id: string) => { onChange(id); setOpen(false); setSearch('') }

  return (
    <div ref={triggerRef} style={{ position: 'relative', width: '100%' }}>
      {/* trigger */}
      <div onClick={handleOpen} style={{
        height: 30, padding: '0 8px', fontSize: 12, borderRadius: 5, cursor: 'text',
        border: `1px solid ${open ? 'var(--brand-500)' : 'var(--n-200)'}`,
        background: 'var(--n-0)', display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: open ? '0 0 0 3px rgba(79,70,229,.1)' : 'none',
        overflow: 'hidden', minWidth: 0,
      }}>
        {open
          ? <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder={selected ? `${selected.name} (${selected.unit})` : 'Buscar insumo…'}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: '100%', minWidth: 0, color: 'var(--n-900)' }} />
          : <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--n-900)' : 'var(--n-400)' }}>
              {selected ? `${selected.name} (${selected.unit})` : '— Seleccionar insumo —'}
            </span>
        }
      </div>

      {/* dropdown — portal to body escapes modal transform containing block */}
      {open && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999,
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
        </div>,
        document.body
      )}
    </div>
  )
}


// ── Open-budget tabs ──────────────────────────────────────────────────────────
const OPEN_TABS_KEY = 'pt_budget_open_tabs'

function ObrasTabs({ budgetId, budgets }: { budgetId: string; budgets: Budget[] }) {
  const nav = useNavigate()
  const [tabs, setTabs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(OPEN_TABS_KEY) ?? '[]') } catch { return [] }
  })

  useEffect(() => {
    setTabs(prev => {
      const next = prev.includes(budgetId) ? prev : [...prev, budgetId]
      localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(next))
      return next
    })
  }, [budgetId])

  const close = (id: string) => setTabs(prev => {
    const next = prev.filter(t => t !== id)
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(next))
    return next
  })

  const list = tabs.map(id => budgets.find(b => b.id === id)).filter(Boolean) as Budget[]

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      background: 'var(--n-100)', borderBottom: '1px solid var(--n-200)',
      padding: '6px 10px 0', flexShrink: 0, minHeight: 38,
    }}>
      {list.map(b => {
        const active = b.id === budgetId
        const short = b.name.length > 26 ? b.name.slice(0, 24) + '…' : b.name
        return (
          <div key={b.id} onClick={() => nav(`/budgets/${b.id}`)} title={b.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 10px 0 13px', height: 32, cursor: 'pointer',
              background: active ? 'var(--n-0)' : 'transparent',
              border: `1px solid ${active ? 'var(--n-200)' : 'transparent'}`,
              borderBottom: `1px solid ${active ? 'var(--n-0)' : 'transparent'}`,
              borderRadius: '8px 8px 0 0', marginBottom: -1,
              fontSize: 12, fontWeight: active ? 600 : 500,
              color: active ? 'var(--n-900)' : 'var(--n-600)',
              maxWidth: 220, transition: 'background .12s, color .12s', userSelect: 'none',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 2, background: active ? 'var(--brand-500)' : 'var(--n-400)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{short}</span>
            {list.length > 1 && (
              <button onClick={e => {
                e.stopPropagation()
                const remaining = list.filter(x => x.id !== b.id)
                close(b.id)
                if (active) nav(remaining.length ? `/budgets/${remaining[remaining.length - 1].id}` : '/budgets')
              }} style={{ display: 'inline-flex', padding: 2, borderRadius: 4, color: 'var(--n-400)', cursor: 'pointer', border: 'none', background: 'transparent' }}>
                <X size={12} />
              </button>
            )}
          </div>
        )
      })}
      <button onClick={() => nav('/budgets')} title="Abrir presupuesto"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 32, color: 'var(--n-500)', cursor: 'pointer', borderRadius: 6, border: 'none', background: 'transparent' }}>
        <Plus size={15} />
      </button>
    </div>
  )
}

// ── Editor toolbar ─────────────────────────────────────────────────────────────
function TBtn({ icon: Icon, label, title, onClick, danger = false, disabled = false, accent = false }: {
  icon?: React.ComponentType<{ size?: number }>; label?: string; title?: string
  onClick?: () => void; danger?: boolean; disabled?: boolean; accent?: boolean
}) {
  return (
    <button onClick={disabled ? undefined : onClick} title={title ?? label} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 28,
      padding: label ? '0 10px' : '0 7px', borderRadius: 6,
      color: disabled ? 'var(--n-300)' : danger ? 'var(--red-600)' : accent ? 'var(--brand-700)' : 'var(--n-700)',
      fontSize: 12, fontWeight: 550, cursor: disabled ? 'default' : 'pointer',
      border: 'none', background: 'transparent', transition: 'background .12s',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? 'var(--red-50)' : 'var(--n-100)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {Icon && <Icon size={15} />}
      {label && <span>{label}</span>}
    </button>
  )
}
const TSep = () => <span style={{ width: 1, height: 20, background: 'var(--n-200)', margin: '0 4px', flexShrink: 0 }} />

function EditorToolbar({ allBudgets, selectedItem, directCost, onAddGroup, onAddItem, onEditItem, onDeleteItem, onNavigate, onExport }: {
  allBudgets: Budget[]; selectedItem: BudgetItem | null; directCost: number
  onAddGroup: () => void; onAddItem: () => void; onEditItem: () => void; onDeleteItem: () => void
  onNavigate: (dir: -1 | 1) => void; onExport: () => void
}) {
  const hasSel = !!selectedItem
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2, padding: '6px 12px',
      borderBottom: '1px solid var(--n-200)', background: 'var(--n-0)',
      flexShrink: 0, overflowX: 'auto', minHeight: 44,
    }}>
      <TBtn icon={Save} label="Guardar" onClick={() => {}} />
      <TSep />
      <TBtn icon={Plus} label="Título" title="Agregar capítulo / título" onClick={onAddGroup} />
      <TBtn icon={Plus} label="Partida" accent title="Agregar partida" onClick={onAddItem} />
      <TBtn icon={Pencil} title="Editar selección" disabled={!hasSel} onClick={onEditItem} />
      <TBtn icon={Trash2} danger title="Eliminar selección" disabled={!hasSel} onClick={onDeleteItem} />
      <TSep />
      <TBtn icon={Printer} title="Imprimir" onClick={() => window.print()} />
      <TBtn icon={FileDown} title="Exportar a Excel" onClick={onExport} />
      <TSep />
      <TBtn icon={ChevronLeft} title="Presupuesto anterior" onClick={() => onNavigate(-1)} disabled={allBudgets.length <= 1} />
      <TBtn icon={ChevronRight} title="Presupuesto siguiente" onClick={() => onNavigate(1)} disabled={allBudgets.length <= 1} />
      <div style={{ flex: 1 }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 6px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)' }}>CD:</span>
        <span className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-700)' }}>{fmtNumber(directCost)}</span>
      </div>
    </div>
  )
}

// ── Cost category colors ───────────────────────────────────────────────────────
const CAT_COLORS = {
  labor:       { short: 'MO', label: 'Mano de Obra', fg: '#B45309', bg: '#FEF3C7' },
  material:    { short: 'MT', label: 'Materiales',   fg: '#1D4ED8', bg: '#EFF6FF' },
  equipment:   { short: 'EQ', label: 'Equipos',      fg: '#4338CA', bg: '#E0E7FF' },
  subcontrato: { short: 'SC', label: 'Subcontratos', fg: '#6D28D9', bg: '#EDE9FE' },
} as const

function CostBadge({ short, label, fg, bg, value }: { short: string; label: string; fg: string; bg: string; value: number }) {
  return (
    <div title={label} style={{ display: 'inline-flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden', border: `1px solid ${fg}33`, flexShrink: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.03em', background: bg, color: fg }}>{short}</span>
      <span className="mono tnum" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', fontSize: 12, fontWeight: 700, color: 'var(--n-900)' }}>{fmtNumber(value)}</span>
    </div>
  )
}

// ── Bottom analysis panel ──────────────────────────────────────────────────────
function BottomAnalysisPanel({ item, apuLines, resources, onUpsert, onDeleteLine, onUpdateItem, onClose }: {
  item: BudgetItem; apuLines: ApuLine[]; resources: BudgetResource[]
  onUpsert: (itemId: string, resourceId: string, qty: number) => Promise<void>
  onDeleteLine: (id: string) => Promise<void>
  onUpdateItem: (id: string, updates: Partial<BudgetItem>) => Promise<void>
  onClose: () => void
}) {
  const rMap = useMemo(() => buildResourceMap(resources), [resources])
  const myLines = apuLines.filter(l => l.item_id === item.id)
  const [selResource, setSelResource] = useState('')
  const [qty, setQty] = useState('1')
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [panelHeight, setPanelHeight] = useState(280)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      if (e.buttons === 0) { isDragging.current = false; document.body.style.cursor = ''; return }
      const delta = dragStartY.current - e.clientY
      setPanelHeight(Math.max(10, dragStartH.current + delta))
    }
    const onUp = () => { isDragging.current = false; document.body.style.cursor = '' }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [])

  const usedIds = useMemo(() => new Set(myLines.map(l => l.resource_id)), [myLines])
  const available = useMemo(() => resources.filter(r => !usedIds.has(r.id)), [resources, usedIds])

  const unitBd = useMemo(() => {
    const bd = { mo: 0, mt: 0, eq: 0, sc: 0 }
    myLines.forEach(l => {
      const r = rMap.get(l.resource_id)
      if (!r) return
      const v = l.qty * r.price
      if (r.kind === 'labor') bd.mo += v
      else if (r.kind === 'material') bd.mt += v
      else if (r.kind === 'equipment') bd.eq += v
      else if (r.kind === 'subcontrato') bd.sc += v
    })
    return bd
  }, [myLines, rMap])

  const cu = unitBd.mo + unitBd.mt + unitBd.eq + unitBd.sc

  const grouped = useMemo(() => {
    const g: Record<string, ApuLine[]> = { labor: [], material: [], equipment: [], subcontrato: [] }
    myLines.forEach(l => {
      const r = rMap.get(l.resource_id)
      if (r && g[r.kind]) g[r.kind].push(l)
    })
    return g
  }, [myLines, rMap])

  const handleAdd = async () => {
    if (!selResource) return
    setAdding(true)
    try { await onUpsert(item.id, selResource, parseFloat(qty) || 1) }
    finally { setAdding(false); setSelResource(''); setQty('1'); setShowAddForm(false) }
  }

  const INP: React.CSSProperties = { height: 30, padding: '0 8px', fontSize: 12, border: '1px solid var(--n-200)', borderRadius: 5, background: 'var(--n-0)', outline: 'none', color: 'var(--n-900)' }

  return (
    <div style={{ flexShrink: 0, height: panelHeight, background: 'var(--n-0)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Drag handle — two-line separator */}
      <div
        onMouseDown={e => { isDragging.current = true; dragStartY.current = e.clientY; dragStartH.current = panelHeight; document.body.style.cursor = 'n-resize' }}
        style={{ height: 10, flexShrink: 0, cursor: 'n-resize', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '0', background: 'var(--n-75)', userSelect: 'none' }}
      >
        <div style={{ height: 1, background: 'var(--n-300)' }} />
        <div style={{ height: 1, background: 'var(--n-300)' }} />
      </div>
      {/* Rendimiento strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)', flexShrink: 0, overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', whiteSpace: 'nowrap' }}>Rendimiento</span>
          <input
            className="mono"
            defaultValue={item.rendimiento ?? ''}
            onBlur={e => onUpdateItem(item.id, { rendimiento: e.target.value.trim() })}
            placeholder="ej. 8 m²/día"
            style={{ width: 110, height: 26, padding: '0 7px', fontSize: 12, border: '1px solid var(--n-200)', borderRadius: 5, background: 'var(--n-0)', outline: 'none', color: 'var(--n-800)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 auto' }}>
          {item.code && <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand-700)', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{item.code}</span>}
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 8 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {(Object.entries(CAT_COLORS) as [keyof typeof CAT_COLORS, typeof CAT_COLORS[keyof typeof CAT_COLORS]][]).map(([k, c]) => (
            <CostBadge key={k} {...c} value={unitBd[k === 'labor' ? 'mo' : k === 'material' ? 'mt' : k === 'equipment' ? 'eq' : 'sc']} />
          ))}
          <div style={{ display: 'inline-flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--brand-600)', flexShrink: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', fontSize: 10.5, fontWeight: 800, background: 'var(--brand-700)', color: '#fff' }}>CU</span>
            <span className="mono tnum" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', fontSize: 12, fontWeight: 700, color: 'var(--n-900)', background: 'var(--brand-50)' }}>{fmtNumber(cu)}</span>
          </div>
        </div>
        <IconButton icon={X} onClick={onClose} size={26} title="Cerrar análisis" />
      </div>

      {/* Insumos table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        {myLines.length === 0 && !showAddForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, color: 'var(--n-500)', maxWidth: 400 }}>
              Precio unitario directo: <strong className="mono">{fmtNumber(item.unit_price)}</strong>. Agrega insumos para construir el APU.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 26 }} />
              <col />
              <col style={{ width: 60 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 44 }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                <th style={{ width: 26 }} />
                <th style={{ padding: '5px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Insumo</th>
                <th style={{ padding: '5px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 60 }}>Unidad</th>
                <th style={{ padding: '5px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 90 }}>Cantidad</th>
                <th style={{ padding: '5px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 90 }}>P.U.</th>
                <th style={{ padding: '5px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 100 }}>Parcial</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {(Object.entries(CAT_COLORS) as [keyof typeof CAT_COLORS, typeof CAT_COLORS[keyof typeof CAT_COLORS]][]).map(([kind, meta]) => {
                const lines = grouped[kind]
                if (!lines?.length) return null
                return (
                  <Fragment key={kind}>
                    <tr style={{ background: meta.bg + 'aa' }}>
                      <td />
                      <td colSpan={6} style={{ padding: '4px 12px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.fg }}>{meta.label}</td>
                    </tr>
                    {lines.map(l => {
                      const r = rMap.get(l.resource_id)
                      const partial = l.qty * (r?.price ?? 0)
                      return (
                        <tr key={l.id} style={{ borderTop: '1px solid var(--n-150)', transition: 'background .1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ textAlign: 'center', paddingLeft: 8 }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: meta.fg }} />
                          </td>
                          <td style={{ padding: '5px 12px', color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>{r?.name ?? '—'}</td>
                          <td style={{ padding: '5px 12px', textAlign: 'center', color: 'var(--n-500)' }} className="mono">{r?.unit}</td>
                          <td style={{ padding: '5px 12px', textAlign: 'right' }} className="mono tnum">
                            <input type="number" step="any" min="0" defaultValue={l.qty}
                              onBlur={e => { const v = parseFloat(e.target.value); if (v !== l.qty) onUpsert(item.id, l.resource_id, v) }}
                              style={{ width: 58, padding: '1px 4px', border: '1px solid var(--n-200)', borderRadius: 4, outline: 'none', textAlign: 'right', fontSize: 11.5, fontFamily: 'inherit', background: 'var(--n-0)', color: 'var(--n-700)' }}
                            />
                          </td>
                          <td style={{ padding: '5px 12px', textAlign: 'right', color: 'var(--n-600)' }} className="mono tnum">{fmtNumber(r?.price ?? 0)}</td>
                          <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--n-900)' }} className="mono tnum">{fmtNumber(partial)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                            <button onClick={() => onDeleteLine(l.id)}
                              style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--n-400)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-400)' }}
                            ><X size={11} /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}

        {showAddForm && available.length > 0 && (
          <div style={{ padding: '10px 14px', borderTop: myLines.length > 0 ? '1px solid var(--n-150)' : 'none', background: 'var(--n-25)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', marginBottom: 4 }}>Insumo</div>
                <ResourcePicker value={selResource} onChange={setSelResource} options={available} />
              </div>
              <div style={{ width: 88 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', marginBottom: 4 }}>Cantidad</div>
                <input type="number" step="any" min="0" value={qty} onChange={e => setQty(e.target.value)}
                  style={{ ...INP, width: '100%', textAlign: 'right' }} />
              </div>
              <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd} disabled={!selResource || adding}>
                {adding ? '…' : 'Agregar'}
              </Button>
              <Button size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--n-150)', background: 'var(--n-25)', flexShrink: 0 }}>
        <button onClick={() => setShowAddForm(true)}
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, fontSize: 12.5, fontWeight: 600, color: 'var(--brand-700)', cursor: 'pointer', border: 'none', background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-50)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        ><Plus size={15} /> Agregar Insumo</button>
      </div>
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
function AddItemModal({ budgetId, groups, defaultGroupId, type, onAdd, onUpsertApuLine, resources = [], onClose }: {
  budgetId: string; groups: BudgetItem[]; defaultGroupId?: string
  type: 'group' | 'item'
  onAdd: (payload: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>) => Promise<BudgetItem>
  onUpsertApuLine?: (itemId: string, resourceId: string, qty: number) => Promise<void>
  resources?: BudgetResource[]
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('m2')
  const [qty, setQty] = useState('1')
  const [gid, setGid] = useState(defaultGroupId ?? '')
  const [saving, setSaving] = useState(false)

  // Step 2 — insumos (only for items)
  const [createdItem, setCreatedItem] = useState<BudgetItem | null>(null)
  const [apuAdded, setApuAdded] = useState<Array<{ resourceId: string; qty: number }>>([])
  const [selRes, setSelRes] = useState('')
  const [selQty, setSelQty] = useState('1')
  const [addingApu, setAddingApu] = useState(false)

  const usedIds = new Set(apuAdded.map(a => a.resourceId))
  const available = resources.filter(r => !usedIds.has(r.id))

  const INP: React.CSSProperties = { height: 32, padding: '0 10px', fontSize: 12.5, width: '100%', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', outline: 'none', boxSizing: 'border-box', color: 'var(--n-900)' }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const item = await onAdd({
        budget_id: budgetId,
        type,
        parent_id: type === 'item' ? (gid || null) : null,
        code: '', name: name.trim(),
        unit: type === 'group' ? '' : unit.trim() || 'm2',
        qty: parseFloat(qty) || 1,
        unit_price: 0,
        description: '', rendimiento: '',
        sort_order: 0,
      })
      if (type === 'group') { onClose(); return }
      setCreatedItem(item)
    } finally { setSaving(false) }
  }

  const handleAddApu = async () => {
    if (!selRes || !createdItem || !onUpsertApuLine) return
    setAddingApu(true)
    try {
      await onUpsertApuLine(createdItem.id, selRes, parseFloat(selQty) || 1)
      setApuAdded(prev => [...prev, { resourceId: selRes, qty: parseFloat(selQty) || 1 }])
      setSelRes(''); setSelQty('1')
    } finally { setAddingApu(false) }
  }

  const resMap = useMemo(() => {
    const m = new Map<string, BudgetResource>()
    resources.forEach(r => m.set(r.id, r))
    return m
  }, [resources])

  // ── Step 2: insumos ──
  if (createdItem) {
    return (
      <Modal open onClose={onClose} title="Insumos de la partida" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Created item header */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
            <div style={{ fontSize: 10.5, color: 'var(--brand-700)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Partida creada</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>{createdItem.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>{createdItem.qty} {createdItem.unit}</div>
          </div>

          {/* Insumos list */}
          {apuAdded.length > 0 && (
            <div style={{ border: '1px solid var(--n-200)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '7px 12px', background: 'var(--n-25)', borderBottom: '1px solid var(--n-200)' }}>Insumos agregados</div>
              {apuAdded.map(a => {
                const r = resMap.get(a.resourceId)
                const kindColors: Record<string, string> = { labor: '#B45309', material: '#1D4ED8', equipment: '#4338CA', subcontrato: '#6D28D9' }
                const fg = kindColors[r?.kind ?? 'material'] ?? '#1D4ED8'
                return (
                  <div key={a.resourceId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--n-150)', fontSize: 12.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: fg, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--n-800)' }}>{r?.name ?? a.resourceId}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--n-500)' }}>{r?.unit}</span>
                    <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-700)', minWidth: 40, textAlign: 'right' }}>{a.qty}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add insumo form */}
          {available.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)' }}>Agregar insumo (opcional)</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <ResourcePicker value={selRes} onChange={setSelRes} options={available} />
                </div>
                <div style={{ width: 80 }}>
                  <input type="number" step="any" min="0" value={selQty} onChange={e => setSelQty(e.target.value)}
                    placeholder="Cant." style={{ ...INP, textAlign: 'right' }} />
                </div>
                <Button variant="primary" size="sm" icon={Plus} onClick={handleAddApu} disabled={!selRes || addingApu}>
                  {addingApu ? '…' : 'Agregar'}
                </Button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={onClose}>Listo</Button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Step 1: form ──
  return (
    <Modal open onClose={onClose} title={type === 'group' ? 'Nuevo título / capítulo' : 'Nueva partida'}>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {type === 'group' ? (
          <div>
            <label style={LBL}>Descripción *</label>
            <input autoFocus style={INP} value={name} onChange={e => setName(e.target.value)}
              placeholder="Nombre del capítulo o título" required />
          </div>
        ) : (
          <>
            <div>
              <label style={LBL}>Descripción *</label>
              <input autoFocus style={INP} value={name} onChange={e => setName(e.target.value)}
                placeholder="Nombre de la partida" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LBL}>Unidad</label>
                <input style={INP} value={unit} onChange={e => setUnit(e.target.value)} placeholder="m2, kg, glb…" />
              </div>
              <div>
                <label style={LBL}>Metrado</label>
                <input type="number" step="any" min="0" style={INP} value={qty} onChange={e => setQty(e.target.value)} />
              </div>
            </div>
            {groups.length > 0 && (
              <div>
                <label style={LBL}>Capítulo (opcional)</label>
                <select style={{ ...INP, cursor: 'pointer' }} value={gid} onChange={e => setGid(e.target.value)}>
                  <option value="">— Sin capítulo —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Creando…' : type === 'group' ? 'Crear título' : 'Crear partida'}
          </Button>
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
  const [name, setName] = useState(item.name)
  const [unit, setUnit] = useState(item.unit)
  const [qty, setQty] = useState(String(item.qty))
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
        name: name.trim(),
        unit: unit.trim() || 'm2',
        qty: parseFloat(qty) || 1,
        rendimiento: rendimiento.trim(),
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Editar partida">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LBL}>Descripción *</label>
            <input style={INP} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LBL}>Unidad</label>
              <input style={INP} value={unit} onChange={e => setUnit(e.target.value)} placeholder="m2, kg, glb…" />
            </div>
            <div>
              <label style={LBL}>Metrado</label>
              <input type="number" step="any" min="0" style={INP} value={qty} onChange={e => setQty(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={LBL}>Rendimiento</label>
            <input style={INP} value={rendimiento} onChange={e => setRendimiento(e.target.value)} placeholder="ej. 8 m²/día" />
          </div>
          {hasApu && (
            <div style={{ padding: '8px 10px', background: 'var(--brand-50)', borderRadius: 6, border: '1px solid var(--brand-200)', fontSize: 12, color: 'var(--brand-700)' }}>
              El precio unitario se calcula automáticamente desde el APU.
            </div>
          )}
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
  const [categoria, setCategoria] = useState(initial?.categoria ?? '')
  const [saving, setSaving] = useState(false)

  const INP: React.CSSProperties = { height: 32, padding: '0 10px', fontSize: 12.5, width: '100%', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', boxSizing: 'border-box' }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ kind, name: name.trim(), unit: unit.trim() || 'und', price: Number(price), sort_order: initial?.sort_order ?? 0, categoria: categoria.trim() || null })
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
        <div>
          <label style={LBL}>Categoría</label>
          <input style={INP} value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ej. Estructura, Acabados…" />
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
  const { id, section } = useParams<{ id: string; section?: string }>()
  const navigate = useNavigate()
  const { budgets: allBudgets } = useBudgets()

  type ViewSection = 'items' | 'schedule' | 'gastos' | 'pie' | 'prices' | 'reports'
  const VALID_SECTIONS: ViewSection[] = ['items', 'schedule', 'gastos', 'pie', 'prices', 'reports']
  const view: ViewSection = VALID_SECTIONS.includes(section as ViewSection) ? (section as ViewSection) : 'items'
  const setView = (v: ViewSection) => navigate(`/budgets/${id}/${v}`)

  const handleNavigate = (dir: -1 | 1) => {
    const idx = allBudgets.findIndex(b => b.id === id)
    if (idx === -1) return
    const next = allBudgets[(idx + dir + allBudgets.length) % allBudgets.length]
    if (next) navigate(`/budgets/${next.id}/${view}`)
  }

  const { budget, loading: bLoad, updateBudget, deleteBudget } = useBudget(id)
  const { items, apuLines, loading: iLoad, createItem, updateItem, deleteItem, upsertApuLine, deleteApuLine } = useBudgetItems(id)
  const { resources, createResource, updateResource, deleteResource } = useBudgetResources()
  const { items: ggItems, createItem: createGGItem, updateItem: updateGGItem, deleteItem: deleteGGItem } = useGastosGenerales(id)

  // Schedule data for "Programar" tab
  const { schedules, loading: sLoad, createSchedule } = useSchedules()
  const budgetSchedule = schedules.find(s => s.budget_id === id)
  const { tasks, actuals, upsertTask, deleteTask, replaceItemActuals } = useScheduleEditor(budgetSchedule?.id ?? '')

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [apuItem, setApuItem] = useState<BudgetItem | null>(null)
  useEffect(() => { setApuItem(null) }, [id])
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addGroupId, setAddGroupId] = useState<string | undefined>(undefined)
  const [addItemType, setAddItemType] = useState<'group' | 'item'>('item')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [confirmDelBudget, setConfirmDelBudget] = useState(false)
  const [deletingBudget, setDeletingBudget] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

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

  // Per-item cost-category breakdowns (total, not unit)
  const itemBreakdowns = useMemo(() => {
    const m = new Map<string, { mo: number; mt: number; eq: number; sc: number }>()
    items.filter(it => it.type === 'item').forEach(it => {
      const lines = apuLines.filter(l => l.item_id === it.id)
      const bd = { mo: 0, mt: 0, eq: 0, sc: 0 }
      lines.forEach(l => {
        const r = resourceMap.get(l.resource_id)
        if (!r) return
        const v = l.qty * r.price * it.qty
        if (r.kind === 'labor') bd.mo += v
        else if (r.kind === 'material') bd.mt += v
        else if (r.kind === 'equipment') bd.eq += v
        else if (r.kind === 'subcontrato') bd.sc += v
      })
      m.set(it.id, bd)
    })
    return m
  }, [items, apuLines, resourceMap])

  const groupBreakdowns = useMemo(() => {
    const m: Record<string, { mo: number; mt: number; eq: number; sc: number }> = {}
    items.filter(it => it.type === 'item' && it.parent_id).forEach(it => {
      const bd = itemBreakdowns.get(it.id) || { mo: 0, mt: 0, eq: 0, sc: 0 }
      const g = m[it.parent_id!] || { mo: 0, mt: 0, eq: 0, sc: 0 }
      g.mo += bd.mo; g.mt += bd.mt; g.eq += bd.eq; g.sc += bd.sc
      m[it.parent_id!] = g
    })
    return m
  }, [items, itemBreakdowns])

  const colTotals = useMemo(() => {
    const t = { mo: 0, mt: 0, eq: 0, sc: 0, total: 0 }
    items.filter(it => it.type === 'item').forEach(it => {
      const bd = itemBreakdowns.get(it.id) || { mo: 0, mt: 0, eq: 0, sc: 0 }
      t.mo += bd.mo; t.mt += bd.mt; t.eq += bd.eq; t.sc += bd.sc
      t.total += it.qty * getItemUnitPrice(it, apuLines, resourceMap)
    })
    return t
  }, [items, itemBreakdowns, apuLines, resourceMap])
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

  // Solo mostrar loader completo en carga inicial (sin datos previos)
  if ((bLoad || iLoad) && !budget) return (
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

  // ── View tabs ──────────────────────────────────────────────────────────────
  const VIEW_TABS = [
    { id: 'items',    label: 'Partidas',           Icon: List },
    { id: 'schedule', label: 'Programar',           Icon: CalendarDays },
    { id: 'gastos',   label: 'Gastos generales',    Icon: Layers },
    { id: 'pie',      label: 'Pie de presupuesto',  Icon: DollarSign },
  ] as const

  const MODULE_TABS = [
    { id: 'prices', label: 'Insumos', Icon: Database, mv: 'prices' as const },
    { id: 'reports', label: 'Curva S', Icon: TrendingUp, mv: 'reports' as const },
  ] as const

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <ObrasTabs budgetId={id!} budgets={allBudgets} />

      {/* Body: vertical section rail + content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Section rail */}
        <aside style={{
          flex: '0 0 200px', width: 200,
          borderRight: '1px solid var(--n-200)',
          background: 'var(--n-25)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Rail header */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--n-200)', flexShrink: 0 }}>
            <button onClick={() => navigate('/budgets')} title="Volver a presupuestos"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 8px 10px 12px', flex: 1, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', minWidth: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--n-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ArrowLeft size={13} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Presupuesto</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{budget.name}</div>
              </div>
            </button>
            <div style={{ display: 'flex', gap: 1, paddingRight: 4, flexShrink: 0 }}>
              <IconButton icon={Pencil} size={24} title="Editar metadatos" onClick={() => setShowEditModal(true)} />
              <IconButton icon={Trash2} size={24} danger title="Eliminar presupuesto" onClick={() => setConfirmDelBudget(true)} />
            </div>
          </div>
          <nav style={{ flex: 1, padding: 8, overflowY: 'auto' }}>
            {VIEW_TABS.map(({ id: tid, label, Icon }) => {
              const on = view === tid
              return (
                <button key={tid}
                  onClick={() => setView(tid as ViewSection)}
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
                  onClick={() => setView(mv as ViewSection)}
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

          {/* Editor toolbar — only for partidas view */}
          {view === 'items' && (
            <EditorToolbar
              allBudgets={allBudgets}
              selectedItem={apuItem}
              directCost={ggDirectCost}
              onAddGroup={() => { setAddGroupId(undefined); setAddItemType('group'); setShowAdd(true) }}
              onAddItem={() => { setAddGroupId(apuItem?.parent_id ?? undefined); setAddItemType('item'); setShowAdd(true) }}
              onEditItem={() => apuItem && setEditItem(apuItem)}
              onDeleteItem={() => apuItem && setConfirmDel(apuItem.id)}
              onNavigate={handleNavigate}
              onExport={() => exportBudgetToExcel(budget, items, apuLines, resources, ggTotal)}
            />
          )}

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

          {/* ── Pie de Presupuesto tab ── */}
          {view === 'pie' && (
            <PieDePresupuestoTab
              budget={budget}
              directCost={ggDirectCost}
              ggTotal={ggTotal}
              onUpdate={async p => { await updateBudget(p) }}
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

          {/* ── Partidas tab ── */}
          {view === 'items' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, overflow: 'auto', background: 'var(--n-50)', padding: '12px 14px' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden', minWidth: 860 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-200)' }}>
                        <th style={{ ...TH, width: 52, textAlign: 'right' }}>Item</th>
                        <th style={{ ...TH, minWidth: 260 }}>Partida</th>
                        <th style={{ ...TH, width: 56, textAlign: 'center' }}>Und</th>
                        <th style={{ ...TH, width: 90, textAlign: 'right' }}>Metrado</th>
                        <th style={{ ...TH, width: 90, textAlign: 'right' }}>CU</th>
                        <th style={{ ...TH, width: 110, textAlign: 'right', verticalAlign: 'top' }}>
                          <div>Parcial</div>
                          <div className="mono tnum" style={{ fontSize: 10.5, color: 'var(--n-700)', fontWeight: 600 }}>{fmtNumber(colTotals.total)}</div>
                        </th>
                        <th style={{ ...TH, width: 100, textAlign: 'right', color: '#B45309', verticalAlign: 'top' }}>
                          <div>Mano de Obra</div>
                          <div className="mono tnum" style={{ fontSize: 10.5, fontWeight: 600 }}>{fmtNumber(colTotals.mo)}</div>
                        </th>
                        <th style={{ ...TH, width: 100, textAlign: 'right', color: '#1D4ED8', verticalAlign: 'top' }}>
                          <div>Materiales</div>
                          <div className="mono tnum" style={{ fontSize: 10.5, fontWeight: 600 }}>{fmtNumber(colTotals.mt)}</div>
                        </th>
                        <th style={{ ...TH, width: 90, textAlign: 'right', color: '#4338CA', verticalAlign: 'top' }}>
                          <div>Equipos</div>
                          <div className="mono tnum" style={{ fontSize: 10.5, fontWeight: 600 }}>{fmtNumber(colTotals.eq)}</div>
                        </th>
                        <th style={{ ...TH, width: 96, textAlign: 'right', color: '#6D28D9', verticalAlign: 'top' }}>
                          <div>Subcontratos</div>
                          <div className="mono tnum" style={{ fontSize: 10.5, fontWeight: 600 }}>{fmtNumber(colTotals.sc)}</div>
                        </th>
                        <th style={{ ...TH, width: 52 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group, gi) => {
                        const isOpen = !expanded.has(group.id)
                        const children = childOf(group.id)
                        const gBd = groupBreakdowns[group.id] || { mo: 0, mt: 0, eq: 0, sc: 0 }
                        return [
                          <tr key={group.id}
                            style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)', cursor: 'pointer' }}>
                            <td style={{ ...TD, textAlign: 'right', paddingRight: 10 }} className="mono tnum">
                              <span style={{ fontWeight: 700, color: 'var(--brand-700)' }}>{gi + 1}</span>
                            </td>
                            <td style={TD}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <button onClick={() => toggleGroup(group.id)} style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--brand-700)', background: 'none', border: 'none', padding: 0 }}>
                                  <ChevronDown size={14} style={{ transform: isOpen ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} />
                                </button>
                                {group.code && <span className="mono" style={{ fontWeight: 700, color: 'var(--brand-700)', fontSize: 11 }}>{group.code}</span>}
                                <span style={{ fontWeight: 700, color: 'var(--n-900)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.03em' }}>{group.name}</span>
                              </div>
                            </td>
                            <td /><td /><td />
                            <td style={{ ...TD, textAlign: 'right' }} className="mono tnum"><span style={{ fontWeight: 700, color: 'var(--brand-700)' }}>{fmtNumber(groupTotals[group.id] ?? 0)}</span></td>
                            <td style={{ ...TD, textAlign: 'right', color: '#B45309' }} className="mono tnum">{fmtNumber(gBd.mo)}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#1D4ED8' }} className="mono tnum">{fmtNumber(gBd.mt)}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#4338CA' }} className="mono tnum">{fmtNumber(gBd.eq)}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#6D28D9' }} className="mono tnum">{fmtNumber(gBd.sc)}</td>
                            <td style={{ ...TD, textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 2 }}>
                                <IconButton icon={Plus} title="Agregar partida" size={22} onClick={() => { setAddGroupId(group.id); setShowAdd(true) }} />
                                <IconButton icon={Trash2} title="Eliminar capítulo" size={22} danger onClick={() => setConfirmDel(group.id)} />
                              </div>
                            </td>
                          </tr>,
                          ...(isOpen ? children.map((it, ci) => {
                            const up = getItemUnitPrice(it, apuLines, resourceMap)
                            const subtotal = it.qty * up
                            const hasApu = apuLines.some(l => l.item_id === it.id)
                            const isSel = apuItem?.id === it.id
                            const bd = itemBreakdowns.get(it.id) || { mo: 0, mt: 0, eq: 0, sc: 0 }
                            return (
                              <tr key={it.id}
                                onClick={() => setApuItem(isSel ? null : it)}
                                style={{ borderTop: '1px solid var(--n-150)', background: isSel ? 'var(--brand-50)' : 'transparent', cursor: 'pointer', transition: 'background .1s' }}
                                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--n-25)' }}
                                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                              >
                                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-400)', fontSize: 11, paddingRight: 10 }} className="mono tnum">{gi + 1}.{ci + 1}</td>
                                <td style={TD}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 22 }}>
                                    <span style={{ color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                                    <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, padding: '0 5px', borderRadius: 3, flexShrink: 0, background: hasApu ? 'var(--brand-50)' : 'var(--n-100)', color: hasApu ? 'var(--brand-700)' : 'var(--n-400)', border: `1px solid ${hasApu ? 'var(--brand-200)' : 'var(--n-200)'}` }}>{hasApu ? 'APU' : 'PU'}</span>
                                  </div>
                                </td>
                                <td style={{ ...TD, textAlign: 'center', color: 'var(--n-600)' }} className="mono">{it.unit}</td>
                                <td style={{ ...TD, textAlign: 'right' }}>
                                  <EditableCell value={it.qty} onChange={v => updateItem(it.id, { qty: v })} decimals={2} />
                                </td>
                                <td style={{ ...TD, textAlign: 'right' }}>
                                  {hasApu
                                    ? <span className="mono tnum" style={{ color: 'var(--brand-700)', fontStyle: 'italic' }}>{fmtNumber(up)}</span>
                                    : <EditableCell value={it.unit_price || up} onChange={v => updateItem(it.id, { unit_price: v })} decimals={2} />
                                  }
                                </td>
                                <td style={{ ...TD, textAlign: 'right' }} className="mono tnum"><span style={{ fontWeight: 700, color: 'var(--n-900)' }}>{fmtNumber(subtotal)}</span></td>
                                <td style={{ ...TD, textAlign: 'right', color: '#B45309' }} className="mono tnum">{bd.mo > 0 ? fmtNumber(bd.mo) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                                <td style={{ ...TD, textAlign: 'right', color: '#1D4ED8' }} className="mono tnum">{bd.mt > 0 ? fmtNumber(bd.mt) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                                <td style={{ ...TD, textAlign: 'right', color: '#4338CA' }} className="mono tnum">{bd.eq > 0 ? fmtNumber(bd.eq) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                                <td style={{ ...TD, textAlign: 'right', color: '#6D28D9' }} className="mono tnum">{bd.sc > 0 ? fmtNumber(bd.sc) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                                <td style={{ ...TD, textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: 2 }}>
                                    <IconButton icon={Pencil} title="Editar" size={22} onClick={e => { e.stopPropagation(); setEditItem(it) }} />
                                    <IconButton icon={Trash2} title="Eliminar" size={22} danger onClick={e => { e.stopPropagation(); setConfirmDel(it.id) }} />
                                  </div>
                                </td>
                              </tr>
                            )
                          }) : []),
                        ]
                      })}

                      {orphans.map((it, idx) => {
                        const up = getItemUnitPrice(it, apuLines, resourceMap)
                        const subtotal = it.qty * up
                        const hasApu = apuLines.some(l => l.item_id === it.id)
                        const isSel = apuItem?.id === it.id
                        const bd = itemBreakdowns.get(it.id) || { mo: 0, mt: 0, eq: 0, sc: 0 }
                        return (
                          <tr key={it.id}
                            onClick={() => setApuItem(isSel ? null : it)}
                            style={{ borderTop: '1px solid var(--n-150)', background: isSel ? 'var(--brand-50)' : 'transparent', cursor: 'pointer', transition: 'background .1s' }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--n-25)' }}
                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                          >
                            <td style={{ ...TD, textAlign: 'right', color: 'var(--n-400)', fontSize: 11, paddingRight: 10 }} className="mono tnum">{idx + 1}</td>
                            <td style={TD}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                                <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, padding: '0 5px', borderRadius: 3, flexShrink: 0, background: hasApu ? 'var(--brand-50)' : 'var(--n-100)', color: hasApu ? 'var(--brand-700)' : 'var(--n-400)', border: `1px solid ${hasApu ? 'var(--brand-200)' : 'var(--n-200)'}` }}>{hasApu ? 'APU' : 'PU'}</span>
                              </div>
                            </td>
                            <td style={{ ...TD, textAlign: 'center', color: 'var(--n-600)' }} className="mono">{it.unit}</td>
                            <td style={{ ...TD, textAlign: 'right' }}>
                              <EditableCell value={it.qty} onChange={v => updateItem(it.id, { qty: v })} decimals={2} />
                            </td>
                            <td style={{ ...TD, textAlign: 'right' }}>
                              {hasApu
                                ? <span className="mono tnum" style={{ color: 'var(--brand-700)', fontStyle: 'italic' }}>{fmtNumber(up)}</span>
                                : <EditableCell value={it.unit_price || up} onChange={v => updateItem(it.id, { unit_price: v })} decimals={2} />
                              }
                            </td>
                            <td style={{ ...TD, textAlign: 'right' }} className="mono tnum"><span style={{ fontWeight: 700, color: 'var(--n-900)' }}>{fmtNumber(subtotal)}</span></td>
                            <td style={{ ...TD, textAlign: 'right', color: '#B45309' }} className="mono tnum">{bd.mo > 0 ? fmtNumber(bd.mo) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#1D4ED8' }} className="mono tnum">{bd.mt > 0 ? fmtNumber(bd.mt) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#4338CA' }} className="mono tnum">{bd.eq > 0 ? fmtNumber(bd.eq) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#6D28D9' }} className="mono tnum">{bd.sc > 0 ? fmtNumber(bd.sc) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                            <td style={{ ...TD, textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 2 }}>
                                <IconButton icon={Pencil} title="Editar" size={22} onClick={e => { e.stopPropagation(); setEditItem(it) }} />
                                <IconButton icon={Trash2} title="Eliminar" size={22} danger onClick={e => { e.stopPropagation(); setConfirmDel(it.id) }} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {items.length === 0 && (
                        <tr><td colSpan={11} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
                          Agrega capítulos y partidas con el botón de arriba.
                        </td></tr>
                      )}

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom analysis panel */}
              {apuItem && (
                <BottomAnalysisPanel
                  item={apuItem}
                  apuLines={apuLines}
                  resources={resources}
                  onUpsert={upsertApuLine}
                  onDeleteLine={deleteApuLine}
                  onUpdateItem={updateItem}
                  onClose={() => setApuItem(null)}
                />
              )}
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
                        <th style={{ ...TH, width: 140 }}>Categoría</th>
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
                            <td style={{ ...TD, color: 'var(--n-600)' }}>{r.categoria ?? <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
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

      {/* Edit budget metadata modal */}
      {showEditModal && (
        <BudgetMetaModal
          budget={budget}
          onSave={async data => { await updateBudget(data); setShowEditModal(false) }}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Add item modal */}
      {showAdd && (
        <AddItemModal
          budgetId={id!}
          groups={groups}
          defaultGroupId={addGroupId}
          type={addItemType}
          onAdd={createItem}
          onUpsertApuLine={upsertApuLine}
          resources={resources}
          onClose={() => setShowAdd(false)}
        />
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
