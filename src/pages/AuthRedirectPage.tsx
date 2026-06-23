import { useEffect } from 'react'
import { msalInstance } from '../lib/msal'

export default function AuthRedirectPage() {
  useEffect(() => {
    msalInstance.initialize().then(() => {
      msalInstance.handleRedirectPromise().catch(console.error)
    })
  }, [])
  return null
}
