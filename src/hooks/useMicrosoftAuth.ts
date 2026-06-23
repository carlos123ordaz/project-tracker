import { useState, useEffect } from 'react'
import { msalInstance, LOGIN_SCOPES } from '../lib/msal'
import type { AccountInfo } from '@azure/msal-browser'

export interface MSUser {
  name:  string
  email: string
  account: AccountInfo
}

export function useMicrosoftAuth() {
  const [msUser,   setMsUser]   = useState<MSUser | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    async function init() {
      try {
        await msalInstance.initialize()

        // Handle redirect response (if any)
        await msalInstance.handleRedirectPromise()

        // Check for existing session
        const accounts = msalInstance.getAllAccounts()
        if (accounts.length > 0) {
          const account = accounts[0]
          setMsUser({
            name:    account.name  ?? account.username,
            email:   account.username,
            account,
          })
        }
      } catch (e) {
        console.error('MSAL init error', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function signIn() {
    setError('')
    try {
      const result = await msalInstance.loginPopup({
        scopes:      LOGIN_SCOPES,
        prompt:      'select_account',
        redirectUri: `${window.location.origin}/auth-redirect`,
      })
      setMsUser({
        name:    result.account.name  ?? result.account.username,
        email:   result.account.username,
        account: result.account,
      })
    } catch (e: unknown) {
      // User cancelled the popup — not an error worth showing
      if ((e as { errorCode?: string }).errorCode !== 'user_cancelled') {
        setError('No se pudo iniciar sesión con Microsoft. Intenta de nuevo.')
      }
    }
  }

  async function signOut() {
    if (!msUser) return
    await msalInstance.logoutPopup({
      account:     msUser.account,
      postLogoutRedirectUri: `${window.location.origin}/auth-redirect`,
    })
    setMsUser(null)
  }

  return { msUser, loading, error, signIn, signOut }
}
