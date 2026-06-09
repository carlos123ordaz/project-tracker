import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { Supplier } from '../lib/types'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('suppliers')
      .select('*')
      .order('sort_order')
      .order('name')
    if (err) setError(err.message)
    else setSuppliers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const createSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error: err } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    logAction({ action: 'crear', entityType: 'proveedor', entityId: data.id, entityName: data.name })
    return data as Supplier
  }

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const { data, error: err } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setSuppliers(prev => prev.map(s => (s.id === id ? data : s)))
    logAction({ action: 'actualizar', entityType: 'proveedor', entityId: id })
    return data as Supplier
  }

  const deleteSupplier = async (id: string) => {
    const supplier = suppliers.find(s => s.id === id)
    const { error: err } = await supabase.from('suppliers').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setSuppliers(prev => prev.filter(s => s.id !== id))
    logAction({ action: 'eliminar', entityType: 'proveedor', entityId: id, entityName: supplier?.name })
  }

  return {
    suppliers, loading, error,
    refetch: fetchSuppliers,
    createSupplier, updateSupplier, deleteSupplier,
  }
}
