import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, RefreshCw, Plus, X, Search, ArrowRightLeft, Filter } from 'lucide-react'
import { useAlmacenEquipos, useAlmacenKardex } from '../../hooks/useAlmacenEquipos'
import { useAlmacenUbicaciones } from '../../hooks/useAlmacenUbicaciones'
import { Pagination } from '../../components/ui/Pagination'
import type { AlmacenEquipo, KardexTipo } from '../../lib/types'

const tipoMeta: Record<KardexTipo, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number }> }> = {
  Entrada:       { label: 'Entrada',       color: '#16a34a', bg: '#f0fdf4', icon: TrendingUp },
  Salida:        { label: 'Salida',        color: '#dc2626', bg: '#fef2f2', icon: TrendingDown },
  Ajuste:        { label: 'Ajuste',        color: '#d97706', bg: '#fffbeb', icon: RefreshCw },
  Transferencia: { label: 'Transferencia', color: '#7c3aed', bg: '#f5f3ff', icon: ArrowRightLeft },
}

export default function KardexPage() {
  const [params, setParams] = useSearchParams()
  const equipoId = params.get('equipo') ?? undefined

  const { equipos } = useAlmacenEquipos()
  const { ubicaciones } = useAlmacenUbicaciones()

  // Combo equipo
  const [selectedEquipo, setSelectedEquipo] = useState<AlmacenEquipo | null>(null)
  const [comboSearch, setComboSearch] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  // Filtros historial
  const [filterTipo, setFilterTipo] = useState<KardexTipo | 'Todos'>('Todos')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(100)

  const { movimientos, total, loading, addMovimiento, refetch } = useAlmacenKardex(equipoId, {
    tipo: filterTipo !== 'Todos' ? filterTipo : undefined,
    desde: filterDesde || undefined,
    hasta: filterHasta || undefined,
    search: filterSearch.trim() || undefined,
    page,
    pageSize,
  })

  // Modal nuevo movimiento
  const [showModal, setShowModal] = useState(false)
  const [tipo, setTipo] = useState<KardexTipo>('Entrada')
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [observacion, setObservacion] = useState('')
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('')
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ubiActivas = ubicaciones.filter(u => u.activa)

  // Reset page when filters or equipo change
  useEffect(() => { setPage(0) }, [filterTipo, filterDesde, filterHasta, filterSearch, equipoId])

  useEffect(() => {
    if (equipoId && equipos.length > 0) {
      const found = equipos.find(e => e.id === equipoId)
      setSelectedEquipo(found ?? null)
      if (found) setComboSearch(found.nombre)
    } else if (!equipoId) {
      setSelectedEquipo(null)
      setComboSearch('')
    }
  }, [equipoId, equipos])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
        if (selectedEquipo) setComboSearch(selectedEquipo.nombre)
        else setComboSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedEquipo])

  const handleSelectEquipo = (equipo: AlmacenEquipo) => {
    setParams({ equipo: equipo.id })
    setComboSearch(equipo.nombre)
    setComboOpen(false)
  }

  const handleClearEquipo = () => {
    setParams({})
    setSelectedEquipo(null)
    setComboSearch('')
  }

  const equiposFiltrados = equipos.filter(e => {
    const q = comboSearch.toLowerCase()
    return (
      e.nombre.toLowerCase().includes(q) ||
      (e.codigo ?? '').toLowerCase().includes(q) ||
      (e.categoria ?? '').toLowerCase().includes(q)
    )
  })

  const hayFiltrosActivos = filterTipo !== 'Todos' || filterDesde || filterHasta || filterSearch

  const handleAddMovimiento = async () => {
    if (!selectedEquipo) return
    if (cantidad <= 0 && tipo !== 'Ajuste') { setError('La cantidad debe ser mayor a 0'); return }
    if (!motivo.trim()) { setError('El motivo es requerido'); return }
    if (tipo === 'Transferencia' && !ubicacionOrigenId)  { setError('Selecciona la ubicación origen'); return }
    if (tipo === 'Transferencia' && !ubicacionDestinoId) { setError('Selecciona la ubicación destino'); return }
    if (tipo === 'Transferencia' && ubicacionOrigenId === ubicacionDestinoId) { setError('Origen y destino no pueden ser iguales'); return }
    setSaving(true)
    setError(null)
    try {
      await addMovimiento(
        selectedEquipo, tipo, cantidad, motivo, observacion || undefined,
        undefined, undefined,
        ubicacionOrigenId || undefined,
        ubicacionDestinoId || undefined,
      )
      await refetch()
      setShowModal(false)
      setCantidad(0)
      setMotivo('')
      setObservacion('')
      setUbicacionOrigenId('')
      setUbicacionDestinoId('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', ...style,
  })

  const modoTodo = !equipoId

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Kardex</h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '3px 0 0' }}>
            {modoTodo
              ? `Historial completo · ${total} movimiento${total !== 1 ? 's' : ''}`
              : `Movimientos de "${selectedEquipo?.nombre ?? '…'}" · ${total} registro${total !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        {selectedEquipo && (
          <button
            onClick={() => { setTipo('Entrada'); setCantidad(0); setMotivo(''); setObservacion(''); setError(null); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--brand-600)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Registrar movimiento
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {/* Combo equipo */}
        <div style={{ flex: '1 1 260px', minWidth: 220 }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 5 }}>
            EQUIPO / MATERIAL
          </label>
          <div ref={comboRef} style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none', zIndex: 1 }} />
            <input
              value={comboSearch}
              onChange={e => { setComboSearch(e.target.value); setComboOpen(true) }}
              onFocus={() => setComboOpen(true)}
              placeholder="Todos los equipos…"
              style={{ ...inp(), paddingLeft: 32, paddingRight: selectedEquipo ? 30 : 10 }}
            />
            {selectedEquipo && (
              <button
                onMouseDown={e => { e.preventDefault(); handleClearEquipo() }}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)', display: 'flex', padding: 2 }}
              >
                <X size={13} />
              </button>
            )}
            {comboOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                background: '#fff', border: '1px solid var(--n-200)', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 260, overflowY: 'auto',
              }}>
                <button
                  onMouseDown={() => { handleClearEquipo(); setComboOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 14px', border: 'none', background: !equipoId ? 'var(--brand-50)' : 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--n-75)', fontSize: 13, color: !equipoId ? 'var(--brand-700)' : 'var(--n-500)', fontWeight: !equipoId ? 600 : 400 }}
                >
                  Todos los equipos
                </button>
                {equiposFiltrados.map(e => {
                  const isSelected = e.id === equipoId
                  const bajStock = e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo
                  return (
                    <button
                      key={e.id}
                      onMouseDown={() => handleSelectEquipo(e)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 14px', border: 'none',
                        background: isSelected ? 'var(--brand-50)' : 'transparent',
                        cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--n-75)',
                      }}
                      onMouseEnter={ev => { if (!isSelected) ev.currentTarget.style.background = 'var(--n-50)' }}
                      onMouseLeave={ev => { if (!isSelected) ev.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--brand-700)' : 'var(--n-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {e.nombre}
                          {bajStock && <span style={{ fontSize: 10.5, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: 3 }}>Bajo stock</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--n-400)', marginTop: 1 }}>
                          {e.codigo && <span style={{ fontFamily: 'monospace', marginRight: 8 }}>{e.codigo}</span>}
                          {e.categoria && <span>{e.categoria}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: bajStock ? '#dc2626' : 'var(--n-700)', whiteSpace: 'nowrap' }}>
                        {e.stock_actual} {e.unidad}
                      </div>
                    </button>
                  )
                })}
                {equiposFiltrados.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--n-400)' }}>Sin resultados</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tipo */}
        <div style={{ flex: '0 0 auto' }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 5 }}>TIPO</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['Todos', 'Entrada', 'Salida', 'Ajuste', 'Transferencia'] as const).map(t => {
              const meta = t !== 'Todos' ? tipoMeta[t] : null
              const active = filterTipo === t
              return (
                <button
                  key={t}
                  onClick={() => setFilterTipo(t)}
                  style={{
                    padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: active ? (meta?.color ?? 'var(--brand-600)') : 'var(--n-200)',
                    background: active ? (meta?.bg ?? 'var(--brand-50)') : '#fff',
                    color: active ? (meta?.color ?? 'var(--brand-700)') : 'var(--n-500)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fechas */}
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 5 }}>DESDE</label>
            <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} style={{ ...inp(), width: 140 }} />
          </div>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 5 }}>HASTA</label>
            <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} style={{ ...inp(), width: 140 }} />
          </div>
        </div>

        {/* Búsqueda texto */}
        <div style={{ flex: '1 1 180px', minWidth: 160 }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 5 }}>BUSCAR</label>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
            <input
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Motivo, observación…"
              style={{ ...inp(), paddingLeft: 28 }}
            />
          </div>
        </div>

        {/* Limpiar filtros */}
        {hayFiltrosActivos && (
          <button
            onClick={() => { setFilterTipo('Todos'); setFilterDesde(''); setFilterHasta(''); setFilterSearch('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', border: '1px solid var(--n-200)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12.5, color: 'var(--n-600)', whiteSpace: 'nowrap' }}
          >
            <Filter size={13} /> Limpiar
          </button>
        )}
      </div>

      {/* Info del equipo seleccionado */}
      {selectedEquipo && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 16,
          background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16,
        }}>
          {[
            { label: 'Stock actual', value: `${selectedEquipo.stock_actual} ${selectedEquipo.unidad}`, highlight: selectedEquipo.stock_minimo > 0 && selectedEquipo.stock_actual <= selectedEquipo.stock_minimo },
            { label: 'Stock mínimo', value: `${selectedEquipo.stock_minimo} ${selectedEquipo.unidad}`, highlight: false },
            { label: 'Ubicación', value: selectedEquipo.ubicacion ?? '—', highlight: false },
            { label: 'Estado', value: selectedEquipo.estado, highlight: false },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 2 }}>{stat.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: stat.highlight ? '#dc2626' : 'var(--n-900)' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ color: 'var(--n-400)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Cargando movimientos…</div>
      ) : movimientos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-400)' }}>
          <RefreshCw size={36} style={{ opacity: .25, marginBottom: 8 }} />
          <p style={{ fontSize: 13, margin: 0 }}>
            {hayFiltrosActivos ? 'Sin movimientos para los filtros aplicados' : 'Sin movimientos registrados'}
          </p>
        </div>
      ) : (
        <>
        <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                <th style={th()}>Fecha</th>
                {modoTodo && <th style={th()}>Equipo / Material</th>}
                <th style={th()}>Tipo</th>
                <th style={th()}>Cantidad</th>
                <th style={th()}>Stock ant.</th>
                <th style={th()}>Stock nuevo</th>
                <th style={th()}>Motivo</th>
                <th style={th()}>Origen</th>
                <th style={th()}>Destino</th>
                <th style={th()}>Observación</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => {
                const meta = tipoMeta[m.tipo as KardexTipo] ?? tipoMeta.Ajuste
                const Icon = meta.icon
                const equipoNombre = (m.equipo as { nombre: string } | null)?.nombre
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--n-100)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={td('var(--n-600)', true)}>
                      {new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {modoTodo && (
                      <td style={td('var(--n-800)')}>
                        <span style={{ fontWeight: 500 }}>{equipoNombre ?? '—'}</span>
                      </td>
                    )}
                    <td style={td()}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: meta.bg, color: meta.color }}>
                        <Icon size={12} /> {m.tipo}
                      </span>
                    </td>
                    <td style={{ ...td(), fontWeight: 700, color: m.tipo === 'Entrada' ? '#16a34a' : m.tipo === 'Salida' ? '#dc2626' : m.tipo === 'Transferencia' ? '#7c3aed' : '#d97706' }}>
                      {m.tipo === 'Entrada' ? '+' : m.tipo === 'Salida' ? '-' : m.tipo === 'Transferencia' ? '↔' : '±'}{m.cantidad}
                    </td>
                    <td style={td('var(--n-500)')}>{m.stock_anterior}</td>
                    <td style={{ ...td(), fontWeight: 600, color: 'var(--n-900)' }}>{m.stock_nuevo}</td>
                    <td style={td('var(--n-700)')}>{m.motivo ?? '—'}</td>
                    <td style={{ ...td('var(--n-500)'), fontSize: 12 }}>
                      {(m.ubicacion_origen as { nombre: string } | null)?.nombre ?? (m.referencia_tipo ?? '—')}
                    </td>
                    <td style={{ ...td('var(--n-500)'), fontSize: 12 }}>
                      {(m.ubicacion_destino as { nombre: string } | null)?.nombre ?? '—'}
                    </td>
                    <td style={td('var(--n-500)')}>{m.observacion ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={setPageSize} loading={loading} />
        </>
      )}

      {/* Modal movimiento manual */}
      {showModal && selectedEquipo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Registrar movimiento</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--n-600)', margin: '0 0 16px', background: 'var(--n-50)', padding: '8px 12px', borderRadius: 7 }}>
              <strong>{selectedEquipo.nombre}</strong> — Stock actual: <strong>{selectedEquipo.stock_actual} {selectedEquipo.unidad}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Tipo de movimiento</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {(['Entrada', 'Salida', 'Ajuste', 'Transferencia'] as KardexTipo[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTipo(t); setUbicacionOrigenId(''); setUbicacionDestinoId('') }}
                      style={{
                        flex: 1, minWidth: 80, padding: '7px 6px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        border: '2px solid',
                        borderColor: tipo === t ? tipoMeta[t].color : 'var(--n-200)',
                        background: tipo === t ? tipoMeta[t].bg : '#fff',
                        color: tipo === t ? tipoMeta[t].color : 'var(--n-600)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {(tipo === 'Entrada' || tipo === 'Ajuste') && ubiActivas.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación {tipo === 'Entrada' ? 'destino' : ''} (opcional)</label>
                  <select value={ubicacionDestinoId} onChange={e => setUbicacionDestinoId(e.target.value)} style={inp({ marginTop: 4 })}>
                    <option value="">— Sin especificar —</option>
                    {ubiActivas.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''}</option>)}
                  </select>
                </div>
              )}
              {tipo === 'Salida' && ubiActivas.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación origen (opcional)</label>
                  <select value={ubicacionOrigenId} onChange={e => setUbicacionOrigenId(e.target.value)} style={inp({ marginTop: 4 })}>
                    <option value="">— Sin especificar —</option>
                    {ubiActivas.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''}</option>)}
                  </select>
                </div>
              )}
              {tipo === 'Transferencia' && (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación origen *</label>
                    <select value={ubicacionOrigenId} onChange={e => setUbicacionOrigenId(e.target.value)} style={inp({ marginTop: 4 })}>
                      <option value="">— Seleccionar —</option>
                      {ubiActivas.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación destino *</label>
                    <select value={ubicacionDestinoId} onChange={e => setUbicacionDestinoId(e.target.value)} style={inp({ marginTop: 4 })}>
                      <option value="">— Seleccionar —</option>
                      {ubiActivas.filter(u => u.id !== ubicacionOrigenId).map(u => <option key={u.id} value={u.id}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>
                  {tipo === 'Ajuste' ? 'Nuevo stock' : 'Cantidad'}
                </label>
                <input type="number" min={0} value={cantidad} onChange={e => setCantidad(Number(e.target.value))} style={inp({ marginTop: 4 })} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Motivo *</label>
                <input value={motivo} onChange={e => setMotivo(e.target.value)} style={inp({ marginTop: 4 })} placeholder="Ej. Compra, Uso en obra, Inventario, Reubicación…" />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Observación</label>
                <textarea value={observacion} onChange={e => setObservacion(e.target.value)} style={{ ...inp({ marginTop: 4 }), height: 60, resize: 'vertical' }} />
              </div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 12.5, marginTop: 10 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleAddMovimiento} disabled={saving} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function th(): React.CSSProperties {
  return { padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--n-500)', whiteSpace: 'nowrap' }
}

function td(color = 'var(--n-700)', noWrap = false): React.CSSProperties {
  return { padding: '10px 14px', color, whiteSpace: noWrap ? 'nowrap' : undefined }
}
