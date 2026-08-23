import { useMemo, useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Ticket, Clock, Timer, CalendarClock, Users,
  TrendingUp, TrendingDown, AlertCircle, ArrowRight,
} from 'lucide-react'
import { format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

import { useSubmissionAnalytics, useSubmissionCounts, useSubmitters, useFormId } from '../../hooks/useForms'
import type { SubmissionStatRow } from '../../hooks/useForms'
import type { SubmissionStatus } from '../../lib/types'
import { SUBMISSION_STATUSES } from '../../lib/types'
import {
  FORM_SLUG, SIN_DATO, labelFor, nombreDe, normalizarCiudad, formatearCiudad,
  parseFechaRespuesta, diasEntre, mediana, DIA_MS,
} from '../../lib/solicitudBoleto'

const RANGOS = [
  { value: '30',   label: 'Últimos 30 días', dias: 30 },
  { value: '90',   label: 'Últimos 90 días', dias: 90 },
  { value: '365',  label: 'Últimos 12 meses', dias: 365 },
  { value: 'todo', label: 'Todo el histórico', dias: 0 },
]

const ESTADO_COLOR: Record<SubmissionStatus, string> = {
  'Pendiente':  'var(--amber-500)',
  'En proceso': 'var(--blue-500)',
  'Completado': 'var(--green-500)',
  'Cancelado':  'var(--n-400)',
}

const PALETA = ['var(--brand-500)', 'var(--blue-500)', 'var(--purple-600)', 'var(--amber-500)', 'var(--green-500)']
const COLOR_SIN_DATO = 'var(--n-300)'

const CARD: React.CSSProperties = {
  background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12,
}

const TITULO_SECCION: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, color: 'var(--n-600)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

// ── Piezas de presentación ───────────────────────────────────────────────────

function Section({ title, hint, action, children }: {
  title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={{ ...CARD, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={TITULO_SECCION}>{title}</span>
        {hint && <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>{hint}</span>}
        {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
      </div>
      {children}
    </div>
  )
}

function Delta({ value, previous, invert = false, neutral = false, unidad = '' }: {
  value: number | null; previous: number | null; invert?: boolean; neutral?: boolean; unidad?: string
}) {
  if (value === null || previous === null || previous === 0) return null
  const diff = value - previous
  if (diff === 0) {
    return <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>sin cambio</span>
  }
  const pct   = Math.round((diff / previous) * 100)
  const sube  = diff > 0
  const bueno = invert ? !sube : sube
  const Icon  = sube ? TrendingUp : TrendingDown
  return (
    <span
      title={`Periodo anterior: ${previous}${unidad}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600,
        color: neutral ? 'var(--n-600)' : bueno ? 'var(--green-700)' : 'var(--amber-700)',
      }}
    >
      <Icon size={11} />
      {sube ? '+' : ''}{pct}%
    </span>
  )
}

function KpiCard({ label, value, sub, icon, color, to, delta }: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; color: string; to?: string; delta?: React.ReactNode
}) {
  const cuerpo = (
    <>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${color} 14%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span className="tnum" style={{ fontSize: 21, fontWeight: 700, color: 'var(--n-900)', lineHeight: 1.1 }}>
            {value}
          </span>
          {delta}
        </div>
        <div style={{ fontSize: 12, color: 'var(--n-600)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1 }}>{sub}</div>}
      </div>
      {to && <ArrowRight size={13} style={{ marginLeft: 'auto', color: 'var(--n-400)', flexShrink: 0 }} />}
    </>
  )

  const estilo: React.CSSProperties = {
    ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
    textDecoration: 'none', color: 'inherit',
  }

  if (!to) return <div style={estilo}>{cuerpo}</div>

  return (
    <Link
      to={to}
      style={{ ...estilo, transition: 'border-color .15s, background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--n-300)'; e.currentTarget.style.background = 'var(--n-25)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--n-150)'; e.currentTarget.style.background = 'var(--n-0)' }}
    >
      {cuerpo}
    </Link>
  )
}

interface Segmento { label: string; value: number; color: string }

function StackedBar({ title, data, total, legend = true }: {
  title: string; data: Segmento[]; total: number; legend?: boolean
}) {
  if (total === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {title && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-700)' }}>{title}</span>}
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
        {data.map(d => (
          <div
            key={d.label}
            title={`${d.label}: ${d.value} (${Math.round((d.value / total) * 100)}%)`}
            style={{ width: `${(d.value / total) * 100}%`, background: d.color, borderRadius: 999 }}
          />
        ))}
      </div>
      {legend && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        {data.map(d => (
          <span key={d.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--n-600)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: d.color }} />
            {d.label}
            <b className="tnum" style={{ color: 'var(--n-800)', fontWeight: 650 }}>{d.value}</b>
            <span style={{ color: 'var(--n-500)' }}>{Math.round((d.value / total) * 100)}%</span>
          </span>
        ))}
      </div>}
    </div>
  )
}

function RankBars({ data, total, color, hrefFor }: {
  data: { label: string; value: number; href?: string }[]
  total: number
  color: string
  hrefFor?: (label: string) => string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  if (data.length === 0) {
    return <div style={{ fontSize: 12.5, color: 'var(--n-500)' }}>Sin datos en este periodo.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map(d => {
        const fila = (
          <>
            <span style={{
              width: 148, fontSize: 12, color: 'var(--n-700)', textAlign: 'right', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {d.label}
            </span>
            <span style={{ flex: 1, background: 'var(--n-100)', borderRadius: 4, height: 14, overflow: 'hidden' }}>
              <span style={{
                display: 'block', width: `${(d.value / max) * 100}%`, background: color,
                height: '100%', borderRadius: 4, transition: 'width .4s ease',
              }} />
            </span>
            <span className="tnum" style={{ width: 38, fontSize: 12, color: 'var(--n-800)', fontWeight: 600, flexShrink: 0, textAlign: 'right' }}>
              {d.value}
            </span>
            <span className="tnum" style={{ width: 34, fontSize: 11, color: 'var(--n-500)', flexShrink: 0, textAlign: 'right' }}>
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%'}
            </span>
          </>
        )

        const estiloFila: React.CSSProperties = {
          display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
          borderRadius: 6, padding: '1px 2px',
        }

        return hrefFor ? (
          <Link
            key={d.label}
            to={hrefFor(d.label)}
            title={`Ver las solicitudes de ${d.label}`}
            style={estiloFila}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {fila}
          </Link>
        ) : (
          <div key={d.label} style={estiloFila}>{fila}</div>
        )
      })}
    </div>
  )
}

function UserCombobox({ users, counts, total, value, onChange }: {
  users: string[]; counts: Record<string, number>; total: number
  value: string; onChange: (v: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = users.filter(u => u.toLowerCase().includes(search.toLowerCase()))
  const label    = value ? `${nombreDe({ submitter_name: value })} (${counts[value] ?? 0})` : `Todos los solicitantes (${total})`

  const opcion = (activo: boolean): React.CSSProperties => ({
    padding: '7px 12px', fontSize: 12.5, cursor: 'pointer',
    background: activo ? 'var(--brand-50)' : 'var(--n-0)',
    color: activo ? 'var(--brand-700)' : 'var(--n-700)',
    fontWeight: activo ? 600 : 400,
    display: 'flex', justifyContent: 'space-between', gap: 10,
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 30,
          fontSize: 12.5, color: 'var(--n-700)', padding: '0 10px',
          border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)',
          cursor: 'pointer', fontFamily: 'inherit', minWidth: 240, justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, color: 'var(--n-500)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8,
          boxShadow: '0 8px 24px -8px rgba(10,14,26,.24)', width: 290, overflow: 'hidden',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--n-100)' }}>
            <input
              autoFocus
              type="text"
              placeholder="Buscar solicitante…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', fontSize: 12.5, padding: '5px 9px',
                border: '1px solid var(--n-200)', borderRadius: 6, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
                background: 'var(--n-0)', color: 'var(--n-800)',
              }}
            />
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            <div
              onMouseDown={() => { onChange(''); setSearch(''); setOpen(false) }}
              style={opcion(!value)}
            >
              <span>Todos los solicitantes</span>
              <span className="tnum" style={{ color: 'var(--n-500)', fontSize: 11.5 }}>{total}</span>
            </div>
            {filtered.map(u => (
              <div
                key={u}
                onMouseDown={() => { onChange(u); setSearch(''); setOpen(false) }}
                style={{ ...opcion(value === u), borderTop: '1px solid var(--n-50)' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nombreDe({ submitter_name: u })}
                </span>
                <span className="tnum" style={{ color: 'var(--n-500)', fontSize: 11.5, flexShrink: 0 }}>{counts[u] ?? 0}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--n-500)', textAlign: 'center' }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Skeleton({ height = 12, width = '100%' }: { height?: number; width?: number | string }) {
  return <span style={{ display: 'block', height, width, borderRadius: 5, background: 'var(--n-100)' }} />
}

// ── Cálculo de métricas ──────────────────────────────────────────────────────

function agrupar(rows: SubmissionStatRow[], key: (r: SubmissionStatRow) => string) {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = key(r) || SIN_DATO
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function topN(obj: Record<string, number>, n: number) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }))
}

function segmentos(obj: Record<string, number>): Segmento[] {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([raw, value], i) => ({
      label: raw === SIN_DATO ? SIN_DATO : labelFor(raw),
      value,
      color: raw === SIN_DATO ? COLOR_SIN_DATO : PALETA[i % PALETA.length],
    }))
}

function resumen(rows: SubmissionStatRow[], ahora: number) {
  const porEstado = {} as Record<SubmissionStatus, number>
  for (const st of SUBMISSION_STATUSES) porEstado[st] = 0
  for (const r of rows) if (r.status in porEstado) porEstado[r.status] += 1

  const pasajeros = rows.reduce((acc, r) => acc + (Number(r.num_pasajeros) || 0), 0)

  // Tiempo de gestión: de la solicitud a su cierre, aproximado con updated_at.
  // Las cargas masivas dejan cientos de filas actualizadas el mismo día y no
  // reflejan gestión real: se detectan por concentración y se excluyen.
  const cerradas = rows.filter(r => r.status === 'Completado' || r.status === 'Cancelado')
  const porDiaCierre = new Map<string, number>()
  for (const r of cerradas) {
    const dia = r.updated_at.slice(0, 10)
    porDiaCierre.set(dia, (porDiaCierre.get(dia) ?? 0) + 1)
  }
  const cargasMasivas = new Set(
    [...porDiaCierre].filter(([, n]) => n >= 20 && n / cerradas.length >= 0.2).map(([dia]) => dia),
  )
  const tiempos: number[] = []
  for (const r of cerradas) {
    if (cargasMasivas.has(r.updated_at.slice(0, 10))) continue
    const d = diasEntre(new Date(r.created_at), new Date(r.updated_at))
    if (d >= 0 && d <= 365) tiempos.push(d)
  }

  // Anticipación: días entre la solicitud y la fecha de salida del viaje
  const anticipos: number[] = []
  for (const r of rows) {
    const salida = parseFechaRespuesta(r.fecha_salida)
    if (!salida) continue
    const d = diasEntre(new Date(r.created_at), salida)
    if (d >= 0 && d <= 365) anticipos.push(d)
  }
  const buckets = [
    { label: 'Menos de 7 días', value: anticipos.filter(d => d < 7).length,             color: 'var(--red-500)' },
    { label: '7 a 14 días',     value: anticipos.filter(d => d >= 7 && d < 15).length,  color: 'var(--amber-500)' },
    { label: '15 a 30 días',    value: anticipos.filter(d => d >= 15 && d < 31).length, color: 'var(--blue-500)' },
    { label: 'Más de 30 días',  value: anticipos.filter(d => d >= 31).length,           color: 'var(--green-500)' },
  ]
  const urgentes = anticipos.length ? Math.round((buckets[0].value / anticipos.length) * 100) : null

  // Antigüedad del backlog abierto
  const abiertas = rows.filter(r => r.status === 'Pendiente' || r.status === 'En proceso')
  const edades   = abiertas.map(r => Math.floor((ahora - new Date(r.created_at).getTime()) / DIA_MS))
  const backlog  = {
    hoy:   edades.filter(d => d <= 0).length,
    corto: edades.filter(d => d >= 1 && d <= 3).length,
    largo: edades.filter(d => d > 3).length,
    masAntigua: edades.length ? Math.max(...edades) : null,
  }

  return {
    total: rows.length,
    porEstado,
    pasajeros,
    gestion:     mediana(tiempos),
    gestionN:    tiempos.length,
    anticipacion: mediana(anticipos),
    anticipacionN: anticipos.length,
    buckets,
    urgentes,
    abiertas: abiertas.length,
    backlog,
  }
}

// ── Pantalla ─────────────────────────────────────────────────────────────────

export default function SolicitudesDashboardPage() {
  const [params, setParams] = useSearchParams()

  const rango       = params.get('rango') ?? '365'
  const solicitante = params.get('quien') ?? ''

  const rangoDef  = RANGOS.find(r => r.value === rango) ?? RANGOS[2]
  const [ahora]   = useState(() => Date.now())

  // Se piden dos ventanas seguidas (actual + anterior) para poder comparar
  const desdeActual  = rangoDef.dias ? new Date(ahora - rangoDef.dias * DIA_MS).toISOString() : ''
  const desdeConsulta = rangoDef.dias ? new Date(ahora - 2 * rangoDef.dias * DIA_MS).toISOString() : ''

  const formId = useFormId(FORM_SLUG)
  const { rows, loading, error } = useSubmissionAnalytics(FORM_SLUG, { from: desdeConsulta, solicitante })
  const historico  = useSubmissionCounts(formId, {})
  const submitters = useSubmitters(formId)

  function patch(next: Record<string, string>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'todo') p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace: true })
  }

  const { actual, previo } = useMemo(() => {
    if (!desdeActual) return { actual: rows, previo: [] as SubmissionStatRow[] }
    const corte = new Date(desdeActual).getTime()
    return {
      actual: rows.filter(r => new Date(r.created_at).getTime() >= corte),
      previo: rows.filter(r => new Date(r.created_at).getTime() < corte),
    }
  }, [rows, desdeActual])

  const hoy    = useMemo(() => resumen(actual, ahora), [actual, ahora])
  const antes  = useMemo(() => resumen(previo, ahora), [previo, ahora])
  const conDelta = previo.length > 0

  const composicion = useMemo(() => ([
    { title: 'Tipo de boleto',  data: segmentos(agrupar(actual, r => r.tipo_boleto   ?? '')) },
    { title: 'Ámbito',          data: segmentos(agrupar(actual, r => r.destino_vuelo ?? '')) },
    { title: 'Tipo de servicio',data: segmentos(agrupar(actual, r => r.tipo_servicio ?? '')) },
    { title: 'Equipaje',        data: segmentos(agrupar(actual, r => r.equipaje      ?? '')) },
  ]), [actual])

  const destinos = useMemo(
    () => topN(agrupar(actual.filter(r => normalizarCiudad(r.ciudad_destino)), r => normalizarCiudad(r.ciudad_destino)), 10),
    [actual],
  )

  const solicitantes = useMemo(
    () => topN(agrupar(actual, r => nombreDe({ submitter_name: r.submitter_name })), 10),
    [actual],
  )

  const conteoPorUsuario = useMemo(() => {
    const out: Record<string, number> = {}
    for (const r of rows) {
      const k = nombreDe({ submitter_name: r.submitter_name })
      out[k] = (out[k] ?? 0) + 1
    }
    return out
  }, [rows])

  // En rangos cortos el detalle mensual deja dos o tres barras: se agrupa por semana
  const porSemana = Boolean(rangoDef.dias) && rangoDef.dias <= 90

  const tendencia = useMemo(() => {
    const clave = (d: Date) => porSemana
      ? format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfMonth(d), 'yyyy-MM')

    const cubos: Record<string, number> = {}
    for (const r of actual) {
      try {
        const k = clave(parseISO(r.created_at))
        cubos[k] = (cubos[k] ?? 0) + 1
      } catch { /* fecha ilegible: se ignora */ }
    }

    const actualKey = clave(new Date(ahora))
    return Object.keys(cubos).sort().slice(-12).map(k => ({
      key:   k,
      label: porSemana
        ? format(parseISO(k), 'd MMM', { locale: es })
        : format(parseISO(`${k}-01`), 'MMM yy', { locale: es }),
      value: cubos[k],
      enCurso: k === actualKey,
    }))
  }, [actual, ahora, porSemana])

  // Enlaces a la lista, conservando periodo y solicitante
  function listaHref(extra: Record<string, string> = {}) {
    const p = new URLSearchParams()
    if (rango !== 'todo') p.set('rango', rango)
    if (solicitante) p.set('quien', solicitante)
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    const qs = p.toString()
    return `/compras/solicitudes${qs ? `?${qs}` : ''}`
  }

  const tendenciaMax = Math.max(...tendencia.map(t => t.value), 1)

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link
          to={listaHref()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px',
            fontSize: 12.5, color: 'var(--n-700)', textDecoration: 'none',
            borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)',
          }}
        >
          <ArrowLeft size={13} /> Volver
        </Link>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0, letterSpacing: '-0.01em' }}>
            Dashboard — Solicitudes de Boletos
          </h1>
          <p style={{ fontSize: 12, color: 'var(--n-500)', margin: '3px 0 0' }}>
            {rangoDef.label.toLowerCase()}
            {historico.Todos !== null && ` · ${historico.Todos} solicitudes en todo el histórico`}
          </p>
        </div>

        <select
          value={rango}
          onChange={e => patch({ rango: e.target.value })}
          style={{
            height: 30, padding: '0 9px', fontSize: 12.5, fontFamily: 'inherit',
            border: '1px solid var(--n-200)', borderRadius: 7,
            background: 'var(--n-0)', color: 'var(--n-700)', cursor: 'pointer', outline: 'none',
          }}
        >
          {RANGOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <UserCombobox
          users={submitters}
          counts={conteoPorUsuario}
          total={rows.length}
          value={solicitante}
          onChange={v => patch({ quien: v })}
        />
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8,
          background: 'var(--red-50)', border: '1px solid var(--red-200)',
          fontSize: 12.5, color: 'var(--red-700)',
        }}>
          <AlertCircle size={14} /> No se pudieron cargar las métricas: {error}
        </div>
      )}

      {loading ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ ...CARD, padding: '14px 16px', display: 'flex', gap: 12 }}>
                <Skeleton height={36} width={36} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Skeleton height={16} width="55%" />
                  <Skeleton height={10} width="80%" />
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...CARD, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={10} width={160} />
            <Skeleton height={72} />
          </div>
        </>
      ) : actual.length === 0 ? (
        <div style={{ ...CARD, padding: '56px 24px', textAlign: 'center' }}>
          <Ticket size={34} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-700)' }}>
            No hay solicitudes en este periodo
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginTop: 4 }}>
            Prueba con un rango más amplio o quita el filtro por solicitante.
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            <KpiCard
              label="Solicitudes recibidas"
              value={hoy.total}
              icon={<Ticket size={17} />}
              color="var(--brand-600)"
              to={listaHref()}
              delta={conDelta ? <Delta value={hoy.total} previous={antes.total} neutral /> : undefined}
            />
            <KpiCard
              label="Abiertas"
              value={hoy.abiertas}
              sub={hoy.backlog.masAntigua !== null
                ? `la más antigua, hace ${hoy.backlog.masAntigua} ${hoy.backlog.masAntigua === 1 ? 'día' : 'días'}`
                : 'nada en cola'}
              icon={<Clock size={17} />}
              color="var(--amber-600)"
              to={listaHref({ estado: 'Pendiente' })}
              delta={conDelta ? <Delta value={hoy.abiertas} previous={antes.abiertas} invert /> : undefined}
            />
            <KpiCard
              label="Tiempo de gestión (mediana)"
              value={hoy.gestionN < 5 ? '—' : hoy.gestion === 0 ? 'Mismo día' : `${hoy.gestion} d`}
              sub={hoy.gestionN < 5
                ? 'aún sin historial suficiente'
                : `sobre ${hoy.gestionN} cerradas con seguimiento individual`}
              icon={<Timer size={17} />}
              color="var(--green-600)"
              delta={conDelta && hoy.gestionN >= 5 && antes.gestionN >= 5
                ? <Delta value={hoy.gestion} previous={antes.gestion} invert unidad=" d" />
                : undefined}
            />
            <KpiCard
              label="Anticipación (mediana)"
              value={hoy.anticipacion === null ? '—' : `${hoy.anticipacion} d`}
              sub={hoy.urgentes === null ? 'sin fechas de salida' : `${hoy.urgentes}% se pide con menos de 7 días`}
              icon={<CalendarClock size={17} />}
              color="var(--blue-600)"
              delta={conDelta ? <Delta value={hoy.anticipacion} previous={antes.anticipacion} unidad=" d" /> : undefined}
            />
            <KpiCard
              label="Pasajeros solicitados"
              value={hoy.pasajeros}
              sub={`${(hoy.pasajeros / Math.max(hoy.total, 1)).toFixed(1)} por solicitud`}
              icon={<Users size={17} />}
              color="var(--purple-600)"
              delta={conDelta ? <Delta value={hoy.pasajeros} previous={antes.pasajeros} neutral /> : undefined}
            />
          </div>

          {/* Backlog + estados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
            <Section title="Cola de trabajo" hint="Solicitudes abiertas por antigüedad">
              {hoy.abiertas === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--n-600)' }}>
                  No queda ninguna solicitud pendiente ni en proceso en este periodo.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Recibidas hoy', value: hoy.backlog.hoy,   color: 'var(--blue-700)',  bg: 'var(--blue-50)' },
                    { label: '1 a 3 días',    value: hoy.backlog.corto, color: 'var(--amber-700)', bg: 'var(--amber-50)' },
                    { label: 'Más de 3 días', value: hoy.backlog.largo, color: 'var(--red-700)',   bg: 'var(--red-50)' },
                  ].map(b => (
                    <Link
                      key={b.label}
                      to={listaHref({ estado: 'Pendiente' })}
                      style={{
                        flex: '1 1 120px', padding: '10px 12px', borderRadius: 9,
                        background: b.bg, color: b.color, textDecoration: 'none',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                    >
                      <span className="tnum" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>{b.value}</span>
                      <span style={{ fontSize: 11.5 }}>{b.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Distribución por estado">
              <StackedBar
                title=""
                legend={false}
                total={hoy.total}
                data={SUBMISSION_STATUSES
                  .filter(st => hoy.porEstado[st] > 0)
                  .map(st => ({ label: st, value: hoy.porEstado[st], color: ESTADO_COLOR[st] }))}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUBMISSION_STATUSES.map(st => (
                  <Link
                    key={st}
                    to={listaHref({ estado: st })}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 999, textDecoration: 'none',
                      border: '1px solid var(--n-200)', background: 'var(--n-0)',
                      fontSize: 12, color: 'var(--n-600)',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: ESTADO_COLOR[st] }} />
                    {st}
                    <b className="tnum" style={{ color: 'var(--n-900)', fontWeight: 700 }}>{hoy.porEstado[st]}</b>
                  </Link>
                ))}
              </div>
            </Section>
          </div>

          {/* Anticipación */}
          <Section
            title="Anticipación de la compra"
            hint="Días entre la solicitud y la fecha de salida"
          >
            {hoy.anticipacionN === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--n-600)' }}>
                Ninguna solicitud de este periodo tiene fecha de salida registrada.
              </div>
            ) : (
              <>
                <RankBars
                  data={hoy.buckets.map(b => ({ label: b.label, value: b.value }))}
                  total={hoy.anticipacionN}
                  color="var(--brand-500)"
                />
                <div style={{ fontSize: 11.5, color: 'var(--n-500)' }}>
                  Calculado sobre {hoy.anticipacionN} de {hoy.total} solicitudes. Cuanto más tarde se pide,
                  más caro suele salir el boleto.
                </div>
              </>
            )}
          </Section>

          {/* Tendencia */}
          {tendencia.length > 0 && (
            <Section
              title={porSemana ? 'Tendencia semanal' : 'Tendencia mensual'}
              hint={`Máximo ${tendenciaMax} en ${porSemana ? 'una semana' : 'un mes'}`}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 92 }}>
                {tendencia.map(t => (
                  <div key={t.key} style={{ flex: 1, maxWidth: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span className="tnum" style={{ fontSize: 10.5, color: 'var(--n-600)', fontWeight: 600 }}>{t.value}</span>
                    <div
                      title={`${t.label}: ${t.value} solicitudes${t.enCurso ? (porSemana ? ' (semana en curso)' : ' (mes en curso)') : ''}`}
                      style={{
                        width: '100%', borderRadius: '3px 3px 0 0',
                        background: t.enCurso ? 'var(--brand-200)' : 'var(--brand-400)',
                        border: t.enCurso ? '1px dashed var(--brand-400)' : 'none',
                        boxSizing: 'border-box',
                        height: `${Math.max(4, (t.value / tendenciaMax) * 60)}px`,
                        transition: 'height .4s',
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'var(--n-500)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {t.label}
                    </span>
                  </div>
                ))}
              </div>
              {tendencia.some(t => t.enCurso) && (
                <div style={{ fontSize: 11.5, color: 'var(--n-500)' }}>
                  La última barra corresponde {porSemana ? 'a la semana' : 'al mes'} en curso, todavía incompleta.
                </div>
              )}
            </Section>
          )}

          {/* Composición */}
          <Section title="Composición de las solicitudes">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              {composicion.map(c => (
                <StackedBar key={c.title} title={c.title} data={c.data} total={hoy.total} />
              ))}
            </div>
          </Section>

          {/* Rankings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
            <Section title="Top destinos" hint="Ciudades unificadas (Cusco y Cuzco cuentan igual)">
              <RankBars
                data={destinos.map(d => ({ ...d, label: formatearCiudad(d.label) }))}
                total={hoy.total}
                color="var(--green-500)"
                hrefFor={ciudad => listaHref({ q: ciudad })}
              />
            </Section>

            <Section title="Top solicitantes" hint="Variantes del mismo nombre agrupadas">
              <RankBars
                data={solicitantes}
                total={hoy.total}
                color="var(--brand-400)"
                hrefFor={nombre => listaHref({ quien: nombre })}
              />
            </Section>
          </div>
        </>
      )}
    </div>
  )
}
