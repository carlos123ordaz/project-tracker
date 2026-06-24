import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, FileDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useFormBySlug } from '../../hooks/useForms'
import type { FormSubmission } from '../../lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const FORM_SLUG = 'solicitud-boleto'

/* ── Design tokens (same as FormPage) ───────────────────────────────────────── */
const T = {
  primary:      '#0f6e62',
  primaryLight: '#e0f0ee',
  text:         '#323130',
  textSub:      '#605e5c',
  textMuted:    '#a19f9d',
  border:       '#c8c6c4',
  divider:      '#edebe9',
  required:     '#a4262c',
}

const TIPO_LABEL: Record<string, string> = {
  aereo: 'Aéreo', terrestre: 'Terrestre', aereo_terrestre: 'Aéreo y Terrestre',
  nacional: 'Nacional', internacional: 'Internacional',
  ida: 'Compra de boleto de Ida',
  regreso: 'Compra de boleto de Regreso',
  ida_regreso: 'Compra de boleto de Ida y Regreso',
  cambio_fecha: 'Cambio de Fecha',
  mochila: 'Considerar solo mochila de mano',
  '10kg': 'Considerar maleta de 10 kg. (cabina)',
  '23kg': 'Considerar maleta de 23 kg. (bodega)',
  '1': '1 Pasajero', '2': '2 Pasajeros', '3': '3 Pasajeros',
  '4': '4 Pasajeros', '5': '5 Pasajeros', '6': '6 Pasajeros',
}

function displayVal(val: string) {
  return TIPO_LABEL[val] ?? val
}

