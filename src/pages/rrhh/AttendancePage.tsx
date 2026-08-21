import { useState, useMemo, useRef, useEffect } from 'react'
import {
  LogIn, LogOut, Clock, CheckCircle, AlertCircle,
  Search, Calendar, ChevronDown, ChevronUp, X, MapPin, MapPinOff, Download,
} from 'lucide-react'
import { useAttendance } from '../../hooks/useAttendance'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { exportAttendanceExcel } from '../../lib/exportAttendanceExcel'
import {
  ATTENDANCE_MOTIVES,
  ATTENDANCE_CONDITIONS,
  type AttendanceCondition,
  type AttendanceMotive,
  type Shift,
  type AttendanceRecord,
  type GpsCoords,
} from '../../lib/types'

// ── Helpers ───────────────────────────────────────────────────

const DAYS_ES   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtHours(h: number): string {
  if (!h) return '—'
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}


const CONDITION_COLORS: Record<AttendanceCondition, { bg: string; color: string }> = {
  'Asistencia':      { bg: 'var(--green-50)',  color: 'var(--green-700)'  },
  'Falta':           { bg: 'var(--red-50)',    color: 'var(--red-700)'    },
  'Descanso Médico': { bg: 'var(--blue-50)',   color: 'var(--blue-700)'   },
  'Enfermedad':      { bg: 'var(--orange-50)', color: 'var(--orange-700)' },
  'Días Compensados':{ bg: 'var(--brand-50)',  color: 'var(--brand-700)'  },
  'Vacaciones':      { bg: 'var(--teal-50)',   color: 'var(--teal-700)'   },
  'Permiso':         { bg: 'var(--amber-50)',  color: 'var(--amber-700)'  },
}

const INPUT: React.CSSProperties = {
  height: 38, padding: '0 12px', fontSize: 13,
  border: '1px solid var(--n-200)', borderRadius: 8,
  background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', width: '100%',
}
const LABEL: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--n-600)', marginBottom: 5, display: 'block',
}

// ── Modal de marcar ingreso ───────────────────────────────────

type CheckInConfirmParams = {
  condition: AttendanceCondition; motive: AttendanceMotive; observations: string
  shift: Shift; project_id: string | null; project_name: string | null; project_type: string | null
  coords: GpsCoords | null
}

const PROJECT_TYPES = [
  'Minería', 'Saneamiento', 'Metalmecánica', 'Automatización',
  'Food & Beverage', 'Energía', 'Oil & Gas', 'Construcción',
  'Mantenimiento', 'Servicios Generales', 'Cotizaciones',
]

