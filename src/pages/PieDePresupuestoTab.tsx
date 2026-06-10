import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Save, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../lib/types'
import { fmtCurrency } from '../lib/budgetHelpers'
import { Button, IconButton } from '../components/ui/Button'

// ── Types ────────────────────────────────────────────────────
interface PieRow {
  id: string
  variable: string
  description: string
  formula: string
  highlight: boolean
  sort_order: number
  isNew?: boolean
}

type EditCell = { rowId: string; field: 'variable' | 'description' | 'formula' }

// ── Formula evaluator ────────────────────────────────────────
// Replaces known variables with their values, then evaluates
// only if the resulting expression is pure arithmetic (safe).
function evalFormula(formula: string, vars: Record<string, number>): number | null {
  if (!formula.trim()) return null
  let expr = formula.trim().toUpperCase()
  // Substitute variables, longest names first to avoid partial matches
  for (const k of Object.keys(vars).sort((a, b) => b.length - a.length)) {
    if (!isFinite(vars[k])) continue
    expr = expr.replace(new RegExp(`\\b${k}\\b`, 'g'), String(vars[k]))
  }
  // Only allow digits, arithmetic operators, parens, dots, spaces
  if (!/^[\s\d+\-*/.()]+$/.test(expr)) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict";return(${expr})`)() as number
    return isFinite(result) ? result : null
  } catch { return null }
}

// ── Props ────────────────────────────────────────────────────
interface Props {
  budget: Budget
  directCost: number
  ggTotal?: number
  onUpdate: (u: Partial<Budget>) => Promise<void>
}

