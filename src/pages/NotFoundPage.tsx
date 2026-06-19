import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--n-50)',
      gap: 12,
    }}>
      <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--n-200)', lineHeight: 1 }}>
        404
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--n-800)' }}>
        Página no encontrada
      </div>
      <div style={{ fontSize: 13, color: 'var(--n-500)', textAlign: 'center', maxWidth: 320 }}>
        La ruta que intentas acceder no existe o fue movida.
      </div>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: 8,
          padding: '8px 20px',
          fontSize: 13,
          fontWeight: 500,
          color: '#fff',
          background: 'var(--brand-600)',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Ir al inicio
      </button>
    </div>
  )
}
