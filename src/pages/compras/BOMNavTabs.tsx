import { useNavigate } from 'react-router-dom'
import { List, BarChart2 } from 'lucide-react'

type ActiveTab = 'list' | 'dashboard'

export function BOMNavTabs({ active }: { active: ActiveTab }) {
  const navigate = useNavigate()
  const tabs = [
    { key: 'list'      as const, label: 'Lista',     Icon: List,     to: '/compras/bom' },
    { key: 'dashboard' as const, label: 'Dashboard', Icon: BarChart2, to: '/compras/bom/dashboard' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {tabs.map(({ key, label, Icon, to }) => {
        const isActive = key === active
        return (
          <button key={key} onClick={() => navigate(to)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 7,
            border:     isActive ? '1.5px solid var(--brand-300)' : '1px solid var(--n-200)',
            background: isActive ? 'var(--brand-50)' : '#fff',
            color:      isActive ? 'var(--brand-700)' : 'var(--n-600)',
            fontSize: 12.5, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
          }}>
            <Icon size={13} /> {label}
          </button>
        )
      })}
    </div>
  )
}
