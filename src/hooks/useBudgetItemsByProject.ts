import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { BudgetItem } from '../lib/types'

export function useBudgetItemsByProject(projectId: string | null) {
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) { setItems([]); return }
    let cancelled = false
    setLoading(true)

    async function fetch() {
      const { data: budgets } = await supabase
        .from('budgets')
        .select('id')
        .eq('project_id', projectId)

      if (cancelled) return
      if (!budgets || budgets.length === 0) { setItems([]); setLoading(false); return }

      const budgetIds = budgets.map(b => b.id)
      const { data } = await supabase
        .from('budget_items')
        .select('*')
        .in('budget_id', budgetIds)
        .eq('type', 'item')
        .order('sort_order')

      if (!cancelled) {
        setItems(data || [])
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [projectId])

  return { items, loading }
}
