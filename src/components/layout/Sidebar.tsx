import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Kanban, CalendarRange,
  List, Calendar, Gauge, Settings, ChevronLeft, ChevronRight,
  FileSpreadsheet, ChevronDown,
  Users, UserCheck, ClipboardList, BarChart3,
  ShoppingCart, Building2, TrendingDown, Receipt,
} from 'lucide-react'
import LogoMark from './LogoMark'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  end?: boolean
}

interface NavGroupDef {
  key: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  items: NavItem[]
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { isSuperAdmin, hasPermission } = useAuth()
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['proyectos']))
  const W = collapsed ? 64 : 232

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const rrhhItems: NavItem[] = []
  if (isSuperAdmin || hasPermission('rrhh', 'view')) {
    rrhhItems.push({ to: '/rrhh/equipo',     label: 'Equipo',       icon: Users })
    rrhhItems.push({ to: '/rrhh/asistencia', label: 'Asistencia',   icon: ClipboardList })
    rrhhItems.push({ to: '/rrhh/hh',         label: 'Dashboard HH', icon: BarChart3 })
  }
  if (isSuperAdmin) {
    rrhhItems.push({ to: '/rrhh/usuarios', label: 'Usuarios', icon: UserCheck })
  }

  const GROUPS: NavGroupDef[] = [
    {
      key: 'proyectos',
      label: 'Proyectos',
      icon: FolderOpen,
      items: [
        { to: '/',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
        { to: '/projects',     label: 'Catálogo',    icon: FolderOpen },
        { to: '/kanban',       label: 'Kanban',       icon: Kanban },
        { to: '/timeline',     label: 'Timeline',     icon: CalendarRange },
        { to: '/consolidated', label: 'Consolidado',  icon: List },
        { to: '/calendar',     label: 'Calendario',   icon: Calendar },
        { to: '/overview',     label: 'Overview',     icon: Gauge },
      ],
    },
    {
      key: 'ventas',
      label: 'Ventas',
      icon: Receipt,
      items: [
        { to: '/budgets', label: 'Presupuestos', icon: FileSpreadsheet },
      ],
    },
    {
      key: 'compras',
      label: 'Compras',
      icon: ShoppingCart,
      items: [
        { to: '/compras',             label: 'Comparativos', icon: TrendingDown },
        { to: '/compras/proveedores', label: 'Proveedores',  icon: Building2 },
      ],
    },
    {
      key: 'rrhh',
      label: 'RRHH',
      icon: Users,
      items: rrhhItems,
    },
  ]

  const ALL_ITEMS = GROUPS.flatMap(g => g.items)

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
        padding: collapsed ? '12px 8px' : '12px 10px',
        display: 'flex', flexDirection: 'column', gap: 1,
        overflowY: 'auto',
      }}>
        {collapsed ? (
          ALL_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onMobileClose}
              title={item.label}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 32, borderRadius: 7, cursor: 'pointer',
                background: isActive ? 'var(--brand-50)' : 'transparent',
                color: isActive ? 'var(--brand-700)' : 'var(--n-700)',
                position: 'relative',
                transition: 'background .15s, color .15s',
                textDecoration: 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span style={{
                      position: 'absolute', left: -8, top: 6, bottom: 6, width: 2,
                      background: 'var(--brand-600)', borderRadius: 2,
                    }} />
                  )}
                  <item.icon size={16} />
                </>
              )}
            </NavLink>
          ))
        ) : (
          GROUPS.filter(g => g.items.length > 0).map(group => {
            const isOpen = openGroups.has(group.key)
            return (
              <div key={group.key} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%',
                    gap: 7, padding: '0 10px',
                    height: 28, borderRadius: 6,
                    color: 'var(--n-500)', fontSize: 10.5, fontWeight: 700,
                    cursor: 'pointer', background: 'transparent',
                    transition: 'background .15s, color .15s',
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                    border: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--n-100)'
                    e.currentTarget.style.color = 'var(--n-700)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--n-500)'
                  }}
                >
                  <group.icon size={12} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{group.label}</span>
                  <ChevronDown
                    size={11}
                    style={{
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform .2s',
                    }}
                  />
                </button>

                {isOpen && (
                  <div style={{ paddingLeft: 6, marginTop: 1, marginBottom: 2 }}>
                    {group.items.length > 0 ? (
                      group.items.map(item => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={onMobileClose}
                          title={item.label}
                          style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center',
                            gap: 9, padding: '0 10px',
                            height: 32, borderRadius: 7,
                            cursor: 'pointer',
                            background: isActive ? 'var(--brand-50)' : 'transparent',
                            color: isActive ? 'var(--brand-700)' : 'var(--n-700)',
                            fontWeight: isActive ? 600 : 500,
                            fontSize: 12.5, letterSpacing: '-0.005em',
                            position: 'relative',
                            transition: 'background .15s, color .15s',
                            textDecoration: 'none',
                          })}
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span style={{
                                  position: 'absolute', left: -14, top: 6, bottom: 6, width: 2,
                                  background: 'var(--brand-600)', borderRadius: 2,
                                }} />
                              )}
                              <item.icon size={15} />
                              <span>{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      ))
                    ) : (
                      <div style={{
                        padding: '6px 10px', fontSize: 11.5,
                        color: 'var(--n-400)', fontStyle: 'italic',
                      }}>
                        Próximamente
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
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
            background: 'transparent', border: 'none',
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
