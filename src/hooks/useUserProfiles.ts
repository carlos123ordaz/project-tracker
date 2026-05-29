import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseSignup } from '../lib/supabaseAdmin'
import type { UserProfile, ModulePermission } from '../lib/types'

export function useUserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('user_profiles')
      .select('*')
      .order('sort_order')
    if (err) setError(err.message)
    setProfiles((data as UserProfile[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Crear usuario usando signUp con cliente aislado (no afecta sesión actual)
  const createUser = async (params: {
    email: string
    password: string
    full_name: string
    role: string
    check_in_time: string | null
    check_out_time: string | null
    shift: string
    is_superadmin: boolean
  }) => {
    const { data: authData, error: authErr } = await supabaseSignup.auth.signUp({
      email:    params.email,
      password: params.password,
    })
    if (authErr) throw new Error(authErr.message)
    if (!authData.user) throw new Error('No se pudo crear el usuario en Supabase Auth')

    const userId = authData.user.id

    const { data: profileData, error: profileErr } = await supabase
      .from('user_profiles')
      .upsert({
        id:             userId,
        email:          params.email,
        full_name:      params.full_name,
        role:           params.role,
        check_in_time:  params.check_in_time,
        check_out_time: params.check_out_time,
        shift:          params.shift,
        is_superadmin:  params.is_superadmin,
        sort_order:     profiles.length,
      })
      .select()
      .single()

    if (profileErr) throw new Error(profileErr.message)

    const newProfile = profileData as UserProfile
    setProfiles(prev => [...prev, newProfile])
    return newProfile
  }

  const updateProfile = async (id: string, changes: Partial<UserProfile>) => {
    const { data, error: err } = await supabase
      .from('user_profiles')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const updated = data as UserProfile
    setProfiles(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  // Envía email de reseteo de contraseña (no requiere admin key)
  const sendPasswordReset = async (userId: string) => {
    const profile = profiles.find(p => p.id === userId)
    if (!profile) throw new Error('Usuario no encontrado')
    const { error: err } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: window.location.origin,
    })
    if (err) throw new Error(err.message)
  }

  // Desactivar (soft-delete): no se puede eliminar auth users sin service role key
  const toggleActive = async (id: string, active: boolean) => {
    return updateProfile(id, { is_active: active })
  }

  return {
    profiles, loading, error,
    refetch: fetch,
    createUser, updateProfile,
    sendPasswordReset, toggleActive,
  }
}

export function useModulePermissions(userId: string | null) {
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [loading,     setLoading]     = useState(false)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('module_permissions')
      .select('*')
      .eq('user_id', userId)
    setPermissions((data as ModulePermission[]) || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const upsertPermission = async (module: string, changes: Partial<ModulePermission>) => {
    if (!userId) return
    const existing = permissions.find(p => p.module === module)

    if (existing) {
      const { data, error } = await supabase
        .from('module_permissions')
        .update(changes)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      const updated = data as ModulePermission
      setPermissions(prev => prev.map(p => p.id === existing.id ? updated : p))
    } else {
      const { data, error } = await supabase
        .from('module_permissions')
        .insert({
          user_id: userId, module,
          can_view: false, can_add: false, can_edit: false, can_delete: false,
          ...changes,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      setPermissions(prev => [...prev, data as ModulePermission])
    }
  }

  return { permissions, loading, refetch: fetch, upsertPermission }
}
