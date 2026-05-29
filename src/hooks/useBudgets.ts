import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../lib/types'

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setBudgets(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const createBudget = async (
    payload: Omit<Budget, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Budget> => {
    const { data, error: err } = await supabase
      .from('budgets').insert(payload).select().single()
    if (err) throw new Error(err.message)
    setBudgets(prev => [data, ...prev])
    return data as Budget
  }

  const updateBudget = async (id: string, updates: Partial<Budget>): Promise<Budget> => {
    const { data, error: err } = await supabase
      .from('budgets').update(updates).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setBudgets(prev => prev.map(b => (b.id === id ? data : b)))
    return data as Budget
  }

  const deleteBudget = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('budgets').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setBudgets(prev => prev.filter(b => b.id !== id))
  }

  return { budgets, loading, error, refetch: fetchBudgets, createBudget, updateBudget, deleteBudget }
}

export function useBudget(id: string | undefined) {
  const [budget, setBudget]   = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchBudget = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('budgets').select('*').eq('id', id).single()
    if (err) setError(err.message)
    else setBudget(data as Budget)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchBudget() }, [fetchBudget])

  const updateBudget = async (updates: Partial<Budget>): Promise<Budget> => {
    if (!id) throw new Error('No budget id')
    const { data, error: err } = await supabase
      .from('budgets').update(updates).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setBudget(data as Budget)
    return data as Budget
  }

  const deleteBudget = async (): Promise<void> => {
    if (!id) throw new Error('No budget id')
    const { error: err } = await supabase.from('budgets').delete().eq('id', id)
    if (err) throw new Error(err.message)
  }

  return { budget, loading, error, refetch: fetchBudget, updateBudget, deleteBudget }
}
