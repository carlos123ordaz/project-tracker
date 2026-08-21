import { useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  RefreshCw, TrendingUp, List, BarChart2,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { parseISO, addDays, format, differenceInCalendarDays, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { useDeals, type Deal } from '../../hooks/useDeals'
import { PageLoader } from '../../components/ui/Loader'

// ── Config ────────────────────────────────────────────────────────────────────

const WEEKS  = 16   // semanas visibles
const DAY_W  = 12   // px por día
const LEFT_W = 380  // px columna de etiquetas

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: es }) }
  catch { return '—' }
}

function fmtShort(d: Date) { return format(d, 'd MMM', { locale: es }) }

function fmtMoney(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!n || isNaN(n)) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function tryParseISO(s: string): Date | null {
  if (!s) return null
  try { const d = parseISO(s); return isValid(d) ? d : null } catch { return null }
}

// ── Color coding ──────────────────────────────────────────────────────────────

type BarStyle = { bg: string; border: string; stripe: boolean; label: string }

function dealBarStyle(deal: Deal, today: Date): BarStyle {
  const sem = deal.stage_semantic_id || 'P'
  if (sem === 'S') return { bg: '#16a34a', border: '#15803d', stripe: false, label: 'Ganado' }
  if (sem === 'F') return { bg: '#94a3b8', border: '#64748b', stripe: false, label: 'Perdido' }
  if (!deal.closedate) return { bg: '#6366f1', border: '#4f46e5', stripe: false, label: 'En proceso' }
  const close = tryParseISO(deal.closedate)
  if (!close) return { bg: '#6366f1', border: '#4f46e5', stripe: false, label: 'En proceso' }
  const days = differenceInCalendarDays(close, today)
  if (days < 0)   return { bg: '#ef4444', border: '#dc2626', stripe: true,  label: `Vencido hace ${Math.abs(days)}d` }
  if (days <= 7)  return { bg: '#f97316', border: '#ea580c', stripe: false, label: `Cierra en ${days}d` }
  if (days <= 30) return { bg: '#eab308', border: '#ca8a04', stripe: false, label: `Cierra en ${days}d` }
  return { bg: '#6366f1', border: '#4f46e5', stripe: false, label: `Cierra en ${days}d` }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DealsGanttPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { deals: allDeals, lastSync, loading, syncing, error, sync } = useDeals()

  const [weekOffset, setWeekOffset]   = useState(0)
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [tooltip, setTooltip]         = useState<{ deal: Deal; x: number; y: number } | null>(null)
  const [leftWidth, setLeftWidth]     = useState(LEFT_W)
  const dragging = useRef(false)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const startX = e.clientX
    const startW = leftWidth
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const next = Math.max(160, Math.min(600, startW + ev.clientX - startX))
      setLeftWidth(next)
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [leftWidth])

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  // rangeStart: 8 semanas antes de hoy + offset
  const rangeStart = useMemo(() => {
    const base = startOfWeekMonday(today)
    return addDays(base, weekOffset * 7 - 8 * 7)
  }, [today, weekOffset])

  const days = useMemo(() =>
    Array.from({ length: WEEKS * 7 }, (_, i) => addDays(rangeStart, i)),
  [rangeStart])

  const rangeEnd   = days[days.length - 1]
  const totalWidth = WEEKS * 7 * DAY_W

  const todayLeft = useMemo(() => {
    const diff = differenceInCalendarDays(today, rangeStart)
    return diff * DAY_W + DAY_W / 2
  }, [today, rangeStart])

  // Cabecera de meses
  const monthSpans = useMemo(() => {
    const spans: { label: string; count: number }[] = []
    days.forEach(d => {
      const lbl = format(d, 'MMMM yyyy', { locale: es })
      if (!spans.length || spans[spans.length - 1].label !== lbl)
        spans.push({ label: lbl, count: 0 })
      spans[spans.length - 1].count++
    })
    return spans
  }, [days])

  // Aplicar los mismos filtros que vienen de la lista (via URL params)
  const deals = useMemo(() => {
    const sem      = searchParams.get('sem')
    const pipeline = searchParams.get('pipeline')
    const resp     = searchParams.get('resp')
    const etapa    = searchParams.get('etapa')
    const pau      = searchParams.get('pau')
    const pic      = searchParams.get('pic')
    const cisac    = searchParams.get('cisac')
    const q        = searchParams.get('q')?.toLowerCase()
    let rows = allDeals
    if (sem)      rows = rows.filter(d => (d.stage_semantic_id || 'P') === sem)
    if (pipeline) rows = rows.filter(d => d.category_id === pipeline)
    if (resp)     rows = rows.filter(d => d.assigned_by_name === resp)
    if (etapa)    rows = rows.filter(d => d.stage_name === etapa)
    if (pau)      rows = rows.filter(d => d.alcance_pau === pau)
    if (pic)      rows = rows.filter(d => d.alcance_pic === pic)
    if (cisac)    rows = rows.filter(d => d.dept_cisac.split(',').includes(cisac))
    if (q)        rows = rows.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.stage_name.toLowerCase().includes(q) ||
      d.assigned_by_name.toLowerCase().includes(q)
    )
    return rows
  }, [allDeals, searchParams])

  // Deals vencidos dentro del conjunto filtrado
  const overdueCount = useMemo(() =>
    deals.filter(d => {
      if ((d.stage_semantic_id || 'P') !== 'P') return false
      const close = tryParseISO(d.closedate)
      return close ? differenceInCalendarDays(close, today) < 0 : false
    }).length
  , [deals, today])

  // Chips de filtros activos (igual que dashboard)
  const activeChips = useMemo(() => {
    const chips: string[] = []
    const labels: Record<string, string> = { P: 'En proceso', S: 'Ganados', F: 'Perdidos' }
    const sem   = searchParams.get('sem')
    const resp  = searchParams.get('resp')
    const etapa = searchParams.get('etapa')
    const pipe  = searchParams.get('pipeline')
    const pau   = searchParams.get('pau')
    const pic   = searchParams.get('pic')
    const cisac = searchParams.get('cisac')
    const q     = searchParams.get('q')
    if (sem)   chips.push(`Estado: ${labels[sem] ?? sem}`)
    if (resp)  chips.push(`Resp: ${resp.split(' ')[0]}`)
    if (etapa) chips.push(`Etapa: ${etapa}`)
    if (pipe)  chips.push(`Pipeline: ${pipe}`)
    if (pau)   chips.push(`PAU: ${pau}`)
    if (pic)   chips.push(`PIC: ${pic}`)
    if (cisac) chips.push(`CISAC: ${cisac}`)
    if (q)     chips.push(`Búsqueda: "${q}"`)
    return chips
  }, [searchParams])

  // Agrupados por responsable (filtros de lista ya aplicados + onlyOverdue Gantt-específico)
  const grouped = useMemo(() => {
    let rows = deals
    if (onlyOverdue) rows = rows.filter(d => {
      const close = tryParseISO(d.closedate)
      return close ? differenceInCalendarDays(close, today) < 0 : false
    })
    // Solo deals con al menos una fecha en el rango visible
    rows = rows.filter(d => {
      const start = tryParseISO(d.date_create)
      const end   = tryParseISO(d.closedate)
      if (!start && !end) return false
      const latest   = end   || start!
      const earliest = start || end!
      return latest >= rangeStart && earliest <= rangeEnd
    })
    // Ordenar: más vencidos primero (closedate ascendente)
    rows = [...rows].sort((a, b) => {
      const ca = tryParseISO(a.closedate)?.getTime() ?? Infinity
      const cb = tryParseISO(b.closedate)?.getTime() ?? Infinity
      return ca - cb
    })
    const map = new Map<string, Deal[]>()
    rows.forEach(d => {
      const key = d.assigned_by_name || 'Sin asignar'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [deals, onlyOverdue, today, rangeStart, rangeEnd])

  // Geometría de la barra de un deal
  function barGeom(d: Deal): { left: number; width: number } | null {
    const start = tryParseISO(d.date_create)
    const end   = tryParseISO(d.closedate)
    if (start && end) {
      const left  = Math.max(0, differenceInCalendarDays(start, rangeStart)) * DAY_W
      const right = Math.min(WEEKS * 7, differenceInCalendarDays(end, rangeStart) + 1) * DAY_W
      return { left, width: Math.max(DAY_W, right - left - 2) }
    }
    if (end) {
      const left = Math.max(0, differenceInCalendarDays(end, rangeStart)) * DAY_W
      return { left, width: DAY_W * 2 }
    }
    if (start) {
      const left = Math.max(0, differenceInCalendarDays(start, rangeStart)) * DAY_W
      return { left, width: DAY_W * 3 }
    }
    return null
  }

  const totalDeals = grouped.reduce((s, [, ds]) => s + ds.length, 0)

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--n-150)', background: 'var(--n-0)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>

        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #059669, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TrendingUp size={16} style={{ color: '#fff' }} />
        </div>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', lineHeight: 1 }}>CRM — Gantt</div>
          <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 2 }}>
            Línea de tiempo · Bitrix24
            {overdueCount > 0 && (
              <span style={{ marginLeft: 8, color: '#dc2626', fontWeight: 700 }}>
                · {overdueCount} vencido{overdueCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Navegación */}
        <button
          onClick={() => navigate('/comercial/deals?' + searchParams.toString())}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer' }}
        >
          <List size={12} /> Lista
        </button>
        <button
          onClick={() => navigate('/comercial/deals/dashboard?' + searchParams.toString())}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer' }}
        >
          <BarChart2 size={12} /> Dashboard
        </button>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, cursor: 'pointer',
          userSelect: 'none', padding: '0 8px', height: 30, borderRadius: 6,
          border: `1px solid ${onlyOverdue ? '#fecaca' : 'var(--n-200)'}`,
          background: onlyOverdue ? '#fef2f2' : 'var(--n-0)',
          color: onlyOverdue ? '#dc2626' : 'var(--n-700)',
          fontWeight: onlyOverdue ? 700 : 400,
        }}>
          <input type="checkbox" checked={onlyOverdue} onChange={e => setOnlyOverdue(e.target.checked)}
            style={{ width: 12, height: 12, accentColor: '#dc2626' }} />
          Solo vencidos
        </label>

        {/* Navegación semanas */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--n-200)', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 28, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--n-0)', cursor: 'pointer', color: 'var(--n-600)', border: 'none' }}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setWeekOffset(0)} style={{ height: 30, padding: '0 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', cursor: 'pointer', background: 'var(--n-0)', borderTop: 'none', borderBottom: 'none', borderLeft: '1px solid var(--n-200)', borderRight: '1px solid var(--n-200)' }}>
            Hoy
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 28, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--n-0)', cursor: 'pointer', color: 'var(--n-600)', border: 'none' }}>
            <ChevronRight size={13} />
          </button>
        </div>

        <button onClick={sync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 6, border: 'none', background: syncing ? 'var(--brand-400)' : 'var(--brand-600)', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer' }}>
          <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} />
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>

      {/* Chips de filtros activos */}
      {activeChips.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 20px', borderBottom: '1px solid var(--n-100)', background: 'var(--n-25)', flexWrap: 'wrap', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--n-500)', fontWeight: 600 }}>Filtros activos:</span>
          {activeChips.map(c => (
            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-200)' }}>
              {c}
            </span>
          ))}
          <span style={{ fontSize: 11, color: 'var(--n-400)' }}>
            · {deals.length.toLocaleString()} de {allDeals.length.toLocaleString()} deals
          </span>
          <button
            onClick={() => navigate('/comercial/deals')}
            style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--brand-700)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            Cambiar filtros →
          </button>
        </div>
      )}

      {error && (
        <div style={{ margin: '10px 20px', padding: '8px 12px', borderRadius: 7, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ── Gantt grid ── */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--n-0)' }}>
        <div style={{ display: 'flex', minWidth: `calc(${leftWidth}px + ${totalWidth}px)` }}>

          {/* Panel izquierdo — sticky */}
          <div style={{ flex: `0 0 ${leftWidth}px`, width: leftWidth, minWidth: leftWidth, maxWidth: leftWidth, overflow: 'hidden', background: 'var(--n-25)', position: 'sticky', left: 0, zIndex: 3 }}>
            {/* Cabecera */}
            <div style={{ height: 68, borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'flex-end', padding: '0 8px 8px', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Responsable / Deal
                {totalDeals > 0 && <span style={{ marginLeft: 6, color: 'var(--brand-700)' }}>({totalDeals})</span>}
              </span>
            </div>

            {/* Filas */}
            {grouped.map(([resp, dls]) => (
              <div key={resp}>
                <div style={{ height: 32, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--n-100)', borderBottom: '1px solid var(--n-150)', fontSize: 10.5, fontWeight: 700, color: 'var(--n-800)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{resp}</span>
                  <span style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 500 }}>{dls.length}</span>
                </div>
                {dls.map(d => {
                  const bs = dealBarStyle(d, today)
                  return (
                    <div key={d.id} style={{ height: 28, padding: '0 8px 0 12px', display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--n-700)', borderBottom: '1px solid var(--n-100)', gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: bs.bg, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }} title={d.title}>
                        {d.title || '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Handle de resize */}
          <div
            onMouseDown={onDragStart}
            style={{
              flex: '0 0 5px', width: 5, cursor: 'col-resize',
              position: 'sticky', left: leftWidth, zIndex: 4,
              background: 'var(--n-150)',
              transition: 'background .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--brand-400)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--n-150)' }}
          >
            <div style={{ width: 1, height: 24, borderRadius: 999, background: 'currentColor', opacity: 0.5 }} />
          </div>

          {/* Panel derecho — barras */}
          <div style={{ position: 'relative', flex: 1, minWidth: totalWidth }}>

            {/* Cabecera meses */}
            <div style={{ height: 44, display: 'flex', borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)', position: 'sticky', top: 0, zIndex: 2 }}>
              {monthSpans.map((m, i) => (
                <div key={i} style={{ width: m.count * DAY_W, flexShrink: 0, borderRight: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--n-900)', textTransform: 'capitalize', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {m.label}
                </div>
              ))}
            </div>

            {/* Cabecera días */}
            <div style={{ height: 24, display: 'flex', borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)', position: 'sticky', top: 44, zIndex: 2 }}>
              {days.map((d, i) => {
                const isToday   = differenceInCalendarDays(d, today) === 0
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                const isMon     = i % 7 === 0
                return (
                  <div key={i} style={{ width: DAY_W, flexShrink: 0, borderRight: isMon ? '1px solid var(--n-200)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: 'monospace', color: isToday ? 'var(--brand-700)' : isWeekend ? 'var(--n-300)' : 'var(--n-500)', fontWeight: isToday ? 700 : 400, background: isToday ? 'var(--brand-50)' : 'transparent' }}>
                    {d.getDate()}
                  </div>
                )
              })}
            </div>

            {/* Grid body */}
            <div style={{ position: 'relative' }}>
              {/* Sombra fines de semana */}
              {days.map((d, i) => {
                if (d.getDay() !== 0 && d.getDay() !== 6) return null
                return <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * DAY_W, width: DAY_W, background: 'var(--n-50)', pointerEvents: 'none', zIndex: 0 }} />
              })}

              {/* Línea de hoy */}
              {todayLeft >= 0 && todayLeft <= totalWidth && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 2, background: '#ef4444', zIndex: 5, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(239,68,68,.15)' }}>
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateY(-5px)', width: 8, height: 8, borderRadius: 999, background: '#ef4444', border: '2px solid var(--n-0)' }} />
                </div>
              )}

              {/* Estado vacío */}
              {grouped.length === 0 && (
                <div style={{ padding: '64px 24px', textAlign: 'center', fontSize: 13, color: 'var(--n-400)' }}>
                  {onlyOverdue
                    ? 'No hay deals vencidos con el filtro actual.'
                    : 'No hay deals con fechas visibles en este período. Navega con ← →.'}
                </div>
              )}

              {/* Filas de deals */}
              {grouped.map(([resp, dls]) => (
                <div key={resp} style={{ position: 'relative' }}>
                  {/* Fila de cabecera responsable */}
                  <div style={{ height: 32, borderBottom: '1px solid var(--n-150)', background: 'var(--n-75)' }} />

                  {dls.map(d => {
                    const bs   = dealBarStyle(d, today)
                    const geom = barGeom(d)
                    return (
                      <div key={d.id} style={{ height: 28, borderBottom: '1px solid var(--n-100)', position: 'relative' }}>
                        {geom && (
                          <div
                            style={{
                              position: 'absolute', top: 5,
                              left: geom.left, width: geom.width, height: 18,
                              borderRadius: 5, cursor: 'default', zIndex: 2, overflow: 'hidden',
                              background: bs.stripe
                                ? `repeating-linear-gradient(135deg, ${bs.bg}cc 0 5px, ${bs.bg}44 5px 10px)`
                                : `${bs.bg}33`,
                              border: `1.5px solid ${bs.bg}`,
                              transition: 'transform .1s, box-shadow .1s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.boxShadow = `0 2px 8px ${bs.bg}70`
                              e.currentTarget.style.transform = 'translateY(-1px)'
                              setTooltip({ deal: d, x: e.clientX, y: e.clientY })
                            }}
                            onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                            onMouseLeave={e => {
                              e.currentTarget.style.boxShadow = 'none'
                              e.currentTarget.style.transform = 'none'
                              setTooltip(null)
                            }}
                          >
                            {geom.width > 64 && (
                              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: '100%', padding: '0 7px', fontSize: 10, fontWeight: 700, color: bs.bg, whiteSpace: 'nowrap' }}>
                                {d.title}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Leyenda ── */}
      <div style={{ flexShrink: 0, padding: '8px 20px', borderTop: '1px solid var(--n-150)', background: 'var(--n-25)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {([
          { bg: '#ef4444', stripe: true,  label: 'Vencido' },
          { bg: '#f97316', stripe: false, label: '< 7 días' },
          { bg: '#eab308', stripe: false, label: '< 30 días' },
          { bg: '#6366f1', stripe: false, label: 'En plazo' },
          { bg: '#16a34a', stripe: false, label: 'Ganado' },
          { bg: '#94a3b8', stripe: false, label: 'Perdido' },
        ] as const).map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--n-600)' }}>
            <span style={{
              width: 22, height: 10, borderRadius: 3, display: 'inline-block', flexShrink: 0,
              background: l.stripe
                ? `repeating-linear-gradient(135deg, ${l.bg}cc 0 4px, ${l.bg}44 4px 8px)`
                : `${l.bg}44`,
              border: `1.5px solid ${l.bg}`,
            }} />
            {l.label}
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--n-400)' }}>
          {lastSync && <>sync {fmtDate(lastSync)} · </>}
          {fmtShort(rangeStart)} — {fmtShort(rangeEnd)}
        </span>
      </div>

      {/* ── Tooltip flotante ── */}
      {tooltip && (() => {
        const bs = dealBarStyle(tooltip.deal, today)
        const x = Math.min(tooltip.x + 14, window.innerWidth - 290)
        const y = Math.min(tooltip.y + 14, window.innerHeight - 210)
        return (
          <div style={{ position: 'fixed', left: x, top: y, zIndex: 999, pointerEvents: 'none', background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8, padding: '10px 13px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,.13)', minWidth: 235 }}>
            <div style={{ fontWeight: 700, color: 'var(--n-900)', marginBottom: 6, lineHeight: 1.4, maxWidth: 260 }}>
              {tooltip.deal.title || '—'}
            </div>
            <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: bs.bg + '22', color: bs.bg, border: `1px solid ${bs.bg}55`, marginBottom: 7 }}>
              {bs.label}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, color: 'var(--n-600)' }}>
              <div><strong style={{ color: 'var(--n-700)' }}>Pipeline:</strong> {tooltip.deal.category_name || '—'}</div>
              <div><strong style={{ color: 'var(--n-700)' }}>Etapa:</strong> {tooltip.deal.stage_name || '—'}</div>
              <div><strong style={{ color: 'var(--n-700)' }}>Responsable:</strong> {tooltip.deal.assigned_by_name || '—'}</div>
              <div><strong style={{ color: 'var(--n-700)' }}>Monto:</strong> {fmtMoney(tooltip.deal.opportunity)} {tooltip.deal.currency_id}</div>
              <div><strong style={{ color: 'var(--n-700)' }}>Creado:</strong> {fmtDate(tooltip.deal.date_create)}</div>
              <div><strong style={{ color: 'var(--n-700)' }}>Cierre esperado:</strong> {fmtDate(tooltip.deal.closedate)}</div>
            </div>
          </div>
        )
      })()}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
