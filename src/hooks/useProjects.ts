import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { Project } from '../lib/types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('projects')
      .select('*')
      .order('name')
    if (err) {
      setError(err.message)
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    let created_by: string | null = null
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle()
      created_by = profile?.full_name || user.email || null
    }
    const { data, error: err } = await supabase
      .from('projects')
      .insert({ ...project, created_by })
      .select()
      .single()
    if (err) throw new Error(err.message)
    setProjects(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    logAction({ action: 'crear', entityType: 'proyecto', entityId: data.id, entityName: data.name })
    return data as Project
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data, error: err } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setProjects(prev => prev.map(p => (p.id === id ? data : p)))
    const original = projects.find(p => p.id === id)
    logAction({ action: 'actualizar', entityType: 'proyecto', entityId: id, entityName: original?.name })
    return data as Project
  }

  const deleteProject = async (id: string) => {
    const project = projects.find(p => p.id === id)
    const { error: err } = await supabase.from('projects').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setProjects(prev => prev.filter(p => p.id !== id))
    logAction({ action: 'eliminar', entityType: 'proyecto', entityId: id, entityName: project?.name })
  }

  return { projects, loading, error, refetch: fetchProjects, createProject, updateProject, deleteProject }
}
