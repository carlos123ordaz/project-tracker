import { useState } from 'react'
import type { Project, FocusArea } from '../../lib/types'
import { useTeamMembers } from '../../hooks/useConfig'
import { Button } from '../ui/Button'
import { getProjectColor } from '../../lib/helpers'

const PROJECT_COLORS = [
  '#3B82F6','#06B6D4','#7C3AED','#EC4899','#10B981',
  '#F59E0B','#EF4444','#F97316','#0EA5E9','#059669',
  '#8B5CF6','#14B8A6','#DC2626','#64748B','#4F46E5',
]

const FIELD_LABEL: React.CSSProperties = { fontSize: 11.5, fontWeight: 550, color: 'var(--n-700)', marginBottom: 5, display: 'block' }
const INPUT_STYLE: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...(span2 ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={FIELD_LABEL}>{label}</span>
      {children}
    </label>
  )
}

interface ProjectFormProps {
  initial?: Partial<Project>
  onSubmit: (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel: () => void
}

export default function ProjectForm({ initial, onSubmit, onCancel }: ProjectFormProps) {
  const { items: members } = useTeamMembers()

  const [form, setForm] = useState({
    name:       initial?.name       ?? '',
    focus_area: (initial?.focus_area ?? 'Proyectos') as FocusArea,
    initiative: initial?.initiative ?? '',
    leader:     initial?.leader     ?? '',
    start_date: initial?.start_date ?? '',
    end_date:   initial?.end_date   ?? '',
    color:      initial?.color ? getProjectColor(initial.color) : PROJECT_COLORS[0],
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    try {
      await onSubmit({ ...form, start_date: form.start_date || null, end_date: form.end_date || null })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--brand-500)'
    e.currentTarget.style.boxShadow = 'var(--ring)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--n-200)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div style={{ fontSize: 12.5, color: 'var(--red-700)', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 6, padding: '8px 12px' }}>
          {error}
        </div>
      )}

      <div className="form-grid">
        <Field label="Nombre del proyecto *" span2>
          <input
            autoFocus value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ej: Construcción de Tableros"
            style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur}
          />
        </Field>

        <Field label="Área">
          <select value={form.focus_area} onChange={e => set('focus_area', e.target.value)} style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur}>
            <option value="Proyectos">Proyectos</option>
            <option value="Ingeniería">Ingeniería</option>
            <option value="Otro">Otro</option>
          </select>
        </Field>

        <Field label="Iniciativa / Cliente">
          <input value={form.initiative} onChange={e => set('initiative', e.target.value)} placeholder="Ej: Yanacocha" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
        </Field>

        <Field label="Líder del proyecto" span2>
          {members.length > 0 ? (
            <select value={form.leader} onChange={e => set('leader', e.target.value)} style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur}>
              <option value="">— Sin líder —</option>
              {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          ) : (
            <input value={form.leader} onChange={e => set('leader', e.target.value)} placeholder="Nombre del líder" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
          )}
        </Field>

        <Field label="Fecha de inicio">
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
        </Field>

        <Field label="Fecha de fin">
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
        </Field>

        <Field label="Color del proyecto" span2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, padding: 8, background: 'var(--n-25)', border: '1px solid var(--n-150)', borderRadius: 8 }}>
            {PROJECT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)} title={c}
                style={{ height: 26, borderRadius: 6, background: c, cursor: 'pointer', border: form.color === c ? '2px solid var(--n-900)' : '1px solid rgba(0,0,0,0.06)', outline: form.color === c ? '2px solid var(--n-0)' : 'none', outlineOffset: -3, boxShadow: form.color === c ? `0 2px 6px ${c}66` : 'none', transition: 'transform .15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
              />
            ))}
          </div>
          {form.color && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: form.color, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--n-600)' }}>{form.color}</span>
            </div>
          )}
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
        <Button type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Guardando...' : initial?.id ? 'Actualizar proyecto' : 'Crear proyecto'}
        </Button>
      </div>
    </form>
  )
}
