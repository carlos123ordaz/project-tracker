import { useState, useRef } from 'react'
import { Plus, Trash2, Check, AlertTriangle } from 'lucide-react'
import { useGastosGeneralesCot } from '../../../hooks/useGastosGeneralesCot'
import type { GastoGeneral } from '../../../lib/types'

interface Props {
  cotizacionId: string
  imprevistosPct?: number
  onImprevistosChange?: (v: number) => void
}

const fmtUSD = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const th: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--n-500)',
  borderBottom: '1px solid var(--n-100)',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '5px 8px',
  verticalAlign: 'middle',
}

function NumCell({
  value,
  onChange,
  decimals = false,
  width = 80,
}: {
  value: number
  onChange: (v: number) => void
  decimals?: boolean
  width?: number
}) {
  return (
    <input
      type="number"
      step={decimals ? '0.01' : '1'}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      style={{
        width,
        height: 26,
        padding: '0 6px',
        borderRadius: 5,
        border: '1px solid var(--n-150)',
        fontSize: 12,
        color: 'var(--n-800)',
        textAlign: 'right',
        background: '#fff',
      }}
    />
  )
}

type NewGasto = {
  descripcion: string
  unidad: string
  tiempo_pct: number
  cantidad: number
  mensual_usd: number
}

const EMPTY_NEW = (): NewGasto => ({
  descripcion: '',
  unidad: 'MES',
  tiempo_pct: 1,
  cantidad: 1,
  mensual_usd: 0,
})

