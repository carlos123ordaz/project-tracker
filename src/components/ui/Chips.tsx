import type { ReactNode } from 'react'
import { daysFromToday } from '../../lib/helpers'
import { PulseDot } from './Motion'
import type { ElementType } from 'react'

/* ── DaysLeftChip ── */
export function DaysLeftChip({ endIso, condensed = false }: { endIso?: string | null; condensed?: boolean }) {
  if (!endIso) return null
  const days = daysFromToday(endIso)
  if (days === null) return null

  let bg = 'var(--green-50)', color = 'var(--green-700)'
  let label = condensed ? `${days}d` : `${days} días`
  let urgent = false

  if (days < 0) {
    bg = 'var(--red-50)'; color = 'var(--red-700)'
    label = condensed ? `${Math.abs(days)}d` : `${Math.abs(days)} días atrasado`
    urgent = true
  } else if (days === 0) {
    bg = 'var(--red-50)'; color = 'var(--red-700)'
    label = 'Hoy'
    urgent = true
  } else if (days <= 3) {
    bg = 'var(--amber-50)'; color = 'var(--amber-700)'
    urgent = true
  } else if (days <= 7) {
    bg = 'var(--amber-50)'; color = 'var(--amber-600)'
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 6px', borderRadius: 5,
      background: bg, color,
      fontSize: 10.5, fontWeight: 600,
    }} className="mono tnum">
      {urgent && <PulseDot color={color} size={5} />}
      {label}
    </span>
  )
}

/* ── ProjectTag ── */
export function ProjectTag({ project, mode = 'pill' }: {
  project?: { name: string; color: string } | null
  mode?: 'pill' | 'dot'
}) {
  if (!project) return null
  if (mode === 'dot') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--n-800)', fontWeight: 500 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: project.color, flex: '0 0 auto' }} />
        {project.name}
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 7px 2px 6px', borderRadius: 6,
      background: project.color + '14', color: 'var(--n-800)',
      fontSize: 11.5, fontWeight: 550, maxWidth: '100%', lineHeight: 1.3,
    }}>
      <span style={{ width: 3, height: 12, borderRadius: 2, background: project.color, flex: '0 0 auto' }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
    </span>
  )
}

/* ── EmptyState ── */
export function EmptyState({ icon: Icon, title, description, action }: {
  icon?: ElementType
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center', gap: 10,
    }}>
      {Icon && (
        <span style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--n-100)', color: 'var(--n-400)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 4,
        }}>
          <Icon size={22} />
        </span>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-800)' }}>{title}</div>
      {description && <div style={{ fontSize: 12.5, color: 'var(--n-500)', maxWidth: 320 }}>{description}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
