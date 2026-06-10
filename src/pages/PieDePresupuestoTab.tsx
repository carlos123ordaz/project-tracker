import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Save, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../lib/types'
import { fmtNumber, evalFormula } from '../lib/budgetHelpers'
import { Button, IconButton } from '../components/ui/Button'

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

interface Props {
  budget: Budget
  directCost: number
  ggTotal?: number
  onUpdate: (u: Partial<Budget>) => Promise<void>
}

const TH: React.CSSProperties = {
  padding: '7px 12px', fontWeight: 600, fontSize: 10.5,
  color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--n-150)', whiteSpace: 'nowrap', textAlign: 'left',
}
const TD: React.CSSProperties = { padding: '6px 12px', verticalAlign: 'middle', fontSize: 12 }

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
    setTimeout(() => setToast(null), 3000)
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

  const computed = useMemo(() => {
    const vars: Record<string, number> = { CD: directCost }
    for (const row of rows) {
      const key = row.variable.toUpperCase().trim()
      if (!key) continue
      vars[key] = evalFormula(row.formula, vars) ?? 0
    }
    return vars
  }, [rows, directCost])

  const availVars = useMemo(() =>
    ['CD', ...rows.map(r => r.variable.toUpperCase().trim()).filter(Boolean)],
    [rows],
  )

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

  const handleSave = async () => {
    const incomplete = rows.filter(r => !r.variable.trim() || !r.formula.trim())
    if (incomplete.length) { showToast('Todas las filas necesitan variable y fórmula.', false); return }
    setSaving(true)
    try {
      await supabase.from('budget_pie_rows').delete().not('id', 'is', null)
      const { data, error } = await supabase.from('budget_pie_rows')
        .insert(rows.map((r, i) => ({
          variable:    r.variable.toUpperCase().trim(),
          description: r.description.trim(),
          formula:     r.formula.trim(),
          highlight:   r.highlight,
          sort_order:  i,
        }))).select()
      if (error) throw error
      setRows(data ?? [])
      setDirty(false)
      showToast('Configuración guardada.')
    } catch { showToast('Error al guardar.', false) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--brand-500)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (loadErr) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <AlertCircle size={28} style={{ color: 'var(--red-500)', marginBottom: 10 }} />
        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--n-900)', marginBottom: 5 }}>Error al cargar las filas</p>
        <code style={{ fontSize: 11.5, background: 'var(--n-100)', borderRadius: 5, padding: '5px 10px', display: 'block', color: 'var(--red-700)', wordBreak: 'break-all' }}>{loadErr}</code>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)' }}>Pie de Presupuesto</div>
          <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 2 }}>
            Configuración global · aplica a todos los presupuestos ·{' '}
            <code style={{ fontSize: 10.5, background: 'var(--n-100)', borderRadius: 3, padding: '1px 5px', color: 'var(--brand-700)' }}>CD</code>
            {' '}= Costo Directo
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {toast && (
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, color: toast.ok ? 'var(--green-700)' : 'var(--red-700)', background: toast.ok ? 'var(--green-50)' : 'var(--red-50)', border: `1px solid ${toast.ok ? 'var(--green-200)' : 'var(--red-200)'}` }}>
              {toast.msg}
            </span>
          )}
          <Button icon={Save} size="sm" onClick={handleSave} disabled={!dirty || saving} variant={dirty ? 'primary' : undefined}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Variables hint */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', padding: '6px 10px', background: 'var(--n-50)', borderRadius: 6, border: '1px solid var(--n-150)' }}>
        <span style={{ fontSize: 10.5, color: 'var(--n-500)', fontWeight: 600, marginRight: 2, whiteSpace: 'nowrap' }}>Variables disponibles:</span>
        {availVars.map(v => (
          <span key={v} style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-700)', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 4, padding: '1px 6px' }}>
            {v}
            {computed[v] != null && (
              <span style={{ fontWeight: 400, color: 'var(--brand-500)', marginLeft: 4 }}>
                = {fmtNumber(computed[v])}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--n-25)' }}>
              <th style={{ ...TH, width: 36 }} />
              <th style={{ ...TH, width: 90 }}>Variable</th>
              <th style={{ ...TH, minWidth: 150 }}>Descripción</th>
              <th style={{ ...TH, minWidth: 200 }}>Fórmula</th>
              <th style={{ ...TH, textAlign: 'right', minWidth: 140 }}>Valor ({cur})</th>
              <th style={{ ...TH, width: 62, textAlign: 'center' }}>Resaltar</th>
              <th style={{ ...TH, width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {/* CD fixed row */}
            <tr style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--n-150)' }}>
              <td style={TD} />
              <td style={TD}><VarBadge label="CD" active /></td>
              <td style={{ ...TD, color: 'var(--n-700)', fontWeight: 600 }}>Costo Directo</td>
              <td style={{ ...TD }}><span style={{ fontSize: 11, color: 'var(--n-400)', fontStyle: 'italic' }}>Suma de partidas</span></td>
              <td style={{ ...TD, textAlign: 'right' }}>
                <span className="mono tnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)' }}>
                  {fmtNumber(directCost)} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--brand-500)' }}>{cur}</span>
                </span>
              </td>
              <td style={{ ...TD, textAlign: 'center' }}><CheckDot checked /></td>
              <td style={TD} />
            </tr>

            {rows.map((row, idx) => {
              const key = row.variable.toUpperCase().trim()
              const val = key ? computed[key] : undefined
              const formulaErr = !!row.formula.trim() && val == null
              const isEditingVar  = editCell?.rowId === row.id && editCell.field === 'variable'
              const isEditingDesc = editCell?.rowId === row.id && editCell.field === 'description'
              const isEditingForm = editCell?.rowId === row.id && editCell.field === 'formula'

              return (
                <tr key={row.id} style={{ borderTop: '1px solid var(--n-150)', background: row.highlight ? 'var(--n-900)' : 'transparent' }}>
                  {/* Move */}
                  <td style={{ ...TD, padding: '2px 4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <IconButton icon={ChevronUp}   size={18} disabled={idx === 0}              onClick={() => moveRow(row.id, -1)} />
                      <IconButton icon={ChevronDown} size={18} disabled={idx === rows.length - 1} onClick={() => moveRow(row.id,  1)} />
                    </div>
                  </td>

                  {/* Variable */}
                  <td style={TD} onClick={() => !editCell && setEditCell({ rowId: row.id, field: 'variable' })}>
                    {isEditingVar
                      ? <input autoFocus value={row.variable} maxLength={12}
                          onChange={e => updateRow(row.id, { variable: e.target.value.toUpperCase().replace(/\s/g, '') })}
                          onBlur={() => setEditCell(null)}
                          onKeyDown={e => {
                            if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); setEditCell({ rowId: row.id, field: 'description' }) }
                            if (e.key === 'Escape') setEditCell(null)
                          }}
                          style={{ width: 72, height: 26, padding: '0 6px', border: '1px solid var(--brand-400)', borderRadius: 5, outline: 'none', fontSize: 11.5, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }}
                        />
                      : <span onClick={() => setEditCell({ rowId: row.id, field: 'variable' })} style={{ cursor: 'text' }}>
                          <VarBadge label={row.variable || 'VAR'} active={!!row.variable} highlight={row.highlight} />
                        </span>
                    }
                  </td>

                  {/* Description */}
                  <td style={TD}>
                    {isEditingDesc
                      ? <input autoFocus value={row.description}
                          onChange={e => updateRow(row.id, { description: e.target.value })}
                          onBlur={() => setEditCell(null)}
                          onKeyDown={e => {
                            if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); setEditCell({ rowId: row.id, field: 'formula' }) }
                            if (e.key === 'Escape') setEditCell(null)
                          }}
                          style={{ width: '100%', minWidth: 130, height: 26, padding: '0 7px', border: '1px solid var(--brand-400)', borderRadius: 5, outline: 'none', fontSize: 12, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }}
                        />
                      : <span onClick={() => setEditCell({ rowId: row.id, field: 'description' })}
                          style={{ cursor: 'text', fontSize: 12, color: row.description ? (row.highlight ? 'var(--n-0)' : 'var(--n-800)') : 'var(--n-400)', fontWeight: row.highlight ? 600 : 400, fontStyle: row.description ? 'normal' : 'italic' }}>
                          {row.description || 'Sin descripción'}
                        </span>
                    }
                  </td>

                  {/* Formula */}
                  <td style={TD}>
                    {isEditingForm
                      ? <div>
                          <input autoFocus value={row.formula} placeholder="ej: CD * 0.10"
                            onChange={e => updateRow(row.id, { formula: e.target.value })}
                            onBlur={() => setEditCell(null)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditCell(null) }}
                            style={{ width: '100%', minWidth: 170, height: 26, padding: '0 7px', border: `1px solid ${formulaErr ? 'var(--red-400)' : 'var(--brand-400)'}`, borderRadius: 5, outline: 'none', fontSize: 12, fontFamily: 'monospace', background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                            {availVars.filter(v => v !== key).map(v => (
                              <button key={v} tabIndex={-1}
                                onMouseDown={e => { e.preventDefault(); const sep = row.formula && !row.formula.trimEnd().endsWith('(') ? ' ' : ''; updateRow(row.id, { formula: row.formula + sep + v }) }}
                                style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-700)', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 3, padding: '1px 5px', cursor: 'pointer' }}
                              >+{v}</button>
                            ))}
                          </div>
                        </div>
                      : <span onClick={() => setEditCell({ rowId: row.id, field: 'formula' })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'text' }}>
                          <code style={{ fontSize: 11.5, borderRadius: 4, padding: '1px 7px', color: formulaErr ? 'var(--red-600)' : row.formula ? (row.highlight ? 'var(--n-100)' : 'var(--n-700)') : 'var(--n-400)', background: formulaErr ? 'var(--red-50)' : row.highlight ? 'rgba(255,255,255,.1)' : 'var(--n-100)', fontFamily: 'monospace', fontStyle: row.formula ? 'normal' : 'italic' }}>
                            {row.formula || 'fórmula…'}
                          </code>
                          {formulaErr && <AlertCircle size={11} style={{ color: 'var(--red-500)', flexShrink: 0 }} />}
                        </span>
                    }
                  </td>

                  {/* Value */}
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <span className="mono tnum" style={{ fontSize: 12.5, fontWeight: row.highlight ? 700 : 500, color: val == null ? 'var(--n-400)' : row.highlight ? 'var(--n-0)' : 'var(--n-900)' }}>
                      {val != null ? fmtNumber(val) : '—'}
                    </span>
                    {val != null && <span style={{ fontSize: 10, color: row.highlight ? 'rgba(255,255,255,.5)' : 'var(--n-400)', marginLeft: 4 }}>{cur}</span>}
                  </td>

                  {/* Highlight */}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <button onClick={() => updateRow(row.id, { highlight: !row.highlight })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}>
                      <CheckDot checked={row.highlight} />
                    </button>
                  </td>

                  {/* Delete */}
                  <td style={{ ...TD, padding: '2px 6px' }}>
                    <IconButton icon={Trash2} size={22} danger onClick={() => deleteRow(row.id)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button onClick={addRow}
          style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', borderTop: '1px solid var(--n-150)', cursor: 'pointer', color: 'var(--n-500)', fontSize: 12, fontWeight: 500, background: 'transparent', border: 'none', transition: 'background .12s, color .12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-50)'; e.currentTarget.style.color = 'var(--brand-700)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-500)' }}>
          <Plus size={12} /> Agregar fila
        </button>
      </div>

      {rows.length === 0 && !loading && (
        <p style={{ fontSize: 11.5, color: 'var(--n-400)', textAlign: 'center' }}>
          Sin filas. Ejemplo: variable <code style={{ fontFamily: 'monospace', background: 'var(--n-100)', borderRadius: 3, padding: '0 4px' }}>GG</code> con fórmula <code style={{ fontFamily: 'monospace', background: 'var(--n-100)', borderRadius: 3, padding: '0 4px' }}>CD * 0.10</code>
        </p>
      )}
    </div>
  )
}

function VarBadge({ label, active, highlight }: { label: string; active?: boolean; highlight?: boolean }) {
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, borderRadius: 4, padding: '1px 6px', color: highlight ? 'var(--n-0)' : active ? 'var(--brand-700)' : 'var(--n-400)', background: highlight ? 'rgba(255,255,255,.15)' : active ? 'var(--brand-50)' : 'var(--n-100)', border: `1px solid ${highlight ? 'rgba(255,255,255,.2)' : active ? 'var(--brand-200)' : 'transparent'}` }}>
      {label}
    </span>
  )
}

function CheckDot({ checked }: { checked?: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${checked ? 'var(--brand-500)' : 'var(--n-300)'}`, background: checked ? 'var(--brand-500)' : 'transparent', transition: 'all .1s' }} />
  )
}
