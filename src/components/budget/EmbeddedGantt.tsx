import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button } from '../ui/Button'
import {
  getOverlappingPeriods, todayPeriodIndex,
  distributeItemCost, cumulative, periodContaining, type Period,
} from '../../lib/scheduleHelpers'
import { fmtCurrency } from '../../lib/budgetHelpers'
import type { BudgetItem, ScheduleTask, ScheduleActual } from '../../lib/types'

// ── KPI strip ────────────────────────────────────────────────────────────────

function KPILine({ label, value, sub, accent = 'brand' }: {
  label: string; value: string; sub?: string
  accent?: 'brand' | 'green' | 'amber' | 'red'
}) {
  const colors: Record<string, string> = {
    brand: 'var(--brand-700)',
    green: 'var(--green-700)',
    amber: '#B45309',
    red:   'var(--red-700)',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </div>
      <div className="mono tnum" style={{ fontSize: 17, fontWeight: 600, color: colors[accent] ?? colors.brand, letterSpacing: '-0.018em', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
function KPISep() {
  return <div style={{ width: 1, height: 32, background: 'var(--n-150)', flexShrink: 0 }} />
}

// ── Draggable Gantt bar ───────────────────────────────────────────────────────

type DragState = {
  mode: 'move' | 'resize-left' | 'resize-right'
  startX: number
  initStart: number
  initEnd: number
  curStart: number
  curEnd: number
}

function GanttBarDrag({
  item, task, periods, colW, rowH, progress, accentColor, onEdit, onCommit,
}: {
  item: BudgetItem
  task: ScheduleTask
  periods: Period[]
  colW: number
  rowH: number
  progress: number
  accentColor: string
  onEdit: () => void
  onCommit: (startDate: string, endDate: string) => void
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const didDragRef = useRef(false)

  const bar = useMemo(
    () => getOverlappingPeriods(task.start_date, task.end_date, periods),
    [task.start_date, task.end_date, periods],
  )

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const dx    = e.clientX - drag.startX
      const delta = Math.round(dx / colW)
      if (delta !== 0) didDragRef.current = true
      let curStart = drag.initStart
      let curEnd   = drag.initEnd
      if (drag.mode === 'move') {
        const dur = drag.initEnd - drag.initStart
        curStart  = Math.max(0, Math.min(periods.length - 1 - dur, drag.initStart + delta))
        curEnd    = curStart + dur
      } else if (drag.mode === 'resize-right') {
        curEnd   = Math.max(drag.initStart, Math.min(periods.length - 1, drag.initEnd + delta))
      } else if (drag.mode === 'resize-left') {
        curStart = Math.max(0, Math.min(drag.initEnd, drag.initStart + delta))
      }
      setDrag(d => d ? { ...d, curStart, curEnd } : d)
    }
    const onUp = () => {
      setDrag(d => {
        if (d && (d.curStart !== d.initStart || d.curEnd !== d.initEnd)) {
          onCommit(periods[d.curStart].isoDate, periods[d.curEnd].isoDate)
        }
        return null
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [drag, colW, periods, onCommit])

  if (!bar) return (
    <div style={{ height: rowH, borderBottom: '1px solid var(--n-150)', position: 'relative', cursor: 'pointer' }}
      onClick={onEdit}>
      <div style={{ position: 'absolute', inset: 5, borderRadius: 6, border: '1.5px dashed var(--n-200)' }} />
    </div>
  )

  const curStart = drag ? drag.curStart : bar.start
  const curEnd   = drag ? drag.curEnd   : bar.end
  const left     = curStart * colW + 4
  const width    = Math.max(colW - 8, (curEnd - curStart + 1) * colW - 8)
  const fillW    = width * Math.min(1, progress)
  const isComplete = progress >= 1
  const color = accentColor

  return (
    <div style={{ height: rowH, borderBottom: '1px solid var(--n-150)', position: 'relative' }}>
      <div
        onClick={() => { if (!didDragRef.current) onEdit(); didDragRef.current = false }}
        onMouseDown={e => {
          if (e.button !== 0) return
          e.preventDefault()
          didDragRef.current = false
          setDrag({ mode: 'move', startX: e.clientX, initStart: bar.start, initEnd: bar.end, curStart: bar.start, curEnd: bar.end })
        }}
        onMouseEnter={e => { if (!drag) e.currentTarget.style.boxShadow = `0 4px 12px -2px ${color}55` }}
        onMouseLeave={e => { if (!drag) e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
        style={{
          position: 'absolute', top: 5, left, width, height: rowH - 10,
          borderRadius: 6,
          background: color + '1f',
          border: `1px solid ${color}88`,
          boxShadow: drag ? `0 6px 18px ${color}55` : 'var(--shadow-xs)',
          overflow: 'hidden',
          cursor: drag?.mode === 'move' ? 'grabbing' : 'grab',
          transition: drag ? 'none' : 'box-shadow .15s',
          userSelect: 'none',
          zIndex: drag ? 3 : 1,
        }}
      >
        {/* Progress fill */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: fillW,
          background: isComplete
            ? 'linear-gradient(90deg, var(--green-500), #059669)'
            : `linear-gradient(90deg, ${color}, ${color}cc)`,
          opacity: 0.95,
        }} />
        {/* Label */}
        {width > 64 && (
          <span style={{
            position: 'absolute', top: '50%', left: 8,
            transform: 'translateY(-50%)',
            fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none',
            color: fillW > 32 ? '#fff' : color,
            textShadow: fillW > 32 ? '0 1px 2px rgba(0,0,0,0.25)' : 'none',
          }}>
            {item.code ? `${item.code} · ` : ''}{Math.round(Math.min(1, progress) * 100)}%
          </span>
        )}
        {/* Resize left */}
        <div
          onMouseDown={e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); setDrag({ mode: 'resize-left', startX: e.clientX, initStart: bar.start, initEnd: bar.end, curStart: bar.start, curEnd: bar.end }) }}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 6, cursor: 'ew-resize', zIndex: 2 }}
        />
        {/* Resize right */}
        <div
          onMouseDown={e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); setDrag({ mode: 'resize-right', startX: e.clientX, initStart: bar.start, initEnd: bar.end, curStart: bar.start, curEnd: bar.end }) }}
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 6, cursor: 'ew-resize', zIndex: 2 }}
        />
      </div>

      {/* Drag tooltip */}
      {drag && (
        <div style={{
          position: 'absolute', bottom: rowH - 2, left: left + width / 2,
          transform: 'translateX(-50%)',
          background: 'var(--n-900)', color: '#fff',
          padding: '3px 8px', borderRadius: 5,
          fontSize: 10, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
        }}>
          S{curStart + 1} → S{curEnd + 1} ({curEnd - curStart + 1} sem)
        </div>
      )}
    </div>
  )
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function diffDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Schedule item modal ────────────────────────────────────────────────────────

