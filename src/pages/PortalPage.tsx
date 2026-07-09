import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import { useMemo } from 'react'
import {
  FolderOpen, ShoppingCart, Users, BookOpen,
  Kanban, CalendarRange, TrendingUp,
  ChevronRight, BarChart3, ClipboardList, TrendingDown,
  Building2, ListChecks, UserCheck, BarChart2,
  Package, ArrowDownToLine, Truck, ArrowRightLeft,
} from 'lucide-react'
import { useAlmacenEquipos } from '../hooks/useAlmacenEquipos'
import { MONTHS_FULL, DAYS_ES, TODAY } from '../lib/helpers'
import { SCREENS_LIST } from '../lib/types'

// ── Map paths → screen keys for permission checks ───────────────────────────
const PATH_TO_SCREEN_KEY: Record<string, string> = {}
for (const group of SCREENS_LIST) {
  for (const screen of group.screens) {
    PATH_TO_SCREEN_KEY[screen.path] = screen.key
  }
}

// ── Paleta por módulo ─────────────────────────────────────────────────────────

const PALETTES = {
  proyectos:  { from: '#4f46e5', to: '#6366f1', glow: 'rgba(99,102,241,.5)'   },
  comercial:  { from: '#059669', to: '#10b981', glow: 'rgba(16,185,129,.5)'   },
  compras:    { from: '#d97706', to: '#f59e0b', glow: 'rgba(245,158,11,.5)'   },
rrhh:       { from: '#7c3aed', to: '#a78bfa', glow: 'rgba(167,139,250,.5)'  },
  ventas:     { from: '#059669', to: '#34d399', glow: 'rgba(52,211,153,.5)'   },
  almacen:    { from: '#c2410c', to: '#f97316', glow: 'rgba(249,115,22,.5)'   },
}

// ── Definición de módulos ─────────────────────────────────────────────────────

type LucideIcon = React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
interface SubLink { label: string; to: string; icon: LucideIcon }
interface Module {
  key: keyof typeof PALETTES
  icon: LucideIcon
  title: string
  description: string
  to: string
  cta: string
  links: SubLink[]
  stat?: { label: string; value: string | number }
}

const MODULES: Module[] = [
  {
    key: 'proyectos',
    icon: FolderOpen,
    title: 'Proyectos',
    description: 'Gestión integral de proyectos, tareas, cronograma y avance por equipo.',
    to: '/projects',
    cta: 'Ver proyectos',
    links: [
      { label: 'Kanban',     to: '/kanban',    icon: Kanban        },
      { label: 'Cronograma', to: '/timeline',  icon: CalendarRange  },
      { label: 'Dashboard',  to: '/dashboard', icon: BarChart2      },
    ],
  },
  {
    key: 'comercial',
    icon: TrendingUp,
    title: 'Comercial',
    description: 'Pipeline de ventas, deals CRM y seguimiento de oportunidades desde Bitrix24.',
    to: '/comercial/deals',
    cta: 'Ir a Comercial',
    links: [
      { label: 'Deals CRM', to: '/comercial/deals',           icon: TrendingUp },
      { label: 'Dashboard', to: '/comercial/deals/dashboard', icon: BarChart3  },
    ],
  },
  {
    key: 'compras',
    icon: ShoppingCart,
    title: 'Compras',
    description: 'Comparativos de precios, gestión de proveedores y seguimiento de tareas de compras.',
    to: '/compras',
    cta: 'Ir a Compras',
    links: [
      { label: 'Comparativos', to: '/compras',                    icon: TrendingDown },
      { label: 'Proveedores',  to: '/compras/proveedores',        icon: Building2    },
      { label: 'Tareas',       to: '/compras/tareas/91',          icon: ListChecks   },
      { label: 'Dashboard',    to: '/compras/tareas/91/dashboard', icon: BarChart2   },
    ],
  },
  {
    key: 'rrhh',
    icon: Users,
    title: 'RRHH',
    description: 'Gestión del equipo, control de asistencia y análisis de horas-hombre.',
    to: '/rrhh/equipo',
    cta: 'Ir a RRHH',
    links: [
      { label: 'Equipo',       to: '/rrhh/equipo',     icon: Users         },
      { label: 'Asistencia',   to: '/rrhh/asistencia', icon: UserCheck     },
      { label: 'H-H',          to: '/rrhh/hh',         icon: BarChart3     },
      { label: 'Programación', to: '/schedule',         icon: ClipboardList },
    ],
  },
  {
    key: 'ventas',
    icon: BookOpen,
    title: 'Ventas',
    description: 'Libro de precios, valorizaciones y control de avance por proyecto.',
    to: '/libro',
    cta: 'Ir a Ventas',
    links: [
      { label: 'Libro de precios', to: '/libro',       icon: BookOpen  },
      { label: 'Consolidado',      to: '/consolidated', icon: BarChart3 },
    ],
  },
  {
    key: 'almacen',
    icon: Package,
    title: 'Almacén',
    description: 'Control de stock, kardex de movimientos, pedidos, recepciones y despachos logísticos.',
    to: '/almacen',
    cta: 'Ir a Almacén',
    links: [
      { label: 'Equipos',      to: '/almacen/equipos',      icon: Package          },
      { label: 'Kardex',       to: '/almacen/kardex',       icon: ArrowRightLeft   },
      { label: 'Pedidos',      to: '/almacen/pedidos',      icon: ShoppingCart     },
      { label: 'Recepciones',  to: '/almacen/recepciones',  icon: ArrowDownToLine  },
      { label: 'Despachos',    to: '/almacen/despachos',    icon: Truck            },
    ],
  },
]

