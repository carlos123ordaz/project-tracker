import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSchedules } from '../hooks/useSchedules'
import { useBudgets } from '../hooks/useBudgets'
import { PageLoader } from '../components/ui/Loader'
import { Button, IconButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { CalendarRange, Plus, Trash2, ArrowRight } from 'lucide-react'
import type { PeriodType } from '../lib/types'

const PERIOD_LABELS: Record<PeriodType, string> = { day: 'Diario', week: 'Semanal', month: 'Mensual' }

const TH: React.CSSProperties = {
  padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 10.5,
  color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap', background: 'var(--n-25)',
}
const TD: React.CSSProperties = { padding: '11px 14px', verticalAlign: 'middle', fontSize: 12.5 }

function NewScheduleModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: { budget_id: string; name: string; start_date: string; end_date: string; period_type: PeriodType }) => Promise<void>
}) {
  const { budgets, loading } = useBudgets()
  const [budgetId,  setBudgetId]  = useState('')
  const [name,      setName]      = useState('Cronograma Principal')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [period,    setPeriod]    = useState<PeriodType>('week')
  const [saving,    setSaving]    = useState(false)

  const INP: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12.5, width: '100%',
    border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)',
    color: 'var(--n-900)', outline: 'none', boxSizing: 'border-box',
  }
  const LBL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 4, display: 'block' }

  const valid = budgetId && name.trim() && startDate && endDate && endDate >= startDate

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      await onCreate({ budget_id: budgetId, name: name.trim(), start_date: startDate, end_date: endDate, period_type: period })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={LBL}>Presupuesto *</label>
        <select style={{ ...INP, cursor: 'pointer' }} value={budgetId} onChange={e => setBudgetId(e.target.value)} required disabled={loading}>
          <option value="">— Selecciona un presupuesto —</option>
          {budgets.map(b => <option key={b.id} value={b.id}>{b.name} · {b.client}</option>)}
        </select>
      </div>
      <div>
        <label style={LBL}>Nombre del cronograma *</label>
        <input style={INP} value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={LBL}>Fecha inicio *</label>
          <input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label style={LBL}>Fecha fin *</label>
          <input type="date" style={INP} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
        </div>
      </div>
      <div>
        <label style={LBL}>Tipo de período</label>
        <select style={{ ...INP, cursor: 'pointer' }} value={period} onChange={e => setPeriod(e.target.value as PeriodType)}>
          <option value="day">Diario</option>
          <option value="week">Semanal</option>
          <option value="month">Mensual</option>
        </select>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button type="button" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" type="submit" disabled={!valid || saving}>
          {saving ? 'Creando…' : 'Crear cronograma'}
        </Button>
      </div>
    </form>
  )
}

export default function SchedulesPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { schedules, loading, createSchedule, deleteSchedule } = useSchedules()
  const canAdd = hasPermission('proyectos:programar', 'add')
  const canDelete = hasPermission('proyectos:programar', 'delete')
  const [showCreate,  setShowCreate]  = useState(false)
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  if (loading) return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  )

  const handleCreate = async (data: Parameters<typeof createSchedule>[0]) => {
    const row = await createSchedule(data)
    if (row) navigate(`/schedule/${row.id}`)
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try { await deleteSchedule(confirmDel) } finally { setDeleting(false); setConfirmDel(null) }
  }

  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--n-150)',
        display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto',
      }}>
        <CalendarRange size={18} style={{ color: 'var(--brand-600)' }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--n-900)', lineHeight: 1.2 }}>Programar</h1>
          <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>Cronogramas de ejecución ligados a presupuestos</div>
        </div>
        {canAdd && <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>Nuevo cronograma</Button>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {schedules.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <CalendarRange size={36} style={{ color: 'var(--n-300)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-700)', marginBottom: 6 }}>Sin cronogramas</div>
            <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginBottom: 20 }}>Crea un cronograma ligado a un presupuesto para programar costos en el tiempo.</div>
            {canAdd && <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>Crear primer cronograma</Button>}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, minWidth: 220 }}>Nombre</th>
                  <th style={{ ...TH, minWidth: 180 }}>Presupuesto</th>
                  <th style={{ ...TH, width: 160 }}>Inicio</th>
                  <th style={{ ...TH, width: 160 }}>Fin</th>
                  <th style={{ ...TH, width: 100 }}>Período</th>
                  <th style={{ ...TH, width: 80, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => (
                  <tr key={s.id}
                    style={{ borderTop: '1px solid var(--n-150)', cursor: 'pointer', transition: 'background .12s' }}
                    onClick={() => navigate(`/schedule/${s.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...TD }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CalendarRange size={14} style={{ color: 'var(--brand-500)', flex: '0 0 auto' }} />
                        <span style={{ fontWeight: 600, color: 'var(--n-900)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize: 12.5, color: 'var(--n-800)' }}>{s.budget?.name ?? '—'}</div>
                      {s.budget?.client && <div style={{ fontSize: 11, color: 'var(--n-500)' }}>{s.budget.client}</div>}
                    </td>
                    <td style={{ ...TD, color: 'var(--n-700)' }} className="mono">{fmt(s.start_date)}</td>
                    <td style={{ ...TD, color: 'var(--n-700)' }} className="mono">{fmt(s.end_date)}</td>
                    <td style={TD}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 5,
                        fontSize: 11, fontWeight: 600,
                        background: 'var(--brand-50)', color: 'var(--brand-700)',
                      }}>
                        {PERIOD_LABELS[s.period_type]}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', gap: 2 }}>
                        <IconButton icon={ArrowRight} title="Abrir" size={26} onClick={e => { e.stopPropagation(); navigate(`/schedule/${s.id}`) }} />
                        {canDelete && <IconButton icon={Trash2} title="Eliminar" size={26} danger onClick={e => { e.stopPropagation(); setConfirmDel(s.id) }} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo cronograma">
        <NewScheduleModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      </Modal>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Eliminar cronograma" size="sm">
        <p style={{ fontSize: 13, color: 'var(--n-700)', marginBottom: 16, lineHeight: 1.5 }}>
          ¿Eliminar este cronograma? Se borrarán todas las fechas asignadas y los avances registrados.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setConfirmDel(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
