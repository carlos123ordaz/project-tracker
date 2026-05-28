import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ScheduleTask, ScheduleActual } from '../lib/types'

export function useScheduleEditor(scheduleId: string) {
  const [tasks,   setTasks]   = useState<ScheduleTask[]>([])
  const [actuals, setActuals] = useState<ScheduleActual[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!scheduleId) { setLoading(false); return }
    setLoading(true)
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from('schedule_tasks').select('*').eq('schedule_id', scheduleId),
      supabase.from('schedule_actuals').select('*').eq('schedule_id', scheduleId),
    ])
    setTasks(t ?? [])
    setActuals(a ?? [])
    setLoading(false)
  }, [scheduleId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const upsertTask = async (itemId: string, startDate: string, endDate: string) => {
    const { data } = await supabase
      .from('schedule_tasks')
      .upsert(
        { schedule_id: scheduleId, item_id: itemId, start_date: startDate, end_date: endDate },
        { onConflict: 'schedule_id,item_id' },
      )
      .select()
      .single()
    if (data) {
      const row = data as ScheduleTask
      setTasks(prev => prev.find(t => t.item_id === itemId)
        ? prev.map(t => t.item_id === itemId ? row : t)
        : [...prev, row])
    }
  }

  const deleteTask = async (itemId: string) => {
    await supabase.from('schedule_tasks')
      .delete().eq('schedule_id', scheduleId).eq('item_id', itemId)
    setTasks(prev => prev.filter(t => t.item_id !== itemId))
  }

  const upsertActual = async (itemId: string, periodDate: string, amount: number) => {
    if (amount <= 0) {
      await supabase.from('schedule_actuals')
        .delete().eq('schedule_id', scheduleId).eq('item_id', itemId).eq('period_date', periodDate)
      setActuals(prev => prev.filter(a => !(a.item_id === itemId && a.period_date === periodDate)))
      return
    }
    const { data } = await supabase
      .from('schedule_actuals')
      .upsert(
        { schedule_id: scheduleId, item_id: itemId, period_date: periodDate, executed_amount: amount },
        { onConflict: 'schedule_id,item_id,period_date' },
      )
      .select()
      .single()
    if (data) {
      const row = data as ScheduleActual
      setActuals(prev => prev.find(a => a.item_id === itemId && a.period_date === periodDate)
        ? prev.map(a => (a.item_id === itemId && a.period_date === periodDate) ? row : a)
        : [...prev, row])
    }
  }

  const replaceItemActuals = async (
    itemId: string,
    entries: { periodDate: string; amount: number }[],
  ) => {
    await supabase.from('schedule_actuals')
      .delete().eq('schedule_id', scheduleId).eq('item_id', itemId)
    setActuals(prev => prev.filter(a => a.item_id !== itemId))
    const nonZero = entries.filter(e => e.amount > 0)
    if (nonZero.length === 0) return
    const { data } = await supabase
      .from('schedule_actuals')
      .insert(nonZero.map(e => ({
        schedule_id: scheduleId,
        item_id: itemId,
        period_date: e.periodDate,
        executed_amount: e.amount,
      })))
      .select()
    if (data) setActuals(prev => [...prev, ...(data as ScheduleActual[])])
  }

  return { tasks, actuals, loading, upsertTask, deleteTask, upsertActual, replaceItemActuals }
}