export default function GastosGeneralesTab({ cotizacionId, imprevistosPct = 2, onImprevistosChange }: Props) {
  const { gastos, loading, fetchError, createGasto, updateGasto, deleteGasto, totalGG } = useGastosGeneralesCot(cotizacionId)
  const [addingCat, setAddingCat] = useState<'Variables' | 'Fijos' | null>(null)
  const [newGasto, setNewGasto] = useState<NewGasto>(EMPTY_NEW())
  const saveRef = useRef(false)

  const variables = gastos.filter(g => g.categoria === 'Variables')
  const fijos = gastos.filter(g => g.categoria === 'Fijos')

  const totalVariables = variables.reduce((s, g) => s + g.tiempo_pct * g.cantidad * g.mensual_usd, 0)
  const totalFijos = fijos.reduce((s, g) => s + g.tiempo_pct * g.cantidad * g.mensual_usd, 0)
  const totalConImprevistos = totalGG * (1 + imprevistosPct / 100)

  async function handleSaveNew(cat: 'Variables' | 'Fijos') {
    if (!newGasto.descripcion.trim() || saveRef.current) return
    saveRef.current = true
    try {
      const existing = gastos.filter(g => g.categoria === cat)
      await createGasto(cotizacionId, {
        cotizacion_id: cotizacionId,
        categoria: cat,
        descripcion: newGasto.descripcion,
        unidad: newGasto.unidad,
        tiempo_pct: newGasto.tiempo_pct,
        cantidad: newGasto.cantidad,
        mensual_usd: newGasto.mensual_usd,
        orden: existing.length,
      })
      setNewGasto(EMPTY_NEW())
      setAddingCat(null)
    } finally {
      saveRef.current = false
    }
  }

  function handleFieldUpdate(id: string, field: keyof GastoGeneral, value: unknown) {
    updateGasto(id, { [field]: value } as Partial<GastoGeneral>)
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
        Cargando gastos generales…
      </div>
    )
  }

  if (fetchError) {
    const isMissing = fetchError.includes('does not exist') || fetchError.includes('relation')
    return (
      <div style={{ padding: '32px 24px', maxWidth: 600 }}>
        <div style={{ display: 'flex', gap: 12, padding: '16px 18px', borderRadius: 10, border: '1px solid var(--amber-200)', background: 'var(--amber-50)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--amber-600)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-800)', marginBottom: 4 }}>
              {isMissing ? 'Tabla no encontrada — ejecuta la migración v2' : 'Error cargando datos'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--amber-700)', fontFamily: 'monospace' }}>{fetchError}</div>
            {isMissing && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber-700)' }}>
                Corre <code>supabase_migration_v2.sql</code> en el SQL Editor de Supabase y recarga.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderSection(title: string, cat: 'Variables' | 'Fijos', rows: GastoGeneral[], subtotal: number) {
    const isAdding = addingCat === cat
    return (
      <div style={{ marginBottom: 20 }}>
        {/* Section header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          background: cat === 'Variables' ? 'var(--brand-50)' : 'var(--amber-50)',
          borderRadius: '8px 8px 0 0',
          border: `1px solid ${cat === 'Variables' ? 'var(--brand-100)' : 'var(--amber-200)'}`,
          borderBottom: 'none',
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: cat === 'Variables' ? 'var(--brand-800)' : 'var(--amber-700)',
          }}>
            {title}
          </span>
          <button
            onClick={() => { setAddingCat(cat); setNewGasto(EMPTY_NEW()) }}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: cat === 'Variables' ? 'var(--brand-600)' : 'var(--amber-700)',
              color: '#fff',
            }}
          >
            <Plus size={11} /> Agregar ítem {cat}
          </button>
        </div>

        {/* Table */}
        <div style={{
          border: `1px solid ${cat === 'Variables' ? 'var(--brand-100)' : 'var(--amber-200)'}`,
          borderRadius: '0 0 8px 8px',
          overflow: 'hidden',
          background: '#fff',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)' }}>
                <th style={th}>Descripción</th>
                <th style={th}>Unidad</th>
                <th style={{ ...th, textAlign: 'right' }}>Tiempo %</th>
                <th style={{ ...th, textAlign: 'right' }}>Cantidad</th>
                <th style={{ ...th, textAlign: 'right' }}>Mensual USD</th>
                <th style={{ ...th, textAlign: 'right', background: 'var(--brand-50)', color: 'var(--brand-700)' }}>
                  Parcial USD
                </th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(g => {
                const parcial = g.tiempo_pct * g.cantidad * g.mensual_usd
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--n-100)' }}>
                    <td style={td}>
                      <input
                        value={g.descripcion}
                        onChange={e => handleFieldUpdate(g.id, 'descripcion', e.target.value)}
                        style={{
                          width: '100%',
                          minWidth: 180,
                          height: 26,
                          padding: '0 6px',
                          borderRadius: 5,
                          border: '1px solid transparent',
                          fontSize: 12.5,
                          color: 'var(--n-800)',
                          background: 'transparent',
                        }}
                        onFocus={e => { e.currentTarget.style.border = '1px solid var(--n-200)'; e.currentTarget.style.background = '#fff' }}
                        onBlur={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent' }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        value={g.unidad}
                        onChange={e => handleFieldUpdate(g.id, 'unidad', e.target.value)}
                        style={{
                          width: 70,
                          height: 26,
                          padding: '0 6px',
                          borderRadius: 5,
                          border: '1px solid transparent',
                          fontSize: 12,
                          color: 'var(--n-700)',
                          background: 'transparent',
                          textAlign: 'center',
                        }}
                        onFocus={e => { e.currentTarget.style.border = '1px solid var(--n-200)'; e.currentTarget.style.background = '#fff' }}
                        onBlur={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent' }}
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <NumCell value={g.tiempo_pct} onChange={v => handleFieldUpdate(g.id, 'tiempo_pct', v)} decimals width={70} />
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <NumCell value={g.cantidad} onChange={v => handleFieldUpdate(g.id, 'cantidad', v)} width={60} />
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <NumCell value={g.mensual_usd} onChange={v => handleFieldUpdate(g.id, 'mensual_usd', v)} decimals width={100} />
                    </td>
                    <td style={{ ...td, textAlign: 'right', background: 'var(--brand-50)', fontWeight: 700, color: 'var(--brand-800)', paddingRight: 12 }}>
                      {fmtUSD(parcial)}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => deleteGasto(g.id)}
                        style={{
                          padding: '3px 5px',
                          borderRadius: 5,
                          border: '1px solid var(--red-100)',
                          background: 'var(--red-50)',
                          color: 'var(--red-500)',
                          cursor: 'pointer',
                          display: 'flex',
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* New row */}
              {isAdding && (
                <tr style={{ background: 'var(--green-50)', borderBottom: '1px solid var(--n-100)' }}>
                  <td style={td}>
                    <input
                      autoFocus
                      value={newGasto.descripcion}
                      onChange={e => setNewGasto(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Descripción…"
                      style={{
                        width: '100%',
                        minWidth: 180,
                        height: 26,
                        padding: '0 6px',
                        borderRadius: 5,
                        border: '1px solid var(--n-200)',
                        fontSize: 12.5,
                        color: 'var(--n-800)',
                        background: '#fff',
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveNew(cat); if (e.key === 'Escape') setAddingCat(null) }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      value={newGasto.unidad}
                      onChange={e => setNewGasto(p => ({ ...p, unidad: e.target.value }))}
                      style={{ width: 70, height: 26, padding: '0 6px', borderRadius: 5, border: '1px solid var(--n-200)', fontSize: 12, textAlign: 'center', background: '#fff' }}
                    />
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <NumCell value={newGasto.tiempo_pct} onChange={v => setNewGasto(p => ({ ...p, tiempo_pct: v }))} decimals width={70} />
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <NumCell value={newGasto.cantidad} onChange={v => setNewGasto(p => ({ ...p, cantidad: v }))} width={60} />
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <NumCell value={newGasto.mensual_usd} onChange={v => setNewGasto(p => ({ ...p, mensual_usd: v }))} decimals width={100} />
                  </td>
                  <td style={{ ...td, background: 'var(--brand-50)' }} />
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleSaveNew(cat)}
                        style={{ padding: '3px 5px', borderRadius: 5, border: 'none', background: 'var(--green-600)', color: '#fff', cursor: 'pointer', display: 'flex' }}
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => setAddingCat(null)}
                        style={{ padding: '3px 5px', borderRadius: 5, border: '1px solid var(--n-200)', background: '#fff', color: 'var(--n-500)', cursor: 'pointer', fontSize: 12 }}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {rows.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={7} style={{ padding: '14px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
                    Sin ítems.{' '}
                    <button
                      onClick={() => { setAddingCat(cat); setNewGasto(EMPTY_NEW()) }}
                      style={{ background: 'none', border: 'none', color: 'var(--brand-600)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Agregar primero
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Subtotal row */}
          {rows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '7px 14px', borderTop: '1px solid var(--n-100)', background: 'var(--n-25)' }}>
              <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Total {title}: </span>
              <span style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)' }}>{fmtUSD(subtotal)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Gastos Generales</h2>
        </div>

        {renderSection('GG Variables', 'Variables', variables, totalVariables)}
        {renderSection('GG Fijos', 'Fijos', fijos, totalFijos)}

        {/* Totals block */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--n-150)',
          borderRadius: 10,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 420,
          marginLeft: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--n-600)' }}>
            <span>Total GG Variables</span>
            <span style={{ fontWeight: 600, color: 'var(--n-800)' }}>{fmtUSD(totalVariables)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--n-600)' }}>
            <span>Total GG Fijos</span>
            <span style={{ fontWeight: 600, color: 'var(--n-800)' }}>{fmtUSD(totalFijos)}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--n-150)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--n-700)' }}>
            <span style={{ fontWeight: 700 }}>Total GG</span>
            <span style={{ fontWeight: 800, color: 'var(--brand-700)' }}>{fmtUSD(totalGG)}</span>
          </div>

          {/* Imprevistos input */}
          <div style={{ borderTop: '1px solid var(--n-100)', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--n-500)' }}>Imprevistos %</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                step="0.5"
                value={imprevistosPct}
                onChange={e => onImprevistosChange?.(parseFloat(e.target.value) || 0)}
                style={{ width: 60, height: 28, padding: '0 6px', borderRadius: 5, border: '1px solid var(--n-200)', fontSize: 12, textAlign: 'right' }}
              />
              <span style={{ fontSize: 11, color: 'var(--n-400)' }}>%</span>
            </div>
          </div>

          <div style={{ background: 'var(--brand-50)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--brand-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--brand-700)', fontWeight: 600 }}>GG con Imprevistos</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand-800)' }}>{fmtUSD(totalConImprevistos)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
