import type { MemberObj } from '../../hooks/useConfigData'

export function Avatar({ member, size = 22, ring = false }: {
  member?: MemberObj | null; size?: number; ring?: boolean
}) {
  if (!member) return (
    <span style={{
      width: size, height: size, borderRadius: 999,
      background: 'var(--n-150)', color: 'var(--n-500)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.42), fontWeight: 600,
      border: '1px solid var(--n-200)', flex: '0 0 auto',
    }}>?</span>
  )
  return (
    <span title={member.name} style={{
      width: size, height: size, borderRadius: 999,
      background: member.color, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.42), fontWeight: 600,
      letterSpacing: '-0.02em',
      border: ring ? '2px solid var(--n-0)' : 'none',
      boxShadow: ring ? '0 0 0 1px var(--n-200)' : 'none',
      flex: '0 0 auto',
    }}>{member.initials}</span>
  )
}

export function AvatarGroup({ members, max = 3, size = 22 }: {
  members: MemberObj[]; max?: number; size?: number
}) {
  const visible = members.slice(0, max)
  const extra   = members.length - visible.length
  return (
    <span style={{ display: 'inline-flex' }}>
      {visible.map((m, i) => (
        <span key={m.id} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}>
          <Avatar member={m} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span style={{
          marginLeft: -6, width: size, height: size, borderRadius: 999,
          background: 'var(--n-100)', color: 'var(--n-600)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.round(size * 0.42), fontWeight: 600,
          border: '2px solid var(--n-0)', boxShadow: '0 0 0 1px var(--n-200)',
          flex: '0 0 auto',
        }}>+{extra}</span>
      )}
    </span>
  )
}
