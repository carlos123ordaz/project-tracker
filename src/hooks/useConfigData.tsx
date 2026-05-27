import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useTaskStatuses, useTaskPriorities, useTaskTypes, useTeamMembers } from './useConfig'
import type { TaskType } from './useConfig'
import { getInitials, getMemberColor, daysFromToday } from '../lib/helpers'
import type { Task, Project } from '../lib/types'

export interface StatusObj {
  id: string; name: string; bg: string; dot: string; sort_order: number
}

export interface PriorityObj {
  id: string; name: string; bg: string; fg: string; sort_order: number
}

export interface MemberObj {
  id: string; name: string; initials: string; color: string; role: string; email: string | null
}

export interface ProjectMetrics {
  total: number; completed: number; late: number; pending: number
  progress: number; totalBudget: number; totalCost: number
}

export type SemKind = 'green' | 'amber' | 'red' | 'gray'
export interface SemaphoreResult { kind: SemKind; label: string }

interface Ctx {
  statuses: StatusObj[]
  priorities: PriorityObj[]
  types: TaskType[]
  team: MemberObj[]
  loading: boolean
  getStatus: (name: string) => StatusObj | undefined
  getPriority: (name: string) => PriorityObj | undefined
  getMember: (nameOrId: string) => MemberObj | undefined
  projectMetrics: (project: Project, tasks: Task[]) => ProjectMetrics
  semaphoreFor: (project: Project, tasks: Task[]) => SemaphoreResult
}

const PRIORITY_FG: Record<string, string> = {
  'Crítica': '#B91C1C', 'Alta': '#C2410C', 'Media': '#B45309', 'Baja': '#4338CA',
}

const ConfigCtx = createContext<Ctx | null>(null)

export function ConfigDataProvider({ children }: { children: ReactNode }) {
  const { items: rawStatuses,   loading: sl } = useTaskStatuses()
  const { items: rawPriorities, loading: pl } = useTaskPriorities()
  const { items: types,         loading: tl } = useTaskTypes()
  const { items: rawTeam,       loading: ml } = useTeamMembers()

  const statuses = useMemo<StatusObj[]>(() =>
    rawStatuses.map(s => ({ id: s.id, name: s.name, bg: s.color, dot: s.dot_color, sort_order: s.sort_order }))
  , [rawStatuses])

  const priorities = useMemo<PriorityObj[]>(() =>
    rawPriorities.map(p => ({
      id: p.id, name: p.name, bg: p.color,
      fg: PRIORITY_FG[p.name] || '#374151',
      sort_order: p.sort_order,
    }))
  , [rawPriorities])

  const team = useMemo<MemberObj[]>(() =>
    rawTeam.map((m, idx) => ({
      id: m.id, name: m.name, role: m.role, email: m.email,
      initials: getInitials(m.name),
      color: getMemberColor(idx),
    }))
  , [rawTeam])

  function getStatus(name: string)    { return statuses.find(s => s.name === name) }
  function getPriority(name: string)  { return priorities.find(p => p.name === name) }
  function getMember(nameOrId: string){ return team.find(m => m.id === nameOrId || m.name === nameOrId) }

  function projectMetrics(project: Project, tasks: Task[]): ProjectMetrics {
    const ts = tasks.filter(t => t.project_id === project.id)
    const total     = ts.length
    const completed = ts.filter(t => t.status === 'Completado').length
    const late      = ts.filter(t => t.status === 'Retrasado').length
    const pending   = total - completed
    const progress  = total === 0 ? 0 : ts.reduce((s, t) => s + (t.progress || 0), 0) / total
    const totalBudget = ts.reduce((s, t) => s + (t.budget || 0), 0)
    const totalCost   = ts.reduce((s, t) => s + (t.actual_cost || 0), 0)
    return { total, completed, late, pending, progress, totalBudget, totalCost }
  }

  function semaphoreFor(project: Project, tasks: Task[]): SemaphoreResult {
    const m = projectMetrics(project, tasks)
    if (m.total === 0) return { kind: 'gray', label: 'Sin planificar' }
    const dueDays = daysFromToday(project.end_date)
    const lateRate = m.total ? m.late / m.total : 0
    if (lateRate > 0.30 || (dueDays !== null && dueDays < 0)) return { kind: 'red',   label: 'Crítico' }
    if (m.late > 0 || (dueDays !== null && dueDays <= 7))     return { kind: 'amber', label: 'En riesgo' }
    return { kind: 'green', label: 'En curso' }
  }

  const value = useMemo<Ctx>(() => ({
    statuses, priorities, types, team,
    loading: sl || pl || tl || ml,
    getStatus, getPriority, getMember,
    projectMetrics, semaphoreFor,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [statuses, priorities, types, team, sl, pl, tl, ml])

  return <ConfigCtx.Provider value={value}>{children}</ConfigCtx.Provider>
}

export function useConfigData(): Ctx {
  const ctx = useContext(ConfigCtx)
  if (!ctx) throw new Error('useConfigData must be inside ConfigDataProvider')
  return ctx
}
