import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersonalTarifas } from '../../hooks/usePersonalTarifas'
import type { PersonalTarifa, CotizacionSegmento } from '../../lib/types'
import { calcularTarifa } from '../../hooks/useCotizacionEditor'
import { Plus, Trash2, Save, X, ChevronLeft, Eye } from 'lucide-react'

type EditRow = Partial<PersonalTarifa> & { _new?: boolean }

const EMPTY_NEW: EditRow = {
  perfil: '',
  tipo_contrato: 'Planilla',
  factor_empresa: 1.9,
  sueldo_seg_a: 0,
  sueldo_seg_b: 0,
  sueldo_seg_c: 0,
  orden: 99,
  activo: true,
  _new: true,
}

export default function PersonalTarifasPage() {
  const { tarifas, loading, createTarifa, updateTarifa, deleteTarifa } = usePersonalTarifas()
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditRow>({})
  const [newRow, setNewRow] = useState<EditRow | null>(null)
  const [previewSeg, setPreviewSeg] = useState<CotizacionSegmento>('A')
  const [previewTC, setPreviewTC] = useState(3.50)
  const [delId, setDelId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function startEdit(t: PersonalTarifa) {
    setEditId(t.id)
    setEditData({ ...t })
    setNewRow(null)
  }
  function cancelEdit() { setEditId(null); setEditData({}) }

  async function saveEdit(id: string) {
    if (!editData.perfil?.trim()) { setErr('El perfil es requerido'); return }
    setSaving(true); setErr('')
    try {
      await updateTarifa(id, {
        perfil: editData.perfil,
        tipo_contrato: editData.tipo_contrato,
        factor_empresa: editData.factor_empresa ?? 1.9,
        sueldo_seg_a: editData.sueldo_seg_a ?? 0,
        sueldo_seg_b: editData.sueldo_seg_b ?? 0,
        sueldo_seg_c: editData.sueldo_seg_c ?? 0,
        orden: editData.orden ?? 99,
        activo: editData.activo ?? true,
      })
      setEditId(null); setEditData({})
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error') }
    setSaving(false)
  }

  async function saveNew() {
    if (!newRow?.perfil?.trim()) { setErr('El perfil es requerido'); return }
    setSaving(true); setErr('')
    try {
      await createTarifa({
        perfil: newRow.perfil!,
        tipo_contrato: newRow.tipo_contrato ?? 'Planilla',
        factor_empresa: newRow.factor_empresa ?? 1.9,
        sueldo_seg_a: newRow.sueldo_seg_a ?? 0,
        sueldo_seg_b: newRow.sueldo_seg_b ?? 0,
        sueldo_seg_c: newRow.sueldo_seg_c ?? 0,
        orden: newRow.orden ?? 99,
        activo: newRow.activo ?? true,
      })
      setNewRow(null)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error') }
    setSaving(false)
  }

  const numInput = (val: number | undefined, key: keyof EditRow, setter: (fn: (p: EditRow) => EditRow) => void) => (
    <input
      type="number"
      step="0.01"
      value={val ?? 0}
      onChange={e => setter(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
      style={{ ...cellInput, width: 90 }}
    />
  )

  const displayTarifas = [...tarifas]

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/cotizaciones" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--n-500)', textDecoration: 'none' }}>
          <ChevronLeft size={14} /> Cotizaciones
        </Link>
        <span style={{ color: 'var(--n-300)' }}>/</span>
        <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Tarifas de Personal</h1>
        <button
          onClick={() => setNewRow({ ...EMPTY_NEW })}
          disabled={!!newRow}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: newRow ? 0.5 : 1 }}
        >
          <Plus size={13} /> Agregar perfil
        </button>
      </div>

      {err && <div style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', padding: '7px 11px', borderRadius: 7 }}>{err}</div>}

      {/* Table */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--n-50)', borderBottom: '1px solid var(--n-150)' }}>
                {['Perfil', 'Tipo', 'Factor', 'Sueldo A (S/.)', 'Sueldo B (S/.)', 'Sueldo C (S/.)', 'Orden', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--n-600)', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)' }}>Cargando…</td></tr>
              ) : (
                <>
                  {displayTarifas.map(t => {
                    const isEdit = editId === t.id
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--n-100)', background: isEdit ? 'var(--brand-50)' : undefined }}
                        onDoubleClick={() => !isEdit && startEdit(t)}
                      >
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit
                            ? <input value={editData.perfil ?? ''} onChange={e => setEditData(p => ({ ...p, perfil: e.target.value }))} autoFocus style={{ ...cellInput, width: 160 }} />
                            : <span style={{ fontWeight: 500, color: 'var(--n-800)' }}>{t.perfil}</span>}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit
                            ? <select value={editData.tipo_contrato ?? 'Planilla'} onChange={e => setEditData(p => ({ ...p, tipo_contrato: e.target.value as 'Planilla' | 'Recibo' }))} style={{ ...cellInput, width: 100 }}>
                                <option>Planilla</option>
                                <option>Recibo</option>
                              </select>
                            : <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: t.tipo_contrato === 'Planilla' ? 'var(--brand-50)' : 'var(--amber-50)', color: t.tipo_contrato === 'Planilla' ? 'var(--brand-700)' : 'var(--amber-700)' }}>{t.tipo_contrato}</span>}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit
                            ? numInput(editData.factor_empresa, 'factor_empresa', setEditData)
                            : <span style={{ color: 'var(--n-700)' }}>×{t.factor_empresa}</span>}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit ? numInput(editData.sueldo_seg_a, 'sueldo_seg_a', setEditData) : <MN v={t.sueldo_seg_a} />}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit ? numInput(editData.sueldo_seg_b, 'sueldo_seg_b', setEditData) : <MN v={t.sueldo_seg_b} />}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit ? numInput(editData.sueldo_seg_c, 'sueldo_seg_c', setEditData) : <MN v={t.sueldo_seg_c} />}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit
                            ? <input type="number" value={editData.orden ?? 0} onChange={e => setEditData(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))} style={{ ...cellInput, width: 60 }} />
                            : <span style={{ color: 'var(--n-500)' }}>{t.orden}</span>}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {isEdit ? (
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button onClick={() => saveEdit(t.id)} disabled={saving} style={actionBtn('brand')}><Save size={12} /></button>
                              <button onClick={cancelEdit} style={actionBtn('n')}><X size={12} /></button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button onClick={() => startEdit(t)} style={actionBtn('n')} title="Editar">
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => setDelId(t.id)} style={actionBtn('red')}><Trash2 size={12} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {/* New row */}
                  {newRow && (
                    <tr style={{ borderBottom: '1px solid var(--n-100)', background: 'var(--green-50)' }}>
                      <td style={{ padding: '7px 12px' }}>
                        <input autoFocus value={newRow.perfil ?? ''} onChange={e => setNewRow(p => ({ ...p!, perfil: e.target.value }))} placeholder="Cargo / perfil" style={{ ...cellInput, width: 160 }} />
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <select value={newRow.tipo_contrato ?? 'Planilla'} onChange={e => setNewRow(p => ({ ...p!, tipo_contrato: e.target.value as 'Planilla' | 'Recibo' }))} style={{ ...cellInput, width: 100 }}>
                          <option>Planilla</option>
                          <option>Recibo</option>
                        </select>
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <input type="number" step="0.1" value={newRow.factor_empresa ?? 1.9} onChange={e => setNewRow(p => ({ ...p!, factor_empresa: parseFloat(e.target.value) || 1.9 }))} style={{ ...cellInput, width: 90 }} />
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <input type="number" step="100" value={newRow.sueldo_seg_a ?? 0} onChange={e => setNewRow(p => ({ ...p!, sueldo_seg_a: parseFloat(e.target.value) || 0 }))} style={{ ...cellInput, width: 90 }} />
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <input type="number" step="100" value={newRow.sueldo_seg_b ?? 0} onChange={e => setNewRow(p => ({ ...p!, sueldo_seg_b: parseFloat(e.target.value) || 0 }))} style={{ ...cellInput, width: 90 }} />
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <input type="number" step="100" value={newRow.sueldo_seg_c ?? 0} onChange={e => setNewRow(p => ({ ...p!, sueldo_seg_c: parseFloat(e.target.value) || 0 }))} style={{ ...cellInput, width: 90 }} />
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <input type="number" value={newRow.orden ?? 99} onChange={e => setNewRow(p => ({ ...p!, orden: parseInt(e.target.value) || 99 }))} style={{ ...cellInput, width: 60 }} />
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={saveNew} disabled={saving} style={actionBtn('brand')}><Save size={12} /></button>
                          <button onClick={() => setNewRow(null)} style={actionBtn('n')}><X size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {displayTarifas.length === 0 && !newRow && (
                    <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Sin tarifas. Agrega un perfil para comenzar.</td></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview section */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Eye size={14} style={{ color: 'var(--brand-700)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-800)' }}>Preview de tarifas diarias</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--n-600)' }}>Segmento:</span>
            {(['A', 'B', 'C'] as CotizacionSegmento[]).map(s => (
              <button
                key={s}
                onClick={() => setPreviewSeg(s)}
                style={{ padding: '3px 10px', borderRadius: 20, border: previewSeg === s ? '1.5px solid var(--brand-300)' : '1px solid var(--n-200)', background: previewSeg === s ? 'var(--brand-50)' : 'var(--n-0)', color: previewSeg === s ? 'var(--brand-700)' : 'var(--n-600)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {s}
              </button>
            ))}
            <span style={{ fontSize: 12, color: 'var(--n-600)', marginLeft: 8 }}>TC S/.</span>
            <input
              type="number"
              step="0.01"
              value={previewTC}
              onChange={e => setPreviewTC(parseFloat(e.target.value) || 3.5)}
              style={{ width: 70, height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 12 }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {tarifas.filter(t => t.activo).map(t => {
            const sueldo = previewSeg === 'A' ? t.sueldo_seg_a : previewSeg === 'B' ? t.sueldo_seg_b : t.sueldo_seg_c
            const diaPen = (sueldo * t.factor_empresa) / 22
            const diaUsd = calcularTarifa(t, previewSeg, previewTC)
            return (
              <div key={t.id} style={{ background: 'var(--n-50)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--n-100)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-800)', marginBottom: 6 }}>{t.perfil}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--n-500)', marginBottom: 2 }}>
                  <span>Sueldo base</span>
                  <span style={{ fontWeight: 600, color: 'var(--n-700)' }}>S/. {sueldo.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--n-500)', marginBottom: 2 }}>
                  <span>Día (PEN)</span>
                  <span style={{ fontWeight: 600, color: 'var(--n-700)' }}>S/. {diaPen.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--brand-700)', borderTop: '1px solid var(--n-150)', paddingTop: 6, marginTop: 4 }}>
                  <span style={{ fontWeight: 600 }}>Tarifa USD/día</span>
                  <span style={{ fontWeight: 700 }}>$ {diaUsd.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
          {tarifas.filter(t => t.activo).length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>Sin tarifas activas</div>
          )}
        </div>
      </div>

      {/* Confirm Delete */}
      {delId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: '20px 22px', width: 360, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', marginBottom: 6 }}>¿Eliminar tarifa?</div>
            <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginBottom: 18 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDelId(null)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12.5, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => { await deleteTarifa(delId); setDelId(null) }} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--danger-fill)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MN({ v }: { v: number }) {
  return <span style={{ color: 'var(--n-700)' }}>S/. {v.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span>
}

function actionBtn(color: 'brand' | 'n' | 'red'): React.CSSProperties {
  const map = {
    brand: { bg: 'var(--brand-50)', color: 'var(--brand-700)', border: 'var(--brand-100)' },
    n:     { bg: 'var(--n-50)',     color: 'var(--n-600)',     border: 'var(--n-200)'     },
    red:   { bg: 'var(--red-50)',   color: 'var(--red-600)',   border: 'var(--red-100)'   },
  }
  const m = map[color]
  return { padding: '5px 6px', borderRadius: 6, border: `1px solid ${m.border}`, background: m.bg, cursor: 'pointer', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }
}

const cellInput: React.CSSProperties = {
  height: 28, padding: '0 8px', borderRadius: 5,
  border: '1px solid var(--brand-200)', fontSize: 12,
  color: 'var(--n-800)', background: 'var(--n-0)', boxSizing: 'border-box',
}
