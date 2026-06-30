const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  loading?: boolean
}

export function Pagination({
  page, total, pageSize, onChange, onPageSizeChange, loading = false,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '4px 12px', border: '1px solid var(--n-200)', borderRadius: 6,
    background: '#fff', cursor: disabled ? 'default' : 'pointer',
    fontSize: 12, color: 'var(--n-600)', opacity: disabled ? 0.4 : 1,
    fontWeight: 500,
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', borderTop: '1px solid var(--n-150)',
      background: 'var(--n-25)', fontSize: 12.5, gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ color: 'var(--n-500)' }}>
        {total === 0 ? 'Sin resultados' : `${from}–${to} de ${total}`}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--n-500)' }}>Filas:</span>
            <select
              value={pageSize}
              onChange={e => { onPageSizeChange(Number(e.target.value)); onChange(0) }}
              disabled={loading}
              style={{
                padding: '3px 6px', fontSize: 12, border: '1px solid var(--n-200)',
                borderRadius: 6, background: '#fff', color: 'var(--n-700)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              {PAGE_SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onChange(page - 1)}
            disabled={page === 0 || loading}
            style={btnStyle(page === 0 || loading)}
          >
            ← Anterior
          </button>
          <span style={{ color: 'var(--n-600)', fontSize: 12, fontWeight: 500, minWidth: 60, textAlign: 'center' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            style={btnStyle(page >= totalPages - 1 || loading)}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  )
}
