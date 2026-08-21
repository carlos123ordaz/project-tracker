import { useMemo } from 'react'
import { Package, CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useComprasBOM } from '../../hooks/useComprasBOM'
import { BOMNavTabs } from './BOMNavTabs'

// ── Colores ────────────────────────────────────────────────────────────────────

const ESTADO_COLOR: Record<string, string> = {
  'COMPRADO':   'var(--green-500)',
  'EN PROCESO': 'var(--indigo-600)',
  'PENDIENTE':  'var(--n-500)',
}

const PROCESO_COLOR: Record<string, string> = {
  'Compra':      'var(--indigo-600)',
  'Fabricación': 'var(--amber-500)',
}

const PROV_COLOR = ['var(--indigo-600)', 'var(--green-500)', '#3b82f6', 'var(--amber-500)', '#a855f7']

const PROVEEDORES = [
  { key: 'polimetales' as const,     label: 'Polimetales' },
  { key: 'othero' as const,          label: 'Othero' },
  { key: 'pernos_y_pernos' as const, label: 'Pernos' },
  { key: 'ducasse' as const,         label: 'Ducasse' },
  { key: 'em_metal' as const,        label: 'E&M Metal' },
]

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, Icon }: {
  label: string; value: string | number; sub?: string; color: string; Icon: React.ElementType
}) {
  return (
    <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--n-900)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color, fontWeight: 600, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em', marginBottom: 8 }}>{children}</div>
}

