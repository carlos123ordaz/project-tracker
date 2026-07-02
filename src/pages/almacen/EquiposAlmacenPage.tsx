import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  Plus, Search, Package, AlertTriangle, Edit2, Trash2, X,
  ChevronRight, Download, FileText, Upload, Columns, ChevronUp, ChevronDown, TrendingUp,
} from 'lucide-react'
import { useAlmacenEquipos } from '../../hooks/useAlmacenEquipos'
import { useAlmacenUbicaciones } from '../../hooks/useAlmacenUbicaciones'
import { useAlmacenPrecioHistorial } from '../../hooks/useAlmacenPrecioHistorial'
import { supabase } from '../../lib/supabase'
import type { AlmacenEquipo, AlmacenEquipoEstado } from '../../lib/types'
import { ALMACEN_EQUIPO_ESTADOS } from '../../lib/types'
import { Pagination } from '../../components/ui/Pagination'
import { exportMateriales } from '../../lib/exportAlmacenExcel'

// ── Categorías ────────────────────────────────────────────────────────────────
const CATEGORIAS = ['Herramienta', 'Equipo Eléctrico', 'EPP', 'Material', 'Consumible', 'Vehículo', 'Servicio', 'Otro']

// ── Estado colors ─────────────────────────────────────────────────────────────
const estadoColor: Record<AlmacenEquipoEstado, { bg: string; color: string }> = {
  'Activo':       { bg: 'var(--green-50)',  color: 'var(--green-600)'  },
  'Inactivo':     { bg: 'var(--n-100)',     color: 'var(--n-500)'      },
  'En Reparación':{ bg: 'var(--amber-50)', color: 'var(--amber-600)'  },
  'Dado de Baja': { bg: 'var(--red-50)',    color: 'var(--red-600)'    },
}

// ── Definición de columnas built-in ───────────────────────────────────────────
type ColKey =
  | 'codigo' | 'nombre' | 'marca' | 'categoria' | 'estado'
  | 'stock_actual' | 'stock_minimo' | 'unidad' | 'ubicacion'
  | 'precio_unitario' | 'descripcion' | 'modelo' | 'serie' | 'ficha'

interface ColDef { key: ColKey; label: string; defaultVisible: boolean }

const COL_DEFS: ColDef[] = [
  { key: 'codigo',          label: 'Código',         defaultVisible: true  },
  { key: 'nombre',          label: 'Nombre',          defaultVisible: true  },
  { key: 'marca',           label: 'Marca',           defaultVisible: true  },
  { key: 'categoria',       label: 'Categoría',       defaultVisible: true  },
  { key: 'estado',          label: 'Estado',          defaultVisible: true  },
  { key: 'stock_actual',    label: 'Stock',           defaultVisible: true  },
  { key: 'stock_minimo',    label: 'Mínimo',          defaultVisible: true  },
  { key: 'unidad',          label: 'Unidad',          defaultVisible: true  },
  { key: 'ubicacion',       label: 'Ubicación',       defaultVisible: true  },
  { key: 'ficha',           label: 'Ficha técnica',   defaultVisible: true  },
  { key: 'precio_unitario', label: 'Precio unit.',    defaultVisible: false },
  { key: 'descripcion',     label: 'Descripción',     defaultVisible: false },
  { key: 'modelo',          label: 'Modelo',          defaultVisible: false },
  { key: 'serie',           label: 'N° Serie',        defaultVisible: false },
]

const BUILT_IN_KEY_SET = new Set<string>(COL_DEFS.map(c => c.key))
const BUILT_IN_COL_MAP = Object.fromEntries(COL_DEFS.map(c => [c.key, c]))

// ── Columnas personalizadas ───────────────────────────────────────────────────
interface CustomColDef { id: string; label: string; type: 'text' | 'number' }

// ── localStorage helpers ──────────────────────────────────────────────────────
const COL_VIS_KEY   = 'equipos_col_visibility_v1'
const COL_ORDER_KEY = 'equipos_col_order_v1'
const CUSTOM_KEY    = 'equipos_custom_cols_v1'

