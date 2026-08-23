import type { FormSubmission, SubmissionStatus } from './types'

export const FORM_SLUG = 'solicitud-boleto'

// ── Valores del formulario → texto legible ───────────────────────────────────
export const VALUE_LABEL: Record<string, string> = {
  aereo: 'Aéreo', terrestre: 'Terrestre', aereo_terrestre: 'Aéreo y Terrestre',
  nacional: 'Nacional', internacional: 'Internacional',
  ida: 'Solo ida', regreso: 'Solo regreso', ida_regreso: 'Ida y regreso',
  cambio_fecha: 'Cambio de fecha',
  mochila: 'Mochila de mano', '10kg': 'Maleta 10 kg (cabina)', '23kg': 'Maleta 23 kg (bodega)',
}

export function labelFor(value?: string | null) {
  if (!value) return ''
  return VALUE_LABEL[value] ?? value
}

// ── Lecturas derivadas de una solicitud ──────────────────────────────────────
export function nombreDe(s: Pick<FormSubmission, 'submitter_name'>) {
  // El sufijo « - CORSUSA» aparece en todos los registros y sólo añade ruido
  return (s.submitter_name ?? '').replace(/\s*[-–]\s*CORSUSA\s*$/i, '').trim() || '—'
}

export function origenDe(s: Pick<FormSubmission, 'answers'>) {
  return s.answers?.ciudad_salida?.trim() || ''
}

export function destinoDe(s: Pick<FormSubmission, 'answers'>) {
  return s.answers?.ciudad_destino?.trim() || ''
}

export function rutaDe(s: Pick<FormSubmission, 'answers'>) {
  const o = formatearCiudad(origenDe(s)), d = formatearCiudad(destinoDe(s))
  if (!o && !d) return '—'
  return `${o || '—'} → ${d || '—'}`
}

export function modalidadDe(s: Pick<FormSubmission, 'answers'>) {
  const partes = [labelFor(s.answers?.tipo_boleto), labelFor(s.answers?.destino_vuelo)].filter(Boolean)
  return partes.join(' · ')
}

// ── Estilo de estado, compartido por la lista, el panel y los chips ──────────
export const STATUS_STYLE: Record<SubmissionStatus, { bg: string; color: string; border: string }> = {
  'Pendiente':  { bg: 'var(--amber-50)', color: 'var(--amber-700)', border: 'var(--amber-200)' },
  'En proceso': { bg: 'var(--blue-50)',  color: 'var(--blue-700)',  border: 'var(--blue-100)' },
  'Completado': { bg: 'var(--green-50)', color: 'var(--green-700)', border: 'var(--green-200)' },
  'Cancelado':  { bg: 'var(--n-100)',    color: 'var(--n-600)',     border: 'var(--n-200)' },
}

// ── Normalización de ciudades ────────────────────────────────────────────────
// Los destinos se escriben a mano en el formulario: llegan con acentos, en
// minúscula, con el nombre del terminal pegado o con erratas. Sin normalizar,
// «Cusco» y «CUZCO» se cuentan como dos destinos distintos.

export const SIN_DATO = 'Sin dato'

/** Variantes conocidas → nombre canónico. Amplía la lista cuando aparezcan más. */
export const CIUDAD_ALIAS: Record<string, string> = {
  'CUZCO': 'CUSCO',
  'QOSQO': 'CUSCO',
  'LIMA JAVIER PRADO': 'LIMA',
  'LIMA - JAVIER PRADO': 'LIMA',
  'JORGE CHAVEZ': 'LIMA',
  'AEROPUERTO JORGE CHAVEZ': 'LIMA',
  'CAJARMA': 'CAJAMARCA',
  'CAJAMRCA': 'CAJAMARCA',
  'AREQUIPA - AQP': 'AREQUIPA',
  'TALARA - PIURA': 'TALARA',
}

/** Mayúsculas, sin acentos, sin puntuación de sobra y con los alias aplicados. */
export function normalizarCiudad(raw?: string | null): string {
  if (!raw) return ''
  const base = raw
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita acentos
    .toUpperCase()
    .replace(/[.,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-–]\s*|\s*[-–]$/g, '')
    .trim()
  if (!base) return ''
  return CIUDAD_ALIAS[base] ?? base
}

// ── Fechas y medianas para las métricas del dashboard ────────────────────────

/** Las fechas del formulario llegan como dd/mm/yyyy; algunas como ISO. */
export function parseFechaRespuesta(val?: string | null): Date | null {
  if (!val) return null
  const t = val.trim()
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T12:00:00`)
    return isNaN(d.getTime()) ? null : d
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t.length === 10 ? `${t}T12:00:00` : t)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export const DIA_MS = 86_400_000

export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA_MS)
}

export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null
  const orden = [...valores].sort((a, b) => a - b)
  const mitad = Math.floor(orden.length / 2)
  return orden.length % 2 ? orden[mitad] : Math.round((orden[mitad - 1] + orden[mitad]) / 2)
}

/** Palabras que no se capitalizan dentro de un nombre de ciudad. */
const MINUSCULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y'])

/**
 * Presentación de una ciudad escrita a mano: recapitaliza «LIMA» y «lima»
 * como «Lima», y deja intacto lo que ya viene bien escrito (con sus acentos).
 */
export function formatearCiudad(raw?: string | null): string {
  const base = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!base) return ''
  const uniforme = base === base.toUpperCase() || base === base.toLowerCase()
  if (!uniforme) return base
  return base
    .split(' ')
    .map((palabra, i) => {
      const up = palabra.toUpperCase()
      if (i > 0 && MINUSCULAS.has(up)) return palabra.toLowerCase()
      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
    })
    .join(' ')
}
