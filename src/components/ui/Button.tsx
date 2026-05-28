import type { CSSProperties, ReactNode, ElementType, MouseEventHandler } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: Variant
  size?: Size
  icon?: ElementType
  iconRight?: ElementType
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
  title?: string
}

const SIZES = {
  sm: { padding: '4px 9px',  fontSize: 12,   height: 26, gap: 6, iconSize: 13 },
  md: { padding: '6px 11px', fontSize: 12.5, height: 30, gap: 6, iconSize: 14 },
  lg: { padding: '8px 14px', fontSize: 13,   height: 36, gap: 7, iconSize: 15 },
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary:   { background: 'var(--brand-600)', color: '#fff', border: '1px solid var(--brand-600)', boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 1px 2px rgba(79,70,229,0.18)' },
  secondary: { background: 'var(--n-0)', color: 'var(--n-800)', border: '1px solid var(--n-200)', boxShadow: 'var(--shadow-xs)' },
  ghost:     { background: 'transparent', color: 'var(--n-700)', border: '1px solid transparent' },
  danger:    { background: 'var(--n-0)', color: 'var(--red-600)', border: '1px solid var(--n-200)' },
  subtle:    { background: 'var(--n-100)', color: 'var(--n-800)', border: '1px solid transparent' },
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, children, onClick, disabled, type, style, title }: ButtonProps) {
  const s = SIZES[size]
  const v = VARIANTS[variant]
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: s.gap,
        padding: s.padding, height: s.height,
        fontSize: s.fontSize, fontWeight: 550,
        borderRadius: 6, letterSpacing: '-0.005em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background .15s, border-color .15s, box-shadow .15s',
        ...v, ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'primary')   e.currentTarget.style.background = 'var(--brand-700)'
        else if (variant === 'ghost') e.currentTarget.style.background = 'var(--n-100)'
        else if (variant === 'danger') { e.currentTarget.style.background = 'var(--red-50)'; e.currentTarget.style.borderColor = 'var(--red-100)' }
        else if (variant === 'subtle') e.currentTarget.style.background = 'var(--n-150)'
        else { e.currentTarget.style.borderColor = 'var(--n-300)'; e.currentTarget.style.background = 'var(--n-25)' }
      }}
      onMouseLeave={e => { Object.assign(e.currentTarget.style, v, style) }}
    >
      {Icon && <Icon size={s.iconSize} />}
      {children}
      {IconRight && <IconRight size={s.iconSize} />}
    </button>
  )
}

interface IconButtonProps {
  icon: ElementType
  onClick?: MouseEventHandler<HTMLButtonElement>
  title?: string
  size?: number
  danger?: boolean
  disabled?: boolean
}

export function IconButton({ icon: Icon, onClick, title, size = 28, danger = false, disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-tip={title}
      disabled={disabled}
      style={{
        width: size, height: size,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: '1px solid transparent', background: 'transparent',
        color: danger ? 'var(--red-600)' : 'var(--n-500)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background .15s, color .15s',
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background = danger ? 'var(--red-50)' : 'var(--n-100)'
        e.currentTarget.style.color = danger ? 'var(--red-700)' : 'var(--n-800)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = danger ? 'var(--red-600)' : 'var(--n-500)'
      }}
    >
      <Icon size={Math.round(size * 0.5)} />
    </button>
  )
}
