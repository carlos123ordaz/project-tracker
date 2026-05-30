import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useConfigData } from '../hooks/useConfigData'
import ProgressBar from '../components/ui/ProgressBar'
import { Avatar } from '../components/ui/Avatar'
import { Semaforo } from '../components/ui/Semaforo'
import { DaysLeftChip } from '../components/ui/Chips'
import { AlertTriangle } from 'lucide-react'
import { PageLoader } from '../components/ui/Loader'
import { getProjectColor } from '../lib/helpers'
import type { SemKind } from '../hooks/useConfigData'

const SEM_PALETTES: Record<SemKind, { bg: string; edge: string; text: string }> = {
  green: { bg: '#ECFDF5', edge: '#A7F3D0', text: '#065F46' },
  amber: { bg: '#FFFBEB', edge: '#FDE68A', text: '#92400E' },
  red:   { bg: '#FEF2F2', edge: '#FECACA', text: '#991B1B' },
  gray:  { bg: '#F7F8FA', edge: '#E1E4EA', text: '#3B414C' },
}
const SEM_LABELS:  Record<SemKind, string> = { green: 'En curso',    amber: 'En riesgo', red: 'Crítico',                      gray: 'Sin planificar' }
const SEM_SUBS:   Record<SemKind, string> = { green: 'Sin retrasos', amber: 'Vencen ≤7 días o retrasos puntuales', red: '>30% retrasadas o fecha vencida', gray: 'Sin tareas o fechas' }
const SEM_ORDER:  Record<SemKind, number> = { red: 0, amber: 1, gray: 2, green: 3 }
const SEM_COLORS: Record<SemKind, string> = { green: '#10B981', amber: '#F59E0B', red: '#EF4444', gray: '#A8AEBA' }

const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 10.5, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle', color: 'var(--n-700)', whiteSpace: 'nowrap' }

export default function OverviewPage() {
  const { projects, loading: projLoading } = useProjects()
  const { tasks }    = useTasks()
  const { semaphoreFromMetrics, projectMetrics, getMember } = useConfigData()
  const navigate     = useNavigate()

  const rows = useMemo(() => projects.map(p => {
    const metrics = projectMetrics(p, tasks)
    return { project: p, metrics, sem: semaphoreFromMetrics(p, metrics), lead: getMember(p.leader || '') }
  }), [projects, tasks, semaphoreFromMetrics, projectMetrics, getMember])

  const counts = useMemo<Record<SemKind, number>>(() => ({
    green: rows.filter(r => r.sem.kind === 'green').length,
    amber: rows.filter(r => r.sem.kind === 'amber').length,
    red:   rows.filter(r => r.sem.kind === 'red').length,
    gray:  rows.filter(r => r.sem.kind === 'gray').length,
  }), [rows])

  const sorted = useMemo(() => [...rows].sort((a, b) => SEM_ORDER[a.sem.kind] - SEM_ORDER[b.sem.kind]), [rows])

  if (projLoading) return (
    <div className="page-content" style={{ maxWidth: 1500, margin: '0 auto' }}>
      <PageLoader />
    </div>
  )

  return (
    <div className="page-content" style={{ maxWidth: 1500, margin: '0 auto' }}>
      {/* BigSem cards */}
      <div className="resp-4col" style={{ marginBottom: 20 }}>
        {(['green', 'amber', 'red', 'gray'] as SemKind[]).map(kind => {
          const p      = SEM_PALETTES[kind]
          const count  = counts[kind]
          const urgent = kind === 'red' && count > 0
          return (
            <div key={kind} className="card card-hover" style={{ padding: 16, borderColor: urgent ? p.edge : 'var(--n-200)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: 999, background: p.bg, opacity: urgent ? 0.9 : 0.5 }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Semaforo kind={kind} size="lg" />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)', marginTop: 12 }}>{SEM_LABELS[kind]}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 4, maxWidth: 220, lineHeight: 1.45 }}>{SEM_SUBS[kind]}</div>
                </div>
                <div className="mono tnum" style={{ fontSize: 36, fontWeight: 600, color: p.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Distribution bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-900)' }}>Distribución del portafolio</span>
          <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-500)' }}>{projects.length} proyectos</span>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
          {(['green', 'amber', 'red', 'gray'] as SemKind[]).map(k => counts[k] === 0 ? null : (
            <div key={k} style={{ flex: counts[k], background: SEM_COLORS[k], transition: 'flex .3s' }} title={`${k}: ${counts[k]}`} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11 }}>
          {(['green', 'amber', 'red', 'gray'] as SemKind[]).map(k => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: SEM_COLORS[k] }} />
              <span style={{ color: 'var(--n-700)', fontWeight: 500 }}>{SEM_LABELS[k]}</span>
              <span className="mono tnum" style={{ color: 'var(--n-500)' }}>{counts[k]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--n-25)' }}>
              <th style={{ ...TH, width: 32, textAlign: 'right' }}>#</th>
              <th style={{ ...TH, width: 160 }}>Salud</th>
              <th style={{ ...TH, minWidth: 280 }}>Proyecto</th>
              <th style={{ ...TH, width: 60, textAlign: 'right' }}>Total</th>
              <th style={{ ...TH, width: 80, textAlign: 'right' }}>Pendientes</th>
              <th style={{ ...TH, width: 90, textAlign: 'right' }}>Retrasadas</th>
              <th style={{ ...TH, width: 160 }}>Avance</th>
              <th style={{ ...TH, width: 110 }}>Días restantes</th>
              <th style={{ ...TH, width: 150 }}>Líder</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ project: p, metrics: m, sem, lead }, i) => {
              const color  = getProjectColor(p.color)
              const isCrit = sem.kind === 'red'
              return (
                <tr key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{ borderTop: '1px solid var(--n-150)', background: isCrit ? 'rgba(254,226,226,0.30)' : 'transparent', cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = isCrit ? 'rgba(254,226,226,0.55)' : 'var(--n-25)'}
                  onMouseLeave={e => e.currentTarget.style.background = isCrit ? 'rgba(254,226,226,0.30)' : 'transparent'}
                >
                  <td style={{ ...TD, textAlign: 'right', color: 'var(--n-400)' }} className="mono tnum">{i + 1}</td>
                  <td style={TD}><Semaforo kind={sem.kind} label={sem.label} size="lg" /></td>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 3, height: 28, background: color, borderRadius: 2, flex: '0 0 auto' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1 }}>{p.focus_area} · {p.initiative}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }} className="mono tnum">{m.total}</td>
                  <td style={{ ...TD, textAlign: 'right' }} className="mono tnum"><span style={{ color: 'var(--n-700)' }}>{m.pending}</span></td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    {m.late > 0
                      ? <span className="mono tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'var(--red-50)', color: 'var(--red-700)', fontWeight: 600, fontSize: 11.5 }}>
                          <AlertTriangle size={11} />{m.late}
                        </span>
                      : <span className="mono tnum" style={{ color: 'var(--n-400)' }}>—</span>}
                  </td>
                  <td style={TD}><ProgressBar value={m.progress} showLabel projectColor={color} /></td>
                  <td style={TD}><DaysLeftChip endIso={p.end_date} /></td>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar member={lead} size={22} />
                      <span style={{ fontSize: 12, color: 'var(--n-800)', fontWeight: 500 }}>{lead?.name || p.leader || '—'}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
