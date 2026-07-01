import ExcelJS from 'exceljs'
import { supabase } from './supabase'
import type { AlmacenEquipo, AlmacenPedido, AlmacenPedidoItem } from './types'

// ── helpers ───────────────────────────────────────────────────────────────────
function argb(hex: string) { return { argb: 'FF' + hex.replace('#', '').toUpperCase() } as ExcelJS.Color }
function fill(hex: string): ExcelJS.Fill { return { type: 'pattern', pattern: 'solid', fgColor: argb(hex) } }
function border(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: argb('D0D4DC') }
  return { top: s, bottom: s, left: s, right: s }
}
function headerStyle(ws: ExcelJS.Worksheet, row: ExcelJS.Row, bgHex: string) {
  row.eachCell(cell => {
    cell.fill = fill(bgHex)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = border()
  })
  row.height = 22
  void ws
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
function currency(ws: ExcelJS.Worksheet, col: string) {
  ws.getColumn(col).numFmt = '"S/"#,##0.00'
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

// ── 1. EXPORTAR MATERIALES ────────────────────────────────────────────────────
export async function exportMateriales(
  _equipos: AlmacenEquipo[],
  opts?: { search?: string; estado?: string; bajoStock?: boolean },
): Promise<void> {
  // Traer TODOS los registros sin paginación, respetando los filtros activos
  let q = supabase
    .from('almacen_equipos')
    .select('*')
    .order('created_at', { ascending: false })
  if (opts?.search) q = q.or(`nombre.ilike.%${opts.search}%,codigo.ilike.%${opts.search}%,categoria.ilike.%${opts.search}%`)
  if (opts?.estado && opts.estado !== 'Todos') q = q.eq('estado', opts.estado)
  const { data } = await q
  let equipos = (data ?? []) as AlmacenEquipo[]
  if (opts?.bajoStock) equipos = equipos.filter(e => e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CORSUSA'
  wb.created = new Date()

  const ws = wb.addWorksheet('Materiales', { views: [{ state: 'frozen', ySplit: 1 }] })

  ws.columns = [
    { header: 'Código',        key: 'codigo',          width: 14 },
    { header: 'Nombre',        key: 'nombre',          width: 32 },
    { header: 'Categoría',     key: 'categoria',       width: 18 },
    { header: 'Estado',        key: 'estado',          width: 16 },
    { header: 'Stock actual',  key: 'stock_actual',    width: 13 },
    { header: 'Stock mínimo',  key: 'stock_minimo',    width: 13 },
    { header: 'Unidad',        key: 'unidad',          width: 10 },
    { header: 'Precio unit.',  key: 'precio_unitario', width: 14 },
    { header: 'Marca',         key: 'marca',           width: 16 },
    { header: 'Modelo',        key: 'modelo',          width: 16 },
    { header: 'Serie',         key: 'serie',           width: 16 },
    { header: 'Descripción',   key: 'descripcion',     width: 30 },
    { header: 'Ubicación',     key: 'ubicacion',       width: 20 },
  ]

  headerStyle(ws, ws.getRow(1), '2D3648')
  currency(ws, 'H')

  equipos.forEach((e, i) => {
    const row = ws.addRow({
      codigo:          e.codigo ?? '',
      nombre:          e.nombre,
      categoria:       e.categoria ?? '',
      estado:          e.estado,
      stock_actual:    e.stock_actual,
      stock_minimo:    e.stock_minimo,
      unidad:          e.unidad,
      precio_unitario: e.precio_unitario,
      marca:           e.marca ?? '',
      modelo:          e.modelo ?? '',
      serie:           e.serie ?? '',
      descripcion:     e.descripcion ?? '',
      ubicacion:       e.ubicacion ?? '',
    })
    dataStyle(row, i % 2 === 0)

    // Colorear fila si bajo stock
    if (e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo) {
      row.getCell('E').font = { bold: true, color: argb('DC2626'), size: 10 }
    }
  })

  // Totales
  const lastRow = ws.rowCount + 1
  const totalRow = ws.addRow({
    codigo: 'TOTAL',
    nombre: `${equipos.length} ítems`,
  })
  totalRow.font = { bold: true, size: 10 }
  totalRow.height = 18

  void lastRow

  download(wb, `Materiales_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── 2. EXPORTAR PEDIDOS + DETALLE ─────────────────────────────────────────────
export async function exportPedidos(): Promise<void> {
  // Traer TODOS los pedidos (sin paginación) + todos sus ítems
  const [pedidosRes, itemsRes] = await Promise.all([
    supabase
      .from('almacen_pedidos')
      .select('*')
      .order('numero', { ascending: true }),
    supabase
      .from('almacen_pedido_items')
      .select('*, equipo:almacen_equipos(nombre)')
      .order('pedido_id')
      .order('sort_order'),
  ])

  const pedidos = (pedidosRes.data ?? []) as AlmacenPedido[]
  const items   = (itemsRes.data  ?? []) as (AlmacenPedidoItem & { equipo: { nombre: string } | null })[]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'CORSUSA'
  wb.created = new Date()

  // ── Hoja 1: Pedidos ───────────────────────────────────────────
  const wsPed = wb.addWorksheet('Pedidos', { views: [{ state: 'frozen', ySplit: 1 }] })
  wsPed.columns = [
    { header: 'N°',                key: 'numero',             width: 8  },
    { header: 'Solicitado por',    key: 'solicitado_por',     width: 24 },
    { header: 'Proveedor suger.', key: 'proveedor_sugerido', width: 24 },
    { header: 'Estado',            key: 'estado',             width: 16 },
    { header: 'Fecha pedido',      key: 'fecha_pedido',       width: 14 },
    { header: 'Fecha requerida',   key: 'fecha_requerida',    width: 15 },
    { header: 'Observaciones',     key: 'observaciones',      width: 36 },
  ]
  headerStyle(wsPed, wsPed.getRow(1), 'C2410C')

  pedidos.forEach((p, i) => {
    const row = wsPed.addRow({
      numero:             p.numero,
      solicitado_por:     p.solicitado_por ?? '',
      proveedor_sugerido: p.proveedor_sugerido ?? '',
      estado:             p.estado,
      fecha_pedido:       p.fecha_pedido,
      fecha_requerida:    p.fecha_requerida ?? '',
      observaciones:      p.observaciones ?? '',
    })
    dataStyle(row, i % 2 === 0)
  })

  // ── Hoja 2: Detalle de ítems ──────────────────────────────────
  const wsDet = wb.addWorksheet('Detalle ítems', { views: [{ state: 'frozen', ySplit: 1 }] })
  wsDet.columns = [
    { header: 'N° Pedido',       key: 'numero',            width: 10 },
    { header: 'Solicitado por',  key: 'solicitado_por',    width: 22 },
    { header: 'Estado pedido',   key: 'estado',            width: 14 },
    { header: 'Descripción',     key: 'descripcion',       width: 32 },
    { header: 'Material',        key: 'equipo',            width: 28 },
    { header: 'Cantidad',        key: 'cantidad',          width: 11 },
    { header: 'Cant. aprobada',  key: 'cantidad_aprobada', width: 13 },
    { header: 'Unidad',          key: 'unidad',            width: 10 },
    { header: 'Precio unit.',    key: 'precio_unitario',   width: 13 },
    { header: 'Total',           key: 'total',             width: 13 },
    { header: 'Observación',     key: 'observacion',       width: 30 },
  ]
  headerStyle(wsDet, wsDet.getRow(1), 'C2410C')
  currency(wsDet, 'I')
  currency(wsDet, 'J')

  // Mapa número de pedido → pedido
  const pedidoMap = new Map(pedidos.map(p => [p.id, p]))

  items.forEach((it, i) => {
    const pedido = pedidoMap.get(it.pedido_id)
    const total = it.cantidad * it.precio_unitario
    const row = wsDet.addRow({
      numero:            pedido?.numero ?? '',
      solicitado_por:    pedido?.solicitado_por ?? '',
      estado:            pedido?.estado ?? '',
      descripcion:       it.descripcion,
      equipo:            it.equipo?.nombre ?? '',
      cantidad:          it.cantidad,
      cantidad_aprobada: it.cantidad_aprobada ?? '',
      unidad:            it.unidad,
      precio_unitario:   it.precio_unitario,
      total,
      observacion:       it.observacion ?? '',
    })
    dataStyle(row, i % 2 === 0)
  })

  // Fila de totales en detalle
  const totalDet = wsDet.addRow({
    descripcion: `${items.length} ítems`,
    total: items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0),
  })
  totalDet.font = { bold: true, size: 10 }
  totalDet.getCell('J').numFmt = '"S/"#,##0.00'

  download(wb, `Pedidos_${new Date().toISOString().split('T')[0]}.xlsx`)
}
