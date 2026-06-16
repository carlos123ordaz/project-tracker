import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { PersonalTarifa } from '../lib/types'

export function usePersonalTarifas() {
  const [tarifas, setTarifas] = useState<PersonalTarifa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTarifas = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('personal_tarifas')
      .select('*')
      .order('orden', { ascending: true })
    if (err) setError(err.message)
    else setTarifas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTarifas() }, [fetchTarifas])

  const createTarifa = async (
    tarifa: Omit<PersonalTarifa, 'id' | 'created_at'>,
  ) => {
    const { data, error: err } = await supabase
      .from('personal_tarifas')
      .insert(tarifa)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setTarifas(prev => [...prev, data].sort((a, b) => a.orden - b.orden))
    logAction({ action: 'crear', entityType: 'personal_tarifa', entityId: data.id, entityName: data.perfil })
    return data as PersonalTarifa
  }

  const updateTarifa = async (id: string, updates: Partial<PersonalTarifa>) => {
    const { data, error: err } = await supabase
      .from('personal_tarifas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setTarifas(prev => prev.map(t => (t.id === id ? data : t)))
    logAction({ action: 'actualizar', entityType: 'personal_tarifa', entityId: id })
    return data as PersonalTarifa
  }

  const deleteTarifa = async (id: string) => {
    const tarifa = tarifas.find(t => t.id === id)
    const { error: err } = await supabase.from('personal_tarifas').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setTarifas(prev => prev.filter(t => t.id !== id))
    logAction({ action: 'eliminar', entityType: 'personal_tarifa', entityId: id, entityName: tarifa?.perfil })
  }

  return { tarifas, loading, error, createTarifa, updateTarifa, deleteTarifa, refetch: fetchTarifas }
}
