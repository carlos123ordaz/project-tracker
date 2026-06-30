import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { AlmacenEquipo, AlmacenKardex, KardexTipo } from '../lib/types'
import { upsertStockUbicacion } from './useAlmacenUbicaciones'

const EQUIPOS_PAGE_SIZE = 50

export function useAlmacenEquipos(
  search?: string,
  opts?: { estado?: string; bajoStock?: boolean; page?: number; pageSize?: number },
) {
  const [equipos, setEquipos] = useState<AlmacenEquipo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paginate = opts?.page !== undefined
  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? EQUIPOS_PAGE_SIZE

  const fetchEquipos = useCallback(async () => {
    setLoading(true)
    setError(null)
    let q = supabase
      .from('almacen_equipos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search) q = q.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%,categoria.ilike.%${search}%`)
    if (opts?.estado && opts.estado !== 'Todos') q = q.eq('estado', opts.estado)
    // bajoStock needs column comparison → handled client-side after fetch
    if (paginate && !opts?.bajoStock) {
      q = q.range(page * pageSize, (page + 1) * pageSize - 1)
    }
    const { data, count, error: err } = await q
    if (err) { setError(err.message); setLoading(false); return }
    let result = (data || []) as AlmacenEquipo[]
    if (opts?.bajoStock) result = result.filter(e => e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo)
    setEquipos(result)
    setTotal(opts?.bajoStock ? result.length : (count ?? 0))
    setLoading(false)
  }, [search, opts?.estado, opts?.bajoStock, page, paginate, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchEquipos() }, [fetchEquipos])

  const createEquipo = async (input: Omit<AlmacenEquipo, 'id' | 'sort_order' | 'created_at' | 'updated_at'>) => {
    const { count } = await supabase.from('almacen_equipos').select('*', { count: 'exact', head: true })
    const { data, error: err } = await supabase
      .from('almacen_equipos')
      .insert({ ...input, sort_order: count ?? 0 })
      .select()
      .single()
    if (err) throw new Error(err.message)
    const equipo = data as AlmacenEquipo

    // Si tiene stock inicial y ubicación, registrar en WMS + kardex
    if (equipo.stock_actual > 0 && equipo.ubicacion) {
      const { data: ubiData } = await supabase
        .from('almacen_ubicaciones')
        .select('id')
        .eq('nombre', equipo.ubicacion)
        .eq('activa', true)
        .maybeSingle()

      if (ubiData?.id) {
        await Promise.all([
          upsertStockUbicacion(equipo.id, ubiData.id, equipo.stock_actual),
          supabase.from('almacen_kardex').insert({
            equipo_id: equipo.id,
            tipo: 'Entrada',
            cantidad: equipo.stock_actual,
            stock_anterior: 0,
            stock_nuevo: equipo.stock_actual,
            motivo: 'Stock inicial',
            referencia_tipo: 'manual',
            ubicacion_destino_id: ubiData.id,
            fecha: new Date().toISOString(),
          }),
        ])
      }
    }

    await fetchEquipos()
    logAction({ action: 'crear', entityType: 'almacen_equipo', entityId: equipo.id, entityName: equipo.nombre })
    return equipo
  }

  const updateEquipo = async (id: string, updates: Partial<AlmacenEquipo>) => {
    const { data, error: err } = await supabase
      .from('almacen_equipos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setEquipos(prev => prev.map(e => (e.id === id ? data : e)))
    logAction({ action: 'actualizar', entityType: 'almacen_equipo', entityId: id })
    return data as AlmacenEquipo
  }

  const deleteEquipo = async (id: string) => {
    const equipo = equipos.find(e => e.id === id)
    const { error: err } = await supabase.from('almacen_equipos').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setEquipos(prev => prev.filter(e => e.id !== id))
    logAction({ action: 'eliminar', entityType: 'almacen_equipo', entityId: id, entityName: equipo?.nombre })
  }

  return { equipos, total, pageSize, loading, error, refetch: fetchEquipos, createEquipo, updateEquipo, deleteEquipo }
}

// ── Kardex hook ────────────────────────────────────────────────
const KARDEX_PAGE_SIZE = 100

export function useAlmacenKardex(
  equipoId?: string,
  opts?: { tipo?: string; desde?: string; hasta?: string; search?: string; page?: number; pageSize?: number },
) {
  const [movimientos, setMovimientos] = useState<AlmacenKardex[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? KARDEX_PAGE_SIZE

  const fetchKardex = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('almacen_kardex')
      .select('*, equipo:almacen_equipos(id,nombre,unidad), ubicacion_origen:almacen_ubicaciones!ubicacion_origen_id(id,nombre), ubicacion_destino:almacen_ubicaciones!ubicacion_destino_id(id,nombre)', { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (equipoId) query = query.eq('equipo_id', equipoId)
    if (opts?.tipo && opts.tipo !== 'Todos') query = query.eq('tipo', opts.tipo)
    if (opts?.desde) query = query.gte('fecha', opts.desde)
    if (opts?.hasta) query = query.lte('fecha', opts.hasta + 'T23:59:59')
    if (opts?.search?.trim()) {
      const s = opts.search.trim()
      query = query.or(`motivo.ilike.%${s}%,observacion.ilike.%${s}%`)
    }
    query = query.range(page * pageSize, (page + 1) * pageSize - 1)
    const { data, count, error: err } = await query
    if (err) setError(err.message)
    else { setMovimientos(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [equipoId, opts?.tipo, opts?.desde, opts?.hasta, opts?.search, page, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchKardex() }, [fetchKardex])

  const addMovimiento = async (
    equipo: AlmacenEquipo,
    tipo: KardexTipo,
    cantidad: number,
    motivo: string,
    observacion?: string,
    referenciaId?: string,
    referenciaTipo?: string,
    ubicacionOrigenId?: string,
    ubicacionDestinoId?: string,
  ) => {
    const stockAnterior = equipo.stock_actual
    const fecha = new Date().toISOString()

    // ── Transferencia: mueve entre ubicaciones, total sin cambio ─
    if (tipo === 'Transferencia') {
      if (ubicacionOrigenId)  await upsertStockUbicacion(equipo.id, ubicacionOrigenId,  -cantidad)
      if (ubicacionDestinoId) await upsertStockUbicacion(equipo.id, ubicacionDestinoId, +cantidad)
      await supabase.from('almacen_kardex').insert({
        equipo_id: equipo.id, tipo, cantidad,
        stock_anterior: stockAnterior, stock_nuevo: stockAnterior,
        motivo, referencia_tipo: referenciaTipo ?? null, referencia_id: referenciaId ?? null,
        observacion: observacion ?? null,
        ubicacion_origen_id:  ubicacionOrigenId  ?? null,
        ubicacion_destino_id: ubicacionDestinoId ?? null,
        fecha,
      })
      await fetchKardex()
      return
    }

    // ── Entrada / Salida / Ajuste ─────────────────────────────────
    const stockNuevo = tipo === 'Entrada'
      ? stockAnterior + cantidad
      : tipo === 'Salida'
        ? stockAnterior - cantidad
        : cantidad // Ajuste: valor = nuevo stock total

    const cantidadReal = tipo === 'Ajuste' ? Math.abs(stockNuevo - stockAnterior) : cantidad

    // Actualizar stock en la ubicación correspondiente
    if (ubicacionDestinoId && tipo === 'Entrada')
      await upsertStockUbicacion(equipo.id, ubicacionDestinoId, +cantidad)
    if (ubicacionOrigenId && tipo === 'Salida')
      await upsertStockUbicacion(equipo.id, ubicacionOrigenId, -cantidad)
    if (ubicacionOrigenId && tipo === 'Ajuste') {
      const delta = stockNuevo - stockAnterior
      await upsertStockUbicacion(equipo.id, ubicacionOrigenId, delta)
    }

    const { data, error: err } = await supabase
      .from('almacen_kardex')
      .insert({
        equipo_id: equipo.id,
        tipo,
        cantidad: cantidadReal,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo,
        referencia_tipo: referenciaTipo ?? null,
        referencia_id: referenciaId ?? null,
        observacion: observacion ?? null,
        ubicacion_origen_id:  ubicacionOrigenId  ?? null,
        ubicacion_destino_id: ubicacionDestinoId ?? null,
        fecha,
      })
      .select()
      .single()
    if (err) throw new Error(err.message)

    // Actualizar stock total en el equipo
    await supabase.from('almacen_equipos').update({ stock_actual: stockNuevo }).eq('id', equipo.id)

    await fetchKardex()
    return data as AlmacenKardex
  }

  return { movimientos, total, pageSize, loading, error, refetch: fetchKardex, addMovimiento }
}
