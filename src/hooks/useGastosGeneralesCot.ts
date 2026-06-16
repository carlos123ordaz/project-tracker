import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { GastoGeneral } from '../lib/types'

export function useGastosGeneralesCot(cotizacionId: string) {
  const [gastos, setGastos] = useState<GastoGeneral[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchGastos = useCallback(async () => {
    if (!cotizacionId) return
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('cotizacion_gastos_generales')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .order('categoria')
      .order('orden')
    if (error) {
      setFetchError(error.message)
      console.error('[useGastosGeneralesCot]', error.message)
    } else {
      setGastos(data || [])
    }
    setLoading(false)
  }, [cotizacionId])

  useEffect(() => { fetchGastos() }, [fetchGastos])

  const createGasto = async (
    cotId: string,
    data: Omit<GastoGeneral, 'id' | 'created_at'>,
  ) => {
    setSaving(true)
    const { data: row, error } = await supabase
      .from('cotizacion_gastos_generales')
      .insert({ ...data, cotizacion_id: cotId })
      .select()
      .single()
    setSaving(false)
    if (error) throw new Error(error.message)
    setGastos(prev => [...prev, row as GastoGeneral].sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria)
      return a.orden - b.orden
    }))
    return row as GastoGeneral
  }

  const updateGasto = async (id: string, updates: Partial<GastoGeneral>) => {
    setSaving(true)
    const { data: row, error } = await supabase
      .from('cotizacion_gastos_generales')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    setSaving(false)
    if (error) throw new Error(error.message)
    setGastos(prev => prev.map(g => g.id === id ? (row as GastoGeneral) : g))
    return row as GastoGeneral
  }

  const deleteGasto = async (id: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('cotizacion_gastos_generales')
      .delete()
      .eq('id', id)
    setSaving(false)
    if (error) throw new Error(error.message)
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  const totalGG = useMemo(() =>
    gastos.reduce((sum, g) => sum + (g.tiempo_pct * g.cantidad * g.mensual_usd), 0),
    [gastos],
  )

  return {
    gastos,
    loading,
    saving,
    fetchError,
    fetchGastos,
    createGasto,
    updateGasto,
    deleteGasto,
    totalGG,
  }
}
