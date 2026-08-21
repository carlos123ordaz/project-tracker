import { useEffect, useState } from 'react'
import type { Task, Project } from '../../lib/types'
import { useConfigData } from '../../hooks/useConfigData'
import { Avatar } from './Avatar'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import ProgressBar from './ProgressBar'
import { Button, IconButton } from './Button'
import { fmtMoney, fmtDate, getProjectColor } from '../../lib/helpers'
import { X, Trash2, AlertTriangle } from 'lucide-react'

interface TaskDrawerProps {
  task: Task | null
  projects: Project[]
  onClose: () => void
  onSave: (id: string, changes: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>>) => Promise<void>
  onDelete?: (task: Task) => void
}

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--n-500)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block',
}
const INPUT: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 10px', fontSize: 12.5,
  border: '1px solid var(--n-200)', borderRadius: 6,
  background: 'var(--n-0)', color: 'var(--n-900)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--brand-500)'
  e.currentTarget.style.boxShadow = 'var(--ring)'
}
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--n-200)'
  e.currentTarget.style.boxShadow = 'none'
}

export default function TaskDrawer({ task, projects, onClose, onSave, onDelete }: TaskDrawerProps) {
  const { statuses, priorities, types, team, getMember } = useConfigData()

  const [form, setForm] = useState<Partial<Task>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [visible, setVisible] = useState(false)

  // Animate in/out
  useEffect(() => {
    if (task) {
      setForm({
        name:        task.name,
        status:      task.status,
        priority:    task.priority,
        type:        task.type,
        assigned_to: task.assigned_to,
        start_date:  task.start_date,
        end_date:    task.end_date,
        progress:    task.progress,
        budget:      task.budget,
        actual_cost: task.actual_cost,
        notes:       task.notes,
      })
      setDirty(false)
      // small delay so the drawer renders first, then animates
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
    }
  }, [task])

  const set = (k: keyof Task, v: string | number | null) => {
    setForm(f => ({ ...f, [k]: v }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!task) return
    setSaving(true)
    try { await onSave(task.id, form as any) }
    finally { setSaving(false); setDirty(false) }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  if (!task) return null

  const project   = projects.find(p => p.id === task.project_id)
  const projColor = getProjectColor(project?.color)
  const member    = getMember(form.assigned_to || '')
  const isLate    = form.status === 'Retrasado'
  const pct       = Math.round((Number(form.progress) || 0) * 100)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,14,26,0.25)',
          zIndex: 40,
          opacity: visible ? 1 : 0,
          transition: 'opacity .22s',
          backdropFilter: 'blur(1px)',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 500, zIndex: 41,
        background: 'var(--n-0)',
        borderLeft: '1px solid var(--n-200)',
        boxShadow: '-8px 0 32px -8px rgba(10,14,26,0.12)',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .22s cubic-bezier(0.16, 1, 0.3, 1)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--n-150)',
          flex: '0 0 auto', position: 'sticky', top: 0,
          background: 'var(--n-0)', zIndex: 2,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 5,
            background: projColor + '14', border: '1px solid ' + projColor + '33',
            fontSize: 11.5, fontWeight: 600, color: projColor,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: projColor }} />
            {project?.name || '—'}
          </span>
          <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--n-400)', fontWeight: 500 }}>
            #{task.number}
          </span>
          <div style={{ flex: 1 }} />
          {onDelete && (
            <IconButton icon={Trash2} danger size={28} title="Eliminar tarea" onClick={() => { handleClose(); onDelete(task) }} />
          )}
          <IconButton icon={X} size={28} title="Cerrar" onClick={handleClose} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Late banner */}
          {isLate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, background: 'var(--red-50)', border: '1px solid var(--red-200)', fontSize: 12.5, color: 'var(--red-700)', fontWeight: 500 }}>
              <AlertTriangle size={14} />
              Esta tarea está retrasada
              {task.end_date && <span style={{ marginLeft: 'auto', fontSize: 11.5, opacity: 0.8 }}>Venció el {fmtDate(task.end_date)}</span>}
            </div>
          )}

          {/* Task name */}
          <div>
            <textarea
              value={form.name || ''}
              onChange={e => set('name', e.target.value)}
              rows={2}
              style={{
                width: '100%', padding: '8px 10px', fontSize: 17,
                fontWeight: 600, color: 'var(--n-900)',
                border: '1px solid transparent', borderRadius: 7,
                background: 'transparent', outline: 'none', resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.4, letterSpacing: '-0.015em',
                boxSizing: 'border-box',
                transition: 'border-color .15s, background .15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--n-200)'; e.currentTarget.style.background = 'var(--n-25)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
            />
          </div>

          {/* Status pills */}
          <div>
            <span style={LABEL}>Estado</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {statuses.map(s => {
                const active = form.status === s.name
                return (
                  <button key={s.id}
                    onClick={() => set('status', s.name)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 550,
                      background: active ? s.dot + '18' : 'var(--n-50)',
                      border: '1.5px solid ' + (active ? s.dot : 'var(--n-200)'),
                      color: active ? s.dot : 'var(--n-600)',
                      transition: 'all .12s',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot, opacity: active ? 1 : 0.4 }} />
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Two-column fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <span style={LABEL}>Prioridad</span>
              <select value={form.priority || ''} onChange={e => set('priority', e.target.value)} style={INPUT} onFocus={onFocus} onBlur={onBlur}>
                {priorities.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <span style={LABEL}>Tipo</span>
              <select value={form.type || ''} onChange={e => set('type', e.target.value)} style={INPUT} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Sin tipo —</option>
                {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <span style={LABEL}>Fecha de inicio</span>
              <input type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value || null)} style={INPUT} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <span style={LABEL}>Fecha de fin</span>
              <input type="date" value={form.end_date || ''} onChange={e => set('end_date', e.target.value || null)} style={INPUT} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={LABEL}>Asignado a</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {member && <Avatar member={member} size={26} />}
                <select value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value || null)} style={{ ...INPUT, flex: 1 }} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">— Sin asignar —</option>
                  {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={LABEL}>Avance</span>
              <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: pct >= 100 ? 'var(--green-600)' : pct >= 70 ? 'var(--brand-700)' : pct >= 30 ? 'var(--amber-600)' : 'var(--red-600)' }}>
                {pct}%
              </span>
            </div>
            <input type="range" min={0} max={100} step={5} value={pct}
              onChange={e => set('progress', Number(e.target.value) / 100)}
              style={{ width: '100%', accentColor: 'var(--brand-600)', marginBottom: 4 }}
            />
            <ProgressBar value={Number(form.progress) || 0} projectColor={projColor} />
          </div>

          {/* Budget / Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <span style={LABEL}>Presupuesto</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--n-200)', borderRadius: 6, height: 32, padding: '0 10px', background: 'var(--n-0)', transition: 'border-color .15s, box-shadow .15s' }}
                onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ring)' }}
                onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-200)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <span className="mono" style={{ fontSize: 12, color: 'var(--n-500)', marginRight: 4 }}>$</span>
                <input type="number" min={0} step={1} value={form.budget ?? 0} onChange={e => set('budget', Number(e.target.value))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--n-900)', fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>
            <div>
              <span style={LABEL}>Costo actual</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--n-200)', borderRadius: 6, height: 32, padding: '0 10px', background: 'var(--n-0)', transition: 'border-color .15s, box-shadow .15s' }}
                onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ring)' }}
                onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-200)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <span className="mono" style={{ fontSize: 12, color: 'var(--n-500)', marginRight: 4 }}>$</span>
                <input type="number" min={0} step={1} value={form.actual_cost ?? 0} onChange={e => set('actual_cost', Number(e.target.value))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: Number(form.actual_cost) > Number(form.budget) ? 'var(--red-700)' : 'var(--n-900)', fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
              {Number(form.actual_cost) > Number(form.budget) && (
                <div style={{ fontSize: 10.5, color: 'var(--red-600)', marginTop: 3 }}>Excede el presupuesto</div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div style={{ paddingBottom: 4 }}>
            <span style={LABEL}>Notas</span>
            <textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales…"
              style={{ ...INPUT, height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.55 }}
              onFocus={onFocus} onBlur={onBlur}
            />
          </div>

          {/* Mini summary bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid var(--n-100)', marginTop: 4, fontSize: 11.5, color: 'var(--n-500)' }}>
            <StatusBadge status={form.status || ''} size="sm" />
            <PriorityBadge priority={form.priority || ''} size="sm" />
            <span className="mono tnum" style={{ marginLeft: 'auto', fontSize: 11 }}>
              {fmtMoney(Number(form.actual_cost))} / {fmtMoney(Number(form.budget))}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--n-150)',
          display: 'flex', alignItems: 'center', gap: 8,
          position: 'sticky', bottom: 0, background: 'var(--n-0)', zIndex: 2,
        }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{ flex: 1 }}
          >
            {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
          </Button>
        </div>
      </div>
    </>
  )
}
