import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Printer } from 'lucide-react'
import { useValuations, useValuationItems } from '../../hooks/useValuations'
import { useProjects } from '../../hooks/useProjects'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Button } from '../../components/ui/Button'
import { VALUATION_STATUSES, type ValuationStatus, type ValuationItem } from '../../lib/types'

// ── Utilidades ────────────────────────────────────────────────

let _localId = 0
const newLocalId = () => `__new_${++_localId}`

function n(v: unknown): number { return Number(v) || 0 }
function fmt(v: number, dec = 2) { return v.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) }
function fmtS(v: number) { return `S/ ${fmt(v)}` }

const STATUS_COLORS: Record<ValuationStatus, { bg: string; color: string }> = {
  'Borrador': { bg: 'var(--n-100)',   color: 'var(--n-600)'   },
  'Enviada':  { bg: 'var(--blue-50)', color: 'var(--blue-700)' },
  'Aprobada': { bg: 'var(--green-50)',color: 'var(--green-700)'},
  'Pagada':   { bg: '#f0fdfa',        color: '#0d9488'         },
}

// ── Tipos locales ─────────────────────────────────────────────

type DraftItem = {
  _id: string          // react key (db id or temp)
  dbId?: string        // si ya existe en DB
  code: string
  description: string
  unit: string
  unit_price: number
  quantity_contract: number
  quantity_previous: number
  quantity_current: number
}

function itemFromDb(it: ValuationItem): DraftItem {
  return {
    _id: it.id, dbId: it.id,
    code: it.code, description: it.description, unit: it.unit,
    unit_price: it.unit_price,
    quantity_contract: it.quantity_contract,
    quantity_previous: it.quantity_previous,
    quantity_current: it.quantity_current,
  }
}

function emptyItem(): DraftItem {
  return {
    _id: newLocalId(), dbId: undefined,
    code: '', description: '', unit: 'und',
    unit_price: 0, quantity_contract: 0, quantity_previous: 0, quantity_current: 0,
  }
}

// ── Inputs de celda ───────────────────────────────────────────

const CELL_INPUT: React.CSSProperties = {
  width: '100%', height: 30, padding: '0 6px', fontSize: 12,
  border: '1px solid transparent', borderRadius: 4, background: 'transparent',
  color: 'var(--n-900)', outline: 'none', fontFamily: 'inherit',
}

function CellText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={CELL_INPUT}
      onFocus={e => { e.currentTarget.style.border = '1px solid var(--brand-400)'; e.currentTarget.style.background = 'var(--brand-50)' }}
      onBlur={e =>  { e.currentTarget.style.border = '1px solid transparent';      e.currentTarget.style.background = 'transparent' }}
    />
  )
}

function CellNum({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number" step="any" value={value || ''} onChange={e => onChange(n(e.target.value))}
      style={{ ...CELL_INPUT, textAlign: 'right' }}
      onFocus={e => { e.currentTarget.style.border = '1px solid var(--brand-400)'; e.currentTarget.style.background = 'var(--brand-50)' }}
      onBlur={e =>  { e.currentTarget.style.border = '1px solid transparent';      e.currentTarget.style.background = 'transparent' }}
    />
  )
}

// ── Página principal ──────────────────────────────────────────

