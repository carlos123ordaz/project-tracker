import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL

export interface Activity {
  id: string
  type_id: string       // '1'=Reunion, '2'=Llamada, '8'=Visita
  subject: string
  completed: string     // 'Y' | 'N'
  created: string
  end_time: string
  responsible_id: string
  responsible_name: string
  owner_type_id: string
  owner_id: string
}

interface ApiResponse {
  source: 'cache' | 'bitrix'
  last_sync: string
  total: number
  activities: Activity[]
}

export interface ActivitiesState {
  activities: Activity[]
  lastSync: string
  source: 'cache' | 'bitrix' | ''
  loading: boolean
  syncing: boolean
  error: string
  sync: () => Promise<void>
}

export function useActivities(): ActivitiesState {
  const [activities, setActivities] = useState<Activity[]>([])
  const [lastSync, setLastSync]     = useState('')
  const [source, setSource]         = useState<'cache' | 'bitrix' | ''>('')
  const [loading, setLoading]       = useState(true)
  const [syncing, setSyncing]       = useState(false)
  const [error, setError]           = useState('')

  const load = useCallback(async (forceSync = false) => {
    if (forceSync) setSyncing(true)
    else setLoading(true)
    setError('')
    try {
      const res = forceSync
        ? await fetch(`${API_BASE}/bitrix/activities/sync`, { method: 'POST' })
        : await fetch(`${API_BASE}/bitrix/activities`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { detail?: string }).detail || `Error ${res.status}`)
      }
      const data: ApiResponse = await res.json()
      setActivities(data.activities)
      setLastSync(data.last_sync)
      setSource(data.source)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { activities, lastSync, source, loading, syncing, error, sync: () => load(true) }
}
