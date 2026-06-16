import { useState, useRef } from 'react'
import { Plus, Trash2, Check, AlertTriangle } from 'lucide-react'
import { useCashFlowCot } from '../../../hooks/useCashFlowCot'

interface Props {
  cotizacionId: string
  plazoSemanas: number
  precioVentaTotal: number   // para calcular % de ingresos en USD
}

const MAX_PERIODOS = 20
const fmtUSD = (v: number) =>
  v === 0 ? '—' : `$${Math.round(v).toLocaleString('en-US')}`
const fmtBalance = (v: number) => {
  if (v === 0) return '—'
  const s = `$${Math.abs(Math.round(v)).toLocaleString('en-US')}`
  return v < 0 ? `-${s}` : `+${s}`
}

// ── Inline editable cell ──────────────────────────────────────────────────────
function MoneyCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onChange(parseFloat(draft) || 0) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { setEditing(false); onChange(parseFloat(draft) || 0) } if (e.key === 'Escape') setEditing(false) }}
        style={{ width: '100%', minWidth: 72, height: 26, padding: '0 4px', border: '1px solid var(--brand-300)', borderRadius: 4, fontSize: 11, textAlign: 'right', background: 'var(--brand-50)', outline: 'none' }}
      />
    )
  }
  return (
    <div
      onClick={() => { setEditing(true); setDraft(value === 0 ? '' : String(value)) }}
      style={{ minWidth: 72, height: 26, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'text', fontSize: 11, color: value === 0 ? 'var(--n-300)' : 'var(--n-800)', borderRadius: 4 }}
      title="Click para editar"
    >
      {value === 0 ? '—' : `$${Math.round(value).toLocaleString('en-US')}`}
    </div>
  )
}

function DescCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft.trim()) onChange(draft.trim()) }}
        onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (draft.trim()) onChange(draft.trim()) } if (e.key === 'Escape') setEditing(false) }}
        style={{ width: '100%', minWidth: 160, height: 26, padding: '0 6px', border: '1px solid var(--brand-300)', borderRadius: 4, fontSize: 12, background: 'var(--brand-50)', outline: 'none' }}
      />
    )
  }
  return (
    <div onClick={() => { setEditing(true); setDraft(value) }} style={{ minWidth: 160, height: 26, display: 'flex', alignItems: 'center', cursor: 'text', fontSize: 12, color: 'var(--n-800)', fontWeight: 500, padding: '0 2px' }}>
      {value}
    </div>
  )
}

function PctCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onChange(parseFloat(draft) || 0) }}
        onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onChange(parseFloat(draft) || 0) } if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 60, height: 26, padding: '0 4px', border: '1px solid var(--brand-300)', borderRadius: 4, fontSize: 11, textAlign: 'right', background: 'var(--brand-50)', outline: 'none' }}
      />
    )
  }
  return (
    <div onClick={() => { setEditing(true); setDraft(String(value)) }} style={{ width: 60, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'text', fontSize: 11, color: value === 0 ? 'var(--n-300)' : 'var(--n-600)', padding: '0 4px' }}>
      {value > 0 ? `${value}%` : '—'}
    </div>
  )
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────
function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
function labelMes(startYM: string, offset: number): string {
  const [y, m] = startYM.split('-').map(Number)
  const d = new Date(y, m - 1 + offset, 1)
  return d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CashFlowTab({ cotizacionId, plazoSemanas, precioVentaTotal }: Props) {
  const numPeriodos = Math.min(Math.max(Math.ceil(plazoSemanas / 4), 4), MAX_PERIODOS)
  const {
    egresos, ingresos, loading, fetchError, saving,
    addEgreso, updateEgresoCell, updateEgresoDesc, deleteEgreso,
    addIngreso, updateIngresoCell, updateIngresoDesc, updateIngresoPct, deleteIngreso,
  } = useCashFlowCot(cotizacionId, numPeriodos)

  const [newEgresoDesc, setNewEgresoDesc] = useState('')
  const [addingEgreso, setAddingEgreso] = useState(false)
  const [newIngresoDesc, setNewIngresoDesc] = useState('')
  const [newIngresoPct, setNewIngresoPct] = useState('')
  const [addingIngreso, setAddingIngreso] = useState(false)
  const savingRef = useRef(false)

  // Fecha de inicio — persiste en localStorage por cotización
  const storageKey = `cf_start_${cotizacionId}`
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    return localStorage.getItem(storageKey) ?? toYearMonth(new Date())
  })
  function handleFechaChange(ym: string) {
    setFechaInicio(ym)
    localStorage.setItem(storageKey, ym)
  }

  const periodos = Array.from({ length: numPeriodos }, (_, i) => i + 1)

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalEgresosPorPeriodo = periodos.map((_,i) => egresos.reduce((s, e) => s + (e.periodos[i] ?? 0), 0))
  const totalIngresosPorPeriodo = periodos.map((_,i) => ingresos.reduce((s, i2) => s + (i2.periodos[i] ?? 0), 0))
  const balancePorPeriodo = periodos.map((_, i) => totalIngresosPorPeriodo[i] - totalEgresosPorPeriodo[i])

  let acumulado = 0
  const acumuladoPorPeriodo = balancePorPeriodo.map(b => { acumulado += b; return acumulado })

  const totalEgresos  = totalEgresosPorPeriodo.reduce((s, v) => s + v, 0)
  const totalIngresos = totalIngresosPorPeriodo.reduce((s, v) => s + v, 0)

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAddEgreso() {
    if (!newEgresoDesc.trim() || savingRef.current) return
    savingRef.current = true
    try { await addEgreso(newEgresoDesc.trim()); setNewEgresoDesc(''); setAddingEgreso(false) }
    finally { savingRef.current = false }
  }

  async function handleAddIngreso() {
    if (!newIngresoDesc.trim() || savingRef.current) return
    savingRef.current = true
    try {
      await addIngreso(newIngresoDesc.trim(), parseFloat(newIngresoPct) || 0)
      setNewIngresoDesc(''); setNewIngresoPct(''); setAddingIngreso(false)
    } finally { savingRef.current = false }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando cash flow…</div>

  if (fetchError) {
    const isMissing = fetchError.includes('does not exist') || fetchError.includes('relation')
    return (
      <div style={{ padding: '32px 24px', maxWidth: 600 }}>
        <div style={{ display: 'flex', gap: 12, padding: '16px 18px', borderRadius: 10, border: '1px solid var(--amber-200)', background: 'var(--amber-50)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--amber-600)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-800)', marginBottom: 4 }}>
              {isMissing ? 'Tabla no encontrada — ejecuta la migración v3' : 'Error cargando datos'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--amber-700)', fontFamily: 'monospace' }}>{fetchError}</div>
            {isMissing && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber-700)' }}>Corre <code>supabase_migration_v3.sql</code> en el SQL Editor de Supabase y recarga.</div>}
          </div>
        </div>
      </div>
    )
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const LABEL_W = 200
  const PCT_W   = 64
  const TOTAL_W = 84
  const COL_W   = 84

  const thBase: React.CSSProperties = {
    padding: '6px 4px',
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    textAlign: 'right',
    borderBottom: '2px solid var(--n-200)',
    color: 'var(--n-500)',
    background: 'var(--n-25)',
  }
  const tdBase: React.CSSProperties = {
    padding: '2px 4px',
    verticalAlign: 'middle',
    borderBottom: '1px solid var(--n-100)',
  }

  function SectionHeader({ label, color, onAdd }: { label: string; color: string; onAdd: () => void }) {
    return (
      <tr>
        <td colSpan={numPeriodos + 3} style={{ padding: '10px 8px 6px', background: color, borderBottom: '1px solid var(--n-150)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <button
              onClick={onAdd}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--brand-600)', color: '#fff' }}
            >
              <Plus size={11} /> Agregar
            </button>
          </div>
        </td>
      </tr>
    )
  }

  function TotalRow({ label, valores, bg, color }: { label: string; valores: number[]; bg: string; color: string }) {
    const total = valores.reduce((s, v) => s + v, 0)
    return (
      <tr style={{ background: bg }}>
        <td style={{ ...tdBase, width: LABEL_W, minWidth: LABEL_W, fontWeight: 700, fontSize: 11.5, color, padding: '7px 8px', borderBottom: 'none' }}>
          {label}
        </td>
        <td style={{ ...tdBase, width: TOTAL_W, textAlign: 'right', fontWeight: 700, fontSize: 11, color, padding: '7px 4px', borderBottom: 'none' }}>
          {fmtUSD(total)}
        </td>
        {valores.map((v, i) => (
          <td key={i} style={{ ...tdBase, width: COL_W, textAlign: 'right', fontWeight: 700, fontSize: 11, color, padding: '7px 4px', borderBottom: 'none' }}>
            {fmtUSD(v)}
          </td>
        ))}
        <td style={{ ...tdBase, width: 32, borderBottom: 'none' }} />
      </tr>
    )
  }

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Cash Flow</h2>
        <span style={{ fontSize: 11, color: 'var(--n-400)' }}>{numPeriodos} meses · clic en celda para editar</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <label style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 600 }}>Inicio:</label>
          <input
            type="month"
            value={fechaInicio}
            onChange={e => handleFechaChange(e.target.value)}
            style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 12, color: 'var(--n-800)', background: '#fff', cursor: 'pointer' }}
          />
        </div>
        {saving && <span style={{ fontSize: 11, color: 'var(--brand-500)' }}>Guardando…</span>}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: LABEL_W + TOTAL_W + COL_W * numPeriodos + 32 }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: 'left', width: LABEL_W, minWidth: LABEL_W, paddingLeft: 8 }}>Descripción</th>
              <th style={{ ...thBase, width: TOTAL_W, minWidth: TOTAL_W }}>Total USD</th>
              {periodos.map((_, i) => (
                <th key={i} style={{ ...thBase, width: COL_W, minWidth: COL_W }}>
                  {labelMes(fechaInicio, i)}
                </th>
              ))}
              <th style={{ ...thBase, width: 32 }} />
            </tr>
          </thead>
          <tbody>

            {/* ── EGRESOS ─────────────────────────────────────────────────── */}
            <SectionHeader label="Egresos (Costos)" color="var(--red-50)" onAdd={() => setAddingEgreso(true)} />

            {egresos.map((eg, idx) => {
              const total = eg.periodos.reduce((s, v) => s + v, 0)
              return (
                <tr key={eg.id} style={{ background: idx % 2 === 0 ? '#fff' : 'var(--n-25)' }}>
                  <td style={{ ...tdBase, width: LABEL_W, paddingLeft: 8 }}>
                    <DescCell value={eg.descripcion} onChange={v => updateEgresoDesc(eg.id, v)} />
                  </td>
                  <td style={{ ...tdBase, width: TOTAL_W, textAlign: 'right', fontSize: 11, color: 'var(--n-600)', fontWeight: 600 }}>
                    {fmtUSD(total)}
                  </td>
                  {eg.periodos.map((v, i) => (
                    <td key={i} style={{ ...tdBase, width: COL_W }}>
                      <MoneyCell value={v} onChange={val => updateEgresoCell(eg.id, i, val)} />
                    </td>
                  ))}
                  <td style={{ ...tdBase, width: 32 }}>
                    <button onClick={() => deleteEgreso(eg.id)} style={{ padding: '2px 4px', border: '1px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-500)', borderRadius: 4, cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={10} />
                    </button>
                  </td>
                </tr>
              )
            })}

            {/* New egreso row */}
            {addingEgreso && (
              <tr style={{ background: 'var(--green-50)' }}>
                <td style={{ ...tdBase, paddingLeft: 8 }}>
                  <input
                    autoFocus
                    value={newEgresoDesc}
                    onChange={e => setNewEgresoDesc(e.target.value)}
                    placeholder="Descripción del egreso…"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddEgreso(); if (e.key === 'Escape') setAddingEgreso(false) }}
                    style={{ width: '100%', height: 26, padding: '0 6px', border: '1px solid var(--n-200)', borderRadius: 4, fontSize: 12, background: '#fff' }}
                  />
                </td>
                <td colSpan={numPeriodos + 1} style={tdBase} />
                <td style={tdBase}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button onClick={handleAddEgreso} style={{ padding: '2px 4px', border: 'none', background: 'var(--green-600)', color: '#fff', borderRadius: 4, cursor: 'pointer', display: 'flex' }}><Check size={10} /></button>
                    <button onClick={() => setAddingEgreso(false)} style={{ padding: '2px 4px', border: '1px solid var(--n-200)', background: '#fff', color: 'var(--n-500)', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>×</button>
                  </div>
                </td>
              </tr>
            )}

            {egresos.length === 0 && !addingEgreso && (
              <tr><td colSpan={numPeriodos + 3} style={{ padding: '12px 8px', color: 'var(--n-400)', fontSize: 12, textAlign: 'center' }}>
                Sin egresos. <button onClick={() => setAddingEgreso(true)} style={{ background: 'none', border: 'none', color: 'var(--brand-600)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: 12 }}>Agregar primero</button>
              </td></tr>
            )}

            <TotalRow label="Total Egresos" valores={totalEgresosPorPeriodo} bg="var(--red-50)" color="var(--red-700)" />

            {/* ── INGRESOS ────────────────────────────────────────────────── */}
            <SectionHeader label="Ingresos (Pagos Cliente)" color="var(--green-50)" onAdd={() => setAddingIngreso(true)} />

            {ingresos.map((ing, idx) => {
              const total = ing.periodos.reduce((s, v) => s + v, 0)
              const pctMonto = precioVentaTotal > 0 ? (ing.porcentaje / 100) * precioVentaTotal : 0
              return (
                <tr key={ing.id} style={{ background: idx % 2 === 0 ? '#fff' : 'var(--n-25)' }}>
                  <td style={{ ...tdBase, width: LABEL_W, paddingLeft: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PctCell value={ing.porcentaje} onChange={v => updateIngresoPct(ing.id, v)} />
                      {pctMonto > 0 && <span style={{ fontSize: 10, color: 'var(--n-400)' }}>{fmtUSD(pctMonto)}</span>}
                      <DescCell value={ing.descripcion} onChange={v => updateIngresoDesc(ing.id, v)} />
                    </div>
                  </td>
                  <td style={{ ...tdBase, width: TOTAL_W, textAlign: 'right', fontSize: 11, color: 'var(--green-700)', fontWeight: 600 }}>
                    {fmtUSD(total)}
                  </td>
                  {ing.periodos.map((v, i) => (
                    <td key={i} style={{ ...tdBase, width: COL_W }}>
                      <MoneyCell value={v} onChange={val => updateIngresoCell(ing.id, i, val)} />
                    </td>
                  ))}
                  <td style={{ ...tdBase, width: 32 }}>
                    <button onClick={() => deleteIngreso(ing.id)} style={{ padding: '2px 4px', border: '1px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-500)', borderRadius: 4, cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={10} />
                    </button>
                  </td>
                </tr>
              )
            })}

            {/* New ingreso row */}
            {addingIngreso && (
              <tr style={{ background: 'var(--green-50)' }}>
                <td style={{ ...tdBase, paddingLeft: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      value={newIngresoPct}
                      onChange={e => setNewIngresoPct(e.target.value)}
                      placeholder="%"
                      style={{ width: 52, height: 26, padding: '0 4px', border: '1px solid var(--n-200)', borderRadius: 4, fontSize: 11, textAlign: 'right', background: '#fff' }}
                    />
                    <input
                      autoFocus
                      value={newIngresoDesc}
                      onChange={e => setNewIngresoDesc(e.target.value)}
                      placeholder="Descripción del hito…"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddIngreso(); if (e.key === 'Escape') setAddingIngreso(false) }}
                      style={{ flex: 1, height: 26, padding: '0 6px', border: '1px solid var(--n-200)', borderRadius: 4, fontSize: 12, background: '#fff' }}
                    />
                  </div>
                </td>
                <td colSpan={numPeriodos + 1} style={tdBase} />
                <td style={tdBase}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button onClick={handleAddIngreso} style={{ padding: '2px 4px', border: 'none', background: 'var(--green-600)', color: '#fff', borderRadius: 4, cursor: 'pointer', display: 'flex' }}><Check size={10} /></button>
                    <button onClick={() => setAddingIngreso(false)} style={{ padding: '2px 4px', border: '1px solid var(--n-200)', background: '#fff', color: 'var(--n-500)', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>×</button>
                  </div>
                </td>
              </tr>
            )}

            {ingresos.length === 0 && !addingIngreso && (
              <tr><td colSpan={numPeriodos + 3} style={{ padding: '12px 8px', color: 'var(--n-400)', fontSize: 12, textAlign: 'center' }}>
                Sin ingresos. <button onClick={() => setAddingIngreso(true)} style={{ background: 'none', border: 'none', color: 'var(--brand-600)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: 12 }}>Agregar primero</button>
              </td></tr>
            )}

            <TotalRow label="Total Ingresos" valores={totalIngresosPorPeriodo} bg="var(--green-50)" color="var(--green-700)" />

            {/* ── BALANCE ──────────────────────────────────────────────────── */}
            <tr style={{ background: 'var(--n-100)' }}>
              <td colSpan={numPeriodos + 3} style={{ height: 6, padding: 0 }} />
            </tr>

            {/* Balance mensual */}
            <tr style={{ background: 'var(--n-800)' }}>
              <td style={{ ...tdBase, width: LABEL_W, paddingLeft: 8, fontWeight: 800, fontSize: 12, color: '#fff', borderBottom: 'none' }}>Balance del Mes</td>
              <td style={{ ...tdBase, width: TOTAL_W, textAlign: 'right', fontWeight: 700, fontSize: 11, color: 'var(--n-300)', borderBottom: 'none' }}>
                {fmtBalance(totalIngresos - totalEgresos)}
              </td>
              {balancePorPeriodo.map((v, i) => (
                <td key={i} style={{ ...tdBase, width: COL_W, textAlign: 'right', fontWeight: 700, fontSize: 11, color: v >= 0 ? '#86efac' : '#fca5a5', borderBottom: 'none' }}>
                  {fmtBalance(v)}
                </td>
              ))}
              <td style={{ ...tdBase, width: 32, borderBottom: 'none' }} />
            </tr>

            {/* Flujo acumulado */}
            <tr style={{ background: 'var(--n-900)' }}>
              <td style={{ ...tdBase, width: LABEL_W, paddingLeft: 8, fontWeight: 800, fontSize: 12, color: '#fff', borderBottom: 'none' }}>Flujo Acumulado</td>
              <td style={{ ...tdBase, width: TOTAL_W, borderBottom: 'none' }} />
              {acumuladoPorPeriodo.map((v, i) => (
                <td key={i} style={{ ...tdBase, width: COL_W, textAlign: 'right', fontWeight: 800, fontSize: 12, color: v >= 0 ? '#4ade80' : '#f87171', borderBottom: 'none' }}>
                  {fmtBalance(v)}
                </td>
              ))}
              <td style={{ ...tdBase, width: 32, borderBottom: 'none' }} />
            </tr>

          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <SummaryCard label="Total Egresos" value={fmtUSD(totalEgresos)} color="var(--red-700)" bg="var(--red-50)" border="var(--red-100)" />
        <SummaryCard label="Total Ingresos" value={fmtUSD(totalIngresos)} color="var(--green-700)" bg="var(--green-50)" border="var(--green-200)" />
        <SummaryCard
          label="Balance Final"
          value={fmtBalance(totalIngresos - totalEgresos)}
          color={(totalIngresos - totalEgresos) >= 0 ? 'var(--green-700)' : 'var(--red-700)'}
          bg={(totalIngresos - totalEgresos) >= 0 ? 'var(--green-50)' : 'var(--red-50)'}
          border={(totalIngresos - totalEgresos) >= 0 ? 'var(--green-200)' : 'var(--red-100)'}
        />
        {precioVentaTotal > 0 && (
          <SummaryCard
            label="Ingresos vs Precio Oferta"
            value={`${((totalIngresos / precioVentaTotal) * 100).toFixed(1)}%`}
            color="var(--brand-700)"
            bg="var(--brand-50)"
            border="var(--brand-100)"
          />
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color, bg, border }: { label: string; value: string; color: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 16px', minWidth: 160 }}>
      <div style={{ fontSize: 11, color: 'var(--n-500)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
