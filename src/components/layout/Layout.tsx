import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAutoDelayed } from '../../hooks/useAutoDelayed'
import { X, AlertTriangle } from 'lucide-react'

export default function Layout() {
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [toast,       setToast]       = useState<number | null>(null)

  useAutoDelayed((count) => {
    if (count > 0) setToast(count)
  })

  useEffect(() => {
    if (toast === null) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--n-50)' }}>
      {/* Mobile backdrop — CSS hides it on desktop */}
      <div
        className={`sidebar-backdrop${mobileOpen ? ' sidebar-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onMenuToggle={() => setMobileOpen(v => !v)} />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {toast !== null && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 60,
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'var(--amber-50)', border: '1px solid var(--amber-100)',
          color: 'var(--amber-700)',
          padding: '12px 14px', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', maxWidth: 360,
          animation: 'fadeUp .3s ease both',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--amber-600)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>Tareas actualizadas automáticamente</div>
            <div style={{ fontSize: 11.5, color: 'var(--amber-700)', marginTop: 2 }}>
              {toast} {toast === 1 ? 'tarea marcada' : 'tareas marcadas'} como <strong>Retrasado</strong> por fecha vencida.
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{ color: 'var(--amber-500)', cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--amber-700)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--amber-500)'}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
