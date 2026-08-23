export type TaskStatus = 'No Iniciado' | 'En Progreso' | 'Retrasado' | 'Completado'
export type TaskPriority = 'Crítica' | 'Alta' | 'Media' | 'Baja'
export type FocusArea = 'Proyectos' | 'Ingeniería' | 'Otro'

export interface Project {
  id: string
  name: string
  focus_area: FocusArea
  initiative: string
  leader: string
  start_date: string | null
  end_date: string | null
  color: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  number: number
  type: string
  name: string
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  assigned_to: string | null
  budget: number
  actual_cost: number
  progress: number
  label: string | null
  notes: string | null
  sort_order?: number
  created_by: string | null
  created_at: string
  updated_at: string
  project?: Project
}

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedTasks: number
  delayedTasks: number
  totalBudget: number
  totalCost: number
}

export type BudgetStatus = 'Borrador' | 'Revisión' | 'Aprobado' | 'Ejecutando' | 'Cerrado'
export type ResourceKind = 'material' | 'labor' | 'equipment' | 'subcontrato'
export type GGRubroId = 'gestion' | 'garantias' | 'ensayos' | 'personal_tec' | 'personal_adm' | 'servicios' | 'oficina'

export interface Budget {
  id: string
  project_id: string | null
  name: string
  client: string
  status: BudgetStatus
  currency: string
  indirect_pct: number
  utility_pct: number
  igv_pct: number
  gg_months: number
  created_at: string
  updated_at: string
}

