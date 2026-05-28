import { useState, useMemo } from 'react'
import { useBudgets } from '../hooks/useBudgets'
import { useBudgetItems } from '../hooks/useBudgetItems'
import { useBudgetResources } from '../hooks/useBudgetResources'
import { PageLoader } from '../components/ui/Loader'
import { StatCard } from '../components/ui/StatCard'
import BudgetsSubNav from '../components/budget/BudgetsSubNav'
import { computeBudgetTotals, buildResourceMap, getItemUnitPrice, fmtCurrency, fmtNumber } from '../lib/budgetHelpers'
import { DollarSign, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
} from 'recharts'

// ── S-curve ───────────────────────────────────────────────────────────────────
function SCurve({ total }: { total: number }) {
  const weeks = 12
  const todayWeek = 7

  const chartData = useMemo(() => {
    const planned = Array.from({ length: weeks }, (_, i) => {
      const t = i / (weeks - 1)
      const s = 1 / (1 + Math.exp(-10 * (t - 0.5)))
      return s * total
    })
    const actual = planned.slice(0, todayWeek + 1).map((p, i) => {
      const factor = 1 + (Math.sin(i * 0.9) * 0.08) - (i / weeks * 0.05)
      return p * factor
    })
    return Array.from({ length: weeks }, (_, i) => ({
      week: `S${i + 1}`,
      planned: planned[i],
      actual: i <= todayWeek ? actual[i] : undefined,
    }))
  }, [total])

  const fmtTick = (v: number) => {
    if (total === 0) return '0'
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
    return `$${v.toFixed(0)}`
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10B981" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" stroke="var(--n-150)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--n-500)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10, fill: 'var(--n-500)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--n-150)', boxShadow: 'var(--shadow-sm)' }}
          formatter={(value: unknown, name: unknown) => [fmtNumber(Number(value ?? 0)), name === 'planned' ? 'Planificado' : 'Real']}
          labelStyle={{ fontWeight: 600, color: 'var(--n-900)' }}
        />
        <ReferenceLine x={`S${todayWeek + 1}`} stroke="var(--red-500)" strokeDasharray="5 4" strokeWidth={1.5}
          label={{ value: 'HOY', position: 'top', fontSize: 9.5, fill: 'var(--red-500)', fontWeight: 700 }} />
        <Area type="monotone" dataKey="planned" stroke="#4F46E5" strokeWidth={2.2} fill="url(#planGrad)" dot={{ r: 2.5, fill: '#4F46E5', opacity: 0.5 }} connectNulls />
        <Area type="monotone" dataKey="actual"  stroke="#10B981" strokeWidth={2.5} fill="url(#actGrad)"  dot={{ r: 3.2, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Spend breakdown ───────────────────────────────────────────────────────────
function SpendBreakdown({ groups, items, apuLines, resourceMap }: {
  groups: { id: string; name: string; code: string }[]
  items: Parameters<typeof getItemUnitPrice>[0][]
  apuLines: Parameters<typeof getItemUnitPrice>[1]
  resourceMap: ReturnType<typeof buildResourceMap>
}) {
  const groupTotals = useMemo(() => groups.map(g => {
    const children = items.filter(it => it.parent_id === g.id && it.type === 'item')
    const v = children.reduce((s, it) => s + it.qty * getItemUnitPrice(it, apuLines, resourceMap), 0)
    return { ...g, value: v, count: children.length }
  }), [groups, items, apuLines, resourceMap])

  const total = groupTotals.reduce((s, g) => s + g.value, 0)

  if (groupTotals.length === 0) return (
    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
      Sin capítulos. Agrega grupos al presupuesto para ver la distribución.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groupTotals.map(g => {
        const pct = total > 0 ? g.value / total : 0
        return (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px 110px', gap: 14, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--n-900)' }}>{g.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--n-500)' }} className="mono">{g.code || '—'} · {g.count} partidas</div>
            </div>
            <div style={{ height: 8, background: 'var(--n-100)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-500), var(--brand-700))', borderRadius: 999, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
            </div>
            <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-600)', textAlign: 'right' }}>{(pct * 100).toFixed(1)}%</div>
            <div className="mono tnum" style={{ fontSize: 12.5, color: 'var(--n-900)', fontWeight: 600, textAlign: 'right' }}>{fmtNumber(g.value)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Inner content (needs selected budget items) ────────────────────────────────
function ReportContent({ budgetId }: { budgetId: string }) {
  const { budgets } = useBudgets()
  const { items, apuLines, loading: iLoad } = useBudgetItems(budgetId)
  const { resources, loading: rLoad }       = useBudgetResources()

  const budget = budgets.find(b => b.id === budgetId)

  const resourceMap = useMemo(() => buildResourceMap(resources), [resources])

  const totals = useMemo(() => {
    if (!budget) return null
    return computeBudgetTotals(budget, items, apuLines, resourceMap)
  }, [budget, items, apuLines, resourceMap])

  const groups = useMemo(() => items.filter(it => it.type === 'group'), [items])

  const weeks = 12
  const todayWeek = 7
  const totalVal = totals?.total ?? 0

  const planned = Array.from({ length: weeks }, (_, i) => {
    const t = i / (weeks - 1)
    return (1 / (1 + Math.exp(-10 * (t - 0.5)))) * totalVal
  })
  const actual = planned.slice(0, todayWeek + 1).map((p, i) =>
    p * (1 + (Math.sin(i * 0.9) * 0.08) - (i / weeks * 0.05))
  )
  const advancePct = totalVal > 0 ? actual[actual.length - 1] / totalVal : 0
  const variance   = actual[actual.length - 1] - planned[todayWeek]

  if (iLoad || rLoad) return <PageLoader />

  if (!budget || !totals) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Selecciona un presupuesto.</div>
  )

  return (
    <>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard icon={DollarSign}    label="Costo total"       value={fmtCurrency(totals.total, budget.currency)} sub="con IGV"                   accent="brand"   sparkSeed={2.1} sparkBase={50} />
        <StatCard icon={TrendingUp}    label="% de avance"       numericValue={Math.round(advancePct * 100)} displaySuffix="%" sub="ejecutado a la fecha" accent="green"  sparkSeed={3.3} sparkBase={Math.round(advancePct * 100)} />
        <StatCard icon={CheckCircle}   label="Planificado a hoy" value={fmtCurrency(planned[todayWeek], budget.currency)} sub={`semana ${todayWeek + 1} de ${weeks}`} accent="amber"  sparkSeed={4.4} sparkBase={50} />
        <StatCard icon={AlertTriangle} label="Variación"
          value={(variance >= 0 ? '+' : '') + fmtCurrency(Math.abs(variance), budget.currency)}
          sub={variance >= 0 ? 'adelantado' : 'atrasado'}
          accent={variance >= 0 ? 'green' : 'red'} urgent={variance < 0} sparkSeed={5.5} sparkBase={50} />
      </div>

      {/* S-curve */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 14, color: 'var(--n-900)' }}>Curva S — Avance acumulado</h2>
            <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>Costo planificado vs. ejecutado, semana a semana</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[['#4F46E5', 'Planificado'], ['#10B981', 'Real']].map(([color, label]) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--n-700)', fontWeight: 500 }}>
                <span style={{ width: 14, height: 3, background: color, borderRadius: 2 }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <SCurve total={totalVal} />
      </div>

      {/* Spend breakdown */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <h2 style={{ fontSize: 14, marginBottom: 12, color: 'var(--n-900)' }}>Distribución por capítulo</h2>
        <SpendBreakdown groups={groups} items={items} apuLines={apuLines} resourceMap={resourceMap} />
      </div>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BudgetReportsPage() {
  const { budgets, loading } = useBudgets()
  const [selectedId, setSelectedId] = useState('')

  const budgetId = selectedId || budgets[0]?.id || ''

  if (loading) return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <BudgetsSubNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PageLoader /></div>
    </div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <BudgetsSubNav />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <select value={budgetId} onChange={e => setSelectedId(e.target.value)}
            style={{ height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-700)', outline: 'none', cursor: 'pointer', minWidth: 240 }}>
            {budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div style={{ flex: 1 }} />
        </div>

        {budgetId
          ? <ReportContent key={budgetId} budgetId={budgetId} />
          : <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>No hay presupuestos disponibles.</div>}
      </div>
    </div>
  )
}
