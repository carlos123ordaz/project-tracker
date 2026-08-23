import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FormDef, FormField, FormSubmission, SubmissionStatus } from '../lib/types'
import { SUBMISSION_STATUSES } from '../lib/types'
import { buildSubmissionsQuery, SORT_COLUMN } from '../lib/formSubmissionsQuery'
import { nombreDe } from '../lib/solicitudBoleto'
import type { SubmissionFilters, SubmissionSortKey } from '../lib/formSubmissionsQuery'

// ── Load a form definition + its fields by slug ───────────────────────────────
export function useFormBySlug(slug: string) {
  const [form, setForm] = useState<FormDef | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      setNotFound(false)

      const { data: formData } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (!formData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setForm(formData as FormDef)

      const { data: fieldsData } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formData.id)
        .order('order_index')

      setFields(
        (fieldsData ?? []).map(f => ({
          ...f,
          options: Array.isArray(f.options) ? f.options : [],
        })) as FormField[],
      )

      setLoading(false)
    }
    load()
  }, [slug])

  return { form, fields, loading, notFound }
}

// ── Resolución del slug del formulario a su id ────────────────────────────────
export function useFormId(slug: string) {
  const [formId, setFormId] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    supabase
      .from('forms')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setFormId(data.id) })
    return () => { cancelled = true }
  }, [slug])

  return formId
}

// ── Paginated submissions for the admin list ──────────────────────────────────
export const PAGE_SIZE = 25

export interface SubmissionsOptions extends SubmissionFilters {
  page?:     number            // 0-indexed (igual que <Pagination/>)
  pageSize?: number
  sort?:     SubmissionSortKey
  dir?:      'asc' | 'desc'
  revision?: number            // súbelo para forzar una recarga
}

