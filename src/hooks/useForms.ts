import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FormDef, FormField, FormSubmission, SubmissionStatus } from '../lib/types'

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

// ── Paginated submissions for the admin list ──────────────────────────────────
export const PAGE_SIZE = 50

export function useFormSubmissions(
  formSlug: string,
  opts: { status?: SubmissionStatus | 'Todos'; page?: number } = {},
) {
  const { status = 'Todos', page = 1 } = opts

  const [formId, setFormId] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Resolve form slug → id once
  useEffect(() => {
    if (!formSlug) return
    supabase
      .from('forms')
      .select('id')
      .eq('slug', formSlug)
      .maybeSingle()
      .then(({ data }) => { if (data) setFormId(data.id) })
  }, [formSlug])

  // Fetch page whenever formId / status / page changes
  useEffect(() => {
    if (!formId) return
    async function load() {
      setLoading(true)
      const from = (page - 1) * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1

      let q = supabase
        .from('form_submissions')
        .select('*', { count: 'exact' })
        .eq('form_id', formId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (status !== 'Todos') q = q.eq('status', status)

      const { data, count } = await q
      setSubmissions((data ?? []) as FormSubmission[])
      setTotal(count ?? 0)
      setLoading(false)
    }
    load()
  }, [formId, status, page])

  async function updateStatus(id: string, newStatus: SubmissionStatus) {
    const { data, error } = await supabase
      .from('form_submissions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setSubmissions(prev =>
      prev.map(s => (s.id === id ? (data as FormSubmission) : s)),
    )
  }

  return { formId, submissions, total, loading, updateStatus }
}

// ── All submissions (lightweight) for dashboard aggregation ──────────────────
export function useFormStats(formSlug: string) {
  const [rows, setRows] = useState<Pick<FormSubmission, 'status' | 'answers' | 'created_at' | 'submitter_name'>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!formSlug) return
    async function load() {
      setLoading(true)
      const { data: form } = await supabase
        .from('forms')
        .select('id')
        .eq('slug', formSlug)
        .maybeSingle()
      if (!form) { setLoading(false); return }

      const { data } = await supabase
        .from('form_submissions')
        .select('status, answers, created_at, submitter_name')
        .eq('form_id', form.id)
        .order('created_at', { ascending: true })

      setRows((data ?? []) as typeof rows)
      setLoading(false)
    }
    load()
  }, [formSlug])

  return { rows, loading }
}
