import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useMemo } from 'react'
import {
  FolderOpen, ShoppingCart, Users, BookOpen,
  FileSpreadsheet, HardHat, Kanban, CalendarRange,
  ChevronRight, BarChart3, ClipboardList, TrendingDown,
  Building2, ListChecks, UserCheck, BarChart2,
} from 'lucide-react'
import { MONTHS_FULL, DAYS_ES, TODAY } from '../lib/helpers'

// ── Paleta por módulo ─────────────────────────────────────────────────────────

const PALETTES = {
  proyectos:    { from: '#4f46e5', to: '#6366f1', glow: 'rgba(99,102,241,.35)'  },
  presupuestos: { from: '#0d9488', to: '#14b8a6', glow: 'rgba(20,184,166,.30)'  },
  compras:      { from: '#d97706', to: '#f59e0b', glow: 'rgba(245,158,11,.30)'  },
  ingenieria:   { from: '#0369a1', to: '#0ea5e9', glow: 'rgba(14,165,233,.30)'  },
  rrhh:         { from: '#7c3aed', to: '#a78bfa', glow: 'rgba(167,139,250,.30)' },
  ventas:       { from: '#059669', to: '#34d399', glow: 'rgba(52,211,153,.30)'  },
}

// ── Definición de módulos ─────────────────────────────────────────────────────

interface SubLink { label: string; to: string; icon: React.ComponentType<{ size?: number }> }
interface Module {
  key: keyof typeof PALETTES
  icon: React.ComponentType<{ size?: number }>
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
      { label: 'Kanban',    to: '/kanban',    icon: Kanban       },
      { label: 'Cronograma', to: '/timeline', icon: CalendarRange },
      { label: 'Dashboard', to: '/dashboard', icon: BarChart2    },
    ],
  },
  {
    key: 'presupuestos',
    icon: FileSpreadsheet,
    title: 'Presupuestos',
    description: 'Control de presupuestos por proyecto, partidas y seguimiento de costos.',
    to: '/budgets',
    cta: 'Ver presupuestos',
    links: [
      { label: 'Libro de precios', to: '/libro',           icon: BookOpen    },
      { label: 'Informes',         to: '/budgets/reports', icon: BarChart3   },
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
      { label: 'Comparativos',  to: '/compras',                   icon: TrendingDown },
      { label: 'Proveedores',   to: '/compras/proveedores',       icon: Building2    },
      { label: 'Tareas',        to: '/compras/tareas/91',         icon: ListChecks   },
      { label: 'Dashboard',     to: '/compras/tareas/91/dashboard', icon: BarChart2  },
    ],
  },
  {
    key: 'ingenieria',
    icon: HardHat,
    title: 'Ingeniería',
    description: 'Seguimiento de proyectos en ejecución y cotizaciones mediante Bitrix24.',
    to: '/ingenieria/tareas/362',
    cta: 'Ir a Ingeniería',
    links: [
      { label: 'Proy. Ejecución',    to: '/ingenieria/tareas/362',           icon: ListChecks },
      { label: 'Dashboard Ejecución', to: '/ingenieria/tareas/362/dashboard', icon: BarChart2  },
      { label: 'Proy. Cotizaciones', to: '/ingenieria/tareas/316',           icon: ListChecks },
      { label: 'Dashboard Cotiz.',   to: '/ingenieria/tareas/316/dashboard', icon: BarChart2  },
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
      { label: 'Equipo',      to: '/rrhh/equipo',     icon: Users        },
      { label: 'Asistencia',  to: '/rrhh/asistencia', icon: UserCheck    },
      { label: 'H-H',         to: '/rrhh/hh',         icon: BarChart3    },
      { label: 'Programación', to: '/schedule',        icon: ClipboardList },
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
      { label: 'Libro de precios', to: '/libro',    icon: BookOpen  },
      { label: 'Consolidado',      to: '/consolidated', icon: BarChart3 },
    ],
  },
]

