import ExcelJS from 'exceljs'
import { buildSubmissionsQuery } from './formSubmissionsQuery'
import type { SubmissionFilters } from './formSubmissionsQuery'
import { labelFor, nombreDe, origenDe, destinoDe } from './solicitudBoleto'
import type { FormSubmission } from './types'

function argb(hex: string) { return { argb: 'FF' + hex.replace('#', '').toUpperCase() } as ExcelJS.Color }
function fill(hex: string): ExcelJS.Fill { return { type: 'pattern', pattern: 'solid', fgColor: argb(hex) } }
function border(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: argb('D0D4DC') }
  return { top: s, bottom: s, left: s, right: s }
}

const COLUMNS: { header: string; width: number; get: (s: FormSubmission) => string | number }[] = [
  { header: 'Solicitante', width: 26, get: s => nombreDe(s) },
  { header: 'Correo',      width: 26, get: s => s.submitter_email ?? '' },
  { header: 'Recibida',    width: 18, get: s => new Date(s.created_at).toLocaleString('es-PE') },
  { header: 'Origen',      width: 16, get: s => origenDe(s) },
  { header: 'Destino',     width: 16, get: s => destinoDe(s) },
  { header: 'Tipo',        width: 12, get: s => labelFor(s.answers?.tipo_boleto) },
  { header: 'Ámbito',      width: 14, get: s => labelFor(s.answers?.destino_vuelo) },
  { header: 'Servicio',    width: 18, get: s => labelFor(s.answers?.tipo_servicio) },
  { header: 'Pasajeros',   width: 11, get: s => Number(s.answers?.num_pasajeros ?? 0) || '' },
  { header: 'Equipaje',    width: 22, get: s => labelFor(s.answers?.equipaje) },
  { header: 'Fecha salida', width: 14, get: s => s.answers?.fecha_salida ?? '' },
  { header: 'Fecha regreso', width: 14, get: s => s.answers?.fecha_regreso ?? '' },
  { header: 'Task',        width: 20, get: s => s.answers?.numero_task ?? '' },
  { header: 'Estado',      width: 14, get: s => s.status },
]

/**
 * Exporta TODAS las solicitudes que cumplen los filtros activos (no sólo la
 * página visible). Devuelve cuántas filas se escribieron.
 */
export async function exportSolicitudes(formId: string, filters: SubmissionFilters): Promise<number> {
  const { data, error } = await buildSubmissionsQuery(formId, filters)
    .order('created_at', { ascending: false })
    .limit(5000)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as FormSubmission[]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'CORSUSA · Project Tracker'
  const ws = wb.addWorksheet('Solicitudes')

  ws.columns = COLUMNS.map(c => ({ header: c.header, width: c.width }))

  const head = ws.getRow(1)
  head.eachCell(cell => {
    cell.fill = fill('0047BA')
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = border()
  })
  head.height = 22

  rows.forEach((s, i) => {
    const row = ws.addRow(COLUMNS.map(c => c.get(s)))
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = fill(i % 2 ? 'F8F9FB' : 'FFFFFF')
      cell.font = { size: 10 }
      cell.alignment = { vertical: 'middle' }
      cell.border = border()
    })
    row.height = 18
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } }

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Solicitudes_Boletos_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)

  return rows.length
}
