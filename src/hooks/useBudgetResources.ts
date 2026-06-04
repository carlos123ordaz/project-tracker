import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { BudgetResource } from '../lib/types'

export function usePaginatedResources(
  page: number,
  pageSize: number,
  query: string,
  kind: string,
) {
  const [resources,  setResources]  = useState<BudgetResource[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [kindCounts, setKindCounts] = useState<Record<string, number>>({})
  const [loading,    setLoading]    = useState(true)

  const fetchPage = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('budget_resources')
      .select('*', { count: 'exact' })
      .order('kind').order('sort_order').order('name')
    if (kind !== 'all') q = q.eq('kind', kind)
    if (query)          q = q.ilike('name', `%${query}%`)
    q = q.range(page * pageSize, (page + 1) * pageSize - 1)
    const { data, error, count } = await q
    if (!error) { setResources(data ?? []); setTotalCount(count ?? 0) }
    setLoading(false)
  }, [page, pageSize, query, kind])

  const fetchKindCounts = useCallback(async () => {
    const kinds = ['material', 'labor', 'equipment', 'subcontrato'] as const
    const results = await Promise.all(kinds.map(k => {
      let q = supabase.from('budget_resources')
        .select('*', { count: 'exact', head: true }).eq('kind', k)
      if (query) q = q.ilike('name', `%${query}%`)
      return q
    }))
    const counts: Record<string, number> = {}
    kinds.forEach((k, i) => { counts[k] = results[i].count ?? 0 })
    counts['all'] = kinds.reduce((s, k) => s + (counts[k] ?? 0), 0)
    setKindCounts(counts)
  }, [query])

  // keep stable refs so CRUD callbacks can call the latest fetch without deps
  const fetchPageRef      = useRef(fetchPage)
  const fetchKindCountRef = useRef(fetchKindCounts)
  useEffect(() => { fetchPageRef.current      = fetchPage      }, [fetchPage])
  useEffect(() => { fetchKindCountRef.current = fetchKindCounts }, [fetchKindCounts])

  useEffect(() => { fetchPage()       }, [fetchPage])
  useEffect(() => { fetchKindCounts() }, [fetchKindCounts])

  const refetch = useCallback(() => {
    fetchPageRef.current()
    fetchKindCountRef.current()
  }, [])

  const createResource = async (payload: Omit<BudgetResource, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('budget_resources').insert(payload).select().single()
    if (error) throw new Error(error.message)
    refetch()
    return data as BudgetResource
  }

  const updateResource = async (id: string, updates: Partial<BudgetResource>) => {
    const { error } = await supabase.from('budget_resources').update(updates).eq('id', id)
    if (error) throw new Error(error.message)
    refetch()
  }

  const deleteResource = async (id: string) => {
    const { error } = await supabase.from('budget_resources').delete().eq('id', id)
    if (error) throw new Error(error.message)
    refetch()
  }

  return { resources, totalCount, kindCounts, loading, refetch, createResource, updateResource, deleteResource }
}

export function useBudgetResources() {
  const [resources, setResources] = useState<BudgetResource[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchResources = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('budget_resources')
      .select('*')
      .order('kind')
      .order('sort_order')
      .order('name')
    if (err) setError(err.message)
    else setResources(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchResources() }, [fetchResources])

  const createResource = async (
    payload: Omit<BudgetResource, 'id' | 'created_at'>,
  ): Promise<BudgetResource> => {
    const { data, error: err } = await supabase
      .from('budget_resources').insert(payload).select().single()
    if (err) throw new Error(err.message)
    setResources(prev => [...prev, data as BudgetResource].sort(byKindName))
    return data as BudgetResource
  }

  const updateResource = async (id: string, updates: Partial<BudgetResource>): Promise<void> => {
    const { data, error: err } = await supabase
      .from('budget_resources').update(updates).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setResources(prev => prev.map(r => r.id === id ? data as BudgetResource : r).sort(byKindName))
  }

  const deleteResource = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('budget_resources').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setResources(prev => prev.filter(r => r.id !== id))
  }

  return { resources, loading, error, refetch: fetchResources, createResource, updateResource, deleteResource }
}

function byKindName(a: BudgetResource, b: BudgetResource) {
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
  return a.name.localeCompare(b.name)
}
