import { useNavigate, useLocation } from 'react-router-dom'
import { List, BarChart2, GanttChart } from 'lucide-react'

interface Props {
  groupId: string
  active: 'list' | 'gantt' | 'dashboard'
}

export function BitrixNavTabs({ groupId, active }: Props) {
  const nav      = useNavigate()
  const { pathname } = useLocation()

  // Detecta el módulo según el prefijo de la URL
  const module = pathname.startsWith('/ingenieria') ? 'ingenieria' : 'compras'
  const base   = `/${module}/tareas/${groupId}`

  const tabs = module === 'compras'
    ? [
        { key: 'list',      label: 'Lista',     icon: List,       to: base },
        { key: 'gantt',     label: 'Gantt',     icon: GanttChart, to: `${base}/gantt` },
        { key: 'dashboard', label: 'Dashboard', icon: BarChart2,  to: `${base}/dashboard` },
      ]
    : [
        { key: 'list',      label: 'Lista',     icon: List,      to: base },
        { key: 'dashboard', label: 'Dashboard', icon: BarChart2, to: `${base}/dashboard` },
      ]

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {tabs.map(t => {
        const Icon     = t.icon
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => nav(t.to)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7,
              border:      isActive ? '1.5px solid var(--brand-300)' : '1px solid var(--n-200)',
              background:  isActive ? 'var(--brand-50)' : '#fff',
              color:       isActive ? 'var(--brand-700)' : 'var(--n-600)',
              fontSize: 12.5, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
            }}
          >
            <Icon size={13} /> {t.label}
          </button>
        )
      })}
    </div>
  )
}
