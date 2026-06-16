import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { Cotizacion } from '../lib/types'

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('numero', { ascending: false })
    if (err) setError(err.message)
    else setCotizaciones(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCotizaciones() }, [fetchCotizaciones])

  const createCotizacion = async (
    cotizacion: Omit<Cotizacion, 'id' | 'numero' | 'created_at' | 'updated_at'>,
  ) => {
    const { data, error: err } = await supabase
      .from('cotizaciones')
      .insert(cotizacion)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setCotizaciones(prev => [data, ...prev])
    logAction({ action: 'crear', entityType: 'cotizacion', entityId: data.id, entityName: data.titulo })
    return data as Cotizacion
  }

  const updateCotizacion = async (id: string, updates: Partial<Cotizacion>) => {
    const { data, error: err } = await supabase
      .from('cotizaciones')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setCotizaciones(prev => prev.map(c => (c.id === id ? data : c)))
    logAction({ action: 'actualizar', entityType: 'cotizacion', entityId: id })
    return data as Cotizacion
  }

  const deleteCotizacion = async (id: string) => {
    const cot = cotizaciones.find(c => c.id === id)
    const { error: err } = await supabase.from('cotizaciones').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setCotizaciones(prev => prev.filter(c => c.id !== id))
    logAction({ action: 'eliminar', entityType: 'cotizacion', entityId: id, entityName: cot?.titulo })
  }

  return { cotizaciones, loading, error, createCotizacion, updateCotizacion, deleteCotizacion, refetch: fetchCotizaciones }
}
