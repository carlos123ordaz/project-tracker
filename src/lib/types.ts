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
