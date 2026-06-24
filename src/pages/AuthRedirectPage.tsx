import { useEffect } from 'react'
import { msalInstance } from '../lib/msal'

export default function AuthRedirectPage() {
  useEffect(() => {
    msalInstance.initialize()
      .then(() => msalInstance.handleRedirectPromise())
      .catch(console.error)
      .finally(() => {
        if (window.opener) {
          window.close()
          return
        }
        const returnPath = sessionStorage.getItem('ms_login_return') ?? '/'
        sessionStorage.removeItem('ms_login_return')
        window.location.replace(returnPath)
      })
  }, [])
  return null
}
