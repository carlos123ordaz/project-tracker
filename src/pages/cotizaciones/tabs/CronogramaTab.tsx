import { useState, useRef } from 'react'
import { Plus, Trash2, Check, AlertTriangle } from 'lucide-react'
import { useCronogramaCot } from '../../../hooks/useCronogramaCot'
import type { CronogramaItem, CronogramaTipo } from '../../../lib/types'

interface Props {
  cotizacionId: string
  plazoSemanas?: number
}

const DAY_W = 18 // px per week column
const ROW_H = 34
const LABEL_W = 260

const TIPO_COLOR: Record<CronogramaTipo, { bar: string; text: string; label: string }> = {
  tarea:       { bar: 'var(--brand-500)',  text: 'var(--brand-800)',  label: 'Tarea'       },
  hito:        { bar: 'var(--amber-700)', text: 'var(--amber-700)', label: 'Hito'         },
  entregable:  { bar: 'var(--green-600)', text: 'var(--green-700)', label: 'Entregable'   },
}

const th: React.CSSProperties = {
  padding: '5px 8px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--n-500)',
  borderBottom: '1px solid var(--n-100)',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { padding: '5px 7px', verticalAlign: 'middle' }

function NumInput({ value, onChange, width = 60 }: { value: number; onChange: (v: number) => void; width?: number }) {
  return (
    <input
      type="number"
      min={1}
      value={value}
      onChange={e => onChange(parseInt(e.target.value) || 1)}
      style={{ width, height: 26, padding: '0 5px', borderRadius: 5, border: '1px solid var(--n-150)', fontSize: 12, textAlign: 'right', background: 'var(--n-0)' }}
    />
  )
}

type NewItem = {
  descripcion: string
  tipo: CronogramaTipo
  semana_inicio: number
  semana_fin: number
}

const EMPTY_NEW = (): NewItem => ({ descripcion: '', tipo: 'tarea', semana_inicio: 1, semana_fin: 2 })

export default function CronogramaTab({ cotizacionId, plazoSemanas = 40 }: Props) {
  const { items, loading, fetchError, createItem, updateItem, deleteItem } = useCronogramaCot(cotizacionId)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState<NewItem>(EMPTY_NEW())
  const savingRef = useRef(false)
  const ganttRef = useRef<HTMLDivElement>(null)

  const totalWeeks = Math.max(plazoSemanas, items.reduce((m, it) => Math.max(m, it.semana_fin), 1))
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  async function handleSave() {
    if (!newItem.descripcion.trim() || savingRef.current) return
    savingRef.current = true
    try {
      await createItem({
        cotizacion_id: cotizacionId,
        item: items.length + 1,
        descripcion: newItem.descripcion,
        tipo: newItem.tipo,
        semana_inicio: newItem.semana_inicio,
        semana_fin: Math.max(newItem.semana_fin, newItem.semana_inicio),
        color: null,
        orden: items.length,
      })
      setNewItem(EMPTY_NEW())
      setAdding(false)
    } finally {
      savingRef.current = false
    }
  }

  function handleField(id: string, field: keyof CronogramaItem, value: unknown) {
    updateItem(id, { [field]: value } as Partial<CronogramaItem>)
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
        Cargando cronograma…
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

  const sorted = [...items].sort((a, b) => a.orden - b.orden)

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Gantt ─────────────────────────────────────────────────────────── */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-800)', margin: '0 0 10px' }}>Diagrama Gantt</h3>
        <div style={{ border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden', background: 'var(--n-0)' }}>
          <div style={{ overflowX: 'auto' }} ref={ganttRef}>
            <div style={{ display: 'flex', minWidth: LABEL_W + weeks.length * DAY_W }}>

              {/* Label column header */}
              <div style={{
                width: LABEL_W,
                flexShrink: 0,
                borderRight: '1px solid var(--n-100)',
                background: 'var(--n-25)',
                padding: '6px 12px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--n-500)',
                borderBottom: '1px solid var(--n-100)',
                height: ROW_H,
                display: 'flex',
                alignItems: 'center',
              }}>
                ACTIVIDAD
              </div>

              {/* Week headers */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--n-100)' }}>
                {weeks.map(w => (
                  <div
                    key={w}
                    style={{
                      width: DAY_W,
                      flexShrink: 0,
                      height: ROW_H,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9.5,
                      fontWeight: w % 4 === 0 ? 700 : 400,
                      color: w % 4 === 0 ? 'var(--n-700)' : 'var(--n-400)',
                      borderRight: w % 4 === 0 ? '1px solid var(--n-150)' : '1px solid var(--n-100)',
                      background: w % 4 === 0 ? 'var(--n-50)' : 'var(--n-25)',
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {sorted.length === 0 && (
              <div style={{ display: 'flex', borderBottom: '1px solid var(--n-100)' }}>
                <div style={{ width: LABEL_W, flexShrink: 0, padding: '10px 12px', fontSize: 12, color: 'var(--n-400)', borderRight: '1px solid var(--n-100)' }}>
                  Sin actividades
                </div>
                <div style={{ flex: 1, background: 'var(--n-25)' }} />
              </div>
            )}

            {sorted.map((item, idx) => {
              const config = TIPO_COLOR[item.tipo] ?? TIPO_COLOR.tarea
              const isHito = item.tipo === 'hito'
              const duracion = Math.max(item.semana_fin - item.semana_inicio + 1, 1)
              const leftOffset = (item.semana_inicio - 1) * DAY_W
              const barWidth = isHito ? DAY_W : duracion * DAY_W

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--n-100)',
                    background: idx % 2 === 0 ? '#fff' : 'var(--n-25)',
                    minHeight: ROW_H,
                  }}
                >
                  {/* Label */}
                  <div style={{
                    width: LABEL_W,
                    flexShrink: 0,
                    borderRight: '1px solid var(--n-100)',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 10,
                      background: config.bar,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {item.item}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--n-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.descripcion}
                    </span>
                  </div>

                  {/* Gantt area */}
                  <div style={{ flex: 1, position: 'relative', height: ROW_H }}>
                    {/* Week grid lines */}
                    {weeks.map(w => (
                      <div
                        key={w}
                        style={{
                          position: 'absolute',
                          left: (w - 1) * DAY_W,
                          top: 0,
                          width: DAY_W,
                          height: '100%',
                          borderRight: w % 4 === 0 ? '1px solid var(--n-150)' : '1px solid var(--n-100)',
                        }}
                      />
                    ))}

                    {/* Bar */}
                    {isHito ? (
                      <div style={{
                        position: 'absolute',
                        left: leftOffset + DAY_W / 2 - 8,
                        top: ROW_H / 2 - 8,
                        width: 16,
                        height: 16,
                        background: config.bar,
                        transform: 'rotate(45deg)',
                        borderRadius: 2,
                        zIndex: 2,
                      }} />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        left: leftOffset,
                        top: ROW_H / 2 - 10,
                        width: barWidth,
                        height: 20,
                        background: config.bar,
                        borderRadius: 4,
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 6,
                        overflow: 'hidden',
                        opacity: 0.85,
                      }}>
                        <span style={{ fontSize: 9.5, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {duracion}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Editable table ────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-800)', margin: 0 }}>Actividades</h3>
          <button
            onClick={() => { setAdding(true); setNewItem(EMPTY_NEW()) }}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--brand-600)',
              color: '#fff',
            }}
          >
            <Plus size={12} /> Agregar actividad
          </button>
        </div>

        <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--n-25)' }}>
                <th style={th}>Item</th>
                <th style={{ ...th, minWidth: 220 }}>Descripción</th>
                <th style={th}>Tipo</th>
                <th style={{ ...th, textAlign: 'right' }}>S. Inicio</th>
                <th style={{ ...th, textAlign: 'right' }}>S. Fin</th>
                <th style={{ ...th, textAlign: 'right' }}>Duración</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const config = TIPO_COLOR[item.tipo] ?? TIPO_COLOR.tarea
                const duracion = Math.max(item.semana_fin - item.semana_inicio + 1, 0)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--n-100)' }}>
                    <td style={td}>
                      <NumInput value={item.item} onChange={v => handleField(item.id, 'item', v)} width={50} />
                    </td>
                    <td style={td}>
                      <input
                        value={item.descripcion}
                        onChange={e => handleField(item.id, 'descripcion', e.target.value)}
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
                      <select
                        value={item.tipo}
                        onChange={e => handleField(item.id, 'tipo', e.target.value as CronogramaTipo)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 20,
                          border: 'none',
                          background: config.bar,
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {(Object.keys(TIPO_COLOR) as CronogramaTipo[]).map(t => (
                          <option key={t} value={t}>{TIPO_COLOR[t].label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <NumInput value={item.semana_inicio} onChange={v => handleField(item.id, 'semana_inicio', v)} />
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <NumInput value={item.semana_fin} onChange={v => handleField(item.id, 'semana_fin', Math.max(v, item.semana_inicio))} />
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>
                      {duracion} sem.
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => deleteItem(item.id)}
                        style={{ padding: '3px 5px', borderRadius: 5, border: '1px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-500)', cursor: 'pointer', display: 'flex' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* New row */}
              {adding && (
                <tr style={{ background: 'var(--green-50)', borderBottom: '1px solid var(--n-100)' }}>
                  <td style={td}>
                    <span style={{ fontSize: 11.5, color: 'var(--n-400)', padding: '0 6px' }}>{items.length + 1}</span>
                  </td>
                  <td style={td}>
                    <input
                      autoFocus
                      value={newItem.descripcion}
                      onChange={e => setNewItem(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Descripción de la actividad…"
                      style={{ width: '100%', minWidth: 180, height: 26, padding: '0 6px', borderRadius: 5, border: '1px solid var(--n-200)', fontSize: 12.5, background: 'var(--n-0)' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setAdding(false) }}
                    />
                  </td>
                  <td style={td}>
                    <select
                      value={newItem.tipo}
                      onChange={e => setNewItem(p => ({ ...p, tipo: e.target.value as CronogramaTipo }))}
                      style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', cursor: 'pointer' }}
                    >
                      {(Object.keys(TIPO_COLOR) as CronogramaTipo[]).map(t => (
                        <option key={t} value={t}>{TIPO_COLOR[t].label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <NumInput value={newItem.semana_inicio} onChange={v => setNewItem(p => ({ ...p, semana_inicio: v }))} />
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <NumInput value={newItem.semana_fin} onChange={v => setNewItem(p => ({ ...p, semana_fin: Math.max(v, newItem.semana_inicio) }))} />
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontSize: 12, color: 'var(--n-400)' }}>
                    {Math.max(newItem.semana_fin - newItem.semana_inicio + 1, 0)} sem.
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={handleSave} style={{ padding: '3px 5px', borderRadius: 5, border: 'none', background: 'var(--green-fill)', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                        <Check size={11} />
                      </button>
                      <button onClick={() => setAdding(false)} style={{ padding: '3px 5px', borderRadius: 5, border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-500)', cursor: 'pointer', fontSize: 12 }}>
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {sorted.length === 0 && !adding && (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
                    Sin actividades.{' '}
                    <button
                      onClick={() => { setAdding(true); setNewItem(EMPTY_NEW()) }}
                      style={{ background: 'none', border: 'none', color: 'var(--brand-700)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Agregar primera actividad
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {(Object.keys(TIPO_COLOR) as CronogramaTipo[]).map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--n-600)' }}>
              <div style={{ width: 14, height: 14, borderRadius: t === 'hito' ? 2 : 3, background: TIPO_COLOR[t].bar, transform: t === 'hito' ? 'rotate(45deg)' : undefined }} />
              {TIPO_COLOR[t].label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
