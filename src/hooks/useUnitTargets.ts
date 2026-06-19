import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface UnitTarget {
  unit_id: string
  monthly_target: number
  annual_target: number
}

// Defaults used when the Supabase table doesn't exist yet or is empty
export const DEFAULT_UNIT_TARGETS: Record<string, UnitTarget> = {
  PROSER: { unit_id: 'PROSER', monthly_target: 100_000, annual_target: 2_000_000 },
  UNAI:   { unit_id: 'UNAI',   monthly_target:  50_000, annual_target:   600_000 },
  UNAP:   { unit_id: 'UNAP',   monthly_target:  50_000, annual_target:   600_000 },
  UNAU:   { unit_id: 'UNAU',   monthly_target:  50_000, annual_target:   600_000 },
  UNEPC:  { unit_id: 'UNEPC',  monthly_target:  50_000, annual_target:   600_000 },
  UNVA:   { unit_id: 'UNVA',   monthly_target:  50_000, annual_target:   600_000 },
}

export interface UseUnitTargetsResult {
  targets: Record<string, UnitTarget>
  loading: boolean
  saving: boolean
  upsert: (unitId: string, monthly: number, annual: number) => Promise<void>
  refetch: () => Promise<void>
}

export function useUnitTargets(): UseUnitTargetsResult {
  const [targets, setTargets] = useState<Record<string, UnitTarget>>(DEFAULT_UNIT_TARGETS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('comercial_unit_targets')
        .select('unit_id, monthly_target, annual_target')
      if (!error && data && data.length > 0) {
        const map: Record<string, UnitTarget> = { ...DEFAULT_UNIT_TARGETS }
        data.forEach(r => {
          map[r.unit_id] = {
            unit_id:        r.unit_id,
            monthly_target: Number(r.monthly_target),
            annual_target:  Number(r.annual_target),
          }
        })
        setTargets(map)
      }
    } catch { /* keep defaults if table missing */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const upsert = useCallback(async (unitId: string, monthly: number, annual: number) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('comercial_unit_targets')
        .upsert(
          { unit_id: unitId, monthly_target: monthly, annual_target: annual, updated_at: new Date().toISOString() },
          { onConflict: 'unit_id' }
        )
      if (!error) {
        setTargets(prev => ({
          ...prev,
          [unitId]: { unit_id: unitId, monthly_target: monthly, annual_target: annual },
        }))
      }
    } catch { /* ignore save error */ }
    setSaving(false)
  }, [])

  return { targets, loading, saving, upsert, refetch: load }
}