function formatDate(val: string) {
  if (!val) return '—'
  try {
    // dd/mm/yyyy (stored by DatePicker)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split('/')
      return format(new Date(`${y}-${m}-${d}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })
    }
    // ISO fallback
    return format(new Date(val + (val.length === 10 ? 'T12:00:00' : '')), "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch { return val }
}

/* ── Campos agrupados en el FlightWidget ─────────────────────────────────── */
const FLIGHT_TRIGGER  = 'ciudad_salida'
const FLIGHT_CONSUMED = new Set(['ciudad_destino', 'fecha_salida', 'fecha_regreso', 'hora_llegada_destino', 'hora_salida_aeropuerto'])
const isFlightConsumed = (key: string) => FLIGHT_CONSUMED.has(key.trim())
const isFlightTrigger  = (key: string) => key.trim() === FLIGHT_TRIGGER

interface PassengerRow { nombre: string; dni: string; nacimiento: string; celular: string; correo: string }

export default function FormPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { form, fields, loading: formLoading } = useFormBySlug(FORM_SLUG)

  const [submission, setSubmission] = useState<FormSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setSubmission(data as FormSubmission ?? null)
        setLoading(false)
      })
  }, [id])

  async function downloadPdf() {
    if (!submission) return
    setDownloading(true)
    try {
      const res = await fetch(`${API_BASE}/solicitudes/boleto/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id:   submission.id,
          submitter_name:  submission.submitter_name  ?? '',
          submitter_email: submission.submitter_email ?? '',
          fecha_solicitud: submission.created_at,
          answers:         submission.answers ?? {},
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Solicitud_Boleto_${(submission.submitter_name ?? 'sin_nombre').replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setDownloading(false) }
  }

  const isLoading = loading || formLoading

  /* ── Shell ── */
  const shell = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Open Sans', system-ui, sans-serif",
      color: T.text,
      background: '#D5E8E2',
      padding: '32px 16px 80px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit', fontSize: 13, color: T.text,
              background: 'rgba(255,255,255,.7)', border: '1px solid rgba(0,0,0,.1)',
              borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> Volver
          </button>

          {submission && (
            <button
              onClick={downloadPdf}
              disabled={downloading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff',
                background: downloading ? '#3a9e91' : T.primary,
                border: 'none', borderRadius: 7, padding: '6px 16px',
                cursor: downloading ? 'not-allowed' : 'pointer',
              }}
            >
              <FileDown size={14} />
              {downloading ? 'Generando…' : 'Descargar PDF'}
            </button>
          )}
        </div>

        {children}
      </div>
    </div>
  )

  if (isLoading) return shell(
    <Card>
      <div style={{ padding: '60px 0', textAlign: 'center', color: T.textMuted, fontSize: 15 }}>
        Cargando…
      </div>
    </Card>
  )

  if (!submission || !form) return shell(
    <Card>
      <div style={{ padding: '60px 0', textAlign: 'center', fontSize: 15, color: T.textSub }}>
        Solicitud no encontrada.
      </div>
    </Card>
  )

  const answers = submission.answers ?? {}

  function isVisible(f: { conditional_on_key?: string | null; conditional_on_value?: string | null }) {
    if (!f.conditional_on_key) return true
    return answers[f.conditional_on_key] === f.conditional_on_value
  }

  return shell(
    <Card>
      {/* Header */}
      <div style={{ padding: '36px 56px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: '#fff', background: T.primary, borderRadius: 4, padding: '2px 8px',
          }}>
            Vista previa
          </span>
          <span style={{ fontSize: 12, color: T.textMuted }}>Solo lectura</span>
        </div>
        <h1 style={{ fontWeight: 600, fontSize: 26, lineHeight: 1.3, marginBottom: 10 }}>
          {form.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: T.textSub }}>
            <User size={14} />
            <strong style={{ color: T.text }}>{submission.submitter_name}</strong>
            <span>·</span>
            <span>{submission.submitter_email}</span>
          </div>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>
            Enviado el {format(new Date(submission.created_at), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
          </span>
        </div>
      </div>

      {/* Fields */}
      {fields.filter(f => isVisible(f)).filter(f => !isFlightConsumed(f.field_key)).map((field, idx) => {
        const val = answers[field.field_key] ?? ''

        // Ciudad de salida → render bloque de vuelo combinado
        if (isFlightTrigger(field.field_key)) {
          const tipoServicio = answers['tipo_servicio'] ?? ''
          const esCambioFecha = tipoServicio === 'cambio_fecha'
          const esIdaYRegreso = tipoServicio === 'ida_regreso'
          const labelIda = tipoServicio === 'regreso' ? 'REGRESO' : esCambioFecha ? 'NUEVA FECHA' : 'IDA'
          const horaLabel1 = tipoServicio === 'regreso' ? 'Hora máx. salida aeropuerto' : 'Hora máx. llegada al destino'
          return (
            <div key={field.id}>
              <div style={{ height: 1, background: T.divider, margin: '0 56px' }} />
              <div style={{ padding: '24px 56px' }}>
                <p style={{ fontSize: 13.5, color: T.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
                  {idx + 1}. Origen, destino y fechas del vuelo
                </p>
                <div style={{
                  border: '1.5px solid #c8deda', borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(15,110,98,.08)',
                }}>
                  {/* Ciudades */}
                  {!esCambioFecha && (
                    <div style={{ display: 'flex', borderBottom: '1.5px solid #c8deda' }}>
                      <div style={{ flex: 1, padding: '14px 20px', borderRight: '1.5px solid #c8deda' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, letterSpacing: '.08em', marginBottom: 4 }}>ORIGEN</div>
                        <div style={{ fontSize: 15, color: T.text, fontWeight: 500 }}>{answers['ciudad_salida'] || '—'}</div>
                      </div>
                      <div style={{ flex: 1, padding: '14px 20px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, letterSpacing: '.08em', marginBottom: 4 }}>DESTINO</div>
                        <div style={{ fontSize: 15, color: T.text, fontWeight: 500 }}>{answers['ciudad_destino'] || '—'}</div>
                      </div>
                    </div>
                  )}
                  {/* Fechas y horas */}
                  <div style={{ display: 'flex' }}>
                    <div style={{ flex: 1, padding: '14px 20px', borderRight: esIdaYRegreso && answers['fecha_regreso'] ? '1.5px solid #c8deda' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, letterSpacing: '.08em', marginBottom: 4 }}>{labelIda}</div>
                      <div style={{ fontSize: 15, color: T.text }}>{formatDate(answers['fecha_salida'] ?? '')}</div>
                      {answers['hora_llegada_destino'] && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #ddeae8' }}>
                          <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: '.06em', marginBottom: 2 }}>{horaLabel1.toUpperCase()}</div>
                          <div style={{ fontSize: 14, color: T.text }}>{answers['hora_llegada_destino']}</div>
                        </div>
                      )}
                    </div>
                    {esIdaYRegreso && answers['fecha_regreso'] && (
                      <div style={{ flex: 1, padding: '14px 20px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, letterSpacing: '.08em', marginBottom: 4 }}>REGRESO</div>
                        <div style={{ fontSize: 15, color: T.text }}>{formatDate(answers['fecha_regreso'] ?? '')}</div>
                        {answers['hora_salida_aeropuerto'] && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #ddeae8' }}>
                            <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: '.06em', marginBottom: 2 }}>HORA MÁX. SALIDA AEROPUERTO</div>
                            <div style={{ fontSize: 14, color: T.text }}>{answers['hora_salida_aeropuerto']}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        if (!val && field.field_type !== 'passenger_list') return null

        return (
          <div key={field.id}>
            <div style={{ height: 1, background: T.divider, margin: '0 56px' }} />
            <div style={{ padding: '24px 56px' }}>
              <p style={{ fontSize: 13.5, color: T.textMuted, marginBottom: 6, lineHeight: 1.4 }}>
                {idx + 1}. {field.label}
              </p>

              {/* Passenger list */}
              {field.field_type === 'passenger_list' && (() => {
                let pax: PassengerRow[] = []
                try { pax = JSON.parse(val) } catch { return <p style={{ fontSize: 15, color: T.text }}>—</p> }
                if (!pax.length) return <p style={{ fontSize: 15, color: T.text }}>—</p>
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pax.map((p, i) => (
                      <div key={i} style={{
                        borderLeft: `3px solid ${T.primary}`, paddingLeft: 16,
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px',
                      }}>
                        <div style={{ gridColumn: '1 / -1', fontSize: 12.5, fontWeight: 700, color: T.primary, marginBottom: 4 }}>
                          Pasajero {i + 1}
                        </div>
                        {[
                          { label: 'Nombre',     value: p.nombre    },
                          { label: 'DNI',        value: p.dni       },
                          { label: 'Nacimiento', value: p.nacimiento ? formatDate(p.nacimiento) : '' },
                          { label: 'Celular',    value: p.celular   },
                          { label: 'Correo',     value: p.correo    },
                        ].filter(f => f.value).map(f => (
                          <div key={f.label}>
                            <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</div>
                            <div style={{ fontSize: 14, color: T.text, marginTop: 2 }}>{f.value}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Radio / checkbox — show ALL options, highlight selected */}
              {(field.field_type === 'radio' || field.field_type === 'checkbox') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {field.options.map(opt => {
                    const selected = val.split(',').includes(opt.value)
                    const isRadio  = field.field_type === 'radio'
                    return (
                      <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 2px' }}>
                        <span style={{
                          width: 20, height: 20, flexShrink: 0,
                          borderRadius: isRadio ? '50%' : 3,
                          border: `1.5px solid ${selected ? T.primary : T.border}`,
                          background: selected ? (isRadio ? '#fff' : T.primary) : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && isRadio && (
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.primary }} />
                          )}
                          {selected && !isRadio && (
                            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>
                          )}
                        </span>
                        <span style={{ fontSize: 15, color: selected ? T.text : T.textMuted, fontWeight: selected ? 600 : 400 }}>
                          {opt.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Date */}
              {field.field_type === 'date' && (
                <p style={{ fontSize: 16, color: T.text, margin: 0 }}>{formatDate(val) || '—'}</p>
              )}

              {/* Text / textarea / time */}
              {(field.field_type === 'text' || field.field_type === 'textarea' || field.field_type === 'time') && (
                <p style={{ fontSize: 16, color: T.text, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {displayVal(val) || '—'}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ height: 1, background: T.divider, margin: '0 56px' }} />
      <div style={{ padding: '20px 56px 36px' }}>
        <p style={{ fontSize: 12.5, color: T.textMuted }}>
          Este es un resumen de las respuestas enviadas. No se puede editar.
        </p>
      </div>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#F2F8F8', borderRadius: 8,
      boxShadow: '0 1.6px 3.6px rgba(0,0,0,.08), 0 6.4px 14.4px rgba(0,0,0,.1)',
      overflow: 'hidden',
    }}>
      <div style={{ height: 10, background: T.primary }} />
      {children}
    </div>
  )
}
