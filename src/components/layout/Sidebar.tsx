import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Kanban, CalendarRange,
  List, Calendar, Gauge, Settings, ChevronLeft, ChevronRight,
  FileSpreadsheet,
} from 'lucide-react'
import LogoMark from './LogoMark'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

const NAV = [
  { to: '/',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/projects',     label: 'Proyectos',   icon: FolderOpen },
  { to: '/kanban',       label: 'Kanban',      icon: Kanban },
  { to: '/timeline',     label: 'Timeline',    icon: CalendarRange },
  { to: '/consolidated', label: 'Consolidado', icon: List },
  { to: '/calendar',     label: 'Calendario',  icon: Calendar },
  { to: '/overview',     label: 'Overview',    icon: Gauge },
  { to: '/budgets',      label: 'Presupuestos', icon: FileSpreadsheet },
  { to: '/schedule',     label: 'Programar',   icon: CalendarRange },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const W = collapsed ? 64 : 232

  return (
    <aside
      className={`sidebar-nav${mobileOpen ? ' sidebar-open' : ''}`}
      style={{
        width: W, flex: `0 0 ${W}px`,
        borderRight: '1px solid var(--n-150)',
        background: 'var(--n-25)',
        display: 'flex', flexDirection: 'column',
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* Brand */}
      <div style={{
        height: 56,
        padding: collapsed ? '0' : '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--n-150)',
        flex: '0 0 56px',
        overflow: 'hidden',
      }}>
        <LogoMark size={collapsed ? 28 : 26} showText={!collapsed} />
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: collapsed ? '12px 8px' : '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 1,
        overflowY: 'auto',
      }}>
        {!collapsed && (
          <div style={{
            fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase',
            letterSpacing: '0.08em', fontWeight: 600, padding: '6px 10px', marginBottom: 2,
          }}>
            Workspace
          </div>
        )}
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onMobileClose}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: 10,
              padding: collapsed ? '0' : '0 10px',
              height: 32, borderRadius: 7,
              cursor: 'pointer',
              background: isActive ? 'var(--brand-50)' : 'transparent',
              color: isActive ? 'var(--brand-700)' : 'var(--n-700)',
              fontWeight: isActive ? 600 : 500,
              fontSize: 12.5,
              letterSpacing: '-0.005em',
              position: 'relative',
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'background .15s, color .15s',
              textDecoration: 'none',
            })}
            data-tip={collapsed ? item.label : undefined}
            title={item.label}
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span style={{
                    position: 'absolute', left: -8, top: 6, bottom: 6, width: 2,
                    background: 'var(--brand-600)', borderRadius: 2,
                  }} />
                )}
                <item.icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 16px',
        borderTop: '1px solid var(--n-150)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center',
            gap: 10, padding: collapsed ? '0' : '0 10px',
            height: 32, borderRadius: 7, cursor: 'pointer',
            background: isActive ? 'var(--brand-50)' : 'transparent',
            color: isActive ? 'var(--brand-700)' : 'var(--n-700)',
            fontWeight: isActive ? 600 : 500, fontSize: 12.5,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background .15s, color .15s', textDecoration: 'none',
            position: 'relative',
          })}
          title="Configuración"
        >
          {({ isActive }) => (
            <>
              {isActive && !collapsed && (
                <span style={{ position: 'absolute', left: -8, top: 6, bottom: 6, width: 2, background: 'var(--brand-600)', borderRadius: 2 }} />
              )}
              <Settings size={16} />
              {!collapsed && <span>Configuración</span>}
            </>
          )}
        </NavLink>

        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir' : 'Colapsar'}
          className="resp-hide"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '0' : '0 10px',
            height: 30, borderRadius: 7,
            color: 'var(--n-500)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-100)'; e.currentTarget.style.color = 'var(--n-800)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-500)' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span>Colapsar sidebar</span>}
        </button>
      </div>
    </aside>
  )
}
