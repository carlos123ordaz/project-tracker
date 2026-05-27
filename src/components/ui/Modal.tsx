import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
}

const MAX_WIDTHS = { sm: 420, md: 560, lg: 720 }

export default function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(15,17,22,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'relative',
        background: 'var(--n-0)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: MAX_WIDTHS[size],
        animation: 'scaleIn .2s cubic-bezier(.4,0,.2,1) both',
        display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--n-150)',
          flex: '0 0 auto',
        }}>
          <h2 style={{ fontSize: 14 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--n-500)', cursor: 'pointer',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-100)'; e.currentTarget.style.color = 'var(--n-800)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-500)' }}
          >
            <X size={14} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--n-150)',
            flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
