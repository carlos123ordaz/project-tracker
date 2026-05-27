import { useState } from 'react'
import type { Task, Project } from '../../lib/types'
import { useTeamMembers, useTaskStatuses, useTaskPriorities, useTaskTypes } from '../../hooks/useConfig'
import { Button } from '../ui/Button'

const FIELD_LABEL: React.CSSProperties = { fontSize: 11.5, fontWeight: 550, color: 'var(--n-700)', marginBottom: 5, display: 'block' }
const INPUT: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...(span2 ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={FIELD_LABEL}>{label}</span>
      {children}
    </label>
  )
}

const onFocusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--brand-500)'
  e.currentTarget.style.boxShadow = 'var(--ring)'
}
const onBlurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--n-200)'
  e.currentTarget.style.boxShadow = 'none'
}

interface TaskFormProps {
  projectId?: string
  projects?: Project[]
  nextNumber: number
  initial?: Partial<Task>
  onSubmit: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'project'>) => Promise<void>
  onCancel: () => void
}

export default function TaskForm({ projectId, projects, nextNumber, initial, onSubmit, onCancel }: TaskFormProps) {
  const { items: statuses }   = useTaskStatuses()
  const { items: priorities } = useTaskPriorities()
  const { items: types }      = useTaskTypes()
  const { items: members }    = useTeamMembers()

  const resolvedProjectId = initial?.project_id ?? projectId ?? projects?.[0]?.id ?? ''

  const [form, setForm] = useState({
    project_id:  resolvedProjectId,
    number:      initial?.number      ?? nextNumber,
    type:        initial?.type        ?? '',
    name:        initial?.name        ?? '',
    status:      initial?.status      ?? (statuses[0]?.name || 'No Iniciado'),
    priority:    initial?.priority    ?? 'Media',
    start_date:  initial?.start_date  ?? '',
    end_date:    initial?.end_date    ?? '',
    assigned_to: initial?.assigned_to ?? '',
    budget:      initial?.budget      ?? 0,
    actual_cost: initial?.actual_cost ?? 0,
    progress:    initial?.progress    ?? 0,
    label:       initial?.label       ?? '',
    notes:       initial?.notes       ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }))
  const pct = Math.round(Number(form.progress) * 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre de la tarea es requerido'); return }
    setSaving(true)
    try {
      await onSubmit({
        ...form,
        start_date:  form.start_date  || null,
        end_date:    form.end_date    || null,
        assigned_to: form.assigned_to || null,
        label:       form.label       || null,
        notes:       form.notes       || null,
        budget:      Number(form.budget),
        actual_cost: Number(form.actual_cost),
        progress:    Number(form.progress),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && (
        <div style={{ fontSize: 12.5, color: 'var(--red-700)', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 6, padding: '8px 12px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {projects && projects.length > 1 && (
          <Field label="Proyecto *" span2>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle}>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Nombre de la tarea *" span2>
          <input
            autoFocus value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Descripción de la tarea"
            style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle}
          />
        </Field>

        <Field label="Estado">
          <select value={form.status} onChange={e => set('status', e.target.value)} style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle}>
            {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </Field>

        <Field label="Prioridad">
          <select value={form.priority} onChange={e => set('priority', e.target.value)} style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle}>
            {priorities.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>

        <Field label="Tipo de tarea">
          <select value={form.type} onChange={e => set('type', e.target.value)} style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle}>
            <option value="">— Sin tipo —</option>
            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </Field>

        <Field label="Asignada a">
          <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle}>
            <option value="">— Sin asignar —</option>
            {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </Field>

        <Field label="Fecha de inicio">
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle} />
        </Field>

        <Field label="Fecha de fin">
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={INPUT} onFocus={onFocusStyle} onBlur={onBlurStyle} />
        </Field>

        <Field label="Presupuesto ($)">
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--n-200)', borderRadius: 6, height: 32, padding: '0 10px', background: 'var(--n-0)' }}
            onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ring)' }}
            onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-200)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <span className="mono" style={{ fontSize: 12, color: 'var(--n-500)', marginRight: 4 }}>$</span>
            <input type="number" min="0" step="1" value={form.budget} onChange={e => set('budget', e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--n-900)', fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        </Field>

        <Field label="Costo actual ($)">
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--n-200)', borderRadius: 6, height: 32, padding: '0 10px', background: 'var(--n-0)' }}
            onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ring)' }}
            onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-200)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <span className="mono" style={{ fontSize: 12, color: 'var(--n-500)', marginRight: 4 }}>$</span>
            <input type="number" min="0" step="1" value={form.actual_cost} onChange={e => set('actual_cost', e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--n-900)', fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        </Field>

        <Field label={`Avance — ${pct}%`} span2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="range" min="0" max="100" step="5"
              value={pct}
              onChange={e => set('progress', Number(e.target.value) / 100)}
              style={{ width: '100%', accentColor: 'var(--brand-600)', height: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--n-400)' }}>
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>
        </Field>

        <Field label="Notas" span2>
          <textarea
            value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={2} placeholder="Observaciones adicionales..."
            style={{ ...INPUT, height: 'auto', padding: '8px 10px', resize: 'none', lineHeight: 1.5 }}
            onFocus={onFocusStyle} onBlur={onBlurStyle}
          />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
        <Button type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Guardando...' : initial?.id ? 'Actualizar tarea' : 'Crear tarea'}
        </Button>
      </div>
    </form>
  )
}