export default function ValuationEditorPage() {
  const { id: projectId, vid } = useParams<{ id: string; vid: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { projects } = useProjects()
  const { valuations, update: updateValuation } = useValuations(projectId!)
  const { items: dbItems, loading: itemsLoading, saveAll } = useValuationItems(vid ?? null)

  const project    = projects.find(p => p.id === projectId)
  const valuation  = valuations.find(v => v.id === vid)

  // ── Meta form state ──
  const [meta, setMeta] = useState({
    title: '', period_start: '', period_end: '',
    status: 'Borrador' as ValuationStatus,
    contract_amount: 0, advance_pct: 0, retention_pct: 5, igv_rate: 18, notes: '',
  })

  useEffect(() => {
    if (valuation) {
      setMeta({
        title:           valuation.title ?? '',
        period_start:    valuation.period_start,
        period_end:      valuation.period_end,
        status:          valuation.status,
        contract_amount: valuation.contract_amount,
        advance_pct:     valuation.advance_pct,
        retention_pct:   valuation.retention_pct,
        igv_rate:        valuation.igv_rate,
        notes:           valuation.notes ?? '',
      })
    }
  }, [valuation])

  // ── Items draft state ──
  const [items, setItems] = useState<DraftItem[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!itemsLoading) {
      setItems(dbItems.length > 0 ? dbItems.map(itemFromDb) : [emptyItem()])
      setDirty(false)
    }
  }, [dbItems, itemsLoading])

  const setMF = (k: keyof typeof meta, v: unknown) => {
    setMeta(p => ({ ...p, [k]: v }))
    setDirty(true)
  }

  const updateItem = useCallback((id: string, field: keyof DraftItem, value: unknown) => {
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: value } : it))
    setDirty(true)
  }, [])

  const addItem = () => {
    setItems(prev => [...prev, emptyItem()])
    setDirty(true)
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it._id !== id))
    setDirty(true)
  }

  // ── Totales computados ──
  const summary = useMemo(() => {
    const monto_bruto = items.reduce((s, it) => s + n(it.quantity_current) * n(it.unit_price), 0)
    const ded_adelanto  = monto_bruto * (n(meta.advance_pct) / 100)
    const ded_retencion = monto_bruto * (n(meta.retention_pct) / 100)
    const base_igv      = monto_bruto - ded_adelanto - ded_retencion
    const igv           = base_igv * (n(meta.igv_rate) / 100)
    const total_neto    = base_igv + igv

    const monto_contrato  = items.reduce((s, it) => s + n(it.quantity_contract) * n(it.unit_price), 0)
    const monto_anterior  = items.reduce((s, it) => s + n(it.quantity_previous) * n(it.unit_price), 0)
    const monto_acumulado = items.reduce((s, it) => s + (n(it.quantity_previous) + n(it.quantity_current)) * n(it.unit_price), 0)
    const pct_avance      = monto_contrato > 0 ? (monto_acumulado / monto_contrato) * 100 : 0

    return { monto_bruto, ded_adelanto, ded_retencion, base_igv, igv, total_neto, monto_contrato, monto_anterior, monto_acumulado, pct_avance }
  }, [items, meta])

  // ── Guardar ──
  const handleSave = async () => {
    if (!vid || !valuation) return
    setSaving(true)
    try {
      await updateValuation(vid, {
        title:           meta.title || null,
        period_start:    meta.period_start,
        period_end:      meta.period_end,
        status:          meta.status,
        contract_amount: summary.monto_contrato > 0 ? summary.monto_contrato : n(meta.contract_amount),
        advance_pct:     n(meta.advance_pct),
        retention_pct:   n(meta.retention_pct),
        igv_rate:        n(meta.igv_rate),
        notes:           meta.notes || null,
      })

      const validItems = items.filter(it => it.description.trim() || it.unit_price > 0 || it.quantity_current > 0)
      await saveAll(vid, validItems.map(it => ({
        ...(it.dbId ? { id: it.dbId } : {}),
        code: it.code,
        description: it.description,
        unit: it.unit,
        unit_price: n(it.unit_price),
        quantity_contract: n(it.quantity_contract),
        quantity_previous: n(it.quantity_previous),
        quantity_current: n(it.quantity_current),
      })))

      setDirty(false)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => window.print()

  if (!valuation && valuations.length > 0) {
    return <div style={{ padding: 32, color: 'var(--n-500)' }}>Valorización no encontrada.</div>
  }

  const statusStyle = STATUS_COLORS[meta.status]
  const INPUT: React.CSSProperties = {
    height: 34, padding: '0 10px', fontSize: 12.5, borderRadius: 7,
    border: '1px solid var(--n-200)', background: 'var(--n-0)',
    color: 'var(--n-800)', outline: 'none', width: '100%',
  }
  const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }

  // ── Render ──
  return (
    <div style={{ padding: isMobile ? '16px' : '20px 28px 60px', maxWidth: 1400 }}>

      {/* ── Sticky header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => navigate(`/projects/${projectId}/valuations`)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--n-600)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> Valorizaciones
        </button>
        <span style={{ color: 'var(--n-300)' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)' }}>
          Valorización N°{valuation?.number}
          {meta.title && <span style={{ fontWeight: 400, color: 'var(--n-500)', marginLeft: 6 }}>— {meta.title}</span>}
        </span>
        <span style={{ padding: '2px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>
          {meta.status}
        </span>
        <div style={{ flex: 1 }} />
        <Button icon={Printer} onClick={handlePrint}>Imprimir</Button>
        <Button icon={Save} variant="primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? 'Guardando...' : dirty ? 'Guardar cambios' : 'Guardado'}
        </Button>
      </div>

      {/* ── Meta form ── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <span style={LABEL}>Título</span>
            <input value={meta.title} onChange={e => setMF('title', e.target.value)} style={INPUT} placeholder={`Valorización N°${valuation?.number}`} />
          </div>
          <div>
            <span style={LABEL}>Período inicio</span>
            <input type="date" value={meta.period_start} onChange={e => setMF('period_start', e.target.value)} style={INPUT} />
          </div>
          <div>
            <span style={LABEL}>Período fin</span>
            <input type="date" value={meta.period_end} onChange={e => setMF('period_end', e.target.value)} style={INPUT} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <span style={LABEL}>Estado</span>
            <select value={meta.status} onChange={e => setMF('status', e.target.value as ValuationStatus)} style={{ ...INPUT, cursor: 'pointer' }}>
              {VALUATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <span style={LABEL}>% Adelanto</span>
            <input type="number" min={0} max={100} step={0.01} value={meta.advance_pct} onChange={e => setMF('advance_pct', n(e.target.value))} style={{ ...INPUT, textAlign: 'right' }} />
          </div>
          <div>
            <span style={LABEL}>% Retención</span>
            <input type="number" min={0} max={100} step={0.01} value={meta.retention_pct} onChange={e => setMF('retention_pct', n(e.target.value))} style={{ ...INPUT, textAlign: 'right' }} />
          </div>
          <div>
            <span style={LABEL}>% IGV</span>
            <input type="number" min={0} max={100} step={0.01} value={meta.igv_rate} onChange={e => setMF('igv_rate', n(e.target.value))} style={{ ...INPUT, textAlign: 'right' }} />
          </div>
        </div>
        <div>
          <span style={LABEL}>Notas / Observaciones</span>
          <textarea value={meta.notes} onChange={e => setMF('notes', e.target.value)} rows={2}
            style={{ ...INPUT, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
            placeholder="Alcance, condiciones especiales, etc." />
        </div>
      </div>

      {/* ── Layout: tabla + resumen ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* ── Tabla de partidas ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px 10px', borderBottom: '1px solid var(--n-150)', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
              Partidas
            </span>
            <button
              onClick={addItem}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--brand-300)', background: 'var(--brand-50)', color: 'var(--brand-700)', cursor: 'pointer' }}
            >
              <Plus size={13} /> Agregar partida
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1000 }}>
              <thead>
                <tr style={{ background: 'var(--n-25)' }}>
                  {/* Group headers */}
                </tr>
                <tr style={{ borderBottom: '1px solid var(--n-200)', background: 'var(--n-25)' }}>
                  <th style={TH('')}>Código</th>
                  <th style={TH('', 220)}>Descripción</th>
                  <th style={TH('')}>Und</th>
                  <th style={TH('right')}>P.U.</th>
                  <th style={{ ...TH('right'), borderLeft: '2px solid var(--n-200)' }}>Met. Cont.</th>
                  <th style={TH('right')}>Mt. Cont.</th>
                  <th style={{ ...TH('right'), borderLeft: '2px solid var(--n-200)' }}>Met. Ant.</th>
                  <th style={TH('right')}>Mt. Ant.</th>
                  <th style={{ ...TH('right'), borderLeft: '2px solid var(--brand-200)' }}>Met. Pres.</th>
                  <th style={{ ...TH('right'), background: 'var(--brand-25, #eef2ff)' }}>Mt. Pres.</th>
                  <th style={{ ...TH('right'), borderLeft: '2px solid var(--n-200)' }}>Mt. Acum.</th>
                  <th style={TH('center')}>% Av.</th>
                  <th style={TH('')} />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const mtCont  = n(it.quantity_contract) * n(it.unit_price)
                  const mtAnt   = n(it.quantity_previous) * n(it.unit_price)
                  const mtPres  = n(it.quantity_current)  * n(it.unit_price)
                  const mtAcum  = mtAnt + mtPres
                  const pctAv   = mtCont > 0 ? ((n(it.quantity_previous) + n(it.quantity_current)) / n(it.quantity_contract)) * 100 : null
                  return (
                    <tr key={it._id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--n-100)', background: i % 2 === 0 ? 'var(--n-0)' : 'var(--n-25)' }}>
                      <td style={TD()}>
                        <CellText value={it.code} onChange={v => updateItem(it._id, 'code', v)} placeholder="01.01" />
                      </td>
                      <td style={TD()}>
                        <CellText value={it.description} onChange={v => updateItem(it._id, 'description', v)} placeholder="Descripción de la partida" />
                      </td>
                      <td style={TD()}>
                        <CellText value={it.unit} onChange={v => updateItem(it._id, 'unit', v)} placeholder="und" />
                      </td>
                      <td style={TD('right')}>
                        <CellNum value={it.unit_price} onChange={v => updateItem(it._id, 'unit_price', v)} />
                      </td>
                      <td style={{ ...TD('right'), borderLeft: '2px solid var(--n-200)' }}>
                        <CellNum value={it.quantity_contract} onChange={v => updateItem(it._id, 'quantity_contract', v)} />
                      </td>
                      <td style={{ ...TD('right'), color: 'var(--n-500)', fontSize: 11.5 }}>{fmt(mtCont)}</td>
                      <td style={{ ...TD('right'), borderLeft: '2px solid var(--n-200)' }}>
                        <CellNum value={it.quantity_previous} onChange={v => updateItem(it._id, 'quantity_previous', v)} />
                      </td>
                      <td style={{ ...TD('right'), color: 'var(--n-500)', fontSize: 11.5 }}>{fmt(mtAnt)}</td>
                      <td style={{ ...TD('right'), borderLeft: '2px solid var(--brand-200)' }}>
                        <CellNum value={it.quantity_current} onChange={v => updateItem(it._id, 'quantity_current', v)} />
                      </td>
                      <td style={{ ...TD('right'), fontWeight: 600, color: 'var(--brand-700)', background: 'var(--brand-25, #eef2ff)' }}>
                        {fmt(mtPres)}
                      </td>
                      <td style={{ ...TD('right'), borderLeft: '2px solid var(--n-200)', fontWeight: 600 }}>
                        {fmt(mtAcum)}
                      </td>
                      <td style={{ ...TD('center') }}>
                        {pctAv !== null ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: pctAv >= 100 ? '#16a34a' : 'var(--n-700)', padding: '1px 5px', borderRadius: 4, background: pctAv >= 100 ? 'var(--green-50)' : 'transparent' }}>
                            {pctAv.toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td style={TD()}>
                        <button
                          onClick={() => removeItem(it._id)}
                          style={{ padding: '3px 6px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                          title="Eliminar partida"
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-50)'; e.currentTarget.style.color = 'var(--red-600)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--n-400)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {/* Fila de totales */}
                <tr style={{ borderTop: '2px solid var(--n-200)', background: 'var(--n-50)', fontWeight: 700 }}>
                  <td colSpan={4} style={{ ...TD(), fontSize: 11.5, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL</td>
                  <td style={{ ...TD('right'), borderLeft: '2px solid var(--n-200)' }} />
                  <td style={{ ...TD('right'), fontSize: 12, color: 'var(--n-800)' }}>{fmt(summary.monto_contrato)}</td>
                  <td style={{ ...TD('right'), borderLeft: '2px solid var(--n-200)' }} />
                  <td style={{ ...TD('right'), fontSize: 12, color: 'var(--n-800)' }}>{fmt(summary.monto_anterior)}</td>
                  <td style={{ ...TD('right'), borderLeft: '2px solid var(--brand-200)' }} />
                  <td style={{ ...TD('right'), fontSize: 13, color: 'var(--brand-700)', background: 'var(--brand-25, #eef2ff)' }}>
                    {fmt(summary.monto_bruto)}
                  </td>
                  <td style={{ ...TD('right'), borderLeft: '2px solid var(--n-200)', fontSize: 12 }}>{fmt(summary.monto_acumulado)}</td>
                  <td style={{ ...TD('center'), fontSize: 12 }}>{summary.monto_contrato > 0 ? `${summary.pct_avance.toFixed(0)}%` : '—'}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Panel resumen ── */}
        <div style={{ position: isMobile ? 'static' : 'sticky', top: 80 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
              Resumen Valorización
            </div>

            <SumLine label="Monto Bruto" value={summary.monto_bruto} bold />
            <div style={{ height: 1, background: 'var(--n-150)', margin: '10px 0' }} />
            <SumLine label={`(-) Deducción Adelanto (${meta.advance_pct}%)`}  value={-summary.ded_adelanto} red />
            <SumLine label={`(-) Retención (${meta.retention_pct}%)`}         value={-summary.ded_retencion} red />
            <div style={{ height: 1, background: 'var(--n-150)', margin: '10px 0' }} />
            <SumLine label="Base Imponible" value={summary.base_igv} />
            <SumLine label={`(+) IGV (${meta.igv_rate}%)`} value={summary.igv} green />
            <div style={{ height: 2, background: 'var(--n-200)', margin: '12px 0' }} />
            <SumLine label="TOTAL NETO" value={summary.total_neto} big />

            <div style={{ marginTop: 16, padding: '12px', background: 'var(--n-50)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Acumulado del proyecto</div>
              <SumLineSmall label="Monto Contrato"  value={summary.monto_contrato} />
              <SumLineSmall label="Acumulado"       value={summary.monto_acumulado} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 11.5, color: 'var(--n-600)' }}>% Avance</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: summary.pct_avance >= 100 ? '#16a34a' : 'var(--brand-700)' }}>
                  {summary.monto_contrato > 0 ? `${summary.pct_avance.toFixed(1)}%` : '—'}
                </span>
              </div>
              {summary.monto_contrato > 0 && (
                <div style={{ marginTop: 4, height: 6, borderRadius: 999, background: 'var(--n-200)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, background: summary.pct_avance >= 100 ? '#16a34a' : 'var(--brand-500)', width: `${Math.min(100, summary.pct_avance)}%`, transition: 'width .4s' }} />
                </div>
              )}
            </div>
          </div>

          {/* Project info */}
          <div style={{ marginTop: 10, padding: '10px 14px', fontSize: 11.5, color: 'var(--n-500)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--n-700)' }}>{project?.name}</strong><br />
            {project?.focus_area} · {project?.initiative}
          </div>
        </div>
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #root > * { display: none !important; }
          .print-area { display: block !important; }
          /* Fallback: show the main content */
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, aside, .sidebar-nav, [class*="sidebar"] { display: none !important; }
          .page-content, [class*="page-content"] { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}

// ── Helpers de tabla ──────────────────────────────────────────

function TH(align: 'left' | 'right' | 'center' | '', minW?: number): React.CSSProperties {
  return {
    padding: '7px 8px', fontSize: 10, fontWeight: 700, color: 'var(--n-500)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    textAlign: (align || 'left') as any,
    background: 'var(--n-25)', borderBottom: '1px solid var(--n-200)',
    whiteSpace: 'nowrap', minWidth: minW,
  }
}

function TD(align: 'left' | 'right' | 'center' | '' = ''): React.CSSProperties {
  return {
    padding: '2px 4px', textAlign: (align || 'left') as any,
    verticalAlign: 'middle',
  }
}

// ── Líneas de resumen ─────────────────────────────────────────

function SumLine({ label, value, bold, big, red, green }: { label: string; value: number; bold?: boolean; big?: boolean; red?: boolean; green?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontSize: big ? 13 : 12, fontWeight: bold || big ? 700 : 400, color: 'var(--n-700)', flex: 1, paddingRight: 8 }}>{label}</span>
      <span style={{ fontSize: big ? 16 : 13, fontWeight: bold || big ? 700 : 500, color: big ? 'var(--n-900)' : red ? '#dc2626' : green ? '#16a34a' : 'var(--n-800)', fontFamily: 'monospace' }}>
        {value < 0 ? `(${fmtS(-value)})` : fmtS(value)}
      </span>
    </div>
  )
}

function SumLineSmall({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11.5, color: 'var(--n-600)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-800)', fontFamily: 'monospace' }}>{fmtS(value)}</span>
    </div>
  )
}
