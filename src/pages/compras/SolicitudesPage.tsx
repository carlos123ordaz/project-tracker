import { useState, useEffect, useMemo } from 'react'
import {
  Ticket, Search, Copy, Check, X, AlertCircle, Undo2,
  FileDown, FileSpreadsheet, LayoutDashboard, ChevronRight,
  ChevronUp, ChevronDown, ChevronsUpDown, Loader2,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

import { useFormSubmissions, useFormBySlug, useSubmissionCounts, useSubmitters } from '../../hooks/useForms'
import type { SubmissionSortKey, SubmissionFilters } from '../../lib/formSubmissionsQuery'
import { hasActiveFilters } from '../../lib/formSubmissionsQuery'
import type { FormSubmission, SubmissionStatus } from '../../lib/types'
import { SUBMISSION_STATUSES } from '../../lib/types'
import {
  FORM_SLUG, STATUS_STYLE, formatearCiudad, modalidadDe, nombreDe, origenDe, destinoDe,
} from '../../lib/solicitudBoleto'
import { exportSolicitudes } from '../../lib/exportSolicitudesExcel'
import SolicitudDrawer from '../../components/compras/SolicitudDrawer'
import { Button, IconButton } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const MODALIDADES = [
  { value: 'aereo',           label: 'Aéreo' },
  { value: 'terrestre',       label: 'Terrestre' },
  { value: 'aereo_terrestre', label: 'Aéreo y Terrestre' },
]

const RANGOS = [
  { value: 'todo', label: 'Todo el histórico', days: 0 },
  { value: '30',   label: 'Últimos 30 días',   days: 30 },
  { value: '90',   label: 'Últimos 90 días',   days: 90 },
  { value: '365',  label: 'Último año',        days: 365 },
]

const COLUMNS: { key: SubmissionSortKey | null; label: string; align?: 'center' | 'right' }[] = [
  { key: 'solicitante', label: 'Solicitante' },
  { key: 'ruta',        label: 'Ruta' },
  { key: null,          label: 'Modalidad' },
  { key: 'pax',         label: 'Pax', align: 'center' },
  { key: 'fecha',       label: 'Recibida' },
  { key: 'task',        label: 'Task' },
  { key: 'estado',      label: 'Estado' },
  { key: null,          label: '', align: 'right' },
]

const CELL: React.CSSProperties = {
  padding: '7px 12px', fontSize: 12.5, color: 'var(--n-700)',
  whiteSpace: 'nowrap', borderBottom: '1px solid var(--n-100)',
}

const FIELD: React.CSSProperties = {
  height: 30, padding: '0 9px', fontSize: 12.5,
  border: '1px solid var(--n-200)', borderRadius: 7,
  background: 'var(--n-0)', color: 'var(--n-700)',
  outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
}

interface UndoState { ids: string[]; previous: Record<string, SubmissionStatus>; label: string }

export default function SolicitudesPage() {
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Estado de la pantalla, guardado en la URL ──────────────────────────────
  const estado      = (params.get('estado') ?? 'Todos') as SubmissionStatus | 'Todos'
  const q           = params.get('q') ?? ''
  const rango       = params.get('rango') ?? 'todo'
  const modalidad   = params.get('tipo') ?? ''
  const solicitante = params.get('quien') ?? ''
  const sort        = (params.get('orden') ?? 'fecha') as SubmissionSortKey
  const dir         = (params.get('dir') ?? 'desc') as 'asc' | 'desc'
  const page        = Math.max(0, Number(params.get('p') ?? 0))
  const pageSize    = Number(params.get('filas') ?? 25)

  // Un único "ahora" por sesión: mantiene el rango estable entre renders
  const [now] = useState(() => Date.now())
  const from = useMemo(() => {
    const days = RANGOS.find(r => r.value === rango)?.days ?? 0
    if (!days) return ''
    return new Date(now - days * 86_400_000).toISOString()
  }, [rango, now])

  function patch(next: Record<string, string | number | null>, resetPage = true) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '' || v === 'Todos' || v === 'todo') p.delete(k)
      else p.set(k, String(v))
    }
    if (resetPage) p.delete('p')
    setSelected(new Set())
    setParams(p, { replace: true })
  }

  // ── Búsqueda con retardo ───────────────────────────────────────────────────
  const [search, setSearch] = useState({ text: q, url: q })
  if (search.url !== q) setSearch({ text: q, url: q })   // la URL cambió (atrás/adelante)
  const searchInput = search.text

  useEffect(() => {
    if (searchInput === q) return
    const t = setTimeout(() => patch({ q: searchInput }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [revision, setRevision] = useState(0)

  const filters: SubmissionFilters = { search: q, from, modalidad, solicitante }

  const { formId, submissions, total, loading, error, updateStatus, updateStatusMany } =
    useFormSubmissions(FORM_SLUG, { ...filters, status: estado, page, pageSize, sort, dir, revision })

  const counts     = useSubmissionCounts(formId, filters, revision)
  const submitters = useSubmitters(formId)
  const { fields } = useFormBySlug(FORM_SLUG)

  // ── Interacción ────────────────────────────────────────────────────────────
  const [copied,       setCopied]       = useState(false)
  const [openId,       setOpenId]       = useState<string | null>(null)
  const [menuFor,      setMenuFor]      = useState<{ id: string; x: number; y: number } | null>(null)
  const [savingId,     setSavingId]     = useState<string | null>(null)
  const [downloadingId,setDownloadingId]= useState<string | null>(null)
  const [exporting,    setExporting]    = useState(false)
  const [bulkBusy,     setBulkBusy]     = useState(false)
  const [problem,      setProblem]      = useState<string | null>(null)
  const [undo,         setUndo]         = useState<UndoState | null>(null)

  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 8000)
    return () => clearTimeout(t)
  }, [undo])

  const openSubmission = submissions.find(s => s.id === openId) ?? null
  const filtersActive  = hasActiveFilters({ ...filters, status: estado })
  const lastReceived   = submissions[0]?.created_at

  const formUrl = `${window.location.origin}/forms/${FORM_SLUG}`

  function copyLink() {
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleSort(key: SubmissionSortKey) {
    if (sort === key) patch({ dir: dir === 'asc' ? 'desc' : 'asc' }, false)
    else patch({ orden: key, dir: key === 'fecha' ? 'desc' : 'asc' }, false)
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev =>
      prev.size === submissions.length ? new Set() : new Set(submissions.map(s => s.id)),
    )
  }

  async function changeStatus(s: FormSubmission, status: SubmissionStatus) {
    if (s.status === status) return
    setSavingId(s.id)
    setProblem(null)
    try {
      await updateStatus(s.id, status)
      setUndo({ ids: [s.id], previous: { [s.id]: s.status }, label: `${nombreDe(s)} → ${status}` })
      setRevision(r => r + 1)
    } catch (e) {
      setProblem(`No se pudo cambiar el estado: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSavingId(null)
      setMenuFor(null)
    }
  }

  async function changeStatusBulk(status: SubmissionStatus) {
    const ids = [...selected]
    if (ids.length === 0) return
    setBulkBusy(true)
    setProblem(null)
    try {
      const previous: Record<string, SubmissionStatus> = {}
      for (const s of submissions) if (selected.has(s.id)) previous[s.id] = s.status
      await updateStatusMany(ids, status)
      setUndo({ ids, previous, label: `${ids.length} solicitudes → ${status}` })
      setSelected(new Set())
      setRevision(r => r + 1)
    } catch (e) {
      setProblem(`No se pudo cambiar el estado: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBulkBusy(false)
    }
  }

  async function applyUndo() {
    if (!undo) return
    setBulkBusy(true)
    try {
      const groups = new Map<SubmissionStatus, string[]>()
      for (const [id, st] of Object.entries(undo.previous)) {
        groups.set(st, [...(groups.get(st) ?? []), id])
      }
      for (const [st, ids] of groups) await updateStatusMany(ids, st)
      setUndo(null)
      setRevision(r => r + 1)
    } catch (e) {
      setProblem(`No se pudo deshacer: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBulkBusy(false)
    }
  }

  async function downloadPdf(s: FormSubmission) {
    setDownloadingId(s.id)
    setProblem(null)
    try {
      const res = await fetch(`${API_BASE}/solicitudes/boleto/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id:   s.id,
          submitter_name:  s.submitter_name  ?? '',
          submitter_email: s.submitter_email ?? '',
          fecha_solicitud: s.created_at,
          answers:         s.answers ?? {},
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Solicitud_Boleto_${nombreDe(s).replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      const detalle = e instanceof TypeError
        ? `no responde el servicio de PDF (${API_BASE})`
        : e instanceof Error ? e.message : String(e)
      setProblem(`No se pudo generar el PDF: ${detalle}`)
    } finally {
      setDownloadingId(null)
    }
  }

  async function downloadSelectedPdfs() {
    setBulkBusy(true)
    for (const s of submissions.filter(x => selected.has(x.id))) {
      await downloadPdf(s)
    }
    setBulkBusy(false)
  }

  async function exportExcel() {
    if (!formId) return
    setExporting(true)
    setProblem(null)
    try {
      await exportSolicitudes(formId, { ...filters, status: estado })
    } catch (e) {
      setProblem(`No se pudo exportar: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const chips: ('Todos' | SubmissionStatus)[] = ['Todos', ...SUBMISSION_STATUSES]

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0, letterSpacing: '-0.01em' }}>
            Solicitudes de Boletos
          </h1>
          <p style={{ fontSize: 12, color: 'var(--n-500)', margin: '3px 0 0' }}>
            {counts.Todos === null ? 'Cargando solicitudes…' : `${counts.Todos} solicitudes`}
            {lastReceived && ` · última recibida ${formatDistanceToNow(new Date(lastReceived), { locale: es, addSuffix: true })}`}
          </p>
        </div>

        <Link
          to="/compras/solicitudes/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px',
            borderRadius: 6, background: 'transparent', color: 'var(--n-700)',
            border: '1px solid transparent', fontSize: 12.5, fontWeight: 550, textDecoration: 'none',
          }}
        >
          <LayoutDashboard size={14} /> Dashboard
        </Link>

        <Button icon={copied ? Check : Copy} onClick={copyLink} title={formUrl}>
          {copied ? 'Enlace copiado' : 'Copiar enlace del formulario'}
        </Button>

        <Button variant="primary" icon={FileSpreadsheet} onClick={exportExcel} disabled={exporting || !formId}>
          {exporting ? 'Exportando…' : 'Exportar Excel'}
        </Button>
      </div>

      {/* Chips de estado, siempre con su conteo */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
        {chips.map(c => {
          const active = estado === c
          const style  = c === 'Todos' ? null : STATUS_STYLE[c]
          const value  = counts[c]
          return (
            <button
              key={c}
              onClick={() => patch({ estado: c })}
              aria-pressed={active}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                height: 30, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
                fontSize: 12.5, fontWeight: 550, fontFamily: 'inherit',
                background: active ? 'var(--brand-50)' : 'var(--n-0)',
                color: active ? 'var(--brand-700)' : (style?.color ?? 'var(--n-600)'),
                border: `1px solid ${active ? 'var(--brand-200)' : 'var(--n-200)'}`,
                transition: 'background .15s, border-color .15s',
              }}
            >
              {style && (
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
              )}
              {c === 'Todos' ? 'Todas' : c}
              <span className="tnum" style={{ fontWeight: 700, color: active ? 'var(--brand-700)' : 'var(--n-900)' }}>
                {value === null ? '·' : value}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-500)',
          }} />
          <input
            value={searchInput}
            onChange={e => setSearch(s => ({ ...s, text: e.target.value }))}
            placeholder="Buscar por nombre, ruta o task…"
            style={{
              width: '100%', height: 30, paddingLeft: 30, paddingRight: searchInput ? 28 : 10,
              border: '1px solid var(--n-200)', borderRadius: 7, fontSize: 12.5,
              color: 'var(--n-800)', background: 'var(--n-0)', boxSizing: 'border-box',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          {searchInput && (
            <button
              onClick={() => setSearch(s => ({ ...s, text: '' }))}
              title="Limpiar búsqueda"
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--n-500)', display: 'flex', padding: 2,
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select value={rango} onChange={e => patch({ rango: e.target.value })} style={FIELD}>
          {RANGOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <select value={modalidad} onChange={e => patch({ tipo: e.target.value })} style={FIELD}>
          <option value="">Todas las modalidades</option>
          {MODALIDADES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <select value={solicitante} onChange={e => patch({ quien: e.target.value })} style={{ ...FIELD, maxWidth: 220 }}>
          <option value="">Todos los solicitantes</option>
          {submitters.map(n => <option key={n} value={n}>{nombreDe({ submitter_name: n })}</option>)}
        </select>

        {filtersActive && (
          <Button variant="ghost" size="sm" icon={X} onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Limpiar filtros
          </Button>
        )}

        <span className="tnum" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--n-500)' }}>
          {loading ? 'Buscando…' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
        </span>
      </div>

      {/* Aviso de error */}
      {(problem || error) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12,
          padding: '9px 12px', borderRadius: 8,
          background: 'var(--red-50)', border: '1px solid var(--red-200)',
          fontSize: 12.5, color: 'var(--red-700)',
        }}>
          <AlertCircle size={14} style={{ marginTop: 1, flex: '0 0 auto' }} />
          <span style={{ flex: 1 }}>{problem ?? error}</span>
          <button
            onClick={() => { setProblem(null); setRevision(r => r + 1) }}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--red-700)', fontWeight: 600, fontSize: 12.5, fontFamily: 'inherit',
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Barra de acciones masivas */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          marginBottom: 10, padding: '8px 12px', borderRadius: 8,
          background: 'var(--brand-50)', border: '1px solid var(--brand-200)',
          fontSize: 12.5, color: 'var(--brand-700)',
        }}>
          <strong style={{ fontWeight: 650 }}>
            {selected.size} {selected.size === 1 ? 'seleccionada' : 'seleccionadas'}
          </strong>
          <span style={{ color: 'var(--n-500)' }}>Marcar como</span>
          {SUBMISSION_STATUSES.map(st => (
            <button
              key={st}
              onClick={() => changeStatusBulk(st)}
              disabled={bulkBusy}
              style={{
                height: 26, padding: '0 10px', borderRadius: 6, cursor: bulkBusy ? 'wait' : 'pointer',
                fontSize: 12, fontWeight: 550, fontFamily: 'inherit',
                background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].color,
                border: `1px solid ${STATUS_STYLE[st].border}`,
              }}
            >
              {st}
            </button>
          ))}
          <Button size="sm" icon={FileDown} onClick={downloadSelectedPdfs} disabled={bulkBusy}>
            Descargar PDFs
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto' }}>
            Quitar selección
          </Button>
        </div>
      )}

      {/* Tabla */}
      <div style={{
        background: 'var(--n-0)', border: '1px solid var(--n-150)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 34, paddingRight: 0 }}>
                  <input
                    type="checkbox"
                    checked={submissions.length > 0 && selected.size === submissions.length}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < submissions.length }}
                    onChange={toggleAll}
                    aria-label="Seleccionar todas las de esta página"
                    style={{ cursor: 'pointer', width: 13, height: 13, accentColor: 'var(--brand-600)' }}
                  />
                </th>
                {COLUMNS.map(col => {
                  const active = col.key && sort === col.key
                  const Icon = !col.key ? null : active ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
                  return (
                    <th
                      key={col.label || 'acciones'}
                      style={{ ...TH, textAlign: col.align ?? 'left', cursor: col.key ? 'pointer' : 'default' }}
                      onClick={() => col.key && toggleSort(col.key)}
                      title={col.key ? `Ordenar por ${col.label.toLowerCase()}` : undefined}
                    >
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: active ? 'var(--n-800)' : 'inherit',
                      }}>
                        {col.label}
                        {Icon && <Icon size={12} style={{ opacity: active ? 1 : 0.45 }} />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {loading && Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={`sk${i}`}>
                  {Array.from({ length: COLUMNS.length + 1 }).map((__, j) => (
                    <td key={j} style={{ ...CELL, borderBottom: '1px solid var(--n-100)' }}>
                      <span style={{
                        display: 'block', height: 10, borderRadius: 4,
                        background: 'var(--n-100)',
                        width: j === 1 ? '70%' : j === 2 ? '60%' : '45%',
                      }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && submissions.map(s => {
                const st       = STATUS_STYLE[s.status] ?? STATUS_STYLE['Pendiente']
                const pendiente = s.status === 'Pendiente'
                const checked  = selected.has(s.id)
                return (
                  <tr
                    key={s.id}
                    onClick={() => setOpenId(s.id)}
                    style={{ cursor: 'pointer', background: checked ? 'var(--brand-50)' : 'transparent' }}
                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--n-25)' }}
                    onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td
                      style={{ ...CELL, width: 34, paddingRight: 0, boxShadow: pendiente ? 'inset 3px 0 0 var(--amber-500)' : undefined }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(s.id)}
                        aria-label={`Seleccionar solicitud de ${nombreDe(s)}`}
                        style={{ cursor: 'pointer', width: 13, height: 13, accentColor: 'var(--brand-600)' }}
                      />
                    </td>

                    <td style={{ ...CELL, fontWeight: 600, color: 'var(--n-900)' }} title={s.submitter_email ?? ''}>
                      {nombreDe(s)}
                    </td>

                    <td style={{ ...CELL }} title={`${origenDe(s)} → ${destinoDe(s)}`}>
                      {origenDe(s) || destinoDe(s) ? (
                        <>
                          {formatearCiudad(origenDe(s)) || '—'}
                          <span style={{ color: 'var(--n-500)', margin: '0 5px' }}>→</span>
                          {formatearCiudad(destinoDe(s)) || '—'}
                        </>
                      ) : '—'}
                    </td>

                    <td style={{ ...CELL }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 8px', borderRadius: 6, fontSize: 11.5,
                        background: 'var(--n-100)', color: 'var(--n-600)',
                      }}>
                        {modalidadDe(s) || '—'}
                      </span>
                    </td>

                    <td className="tnum" style={{ ...CELL, textAlign: 'center' }}>
                      {s.answers?.num_pasajeros ?? '—'}
                    </td>

                    <td style={{ ...CELL, color: 'var(--n-600)' }}
                        title={format(new Date(s.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}>
                      {formatDistanceToNow(new Date(s.created_at), { locale: es, addSuffix: true })}
                    </td>

                    <td className="mono" style={{ ...CELL, color: 'var(--n-600)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.answers?.numero_task ?? '—'}
                    </td>

                    <td style={{ ...CELL }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setMenuFor(menuFor?.id === s.id ? null : { id: s.id, x: r.left, y: r.bottom + 4 })
                        }}
                        disabled={savingId === s.id}
                        title="Cambiar estado"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                          fontSize: 11.5, fontWeight: 600,
                        }}
                      >
                        {savingId === s.id
                          ? <Loader2 size={11} className="spin" />
                          : <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />}
                        {s.status}
                      </button>
                    </td>

                    <td style={{ ...CELL, width: 70, paddingLeft: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                          <IconButton
                            icon={FileDown}
                            size={26}
                            title={downloadingId === s.id ? 'Generando PDF…' : 'Descargar PDF'}
                            disabled={downloadingId === s.id}
                            onClick={() => downloadPdf(s)}
                          />
                        </span>
                        <ChevronRight size={14} style={{ color: 'var(--n-400)', flex: '0 0 auto' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!loading && submissions.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ padding: '56px 24px', textAlign: 'center' }}>
                    <Ticket size={34} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-700)' }}>
                      {filtersActive ? 'Sin resultados' : 'No hay solicitudes aún'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginTop: 4 }}>
                      {filtersActive
                        ? 'Prueba con otros filtros o limpia la búsqueda'
                        : 'Copia el enlace del formulario y envíalo a los solicitantes'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          loading={loading}
          onChange={p => patch({ p }, false)}
          onPageSizeChange={filas => patch({ filas })}
        />
      </div>

      {/* Menú de estado */}
      {menuFor && (
        <>
          <div onClick={() => setMenuFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'fixed', left: menuFor.x, top: menuFor.y, zIndex: 31,
            background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8,
            boxShadow: '0 8px 24px -8px rgba(10,14,26,.24)', padding: 4, minWidth: 150,
          }}>
            {SUBMISSION_STATUSES.map(st => {
              const s = submissions.find(x => x.id === menuFor.id)
              const active = s?.status === st
              return (
                <button
                  key={st}
                  onClick={() => s && changeStatus(s, st)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '6px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: active ? 'var(--n-100)' : 'transparent',
                    color: 'var(--n-800)', fontSize: 12.5, fontWeight: active ? 600 : 500,
                    textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_STYLE[st].color }} />
                  {st}
                  {active && <Check size={12} style={{ marginLeft: 'auto', color: 'var(--n-500)' }} />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Panel de detalle */}
      <SolicitudDrawer
        key={openId ?? 'ninguna'}
        submission={openSubmission}
        fields={fields}
        saving={savingId === openId}
        downloading={downloadingId === openId}
        onClose={() => setOpenId(null)}
        onStatusChange={changeStatus}
        onDownloadPdf={downloadPdf}
      />

      {/* Aviso con deshacer */}
      {undo && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 60,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px 10px 14px', borderRadius: 10,
          background: 'var(--n-900)', color: 'var(--n-0)',
          boxShadow: '0 12px 32px -12px rgba(10,14,26,.5)', fontSize: 12.5,
        }}>
          <span>{undo.label}</span>
          <button
            onClick={applyUndo}
            disabled={bulkBusy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--n-0)', fontWeight: 650, fontSize: 12.5, fontFamily: 'inherit',
            }}
          >
            <Undo2 size={13} /> Deshacer
          </button>
          <button
            onClick={() => setUndo(null)}
            title="Cerrar"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--n-400)', display: 'flex' }}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

const TH: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2,
  padding: '9px 12px', textAlign: 'left',
  fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)',
  letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
  background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)',
  userSelect: 'none',
}
