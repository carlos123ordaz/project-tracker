import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  RefreshCw, Search, TrendingUp, CalendarRange,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Trophy, XCircle, Clock, DollarSign, X,
  User, Calendar, Tag, Layers, Hash, Link2,
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useDeals, type Deal } from '../../hooks/useDeals'
import { PageLoader } from '../../components/ui/Loader'
import { Button, IconButton } from '../../components/ui/Button'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: es }) }
  catch { return '—' }
}

function fmtMoney(v: string | number, currency = 'USD') {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!n || isNaN(n)) return '—'
  const sym = currency === 'PEN' ? 'S/.' : '$'
  return `${sym} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtMoneyK(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!n || isNaN(n)) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// semantic: 'F'=Perdido, 'S'=Ganado, ''/'P'=En proceso
const SEMANTIC_LABEL: Record<string, string> = {
  S: 'Ganado',
  F: 'Perdido',
  P: 'En proceso',
  '': 'En proceso',
}

const SEMANTIC_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  S:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  F:  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  P:  { bg: 'var(--brand-50)', color: 'var(--brand-700)', border: 'var(--brand-200)' },
  '': { bg: 'var(--brand-50)', color: 'var(--brand-700)', border: 'var(--brand-200)' },
}

function SemanticBadge({ semantic }: { semantic: string }) {
  const s = SEMANTIC_STYLE[semantic] ?? SEMANTIC_STYLE['']
  const Icon = semantic === 'S' ? Trophy : semantic === 'F' ? XCircle : Clock
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 10.5, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      <Icon size={10} />
      {SEMANTIC_LABEL[semantic] ?? 'En proceso'}
    </span>
  )
}

function StageBadge({ name }: { name: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 10.5, fontWeight: 600, maxWidth: 160,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      background: 'var(--n-100)', color: 'var(--n-700)',
    }}>
      {name || '—'}
    </span>
  )
}

// ── alcance badge ────────────────────────────────────────────────────────────

const ALCANCE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'Si Incluye': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'No incluye': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  'No llenado': { bg: 'var(--n-100)', color: 'var(--n-500)', border: 'var(--n-200)' },
}

function AlcanceBadge({ value }: { value: string }) {
  const s = ALCANCE_STYLE[value] ?? ALCANCE_STYLE['No llenado']
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 10.5, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {value || 'No llenado'}
    </span>
  )
}

// ── deal drawer ───────────────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 600, color: 'var(--n-500)',
  textTransform: 'uppercase', letterSpacing: '0.07em',
  marginBottom: 4, display: 'block',
}

function Row({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--n-100)' }}>
      <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--n-75, var(--n-100))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon size={13} style={{ color: 'var(--n-500)' }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={LABEL}>{label}</span>
        <div style={{ fontSize: 13, color: 'var(--n-900)', fontWeight: 500, wordBreak: 'break-word' }}>{children}</div>
      </div>
    </div>
  )
}

function DealDrawer({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (deal) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
    }
  }, [deal])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  if (!deal) return null

  const semantic   = deal.stage_semantic_id || 'P'
  const semStyle   = SEMANTIC_STYLE[semantic] ?? SEMANTIC_STYLE['']
  const amount     = parseFloat(deal.opportunity) || 0
  const prob       = parseInt(deal.probability) || 0
  const daysToClose = deal.closedate ? differenceInDays(parseISO(deal.closedate), new Date()) : null
  const isOverdue  = daysToClose !== null && daysToClose < 0 && semantic !== 'S' && semantic !== 'F'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,14,26,0.22)',
          zIndex: 40,
          opacity: visible ? 1 : 0,
          transition: 'opacity .22s',
          backdropFilter: 'blur(1px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, zIndex: 41,
        background: 'var(--n-0)',
        borderLeft: '1px solid var(--n-200)',
        boxShadow: '-8px 0 32px -8px rgba(10,14,26,0.14)',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--n-150)',
          flexShrink: 0, position: 'sticky', top: 0,
          background: 'var(--n-0)', zIndex: 2,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 6,
            background: semStyle.bg, border: `1px solid ${semStyle.border}`,
            fontSize: 11.5, fontWeight: 700, color: semStyle.color,
          }}>
            {semantic === 'S' ? <Trophy size={11} /> : semantic === 'F' ? <XCircle size={11} /> : <Clock size={11} />}
            {SEMANTIC_LABEL[semantic] ?? 'En proceso'}
          </span>
          <span className="mono tnum" style={{ fontSize: 11, color: 'var(--n-400)' }}>#{deal.id}</span>
          <div style={{ flex: 1 }} />
          <IconButton icon={X} size={28} title="Cerrar (Esc)" onClick={handleClose} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>

          {/* Title */}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--n-900)', margin: '0 0 4px', letterSpacing: '-0.01em', lineHeight: 1.35 }}>
            {deal.title || '—'}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--n-500)', marginBottom: 16 }}>
            {deal.category_name}
          </div>

          {/* Amount hero */}
          <div style={{
            background: amount > 0 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'var(--n-50)',
            border: `1px solid ${amount > 0 ? '#bbf7d0' : 'var(--n-200)'}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Monto</div>
              <div className="mono tnum" style={{ fontSize: 26, fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
                {amount > 0 ? fmtMoney(deal.opportunity, deal.currency_id) : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>{deal.currency_id}</div>
            </div>
            {prob > 0 && (
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Probabilidad</div>
                <div style={{ position: 'relative', width: 54, height: 54, margin: '0 auto' }}>
                  <svg width="54" height="54" viewBox="0 0 54 54">
                    <circle cx="27" cy="27" r="22" fill="none" stroke="var(--n-150)" strokeWidth="5" />
                    <circle cx="27" cy="27" r="22" fill="none"
                      stroke={prob >= 70 ? '#16a34a' : prob >= 40 ? '#d97706' : '#6366f1'}
                      strokeWidth="5" strokeLinecap="round"
                      transform="rotate(-90 27 27)"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - prob / 100)}`}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--n-900)' }}>
                    {prob}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overdue warning */}
          {isOverdue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>
              <XCircle size={13} />
              Fecha de cierre vencida hace {Math.abs(daysToClose!)} día{Math.abs(daysToClose!) !== 1 ? 's' : ''}
            </div>
          )}

          {/* Fields */}
          <div>
            <Row icon={Layers} label="Etapa">
              <StageBadge name={deal.stage_name} />
            </Row>
            <Row icon={Tag} label="Pipeline">
              {deal.category_name || '—'}
            </Row>
            <Row icon={User} label="Responsable">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {(deal.assigned_by_name || '?').charAt(0).toUpperCase()}
                </span>
                {deal.assigned_by_name || '—'}
              </div>
            </Row>
            <Row icon={Calendar} label="Fecha de cierre">
              <span style={{ color: isOverdue ? '#b91c1c' : 'var(--n-900)' }}>
                {fmtDate(deal.closedate)}
                {daysToClose !== null && semantic !== 'S' && semantic !== 'F' && (
                  <span style={{ marginLeft: 8, fontSize: 11.5, fontWeight: 600, color: isOverdue ? '#b91c1c' : daysToClose <= 7 ? '#d97706' : '#16a34a' }}>
                    ({isOverdue ? `hace ${Math.abs(daysToClose)}d` : `en ${daysToClose}d`})
                  </span>
                )}
              </span>
            </Row>
            <Row icon={Calendar} label="Creado">
              {fmtDate(deal.date_create)}
            </Row>
            <Row icon={Calendar} label="Última modificación">
              {fmtDate(deal.date_modify)}
            </Row>
            {deal.source_name && (
              <Row icon={Link2} label="Fuente">
                {deal.source_name}
              </Row>
            )}
            <Row icon={Tag} label="¿Incluye Alcance PAU?">
              <AlcanceBadge value={deal.alcance_pau} />
            </Row>
            <Row icon={Tag} label="¿Incluye Alcance PIC?">
              <AlcanceBadge value={deal.alcance_pic} />
            </Row>
            {deal.dept_cisac && (
              <Row icon={Tag} label="Departamento CISAC">
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {deal.dept_cisac.split(',').map(d => (
                    <span key={d} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 600, background: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-200)' }}>{d}</span>
                  ))}
                </div>
              </Row>
            )}
            <Row icon={Hash} label="ID Bitrix24">
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--n-600)' }}>#{deal.id}</span>
            </Row>
          </div>

          {/* Stage progress bar */}
          <div style={{ marginTop: 16 }}>
            <span style={LABEL}>Estado del deal</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['P', 'S', 'F'] as const).map(s => {
                const isActive = semantic === s
                const colors = { P: '#6366f1', S: '#16a34a', F: '#ef4444' }
                return (
                  <div key={s} style={{
                    flex: s === 'P' ? 3 : 1, height: 6, borderRadius: 999,
                    background: isActive ? colors[s] : 'var(--n-150)',
                    transition: 'background .2s',
                  }} />
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--n-400)' }}>
              <span>En proceso</span>
              <span>Ganado</span>
              <span>Perdido</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── searchable select ─────────────────────────────────────────────────────────

function SearchableSelect({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = useMemo(
    () => options.filter(o => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  )
  const isActive = value !== 'all'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); setSearch('') }}
        style={{
          height: 30, padding: '0 8px', fontSize: 11.5,
          border: `1px solid ${isActive ? 'var(--brand-400)' : 'var(--n-200)'}`,
          borderRadius: 6,
          background: isActive ? 'var(--brand-50)' : 'var(--n-0)',
          color: 'var(--n-800)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          maxWidth: 220,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {value === 'all' ? placeholder : value}
        </span>
        <ChevronDown size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 3,
          background: 'var(--n-0)', border: '1px solid var(--n-200)',
          borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          zIndex: 50, minWidth: 210, maxWidth: 300,
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--n-100)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar responsable…"
                style={{
                  width: '100%', height: 26, paddingLeft: 24, paddingRight: 8,
                  fontSize: 11.5, border: '1px solid var(--n-200)', borderRadius: 5,
                  background: 'var(--n-50)', color: 'var(--n-900)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {[{ key: 'all', label: placeholder }, ...filtered.map(r => ({ key: r, label: r }))].map(({ key, label }) => (
              <div
                key={key}
                onClick={() => { onChange(key); setOpen(false) }}
                style={{
                  padding: '6px 10px', fontSize: 11.5, cursor: 'pointer',
                  color: value === key ? 'var(--brand-700)' : 'var(--n-700)',
                  background: value === key ? 'var(--brand-50)' : 'transparent',
                  fontWeight: value === key ? 600 : 400,
                  transition: 'background .08s',
                }}
                onMouseEnter={e => { if (value !== key) (e.currentTarget as HTMLElement).style.background = 'var(--n-50)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value === key ? 'var(--brand-50)' : 'transparent' }}
              >
                {label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 11.5, color: 'var(--n-400)' }}>Sin resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── pagination ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100

const pagerBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, cursor: 'pointer',
  border: '1px solid var(--n-200)',
  background: 'transparent', color: 'var(--n-700)',
  transition: 'all .12s',
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const nums  = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderTop: '1px solid var(--n-150)', flexShrink: 0, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: 'var(--n-500)', flex: 1, minWidth: 120 }} className="mono">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total).toLocaleString()} de {total.toLocaleString()}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button disabled={page <= 1} onClick={() => onPage(1)} style={{ ...pagerBtn, opacity: page <= 1 ? 0.35 : 1 }} title="Primera">
          <ChevronLeft size={11} /><ChevronLeft size={11} style={{ marginLeft: -6 }} />
        </button>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} style={{ ...pagerBtn, opacity: page <= 1 ? 0.35 : 1 }}>
          <ChevronLeft size={13} />
        </button>
        {nums.map(p => (
          <button key={p} onClick={() => onPage(p)} style={{
            ...pagerBtn,
            background: p === page ? 'var(--brand-600)' : 'transparent',
            color: p === page ? '#fff' : 'var(--n-700)',
            fontWeight: p === page ? 700 : 400,
            borderColor: p === page ? 'var(--brand-600)' : 'var(--n-200)',
          }}>
            {p}
          </button>
        ))}
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} style={{ ...pagerBtn, opacity: page >= pages ? 0.35 : 1 }}>
          <ChevronRight size={13} />
        </button>
        <button disabled={page >= pages} onClick={() => onPage(pages)} style={{ ...pagerBtn, opacity: page >= pages ? 0.35 : 1 }} title="Última">
          <ChevronRight size={11} /><ChevronRight size={11} style={{ marginLeft: -6 }} />
        </button>
      </div>
    </div>
  )
}

// ── table header with sort ────────────────────────────────────────────────────

type SortKey = 'title' | 'stage_name' | 'category_name' | 'opportunity' | 'probability' | 'closedate' | 'assigned_by_name' | 'semantic'

function Th({
  label, sortKey, current, dir, onSort, align = 'left',
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void; align?: 'left' | 'right'
}) {
  const active = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '7px 10px', fontSize: 10.5, fontWeight: 600,
        color: active ? 'var(--brand-700)' : 'var(--n-500)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        borderBottom: '1px solid var(--n-150)',
        background: 'var(--n-25)', cursor: 'pointer', whiteSpace: 'nowrap',
        textAlign: align, userSelect: 'none',
        position: 'sticky', top: 0, zIndex: 1,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {active
          ? dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
          : <ChevronDown size={11} style={{ opacity: 0.25 }} />}
      </span>
    </th>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { deals, lastSync, source, loading, syncing, error, sync } = useDeals()

  // Filtros en URL para que persistan al ir al dashboard
  const search           = searchParams.get('q')        ?? ''
  const semanticFilter   = searchParams.get('sem')      ?? 'all'
  const pipelineFilter   = searchParams.get('pipeline') ?? 'all'
  const responsableFilter = searchParams.get('resp')    ?? 'all'
  const etapaFilter      = searchParams.get('etapa')    ?? 'all'
  const pauFilter        = searchParams.get('pau')      ?? 'all'
  const picFilter        = searchParams.get('pic')      ?? 'all'
  const cisacFilter      = searchParams.get('cisac')    ?? 'all'

  const [sortKey, setSortKey] = useState<SortKey>('date_create' as SortKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage]       = useState(1)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  const setFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (!value || value === 'all') next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
    setPage(1)
  }

  const pipelines = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; name: string }[] = []
    deals.forEach(d => {
      if (!seen.has(d.category_id)) {
        seen.add(d.category_id)
        list.push({ id: d.category_id, name: d.category_name })
      }
    })
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [deals])

  const responsables = useMemo(() => {
    const seen = new Set<string>()
    deals.forEach(d => { if (d.assigned_by_name) seen.add(d.assigned_by_name) })
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [deals])

  const etapas = useMemo(() => {
    const seen = new Set<string>()
    deals.forEach(d => { if (d.stage_name) seen.add(d.stage_name) })
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [deals])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = deals
    if (semanticFilter !== 'all')
      rows = rows.filter(d => (d.stage_semantic_id || 'P') === semanticFilter)
    if (pipelineFilter !== 'all')
      rows = rows.filter(d => d.category_id === pipelineFilter)
    if (responsableFilter !== 'all')
      rows = rows.filter(d => d.assigned_by_name === responsableFilter)
    if (etapaFilter !== 'all')
      rows = rows.filter(d => d.stage_name === etapaFilter)
    if (pauFilter !== 'all')
      rows = rows.filter(d => d.alcance_pau === pauFilter)
    if (picFilter !== 'all')
      rows = rows.filter(d => d.alcance_pic === picFilter)
    if (cisacFilter !== 'all')
      rows = rows.filter(d => d.dept_cisac.split(',').includes(cisacFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.stage_name.toLowerCase().includes(q) ||
        d.assigned_by_name.toLowerCase().includes(q) ||
        d.source_name.toLowerCase().includes(q)
      )
    }
    return rows
  }, [deals, semanticFilter, pipelineFilter, responsableFilter, etapaFilter, pauFilter, picFilter, cisacFilter, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      switch (sortKey) {
        case 'opportunity':
          va = parseFloat(a.opportunity) || 0
          vb = parseFloat(b.opportunity) || 0
          break
        case 'probability':
          va = parseInt(a.probability) || 0
          vb = parseInt(b.probability) || 0
          break
        case 'semantic':
          va = a.stage_semantic_id || 'P'
          vb = b.stage_semantic_id || 'P'
          break
        default:
          va = (a[sortKey as keyof typeof a] as string) || ''
          vb = (b[sortKey as keyof typeof b] as string) || ''
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const paginated = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
  )

  // KPIs rápidos
  const stats = useMemo(() => {
    const won    = deals.filter(d => d.stage_semantic_id === 'S')
    const inProg = deals.filter(d => !d.stage_semantic_id || d.stage_semantic_id === 'P')
    const totalAmt = won.reduce((s, d) => s + (parseFloat(d.opportunity) || 0), 0)
    const pipeAmt  = inProg.reduce((s, d) => s + (parseFloat(d.opportunity) || 0), 0)
    return { total: deals.length, won: won.length, inProg: inProg.length, totalAmt, pipeAmt }
  }, [deals])

  const TD: React.CSSProperties = { padding: '7px 10px', verticalAlign: 'middle', fontSize: 12 }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--n-900)', margin: 0, letterSpacing: '-0.01em' }}>CRM — Deals</h1>
            <p style={{ fontSize: 12, color: 'var(--n-500)', margin: 0 }}>
              Oportunidades comerciales desde Bitrix24
              {lastSync && <span className="mono"> · sync {fmtDate(lastSync)}</span>}
            </p>
          </div>
          <div style={{ flex: 1 }} />
          <Button
            icon={CalendarRange}
            onClick={() => navigate('/comercial/deals/gantt?' + searchParams.toString())}
          >
            Gantt
          </Button>

          <Button
            icon={RefreshCw}
            onClick={sync}
            disabled={syncing}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Total deals',    value: stats.total.toString(),      sub: 'en CRM',             color: 'var(--n-700)',    bg: 'var(--n-50)' },
            { label: 'Ganados',        value: stats.won.toString(),        sub: 'cerrados ganados',   color: '#15803d',        bg: '#f0fdf4' },
            { label: 'En proceso',     value: stats.inProg.toString(),     sub: 'activos en pipeline',color: 'var(--brand-700)',bg: 'var(--brand-50)' },
            { label: 'Pipeline',       value: fmtMoneyK(stats.pipeAmt),    sub: 'monto en proceso',   color: 'var(--brand-700)',bg: 'var(--brand-50)' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 8, padding: '10px 14px', border: '1px solid var(--n-150)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{k.label}</div>
              <div className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 10.5, color: k.color, opacity: 0.7, marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters — row 1 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setFilter('q', e.target.value)}
              placeholder="Buscar por título, etapa, responsable…"
              style={{ width: '100%', height: 30, paddingLeft: 28, paddingRight: 10, fontSize: 12, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {/* Semantic */}
          <select value={semanticFilter} onChange={e => setFilter('sem', e.target.value)}
            style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', cursor: 'pointer' }}>
            <option value="all">Todos los estados</option>
            <option value="P">En proceso</option>
            <option value="S">Ganados</option>
            <option value="F">Perdidos</option>
          </select>
          {/* Pipeline */}
          {pipelines.length > 1 && (
            <select value={pipelineFilter} onChange={e => setFilter('pipeline', e.target.value)}
              style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', cursor: 'pointer' }}>
              <option value="all">Todos los pipelines</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {/* Filters — row 2 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Responsable */}
          <SearchableSelect
            value={responsableFilter}
            onChange={v => setFilter('resp', v)}
            options={responsables}
            placeholder="Todos los responsables"
          />
          {/* Etapa */}
          <select value={etapaFilter} onChange={e => setFilter('etapa', e.target.value)}
            style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: `1px solid ${etapaFilter !== 'all' ? 'var(--brand-400)' : 'var(--n-200)'}`, borderRadius: 6, background: etapaFilter !== 'all' ? 'var(--brand-50)' : 'var(--n-0)', color: 'var(--n-800)', outline: 'none', cursor: 'pointer', maxWidth: 220 }}>
            <option value="all">Todas las etapas</option>
            {etapas.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          {/* PAU */}
          <select value={pauFilter} onChange={e => setFilter('pau', e.target.value)}
            style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: `1px solid ${pauFilter !== 'all' ? 'var(--brand-400)' : 'var(--n-200)'}`, borderRadius: 6, background: pauFilter !== 'all' ? 'var(--brand-50)' : 'var(--n-0)', color: 'var(--n-800)', outline: 'none', cursor: 'pointer' }}>
            <option value="all">PAU: Todos</option>
            <option value="Si Incluye">PAU: Si Incluye</option>
            <option value="No incluye">PAU: No incluye</option>
            <option value="No llenado">PAU: No llenado</option>
          </select>
          {/* PIC */}
          <select value={picFilter} onChange={e => setFilter('pic', e.target.value)}
            style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: `1px solid ${picFilter !== 'all' ? 'var(--brand-400)' : 'var(--n-200)'}`, borderRadius: 6, background: picFilter !== 'all' ? 'var(--brand-50)' : 'var(--n-0)', color: 'var(--n-800)', outline: 'none', cursor: 'pointer' }}>
            <option value="all">PIC: Todos</option>
            <option value="Si Incluye">PIC: Si Incluye</option>
            <option value="No incluye">PIC: No incluye</option>
            <option value="No llenado">PIC: No llenado</option>
          </select>
          {/* Depto CISAC */}
          <select value={cisacFilter} onChange={e => setFilter('cisac', e.target.value)}
            style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: `1px solid ${cisacFilter !== 'all' ? 'var(--brand-400)' : 'var(--n-200)'}`, borderRadius: 6, background: cisacFilter !== 'all' ? 'var(--brand-50)' : 'var(--n-0)', color: 'var(--n-800)', outline: 'none', cursor: 'pointer' }}>
            <option value="all">Depto. CISAC: Todos</option>
            <option value="Ventas">Ventas</option>
            <option value="Servicios">Servicios</option>
            <option value="Proyectos">Proyectos</option>
            <option value="QHSE">QHSE</option>
          </select>
          {/* Limpiar filtros */}
          {(semanticFilter !== 'all' || pipelineFilter !== 'all' || responsableFilter !== 'all' || etapaFilter !== 'all' || pauFilter !== 'all' || picFilter !== 'all' || cisacFilter !== 'all' || search) && (
            <button
              onClick={() => { setSearchParams({}, { replace: true }); setPage(1) }}
              style={{ height: 30, padding: '0 10px', fontSize: 11.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <X size={11} /> Limpiar
            </button>
          )}
          <div style={{ flex: 1 }} />
          {/* Source badge */}
          {source && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: source === 'bitrix' ? '#15803d' : 'var(--n-500)', background: source === 'bitrix' ? '#f0fdf4' : 'var(--n-100)', padding: '0 10px', borderRadius: 20, border: source === 'bitrix' ? '1px solid #bbf7d0' : '1px solid var(--n-200)' }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: source === 'bitrix' ? '#16a34a' : 'var(--n-400)' }} />
              {source === 'bitrix' ? 'Bitrix24 (en vivo)' : 'Caché local'}
            </span>
          )}
          <span style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 600 }}>
            {filtered.length.toLocaleString()} deals
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '0 24px 12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 20px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col />
                <col style={{ width: 130 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 55 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 100 }} />
              </colgroup>
              <thead>
                <tr>
                  <Th label="Título"        sortKey="title"            current={sortKey as SortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="Etapa"         sortKey="stage_name"       current={sortKey as SortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="Pipeline"      sortKey="category_name"    current={sortKey as SortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="Monto"         sortKey="opportunity"      current={sortKey as SortKey} dir={sortDir} onSort={handleSort} align="right" />
                  <Th label="Prob."         sortKey="probability"      current={sortKey as SortKey} dir={sortDir} onSort={handleSort} align="right" />
                  <Th label="Responsable"   sortKey="assigned_by_name" current={sortKey as SortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="Cierre"        sortKey="closedate"        current={sortKey as SortKey} dir={sortDir} onSort={handleSort} />
                  <Th label="Estado"        sortKey="semantic"         current={sortKey as SortKey} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--n-400)', fontSize: 12 }}>
                      {search || semanticFilter !== 'all' || pipelineFilter !== 'all'
                        ? 'Sin resultados para ese filtro'
                        : 'No hay deals registrados — sincroniza con Bitrix24'}
                    </td>
                  </tr>
                ) : paginated.map((d, i) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDeal(d)}
                    style={{
                      borderTop: i > 0 ? '1px solid var(--n-100)' : 'none',
                      transition: 'background .1s', cursor: 'pointer',
                      background: selectedDeal?.id === d.id ? 'var(--brand-50)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selectedDeal?.id !== d.id) e.currentTarget.style.background = 'var(--n-25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = selectedDeal?.id === d.id ? 'var(--brand-50)' : 'transparent' }}
                  >
                    <td style={{ ...TD, fontWeight: 600, color: 'var(--n-900)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={d.title}>
                        {d.title || '—'}
                      </span>
                    </td>
                    <td style={TD}>
                      <StageBadge name={d.stage_name} />
                    </td>
                    <td style={{ ...TD, color: 'var(--n-600)', fontSize: 11.5 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {d.category_name}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--n-900)' }} className="mono tnum">
                      {fmtMoney(d.opportunity, d.currency_id)}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--n-600)', fontSize: 11.5 }} className="mono tnum">
                      {d.probability ? `${d.probability}%` : '—'}
                    </td>
                    <td style={{ ...TD, color: 'var(--n-700)', fontSize: 11.5 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {d.assigned_by_name || '—'}
                      </span>
                    </td>
                    <td style={{ ...TD, color: 'var(--n-600)', fontSize: 11.5 }} className="mono">
                      {fmtDate(d.closedate)}
                    </td>
                    <td style={TD}>
                      <SemanticBadge semantic={d.stage_semantic_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={filtered.length} onPage={setPage} />
          <div style={{ padding: '6px 12px', borderTop: '1px solid var(--n-150)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--n-500)', flex: 1 }} className="mono">
              {filtered.length.toLocaleString()} resultados · {Math.ceil(filtered.length / PAGE_SIZE)} páginas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--n-500)' }}>
              <DollarSign size={11} />
              Pipeline: <strong className="mono" style={{ color: 'var(--n-800)' }}>{fmtMoneyK(stats.pipeAmt)}</strong>
            </span>
          </div>
        </div>
      </div>

      <DealDrawer deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  )
}
