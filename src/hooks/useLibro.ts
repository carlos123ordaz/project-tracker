import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface LibroEntry {
  id: string
  nombre: string
  descripcion: string | null
  anio: number | null
  fuente: string | null
  created_at: string
}

export interface LibroPartida {
  id: string
  source_file: string | null
  libro_nombre: string
  codigo: string | null
  edt_grupo: string | null
  partida: string
  unidad: string | null
  precio_unitario: number
  mano_de_obra: number
  material: number
  equipo: number
  created_at: string
}

export interface LibroInsumo {
  id: string
  source_file: string | null
  libro_nombre: string
  nombre: string
  unidad: string | null
  cantidad: number
  precio_unitario: number
  total: number
  created_at: string
}

export function useLibro() {
  const [libros,   setLibros]   = useState<LibroEntry[]>([])
  const [partidas, setPartidas] = useState<LibroPartida[]>([])
  const [insumos,  setInsumos]  = useState<LibroInsumo[]>([])
  const [loading,  setLoading]  = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [lRes, pRes, iRes] = await Promise.all([
        supabase.from('libros').select('*').order('nombre'),
        supabase.from('libro_partidas').select('*').order('created_at', { ascending: false }),
        supabase.from('libro_insumos').select('*').order('created_at', { ascending: false }),
      ])
      if (lRes.data) setLibros(lRes.data)
      if (pRes.data) setPartidas(pRes.data)
      if (iRes.data) setInsumos(iRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const insertLibro = useCallback(async (nombre: string) => {
    const { data, error } = await supabase
      .from('libros')
      .insert({ nombre })
      .select()
      .single()
    if (error) throw error
    setLibros(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  }, [])

  const insertPartidas = useCallback(async (items: Omit<LibroPartida, 'id' | 'created_at'>[]) => {
    if (!items.length) return
    const { error } = await supabase
      .from('libro_partidas')
      .upsert(items, { onConflict: 'codigo,unidad,libro_nombre', ignoreDuplicates: false })
    if (error) throw error
    const { data } = await supabase.from('libro_partidas').select('*').order('created_at', { ascending: false })
    if (data) setPartidas(data)
  }, [])

  const insertInsumos = useCallback(async (items: Omit<LibroInsumo, 'id' | 'created_at'>[]) => {
    if (!items.length) return
    const { error } = await supabase
      .from('libro_insumos')
      .upsert(items, { onConflict: 'nombre,unidad,libro_nombre', ignoreDuplicates: false })
    if (error) throw error
    const { data } = await supabase.from('libro_insumos').select('*').order('created_at', { ascending: false })
    if (data) setInsumos(data)
  }, [])

  const deletePartida = useCallback(async (id: string) => {
    await supabase.from('libro_partidas').delete().eq('id', id)
    setPartidas(prev => prev.filter(p => p.id !== id))
  }, [])

  const deleteInsumo = useCallback(async (id: string) => {
    await supabase.from('libro_insumos').delete().eq('id', id)
    setInsumos(prev => prev.filter(i => i.id !== id))
  }, [])

  return {
    libros, partidas, insumos, loading,
    fetchAll, insertLibro, insertPartidas, insertInsumos, deletePartida, deleteInsumo,
  }
}