export function useFormSubmissions(formSlug: string, opts: SubmissionsOptions = {}) {
  const {
    page = 0, pageSize = PAGE_SIZE, sort = 'fecha', dir = 'desc', revision = 0,
    status = 'Todos', search = '', from = '', to = '', modalidad = '', solicitante = '',
  } = opts

  const formId = useFormId(formSlug)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch whenever cualquier filtro / orden / página cambia
  useEffect(() => {
    if (!formId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      let q = buildSubmissionsQuery(
        formId!,
        { status, search, from, to, modalidad, solicitante },
        '*',
        { count: 'exact' },
      ).order(SORT_COLUMN[sort], { ascending: dir === 'asc', nullsFirst: false })

      // Desempate estable cuando se ordena por una columna con repetidos
      if (sort !== 'fecha') q = q.order('created_at', { ascending: false })

      const fromRow = page * pageSize
      const { data, count, error: err } = await q.range(fromRow, fromRow + pageSize - 1)
      if (cancelled) return

      if (err) {
        setError(err.message)
        setSubmissions([])
        setTotal(0)
      } else {
        setSubmissions((data ?? []) as unknown as FormSubmission[])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [formId, status, search, from, to, modalidad, solicitante, sort, dir, page, pageSize, revision])

  async function updateStatus(id: string, newStatus: SubmissionStatus) {
    const { data, error: err } = await supabase
      .from('form_submissions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    setSubmissions(prev =>
      prev.map(s => (s.id === id ? (data as FormSubmission) : s)),
    )
  }

  async function updateStatusMany(ids: string[], newStatus: SubmissionStatus) {
    if (ids.length === 0) return
    const { data, error: err } = await supabase
      .from('form_submissions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .in('id', ids)
      .select()
    if (err) throw err
    const byId = new Map((data ?? []).map(r => [(r as FormSubmission).id, r as FormSubmission]))
    setSubmissions(prev => prev.map(s => byId.get(s.id) ?? s))
  }

  return { formId, submissions, total, loading, error, updateStatus, updateStatusMany }
}

// ── Conteo por estado, con los filtros activos aplicados ──────────────────────
export type SubmissionCounts = Record<'Todos' | SubmissionStatus, number | null>

const EMPTY_COUNTS: SubmissionCounts = {
  'Todos': null, 'Pendiente': null, 'En proceso': null, 'Completado': null, 'Cancelado': null,
}

export function useSubmissionCounts(
  formId: string | null,
  filters: SubmissionFilters = {},
  revision = 0,
) {
  const { search = '', from = '', to = '', modalidad = '', solicitante = '' } = filters
  const [counts, setCounts] = useState<SubmissionCounts>(EMPTY_COUNTS)

  useEffect(() => {
    if (!formId) return
    let cancelled = false

    async function load() {
      const base: SubmissionFilters = { search, from, to, modalidad, solicitante }
      const keys: ('Todos' | SubmissionStatus)[] = ['Todos', ...SUBMISSION_STATUSES]

      const results = await Promise.all(
        keys.map(k =>
          buildSubmissionsQuery(
            formId!,
            k === 'Todos' ? base : { ...base, status: k },
            'id',
            { count: 'exact', head: true },
          ),
        ),
      )
      if (cancelled) return

      const next = { ...EMPTY_COUNTS }
      keys.forEach((k, i) => { next[k] = results[i].error ? null : (results[i].count ?? 0) })
      setCounts(next)
    }

    load()
    return () => { cancelled = true }
  }, [formId, search, from, to, modalidad, solicitante, revision])

  return counts
}

// ── Lista de solicitantes distintos, para el filtro por persona ───────────────
export function useSubmitters(formId: string | null) {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!formId) return
    let cancelled = false

    supabase
      .from('form_submissions')
      .select('submitter_name')
      .eq('form_id', formId)
      .then(({ data }) => {
        if (cancelled) return
        // Un mismo solicitante aparece con variantes («… - CORSUSA», espacios
        // de más): se agrupan bajo el nombre limpio, que es el que se filtra.
        const unique = new Set<string>()
        for (const row of data ?? []) {
          const limpio = nombreDe({ submitter_name: row.submitter_name })
          if (limpio && limpio !== '—') unique.add(limpio)
        }
        setNames([...unique].sort((a, b) => a.localeCompare(b, 'es')))
      })

    return () => { cancelled = true }
  }, [formId])

  return names
}

// ── Filas ligeras para el dashboard ──────────────────────────────────────────
// Se proyectan sólo las claves del JSONB que el dashboard usa: evita traer los
// `answers` completos (con la lista de pasajeros) de cada solicitud.

export interface SubmissionStatRow {
  id:             string
  status:         SubmissionStatus
  created_at:     string
  updated_at:     string
  submitter_name: string | null
  tipo_boleto:    string | null
  destino_vuelo:  string | null
  tipo_servicio:  string | null
  equipaje:       string | null
  ciudad_salida:  string | null
  ciudad_destino: string | null
  num_pasajeros:  string | null
  fecha_salida:   string | null
}

const STATS_SELECT = [
  'id', 'status', 'created_at', 'updated_at', 'submitter_name',
  'tipo_boleto:answers->>tipo_boleto',
  'destino_vuelo:answers->>destino_vuelo',
  'tipo_servicio:answers->>tipo_servicio',
  'equipaje:answers->>equipaje',
  'ciudad_salida:answers->>ciudad_salida',
  'ciudad_destino:answers->>ciudad_destino',
  'num_pasajeros:answers->>num_pasajeros',
  'fecha_salida:answers->>fecha_salida',
].join(', ')

const STATS_CHUNK = 1000     // tope por petición de PostgREST
const STATS_MAX   = 20_000   // red de seguridad

export function useSubmissionAnalytics(
  formSlug: string,
  opts: { from?: string; solicitante?: string } = {},
) {
  const { from = '', solicitante = '' } = opts

  const formId = useFormId(formSlug)
  const [rows, setRows] = useState<SubmissionStatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!formId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const acc: SubmissionStatRow[] = []
      for (let offset = 0; offset < STATS_MAX; offset += STATS_CHUNK) {
        const { data, error: err } = await buildSubmissionsQuery(
          formId!, { from, solicitante }, STATS_SELECT,
        )
          .order('created_at', { ascending: true })
          .range(offset, offset + STATS_CHUNK - 1)

        if (cancelled) return
        if (err) { setError(err.message); break }

        const batch = (data ?? []) as unknown as SubmissionStatRow[]
        acc.push(...batch)
        if (batch.length < STATS_CHUNK) break
      }

      if (cancelled) return
      setRows(acc)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [formId, from, solicitante])

  return { rows, loading, error }
}
