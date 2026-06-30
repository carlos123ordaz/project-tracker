import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ShoppingCart, Truck, ArrowDownToLine, AlertTriangle, TrendingUp, ChevronDown } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalEquipos: number
  equiposBajoStock: number
  pedidosPendientes: number
  recepcionesHoy: number
  despachosHoy: number
  movimientosSemana: number
}

interface UltimoMovimiento {
  id: string
  tipo: string
  cantidad: number
  fecha: string
  equipo: { nombre: string } | null
}

interface PedidoRaw {
  fecha_pedido: string
  estado: string
}

interface ChartPoint {
  mes: string
  Total: number
  Pendiente: number
  Aprobado: number
  Completado: number
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function AlmacenDashboardPage() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()

  const [stats, setStats] = useState<Stats>({
    totalEquipos: 0, equiposBajoStock: 0,
    pedidosPendientes: 0, recepcionesHoy: 0,
    despachosHoy: 0, movimientosSemana: 0,
  })
  const [ultimosMovimientos, setUltimosMovimientos] = useState<UltimoMovimiento[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear])

  // ── Stats fetch ────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const hoy = new Date().toISOString().split('T')[0]
      const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [equiposRes, pedidosRes, recepcionesRes, despachosRes, movRes, ultMovRes, minFechaRes] =
        await Promise.all([
          supabase.from('almacen_equipos').select('stock_actual,stock_minimo').eq('estado', 'Activo'),
          supabase.from('almacen_pedidos').select('*', { count: 'exact', head: true })
            .in('estado', ['Pendiente', 'Aprobado']),
          supabase.from('almacen_recepciones').select('*', { count: 'exact', head: true })
            .eq('fecha_recepcion', hoy),
          supabase.from('almacen_despachos').select('*', { count: 'exact', head: true })
            .eq('fecha_despacho', hoy),
          supabase.from('almacen_kardex').select('*', { count: 'exact', head: true })
            .gte('created_at', semanaAtras),
          supabase.from('almacen_kardex')
            .select('id, tipo, cantidad, fecha, equipo:almacen_equipos(nombre)')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase.from('almacen_pedidos').select('fecha_pedido').order('fecha_pedido').limit(1),
        ])

      const equiposData = (equiposRes.data ?? []) as { stock_actual: number; stock_minimo: number }[]
      const bajoStockCount = equiposData.filter(e => e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo).length

      setStats({
        totalEquipos: equiposData.length,
        equiposBajoStock: bajoStockCount,
        pedidosPendientes: pedidosRes.count ?? 0,
        recepcionesHoy: recepcionesRes.count ?? 0,
        despachosHoy: despachosRes.count ?? 0,
        movimientosSemana: movRes.count ?? 0,
      })
      setUltimosMovimientos((ultMovRes.data ?? []) as unknown as UltimoMovimiento[])

      // Build available years range
      const minYear = minFechaRes.data?.[0]?.fecha_pedido
        ? new Date(minFechaRes.data[0].fecha_pedido).getFullYear()
        : currentYear
      const years: number[] = []
      for (let y = currentYear; y >= minYear; y--) years.push(y)
      setAvailableYears(years.length > 0 ? years : [currentYear])

      setLoading(false)
    }
    fetchStats()
  }, [currentYear])

  // ── Chart data fetch ───────────────────────────────────────────
  useEffect(() => {
    const fetchChart = async () => {
      setChartLoading(true)
      const { data } = await supabase
        .from('almacen_pedidos')
        .select('fecha_pedido, estado')
        .gte('fecha_pedido', `${selectedYear}-01-01`)
        .lte('fecha_pedido', `${selectedYear}-12-31`)

      const rows = (data ?? []) as PedidoRaw[]
      const points: ChartPoint[] = MESES.map((mes, i) => {
        const mes_rows = rows.filter(r => new Date(r.fecha_pedido).getMonth() === i)
        return {
          mes,
          Total: mes_rows.length,
          Pendiente: mes_rows.filter(r => r.estado === 'Pendiente').length,
          Aprobado: mes_rows.filter(r => r.estado === 'Aprobado').length,
          Completado: mes_rows.filter(r => r.estado === 'Completado').length,
        }
      })
      setChartData(points)
      setChartLoading(false)
    }
    fetchChart()
  }, [selectedYear])

  const kpis = [
    { label: 'Equipos activos', value: stats.totalEquipos, icon: Package, color: 'var(--brand-600)', bg: 'var(--brand-50)', action: () => navigate('/almacen/equipos') },
    { label: 'Bajo stock', value: stats.equiposBajoStock, icon: AlertTriangle, color: 'var(--red-600)', bg: 'var(--red-50)', action: () => navigate('/almacen/equipos') },
    { label: 'Pedidos pendientes', value: stats.pedidosPendientes, icon: ShoppingCart, color: 'var(--amber-600)', bg: 'var(--amber-50)', action: () => navigate('/almacen/pedidos') },
    { label: 'Recepciones hoy', value: stats.recepcionesHoy, icon: ArrowDownToLine, color: 'var(--green-600)', bg: 'var(--green-50)', action: () => navigate('/almacen/recepciones') },
    { label: 'Despachos hoy', value: stats.despachosHoy, icon: Truck, color: 'var(--purple-600)', bg: 'var(--purple-50)', action: () => navigate('/almacen/despachos') },
    { label: 'Movimientos (7d)', value: stats.movimientosSemana, icon: TrendingUp, color: 'var(--n-600)', bg: 'var(--n-100)', action: () => navigate('/almacen/kardex') },
  ]

  const tipoColor: Record<string, string> = {
    Entrada: 'var(--green-600)', Salida: 'var(--red-600)', Ajuste: 'var(--amber-600)',
  }
  const tipoBg: Record<string, string> = {
    Entrada: 'var(--green-50)', Salida: 'var(--red-50)', Ajuste: 'var(--amber-50)',
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Almacén</h1>
        <p style={{ fontSize: 13, color: 'var(--n-500)', margin: '4px 0 0' }}>Resumen general del módulo de almacén</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            {kpis.map(k => (
              <button
                key={k.label}
                onClick={k.action}
                style={{
                  background: 'var(--n-0)', border: '1px solid var(--n-150)',
                  borderRadius: 10, padding: '16px', textAlign: 'left',
                  cursor: 'pointer', transition: 'box-shadow .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <k.icon size={18} color={k.color} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--n-900)', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 4 }}>{k.label}</div>
              </button>
            ))}
          </div>

          {/* Pedidos por mes — gráfico */}
          <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-800)', margin: 0 }}>Pedidos por mes</h3>
                <p style={{ fontSize: 12, color: 'var(--n-400)', margin: '2px 0 0' }}>Evolución mensual de pedidos generados</p>
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  style={{
                    padding: '5px 28px 5px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                    border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)',
                    cursor: 'pointer', appearance: 'none', outline: 'none',
                  }}
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
              </div>
            </div>

            {chartLoading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAprobado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompletado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--n-100)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11.5, fill: 'var(--n-400)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: 'var(--n-400)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12.5, borderRadius: 8, border: '1px solid var(--n-150)', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                    labelStyle={{ fontWeight: 600, color: 'var(--n-800)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="Total" stroke="var(--brand-500)" strokeWidth={2} fill="url(#gradTotal)" dot={{ r: 3, fill: 'var(--brand-500)' }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="Aprobado" stroke="#2563eb" strokeWidth={1.5} fill="url(#gradAprobado)" dot={{ r: 2.5, fill: '#2563eb' }} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Completado" stroke="#16a34a" strokeWidth={1.5} fill="url(#gradCompletado)" dot={{ r: 2.5, fill: '#16a34a' }} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Últimos movimientos */}
          <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-800)', margin: '0 0 16px' }}>
              Últimos movimientos de kardex
            </h3>
            {ultimosMovimientos.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--n-400)', margin: 0 }}>Sin movimientos registrados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ultimosMovimientos.map(m => (
                  <div
                    key={m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--n-25)', borderRadius: 7 }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      color: tipoColor[m.tipo] ?? 'var(--n-600)',
                      background: tipoBg[m.tipo] ?? 'var(--n-100)',
                      whiteSpace: 'nowrap',
                    }}>
                      {m.tipo}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--n-700)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.equipo?.nombre ?? '—'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)', whiteSpace: 'nowrap' }}>
                      {m.tipo === 'Salida' ? `-${m.cantidad}` : `+${m.cantidad}`}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--n-400)', whiteSpace: 'nowrap' }}>
                      {new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
