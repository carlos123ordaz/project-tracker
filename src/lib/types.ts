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
  { key: 'rrhh',          label: 'RRHH' },
  { key: 'configuracion', label: 'Configuración' },
] as const

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
  created_at: string
  updated_at: string
}
