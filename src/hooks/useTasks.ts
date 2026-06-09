import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { Task } from '../lib/types'

export function useTasks(projectId?: string) {
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('tasks')
      .select('*, project:projects(id, name, color, focus_area, initiative)')
      .order('sort_order')
      .order('number')
      .limit(5000)
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    const { data, error: err } = await query
    if (err) {
      setError(err.message)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => {
    const sameStatus = tasks.filter(t => t.status === task.status)
    const maxOrder   = sameStatus.reduce((m, t) => Math.max(m, t.sort_order ?? 0), 0)
    const taskWithOrder = { ...task, sort_order: maxOrder + 1000 }

    const { data, error: err } = await supabase
      .from('tasks')
      .insert(taskWithOrder)
      .select('*, project:projects(id, name, color, focus_area, initiative)')
      .single()
    if (err) throw new Error(err.message)
    setTasks(prev => [...prev, data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    logAction({ action: 'crear', entityType: 'tarea', entityId: data.id, entityName: data.name })
    return data as Task
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { project: _, created_at: __, updated_at: ___, ...safeUpdates } = updates as Task & { sort_order?: number }
    const { data, error: err } = await supabase
      .from('tasks')
      .update(safeUpdates)
      .eq('id', id)
      .select('*, project:projects(id, name, color, focus_area, initiative)')
      .single()
    if (err) throw new Error(err.message)
    setTasks(prev => prev.map(t => (t.id === id ? data : t)))

    const original = tasks.find(t => t.id === id)
    if (updates.status && original?.status !== updates.status) {
      logAction({ action: 'mover', entityType: 'tarea', entityId: id, entityName: original?.name, details: { from: original?.status, to: updates.status } })
    } else {
      logAction({ action: 'actualizar', entityType: 'tarea', entityId: id, entityName: original?.name })
    }
    return data as Task
  }

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    const { error: err } = await supabase.from('tasks').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setTasks(prev => prev.filter(t => t.id !== id))
    logAction({ action: 'eliminar', entityType: 'tarea', entityId: id, entityName: task?.name })
  }

  // Reorder a task within or across Kanban columns.
  // insertBeforeId = null means append at end of targetStatus column.
  const reorderTask = async (taskId: string, targetStatus: string, insertBeforeId: string | null) => {
    const original = tasks.find(t => t.id === taskId)
    if (!original) return

    // Build the new ordered list for the target column (excluding dragged task)
    let col = tasks
      .filter(t => t.status === targetStatus && t.id !== taskId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    if (insertBeforeId === null) {
      col = [...col, original]
    } else {
      const idx = col.findIndex(t => t.id === insertBeforeId)
      const insertAt = idx === -1 ? col.length : idx
      col = [...col.slice(0, insertAt), original, ...col.slice(insertAt)]
    }

    // Assign new sort_orders spaced by 1000
    const updates = col.map((t, i) => ({ id: t.id, sort_order: i * 1000, status: targetStatus }))

    // Persist to DB concurrently
    await Promise.all(
      updates.map(u => supabase.from('tasks').update({ sort_order: u.sort_order, status: u.status }).eq('id', u.id))
    )

    // Update local state and re-sort
    setTasks(prev => {
      const map = new Map(updates.map(u => [u.id, u]))
      return prev
        .map(t => { const u = map.get(t.id); return u ? { ...t, sort_order: u.sort_order, status: u.status } : t })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    })

    if (original.status !== targetStatus) {
      logAction({ action: 'mover', entityType: 'tarea', entityId: taskId, entityName: original.name, details: { from: original.status, to: targetStatus } })
    }
  }

  return { tasks, loading, error, refetch: fetchTasks, createTask, updateTask, deleteTask, reorderTask }
}
