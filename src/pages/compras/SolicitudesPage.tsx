import { useState } from 'react'
import {
  Ticket, Search, Copy, Check,
  Clock, CheckCircle2, XCircle, Loader2, FileDown,
  ChevronLeft, ChevronRight, LayoutDashboard,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
import { useFormSubmissions, PAGE_SIZE } from '../../hooks/useForms'
import type { FormSubmission, SubmissionStatus } from '../../lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FORM_SLUG = 'solicitud-boleto'

const STATUS_OPTIONS: SubmissionStatus[] = ['Pendiente', 'En proceso', 'Completado', 'Cancelado']

const STATUS_STYLE: Record<SubmissionStatus, { bg: string; color: string; icon: React.ReactNode }> = {
  Pendiente:   { bg: 'var(--amber-50)',  color: 'var(--amber-700)',  icon: <Clock size={11} /> },
  'En proceso':{ bg: 'var(--blue-50)',   color: 'var(--blue-700)',   icon: <Loader2 size={11} /> },
  Completado:  { bg: 'var(--green-50)',  color: 'var(--green-700)',  icon: <CheckCircle2 size={11} /> },
  Cancelado:   { bg: 'var(--n-100)',     color: 'var(--n-500)',      icon: <XCircle size={11} /> },
}


const TIPO_LABEL: Record<string, string> = {
  aereo: 'Aéreo', terrestre: 'Terrestre',
  nacional: 'Nacional', internacional: 'Internacional',
  ida: 'Ida', regreso: 'Regreso', ida_regreso: 'Ida y regreso', cambio_fecha: 'Cambio de fecha',
  mochila: 'Mochila de mano', '10kg': 'Maleta 10 kg', '23kg': 'Maleta 23 kg',
}

function displayValue(_key: string, val: string) {
  return TIPO_LABEL[val] ?? val
}

export default function SolicitudesPage() {
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | 'Todos'>('Todos')
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [copied,       setCopied]       = useState(false)
  const [updatingId,   setUpdatingId]   = useState<string | null>(null)
  const [downloadingId,setDownloadingId]= useState<string | null>(null)

  const navigate = useNavigate()

  const { submissions, total, loading, updateStatus } = useFormSubmissions(FORM_SLUG, {
    status: filterStatus,
    page,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Client-side text search within current page
  const filtered = submissions.filter(s => {
    const q = search.toLowerCase()
    return !q ||
      (s.submitter_name  ?? '').toLowerCase().includes(q) ||
      (s.submitter_email ?? '').toLowerCase().includes(q) ||
      (s.answers?.ciudad_destino ?? '').toLowerCase().includes(q) ||
      (s.answers?.numero_task    ?? '').toLowerCase().includes(q)
  })

  function changeStatus(newStatus: SubmissionStatus | 'Todos') {
    setFilterStatus(newStatus)
    setPage(1)
  }

  async function handleStatusChange(id: string, status: SubmissionStatus) {
    setUpdatingId(id)
    try { await updateStatus(id, status) } finally { setUpdatingId(null) }
  }

  async function downloadPdf(s: FormSubmission) {
    setDownloadingId(s.id)
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
      a.download = `Solicitud_Boleto_${(s.submitter_name ?? 'sin_nombre').replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al generar el PDF: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setDownloadingId(null) }
  }

  const formUrl = `${window.location.origin}/forms/${FORM_SLUG}`

  function copyLink() {
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pageStart = (page - 1) * PAGE_SIZE + 1
  const pageEnd   = Math.min(page * PAGE_SIZE, total)

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            Solicitudes de Boletos
          </h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', margin: '2px 0 0' }}>
            Listado de solicitudes de compra de boletos recibidas
          </p>
        </div>
        <Link
          to="/compras/solicitudes/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7,
            background: 'var(--n-100)', color: 'var(--n-700)',
            border: '1px solid var(--n-200)', fontSize: 12.5, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <LayoutDashboard size={13} /> Dashboard
        </Link>
        <button
          onClick={copyLink}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7,
            background: copied ? 'var(--green-600)' : 'var(--brand-600)',
            color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', transition: 'background .2s',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{
        display: 'flex', gap: 1, marginBottom: 14,
        background: 'var(--n-150)', borderRadius: 10, overflow: 'hidden',
      }}>
        {(['Todos', ...STATUS_OPTIONS] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            style={{
              flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer',
              background: filterStatus === s ? '#fff' : 'transparent',
              textAlign: 'center',
              borderRight: i < STATUS_OPTIONS.length ? '1px solid var(--n-150)' : 'none',
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, lineHeight: 1,
              color: s === 'Todos' ? 'var(--n-700)' : STATUS_STYLE[s as SubmissionStatus]?.color ?? 'var(--n-700)',
            }}>
              {filterStatus === s ? total : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 2 }}>{s}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 340, marginBottom: 14 }}>
        <Search size={13} style={{
          position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--n-400)',
        }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, destino, task…"
          style={{
            width: '100%', paddingLeft: 30, paddingRight: 10, height: 30,
            border: '1px solid var(--n-200)', borderRadius: 7,
            fontSize: 12, color: 'var(--n-800)', background: '#fff',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
          Cargando…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '56px 24px', textAlign: 'center',
          background: '#fff', border: '1px solid var(--n-150)', borderRadius: 12,
        }}>
          <Ticket size={36} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-600)' }}>
            {search ? 'Sin resultados' : 'No hay solicitudes aún'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginTop: 4 }}>
            {search ? 'Prueba con otros filtros' : 'Copia el enlace del formulario y envíalo a los solicitantes'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
                  {['#', 'Solicitante', 'Fecha', 'Tipo', 'Destino', 'Pasajeros', 'Task', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--n-500)',
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const st = STATUS_STYLE[s.status] ?? STATUS_STYLE['Pendiente']
                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/compras/solicitudes/${s.id}/preview`)}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--n-100)' : 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--n-400)', fontWeight: 500 }}>
                        {pageStart + idx}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>
                          {s.submitter_name ?? '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--n-400)' }}>
                          {s.submitter_email ?? ''}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
                        {format(new Date(s.created_at), "d MMM yyyy", { locale: es })}
                        <div style={{ fontSize: 10.5, color: 'var(--n-400)' }}>
                          {format(new Date(s.created_at), "HH:mm")}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-700)' }}>
                        <div>{displayValue('tipo_boleto', s.answers?.tipo_boleto ?? '')}</div>
                        <div style={{ fontSize: 11, color: 'var(--n-400)' }}>
                          {displayValue('destino_vuelo', s.answers?.destino_vuelo ?? '')}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-700)' }}>
                        <div>{s.answers?.ciudad_salida ?? '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--n-400)' }}>→ {s.answers?.ciudad_destino ?? '—'}</div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--n-700)', textAlign: 'center' }}>
                        {s.answers?.num_pasajeros ?? '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--n-600)', maxWidth: 120 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.answers?.numero_task ?? '—'}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                        <select
                          value={s.status}
                          disabled={updatingId === s.id}
                          onChange={e => handleStatusChange(s.id, e.target.value as SubmissionStatus)}
                          style={{
                            padding: '3px 6px', borderRadius: 20, border: 'none',
                            background: st.bg, color: st.color,
                            fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => downloadPdf(s)}
                          disabled={downloadingId === s.id}
                          title="Descargar PDF"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid var(--n-200)', background: '#fff',
                            cursor: downloadingId === s.id ? 'not-allowed' : 'pointer',
                            color: 'var(--n-700)', fontSize: 12,
                            opacity: downloadingId === s.id ? 0.6 : 1,
                          }}
                        >
                          <FileDown size={13} />
                          {downloadingId === s.id ? 'Generando…' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 12, padding: '0 2px',
          }}>
            <span style={{ fontSize: 12, color: 'var(--n-500)' }}>
              {total === 0 ? '0' : `${pageStart}–${pageEnd}`} de {total} solicitudes
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 7,
                  border: '1px solid var(--n-200)', background: '#fff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? 'var(--n-300)' : 'var(--n-700)',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} style={{ fontSize: 12, color: 'var(--n-400)', padding: '0 2px' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      style={{
                        width: 28, height: 28, borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                        border: page === p ? 'none' : '1px solid var(--n-200)',
                        background: page === p ? 'var(--brand-600)' : '#fff',
                        color: page === p ? '#fff' : 'var(--n-700)',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 7,
                  border: '1px solid var(--n-200)', background: '#fff',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  color: page === totalPages ? 'var(--n-300)' : 'var(--n-700)',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
