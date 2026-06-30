import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AlmacenUbicacion, AlmacenStockUbicacion } from '../lib/types'

// ── Catálogo de ubicaciones ────────────────────────────────────
export function useAlmacenUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState<AlmacenUbicacion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUbicaciones = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('almacen_ubicaciones')
      .select('*')
      .order('sort_order')
      .order('nombre')
    setUbicaciones(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUbicaciones() }, [fetchUbicaciones])

  const createUbicacion = async (input: Omit<AlmacenUbicacion, 'id' | 'sort_order' | 'created_at'>) => {
    const { count } = await supabase.from('almacen_ubicaciones').select('*', { count: 'exact', head: true })
    const { data, error } = await supabase
      .from('almacen_ubicaciones')
      .insert({ ...input, sort_order: count ?? 0 })
      .select()
      .single()
    if (error) throw new Error(error.message)
    await fetchUbicaciones()
    return data as AlmacenUbicacion
  }

  const updateUbicacion = async (id: string, updates: Partial<AlmacenUbicacion>) => {
    const { data, error } = await supabase
      .from('almacen_ubicaciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setUbicaciones(prev => prev.map(u => (u.id === id ? data : u)))
    return data as AlmacenUbicacion
  }

  const deleteUbicacion = async (id: string) => {
    const { error } = await supabase.from('almacen_ubicaciones').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setUbicaciones(prev => prev.filter(u => u.id !== id))
  }

  const toggleActiva = (id: string, activa: boolean) => updateUbicacion(id, { activa })

  return { ubicaciones, loading, refetch: fetchUbicaciones, createUbicacion, updateUbicacion, deleteUbicacion, toggleActiva }
}

// ── Stock de un equipo por ubicación ──────────────────────────
export function useAlmacenStockUbicacion(equipoId?: string) {
  const [stock, setStock] = useState<AlmacenStockUbicacion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchStock = useCallback(async () => {
    if (!equipoId) { setStock([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('almacen_stock_ubicacion')
      .select('*, ubicacion:almacen_ubicaciones(id,codigo,nombre,tipo)')
      .eq('equipo_id', equipoId)
      .gt('stock_actual', 0)
      .order('stock_actual', { ascending: false })
    setStock(data || [])
    setLoading(false)
  }, [equipoId])

  useEffect(() => { fetchStock() }, [fetchStock])

  return { stock, loading, refetch: fetchStock }
}

// ── Stock de una ubicación (todos sus equipos) ─────────────────
export function useStockPorUbicacion(ubicacionId?: string) {
  const [stock, setStock] = useState<AlmacenStockUbicacion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchStock = useCallback(async () => {
    if (!ubicacionId) { setStock([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('almacen_stock_ubicacion')
      .select('*, equipo:almacen_equipos(id,codigo,nombre,unidad,categoria)')
      .eq('ubicacion_id', ubicacionId)
      .gt('stock_actual', 0)
      .order('stock_actual', { ascending: false })
    setStock(data || [])
    setLoading(false)
  }, [ubicacionId])

  useEffect(() => { fetchStock() }, [fetchStock])

  return { stock, loading, refetch: fetchStock }
}

// ── Helpers exportados para usar en otros hooks ────────────────
export async function upsertStockUbicacion(
  equipoId: string,
  ubicacionId: string,
  delta: number,
): Promise<void> {
  const { data: existing } = await supabase
    .from('almacen_stock_ubicacion')
    .select('stock_actual')
    .eq('equipo_id', equipoId)
    .eq('ubicacion_id', ubicacionId)
    .maybeSingle()

  const newStock = Math.max(0, (existing?.stock_actual ?? 0) + delta)
  await supabase
    .from('almacen_stock_ubicacion')
    .upsert(
      { equipo_id: equipoId, ubicacion_id: ubicacionId, stock_actual: newStock, updated_at: new Date().toISOString() },
      { onConflict: 'equipo_id,ubicacion_id' },
    )
}
