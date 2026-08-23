import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, FileDown, ExternalLink, Mail, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { FormField, FormSubmission, SubmissionStatus } from '../../lib/types'
import { SUBMISSION_STATUSES } from '../../lib/types'
import { STATUS_STYLE, labelFor, nombreDe, rutaDe } from '../../lib/solicitudBoleto'
import { Button, IconButton } from '../ui/Button'

interface Props {
  submission: FormSubmission | null
  fields: FormField[]
  saving: boolean
  downloading: boolean
  onClose: () => void
  onStatusChange: (s: FormSubmission, status: SubmissionStatus) => void
  onDownloadPdf: (s: FormSubmission) => void
}

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--n-500)',
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block',
}

/** Las fechas del formulario llegan como dd/mm/yyyy; el resto como ISO. */
function fmtAnswerDate(val: string) {
  try {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split('/')
      return format(new Date(`${y}-${m}-${d}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return format(new Date(`${val}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })
    }
  } catch { /* se muestra el valor crudo */ }
  return val
}

interface PassengerRow { nombre?: string; dni?: string; nacimiento?: string; celular?: string; correo?: string }

function parsePassengers(raw: string): PassengerRow[] | null {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as PassengerRow[] : null
  } catch { return null }
}

export default function SolicitudDrawer({
  submission, fields, saving, downloading, onClose, onStatusChange, onDownloadPdf,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!submission) return
    const t = setTimeout(() => setVisible(true), 16)
    return () => clearTimeout(t)
  }, [submission])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  if (!submission) return null

  const answers = submission.answers ?? {}
  const st = STATUS_STYLE[submission.status] ?? STATUS_STYLE['Pendiente']

  const isVisible = (f: FormField) =>
    !f.conditional_on_key || answers[f.conditional_on_key] === f.conditional_on_value

  // Sólo los campos respondidos, en el orden del formulario
  const answered = fields
    .filter(isVisible)
    .filter(f => (answers[f.field_key] ?? '').toString().trim() !== '')

  const passengerField = answered.find(f => f.field_type === 'passenger_list')
  const passengers     = passengerField ? parsePassengers(answers[passengerField.field_key]) : null
  const dataFields     = answered.filter(f => f.field_type !== 'passenger_list')

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(10,14,26,0.25)', backdropFilter: 'blur(1px)',
          opacity: visible ? 1 : 0, transition: 'opacity .22s',
        }}
      />

      <aside
        role="dialog"
        aria-label={`Solicitud de ${nombreDe(submission)}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, maxWidth: '100vw', zIndex: 41,
          background: 'var(--n-0)', borderLeft: '1px solid var(--n-200)',
          boxShadow: '-8px 0 32px -8px rgba(10,14,26,0.18)',
          display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Cabecera */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--n-150)', flex: '0 0 auto',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--n-900)', letterSpacing: '-0.01em' }}>
              {nombreDe(submission)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 2 }}>
              {rutaDe(submission)}
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 9px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
            background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
            {submission.status}
          </span>
          <IconButton icon={X} size={28} title="Cerrar" onClick={handleClose} />
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--n-600)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Mail size={13} style={{ color: 'var(--n-500)' }} />
              {submission.submitter_email ?? '—'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={13} style={{ color: 'var(--n-500)' }} />
              Recibida el {format(new Date(submission.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </span>
          </div>

          {/* Cambio de estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={LABEL}>Estado</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUBMISSION_STATUSES.map(opt => {
                const active = submission.status === opt
                const s = STATUS_STYLE[opt]
                return (
                  <button
                    key={opt}
                    onClick={() => !active && onStatusChange(submission, opt)}
                    disabled={saving}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 11px', borderRadius: 6, fontSize: 12.5, fontWeight: 550,
                      cursor: active || saving ? 'default' : 'pointer',
                      background: active ? s.bg : 'var(--n-50)',
                      color: active ? s.color : 'var(--n-600)',
                      border: `1px solid ${active ? s.border : 'var(--n-200)'}`,
                      opacity: saving && !active ? 0.6 : 1,
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: 999,
                      background: active ? 'currentColor' : 'var(--n-300)',
                    }} />
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Resumen de la solicitud */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={LABEL}>Solicitud</span>
            <dl style={{
              display: 'grid', gridTemplateColumns: 'minmax(120px, 40%) 1fr',
              gap: '1px', margin: 0,
              border: '1px solid var(--n-150)', borderRadius: 8, overflow: 'hidden',
              background: 'var(--n-150)',
            }}>
              {dataFields.map(f => {
                const raw = answers[f.field_key]
                const value = f.field_type === 'date' ? fmtAnswerDate(raw) : labelFor(raw)
                return (
                  <div key={f.id} style={{ display: 'contents' }}>
                    <dt style={{
                      background: 'var(--n-25)', padding: '7px 10px',
                      fontSize: 12, color: 'var(--n-600)',
                    }}>
                      {f.label}
                    </dt>
                    <dd style={{
                      background: 'var(--n-0)', padding: '7px 10px', margin: 0,
                      fontSize: 12.5, color: 'var(--n-900)', fontWeight: 500, wordBreak: 'break-word',
                    }}>
                      {value}
                    </dd>
                  </div>
                )
              })}
              {dataFields.length === 0 && (
                <div style={{ gridColumn: '1 / -1', background: 'var(--n-0)', padding: '10px', fontSize: 12.5, color: 'var(--n-500)' }}>
                  Esta solicitud no tiene respuestas registradas.
                </div>
              )}
            </dl>
          </div>

          {/* Pasajeros */}
          {passengers && passengers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={LABEL}>{passengerField?.label ?? 'Pasajeros'}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {passengers.map((p, i) => (
                  <div key={i} style={{
                    border: '1px solid var(--n-150)', borderRadius: 8, padding: '8px 10px',
                    background: 'var(--n-25)', fontSize: 12.5, color: 'var(--n-800)',
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--n-900)' }}>{p.nombre || `Pasajero ${i + 1}`}</div>
                    <div style={{ color: 'var(--n-600)', marginTop: 2 }}>
                      {[p.dni && `DNI ${p.dni}`, p.celular, p.correo].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={{
          flex: '0 0 auto', display: 'flex', gap: 8, alignItems: 'center',
          padding: '12px 16px', borderTop: '1px solid var(--n-150)', background: 'var(--n-25)',
        }}>
          <Button
            variant="primary"
            icon={FileDown}
            disabled={downloading}
            onClick={() => onDownloadPdf(submission)}
          >
            {downloading ? 'Generando…' : 'Descargar PDF'}
          </Button>
          <Link
            to={`/compras/solicitudes/${submission.id}/preview`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
              fontSize: 12.5, fontWeight: 550, color: 'var(--n-600)', textDecoration: 'none',
            }}
          >
            Ver formulario original <ExternalLink size={13} />
          </Link>
        </div>
      </aside>
    </>
  )
}
