import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { parseISO, addDays, format, differenceInCalendarDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBitrixTareas, type BitrixTarea } from '../../hooks/useBitrixTareas'
import { BitrixNavTabs } from '../../components/bitrix/BitrixNavTabs'

// ── Config ────────────────────────────────────────────────────────────────────

const WEEKS  = 16   // semanas visibles
const DAY_W  = 14   // px por día

// ── Colores de estado ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  'Nueva':         '#94a3b8',
  'Pendiente':     '#f59e0b',
  'En proceso':    '#6366f1',
  'Por verificar': '#a855f7',
  'Completada':    '#22c55e',
  'Rechazada':     '#ef4444',
  'Diferida':      '#cbd5e1',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date)
  const dow = (d.getDay() + 6) % 7  // 0=Mon … 6=Sun
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

function monthLabel(d: Date) {
  return format(d, 'MMMM yyyy', { locale: es })
}

function fmtShort(d: Date) {
  return format(d, 'd MMM', { locale: es })
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ComprasGanttPage() {
  const { groupId = '91' } = useParams<{ groupId: string }>()
  const { tareas, groupName, lastSync, source, loading, syncing, error, sync } = useBitrixTareas(groupId)

  const [weekOffset, setWeekOffset]         = useState(0)
  const [filterStatus, setFilterStatus]     = useState('Todos')
  const [filterResponsible, setFilterResponsible] = useState('')

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const rangeStart = useMemo(() => {
    const base = startOfWeekMonday(today)
    return addDays(base, weekOffset * 7 - 7)
  }, [today, weekOffset])

  const days = useMemo(() =>
    Array.from({ length: WEEKS * 7 }, (_, i) => addDays(rangeStart, i))
  , [rangeStart])

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
      const lbl = monthLabel(d)
      if (!spans.length || spans[spans.length - 1].label !== lbl)
        spans.push({ label: lbl, count: 0 })
      spans[spans.length - 1].count++
    })
    return spans
  }, [days])

  // Responsables únicos
  const responsibles = useMemo(() => {
    const s = new Set(tareas.map(t => t.responsible_name).filter(Boolean))
    return Array.from(s).sort()
  }, [tareas])

  // Filtrar y agrupar por responsable
  const grouped = useMemo(() => {
    const filtered = tareas.filter(t => {
      if (filterStatus !== 'Todos' && t.status !== filterStatus) return false
      if (filterResponsible && t.responsible_name !== filterResponsible) return false
      // Solo tareas con al menos una fecha visible en el rango
      const start = t.created_date ? parseISO(t.created_date) : null
      const end   = t.deadline     ? parseISO(t.deadline)     : null
      const ref   = end || start
      if (!ref) return false
      return ref >= rangeStart && (start ? start <= rangeEnd : true)
    })

    const map = new Map<string, BitrixTarea[]>()
    filtered.forEach(t => {
      const key = t.responsible_name || 'Sin asignar'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tareas, filterStatus, filterResponsible, rangeStart, rangeEnd])

  // Geometría de una barra
  function barGeom(t: BitrixTarea) {
    const start = t.created_date ? parseISO(t.created_date) : null
    const end   = t.deadline     ? parseISO(t.deadline)     : null

    if (end && start) {
      const sIdx = Math.max(0, differenceInCalendarDays(start, rangeStart))
      const eIdx = Math.min(WEEKS * 7 - 1, differenceInCalendarDays(end, rangeStart))
      const left  = sIdx * DAY_W
      const width = Math.max(DAY_W, (eIdx - sIdx + 1) * DAY_W - 2)
      return { left, width, isDot: false }
    }
    if (end) {
      const eIdx = Math.min(WEEKS * 7 - 1, differenceInCalendarDays(end, rangeStart))
      const left = eIdx * DAY_W
      return { left, width: DAY_W, isDot: true }
    }
    if (start) {
      const sIdx = Math.max(0, differenceInCalendarDays(start, rangeStart))
      const left = sIdx * DAY_W
      return { left, width: DAY_W * 2, isDot: false }
    }
    return null
  }

  const busy = loading || syncing
  const totalTasks = grouped.reduce((s, [, ts]) => s + ts.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--n-150)', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)' }}>
            {groupName || `Grupo ${groupId}`} · Gantt
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1 }}>
            Bitrix24 · Grupo {groupId}
            {lastSync && (
              <span style={{ marginLeft: 8, color: source === 'cache' ? 'var(--amber-600)' : 'var(--green-600)' }}>
                · {source === 'cache' ? 'Caché' : 'Sincronizado'} {fmtShort(new Date(lastSync))}
              </span>
            )}
          </div>
        </div>

        <BitrixNavTabs groupId={groupId} active="gantt" />

        {/* Filtros */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="Todos">Todos los estados</option>
          {['Nueva','Pendiente','En proceso','Por verificar','Completada','Rechazada','Diferida'].map(s =>
            <option key={s} value={s}>{s}</option>
          )}
        </select>
        <select value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)} style={selStyle}>
          <option value="">Todos los responsables</option>
          {responsibles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Navegación semanas */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--n-200)', borderRadius: 7, overflow: 'hidden' }}>
          <NavBtn onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={13} /></NavBtn>
          <button onClick={() => setWeekOffset(0)} style={{ padding: '0 10px', fontSize: 12, fontWeight: 600, color: 'var(--n-700)', cursor: 'pointer', borderLeft: '1px solid var(--n-200)', borderRight: '1px solid var(--n-200)', background: '#fff' }}>
            Hoy
          </button>
          <NavBtn onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={13} /></NavBtn>
        </div>

        <button onClick={sync} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', background: syncing ? 'var(--brand-400)' : 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>
          <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} />
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>

      {error && (
        <div style={{ margin: '12px 24px', padding: '10px 14px', borderRadius: 8, background: 'var(--red-50)', border: '1px solid var(--red-200)', color: 'var(--red-700)', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {busy ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
          {syncing ? 'Consultando Bitrix24…' : 'Cargando…'}
        </div>
      ) : (

        /* ── Gantt grid ── */
        <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
          <div style={{ display: 'flex', minWidth: `calc(260px + ${totalWidth}px)` }}>

            {/* Panel izquierdo */}
            <div style={{ flex: '0 0 260px', borderRight: '1px solid var(--n-150)', background: 'var(--n-25)', position: 'sticky', left: 0, zIndex: 3 }}>
              {/* Cabecera vacía alineada con el header del gantt */}
              <div style={{ height: 68, borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'flex-end', padding: '0 14px 8px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Responsable / Tarea
                  {totalTasks > 0 && <span style={{ marginLeft: 6, color: 'var(--brand-600)' }}>({totalTasks})</span>}
                </span>
              </div>

              {grouped.length === 0 ? null : grouped.map(([responsible, tasks]) => (
                <div key={responsible}>
                  {/* Grupo responsable */}
                  <div style={{ height: 32, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--n-100)', borderBottom: '1px solid var(--n-150)', fontSize: 11.5, fontWeight: 700, color: 'var(--n-800)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{responsible}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--n-500)', fontWeight: 500 }}>{tasks.length}</span>
                  </div>
                  {tasks.map(t => (
                    <div key={t.id} style={{ height: 28, padding: '0 14px 0 22px', display: 'flex', alignItems: 'center', fontSize: 11.5, color: 'var(--n-700)', borderBottom: '1px solid var(--n-100)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: STATUS_COLOR[t.status] || '#94a3b8', flexShrink: 0 }} />
                      {t.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Panel derecho — barras */}
            <div style={{ position: 'relative', flex: 1, minWidth: totalWidth }}>

              {/* Cabecera meses */}
              <div style={{ height: 44, display: 'flex', borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)', position: 'sticky', top: 0, zIndex: 2 }}>
                {monthSpans.map((m, i) => (
                  <div key={i} style={{ width: m.count * DAY_W, flexShrink: 0, borderRight: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12, fontWeight: 700, color: 'var(--n-900)', textTransform: 'capitalize', overflow: 'hidden', whiteSpace: 'nowrap' }}>
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
                    <div key={i} style={{ width: DAY_W, flexShrink: 0, borderRight: isMon ? '1px solid var(--n-200)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", color: isToday ? 'var(--brand-700)' : isWeekend ? 'var(--n-300)' : 'var(--n-500)', fontWeight: isToday ? 700 : 400, background: isToday ? 'var(--brand-50)' : 'transparent' }}>
                      {d.getDate()}
                    </div>
                  )
                })}
              </div>

              {/* Grid + filas */}
              <div style={{ position: 'relative' }}>
                {/* Sombra fines de semana */}
                {days.map((d, i) => {
                  if (d.getDay() !== 0 && d.getDay() !== 6) return null
                  return <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * DAY_W, width: DAY_W, background: 'var(--n-50)', pointerEvents: 'none', zIndex: 0 }} />
                })}
                {/* Línea de hoy */}
                {todayLeft >= 0 && todayLeft <= totalWidth && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 2, background: 'var(--red-500)', zIndex: 5, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(239,68,68,.15)' }}>
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateY(-6px)', width: 8, height: 8, borderRadius: 999, background: 'var(--red-500)', border: '2px solid #fff' }} />
                  </div>
                )}

                {/* Sin tareas */}
                {grouped.length === 0 && (
                  <div style={{ padding: '64px 24px', textAlign: 'center', fontSize: 13, color: 'var(--n-400)' }}>
                    No hay tareas con fechas en este período
                  </div>
                )}

                {grouped.map(([responsible, tasks]) => (
                  <div key={responsible} style={{ position: 'relative' }}>
                    {/* Fila cabecera responsable */}
                    <div style={{ height: 32, borderBottom: '1px solid var(--n-150)', background: 'var(--n-75)' }} />
                    {tasks.map(t => {
                      const color = STATUS_COLOR[t.status] || '#94a3b8'
                      const geom  = barGeom(t)
                      const isDone = t.status === 'Completada'
                      const isLate = t.deadline && parseISO(t.deadline) < today && !isDone

                      return (
                        <div key={t.id} style={{ height: 28, borderBottom: '1px solid var(--n-100)', position: 'relative' }}>
                          {geom && (
                            geom.isDot ? (
                              /* Diamante (solo deadline, sin created_date) */
                              <div
                                title={`${t.title} · Vence ${t.deadline}`}
                                style={{ position: 'absolute', top: '50%', left: geom.left, transform: 'translate(-50%, -50%) rotate(45deg)', width: 10, height: 10, background: isLate ? 'var(--red-500)' : color, border: '2px solid #fff', zIndex: 2, cursor: 'default', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}
                              />
                            ) : (
                              /* Barra normal */
                              <div
                                title={`${t.title}\n${t.status} · ${t.responsible_name}\n${t.created_date ? fmtShort(parseISO(t.created_date)) : '?'} → ${t.deadline ? fmtShort(parseISO(t.deadline)) : '…'}`}
                                style={{
                                  position: 'absolute', top: 5, left: geom.left, width: geom.width, height: 18,
                                  borderRadius: 5,
                                  background: isLate
                                    ? `repeating-linear-gradient(135deg, ${color}90 0 5px, ${color}40 5px 10px)`
                                    : isDone ? color + '50' : color + '28',
                                  border: `1.5px solid ${color}${isLate ? '' : '88'}`,
                                  cursor: 'default', overflow: 'hidden',
                                  transition: 'transform .1s, box-shadow .1s',
                                  zIndex: 2,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 2px 6px ${color}60`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                              >
                                {/* Relleno progreso (completada = lleno) */}
                                {isDone && <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.6 }} />}
                                {geom.width > 50 && (
                                  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: '100%', padding: '0 7px', fontSize: 10, fontWeight: 700, color: isDone ? '#fff' : color, whiteSpace: 'nowrap', textShadow: isDone ? '0 1px 2px rgba(0,0,0,.3)' : 'none' }}>
                                    {t.title}
                                  </span>
                                )}
                              </div>
                            )
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
      )}

      {/* Leyenda de estados */}
      {!busy && (
        <div style={{ flexShrink: 0, padding: '8px 24px', borderTop: '1px solid var(--n-150)', background: 'var(--n-25)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--n-600)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flexShrink: 0 }} />{s}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--n-400)' }}>
            ◆ = solo fecha de vencimiento &nbsp;|&nbsp; rayado = vencida
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', cursor: 'pointer', color: 'var(--n-600)' }}>
      {children}
    </button>
  )
}

const selStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)',
  background: '#fff', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer',
}
