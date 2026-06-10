import ExcelJS, { type CellValue } from 'exceljs'
import type { Budget, BudgetItem, BudgetResource, ApuLine } from './types'
import { evalFormula } from './budgetHelpers'
import { supabase } from './supabase'

// ── helpers ───────────────────────────────────────────────────────────────────
function rgb(hex: string): ExcelJS.Color {
  const h = hex.replace('#', '')
  return { argb: 'FF' + h.toUpperCase() } as ExcelJS.Color
}

function fill(hex: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: rgb(hex) }
}

function border(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: rgb('D0D4DC') }
  return { top: s, bottom: s, left: s, right: s }
}

// ── main export ───────────────────────────────────────────────────────────────
export async function exportBudgetToExcel(
  budget: Budget,
  items: BudgetItem[],
  apuLines: ApuLine[],
  resources: BudgetResource[],
  ggTotal?: number,
): Promise<void> {
  // resource map
  const rMap = new Map(resources.map(r => [r.id, r]))

  // breakdown per item
  const breakdown = new Map<string, { mo: number; mt: number; eq: number; sc: number }>()
  for (const line of apuLines) {
    const r = rMap.get(line.resource_id)
    if (!r) continue
    const existing = breakdown.get(line.item_id) ?? { mo: 0, mt: 0, eq: 0, sc: 0 }
    const val = line.qty * r.price
    if (r.kind === 'labor')       existing.mo += val
    else if (r.kind === 'material')    existing.mt += val
    else if (r.kind === 'equipment')   existing.eq += val
    else if (r.kind === 'subcontrato') existing.sc += val
    breakdown.set(line.item_id, existing)
  }

  // sort groups + items
  const groups = items.filter(i => i.type === 'group').sort((a, b) => a.sort_order - b.sort_order)
  const childrenOf = (gid: string) =>
    items.filter(i => i.type === 'item' && i.parent_id === gid).sort((a, b) => a.sort_order - b.sort_order)
  const ungrouped = items.filter(i => i.type === 'item' && !i.parent_id).sort((a, b) => a.sort_order - b.sort_order)

  // ── workbook ─────────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Project Tracker'
  wb.created  = new Date()

  // ── Sheet 1: Partidas ─────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Partidas', { views: [{ state: 'frozen', ySplit: 6 }] })

  // column widths
  ws.columns = [
    { width: 6  },  // A  #
    { width: 8  },  // B  código
    { width: 52 },  // C  descripción
    { width: 8  },  // D  und
    { width: 12 },  // E  metrado
    { width: 14 },  // F  C.U.
    { width: 16 },  // G  parcial
    { width: 14 },  // H  MO
    { width: 14 },  // I  MT
    { width: 14 },  // J  EQ
    { width: 14 },  // K  SC
  ]

  // ── title block ───────────────────────────────────────────────────────────────
  const titleFont: Partial<ExcelJS.Font> = { name: 'Calibri', bold: true, size: 14, color: rgb('1E293B') }
  const metaFont:  Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, color: rgb('475569') }

  ws.mergeCells('A1:K1')
  ws.getCell('A1').value = budget.name
  ws.getCell('A1').font  = titleFont
  ws.getRow(1).height    = 22

  ws.mergeCells('A2:D2')
  ws.getCell('A2').value = `Cliente: ${budget.client || '—'}`
  ws.getCell('A2').font  = metaFont

  ws.mergeCells('E2:G2')
  ws.getCell('E2').value = `Estado: ${budget.status}`
  ws.getCell('E2').font  = metaFont

  ws.mergeCells('H2:K2')
  ws.getCell('H2').value = `Moneda: ${budget.currency || 'PEN'}`
  ws.getCell('H2').font  = metaFont

  ws.mergeCells('A3:K3')
  ws.getRow(3).height = 6

  // ── column headers ────────────────────────────────────────────────────────────
  const hdrFill   = fill('1E293B')
  const hdrFont: Partial<ExcelJS.Font> = { name: 'Calibri', bold: true, size: 9.5, color: rgb('FFFFFF') }
  const hdrAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' }

  const catHeaders: Array<[string, string, string]> = [
    ['H4', 'MO', 'FEF3C7'], ['I4', 'MT', 'DBEAFE'],
    ['J4', 'EQ', 'E0E7FF'], ['K4', 'SC', 'EDE9FE'],
  ]

  const headers: Array<[string, string]> = [
    ['A4','#'], ['B4','Código'], ['C4','Descripción / Partida'],
    ['D4','Und'], ['E4','Metrado'], ['F4','C.U.'], ['G4','Parcial'],
  ]
  for (const [addr, label] of headers) {
    const c = ws.getCell(addr)
    c.value     = label
    c.fill      = hdrFill
    c.font      = hdrFont
    c.alignment = hdrAlign
    c.border    = border()
  }

  // category header cells — colored bg
  const catColors: Record<string, string> = { MO: 'B45309', MT: '1D4ED8', EQ: '4338CA', SC: '6D28D9' }
  for (const [addr, label, bg] of catHeaders) {
    const c = ws.getCell(addr)
    c.value     = label
    c.fill      = fill(bg)
    c.font      = { ...hdrFont, color: rgb(catColors[label]) }
    c.alignment = hdrAlign
    c.border    = border()
  }

  ws.getRow(4).height = 22

  // ── data rows ────────────────────────────────────────────────────────────────
  const numFmt = '#,##0.00'
  const dataFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10 }
  const rightAlign: Partial<ExcelJS.Alignment> = { horizontal: 'right', vertical: 'middle' }
  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' }

  let rowIdx  = 5
  let itemSeq = 0

  // totals accumulators
  let totalParcial = 0, totalMO = 0, totalMT = 0, totalEQ = 0, totalSC = 0

  const writeItem = (it: BudgetItem) => {
    const bd   = breakdown.get(it.id) ?? { mo: 0, mt: 0, eq: 0, sc: 0 }
    const cu   = bd.mo + bd.mt + bd.eq + bd.sc || it.unit_price
    const parc = cu * it.qty

    totalParcial += parc
    totalMO += bd.mo * it.qty
    totalMT += bd.mt * it.qty
    totalEQ += bd.eq * it.qty
    totalSC += bd.sc * it.qty

    itemSeq++
    const row = ws.getRow(rowIdx++)
    row.height = 18
    const vals: [number, CellValue][] = [
      [1, itemSeq], [2, it.code || ''], [3, it.name],
      [4, it.unit], [5, it.qty], [6, cu], [7, parc],
      [8, bd.mo * it.qty], [9, bd.mt * it.qty],
      [10, bd.eq * it.qty], [11, bd.sc * it.qty],
    ]
    for (const [col, val] of vals) {
      const c = row.getCell(col)
      c.value  = val
      c.font   = dataFont
      c.border = border()
      if (col >= 5) { c.alignment = rightAlign; if (typeof val === 'number') c.numFmt = numFmt }
      else c.alignment = col === 4 ? centerAlign : { vertical: 'middle' }
    }
  }

  const writeGroup = (g: BudgetItem, index: number) => {
    const children = childrenOf(g.id)
    const gSubtotal = children.reduce((s, c) => {
      const bd = breakdown.get(c.id) ?? { mo: 0, mt: 0, eq: 0, sc: 0 }
      const cu = bd.mo + bd.mt + bd.eq + bd.sc || c.unit_price
      return s + cu * c.qty
    }, 0)

    const row   = ws.getRow(rowIdx++)
    row.height  = 20
    ws.mergeCells(`C${rowIdx - 1}:F${rowIdx - 1}`)

    const cells: [number, CellValue][] = [
      [1, index + 1], [2, g.code || ''], [3, g.name], [7, gSubtotal],
    ]
    for (const [col, val] of cells) {
      const c = row.getCell(col)
      c.value  = val
      c.fill   = fill('F1F5F9')
      c.font   = { name: 'Calibri', bold: true, size: 10.5, color: rgb('1E293B') }
      c.border = border()
      if (col === 7) { c.alignment = rightAlign; c.numFmt = numFmt }
      else c.alignment = { vertical: 'middle' }
    }
    // fill merged area
    for (let c = 4; c <= 6; c++) {
      const cell = row.getCell(c)
      cell.fill   = fill('F1F5F9')
      cell.border = border()
    }
    for (let c = 8; c <= 11; c++) {
      const cell = row.getCell(c)
      cell.fill   = fill('F1F5F9')
      cell.border = border()
    }

    for (const child of children) writeItem(child)
  }

  for (let i = 0; i < groups.length; i++) writeGroup(groups[i], i)
  for (const it of ungrouped) writeItem(it)

  // ── totals row ────────────────────────────────────────────────────────────────
  const totRow = ws.getRow(rowIdx)
  totRow.height = 22
  ws.mergeCells(`A${rowIdx}:F${rowIdx}`)

  const totLabel = totRow.getCell(1)
  totLabel.value = 'COSTO DIRECTO'
  totLabel.fill  = fill('1E293B')
  totLabel.font  = { name: 'Calibri', bold: true, size: 10.5, color: rgb('FFFFFF') }
  totLabel.alignment = { vertical: 'middle', horizontal: 'right' }
  totLabel.border = border()

  for (let c = 2; c <= 6; c++) {
    const cell = totRow.getCell(c)
    cell.fill   = fill('1E293B')
    cell.border = border()
  }

  const totVals: [number, number, string][] = [
    [7, totalParcial, 'F8FAFC'],
    [8, totalMO,  'FFFBEB'],
    [9, totalMT,  'EFF6FF'],
    [10, totalEQ, 'EEF2FF'],
    [11, totalSC, 'F5F3FF'],
  ]
  for (const [col, val, bg] of totVals) {
    const c = totRow.getCell(col)
    c.value     = val
    c.fill      = fill(bg)
    c.font      = { name: 'Calibri', bold: true, size: 11 }
    c.alignment = rightAlign
    c.numFmt    = numFmt
    c.border    = border()
  }

  // ── Pie de presupuesto (dinámico desde budget_pie_rows) ──────────────────────
  const { data: pieConfig } = await supabase
    .from('budget_pie_rows')
    .select('variable,description,formula,highlight')
    .order('sort_order')

  if (pieConfig && pieConfig.length > 0) {
    // compute vars chain — same logic as PieDePresupuestoTab
    const vars: Record<string, number> = { CD: totalParcial }
    if (ggTotal != null && ggTotal > 0) vars['GG'] = ggTotal
    for (const row of pieConfig) {
      const key = row.variable?.toUpperCase().trim()
      if (!key) continue
      vars[key] = evalFormula(row.formula, vars) ?? 0
    }

    rowIdx++ // blank spacer row

    for (const row of pieConfig) {
      const key   = row.variable?.toUpperCase().trim()
      const value = key ? (vars[key] ?? 0) : 0
      const hl    = row.highlight

      const r  = ws.getRow(rowIdx++)
      r.height = hl ? 24 : 19
      ws.mergeCells(`A${rowIdx - 1}:F${rowIdx - 1}`)

      const labelBg = hl ? '0F172A' : 'F8FAFC'
      const valBg   = hl ? '1E3A5F' : 'F1F5F9'
      const txtColor = hl ? rgb('FFFFFF') : rgb('374151')

      const lCell = r.getCell(1)
      lCell.value     = row.description || key
      lCell.fill      = fill(labelBg)
      lCell.font      = { name: 'Calibri', bold: hl, size: hl ? 11 : 10.5, color: txtColor }
      lCell.alignment = { vertical: 'middle', horizontal: 'right' }
      lCell.border    = border()
      for (let c = 2; c <= 6; c++) {
        const cell = r.getCell(c); cell.fill = fill(labelBg); cell.border = border()
      }

      const vCell = r.getCell(7)
      vCell.value     = value
      vCell.fill      = fill(valBg)
      vCell.font      = { name: 'Calibri', bold: hl, size: hl ? 11.5 : 10.5, color: txtColor }
      vCell.alignment = rightAlign
      vCell.numFmt    = numFmt
      vCell.border    = border()

      for (let c = 8; c <= 11; c++) {
        const cell = r.getCell(c); cell.fill = fill(labelBg); cell.border = border()
      }
    }
  }

  // ── Sheet 2: Insumos (base de precios) ────────────────────────────────────────
  const ws2 = wb.addWorksheet('Base de Precios')
  ws2.columns = [
    { width: 8 }, { width: 44 }, { width: 10 }, { width: 16 }, { width: 16 },
  ]

  ws2.mergeCells('A1:E1')
  ws2.getCell('A1').value = 'Base de Precios — ' + budget.name
  ws2.getCell('A1').font  = { name: 'Calibri', bold: true, size: 13, color: rgb('1E293B') }
  ws2.getRow(1).height    = 22

  const h2: Array<[string, string]> = [
    ['A3','Tipo'], ['B3','Nombre'], ['C3','Unidad'], ['D3','Precio Unit.'], ['E3','Partidas que lo usan'],
  ]
  for (const [addr, label] of h2) {
    const c = ws2.getCell(addr)
    c.value     = label
    c.fill      = hdrFill
    c.font      = hdrFont
    c.alignment = hdrAlign
    c.border    = border()
  }
  ws2.getRow(3).height = 20

  const kindLabel: Record<string, string> = {
    labor: 'MO', material: 'MT', equipment: 'EQ', subcontrato: 'SC',
  }
  const kindBg: Record<string, string> = {
    labor: 'FFFBEB', material: 'EFF6FF', equipment: 'EEF2FF', subcontrato: 'F5F3FF',
  }

  // usage count per resource
  const usageCount = new Map<string, number>()
  for (const line of apuLines) {
    usageCount.set(line.resource_id, (usageCount.get(line.resource_id) ?? 0) + 1)
  }

  const sortedRes = [...resources].sort((a, b) => {
    const order = ['labor', 'material', 'equipment', 'subcontrato']
    return order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name)
  })

  let r2 = 4
  for (const res of sortedRes) {
    const row = ws2.getRow(r2++)
    row.height  = 17
    const bg    = kindBg[res.kind] ?? 'FFFFFF'
    const cells2: [number, CellValue][] = [
      [1, kindLabel[res.kind] ?? res.kind],
      [2, res.name],
      [3, res.unit],
      [4, res.price],
      [5, usageCount.get(res.id) ?? 0],
    ]
    for (const [col, val] of cells2) {
      const c = row.getCell(col)
      c.value  = val
      c.fill   = fill(bg)
      c.font   = dataFont
      c.border = border()
      if (col === 4) { c.alignment = rightAlign; c.numFmt = numFmt }
      else if (col === 5) c.alignment = centerAlign
      else c.alignment = { vertical: 'middle' }
    }
  }

  // ── download ──────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `Presupuesto_${budget.name.replace(/\s+/g, '_')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
