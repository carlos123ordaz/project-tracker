import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BudgetItem, ApuLine } from '../lib/types'

export function useBudgetItems(budgetId: string | undefined) {
  const [items, setItems]     = useState<BudgetItem[]>([])
  const [apuLines, setApu]    = useState<ApuLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!budgetId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const itemsRes = await supabase
      .from('budget_items').select('*').eq('budget_id', budgetId).order('sort_order')

    if (itemsRes.error) { setError(itemsRes.error.message); setLoading(false); return }

    const fetchedItems = itemsRes.data || []
    setItems(fetchedItems)

    const itemIds = fetchedItems.map(i => i.id)
    if (itemIds.length > 0) {
      const apuRes = await supabase
        .from('apu_lines').select('*, resource:budget_resources(*)').in('item_id', itemIds)
      if (!apuRes.error) setApu(apuRes.data as ApuLine[] || [])
    } else {
      setApu([])
    }
    setLoading(false)
  }, [budgetId])

  useEffect(() => { fetch() }, [fetch])

  // Items CRUD
  const createItem = async (payload: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetItem> => {
    const { data, error: err } = await supabase.from('budget_items').insert(payload).select().single()
    if (err) throw new Error(err.message)
    setItems(prev => [...prev, data as BudgetItem])
    return data as BudgetItem
  }

  const updateItem = async (id: string, updates: Partial<BudgetItem>): Promise<void> => {
    const { error: err } = await supabase.from('budget_items').update(updates).eq('id', id)
    if (err) throw new Error(err.message)
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it))
  }

  const deleteItem = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('budget_items').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setItems(prev => prev.filter(it => it.id !== id))
    setApu(prev => prev.filter(l => l.item_id !== id))
  }

  // APU lines CRUD
  const upsertApuLine = async (itemId: string, resourceId: string, qty: number): Promise<void> => {
    const existing = apuLines.find(l => l.item_id === itemId && l.resource_id === resourceId)
    if (existing) {
      const { error: err } = await supabase.from('apu_lines').update({ qty }).eq('id', existing.id)
      if (err) throw new Error(err.message)
      setApu(prev => prev.map(l => l.id === existing.id ? { ...l, qty } : l))
    } else {
      const { data, error: err } = await supabase
        .from('apu_lines')
        .insert({ item_id: itemId, resource_id: resourceId, qty })
        .select('*, resource:budget_resources(*)')
        .single()
      if (err) throw new Error(err.message)
      setApu(prev => [...prev, data as ApuLine])
    }
  }

  const deleteApuLine = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('apu_lines').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setApu(prev => prev.filter(l => l.id !== id))
  }

  const refreshApuForItem = async (itemId: string): Promise<void> => {
    const { data, error: err } = await supabase
      .from('apu_lines').select('*, resource:budget_resources(*)').eq('item_id', itemId)
    if (!err) setApu(prev => [...prev.filter(l => l.item_id !== itemId), ...(data as ApuLine[])])
  }

  return {
    items, apuLines, loading, error, refetch: fetch,
    createItem, updateItem, deleteItem,
    upsertApuLine, deleteApuLine, refreshApuForItem,
    // helper to set local resource data on apu lines after resource updates
    setApuLines: setApu,
  }
}

