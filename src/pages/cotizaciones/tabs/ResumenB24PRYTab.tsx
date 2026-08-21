import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type {
  Cotizacion,
  CotizacionPartida,
  PersonalTarifa,
} from '../../../lib/types'
import { calcularTarifa } from '../../../hooks/useCotizacionEditor'

// ── Hardcoded B24 PRY product catalogue (matches Excel master list) ───────────
const PIC_PRODUCTS = [
  'Proy.PIC.Consultoria.Gestion',
  'Proy.PIC.Consultoria.Mecanico',
  'Proy.PIC.Consultoria.Electrico',
  'Proy.PIC.Consultoria.Civil',
  'Proy.PIC.Consultoria.Instrumentacion',
  'Proy.PIC.Consultoria.Calidad',
  'Proy.PIC.Consultoria.Otros',
  'Proy.PIC.Material.Automatizacion',
  'Proy.PIC.Material.Electricidad',
  'Proy.PIC.Material.Neum',
  'Proy.PIC.Material.Mecánicos',
  'Proy.PIC.Material.Civil',
  'Proy.PIC.Material.Otros',
  'Proy.PIC.MObra.InstElec.AI',
  'Proy.PIC.MObra.InstElec.AU',
  'Proy.PIC.MObra.InstElec.VA',
  'Proy.PIC.MObra.InstElec.Otros',
  'Proy.PIC.MObra.InstMeca.AI',
  'Proy.PIC.MObra.InstMeca.AU',
  'Proy.PIC.MObra.InstMeca.VA',
  'Proy.PIC.MObra.InstMeca.Otros',
  'Proy.PIC.MObra.FabConst.Tks',
  'Proy.PIC.MObra.FabConst.Piping',
  'Proy.PIC.MObra.FabConst.EstrFija',
  'Proy.PIC.MObra.FabConst.Otros',
  'Proy.PIC.MObra.TksAlmac.General',
  'Proy.PIC.MObra.ObraCivil.General',
  'Proy.PIC.MObra.Skids.AU',
  'Proy.PIC.MObra.Skids.AI',
  'Proy.PIC.MObra.Skids.VA',
  'Proy.PIC.MObra.Skids.Otros',
  'Proy.PIC.MObraEspe.MontMaquinas',
  'Proy.PIC.MObraEspe.Rigging',
  'Proy.PIC.MObraEspe.Otros',
] as const

