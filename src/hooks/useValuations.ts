import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Valuation, ValuationItem } from '../lib/types'

export function useValuations(projectId: string) {
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [loading,    setLoading]    = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('valuations')
      .select('*')
      .eq('project_id', projectId)
      .order('number')
    setValuations((data as Valuation[]) || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<Valuation, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('valuations').insert(payload).select().single()
    if (error) throw new Error(error.message)
    const v = data as Valuation
    setValuations(prev => [...prev, v])
    return v
  }

  const update = async (id: string, changes: Partial<Omit<Valuation, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from('valuations').update(changes).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    const v = data as Valuation
    setValuations(prev => prev.map(x => x.id === id ? v : x))
    return v
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('valuations').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setValuations(prev => prev.filter(x => x.id !== id))
  }

  const nextNumber = valuations.length > 0 ? Math.max(...valuations.map(v => v.number)) + 1 : 1

  return { valuations, loading, refetch: fetch, create, update, remove, nextNumber }
}

export function useValuationItems(valuationId: string | null) {
  const [items,   setItems]   = useState<ValuationItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!valuationId) { setItems([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('valuation_items')
      .select('*')
      .eq('valuation_id', valuationId)
      .order('sort_order')
    setItems((data as ValuationItem[]) || [])
    setLoading(false)
  }, [valuationId])

  useEffect(() => { fetch() }, [fetch])

  const saveAll = async (
    valuationId: string,
    rows: { id?: string; code: string; description: string; unit: string; unit_price: number; quantity_contract: number; quantity_previous: number; quantity_current: number }[]
  ) => {
    const toUpsert = rows.map((r, i) => ({
      ...(r.id ? { id: r.id } : {}),
      valuation_id: valuationId,
      code: r.code,
      description: r.description,
      unit: r.unit,
      unit_price: r.unit_price,
      quantity_contract: r.quantity_contract,
      quantity_previous: r.quantity_previous,
      quantity_current: r.quantity_current,
      sort_order: i,
    }))

    const { data, error } = await supabase
      .from('valuation_items')
      .upsert(toUpsert, { onConflict: 'id' })
      .select()
    if (error) throw new Error(error.message)
    setItems((data as ValuationItem[]) || [])
    return data as ValuationItem[]
  }

  const deleteItem = async (id: string) => {
    await supabase.from('valuation_items').delete().eq('id', id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  const deleteAllForValuation = async (valuationId: string) => {
    await supabase.from('valuation_items').delete().eq('valuation_id', valuationId)
    setItems([])
  }

  return { items, loading, refetch: fetch, saveAll, deleteItem, deleteAllForValuation }
}
