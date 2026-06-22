import { useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, format, differenceInCalendarDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSeguimientoGestion } from '../../hooks/useSeguimientoGestion'
import type { StatusFinal } from '../../hooks/useSeguimientoGestion'
import { SeguimientoNavTabs } from './SeguimientoNavTabs'

const WEEKS = 12
const DAY_W = 18 // px por día

const STATUS_COLOR: Record<StatusFinal, string> = {
  'CULMINADO':  '#22c55e',
  'EN PROCESO': '#6366f1',
  'PENDIENTE':  '#94a3b8',
}

const PRIORIDAD_DOT: Record<string, string> = {
  'ALTO':  '#ef4444',
  'MEDIO': '#f59e0b',
  'BAJO':  '#22c55e',
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function SeguimientoGanttPage() {
  const { tareas, loading } = useSeguimientoGestion()
  const [weekOffset, setWeekOffset] = useState(0)
  const [filterStatus, setFilterStatus] = useState<StatusFinal | 'TODOS'>('TODOS')

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  // Auto-centrar en el rango de fechas de las tareas al cargar
  useEffect(() => {
    if (tareas.length === 0) return
    const withDates = tareas.filter(t => t.asignado)
    if (!withDates.length) return
    const minDate = withDates.reduce((min, t) => {
      const d = parseISO(t.asignado!)
      return d < min ? d : min
    }, parseISO(withDates[0].asignado!))
    const monday = startOfWeekMonday(today)
    // Queremos que rangeStart quede ~1 semana antes de la primera tarea
    const weekOffset = Math.floor(differenceInCalendarDays(minDate, monday) / 7)
    setWeekOffset(weekOffset)
  }, [tareas, today])

  const rangeStart = useMemo(() => {
    const base = startOfWeekMonday(today)
    return addDays(base, weekOffset * 7 - 7)
  }, [today, weekOffset])

  const totalDays = WEEKS * 7
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i)), [rangeStart])

  // Agrupar días por semana para el header
  const weeks = useMemo(() => {
    const out: { label: string; days: Date[] }[] = []
    for (let i = 0; i < totalDays; i += 7) {
      const weekDays = days.slice(i, i + 7)
      out.push({ label: format(weekDays[0], 'd MMM', { locale: es }), days: weekDays })
    }
    return out
  }, [days, totalDays])

  const filtered = tareas.filter(t =>
    filterStatus === 'TODOS' || t.status_final === filterStatus
  ).filter(t => t.asignado || t.vence)

  // Posición de la línea de hoy
  const todayOffset = differenceInCalendarDays(today, rangeStart)
  const todayX = todayOffset * DAY_W

  const LABEL_W = 220

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Seguimiento de Gestión</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>
            {filtered.length} tareas con fechas
          </p>
        </div>

        <SeguimientoNavTabs active="gantt" />

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as StatusFinal | 'TODOS')}
          style={{ height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer' }}>
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="EN PROCESO">EN PROCESO</option>
          <option value="CULMINADO">CULMINADO</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setWeekOffset(0)}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12, cursor: 'pointer', color: 'var(--n-600)' }}>
            Hoy
          </button>
          <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnS}><ChevronLeft size={14} /></button>
          <button onClick={() => setWeekOffset(w => w + 1)} style={navBtnS}><ChevronRight size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando…</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: LABEL_W + totalDays * DAY_W }}>

              {/* ── Labels col ── */}
              <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid var(--n-150)' }}>
                {/* Header */}
                <div style={{ height: 52, borderBottom: '1px solid var(--n-150)', background: 'var(--n-50)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em' }}>TAREA</span>
                </div>
                {filtered.map((t, i) => (
                  <div key={t.id} style={{
                    height: 44, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6,
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--n-100)' : undefined,
                    background: i % 2 === 0 ? '#fff' : 'var(--n-50)',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORIDAD_DOT[t.prioridad] ?? '#94a3b8', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.tarea}>{t.tarea}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--n-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.solicitante}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Gantt grid ── */}
              <div style={{ flex: 1, position: 'relative' }}>
                {/* Week headers */}
                <div style={{ display: 'flex', height: 28, borderBottom: '1px solid var(--n-150)', background: 'var(--n-50)' }}>
                  {weeks.map((w, wi) => (
                    <div key={wi} style={{ width: 7 * DAY_W, flexShrink: 0, borderRight: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--n-500)' }}>{w.label}</span>
                    </div>
                  ))}
                </div>

                {/* Day headers */}
                <div style={{ display: 'flex', height: 24, borderBottom: '1px solid var(--n-150)', background: 'var(--n-50)' }}>
                  {days.map((d, di) => {
                    const isToday = differenceInCalendarDays(d, today) === 0
                    const isSun = d.getDay() === 0
                    return (
                      <div key={di} style={{
                        width: DAY_W, flexShrink: 0,
                        borderRight: isSun ? '1px solid var(--n-200)' : '1px solid var(--n-100)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isToday ? 'var(--brand-50)' : undefined,
                      }}>
                        <span style={{ fontSize: 9, fontWeight: isToday ? 800 : 400, color: isToday ? 'var(--brand-700)' : 'var(--n-400)' }}>
                          {format(d, 'd')}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Rows */}
                {filtered.map((t, i) => {
                  const start = t.asignado ? parseISO(t.asignado) : (t.vence ? parseISO(t.vence) : null)
                  const end   = t.vence    ? parseISO(t.vence)    : start
                  if (!start || !end) return null

                  const x1 = differenceInCalendarDays(start, rangeStart) * DAY_W
                  const x2 = (differenceInCalendarDays(end, rangeStart) + 1) * DAY_W
                  const barW = Math.max(x2 - x1, DAY_W)
                  const pct  = Math.round(t.status * 100)
                  const color = STATUS_COLOR[t.status_final]

                  return (
                    <div key={t.id} style={{
                      height: 44, position: 'relative', display: 'flex', alignItems: 'center',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--n-100)' : undefined,
                      background: i % 2 === 0 ? '#fff' : 'var(--n-50)',
                    }}>
                      {/* Weekend shading */}
                      {days.map((d, di) => d.getDay() === 0 || d.getDay() === 6
                        ? <div key={di} style={{ position: 'absolute', left: di * DAY_W, width: DAY_W, top: 0, bottom: 0, background: 'rgba(0,0,0,.025)', pointerEvents: 'none' }} />
                        : null
                      )}

                      {/* Hoy line */}
                      {todayX >= 0 && todayX < totalDays * DAY_W && (
                        <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--brand-400)', zIndex: 3, pointerEvents: 'none' }} />
                      )}

                      {/* Bar */}
                      {x2 > 0 && x1 < totalDays * DAY_W && (
                        <div title={`${t.tarea} · ${pct}%`} style={{
                          position: 'absolute', left: Math.max(0, x1), width: barW, height: 22,
                          borderRadius: 5, background: color + '33', border: `1.5px solid ${color}`,
                          overflow: 'hidden', zIndex: 2,
                        }}>
                          {/* Progress fill */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color + '66' }} />
                          <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700, color, padding: '0 5px', lineHeight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {pct}%
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Hoy line over header */}
                {todayX >= 0 && todayX < totalDays * DAY_W && (
                  <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--brand-400)', zIndex: 4, pointerEvents: 'none' }} />
                )}
              </div>
            </div>
          </div>

          {/* Leyenda */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--n-100)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(Object.entries(STATUS_COLOR) as [StatusFinal, string][]).map(([s, c]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--n-600)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: c + '66', border: `1.5px solid ${c}` }} />
                {s}
              </div>
            ))}
            {Object.entries(PRIORIDAD_DOT).map(([p, c]) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--n-600)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                {p}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnS: React.CSSProperties = {
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 6, border: '1px solid var(--n-200)', background: '#fff', cursor: 'pointer', color: 'var(--n-600)',
}
