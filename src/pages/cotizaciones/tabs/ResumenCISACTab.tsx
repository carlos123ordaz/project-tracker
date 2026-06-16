import { useMemo } from 'react'
import type {
  Cotizacion,
  CotizacionDisciplina,
  CotizacionSeccion,
  CotizacionPartida,
  PersonalTarifa,
} from '../../../lib/types'
interface Props {
  cotizacion: Cotizacion
  disciplinas: CotizacionDisciplina[]
  secciones: CotizacionSeccion[]
  partidas: CotizacionPartida[]
  tarifas: PersonalTarifa[]
  calcCostoDirecto: (disc: CotizacionDisciplina) => number
  totalGG: number
}

const fmtUSD = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v: number) =>
  `${v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

const GG_IMPREVISTOS_PCT = 2
const GG_MARGEN_PCT = 10

const th: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'right',
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--n-500)',
  borderBottom: '2px solid var(--n-150)',
  whiteSpace: 'nowrap',
  background: 'var(--n-25)',
}
const td: React.CSSProperties = {
  padding: '8px 12px',
  verticalAlign: 'middle',
  fontSize: 12,
  borderBottom: '1px solid var(--n-100)',
  textAlign: 'right',
}

interface RowData {
  item: string
  descripcion: string
  preCosto: number
  imprevistosPct: number
  costoFinal: number
  margenPct: number
  utilidad: number
  precioVenta: number
}

export default function ResumenCISACTab({
  cotizacion,
  disciplinas,
  calcCostoDirecto,
  totalGG,
}: Props) {
  const rows = useMemo((): RowData[] => {
    const result: RowData[] = []

    // 1. Suministro instrumentación (placeholder)
    result.push({
      item: '0',
      descripcion: 'Suministro Instrumentación',
      preCosto: 0,
      imprevistosPct: 0,
      costoFinal: 0,
      margenPct: 0,
      utilidad: 0,
      precioVenta: 0,
    })

    // 2-6. Disciplines
    const sorted = [...disciplinas].sort((a, b) => a.orden - b.orden)
    sorted.forEach((disc, i) => {
      const preCosto = calcCostoDirecto(disc)
      const costoFinal = preCosto * (1 + disc.imprevistos_pct / 100)
      const divisor = 1 - disc.margen_pct / 100
      const precioVenta = divisor > 0 ? costoFinal / divisor : costoFinal
      const utilidad = precioVenta - costoFinal
      result.push({
        item: String(i + 1),
        descripcion: disc.nombre,
        preCosto,
        imprevistosPct: disc.imprevistos_pct,
        costoFinal,
        margenPct: disc.margen_pct,
        utilidad,
        precioVenta,
      })
    })

    // 7. Gastos Generales
    {
      const preCosto = totalGG
      const costoFinal = preCosto * (1 + GG_IMPREVISTOS_PCT / 100)
      const divisor = 1 - GG_MARGEN_PCT / 100
      const precioVenta = divisor > 0 ? costoFinal / divisor : costoFinal
      const utilidad = precioVenta - costoFinal
      result.push({
        item: String(sorted.length + 1),
        descripcion: 'Gastos Generales',
        preCosto,
        imprevistosPct: GG_IMPREVISTOS_PCT,
        costoFinal,
        margenPct: GG_MARGEN_PCT,
        utilidad,
        precioVenta,
      })
    }

    return result
  }, [disciplinas, calcCostoDirecto, totalGG])

  const totalPrecioVenta = rows.reduce((s, r) => s + r.precioVenta, 0)
  const totalUtilidad = rows.reduce((s, r) => s + r.utilidad, 0)
  const totalCostoFinal = rows.reduce((s, r) => s + r.costoFinal, 0)
  const margenTotalFinal = totalPrecioVenta > 0 ? (totalUtilidad / totalPrecioVenta) * 100 : 0

  const precioSoles = totalPrecioVenta * cotizacion.tipo_cambio
  const igv = totalPrecioVenta * 0.18
  const totalConIGV = totalPrecioVenta * 1.18

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Resumen CISAC — Interno</h2>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 20,
            background: 'var(--red-50)',
            color: 'var(--red-600)',
            fontWeight: 600,
            border: '1px solid var(--red-100)',
          }}>
            CONFIDENCIAL
          </span>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left', minWidth: 40 }}>ITEM</th>
                  <th style={{ ...th, textAlign: 'left', minWidth: 180 }}>DESCRIPCIÓN</th>
                  <th style={th}>PRE-COSTO USD</th>
                  <th style={th}>IMPREVISTOS %</th>
                  <th style={th}>IMPREVISTOS USD</th>
                  <th style={th}>COSTO FINAL USD</th>
                  <th style={th}>MARGEN %</th>
                  <th style={{ ...th, color: 'var(--brand-600)' }}>UTILIDAD USD</th>
                  <th style={{ ...th, color: 'var(--brand-800)', background: 'var(--brand-50)' }}>PRECIO VENTA USD</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.item} style={{ borderBottom: '1px solid var(--n-100)' }}>
                    <td style={{ ...td, textAlign: 'left', color: 'var(--n-500)', fontWeight: 600 }}>{row.item}</td>
                    <td style={{ ...td, textAlign: 'left', color: 'var(--n-800)', fontWeight: 500 }}>{row.descripcion}</td>
                    <td style={td}>{row.preCosto > 0 ? fmtUSD(row.preCosto) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                    <td style={td}>{row.imprevistosPct > 0 ? fmtPct(row.imprevistosPct) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                    <td style={td}>
                      {row.preCosto > 0 && row.imprevistosPct > 0
                        ? fmtUSD(row.preCosto * row.imprevistosPct / 100)
                        : <span style={{ color: 'var(--n-300)' }}>—</span>}
                    </td>
                    <td style={td}>{row.costoFinal > 0 ? fmtUSD(row.costoFinal) : <span style={{ color: 'var(--n-300)' }}>—</span>}</td>
                    <td style={{ ...td, color: row.margenPct > 0 ? 'var(--n-700)' : 'var(--n-300)' }}>
                      {row.margenPct > 0 ? fmtPct(row.margenPct) : '—'}
                    </td>
                    <td style={{ ...td, color: row.utilidad > 0 ? 'var(--brand-700)' : 'var(--n-300)', fontWeight: 600 }}>
                      {row.utilidad > 0 ? fmtUSD(row.utilidad) : '—'}
                    </td>
                    <td style={{ ...td, background: 'var(--brand-50)', color: 'var(--brand-800)', fontWeight: 700 }}>
                      {row.precioVenta > 0 ? fmtUSD(row.precioVenta) : <span style={{ color: 'var(--n-300)', fontWeight: 400 }}>—</span>}
                    </td>
                  </tr>
                ))}

                {/* Total row */}
                <tr style={{ background: 'var(--n-900)' }}>
                  <td style={{ ...td, textAlign: 'left', color: 'var(--n-25)', fontWeight: 700 }} colSpan={2}>
                    PRECIO VENTA SIN IGV
                  </td>
                  <td style={{ ...td, color: 'var(--n-300)', fontWeight: 700 }}>{fmtUSD(rows.reduce((s, r) => s + r.preCosto, 0))}</td>
                  <td style={td} />
                  <td style={{ ...td, color: 'var(--n-300)' }}>
                    {fmtUSD(rows.reduce((s, r) => s + r.preCosto * r.imprevistosPct / 100, 0))}
                  </td>
                  <td style={{ ...td, color: 'var(--n-300)', fontWeight: 700 }}>{fmtUSD(totalCostoFinal)}</td>
                  <td style={td} />
                  <td style={{ ...td, color: '#fff', fontWeight: 700 }}>{fmtUSD(totalUtilidad)}</td>
                  <td style={{ ...td, background: 'var(--brand-800)', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                    {fmtUSD(totalPrecioVenta)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}>
          <SummaryCard
            label="Margen Total Final"
            value={fmtPct(margenTotalFinal)}
            sub="Utilidad / Precio Venta"
            accent="brand"
          />
          <SummaryCard
            label={`Precio Venta en S/. (TC ${cotizacion.tipo_cambio})`}
            value={`S/. ${precioSoles.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
            sub="Sin IGV"
            accent="n"
          />
          <SummaryCard
            label="IGV (18%)"
            value={fmtUSD(igv)}
            sub={`S/. ${(igv * cotizacion.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
            accent="n"
          />
          <SummaryCard
            label="Precio Venta con IGV"
            value={fmtUSD(totalConIGV)}
            sub={`S/. ${(totalConIGV * cotizacion.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
            accent="green"
          />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'brand' | 'n' | 'green' }) {
  const colors = {
    brand: { bg: 'var(--brand-50)', border: 'var(--brand-100)', label: 'var(--brand-600)', value: 'var(--brand-800)' },
    n:     { bg: '#fff',            border: 'var(--n-150)',      label: 'var(--n-500)',      value: 'var(--n-900)'    },
    green: { bg: 'var(--green-50)', border: 'var(--green-200)', label: 'var(--green-700)', value: 'var(--green-700)' },
  }[accent]

  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: colors.label, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: colors.value }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 3 }}>{sub}</div>
    </div>
  )
}
