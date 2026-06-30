import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { AlmacenPedido, AlmacenPedidoItem, AlmacenPedidoEstado } from '../lib/types'

const PEDIDOS_PAGE_SIZE = 50

export function useAlmacenPedidos(estado?: AlmacenPedidoEstado | 'Todos', page?: number, pageSize?: number, search?: string) {
  const [pedidos, setPedidos] = useState<AlmacenPedido[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paginate = page !== undefined
  const currentPage = page ?? 0
  const currentPageSize = pageSize ?? PEDIDOS_PAGE_SIZE

  const fetchPedidos = useCallback(async () => {
    setLoading(true)
    setError(null)
    let q = supabase
      .from('almacen_pedidos')
      .select('*', { count: 'exact' })
      .order('numero', { ascending: false })
    if (estado && estado !== 'Todos') q = q.eq('estado', estado)
    if (search?.trim()) q = q.or(`solicitado_por.ilike.%${search.trim()}%,proveedor_sugerido.ilike.%${search.trim()}%`)
    if (paginate) q = q.range(currentPage * currentPageSize, (currentPage + 1) * currentPageSize - 1)
    const { data, count, error: err } = await q
    if (err) setError(err.message)
    else { setPedidos(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [estado, currentPage, paginate, currentPageSize, search])

  useEffect(() => { fetchPedidos() }, [fetchPedidos])

  const createPedido = async (
    input: Omit<AlmacenPedido, 'id' | 'numero' | 'sort_order' | 'created_at' | 'updated_at'>,
  ) => {
    const { count } = await supabase.from('almacen_pedidos').select('*', { count: 'exact', head: true })
    const { data, error: err } = await supabase
      .from('almacen_pedidos')
      .insert({ ...input, sort_order: count ?? 0 })
      .select()
      .single()
    if (err) throw new Error(err.message)
    await fetchPedidos()
    logAction({ action: 'crear', entityType: 'almacen_pedido', entityId: data.id })
    return data as AlmacenPedido
  }

  const updatePedido = async (id: string, updates: Partial<AlmacenPedido>) => {
    const { data, error: err } = await supabase
      .from('almacen_pedidos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setPedidos(prev => prev.map(p => (p.id === id ? data : p)))
    logAction({ action: 'actualizar', entityType: 'almacen_pedido', entityId: id })
    return data as AlmacenPedido
  }

  const deletePedido = async (id: string) => {
    const { error: err } = await supabase.from('almacen_pedidos').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setPedidos(prev => prev.filter(p => p.id !== id))
    logAction({ action: 'eliminar', entityType: 'almacen_pedido', entityId: id })
  }

  return { pedidos, total, pageSize: currentPageSize, loading, error, refetch: fetchPedidos, createPedido, updatePedido, deletePedido }
}

// ── Detail hook ────────────────────────────────────────────────
export function useAlmacenPedidoDetail(id: string) {
  const [pedido, setPedido] = useState<AlmacenPedido | null>(null)
  const [items, setItems] = useState<AlmacenPedidoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [pedidoRes, itemsRes] = await Promise.all([
      supabase.from('almacen_pedidos').select('*').eq('id', id).single(),
      supabase
        .from('almacen_pedido_items')
        .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual)')
        .eq('pedido_id', id)
        .order('sort_order'),
    ])
    if (pedidoRes.error) { setError(pedidoRes.error.message); setLoading(false); return }
    setPedido(pedidoRes.data)
    setItems(itemsRes.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addItem = async (item: Omit<AlmacenPedidoItem, 'id' | 'pedido_id' | 'sort_order' | 'created_at' | 'equipo'>) => {
    const { data, error: err } = await supabase
      .from('almacen_pedido_items')
      .insert({ ...item, pedido_id: id, sort_order: items.length })
      .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual)')
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => [...prev, data])
    return data as AlmacenPedidoItem
  }

  const updateItem = async (itemId: string, updates: Partial<AlmacenPedidoItem>) => {
    const { data, error: err } = await supabase
      .from('almacen_pedido_items')
      .update(updates)
      .eq('id', itemId)
      .select('*, equipo:almacen_equipos(id,nombre,unidad,stock_actual)')
      .single()
    if (err) throw new Error(err.message)
    setItems(prev => prev.map(it => (it.id === itemId ? data : it)))
    return data as AlmacenPedidoItem
  }

  const removeItem = async (itemId: string) => {
    const { error: err } = await supabase.from('almacen_pedido_items').delete().eq('id', itemId)
    if (err) throw new Error(err.message)
    setItems(prev => prev.filter(it => it.id !== itemId))
  }

  const updatePedido = async (updates: Partial<AlmacenPedido>) => {
    const { data, error: err } = await supabase
      .from('almacen_pedidos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setPedido(data)
    logAction({ action: 'actualizar', entityType: 'almacen_pedido', entityId: id })
    return data as AlmacenPedido
  }

  return { pedido, items, loading, error, refetch: fetchAll, addItem, updateItem, removeItem, updatePedido }
}
