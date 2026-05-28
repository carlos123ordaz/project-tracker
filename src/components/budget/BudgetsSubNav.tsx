import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, Database, TrendingUp } from 'lucide-react'

const TABS = [
  { id: 'budgets', label: 'Presupuestos',    icon: FileText,   path: '/budgets'           },
  { id: 'prices',  label: 'Base de precios', icon: Database,   path: '/budgets/resources' },
  { id: 'reports', label: 'Reportes',        icon: TrendingUp, path: '/budgets/reports'   },
]

export default function BudgetsSubNav() {
  const navigate       = useNavigate()
  const { pathname }   = useLocation()

  const active =
    pathname.startsWith('/budgets/resources') ? 'prices' :
    pathname.startsWith('/budgets/reports')   ? 'reports' :
    'budgets'

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid var(--n-150)',
      background: 'var(--n-0)',
      padding: '0 24px', gap: 2, flex: '0 0 auto',
    }}>
      {TABS.map(t => {
        const on = active === t.id
        return (
          <button key={t.id} onClick={() => navigate(t.path)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '12px 14px', fontSize: 12.5, fontWeight: 550,
              color: on ? 'var(--brand-700)' : 'var(--n-600)',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: `2px solid ${on ? 'var(--brand-600)' : 'transparent'}`,
              marginBottom: -1, cursor: 'pointer', background: 'transparent',
              transition: 'color .15s, border-color .15s',
            }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.color = 'var(--n-900)' }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.color = 'var(--n-600)' }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
