import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const PAGE_SIZE = 25

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
  codigo: string
  edt_grupo: string | null
  partida: string
  unidad: string
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
  categoria: string
  unidad: string | null
  cantidad: number
  precio_unitario: number
  total: number
  created_at: string
}

export function useLibro() {
  const [libros,   setLibros]   = useState<LibroEntry[]>([])
  const [loading,  setLoading]  = useState(true)

  const [partidas,        setPartidas]        = useState<LibroPartida[]>([])
  const [partidasTotal,   setPartidasTotal]   = useState(0)
  const [partidasLoading, setPartidasLoading] = useState(false)

  const [insumos,        setInsumos]        = useState<LibroInsumo[]>([])
  const [insumosTotal,   setInsumosTotal]   = useState(0)
  const [insumosLoading, setInsumosLoading] = useState(false)

  // Track last fetch params so mutations can re-fetch the same view
  const pParamsRef = useRef({ page: 1, search: '', libroFilter: '' })
  const iParamsRef = useRef({ page: 1, search: '', libroFilter: '' })

  const fetchPartidas = useCallback(async (page: number, search: string, libroFilter: string) => {
    pParamsRef.current = { page, search, libroFilter }
    setPartidasLoading(true)
    try {
      let q = supabase
        .from('libro_partidas')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (libroFilter) q = q.eq('libro_nombre', libroFilter)
      if (search) {
        q = q.or(
          `partida.ilike.%${search}%,codigo.ilike.%${search}%,edt_grupo.ilike.%${search}%,libro_nombre.ilike.%${search}%`
        )
      }
      const from = (page - 1) * PAGE_SIZE
      const { data, count } = await q.range(from, from + PAGE_SIZE - 1)
      if (data) setPartidas(data)
      setPartidasTotal(count ?? 0)
    } finally {
      setPartidasLoading(false)
    }
  }, [])

  const fetchInsumos = useCallback(async (page: number, search: string, libroFilter: string) => {
    iParamsRef.current = { page, search, libroFilter }
    setInsumosLoading(true)
    try {
      let q = supabase
        .from('libro_insumos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (libroFilter) q = q.eq('libro_nombre', libroFilter)
      if (search) {
        q = q.or(
          `nombre.ilike.%${search}%,unidad.ilike.%${search}%,libro_nombre.ilike.%${search}%`
        )
      }
      const from = (page - 1) * PAGE_SIZE
      const { data, count } = await q.range(from, from + PAGE_SIZE - 1)
      if (data) setInsumos(data)
      setInsumosTotal(count ?? 0)
    } finally {
      setInsumosLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('libros').select('*').order('nombre').then(({ data }) => { if (data) setLibros(data) }),
      fetchPartidas(1, '', ''),
      fetchInsumos(1, '', ''),
    ]).finally(() => setLoading(false))
  }, [fetchPartidas, fetchInsumos])

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
    const normalized = items.map(i => ({ ...i, codigo: i.codigo ?? '', unidad: i.unidad ?? '' }))
    const seen = new Map<string, typeof normalized[0]>()
    for (const item of normalized) {
      seen.set(`${item.codigo}|${item.unidad}|${item.libro_nombre}`, item)
    }
    const { error } = await supabase
      .from('libro_partidas')
      .upsert([...seen.values()], { onConflict: 'codigo,unidad,libro_nombre', ignoreDuplicates: false })
    if (error) throw error
    const { page, search, libroFilter } = pParamsRef.current
    await fetchPartidas(page, search, libroFilter)
  }, [fetchPartidas])

  const insertInsumos = useCallback(async (items: Omit<LibroInsumo, 'id' | 'created_at'>[]) => {
    if (!items.length) return
    const normalized = items.map(i => ({ ...i, categoria: i.categoria ?? '', unidad: i.unidad ?? '' }))
    const seen = new Map<string, typeof normalized[0]>()
    for (const item of normalized) {
      seen.set(`${item.nombre}|${item.unidad}|${item.libro_nombre}`, item)
    }
    const { error } = await supabase
      .from('libro_insumos')
      .upsert([...seen.values()], { onConflict: 'nombre,unidad,libro_nombre', ignoreDuplicates: false })
    if (error) throw error
    const { page, search, libroFilter } = iParamsRef.current
    await fetchInsumos(page, search, libroFilter)
  }, [fetchInsumos])

  const deletePartida = useCallback(async (id: string) => {
    await supabase.from('libro_partidas').delete().eq('id', id)
    setPartidas(prev => prev.filter(p => p.id !== id))
    setPartidasTotal(prev => Math.max(0, prev - 1))
  }, [])

  const deleteInsumo = useCallback(async (id: string) => {
    await supabase.from('libro_insumos').delete().eq('id', id)
    setInsumos(prev => prev.filter(i => i.id !== id))
    setInsumosTotal(prev => Math.max(0, prev - 1))
  }, [])

  return {
    libros, loading,
    partidas, partidasTotal, partidasLoading, fetchPartidas,
    insumos, insumosTotal, insumosLoading, fetchInsumos,
    insertLibro, insertPartidas, insertInsumos, deletePartida, deleteInsumo,
  }
}
