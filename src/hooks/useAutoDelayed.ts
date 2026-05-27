import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useAutoDelayed(onUpdated?: (count: number) => void) {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const detectAndUpdate = async () => {
      const today = new Date().toISOString().split('T')[0]

      // Buscar tareas activas cuya fecha fin ya pasó
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .lt('end_date', today)
        .not('status', 'in', '("Completado","Retrasado")')
        .not('end_date', 'is', null)

      if (error || !data || data.length === 0) return

      const ids = data.map(t => t.id)

      await supabase
        .from('tasks')
        .update({ status: 'Retrasado' })
        .in('id', ids)

      onUpdated?.(ids.length)
    }

    detectAndUpdate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
