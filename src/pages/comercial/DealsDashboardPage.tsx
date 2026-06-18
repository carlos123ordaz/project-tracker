import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, Legend,
} from 'recharts'
import {
  RefreshCw, TrendingUp, Trophy, XCircle, Clock,
  DollarSign, Percent, List, AlertCircle, CalendarRange,
} from 'lucide-react'
import { format, parseISO, differenceInDays, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { useDeals, type Deal } from '../../hooks/useDeals'
import { PageLoader } from '../../components/ui/Loader'
import { Button } from '../../components/ui/Button'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM', { locale: es }) }
  catch { return '—' }
}

function fmtMoney(n: number) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function daysLeft(iso: string) {
  if (!iso) return null
  try { return differenceInDays(parseISO(iso), new Date()) }
  catch { return null }
}

const semantic = (d: Deal) => d.stage_semantic_id || 'P'

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPI({ icon: Icon, label, value, sub, color, bg, border }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string; value: string; sub?: string
  color: string; bg: string; border: string
}) {
  return (
    <div style={{ flex: 1, minWidth: 130, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} style={{ color }} />
      </span>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
        <div className="mono tnum" style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color, opacity: 0.65, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; fill?: string; color?: string }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{ background: '#fff', border: '1px solid var(--n-200)', borderRadius: 7, padding: '7px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <span style={{ color: p.fill ?? p.color ?? 'var(--n-700)', fontWeight: 700 }}>{p.name}: </span>
      <span style={{ color: 'var(--n-900)', fontWeight: 600 }}>{typeof p.value === 'number' && p.value > 999 ? fmtMoney(p.value) : p.value}</span>
    </div>
  )
}

function MultiTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--n-200)', borderRadius: 7, padding: '7px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      {label && <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 4, fontWeight: 600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--n-700)', fontWeight: 600 }}>{p.name}: </span>
          <span style={{ color: 'var(--n-900)', fontWeight: 700 }}>
            {typeof p.value === 'number' && p.value > 999 ? fmtMoney(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, children, flex }: { title: string; children: React.ReactNode; flex?: number }) {
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: flex ?? 1 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-600)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
      {children}
    </div>
  )
}

// ── Colores por estado semántico ──────────────────────────────────────────────

