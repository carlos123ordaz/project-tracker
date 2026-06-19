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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <svg viewBox="0 0 243.2 55.7" height={40} width={Math.round(243.2 * (40 / 55.7))} xmlns="http://www.w3.org/2000/svg" aria-label="CORSUSA">
              <style>{`.lp-st0{fill:#0047BA}.lp-st1{fill:#0047BA}.lp-st2{fill:#2F7DE1}`}</style>
              <g>
                <g>
                  <g>
                    <path className="lp-st0" d="M85.6,40.3c-1.8,0-3.5-0.3-5-1c-1.5-0.6-2.9-1.5-4-2.6c-1.1-1.1-2-2.4-2.6-3.9c-0.6-1.5-1-3.1-1-4.8v-0.1c0-1.7,0.3-3.3,1-4.8c0.6-1.5,1.5-2.8,2.6-4c1.1-1.1,2.5-2,4-2.7c1.6-0.7,3.3-1,5.2-1c1.1,0,2.2,0.1,3.1,0.3c0.9,0.2,1.8,0.4,2.6,0.8c0.8,0.3,1.5,0.7,2.1,1.2c0.7,0.5,1.3,1,1.8,1.5L92.1,23c-1-0.8-1.9-1.5-2.9-2c-1-0.5-2.1-0.7-3.4-0.7c-1,0-2,0.2-2.9,0.6c-0.9,0.4-1.6,0.9-2.3,1.6c-0.6,0.7-1.1,1.5-1.5,2.4c-0.4,0.9-0.5,1.9-0.5,2.9v0.1c0,1,0.2,2,0.5,2.9c0.4,0.9,0.8,1.7,1.5,2.4c0.6,0.7,1.4,1.2,2.3,1.6c0.9,0.4,1.8,0.6,2.9,0.6c1.4,0,2.6-0.3,3.6-0.8c1-0.5,1.9-1.2,2.9-2.1l3.4,3.4c-0.6,0.7-1.3,1.3-2,1.8c-0.7,0.5-1.4,1-2.2,1.4c-0.8,0.4-1.7,0.7-2.7,0.9S86.8,40.3,85.6,40.3z"/>
                    <path className="lp-st0" d="M110.7,40.3c-1.9,0-3.6-0.3-5.2-1c-1.6-0.7-3-1.5-4.1-2.6c-1.2-1.1-2.1-2.4-2.7-3.9c-0.6-1.5-1-3.1-1-4.8v-0.1c0-1.7,0.3-3.3,1-4.8c0.7-1.5,1.6-2.8,2.7-4c1.2-1.1,2.5-2,4.2-2.7c1.6-0.7,3.4-1,5.3-1c1.9,0,3.6,0.3,5.2,1c1.6,0.7,3,1.5,4.1,2.6c1.2,1.1,2.1,2.4,2.7,3.9s1,3.1,1,4.8v0.1c0,1.7-0.3,3.3-1,4.8c-0.7,1.5-1.6,2.8-2.7,4c-1.2,1.1-2.5,2-4.2,2.7C114.4,39.9,112.6,40.3,110.7,40.3z M110.8,35.4c1.1,0,2.1-0.2,3-0.6c0.9-0.4,1.7-0.9,2.3-1.6c0.6-0.7,1.1-1.5,1.5-2.4c0.4-0.9,0.5-1.9,0.5-2.9v-0.1c0-1-0.2-2-0.5-2.9c-0.4-0.9-0.9-1.7-1.5-2.4c-0.7-0.7-1.5-1.2-2.4-1.6c-0.9-0.4-1.9-0.6-3-0.6c-1.1,0-2.1,0.2-3,0.6c-0.9,0.4-1.7,0.9-2.3,1.6c-0.6,0.7-1.2,1.5-1.5,2.4c-0.4,0.9-0.5,1.9-0.5,2.9v0.1c0,1,0.2,2,0.5,2.9c0.4,0.9,0.9,1.7,1.5,2.4c0.7,0.7,1.5,1.2,2.4,1.6C108.7,35.2,109.7,35.4,110.8,35.4z"/>
                    <path className="lp-st0" d="M127.3,15.8h11.3c3.1,0,5.5,0.8,7.2,2.4c1.4,1.4,2.1,3.2,2.1,5.5v0.1c0,1.9-0.5,3.5-1.5,4.8c-1,1.2-2.2,2.1-3.8,2.7l6,8.6h-6.3l-5.3-7.7h-4.3v7.7h-5.4V15.8z M138.3,27.5c1.3,0,2.4-0.3,3.1-0.9c0.7-0.6,1.1-1.4,1.1-2.5V24c0-1.1-0.4-2-1.1-2.6c-0.8-0.6-1.8-0.9-3.1-0.9h-5.4v6.9H138.3z"/>
                    <path className="lp-st0" d="M160.2,40.2c-1.9,0-3.7-0.3-5.5-0.9c-1.8-0.6-3.4-1.6-4.9-2.9l3.2-3.7c1.1,0.9,2.3,1.6,3.5,2.1c1.2,0.5,2.5,0.8,3.9,0.8c1.1,0,2-0.2,2.6-0.6c0.6-0.4,0.9-1,0.9-1.7v-0.1c0-0.3-0.1-0.6-0.2-0.9c-0.1-0.3-0.4-0.5-0.7-0.7c-0.4-0.2-0.9-0.5-1.5-0.7c-0.6-0.2-1.5-0.5-2.5-0.7c-1.2-0.3-2.4-0.6-3.4-1c-1-0.4-1.9-0.8-2.6-1.4c-0.7-0.5-1.2-1.2-1.6-2c-0.4-0.8-0.6-1.8-0.6-3v-0.1c0-1.1,0.2-2.1,0.6-3c0.4-0.9,1-1.6,1.8-2.3c0.8-0.6,1.7-1.1,2.7-1.5c1.1-0.3,2.2-0.5,3.5-0.5c1.8,0,3.5,0.3,5,0.8c1.5,0.5,2.9,1.3,4.2,2.3l-2.8,4c-1.1-0.7-2.2-1.3-3.2-1.7c-1.1-0.4-2.1-0.6-3.2-0.6c-1.1,0-1.8,0.2-2.4,0.6c-0.5,0.4-0.8,0.9-0.8,1.5v0.1c0,0.4,0.1,0.7,0.2,1c0.2,0.3,0.4,0.5,0.8,0.8c0.4,0.2,0.9,0.4,1.6,0.7c0.7,0.2,1.6,0.4,2.6,0.7c1.2,0.3,2.4,0.7,3.3,1.1c1,0.4,1.8,0.9,2.5,1.4c0.7,0.6,1.2,1.2,1.5,2c0.3,0.8,0.5,1.7,0.5,2.7v0.1c0,1.2-0.2,2.3-0.7,3.2c-0.4,0.9-1.1,1.7-1.9,2.3c-0.8,0.6-1.7,1.1-2.8,1.4C162.8,40,161.6,40.2,160.2,40.2z"/>
                    <path className="lp-st0" d="M183,40.2c-3.3,0-5.9-0.9-7.8-2.7c-1.9-1.8-2.9-4.5-2.9-8V15.8h5.4v13.6c0,2,0.5,3.5,1.4,4.5s2.2,1.5,3.9,1.5c1.7,0,3-0.5,3.9-1.4c0.9-1,1.4-2.4,1.4-4.3V15.8h5.4v13.6c0,1.8-0.3,3.4-0.8,4.8c-0.5,1.4-1.2,2.5-2.2,3.4c-0.9,0.9-2.1,1.6-3.4,2C186.1,40,184.6,40.2,183,40.2z"/>
                    <path className="lp-st0" d="M206.8,40.2c-1.9,0-3.7-0.3-5.5-0.9c-1.8-0.6-3.4-1.6-4.9-2.9l3.2-3.7c1.1,0.9,2.3,1.6,3.5,2.1c1.2,0.5,2.5,0.8,3.9,0.8c1.1,0,2-0.2,2.6-0.6c0.6-0.4,0.9-1,0.9-1.7v-0.1c0-0.3-0.1-0.6-0.2-0.9c-0.1-0.3-0.4-0.5-0.7-0.7c-0.4-0.2-0.9-0.5-1.5-0.7c-0.6-0.2-1.5-0.5-2.5-0.7c-1.2-0.3-2.4-0.6-3.4-1c-1-0.4-1.9-0.8-2.6-1.4c-0.7-0.5-1.2-1.2-1.6-2c-0.4-0.8-0.6-1.8-0.6-3v-0.1c0-1.1,0.2-2.1,0.6-3c0.4-0.9,1-1.6,1.8-2.3c0.8-0.6,1.7-1.1,2.7-1.5c1.1-0.3,2.2-0.5,3.5-0.5c1.8,0,3.5,0.3,5,0.8c1.5,0.5,2.9,1.3,4.2,2.3l-2.8,4c-1.1-0.7-2.2-1.3-3.2-1.7c-1.1-0.4-2.1-0.6-3.2-0.6s-1.8,0.2-2.4,0.6c-0.5,0.4-0.8,0.9-0.8,1.5v0.1c0,0.4,0.1,0.7,0.2,1c0.2,0.3,0.4,0.5,0.8,0.8c0.4,0.2,0.9,0.4,1.6,0.7c0.7,0.2,1.6,0.4,2.6,0.7c1.2,0.3,2.4,0.7,3.3,1.1s1.8,0.9,2.5,1.4c0.7,0.6,1.2,1.2,1.5,2c0.3,0.8,0.5,1.7,0.5,2.7v0.1c0,1.2-0.2,2.3-0.7,3.2c-0.4,0.9-1.1,1.7-1.9,2.3c-0.8,0.6-1.7,1.1-2.8,1.4C209.3,40,208.1,40.2,206.8,40.2z"/>
                    <path className="lp-st0" d="M227.7,15.6h5l10.6,24.2h-5.7l-2.3-5.4h-10.4l-2.3,5.4h-5.5L227.7,15.6z M233.4,29.8l-3.3-7.8l-3.3,7.8H233.4z"/>
                  </g>
                  <path className="lp-st0" d="M20.3,55.7c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l33-32.3c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-33,32.3C22,55.3,21.1,55.7,20.3,55.7z"/>
                  <path className="lp-st1" d="M36.8,55.6c-0.6,0-1.3-0.2-1.8-0.5l-0.2-0.1c-1.5-1-1.9-3-0.9-4.5c1-1.5,3-1.9,4.6-0.9l0.2,0.1c1.5,1,1.9,3,0.9,4.5C38.9,55.1,37.9,55.6,36.8,55.6z"/>
                  <path className="lp-st2" d="M10.1,49.5c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l9.1-8.9c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-9.1,8.9C11.8,49.2,10.9,49.5,10.1,49.5z"/>
                  <path className="lp-st2" d="M48.8,43.9c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l4.5-4.4c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-4.5,4.4C50.5,43.6,49.6,43.9,48.8,43.9z"/>
                  <path className="lp-st1" d="M3.7,39.8c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l0.1-0.1c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5L6,38.8C5.4,39.5,4.5,39.8,3.7,39.8z"/>
                  <path className="lp-st1" d="M28.1,32c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5L44.7,8c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-19,18.6C29.7,31.7,28.9,32,28.1,32z"/>
                  <path className="lp-st0" d="M12.6,31c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5L34.7,1.7c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5L14.9,30.1C14.3,30.7,13.5,31,12.6,31z"/>
                  <path className="lp-st1" d="M3.3,24.1c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l9.5-9.3c1.3-1.3,3.4-1.3,4.6,0s1.3,3.3,0,4.5l-9.5,9.3C5,23.8,4.1,24.1,3.3,24.1z"/>
                </g>
                <path className="lp-st2" d="M21,6.7c-1.8,0-3.3-1.4-3.3-3.2V3.2C17.7,1.4,19.2,0,21,0s3.3,1.4,3.3,3.2v0.3C24.3,5.3,22.8,6.7,21,6.7z"/>
              </g>
            </svg>
          </div>
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
