import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react'
import { useFormBySlug } from '../../hooks/useForms'
import { useMicrosoftAuth } from '../../hooks/useMicrosoftAuth'
import type { FormField } from '../../lib/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/* ── Design tokens ────────────────────────────────────────────────────────── */
const T = {
  primary:     '#0f6e62',
  primaryHov:  '#0c5a50',
  primaryLight:'#e0f0ee',
  text:        '#323130',
  textSub:     '#605e5c',
  textMuted:   '#a19f9d',
  border:      '#c8c6c4',
  borderSel:   '#8a8886',
  required:    '#a4262c',
  divider:     '#edebe9',
}

/* ── Passenger shape ──────────────────────────────────────────────────────── */
interface PassengerRow { nombre: string; dni: string; nacimiento: string; celular: string; correo: string }
const EMPTY_PAX: PassengerRow = { nombre: '', dni: '', nacimiento: '', celular: '', correo: '' }
function parsePax(raw: string): PassengerRow[] { try { return JSON.parse(raw) } catch { return [] } }
function numPaxFromAnswer(val: string): number {
  const n = parseInt(val, 10)
  return isNaN(n) || n < 1 ? 1 : Math.min(n, 6)
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/* ── Ciudades para autocomplete ───────────────────────────────────────────── */
interface CityOption { city: string; code: string; country: string }
const ALL_CITIES: CityOption[] = [
  { city: 'Lima',              code: 'LIM', country: 'Perú' },
  { city: 'Cusco',             code: 'CUZ', country: 'Perú' },
  { city: 'Arequipa',          code: 'AQP', country: 'Perú' },
  { city: 'Trujillo',          code: 'TRU', country: 'Perú' },
  { city: 'Piura',             code: 'PIU', country: 'Perú' },
  { city: 'Iquitos',           code: 'IQT', country: 'Perú' },
  { city: 'Chiclayo',          code: 'CIX', country: 'Perú' },
  { city: 'Pucallpa',          code: 'PCL', country: 'Perú' },
  { city: 'Juliaca',           code: 'JUL', country: 'Perú' },
  { city: 'Tacna',             code: 'TCQ', country: 'Perú' },
  { city: 'Tarapoto',          code: 'TPP', country: 'Perú' },
  { city: 'Huánuco',           code: 'HUU', country: 'Perú' },
  { city: 'Ayacucho',          code: 'AYP', country: 'Perú' },
  { city: 'Cajamarca',         code: 'CJA', country: 'Perú' },
  { city: 'Tumbes',            code: 'TBP', country: 'Perú' },
  { city: 'Puerto Maldonado',  code: 'PEM', country: 'Perú' },
  { city: 'Chachapoyas',       code: 'CHH', country: 'Perú' },
  { city: 'Andahuaylas',       code: 'ANS', country: 'Perú' },
  { city: 'Bogotá',            code: 'BOG', country: 'Colombia' },
  { city: 'Medellín',          code: 'MDE', country: 'Colombia' },
  { city: 'Santiago',          code: 'SCL', country: 'Chile' },
  { city: 'Buenos Aires',      code: 'EZE', country: 'Argentina' },
  { city: 'São Paulo',         code: 'GRU', country: 'Brasil' },
  { city: 'Quito',             code: 'UIO', country: 'Ecuador' },
  { city: 'Guayaquil',         code: 'GYE', country: 'Ecuador' },
  { city: 'La Paz',            code: 'LPB', country: 'Bolivia' },
  { city: 'Caracas',           code: 'CCS', country: 'Venezuela' },
  { city: 'Ciudad de México',  code: 'MEX', country: 'México' },
  { city: 'Panamá',            code: 'PTY', country: 'Panamá' },
  { city: 'Miami',             code: 'MIA', country: 'EE. UU.' },
  { city: 'Nueva York',        code: 'JFK', country: 'EE. UU.' },
  { city: 'Los Ángeles',       code: 'LAX', country: 'EE. UU.' },
  { city: 'Houston',           code: 'IAH', country: 'EE. UU.' },
  { city: 'Madrid',            code: 'MAD', country: 'España' },
  { city: 'Londres',           code: 'LHR', country: 'Reino Unido' },
  { city: 'París',             code: 'CDG', country: 'Francia' },
  { city: 'Dubai',             code: 'DXB', country: 'EAU' },
]

/* Claves de campos que el FlightWidget consume (no se renderizan individualmente) */
const FLIGHT_TRIGGER  = 'ciudad_salida'
const FLIGHT_CONSUMED = new Set(['ciudad_destino', 'fecha_salida', 'fecha_regreso'])

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function FormPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { form, fields, loading, notFound } = useFormBySlug(slug)
  const { msUser, loading: authLoading, error: authError, signIn, signOut } = useMicrosoftAuth()

  const [answers,     setAnswers]     = useState<Record<string, string>>({})
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const id = 'open-sans-font'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id; link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  function setAnswer(key: string, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function isVisible(f: FormField) {
    if (!f.conditional_on_key) return true
    return answers[f.conditional_on_key] === f.conditional_on_value
  }

  function validate() {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (!isVisible(f)) continue
      if (f.field_type === 'passenger_list') {
        const count = numPaxFromAnswer(answers['num_pasajeros'] ?? '1')
        const rows  = parsePax(answers[f.field_key] ?? '')
        const bad   = Array.from({ length: count }, (_, i) => rows[i] ?? EMPTY_PAX)
          .some(r => !r.nombre.trim() || !r.dni.trim())
        if (bad) errs[f.field_key] = 'Completa nombre y DNI de cada pasajero'
        continue
      }
      if (f.required && !answers[f.field_key]?.trim())
        errs[f.field_key] = 'Este campo es obligatorio'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) {
      const firstKey = fields.find(f => errors[f.field_key])?.field_key
      if (firstKey) document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true); setSubmitError('')
    try {
      const res = await fetch(`${API_BASE}/forms/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id:         form!.id,
          submitter_name:  msUser!.name,
          submitter_email: msUser!.email,
          answers,
          status: 'Pendiente',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? `Error ${res.status}`)
      }
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al enviar')
    } finally { setSubmitting(false) }
  }

  /* ── page shell ── */
  const shell = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Open Sans', system-ui, sans-serif",
      color: T.text,
      background: '#D5E8E2',
      position: 'relative',
      padding: '40px 16px 90px',
      overflow: 'hidden',
    }}>
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{
        position: 'absolute', left: 0, bottom: 0, width: '100%', height: 340,
        pointerEvents: 'none', opacity: 0.55,
      }}>
        <path fill="none" stroke="#a9cdc3" strokeWidth="2" d="M0,220 C260,300 520,140 760,200 C1000,260 1200,160 1440,210" />
        <path fill="none" stroke="#b8d6cd" strokeWidth="2" d="M0,260 C280,200 540,300 800,250 C1060,200 1240,280 1440,240" />
        <path fill="none" stroke="#c4ddd5" strokeWidth="2" d="M0,170 C300,250 560,110 820,170 C1080,230 1260,150 1440,190" />
      </svg>
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>{children}</div>
    </div>
  )

  if (authLoading || loading) return shell(
    <FormCard>
      <div style={{ padding: '60px 0', textAlign: 'center', color: T.textMuted, fontSize: 15 }}>Cargando formulario…</div>
    </FormCard>
  )

  if (!msUser) return shell(
    <FormCard>
      <div style={{ padding: '64px 48px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: T.primaryLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <LogIn size={26} style={{ color: T.primary }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: T.text }}>
          Iniciar sesión
        </div>
        <div style={{ fontSize: 15, color: T.textSub, lineHeight: 1.6, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
          Para completar este formulario debes iniciar sesión con tu cuenta de Microsoft corporativa.
        </div>
        {authError && (
          <div style={{ fontSize: 13.5, color: T.required, marginBottom: 16 }}>{authError}</div>
        )}
        <button
          onClick={signIn}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: 'inherit', fontWeight: 600, fontSize: 15, color: '#fff',
            background: T.primary, border: 'none', padding: '11px 30px',
            borderRadius: 4, cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.primaryHov }}
          onMouseLeave={e => { e.currentTarget.style.background = T.primary }}
        >
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Continuar con Microsoft
        </button>
      </div>
    </FormCard>
  )

  if (notFound || !form) return shell(
    <FormCard>
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: '#d9534f', marginBottom: 12 }} />
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Formulario no encontrado</div>
        <div style={{ fontSize: 14, color: T.textSub }}>El enlace puede haber expirado o no ser válido.</div>
      </div>
    </FormCard>
  )

  if (submitted) return shell(
    <FormCard>
      <div style={{ padding: '64px 0', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: T.primaryLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={32} style={{ color: T.primary }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>¡Solicitud enviada!</div>
        <div style={{ fontSize: 15, color: T.textSub, lineHeight: 1.6 }}>
          Tu solicitud ha sido registrada.<br />El equipo de compras se pondrá en contacto contigo.
        </div>
      </div>
    </FormCard>
  )

  const visibleFields = fields.filter(f => isVisible(f))

  // Numeración de preguntas excluyendo los campos consumidos por FlightWidget
  const questionFields = visibleFields.filter(f => !FLIGHT_CONSUMED.has(f.field_key))
  const qNum = (key: string) => (questionFields.findIndex(f => f.field_key === key) + 1) || 0
  const showRegreso = visibleFields.some(f => f.field_key === 'fecha_regreso')

  return shell(
    <FormCard>
      {/* ── Form header ── */}
      <div style={{ padding: '36px 56px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
          <h1 style={{ fontWeight: 600, fontSize: 28, lineHeight: 1.3, margin: 0 }}>
            {form.name}
          </h1>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              fontFamily: 'inherit', fontSize: 13, color: T.textSub,
              background: 'none', border: `1px solid ${T.border}`,
              borderRadius: 4, padding: '5px 10px', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.text }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textSub }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: T.textSub, marginBottom: 10 }}>
          Hola, <strong>{msUser.name}</strong> ({msUser.email}). Cuando envíe este formulario,
          el propietario verá su nombre y dirección de correo electrónico.
        </p>
        <p style={{ fontSize: 14, color: T.required }}>* Obligatorio</p>
      </div>

      {/* ── Questions — single flow, separated by dividers ── */}
      {visibleFields.map((field) => {
        // Campos consumidos dentro del FlightWidget — no renderizar solos
        if (FLIGHT_CONSUMED.has(field.field_key)) return null

        // Ciudad de salida dispara el widget de vuelo completo
        if (field.field_key === FLIGHT_TRIGGER) {
          return (
            <div key={field.id} id="field-ciudad_salida">
              <div style={{ height: 1, background: T.divider, margin: '0 56px' }} />
              <div style={{ padding: '28px 56px' }}>
                <p style={{ fontSize: 17, color: T.text, marginBottom: 22, lineHeight: 1.45 }}>
                  {qNum(FLIGHT_TRIGGER)}. Origen, destino y fechas del vuelo
                  <span style={{ color: T.required, marginLeft: 4 }}>*</span>
                </p>
                <FlightWidget
                  salida={answers['ciudad_salida'] ?? ''}
                  destino={answers['ciudad_destino'] ?? ''}
                  fechaSalida={answers['fecha_salida'] ?? ''}
                  fechaRegreso={answers['fecha_regreso'] ?? ''}
                  showRegreso={showRegreso}
                  onSalidaChange={v => setAnswer('ciudad_salida', v)}
                  onDestinoChange={v => setAnswer('ciudad_destino', v)}
                  onFechaSalidaChange={v => setAnswer('fecha_salida', v)}
                  onFechaRegresoChange={v => setAnswer('fecha_regreso', v)}
                  errorSalida={errors['ciudad_salida']}
                  errorDestino={errors['ciudad_destino']}
                  errorFechaSalida={errors['fecha_salida']}
                  errorFechaRegreso={errors['fecha_regreso']}
                />
              </div>
            </div>
          )
        }

        // Renderizado normal para el resto de campos
        const n = qNum(field.field_key)
        return (
          <div key={field.id} id={`field-${field.field_key}`}>
            <div style={{ height: 1, background: T.divider, margin: '0 56px' }} />
            <div style={{ padding: '28px 56px' }}>
              <p style={{ fontSize: 17, color: T.text, marginBottom: field.help_text ? 8 : 22, lineHeight: 1.45 }}>
                {n}. {field.label}
                {field.required && <span style={{ color: T.required, marginLeft: 4 }}>*</span>}
              </p>
              {field.help_text && (
                <p style={{ fontSize: 14, color: T.textSub, marginBottom: 18, lineHeight: 1.5 }}>
                  {field.help_text}
                </p>
              )}
              <FieldRenderer
                field={field}
                value={answers[field.field_key] ?? ''}
                onChange={v => setAnswer(field.field_key, v)}
                error={errors[field.field_key]}
                answers={answers}
              />
            </div>
          </div>
        )
      })}

      {/* ── Submit ── */}
      <div style={{ height: 1, background: T.divider, margin: '0 56px' }} />
      <div style={{ padding: '24px 56px 44px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              fontFamily: 'inherit', fontWeight: 600, fontSize: 15, color: '#fff',
              background: submitting ? '#3a9e91' : T.primary,
              border: 'none', padding: '10px 32px', borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = T.primaryHov }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = T.primary }}
          >
            {submitting ? 'Enviando…' : 'Enviar'}
          </button>
          <button
            onClick={() => { setAnswers({}); setErrors({}) }}
            style={{
              fontFamily: 'inherit', fontSize: 14, color: T.primary,
              background: 'none', border: 'none', cursor: 'pointer',
              textDecoration: 'underline', padding: 0,
            }}
          >
            Borrar formulario
          </button>
        </div>
        {submitError && (
          <div style={{
            padding: '10px 14px', background: '#fde8e8',
            border: '1px solid #f5b7b7', borderRadius: 4,
            fontSize: 13.5, color: T.required, marginBottom: 10,
          }}>
            {submitError}
          </div>
        )}
        <p style={{ fontSize: 13, color: T.textMuted }}>
          Nunca proporciones contraseñas en los formularios.
        </p>
      </div>
    </FormCard>
  )
}

/* ── Single white card ─────────────────────────────────────────────────────── */
function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#F2F8F8', borderRadius: 8,
      boxShadow: '0 1.6px 3.6px rgba(0,0,0,.08), 0 6.4px 14.4px rgba(0,0,0,.1)',
      overflow: 'hidden',
    }}>
      {/* Teal top bar */}
      <div style={{ height: 10, background: T.primary }} />
      {children}
    </div>
  )
}

/* ── Shared underline input style ─────────────────────────────────────────── */
function ulStyle(error?: string): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box', fontSize: 15, color: T.text,
    background: '#fff', border: 'none',
    borderBottom: `1px solid ${error ? T.required : 'transparent'}`,
    padding: '10px 12px', outline: 'none',
    fontFamily: "'Open Sans', system-ui, sans-serif",
  }
}

/* ── Field renderer ──────────────────────────────────────────────────────── */
function FieldRenderer({
  field, value, onChange, error, answers,
}: {
  field: FormField; value: string; onChange: (v: string) => void
  error?: string; answers: Record<string, string>
}) {
  return (
    <div>
      {field.field_type === 'radio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options.map(opt => {
            const on = value === opt.value
            return (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                padding: '6px 2px',
              }}>
                <span style={{
                  width: 20, height: 20, flexShrink: 0, borderRadius: '50%',
                  border: `1.5px solid ${on ? T.primary : T.borderSel}`,
                  background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.primary }} />}
                </span>
                <input type="radio" name={field.field_key} value={opt.value}
                  checked={on} onChange={() => onChange(opt.value)} style={{ display: 'none' }} />
                <span style={{ fontSize: 15, color: T.text, lineHeight: 1.4 }}>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}

      {field.field_type === 'checkbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options.map(opt => {
            const selected = (value || '').split(',').filter(Boolean)
            const on = selected.includes(opt.value)
            return (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                padding: '6px 2px',
              }}>
                <span style={{
                  width: 20, height: 20, flexShrink: 0, borderRadius: 3,
                  border: `1.5px solid ${on ? T.primary : T.borderSel}`,
                  background: on ? T.primary : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </span>
                <input type="checkbox" checked={on} onChange={() => {
                  const next = on ? selected.filter(v => v !== opt.value) : [...selected, opt.value]
                  onChange(next.join(','))
                }} style={{ display: 'none' }} />
                <span style={{ fontSize: 15, color: T.text, lineHeight: 1.4 }}>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}

      {(field.field_type === 'text' || field.field_type === 'time') && (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? 'Escriba su respuesta'}
          style={ulStyle(error)}
          onFocus={e => { e.currentTarget.style.borderBottomColor = T.primary }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = error ? T.required : 'transparent' }}
        />
      )}

      {field.field_type === 'date' && (
        <DatePicker value={value} onChange={onChange} error={error} />
      )}

      {field.field_type === 'textarea' && (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? 'Escriba su respuesta'} rows={3}
          style={{ ...ulStyle(error), resize: 'vertical', lineHeight: 1.5 }}
          onFocus={e => { e.currentTarget.style.borderBottomColor = T.primary }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = error ? T.required : 'transparent' }}
        />
      )}

      {field.field_type === 'passenger_list' && (
        <PassengerListField
          value={value} onChange={onChange}
          count={numPaxFromAnswer(answers['num_pasajeros'] ?? '1')}
          error={error}
        />
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 13, color: T.required }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </div>
  )
}

/* ── Custom Date Picker ──────────────────────────────────────────────────── */
function DatePicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [open,      setOpen]      = useState(false)
  const [yearMode,  setYearMode]  = useState(false)   // true = grid de años
  const [inputText, setInputText] = useState('')       // texto libre dd/mm/yyyy
  const ref = useRef<HTMLDivElement>(null)

  const parsed = value ? new Date(value + 'T12:00:00') : null
  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear()  ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()     ?? new Date().getMonth())

  // Sincronizar inputText con value externo
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00')
      setInputText(
        `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
      )
    } else {
      setInputText('')
    }
  }, [value])

  // Cerrar al click fuera
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setYearMode(false)
      }
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function toIso(y: number, m: number, d: number) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  function select(day: number) {
    onChange(toIso(viewYear, viewMonth + 1, day))
    setOpen(false); setYearMode(false)
  }

  // Escribir fecha manualmente
  function handleTextChange(raw: string) {
    // Solo dígitos y slash
    let v = raw.replace(/[^\d/]/g, '')
    // Auto-insertar slashes
    if (v.length === 2 && inputText.length === 1) v = v + '/'
    if (v.length === 5 && inputText.length === 4) v = v + '/'
    if (v.length > 10) return
    setInputText(v)

    // Validar fecha completa dd/mm/yyyy
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m) {
      const [, dd, mm, yyyy] = m.map(Number)
      const date = new Date(yyyy, mm - 1, dd)
      if (date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd) {
        onChange(toIso(yyyy, mm, dd))
        setViewYear(yyyy); setViewMonth(mm - 1)
      }
    } else if (v === '') {
      onChange('')
    }
  }

  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
  function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }

  const days   = daysInMonth(viewYear, viewMonth)
  const offset = firstDayOfMonth(viewYear, viewMonth)
  const selDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
    ? parsed.getDate() : null
  const today  = new Date()

  // Grid de años: 12 años centrados en viewYear
  const yearStart = Math.floor(viewYear / 12) * 12
  const yearGrid  = Array.from({ length: 12 }, (_, i) => yearStart + i)

  const borderColor = open ? T.primary : error ? T.required : T.border

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Input de texto + icono calendario */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: `1px solid ${borderColor}`,
        padding: '4px 2px 6px', transition: 'border-color .15s',
      }}>
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setYearMode(false) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: T.primary, flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 6h14" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <rect x="4" y="8" width="2" height="2" rx=".5" fill="currentColor" />
            <rect x="7" y="8" width="2" height="2" rx=".5" fill="currentColor" />
            <rect x="10" y="8" width="2" height="2" rx=".5" fill="currentColor" />
            <rect x="4" y="11" width="2" height="2" rx=".5" fill="currentColor" />
            <rect x="7" y="11" width="2" height="2" rx=".5" fill="currentColor" />
          </svg>
        </button>
        <input
          type="text"
          value={inputText}
          onChange={e => handleTextChange(e.target.value)}
          onFocus={() => { setOpen(true); setYearMode(false) }}
          placeholder="dd/mm/aaaa"
          style={{
            border: 'none', outline: 'none', fontSize: 15,
            color: inputText ? T.text : T.textMuted,
            fontFamily: "'Open Sans', system-ui, sans-serif",
            background: 'transparent', width: 110,
          }}
        />
      </div>

      {/* Dropdown calendario */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#fff', borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,.15)',
          padding: '12px', minWidth: 260,
          border: '1px solid #e0e0e0',
        }}>

          {/* ── Cabecera navegación ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {yearMode ? (
              <>
                <button onClick={() => setViewYear(y => y - 12)} style={navBtn}><ChevronLeft size={15} /></button>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>
                  {yearStart} – {yearStart + 11}
                </span>
                <button onClick={() => setViewYear(y => y + 12)} style={navBtn}><ChevronRight size={15} /></button>
              </>
            ) : (
              <>
                <button onClick={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                  else setViewMonth(m => m - 1)
                }} style={navBtn}><ChevronLeft size={15} /></button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{MONTHS[viewMonth]}</span>
                  {/* Año clicable → abre grid de años */}
                  <button
                    onClick={() => setYearMode(true)}
                    style={{
                      fontSize: 14, fontWeight: 600, color: T.primary,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '0 4px', borderRadius: 4, textDecoration: 'underline',
                      fontFamily: 'inherit',
                    }}
                  >{viewYear}</button>
                </div>

                <button onClick={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
                  else setViewMonth(m => m + 1)
                }} style={navBtn}><ChevronRight size={15} /></button>
              </>
            )}
          </div>

          {/* ── Vista: grid de años ── */}
          {yearMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
              {yearGrid.map(y => (
                <button
                  key={y}
                  onClick={() => { setViewYear(y); setYearMode(false) }}
                  style={{
                    padding: '7px 0', fontSize: 13, border: 'none', cursor: 'pointer',
                    borderRadius: 4, fontFamily: 'inherit', textAlign: 'center',
                    background: y === viewYear ? T.primary : y === today.getFullYear() ? T.primaryLight : 'transparent',
                    color:      y === viewYear ? '#fff' : T.text,
                    fontWeight: y === viewYear || y === today.getFullYear() ? 700 : 400,
                  }}
                  onMouseEnter={e => { if (y !== viewYear) e.currentTarget.style.background = T.primaryLight }}
                  onMouseLeave={e => { if (y !== viewYear) e.currentTarget.style.background = y === today.getFullYear() ? T.primaryLight : 'transparent' }}
                >{y}</button>
              ))}
            </div>
          ) : (
            <>
              {/* ── Cabeceras días ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
                {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: T.textMuted, padding: '2px 0' }}>{d}</div>
                ))}
              </div>

              {/* ── Grid de días ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                  const isSelected = selDay === day
                  const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
                  return (
                    <button
                      key={day}
                      onClick={() => select(day)}
                      style={{
                        padding: '6px 0', fontSize: 13, border: 'none', cursor: 'pointer',
                        borderRadius: 4, fontFamily: 'inherit', textAlign: 'center',
                        background: isSelected ? T.primary : 'transparent',
                        color:      isSelected ? '#fff' : isToday ? T.primary : T.text,
                        fontWeight: isToday || isSelected ? 700 : 400,
                        outline:    isToday && !isSelected ? `1.5px solid ${T.primary}` : 'none',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.primaryLight }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >{day}</button>
                  )
                })}
              </div>

              {/* ── Limpiar ── */}
              {value && (
                <button
                  onClick={() => { onChange(''); setOpen(false) }}
                  style={{
                    marginTop: 10, width: '100%', padding: '6px 0',
                    fontSize: 12.5, color: T.textSub, background: 'none',
                    border: `1px solid ${T.border}`, borderRadius: 4,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Limpiar fecha</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '4px', borderRadius: 4, color: T.text,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

/* ── City selector with autocomplete ────────────────────────────────────── */
function CitySelector({ value, onChange, placeholder, side }: {
  value: string; onChange: (v: string) => void
  placeholder: string; side: 'left' | 'right'
}) {
  const [focused,  setFocused]  = useState(false)
  const [inputVal, setInputVal] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setInputVal(value) }, [value])

  const suggestions = inputVal.trim().length > 0
    ? ALL_CITIES.filter(c =>
        c.city.toLowerCase().includes(inputVal.toLowerCase()) ||
        c.code.toLowerCase().includes(inputVal.toLowerCase())
      ).slice(0, 7)
    : ALL_CITIES.filter(c => c.country === 'Perú').slice(0, 7)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setFocused(false)
        // Si no coincide con ninguna ciudad, guardar lo escrito
        setInputVal(value)
      }
    }
    if (focused) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [focused, value])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <div style={{ padding: '10px 18px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '.08em', marginBottom: 6 }}>
          {side === 'left' ? 'ORIGEN' : 'DESTINO'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{side === 'left' ? '🛫' : '🛬'}</span>
          <input
            type="text"
            value={inputVal}
            onChange={e => {
              setInputVal(e.target.value)
              if (!e.target.value) onChange('')
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Guardar texto libre si no hay click en sugerencia
              setTimeout(() => {
                if (!ref.current?.contains(document.activeElement)) {
                  onChange(inputVal)
                  setFocused(false)
                }
              }, 200)
            }}
            placeholder={placeholder}
            style={{
              border: 'none', outline: 'none', fontSize: 16, fontWeight: inputVal ? 600 : 400,
              color: inputVal ? T.text : T.textMuted, background: 'transparent', width: '100%',
              fontFamily: "'Open Sans', system-ui, sans-serif",
            }}
          />
        </div>
        {inputVal && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, paddingLeft: 28 }}>
            {ALL_CITIES.find(c => c.city.toLowerCase() === inputVal.toLowerCase())?.country ?? 'Ciudad personalizada'}
          </div>
        )}
      </div>

      {/* Dropdown de sugerencias */}
      {focused && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,.15)',
          border: '1px solid #e0e0e0', overflow: 'hidden',
          minWidth: 220,
        }}>
          {suggestions.map((c, i) => (
            <div
              key={c.code}
              onMouseDown={() => {
                onChange(c.city)
                setInputVal(c.city)
                setFocused(false)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', cursor: 'pointer',
                borderTop: i > 0 ? '1px solid #f5f5f5' : 'none',
                background: '#fff',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.primaryLight }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              <div style={{
                minWidth: 36, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: T.primaryLight, borderRadius: 5,
                fontSize: 11, fontWeight: 700, color: T.primary,
              }}>{c.code}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{c.city}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{c.country}</div>
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: T.textMuted }}>
              Sin coincidencias — se usará el texto escrito
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Flight widget (Latam-style) ─────────────────────────────────────────── */
function FlightWidget({
  salida, destino, fechaSalida, fechaRegreso, showRegreso,
  onSalidaChange, onDestinoChange, onFechaSalidaChange, onFechaRegresoChange,
  errorSalida, errorDestino, errorFechaSalida, errorFechaRegreso,
}: {
  salida: string; destino: string; fechaSalida: string; fechaRegreso: string
  showRegreso: boolean
  onSalidaChange: (v: string) => void; onDestinoChange: (v: string) => void
  onFechaSalidaChange: (v: string) => void; onFechaRegresoChange: (v: string) => void
  errorSalida?: string; errorDestino?: string; errorFechaSalida?: string; errorFechaRegreso?: string
}) {
  const hasErr = errorSalida || errorDestino || errorFechaSalida || errorFechaRegreso

  return (
    <div style={{
      border: `1.5px solid ${hasErr ? T.required : '#c8deda'}`,
      borderRadius: 14, overflow: 'visible',
      boxShadow: '0 2px 12px rgba(15,110,98,.10)',
      background: '#fff',
    }}>
      {/* ── Fila ciudades ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
        {/* Origen */}
        <div style={{
          flex: 1, borderRight: '1.5px solid #c8deda',
          borderRadius: '14px 0 0 0',
          background: errorSalida ? '#fff8f8' : '#fff',
        }}>
          <CitySelector value={salida} onChange={onSalidaChange} placeholder="Ciudad de salida" side="left" />
          {errorSalida && (
            <div style={{ padding: '0 18px 8px', fontSize: 12, color: T.required }}>{errorSalida}</div>
          )}
        </div>

        {/* Botón intercambiar */}
        <button
          type="button"
          onClick={() => { onSalidaChange(destino); onDestinoChange(salida) }}
          title="Intercambiar ciudades"
          style={{
            position: 'absolute', left: '50%', top: '40%',
            transform: 'translate(-50%, -50%)',
            width: 34, height: 34, borderRadius: '50%',
            background: '#fff', border: '1.5px solid #c8deda',
            cursor: 'pointer', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.primary, fontSize: 17,
            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            transition: 'transform .2s, box-shadow .2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translate(-50%, -50%) rotate(180deg)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,110,98,.25)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translate(-50%, -50%) rotate(0deg)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)'
          }}
        >⇄</button>

        {/* Destino */}
        <div style={{
          flex: 1, borderRadius: '0 14px 0 0',
          background: errorDestino ? '#fff8f8' : '#fff',
        }}>
          <CitySelector value={destino} onChange={onDestinoChange} placeholder="Ciudad de destino" side="right" />
          {errorDestino && (
            <div style={{ padding: '0 18px 8px', fontSize: 12, color: T.required }}>{errorDestino}</div>
          )}
        </div>
      </div>

      {/* ── Fila fechas ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderTop: '1.5px solid #c8deda',
      }}>
        {/* Fecha ida */}
        <div style={{
          flex: 1, padding: '12px 18px 14px',
          borderRight: showRegreso ? '1.5px solid #c8deda' : 'none',
          background: errorFechaSalida ? '#fff8f8' : '#fafffe',
          borderRadius: showRegreso ? '0 0 0 14px' : '0 0 14px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, letterSpacing: '.08em', marginBottom: 6 }}>
            IDA
          </div>
          <DatePicker value={fechaSalida} onChange={onFechaSalidaChange} error={errorFechaSalida} />
          {errorFechaSalida && (
            <div style={{ fontSize: 12, color: T.required, marginTop: 4 }}>{errorFechaSalida}</div>
          )}
        </div>

        {/* Fecha regreso */}
        {showRegreso && (
          <div style={{
            flex: 1, padding: '12px 18px 14px',
            background: errorFechaRegreso ? '#fff8f8' : '#fafffe',
            borderRadius: '0 0 14px 0',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, letterSpacing: '.08em', marginBottom: 6 }}>
              REGRESO
            </div>
            <DatePicker value={fechaRegreso} onChange={onFechaRegresoChange} error={errorFechaRegreso} />
            {errorFechaRegreso && (
              <div style={{ fontSize: 12, color: T.required, marginTop: 4 }}>{errorFechaRegreso}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Passenger list ──────────────────────────────────────────────────────── */
function PassengerListField({ value, onChange, count, error }: {
  value: string; onChange: (v: string) => void; count: number; error?: string
}) {
  const rows: PassengerRow[] = Array.from({ length: count }, (_, i) => ({
    ...EMPTY_PAX, ...(parsePax(value)[i] ?? {}),
  }))

  function update(i: number, key: keyof PassengerRow, val: string) {
    const next = [...rows]; next[i] = { ...next[i], [key]: val }
    onChange(JSON.stringify(next))
  }

  const ul = (hasErr?: boolean): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box', fontSize: 14, color: T.text, background: '#fff', border: 'none',
    borderBottom: `1px solid ${hasErr ? T.required : 'transparent'}`,
    padding: '8px 10px', outline: 'none',
    fontFamily: "'Open Sans', system-ui, sans-serif",
  })

  const Sub = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <div style={{ fontSize: 12, color: T.textSub, marginBottom: 4 }}>
      {children}{req && <span style={{ color: T.required, marginLeft: 2 }}>*</span>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {rows.map((pax, i) => (
        <div key={i} style={{
          borderLeft: `3px solid ${T.primary}`,
          paddingLeft: 16, paddingTop: 4, paddingBottom: 4,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.primary, marginBottom: 14 }}>
            Pasajero {i + 1}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 32px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Sub req>Nombres y apellidos completos</Sub>
              <input type="text" value={pax.nombre}
                onChange={e => update(i, 'nombre', e.target.value)}
                placeholder="Ej: Juan Carlos Pérez García"
                style={ul(!pax.nombre && !!error)}
                onFocus={e => { e.currentTarget.style.borderBottomColor = T.primary }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = !pax.nombre && error ? T.required : 'transparent' }}
              />
            </div>
            <div>
              <Sub req>DNI</Sub>
              <input type="text" value={pax.dni}
                onChange={e => update(i, 'dni', e.target.value)}
                placeholder="Ej: 12345678"
                style={ul(!pax.dni && !!error)}
                onFocus={e => { e.currentTarget.style.borderBottomColor = T.primary }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = !pax.dni && error ? T.required : 'transparent' }}
              />
            </div>
            <div>
              <Sub>Fecha de nacimiento</Sub>
              <DatePicker
                value={pax.nacimiento}
                onChange={v => update(i, 'nacimiento', v)}
              />
            </div>
            <div>
              <Sub>Celular</Sub>
              <input type="text" value={pax.celular}
                onChange={e => update(i, 'celular', e.target.value)}
                placeholder="Ej: 999 999 999"
                style={ul()}
                onFocus={e => { e.currentTarget.style.borderBottomColor = T.primary }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Sub>Correo electrónico</Sub>
              <input type="email" value={pax.correo}
                onChange={e => update(i, 'correo', e.target.value)}
                placeholder="Ej: juan@email.com"
                style={ul()}
                onFocus={e => { e.currentTarget.style.borderBottomColor = T.primary }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