// ── Portal ────────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const { user }      = useAuth()
  const { projects }  = useProjects()
  const { tasks }     = useTasks()
  const navigate      = useNavigate()

  const firstName = useMemo(() => {
    const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'equipo'
    return name.split(' ')[0]
  }, [user])

  const activeProjects = projects.filter(p => p.status !== 'Completado').length
  const pendingTasks   = tasks.filter(t => t.status !== 'Completado').length

  const dayLabel = `${DAYS_ES[(TODAY.getDay() + 6) % 7]}, ${TODAY.getDate()} de ${MONTHS_FULL[TODAY.getMonth()]} ${TODAY.getFullYear()}`

  // Inyecta las stats dinámicas en los módulos relevantes
  const modulesWithStats: Module[] = MODULES.map(m => {
    if (m.key === 'proyectos') return { ...m, stat: { label: 'proyectos activos', value: activeProjects } }
    if (m.key === 'presupuestos') return { ...m, stat: { label: 'tareas pendientes', value: pendingTasks } }
    return m
  })

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'auto', background: 'var(--n-50)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden', flexShrink: 0,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 100%)',
        padding: '40px 48px 52px',
      }}>
        {/* Círculos decorativos de fondo */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 340, height: 340, borderRadius: 999, background: 'radial-gradient(circle, rgba(99,102,241,.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: '30%', width: 280, height: 280, borderRadius: 999, background: 'radial-gradient(circle, rgba(14,165,233,.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '60%', width: 180, height: 180, borderRadius: 999, background: 'radial-gradient(circle, rgba(167,139,250,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Grid decorativo (estilo BI) */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo / nombre empresa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <BarChart3 size={16} style={{ color: '#a5b4fc' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Proyecto Maestro
            </span>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Bienvenido, {firstName}.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginTop: 8, marginBottom: 0, textTransform: 'capitalize' }}>
            {dayLabel}
          </p>

          {/* Quick stats en el hero */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <HeroStat label="Proyectos activos" value={activeProjects} />
            <HeroStat label="Tareas pendientes" value={pendingTasks} />
            <HeroStat label="Módulos disponibles" value={MODULES.length} />
          </div>
        </div>
      </div>

      {/* ── Grid de módulos ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '32px 48px 48px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-500)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Módulos del sistema
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 18,
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
      background: 'rgba(255,255,255,.10)',
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 10, padding: '10px 18px',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>{label}</div>
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
        background: '#fff',
        border: '1px solid var(--n-150)',
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform .18s, box-shadow .18s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = `0 12px 32px -8px ${pal.glow}, 0 2px 8px rgba(0,0,0,.06)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Banda de color superior */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${pal.from}, ${pal.to})`,
        flexShrink: 0,
      }} />

      {/* Cuerpo */}
      <div style={{ padding: '20px 22px 0', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          {/* Ícono */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px -2px ${pal.glow}`,
          }}>
            <Icon size={20} style={{ color: '#fff' }} />
          </div>

          {/* Título + stat */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--n-900)', letterSpacing: '-0.01em' }}>
              {mod.title}
            </div>
            {mod.stat && (
              <div style={{ fontSize: 11.5, color: pal.from, fontWeight: 600, marginTop: 2 }}>
                {mod.stat.value} {mod.stat.label}
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--n-500)', lineHeight: 1.55, margin: '0 0 16px' }}>
          {mod.description}
        </p>

        {/* Sub-links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {mod.links.map(lk => {
            const LkIcon = lk.icon
            return (
              <button
                key={lk.to}
                onClick={() => onNavigate(lk.to)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 20,
                  border: '1px solid var(--n-200)', background: 'var(--n-50)',
                  fontSize: 11.5, color: 'var(--n-600)', fontWeight: 500,
                  cursor: 'pointer', transition: 'background .12s, color .12s, border-color .12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${pal.from}12`
                  e.currentTarget.style.borderColor = `${pal.from}55`
                  e.currentTarget.style.color = pal.from
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--n-50)'
                  e.currentTarget.style.borderColor = 'var(--n-200)'
                  e.currentTarget.style.color = 'var(--n-600)'
                }}
              >
                <LkIcon size={11} />
                {lk.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--n-100)' }}>
        <button
          onClick={() => onNavigate(mod.to)}
          style={{
            width: '100%', height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 8, border: 'none',
            background: `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 2px 8px -2px ${pal.glow}`,
            transition: 'opacity .15s, transform .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(0.99)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
        >
          {mod.cta} <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
