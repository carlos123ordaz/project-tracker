import ExcelJS from 'exceljs'
import { supabase } from './supabase'
import type { AttendanceRecord } from './types'

// ── helpers ───────────────────────────────────────────────────────────────────
function argb(hex: string) { return { argb: 'FF' + hex.replace('#', '').toUpperCase() } as ExcelJS.Color }
function fill(hex: string): ExcelJS.Fill { return { type: 'pattern', pattern: 'solid', fgColor: argb(hex) } }
function border(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: argb('D0D4DC') }
  return { top: s, bottom: s, left: s, right: s }
}
function headerStyle(row: ExcelJS.Row, bgHex: string) {
  row.eachCell(cell => {
    cell.fill = fill(bgHex)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = border()
  })
  row.height = 24
}
function dataStyle(row: ExcelJS.Row, shade: boolean) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = fill(shade ? 'F8F9FB' : 'FFFFFF')
    cell.font = { size: 10 }
    cell.alignment = { vertical: 'middle', wrapText: false }
    cell.border = border()
  })
  row.height = 18
}
function download(wb: ExcelJS.Workbook, filename: string) {
  wb.xlsx.writeBuffer().then(buf => {
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  })
}

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtHours(h: number): string {
  if (!h) return ''
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
export async function exportAttendanceExcel(opts?: {
  userId?: string
  dateFilter?: string
  filterUser?: string
}): Promise<void> {
  // Fetch ALL records from Supabase
  let q = supabase
    .from('attendance_records')
    .select('*')
    .order('date', { ascending: false })
    .order('collaborator_name')

  if (opts?.userId) q = q.eq('collaborator_id', opts.userId)
  if (opts?.dateFilter) q = q.eq('date', opts.dateFilter)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  let records = (data ?? []) as AttendanceRecord[]

  // Apply collaborator name filter if present
  if (opts?.filterUser?.trim()) {
    const search = opts.filterUser.toLowerCase()
    records = records.filter(r => r.collaborator_name.toLowerCase().includes(search))
  }

  if (records.length === 0) {
    alert('No hay registros para exportar.')
    return
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Asistencia')

  // Columns
  const columns = [
    { header: 'Fecha',            key: 'date',              width: 13 },
    { header: 'Día',              key: 'day',               width: 12 },
    { header: 'Semana',           key: 'week',              width: 9 },
    { header: 'Mes',              key: 'month',             width: 13 },
    { header: 'Colaborador',      key: 'collaborator',      width: 28 },
    { header: 'Proyecto',         key: 'project',           width: 22 },
    { header: 'Tipo Proyecto',    key: 'project_type',      width: 18 },
    { header: 'Turno',            key: 'shift',             width: 9 },
    { header: 'Ingreso',          key: 'check_in',          width: 10 },
    { header: 'Salida',           key: 'check_out',         width: 10 },
    { header: 'H. Programadas',   key: 'scheduled_hours',   width: 14 },
    { header: 'H. Reales',        key: 'real_hours',        width: 11 },
    { header: 'H. Extra',         key: 'extra_hours',       width: 10 },
    { header: 'Condición',        key: 'condition',         width: 16 },
    { header: 'Motivo',           key: 'motive',            width: 20 },
    { header: 'Observaciones',    key: 'observations',      width: 30 },
    { header: 'GPS Ingreso',      key: 'gps_in',            width: 26 },
    { header: 'GPS Salida',       key: 'gps_out',           width: 26 },
  ]
  ws.columns = columns

  // Header row
  headerStyle(ws.getRow(1), '4F46E5')

  // Data rows
  records.forEach((r, i) => {
    const d = new Date(r.date + 'T00:00:00')
    const row = ws.addRow({
      date:            r.date,
      day:             DAYS_ES[d.getDay()],
      week:            isoWeek(d),
      month:           MONTHS_ES[d.getMonth()],
      collaborator:    r.collaborator_name,
      project:         r.project_name || '',
      project_type:    r.project_type || '',
      shift:           r.shift,
      check_in:        fmtTime(r.check_in_time),
      check_out:       fmtTime(r.check_out_time),
      scheduled_hours: r.scheduled_hours ? fmtHours(r.scheduled_hours) : '',
      real_hours:      r.real_hours ? fmtHours(r.real_hours) : '',
      extra_hours:     r.extra_hours ? fmtHours(r.extra_hours) : '',
      condition:       r.condition,
      motive:          r.motive === 'Ninguno' ? '' : r.motive,
      observations:    r.observations || '',
      gps_in:          r.check_in_lat && r.check_in_lng ? `${r.check_in_lat}, ${r.check_in_lng}` : '',
      gps_out:         r.check_out_lat && r.check_out_lng ? `${r.check_out_lat}, ${r.check_out_lng}` : '',
    })
    dataStyle(row, i % 2 === 1)
  })

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }]

  // Auto-filter
  ws.autoFilter = { from: 'A1', to: `R${records.length + 1}` }

  const dateStr = opts?.dateFilter || new Date().toISOString().split('T')[0]
  download(wb, `Asistencia_${dateStr}.xlsx`)
}