function ScheduleItemModalProto({
  item, task, periods, totalCost, totalActual, currency, replaceItemActuals, onSave, onDelete, onClose,
}: {
  item: BudgetItem
  task: ScheduleTask | undefined
  periods: Period[]
  totalCost: number
  totalActual: number
  currency: string
  replaceItemActuals?: (itemId: string, entries: { periodDate: string; amount: number }[]) => Promise<void>
  onSave: (startDate: string, endDate: string) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const defaultStart = task?.start_date ?? periods[0]?.isoDate ?? ''
  const defaultEnd   = task?.end_date   ?? (periods[0] ? addDays(periods[0].isoDate, 6) : '')

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate,   setEndDate]   = useState(defaultEnd)
  const [durDays,   setDurDays]   = useState(() =>
    defaultStart && defaultEnd ? diffDays(defaultStart, defaultEnd) : 7
  )
  const [saving, setSaving] = useState(false)
  const [actualPctLocal, setActualPctLocal] = useState(() =>
    totalCost > 0 ? Math.min(1, totalActual / totalCost) : 0
  )
  const [actualDirty, setActualDirty] = useState(false)

  const progress = actualDirty ? actualPctLocal : (totalCost > 0 ? Math.min(1, totalActual / totalCost) : 0)
  const earned   = totalCost * progress
  const valid    = !!startDate && !!endDate && endDate >= startDate

  const INP: React.CSSProperties = {
    height: 34, padding: '0 10px', fontSize: 13, width: '100%', boxSizing: 'border-box',
    border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)',
    color: 'var(--n-900)', outline: 'none', fontFamily: 'inherit',
  }
  const LBL: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block',
  }
  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--brand-500)'
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(79,70,229,.12)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--n-200)'
    e.currentTarget.style.boxShadow   = 'none'
  }

  const handleStartChange = (v: string) => {
    setStartDate(v)
    if (v) setEndDate(addDays(v, durDays - 1))
  }

  const handleEndChange = (v: string) => {
    setEndDate(v)
    if (v && startDate) setDurDays(diffDays(startDate, v))
  }

  const handleDurChange = (v: number) => {
    const d = Math.max(1, v)
    setDurDays(d)
    if (startDate) setEndDate(addDays(startDate, d - 1))
  }

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await onSave(startDate, endDate)
      if (actualDirty && replaceItemActuals && startDate && endDate) {
        const dist = distributeItemCost(totalCost * actualPctLocal, startDate, endDate, periods)
        await replaceItemActuals(item.id, periods.map((p, i) => ({ periodDate: p.isoDate, amount: dist[i] })))
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await onDelete() }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Programar partida">
      {/* Item info header card */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', marginBottom: 16,
        background: 'var(--brand-50)', border: '1px solid var(--brand-100)', borderRadius: 8,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'var(--brand-600)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <CalendarDays size={14} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {item.code && (
            <div className="mono tnum" style={{ fontSize: 10.5, color: 'var(--brand-700)', fontWeight: 700, letterSpacing: '0.04em' }}>
              {item.code}
            </div>
          )}
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-900)' }}>{item.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--n-600)', marginTop: 3 }}>
            <span className="mono tnum">{item.qty}</span> {item.unit}
            {' · '}
            <span className="mono tnum">{fmtCurrency(totalCost, currency)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Fecha inicio */}
        <div>
          <label style={LBL}>Fecha de inicio *</label>
          <input type="date" style={INP} value={startDate}
            onChange={e => handleStartChange(e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle}
          />
        </div>

        {/* Fecha fin */}
        <div>
          <label style={LBL}>Fecha de fin *</label>
          <input type="date" style={INP} value={endDate} min={startDate}
            onChange={e => handleEndChange(e.target.value)}
            onFocus={focusStyle} onBlur={blurStyle}
          />
        </div>

        {/* Duración en días */}
        <div>
          <label style={LBL}>Duración (días)</label>
          <input type="number" style={INP} min={1} value={durDays}
            onChange={e => handleDurChange(parseInt(e.target.value) || 1)}
            onFocus={focusStyle} onBlur={blurStyle}
          />
        </div>

        {/* Resumen de fechas */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{
            padding: '7px 12px', background: 'var(--n-25)',
            border: '1px solid var(--n-150)', borderRadius: 8, fontSize: 11.5,
            color: 'var(--n-600)', lineHeight: 1.6,
          }}>
            {startDate && endDate ? (
              <>
                <span style={{ color: 'var(--n-800)', fontWeight: 600 }}>{fmtDate(startDate)}</span>
                <span style={{ color: 'var(--n-400)', margin: '0 5px' }}>→</span>
                <span style={{ color: 'var(--n-800)', fontWeight: 600 }}>{fmtDate(endDate)}</span>
              </>
            ) : (
              <span style={{ color: 'var(--n-400)' }}>Selecciona fechas</span>
            )}
          </div>
        </div>

        {/* Avance real */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LBL}>Avance real — {Math.round(progress * 100)}%</label>
          {replaceItemActuals ? (
            <>
              <input
                type="range" min="0" max="100" step="5"
                value={Math.round(progress * 100)}
                onChange={e => { setActualPctLocal(Number(e.target.value) / 100); setActualDirty(true) }}
                style={{ width: '100%', accentColor: 'var(--brand-600)', marginTop: 4, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--n-400)', marginTop: 2 }} className="mono tnum">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ height: 8, background: 'var(--n-100)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress * 100}%`, height: '100%',
                  background: progress >= 1 ? 'var(--green-500)' : 'var(--brand-500)',
                  borderRadius: 999, transition: 'width .3s',
                }} />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--n-400)', marginTop: 4 }}>
                Derivado del costo ejecutado registrado
              </div>
            </>
          )}
        </div>

        {/* Costo planificado */}
        <div>
          <label style={LBL}>Costo planificado</label>
          <div style={{ padding: '8px 12px', background: 'var(--n-25)', border: '1px solid var(--n-150)', borderRadius: 8 }}>
            <span className="mono tnum" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--n-900)' }}>
              {fmtCurrency(totalCost, currency)}
            </span>
          </div>
        </div>

        {/* Costo ganado */}
        <div>
          <label style={LBL}>Costo ganado (real)</label>
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: earned > 0 ? 'var(--green-50)' : 'var(--n-25)',
            border: `1px solid ${earned > 0 ? 'var(--green-100)' : 'var(--n-150)'}`,
          }}>
            <span className="mono tnum" style={{ fontSize: 13.5, fontWeight: 600, color: earned > 0 ? 'var(--green-700)' : 'var(--n-400)' }}>
              {fmtCurrency(earned, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
        {task
          ? <Button variant="danger" onClick={handleDelete} disabled={saving}>Quitar del cronograma</Button>
          : <div />}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !valid}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── EmbeddedGantt (main export) ───────────────────────────────────────────────

export function EmbeddedGantt({
  periods, groups, itemsOnly, tasks, actuals, itemUnitPrices, currency, replaceItemActuals, onUpsert, onDelete,
}: {
  periods: Period[]
  groups: BudgetItem[]
  itemsOnly: BudgetItem[]
  tasks: ScheduleTask[]
  actuals: ScheduleActual[]
  itemUnitPrices: Map<string, number>
  currency: string
  replaceItemActuals?: (itemId: string, entries: { periodDate: string; amount: number }[]) => Promise<void>
  onUpsert: (itemId: string, s: string, e: string) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
}) {
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)

  const DAY_W   = 32
  const ROW_H   = 36
  const GRP_H   = 30
  const LABEL_W = 340
  const ACCENT  = '#4F46E5'

  const todayIdx  = useMemo(() => todayPeriodIndex(periods), [periods])
  const todayLeft = todayIdx * DAY_W

  // KPI computations
  const plannedByPeriod = useMemo(() => {
    const arr = periods.map(() => 0)
    for (const t of tasks) {
      const up   = itemUnitPrices.get(t.item_id) ?? 0
      const it   = itemsOnly.find(x => x.id === t.item_id)
      if (!it) continue
      const dist = distributeItemCost(it.qty * up, t.start_date, t.end_date, periods)
      dist.forEach((v, i) => { arr[i] += v })
    }
    return arr
  }, [tasks, itemsOnly, itemUnitPrices, periods])

  const actualByPeriod = useMemo(() => {
    const arr = periods.map(() => 0)
    for (const a of actuals) {
      const idx = periodContaining(a.period_date, periods)
      if (idx >= 0) arr[idx] += a.executed_amount
    }
    return arr
  }, [actuals, periods])

  const totalPlanned  = useMemo(() => itemsOnly.reduce((s, it) => s + it.qty * (itemUnitPrices.get(it.id) ?? 0), 0), [itemsOnly, itemUnitPrices])
  const cumPlan       = useMemo(() => cumulative(plannedByPeriod), [plannedByPeriod])
  const cumAct        = useMemo(() => cumulative(actualByPeriod), [actualByPeriod])
  const todayPlan     = todayIdx >= 0 && todayIdx < cumPlan.length ? cumPlan[todayIdx] : 0
  const todayAct      = todayIdx >= 0 && todayIdx < cumAct.length  ? cumAct[todayIdx]  : 0
  const advancePct    = totalPlanned > 0 ? todayAct / totalPlanned : 0
  const variance      = todayAct - todayPlan

  const getItemProgress = useCallback((it: BudgetItem) => {
    const cost = it.qty * (itemUnitPrices.get(it.id) ?? 0)
    if (cost === 0) return 0
    const actual = actuals.filter(a => a.item_id === it.id).reduce((s, a) => s + a.executed_amount, 0)
    return Math.min(1, actual / cost)
  }, [actuals, itemUnitPrices])

  const getGroupProgress = useCallback((gid: string) => {
    const children = itemsOnly.filter(it => it.parent_id === gid)
    let totalCost = 0, totalActual = 0
    children.forEach(it => {
      const c = it.qty * (itemUnitPrices.get(it.id) ?? 0)
      totalCost += c
      totalActual += actuals.filter(a => a.item_id === it.id).reduce((s, a) => s + a.executed_amount, 0)
    })
    return totalCost > 0 ? Math.min(1, totalActual / totalCost) : 0
  }, [itemsOnly, actuals, itemUnitPrices])

  const getGroupSpan = useCallback((gid: string) => {
    let minStart = Infinity, maxEnd = -Infinity
    itemsOnly.filter(it => it.parent_id === gid).forEach(it => {
      const t = tasks.find(tt => tt.item_id === it.id)
      if (!t) return
      const b = getOverlappingPeriods(t.start_date, t.end_date, periods)
      if (!b) return
      if (b.start < minStart) minStart = b.start
      if (b.end   > maxEnd)   maxEnd   = b.end
    })
    return minStart === Infinity ? null : { start: minStart, end: maxEnd }
  }, [itemsOnly, tasks, periods])

  if (periods.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--n-400)', fontSize: 13 }}>
      El rango de fechas del cronograma no genera períodos.
    </div>
  )

  // Helper to render an item row in the left rail
  const renderLeftItem = (it: BudgetItem, indent = false) => {
    const up      = itemUnitPrices.get(it.id) ?? 0
    const cost    = it.qty * up
    const actPct  = getItemProgress(it)
    const hasTask = !!tasks.find(t => t.item_id === it.id)
    return (
      <div key={it.id} style={{
        height: ROW_H, padding: `0 16px 0 ${indent ? 30 : 16}px`,
        borderBottom: '1px solid var(--n-150)',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
      }}
        onClick={() => setEditItem(it)}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-25)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--n-800)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {it.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            {it.code && <span className="mono tnum" style={{ fontSize: 10, color: 'var(--n-500)' }}>{it.code}</span>}
            <span style={{ fontSize: 10, color: 'var(--n-300)' }}>·</span>
            <span className="mono tnum" style={{ fontSize: 10, color: 'var(--n-600)' }}>{fmtCurrency(cost, currency)}</span>
          </div>
        </div>
        {hasTask && actPct > 0 && (
          <span className="mono tnum" style={{
            fontSize: 10.5, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
            color:      actPct >= 1 ? 'var(--green-700)' : 'var(--brand-700)',
            background: actPct >= 1 ? 'var(--green-50)' : 'var(--brand-50)',
          }}>
            {Math.round(actPct * 100)}%
          </span>
        )}
      </div>
    )
  }

  // Helper to render an item bar in the right grid
  const renderRightItem = (it: BudgetItem) => {
    const task = tasks.find(t => t.item_id === it.id)
    if (!task) return (
      <div key={it.id} style={{ height: ROW_H, borderBottom: '1px solid var(--n-150)', position: 'relative', cursor: 'pointer' }}
        onClick={() => setEditItem(it)}>
        <div style={{ position: 'absolute', inset: 5, borderRadius: 6, border: '1.5px dashed var(--n-200)' }} />
      </div>
    )
    return (
      <GanttBarDrag key={it.id}
        item={it} task={task}
        periods={periods} colW={DAY_W} rowH={ROW_H}
        progress={getItemProgress(it)} accentColor={ACCENT}
        onEdit={() => setEditItem(it)}
        onCommit={(s, e) => onUpsert(it.id, s, e)}
      />
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── KPI bar ── */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--n-150)',
        background: 'var(--n-0)', display: 'flex', alignItems: 'center',
        gap: 28, flex: '0 0 auto',
      }}>
        <KPILine label="Fecha actual" value={todayIdx >= 0 ? new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—'} sub={todayIdx >= 0 ? `día ${todayIdx + 1} de ${periods.length}` : `${periods.length} días`} accent="brand" />
        <KPISep />
        <KPILine label="Avance real" value={`${Math.round(advancePct * 100)}%`} sub={fmtCurrency(todayAct, currency)} accent="green" />
        <KPISep />
        <KPILine label="Planificado a hoy" value={fmtCurrency(todayPlan, currency)} sub={totalPlanned > 0 ? `${Math.round((todayPlan / totalPlanned) * 100)}% del costo` : '—'} accent="amber" />
        <KPISep />
        <KPILine
          label="Variación"
          value={(variance >= 0 ? '+' : '') + fmtCurrency(Math.abs(variance), currency)}
          sub={variance >= 0 ? 'adelantado al plan' : 'atrasado vs. plan'}
          accent={variance >= 0 ? 'green' : 'red'}
        />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--n-500)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: ACCENT + '33', border: `1px solid ${ACCENT}88` }} />
          Planificado
          <span style={{ width: 12, height: 12, borderRadius: 3, background: ACCENT, marginLeft: 8 }} />
          Avance real
        </div>
      </div>

      {/* ── Gantt ── */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--n-50)' }}>
        <div style={{ display: 'flex', minWidth: 'min-content' }}>

          {/* Left sticky rail */}
          <div style={{
            flex: `0 0 ${LABEL_W}px`, position: 'sticky', left: 0, zIndex: 4,
            background: 'var(--n-0)', borderRight: '1px solid var(--n-150)',
          }}>
            {/* Header */}
            <div style={{
              height: 56, padding: '0 16px 10px', borderBottom: '1px solid var(--n-150)',
              background: 'var(--n-25)', display: 'flex', alignItems: 'flex-end',
            }}>
              <span style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Partida
              </span>
            </div>

            {/* Groups */}
            {groups.map(g => {
              const children = itemsOnly.filter(it => it.parent_id === g.id)
              const gp = getGroupProgress(g.id)
              return (
                <div key={g.id}>
                  {/* Group header */}
                  <div style={{
                    height: GRP_H, padding: '0 16px',
                    background: 'var(--brand-50)', borderBottom: '1px solid var(--brand-100)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {g.code && <span className="mono tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-700)', flexShrink: 0 }}>{g.code}</span>}
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, color: 'var(--brand-700)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{g.name}</span>
                    {gp > 0 && (
                      <span className="mono tnum" style={{ fontSize: 10.5, color: 'var(--brand-700)', fontWeight: 600, flexShrink: 0 }}>
                        {Math.round(gp * 100)}%
                      </span>
                    )}
                  </div>
                  {/* Item rows */}
                  {children.map(it => renderLeftItem(it, true))}
                </div>
              )
            })}

            {/* Orphan items */}
            {itemsOnly.filter(it => !groups.find(g => g.id === it.parent_id)).map(it => renderLeftItem(it, false))}
          </div>

          {/* Right scrollable grid */}
          <div style={{ position: 'relative', flex: 1, minWidth: periods.length * DAY_W }}>

            {/* Day header — two rows: month group + day number */}
            <div style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              {/* Month row */}
              <div style={{ display: 'flex', height: 22, borderBottom: '1px solid var(--n-200)', background: 'var(--n-50)' }}>
                {(() => {
                  const groups: { label: string; count: number }[] = []
                  periods.forEach(p => {
                    const d = new Date(p.isoDate + 'T00:00:00')
                    const label = d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })
                    const last = groups[groups.length - 1]
                    if (last && last.label === label) last.count++
                    else groups.push({ label, count: 1 })
                  })
                  return groups.map((g, i) => (
                    <div key={i} style={{
                      width: g.count * DAY_W, flexShrink: 0,
                      borderRight: '1px solid var(--n-200)',
                      padding: '0 6px', display: 'flex', alignItems: 'center',
                      fontSize: 10, fontWeight: 700, color: 'var(--n-600)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      overflow: 'hidden', whiteSpace: 'nowrap',
                    }}>{g.label}</div>
                  ))
                })()}
              </div>
              {/* Day number row */}
              <div style={{ display: 'flex', height: 26, borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
                {periods.map((p, d) => {
                  const isToday   = d === todayIdx
                  const date      = new Date(p.isoDate + 'T00:00:00')
                  const dayNum    = date.getDate()
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  return (
                    <div key={p.isoDate} style={{
                      width: DAY_W, flexShrink: 0,
                      borderRight: '1px solid var(--n-100)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                      background: isToday ? 'var(--red-50)' : isWeekend ? 'var(--n-75, #f7f7f7)' : 'transparent',
                    }}>
                      <span className="mono tnum" style={{
                        fontSize: 10.5, fontWeight: isToday ? 700 : 500,
                        color: isToday ? 'var(--red-700)' : isWeekend ? 'var(--n-400)' : 'var(--n-700)',
                      }}>{dayNum}</span>
                      {isToday && (
                        <span style={{
                          position: 'absolute', bottom: 1,
                          width: 4, height: 4, borderRadius: 999, background: 'var(--red-500)',
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Body */}
            <div style={{ position: 'relative' }}>
              {/* Background columns */}
              {periods.map((p, w) => {
                const isWeekend = (() => { const day = new Date(p.isoDate + 'T00:00:00').getDay(); return day === 0 || day === 6 })()
                return (
                  <div key={w} style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: w * DAY_W, width: DAY_W,
                    borderRight: '1px solid var(--n-100)',
                    background: w === todayIdx
                      ? 'rgba(254,226,226,0.25)'
                      : isWeekend ? 'rgba(0,0,0,0.025)' : 'transparent',
                    pointerEvents: 'none',
                  }} />
                )
              })}

              {/* Today line */}
              {todayIdx >= 0 && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: todayLeft - 1, width: 2,
                  background: 'var(--red-500)', zIndex: 2, pointerEvents: 'none',
                  boxShadow: '0 0 0 1px rgba(239,68,68,0.18)',
                }}>
                  <div style={{ position: 'absolute', top: -1, left: -3, width: 8, height: 8, borderRadius: 999, background: 'var(--red-500)' }} />
                </div>
              )}

              {/* Groups */}
              {groups.map(g => {
                const children = itemsOnly.filter(it => it.parent_id === g.id)
                const span = getGroupSpan(g.id)
                const gp   = getGroupProgress(g.id)
                return (
                  <div key={g.id}>
                    {/* Group summary bar row */}
                    <div style={{ height: GRP_H, borderBottom: '1px solid var(--brand-100)', background: 'var(--brand-50)', position: 'relative' }}>
                      {span && (() => {
                        const left  = span.start * DAY_W + 6
                        const width = (span.end - span.start + 1) * DAY_W - 12
                        return (
                          <>
                            <div style={{
                              position: 'absolute', top: GRP_H / 2 - 4, left, width, height: 8,
                              borderRadius: 999, background: 'linear-gradient(90deg, var(--brand-300), var(--brand-200))', opacity: 0.6,
                            }} />
                            <div style={{
                              position: 'absolute', top: GRP_H / 2 - 4, left, height: 8,
                              width: Math.max(4, width * gp), borderRadius: 999,
                              background: 'linear-gradient(90deg, var(--brand-700), var(--brand-500))',
                              transition: 'width .35s cubic-bezier(.4,0,.2,1)',
                            }} />
                          </>
                        )
                      })()}
                    </div>
                    {/* Item bars */}
                    {children.map(renderRightItem)}
                  </div>
                )
              })}

              {/* Orphan items */}
              {itemsOnly.filter(it => !groups.find(g => g.id === it.parent_id)).map(renderRightItem)}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editItem && (() => {
        const task       = tasks.find(t => t.item_id === editItem.id)
        const totalCost  = editItem.qty * (itemUnitPrices.get(editItem.id) ?? 0)
        const totalActual = actuals.filter(a => a.item_id === editItem.id).reduce((s, a) => s + a.executed_amount, 0)
        return (
          <ScheduleItemModalProto
            item={editItem} task={task} periods={periods}
            totalCost={totalCost} totalActual={totalActual} currency={currency}
            replaceItemActuals={replaceItemActuals}
            onSave={async (s, e) => { await onUpsert(editItem.id, s, e); setEditItem(null) }}
            onDelete={async () => { await onDelete(editItem.id); setEditItem(null) }}
            onClose={() => setEditItem(null)}
          />
        )
      })()}
    </div>
  )
}
