import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type {
  AlmacenRecepcion, AlmacenRecepcionItem,
  AlmacenDespacho, AlmacenDespachoItem,
  AlmacenEquipo,
} from '../lib/types'
import { upsertStockUbicacion } from './useAlmacenUbicaciones'

// ── Recepciones ────────────────────────────────────────────────
const RECEPCIONES_PAGE_SIZE = 50

export function useAlmacenRecepciones(opts?: { estado?: string; page?: number; pageSize?: number }) {
  const [recepciones, setRecepciones] = useState<AlmacenRecepcion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paginate = opts?.page !== undefined
  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? RECEPCIONES_PAGE_SIZE

  const fetchRecepciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    let q = supabase
      .from('almacen_recepciones')
      .select('*, pedido:almacen_pedidos(id,numero,solicitado_por)', { count: 'exact' })
      .order('numero', { ascending: false })
    if (opts?.estado && opts.estado !== 'Todos') q = q.eq('estado', opts.estado)
    if (paginate) q = q.range(page * pageSize, (page + 1) * pageSize - 1)
    const { data, count, error: err } = await q
    if (err) setError(err.message)
    else { setRecepciones(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [opts?.estado, page, paginate, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchRecepciones() }, [fetchRecepciones])

  const createRecepcion = async (
    input: Omit<AlmacenRecepcion, 'id' | 'numero' | 'sort_order' | 'created_at' | 'updated_at' | 'pedido'>,
  ) => {
    const { count } = await supabase.from('almacen_recepciones').select('*', { count: 'exact', head: true })
    const { data, error: err } = await supabase
      .from('almacen_recepciones')
      .insert({ ...input, sort_order: count ?? 0 })
      .select()
      .single()
    if (err) throw new Error(err.message)
    await fetchRecepciones()
    logAction({ action: 'crear', entityType: 'almacen_recepcion', entityId: data.id })
    return data as AlmacenRecepcion
  }

  const updateRecepcion = async (id: string, updates: Partial<AlmacenRecepcion>) => {
    const { data, error: err } = await supabase
      .from('almacen_recepciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setRecepciones(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)))
    logAction({ action: 'actualizar', entityType: 'almacen_recepcion', entityId: id })
    return data as AlmacenRecepcion
  }

  const deleteRecepcion = async (id: string) => {
    const { error: err } = await supabase.from('almacen_recepciones').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setRecepciones(prev => prev.filter(r => r.id !== id))
    logAction({ action: 'eliminar', entityType: 'almacen_recepcion', entityId: id })
  }

  return { recepciones, total, pageSize, loading, error, refetch: fetchRecepciones, createRecepcion, updateRecepcion, deleteRecepcion }
}

// ── Recepcion Detail ───────────────────────────────────────────
export function useAlmacenRecepcionDetail(id: string) {
  const [recepcion, setRecepcion] = useState<AlmacenRecepcion | null>(null)
  const [items, setItems] = useState<AlmacenRecepcionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [recRes, itemsRes] = await Promise.all([
      supabase
        .from('almacen_recepciones')
        .select('*, pedido:almacen_pedidos(id,numero,solicitado_por)')
        .eq('id', id)
        .single(),
      supabase
        .from('almacen_recepcion_items')
        .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual), ubicacion_destino:almacen_ubicaciones!ubicacion_destino_id(id,nombre,tipo)')
        .eq('recepcion_id', id)
        .order('sort_order'),
    ])
    if (recRes.error) { setError(recRes.error.message); setLoading(false); return }
    setRecepcion(recRes.data)
    setItems(itemsRes.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addItem = async (
    item: Omit<AlmacenRecepcionItem, 'id' | 'recepcion_id' | 'sort_order' | 'created_at' | 'equipo' | 'ubicacion_destino'>,
  ) => {
    const { data, error: err } = await supabase
      .from('almacen_recepcion_items')
      .insert({ ...item, recepcion_id: id, sort_order: items.length })
      .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual), ubicacion_destino:almacen_ubicaciones!ubicacion_destino_id(id,nombre,tipo)')
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => [...prev, data])
    return data as AlmacenRecepcionItem
  }

  const updateItem = async (itemId: string, updates: Partial<AlmacenRecepcionItem>) => {
    const { data, error: err } = await supabase
      .from('almacen_recepcion_items')
      .update(updates)
      .eq('id', itemId)
      .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual), ubicacion_destino:almacen_ubicaciones!ubicacion_destino_id(id,nombre,tipo)')
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => prev.map(it => (it.id === itemId ? data : it)))
    return data as AlmacenRecepcionItem
  }

  const removeItem = async (itemId: string) => {
    const { error: err } = await supabase.from('almacen_recepcion_items').delete().eq('id', itemId)
    if (err) throw new Error(err.message)
    setItems(prev => prev.filter(it => it.id !== itemId))
  }

  const updateRecepcion = async (updates: Partial<AlmacenRecepcion>) => {
    const { data, error: err } = await supabase
      .from('almacen_recepciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setRecepcion(prev => prev ? { ...prev, ...data } : data)
    logAction({ action: 'actualizar', entityType: 'almacen_recepcion', entityId: id })
    return data as AlmacenRecepcion
  }

  /** Completa la recepción: actualiza stock total, stock por ubicación y registra kardex */
  const completarRecepcion = async () => {
    if (!recepcion) throw new Error('Recepción no cargada')
    const fecha = new Date().toISOString()

    for (const item of items) {
      if (!item.equipo_id || !item.equipo) continue
      const equipo = item.equipo as AlmacenEquipo
      const stockNuevo = equipo.stock_actual + item.cantidad

      // Actualizar stock total + registrar kardex
      await Promise.all([
        supabase.from('almacen_equipos').update({ stock_actual: stockNuevo }).eq('id', item.equipo_id),
        supabase.from('almacen_kardex').insert({
          equipo_id: item.equipo_id,
          tipo: 'Entrada',
          cantidad: item.cantidad,
          stock_anterior: equipo.stock_actual,
          stock_nuevo: stockNuevo,
          motivo: 'Recepción logística',
          referencia_tipo: 'recepcion',
          referencia_id: id,
          observacion: item.observacion ?? null,
          ubicacion_destino_id: item.ubicacion_destino_id ?? null,
          fecha,
        }),
      ])

      // Actualizar stock en la ubicación destino si fue especificada
      if (item.ubicacion_destino_id) {
        await upsertStockUbicacion(item.equipo_id, item.ubicacion_destino_id, +item.cantidad)
      }
    }

    return updateRecepcion({ estado: 'Completada' })
  }

  return {
    recepcion, items, loading, error,
    refetch: fetchAll, addItem, updateItem, removeItem,
    updateRecepcion, completarRecepcion,
  }
}

