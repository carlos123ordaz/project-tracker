import { useState, useEffect } from 'react'

const API_BASE    = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const STORAGE_KEY = 'ms_user'

export interface MSUser {
  name:  string
  email: string
}

export function useMicrosoftAuth() {
  const [msUser,  setMsUser]  = useState<MSUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const name     = params.get('ms_name')
    const email    = params.get('ms_email')
    const msError  = params.get('ms_error')

    if (name && email) {
      // Recién llegamos del backend con los datos del usuario
      const user: MSUser = { name, email }
      setMsUser(user)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      // Limpiar params de la URL sin recargar la página
      params.delete('ms_name')
      params.delete('ms_email')
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    } else if (msError) {
      setError('No se pudo iniciar sesión con Microsoft. Intenta de nuevo.')
      params.delete('ms_error')
      window.history.replaceState(null, '', window.location.pathname)
    } else {
      // Revisar sesión guardada
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try { setMsUser(JSON.parse(stored)) } catch { localStorage.removeItem(STORAGE_KEY) }
      }
    }
    setLoading(false)
  }, [])

  function signIn() {
    setError('')
    const returnPath = window.location.pathname + window.location.search
    window.location.href = `${API_BASE}/auth/microsoft/login?return_path=${encodeURIComponent(returnPath)}`
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY)
    setMsUser(null)
  }

  return { msUser, loading, error, signIn, signOut }
}
