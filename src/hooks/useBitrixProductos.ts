import { useState, useEffect, useMemo } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface BitrixProducto {
  id: string
  name: string
  code: string | null
  active: string
  section_id: string | null
  section_name: string | null
  parent_section_id: string | null
  parent_section_name: string | null
}

export function useBitrixProductos() {
  const [allRaw, setAllRaw] = useState<BitrixProducto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/bitrix/productos?seccion=Proy`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { productos?: BitrixProducto[] } | BitrixProducto[]) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : (data as { productos?: BitrixProducto[] }).productos ?? []
          setAllRaw(list)
        }
      })
      .catch(e => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const productos = useMemo(() =>
    allRaw
      .filter(p => p.active === 'Y')
      .sort((a, b) => {
        const sa = a.section_name ?? ''
        const sb = b.section_name ?? ''
        if (sa !== sb) return sa.localeCompare(sb)
        return (a.name ?? '').localeCompare(b.name ?? '')
      }),
    [allRaw],
  )

  const productosPIC = useMemo(() =>
    productos.filter(p =>
      p.parent_section_name?.includes('Proy PIC') ||
      p.section_name?.includes('Proy PIC'),
    ),
    [productos],
  )

  const productosPAU = useMemo(() =>
    productos.filter(p =>
      p.parent_section_name?.includes('Proy PAU') ||
      p.section_name?.includes('Proy PAU'),
    ),
    [productos],
  )

  const allProductos = productos

  return { productos, productosPIC, productosPAU, allProductos, loading, error }
}
