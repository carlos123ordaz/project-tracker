import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, X, Edit2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { SeguimientoNavTabs } from './SeguimientoNavTabs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSeguimientoGestion } from '../../hooks/useSeguimientoGestion'
import type { Prioridad, StatusFinal, SeguimientoTareaInsert, SortField, SortDir } from '../../hooks/useSeguimientoGestion'
import { useTeamMembers } from '../../hooks/useConfig'

const STATUS_STYLE: Record<StatusFinal, { bg: string; color: string; border: string }> = {
  'CULMINADO':  { bg: 'var(--green-50)',  color: 'var(--green-700)',  border: 'var(--green-200)' },
  'EN PROCESO': { bg: 'var(--amber-50)',  color: 'var(--amber-700)',  border: 'var(--amber-200)' },
  'PENDIENTE':  { bg: 'var(--n-100)',     color: 'var(--n-600)',      border: 'var(--n-300)' },
}

const PRIORIDAD_STYLE: Record<Prioridad, { bg: string; color: string }> = {
  'ALTO':  { bg: '#fef2f2', color: '#dc2626' },
  'MEDIO': { bg: '#fefce8', color: '#ca8a04' },
  'BAJO':  { bg: '#f0fdf4', color: '#16a34a' },
}

const emptyForm = (): Omit<SeguimientoTareaInsert, 'sort_order'> => ({
  solicitante: '', tarea: '', prioridad: 'ALTO', responsable: 'FIORELLA',
  asignado: new Date().toISOString().slice(0, 10),
  vence: new Date().toISOString().slice(0, 10),
  status: 0, status_final: 'PENDIENTE', nota: '',
})