const PAU_PRODUCTS = [
  'Proy.PAU.Consultoria.Gestion',
  'Proy.PAU.Consultoria.Instrumentacion',
  'Proy.PAU.Consultoria.Automatizacion',
  'Proy.PAU.Consultoria.Electricidad',
  'Proy.PAU.Consultoria.Neumatica',
  'Proy.PAU.Consultoria.Calidad',
  'Proy.PAU.Consultoria.Otros',
  'Proy.PAU.Material.Automatizacion',
  'Proy.PAU.Material.Electricidad',
  'Proy.PAU.Material.Neumatica',
  'Proy.PAU.Material.Cables',
  'Proy.PAU.Material.Otros',
  'Proy.PAU.MObra.Programacion',
  'Proy.PAU.MObra.CommPEM',
  'Proy.PAU.MObra.PostVenta',
  'Proy.PAU.MObra.Mantto',
  'Proy.PAU.MObra.ArmaTablero.Elec',
  'Proy.PAU.MObra.ArmaTablero.Neum',
  'Proy.PAU.MObra.Otros',
  'Proy.PAU.Wireless',
  'Proy.PAU.ControlVelocyMovim',
  'Proy.PAU.SoftwareCapa3',
  'Proy.PAU.OtrosProd.Robotica',
  'Proy.PAU.OtrosProd.Gemelos',
  'Proy.PAU.OtrosProd.RealidadAumen',
  'Proy.PAU.OtrosProd.GestionActivos',
  'Proy.PAU.OtrosProd.Otros',
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtUSD = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function getPrecioParcial(p: CotizacionPartida, tarifas: PersonalTarifa[], segmento: string, tc: number): number {
  if (p.tipo === 'mo') {
    const metrado = p.personas * p.dias
    if (p.perfil_id) {
      const perfil = tarifas.find(t => t.id === p.perfil_id)
      if (perfil) return metrado * calcularTarifa(perfil, segmento as import('../../../lib/types').CotizacionSegmento, tc)
    }
    return metrado * p.precio_unitario
  }
  return p.metrado * p.precio_unitario
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  cotizacion: Cotizacion
  partidas: CotizacionPartida[]
  tarifas: PersonalTarifa[]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ResumenB24PRYTab({ cotizacion, partidas, tarifas }: Props) {
  const [soloConValores, setSoloConValores] = useState(false)
  const [copied, setCopied] = useState(false)

  // Aggregate costs per producto_bitrix
  const costoMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of partidas) {
      if (!p.producto_bitrix) continue
      const costo = getPrecioParcial(p, tarifas, cotizacion.segmento, cotizacion.tipo_cambio)
      map[p.producto_bitrix] = (map[p.producto_bitrix] ?? 0) + costo
    }
    return map
  }, [partidas, tarifas, cotizacion.segmento, cotizacion.tipo_cambio])

  // Totals per department
  const totalPIC = PIC_PRODUCTS.reduce((s, name) => s + (costoMap[name] ?? 0), 0)
  const totalPAU = PAU_PRODUCTS.reduce((s, name) => s + (costoMap[name] ?? 0), 0)
  const grandTotal = totalPIC + totalPAU

  // Non-zero entries for the summary panel
  const nonZeroPIC = PIC_PRODUCTS.filter(n => (costoMap[n] ?? 0) > 0)
  const nonZeroPAU = PAU_PRODUCTS.filter(n => (costoMap[n] ?? 0) > 0)

  // Detect partidas with producto_bitrix NOT in the master list
  const unknownProducts = useMemo(() => {
    const known = new Set<string>([...PIC_PRODUCTS, ...PAU_PRODUCTS])
    const unknown: Record<string, number> = {}
    for (const p of partidas) {
      if (p.producto_bitrix && !known.has(p.producto_bitrix)) {
        const costo = getPrecioParcial(p, tarifas, cotizacion.segmento, cotizacion.tipo_cambio)
        unknown[p.producto_bitrix] = (unknown[p.producto_bitrix] ?? 0) + costo
      }
    }
    return unknown
  }, [partidas, tarifas, cotizacion.segmento, cotizacion.tipo_cambio])

  // Copy TSV for Bitrix24 import
  function handleCopy() {
    const lines: string[] = ['Departamento\tProducto B24\tCosto Total USD']
    for (const name of PIC_PRODUCTS) {
      const v = costoMap[name] ?? 0
      if (!soloConValores || v > 0) lines.push(`PIC\t${name}\t${v.toFixed(2)}`)
    }
    for (const name of PAU_PRODUCTS) {
      const v = costoMap[name] ?? 0
      if (!soloConValores || v > 0) lines.push(`PAU\t${name}\t${v.toFixed(2)}`)
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
      <div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
            Resumen B24 PRY
          </h2>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--brand-50)', color: 'var(--brand-700)', fontWeight: 600, border: '1px solid var(--brand-100)' }}>
            Bitrix24 · Proyectos
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--n-600)', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={soloConValores}
                onChange={e => setSoloConValores(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Solo con valores
            </label>

            {/* Copy TSV */}
            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)',
                cursor: 'pointer',
              }}
            >
              {copied ? <><Check size={12} style={{ color: 'var(--green-600)' }} /> Copiado</> : <><Copy size={12} /> Copiar TSV</>}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Main table */}
          <div style={{ flex: 1, background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--n-25)' }}>
                  <th style={thStyle}>Dpto.</th>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 280 }}>Producto B24</th>
                  <th style={{ ...thStyle, minWidth: 130 }}>Costo Total USD</th>
                  <th style={{ ...thStyle, minWidth: 70 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {/* PIC section header */}
                <DeptHeader label="PIC — Proyectos de Instrumentación y Control" total={totalPIC} grandTotal={grandTotal} />
                {PIC_PRODUCTS.map(name => {
                  const v = costoMap[name] ?? 0
                  if (soloConValores && v === 0) return null
                  return (
                    <ProductRow key={name} dept="PIC" name={name} value={v} grandTotal={grandTotal} />
                  )
                })}
                <SubtotalRow label="Subtotal PIC" total={totalPIC} />

                {/* PAU section header */}
                <DeptHeader label="PAU — Proyectos de Automatización" total={totalPAU} grandTotal={grandTotal} />
                {PAU_PRODUCTS.map(name => {
                  const v = costoMap[name] ?? 0
                  if (soloConValores && v === 0) return null
                  return (
                    <ProductRow key={name} dept="PAU" name={name} value={v} grandTotal={grandTotal} />
                  )
                })}
                <SubtotalRow label="Subtotal PAU" total={totalPAU} />

                {/* Unknown products */}
                {Object.keys(unknownProducts).length > 0 && (
                  <>
                    <DeptHeader label="Sin categoría (producto no reconocido)" total={Object.values(unknownProducts).reduce((a, b) => a + b, 0)} grandTotal={grandTotal} warn />
                    {Object.entries(unknownProducts).map(([name, v]) => (
                      <ProductRow key={name} dept="?" name={name} value={v} grandTotal={grandTotal} warn />
                    ))}
                  </>
                )}

                {/* Grand total */}
                <tr style={{ background: 'var(--inverted-bg)' }}>
                  <td colSpan={2} style={{ padding: '9px 12px', fontWeight: 700, color: '#fff', fontSize: 12 }}>
                    TOTAL GENERAL
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff', fontSize: 14 }}>
                    {fmtUSD(grandTotal)}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--n-300)', fontSize: 12 }}>
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary panel — non-zero only */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Summary cards */}
            <div style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand-700)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Resumen
              </div>
              <SummaryLine label="Total PIC" value={totalPIC} total={grandTotal} color="var(--brand-800)" />
              <SummaryLine label="Total PAU" value={totalPAU} total={grandTotal} color="var(--brand-800)" />
              <div style={{ borderTop: '1px solid var(--brand-200)', margin: '10px 0' }} />
              <div style={{ fontSize: 11, color: 'var(--brand-500)', marginBottom: 2 }}>TOTAL</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand-800)' }}>{fmtUSD(grandTotal)}</div>
              <div style={{ fontSize: 11, color: 'var(--brand-500)', marginTop: 2 }}>
                S/. {(grandTotal * cotizacion.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 0 })}
              </div>
            </div>

            {/* Non-zero pivot */}
            {(nonZeroPIC.length > 0 || nonZeroPAU.length > 0) && (
              <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', background: 'var(--n-25)', borderBottom: '1px solid var(--n-100)', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Pivot — solo con valores
                </div>
                <div style={{ padding: '8px 0' }}>
                  {nonZeroPIC.length > 0 && (
                    <>
                      <div style={{ padding: '4px 12px 2px', fontSize: 10, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase' }}>PIC</div>
                      {nonZeroPIC.map(name => (
                        <PivotRow key={name} name={name} value={costoMap[name] ?? 0} />
                      ))}
                    </>
                  )}
                  {nonZeroPAU.length > 0 && (
                    <>
                      <div style={{ padding: '8px 12px 2px', fontSize: 10, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase' }}>PAU</div>
                      {nonZeroPAU.map(name => (
                        <PivotRow key={name} name={name} value={costoMap[name] ?? 0} />
                      ))}
                    </>
                  )}
                  <div style={{ borderTop: '1px solid var(--n-100)', margin: '6px 0 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontWeight: 700, fontSize: 12 }}>
                    <span style={{ color: 'var(--n-700)' }}>Total</span>
                    <span style={{ color: 'var(--n-900)' }}>{fmtUSD(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {grandTotal === 0 && (
              <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: 'var(--amber-700)' }}>
                Sin costos asignados. Selecciona un <strong>Producto Bitrix</strong> en cada partida del tab Partidas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DeptHeader({ label, total, grandTotal, warn }: { label: string; total: number; grandTotal: number; warn?: boolean }) {
  const pct = grandTotal > 0 ? (total / grandTotal * 100).toFixed(1) : '0.0'
  return (
    <tr style={{ background: warn ? 'var(--amber-50)' : 'var(--n-50)' }}>
      <td colSpan={3} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: warn ? 'var(--amber-700)' : 'var(--n-600)', borderTop: '2px solid var(--n-150)', borderBottom: '1px solid var(--n-100)' }}>
        {label}
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: warn ? 'var(--amber-600)' : 'var(--n-500)', borderTop: '2px solid var(--n-150)', borderBottom: '1px solid var(--n-100)' }}>
        {total > 0 ? `${pct}%` : ''}
      </td>
    </tr>
  )
}

function ProductRow({ dept, name, value, grandTotal, warn }: { dept: string; name: string; value: number; grandTotal: number; warn?: boolean }) {
  const hasValue = value > 0
  const pct = grandTotal > 0 && hasValue ? (value / grandTotal * 100).toFixed(1) + '%' : ''
  return (
    <tr style={{ borderBottom: '1px solid var(--n-75, var(--n-100))', background: hasValue ? 'var(--green-50)' : undefined }}>
      <td style={{ padding: '5px 12px', color: warn ? 'var(--amber-600)' : 'var(--n-400)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {dept}
      </td>
      <td style={{ padding: '5px 12px', color: hasValue ? 'var(--n-800)' : 'var(--n-350, var(--n-300))', fontSize: 12 }}>
        {name}
      </td>
      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 12, fontWeight: hasValue ? 700 : 400, color: hasValue ? 'var(--green-700)' : 'var(--n-300)' }}>
        {hasValue ? fmtUSD(value) : '—'}
      </td>
      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--n-400)' }}>
        {pct}
      </td>
    </tr>
  )
}

function SubtotalRow({ label, total }: { label: string; total: number }) {
  return (
    <tr style={{ background: 'var(--n-50)', borderBottom: '2px solid var(--n-200)' }}>
      <td colSpan={2} style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 700, color: 'var(--n-600)' }}>
        {label}
      </td>
      <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: total > 0 ? 'var(--n-800)' : 'var(--n-300)' }}>
        {total > 0 ? fmtUSD(total) : '—'}
      </td>
      <td />
    </tr>
  )
}

function SummaryLine({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total * 100).toFixed(1) : '0.0'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value > 0 ? fmtUSD(value) : '—'}</span>
        {value > 0 && <span style={{ fontSize: 10.5, color: 'var(--brand-500)', marginLeft: 4 }}>{pct}%</span>}
      </div>
    </div>
  )
}

function PivotRow({ name, value }: { name: string; value: number }) {
  // Abbreviate the product name for display
  const short = name.replace(/^Proy\.(PIC|PAU)\./, '')
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 12px', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--n-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={name}>
        {short}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-800)', whiteSpace: 'nowrap' }}>
        {fmtUSD(value)}
      </span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'right',
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--n-500)',
  borderBottom: '2px solid var(--n-150)',
  whiteSpace: 'nowrap',
  background: 'var(--n-25)',
}
