import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSchedules } from '../hooks/useSchedules'
import { useScheduleEditor } from '../hooks/useScheduleEditor'
import { useBudgetItems } from '../hooks/useBudgetItems'
import { useBudgetResources } from '../hooks/useBudgetResources'
import { useBudgets } from '../hooks/useBudgets'
import { PageLoader } from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import {
  generatePeriods, distributeItemCost, getOverlappingPeriods, cumulative,
  todayPeriodIndex, periodContaining, type Period,
} from '../lib/scheduleHelpers'
import { buildResourceMap, getItemUnitPrice, fmtNumber } from '../lib/budgetHelpers'
import { fmtCurrency } from '../lib/budgetHelpers'
import type { BudgetItem, ScheduleTask, ScheduleActual, PeriodType } from '../lib/types'
import {
  ChevronLeft, ChevronRight, BarChart2, TrendingUp,
  CalendarDays, Info,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from 'recharts'

// ── helpers ──────────────────────────────────────────────────────────────────

const CELL_W: Record<PeriodType, number> = { day: 38, week: 62, month: 90 }
const LEFT_W = 290
const ROW_H  = 36

// ── GanttTab ─────────────────────────────────────────────────────────────────

function GanttTab({
  periodType, periods, groups, itemsOnly, tasks, scheduleStart, scheduleEnd,
  actuals, replaceItemActuals, itemUnitPrices,
  onUpsert, onDelete,
}: {
  periodType: PeriodType
  periods: Period[]
  groups: BudgetItem[]
  itemsOnly: BudgetItem[]
  tasks: ScheduleTask[]
  scheduleStart: string
  scheduleEnd: string
  actuals: ScheduleActual[]
  replaceItemActuals: (itemId: string, entries: { periodDate: string; amount: number }[]) => Promise<void>
  itemUnitPrices: Map<string, number>
  onUpsert: (itemId: string, s: string, e: string) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
}) {
  const CW = CELL_W[periodType]
  const todayIdx = useMemo(() => todayPeriodIndex(periods), [periods])

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(groups.map(g => g.id)))
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [dates,    setDates]    = useState({ start: '', end: '' })
  const [saving,   setSaving]   = useState(false)
  const [actualPct, setActualPct]         = useState(0)
  const [actualPctDirty, setActualPctDirty] = useState(false)
  const [itemCost, setItemCost]           = useState(0)

  const itemActualPcts = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of itemsOnly) {
      const cost = it.qty * (itemUnitPrices.get(it.id) ?? 0)
      if (cost <= 0) { m.set(it.id, 0); continue }
      const totalActual = actuals.filter(a => a.item_id === it.id).reduce((s, a) => s + a.executed_amount, 0)
      m.set(it.id, Math.min(1, totalActual / cost))
    }
    return m
  }, [itemsOnly, actuals, itemUnitPrices])

  const rows = useMemo(() => {
    type Row = { kind: 'group'; item: BudgetItem } | { kind: 'item'; item: BudgetItem }
    const out: Row[] = []
    for (const g of groups) {
      out.push({ kind: 'group', item: g })
      if (expanded.has(g.id)) {
        itemsOnly.filter(it => it.parent_id === g.id).forEach(it => out.push({ kind: 'item', item: it }))
      }
    }
    itemsOnly.filter(it => !groups.find(g => g.id === it.parent_id)).forEach(it => out.push({ kind: 'item', item: it }))
    return out
  }, [groups, itemsOnly, expanded])

  const openEdit = (item: BudgetItem) => {
    const t = tasks.find(t => t.item_id === item.id)
    setDates({ start: t?.start_date ?? scheduleStart, end: t?.end_date ?? scheduleEnd })
    const cost = item.qty * (itemUnitPrices.get(item.id) ?? 0)
    const totalActual = actuals.filter(a => a.item_id === item.id).reduce((s, a) => s + a.executed_amount, 0)
    setItemCost(cost)
    setActualPct(cost > 0 ? Math.min(1, totalActual / cost) : 0)
    setActualPctDirty(false)
    setEditItem(item)
  }

  const handleSave = async () => {
    if (!editItem || !dates.start || !dates.end) return
    setSaving(true)
    try {
      await onUpsert(editItem.id, dates.start, dates.end)
      if (actualPctDirty) {
        const dist = distributeItemCost(itemCost * actualPct, dates.start, dates.end, periods)
        await replaceItemActuals(editItem.id, periods.map((p, i) => ({ periodDate: p.isoDate, amount: dist[i] })))
      }
      setEditItem(null)
    } finally { setSaving(false) }
  }

  const handleRemove = async () => {
    if (!editItem) return
    setSaving(true)
    try { await onDelete(editItem.id); setEditItem(null) }
    finally { setSaving(false) }
  }

  const INP: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5, width: '100%', boxSizing: 'border-box',
    border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none',
  }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  return (
    <>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {periods.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
            El rango de fechas del cronograma no genera períodos.
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', minWidth: LEFT_W + periods.length * CW }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 11, width: LEFT_W, minWidth: LEFT_W,
                  background: 'var(--n-25)', borderBottom: '2px solid var(--n-200)',
                  borderRight: '1px solid var(--n-200)', textAlign: 'left',
                  padding: '0 16px', fontSize: 11, fontWeight: 600,
                  color: 'var(--n-500)', height: ROW_H, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Partida
                </th>
                {periods.map((p, i) => (
                  <th key={p.isoDate} style={{
                    width: CW, minWidth: CW, textAlign: 'center', height: ROW_H,
                    fontSize: 10, fontWeight: 600,
                    color: i === todayIdx ? '#DC2626' : 'var(--n-500)',
                    borderBottom: '2px solid var(--n-200)',
                    borderLeft: i === todayIdx ? '2px solid #EF4444' : '1px solid var(--n-150)',
                    background: i === todayIdx ? 'rgba(239,68,68,0.05)' : 'var(--n-25)',
                    padding: 0,
                  }}>
                    {p.label}
                    {i === todayIdx && <div style={{ width: 4, height: 4, borderRadius: 999, background: '#EF4444', margin: '1px auto 0' }} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                if (row.kind === 'group') {
                  const isOpen = expanded.has(row.item.id)
                  return (
                    <tr key={row.item.id} style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)' }}>
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 1,
                        background: 'var(--brand-50)', borderRight: '1px solid var(--n-200)',
                        padding: '0 16px', height: ROW_H,
                      }}>
                        <button
                          onClick={() => setExpanded(prev => { const n = new Set(prev); isOpen ? n.delete(row.item.id) : n.add(row.item.id); return n })}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <ChevronRight size={13} style={{ color: 'var(--brand-600)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {row.item.code && <span className="mono" style={{ color: 'var(--brand-500)', marginRight: 5, fontSize: 10.5 }}>{row.item.code}</span>}
                            {row.item.name}
                          </span>
                        </button>
                      </td>
                      {periods.map((p, i) => (
                        <td key={p.isoDate} style={{
                          height: ROW_H,
                          background: i === todayIdx ? 'rgba(239,68,68,0.04)' : 'var(--brand-50)',
                          borderLeft: i === todayIdx ? '2px solid rgba(239,68,68,0.25)' : '1px solid var(--brand-100)',
                        }} />
                      ))}
                    </tr>
                  )
                }

                const task = tasks.find(t => t.item_id === row.item.id)
                const bar = task ? getOverlappingPeriods(task.start_date, task.end_date, periods) : null

                return (
                  <tr key={row.item.id}
                    style={{ borderTop: '1px solid var(--n-100)', cursor: 'pointer', transition: 'background .1s' }}
                    onClick={() => openEdit(row.item)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 1, background: 'inherit',
                      borderRight: '1px solid var(--n-200)', padding: '0 16px', height: ROW_H,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--n-800)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.item.code && <span className="mono" style={{ color: 'var(--n-400)', marginRight: 6, fontSize: 10.5 }}>{row.item.code}</span>}
                          {row.item.name}
                        </span>
                        {(() => {
                          const pct = itemActualPcts.get(row.item.id) ?? 0
                          if (pct <= 0) return null
                          return (
                            <span className="mono tnum" style={{
                              fontSize: 9.5, fontWeight: 700, flexShrink: 0,
                              color: pct >= 1 ? 'var(--green-700)' : 'var(--brand-700)',
                              background: pct >= 1 ? 'var(--green-50)' : 'var(--brand-50)',
                              border: `1px solid ${pct >= 1 ? 'var(--green-100)' : 'var(--brand-100)'}`,
                              borderRadius: 4, padding: '1px 5px',
                            }}>
                              {Math.round(pct * 100)}%
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    {periods.map((p, i) => {
                      const inBar   = bar !== null && i >= bar.start && i <= bar.end
                      const isStart = bar !== null && i === bar.start
                      const isEnd   = bar !== null && i === bar.end
                      return (
                        <td key={p.isoDate} style={{
                          height: ROW_H, padding: '7px 0',
                          background: i === todayIdx ? 'rgba(239,68,68,0.04)' : 'transparent',
                          borderLeft: i === todayIdx ? '2px solid rgba(239,68,68,0.2)' : '1px solid var(--n-100)',
                        }}>
                          {inBar && (
                            <div style={{
                              height: 22, background: 'var(--brand-500)', opacity: 0.88,
                              borderRadius: `${isStart ? 4 : 0}px ${isEnd ? 4 : 0}px ${isEnd ? 4 : 0}px ${isStart ? 4 : 0}px`,
                              marginLeft: isStart ? 3 : 0, marginRight: isEnd ? 3 : 0,
                            }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={periods.length + 1} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
                  El presupuesto no tiene partidas. Agrega partidas al presupuesto primero.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Programar partida">
        {editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Item header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--brand-50)', border: '1px solid var(--brand-100)', borderRadius: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                {editItem.code && <div className="mono tnum" style={{ fontSize: 10.5, color: 'var(--brand-700)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 2 }}>{editItem.code}</div>}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>{editItem.name}</div>
                {itemCost > 0 && <div className="mono tnum" style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 2 }}>{editItem.qty} {editItem.unit} · {fmtNumber(itemCost)}</div>}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LBL}>Inicio</label>
                <input type="date" style={INP} value={dates.start} min={scheduleStart} max={scheduleEnd}
                  onChange={e => setDates(d => ({ ...d, start: e.target.value }))} />
              </div>
              <div>
                <label style={LBL}>Fin</label>
                <input type="date" style={INP} value={dates.end} min={dates.start || scheduleStart} max={scheduleEnd}
                  onChange={e => setDates(d => ({ ...d, end: e.target.value }))} />
              </div>
            </div>

            {/* Avance real slider */}
            <div>
              <label style={LBL}>Avance real — {Math.round(actualPct * 100)}%</label>
              <input
                type="range" min="0" max="100" step="5"
                value={Math.round(actualPct * 100)}
                onChange={e => { setActualPct(Number(e.target.value) / 100); setActualPctDirty(true) }}
                style={{ width: '100%', accentColor: 'var(--brand-600)', marginTop: 4, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--n-400)', marginTop: 2 }} className="mono tnum">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            {/* Costo planificado / ganado */}
            {itemCost > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '8px 12px', background: 'var(--n-25)', border: '1px solid var(--n-150)', borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: 'var(--n-500)', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Planificado</div>
                  <div className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>{fmtNumber(itemCost)}</div>
                </div>
                <div style={{ padding: '8px 12px', background: actualPct > 0 ? 'var(--brand-50)' : 'var(--n-25)', border: `1px solid ${actualPct > 0 ? 'var(--brand-100)' : 'var(--n-150)'}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: actualPct > 0 ? 'var(--brand-700)' : 'var(--n-500)', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Costo ganado</div>
                  <div className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: actualPct > 0 ? 'var(--brand-700)' : 'var(--n-400)' }}>{fmtNumber(itemCost * actualPct)}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {tasks.find(t => t.item_id === editItem.id)
                ? <Button variant="danger" onClick={handleRemove} disabled={saving}>Quitar del cronograma</Button>
                : <div />}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => setEditItem(null)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave} disabled={saving || !dates.start || !dates.end}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// ── DistributionTab ───────────────────────────────────────────────────────────

function ActualCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.select() }, [editing])

  if (editing) {
    return (
      <input ref={ref} type="number" step="0.01" min="0" autoFocus
        defaultValue={value || ''}
        style={{ width: '100%', fontSize: 11.5, textAlign: 'right', background: 'transparent', border: 'none', outline: 'none', color: 'var(--brand-700)', fontFamily: 'inherit', fontWeight: 600 }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'Tab') { onSave(parseFloat(e.currentTarget.value) || 0); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={e => { onSave(parseFloat(e.target.value) || 0); setEditing(false) }}
      />
    )
  }

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'text', minHeight: 18, color: value ? 'var(--brand-700)' : 'var(--n-300)', fontSize: 11.5, fontWeight: value ? 600 : 400 }} className="mono tnum">
      {value ? fmtNumber(value) : '—'}
    </div>
  )
}

function DistributionTab({
  periodType, periods, groups, itemsOnly, tasks, actuals, onUpsertActual,
  itemUnitPrices,
}: {
  periodType: PeriodType
  periods: Period[]
  groups: BudgetItem[]
  itemsOnly: BudgetItem[]
  tasks: ScheduleTask[]
  actuals: ScheduleActual[]
  onUpsertActual: (itemId: string, periodDate: string, amount: number) => Promise<void>
  itemUnitPrices: Map<string, number>
}) {
  const CW = CELL_W[periodType]
  const LEFT_W_DIST = 300

  const itemsWithPlanned = useMemo(() => itemsOnly.map(it => {
    const task = tasks.find(t => t.item_id === it.id)
    const up   = itemUnitPrices.get(it.id) ?? 0
    const totalCost = it.qty * up
    const planned = task
      ? distributeItemCost(totalCost, task.start_date, task.end_date, periods)
      : periods.map(() => 0)
    return { ...it, totalCost, planned, up }
  }), [itemsOnly, tasks, periods, itemUnitPrices])

  const getActual = (itemId: string, periodDate: string) =>
    actuals.find(a => a.item_id === itemId && a.period_date === periodDate)?.executed_amount ?? 0

  const plannedTotals = useMemo(() =>
    periods.map((_, i) => itemsWithPlanned.reduce((s, it) => s + it.planned[i], 0)),
    [itemsWithPlanned, periods])

  const actualTotals = useMemo(() =>
    periods.map(p => actuals.filter(a => a.period_date === p.isoDate).reduce((s, a) => s + a.executed_amount, 0)),
    [actuals, periods])

  const renderGroup = (g: BudgetItem) => {
    const children = itemsWithPlanned.filter(it => it.parent_id === g.id)
    return [
      <tr key={`g-${g.id}`} style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)' }}>
        <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--brand-50)', borderRight: '1px solid var(--n-200)', padding: '6px 14px', height: 32 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {g.code && <span className="mono" style={{ color: 'var(--brand-500)', marginRight: 5, fontSize: 10.5 }}>{g.code}</span>}
            {g.name}
          </span>
        </td>
        {periods.map((_, i) => (
          <td key={i} colSpan={1} style={{ background: i % 2 === 0 ? 'var(--brand-50)' : 'rgba(239,246,255,0.5)', borderLeft: '1px solid var(--brand-100)' }} />
        ))}
        <td style={{ background: 'var(--brand-50)', borderLeft: '2px solid var(--n-200)' }} />
      </tr>,
      ...children.map(it => (
        <tr key={it.id} style={{ borderTop: '1px solid var(--n-100)' }}>
          <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--n-0)', borderRight: '1px solid var(--n-200)', padding: '5px 14px 5px 24px' }}>
            <div style={{ fontSize: 12, color: 'var(--n-800)', fontWeight: 500 }}>
              {it.code && <span className="mono" style={{ color: 'var(--n-400)', marginRight: 5, fontSize: 10.5 }}>{it.code}</span>}
              {it.name}
            </div>
            <div className="mono tnum" style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 1 }}>
              {it.qty} {it.unit} × {fmtNumber(it.up)} = <strong style={{ color: 'var(--n-700)' }}>{fmtNumber(it.totalCost)}</strong>
            </div>
          </td>
          {periods.map((p, i) => {
            const plan = it.planned[i]
            const actual = getActual(it.id, p.isoDate)
            return (
              <td key={i} style={{ padding: '4px 6px', verticalAlign: 'top', borderLeft: '1px solid var(--n-100)', background: i % 2 === 0 ? 'transparent' : 'var(--n-25)', minWidth: CW }}>
                <div className="mono tnum" style={{ fontSize: 10, color: 'var(--n-400)', marginBottom: 2 }}>{plan > 0 ? fmtNumber(plan) : ''}</div>
                <ActualCell value={actual} onSave={v => onUpsertActual(it.id, p.isoDate, v)} />
              </td>
            )
          })}
          <td style={{ padding: '4px 8px', borderLeft: '2px solid var(--n-200)', verticalAlign: 'middle' }}>
            <div className="mono tnum" style={{ fontSize: 10.5, color: 'var(--n-600)', fontWeight: 600 }}>{fmtNumber(it.totalCost)}</div>
          </td>
        </tr>
      )),
    ]
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {periods.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Sin períodos en el rango de fechas del cronograma.</div>
      ) : (
        <table style={{ borderCollapse: 'collapse', minWidth: LEFT_W_DIST + periods.length * CW + 90 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: 'var(--n-25)' }}>
              <th style={{
                position: 'sticky', left: 0, zIndex: 11, width: LEFT_W_DIST, minWidth: LEFT_W_DIST,
                background: 'var(--n-25)', borderBottom: '2px solid var(--n-200)', borderRight: '1px solid var(--n-200)',
                textAlign: 'left', padding: '0 14px', height: 34, fontSize: 10.5,
                fontWeight: 600, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Partida
              </th>
              {periods.map((p, i) => (
                <th key={p.isoDate} style={{
                  width: CW, minWidth: CW, textAlign: 'center', height: 34,
                  fontSize: 9.5, fontWeight: 600, color: 'var(--n-500)',
                  borderBottom: '2px solid var(--n-200)',
                  borderLeft: '1px solid var(--n-150)',
                  background: i % 2 === 0 ? 'var(--n-25)' : 'var(--n-50)',
                  padding: 0,
                }}>
                  {p.label}
                </th>
              ))}
              <th style={{
                width: 90, minWidth: 90, textAlign: 'right', height: 34,
                fontSize: 10.5, fontWeight: 600, color: 'var(--n-500)',
                borderBottom: '2px solid var(--n-200)', borderLeft: '2px solid var(--n-200)',
                padding: '0 8px',
              }}>
                Total
              </th>
            </tr>
            {/* Legend sub-header */}
            <tr style={{ background: 'var(--n-0)', borderBottom: '1px solid var(--n-150)' }}>
              <th style={{ position: 'sticky', left: 0, zIndex: 11, background: 'var(--n-0)', borderRight: '1px solid var(--n-200)', padding: '3px 14px' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span style={{ fontSize: 9.5, color: 'var(--n-400)', fontWeight: 500 }}>▲ Planificado</span>
                  <span style={{ fontSize: 9.5, color: 'var(--brand-700)', fontWeight: 600 }}>▼ Real (editable)</span>
                </div>
              </th>
              {periods.map((_, i) => <th key={i} style={{ borderLeft: '1px solid var(--n-100)', background: i % 2 === 0 ? 'transparent' : 'var(--n-25)' }} />)}
              <th style={{ borderLeft: '2px solid var(--n-200)' }} />
            </tr>
          </thead>
          <tbody>
            {groups.map(g => renderGroup(g))}
            {/* Orphan items */}
            {itemsWithPlanned.filter(it => !groups.find(g => g.id === it.parent_id)).map(it => (
              <tr key={it.id} style={{ borderTop: '1px solid var(--n-100)' }}>
                <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--n-0)', borderRight: '1px solid var(--n-200)', padding: '5px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--n-800)', fontWeight: 500 }}>
                    {it.code && <span className="mono" style={{ color: 'var(--n-400)', marginRight: 5, fontSize: 10.5 }}>{it.code}</span>}
                    {it.name}
                  </div>
                  <div className="mono tnum" style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 1 }}>
                    {it.qty} {it.unit} × {fmtNumber(it.up)} = <strong style={{ color: 'var(--n-700)' }}>{fmtNumber(it.totalCost)}</strong>
                  </div>
                </td>
                {periods.map((p, i) => {
                  const plan = it.planned[i]
                  const actual = getActual(it.id, p.isoDate)
                  return (
                    <td key={i} style={{ padding: '4px 6px', verticalAlign: 'top', borderLeft: '1px solid var(--n-100)', background: i % 2 === 0 ? 'transparent' : 'var(--n-25)', minWidth: CW }}>
                      <div className="mono tnum" style={{ fontSize: 10, color: 'var(--n-400)', marginBottom: 2 }}>{plan > 0 ? fmtNumber(plan) : ''}</div>
                      <ActualCell value={actual} onSave={v => onUpsertActual(it.id, p.isoDate, v)} />
                    </td>
                  )
                })}
                <td style={{ padding: '4px 8px', borderLeft: '2px solid var(--n-200)', verticalAlign: 'middle' }}>
                  <div className="mono tnum" style={{ fontSize: 10.5, color: 'var(--n-600)', fontWeight: 600 }}>{fmtNumber(it.totalCost)}</div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 9 }}>
            <tr style={{ background: 'var(--n-100)', borderTop: '2px solid var(--n-300)' }}>
              <td style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--n-100)', borderRight: '1px solid var(--n-200)', padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'var(--n-700)' }}>
                TOTALES
              </td>
              {periods.map((_, i) => (
                <td key={i} style={{ padding: '4px 6px', borderLeft: '1px solid var(--n-200)', background: i % 2 === 0 ? 'var(--n-100)' : 'var(--n-150)' }}>
                  <div className="mono tnum" style={{ fontSize: 10, color: 'var(--n-500)', marginBottom: 2 }}>{plannedTotals[i] > 0 ? fmtNumber(plannedTotals[i]) : ''}</div>
                  <div className="mono tnum" style={{ fontSize: 11.5, fontWeight: 600, color: actualTotals[i] > 0 ? 'var(--brand-700)' : 'var(--n-400)' }}>
                    {actualTotals[i] > 0 ? fmtNumber(actualTotals[i]) : '—'}
                  </div>
                </td>
              ))}
              <td style={{ padding: '4px 8px', borderLeft: '2px solid var(--n-300)', background: 'var(--n-100)' }}>
                <div className="mono tnum" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-800)' }}>
                  {fmtNumber(itemsWithPlanned.reduce((s, it) => s + it.totalCost, 0))}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

// ── SCurveTab ─────────────────────────────────────────────────────────────────

function SCurveTab({
  periods, plannedByPeriod, actualByPeriod, currency,
}: {
  periods: Period[]
  plannedByPeriod: number[]
  actualByPeriod: number[]
  currency: string
}) {
  const todayIdx = useMemo(() => todayPeriodIndex(periods), [periods])

  const tickInterval = useMemo(() => {
    const n = periods.length
    if (n <= 60)  return 0
    if (n <= 180) return 6
    if (n <= 365) return 13
    return 29
  }, [periods.length])

  const chartData = useMemo(() => {
    const cumPlan   = cumulative(plannedByPeriod)
    const cumActual = cumulative(actualByPeriod)
    return periods.map((p, i) => ({
      label: p.label,
      planned: cumPlan[i],
      actual: i <= todayIdx ? cumActual[i] : undefined,
    }))
  }, [periods, plannedByPeriod, actualByPeriod, todayIdx])

  const totalPlanned = plannedByPeriod.reduce((s, v) => s + v, 0)
  const cumActuals   = cumulative(actualByPeriod)
  const lastActual   = todayIdx >= 0 && todayIdx < cumActuals.length ? cumActuals[Math.min(todayIdx, cumActuals.length - 1)] : 0
  const lastPlanned  = todayIdx >= 0 && todayIdx < plannedByPeriod.length ? cumulative(plannedByPeriod)[Math.min(todayIdx, plannedByPeriod.length - 1)] : 0
  const advancePct   = totalPlanned > 0 ? lastActual / totalPlanned : 0
  const variance     = lastActual - lastPlanned

  const fmtTick = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
    return `$${v.toFixed(0)}`
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Presupuesto total', value: fmtCurrency(totalPlanned, currency), sub: 'costo directo planificado', color: 'var(--brand-600)' },
          { label: '% de avance', value: `${Math.round(advancePct * 100)}%`, sub: 'ejecutado acumulado', color: '#10B981' },
          { label: 'Planificado a hoy', value: fmtCurrency(lastPlanned, currency), sub: 'según cronograma', color: '#F59E0B' },
          { label: 'Variación', value: (variance >= 0 ? '+' : '') + fmtCurrency(Math.abs(variance), currency), sub: variance >= 0 ? 'adelantado' : 'atrasado', color: variance >= 0 ? '#10B981' : '#EF4444' },
        ].map(card => (
          <div key={card.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--n-500)', fontWeight: 600, marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: card.color }} className="mono tnum">{card.value}</div>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 3 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 14, color: 'var(--n-900)', fontWeight: 600 }}>Curva S — Avance acumulado</h2>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>Costo planificado vs. ejecutado por período</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[['#4F46E5', 'Planificado'], ['#10B981', 'Real']] .map(([color, label]) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--n-700)', fontWeight: 500 }}>
                <span style={{ width: 14, height: 3, background: color, borderRadius: 2 }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {chartData.length === 0 || totalPlanned === 0 ? (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <Info size={24} style={{ color: 'var(--n-300)' }} />
            <div style={{ fontSize: 13, color: 'var(--n-500)' }}>
              {chartData.length === 0
                ? 'Sin períodos en el rango de fechas.'
                : 'Asigna fechas a las partidas en el tab Cronograma para ver la curva S.'}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="scPlanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="scActGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="var(--n-150)" vertical={false} />
              <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 10, fill: 'var(--n-500)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10, fill: 'var(--n-500)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--n-150)' }}
                formatter={(v: unknown, name: unknown) => [fmtNumber(Number(v ?? 0)), name === 'planned' ? 'Planificado' : 'Real']}
                labelStyle={{ fontWeight: 600, color: 'var(--n-900)' }}
              />
              {todayIdx >= 0 && todayIdx < chartData.length && (
                <ReferenceLine x={chartData[todayIdx]?.label} stroke="#EF4444" strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: 'HOY', position: 'top', fontSize: 9.5, fill: '#EF4444', fontWeight: 700 }} />
              )}
              <Area type="monotone" dataKey="planned" stroke="#4F46E5" strokeWidth={2.2} fill="url(#scPlanGrad)" dot={{ r: 2.5, fill: '#4F46E5', opacity: 0.5 }} connectNulls />
              <Area type="monotone" dataKey="actual"  stroke="#10B981" strokeWidth={2.5} fill="url(#scActGrad)"  dot={{ r: 3.2, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period breakdown */}
      {totalPlanned > 0 && (
        <div className="card" style={{ padding: '16px 18px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-900)', marginBottom: 12 }}>Detalle por período</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 110px 110px 100px', gap: 8, marginBottom: 8 }}>
            {['Período', 'Progreso', 'Planificado', 'Real', '% Avance'].map(h => (
              <div key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>
          {chartData.slice(0, 20).map((d, i) => {
            const pct = totalPlanned > 0 ? d.planned / totalPlanned : 0
            const hasPlan = plannedByPeriod[i] > 0
            const hasAct  = actualByPeriod[i]  > 0
            if (!hasPlan && !hasAct) return null
            return (
              <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 110px 110px 100px', gap: 8, alignItems: 'center', padding: '5px 0', borderTop: '1px solid var(--n-100)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600 }} className="mono">{d.label}</div>
                <div style={{ height: 6, background: 'var(--n-100)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--brand-500)', borderRadius: 999 }} />
                </div>
                <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-700)', textAlign: 'right' }}>{fmtNumber(d.planned)}</div>
                <div className="mono tnum" style={{ fontSize: 11.5, color: d.actual != null ? 'var(--green-600)' : 'var(--n-400)', textAlign: 'right', fontWeight: d.actual != null ? 600 : 400 }}>
                  {d.actual != null ? fmtNumber(d.actual) : '—'}
                </div>
                <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-600)', textAlign: 'right' }}>
                  {totalPlanned > 0 ? `${(pct * 100).toFixed(1)}%` : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'gantt',  label: 'Cronograma',   icon: CalendarDays },
  { id: 'dist',   label: 'Distribución', icon: BarChart2 },
  { id: 'scurve', label: 'Curva S',      icon: TrendingUp },
] as const

type TabId = typeof TABS[number]['id']

export default function ScheduleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { schedules, loading: sLoad, updateSchedule } = useSchedules()
  const schedule = schedules.find(s => s.id === id)

  const { budgets } = useBudgets()
  const budget = budgets.find(b => b.id === schedule?.budget_id)

  const { items, apuLines, loading: iLoad } = useBudgetItems(schedule?.budget_id ?? '')
  const { resources, loading: rLoad }       = useBudgetResources()
  const { tasks, actuals, loading: eLoad, upsertTask, deleteTask, upsertActual, replaceItemActuals } = useScheduleEditor(id ?? '')

  const [tab, setTab] = useState<TabId>('gantt')

  const resourceMap  = useMemo(() => buildResourceMap(resources), [resources])
  const groups       = useMemo(() => items.filter(it => it.type === 'group').sort((a, b) => a.sort_order - b.sort_order), [items])
  const itemsOnly    = useMemo(() => items.filter(it => it.type === 'item').sort((a, b) => a.sort_order - b.sort_order), [items])

  const periods = useMemo(() =>
    schedule ? generatePeriods(schedule.start_date, schedule.end_date, schedule.period_type) : [],
    [schedule])

  // Daily periods — used exclusively for the S-curve so it's always in days
  const dailyPeriods = useMemo(() =>
    schedule ? generatePeriods(schedule.start_date, schedule.end_date, 'day') : [],
    [schedule])

  const itemUnitPrices = useMemo(() => {
    const m = new Map<string, number>()
    itemsOnly.forEach(it => m.set(it.id, getItemUnitPrice(it, apuLines, resourceMap)))
    return m
  }, [itemsOnly, apuLines, resourceMap])

  // S-curve: planned distributed daily
  const dailyPlannedByPeriod = useMemo(() => {
    const byPeriod = dailyPeriods.map(() => 0)
    for (const task of tasks) {
      const up  = itemUnitPrices.get(task.item_id) ?? 0
      const it  = itemsOnly.find(x => x.id === task.item_id)
      if (!it) continue
      const total = it.qty * up
      const dist  = distributeItemCost(total, task.start_date, task.end_date, dailyPeriods)
      dist.forEach((v, i) => { byPeriod[i] += v })
    }
    return byPeriod
  }, [tasks, itemsOnly, itemUnitPrices, dailyPeriods])

  // S-curve: actuals spread evenly across the days of each schedule period
  const dailyActualByPeriod = useMemo(() => {
    const byPeriod = dailyPeriods.map(() => 0)
    for (const a of actuals) {
      if (a.executed_amount <= 0) continue
      const periodIdx = periodContaining(a.period_date, periods)
      if (periodIdx >= 0) {
        const p = periods[periodIdx]
        const indices: number[] = []
        dailyPeriods.forEach((dp, di) => {
          if (dp.date >= p.date && dp.date <= p.endDate) indices.push(di)
        })
        if (indices.length > 0) {
          const amtPerDay = a.executed_amount / indices.length
          indices.forEach(di => { byPeriod[di] += amtPerDay })
          continue
        }
      }
      // Fallback: place on exact day
      const idx = periodContaining(a.period_date, dailyPeriods)
      if (idx >= 0) byPeriod[idx] += a.executed_amount
    }
    return byPeriod
  }, [actuals, dailyPeriods, periods])


  if (sLoad || iLoad || rLoad || eLoad) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <PageLoader />
    </div>
  )

  if (!schedule) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 14, color: 'var(--n-500)' }}>Cronograma no encontrado.</div>
      <Button onClick={() => navigate('/schedule')}>Volver</Button>
    </div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
        <button onClick={() => navigate('/schedule')} style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5,
          color: 'var(--n-500)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 5,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-100)'; e.currentTarget.style.color = 'var(--n-800)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--n-500)' }}
        >
          <ChevronLeft size={14} /> Cronogramas
        </button>
        <span style={{ color: 'var(--n-300)' }}>/</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)' }}>{schedule.name}</span>
          {budget && <span style={{ fontSize: 12, color: 'var(--n-500)', marginLeft: 10 }}>{budget.name} · {budget.client}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Período:</span>
          <select value={schedule.period_type}
            onChange={e => updateSchedule(schedule.id, { period_type: e.target.value as PeriodType })}
            style={{ height: 30, padding: '0 8px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer', outline: 'none' }}>
            <option value="day">Diario</option>
            <option value="week">Semanal</option>
            <option value="month">Mensual</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid var(--n-150)', flex: '0 0 auto', background: 'var(--n-0)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', fontSize: 12.5, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? 'var(--brand-700)' : 'var(--n-600)',
              background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--brand-600)' : 'transparent'}`,
              cursor: 'pointer', marginBottom: -1,
            }}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'gantt' && (
          <GanttTab
            periodType={schedule.period_type} periods={periods}
            groups={groups} itemsOnly={itemsOnly} tasks={tasks}
            scheduleStart={schedule.start_date} scheduleEnd={schedule.end_date}
            actuals={actuals} replaceItemActuals={replaceItemActuals}
            itemUnitPrices={itemUnitPrices}
            onUpsert={upsertTask} onDelete={deleteTask}
          />
        )}
        {tab === 'dist' && (
          <DistributionTab
            periodType={schedule.period_type} periods={periods}
            groups={groups} itemsOnly={itemsOnly} tasks={tasks}
            actuals={actuals} onUpsertActual={upsertActual}
            itemUnitPrices={itemUnitPrices}
          />
        )}
        {tab === 'scurve' && (
          <SCurveTab
            periods={dailyPeriods} plannedByPeriod={dailyPlannedByPeriod}
            actualByPeriod={dailyActualByPeriod}
            currency={budget?.currency ?? 'USD'}
          />
        )}
      </div>
    </div>
  )
}
