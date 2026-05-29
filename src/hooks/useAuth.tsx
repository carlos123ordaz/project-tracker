import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserProfile, ModulePermission } from '../lib/types'

interface AuthCtx {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  permissions: ModulePermission[]
  loading: boolean
  accountDisabled: boolean
  isSuperAdmin: boolean
  hasPermission: (module: string, action: 'view' | 'add' | 'edit' | 'delete') => boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,            setUser]            = useState<User | null>(null)
  const [session,         setSession]         = useState<Session | null>(null)
  const [profile,         setProfile]         = useState<UserProfile | null>(null)
  const [permissions,     setPermissions]     = useState<ModulePermission[]>([])
  const [loading,         setLoading]         = useState(true)
  const [accountDisabled, setAccountDisabled] = useState(false)

  const loadProfile = useCallback(async (authUser: User) => {
    try {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      let row = existing as UserProfile | null

      if (!row) {
        const { data: created } = await supabase
          .from('user_profiles')
          .insert({
            id:        authUser.id,
            email:     authUser.email ?? '',
            full_name: (authUser.user_metadata?.full_name as string) ?? '',
          })
          .select()
          .maybeSingle()
        row = created as UserProfile | null
      }

      if (row && !row.is_active) {
        setAccountDisabled(true)
        setProfile(null)
        setPermissions([])
        return
      }

      setAccountDisabled(false)
      setProfile(row)

      if (row) {
        const { data: perms } = await supabase
          .from('module_permissions')
          .select('*')
          .eq('user_id', authUser.id)
        setPermissions((perms as ModulePermission[]) || [])
      }
    } catch {
      // Fallo silencioso — continuar sin perfil
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) loadProfile(session.user)
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user)
      } else {
        setProfile(null)
        setPermissions([])
        setAccountDisabled(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user)
  }, [user, loadProfile])

  const isSuperAdmin = profile?.is_superadmin === true

  const hasPermission = useCallback((module: string, action: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    if (isSuperAdmin) return true
    const perm = permissions.find(p => p.module === module)
    if (!perm) return false
    if (action === 'view')   return perm.can_view
    if (action === 'add')    return perm.can_add
    if (action === 'edit')   return perm.can_edit
    if (action === 'delete') return perm.can_delete
    return false
  }, [isSuperAdmin, permissions])

  return (
    <Ctx.Provider value={{
      user, session, profile, permissions, loading,
      accountDisabled, isSuperAdmin, hasPermission,
      signIn, signOut, refreshProfile,
    }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
