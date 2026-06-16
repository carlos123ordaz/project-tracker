import { useState } from 'react'
import { Printer, Download, Loader2 } from 'lucide-react'
import type {
  Cotizacion,
  CotizacionDisciplina,
  CotizacionSeccion,
  CotizacionPartida,
  PersonalTarifa,
} from '../../../lib/types'
import { calcPrecioVenta } from '../../../hooks/useCotizacionEditor'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Props {
  cotizacion: Cotizacion
  disciplinas: CotizacionDisciplina[]
  secciones: CotizacionSeccion[]
  partidas: CotizacionPartida[]
  tarifas: PersonalTarifa[]
  calcCostoDirecto: (disc: CotizacionDisciplina) => number
  totalGG: number
  updateCotizacion: (updates: Partial<Cotizacion>) => void
}

const GG_MARGEN_PCT = 10
const GG_IMPREVISTOS_PCT = 2

const fmtUSD = (v: number) =>
  `$ ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const th: React.CSSProperties = {
  padding: '9px 14px',
  textAlign: 'left',
  fontSize: 11.5,
  fontWeight: 700,
  color: 'var(--n-700)',
  borderBottom: '2px solid var(--n-150)',
  background: 'var(--n-50)',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '9px 14px',
  fontSize: 12.5,
  borderBottom: '1px solid var(--n-100)',
  color: 'var(--n-800)',
  verticalAlign: 'middle',
}

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #cotizacion-cliente-print, #cotizacion-cliente-print * { visibility: visible !important; }
  #cotizacion-cliente-print { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
`