function loadCustomCols(): CustomColDef[] {
  try { const s = localStorage.getItem(CUSTOM_KEY); if (s) return JSON.parse(s) } catch {}
  return []
}
function loadColOrder(cc: CustomColDef[]): string[] {
  const allKeys = [...COL_DEFS.map(c => c.key as string), ...cc.map(c => c.id)]
  try {
    const s = localStorage.getItem(COL_ORDER_KEY)
    if (s) {
      const parsed: string[] = JSON.parse(s)
      const valid = new Set(allKeys)
      const filtered = parsed.filter(k => valid.has(k))
      const missing  = allKeys.filter(k => !filtered.includes(k))
      return [...filtered, ...missing]
    }
  } catch {}
  return allKeys
}
function loadColVis(cc: CustomColDef[]): Record<string, boolean> {
  const defaults: Record<string, boolean> = {
    ...Object.fromEntries(COL_DEFS.map(c => [c.key, c.defaultVisible])),
    ...Object.fromEntries(cc.map(c => [c.id, true])),
  }
  try {
    const s = localStorage.getItem(COL_VIS_KEY)
    if (s) {
      const parsed = JSON.parse(s)
      cc.forEach(c => { if (!(c.id in parsed)) parsed[c.id] = true })
      return parsed
    }
  } catch {}
  return defaults
}
function genId() { return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

// ── Componente ────────────────────────────────────────────────────────────────
export default function EquiposAlmacenPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── Filtros / paginación ────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<AlmacenEquipoEstado | 'Todos'>('Todos')
  const [filterBajoStock, setFilterBajoStock] = useState(false)
  const [filterConStock, setFilterConStock] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const { equipos, total, loading, createEquipo, updateEquipo, deleteEquipo } = useAlmacenEquipos(
    search,
    { estado: filterEstado, bajoStock: filterBajoStock, conStock: filterConStock, page: filterBajoStock ? undefined : page, pageSize },
  )
  const { ubicaciones } = useAlmacenUbicaciones()

  useEffect(() => { setPage(0) }, [search, filterEstado, filterBajoStock, filterConStock])

  // ── Gestión de columnas ─────────────────────────────────────────────────
  const [customCols,    setCustomCols]    = useState<CustomColDef[]>(loadCustomCols)
  const [colOrder,      setColOrder]      = useState<string[]>(() => loadColOrder(loadCustomCols()))
  const [colVis,        setColVis]        = useState<Record<string, boolean>>(() => loadColVis(loadCustomCols()))
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)
  const [newColLabel, setNewColLabel] = useState('')
  const [newColType,  setNewColType]  = useState<'text' | 'number'>('text')

  useEffect(() => { localStorage.setItem(COL_VIS_KEY,   JSON.stringify(colVis))     }, [colVis])
  useEffect(() => { localStorage.setItem(COL_ORDER_KEY, JSON.stringify(colOrder))   }, [colOrder])
  useEffect(() => { localStorage.setItem(CUSTOM_KEY,    JSON.stringify(customCols)) }, [customCols])

  useEffect(() => {
    if (!showColPicker) return
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node))
        setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColPicker])

  const customColMap = Object.fromEntries(customCols.map(c => [c.id, c]))

  function toggleCol(key: string) { setColVis(p => ({ ...p, [key]: !p[key] })) }

  function resetCols() {
    setColVis({
      ...Object.fromEntries(COL_DEFS.map(c => [c.key, c.defaultVisible])),
      ...Object.fromEntries(customCols.map(c => [c.id, true])),
    })
    setColOrder([...COL_DEFS.map(c => c.key as string), ...customCols.map(c => c.id)])
  }

  function moveCol(key: string, dir: 'up' | 'down') {
    const idx = colOrder.indexOf(key)
    if (idx === -1) return
    if (dir === 'up'   && idx === 0)                  return
    if (dir === 'down' && idx === colOrder.length - 1) return
    const next = [...colOrder]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setColOrder(next)
  }

  function addCustomCol() {
    const label = newColLabel.trim()
    if (!label) return
    const id = genId()
    const col: CustomColDef = { id, label, type: newColType }
    setCustomCols(p => [...p, col])
    setColOrder(p => [...p, id])
    setColVis(p => ({ ...p, [id]: true }))
    setNewColLabel('')
    setNewColType('text')
  }

  function removeCustomCol(id: string) {
    setCustomCols(p => p.filter(c => c.id !== id))
    setColOrder(p => p.filter(k => k !== id))
    setColVis(p => { const { [id]: _, ...rest } = p; return rest })
  }

  const hiddenCount = colOrder.filter(k => !colVis[k]).length
  const orderedVisibleCols = colOrder.filter(k => colVis[k])

  // ── Modal form ──────────────────────────────────────────────────────────
  type FormState = Omit<AlmacenEquipo, 'id' | 'sort_order' | 'created_at' | 'updated_at'>

  const emptyForm = (): FormState => ({
    codigo: '', nombre: '', descripcion: null, categoria: null,
    marca: null, modelo: null, serie: null,
    estado: 'Activo', ubicacion: null,
    stock_actual: 0, stock_minimo: 0, unidad: 'UND', precio_unitario: 0,
    ficha_tecnica_url: null, custom_fields: null,
    created_by: user?.id ?? null,
  })

  const [showModal,     setShowModal]     = useState(false)
  const [editing,       setEditing]       = useState<AlmacenEquipo | null>(null)
  const [form,          setForm]          = useState<FormState>(emptyForm)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AlmacenEquipo | null>(null)
  const [precioEquipo,  setPrecioEquipo]  = useState<AlmacenEquipo | null>(null)
  const { historial: precioHistorial, loading: precioLoading, addPrecio } = useAlmacenPrecioHistorial(precioEquipo?.id ?? null)
  const PRECIO_FORM_EMPTY = { proveedor_nombre: '', proveedor_id: '', precio_unitario: '', moneda: 'MN', cantidad: '', orden_compra: '', fecha_orden: '', fecha_entrega: '' }
  const [showPrecioForm, setShowPrecioForm] = useState(false)
  const [precioForm, setPrecioForm]         = useState(PRECIO_FORM_EMPTY)
  const [savingPrecio, setSavingPrecio]     = useState(false)
  const [precioError, setPrecioError]       = useState<string | null>(null)
  const [fichaFile,     setFichaFile]     = useState<File | null>(null)
  const fichaRef = useRef<HTMLInputElement>(null)

  const openNew = () => {
    setEditing(null); setForm(emptyForm()); setFichaFile(null); setError(null); setShowModal(true)
  }

  const openEdit = (e: AlmacenEquipo) => {
    setEditing(e)
    setForm({
      codigo: e.codigo ?? '', nombre: e.nombre, descripcion: e.descripcion,
      categoria: e.categoria, marca: e.marca, modelo: e.modelo, serie: e.serie,
      estado: e.estado, ubicacion: e.ubicacion,
      stock_actual: e.stock_actual, stock_minimo: e.stock_minimo,
      unidad: e.unidad, precio_unitario: e.precio_unitario,
      ficha_tecnica_url: e.ficha_tecnica_url,
      custom_fields: e.custom_fields ?? null,
      created_by: e.created_by,
    })
    setFichaFile(null); setError(null); setShowModal(true)
  }

  const uploadFicha = async (equipoId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${equipoId}/ficha_tecnica.${ext}`
    const { error: upErr } = await supabase.storage
      .from('almacen-fichas')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) throw new Error(upErr.message)
    const { data } = supabase.storage.from('almacen-fichas').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError(null)
    try {
      const payload = { ...form, codigo: form.codigo || null }
      if (editing) {
        let url = form.ficha_tecnica_url
        if (fichaFile) url = await uploadFicha(editing.id, fichaFile)
        await updateEquipo(editing.id, { ...payload, ficha_tecnica_url: url })
      } else {
        const equipo = await createEquipo({ ...payload, ficha_tecnica_url: null })
        if (fichaFile) {
          const url = await uploadFicha(equipo.id, fichaFile)
          await updateEquipo(equipo.id, { ficha_tecnica_url: url })
        }
      }
      setShowModal(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try { await deleteEquipo(confirmDelete.id) } catch {}
    setConfirmDelete(null)
  }

  const handleSavePrecio = async () => {
    if (!precioForm.precio_unitario) { setPrecioError('El precio es requerido'); return }
    if (!precioForm.fecha_orden) { setPrecioError('La fecha de compra es requerida'); return }
    setSavingPrecio(true); setPrecioError(null)
    try {
      await addPrecio({
        codigo:           precioEquipo!.codigo ?? '',
        equipo_id:        precioEquipo!.id,
        descripcion:      precioEquipo!.nombre,
        proveedor_nombre: precioForm.proveedor_nombre || null,
        proveedor_id:     precioForm.proveedor_id || null,
        precio_unitario:  Number(precioForm.precio_unitario),
        moneda:           precioForm.moneda,
        cantidad:         precioForm.cantidad ? Number(precioForm.cantidad) : null,
        orden_compra:     precioForm.orden_compra || null,
        fecha_orden:      precioForm.fecha_orden || null,
        fecha_entrega:    precioForm.fecha_entrega || null,
      })
      setPrecioForm(PRECIO_FORM_EMPTY)
      setShowPrecioForm(false)
    } catch (e: unknown) {
      setPrecioError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingPrecio(false)
    }
  }

  // ── Helpers de estilo ───────────────────────────────────────────────────
  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--n-200)', borderRadius: 7,
    outline: 'none', boxSizing: 'border-box',
    background: 'var(--n-0)', color: 'var(--n-900)', ...style,
  })

  const thS: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: 11.5,
    fontWeight: 600, color: 'var(--n-500)', whiteSpace: 'nowrap',
  }
  const tdS: React.CSSProperties = { padding: '10px 12px', color: 'var(--n-700)' }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Equipos & Consumibles</h1>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', margin: '3px 0 0' }}>
            {equipos.length} ítem{equipos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportMateriales(equipos, { search, estado: filterEstado, bajoStock: filterBajoStock })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--n-0)', color: 'var(--n-700)', border: '1px solid var(--n-200)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={14} /> Exportar Excel
          </button>
          <button
            onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-600)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={15} /> Nuevo material
          </button>
        </div>
      </div>

      {/* Filtros + selector de columnas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…" style={{ ...inp(), width: 220, paddingLeft: 30 }} />
        </div>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value as AlmacenEquipoEstado | 'Todos')} style={{ ...inp(), width: 170 }}>
          <option value="Todos">Todos los estados</option>
          {ALMACEN_EQUIPO_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { setFilterConStock(v => !v); if (!filterConStock) setFilterBajoStock(false) }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, border: '1px solid', borderColor: filterConStock ? 'var(--green-600)' : 'var(--n-200)', background: filterConStock ? 'var(--green-50)' : 'var(--n-0)', color: filterConStock ? 'var(--green-600)' : 'var(--n-600)', cursor: 'pointer' }}
        >
          <Package size={13} /> Con stock
        </button>
        <button
          onClick={() => { setFilterBajoStock(v => !v); if (!filterBajoStock) setFilterConStock(false) }}
          title="Muestra materiales cuyo stock actual es igual o menor al stock mínimo configurado (requiere stock mínimo > 0)"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, border: '1px solid', borderColor: filterBajoStock ? 'var(--red-600)' : 'var(--n-200)', background: filterBajoStock ? 'var(--red-50)' : 'var(--n-0)', color: filterBajoStock ? 'var(--red-600)' : 'var(--n-600)', cursor: 'pointer' }}
        >
          <AlertTriangle size={13} /> Bajo stock
        </button>

        <div style={{ marginLeft: 'auto' }} ref={colPickerRef} >
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 7, border: '1px solid var(--n-200)', background: showColPicker ? 'var(--n-100)' : 'var(--n-0)', fontSize: 12.5, cursor: 'pointer', color: 'var(--n-700)', fontWeight: 500 }}
            >
              <Columns size={13} />
              Columnas
              {hiddenCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--brand-100)', color: 'var(--brand-700)', borderRadius: 20, padding: '1px 6px' }}>
                  {hiddenCount} ocultas
                </span>
              )}
            </button>

            {showColPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 40, background: 'var(--n-0)', border: '1px solid var(--n-200)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.10)', width: 272, padding: '10px 0' }}>
                <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--n-100)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em' }}>COLUMNAS Y ORDEN</span>
                  <button onClick={resetCols} style={{ fontSize: 10.5, color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Restaurar</button>
                </div>

                <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
                  {colOrder.map((key, idx) => {
                    const isBuiltIn = BUILT_IN_KEY_SET.has(key)
                    const col = isBuiltIn ? BUILT_IN_COL_MAP[key as ColKey] : customColMap[key]
                    if (!col) return null
                    return (
                      <div key={key}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', cursor: 'default' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <input type="checkbox" checked={colVis[key] ?? true} onChange={() => toggleCol(key)}
                          style={{ width: 13, height: 13, accentColor: 'var(--brand-600)', cursor: 'pointer', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--n-700)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {col.label}
                          {!isBuiltIn && <span style={{ fontSize: 10, color: 'var(--brand-500)', marginLeft: 4 }}>•</span>}
                        </span>
                        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                          <button onClick={() => moveCol(key, 'up')} disabled={idx === 0} title="Subir"
                            style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'var(--n-200)' : 'var(--n-400)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            <ChevronUp size={11} />
                          </button>
                          <button onClick={() => moveCol(key, 'down')} disabled={idx === colOrder.length - 1} title="Bajar"
                            style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: idx === colOrder.length - 1 ? 'not-allowed' : 'pointer', color: idx === colOrder.length - 1 ? 'var(--n-200)' : 'var(--n-400)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            <ChevronDown size={11} />
                          </button>
                          {!isBuiltIn && (
                            <button onClick={() => removeCustomCol(key)} title="Eliminar columna"
                              style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-400)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Nueva columna personalizada */}
                <div style={{ borderTop: '1px solid var(--n-100)', padding: '10px 12px 6px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-400)', letterSpacing: '0.04em', marginBottom: 7 }}>NUEVA COLUMNA</div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                    <input
                      value={newColLabel}
                      onChange={e => setNewColLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCustomCol() }}
                      placeholder="Nombre de columna"
                      style={{ flex: 1, height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 12, color: 'var(--n-800)', background: 'var(--n-0)', minWidth: 0 }}
                    />
                    <select value={newColType} onChange={e => setNewColType(e.target.value as 'text' | 'number')}
                      style={{ height: 28, padding: '0 5px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 11.5, color: 'var(--n-700)', background: 'var(--n-0)', cursor: 'pointer' }}>
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                    </select>
                  </div>
                  <button onClick={addCustomCol} disabled={!newColLabel.trim()}
                    style={{ width: '100%', height: 28, borderRadius: 6, border: 'none', background: newColLabel.trim() ? 'var(--brand-600)' : 'var(--n-200)', color: newColLabel.trim() ? '#fff' : 'var(--n-400)', fontSize: 12, fontWeight: 600, cursor: newColLabel.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Plus size={11} /> Agregar columna
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : equipos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-400)' }}>
          <Package size={40} style={{ opacity: .3, marginBottom: 8 }} />
          <p style={{ fontSize: 13 }}>No hay equipos registrados</p>
          <button onClick={openNew} style={{ fontSize: 13, color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Crear el primero</button>
        </div>
      ) : (
        <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)' }}>
                  {orderedVisibleCols.map(key => {
                    if (BUILT_IN_KEY_SET.has(key)) return <th key={key} style={thS}>{BUILT_IN_COL_MAP[key as ColKey].label}</th>
                    const c = customColMap[key]
                    return c ? <th key={key} style={{ ...thS, color: 'var(--brand-500)' }}>{c.label}</th> : null
                  })}
                  <th style={thS}></th>
                </tr>
              </thead>
              <tbody>
                {equipos.map(e => {
                  const bajStock = e.stock_minimo > 0 && e.stock_actual <= e.stock_minimo
                  const ec = estadoColor[e.estado] ?? { bg: 'var(--n-100)', color: 'var(--n-500)' }
                  const cf = (e.custom_fields ?? {}) as Record<string, unknown>
                  return (
                    <tr
                      key={e.id}
                      style={{ borderBottom: '1px solid var(--n-100)' }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--n-25)')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = 'var(--n-0)')}
                    >
                      {orderedVisibleCols.map(key => {
                        // Columnas personalizadas
                        if (!BUILT_IN_KEY_SET.has(key)) {
                          const c = customColMap[key]
                          if (!c) return null
                          const val = cf[key]
                          return (
                            <td key={key} style={tdS}>
                              {val !== undefined && val !== '' && val !== 0
                                ? <span style={{ color: 'var(--n-700)' }}>{c.type === 'number' ? Number(val).toLocaleString() : String(val)}</span>
                                : <span style={{ color: 'var(--n-300)' }}>—</span>}
                            </td>
                          )
                        }
                        // Columnas built-in
                        switch (key as ColKey) {
                          case 'codigo':    return <td key={key} style={{ ...tdS, color: 'var(--n-500)', fontFamily: 'monospace', fontSize: 12 }}>{e.codigo ?? '—'}</td>
                          case 'nombre':    return (
                            <td key={key} style={{ ...tdS, fontWeight: 600, color: 'var(--n-900)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {e.nombre}
                                {bajStock && <AlertTriangle size={13} color="var(--red-600)" />}
                              </div>
                            </td>
                          )
                          case 'marca':           return <td key={key} style={tdS}>{e.marca ?? '—'}</td>
                          case 'categoria':       return <td key={key} style={tdS}>{e.categoria ?? '—'}</td>
                          case 'estado':          return (
                            <td key={key} style={tdS}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, ...ec }}>{e.estado}</span>
                            </td>
                          )
                          case 'stock_actual':    return <td key={key} style={{ ...tdS, fontWeight: 700, color: bajStock ? 'var(--red-600)' : 'var(--n-900)' }}>{e.stock_actual}</td>
                          case 'stock_minimo':    return <td key={key} style={{ ...tdS, color: 'var(--n-500)' }}>{e.stock_minimo}</td>
                          case 'unidad':          return <td key={key} style={{ ...tdS, color: 'var(--n-600)' }}>{e.unidad}</td>
                          case 'ubicacion':       return <td key={key} style={{ ...tdS, color: 'var(--n-500)' }}>{e.ubicacion ?? '—'}</td>
                          case 'precio_unitario': return <td key={key} style={{ ...tdS, color: 'var(--n-700)' }}>S/ {e.precio_unitario.toFixed(2)}</td>
                          case 'descripcion':     return <td key={key} style={{ ...tdS, color: 'var(--n-500)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.descripcion ?? '—'}</td>
                          case 'modelo':          return <td key={key} style={tdS}>{e.modelo ?? '—'}</td>
                          case 'serie':           return <td key={key} style={{ ...tdS, fontFamily: 'monospace', fontSize: 12 }}>{e.serie ?? '—'}</td>
                          case 'ficha':           return (
                            <td key={key} style={tdS} onClick={ev => ev.stopPropagation()}>
                              {e.ficha_tecnica_url
                                ? <a href={e.ficha_tecnica_url} target="_blank" rel="noreferrer" title="Ver ficha técnica"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, background: 'var(--blue-50)', color: 'var(--blue-600)', fontSize: 11.5, fontWeight: 600, textDecoration: 'none' }}>
                                    <FileText size={12} /> PDF
                                  </a>
                                : <span style={{ color: 'var(--n-300)', fontSize: 12 }}>—</span>
                              }
                            </td>
                          )
                          default: return null
                        }
                      })}
                      <td style={tdS} onClick={ev => ev.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(e)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)', borderRadius: 5 }} title="Editar"><Edit2 size={14} /></button>
                          <button onClick={() => setConfirmDelete(e)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-600)', borderRadius: 5 }} title="Eliminar"><Trash2 size={14} /></button>
                          <button onClick={() => setPrecioEquipo(e)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--green-600)', borderRadius: 5 }} title="Historial de precios"><TrendingUp size={14} /></button>
                          <button onClick={() => navigate(`/almacen/kardex?equipo=${e.id}`)} style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brand-600)', borderRadius: 5 }} title="Ver kardex"><ChevronRight size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!filterBajoStock && (
            <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={setPageSize} loading={loading} />
          )}
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? 'Editar equipo' : 'Nuevo material'}</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Código</label>
                <input value={form.codigo ?? ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="SKU-001" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="Nombre del equipo" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Descripción</label>
                <textarea value={form.descripcion ?? ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value || null }))} style={{ ...inp({ marginTop: 4 }), height: 60, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Categoría</label>
                <select value={form.categoria ?? ''} onChange={e => setForm(f => ({ ...f, categoria: e.target.value || null }))} style={inp({ marginTop: 4 })}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as AlmacenEquipoEstado }))} style={inp({ marginTop: 4 })}>
                  {ALMACEN_EQUIPO_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Marca</label>
                <input value={form.marca ?? ''} onChange={e => setForm(f => ({ ...f, marca: e.target.value || null }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Modelo</label>
                <input value={form.modelo ?? ''} onChange={e => setForm(f => ({ ...f, modelo: e.target.value || null }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>N° Serie</label>
                <input value={form.serie ?? ''} onChange={e => setForm(f => ({ ...f, serie: e.target.value || null }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ubicación</label>
                <select value={form.ubicacion ?? ''} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value || null }))} style={inp({ marginTop: 4 })}>
                  <option value="">— Sin ubicación —</option>
                  {ubicaciones.filter(u => u.activa).map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre}{u.codigo ? ` [${u.codigo}]` : ''} · {u.tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Unidad</label>
                <input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} style={inp({ marginTop: 4 })} placeholder="UND / m / kg" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Stock inicial</label>
                <input type="number" min={0} value={form.stock_actual} onChange={e => setForm(f => ({ ...f, stock_actual: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Stock mínimo</label>
                <input type="number" min={0} value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Precio unitario (S/)</label>
                <input type="number" min={0} step={0.01} value={form.precio_unitario} onChange={e => setForm(f => ({ ...f, precio_unitario: Number(e.target.value) }))} style={inp({ marginTop: 4 })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>Ficha técnica (PDF)</label>
                <input ref={fichaRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => setFichaFile(e.target.files?.[0] ?? null)} />
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => fichaRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', color: 'var(--n-700)', fontSize: 12.5, cursor: 'pointer' }}>
                    <Upload size={13} /> {fichaFile ? 'Cambiar archivo' : 'Subir PDF'}
                  </button>
                  {fichaFile
                    ? <span style={{ fontSize: 12, color: 'var(--green-600)', display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={13} />{fichaFile.name}</span>
                    : form.ficha_tecnica_url
                      ? <a href={form.ficha_tecnica_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue-600)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><FileText size={13} /> Ver ficha actual</a>
                      : <span style={{ fontSize: 12, color: 'var(--n-400)' }}>Sin ficha cargada</span>
                  }
                </div>
              </div>

              {/* Campos personalizados en el modal */}
              {customCols.length > 0 && (
                <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--n-150)', paddingTop: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-500)', marginBottom: 10, letterSpacing: '0.04em' }}>CAMPOS PERSONALIZADOS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {customCols.map(col => (
                      <div key={col.id}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-600)' }}>{col.label}</label>
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={String((form.custom_fields ?? {})[col.id] ?? '')}
                          onChange={e => setForm(f => ({
                            ...f,
                            custom_fields: {
                              ...(f.custom_fields ?? {}),
                              [col.id]: col.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value,
                            },
                          }))}
                          placeholder={col.type === 'number' ? '0' : `${col.label}…`}
                          style={inp({ marginTop: 4, textAlign: col.type === 'number' ? 'right' : 'left' })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p style={{ color: 'var(--red-600)', fontSize: 12.5, marginTop: 12 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial de precios */}
      {precioEquipo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setPrecioEquipo(null); setShowPrecioForm(false) }}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 'min(1100px, 95vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Historial de precios</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--n-500)' }}>
                  {precioEquipo.codigo && <span style={{ marginRight: 8, color: 'var(--n-400)' }}>[{precioEquipo.codigo}]</span>}
                  {precioEquipo.nombre}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => { setShowPrecioForm(v => !v); setPrecioError(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid var(--n-200)', borderRadius: 7, background: showPrecioForm ? 'var(--n-100)' : 'var(--n-0)', color: 'var(--n-700)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                >
                  <Plus size={13} /> Agregar
                </button>
                <button onClick={() => { setPrecioEquipo(null); setShowPrecioForm(false) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-400)' }}><X size={18} /></button>
              </div>
            </div>

            {/* Formulario agregar precio */}
            {showPrecioForm && (
              <div style={{ background: 'var(--n-25)', border: '1px solid var(--n-150)', borderRadius: 8, padding: 16, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>Proveedor</label>
                    <input value={precioForm.proveedor_nombre} onChange={e => setPrecioForm(f => ({ ...f, proveedor_nombre: e.target.value }))} placeholder="Nombre del proveedor" style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>RUC (opcional)</label>
                    <input value={precioForm.proveedor_id} onChange={e => setPrecioForm(f => ({ ...f, proveedor_id: e.target.value }))} placeholder="20xxxxxxxxx" style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>Precio unitario *</label>
                    <input type="number" min={0} step={0.01} value={precioForm.precio_unitario} onChange={e => setPrecioForm(f => ({ ...f, precio_unitario: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>Moneda</label>
                    <select value={precioForm.moneda} onChange={e => setPrecioForm(f => ({ ...f, moneda: e.target.value }))} style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }}>
                      <option value="MN">PEN (Soles)</option>
                      <option value="ME">USD (Dólares)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>Cantidad</label>
                    <input type="number" min={0} step={0.01} value={precioForm.cantidad} onChange={e => setPrecioForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="—" style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>Orden de compra</label>
                    <input value={precioForm.orden_compra} onChange={e => setPrecioForm(f => ({ ...f, orden_compra: e.target.value }))} placeholder="OC-0000" style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>Fecha compra *</label>
                    <input type="date" value={precioForm.fecha_orden} onChange={e => setPrecioForm(f => ({ ...f, fecha_orden: e.target.value }))} style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-500)', display: 'block', marginBottom: 3 }}>Fecha entrega</label>
                    <input type="date" value={precioForm.fecha_entrega} onChange={e => setPrecioForm(f => ({ ...f, fecha_entrega: e.target.value }))} style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {precioError && <p style={{ margin: '0 0 8px', fontSize: 12.5, color: 'var(--red-600)' }}>{precioError}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => { setShowPrecioForm(false); setPrecioForm(PRECIO_FORM_EMPTY); setPrecioError(null) }} style={{ padding: '6px 14px', border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                  <button onClick={handleSavePrecio} disabled={savingPrecio} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: 'var(--brand-600)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: savingPrecio ? .6 : 1 }}>
                    {savingPrecio ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {precioLoading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
            ) : precioHistorial.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--n-400)' }}>
                <TrendingUp size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>Sin historial de precios para este material.</p>
                <p style={{ fontSize: 12, color: 'var(--n-300)', marginTop: 4 }}>Importa el Excel con <code>python importar_materiales.py --precios --insertar</code></p>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--n-25)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--n-150)' }}>
                      {['Fecha compra', 'Proveedor', 'Precio unit.', 'Moneda', 'Cantidad', 'Orden de compra', 'Fecha entrega'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {precioHistorial.map((h, i) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--n-100)', background: i % 2 === 0 ? 'transparent' : 'var(--n-25)' }}>
                        <td style={{ padding: '9px 12px', color: 'var(--n-600)', whiteSpace: 'nowrap' }}>
                          {h.fecha_orden ? new Date(h.fecha_orden).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--n-800)', fontWeight: 500, maxWidth: 220 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.proveedor_nombre || '—'}</div>
                          {h.proveedor_id && <div style={{ fontSize: 11, color: 'var(--n-400)' }}>RUC {h.proveedor_id}</div>}
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--brand-700)', whiteSpace: 'nowrap' }}>
                          {Number(h.precio_unitario).toFixed(2)}
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--n-500)' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: h.moneda === 'ME' ? 'var(--blue-50)' : 'var(--green-50)', color: h.moneda === 'ME' ? 'var(--blue-600)' : 'var(--green-600)' }}>
                            {h.moneda === 'ME' ? 'USD' : 'PEN'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--n-600)' }}>{h.cantidad ?? '—'}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--n-500)', fontSize: 12 }}>{h.orden_compra || '—'}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--n-500)', whiteSpace: 'nowrap' }}>
                          {h.fecha_entrega ? new Date(h.fecha_entrega).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: 'var(--n-0)', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>¿Eliminar equipo?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--n-600)' }}>Se eliminará <strong>{confirmDelete.nombre}</strong> y todo su historial de kardex.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', border: '1px solid var(--n-200)', borderRadius: 7, background: 'var(--n-0)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleDelete} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
