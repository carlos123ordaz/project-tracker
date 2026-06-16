import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type {
  Cotizacion, CotizacionDisciplina, CotizacionSeccion, CotizacionPartida,
  PersonalTarifa, CotizacionSegmento, PartidaTipo,
} from '../lib/types'

// ── Tariff calculation ────────────────────────────────────────────────────────
export function calcularTarifa(
  perfil: PersonalTarifa,
  segmento: CotizacionSegmento,
  tipo_cambio: number,
): number {
  const sueldoMensual =
    segmento === 'A' ? perfil.sueldo_seg_a
    : segmento === 'B' ? perfil.sueldo_seg_b
    : perfil.sueldo_seg_c

  const sueldoDiaPen = (sueldoMensual * perfil.factor_empresa) / 22
  return tipo_cambio > 0 ? sueldoDiaPen / tipo_cambio : 0
}

// ── Totals helpers ────────────────────────────────────────────────────────────
export function calcPrecioParcial(partida: CotizacionPartida): number {
  return partida.metrado * partida.precio_unitario
}

export function calcSubtotalSeccion(
  secciones: CotizacionSeccion[],
  partidas: CotizacionPartida[],
  seccionId: string,
): number {
  return partidas
    .filter(p => p.seccion_id === seccionId)
    .reduce((acc, p) => acc + calcPrecioParcial(p), 0)
}

export function calcCostoDirecto(
  disciplina: CotizacionDisciplina,
  secciones: CotizacionSeccion[],
  partidas: CotizacionPartida[],
): number {
  const seccionesDisciplina = secciones.filter(s => s.disciplina_id === disciplina.id)
  return seccionesDisciplina.reduce(
    (acc, s) => acc + calcSubtotalSeccion(secciones, partidas, s.id),
    0,
  )
}

export function calcPrecioVenta(
  costoDirecto: number,
  imprevistosPct: number,
  margenPct: number,
): number {
  const withImprevistos = costoDirecto * (1 + imprevistosPct / 100)
  const divisor = 1 - margenPct / 100
  return divisor > 0 ? withImprevistos / divisor : withImprevistos
}