// ── Despachos ──────────────────────────────────────────────────
const DESPACHOS_PAGE_SIZE = 50

export function useAlmacenDespachos(opts?: { estado?: string; page?: number; pageSize?: number }) {
  const [despachos, setDespachos] = useState<AlmacenDespacho[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paginate = opts?.page !== undefined
  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? DESPACHOS_PAGE_SIZE

  const fetchDespachos = useCallback(async () => {
    setLoading(true)
    setError(null)
    let q = supabase
      .from('almacen_despachos')
      .select('*', { count: 'exact' })
      .order('numero', { ascending: false })
    if (opts?.estado && opts.estado !== 'Todos') q = q.eq('estado', opts.estado)
    if (paginate) q = q.range(page * pageSize, (page + 1) * pageSize - 1)
    const { data, count, error: err } = await q
    if (err) setError(err.message)
    else { setDespachos(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [opts?.estado, page, paginate, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDespachos() }, [fetchDespachos])

  const createDespacho = async (
    input: Omit<AlmacenDespacho, 'id' | 'numero' | 'sort_order' | 'created_at' | 'updated_at'>,
  ) => {
    const { count } = await supabase.from('almacen_despachos').select('*', { count: 'exact', head: true })
    const { data, error: err } = await supabase
      .from('almacen_despachos')
      .insert({ ...input, sort_order: count ?? 0 })
      .select()
      .single()
    if (err) throw new Error(err.message)
    await fetchDespachos()
    logAction({ action: 'crear', entityType: 'almacen_despacho', entityId: data.id })
    return data as AlmacenDespacho
  }

  const updateDespacho = async (id: string, updates: Partial<AlmacenDespacho>) => {
    const { data, error: err } = await supabase
      .from('almacen_despachos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setDespachos(prev => prev.map(d => (d.id === id ? data : d)))
    logAction({ action: 'actualizar', entityType: 'almacen_despacho', entityId: id })
    return data as AlmacenDespacho
  }

  const deleteDespacho = async (id: string) => {
    const { error: err } = await supabase.from('almacen_despachos').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setDespachos(prev => prev.filter(d => d.id !== id))
    logAction({ action: 'eliminar', entityType: 'almacen_despacho', entityId: id })
  }

  return { despachos, total, pageSize, loading, error, refetch: fetchDespachos, createDespacho, updateDespacho, deleteDespacho }
}

// ── Despacho Detail ────────────────────────────────────────────
export function useAlmacenDespachoDetail(id: string) {
  const [despacho, setDespacho] = useState<AlmacenDespacho | null>(null)
  const [items, setItems] = useState<AlmacenDespachoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [despRes, itemsRes] = await Promise.all([
      supabase.from('almacen_despachos').select('*').eq('id', id).single(),
      supabase
        .from('almacen_despacho_items')
        .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual), ubicacion_origen:almacen_ubicaciones!ubicacion_origen_id(id,nombre,tipo)')
        .eq('despacho_id', id)
        .order('sort_order'),
    ])
    if (despRes.error) { setError(despRes.error.message); setLoading(false); return }
    setDespacho(despRes.data)
    setItems(itemsRes.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addItem = async (
    item: Omit<AlmacenDespachoItem, 'id' | 'despacho_id' | 'sort_order' | 'created_at' | 'equipo' | 'ubicacion_origen'>,
  ) => {
    const { data, error: err } = await supabase
      .from('almacen_despacho_items')
      .insert({ ...item, despacho_id: id, sort_order: items.length })
      .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual), ubicacion_origen:almacen_ubicaciones!ubicacion_origen_id(id,nombre,tipo)')
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => [...prev, data])
    return data as AlmacenDespachoItem
  }

  const updateItem = async (itemId: string, updates: Partial<AlmacenDespachoItem>) => {
    const { data, error: err } = await supabase
      .from('almacen_despacho_items')
      .update(updates)
      .eq('id', itemId)
      .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual), ubicacion_origen:almacen_ubicaciones!ubicacion_origen_id(id,nombre,tipo)')
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => prev.map(it => (it.id === itemId ? data : it)))
    return data as AlmacenDespachoItem
  }

  const removeItem = async (itemId: string) => {
    const { error: err } = await supabase.from('almacen_despacho_items').delete().eq('id', itemId)
    if (err) throw new Error(err.message)
    setItems(prev => prev.filter(it => it.id !== itemId))
  }

  const updateDespacho = async (updates: Partial<AlmacenDespacho>) => {
    const { data, error: err } = await supabase
      .from('almacen_despachos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setDespacho(data)
    logAction({ action: 'actualizar', entityType: 'almacen_despacho', entityId: id })
    return data as AlmacenDespacho
  }

  /** Confirma el despacho: descuenta stock total, stock por ubicación y registra kardex */
  const confirmarDespacho = async () => {
    if (!despacho) throw new Error('Despacho no cargado')
    const fecha = new Date().toISOString()

    for (const item of items) {
      if (!item.equipo_id || !item.equipo) continue
      const equipo = item.equipo as AlmacenEquipo
      const stockNuevo = Math.max(0, equipo.stock_actual - item.cantidad)

      // Actualizar stock total + registrar kardex
      await Promise.all([
        supabase.from('almacen_equipos').update({ stock_actual: stockNuevo }).eq('id', item.equipo_id),
        supabase.from('almacen_kardex').insert({
          equipo_id: item.equipo_id,
          tipo: 'Salida',
          cantidad: item.cantidad,
          stock_anterior: equipo.stock_actual,
          stock_nuevo: stockNuevo,
          motivo: 'Despacho',
          referencia_tipo: 'despacho',
          referencia_id: id,
          observacion: item.observacion ?? null,
          ubicacion_origen_id: item.ubicacion_origen_id ?? null,
          fecha,
        }),
      ])

      // Descontar de la ubicación origen si fue especificada
      if (item.ubicacion_origen_id) {
        await upsertStockUbicacion(item.equipo_id, item.ubicacion_origen_id, -item.cantidad)
      }
    }

    return updateDespacho({ estado: 'Despachado' })
  }

  return {
    despacho, items, loading, error,
    refetch: fetchAll, addItem, updateItem, removeItem,
    updateDespacho, confirmarDespacho,
  }
}