function CheckInModal({ onClose, onConfirm }: {
  onClose: () => void
  onConfirm: (params: CheckInConfirmParams) => Promise<void>
}) {
  const { profile }  = useAuth()
  const isMobile     = useIsMobile()

  const [condition,    setCondition]    = useState<AttendanceCondition>('Asistencia')
  const [motive,       setMotive]       = useState<AttendanceMotive>('Ninguno')
  const [observations, setObservations] = useState('')
  const [shift,        setShift]        = useState<Shift>(profile?.shift ?? 'Día')
  const [projectName,  setProjectName]  = useState('')
  const [projectType,  setProjectType]  = useState('')
  const [busy,         setBusy]         = useState(false)
  const [err,          setErr]          = useState<string | null>(null)

  const [gpsStatus,  setGpsStatus]  = useState<'loading' | 'ok' | 'error'>('loading')
  const [coords,     setCoords]     = useState<GpsCoords | null>(null)
  const [gpsError,   setGpsError]   = useState<string>('')
  const [permDenied, setPermDenied] = useState(false)

  const requestGps = () => {
    setGpsStatus('loading')
    setGpsError('')
    setPermDenied(false)
    if (!navigator.geolocation) {
      setGpsStatus('error')
      setGpsError('Este dispositivo no soporta GPS')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setGpsStatus('ok')
      },
      err => {
        setGpsStatus('error')
        if (err.code === 1) {
          setPermDenied(true)
          setGpsError('Permiso de ubicación denegado')
        } else {
          setGpsError('No se pudo obtener la ubicación GPS')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  useEffect(() => { requestGps() }, [])

  const handleConfirm = async () => {
    if (condition !== 'Asistencia' && motive === 'Ninguno') return setErr('Selecciona un motivo')
    if (gpsStatus !== 'ok') return setErr('Se requiere GPS activo para marcar asistencia')
    setBusy(true); setErr(null)
    try {
      await onConfirm({
        condition, motive, observations, shift,
        project_id:   null,
        project_name: projectName.trim() || null,
        project_type: projectType || null,
        coords,
      })
      onClose()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Marcar ingreso" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={busy} icon={LogIn}>
            {busy ? 'Registrando...' : 'Confirmar ingreso'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--red-50)', borderRadius: 6, color: 'var(--red-700)', fontSize: 12.5 }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <div>
            <span style={LABEL}>Condición</span>
            <select value={condition} onChange={e => { setCondition(e.target.value as AttendanceCondition); setMotive('Ninguno') }} style={INPUT}>
              {ATTENDANCE_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <span style={LABEL}>Turno</span>
            <select value={shift} onChange={e => setShift(e.target.value as Shift)} style={INPUT}>
              <option value="Día">Día</option>
              <option value="Noche">Noche</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <div>
            <span style={LABEL}>Proyecto (opcional)</span>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Nombre del proyecto..."
              style={INPUT}
            />
          </div>
          <div>
            <span style={LABEL}>Tipo de proyecto (opcional)</span>
            <select value={projectType} onChange={e => setProjectType(e.target.value)} style={INPUT}>
              <option value="">— Seleccionar —</option>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {condition !== 'Asistencia' && (
          <>
            <div>
              <span style={LABEL}>Motivo *</span>
              <select value={motive} onChange={e => setMotive(e.target.value as AttendanceMotive)} style={INPUT}>
                {ATTENDANCE_MOTIVES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <span style={LABEL}>Observaciones</span>
              <textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                rows={3}
                style={{ ...INPUT, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                placeholder="Descripción adicional..."
              />
            </div>
          </>
        )}

        {condition === 'Asistencia' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--green-50)', borderRadius: 8 }}>
            <Clock size={15} style={{ color: 'var(--green-600)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--green-700)' }}>
              Se registrará la hora actual: <strong>
                {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </strong>
            </span>
          </div>
        )}

        {/* GPS status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 8,
          background: gpsStatus === 'ok' ? 'var(--green-50)' : gpsStatus === 'error' ? 'var(--red-50)' : 'var(--n-50)',
          border: `1px solid ${gpsStatus === 'ok' ? 'var(--green-200)' : gpsStatus === 'error' ? 'var(--red-200)' : 'var(--n-150)'}`,
        }}>
          {gpsStatus === 'loading' && (
            <>
              <MapPin size={15} style={{ color: 'var(--n-400)', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: 'var(--n-500)' }}>Obteniendo ubicación GPS…</span>
            </>
          )}
          {gpsStatus === 'ok' && coords && (
            <>
              <MapPin size={15} style={{ color: 'var(--green-600)', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: 'var(--green-700)' }}>
                Ubicación obtenida · precisión ~{Math.round(coords.accuracy)} m
              </span>
            </>
          )}
          {gpsStatus === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPinOff size={15} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--red-700)', fontWeight: 600 }}>{gpsError}</span>
                <button
                  onClick={requestGps}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--red-600)', background: 'none', border: '1px solid var(--red-300)', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', flexShrink: 0 }}
                >
                  Reintentar
                </button>
              </div>
              {permDenied && (
                <div style={{ fontSize: 12, color: 'var(--red-600)', paddingLeft: 23, lineHeight: 1.5 }}>
                  Para activarlo: haz clic en el ícono <strong>🔒</strong> o <strong>ⓘ</strong> en la barra del navegador → <strong>Permisos del sitio</strong> → <strong>Ubicación</strong> → <strong>Permitir</strong>, luego presiona Reintentar.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Modal de marcar salida ────────────────────────────────────

function CheckOutModal({ record, onClose, onConfirm }: {
  record: AttendanceRecord; onClose: () => void; onConfirm: (coords: GpsCoords | null) => Promise<void>
}) {
  const [busy,       setBusy]       = useState(false)
  const [gpsStatus,  setGpsStatus]  = useState<'loading' | 'ok' | 'error'>('loading')
  const [coords,     setCoords]     = useState<GpsCoords | null>(null)
  const [gpsError,   setGpsError]   = useState<string>('')
  const [permDenied, setPermDenied] = useState(false)
  const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })

  const requestGps = () => {
    setGpsStatus('loading')
    setGpsError('')
    setPermDenied(false)
    if (!navigator.geolocation) { setGpsStatus('error'); setGpsError('Este dispositivo no soporta GPS'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); setGpsStatus('ok') },
      err => {
        setGpsStatus('error')
        if (err.code === 1) { setPermDenied(true); setGpsError('Permiso de ubicación denegado') }
        else { setGpsError('No se pudo obtener la ubicación GPS') }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  useEffect(() => { requestGps() }, [])

  const handleConfirm = async () => {
    if (gpsStatus !== 'ok') { alert('Se requiere GPS activo para marcar salida'); return }
    setBusy(true)
    try { await onConfirm(coords); onClose() }
    catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Marcar salida" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={busy || gpsStatus !== 'ok'} icon={LogOut}>
            {busy ? 'Registrando...' : 'Confirmar salida'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--brand-50)', borderRadius: 8 }}>
          <Clock size={15} style={{ color: 'var(--brand-700)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--brand-700)' }}>
            Se registrará la hora actual: <strong>{now}</strong>
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--n-600)' }}>
          Ingresaste a las <strong>{fmtTime(record.check_in_time)}</strong>. Las horas reales y extras se calcularán automáticamente.
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8,
          background: gpsStatus === 'ok' ? 'var(--green-50)' : gpsStatus === 'error' ? 'var(--red-50)' : 'var(--n-50)',
          border: `1px solid ${gpsStatus === 'ok' ? 'var(--green-200)' : gpsStatus === 'error' ? 'var(--red-200)' : 'var(--n-150)'}`,
        }}>
          {gpsStatus === 'loading' && <><MapPin size={15} style={{ color: 'var(--n-400)', flexShrink: 0 }} /><span style={{ fontSize: 12.5, color: 'var(--n-500)' }}>Obteniendo ubicación GPS…</span></>}
          {gpsStatus === 'ok' && coords && <><MapPin size={15} style={{ color: 'var(--green-600)', flexShrink: 0 }} /><span style={{ fontSize: 12.5, color: 'var(--green-700)' }}>Ubicación obtenida · precisión ~{Math.round(coords.accuracy)} m</span></>}
          {gpsStatus === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPinOff size={15} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--red-700)', fontWeight: 600 }}>{gpsError}</span>
                <button onClick={requestGps} style={{ fontSize: 12, fontWeight: 600, color: 'var(--red-600)', background: 'none', border: '1px solid var(--red-300)', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', flexShrink: 0 }}>Reintentar</button>
              </div>
              {permDenied && (
                <div style={{ fontSize: 12, color: 'var(--red-600)', paddingLeft: 23, lineHeight: 1.5 }}>
                  Para activarlo: haz clic en el ícono <strong>🔒</strong> o <strong>ⓘ</strong> en la barra del navegador → <strong>Permisos del sitio</strong> → <strong>Ubicación</strong> → <strong>Permitir</strong>, luego presiona Reintentar.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Card móvil de un registro ─────────────────────────────────

function RecordCard({ r, showCollaborator }: { r: AttendanceRecord; showCollaborator: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const d       = new Date(r.date + 'T00:00:00')
  const condClr = CONDITION_COLORS[r.condition] ?? CONDITION_COLORS['Asistencia']

  return (
    <div style={{
      background: 'var(--n-0)', borderRadius: 12, border: '1px solid var(--n-150)',
      overflow: 'hidden', boxShadow: 'var(--shadow-xs)',
    }}>
      {/* Cabecera */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: 12, padding: '12px 14px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Fecha visual */}
        <div style={{
          width: 44, flexShrink: 0, textAlign: 'center',
          background: 'var(--n-50)', borderRadius: 8, padding: '6px 4px',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', lineHeight: 1 }}>
            {d.getDate()}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--n-500)', textTransform: 'uppercase', marginTop: 2 }}>
            {MONTHS_ES[d.getMonth()].slice(0, 3)}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>
              {DAYS_ES[d.getDay()]}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--n-400)' }}>Sem. {isoWeek(d)}</span>
            <span style={{
              padding: '1px 7px', borderRadius: 10, fontSize: 10.5, fontWeight: 700,
              ...condClr,
            }}>
              {r.condition}
            </span>
          </div>

          {showCollaborator && (
            <div style={{ fontSize: 12, color: 'var(--n-600)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.collaborator_name}
            </div>
          )}

          {/* Resumen inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            {r.check_in_time && (
              <span style={{ fontSize: 12, color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <LogIn size={11} style={{ color: 'var(--green-500)' }} />
                {fmtTime(r.check_in_time)}
              </span>
            )}
            {r.check_out_time && (
              <span style={{ fontSize: 12, color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <LogOut size={11} style={{ color: 'var(--n-400)' }} />
                {fmtTime(r.check_out_time)}
              </span>
            )}
            {r.real_hours > 0 && (
              <span style={{ fontSize: 12, color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={11} style={{ color: 'var(--n-400)' }} />
                {fmtHours(r.real_hours)}
              </span>
            )}
            {r.extra_hours > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                background: 'var(--brand-50)', color: 'var(--brand-700)',
              }}>
                +{fmtHours(r.extra_hours)} extra
              </span>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0, color: 'var(--n-400)' }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Detalle expandible */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--n-100)',
          padding: '12px 14px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px',
          background: 'var(--n-25)',
        }}>
          <DetailRow label="Turno" value={
            <span style={{
              padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: r.shift === 'Día' ? 'var(--amber-50)' : 'var(--brand-50)',
              color: r.shift === 'Día' ? 'var(--amber-700)' : 'var(--brand-700)',
            }}>{r.shift}</span>
          } />
          <DetailRow label="H. Programadas" value={fmtHours(r.scheduled_hours)} />
          <DetailRow label="H. Reales"       value={fmtHours(r.real_hours)} />
          <DetailRow label="H. Extra"        value={
            r.extra_hours > 0
              ? <span style={{ color: 'var(--brand-700)', fontWeight: 700 }}>{fmtHours(r.extra_hours)}</span>
              : '—'
          } />
          {r.project_name && <DetailRow label="Proyecto" value={r.project_name} span />}
          {r.project_type  && <DetailRow label="Tipo"     value={r.project_type} />}
          {r.motive !== 'Ninguno' && <DetailRow label="Motivo" value={r.motive} span />}
          {r.observations  && <DetailRow label="Observaciones" value={r.observations} span />}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--n-800)' }}>{value || '—'}</div>
    </div>
  )
}

// ── Tabla escritorio ──────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '8px 10px', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)',
  letterSpacing: '0.05em', textTransform: 'uppercase',
  background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)',
  textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0,
}
const TD: React.CSSProperties = {
  padding: '9px 10px', fontSize: 12, color: 'var(--n-700)', whiteSpace: 'nowrap',
}

function DesktopTable({ records, showCollaborator }: { records: AttendanceRecord[]; showCollaborator: boolean }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: showCollaborator ? 1280 : 1100 }}>
        <thead>
          <tr>
            {[
              'Fecha','Día','Sem.','Mes',
              ...(showCollaborator ? ['Colaborador'] : []),
              'Proyecto','Tipo','Turno',
              'Ingreso','Salida','H. Prog.','H. Real','H. Extra',
              'Condición','Motivo','Observaciones','Ubic.',
            ].map(h => <th key={h} style={TH}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const d = new Date(r.date + 'T00:00:00')
            const condClr = CONDITION_COLORS[r.condition] ?? CONDITION_COLORS['Asistencia']
            return (
              <tr key={r.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--n-100)', background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-25)' }}>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{r.date}</td>
                <td style={TD}>{DAYS_ES[d.getDay()]}</td>
                <td style={{ ...TD, textAlign: 'center' }}>{isoWeek(d)}</td>
                <td style={TD}>{MONTHS_ES[d.getMonth()]}</td>
                {showCollaborator && <td style={{ ...TD, fontWeight: 550, color: 'var(--n-900)' }}>{r.collaborator_name}</td>}
                <td style={TD}>{r.project_name || '—'}</td>
                <td style={TD}>{r.project_type || '—'}</td>
                <td style={TD}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: r.shift === 'Día' ? 'var(--amber-50)' : 'var(--brand-50)',
                    color: r.shift === 'Día' ? 'var(--amber-700)' : 'var(--brand-700)',
                  }}>{r.shift}</span>
                </td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{fmtTime(r.check_in_time)}</td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{fmtTime(r.check_out_time)}</td>
                <td style={{ ...TD, textAlign: 'center' }}>{fmtHours(r.scheduled_hours)}</td>
                <td style={{ ...TD, textAlign: 'center' }}>{fmtHours(r.real_hours)}</td>
                <td style={{ ...TD, textAlign: 'center' }}>
                  {r.extra_hours > 0
                    ? <span style={{ color: 'var(--brand-700)', fontWeight: 600 }}>{fmtHours(r.extra_hours)}</span>
                    : '—'}
                </td>
                <td style={TD}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, ...condClr }}>
                    {r.condition}
                  </span>
                </td>
                <td style={{ ...TD, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.motive === 'Ninguno' ? '—' : r.motive}
                </td>
                <td style={{ ...TD, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.observations || '—'}
                </td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {r.check_in_lat && r.check_in_lng
                      ? <a
                          href={`https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ubicación de ingreso"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--green-700)', textDecoration: 'none', padding: '3px 7px', borderRadius: 6, border: '1px solid var(--green-200)', background: 'var(--green-50)' }}
                        >
                          <MapPin size={10} /> In
                        </a>
                      : <span style={{ fontSize: 11, color: 'var(--n-300)' }}>—</span>}
                    {r.check_out_lat && r.check_out_lng
                      ? <a
                          href={`https://www.google.com/maps?q=${r.check_out_lat},${r.check_out_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ubicación de salida"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--brand-700)', textDecoration: 'none', padding: '3px 7px', borderRadius: 6, border: '1px solid var(--brand-200)', background: 'var(--brand-50)' }}
                        >
                          <MapPin size={10} /> Out
                        </a>
                      : <span style={{ fontSize: 11, color: 'var(--n-300)' }}>—</span>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

export default function AttendancePage() {
  const { profile, isSuperAdmin } = useAuth()
  const isMobile = useIsMobile()
  const [showCheckIn,  setShowCheckIn]  = useState(false)
  const [showCheckOut, setShowCheckOut] = useState(false)
  const [filterUser,   setFilterUser]   = useState('')
  const [filterDate,   setFilterDate]   = useState(() => new Date().toISOString().split('T')[0])

  const [exporting, setExporting] = useState(false)

  const { records, loading, refetch, checkIn, checkOut } = useAttendance(
    isSuperAdmin ? undefined : profile?.id,
    filterDate || undefined,
  )
  const dateInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAttendanceExcel({
        userId: isSuperAdmin ? undefined : profile?.id,
        dateFilter: filterDate || undefined,
        filterUser: filterUser || undefined,
      })
    } catch (e: any) {
      alert(e.message)
    } finally {
      setExporting(false)
    }
  }

  const today    = new Date().toISOString().split('T')[0]
  const todayRec = records.find(r => r.date === today && r.collaborator_id === profile?.id)

  const isCheckedIn  = !!todayRec && !!todayRec.check_in_time && !todayRec.check_out_time
  const isCheckedOut = !!todayRec && !!todayRec.check_out_time
  const isPermission = !!todayRec && todayRec.condition !== 'Asistencia'

  const handleCheckIn = async (params: CheckInConfirmParams) => {
    if (!profile) throw new Error('No hay perfil cargado')
    await checkIn({ ...params, profile, coords: params.coords })
    await refetch()
  }

  const handleCheckOut = async (coords: GpsCoords | null) => {
    if (!todayRec) throw new Error('No hay registro de ingreso')
    await checkOut(todayRec.id, coords)
    await refetch()
  }

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterDate && r.date !== filterDate) return false
      if (filterUser.trim()) {
        if (!r.collaborator_name.toLowerCase().includes(filterUser.toLowerCase())) return false
      }
      return true
    })
  }, [records, filterUser, filterDate])

  const pad = isMobile ? '16px 16px 24px' : '20px 28px 28px'

  return (
    <div style={{ padding: pad }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 20, fontWeight: 700, color: 'var(--n-900)' }}>
          Asistencia
        </h1>
        <div style={{ fontSize: 13, color: 'var(--n-500)', marginTop: 2 }}>
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ── Widget check-in/out ── */}
      {profile && (
        <div className="card" style={{
          marginBottom: 20, overflow: 'hidden',
          border: isCheckedIn
            ? '1.5px solid var(--brand-200)'
            : isCheckedOut
            ? '1.5px solid var(--green-200)'
            : '1px solid var(--n-150)',
        }}>
          {/* Barra de estado de color */}
          <div style={{
            height: 4,
            background: isCheckedOut
              ? 'var(--green-400)'
              : isCheckedIn
              ? 'var(--brand-500)'
              : 'var(--n-200)',
          }} />

          <div style={{ padding: isMobile ? '16px' : '16px 20px' }}>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 14,
            }}>
              {/* Icono + texto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: isCheckedOut ? 'var(--green-50)' : isCheckedIn ? 'var(--brand-50)' : 'var(--n-100)',
                  color: isCheckedOut ? 'var(--green-600)' : isCheckedIn ? 'var(--brand-700)' : 'var(--n-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isCheckedOut ? <CheckCircle size={22} /> : <Clock size={22} />}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)' }}>
                    {isCheckedOut
                      ? 'Jornada completada'
                      : isCheckedIn
                      ? 'En servicio'
                      : isPermission
                      ? `Permiso registrado`
                      : 'No has marcado ingreso hoy'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--n-500)', marginTop: 3 }}>
                    {isCheckedOut && (
                      <>
                        <span style={{ marginRight: 8 }}>
                          <LogIn size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                          {fmtTime(todayRec!.check_in_time)}
                        </span>
                        <span style={{ marginRight: 8 }}>
                          <LogOut size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                          {fmtTime(todayRec!.check_out_time)}
                        </span>
                        <span style={{ color: 'var(--brand-700)', fontWeight: 600 }}>
                          {fmtHours(todayRec!.real_hours)} reales
                        </span>
                        {todayRec!.extra_hours > 0 && (
                          <span style={{ marginLeft: 6, color: 'var(--brand-500)' }}>
                            · +{fmtHours(todayRec!.extra_hours)} extra
                          </span>
                        )}
                      </>
                    )}
                    {isCheckedIn && `Ingresaste a las ${fmtTime(todayRec!.check_in_time)}`}
                    {isPermission && !isCheckedIn && `${todayRec?.motive}`}
                    {!todayRec && `Hora actual: ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                  </div>
                </div>
              </div>

              {/* Botón acción */}
              {!todayRec && (
                <button
                  onClick={() => setShowCheckIn(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '14px 20px' : '10px 18px',
                    fontSize: isMobile ? 15 : 13, fontWeight: 700,
                    background: 'var(--brand-600)', color: '#fff',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                    transition: 'background .15s',
                    marginTop: isMobile ? 4 : 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-700)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--brand-600)'}
                >
                  <LogIn size={isMobile ? 18 : 15} />
                  Marcar ingreso
                </button>
              )}
              {isCheckedIn && (
                <button
                  onClick={() => setShowCheckOut(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '14px 20px' : '10px 18px',
                    fontSize: isMobile ? 15 : 13, fontWeight: 700,
                    background: 'var(--n-0)', color: 'var(--n-800)',
                    border: '1.5px solid var(--n-250, var(--n-200))', borderRadius: 10, cursor: 'pointer',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'background .15s',
                    marginTop: isMobile ? 4 : 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--n-0)'}
                >
                  <LogOut size={isMobile ? 18 : 15} />
                  Marcar salida
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de filtros / título historial ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 10, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Calendar size={14} style={{ color: 'var(--n-500)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-700)' }}>Historial</span>
          <span style={{ fontSize: 12, color: 'var(--n-400)' }}>({filteredRecords.length})</span>
        </div>

        {/* Filtro por fecha + botón Hoy (misma fila siempre) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: isMobile ? 1 : undefined }}>
          <div
            style={{ position: 'relative', flex: 1, cursor: 'pointer' }}
            onClick={() => dateInputRef.current?.showPicker()}
          >
            <input
              ref={dateInputRef}
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{
                height: 36, padding: '0 28px 0 10px', fontSize: 12.5, borderRadius: 8,
                border: filterDate ? '1.5px solid var(--brand-400)' : '1px solid var(--n-200)',
                background: filterDate ? 'var(--brand-50)' : 'var(--n-0)',
                color: filterDate ? 'var(--brand-800)' : 'var(--n-800)',
                outline: 'none', width: isMobile ? '100%' : 160,
                cursor: 'pointer', pointerEvents: 'none',
              }}
            />
            {filterDate && (
              <button
                onClick={e => { e.stopPropagation(); setFilterDate('') }}
                title="Quitar filtro de fecha"
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--n-400)', display: 'flex', alignItems: 'center', padding: 0,
                  pointerEvents: 'auto',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => setFilterDate(today)}
            style={{
              height: 36, padding: '0 12px', fontSize: 12.5, fontWeight: 600, borderRadius: 8,
              border: '1px solid var(--n-200)', background: filterDate === today ? 'var(--brand-600)' : 'var(--n-0)',
              color: filterDate === today ? '#fff' : 'var(--n-700)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background .15s, color .15s',
            }}
          >
            Hoy
          </button>
        </div>

        {isSuperAdmin && (
          <div style={{ position: 'relative', flex: isMobile ? undefined : 1, maxWidth: isMobile ? undefined : 280 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
            <input
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              placeholder="Filtrar por colaborador..."
              style={{
                height: 36, padding: '0 10px 0 30px', fontSize: 12.5, borderRadius: 8,
                border: '1px solid var(--n-200)', background: 'var(--n-0)',
                color: 'var(--n-800)', outline: 'none', width: '100%',
              }}
            />
          </div>
        )}

        {isSuperAdmin && (
          <Button
            icon={Download}
            variant="secondary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exportando...' : 'Exportar'}
          </Button>
        )}
      </div>

      {/* ── Lista / Tabla ── */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
          Cargando registros...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
          Sin registros de asistencia.
        </div>
      ) : isMobile ? (
        /* ── Vista móvil: cards ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredRecords.map(r => (
            <RecordCard key={r.id} r={r} showCollaborator={isSuperAdmin} />
          ))}
        </div>
      ) : (
        /* ── Vista escritorio: tabla ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <DesktopTable records={filteredRecords} showCollaborator={isSuperAdmin} />
        </div>
      )}

      {/* ── Modals ── */}
      {showCheckIn && (
        <CheckInModal onClose={() => setShowCheckIn(false)} onConfirm={handleCheckIn} />
      )}
      {showCheckOut && todayRec && (
        <CheckOutModal record={todayRec} onClose={() => setShowCheckOut(false)} onConfirm={handleCheckOut} />
      )}
    </div>
  )
}