export default function SeguimientoGestionPage() {
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus]     = useState<StatusFinal | 'TODOS'>('TODOS')
  const [filterPrioridad, setFilterPrioridad] = useState<Prioridad | 'TODAS'>('TODAS')
  const [page, setPage]               = useState(1)
  const [pageSize, setPageSize]       = useState(20)
  const [sortField, setSortField]     = useState<SortField>('vence')
  const [sortDir, setSortDir]         = useState<SortDir>('asc')

  const { tareas, total, statusCounts, loading, error, create, update, remove } =
    useSeguimientoGestion({ page, pageSize, search, status: filterStatus, prioridad: filterPrioridad, sortField, sortDir })
  const { items: teamMembers } = useTeamMembers()

  const [showModal, setShowModal]     = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [form, setForm]               = useState(emptyForm())
  const [saving, setSaving]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Volver a página anterior si la actual queda vacía tras borrar
  useEffect(() => {
    if (!loading && tareas.length === 0 && page > 1) setPage(p => p - 1)
  }, [tareas.length, loading, page])  // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function openNew() { setEditId(null); setForm(emptyForm()); setShowModal(true) }

  function openEdit(t: typeof tareas[0]) {
    setEditId(t.id)
    setForm({
      solicitante: t.solicitante, tarea: t.tarea, prioridad: t.prioridad,
      responsable: t.responsable, asignado: t.asignado ?? '',
      vence: t.vence ?? '', status: t.status,
      status_final: t.status_final, nota: t.nota,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.solicitante.trim() || !form.tarea.trim()) return
    setSaving(true)
    try {
      if (editId) await update(editId, form)
      else await create(form)
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await remove(id)
    setConfirmDelete(null)
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Seguimiento de Gestión</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>
            Tareas logísticas de compras — {statusCounts.TODOS ?? total} registros
          </p>
        </div>

        <SeguimientoNavTabs active="list" />

        <div style={{ position: 'relative', flex: '0 0 240px' }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar solicitante, tarea…"
            style={{ width: '100%', paddingLeft: 28, paddingRight: 10, height: 30, border: '1px solid var(--n-200)', borderRadius: 7, fontSize: 12, color: 'var(--n-800)', background: 'var(--n-0)', boxSizing: 'border-box' }} />
        </div>

        <select value={filterPrioridad} onChange={e => { setFilterPrioridad(e.target.value as Prioridad | 'TODAS'); setPage(1) }}
          style={{ height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer' }}>
          <option value="TODAS">Toda prioridad</option>
          <option value="ALTO">Alto</option>
          <option value="MEDIO">Medio</option>
          <option value="BAJO">Bajo</option>
        </select>

        <select value={sortField} onChange={e => { setSortField(e.target.value as SortField); setPage(1) }}
          style={{ height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer' }}>
          <option value="vence">Ordenar por Vence</option>
          <option value="asignado">Ordenar por Asignado</option>
          <option value="status">Ordenar por Avance</option>
          <option value="created_at">Ordenar por Creación</option>
        </select>

        <select value={sortDir} onChange={e => { setSortDir(e.target.value as SortDir); setPage(1) }}
          style={{ height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer' }}>
          <option value="asc">Menor a mayor</option>
          <option value="desc">Mayor a menor</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['TODOS', 'CULMINADO', 'EN PROCESO', 'PENDIENTE'] as const).map(s => {
            const active = filterStatus === s
            const st = s === 'TODOS' ? null : STATUS_STYLE[s]
            const count = statusCounts[s] ?? 0
            return (
              <button key={s} onClick={() => { setFilterStatus(s); setPage(1) }} style={{
                padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                border: active ? `1.5px solid ${st ? st.border : 'var(--brand-300)'}` : '1px solid var(--n-200)',
                background: active ? (st ? st.bg : 'var(--brand-50)') : 'var(--n-0)',
                color: active ? (st ? st.color : 'var(--brand-700)') : 'var(--n-500)',
              }}>
                {count} {s === 'TODOS' ? 'total' : s.toLowerCase()}
              </button>
            )
          })}
          <div style={{ width: 1, height: 16, background: 'var(--n-200)' }} />
          <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Nueva Tarea
          </button>
        </div>
      </div>

      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 8, fontSize: 12.5 }}>{error}</div>}

      {/* Table */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--n-50)', borderBottom: '1px solid var(--n-150)' }}>
                  {['Solicitante', 'Tarea', 'Prioridad', 'Responsable', 'Asignado', 'Vence', 'Avance', 'Estado', 'Nota', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tareas.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Sin resultados</td></tr>
                ) : tareas.map((t, i) => {
                  const st = STATUS_STYLE[t.status_final]
                  const pr = PRIORIDAD_STYLE[t.prioridad]
                  const pct = Math.round(t.status * 100)
                  return (
                    <tr key={t.id} style={{ borderBottom: i < tareas.length - 1 ? '1px solid var(--n-100)' : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--n-800)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.solicitante}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--n-700)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.tarea}>{t.tarea}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: pr.bg, color: pr.color }}>{t.prioridad}</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--n-600)', whiteSpace: 'nowrap' }}>{t.responsable}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--n-500)', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {t.asignado ? format(new Date(t.asignado + 'T00:00:00'), 'd MMM', { locale: es }) : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--n-500)', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {t.vence ? format(new Date(t.vence + 'T00:00:00'), 'd MMM', { locale: es }) : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', minWidth: 90 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ flex: 1, height: 5, background: 'var(--n-150)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green-500)' : pct >= 80 ? 'var(--brand-500)' : 'var(--amber-400)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--n-500)', fontWeight: 600, minWidth: 24 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
                          {t.status_final}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--n-600)', fontSize: 11.5, minWidth: 220, maxWidth: 320 }}>
                        <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} title={t.nota || undefined}>
                          {t.nota || <span style={{ color: 'var(--n-300)' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(t)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', cursor: 'pointer', color: 'var(--n-500)', display: 'flex', alignItems: 'center' }}><Edit2 size={11} /></button>
                          <button onClick={() => setConfirmDelete(t.id)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--red-100)', background: 'var(--red-50)', cursor: 'pointer', color: 'var(--red-500)', display: 'flex', alignItems: 'center' }}><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} registros
            </span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              style={{ height: 26, padding: '0 6px', borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 11.5, color: 'var(--n-700)', cursor: 'pointer' }}>
              <option value={20}>20 / pág.</option>
              <option value={50}>50 / pág.</option>
              <option value={100}>100 / pág.</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnS(page === 1)}>
              <ChevronLeft size={13} />
            </button>
            {pageNumbers(totalPages, page).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--n-400)' }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)} style={pageBtnS(false, p === page)}>
                  {p}
                </button>
              )
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnS(page === totalPages)}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: '20px 22px 18px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>{editId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={14} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <FL>Solicitante *</FL>
                <select value={form.solicitante} onChange={e => setForm(p => ({ ...p, solicitante: e.target.value }))} style={{ ...iStyle, cursor: 'pointer' }} autoFocus>
                  <option value="">— Seleccionar solicitante —</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <FL>Tarea *</FL>
                <input value={form.tarea} onChange={e => setForm(p => ({ ...p, tarea: e.target.value }))} placeholder="Descripción de la tarea" style={iStyle} />
              </div>
              <div>
                <FL>Prioridad</FL>
                <select value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value as Prioridad }))} style={{ ...iStyle, cursor: 'pointer' }}>
                  <option value="ALTO">ALTO</option>
                  <option value="MEDIO">MEDIO</option>
                  <option value="BAJO">BAJO</option>
                </select>
              </div>
              <div>
                <FL>Responsable</FL>
                <select value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))} style={{ ...iStyle, cursor: 'pointer' }}>
                  <option value="">— Seleccionar responsable —</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FL>Fecha asignado</FL>
                <input type="date" value={form.asignado ?? ''} onChange={e => setForm(p => ({ ...p, asignado: e.target.value || null }))} style={iStyle} />
              </div>
              <div>
                <FL>Fecha vence</FL>
                <input type="date" value={form.vence ?? ''} onChange={e => setForm(p => ({ ...p, vence: e.target.value || null }))} style={iStyle} />
              </div>
              <div>
                <FL>Estado</FL>
                <select value={form.status_final} onChange={e => {
                  const sf = e.target.value as StatusFinal
                  setForm(p => ({ ...p, status_final: sf, status: sf === 'CULMINADO' ? 1 : sf === 'PENDIENTE' ? 0 : p.status }))
                }} style={{ ...iStyle, cursor: 'pointer' }}>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN PROCESO">EN PROCESO</option>
                  <option value="CULMINADO">CULMINADO</option>
                </select>
              </div>
              <div>
                <FL>Avance ({Math.round(form.status * 100)}%)</FL>
                <input type="range" min={0} max={1} step={0.05} value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: parseFloat(e.target.value) }))}
                  style={{ width: '100%', marginTop: 6 }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <FL>Nota</FL>
                <textarea value={form.nota} onChange={e => setForm(p => ({ ...p, nota: e.target.value }))} placeholder="Observaciones adicionales"
                  rows={4} style={{ ...iStyle, height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.5 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12.5, cursor: 'pointer', color: 'var(--n-700)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 16px', borderRadius: 7, border: 'none', background: saving ? 'var(--brand-300)' : 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                <Check size={13} /> {saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Agregar tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: '20px 22px', width: 360, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', marginBottom: 6 }}>¿Eliminar tarea?</div>
            <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginBottom: 18 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12.5, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--red-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-600)', marginBottom: 4 }}>{children}</div>
}

const iStyle: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 10px', borderRadius: 6,
  border: '1px solid var(--n-200)', fontSize: 12.5,
  color: 'var(--n-800)', boxSizing: 'border-box', background: 'var(--n-0)',
}

function pageBtnS(disabled: boolean, active = false): React.CSSProperties {
  return {
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer',
    border: active ? '1.5px solid var(--brand-400)' : '1px solid var(--n-200)',
    background: active ? 'var(--brand-50)' : 'var(--n-0)',
    color: active ? 'var(--brand-700)' : disabled ? 'var(--n-300)' : 'var(--n-600)',
  }
}

function pageNumbers(totalPages: number, current: number): (number | '…')[] {
  const pages: (number | '…')[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) {
      pages.push(p)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return pages
}
