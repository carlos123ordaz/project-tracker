import { useMemo, useState } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import type {
  Cotizacion,
  CotizacionDisciplina,
  CotizacionSeccion,
  CotizacionPartida,
  PersonalTarifa,
} from '../../../lib/types'
import { calcularTarifa } from '../../../hooks/useCotizacionEditor'

// PRY products are handled in Resumen B24 PRY — exclude from this tab
const PRY_PREFIXES = ['Proy.PIC.', 'Proy.PAU.']
const isPRY = (nombre: string) => PRY_PREFIXES.some(p => nombre.startsWith(p))

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtUSD = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v: number) =>
  `${(v * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

function getPrecioParcial(
  p: CotizacionPartida,
  tarifas: PersonalTarifa[],
  segmento: string,
  tc: number,
): number {
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
  disciplinas: CotizacionDisciplina[]
  secciones: CotizacionSeccion[]
  partidas: CotizacionPartida[]
  tarifas: PersonalTarifa[]
  totalGG: number
}

// ── Row shape ─────────────────────────────────────────────────────────────────
interface UNRow {
  item: number
  producto: string
  costo: number          // suma precio_parcial
  costosFijos: number    // GG proporcional
  costosTotales: number  // costo + costosFijos
  precioVenta: number    // costosTotales / (1 - margenProm)
  margen: number         // 0-1
  utilidad: number
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ResumenUNTab({
  cotizacion,
  disciplinas,
  secciones,
  partidas,
  tarifas,
  totalGG,
}: Props) {
  const [copied, setCopied] = useState(false)

  // Build seccion → disciplina lookup
  const secDisc = useMemo(() => {
    const map: Record<string, CotizacionDisciplina> = {}
    for (const sec of secciones) {
      const disc = disciplinas.find(d => d.id === sec.disciplina_id)
      if (disc) map[sec.id] = disc
    }
    return map
  }, [secciones, disciplinas])

  // Aggregate UN partidas by producto_bitrix
  const rows = useMemo((): UNRow[] => {
    // Only partidas with a UN producto_bitrix
    const unPartidas = partidas.filter(
      p => p.producto_bitrix && !isPRY(p.producto_bitrix),
    )

    if (unPartidas.length === 0) return []

    // Group
    const groups: Record<string, { costo: number; pvSum: number }> = {}
    for (const p of unPartidas) {
      const key = p.producto_bitrix!
      const disc = secDisc[p.seccion_id]
      const costo = getPrecioParcial(p, tarifas, cotizacion.segmento, cotizacion.tipo_cambio)
      const imprPct = disc?.imprevistos_pct ?? 2
      const margenPct = disc?.margen_pct ?? 10
      const costoConImpr = costo * (1 + imprPct / 100)
      const pv = margenPct < 100 ? costoConImpr / (1 - margenPct / 100) : costoConImpr
      if (!groups[key]) groups[key] = { costo: 0, pvSum: 0 }
      groups[key].costo += costo
      groups[key].pvSum += pv
    }

    const totalCosto = Object.values(groups).reduce((s, g) => s + g.costo, 0)

    return Object.entries(groups)
      .sort(([, a], [, b]) => b.costo - a.costo)
      .map(([producto, g], i) => {
        const costosFijos = totalCosto > 0 ? totalGG * (g.costo / totalCosto) : 0
        const costosTotales = g.costo + costosFijos
        // Scale precio venta to include the costosFijos proportion
        const pvScale = g.costo > 0 ? costosTotales / g.costo : 1
        const precioVenta = g.pvSum * pvScale
        const utilidad = precioVenta - costosTotales
        const margen = precioVenta > 0 ? utilidad / precioVenta : 0
        return {
          item: i + 2, // Excel starts at item 2
          producto,
          costo: g.costo,
          costosFijos,
          costosTotales,
          precioVenta,
          margen,
          utilidad,
        }
      })
  }, [partidas, secDisc, tarifas, cotizacion.segmento, cotizacion.tipo_cambio, totalGG])

  const totals = useMemo(() => ({
    costo:        rows.reduce((s, r) => s + r.costo, 0),
    costosFijos:  rows.reduce((s, r) => s + r.costosFijos, 0),
    costosTotales:rows.reduce((s, r) => s + r.costosTotales, 0),
    precioVenta:  rows.reduce((s, r) => s + r.precioVenta, 0),
    utilidad:     rows.reduce((s, r) => s + r.utilidad, 0),
  }), [rows])

  const margenTotal = totals.precioVenta > 0 ? totals.utilidad / totals.precioVenta : 0

  // Copy TSV
  function handleCopy() {
    const header = 'ITEM\tProducto\tCosto\tCostos Fijos\tCostos Totales\tPrecio Venta\tMargen\tUtilidad'
    const lines = rows.map(r =>
      `${r.item}\t${r.producto}\t${r.costo.toFixed(2)}\t${r.costosFijos.toFixed(2)}\t${r.costosTotales.toFixed(2)}\t${r.precioVenta.toFixed(2)}\t${(r.margen * 100).toFixed(2)}%\t${r.utilidad.toFixed(2)}`,
    )
    navigator.clipboard.writeText([header, ...lines].join('\n')).then(() => {
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
            Resumen UN — Oferta Proyectos
          </h2>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--amber-50)', color: 'var(--amber-700)', fontWeight: 600, border: '1px solid var(--amber-200)' }}>
            Equipamiento UNAU
          </span>
          <button
            onClick={handleCopy}
            disabled={rows.length === 0}
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--n-200)', background: 'var(--n-0)', color: 'var(--n-700)',
              cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: rows.length === 0 ? 0.5 : 1,
            }}
          >
            {copied ? <><Check size={12} style={{ color: 'var(--green-600)' }} /> Copiado</> : <><Copy size={12} /> Copiar TSV</>}
          </button>
        </div>

        {rows.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '14px 16px', borderRadius: 10,
            background: 'var(--amber-50)', border: '1px solid var(--amber-200)',
            fontSize: 12.5, color: 'var(--amber-700)',
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Sin partidas de equipamiento.</strong>{' '}
              Asigna un <strong>Producto Bitrix</strong> de equipamiento (que no sea <code>Proy.PIC.*</code> ni <code>Proy.PAU.*</code>) a las partidas de tipo MAT o SUB en la pestaña Partidas.
            </div>
          </div>
        ) : (
          <>
            {/* Main table */}
            <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--n-25)' }}>
                      <th style={{ ...th, textAlign: 'center', width: 48 }}>ITEM</th>
                      <th style={{ ...th, textAlign: 'left', minWidth: 200 }}>Producto</th>
                      <th style={th}>Costo USD</th>
                      <th style={{ ...th, color: 'var(--n-400)' }}>Costos Fijos</th>
                      <th style={th}>Costos Totales</th>
                      <th style={{ ...th, color: 'var(--brand-700)', background: 'var(--brand-50)' }}>Precio Venta</th>
                      <th style={th}>Margen</th>
                      <th style={{ ...th, color: 'var(--green-700)' }}>Utilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Section header */}
                    <tr style={{ background: 'var(--n-50)' }}>
                      <td colSpan={8} style={{ padding: '5px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--n-100)' }}>
                        Equipamiento Ventas
                      </td>
                    </tr>

                    {rows.map(row => (
                      <tr key={row.producto} style={{ borderBottom: '1px solid var(--n-100)' }}>
                        <td style={{ ...td, textAlign: 'center', color: 'var(--n-400)', fontWeight: 600 }}>{row.item}</td>
                        <td style={{ ...td, textAlign: 'left', color: 'var(--n-800)', fontWeight: 500 }}>{row.producto}</td>
                        <td style={td}>{fmtUSD(row.costo)}</td>
                        <td style={{ ...td, color: 'var(--n-500)' }}>{fmtUSD(row.costosFijos)}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{fmtUSD(row.costosTotales)}</td>
                        <td style={{ ...td, background: 'var(--brand-50)', color: 'var(--brand-800)', fontWeight: 700 }}>
                          {fmtUSD(row.precioVenta)}
                        </td>
                        <td style={{ ...td, color: row.margen >= 0.15 ? 'var(--green-700)' : row.margen >= 0.05 ? 'var(--amber-700)' : 'var(--red-600)', fontWeight: 600 }}>
                          {fmtPct(row.margen)}
                        </td>
                        <td style={{ ...td, color: row.utilidad > 0 ? 'var(--green-700)' : 'var(--red-600)', fontWeight: 600 }}>
                          {fmtUSD(row.utilidad)}
                        </td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr style={{ background: 'var(--inverted-bg)' }}>
                      <td colSpan={2} style={{ padding: '9px 12px', fontWeight: 700, color: '#fff', fontSize: 12 }}>
                        Total
                      </td>
                      <td style={{ ...td, color: 'var(--n-300)', fontWeight: 700 }}>{fmtUSD(totals.costo)}</td>
                      <td style={{ ...td, color: 'var(--n-400)' }}>{fmtUSD(totals.costosFijos)}</td>
                      <td style={{ ...td, color: 'var(--n-200)', fontWeight: 700 }}>{fmtUSD(totals.costosTotales)}</td>
                      <td style={{ ...td, background: 'var(--brand-800)', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                        {fmtUSD(totals.precioVenta)}
                      </td>
                      <td style={{ ...td, color: '#fff', fontWeight: 700 }}>{fmtPct(margenTotal)}</td>
                      <td style={{ ...td, color: '#fff', fontWeight: 700 }}>{fmtUSD(totals.utilidad)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              <SummaryCard
                label="Costo Directo"
                value={fmtUSD(totals.costo)}
                sub="Sin GG ni margen"
                accent="n"
              />
              <SummaryCard
                label="Costos Fijos (GG)"
                value={fmtUSD(totals.costosFijos)}
                sub={`${((totals.costosFijos / (totals.costo || 1)) * 100).toFixed(1)}% del costo directo`}
                accent="n"
              />
              <SummaryCard
                label="Precio Venta"
                value={fmtUSD(totals.precioVenta)}
                sub={`S/. ${(totals.precioVenta * cotizacion.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
                accent="brand"
              />
              <SummaryCard
                label="Utilidad"
                value={fmtUSD(totals.utilidad)}
                sub={`Margen: ${fmtPct(margenTotal)}`}
                accent="green"
              />
            </div>

            {/* Note about GG allocation */}
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--n-25)', border: '1px solid var(--n-150)', fontSize: 11.5, color: 'var(--n-500)' }}>
              <strong style={{ color: 'var(--n-700)' }}>Nota Costos Fijos:</strong>{' '}
              Los Gastos Generales (<strong>{fmtUSD(totalGG)}</strong>) se distribuyen proporcionalmente al costo de cada producto de equipamiento.
              El Precio Venta aplica el margen configurado en la disciplina de cada partida.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Styles ────────────────────────────────────────────────────────────────────
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
