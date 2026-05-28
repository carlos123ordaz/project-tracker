import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Schedule, PeriodType } from '../lib/types'

export interface ScheduleWithBudget extends Schedule {
  budget?: { name: string; client: string; currency: string }
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<ScheduleWithBudget[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('schedules')
      .select('*, budget:budgets(name, client, currency)')
      .order('created_at', { ascending: false })
    setSchedules((data ?? []) as ScheduleWithBudget[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createSchedule = async (payload: {
    budget_id: string; name: string
    start_date: string; end_date: string; period_type: PeriodType
  }): Promise<ScheduleWithBudget | null> => {
    const { data } = await supabase
      .from('schedules')
      .insert(payload)
      .select('*, budget:budgets(name, client, currency)')
      .single()
    if (data) {
      const row = data as ScheduleWithBudget
      setSchedules(prev => [row, ...prev])
      return row
    }
    return null
  }

  const updateSchedule = async (id: string, patch: Partial<Pick<Schedule, 'name' | 'start_date' | 'end_date' | 'period_type'>>) => {
    const { data } = await supabase
      .from('schedules')
      .update(patch)
      .eq('id', id)
      .select('*, budget:budgets(name, client, currency)')
      .single()
    if (data) setSchedules(prev => prev.map(s => s.id === id ? (data as ScheduleWithBudget) : s))
  }

  const deleteSchedule = async (id: string) => {
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  return { schedules, loading, createSchedule, updateSchedule, deleteSchedule }
}
