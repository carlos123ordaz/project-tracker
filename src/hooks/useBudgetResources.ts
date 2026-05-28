import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BudgetResource } from '../lib/types'

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