const SEMANTIC_COLOR: Record<string, string> = {
  S: '#16a34a',
  F: '#ef4444',
  P: '#6366f1',
  '': '#6366f1',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DealsDashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { deals: allDeals, lastSync, source, loading, syncing, error, sync } = useDeals()

  // Aplicar los mismos filtros que vienen desde DealsPage
  const deals = useMemo(() => {
    const sem      = searchParams.get('sem')
    const pipeline = searchParams.get('pipeline')
    const resp     = searchParams.get('resp')
    const etapa    = searchParams.get('etapa')
    const pau      = searchParams.get('pau')
    const pic      = searchParams.get('pic')
    const cisac    = searchParams.get('cisac')
    const q        = searchParams.get('q')?.toLowerCase()
    let rows = allDeals
    if (sem)      rows = rows.filter(d => (d.stage_semantic_id || 'P') === sem)
    if (pipeline) rows = rows.filter(d => d.category_id === pipeline)
    if (resp)     rows = rows.filter(d => d.assigned_by_name === resp)
    if (etapa)    rows = rows.filter(d => d.stage_name === etapa)
    if (pau)      rows = rows.filter(d => d.alcance_pau === pau)
    if (pic)      rows = rows.filter(d => d.alcance_pic === pic)
    if (cisac)    rows = rows.filter(d => d.dept_cisac.split(',').includes(cisac))
    if (q)        rows = rows.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.stage_name.toLowerCase().includes(q) ||
      d.assigned_by_name.toLowerCase().includes(q)
    )
    return rows
  }, [allDeals, searchParams])

  const stats = useMemo(() => {
    const total    = deals.length
    const won      = deals.filter(d => semantic(d) === 'S')
    const lost     = deals.filter(d => semantic(d) === 'F')
    const inProg   = deals.filter(d => semantic(d) === 'P' || !d.stage_semantic_id)
    const wonAmt   = won.reduce((s, d) => s + (parseFloat(d.opportunity) || 0), 0)
    const pipeAmt  = inProg.reduce((s, d) => s + (parseFloat(d.opportunity) || 0), 0)
    const winRate  = total > 0 ? Math.round((won.length / (won.length + lost.length || 1)) * 100) : 0
    const avgProb  = inProg.length > 0
      ? Math.round(inProg.reduce((s, d) => s + (parseInt(d.probability) || 0), 0) / inProg.length)
      : 0
    return { total, won: won.length, lost: lost.length, inProg: inProg.length, wonAmt, pipeAmt, winRate, avgProb }
  }, [deals])

  // By stage (count + amount)
  const byStage = useMemo(() => {
    const map: Record<string, { count: number; amount: number; semantic: string }> = {}
    deals.forEach(d => {
      const name = d.stage_name || d.stage_id || 'Sin etapa'
      if (!map[name]) map[name] = { count: 0, amount: 0, semantic: d.stage_semantic_id || 'P' }
      map[name].count++
      map[name].amount += parseFloat(d.opportunity) || 0
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [deals])

  // By pipeline
  const byPipeline = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    deals.forEach(d => {
      const name = d.category_name || 'Sin pipeline'
      if (!map[name]) map[name] = { count: 0, amount: 0 }
      map[name].count++
      map[name].amount += parseFloat(d.opportunity) || 0
    })
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count)
  }, [deals])

  // By semantic (donut)
  const bySemantic = useMemo(() => {
    const labels: Record<string, string> = { S: 'Ganado', F: 'Perdido', P: 'En proceso', '': 'En proceso' }
    const map: Record<string, number> = {}
    deals.forEach(d => {
      const key = d.stage_semantic_id || 'P'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v, color: SEMANTIC_COLOR[k] ?? '#94a3b8' }))
  }, [deals])

  // Top responsables
  const byResponsible = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    deals.forEach(d => {
      const name = d.assigned_by_name || 'Sin asignar'
      if (!map[name]) map[name] = { count: 0, amount: 0 }
      map[name].count++
      map[name].amount += parseFloat(d.opportunity) || 0
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name: name.split(' ')[0], fullName: name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [deals])

  // Por departamento CISAC (campo múltiple → un deal puede contar en varios)
  const byCisac = useMemo(() => {
    const DEPTS = ['Ventas', 'Servicios', 'Proyectos', 'QHSE']
    const COLORS: Record<string, string> = { Ventas: '#6366f1', Servicios: '#0ea5e9', Proyectos: '#059669', QHSE: '#f59e0b' }
    const map: Record<string, { count: number; amount: number }> = {}
    DEPTS.forEach(d => { map[d] = { count: 0, amount: 0 } })
    deals.forEach(d => {
      if (!d.dept_cisac) return
      d.dept_cisac.split(',').forEach(dept => {
        if (map[dept]) {
          map[dept].count++
          map[dept].amount += parseFloat(d.opportunity) || 0
        }
      })
    })
    return DEPTS
      .filter(d => map[d].count > 0)
      .map(d => ({ name: d, ...map[d], color: COLORS[d] }))
  }, [deals])

  // PAU / PIC distribución
  const byPau = useMemo(() => {
    const map: Record<string, number> = { 'Si Incluye': 0, 'No incluye': 0, 'No llenado': 0 }
    deals.forEach(d => { if (map[d.alcance_pau] !== undefined) map[d.alcance_pau]++ })
    const COLORS: Record<string, string> = { 'Si Incluye': '#16a34a', 'No incluye': '#ef4444', 'No llenado': '#94a3b8' }
    return Object.entries(map).map(([name, value]) => ({ name, value, color: COLORS[name] }))
  }, [deals])

  const byPic = useMemo(() => {
    const map: Record<string, number> = { 'Si Incluye': 0, 'No incluye': 0, 'No llenado': 0 }
    deals.forEach(d => { if (map[d.alcance_pic] !== undefined) map[d.alcance_pic]++ })
    const COLORS: Record<string, string> = { 'Si Incluye': '#16a34a', 'No incluye': '#ef4444', 'No llenado': '#94a3b8' }
    return Object.entries(map).map(([name, value]) => ({ name, value, color: COLORS[name] }))
  }, [deals])

  // Deals cerrando pronto (≤30 días, en proceso)
  const closingSoon = useMemo(() =>
    deals
      .filter(d => {
        if (semantic(d) !== 'P' && d.stage_semantic_id) return false
        const dl = daysLeft(d.closedate)
        return dl !== null && dl >= 0 && dl <= 30
      })
      .sort((a, b) => {
        const da = daysLeft(a.closedate) ?? 999
        const db = daysLeft(b.closedate) ?? 999
        return da - db
      })
      .slice(0, 8)
  , [deals])

  // Deals vencidos (en proceso, fecha de cierre pasada)
  const overdue = useMemo(() =>
    deals
      .filter(d => {
        if (semantic(d) !== 'P' && d.stage_semantic_id) return false
        const dl = daysLeft(d.closedate)
        return dl !== null && dl < 0
      })
      .sort((a, b) => (daysLeft(a.closedate) ?? 0) - (daysLeft(b.closedate) ?? 0))
      .slice(0, 8)
  , [deals])

  // Deals a través del tiempo (últimas 12 semanas)
  const byWeek = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const ref = subWeeks(now, 11 - i)
      const weekStart = startOfWeek(ref, { weekStartsOn: 1 })
      const weekEnd   = endOfWeek(ref,   { weekStartsOn: 1 })
      const label     = format(weekStart, 'd MMM', { locale: es })
      let created = 0, won = 0, createdAmt = 0, wonAmt = 0
      deals.forEach(d => {
        try {
          const dt = parseISO(d.date_create)
          if (!isWithinInterval(dt, { start: weekStart, end: weekEnd })) return
          created++
          createdAmt += parseFloat(d.opportunity) || 0
          if (d.stage_semantic_id === 'S') { won++; wonAmt += parseFloat(d.opportunity) || 0 }
        } catch { /* skip */ }
      })
      return { week: label, created, won, createdAmt, wonAmt }
    })
  }, [deals])

  // Monto creado / ganado esta semana por responsable
  const byRespWeek = useMemo(() => {
    const now       = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 })
    const map: Record<string, { createdAmt: number; wonAmt: number }> = {}
    deals.forEach(d => {
      try {
        const dt = parseISO(d.date_create)
        if (!isWithinInterval(dt, { start: weekStart, end: weekEnd })) return
        const name = (d.assigned_by_name || 'Sin asignar').split(' ')[0]
        if (!map[name]) map[name] = { createdAmt: 0, wonAmt: 0 }
        const amt = parseFloat(d.opportunity) || 0
        map[name].createdAmt += amt
        if (d.stage_semantic_id === 'S') map[name].wonAmt += amt
      } catch { /* skip */ }
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.createdAmt - a.createdAmt)
  }, [deals])

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TrendingUp size={18} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--n-900)', margin: 0, letterSpacing: '-0.01em' }}>Dashboard Comercial</h1>
          <p style={{ fontSize: 12, color: 'var(--n-500)', margin: 0 }}>
            Análisis de deals CRM · Bitrix24
            {lastSync && <span className="mono"> · sync {fmtDate(lastSync)}</span>}
            {source && <span style={{ marginLeft: 6, fontSize: 10.5, color: source === 'bitrix' ? '#16a34a' : 'var(--n-400)' }}>
              ({source === 'bitrix' ? 'en vivo' : 'caché'})
            </span>}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={List} onClick={() => navigate('/comercial/deals?' + searchParams.toString())}>
          Ver lista{searchParams.toString() ? ' (filtrado)' : ''}
        </Button>
        <Button icon={CalendarRange} onClick={() => navigate('/comercial/deals/gantt?' + searchParams.toString())}>
          Gantt
        </Button>
        <Button icon={RefreshCw} onClick={sync} disabled={syncing}>{syncing ? 'Sincronizando…' : 'Sincronizar'}</Button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* Filtros activos */}
      {searchParams.toString() && (() => {
        const chips: string[] = []
        const sem  = searchParams.get('sem')
        const resp = searchParams.get('resp')
        const etapa = searchParams.get('etapa')
        const pipe = searchParams.get('pipeline')
        const pau  = searchParams.get('pau')
        const pic  = searchParams.get('pic')
        const q    = searchParams.get('q')
        const labels: Record<string, string> = { P: 'En proceso', S: 'Ganados', F: 'Perdidos' }
        if (sem)   chips.push(`Estado: ${labels[sem] ?? sem}`)
        if (resp)  chips.push(`Resp: ${resp.split(' ')[0]}`)
        if (etapa) chips.push(`Etapa: ${etapa}`)
        if (pipe)  chips.push(`Pipeline: ${pipe}`)
        if (pau)   chips.push(`PAU: ${pau}`)
        if (pic)   chips.push(`PIC: ${pic}`)
        const cisac = searchParams.get('cisac')
        if (cisac) chips.push(`CISAC: ${cisac}`)
        if (q)     chips.push(`Búsqueda: "${q}"`)
        if (!chips.length) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--n-500)', fontWeight: 600 }}>Filtros activos:</span>
            {chips.map(c => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-200)' }}>
                {c}
              </span>
            ))}
            <span style={{ fontSize: 11, color: 'var(--n-500)' }}>
              · mostrando {deals.length.toLocaleString()} de {allDeals.length.toLocaleString()} deals
            </span>
          </div>
        )
      })()}

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', flexShrink: 0 }}>
        <KPI icon={TrendingUp} label="Total deals"    value={stats.total.toString()}      sub="en CRM"              color="#6366f1" bg="var(--brand-50)"  border="var(--brand-200)" />
        <KPI icon={Trophy}     label="Ganados"        value={stats.won.toString()}        sub={`Win rate ${stats.winRate}%`} color="#15803d" bg="#f0fdf4" border="#bbf7d0" />
        <KPI icon={Clock}      label="En proceso"     value={stats.inProg.toString()}     sub={`Prob. media ${stats.avgProb}%`} color="var(--brand-700)" bg="var(--brand-50)" border="var(--brand-200)" />
        <KPI icon={XCircle}    label="Perdidos"       value={stats.lost.toString()}       sub="cerrados perdidos"   color="#b91c1c" bg="#fef2f2"         border="#fecaca" />
        <KPI icon={DollarSign} label="Monto ganado"   value={fmtMoney(stats.wonAmt)}      sub="total deals ganados" color="#15803d" bg="#f0fdf4"         border="#bbf7d0" />
        <KPI icon={Percent}    label="Pipeline activo" value={fmtMoney(stats.pipeAmt)}   sub="oportunidades abiertas" color="var(--brand-700)" bg="var(--brand-50)" border="var(--brand-200)" />
      </div>

      {/* Row T: Deals a través del tiempo */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <Section title="Deals a través del tiempo (últimas 12 semanas)">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byWeek} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--n-150)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<MultiTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="created" name="Creados" stroke="#6366f1" strokeWidth={2} fill="url(#gradCreated)" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="won"     name="Ganados" stroke="#16a34a" strokeWidth={2} fill="url(#gradWon)"     dot={{ r: 3, fill: '#16a34a' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Row W: Monto creado/ganado esta semana por responsable */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <Section title={`Monto creado / ganado esta semana por responsable · ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM', { locale: es })}–${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM yyyy', { locale: es })}`}>
          {byRespWeek.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--n-400)', margin: 0 }}>Sin deals creados esta semana.</p>
            : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byRespWeek} margin={{ top: 4, right: 16, left: 0, bottom: 36 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 10 }} />
                    <Tooltip content={<MultiTooltip />} />
                    <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="createdAmt" name="Creado ($)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wonAmt"     name="Ganado ($)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          }
        </Section>
      </div>

      {/* Row 1: Donut estados + Etapas (bar) */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexShrink: 0 }}>
        {/* Donut */}
        <Section title="Distribución por estado" flex={0.8}>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySemantic} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {bySemantic.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {bySemantic.map(e => (
              <span key={e.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--n-700)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color }} />
                {e.name} ({e.value})
              </span>
            ))}
          </div>
        </Section>

        {/* Deals por etapa */}
        <Section title="Deals por etapa (top 10)" flex={2}>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--n-150)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Deals" radius={[0, 4, 4, 0]}>
                  {byStage.map((entry, i) => (
                    <Cell key={i} fill={SEMANTIC_COLOR[entry.semantic] ?? '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Row 2: Monto por etapa + Responsables */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexShrink: 0 }}>
        {/* Monto por etapa */}
        <Section title="Monto por etapa ($)" flex={1.5}>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage.filter(s => s.amount > 0)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--n-150)" />
                <XAxis type="number" tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Monto" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Top responsables */}
        <Section title="Top responsables (por monto)" flex={1}>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byResponsible} margin={{ top: 0, right: 16, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-150)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Monto" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Row 3: Depto. CISAC + PAU + PIC */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexShrink: 0 }}>

        {/* CISAC donut */}
        {byCisac.length > 0 && (
          <Section title="Departamento CISAC" flex={1}>
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCisac} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
                    {byCisac.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {byCisac.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: 'var(--n-700)', flex: 1 }}>{e.name}</span>
                  <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-600)', minWidth: 24, textAlign: 'right' }}>{e.count}</span>
                  <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-400)', minWidth: 64, textAlign: 'right' }}>{fmtMoney(e.amount)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* PAU distribución */}
        <Section title="Alcance Proy. PAU" flex={1}>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byPau.filter(e => e.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
                  {byPau.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {byPau.filter(e => e.value > 0).map(e => (
              <span key={e.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--n-700)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: e.color }} />
                {e.name} ({e.value})
              </span>
            ))}
          </div>
        </Section>

        {/* PIC distribución */}
        <Section title="Alcance Proy. PIC" flex={1}>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byPic.filter(e => e.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
                  {byPic.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {byPic.filter(e => e.value > 0).map(e => (
              <span key={e.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--n-700)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: e.color }} />
                {e.name} ({e.value})
              </span>
            ))}
          </div>
        </Section>

      </div>

      {/* Row 5: Pipelines + Cierres próximos */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexShrink: 0 }}>
        {/* Por pipeline */}
        {byPipeline.length > 1 && (
          <Section title="Deals por pipeline" flex={1}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {byPipeline.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--n-700)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <div style={{ flex: 2, height: 6, background: 'var(--n-100)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((p.count / deals.length) * 100)}%`, background: '#6366f1', borderRadius: 999 }} />
                  </div>
                  <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-600)', minWidth: 24, textAlign: 'right' }}>{p.count}</span>
                  <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-500)', minWidth: 64, textAlign: 'right' }}>{fmtMoney(p.amount)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Cierres próximos */}
        <Section title="Cierran en ≤ 30 días" flex={1}>
          {closingSoon.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--n-400)', margin: 0 }}>Sin deals próximos a cerrar.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
                {closingSoon.map(d => {
                  const dl = daysLeft(d.closedate) ?? 0
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--n-100)' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center',
                        padding: '2px 6px', borderRadius: 20,
                        background: dl <= 7 ? '#fef2f2' : '#fef3c7',
                        color: dl <= 7 ? '#b91c1c' : '#92400e',
                      }}>
                        {dl}d
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--n-500)' }}>{d.stage_name} · {d.assigned_by_name?.split(' ')[0]}</div>
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11, color: '#059669', fontWeight: 600, flexShrink: 0 }}>
                        {fmtMoney(parseFloat(d.opportunity) || 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }
        </Section>

      </div>

      {/* Row 6: Vencidos (fila propia para no desbordarse) */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <Section title="Vencidos (cierre pasado)">
          {overdue.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--n-400)', margin: 0 }}>Sin deals vencidos.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 4 }}>
                {overdue.map(d => {
                  const dl = Math.abs(daysLeft(d.closedate) ?? 0)
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#b91c1c', flexShrink: 0, minWidth: 44 }}>
                        <AlertCircle size={11} />-{dl}d
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--n-500)' }}>{d.stage_name} · {d.assigned_by_name?.split(' ')[0]}</div>
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600, flexShrink: 0 }}>
                        {fmtMoney(parseFloat(d.opportunity) || 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }
        </Section>
      </div>

    </div>
  )
}
