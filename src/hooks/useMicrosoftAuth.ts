import { useState, useEffect } from 'react'
import { msalInstance, LOGIN_SCOPES } from '../lib/msal'
import type { AccountInfo } from '@azure/msal-browser'

export interface MSUser {
  name:  string
  email: string
  account: AccountInfo
}

// Current page URL without hash — used as redirectUri so Microsoft
// sends the user back to the same form after authentication.
function currentRedirectUri() {
  return window.location.origin + window.location.pathname
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
      await msalInstance.loginRedirect({
        scopes:      LOGIN_SCOPES,
        redirectUri: currentRedirectUri(),
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
      postLogoutRedirectUri: currentRedirectUri(),
    })
  }

  return { msUser, loading, error, signIn, signOut }
}