export default function ResumenClienteTab({
  cotizacion,
  disciplinas,
  calcCostoDirecto,
  totalGG,
  updateCotizacion,
}: Props) {
  const [formaPago, setFormaPago] = useState(cotizacion.notas ?? '')
  const [generandoPDF, setGenerandoPDF] = useState(false)

  const sorted = [...disciplinas].sort((a, b) => a.orden - b.orden)

  function getPrecioVentaDisc(disc: CotizacionDisciplina): number {
    const cd = calcCostoDirecto(disc)
    return calcPrecioVenta(cd, disc.imprevistos_pct, disc.margen_pct)
  }

  const precioGG = (() => {
    const costoFinal = totalGG * (1 + GG_IMPREVISTOS_PCT / 100)
    const divisor = 1 - GG_MARGEN_PCT / 100
    return divisor > 0 ? costoFinal / divisor : costoFinal
  })()

  const subtotalDiscs = sorted.reduce((s, d) => s + getPrecioVentaDisc(d), 0)
  const costoTotalSinIGV = subtotalDiscs + precioGG
  const igv = costoTotalSinIGV * 0.18
  const totalConIGV = costoTotalSinIGV * 1.18

  const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

  function handleFormaPagoBlur() {
    updateCotizacion({ notas: formaPago || null })
  }

  async function handleDescargarPDF() {
    setGenerandoPDF(true)
    try {
      const payload = {
        numero: String(cotizacion.numero).padStart(3, '0'),
        titulo: cotizacion.titulo,
        cliente: cotizacion.cliente,
        proyecto: cotizacion.proyecto,
        ubicacion: cotizacion.ubicacion,
        descripcion: cotizacion.descripcion,
        tipo_cambio: cotizacion.tipo_cambio,
        plazo_semanas: cotizacion.plazo_semanas,
        garantia_meses: cotizacion.garantia_meses,
        validez_dias: cotizacion.validez_dias,
        forma_pago: formaPago || null,
        disciplinas: sorted.map(d => ({
          nombre: d.nombre,
          precio_venta: getPrecioVentaDisc(d),
        })),
        precio_gg: precioGG,
      }
      const res = await fetch(`${API_BASE}/cotizaciones/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Error generando PDF: ${err.detail ?? res.statusText}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `COT-${String(cotizacion.numero).padStart(3, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`Error de red: ${e}`)
    } finally {
      setGenerandoPDF(false)
    }
  }

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
        {/* Action buttons */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--n-200)', background: '#fff',
              color: 'var(--n-600)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Printer size={13} /> Imprimir
          </button>
          <button
            onClick={handleDescargarPDF}
            disabled={generandoPDF}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8,
              border: 'none', background: 'var(--brand-600)',
              color: '#fff', fontSize: 12.5, fontWeight: 700,
              cursor: generandoPDF ? 'not-allowed' : 'pointer',
              opacity: generandoPDF ? 0.7 : 1,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {generandoPDF
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</>
              : <><Download size={13} /> Descargar PDF</>
            }
          </button>
        </div>

        {/* Printable area */}
        <div id="cotizacion-cliente-print" style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>

          {/* Letterhead */}
          <div style={{
            background: 'var(--n-900)',
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>
                CORSUSA INTERNATIONAL
              </div>
              <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 2, letterSpacing: '0.08em' }}>
                INGENIERÍA · AUTOMATIZACIÓN · SUMINISTROS
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--n-400)' }}>COTIZACIÓN</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                COT-{String(cotizacion.numero).padStart(3, '0')}
              </div>
            </div>
          </div>

          {/* Title */}
          <div style={{
            background: 'var(--brand-600)',
            padding: '12px 28px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              RESUMEN DE INSTALACIÓN
            </span>
          </div>

          {/* Header fields */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--n-150)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px 24px',
            }}>
              <FieldRow label="Nombre del Postor" value="CORSUSA INTERNATIONAL S.A.C." />
              <FieldRow label="Fecha" value={today} />
              <FieldRow label="Proyecto" value={cotizacion.proyecto ?? '—'} />
              <FieldRow label="Ubicación" value={cotizacion.ubicacion ?? '—'} />
              {cotizacion.descripcion && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <FieldRow label="Descripción" value={cotizacion.descripcion} />
                </div>
              )}
            </div>
          </div>

          {/* Price table */}
          <div style={{ padding: '20px 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...th, minWidth: 50, borderRadius: '6px 0 0 0' }}>ITEM</th>
                  <th style={{ ...th, minWidth: 200 }}>DESCRIPCIÓN</th>
                  <th style={{ ...th, textAlign: 'center' }}>UND</th>
                  <th style={{ ...th, textAlign: 'center' }}>CANTIDAD</th>
                  <th style={{ ...th, textAlign: 'right' }}>P.V. UNITARIO</th>
                  <th style={{ ...th, textAlign: 'right', borderRadius: '0 6px 0 0', background: 'var(--brand-50)', color: 'var(--brand-800)' }}>PRECIO TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((disc, i) => {
                  const pv = getPrecioVentaDisc(disc)
                  return (
                    <tr key={disc.id}>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--n-600)' }}>{i + 1}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{disc.nombre}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--n-500)' }}>GLB</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--n-500)' }}>1</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtUSD(pv)}</td>
                      <td style={{ ...td, textAlign: 'right', background: 'var(--brand-50)', fontWeight: 700, color: 'var(--brand-800)' }}>{fmtUSD(pv)}</td>
                    </tr>
                  )
                })}

                {/* GG row */}
                {totalGG > 0 && (
                  <tr>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--n-600)' }}>{sorted.length + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>Gastos Generales</td>
                    <td style={{ ...td, textAlign: 'center', color: 'var(--n-500)' }}>GLB</td>
                    <td style={{ ...td, textAlign: 'center', color: 'var(--n-500)' }}>1</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmtUSD(precioGG)}</td>
                    <td style={{ ...td, textAlign: 'right', background: 'var(--brand-50)', fontWeight: 700, color: 'var(--brand-800)' }}>{fmtUSD(precioGG)}</td>
                  </tr>
                )}

                {/* Total row */}
                <tr style={{ background: 'var(--n-900)' }}>
                  <td colSpan={5} style={{ ...td, color: '#fff', fontWeight: 800, textAlign: 'right', fontSize: 13, borderBottom: 'none' }}>
                    COSTO DIRECTO SIN IGV
                  </td>
                  <td style={{ ...td, textAlign: 'right', background: 'var(--brand-800)', color: '#fff', fontWeight: 900, fontSize: 15, borderBottom: 'none' }}>
                    {fmtUSD(costoTotalSinIGV)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* IGV summary */}
          <div style={{ padding: '0 28px 20px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--n-600)' }}>
                <span>Sub Total</span>
                <span>{fmtUSD(costoTotalSinIGV)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--n-600)' }}>
                <span>IGV (18%)</span>
                <span>{fmtUSD(igv)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--n-900)',
                borderTop: '2px solid var(--n-900)',
                paddingTop: 8,
                marginTop: 4,
              }}>
                <span>TOTAL CON IGV</span>
                <span style={{ color: 'var(--brand-700)' }}>{fmtUSD(totalConIGV)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--n-500)', textAlign: 'right' }}>
                S/. {(totalConIGV * cotizacion.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 0 })} (TC {cotizacion.tipo_cambio})
              </div>
            </div>
          </div>

          {/* Condiciones comerciales */}
          <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--n-700)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Condiciones Comerciales
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
              <FieldRow label="Plazo de Entrega" value={cotizacion.plazo_semanas ? `${cotizacion.plazo_semanas} Semanas` : 'Por definir'} />
              <FieldRow label="Garantía" value={`${cotizacion.garantia_meses} Mes${cotizacion.garantia_meses !== 1 ? 'es' : ''}`} />
              <FieldRow label="Validez de la Oferta" value={`${cotizacion.validez_dias} Días`} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--n-500)', fontWeight: 600, marginBottom: 4 }}>Forma de Pago</div>
                <textarea
                  className="no-print"
                  value={formaPago}
                  onChange={e => setFormaPago(e.target.value)}
                  onBlur={handleFormaPagoBlur}
                  placeholder="Ej: 50% adelanto, 50% contra entrega…"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--n-200)',
                    fontSize: 12,
                    color: 'var(--n-800)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    background: '#fff',
                  }}
                />
                {/* Print version (static text) */}
                <div style={{ display: 'none', fontSize: 12.5, color: 'var(--n-800)' }} className="print-only">
                  {formaPago || 'Por coordinar'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--n-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--n-800)', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  )
}
