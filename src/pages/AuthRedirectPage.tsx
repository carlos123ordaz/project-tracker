import { useEffect } from 'react'
import { msalInstance } from '../lib/msal'

export default function AuthRedirectPage() {
  useEffect(() => {
    msalInstance.initialize()
      .then(() => msalInstance.handleRedirectPromise())
      .catch(console.error)
      .finally(() => {
        // Close popup if MSAL hasn't done it automatically
        if (window.opener) window.close()
      })
  }, [])
  return null
}
