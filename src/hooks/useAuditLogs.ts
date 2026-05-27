import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface AuditLog {
  id: string
  user_email: string | null
  user_name:  string | null
  action:     string
  entity_type: string
  entity_id:   string | null
  entity_name: string | null
  details:     Record<string, unknown> | null
  created_at:  string
}

export function useAuditLogs(limit = 10) {
  const [logs,    setLogs]    = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      setLogs((data as AuditLog[]) || [])
      setLoading(false)
    }
    fetchLogs()

    const channel = supabase
      .channel('audit_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, payload => {
        setLogs(prev => [payload.new as AuditLog, ...prev.slice(0, limit - 1)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [limit])

  return { logs, loading }
}
