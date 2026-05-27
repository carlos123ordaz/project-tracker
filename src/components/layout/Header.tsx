import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Search, ChevronDown, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getInitials, getMemberColor } from '../../lib/helpers'

const PAGE_TITLES: Record<string, string> = {
  '/':             'Dashboard',
  '/projects':     'Proyectos',
  '/kanban':       'Kanban',
  '/timeline':     'Timeline',
  '/consolidated': 'Consolidado',
  '/calendar':     'Calendario',
  '/overview':     'Overview',
  '/settings':     'Configuración',
}

interface HeaderProps {
  action?: React.ReactNode
  onMenuToggle?: () => void
}

export default function Header({ action, onMenuToggle }: HeaderProps) {
  const location = useLocation()
  const basePath = '/' + location.pathname.split('/')[1]
  const title    = PAGE_TITLES[basePath] || 'Project Tracker'

  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario'
  const initials    = getInitials(displayName)
  const avatarColor = getMemberColor(0)

  return (
    <header style={{
      height: 56, flex: '0 0 56px',
      borderBottom: '1px solid var(--n-150)',
      background: 'var(--n-0)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Hamburger — CSS hides on desktop */}
        <button
          className="hamburger-btn"
          onClick={onMenuToggle}
          style={{
            width: 32, height: 32, borderRadius: 7,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--n-700)', cursor: 'pointer', transition: 'background .15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--n-100)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        <h1 style={{ letterSpacing: '-0.014em' }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {action}
        <button
          title="Buscar"
          className="resp-hide"
          style={{
            width: 28, height: 28, borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--n-500)', cursor: 'pointer', transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-100)'; e.currentTarget.style.color = 'var(--n-800)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-500)' }}
        >
          <Search size={14} />
        </button>

        <span style={{ position: 'relative' }} className="resp-hide">
          <button
            title="Notificaciones"
            style={{
              width: 28, height: 28, borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--n-500)', cursor: 'pointer', transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-100)'; e.currentTarget.style.color = 'var(--n-800)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-500)' }}
          >
            <Bell size={14} />
          </button>
        </span>

        <div style={{ width: 1, height: 18, background: 'var(--n-200)', margin: '0 4px' }} className="resp-hide" />

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 6px 4px 4px', borderRadius: 999,
              border: '1px solid var(--n-200)', cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              width: 22, height: 22, borderRadius: 999,
              background: avatarColor, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 600,
            }}>
              {initials}
            </span>
            <span className="resp-hide" style={{ fontSize: 12, fontWeight: 550, color: 'var(--n-800)' }}>
              {displayName.split(' ')[0]}
            </span>
            <ChevronDown size={12} style={{ color: 'var(--n-500)' }} className="resp-hide" />
          </button>

          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: 'var(--n-0)', border: '1px solid var(--n-200)',
                borderRadius: 10, boxShadow: 'var(--shadow-md)',
                minWidth: 200, zIndex: 50, overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--n-150)' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-900)' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 1 }}>{user?.email}</div>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); signOut() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 14px', fontSize: 12.5, color: 'var(--red-700)',
                    cursor: 'pointer', transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--red-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={13} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
