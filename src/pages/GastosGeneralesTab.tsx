import { useState, useMemo } from 'react'
import type { Budget, GGItem, GGRubroId } from '../lib/types'
import {
  GG_RUBROS, GG_RUBRO_ORDER, GG_CATALOG, GG_UNITS,
  ggItemTotal, ggTotals, nextGGCode,
  type GGCatalogItem,
} from '../lib/ggHelpers'
import { fmtCurrency, fmtNumber } from '../lib/budgetHelpers'
import { Button, IconButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Plus, Trash2, Pencil, Search } from 'lucide-react'

// ── Styles ────────────────────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '8px 12px', fontWeight: 600, fontSize: 10.5,
  color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap', textAlign: 'left',
}
const TD: React.CSSProperties = { padding: '6px 12px', verticalAlign: 'middle', fontSize: 12.5 }

// ── Editable cell ─────────────────────────────────────────────────────────────
function GGCell({ value, onChange, decimals = 2, width = 64 }: {
  value: number; onChange: (v: number) => void; decimals?: number; width?: number
}) {
  const [editing, setEditing] = useState(false)
  const [tmp, setTmp] = useState(value)
  const commit = () => { setEditing(false); onChange(tmp) }
  if (!editing) return (
    <span onClick={e => { e.stopPropagation(); setTmp(value); setEditing(true) }}
      className="mono tnum"
      style={{ display: 'inline-block', minWidth: width, padding: '2px 6px', borderRadius: 4, cursor: 'text', color: 'var(--n-800)', transition: 'background .12s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--n-100)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
  return (
    <input autoFocus type="number" value={tmp}
      onChange={e => setTmp(parseFloat(e.target.value) || 0)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      style={{
        width: width + 20, padding: '2px 6px',
        border: '1.5px solid var(--brand-500)', borderRadius: 4, outline: 'none',
        textAlign: 'right', fontFamily: 'inherit', fontSize: 12.5,
        background: '#fff', boxShadow: '0 0 0 3px rgba(79,70,229,.12)',
      }}
    />
  )
}

// ── Kind header row ───────────────────────────────────────────────────────────
function KindHeader({ label, subtotal, hint }: {
  label: string; subtotal: number; hint: string
}) {
  return (
    <tr style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)' }}>
      <td style={TD} colSpan={6}>
        <span style={{ fontWeight: 700, color: 'var(--brand-700)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', paddingLeft: 4 }}>
          {label}
        </span>
        <span className="mono" style={{ marginLeft: 10, fontSize: 10.5, color: 'var(--brand-700)', opacity: 0.7 }}>
          · {hint}
        </span>
      </td>
      <td style={{ ...TD, textAlign: 'right' }} className="mono tnum">
        <span style={{ fontWeight: 700, color: 'var(--brand-700)' }}>{fmtNumber(subtotal)}</span>
      </td>
      <td style={TD} />
    </tr>
  )
}

// ── Rubro sub-header ──────────────────────────────────────────────────────────
function RubroHeader({ rubroId, subtotal }: { rubroId: GGRubroId; subtotal: number }) {
  const r = GG_RUBROS[rubroId]
  return (
    <tr style={{ background: 'var(--n-50)', borderTop: '1px solid var(--n-150)' }}>
      <td style={{ ...TD, padding: '5px 12px' }} colSpan={6}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, paddingLeft: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: r.dot }} />
          <span style={{ fontWeight: 600, fontSize: 11, color: r.fg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.label}</span>
        </span>
      </td>
      <td style={{ ...TD, padding: '5px 12px', textAlign: 'right' }} className="mono tnum">
        <span style={{ fontSize: 11, color: 'var(--n-600)', fontWeight: 600 }}>{fmtNumber(subtotal)}</span>
      </td>
      <td style={TD} />
    </tr>
  )
}

// ── Item row ──────────────────────────────────────────────────────────────────
function GGRow({ item, directCost, onUpdate, onEdit, onDelete }: {
  item: GGItem; directCost: number
  onUpdate: (updates: Partial<GGItem>) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const rubro    = GG_RUBROS[item.rubro]
  const isVar    = rubro?.kind === 'variable'
  const isPct    = item.unit === '%'
  const partial  = ggItemTotal(item, directCost)

  return (
    <tr style={{ borderTop: '1px solid var(--n-150)', transition: 'background .12s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ ...TD, padding: '6px 12px' }} className="mono tnum">
        <span style={{ color: 'var(--n-500)', fontSize: 11 }}>{item.code}</span>
      </td>
      <td style={{ ...TD, padding: '6px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--n-900)' }}>{item.name}</span>
          {isPct && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'var(--n-100)', color: 'var(--n-600)', letterSpacing: '0.04em' }}>
              % del directo
            </span>
          )}
        </div>
      </td>
      <td style={{ ...TD, padding: '6px 12px', textAlign: 'center' }} className="mono">
        <span style={{ color: 'var(--n-600)' }}>{item.unit}</span>
      </td>
      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
        <GGCell value={item.qty} decimals={2} width={48}
          onChange={v => onUpdate({ qty: v })} />
      </td>
      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
        <GGCell value={item.unit_price} decimals={isPct ? 3 : 2} width={68}
          onChange={v => onUpdate({ unit_price: v })} />
      </td>
      <td style={{ ...TD, padding: '6px 12px', textAlign: 'center' }}>
        {isVar && !isPct ? (
          <GGCell value={item.months ?? 0} decimals={0} width={36}
            onChange={v => onUpdate({ months: v })} />
        ) : (
          <span style={{ color: 'var(--n-300)' }}>—</span>
        )}
      </td>
      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }} className="mono tnum">
        <span style={{ fontWeight: 600, color: 'var(--n-900)' }}>{fmtNumber(partial)}</span>
      </td>
      <td style={{ ...TD, padding: '6px 12px', textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', gap: 2 }}>
          <IconButton icon={Pencil} title="Editar" size={22} onClick={e => { e.stopPropagation(); onEdit() }} />
          <IconButton icon={Trash2} title="Eliminar" size={22} danger onClick={e => { e.stopPropagation(); onDelete() }} />
        </div>
      </td>
    </tr>
  )
}

// ── Right-rail summary ────────────────────────────────────────────────────────
function GGSummaryPanel({ budget, items, directCost }: {
  budget: Budget; items: GGItem[]; directCost: number
}) {
  const totals     = ggTotals(items, directCost)
  const pctDirect  = directCost > 0 ? (totals.total / directCost) * 100 : 0
  const fijoPct    = totals.total > 0 ? (totals.fijo    / totals.total) * 100 : 0
  const varPct     = totals.total > 0 ? (totals.variable / totals.total) * 100 : 0

  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
        Gastos Generales
      </div>
      <h2 style={{ fontSize: 15, marginBottom: 14, color: 'var(--n-900)' }}>Resumen del overhead</h2>

      <div className="mono tnum" style={{ fontSize: 30, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 4 }}>
        {fmtCurrency(totals.total, budget.currency)}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginBottom: 18 }}>
        {budget.currency} · {totals.count} partidas · <strong className="mono" style={{ color: 'var(--n-700)' }}>{pctDirect.toFixed(2)}%</strong> del directo
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        <SplitRow label="Fijos"     amount={totals.fijo}     pct={fijoPct} color="var(--brand-500)" />
        <SplitRow label="Variables" amount={totals.variable} pct={varPct}  color="#10B981"
          hint={`${budget.gg_months} ${budget.gg_months === 1 ? 'mes' : 'meses'}`} />
      </div>

      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)', marginBottom: 16 }}>
        <div style={{ width: fijoPct + '%', background: 'var(--brand-500)' }} />
        <div style={{ width: varPct  + '%', background: '#10B981' }} />
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Por rubro
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GG_RUBRO_ORDER.map(rid => {
          const amt = totals.byRubro[rid] || 0
          if (amt <= 0) return null
          const pct   = totals.total > 0 ? (amt / totals.total) * 100 : 0
          const rubro = GG_RUBROS[rid]
          return (
            <div key={rid}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--n-700)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: rubro.dot }} />
                  {rubro.label}
                </span>
                <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-900)', fontWeight: 600 }}>
                  {fmtNumber(amt)}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: 'var(--n-100)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: rubro.dot }} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 18, padding: '10px 12px', background: 'var(--n-50)', border: '1px solid var(--n-150)', borderRadius: 8, fontSize: 11, color: 'var(--n-600)', lineHeight: 1.55 }}>
        El total de gastos generales reemplaza al cálculo plano de indirectos en el resumen del presupuesto.
      </div>
    </div>
  )
}

