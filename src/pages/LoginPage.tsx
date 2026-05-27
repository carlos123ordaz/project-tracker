import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f8ff 0%, #f0f0ff 100%)',
    }}>
      <div className="card" style={{ width: 360, padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--brand-600)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} width={22} height={22}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, letterSpacing: '-0.02em', marginBottom: 4 }}>Project Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--n-500)' }}>Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 550, color: 'var(--n-700)', marginBottom: 5 }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoFocus
              style={{
                width: '100%', height: 36, padding: '0 10px',
                fontSize: 13, border: '1px solid var(--n-200)',
                borderRadius: 7, background: 'var(--n-0)',
                color: 'var(--n-900)', boxSizing: 'border-box',
                outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--brand-400)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--n-200)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 550, color: 'var(--n-700)', marginBottom: 5 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', height: 36, padding: '0 10px',
                fontSize: 13, border: '1px solid var(--n-200)',
                borderRadius: 7, background: 'var(--n-0)',
                color: 'var(--n-900)', boxSizing: 'border-box',
                outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--brand-400)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--n-200)'}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: 'var(--red-700)', background: 'var(--red-50)',
              border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 36, borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: loading ? 'var(--brand-400)' : 'var(--brand-600)',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .15s', marginTop: 4,
            }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--n-400)', marginTop: 24 }}>
          CORSUSA · Sistema de Gestión de Proyectos
        </p>
      </div>
    </div>
  )
}
