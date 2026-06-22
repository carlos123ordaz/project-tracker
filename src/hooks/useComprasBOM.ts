import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type ProcesoBOM = 'Fabricación' | 'Compra'
export type EstadoCotBOM = 'COMPRADO' | 'PENDIENTE' | 'EN PROCESO'

export interface ComprasBOMItem {
  id: string
  item: string
  proceso: ProcesoBOM
  tipo: string
  cantidad: string
  descripcion: string
  codigo: string
  material: string
  masa: string
  dxf: string
  comentarios: string
  polimetales: number
  othero: number
  pernos_y_pernos: number
  ducasse: number
  em_metal: number
  imagen: string | null
  estado_cot: EstadoCotBOM
  observaciones: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type ComprasBOMItemInsert = Omit<ComprasBOMItem, 'id' | 'created_at' | 'updated_at'>

export interface ComprasBOMParams {
  page?: number
  pageSize?: number    // 0 = sin paginación (carga todo)
  search?: string
  estado?: EstadoCotBOM | 'TODOS'
  proceso?: ProcesoBOM | 'TODOS'
}

export function useComprasBOM(params?: ComprasBOMParams) {
  const page     = params?.page    ?? 1
  const pageSize = params?.pageSize ?? 0
  const search   = params?.search  ?? ''
  const estado   = params?.estado  ?? 'TODOS'
  const proceso  = params?.proceso ?? 'TODOS'

  const [items, setItems]               = useState<ComprasBOMItem[]>([])
  const [total, setTotal]               = useState(0)
  const [estadoCounts, setEstadoCounts] = useState<Record<string, number>>({})
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // ── Consulta principal ──────────────────────────────────────────────────
    let q = supabase.from('compras_bom').select('*', { count: 'exact' })
    if (search)              q = q.or(`descripcion.ilike.%${search}%,item.ilike.%${search}%,tipo.ilike.%${search}%,material.ilike.%${search}%`)
    if (estado !== 'TODOS')  q = q.eq('estado_cot', estado)
    if (proceso !== 'TODOS') q = q.eq('proceso', proceso)
    q = q.order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (pageSize > 0) q = q.range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error: err, count } = await q
    if (err) { setError(err.message); setLoading(false); return }
    setItems(data ?? [])
    setTotal(count ?? 0)

    // ── Counts por estado (para pills de filtro) — solo en modo paginado ──
    if (pageSize > 0) {
      const base = () => {
        let cq = supabase.from('compras_bom').select('*', { count: 'exact', head: true })
        if (search)              cq = cq.or(`descripcion.ilike.%${search}%,item.ilike.%${search}%,tipo.ilike.%${search}%,material.ilike.%${search}%`)
        if (proceso !== 'TODOS') cq = cq.eq('proceso', proceso)
        return cq
      }
      const [r0, r1, r2, r3] = await Promise.all([
        base(),
        base().eq('estado_cot', 'COMPRADO'),
        base().eq('estado_cot', 'EN PROCESO'),
        base().eq('estado_cot', 'PENDIENTE'),
      ])
      setEstadoCounts({
        TODOS:        r0.count ?? 0,
        COMPRADO:     r1.count ?? 0,
        'EN PROCESO': r2.count ?? 0,
        PENDIENTE:    r3.count ?? 0,
      })
    }

    setLoading(false)
  }, [page, pageSize, search, estado, proceso])

  useEffect(() => { fetchData() }, [fetchData])

  const create = async (input: Omit<ComprasBOMItemInsert, 'sort_order'>) => {
    const { count: rowCount } = await supabase
      .from('compras_bom').select('*', { count: 'exact', head: true })
    const sort_order = rowCount ?? 0
    const { data, error: err } = await supabase
      .from('compras_bom').insert({ ...input, sort_order }).select().single()
    if (err) throw new Error(err.message)
    await fetchData()
    return data as ComprasBOMItem
  }

  const update = async (id: string, updates: Partial<ComprasBOMItemInsert>) => {
    const { data, error: err } = await supabase
      .from('compras_bom').update(updates).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setItems(prev => prev.map(it => it.id === id ? data : it))
    return data as ComprasBOMItem
  }

  const remove = async (id: string) => {
    const { error: err } = await supabase.from('compras_bom').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetchData()
  }

  return { items, total, estadoCounts, loading, error, refetch: fetchData, create, update, remove }
}
