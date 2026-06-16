import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CronogramaItem } from '../lib/types'

export function useCronogramaCot(cotizacionId: string) {
  const [items, setItems] = useState<CronogramaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!cotizacionId) return
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('cotizacion_cronograma')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .order('orden')
    if (error) {
      setFetchError(error.message)
      console.error('[useCronogramaCot]', error.message)
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }, [cotizacionId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const createItem = async (data: Omit<CronogramaItem, 'id' | 'created_at'>) => {
    setSaving(true)
    const { data: row, error } = await supabase
      .from('cotizacion_cronograma')
      .insert(data)
      .select()
      .single()
    setSaving(false)
    if (error) throw new Error(error.message)
    setItems(prev => [...prev, row as CronogramaItem].sort((a, b) => a.orden - b.orden))
    return row as CronogramaItem
  }

  const updateItem = async (id: string, updates: Partial<CronogramaItem>) => {
    setSaving(true)
    const { data: row, error } = await supabase
      .from('cotizacion_cronograma')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    setSaving(false)
    if (error) throw new Error(error.message)
    setItems(prev => prev.map(it => it.id === id ? (row as CronogramaItem) : it))
    return row as CronogramaItem
  }

  const deleteItem = async (id: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('cotizacion_cronograma')
      .delete()
      .eq('id', id)
    setSaving(false)
    if (error) throw new Error(error.message)
    setItems(prev => prev.filter(it => it.id !== id))
  }

  return {
    items,
    loading,
    saving,
    fetchError,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  }
}
