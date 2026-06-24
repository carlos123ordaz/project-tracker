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

        // Handle response from Microsoft redirect (if any)
        const response = await msalInstance.handleRedirectPromise()
        if (response) {
          setMsUser({
            name:    response.account.name  ?? response.account.username,
            email:   response.account.username,
            account: response.account,
          })
          // Restore the page the user was on before the login redirect
          const returnPath = sessionStorage.getItem('ms_login_return')
          if (returnPath && returnPath !== '/') {
            sessionStorage.removeItem('ms_login_return')
            window.history.replaceState(null, '', returnPath)
          }
          setLoading(false)
          return
        }

        // Check for existing cached session
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
      // Save the current path so we can restore it after the redirect
      sessionStorage.setItem('ms_login_return', window.location.pathname + window.location.search)
      await msalInstance.loginRedirect({
        scopes:      LOGIN_SCOPES,
        redirectUri: window.location.origin,
      })
    } catch (e: unknown) {
      setError('No se pudo iniciar sesión con Microsoft. Intenta de nuevo.')
      console.error(e)
    }
  }

  async function signOut() {
    if (!msUser) return
    await msalInstance.logoutRedirect({
      account:               msUser.account,
      postLogoutRedirectUri: window.location.origin,
    })
  }

  return { msUser, loading, error, signIn, signOut }
}
