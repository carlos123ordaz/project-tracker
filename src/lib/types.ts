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