// ── Styles ───────────────────────────────────────────────────
const TH: React.CSSProperties = {
  textAlign: 'left', padding: '9px 14px', fontWeight: 600, fontSize: 10.5,
  color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.07em',
  borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = { padding: '8px 14px', verticalAlign: 'middle' }
const INPUT_STYLE: React.CSSProperties = {
  padding: '3px 7px', borderRadius: 5, outline: 'none',
  border: '1.5px solid var(--brand-500)', fontSize: 12.5,
  background: 'var(--n-0)', boxShadow: '0 0 0 3px rgba(79,70,229,.12)',
}

// ── Component ────────────────────────────────────────────────
export default function PieDePresupuestoTab({ budget, directCost }: Props) {
  const [rows,     setRows]     = useState<PieRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [dirty,    setDirty]    = useState(false)
  const [editCell, setEditCell] = useState<EditCell | null>(null)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    supabase.from('budget_pie_rows').select('*').order('sort_order')
      .then(({ data, error }) => {
        if (error) { setLoadErr(error.message); setLoading(false); return }
        setRows(data ?? [])
        setLoading(false)
      })
  }, [])

  const cur = budget.currency ?? 'PEN'

  // Compute all values in row order, each row can reference previous ones
  const computed = useMemo(() => {
    const vars: Record<string, number> = { CD: directCost }
    for (const row of rows) {
      const key = row.variable.toUpperCase().trim()
      if (!key) continue
      vars[key] = evalFormula(row.formula, vars) ?? 0
    }
    return vars
  }, [rows, directCost])

  // All defined variable names (for the hint bar)
  const availVars = useMemo(() =>
    ['CD', ...rows.map(r => r.variable.toUpperCase().trim()).filter(Boolean)],
    [rows],
  )

  // ── Row operations ──────────────────────────────────────────
  const updateRow = (id: string, patch: Partial<PieRow>) => {
    setRows(p => p.map(r => r.id === id ? { ...r, ...patch } : r))
    setDirty(true)
  }

  const addRow = () => {
    const id = `new-${Date.now()}`
    setRows(p => [...p, { id, variable: '', description: '', formula: '', highlight: false, sort_order: p.length, isNew: true }])
    setEditCell({ rowId: id, field: 'variable' })
    setDirty(true)
  }

  const deleteRow = (id: string) => { setRows(p => p.filter(r => r.id !== id)); setDirty(true) }

  const moveRow = (id: string, dir: -1 | 1) => {
    setRows(p => {
      const i = p.findIndex(r => r.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= p.length) return p
      const a = [...p];[a[i], a[j]] = [a[j], a[i]]; return a
    })
    setDirty(true)
  }

  // ── Save (delete all + reinsert — it's global config, small table) ──
  const handleSave = async () => {
    const incomplete = rows.filter(r => !r.variable.trim() || !r.formula.trim())
    if (incomplete.length) {
      showToast('Todas las filas deben tener variable y fórmula.', false)
      return
    }
    setSaving(true)
    try {
      await supabase.from('budget_pie_rows').delete().not('id', 'is', null)
      const { data, error } = await supabase
        .from('budget_pie_rows')
        .insert(rows.map((r, i) => ({
          variable:    r.variable.toUpperCase().trim(),
          description: r.description.trim(),
          formula:     r.formula.trim(),
          highlight:   r.highlight,
          sort_order:  i,
        })))
        .select()
      if (error) throw error
      setRows(data ?? [])
      setDirty(false)
      showToast('Configuración guardada — aplica a todos los presupuestos.')
    } catch { showToast('Error al guardar.', false) }
    finally { setSaving(false) }
  }

  // ── Loading / error state ────────────────────────────────────
  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--brand-500)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (loadErr) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--red-500)', marginBottom: 12 }} />
        <p style={{ fontWeight: 600, color: 'var(--n-900)', marginBottom: 6 }}>Error al cargar las filas</p>
        <code style={{ fontSize: 12, background: 'var(--n-100)', borderRadius: 6, padding: '6px 12px', display: 'block', color: 'var(--red-700)', wordBreak: 'break-all' }}>{loadErr}</code>
        <p style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 10 }}>
          Verifica que la tabla <code>budget_pie_rows</code> exista en Supabase y que las políticas RLS permitan acceso al usuario autenticado.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Pie de Presupuesto</h2>
          <p style={{ fontSize: 12, color: 'var(--n-500)', margin: '3px 0 0' }}>
            Configuración global — aplica a todos los presupuestos.{' '}
            <code style={{ fontSize: 11, background: 'var(--n-100)', borderRadius: 3, padding: '0 4px' }}>CD</code> = Costo Directo de las partidas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {toast && (
            <span style={{
              fontSize: 11.5, padding: '4px 10px', borderRadius: 6,
              color: toast.ok ? 'var(--green-700)' : 'var(--red-700)',
              background: toast.ok ? 'var(--green-50)' : 'var(--red-50)',
              border: `1px solid ${toast.ok ? 'var(--green-200)' : 'var(--red-200)'}`,
            }}>{toast.msg}</span>
          )}
          <Button icon={Save} onClick={handleSave} disabled={!dirty || saving} variant={dirty ? 'primary' : undefined}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </div>

      {/* Variables hint bar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: 'var(--n-50, var(--n-100))', borderRadius: 8, border: '1px solid var(--n-200)' }}>
        <span style={{ fontSize: 11, color: 'var(--n-500)', fontWeight: 600, marginRight: 2 }}>Variables:</span>
        {availVars.map(v => (
          <span key={v} style={{
            fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
            color: 'var(--brand-700)', background: 'var(--brand-50)',
            border: '1px solid var(--brand-200)', borderRadius: 4, padding: '2px 7px',
          }}>
            {v}
            {computed[v] != null && (
              <span style={{ fontWeight: 400, color: 'var(--brand-500)', marginLeft: 4 }}>
                = {new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(computed[v])}
              </span>
            )}
          </span>
        ))}
        <span style={{ fontSize: 10.5, color: 'var(--n-400)', marginLeft: 4 }}>
          Haz clic en una celda para editarla · Al editar una fórmula, usa los botones de variables para insertarlas
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--n-25)' }}>
              <th style={{ ...TH, width: 44 }} />
              <th style={{ ...TH, width: 100 }}>Variable</th>
              <th style={{ ...TH, minWidth: 160 }}>Descripción</th>
              <th style={{ ...TH, minWidth: 220 }}>Fórmula</th>
              <th style={{ ...TH, textAlign: 'right', minWidth: 160 }}>Valor ({cur})</th>
              <th style={{ ...TH, width: 70, textAlign: 'center' }}>Resaltar</th>
              <th style={{ ...TH, width: 44 }} />
            </tr>
          </thead>
          <tbody>

            {/* ── CD: fixed row, always first ── */}
            <tr style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--n-150)' }}>
              <td style={TD} />
              <td style={TD}>
                <VarBadge label="CD" active />
              </td>
              <td style={TD}>
                <span style={{ fontWeight: 650, color: 'var(--n-900)' }}>COSTO DIRECTO</span>
              </td>
              <td style={TD}>
                <span style={{ fontSize: 11.5, color: 'var(--n-400)', fontStyle: 'italic' }}>Suma de partidas del presupuesto</span>
              </td>
              <td style={{ ...TD, textAlign: 'right' }}>
                <span className="mono tnum" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--brand-700)' }}>
                  {fmtCurrency(directCost, cur)}
                </span>
              </td>
              <td style={{ ...TD, textAlign: 'center' }}>
                <CheckDot checked />
              </td>
              <td style={TD} />
            </tr>

            {/* ── Dynamic rows ── */}
            {rows.map((row, idx) => {
              const key = row.variable.toUpperCase().trim()
              const val = key ? computed[key] : undefined
              const formulaErr = !!row.formula.trim() && val == null
              const isEditingVar  = editCell?.rowId === row.id && editCell.field === 'variable'
              const isEditingDesc = editCell?.rowId === row.id && editCell.field === 'description'
              const isEditingForm = editCell?.rowId === row.id && editCell.field === 'formula'

              return (
                <tr key={row.id} style={{ borderTop: '1px solid var(--n-150)', background: row.highlight ? 'var(--brand-50)' : 'transparent' }}>

                  {/* Move up/down */}
                  <td style={{ ...TD, padding: '3px 6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <IconButton icon={ChevronUp}   size={22} disabled={idx === 0}              title="Subir" onClick={() => moveRow(row.id, -1)} />
                      <IconButton icon={ChevronDown} size={22} disabled={idx === rows.length - 1} title="Bajar" onClick={() => moveRow(row.id,  1)} />
                    </div>
                  </td>

                  {/* Variable */}
                  <td style={TD} onClick={() => !editCell && setEditCell({ rowId: row.id, field: 'variable' })}>
                    {isEditingVar
                      ? <input
                          autoFocus value={row.variable} maxLength={12}
                          onChange={e => updateRow(row.id, { variable: e.target.value.toUpperCase().replace(/\s/g, '') })}
                          onBlur={() => setEditCell(null)}
                          onKeyDown={e => {
                            if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); setEditCell({ rowId: row.id, field: 'description' }) }
                            if (e.key === 'Escape') setEditCell(null)
                          }}
                          style={{ ...INPUT_STYLE, width: 78, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}
                        />
                      : <span
                          onClick={() => setEditCell({ rowId: row.id, field: 'variable' })}
                          style={{ cursor: 'text' }}
                        >
                          <VarBadge label={row.variable || 'VAR'} active={!!row.variable} />
                        </span>
                    }
                  </td>

                  {/* Description */}
                  <td style={TD}>
                    {isEditingDesc
                      ? <input
                          autoFocus value={row.description}
                          onChange={e => updateRow(row.id, { description: e.target.value })}
                          onBlur={() => setEditCell(null)}
                          onKeyDown={e => {
                            if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); setEditCell({ rowId: row.id, field: 'formula' }) }
                            if (e.key === 'Escape') setEditCell(null)
                          }}
                          style={{ ...INPUT_STYLE, width: '100%', minWidth: 140 }}
                        />
                      : <span
                          onClick={() => setEditCell({ rowId: row.id, field: 'description' })}
                          style={{ cursor: 'text', color: row.description ? 'var(--n-800)' : 'var(--n-400)', fontWeight: row.highlight ? 650 : 400, fontStyle: row.description ? 'normal' : 'italic' }}
                        >
                          {row.description || 'Descripción…'}
                        </span>
                    }
                  </td>

                  {/* Formula */}
                  <td style={TD}>
                    {isEditingForm
                      ? <div>
                          <input
                            autoFocus value={row.formula} placeholder="ej: CD * 0.10"
                            onChange={e => updateRow(row.id, { formula: e.target.value })}
                            onBlur={() => setEditCell(null)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditCell(null) }}
                            style={{
                              ...INPUT_STYLE,
                              width: '100%', minWidth: 180, fontFamily: 'monospace',
                              border: `1.5px solid ${formulaErr ? 'var(--red-500)' : 'var(--brand-500)'}`,
                              boxShadow: `0 0 0 3px ${formulaErr ? 'rgba(239,68,68,.12)' : 'rgba(79,70,229,.12)'}`,
                            }}
                          />
                          {/* Variable insertion pills */}
                          <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
                            {availVars.filter(v => v !== key).map(v => (
                              <button
                                key={v} tabIndex={-1}
                                onMouseDown={e => {
                                  e.preventDefault()
                                  const sep = row.formula && !row.formula.trimEnd().endsWith('(') ? ' ' : ''
                                  updateRow(row.id, { formula: row.formula + sep + v })
                                }}
                                style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-700)', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
                              >+ {v}</button>
                            ))}
                          </div>
                        </div>
                      : <span
                          onClick={() => setEditCell({ rowId: row.id, field: 'formula' })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'text' }}
                        >
                          <code style={{ fontSize: 12.5, borderRadius: 4, padding: '2px 8px', color: formulaErr ? 'var(--red-600)' : row.formula ? 'var(--n-800)' : 'var(--n-400)', background: formulaErr ? 'var(--red-50)' : 'var(--n-100)', fontFamily: 'monospace', fontStyle: row.formula ? 'normal' : 'italic' }}>
                            {row.formula || 'fórmula…'}
                          </code>
                          {formulaErr && <AlertCircle size={12} style={{ color: 'var(--red-500)', flexShrink: 0 }} />}
                        </span>
                    }
                  </td>

                  {/* Computed value */}
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <span className="mono tnum" style={{ fontSize: 13.5, fontWeight: row.highlight ? 700 : 500, color: val == null ? 'var(--n-400)' : row.highlight ? 'var(--brand-700)' : 'var(--n-900)' }}>
                      {val != null ? fmtCurrency(val, cur) : '—'}
                    </span>
                  </td>

                  {/* Highlight toggle */}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <button
                      onClick={() => updateRow(row.id, { highlight: !row.highlight })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
                      title="Resaltar fila"
                    >
                      <CheckDot checked={row.highlight} />
                    </button>
                  </td>

                  {/* Delete */}
                  <td style={{ ...TD, padding: '3px 8px' }}>
                    <IconButton icon={Trash2} size={26} danger title="Eliminar fila" onClick={() => deleteRow(row.id)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Add row button */}
        <button
          onClick={addRow}
          style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', borderTop: '1px solid var(--n-150)', cursor: 'pointer', color: 'var(--n-500)', fontSize: 12.5, fontWeight: 500, background: 'transparent', border: 'none', transition: 'background .12s, color .12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-25, var(--brand-50))'; e.currentTarget.style.color = 'var(--brand-700)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-500)' }}
        >
          <Plus size={13} /><span>Agregar fila</span>
        </button>
      </div>

      {rows.length === 0 && !loading && (
        <p style={{ fontSize: 12, color: 'var(--n-400)', textAlign: 'center', marginTop: -8 }}>
          Agrega filas para construir el pie de presupuesto. Ejemplo: <code>GG</code> con fórmula <code>CD * 0.10</code>.
        </p>
      )}
    </div>
  )
}

// ── Small helpers ────────────────────────────────────────────
function VarBadge({ label, active }: { label: string; active?: boolean }) {
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, borderRadius: 4, padding: '2px 7px', color: active ? 'var(--brand-700)' : 'var(--n-400)', background: active ? 'var(--brand-50)' : 'var(--n-100)' }}>
      {label}
    </span>
  )
}

function CheckDot({ checked }: { checked?: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, border: `2px solid ${checked ? 'var(--brand-500)' : 'var(--n-300)'}`, background: checked ? 'var(--brand-500)' : 'transparent', transition: 'all .1s' }} />
  )
}
