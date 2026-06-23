import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { RefreshCw, CheckCircle2, Clock, AlertCircle, XCircle, Pause, Search, Download, List, Kanban } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBitrixTareas } from '../../hooks/useBitrixTareas'
import { BitrixNavTabs } from '../../components/bitrix/BitrixNavTabs'

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
  'Nueva':        { bg: 'var(--n-100)',    color: 'var(--n-600)',     border: 'var(--n-200)',     icon: <Clock size={10} /> },
  'Pendiente':    { bg: 'var(--amber-50)', color: 'var(--amber-700)', border: 'var(--amber-200)', icon: <Pause size={10} /> },
  'En proceso':   { bg: 'var(--brand-50)', color: 'var(--brand-700)', border: 'var(--brand-200)', icon: <RefreshCw size={10} /> },
  'Por verificar':{ bg: '#fdf4ff',         color: '#7e22ce',          border: '#e9d5ff',          icon: <AlertCircle size={10} /> },
  'Completada':   { bg: 'var(--green-50)', color: 'var(--green-700)', border: 'var(--green-200)', icon: <CheckCircle2 size={10} /> },
  'Rechazada':    { bg: 'var(--red-50)',   color: 'var(--red-700)',   border: 'var(--red-200)',   icon: <XCircle size={10} /> },
  'Diferida':     { bg: 'var(--n-50)',     color: 'var(--n-500)',     border: 'var(--n-200)',     icon: <Pause size={10} /> },
}

const PRIORITY_STYLE: Record<string, { color: string; dot: string }> = {
  'Alta':   { color: 'var(--red-600)',   dot: 'var(--red-500)' },
  'Normal': { color: 'var(--n-500)',     dot: 'var(--n-400)' },
  'Baja':   { color: 'var(--green-600)', dot: 'var(--green-500)' },
}

const ALL_STATUSES = ['Nueva', 'Pendiente', 'En proceso', 'Por verificar', 'Completada', 'Rechazada', 'Diferida']


/** Darkens a 6-char hex color (no '#') for text contrast on light backgrounds */
function darkenHex(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 0xff) - 80)
  const g = Math.max(0, ((n >> 8)  & 0xff) - 80)
  const b = Math.max(0, ( n        & 0xff) - 80)
  return `rgb(${r},${g},${b})`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: es }) }
  catch { return iso }
}

function isOverdue(deadline: string, status: string): boolean {
  if (!deadline || status === 'Completada' || status === 'Rechazada') return false
  try { return parseISO(deadline) < new Date() }
  catch { return false }
}