// ── Portal ────────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const { user, hasPermission, isSuperAdmin } = useAuth()
  const { projects } = useProjects()
  const { equipos }  = useAlmacenEquipos()
  const navigate     = useNavigate()

  const canView = (path: string): boolean => {
    if (isSuperAdmin) return true
    const screenKey = PATH_TO_SCREEN_KEY[path]
    if (!screenKey) return false // portal: ocultar rutas sin permiso mapeado
    return hasPermission(screenKey, 'view')
  }

  const firstName = useMemo(() => {
    const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'equipo'
    return name.split(' ')[0]
  }, [user])

  const activeProjects = projects.filter(p => !p.end_date || new Date(p.end_date) >= new Date()).length
  const bajoStockCount = equipos.filter(e => e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo).length
  const dayLabel = `${DAYS_ES[(TODAY.getDay() + 6) % 7]}, ${TODAY.getDate()} de ${MONTHS_FULL[TODAY.getMonth()]} ${TODAY.getFullYear()}`

  const modulesWithStats: Module[] = MODULES.map(m => {
    if (m.key === 'proyectos') return { ...m, stat: { label: 'proyectos activos', value: activeProjects } }
    if (m.key === 'almacen')   return { ...m, stat: { label: 'ítems bajo stock',  value: bajoStockCount } }
    return m
  }).map(m => ({
    ...m,
    links: m.links.filter(lk => canView(lk.to)),
  })).filter(m => canView(m.to) || m.links.length > 0)

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'auto',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Fondo full-screen ────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/portal-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        zIndex: 0,
      }} />

      {/* Overlay degradado: oscuro abajo, más denso */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          linear-gradient(
            to bottom,
            rgba(0, 20, 70, 0.50) 0%,
            rgba(0, 30, 90, 0.62) 35%,
            rgba(0, 15, 55, 0.80) 100%
          )
        `,
        zIndex: 1,
      }} />

      {/* Grid sutil */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.05, pointerEvents: 'none', zIndex: 2 }}>
        <defs>
          <pattern id="pgrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pgrid)" />
      </svg>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 56px 52px',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 'auto' }}>
          <svg viewBox="0 0 243.2 55.7" height={30} width={Math.round(243.2 * (30 / 55.7))}
            xmlns="http://www.w3.org/2000/svg" aria-label="CORSUSA" style={{ display: 'block' }}>
            <style>{`.cs0{fill:#fff}.cs1{fill:rgba(255,255,255,.75)}.cs2{fill:rgba(255,255,255,.55)}`}</style>
            <g><g><g>
              <path className="cs0" d="M85.6,40.3c-1.8,0-3.5-0.3-5-1c-1.5-0.6-2.9-1.5-4-2.6c-1.1-1.1-2-2.4-2.6-3.9c-0.6-1.5-1-3.1-1-4.8v-0.1c0-1.7,0.3-3.3,1-4.8c0.6-1.5,1.5-2.8,2.6-4c1.1-1.1,2.5-2,4-2.7c1.6-0.7,3.3-1,5.2-1c1.1,0,2.2,0.1,3.1,0.3c0.9,0.2,1.8,0.4,2.6,0.8c0.8,0.3,1.5,0.7,2.1,1.2c0.7,0.5,1.3,1,1.8,1.5L92.1,23c-1-0.8-1.9-1.5-2.9-2c-1-0.5-2.1-0.7-3.4-0.7c-1,0-2,0.2-2.9,0.6c-0.9,0.4-1.6,0.9-2.3,1.6c-0.6,0.7-1.1,1.5-1.5,2.4c-0.4,0.9-0.5,1.9-0.5,2.9v0.1c0,1,0.2,2,0.5,2.9c0.4,0.9,0.8,1.7,1.5,2.4c0.6,0.7,1.4,1.2,2.3,1.6c0.9,0.4,1.8,0.6,2.9,0.6c1.4,0,2.6-0.3,3.6-0.8c1-0.5,1.9-1.2,2.9-2.1l3.4,3.4c-0.6,0.7-1.3,1.3-2,1.8c-0.7,0.5-1.4,1-2.2,1.4c-0.8,0.4-1.7,0.7-2.7,0.9S86.8,40.3,85.6,40.3z"/>
              <path className="cs0" d="M110.7,40.3c-1.9,0-3.6-0.3-5.2-1c-1.6-0.7-3-1.5-4.1-2.6c-1.2-1.1-2.1-2.4-2.7-3.9c-0.6-1.5-1-3.1-1-4.8v-0.1c0-1.7,0.3-3.3,1-4.8c0.7-1.5,1.6-2.8,2.7-4c1.2-1.1,2.5-2,4.2-2.7c1.6-0.7,3.4-1,5.3-1c1.9,0,3.6,0.3,5.2,1c1.6,0.7,3,1.5,4.1,2.6c1.2,1.1,2.1,2.4,2.7,3.9s1,3.1,1,4.8v0.1c0,1.7-0.3,3.3-1,4.8c-0.7,1.5-1.6,2.8-2.7,4c-1.2,1.1-2.5,2-4.2,2.7C114.4,39.9,112.6,40.3,110.7,40.3z M110.8,35.4c1.1,0,2.1-0.2,3-0.6c0.9-0.4,1.7-0.9,2.3-1.6c0.6-0.7,1.1-1.5,1.5-2.4c0.4-0.9,0.5-1.9,0.5-2.9v-0.1c0-1-0.2-2-0.5-2.9c-0.4-0.9-0.9-1.7-1.5-2.4c-0.7-0.7-1.5-1.2-2.4-1.6c-0.9-0.4-1.9-0.6-3-0.6c-1.1,0-2.1,0.2-3,0.6c-0.9,0.4-1.7,0.9-2.3,1.6c-0.6,0.7-1.2,1.5-1.5,2.4c-0.4,0.9-0.5,1.9-0.5,2.9v0.1c0,1,0.2,2,0.5,2.9c0.4,0.9,0.9,1.7,1.5,2.4c0.7,0.7,1.5,1.2,2.4,1.6C108.7,35.2,109.7,35.4,110.8,35.4z"/>
              <path className="cs0" d="M127.3,15.8h11.3c3.1,0,5.5,0.8,7.2,2.4c1.4,1.4,2.1,3.2,2.1,5.5v0.1c0,1.9-0.5,3.5-1.5,4.8c-1,1.2-2.2,2.1-3.8,2.7l6,8.6h-6.3l-5.3-7.7h-4.3v7.7h-5.4V15.8z M138.3,27.5c1.3,0,2.4-0.3,3.1-0.9c0.7-0.6,1.1-1.4,1.1-2.5V24c0-1.1-0.4-2-1.1-2.6c-0.8-0.6-1.8-0.9-3.1-0.9h-5.4v6.9H138.3z"/>
              <path className="cs0" d="M160.2,40.2c-1.9,0-3.7-0.3-5.5-0.9c-1.8-0.6-3.4-1.6-4.9-2.9l3.2-3.7c1.1,0.9,2.3,1.6,3.5,2.1c1.2,0.5,2.5,0.8,3.9,0.8c1.1,0,2-0.2,2.6-0.6c0.6-0.4,0.9-1,0.9-1.7v-0.1c0-0.3-0.1-0.6-0.2-0.9c-0.1-0.3-0.4-0.5-0.7-0.7c-0.4-0.2-0.9-0.5-1.5-0.7c-0.6-0.2-1.5-0.5-2.5-0.7c-1.2-0.3-2.4-0.6-3.4-1c-1-0.4-1.9-0.8-2.6-1.4c-0.7-0.5-1.2-1.2-1.6-2c-0.4-0.8-0.6-1.8-0.6-3v-0.1c0-1.1,0.2-2.1,0.6-3c0.4-0.9,1-1.6,1.8-2.3c0.8-0.6,1.7-1.1,2.7-1.5c1.1-0.3,2.2-0.5,3.5-0.5c1.8,0,3.5,0.3,5,0.8c1.5,0.5,2.9,1.3,4.2,2.3l-2.8,4c-1.1-0.7-2.2-1.3-3.2-1.7c-1.1-0.4-2.1-0.6-3.2-0.6c-1.1,0-1.8,0.2-2.4,0.6c-0.5,0.4-0.8,0.9-0.8,1.5v0.1c0,0.4,0.1,0.7,0.2,1c0.2,0.3,0.4,0.5,0.8,0.8c0.4,0.2,0.9,0.4,1.6,0.7c0.7,0.2,1.6,0.4,2.6,0.7c1.2,0.3,2.4,0.7,3.3,1.1c1,0.4,1.8,0.9,2.5,1.4c0.7,0.6,1.2,1.2,1.5,2c0.3,0.8,0.5,1.7,0.5,2.7v0.1c0,1.2-0.2,2.3-0.7,3.2c-0.4,0.9-1.1,1.7-1.9,2.3c-0.8,0.6-1.7,1.1-2.8,1.4C162.8,40,161.6,40.2,160.2,40.2z"/>
              <path className="cs0" d="M183,40.2c-3.3,0-5.9-0.9-7.8-2.7c-1.9-1.8-2.9-4.5-2.9-8V15.8h5.4v13.6c0,2,0.5,3.5,1.4,4.5s2.2,1.5,3.9,1.5c1.7,0,3-0.5,3.9-1.4c0.9-1,1.4-2.4,1.4-4.3V15.8h5.4v13.6c0,1.8-0.3,3.4-0.8,4.8c-0.5,1.4-1.2,2.5-2.2,3.4c-0.9,0.9-2.1,1.6-3.4,2C186.1,40,184.6,40.2,183,40.2z"/>
              <path className="cs0" d="M206.8,40.2c-1.9,0-3.7-0.3-5.5-0.9c-1.8-0.6-3.4-1.6-4.9-2.9l3.2-3.7c1.1,0.9,2.3,1.6,3.5,2.1c1.2,0.5,2.5,0.8,3.9,0.8c1.1,0,2-0.2,2.6-0.6c0.6-0.4,0.9-1,0.9-1.7v-0.1c0-0.3-0.1-0.6-0.2-0.9c-0.1-0.3-0.4-0.5-0.7-0.7c-0.4-0.2-0.9-0.5-1.5-0.7c-0.6-0.2-1.5-0.5-2.5-0.7c-1.2-0.3-2.4-0.6-3.4-1c-1-0.4-1.9-0.8-2.6-1.4c-0.7-0.5-1.2-1.2-1.6-2c-0.4-0.8-0.6-1.8-0.6-3v-0.1c0-1.1,0.2-2.1,0.6-3c0.4-0.9,1-1.6,1.8-2.3c0.8-0.6,1.7-1.1,2.7-1.5c1.1-0.3,2.2-0.5,3.5-0.5c1.8,0,3.5,0.3,5,0.8c1.5,0.5,2.9,1.3,4.2,2.3l-2.8,4c-1.1-0.7-2.2-1.3-3.2-1.7c-1.1-0.4-2.1-0.6-3.2-0.6s-1.8,0.2-2.4,0.6c-0.5,0.4-0.8,0.9-0.8,1.5v0.1c0,0.4,0.1,0.7,0.2,1c0.2,0.3,0.4,0.5,0.8,0.8c0.4,0.2,0.9,0.4,1.6,0.7c0.7,0.2,1.6,0.4,2.6,0.7c1.2,0.3,2.4,0.7,3.3,1.1s1.8,0.9,2.5,1.4c0.7,0.6,1.2,1.2,1.5,2c0.3,0.8,0.5,1.7,0.5,2.7v0.1c0,1.2-0.2,2.3-0.7,3.2c-0.4,0.9-1.1,1.7-1.9,2.3c-0.8,0.6-1.7,1.1-2.8,1.4C209.3,40,208.1,40.2,206.8,40.2z"/>
              <path className="cs0" d="M227.7,15.6h5l10.6,24.2h-5.7l-2.3-5.4h-10.4l-2.3,5.4h-5.5L227.7,15.6z M233.4,29.8l-3.3-7.8l-3.3,7.8H233.4z"/>
            </g>
            <path className="cs0" d="M20.3,55.7c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l33-32.3c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-33,32.3C22,55.3,21.1,55.7,20.3,55.7z"/>
            <path className="cs1" d="M36.8,55.6c-0.6,0-1.3-0.2-1.8-0.5l-0.2-0.1c-1.5-1-1.9-3-0.9-4.5c1-1.5,3-1.9,4.6-0.9l0.2,0.1c1.5,1,1.9,3,0.9,4.5C38.9,55.1,37.9,55.6,36.8,55.6z"/>
            <path className="cs2" d="M10.1,49.5c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l9.1-8.9c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-9.1,8.9C11.8,49.2,10.9,49.5,10.1,49.5z"/>
            <path className="cs2" d="M48.8,43.9c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l4.5-4.4c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-4.5,4.4C50.5,43.6,49.6,43.9,48.8,43.9z"/>
            <path className="cs1" d="M3.7,39.8c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l0.1-0.1c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5L6,38.8C5.4,39.5,4.5,39.8,3.7,39.8z"/>
            <path className="cs1" d="M28.1,32c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5L44.7,8c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5l-19,18.6C29.7,31.7,28.9,32,28.1,32z"/>
            <path className="cs0" d="M12.6,31c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5L34.7,1.7c1.3-1.3,3.4-1.3,4.6,0c1.3,1.3,1.3,3.3,0,4.5L14.9,30.1C14.3,30.7,13.5,31,12.6,31z"/>
            <path className="cs1" d="M3.3,24.1c-0.8,0-1.7-0.3-2.3-0.9c-1.3-1.3-1.3-3.3,0-4.5l9.5-9.3c1.3-1.3,3.4-1.3,4.6,0s1.3,3.3,0,4.5l-9.5,9.3C5,23.8,4.1,24.1,3.3,24.1z"/>
            </g>
            <path className="cs2" d="M21,6.7c-1.8,0-3.3-1.4-3.3-3.2V3.2C17.7,1.4,19.2,0,21,0s3.3,1.4,3.3,3.2v0.3C24.3,5.3,22.8,6.7,21,6.7z"/>
            </g>
          </svg>
        </div>

        {/* Bienvenida centrada verticalmente */}
        <div style={{ paddingTop: 48, paddingBottom: 44 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
            margin: '0 0 14px',
          }}>
            Sistema de Gestión de Proyectos
          </p>
          <h1 style={{
            fontSize: 52, fontWeight: 800, color: '#fff',
            margin: '0 0 12px', letterSpacing: '-0.04em', lineHeight: 1.05,
          }}>
            Bienvenido,<br />{firstName}.
          </h1>
          <p style={{
            fontSize: 13.5, color: 'rgba(255,255,255,0.42)',
            margin: '0 0 36px', textTransform: 'capitalize', letterSpacing: '0.01em',
          }}>
            {dayLabel}
          </p>

          {/* Stats en línea */}
          <div style={{ display: 'flex', gap: 12 }}>
            <HeroStat label="Proyectos activos" value={activeProjects} />
            <HeroStat label="Ítems en almacén"  value={equipos.length} />
            <HeroStat label="Módulos"            value={MODULES.length} />
          </div>
        </div>

        {/* Separador con etiqueta */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)',
          }}>
            Módulos del sistema
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Grid de módulos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {modulesWithStats.map(mod => (
            <ModuleCard key={mod.key} module={mod} onNavigate={navigate} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── HeroStat ──────────────────────────────────────────────────────────────────

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: '12px 20px',
      backdropFilter: 'blur(16px)',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

// ── ModuleCard ────────────────────────────────────────────────────────────────

function ModuleCard({ module: mod, onNavigate }: { module: Module; onNavigate: (to: string) => void }) {
  const pal  = PALETTES[mod.key]
  const Icon = mod.icon

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
        e.currentTarget.style.boxShadow = `0 20px 48px -12px ${pal.glow}`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Banda de color superior */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${pal.from}, ${pal.to})`, flexShrink: 0 }} />

      {/* Cuerpo */}
      <div style={{ padding: '18px 18px 0', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px -3px ${pal.glow}`,
          }}>
            <Icon size={18} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', letterSpacing: '-0.015em' }}>
              {mod.title}
            </div>
            {mod.stat && (
              <div style={{ fontSize: 11, fontWeight: 600, color: pal.to, marginTop: 2 }}>
                {mod.stat.value} {mod.stat.label}
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 1.6, margin: '0 0 12px' }}>
          {mod.description}
        </p>

        {/* Sub-links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
          {mod.links.map(lk => {
            const LkIcon = lk.icon
            return (
              <button
                key={lk.to}
                onClick={() => onNavigate(lk.to)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.07)',
                  fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500,
                  cursor: 'pointer', transition: 'all .12s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${pal.from}30`
                  e.currentTarget.style.borderColor = `${pal.from}60`
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                }}
              >
                <LkIcon size={10} />
                {lk.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => onNavigate(mod.to)}
          style={{
            width: '100%', height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 9, border: 'none',
            background: `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
            color: '#fff', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: `0 3px 12px -2px ${pal.glow}`,
            transition: 'opacity .15s, transform .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(0.98)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
        >
          {mod.cta} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
