import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, FileText, Pencil, Trash2, TrendingUp } from 'lucide-react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart,
} from 'recharts'
import { useValuations } from '../../hooks/useValuations'
import { useProjects } from '../../hooks/useProjects'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Button, IconButton } from '../../components/ui/Button'
import { type ValuationStatus } from '../../lib/types'
import { fmtDate } from '../../lib/helpers'

const STATUS_STYLE: Record<ValuationStatus, { bg: string; color: string }> = {
  'Borrador': { bg: 'var(--n-100)',   color: 'var(--n-600)'   },
  'Enviada':  { bg: 'var(--blue-50)', color: 'var(--blue-700)' },
  'Aprobada': { bg: 'var(--green-50)',color: 'var(--green-700)'},
  'Pagada':   { bg: '#f0fdfa',        color: '#0d9488'         },
}

function StatusBadge({ status }: { status: ValuationStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE['Borrador']
  return (
    <span style={{ padding: '2px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

function fmtS(n: number) {
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `S/ ${(n / 1_000).toFixed(1)}K`
  return `S/ ${n.toFixed(2)}`
}

function KPI({ label, value, sub, color = '#4f46e5' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140, padding: '16px 18px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color || p.fill, flexShrink: 0 }} />
          <span style={{ color: 'var(--n-600)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{fmtS(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ValuationsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { projects } = useProjects()
  const { valuations, loading, create, remove } = useValuations(projectId!)

  const project = projects.find(p => p.id === projectId)

  const contractAmount = useMemo(() => {
    const v1 = valuations[0]
    return v1?.contract_amount || 0
  }, [valuations])

  const totalValorized = useMemo(() =>
    valuations.reduce((s, v) => s + computeNeto(v), 0),
    [valuations]
  )

  const pctAvance = contractAmount > 0 ? (totalValorized / contractAmount) * 100 : 0
  const porCobrar = contractAmount > 0 ? contractAmount - totalValorized : 0

  // S-curve data
  const chartData = useMemo(() => {
    let cumul = 0
    return valuations.map(v => {
      const neto = computeNeto(v)
      cumul += neto
      return { name: `V${v.number}`, monto: neto, acumulado: cumul }
    })
  }, [valuations])

  const handleCreate = async () => {
    if (!projectId) return
    const today = new Date().toISOString().split('T')[0]
    const v = await create({
      project_id: projectId,
      number: valuations.length > 0 ? Math.max(...valuations.map(x => x.number)) + 1 : 1,
      title: null,
      period_start: today,
      period_end: today,
      status: 'Borrador',
      contract_amount: contractAmount,
      advance_pct: valuations[0]?.advance_pct ?? 0,
      retention_pct: valuations[0]?.retention_pct ?? 5,
      igv_rate: valuations[0]?.igv_rate ?? 18,
      notes: null,
    })
    navigate(`/projects/${projectId}/valuations/${v.id}`)
  }

  const handleDelete = async (id: string, n: number) => {
    if (!confirm(`¿Eliminar la Valorización N°${n}?`)) return
    await remove(id)
  }

  const pad = isMobile ? '16px' : '20px 28px 32px'

  return (
    <div style={{ padding: pad, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--n-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          <ArrowLeft size={14} /> {project?.name ?? 'Proyecto'}
        </button>
        <span style={{ color: 'var(--n-300)' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-800)' }}>Valorizaciones</span>
        <div style={{ flex: 1 }} />
        <Button icon={Plus} variant="primary" onClick={handleCreate}>Nueva valorización</Button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <KPI label="Monto Contrato"   value={fmtS(contractAmount)} sub="Sin IGV" color="#4f46e5" />
        <KPI label="Total Valorizado" value={fmtS(totalValorized)} sub={`${valuations.length} valorizaciones`} color="#16a34a" />
        <KPI label="% Avance"         value={`${pctAvance.toFixed(1)}%`} sub="Sobre monto contrato" color={pctAvance >= 100 ? '#16a34a' : '#d97706'} />
        <KPI label="Por Cobrar"       value={fmtS(Math.max(0, porCobrar))} sub="Saldo pendiente" color="#2563eb" />
      </div>

      {/* S-curve */}
      {chartData.length > 0 && (
        <div className="card" style={{ padding: '16px 16px 8px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={15} style={{ color: 'var(--brand-600)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Curva de Avance
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--n-150)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--n-500)' }} />
              <YAxis tickFormatter={v => fmtS(v)} tick={{ fontSize: 10, fill: 'var(--n-500)' }} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="monto" name="Monto período" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4, fill: '#4f46e5' }} />
              {contractAmount > 0 && (
                <Line type="monotone" dataKey={() => contractAmount} name="Contrato" stroke="#dc2626" strokeDasharray="6 3" strokeWidth={1.5} dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: 'var(--n-500)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 10, background: '#c7d2fe', borderRadius: 2, display: 'inline-block' }} /> Monto período</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 2, background: '#4f46e5', display: 'inline-block' }} /> Acumulado</span>
            {contractAmount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 2, background: '#dc2626', display: 'inline-block', borderTop: '2px dashed #dc2626' }} /> Contrato</span>}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando...</div>
        ) : valuations.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <FileText size={32} style={{ color: 'var(--n-300)', marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-600)' }}>Sin valorizaciones</div>
            <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginTop: 4, marginBottom: 16 }}>
              Crea la primera para comenzar a registrar el avance del proyecto.
            </div>
            <Button icon={Plus} variant="primary" onClick={handleCreate}>Nueva valorización</Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                  {['N°', 'Título', 'Período', 'Estado', 'Contrato', 'Neto', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'N°' ? 'center' : h === 'Contrato' || h === 'Neto' ? 'right' : 'left', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valuations.map((v, i) => {
                  const neto = computeNeto(v)
                  return (
                    <tr
                      key={v.id}
                      style={{ borderTop: i === 0 ? 'none' : '1px solid var(--n-100)', cursor: 'pointer', transition: 'background .12s' }}
                      onClick={() => navigate(`/projects/${projectId}/valuations/${v.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--n-700)', fontSize: 14 }}>
                        {v.number}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 550, color: 'var(--n-900)' }}>
                        {v.title || `Valorización N°${v.number}`}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--n-600)', fontFamily: 'monospace' }}>
                        {fmtDate(v.period_start)} → {fmtDate(v.period_end)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <StatusBadge status={v.status} />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--n-700)' }}>
                        {fmtS(v.contract_amount)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>
                        {fmtS(neto)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: 2 }}>
                          <IconButton icon={Pencil} size={26} title="Editar" onClick={() => navigate(`/projects/${projectId}/valuations/${v.id}`)} />
                          <IconButton icon={Trash2} size={26} title="Eliminar" danger onClick={() => handleDelete(v.id, v.number)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RRHH: not needed */}
    </div>
  )
}

function computeNeto(v: { contract_amount: number; advance_pct: number; retention_pct: number; igv_rate: number }) {
  const bruto = v.contract_amount
  const adelanto = bruto * (v.advance_pct / 100)
  const retencion = bruto * (v.retention_pct / 100)
  const base = bruto - adelanto - retencion
  const igv = base * (v.igv_rate / 100)
  return base + igv
}
