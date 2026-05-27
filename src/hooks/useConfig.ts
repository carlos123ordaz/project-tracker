import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface TeamMember {
  id: string
  name: string
  role: string
  email: string | null
  sort_order: number
}

export interface TaskStatus {
  id: string
  name: string
  color: string
  dot_color: string
  sort_order: number
}

export interface TaskPriority {
  id: string
  name: string
  color: string
  sort_order: number
}

export interface TaskType {
  id: string
  name: string
  sort_order: number
}

function useTable<T extends { id: string }>(table: string, orderCol = 'sort_order') {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order(orderCol)
    setItems((data as T[]) || [])
    setLoading(false)
  }, [table, orderCol])

  useEffect(() => { fetch() }, [fetch])

  const create = async (item: Omit<T, 'id'>) => {
    const { data, error } = await supabase.from(table).insert(item as any).select().single()
    if (error) throw new Error(error.message)
    setItems(prev => [...prev, data as T].sort((a: any, b: any) => a.sort_order - b.sort_order))
    return data as T
  }

  const update = async (id: string, changes: Partial<T>) => {
    const { data, error } = await supabase.from(table).update(changes as any).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    setItems(prev => prev.map(i => i.id === id ? data as T : i))
    return data as T
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, refetch: fetch, create, update, remove }
}

export const useTeamMembers  = () => useTable<TeamMember>('team_members')
export const useTaskStatuses = () => useTable<TaskStatus>('task_statuses')
export const useTaskPriorities = () => useTable<TaskPriority>('task_priorities')
export const useTaskTypes    = () => useTable<TaskType>('task_types')
