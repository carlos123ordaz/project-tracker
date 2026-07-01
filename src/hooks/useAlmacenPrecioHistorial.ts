import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface PrecioHistorial {
  id: string
  codigo: string
  equipo_id: string | null
  descripcion: string | null
  proveedor_id: string | null
  proveedor_nombre: string | null
  precio_unitario: number
  moneda: string
  cantidad: number | null
  orden_compra: string | null
  fecha_orden: string | null
  fecha_entrega: string | null
  created_at: string
}

export function useAlmacenPrecioHistorial(equipoId: string | null) {
  const [historial, setHistorial] = useState<PrecioHistorial[]>([])
  const [loading, setLoading]     = useState(false)

  const fetchHistorial = async () => {
    if (!equipoId) { setHistorial([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('almacen_precio_historial')
      .select('*')
      .eq('equipo_id', equipoId)
      .order('fecha_orden', { ascending: false })
    setHistorial((data as PrecioHistorial[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchHistorial() }, [equipoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const addPrecio = async (
    input: Omit<PrecioHistorial, 'id' | 'created_at'>,
  ) => {
    const { data, error } = await supabase
      .from('almacen_precio_historial')
      .insert({ ...input, equipo_id: equipoId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setHistorial(prev => [data as PrecioHistorial, ...prev])
    return data as PrecioHistorial
  }

  return { historial, loading, refetch: fetchHistorial, addPrecio }
}
