import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CashFlowEgreso, CashFlowIngreso } from '../lib/types'

function normalizePeriodos(raw: unknown, n: number): number[] {
  const arr = Array.isArray(raw) ? (raw as number[]) : []
  const result = [...arr]
  while (result.length < n) result.push(0)
  return result
}

export function useCashFlowCot(cotizacionId: string, numPeriodos: number) {
  const [egresos, setEgresos] = useState<CashFlowEgreso[]>([])
  const [ingresos, setIngresos] = useState<CashFlowIngreso[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(async () => {
    if (!cotizacionId) return
    setLoading(true)
    setFetchError(null)

    const [egRes, inRes] = await Promise.all([
      supabase.from('cotizacion_cashflow_egresos').select('*').eq('cotizacion_id', cotizacionId).order('orden'),
      supabase.from('cotizacion_cashflow_ingresos').select('*').eq('cotizacion_id', cotizacionId).order('orden'),
    ])

    if (egRes.error) { setFetchError(egRes.error.message); setLoading(false); return }
    if (inRes.error) { setFetchError(inRes.error.message); setLoading(false); return }

    setEgresos((egRes.data ?? []).map(r => ({ ...r, periodos: normalizePeriodos(r.periodos, numPeriodos) })))
    setIngresos((inRes.data ?? []).map(r => ({ ...r, periodos: normalizePeriodos(r.periodos, numPeriodos) })))
    setLoading(false)
  }, [cotizacionId, numPeriodos])

  useEffect(() => { fetch_() }, [fetch_])

  // ── EGRESOS CRUD ────────────────────────────────────────────────────────────
  const addEgreso = async (descripcion: string) => {
    setSaving(true)
    const periodos = Array(numPeriodos).fill(0)
    const { data, error } = await supabase
      .from('cotizacion_cashflow_egresos')
      .insert({ cotizacion_id: cotizacionId, descripcion, periodos, orden: egresos.length })
      .select().single()
    setSaving(false)
    if (error) throw new Error(error.message)
    setEgresos(prev => [...prev, { ...data, periodos: normalizePeriodos(data.periodos, numPeriodos) }])
  }

  const updateEgresoCell = async (id: string, periodoIdx: number, valor: number) => {
    const egreso = egresos.find(e => e.id === id)
    if (!egreso) return
    const newPeriodos = [...egreso.periodos]
    newPeriodos[periodoIdx] = valor
    setEgresos(prev => prev.map(e => e.id === id ? { ...e, periodos: newPeriodos } : e))
    await supabase.from('cotizacion_cashflow_egresos').update({ periodos: newPeriodos }).eq('id', id)
  }

  const updateEgresoDesc = async (id: string, descripcion: string) => {
    setEgresos(prev => prev.map(e => e.id === id ? { ...e, descripcion } : e))
    await supabase.from('cotizacion_cashflow_egresos').update({ descripcion }).eq('id', id)
  }

  const deleteEgreso = async (id: string) => {
    setEgresos(prev => prev.filter(e => e.id !== id))
    await supabase.from('cotizacion_cashflow_egresos').delete().eq('id', id)
  }

  // ── INGRESOS CRUD ───────────────────────────────────────────────────────────
  const addIngreso = async (descripcion: string, porcentaje = 0) => {
    setSaving(true)
    const periodos = Array(numPeriodos).fill(0)
    const { data, error } = await supabase
      .from('cotizacion_cashflow_ingresos')
      .insert({ cotizacion_id: cotizacionId, descripcion, porcentaje, periodos, orden: ingresos.length })
      .select().single()
    setSaving(false)
    if (error) throw new Error(error.message)
    setIngresos(prev => [...prev, { ...data, periodos: normalizePeriodos(data.periodos, numPeriodos) }])
  }

  const updateIngresoCell = async (id: string, periodoIdx: number, valor: number) => {
    const ingreso = ingresos.find(i => i.id === id)
    if (!ingreso) return
    const newPeriodos = [...ingreso.periodos]
    newPeriodos[periodoIdx] = valor
    setIngresos(prev => prev.map(i => i.id === id ? { ...i, periodos: newPeriodos } : i))
    await supabase.from('cotizacion_cashflow_ingresos').update({ periodos: newPeriodos }).eq('id', id)
  }

  const updateIngresoDesc = async (id: string, descripcion: string) => {
    setIngresos(prev => prev.map(i => i.id === id ? { ...i, descripcion } : i))
    await supabase.from('cotizacion_cashflow_ingresos').update({ descripcion }).eq('id', id)
  }

  const updateIngresoPct = async (id: string, porcentaje: number) => {
    setIngresos(prev => prev.map(i => i.id === id ? { ...i, porcentaje } : i))
    await supabase.from('cotizacion_cashflow_ingresos').update({ porcentaje }).eq('id', id)
  }

  const deleteIngreso = async (id: string) => {
    setIngresos(prev => prev.filter(i => i.id !== id))
    await supabase.from('cotizacion_cashflow_ingresos').delete().eq('id', id)
  }

  return {
    egresos, ingresos, loading, fetchError, saving,
    addEgreso, updateEgresoCell, updateEgresoDesc, deleteEgreso,
    addIngreso, updateIngresoCell, updateIngresoDesc, updateIngresoPct, deleteIngreso,
  }
}