// ── Main editor hook ──────────────────────────────────────────────────────────
export function useCotizacionEditor(id: string) {
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [disciplinas, setDisciplinas] = useState<CotizacionDisciplina[]>([])
  const [secciones, setSecciones] = useState<CotizacionSeccion[]>([])
  const [partidas, setPartidas] = useState<CotizacionPartida[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [cotRes, discRes, secRes, partRes] = await Promise.all([
      supabase.from('cotizaciones').select('*').eq('id', id).single(),
      supabase.from('cotizacion_disciplinas').select('*').eq('cotizacion_id', id).order('orden'),
      supabase.from('cotizacion_secciones').select('*').order('orden'),
      supabase
        .from('cotizacion_partidas')
        .select('*, perfil:perfil_id(*)') // join to personal_tarifas via perfil_id
        .order('orden'),
    ])

    if (cotRes.error) { setError(cotRes.error.message); setLoading(false); return }
    setCotizacion(cotRes.data)

    const discIds = (discRes.data || []).map((d: CotizacionDisciplina) => d.id)
    setDisciplinas(discRes.data || [])

    const filteredSecciones = (secRes.data || []).filter(
      (s: CotizacionSeccion) => discIds.includes(s.disciplina_id),
    )
    setSecciones(filteredSecciones)

    const secIds = filteredSecciones.map((s: CotizacionSeccion) => s.id)
    const filteredPartidas = (partRes.data || []).filter(
      (p: CotizacionPartida) => secIds.includes(p.seccion_id),
    )
    setPartidas(filteredPartidas)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Cotizacion ────────────────────────────────────────────────────────────
  const updateCotizacion = async (updates: Partial<Cotizacion>) => {
    setSaving(true)
    const { data, error: err } = await supabase
      .from('cotizaciones')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    setSaving(false)
    if (err) throw new Error(err.message)
    setCotizacion(data)
    logAction({ action: 'actualizar', entityType: 'cotizacion', entityId: id })
    return data as Cotizacion
  }

  // ── Disciplinas ───────────────────────────────────────────────────────────
  const createDisciplina = async (disciplina: Omit<CotizacionDisciplina, 'id' | 'created_at'>) => {
    const { data, error: err } = await supabase
      .from('cotizacion_disciplinas')
      .insert(disciplina)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setDisciplinas(prev => [...prev, data].sort((a, b) => a.orden - b.orden))
    return data as CotizacionDisciplina
  }

  const updateDisciplina = async (discId: string, updates: Partial<CotizacionDisciplina>) => {
    const { data, error: err } = await supabase
      .from('cotizacion_disciplinas')
      .update(updates)
      .eq('id', discId)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setDisciplinas(prev => prev.map(d => (d.id === discId ? data : d)))
    return data as CotizacionDisciplina
  }

  const deleteDisciplina = async (discId: string) => {
    const { error: err } = await supabase.from('cotizacion_disciplinas').delete().eq('id', discId)
    if (err) throw new Error(err.message)
    setDisciplinas(prev => prev.filter(d => d.id !== discId))
    const seccionIds = secciones.filter(s => s.disciplina_id === discId).map(s => s.id)
    setSecciones(prev => prev.filter(s => s.disciplina_id !== discId))
    setPartidas(prev => prev.filter(p => !seccionIds.includes(p.seccion_id)))
  }

  // ── Secciones ─────────────────────────────────────────────────────────────
  const createSeccion = async (seccion: Omit<CotizacionSeccion, 'id' | 'created_at'>) => {
    const { data, error: err } = await supabase
      .from('cotizacion_secciones')
      .insert(seccion)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setSecciones(prev => [...prev, data].sort((a, b) => a.orden - b.orden))
    return data as CotizacionSeccion
  }

  const updateSeccion = async (secId: string, updates: Partial<CotizacionSeccion>) => {
    const { data, error: err } = await supabase
      .from('cotizacion_secciones')
      .update(updates)
      .eq('id', secId)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setSecciones(prev => prev.map(s => (s.id === secId ? data : s)))
    return data as CotizacionSeccion
  }

  const deleteSeccion = async (secId: string) => {
    const { error: err } = await supabase.from('cotizacion_secciones').delete().eq('id', secId)
    if (err) throw new Error(err.message)
    setSecciones(prev => prev.filter(s => s.id !== secId))
    setPartidas(prev => prev.filter(p => p.seccion_id !== secId))
  }

  // ── Partidas ──────────────────────────────────────────────────────────────
  const createPartida = async (partida: Omit<CotizacionPartida, 'id' | 'created_at' | 'updated_at' | 'perfil'>) => {
    const { perfil: _p, ...insertData } = partida as any
    const { data, error: err } = await supabase
      .from('cotizacion_partidas')
      .insert(insertData)
      .select('*, perfil:perfil_id(*)')
      .single()
    if (err) throw new Error(err.message)
    setPartidas(prev => [...prev, data].sort((a, b) => a.orden - b.orden))
    return data as CotizacionPartida
  }

  const updatePartida = async (partId: string, updates: Partial<CotizacionPartida>) => {
    const { perfil: _p, ...updateData } = updates as any
    const { data, error: err } = await supabase
      .from('cotizacion_partidas')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', partId)
      .select('*, perfil:perfil_id(*)')
      .single()
    if (err) throw new Error(err.message)
    setPartidas(prev => prev.map(p => (p.id === partId ? data : p)))
    return data as CotizacionPartida
  }

  const deletePartida = async (partId: string) => {
    const { error: err } = await supabase.from('cotizacion_partidas').delete().eq('id', partId)
    if (err) throw new Error(err.message)
    setPartidas(prev => prev.filter(p => p.id !== partId))
  }

  // ── Local optimistic update for inline editing ─────────────────────────────
  const setPartidaLocal = (partId: string, updates: Partial<CotizacionPartida>) => {
    setPartidas(prev => prev.map(p => (p.id === partId ? { ...p, ...updates } : p)))
  }

  return {
    cotizacion, disciplinas, secciones, partidas,
    loading, error, saving,
    refetch: fetchAll,
    updateCotizacion,
    createDisciplina, updateDisciplina, deleteDisciplina,
    createSeccion, updateSeccion, deleteSeccion,
    createPartida, updatePartida, deletePartida,
    setPartidaLocal,
    // calculation helpers (re-exported for use in components)
    calcPrecioParcial,
    calcSubtotalSeccion: (secId: string) => calcSubtotalSeccion(secciones, partidas, secId),
    calcCostoDirecto: (disc: CotizacionDisciplina) => calcCostoDirecto(disc, secciones, partidas),
    calcPrecioVenta,
    calcularTarifa,
  }
}