export default function BitrixTareasPage() {
  const { groupId = '91' } = useParams<{ groupId: string }>()
  const { tareas, stages, groupName, lastSync, source, loading, syncing, error, sync } = useBitrixTareas(groupId)

  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('Todos')
  const [filterPriority, setFilterPriority] = useState('Todos')
  const [view, setView]                   = useState<'list' | 'kanban'>('list')

  const useStages = stages.length > 0

  const filtered = tareas
    .filter(t => {
      const matchSearch   = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.responsible_name.toLowerCase().includes(search.toLowerCase())
      const matchStatus   = filterStatus === 'Todos' || t.status === filterStatus
      const matchPriority = filterPriority === 'Todos' || t.priority === filterPriority
      return matchSearch && matchStatus && matchPriority
    })
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())

  const statusCounts = ALL_STATUSES.map(s => ({ s, n: tareas.filter(t => t.status === s).length })).filter(x => x.n > 0)

  const busy = loading || syncing

  function downloadCSV() {
    const headers = ['ID', 'Título', 'Estado', 'Prioridad', 'Responsable', 'Creado por', 'Fecha creación', 'Vencimiento', 'Descripción']
    const rows = filtered.map(t => [
      t.id, t.title, t.status, t.priority, t.responsible_name,
      t.created_by_name, formatDate(t.created_date), formatDate(t.deadline),
      t.description.replace(/\n/g, ' '),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `tareas_bitrix_${groupId}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            {groupName || `Tareas · Grupo ${groupId}`}
          </h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>
            Bitrix24 · Grupo {groupId}
            {lastSync && (
              <span style={{ marginLeft: 8, color: source === 'cache' ? 'var(--amber-600)' : 'var(--green-600)' }}>
                · {source === 'cache' ? 'Caché' : 'Sincronizado'} {formatDate(lastSync)}
              </span>
            )}
          </p>
        </div>

        <div style={{ position: 'relative', flex: '0 0 240px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tarea o responsable…"
            style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 30, border: '1px solid var(--n-200)', borderRadius: 7, fontSize: 12, color: 'var(--n-800)', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="Todos">Todos los estados</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={selectStyle}>
          <option value="Todos">Toda prioridad</option>
          <option value="Alta">Alta</option>
          <option value="Normal">Normal</option>
          <option value="Baja">Baja</option>
        </select>

        <BitrixNavTabs groupId={groupId} active="list" />

        {/* Toggle Lista / Kanban */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--n-200)', borderRadius: 7, overflow: 'hidden' }}>
          {([['list', List, 'Lista'], ['kanban', Kanban, 'Kanban']] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={label}
              style={{
                width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: 'none',
                background: view === v ? 'var(--brand-600)' : '#fff',
                color: view === v ? '#fff' : 'var(--n-500)',
                transition: 'background .12s, color .12s',
              }}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={downloadCSV}
            disabled={filtered.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12.5, fontWeight: 500, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', color: 'var(--n-700)', opacity: filtered.length === 0 ? 0.5 : 1 }}
          >
            <Download size={13} /> Exportar CSV
          </button>
          <button
            onClick={sync}
            disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 7, border: 'none', background: syncing ? 'var(--brand-400)' : 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} />
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </div>
      </div>


      {/* Status pills */}
      {!busy && !error && statusCounts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            onClick={() => setFilterStatus('Todos')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
              border: `1px solid ${filterStatus === 'Todos' ? 'var(--brand-500)' : 'var(--n-200)'}`,
              background: filterStatus === 'Todos' ? 'var(--brand-600)' : '#fff',
              color: filterStatus === 'Todos' ? '#fff' : 'var(--n-600)',
            }}
          >
            Todos
            <span style={{ background: filterStatus === 'Todos' ? 'rgba(255,255,255,.25)' : 'var(--n-100)', borderRadius: 10, padding: '0 5px', fontSize: 10.5 }}>
              {tareas.length}
            </span>
          </button>
          {statusCounts.map(({ s, n }) => {
            const st = STATUS_STYLE[s] || STATUS_STYLE['Nueva']
            const active = filterStatus === s
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(active ? 'Todos' : s)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${active ? st.border : 'var(--n-200)'}`,
                  background: active ? st.bg : '#fff',
                  color: active ? st.color : 'var(--n-600)',
                }}
              >
                {st.icon} {s}
                <span style={{ background: active ? st.border : 'var(--n-100)', borderRadius: 10, padding: '0 5px', fontSize: 10.5 }}>
                  {n}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--red-50)', border: '1px solid var(--red-200)', color: 'var(--red-700)', fontSize: 12.5, marginBottom: 12 }}>
          {error} — Asegúrate de que el servidor API esté corriendo en localhost:8000.
        </div>
      )}

      {/* Spinner */}
      {busy && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
          {syncing ? 'Consultando Bitrix24…' : 'Cargando…'}
        </div>
      )}

      {/* ── Kanban ── */}
      {!busy && !error && view === 'kanban' && (() => {
        const columns = useStages
          ? stages
          : ALL_STATUSES
              .map(s => ({ id: s, name: s, color: '' }))

        return (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 16 }}>
            {columns.map(col => {
              const stageColor = col.color ? `#${col.color}` : null
              const st = STATUS_STYLE[col.name] || STATUS_STYLE['Nueva']
              const headerBg     = stageColor ? stageColor + '22' : st.bg
              const headerBorder = stageColor ? stageColor + '66' : st.border
              const headerColor  = stageColor ? darkenHex(col.color) : st.color
              const cards = useStages
                ? filtered.filter(t => t.stage_id === col.id)
                : filtered.filter(t => t.status === col.id)
              return (
                <div key={col.id} style={{ flex: '0 0 240px', width: 240, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: '8px 8px 0 0', background: headerBg, border: `1px solid ${headerBorder}`, borderBottom: 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: headerColor, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col.name}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: headerColor, background: headerBorder + '55', padding: '1px 6px', borderRadius: 20 }}>
                      {cards.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6, background: 'var(--n-75)', border: `1px solid ${headerBorder}`, borderRadius: '0 0 8px 8px', minHeight: 60, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                    {cards.length === 0
                      ? <div style={{ fontSize: 11, color: 'var(--n-300)', textAlign: 'center', padding: '14px 0' }}>Sin tareas</div>
                      : cards.map(t => {
                        const pr      = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE['Normal']
                        const overdue = isOverdue(t.deadline, t.status)
                        const accentColor = stageColor || st.color
                        return (
                          <div key={t.id} style={{ background: '#fff', borderRadius: 7, padding: '10px 11px', border: '1px solid var(--n-150)', borderLeft: `3px solid ${accentColor}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-900)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.title}</div>
                            {t.description && (
                              <div style={{ fontSize: 10.5, color: 'var(--n-400)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, minWidth: 0 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600, color: pr.color, flexShrink: 0 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: pr.dot }} />
                                {t.priority}
                              </span>
                              {t.responsible_name && (
                                <span style={{ fontSize: 10.5, color: 'var(--n-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                  {t.responsible_name.split(' ')[0]}
                                </span>
                              )}
                              {t.deadline && (
                                <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: overdue ? 'var(--red-600)' : 'var(--n-400)', background: overdue ? 'var(--red-50)' : 'transparent', padding: overdue ? '2px 5px' : '0', borderRadius: 4 }}>
                                  {overdue && '⚠ '}{formatDate(t.deadline)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Table */}
      {!busy && !error && view === 'list' && (
        filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, color: 'var(--n-400)', fontSize: 12.5 }}>
            {tareas.length === 0
              ? 'No se encontraron tareas. Pulsa Sincronizar para cargar desde Bitrix24.'
              : 'Sin resultados para los filtros aplicados.'}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--n-50)', borderBottom: '1px solid var(--n-150)' }}>
                  <Th w={52}>#</Th>
                  <Th>Título</Th>
                  <Th w={120}>Estado</Th>
                  <Th w={80}>Prioridad</Th>
                  <Th w={150}>Responsable</Th>
                  <Th w={120}>Vencimiento</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  const st      = STATUS_STYLE[t.status] || STATUS_STYLE['Nueva']
                  const pr      = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE['Normal']
                  const overdue = isOverdue(t.deadline, t.status)
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--n-100)', background: idx % 2 === 0 ? '#fff' : 'var(--n-50)' }}>
                      <td style={{ padding: '9px 12px', color: 'var(--n-400)', fontWeight: 600, fontSize: 11 }}>{t.id}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--n-900)', marginBottom: t.description ? 2 : 0 }}>{t.title}</div>
                        {t.description && (
                          <div style={{ fontSize: 11, color: 'var(--n-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>{t.description}</div>
                        )}
                        {t.created_by_name && (
                          <div style={{ fontSize: 10.5, color: 'var(--n-400)', marginTop: 1 }}>
                            Creado por {t.created_by_name} · {formatDate(t.created_date)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 600 }}>
                          {st.icon} {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: pr.color }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: pr.dot, flexShrink: 0 }} />
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--n-700)', fontWeight: 500 }}>{t.responsible_name || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>
                        {t.deadline ? (
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: overdue ? 'var(--red-600)' : 'var(--n-700)', background: overdue ? 'var(--red-50)' : 'transparent', padding: overdue ? '2px 6px' : '0', borderRadius: overdue ? 5 : 0 }}>
                            {overdue && '⚠ '}{formatDate(t.deadline)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--n-300)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--n-100)', fontSize: 11, color: 'var(--n-400)' }}>
              Mostrando {filtered.length} de {tareas.length} tareas
            </div>
          </div>
        )
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function Th({ children, w }: { children?: React.ReactNode; w?: number }) {
  return (
    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em', width: w }}>
      {children}
    </th>
  )
}

const selectStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)',
  background: '#fff', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer',
}