const cardS: React.CSSProperties = {
  background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '14px 16px',
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function SolicitudCompraBOMDashboardPage() {
  const { items, loading } = useComprasBOM()

  const stats = useMemo(() => {
    const total      = items.length
    const comprados  = items.filter(i => i.estado_cot === 'COMPRADO').length
    const enProceso  = items.filter(i => i.estado_cot === 'EN PROCESO').length
    const pendientes = items.filter(i => i.estado_cot === 'PENDIENTE').length
    const pctComprado = total ? Math.round(comprados / total * 100) : 0

    // Por estado (pie)
    const byEstado = [
      { name: 'Comprado',   value: comprados,  color: ESTADO_COLOR['COMPRADO']   },
      { name: 'En proceso', value: enProceso,  color: ESTADO_COLOR['EN PROCESO'] },
      { name: 'Pendiente',  value: pendientes, color: ESTADO_COLOR['PENDIENTE']  },
    ].filter(d => d.value > 0)

    // Por proceso (pie)
    const compraCount = items.filter(i => i.proceso === 'Compra').length
    const fabCount    = items.filter(i => i.proceso === 'Fabricación').length
    const byProceso = [
      { name: 'Compra',      value: compraCount, color: PROCESO_COLOR['Compra'] },
      { name: 'Fabricación', value: fabCount,    color: PROCESO_COLOR['Fabricación'] },
    ].filter(d => d.value > 0)

    // Totales por proveedor (solo ítems con precio)
    const byProveedor = PROVEEDORES.map((p, i) => ({
      name: p.label,
      total: items.reduce((s, it) => s + (Number(it[p.key]) || 0), 0),
      color: PROV_COLOR[i],
    })).filter(d => d.total > 0)

    // Mejor proveedor (con mayor cobertura de precios ingresados)
    const mejorProveedor = [...byProveedor].sort((a, b) => b.total - a.total)[0] ?? null

    // Total invertible mínimo (suma del mejor precio de cada ítem)
    const totalMinimo = items.reduce((sum, it) => {
      const vals = PROVEEDORES.map(p => Number(it[p.key]) || 0).filter(v => v > 0)
      return sum + (vals.length ? Math.min(...vals) : 0)
    }, 0)

    // Por tipo (bar)
    const tipoMap = new Map<string, number>()
    items.forEach(it => {
      const t = it.tipo || 'Sin tipo'
      tipoMap.set(t, (tipoMap.get(t) ?? 0) + 1)
    })
    const byTipo = [...tipoMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // Ítems sin cotización (ningún precio ingresado)
    const sinCotizar = items.filter(it =>
      PROVEEDORES.every(p => !it[p.key])
    )

    // Ítems pendientes de compra con precio
    const pendientesConPrecio = items.filter(it =>
      it.estado_cot !== 'COMPRADO' && PROVEEDORES.some(p => Number(it[p.key]) > 0)
    )

    return { total, comprados, enProceso, pendientes, pctComprado, byEstado, byProceso, byProveedor, mejorProveedor, totalMinimo, byTipo, sinCotizar, pendientesConPrecio }
  }, [items])

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando…</div>

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Solicitud de Compra — BOM</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>{stats.total} ítems en total</p>
        </div>
        <BOMNavTabs active="dashboard" />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Total ítems"     value={stats.total}        color="var(--indigo-600)" Icon={Package}      />
        <KpiCard label="Comprados"       value={stats.comprados}    color="var(--green-500)" Icon={CheckCircle2}
          sub={`${stats.pctComprado}% del total`} />
        <KpiCard label="En proceso"      value={stats.enProceso}    color="var(--indigo-600)" Icon={Clock}        />
        <KpiCard label="Pendientes"      value={stats.pendientes}   color="var(--n-500)" Icon={AlertCircle}  />
        <KpiCard label="Sin cotizar"     value={stats.sinCotizar.length} color="var(--red-500)" Icon={AlertCircle}
          sub="sin precio registrado" />
        <KpiCard
          label="Inversión mínima estimada"
          value={`S/ ${stats.totalMinimo.toFixed(2)}`}
          color="var(--amber-500)" Icon={DollarSign}
          sub="mejor precio por ítem"
        />
      </div>

      {/* Fila 1: 3 charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Pie por estado */}
        <div style={cardS}>
          <SectionTitle>Por estado de cotización</SectionTitle>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={stats.byEstado} dataKey="value" cx="50%" cy="45%" outerRadius={65} innerRadius={32}>
                {stats.byEstado.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v as number, name as string]} />
              <Legend iconType="circle" iconSize={8}
                formatter={v => <span style={{ fontSize: 11, color: 'var(--n-700)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pie por proceso */}
        <div style={cardS}>
          <SectionTitle>Por proceso</SectionTitle>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={stats.byProceso} dataKey="value" cx="50%" cy="45%" outerRadius={65} innerRadius={32}>
                {stats.byProceso.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v as number, name as string]} />
              <Legend iconType="circle" iconSize={8}
                formatter={v => <span style={{ fontSize: 11, color: 'var(--n-700)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar por tipo */}
        <div style={cardS}>
          <SectionTitle>Ítems por tipo</SectionTitle>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={stats.byTipo} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--indigo-600)" radius={[0, 3, 3, 0]} name="Ítems" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fila 2: Precios por proveedor + tablas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Bar precios por proveedor */}
        <div style={cardS}>
          <SectionTitle>Total cotizado por proveedor (S/)</SectionTitle>
          {stats.byProveedor.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>Sin precios registrados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byProveedor} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `S/${v.toFixed(0)}`} />
                <Tooltip formatter={(v) => [`S/ ${Number(v).toFixed(2)}`, 'Total']} />
                <Bar dataKey="total" radius={[3, 3, 0, 0]} name="Total">
                  {stats.byProveedor.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {stats.mejorProveedor && (
            <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--green-50)', borderRadius: 7, border: '1px solid var(--green-200)', fontSize: 11.5, color: 'var(--green-700)', fontWeight: 600 }}>
              Mayor cobertura: {stats.mejorProveedor.name} — S/ {stats.mejorProveedor.total.toFixed(2)}
            </div>
          )}
        </div>

        {/* Pendientes con precio */}
        <div style={cardS}>
          <SectionTitle>Pendientes / En proceso con precio registrado</SectionTitle>
          {stats.pendientesConPrecio.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>Todos comprados o sin precio</div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--n-0)', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--n-100)' }}>
                    {['#', 'Descripción', 'Estado', 'Mejor precio'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.pendientesConPrecio.map((it, i) => {
                    const vals = PROVEEDORES.map(p => ({ label: p.label, v: Number(it[p.key]) || 0 })).filter(x => x.v > 0)
                    const best = vals.length ? vals.reduce((a, b) => a.v < b.v ? a : b) : null
                    const estColor = it.estado_cot === 'EN PROCESO' ? 'var(--indigo-600)' : 'var(--n-500)'
                    const estBg    = it.estado_cot === 'EN PROCESO' ? 'var(--indigo-50)' : 'var(--n-100)'
                    return (
                      <tr key={it.id} style={{ borderBottom: i < stats.pendientesConPrecio.length - 1 ? '1px solid var(--n-100)' : undefined }}>
                        <td style={{ padding: '5px 8px', color: 'var(--n-400)', fontWeight: 700, fontSize: 10.5 }}>{it.item}</td>
                        <td style={{ padding: '5px 8px', color: 'var(--n-800)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.descripcion}>{it.descripcion}</td>
                        <td style={{ padding: '5px 8px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: estBg, color: estColor }}>{it.estado_cot}</span>
                        </td>
                        <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--green-500)', whiteSpace: 'nowrap' }}>
                          {best ? `${best.label}: S/ ${best.v.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ítems sin cotizar */}
      {stats.sinCotizar.length > 0 && (
        <div style={cardS}>
          <SectionTitle>Ítems sin precio registrado ({stats.sinCotizar.length})</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {stats.sinCotizar.map(it => (
              <span key={it.id} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'var(--n-100)', color: 'var(--n-600)', border: '1px solid var(--n-200)' }}>
                {it.item ? `#${it.item} ` : ''}{it.descripcion}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
