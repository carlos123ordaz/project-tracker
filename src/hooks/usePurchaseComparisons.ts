import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type {
  PurchaseComparison, ComparisonItem,
  ComparisonSupplier, ComparisonQuote,
} from '../lib/types'

export function usePurchaseComparisons() {
  const [comparisons, setComparisons] = useState<PurchaseComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComparisons = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('purchase_comparisons')
      .select('*')
      .order('number', { ascending: false })
    if (err) setError(err.message)
    else setComparisons(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchComparisons() }, [fetchComparisons])

  const createComparison = async (
    comparison: Omit<PurchaseComparison, 'id' | 'number' | 'created_at' | 'updated_at'>,
  ) => {
    const { data, error: err } = await supabase
      .from('purchase_comparisons')
      .insert(comparison)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setComparisons(prev => [data, ...prev])
    logAction({ action: 'crear', entityType: 'comparativo', entityId: data.id, entityName: data.title })
    return data as PurchaseComparison
  }

  const updateComparison = async (id: string, updates: Partial<PurchaseComparison>) => {
    const { data, error: err } = await supabase
      .from('purchase_comparisons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setComparisons(prev => prev.map(c => (c.id === id ? data : c)))
    logAction({ action: 'actualizar', entityType: 'comparativo', entityId: id })
    return data as PurchaseComparison
  }

  const deleteComparison = async (id: string) => {
    const comp = comparisons.find(c => c.id === id)
    const { error: err } = await supabase.from('purchase_comparisons').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setComparisons(prev => prev.filter(c => c.id !== id))
    logAction({ action: 'eliminar', entityType: 'comparativo', entityId: id, entityName: comp?.title })
  }

  return {
    comparisons, loading, error,
    refetch: fetchComparisons,
    createComparison, updateComparison, deleteComparison,
  }
}

// ── Detail hook ────────────────────────────────────────────────
export function useComparativoDetail(id: string) {
  const [comparison, setComparison] = useState<PurchaseComparison | null>(null)
  const [items, setItems] = useState<ComparisonItem[]>([])
  const [compSuppliers, setCompSuppliers] = useState<ComparisonSupplier[]>([])
  const [quotes, setQuotes] = useState<ComparisonQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [compRes, itemsRes, suppliersRes, quotesRes] = await Promise.all([
      supabase.from('purchase_comparisons').select('*').eq('id', id).single(),
      supabase.from('comparison_items').select('*').eq('comparison_id', id).order('sort_order'),
      supabase.from('comparison_suppliers').select('*').eq('comparison_id', id).order('sort_order'),
      supabase.from('comparison_quotes').select('*').eq('comparison_id', id),
    ])
    if (compRes.error) { setError(compRes.error.message); setLoading(false); return }
    setComparison(compRes.data)
    setItems(itemsRes.data || [])
    setCompSuppliers(suppliersRes.data || [])
    setQuotes(quotesRes.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Items ──────────────────────────────────────────────────
  const addItem = async (item: { description: string; unit: string; quantity: number; notes?: string; article_id?: string }) => {
    const { data, error: err } = await supabase
      .from('comparison_items')
      .insert({ ...item, comparison_id: id, sort_order: items.length })
      .select()
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => [...prev, data])
    return data as ComparisonItem
  }

  const updateItem = async (itemId: string, updates: Partial<ComparisonItem>) => {
    const { data, error: err } = await supabase
      .from('comparison_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => prev.map(i => (i.id === itemId ? data : i)))
    return data as ComparisonItem
  }

  const deleteItem = async (itemId: string) => {
    const { error: err } = await supabase.from('comparison_items').delete().eq('id', itemId)
    if (err) throw new Error(err.message)
    setItems(prev => prev.filter(i => i.id !== itemId))
    setQuotes(prev => prev.filter(q => q.item_id !== itemId))
  }

  // ── Suppliers ──────────────────────────────────────────────
  const addSupplier = async (supplierName: string, supplierId?: string) => {
    const { data, error: err } = await supabase
      .from('comparison_suppliers')
      .insert({
        comparison_id: id,
        supplier_name: supplierName,
        supplier_id: supplierId ?? null,
        sort_order: compSuppliers.length,
      })
      .select()
      .single()
    if (err) throw new Error(err.message)
    setCompSuppliers(prev => [...prev, data])
    return data as ComparisonSupplier
  }

  const removeSupplier = async (compSupplierId: string) => {
    const { error: err } = await supabase.from('comparison_suppliers').delete().eq('id', compSupplierId)
    if (err) throw new Error(err.message)
    setCompSuppliers(prev => prev.filter(s => s.id !== compSupplierId))
    setQuotes(prev => prev.filter(q => q.comparison_supplier_id !== compSupplierId))
  }

  // ── Quotes ─────────────────────────────────────────────────
  const upsertQuote = async (itemId: string, compSupplierId: string, unitPrice: number) => {
    const { data, error: err } = await supabase
      .from('comparison_quotes')
      .upsert(
        { comparison_id: id, item_id: itemId, comparison_supplier_id: compSupplierId, unit_price: unitPrice },
        { onConflict: 'item_id,comparison_supplier_id' },
      )
      .select()
      .single()
    if (err) throw new Error(err.message)
    setQuotes(prev => {
      const idx = prev.findIndex(
        q => q.item_id === itemId && q.comparison_supplier_id === compSupplierId,
      )
      return idx >= 0 ? prev.map((q, i) => (i === idx ? data : q)) : [...prev, data]
    })
    return data as ComparisonQuote
  }

  const selectQuote = async (itemId: string, compSupplierId: string) => {
    const itemQuotes = quotes.filter(q => q.item_id === itemId)
    await Promise.all(
      itemQuotes.map(q =>
        supabase
          .from('comparison_quotes')
          .update({ is_selected: q.comparison_supplier_id === compSupplierId })
          .eq('id', q.id),
      ),
    )
    setQuotes(prev =>
      prev.map(q =>
        q.item_id === itemId
          ? { ...q, is_selected: q.comparison_supplier_id === compSupplierId }
          : q,
      ),
    )
  }

  const updateComparison = async (updates: Partial<PurchaseComparison>) => {
    const { data, error: err } = await supabase
      .from('purchase_comparisons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setComparison(data)
    return data as PurchaseComparison
  }

  return {
    comparison, items, compSuppliers, quotes, loading, error,
    refetch: fetchAll,
    addItem, updateItem, deleteItem,
    addSupplier, removeSupplier,
    upsertQuote, selectQuote, updateComparison,
  }
}
