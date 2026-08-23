import { supabase } from './supabase'
import type { SubmissionStatus } from './types'

// ── Filtros compartidos por la lista, los contadores y la exportación ─────────

export interface SubmissionFilters {
  status?:      SubmissionStatus | 'Todos'
  search?:      string
  from?:        string   // ISO, inclusivo
  to?:          string   // ISO, inclusivo
  modalidad?:   string   // answers->>tipo_boleto
  solicitante?: string   // submitter_name, por prefijo
}

export type SubmissionSortKey = 'fecha' | 'solicitante' | 'ruta' | 'pax' | 'task' | 'estado'

export const SORT_COLUMN: Record<SubmissionSortKey, string> = {
  fecha:       'created_at',
  solicitante: 'submitter_name',
  ruta:        'answers->>ciudad_destino',
  pax:         'answers->>num_pasajeros',
  task:        'answers->>numero_task',
  estado:      'status',
}

/** Los campos JSONB en los que también busca el buscador de la pantalla. */
const SEARCH_COLUMNS = [
  'submitter_name',
  'submitter_email',
  'answers->>ciudad_salida',
  'answers->>ciudad_destino',
  'answers->>numero_task',
]

/** Quita los caracteres que romperían la sintaxis de filtros de PostgREST. */
export function sanitizeSearch(term: string) {
  return term.replace(/[(),*%\\"']/g, ' ').replace(/\s+/g, ' ').trim()
}

export function hasActiveFilters(f: SubmissionFilters) {
  return Boolean(
    (f.status && f.status !== 'Todos') ||
    f.search?.trim() || f.from || f.to || f.modalidad || f.solicitante,
  )
}

/**
 * Consulta base de form_submissions con todos los filtros de la pantalla
 * aplicados en servidor (incluida la búsqueda sobre ciudades y task).
 */
export function buildSubmissionsQuery(
  formId: string,
  f: SubmissionFilters,
  select = '*',
  count?: { count: 'exact'; head?: boolean },
) {
  let q = supabase
    .from('form_submissions')
    .select(select, count)
    .eq('form_id', formId)

  if (f.status && f.status !== 'Todos') q = q.eq('status', f.status)
  if (f.modalidad)   q = q.eq('answers->>tipo_boleto', f.modalidad)
  if (f.solicitante) q = q.ilike('submitter_name', `${sanitizeSearch(f.solicitante)}%`)
  if (f.from)        q = q.gte('created_at', f.from)
  if (f.to)          q = q.lte('created_at', f.to)

  const term = sanitizeSearch(f.search ?? '')
  if (term) q = q.or(SEARCH_COLUMNS.map(c => `${c}.ilike.%${term}%`).join(','))

  return q
}
