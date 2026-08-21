import { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Ticket, Clock, CheckCircle2, XCircle, Loader2,
  MapPin, Users, TrendingUp,
} from 'lucide-react'
import { useFormStats } from '../../hooks/useForms'
import { format, parseISO, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

const FORM_SLUG = 'solicitud-boleto'

const TIPO_LABEL: Record<string, string> = {
  aereo: 'Aéreo', terrestre: 'Terrestre',
  nacional: 'Nacional', internacional: 'Internacional',
  ida: 'Solo Ida', regreso: 'Solo Regreso',
  ida_regreso: 'Ida y Regreso', cambio_fecha: 'Cambio de Fecha',
  mochila: 'Mochila de mano', '10kg': 'Maleta 10 kg', '23kg': 'Maleta 23 kg',
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  Pendiente:   { bg: 'var(--amber-50)',  color: 'var(--amber-700)'  },
  'En proceso':{ bg: 'var(--blue-50)',   color: 'var(--blue-700)'   },
  Completado:  { bg: 'var(--green-50)',  color: 'var(--green-700)'  },
  Cancelado:   { bg: 'var(--n-100)',     color: 'var(--n-500)'      },
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: number | string; sub?: string
  icon: React.ReactNode; color: string
}) {
  return (
    <div style={{
      background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12,
      padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--n-900)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--n-600)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function BarChart({ data, total, color = 'var(--brand-500)' }: {
  data: { label: string; value: number }[]
  total: number
  color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, fontSize: 11.5, color: 'var(--n-700)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </div>
          <div style={{ flex: 1, background: 'var(--n-100)', borderRadius: 4, height: 16, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / max) * 100}%`,
              background: color, height: '100%', borderRadius: 4,
              transition: 'width .4s ease',
            }} />
          </div>
          <div style={{ width: 36, fontSize: 11.5, color: 'var(--n-600)', fontWeight: 600, flexShrink: 0 }}>
            {d.value}
          </div>
          <div style={{ width: 34, fontSize: 10.5, color: 'var(--n-400)', flexShrink: 0 }}>
            {total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%'}
          </div>
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function UserCombobox({ users, counts, total, value, onChange }: {
  users: string[]; counts: Record<string, number>; total: number
  value: string; onChange: (v: string) => void
}) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const ref                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = users.filter(u => u.toLowerCase().includes(search.toLowerCase()))
  const label    = value ? `${value} (${counts[value] ?? 0})` : `Todos los usuarios (${total})`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12.5, color: 'var(--n-800)', padding: '5px 10px',
          border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)',
          cursor: 'pointer', fontFamily: 'inherit', minWidth: 240,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--n-400)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,.1)', width: 280, overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--n-100)', position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
              style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              autoFocus
              type="text"
              placeholder="Buscar usuario…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', fontSize: 12.5, padding: '4px 8px 4px 26px',
                border: '1px solid var(--n-200)', borderRadius: 5, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div
              onMouseDown={() => { onChange(''); setSearch(''); setOpen(false) }}
              style={{
                padding: '8px 12px', fontSize: 12.5, cursor: 'pointer',
                background: !value ? 'var(--brand-50)' : 'var(--n-0)',
                color: !value ? 'var(--brand-700)' : 'var(--n-700)',
                fontWeight: !value ? 600 : 400,
                display: 'flex', justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = 'var(--n-50)' }}
              onMouseLeave={e => { if (value) e.currentTarget.style.background = 'var(--n-0)' }}
            >
              <span>Todos los usuarios</span>
              <span style={{ color: 'var(--n-400)', fontSize: 11.5 }}>{total}</span>
            </div>
            {filtered.map(u => (
              <div
                key={u}
                onMouseDown={() => { onChange(u); setSearch(''); setOpen(false) }}
                style={{
                  padding: '8px 12px', fontSize: 12.5, cursor: 'pointer',
                  background: value === u ? 'var(--brand-50)' : 'var(--n-0)',
                  color: value === u ? 'var(--brand-700)' : 'var(--n-700)',
                  fontWeight: value === u ? 600 : 400,
                  display: 'flex', justifyContent: 'space-between',
                  borderTop: '1px solid var(--n-50)',
                }}
                onMouseEnter={e => { if (value !== u) e.currentTarget.style.background = 'var(--n-50)' }}
                onMouseLeave={e => { if (value !== u) e.currentTarget.style.background = 'var(--n-0)' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u}</span>
                <span style={{ color: 'var(--n-400)', fontSize: 11.5, flexShrink: 0, marginLeft: 8 }}>{counts[u] ?? 0}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--n-400)', textAlign: 'center' }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SolicitudesDashboardPage() {
  const { rows, loading } = useFormStats(FORM_SLUG)
  const [selectedUser, setSelectedUser] = useState<string>('')

  const allUsers = useMemo(() =>
    Array.from(new Set(rows.map(r => r.submitter_name ?? 'Desconocido'))).sort()
  , [rows])

  const filteredRows = useMemo(() =>
    selectedUser ? rows.filter(r => (r.submitter_name ?? 'Desconocido') === selectedUser) : rows
  , [rows, selectedUser])

  const stats = useMemo(() => {
    const total = filteredRows.length

    // By status
    const byStatus: Record<string, number> = {}
    filteredRows.forEach(r => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1 })

    // By tipo_boleto
    const byTipo: Record<string, number> = {}
    filteredRows.forEach(r => {
      const v = r.answers?.tipo_boleto ?? 'Sin datos'
      byTipo[v] = (byTipo[v] ?? 0) + 1
    })

    // By destino_vuelo
    const byDestino: Record<string, number> = {}
    filteredRows.forEach(r => {
      const v = r.answers?.destino_vuelo ?? 'Sin datos'
      byDestino[v] = (byDestino[v] ?? 0) + 1
    })

    // By tipo_servicio
    const byServicio: Record<string, number> = {}
    filteredRows.forEach(r => {
      const v = r.answers?.tipo_servicio ?? 'Sin datos'
      byServicio[v] = (byServicio[v] ?? 0) + 1
    })

    // By equipaje
    const byEquipaje: Record<string, number> = {}
    filteredRows.forEach(r => {
      const v = r.answers?.equipaje ?? 'Sin datos'
      byEquipaje[v] = (byEquipaje[v] ?? 0) + 1
    })

    // Top destinations
    const byDestCity: Record<string, number> = {}
    filteredRows.forEach(r => {
      const v = (r.answers?.ciudad_destino ?? '').trim().toUpperCase()
      if (v) byDestCity[v] = (byDestCity[v] ?? 0) + 1
    })

    // Top submitters
    const bySubmitter: Record<string, number> = {}
    filteredRows.forEach(r => {
      const v = r.submitter_name ?? 'Desconocido'
      bySubmitter[v] = (bySubmitter[v] ?? 0) + 1
    })

    // Monthly trend (last 12 months)
    const byMonth: Record<string, number> = {}
    filteredRows.forEach(r => {
      try {
        const key = format(startOfMonth(parseISO(r.created_at)), 'yyyy-MM')
        byMonth[key] = (byMonth[key] ?? 0) + 1
      } catch { /* skip */ }
    })
    const monthKeys = Object.keys(byMonth).sort()
    const last12    = monthKeys.slice(-12)

    const toArr = (obj: Record<string, number>, limit = 8) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, value]) => ({ label: TIPO_LABEL[label] ?? label, value }))

    return {
      total,
      byStatus,
      tipo:     toArr(byTipo),
      destino:  toArr(byDestino),
      servicio: toArr(byServicio),
      equipaje: toArr(byEquipaje),
      destCity: toArr(byDestCity, 10),
      submitters: toArr(bySubmitter, 10),
      trend: last12.map(k => ({
        label: format(parseISO(k + '-01'), 'MMM yy', { locale: es }),
        value: byMonth[k],
      })),
    }
  }, [filteredRows])

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>
        Cargando dashboard…
      </div>
    )
  }

  const trendMax = Math.max(...stats.trend.map(t => t.value), 1)

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link
          to="/compras/solicitudes"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, color: 'var(--n-600)', textDecoration: 'none',
            padding: '5px 10px', borderRadius: 7, border: '1px solid var(--n-200)',
            background: 'var(--n-0)',
          }}
        >
          <ArrowLeft size={13} /> Volver
        </Link>
        <div>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            Dashboard — Solicitudes de Boletos
          </h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', margin: '2px 0 0' }}>
            {stats.total} solicitudes en total
          </p>
        </div>
      </div>

      {/* Filtro por usuario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
          Filtrar por usuario:
        </label>
        <UserCombobox
          users={allUsers}
          counts={Object.fromEntries(allUsers.map(u => [u, rows.filter(r => (r.submitter_name ?? 'Desconocido') === u).length]))}
          total={rows.length}
          value={selectedUser}
          onChange={setSelectedUser}
        />
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total solicitudes" value={stats.total} icon={<Ticket size={18} />} color="var(--brand-600)" />
        <StatCard label="Pendientes"  value={stats.byStatus['Pendiente']   ?? 0} icon={<Clock size={18} />}        color="var(--amber-600)" />
        <StatCard label="En proceso"  value={stats.byStatus['En proceso']  ?? 0} icon={<Loader2 size={18} />}      color="var(--blue-600)"  />
        <StatCard label="Completadas" value={stats.byStatus['Completado']  ?? 0} icon={<CheckCircle2 size={18} />} color="var(--green-600)" />
        <StatCard label="Canceladas"  value={stats.byStatus['Cancelado']   ?? 0} icon={<XCircle size={18} />}      color="var(--n-500)"     />
      </div>

      {/* Status bar */}
      {stats.total > 0 && (
        <div style={{ marginBottom: 20, background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12, padding: '14px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Distribución por estado
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 10, overflow: 'hidden', gap: 2 }}>
            {Object.entries(STATUS_COLOR).map(([st, col]) => {
              const pct = ((stats.byStatus[st] ?? 0) / stats.total) * 100
              return pct > 0 ? (
                <div key={st} title={`${st}: ${stats.byStatus[st]}`}
                  style={{ width: `${pct}%`, background: col.color, borderRadius: 10, transition: 'width .4s' }} />
              ) : null
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_COLOR).map(([st, col]) => (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--n-600)' }}>{st}</span>
                <span style={{ fontWeight: 700, color: 'var(--n-800)' }}>{stats.byStatus[st] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend chart */}
      {stats.trend.length > 0 && (
        <div style={{ marginBottom: 20, background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={14} style={{ color: 'var(--brand-700)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tendencia mensual
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {stats.trend.map(t => (
              <div key={t.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600 }}>{t.value}</div>
                <div style={{
                  width: '100%', borderRadius: '3px 3px 0 0',
                  background: 'var(--brand-400)',
                  height: `${Math.max(4, (t.value / trendMax) * 56)}px`,
                  transition: 'height .4s',
                }} />
                <div style={{ fontSize: 9.5, color: 'var(--n-400)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                  {t.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Section title="Tipo de Boleto">
          <BarChart data={stats.tipo} total={stats.total} color="var(--brand-500)" />
        </Section>

        <Section title="Destino de Vuelo">
          <BarChart data={stats.destino} total={stats.total} color="var(--blue-500)" />
        </Section>

        <Section title="Tipo de Servicio">
          <BarChart data={stats.servicio} total={stats.total} color="var(--purple-500, #8b5cf6)" />
        </Section>

        <Section title="Equipaje">
          <BarChart data={stats.equipaje} total={stats.total} color="var(--amber-500)" />
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section title={`Top destinos`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <MapPin size={13} style={{ color: 'var(--n-400)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Ciudad de destino más frecuente</span>
          </div>
          <BarChart data={stats.destCity} total={stats.total} color="var(--green-500)" />
        </Section>

        <Section title="Top solicitantes">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Users size={13} style={{ color: 'var(--n-400)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Por número de solicitudes</span>
          </div>
          <BarChart data={stats.submitters} total={stats.total} color="var(--brand-400)" />
        </Section>
      </div>
    </div>
  )
}
