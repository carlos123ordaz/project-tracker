import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL

export interface Deal {
  id: string
  title: string
  stage_id: string
  stage_name: string
  stage_semantic_id: string   // 'F' = Perdido, 'S' = Ganado, 'P' = En proceso, '' = En proceso
  category_id: string
  category_name: string
  opportunity: string         // string desde CSV, parsear a float con parseFloat()
  currency_id: string
  probability: string         // string desde CSV, parsear a int
  assigned_by_name: string
  date_create: string
  date_modify: string
  closedate: string
  source_id: string
  source_name: string
  is_closed: string           // 'Y' | 'N'
  alcance_pau: string         // 'No llenado' | 'Si Incluye' | 'No incluye'
  alcance_pic: string         // 'No llenado' | 'Si Incluye' | 'No incluye'
  dept_cisac: string          // comma-separated: 'Ventas', 'Servicios', 'Proyectos', 'QHSE'
  company_id: string
  business_units: string      // comma-separated: 'UNAI', 'PROSER', 'UNAU', etc.
}

interface ApiResponse {
  source: 'cache' | 'bitrix'
  last_sync: string
  total: number
  deals: Deal[]
}

export interface DealsState {
  deals: Deal[]
  lastSync: string
  source: 'cache' | 'bitrix' | ''
  loading: boolean
  syncing: boolean
  error: string
  sync: () => Promise<void>
}

export function useDeals(): DealsState {
  const [deals, setDeals]     = useState<Deal[]>([])
  const [lastSync, setLastSync] = useState('')
  const [source, setSource]   = useState<'cache' | 'bitrix' | ''>('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError]     = useState('')

  const load = useCallback(async (forceSync = false) => {
    if (forceSync) setSyncing(true)
    else setLoading(true)
    setError('')
    try {
      const res = forceSync
        ? await fetch(`${API_BASE}/bitrix/deals/sync`, { method: 'POST' })
        : await fetch(`${API_BASE}/bitrix/deals`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { detail?: string }).detail || `Error ${res.status}`)
      }
      const data: ApiResponse = await res.json()
      setDeals(data.deals)
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

  return { deals, lastSync, source, loading, syncing, error, sync: () => load(true) }
}
