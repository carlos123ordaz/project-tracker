import type { Budget, BudgetItem, BudgetResource, ApuLine, BudgetStatus } from './types'

export const BUDGET_STATUSES: { value: BudgetStatus; color: string; bg: string }[] = [
  { value: 'Borrador',   color: '#6B7280', bg: '#F3F4F6' },
  { value: 'Revisión',   color: '#D97706', bg: '#FEF3C7' },
  { value: 'Aprobado',   color: '#059669', bg: '#D1FAE5' },
  { value: 'Ejecutando', color: '#2563EB', bg: '#DBEAFE' },
  { value: 'Cerrado',    color: '#7C3AED', bg: '#EDE9FE' },
]

export const RESOURCE_KINDS: { value: string; label: string; color: string }[] = [
  { value: 'material',  label: 'Material',   color: '#2563EB' },
  { value: 'labor',     label: 'Mano de obra', color: '#D97706' },
  { value: 'equipment', label: 'Equipo',      color: '#7C3AED' },
]

export function getStatusMeta(status: string) {
  return BUDGET_STATUSES.find(s => s.value === status) ?? BUDGET_STATUSES[0]
}

export function getKindMeta(kind: string) {
  return RESOURCE_KINDS.find(k => k.value === kind) ?? RESOURCE_KINDS[0]
}

export function computeApuTotal(
  itemId: string,
  apuLines: ApuLine[],
  resourceMap: Map<string, BudgetResource>,
): number {
  return apuLines
    .filter(l => l.item_id === itemId)
    .reduce((sum, l) => {
      const res = resourceMap.get(l.resource_id)
      return sum + l.qty * (res?.price ?? 0)
    }, 0)
}

export function getItemUnitPrice(
  item: BudgetItem,
  apuLines: ApuLine[],
  resourceMap: Map<string, BudgetResource>,
): number {
  if (item.unit_price > 0) return item.unit_price
  return computeApuTotal(item.id, apuLines, resourceMap)
}

export function getGroupTotal(
  groupId: string,
  items: BudgetItem[],
  apuLines: ApuLine[],
  resourceMap: Map<string, BudgetResource>,
): number {
  return items
    .filter(it => it.parent_id === groupId && it.type === 'item')
    .reduce((sum, it) => sum + it.qty * getItemUnitPrice(it, apuLines, resourceMap), 0)
}

export interface BudgetTotals {
  direct: number
  indirect: number
  utility: number
  subtotal: number
  igv: number
  total: number
}

export function computeBudgetTotals(
  budget: Budget,
  items: BudgetItem[],
  apuLines: ApuLine[],
  resourceMap: Map<string, BudgetResource>,
): BudgetTotals {
  const direct = items
    .filter(it => it.type === 'item')
    .reduce((sum, it) => sum + it.qty * getItemUnitPrice(it, apuLines, resourceMap), 0)
  const indirect = direct * (budget.indirect_pct ?? 0.10)
  const utility  = direct * (budget.utility_pct  ?? 0.08)
  const subtotal = direct + indirect + utility
  const igv      = subtotal * (budget.igv_pct ?? 0.18)
  return { direct, indirect, utility, subtotal, igv, total: subtotal + igv }
}

export function fmtCurrency(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

export function fmtNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n)
}

export function buildResourceMap(resources: BudgetResource[]): Map<string, BudgetResource> {
  return new Map(resources.map(r => [r.id, r]))
}