export interface GGItem {
  id: string
  budget_id: string
  rubro: GGRubroId
  code: string
  name: string
  unit: string
  qty: number
  unit_price: number
  months: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BudgetItem {
  id: string
  budget_id: string
  parent_id: string | null
  type: 'group' | 'item'
  code: string
  name: string
  unit: string
  qty: number
  unit_price: number
  description: string
  rendimiento: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BudgetResource {
  id: string
  kind: ResourceKind
  name: string
  unit: string
  price: number
  sort_order: number
  categoria: string | null
  created_at: string
}

export interface PickableItem {
  id: string
  name: string
  unit: string
  code?: string | null
  subtitle?: string | null
}

export interface ApuLine {
  id: string
  item_id: string
  resource_id: string
  qty: number
  created_at: string
  resource?: BudgetResource
}

export type PeriodType = 'day' | 'week' | 'month'

export interface Schedule {
  id: string
  budget_id: string
  name: string
  start_date: string
  end_date: string
  period_type: PeriodType
  created_at: string
  updated_at: string
}

export interface ScheduleTask {
  id: string
  schedule_id: string
  item_id: string
  start_date: string
  end_date: string
  created_at: string
}

export interface ScheduleActual {
  id: string
  schedule_id: string
  item_id: string
  period_date: string
  executed_amount: number
  created_at: string
}

// ── Valorizaciones ────────────────────────────────────────────

export type ValuationStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Pagada'

export const VALUATION_STATUSES: ValuationStatus[] = ['Borrador', 'Enviada', 'Aprobada', 'Pagada']

export interface Valuation {
  id: string
  project_id: string
  number: number
  title: string | null
  period_start: string
  period_end: string
  status: ValuationStatus
  contract_amount: number
  advance_pct: number
  retention_pct: number
  igv_rate: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ValuationItem {
  id: string
  valuation_id: string
  code: string
  description: string
  unit: string
  unit_price: number
  quantity_contract: number
  quantity_previous: number
  quantity_current: number
  sort_order: number
  created_at: string
}

// ── RRHH ──────────────────────────────────────────────────────

export type Shift = 'Día' | 'Noche'

export type AttendanceCondition =
  | 'Asistencia'
  | 'Falta'
  | 'Descanso Médico'
  | 'Enfermedad'
  | 'Días Compensados'
  | 'Vacaciones'
  | 'Permiso'

export const ATTENDANCE_CONDITIONS: AttendanceCondition[] = [
  'Asistencia', 'Falta', 'Descanso Médico', 'Enfermedad', 'Días Compensados', 'Vacaciones', 'Permiso',
]

export type AttendanceMotive =
  | 'Ninguno'
  | 'Enfermedad común'
  | 'Accidente laboral'
  | 'Descanso médico'
  | 'Descanso por trabajo'
  | 'Vacaciones'
  | 'Permiso personal'
  | 'Capacitación'
  | 'Comisión de servicio'

export const ATTENDANCE_MOTIVES: AttendanceMotive[] = [
  'Ninguno',
  'Enfermedad común',
  'Accidente laboral',
  'Descanso médico',
  'Descanso por trabajo',
  'Vacaciones',
  'Permiso personal',
  'Capacitación',
  'Comisión de servicio',
]

export const MODULES_LIST = [
  { key: 'proyectos',     label: 'Proyectos' },
  { key: 'ingenieria',    label: 'Ingeniería' },
  { key: 'presupuestos',  label: 'Presupuestos' },
  { key: 'cronogramas',   label: 'Cronogramas' },
  { key: 'compras',       label: 'Compras' },
  { key: 'rrhh',          label: 'RRHH' },
  { key: 'configuracion', label: 'Configuración' },
] as const

export const SCREENS_LIST: { group: string; screens: { key: string; label: string; path: string }[] }[] = [
  {
    group: 'Proyectos',
    screens: [
      { key: 'proyectos:dashboard',     label: 'Dashboard',          path: '/dashboard' },
      { key: 'proyectos:mis-proyectos', label: 'Mis Proyectos',      path: '/projects' },
      { key: 'proyectos:kanban',        label: 'Kanban',             path: '/kanban' },
      { key: 'proyectos:timeline',      label: 'Timeline',           path: '/timeline' },
      { key: 'proyectos:consolidado',   label: 'Consolidado',        path: '/consolidated' },
      { key: 'proyectos:calendario',    label: 'Calendario',         path: '/calendar' },
      { key: 'proyectos:overview',      label: 'Overview',           path: '/overview' },
      { key: 'proyectos:ejecucion',     label: 'Proy. Ejecución',   path: '/ingenieria/tareas/362' },
      { key: 'proyectos:programar',     label: 'Programar',          path: '/schedule' },
    ],
  },
  {
    group: 'Ventas',
    screens: [
      { key: 'ventas:presupuestos',     label: 'Presupuestos',       path: '/budgets' },
      { key: 'ventas:libro',            label: 'Libro',              path: '/libro' },
      { key: 'ventas:cotizaciones',     label: 'Cotizaciones',       path: '/cotizaciones' },
      { key: 'ventas:horas-hombre',     label: 'Horas Hombre',       path: '/cotizaciones/personal' },
      { key: 'ventas:proy-cotizaciones', label: 'Proy. Cotizaciones', path: '/ingenieria/tareas/316' },
    ],
  },
  {
    group: 'Compras',
    screens: [
      { key: 'compras:comparativos',    label: 'Comparativos',           path: '/compras' },
      { key: 'compras:proveedores',     label: 'Proveedores',            path: '/compras/proveedores' },
      { key: 'compras:seguimiento',     label: 'Seguimiento Gestión',    path: '/compras/seguimiento' },
      { key: 'compras:bom',             label: 'Solicitud Compra BOM',   path: '/compras/bom' },
      { key: 'compras:solicitudes',     label: 'Solicitudes Boletos',    path: '/compras/solicitudes' },
      { key: 'compras:locales',         label: 'Compras Locales',        path: '/compras/tareas/91' },
      { key: 'compras:locales-dash',   label: 'Dashboard Compras',      path: '/compras/tareas/91/dashboard' },
      { key: 'compras:importaciones',   label: 'Importaciones',          path: '/compras/tareas/85' },
    ],
  },
  {
    group: 'RRHH',
    screens: [
      { key: 'rrhh:equipo',       label: 'Equipo',        path: '/rrhh/equipo' },
      { key: 'rrhh:asistencia',   label: 'Asistencia',    path: '/rrhh/asistencia' },
      { key: 'rrhh:dashboard-hh', label: 'Dashboard HH',  path: '/rrhh/hh' },
    ],
  },
  {
    group: 'Comercial',
    screens: [
      { key: 'comercial:deals',     label: 'Deals CRM',  path: '/comercial/deals' },
      { key: 'comercial:dashboard', label: 'Dashboard',   path: '/comercial/deals/dashboard' },
    ],
  },
  {
    group: 'Almacén',
    screens: [
      { key: 'almacen:dashboard',    label: 'Dashboard',             path: '/almacen' },
      { key: 'almacen:equipos',      label: 'Equipos & Consumibles', path: '/almacen/equipos' },
      { key: 'almacen:kardex',       label: 'Kardex',                path: '/almacen/kardex' },
      { key: 'almacen:ubicaciones',  label: 'Ubicaciones',           path: '/almacen/ubicaciones' },
      { key: 'almacen:pedidos',      label: 'Pedidos',               path: '/almacen/pedidos' },
      { key: 'almacen:recepciones',  label: 'Recepciones',           path: '/almacen/recepciones' },
      { key: 'almacen:despachos',    label: 'Despachos',             path: '/almacen/despachos' },
    ],
  },
  {
    group: 'Configuración',
    screens: [
      { key: 'configuracion:settings', label: 'Configuración', path: '/settings' },
    ],
  },
]

// ── Compras ───────────────────────────────────────────────────

export type ComparisonStatus = 'Borrador' | 'En Evaluación' | 'Aprobado' | 'Cerrado'
export const COMPARISON_STATUSES: ComparisonStatus[] = ['Borrador', 'En Evaluación', 'Aprobado', 'Cerrado']

export interface Article {
  id: string
  code: string | null
  name: string
  description: string | null
  unit: string
  category: string | null
  notes: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  ruc: string | null
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PurchaseComparison {
  id: string
  number: number
  title: string
  status: ComparisonStatus
  currency: string
  notes: string | null
  project_id: string | null
  created_at: string
  updated_at: string
}

export interface ComparisonItem {
  id: string
  comparison_id: string
  article_id: string | null
  budget_item_id: string | null
  description: string
  unit: string
  quantity: number
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ComparisonSupplier {
  id: string
  comparison_id: string
  supplier_id: string | null
  supplier_name: string
  sort_order: number
  created_at: string
}

export interface ComparisonQuote {
  id: string
  comparison_id: string
  item_id: string
  comparison_supplier_id: string
  unit_price: number
  delivery_days: number | null
  notes: string | null
  is_selected: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  check_in_time: string | null
  check_out_time: string | null
  shift: Shift
  is_superadmin: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ModulePermission {
  id: string
  user_id: string
  module: string
  can_view: boolean
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  date: string
  collaborator_id: string
  collaborator_name: string
  project_id: string | null
  project_name: string | null
  project_type: string | null
  shift: Shift
  check_in_time: string | null
  check_out_time: string | null
  scheduled_hours: number
  real_hours: number
  extra_hours: number
  condition: AttendanceCondition
  motive: AttendanceMotive
  observations: string
  check_in_lat: number | null
  check_in_lng: number | null
  check_in_accuracy: number | null
  check_out_lat: number | null
  check_out_lng: number | null
  check_out_accuracy: number | null
  created_at: string
  updated_at: string
}

export interface GpsCoords {
  lat: number
  lng: number
  accuracy: number
}

// ── Cotizaciones ─────────────────────────────────────────────────────────────

export type CotizacionStatus = 'Borrador' | 'En revisión' | 'Enviada' | 'Aprobada' | 'Rechazada'
export type CotizacionSegmento = 'A' | 'B' | 'C'
export type DisciplinaTipo = 'obras_provisionales' | 'obras_civiles' | 'obras_mecanicas' | 'obras_electricas' | 'automatizacion'
export type PartidaTipo = 'mo' | 'material' | 'viatico' | 'epp' | 'subcontrato' | 'otro'

export const COTIZACION_STATUSES: CotizacionStatus[] = ['Borrador', 'En revisión', 'Enviada', 'Aprobada', 'Rechazada']
export const DISCIPLINAS_CONFIG: { tipo: DisciplinaTipo; nombre: string; orden: number; margen_pct: number }[] = [
  { tipo: 'obras_provisionales', nombre: 'Obras Provisionales', orden: 1, margen_pct: 20 },
  { tipo: 'obras_civiles',       nombre: 'Obras Civiles',       orden: 2, margen_pct: 20 },
  { tipo: 'obras_mecanicas',     nombre: 'Obras Mecánicas',     orden: 3, margen_pct: 20 },
  { tipo: 'obras_electricas',    nombre: 'Obras Eléctricas',    orden: 4, margen_pct: 20 },
  { tipo: 'automatizacion',      nombre: 'Aut. & Control',      orden: 5, margen_pct: 0  },
]

export interface PersonalTarifa {
  id: string
  perfil: string
  tipo_contrato: 'Planilla' | 'Recibo'
  factor_empresa: number
  sueldo_seg_a: number
  sueldo_seg_b: number
  sueldo_seg_c: number
  orden: number
  activo: boolean
  created_at: string
}

export interface Cotizacion {
  id: string
  numero: number
  titulo: string
  cliente: string | null
  proyecto: string | null
  ubicacion: string | null
  descripcion: string | null
  segmento: CotizacionSegmento
  tipo_cambio: number
  status: CotizacionStatus
  plazo_semanas: number | null
  garantia_meses: number
  validez_dias: number
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CotizacionDisciplina {
  id: string
  cotizacion_id: string
  tipo: DisciplinaTipo
  nombre: string
  imprevistos_pct: number
  margen_pct: number
  orden: number
  created_at: string
}

export interface CotizacionSeccion {
  id: string
  disciplina_id: string
  codigo: string | null
  nombre: string
  orden: number
  created_at: string
}

export interface CotizacionPartida {
  id: string
  seccion_id: string
  disciplina_id: string
  tipo: PartidaTipo
  codigo: string | null
  descripcion: string
  area: string | null
  producto_bitrix: string | null
  perfil_id: string | null
  personas: number
  dias: number
  unidad: string
  metrado: number
  precio_unitario: number
  costo_compra: number
  notas: string | null
  orden: number
  created_at: string
  updated_at: string
  // joined
  perfil?: PersonalTarifa | null
}

// ── Gastos Generales ──────────────────────────────────────────────────────────
export interface GastoGeneral {
  id: string
  cotizacion_id: string
  categoria: 'Variables' | 'Fijos'
  descripcion: string
  unidad: string
  tiempo_pct: number
  cantidad: number
  mensual_usd: number
  orden: number
  created_at: string
}

// ── Cronograma ────────────────────────────────────────────────────────────────
export type CronogramaTipo = 'tarea' | 'hito' | 'entregable'

export interface CronogramaItem {
  id: string
  cotizacion_id: string
  item: number
  descripcion: string
  semana_inicio: number
  semana_fin: number
  tipo: CronogramaTipo
  color: string | null
  orden: number
  created_at: string
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────
export interface CashFlowEgreso {
  id: string
  cotizacion_id: string
  descripcion: string
  periodos: number[]   // array de hasta 20 montos mensuales
  orden: number
  created_at: string
}

export interface CashFlowIngreso {
  id: string
  cotizacion_id: string
  descripcion: string
  porcentaje: number
  periodos: number[]
  orden: number
  created_at: string
}

// ── Generic Form System ───────────────────────────────────────────────────────
export interface FormDef {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FormField {
  id: string
  form_id: string
  order_index: number
  label: string
  field_key: string
  field_type: 'radio' | 'checkbox' | 'text' | 'textarea' | 'date' | 'time' | 'select' | 'passenger_list'
  options: { label: string; value: string }[]
  required: boolean
  placeholder: string | null
  help_text: string | null
  conditional_on_key: string | null
  conditional_on_value: string | null
}

export type SubmissionStatus = 'Pendiente' | 'En proceso' | 'Completado' | 'Cancelado'
export const SUBMISSION_STATUSES: SubmissionStatus[] = ['Pendiente', 'En proceso', 'Completado', 'Cancelado']

// ── Almacén ───────────────────────────────────────────────────────────────────

export type AlmacenEquipoEstado = 'Activo' | 'Inactivo' | 'En Reparación' | 'Dado de Baja'
export const ALMACEN_EQUIPO_ESTADOS: AlmacenEquipoEstado[] = ['Activo', 'Inactivo', 'En Reparación', 'Dado de Baja']

export type AlmacenPedidoEstado =
  | 'En Revisión'
  | 'En Cotización'
  | 'Pendiente de Aprobación'
  | 'Aprobado'
  | 'OC Emitida'
  | 'En Tránsito'
  | 'Recibido Parcialmente'
  | 'Recibido'
  | 'Enviado'
  | 'Completado'
  | 'Cancelado'
export const ALMACEN_PEDIDO_ESTADOS: AlmacenPedidoEstado[] = [
  'En Revisión', 'En Cotización', 'Pendiente de Aprobación', 'Aprobado',
  'OC Emitida', 'En Tránsito', 'Recibido Parcialmente', 'Recibido',
  'Enviado', 'Completado', 'Cancelado',
]

export type AlmacenRecepcionEstado = 'Pendiente' | 'Parcial' | 'Completada'
export const ALMACEN_RECEPCION_ESTADOS: AlmacenRecepcionEstado[] = ['Pendiente', 'Parcial', 'Completada']

export type AlmacenDespachoEstado = 'Borrador' | 'Despachado' | 'Entregado' | 'Cancelado'
export const ALMACEN_DESPACHO_ESTADOS: AlmacenDespachoEstado[] = ['Borrador', 'Despachado', 'Entregado', 'Cancelado']

export type KardexTipo = 'Entrada' | 'Salida' | 'Ajuste' | 'Transferencia'

// ── WMS: Ubicaciones ──────────────────────────────────────────
export type AlmacenUbicacionTipo = 'Almacén' | 'Estante' | 'Bin' | 'Obra' | 'Taller' | 'Externo'
export const ALMACEN_UBICACION_TIPOS: AlmacenUbicacionTipo[] = ['Almacén', 'Estante', 'Bin', 'Obra', 'Taller', 'Externo']

export interface AlmacenUbicacion {
  id: string
  codigo: string | null
  nombre: string
  descripcion: string | null
  tipo: AlmacenUbicacionTipo
  activa: boolean
  sort_order: number
  created_at: string
}

export interface AlmacenStockUbicacion {
  id: string
  equipo_id: string
  ubicacion_id: string
  stock_actual: number
  updated_at: string
  equipo?: AlmacenEquipo | null
  ubicacion?: AlmacenUbicacion | null
}

export interface AlmacenEquipo {
  id: string
  codigo: string | null
  nombre: string
  descripcion: string | null
  categoria: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
  estado: AlmacenEquipoEstado
  ubicacion: string | null
  stock_actual: number
  stock_minimo: number
  unidad: string
  precio_unitario: number
  ficha_tecnica_url: string | null
  custom_fields: Record<string, unknown> | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AlmacenKardex {
  id: string
  equipo_id: string
  tipo: KardexTipo
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string | null
  referencia_tipo: string | null
  referencia_id: string | null
  observacion: string | null
  ubicacion_origen_id: string | null
  ubicacion_destino_id: string | null
  fecha: string
  created_by: string | null
  created_at: string
  equipo?: AlmacenEquipo
  ubicacion_origen?: { id: string; nombre: string } | null
  ubicacion_destino?: { id: string; nombre: string } | null
}

export interface AlmacenPedido {
  id: string
  numero: number
  proyecto_id: string | null
  solicitado_por: string | null
  asunto: string | null
  proveedor_sugerido: string | null
  estado: AlmacenPedidoEstado
  fecha_pedido: string
  fecha_requerida: string | null
  observaciones: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AlmacenPedidoItemEstado = 'Pendiente' | 'En Proceso' | 'Recibido' | 'Cancelado'
export const ALMACEN_PEDIDO_ITEM_ESTADOS: AlmacenPedidoItemEstado[] = ['Pendiente', 'En Proceso', 'Recibido', 'Cancelado']

export interface AlmacenPedidoItem {
  id: string
  pedido_id: string
  equipo_id: string | null
  descripcion: string
  cantidad: number
  cantidad_aprobada: number | null
  unidad: string
  precio_unitario: number
  observacion: string | null
  proveedor: string | null
  estado_item: AlmacenPedidoItemEstado | null
  fecha_requerida: string | null
  sort_order: number
  created_at: string
  equipo?: AlmacenEquipo | null
}

export interface AlmacenRecepcion {
  id: string
  numero: number
  pedido_id: string | null
  proveedor: string | null
  nro_factura: string | null
  guia_remision: string | null
  fecha_recepcion: string
  estado: AlmacenRecepcionEstado
  observaciones: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
  pedido?: AlmacenPedido | null
}

export interface AlmacenRecepcionItem {
  id: string
  recepcion_id: string
  equipo_id: string | null
  pedido_item_id: string | null
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  observacion: string | null
  ubicacion_destino_id: string | null
  sort_order: number
  created_at: string
  equipo?: AlmacenEquipo | null
  ubicacion_destino?: AlmacenUbicacion | null
}

export interface AlmacenDespacho {
  id: string
  numero: number
  pedido_id: string | null
  proyecto_id: string | null
  destinatario: string | null
  direccion: string | null
  movilidad: string | null
  conductor: string | null
  placa: string | null
  guia_remision: string | null
  fecha_despacho: string
  estado: AlmacenDespachoEstado
  observaciones: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AlmacenDespachoItem {
  id: string
  despacho_id: string
  equipo_id: string | null
  descripcion: string
  cantidad: number
  unidad: string
  observacion: string | null
  ubicacion_origen_id: string | null
  sort_order: number
  created_at: string
  equipo?: AlmacenEquipo | null
  ubicacion_origen?: AlmacenUbicacion | null
}

export interface FormSubmission {
  id: string
  form_id: string
  submitted_by: string | null
  submitter_name: string | null
  submitter_email: string | null
  answers: Record<string, string>
  status: SubmissionStatus
  notes: string | null
  created_at: string
  updated_at: string
}