function SplitRow({ label, amount, pct, color, hint }: {
  label: string; amount: number; pct: number; color: string; hint?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-800)' }}>{label}</span>
        {hint && <span className="mono" style={{ fontSize: 10.5, color: 'var(--n-500)' }}>· {hint}</span>}
      </span>
      <span>
        <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)' }}>{fmtNumber(amount)}</span>
        <span className="mono" style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--n-500)' }}>{pct.toFixed(0)}%</span>
      </span>
    </div>
  )
}

// ── Catalog picker modal ──────────────────────────────────────────────────────
function CatalogPicker({ ggMonths, onPick, onClose }: {
  ggMonths: number
  onPick: (item: GGCatalogItem) => void
  onClose: () => void
}) {
  const [query,  setQuery]  = useState('')
  const [rubroF, setRubroF] = useState<GGRubroId | ''>('')

  const filtered = GG_CATALOG.filter(it => {
    if (rubroF && it.rubro !== rubroF) return false
    if (query && !it.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const INP: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)',
    borderRadius: 6, background: 'var(--n-0)', outline: 'none', color: 'var(--n-900)',
  }

  return (
    <Modal open onClose={onClose} title="Catálogo de gastos generales">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar partida…"
            style={{ ...INP, width: '100%', paddingLeft: 28, boxSizing: 'border-box' }} />
        </div>
        <select value={rubroF} onChange={e => setRubroF(e.target.value as GGRubroId | '')}
          style={{ ...INP, cursor: 'pointer', width: 180 }}>
          <option value="">Todos los rubros</option>
          {GG_RUBRO_ORDER.map(r => (
            <option key={r} value={r}>{GG_RUBROS[r].label}</option>
          ))}
        </select>
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto', margin: '0 -18px', padding: '0 8px' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
            Sin resultados. Prueba otra búsqueda.
          </div>
        )}
        {filtered.map(item => {
          const rubro  = GG_RUBROS[item.rubro]
          const isVar  = rubro.kind === 'variable'
          const isPct  = item.unit === '%'
          const preview = isPct
            ? `${item.price}%`
            : isVar
              ? `${fmtNumber(item.price)} × ${ggMonths} meses = ${fmtNumber(item.price * ggMonths)}`
              : fmtNumber(item.price)
          return (
            <button key={item.id} onClick={() => onPick(item)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
                width: '100%', padding: '8px 12px', borderRadius: 6,
                textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent',
                transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--n-900)', fontWeight: 500 }}>{item.name}</div>
                <div style={{ marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: rubro.dot }} />
                  <span style={{ fontSize: 10.5, color: rubro.fg, fontWeight: 600 }}>{rubro.label}</span>
                </div>
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--n-500)' }}>{item.unit}</span>
              <span className="mono tnum" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)', minWidth: 90, textAlign: 'right' }}>
                {preview}
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

// ── Add/Edit item form ────────────────────────────────────────────────────────
function GGItemForm({ item, budgetId, ggItems, ggMonths, directCost, onSave, onClose }: {
  item?: GGItem
  budgetId: string
  ggItems: GGItem[]
  ggMonths: number
  directCost: number
  onSave: (payload: Omit<GGItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const isEdit = !!item
  const [rubro,      setRubro]      = useState<GGRubroId>(item?.rubro      ?? 'gestion')
  const [code,       setCode]       = useState(item?.code        ?? '')
  const [name,       setName]       = useState(item?.name        ?? '')
  const [unit,       setUnit]       = useState(item?.unit        ?? 'glb')
  const [qty,        setQty]        = useState(String(item?.qty  ?? 1))
  const [unitPrice,  setUnitPrice]  = useState(String(item?.unit_price ?? 0))
  const [months,     setMonths]     = useState(String(item?.months ?? ggMonths))
  const [saving,     setSaving]     = useState(false)

  const rubroDef  = GG_RUBROS[rubro]
  const isVar     = rubroDef?.kind === 'variable'
  const isPct     = unit === '%'
  const qtyN      = parseFloat(qty) || 1
  const priceN    = parseFloat(unitPrice) || 0
  const monthsN   = parseInt(months) || ggMonths
  const previewTotal = ggItemTotal(
    { id: '', budget_id: budgetId, rubro, code, name, unit, qty: qtyN, unit_price: priceN, months: isVar && !isPct ? monthsN : null, sort_order: 0, created_at: '', updated_at: '' },
    directCost,
  )

  // Auto-generate code when rubro changes (new items only)
  const autoCode = !isEdit ? nextGGCode(ggItems, rubro) : ''

  const INP: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5, width: '100%',
    border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)',
    outline: 'none', boxSizing: 'border-box', color: 'var(--n-900)',
  }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        budget_id: budgetId,
        rubro,
        code: (code || autoCode).trim(),
        name: name.trim(),
        unit,
        qty: qtyN,
        unit_price: priceN,
        months: isVar && !isPct ? monthsN : null,
        sort_order: item?.sort_order ?? (ggItems.length + 1) * 10,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Editar gasto general' : 'Nuevo gasto general'}>
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Rubro selector */}
        <div>
          <label style={LBL}>Rubro *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {GG_RUBRO_ORDER.map(rid => {
              const r      = GG_RUBROS[rid]
              const active = rubro === rid
              return (
                <button key={rid} type="button" onClick={() => setRubro(rid)}
                  style={{
                    padding: '8px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                    border: `1.5px solid ${active ? r.fg : 'var(--n-200)'}`,
                    background: active ? r.bg : 'var(--n-0)',
                    borderRadius: 7, cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: r.dot }} />
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: active ? r.fg : 'var(--n-500)' }}>
                      {r.kind}
                    </span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 550, color: active ? r.fg : 'var(--n-800)', lineHeight: 1.25 }}>
                    {r.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div>
            <label style={LBL}>Código</label>
            <input style={INP} value={code} onChange={e => setCode(e.target.value)} placeholder={autoCode} />
          </div>
          <div>
            <label style={LBL}>Descripción *</label>
            <input style={INP} value={name} onChange={e => setName(e.target.value)} required autoFocus={!isEdit} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={LBL}>Unidad</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
              {GG_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{isPct ? 'Aplicaciones' : 'Cantidad'}</label>
            <input type="number" step="any" min="0" style={INP} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label style={LBL}>{isPct ? '% sobre directo' : 'Precio unitario'}</label>
            <input type="number" step="any" min="0" style={INP} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
          </div>
          {isVar && !isPct && (
            <div>
              <label style={LBL}>Meses</label>
              <input type="number" step="1" min="1" style={INP} value={months} onChange={e => setMonths(e.target.value)} />
            </div>
          )}
        </div>

        {/* Live preview */}
        <div style={{ padding: '10px 14px', background: 'var(--n-50)', border: '1px solid var(--n-150)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Parcial estimado</div>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>
              {isPct
                ? <span>{priceN}% × <span className="mono tnum">{fmtNumber(directCost)}</span> × {qtyN}</span>
                : isVar
                  ? <span>{qtyN} × {fmtNumber(priceN)} × {monthsN} meses</span>
                  : <span>{qtyN} × {fmtNumber(priceN)}</span>
              }
            </div>
          </div>
          <div className="mono tnum" style={{ fontSize: 20, fontWeight: 600, color: 'var(--n-900)', letterSpacing: '-0.02em' }}>
            {fmtNumber(previewTotal)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={saving || !name.trim()} icon={isEdit ? Pencil : Plus}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Agregar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export interface GastosGeneralesTabProps {
  budget: Budget
  items: GGItem[]
  directCost: number
  onUpdateBudget: (updates: Partial<Budget>) => Promise<void>
  onCreateItem: (payload: Omit<GGItem, 'id' | 'created_at' | 'updated_at'>) => Promise<GGItem>
  onUpdateItem: (id: string, updates: Partial<GGItem>) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
}


export default function GastosGeneralesTab({
  budget, items, directCost,
  onUpdateBudget, onCreateItem, onUpdateItem, onDeleteItem,
}: GastosGeneralesTabProps) {
  const [showForm,    setShowForm]    = useState(false)
  const [editItem,    setEditItem]    = useState<GGItem | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)

  const totals = useMemo(() => ggTotals(items, directCost), [items, directCost])
  const pctDirect = directCost > 0 ? (totals.total / directCost) * 100 : 0

  const itemsByRubro = useMemo(() => {
    const m: Partial<Record<GGRubroId, GGItem[]>> = {}
    items.forEach(it => {
      if (!m[it.rubro]) m[it.rubro] = []
      m[it.rubro]!.push(it)
    })
    return m
  }, [items])

  const fijoRubros    = GG_RUBRO_ORDER.filter(r => GG_RUBROS[r].kind === 'fijo'     && itemsByRubro[r])
  const variableRubros = GG_RUBRO_ORDER.filter(r => GG_RUBROS[r].kind === 'variable' && itemsByRubro[r])

  const ggMonths = budget.gg_months ?? 3


  const handleCatalogPick = async (catItem: GGCatalogItem) => {
    const rubro   = catItem.rubro
    const kind    = GG_RUBROS[rubro]?.kind
    const isVar   = kind === 'variable'
    const months  = isVar && catItem.unit === 'mes' ? ggMonths : null
    await onCreateItem({
      budget_id: budget.id,
      rubro,
      code: nextGGCode(items, rubro),
      name: catItem.name,
      unit: catItem.unit,
      qty: 1,
      unit_price: catItem.price,
      months,
      sort_order: (items.length + 1) * 10,
    })
    setShowCatalog(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--n-50)' }}>
      {/* Table area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 14px 24px' }}>

        {/* Top controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: 12,
          background: 'var(--n-0)', border: '1px solid var(--n-200)',
          borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--n-600)', fontWeight: 500 }}>Duración de obra</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--n-200)', borderRadius: 6, overflow: 'hidden' }}>
              <button onClick={() => ggMonths > 1 && onUpdateBudget({ gg_months: ggMonths - 1 })}
                style={{ width: 28, height: 28, color: 'var(--n-600)', background: 'none', cursor: 'pointer', border: 'none', borderRight: '1px solid var(--n-200)', fontSize: 16 }}>−</button>
              <span className="mono tnum" style={{ minWidth: 64, padding: '0 10px', textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>
                {ggMonths} {ggMonths === 1 ? 'mes' : 'meses'}
              </span>
              <button onClick={() => onUpdateBudget({ gg_months: ggMonths + 1 })}
                style={{ width: 28, height: 28, color: 'var(--n-600)', background: 'none', cursor: 'pointer', border: 'none', borderLeft: '1px solid var(--n-200)', fontSize: 16 }}>+</button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--n-500)' }}>· afecta a partidas variables</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Costo directo</span>
            <span className="mono tnum" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>
              {fmtCurrency(directCost, budget.currency)}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                <th style={{ ...TH, width: 80 }}>Código</th>
                <th style={{ ...TH, minWidth: 280 }}>Descripción</th>
                <th style={{ ...TH, width: 54, textAlign: 'center' }}>Und</th>
                <th style={{ ...TH, width: 90, textAlign: 'right' }}>Cant.</th>
                <th style={{ ...TH, width: 110, textAlign: 'right' }}>P. Unit.</th>
                <th style={{ ...TH, width: 70, textAlign: 'center' }}>Meses</th>
                <th style={{ ...TH, width: 130, textAlign: 'right' }}>Parcial</th>
                <th style={{ ...TH, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
                    Sin partidas. Agrega una desde el catálogo o manualmente.
                  </td>
                </tr>
              ) : (
                <>
                  {/* FIJOS */}
                  {fijoRubros.length > 0 && (
                    <KindHeader label="Gastos generales fijos" subtotal={totals.fijo}
                      hint="independientes del plazo"  />
                  )}
                  {fijoRubros.map(rid => {
                    const rowItems = itemsByRubro[rid]!
                    const sub = rowItems.reduce((s, it) => s + ggItemTotal(it, directCost), 0)
                    return (
                      <>
                        <RubroHeader key={`rh-${rid}`} rubroId={rid} subtotal={sub} />
                        {rowItems.map(it => (
                          <GGRow key={it.id} item={it} directCost={directCost}
                            onUpdate={u => onUpdateItem(it.id, u)}
                            onEdit={() => setEditItem(it)}
                            onDelete={() => setConfirmDel(it.id)} />
                        ))}
                      </>
                    )
                  })}

                  {/* VARIABLES */}
                  {variableRubros.length > 0 && (
                    <KindHeader label="Gastos generales variables" subtotal={totals.variable}
                      hint={`${ggMonths} ${ggMonths === 1 ? 'mes' : 'meses'} de obra`}  />
                  )}
                  {variableRubros.map(rid => {
                    const rowItems = itemsByRubro[rid]!
                    const sub = rowItems.reduce((s, it) => s + ggItemTotal(it, directCost), 0)
                    return (
                      <>
                        <RubroHeader key={`rh-${rid}`} rubroId={rid} subtotal={sub} />
                        {rowItems.map(it => (
                          <GGRow key={it.id} item={it} directCost={directCost}
                            onUpdate={u => onUpdateItem(it.id, u)}
                            onEdit={() => setEditItem(it)}
                            onDelete={() => setConfirmDel(it.id)} />
                        ))}
                      </>
                    )
                  })}

                  {/* Total row */}
                  <tr style={{ borderTop: '2px solid var(--n-300)', background: 'var(--n-25)' }}>
                    <td colSpan={6} style={TD}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--n-700)', paddingLeft: 6 }}>
                        TOTAL GASTOS GENERALES
                      </span>
                      <span className="mono" style={{ marginLeft: 10, fontSize: 11, color: 'var(--n-500)' }}>
                        {pctDirect.toFixed(2)}% del costo directo
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }} className="mono tnum">
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--n-900)' }}>{fmtNumber(totals.total)}</span>
                    </td>
                    <td style={TD} />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={() => setShowCatalog(true)}>Cargar del catálogo</Button>
          <Button icon={Plus} variant="primary" onClick={() => setShowForm(true)}>Nueva partida</Button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--n-500)', padding: '10px 4px 0', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--n-700)' }}>Notas:</strong> las partidas con unidad <span className="mono">%</span> se
          calculan sobre el costo directo. Las partidas variables se multiplican por los meses configurados arriba.
        </div>
      </div>

      {/* Right rail */}
      <aside style={{ flex: '0 0 320px', borderLeft: '1px solid var(--n-150)', background: 'var(--n-0)', overflowY: 'auto' }}>
        <GGSummaryPanel budget={budget} items={items} directCost={directCost} />
      </aside>

      {/* Modals */}
      {showCatalog && (
        <CatalogPicker ggMonths={ggMonths} onPick={handleCatalogPick} onClose={() => setShowCatalog(false)} />
      )}

      {(showForm || editItem) && (
        <GGItemForm
          item={editItem ?? undefined}
          budgetId={budget.id}
          ggItems={items}
          ggMonths={ggMonths}
          directCost={directCost}
          onSave={editItem
            ? async p => onUpdateItem(editItem.id, p)
            : async p => { await onCreateItem(p) }
          }
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Eliminar partida" size="sm">
        {confirmDel && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
              ¿Eliminar esta partida de gastos generales?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setConfirmDel(null)}>Cancelar</Button>
              <Button variant="danger" onClick={async () => { await onDeleteItem(confirmDel); setConfirmDel(null) }}>
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
