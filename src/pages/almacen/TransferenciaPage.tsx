import { useState, useRef, useEffect } from 'react'
import { ArrowRightLeft, Search, ChevronDown, AlertTriangle } from 'lucide-react'
import { useAlmacenEquipos, useAlmacenKardex } from '../../hooks/useAlmacenEquipos'
import { useAlmacenUbicaciones, useAlmacenStockUbicacion } from '../../hooks/useAlmacenUbicaciones'
import type { AlmacenEquipo } from '../../lib/types'

export default function TransferenciaPage() {
  const { equipos } = useAlmacenEquipos()
  const { ubicaciones } = useAlmacenUbicaciones()

  const [selectedEquipo, setSelectedEquipo] = useState<AlmacenEquipo | null>(null)
  const [comboSearch, setComboSearch] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [observacion, setObservacion] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { stock, refetch: refetchStock } = useAlmacenStockUbicacion(selectedEquipo?.id)
  const { addMovimiento, refetch: refetchKardex } = useAlmacenKardex(selectedEquipo?.id)

  // Auto-seleccionar origen cuando carga el stock
  useEffect(() => {
    if (!selectedEquipo || stock.length === 0) return
    const conStock = stock.filter(s => s.stock_actual > 0)
    if (conStock.length === 1) setOrigenId(conStock[0].ubicacion_id)
  }, [stock, selectedEquipo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
        if (selectedEquipo) setComboSearch(selectedEquipo.nombre)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedEquipo])

  const handleSelectEquipo = (eq: AlmacenEquipo) => {
    setSelectedEquipo(eq)
    setComboSearch(eq.nombre)
    setComboOpen(false)
    setOrigenId('')
    setDestinoId('')
    setCantidad(0)
    setError(null)
    setSuccess(null)
  }

  const stockEnOrigen = stock.find(s => s.ubicacion_id === origenId)?.stock_actual ?? 0
  const sinStockSuficiente = origenId && cantidad > 0 && cantidad > stockEnOrigen

  const handleTransferir = async () => {
    setError(null)
    setSuccess(null)
    if (!selectedEquipo) { setError('Selecciona un material'); return }
    if (!origenId) { setError('Selecciona la ubicación origen'); return }
    if (!destinoId) { setError('Selecciona la ubicación destino'); return }
    if (origenId === destinoId) { setError('Origen y destino no pueden ser iguales'); return }
    if (cantidad <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    if (!motivo.trim()) { setError('El motivo es requerido'); return }
    if (sinStockSuficiente) { setError(`Stock insuficiente en origen (disponible: ${stockEnOrigen})`); return }

    setSaving(true)
    try {
      await addMovimiento(
        selectedEquipo, 'Transferencia', cantidad, motivo,
        observacion || undefined, undefined, undefined,
        origenId, destinoId,
      )
      await refetchStock()
      await refetchKardex()

      const origenNombre = ubicaciones.find(u => u.id === origenId)?.nombre ?? origenId
      const destinoNombre = ubicaciones.find(u => u.id === destinoId)?.nombre ?? destinoId
      setSuccess(`✓ Transferido ${cantidad} ${selectedEquipo.unidad} de "${origenNombre}" → "${destinoNombre}"`)
      setCantidad(0)
      setMotivo('')
      setObservacion('')
      setOrigenId('')
      setDestinoId('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al transferir')
    } finally {
      setSaving(false)
    }
  }

  const equiposFiltrados = equipos.filter(e => {
    const q = comboSearch.toLowerCase()
    return e.nombre.toLowerCase().includes(q) || (e.codigo ?? '').toLowerCase().includes(q) || (e.categoria ?? '').toLowerCase().includes(q)
  })

  const ubiActivas = ubicaciones.filter(u => u.activa)

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box', ...style,
  })

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Transferencia entre ubicaciones</h1>
        <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '3px 0 0' }}>
          Mueve stock de un material entre dos ubicaciones sin afectar el stock total
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
        {/* Columna izquierda: Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selector de material */}
          <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)', display: 'block', marginBottom: 8 }}>
              Material / Equipo *
            </label>
            <div ref={comboRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
                <input
                  value={comboSearch}
                  onChange={e => { setComboSearch(e.target.value); setComboOpen(true) }}
                  onFocus={() => setComboOpen(true)}
                  placeholder="Buscar por nombre, código…"
                  style={{ ...inp(), paddingLeft: 32, paddingRight: 32 }}
                />
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${comboOpen ? '180deg' : '0deg'})`, color: 'var(--n-400)', transition: 'transform .2s', pointerEvents: 'none' }} />
              </div>
              {comboOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid var(--n-200)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 240, overflowY: 'auto' }}>
                  {equiposFiltrados.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--n-400)' }}>Sin resultados</div>
                  ) : equiposFiltrados.map(e => (
                    <button
                      key={e.id}
                      onMouseDown={() => handleSelectEquipo(e)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', background: selectedEquipo?.id === e.id ? 'var(--brand-50)' : 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--n-75)' }}
                      onMouseEnter={ev => { if (selectedEquipo?.id !== e.id) ev.currentTarget.style.background = 'var(--n-50)' }}
                      onMouseLeave={ev => { if (selectedEquipo?.id !== e.id) ev.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--n-900)' }}>{e.nombre}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--n-400)' }}>{e.codigo && <span style={{ fontFamily: 'monospace', marginRight: 6 }}>{e.codigo}</span>}{e.categoria}</div>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-700)' }}>{e.stock_actual} {e.unidad}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedEquipo && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--brand-50)', borderRadius: 7, fontSize: 12.5 }}>
                <span style={{ color: 'var(--n-600)' }}>Stock total: </span>
                <strong style={{ color: 'var(--brand-700)' }}>{selectedEquipo.stock_actual} {selectedEquipo.unidad}</strong>
              </div>
            )}
          </div>

          {/* Origen → Destino */}
          <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación origen *</label>
                {selectedEquipo && stock.filter(s => s.stock_actual > 0).length === 0 ? (
                  <div style={{ marginTop: 4, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12.5, color: '#92400e' }}>
                    Este material no tiene stock registrado en ninguna ubicación. Registra primero una entrada con ubicación destino.
                  </div>
                ) : (
                  <select value={origenId} onChange={e => setOrigenId(e.target.value)} style={inp({ marginTop: 4 })} disabled={!selectedEquipo}>
                    <option value="">— Seleccionar —</option>
                    {stock
                      .filter(s => s.stock_actual > 0)
                      .map(s => {
                        const ubi = ubiActivas.find(u => u.id === s.ubicacion_id)
                        if (!ubi) return null
                        return (
                          <option key={ubi.id} value={ubi.id}>
                            {ubi.nombre}{ubi.codigo ? ` [${ubi.codigo}]` : ''} — {s.stock_actual} {selectedEquipo?.unidad ?? ''}
                          </option>
                        )
                      })}
                  </select>
                )}
              </div>

              <div style={{ textAlign: 'center', color: 'var(--n-400)' }}>
                <ArrowRightLeft size={18} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación destino *</label>
                <select value={destinoId} onChange={e => setDestinoId(e.target.value)} style={inp({ marginTop: 4 })} disabled={!selectedEquipo}>
                  <option value="">— Seleccionar —</option>
                  {ubiActivas.filter(u => u.id !== origenId).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Cantidad *</label>
                <input
                  type="number" min={0.01} step={0.01} value={cantidad || ''}
                  onChange={e => setCantidad(Number(e.target.value))}
                  style={inp({ marginTop: 4, borderColor: sinStockSuficiente ? '#dc2626' : undefined })}
                  disabled={!selectedEquipo}
                />
                {sinStockSuficiente && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 12, color: '#dc2626' }}>
                    <AlertTriangle size={12} /> Stock disponible en origen: {stockEnOrigen} {selectedEquipo?.unidad}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Motivo *</label>
                <input value={motivo} onChange={e => setMotivo(e.target.value)} style={inp({ marginTop: 4 })} placeholder="Ej. Reubicación, Abastecimiento obra…" disabled={!selectedEquipo} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Observación</label>
                <textarea value={observacion} onChange={e => setObservacion(e.target.value)} style={{ ...inp({ marginTop: 4 }), height: 56, resize: 'vertical' }} disabled={!selectedEquipo} />
              </div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 12.5, margin: '10px 0 0' }}>{error}</p>}
            {success && <p style={{ color: '#16a34a', fontSize: 12.5, margin: '10px 0 0', background: '#f0fdf4', padding: '8px 12px', borderRadius: 7 }}>{success}</p>}

            <button
              onClick={handleTransferir}
              disabled={saving || !selectedEquipo}
              style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--brand-600)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: (saving || !selectedEquipo) ? .6 : 1 }}
            >
              <ArrowRightLeft size={16} /> {saving ? 'Transfiriendo…' : 'Confirmar transferencia'}
            </button>
          </div>
        </div>

        {/* Columna derecha: Stock por ubicación del material seleccionado */}
        <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, padding: 16, alignSelf: 'start' }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--n-800)', margin: '0 0 14px' }}>
            Stock por ubicación
            {selectedEquipo && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--n-500)', marginLeft: 6 }}>— {selectedEquipo.nombre}</span>}
          </h3>
          {!selectedEquipo ? (
            <p style={{ fontSize: 13, color: 'var(--n-400)', margin: 0 }}>Selecciona un material para ver el detalle</p>
          ) : stock.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--n-400)', margin: 0 }}>Sin distribución por ubicación registrada</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stock.map(s => {
                const ubi = s.ubicacion as { id: string; nombre: string; tipo: string; codigo: string | null } | null
                const pct = selectedEquipo.stock_actual > 0 ? (s.stock_actual / selectedEquipo.stock_actual) * 100 : 0
                return (
                  <div key={s.id} style={{ padding: '10px 12px', background: 'var(--n-25)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-900)' }}>{ubi?.nombre}</span>
                        {ubi?.codigo && <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--n-400)', marginLeft: 6 }}>[{ubi.codigo}]</span>}
                      </div>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--brand-700)' }}>
                        {s.stock_actual} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--n-500)' }}>{selectedEquipo.unidad}</span>
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--n-150)', borderRadius: 3 }}>
                      <div style={{ height: '100%', background: 'var(--brand-400)', borderRadius: 3, width: `${pct}%`, transition: 'width .3s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 3 }}>{pct.toFixed(1)}% del total</div>
                  </div>
                )
              })}
              <div style={{ borderTop: '1px solid var(--n-150)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--n-500)' }}>
                <span>Total distribuido</span>
                <strong style={{ color: 'var(--n-800)' }}>{stock.reduce((a, s) => a + s.stock_actual, 0)} {selectedEquipo.unidad}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
