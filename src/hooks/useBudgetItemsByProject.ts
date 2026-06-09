import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { PickableItem } from '../lib/types'

async function fetchAllResources(): Promise<PickableItem[]> {
  const { data } = await supabase
    .from('budget_resources')
    .select('id, name, unit, kind')
    .order('kind')
    .order('name')
    .limit(5000)
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    code: null,
    subtitle: r.kind,
  }))
}

export function useBudgetItemsByProject(projectId: string | null) {
  const [items, setItems] = useState<PickableItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isGlobal, setIsGlobal] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetch() {
      // No project → show global resources catalog
      if (!projectId) {
        const all = await fetchAllResources()
        if (!cancelled) { setItems(all); setIsGlobal(true); setLoading(false) }
        return
      }

      const { data: budgets } = await supabase
        .from('budgets')
        .select('id')
        .eq('project_id', projectId)

      if (cancelled) return

      // Project has no budgets → fall back to global resources catalog
      if (!budgets || budgets.length === 0) {
        const all = await fetchAllResources()
        if (!cancelled) { setItems(all); setIsGlobal(true); setLoading(false) }
        return
      }

      const budgetIds = budgets.map(b => b.id)
      const { data } = await supabase
        .from('budget_items')
        .select('id, name, unit, code, description')
        .in('budget_id', budgetIds)
        .eq('type', 'item')
        .order('sort_order')
        .limit(5000)

      if (!cancelled) {
        setItems((data || []).map(bi => ({
          id: bi.id,
          name: bi.name,
          unit: bi.unit,
          code: bi.code,
          subtitle: bi.description,
        })))
        setIsGlobal(false)
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [projectId])

  return { items, loading, isGlobal }
}
