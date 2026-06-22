import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type Prioridad = 'ALTO' | 'MEDIO' | 'BAJO'
export type StatusFinal = 'CULMINADO' | 'EN PROCESO' | 'PENDIENTE'

export interface SeguimientoTarea {
  id: string
  solicitante: string
  tarea: string
  prioridad: Prioridad
  responsable: string
  asignado: string | null
  vence: string | null
  status: number
  status_final: StatusFinal
  nota: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type SeguimientoTareaInsert = Omit<SeguimientoTarea, 'id' | 'created_at' | 'updated_at'>

export interface SeguimientoParams {
  page?: number
  pageSize?: number    // 0 = sin paginación (carga todo)
  search?: string
  status?: StatusFinal | 'TODOS'
  prioridad?: Prioridad | 'TODAS'
}

export function useSeguimientoGestion(params?: SeguimientoParams) {
  const page      = params?.page      ?? 1
  const pageSize  = params?.pageSize  ?? 0
  const search    = params?.search    ?? ''
  const status    = params?.status    ?? 'TODOS'
  const prioridad = params?.prioridad ?? 'TODAS'

  const [tareas, setTareas]           = useState<SeguimientoTarea[]>([])
  const [total, setTotal]             = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // ── Consulta principal ──────────────────────────────────────────────────
    let q = supabase.from('compras_seguimiento').select('*', { count: 'exact' })
    if (search)                q = q.or(`solicitante.ilike.%${search}%,tarea.ilike.%${search}%,nota.ilike.%${search}%`)
    if (status !== 'TODOS')    q = q.eq('status_final', status)
    if (prioridad !== 'TODAS') q = q.eq('prioridad', prioridad)
    q = q.order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (pageSize > 0) q = q.range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error: err, count } = await q
    if (err) { setError(err.message); setLoading(false); return }
    setTareas(data ?? [])
    setTotal(count ?? 0)

    // ── Counts por estado (para pills de filtro) — solo en modo paginado ──
    if (pageSize > 0) {
      const base = () => {
        let cq = supabase.from('compras_seguimiento').select('*', { count: 'exact', head: true })
        if (search)                cq = cq.or(`solicitante.ilike.%${search}%,tarea.ilike.%${search}%,nota.ilike.%${search}%`)
        if (prioridad !== 'TODAS') cq = cq.eq('prioridad', prioridad)
        return cq
      }
      const [r0, r1, r2, r3] = await Promise.all([
        base(),
        base().eq('status_final', 'CULMINADO'),
        base().eq('status_final', 'EN PROCESO'),
        base().eq('status_final', 'PENDIENTE'),
      ])
      setStatusCounts({
        TODOS:        r0.count ?? 0,
        CULMINADO:    r1.count ?? 0,
        'EN PROCESO': r2.count ?? 0,
        PENDIENTE:    r3.count ?? 0,
      })
    }

    setLoading(false)
  }, [page, pageSize, search, status, prioridad])

  useEffect(() => { fetchData() }, [fetchData])

  const create = async (input: Omit<SeguimientoTareaInsert, 'sort_order'>) => {
    const { count: rowCount } = await supabase
      .from('compras_seguimiento').select('*', { count: 'exact', head: true })
    const sort_order = rowCount ?? 0
    const { data, error: err } = await supabase
      .from('compras_seguimiento').insert({ ...input, sort_order }).select().single()
    if (err) throw new Error(err.message)
    await fetchData()
    return data as SeguimientoTarea
  }

  const update = async (id: string, updates: Partial<SeguimientoTareaInsert>) => {
    const { data, error: err } = await supabase
      .from('compras_seguimiento').update(updates).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setTareas(prev => prev.map(t => t.id === id ? data : t))
    return data as SeguimientoTarea
  }

  const remove = async (id: string) => {
    const { error: err } = await supabase.from('compras_seguimiento').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetchData()
  }

  return { tareas, total, statusCounts, loading, error, refetch: fetchData, create, update, remove }
}
