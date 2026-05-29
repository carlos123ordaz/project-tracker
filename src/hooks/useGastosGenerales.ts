import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { GGItem, GGRubroId } from '../lib/types'

export function useGastosGenerales(budgetId: string | undefined) {
  const [items,   setItems]   = useState<GGItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!budgetId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('budget_gg_items')
      .select('*')
      .eq('budget_id', budgetId)
      .order('sort_order')
    if (err) setError(err.message)
    else setItems(data as GGItem[] || [])
    setLoading(false)
  }, [budgetId])

  useEffect(() => { fetch() }, [fetch])

  const createItem = async (
    payload: Omit<GGItem, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<GGItem> => {
    const { data, error: err } = await supabase
      .from('budget_gg_items').insert(payload).select().single()
    if (err) throw new Error(err.message)
    const item = data as GGItem
    setItems(prev => [...prev, item].sort((a, b) => a.sort_order - b.sort_order))
    return item
  }

  const updateItem = async (id: string, updates: Partial<GGItem>): Promise<void> => {
    const { error: err } = await supabase
      .from('budget_gg_items').update(updates).eq('id', id)
    if (err) throw new Error(err.message)
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it))
  }

  const deleteItem = async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('budget_gg_items').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setItems(prev => prev.filter(it => it.id !== id))
  }

  const createFromCatalog = async (
    rubro: GGRubroId, name: string, unit: string,
    unitPrice: number, months: number | null,
    code: string,
  ): Promise<void> => {
    const kind = unit === 'mes' ? 'variable' : undefined
    await createItem({
      budget_id: budgetId!,
      rubro, code, name, unit,
      qty: 1, unit_price: unitPrice,
      months: kind === 'variable' ? months : null,
      sort_order: Date.now(),
    })
  }

  return {
    items, loading, error, refetch: fetch,
    createItem, updateItem, deleteItem, createFromCatalog,
  }
}
