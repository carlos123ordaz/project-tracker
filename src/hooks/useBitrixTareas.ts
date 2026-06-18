import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL

export interface BitrixTarea {
  id: string
  title: string
  status: string
  stage_id: string
  stage_name: string
  priority: string
  responsible_name: string
  created_by_name: string
  created_date: string
  deadline: string
  description: string
}

export interface BitrixStage {
  id: string
  name: string
  color: string
}

interface ApiResponse {
  source: 'cache' | 'bitrix'
  group_id: string
  group_name: string
  last_sync: string
  total: number
  stages: BitrixStage[]
  tareas: BitrixTarea[]
}

export interface BitrixState {
  tareas: BitrixTarea[]
  stages: BitrixStage[]
  groupName: string
  lastSync: string
  source: 'cache' | 'bitrix' | ''
  loading: boolean
  syncing: boolean
  error: string
  sync: () => Promise<void>
}

export function useBitrixTareas(groupId: string): BitrixState {
  const [tareas, setTareas]       = useState<BitrixTarea[]>([])
  const [stages, setStages]       = useState<BitrixStage[]>([])
  const [groupName, setGroupName] = useState('')
  const [lastSync, setLastSync]   = useState('')
  const [source, setSource]       = useState<'cache' | 'bitrix' | ''>('')
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)
  const [error, setError]         = useState('')

  const load = useCallback(async (forceSync = false) => {
    if (forceSync) setSyncing(true)
    else setLoading(true)
    setError('')
    try {
      const res = forceSync
        ? await fetch(`${API_BASE}/bitrix/tareas/${groupId}/sync`, { method: 'POST' })
        : await fetch(`${API_BASE}/bitrix/tareas/${groupId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Error ${res.status}`)
      }
      const data: ApiResponse = await res.json()
      setTareas(data.tareas)
      setStages(data.stages || [])
      setGroupName(data.group_name || `Grupo ${groupId}`)
      setLastSync(data.last_sync)
      setSource(data.source)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [groupId])

  useEffect(() => {
    setTareas([])
    setStages([])
    setGroupName('')
    setLastSync('')
    setSource('')
    setError('')
    load()
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { tareas, stages, groupName, lastSync, source, loading, syncing, error, sync: () => load(true) }
}
