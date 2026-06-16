import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { RefreshCw, CheckCircle2, Clock, AlertCircle, XCircle, Pause, Search, Download } from 'lucide-react'
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
  const { tareas, groupName, lastSync, source, loading, syncing, error, sync } = useBitrixTareas(groupId)

  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('Todos')
  const [filterPriority, setFilterPriority] = useState('Todos')

  const filtered = tareas.filter(t => {
    const matchSearch   = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.responsible_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus   = filterStatus === 'Todos' || t.status === filterStatus
    const matchPriority = filterPriority === 'Todos' || t.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = tareas.filter(t => t.status === s).length
    return acc
  }, {} as Record<string, number>)

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
      {!loading && tareas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          <button
            onClick={() => setFilterStatus('Todos')}
            style={{ ...pillStyle, ...(filterStatus === 'Todos' ? activePillStyle : {}) }}
          >
            {tareas.length} total
          </button>
          {ALL_STATUSES.filter(s => statusCounts[s] > 0).map(s => {
            const st     = STATUS_STYLE[s] || STATUS_STYLE['Nueva']
            const active = filterStatus === s
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(prev => prev === s ? 'Todos' : s)}
                style={{ ...pillStyle, background: active ? st.bg : '#fff', color: active ? st.color : 'var(--n-500)', border: active ? `1.5px solid ${st.border}` : '1px solid var(--n-200)' }}
              >
                {statusCounts[s]} {s}
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

      {/* Table */}
      {!busy && !error && (
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

const pillStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 20, border: '1px solid var(--n-200)',
  background: '#fff', cursor: 'pointer', fontSize: 11.5, color: 'var(--n-500)', fontWeight: 600,
}

const activePillStyle: React.CSSProperties = {
  border: '1.5px solid var(--brand-300)', background: 'var(--brand-50)', color: 'var(--brand-700)',
}
