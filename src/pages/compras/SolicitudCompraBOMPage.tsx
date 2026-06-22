import { useState, useRef, useEffect } from 'react'
import { Plus, Search, Trash2, X, Edit2, Check, Package, ShoppingCart, ImageIcon, Upload, Columns, ChevronLeft, ChevronRight } from 'lucide-react'
import { useComprasBOM } from '../../hooks/useComprasBOM'
import type { ProcesoBOM, EstadoCotBOM, ComprasBOMItemInsert } from '../../hooks/useComprasBOM'
import { supabase } from '../../lib/supabase'
import { BOMNavTabs } from './BOMNavTabs'

// ── Tipos ─────────────────────────────────────────────────────────────────────

const ESTADO_STYLE: Record<EstadoCotBOM, { bg: string; color: string; border: string }> = {
  'COMPRADO':   { bg: 'var(--green-50)',  color: 'var(--green-700)',  border: 'var(--green-200)' },
  'PENDIENTE':  { bg: 'var(--n-100)',     color: 'var(--n-600)',      border: 'var(--n-300)' },
  'EN PROCESO': { bg: 'var(--amber-50)',  color: 'var(--amber-700)',  border: 'var(--amber-200)' },
}

const PROVEEDORES = [
  { key: 'polimetales' as const,     label: 'Polimetales' },
  { key: 'othero' as const,          label: 'Othero' },
  { key: 'pernos_y_pernos' as const, label: 'Pernos' },
  { key: 'ducasse' as const,         label: 'Ducasse' },
  { key: 'em_metal' as const,        label: 'E&M Metal' },
]

// ── Configuración de columnas ─────────────────────────────────────────────────

type ColKey =
  | 'imagen' | 'proceso' | 'tipo' | 'cantidad'
  | 'material' | 'masa' | 'codigo' | 'comentarios'
  | 'polimetales' | 'othero' | 'pernos' | 'ducasse' | 'em_metal'
  | 'mejor_precio' | 'observaciones'

interface ColDef {
  key: ColKey
  label: string
  defaultVisible: boolean
  group?: 'precios'
}

const COL_DEFS: ColDef[] = [
  { key: 'imagen',       label: 'Imagen',       defaultVisible: true  },
  { key: 'proceso',      label: 'Proceso',      defaultVisible: true  },
  { key: 'tipo',         label: 'Tipo',         defaultVisible: true  },
  { key: 'cantidad',     label: 'Cantidad',     defaultVisible: true  },
  { key: 'material',     label: 'Material',     defaultVisible: true  },
  { key: 'masa',         label: 'Masa',         defaultVisible: true  },
  { key: 'codigo',       label: 'Código',       defaultVisible: false },
  { key: 'comentarios',  label: 'Comentarios',  defaultVisible: true  },
  { key: 'polimetales',  label: 'Polimetales',  defaultVisible: false, group: 'precios' },
  { key: 'othero',       label: 'Othero',       defaultVisible: false, group: 'precios' },
  { key: 'pernos',       label: 'Pernos',       defaultVisible: false, group: 'precios' },
  { key: 'ducasse',      label: 'Ducasse',      defaultVisible: false, group: 'precios' },
  { key: 'em_metal',     label: 'E&M Metal',    defaultVisible: false, group: 'precios' },
  { key: 'mejor_precio', label: 'Mejor precio', defaultVisible: false, group: 'precios' },
  { key: 'observaciones',label: 'Observaciones',defaultVisible: true  },
]

const COL_STORAGE_KEY = 'bom_col_visibility_v1'

function loadColVisibility(): Record<ColKey, boolean> {
  try {
    const saved = localStorage.getItem(COL_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return Object.fromEntries(COL_DEFS.map(c => [c.key, c.defaultVisible])) as Record<ColKey, boolean>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyForm = (): Omit<ComprasBOMItemInsert, 'sort_order'> => ({
  item: '', proceso: 'Compra', tipo: '', cantidad: '', descripcion: '', codigo: '',
  material: '', masa: '', dxf: 'NO', comentarios: '',
  polimetales: 0, othero: 0, pernos_y_pernos: 0, ducasse: 0, em_metal: 0,
  imagen: null, estado_cot: 'PENDIENTE', observaciones: '',
})

function bestPrice(item: ComprasBOMItemInsert) {
  const vals = PROVEEDORES.map(p => ({ label: p.label, val: Number(item[p.key]) || 0 })).filter(x => x.val > 0)
  if (!vals.length) return null
  return vals.reduce((a, b) => a.val < b.val ? a : b)
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function SolicitudCompraBOMPage() {
  const [search, setSearch]               = useState('')
  const [filterEstado, setFilterEstado]   = useState<EstadoCotBOM | 'TODOS'>('TODOS')
  const [filterProceso, setFilterProceso] = useState<ProcesoBOM | 'TODOS'>('TODOS')
  const [page, setPage]                   = useState(1)
  const [pageSize, setPageSize]           = useState(15)

  const { items, total, estadoCounts, loading, error, create, update, remove } =
    useComprasBOM({ page, pageSize, search, estado: filterEstado, proceso: filterProceso })

  const [showModal, setShowModal]         = useState(false)
  const [editId, setEditId]               = useState<string | null>(null)
  const [form, setForm]                   = useState(emptyForm())
  const [saving, setSaving]               = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Volver a página anterior si la actual queda vacía tras borrar
  useEffect(() => {
    if (!loading && items.length === 0 && page > 1) setPage(p => p - 1)
  }, [items.length, loading, page])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // ── Column visibility ──────────────────────────────────────────────────────
  const [colVis, setColVis] = useState<Record<ColKey, boolean>>(loadColVisibility)
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(colVis))
  }, [colVis])

  useEffect(() => {
    if (!showColPicker) return
    function onClickOutside(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showColPicker])

  function toggleCol(key: ColKey) {
    setColVis(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function resetCols() {
    setColVis(Object.fromEntries(COL_DEFS.map(c => [c.key, c.defaultVisible])) as Record<ColKey, boolean>)
  }

  const hiddenCount = COL_DEFS.filter(c => !colVis[c.key]).length

  // ── Imagen upload ──────────────────────────────────────────────────────────
  async function handleImageUpload(file: File) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('bom-images').upload(path, file)
      if (upErr) throw upErr
      const { data } = supabase.storage.from('bom-images').getPublicUrl(path)
      setForm(p => ({ ...p, imagen: data.publicUrl }))
      setPreviewUrl(data.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  function openNew() { setEditId(null); setForm(emptyForm()); setPreviewUrl(null); setShowModal(true) }

  function openEdit(it: typeof items[0]) {
    setEditId(it.id)
    const { id, created_at, updated_at, sort_order, ...rest } = it
    setForm(rest)
    setPreviewUrl(it.imagen ?? null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.descripcion.trim()) return
    setSaving(true)
    try {
      if (editId) await update(editId, form)
      else await create(form)
      setShowModal(false)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await remove(id)
    setConfirmDelete(null)
  }

  // helper: número de columnas visibles para colSpan dinámico
  // fijas: # + descripción + estado + acciones = 4
  // configurables visibles
  const visibleConfigCols = COL_DEFS.filter(c => colVis[c.key]).length
  const totalCols = 4 + visibleConfigCols // #, desc, estado, acciones

  // Columna de precio → clave de proveedor
  const priceColMap: Record<string, typeof PROVEEDORES[0]> = {
    polimetales: PROVEEDORES[0], othero: PROVEEDORES[1],
    pernos:      PROVEEDORES[2], ducasse: PROVEEDORES[3],
    em_metal:    PROVEEDORES[4],
  }

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Solicitud de Compra — BOM</h1>
          <p style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 1, marginBottom: 0 }}>
            Materiales y equipos — {estadoCounts.TODOS ?? total} ítems
          </p>
        </div>

        <BOMNavTabs active="list" />

        <div style={{ position: 'relative', flex: '0 0 240px' }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar descripción, tipo…"
            style={{ width: '100%', paddingLeft: 28, paddingRight: 10, height: 30, border: '1px solid var(--n-200)', borderRadius: 7, fontSize: 12, color: 'var(--n-800)', background: '#fff', boxSizing: 'border-box' }} />
        </div>

        <select value={filterProceso} onChange={e => { setFilterProceso(e.target.value as ProcesoBOM | 'TODOS'); setPage(1) }}
          style={{ height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12, color: 'var(--n-700)', cursor: 'pointer' }}>
          <option value="TODOS">Todo proceso</option>
          <option value="Compra">Compra</option>
          <option value="Fabricación">Fabricación</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['TODOS', 'COMPRADO', 'EN PROCESO', 'PENDIENTE'] as const).map(s => {
            const active = filterEstado === s
            const st = s === 'TODOS' ? null : ESTADO_STYLE[s]
            const count = estadoCounts[s] ?? 0
            return (
              <button key={s} onClick={() => { setFilterEstado(s); setPage(1) }} style={{
                padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                border: active ? `1.5px solid ${st ? st.border : 'var(--brand-300)'}` : '1px solid var(--n-200)',
                background: active ? (st ? st.bg : 'var(--brand-50)') : '#fff',
                color: active ? (st ? st.color : 'var(--brand-700)') : 'var(--n-500)',
              }}>
                {count} {s === 'TODOS' ? 'total' : s.toLowerCase()}
              </button>
            )
          })}

          <div style={{ width: 1, height: 16, background: 'var(--n-200)' }} />

          {/* Column visibility button */}
          <div ref={colPickerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px',
                borderRadius: 7, border: '1px solid var(--n-200)',
                background: showColPicker ? 'var(--n-100)' : '#fff',
                fontSize: 12, cursor: 'pointer', color: 'var(--n-700)', fontWeight: 500,
              }}
            >
              <Columns size={13} />
              Columnas
              {hiddenCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--brand-100)', color: 'var(--brand-700)', borderRadius: 20, padding: '1px 5px' }}>
                  {hiddenCount} ocultas
                </span>
              )}
            </button>

            {showColPicker && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 40,
                background: '#fff', border: '1px solid var(--n-200)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,.10)', width: 220, padding: '10px 0',
              }}>
                <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--n-100)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em' }}>VISIBILIDAD DE COLUMNAS</span>
                  <button onClick={resetCols} style={{ fontSize: 10.5, color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                    Restaurar
                  </button>
                </div>

                {/* Columnas generales */}
                <div style={{ padding: '6px 0' }}>
                  {COL_DEFS.filter(c => !c.group).map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <input type="checkbox" checked={colVis[col.key]} onChange={() => toggleCol(col.key)}
                        style={{ width: 13, height: 13, accentColor: 'var(--brand-600)', cursor: 'pointer' }} />
                      <span style={{ fontSize: 12.5, color: 'var(--n-700)' }}>{col.label}</span>
                    </label>
                  ))}
                </div>

                {/* Columnas de precios */}
                <div style={{ borderTop: '1px solid var(--n-100)', paddingTop: 6 }}>
                  <div style={{ padding: '4px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-400)', letterSpacing: '0.04em' }}>PRECIOS / PROVEEDORES</span>
                    <button
                      onClick={() => {
                        const priceCols = COL_DEFS.filter(c => c.group === 'precios').map(c => c.key)
                        const allOn = priceCols.every(k => colVis[k])
                        setColVis(prev => ({ ...prev, ...Object.fromEntries(priceCols.map(k => [k, !allOn])) }))
                      }}
                      style={{ fontSize: 10.5, color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      {COL_DEFS.filter(c => c.group === 'precios').every(c => colVis[c.key]) ? 'Ocultar todo' : 'Mostrar todo'}
                    </button>
                  </div>
                  {COL_DEFS.filter(c => c.group === 'precios').map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <input type="checkbox" checked={colVis[col.key]} onChange={() => toggleCol(col.key)}
                        style={{ width: 13, height: 13, accentColor: 'var(--brand-600)', cursor: 'pointer' }} />
                      <span style={{ fontSize: 12.5, color: 'var(--n-700)' }}>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Nuevo Ítem
          </button>
        </div>
      </div>

      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 8, fontSize: 12.5 }}>{error}</div>}

      {/* ── Tabla ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--n-50)', borderBottom: '1px solid var(--n-150)' }}>
                  {/* Fijas siempre visibles */}
                  <th style={thS}>#</th>
                  {colVis.imagen      && <th style={{ ...thS, width: 52 }}>Img</th>}
                  {colVis.proceso     && <th style={thS}>Proceso</th>}
                  {colVis.tipo        && <th style={thS}>Tipo</th>}
                  {colVis.cantidad    && <th style={thS}>Cant.</th>}
                  <th style={{ ...thS, minWidth: 220 }}>Descripción</th>
                  {colVis.codigo      && <th style={thS}>Código</th>}
                  {colVis.material    && <th style={thS}>Material</th>}
                  {colVis.masa        && <th style={thS}>Masa</th>}
                  {colVis.comentarios && <th style={thS}>Comentarios</th>}
                  {colVis.polimetales && <th style={{ ...thS, background: '#fefce8' }}>Polimetales</th>}
                  {colVis.othero      && <th style={{ ...thS, background: '#f0fdf4' }}>Othero</th>}
                  {colVis.pernos      && <th style={{ ...thS, background: '#eff6ff' }}>Pernos</th>}
                  {colVis.ducasse     && <th style={{ ...thS, background: '#fdf4ff' }}>Ducasse</th>}
                  {colVis.em_metal    && <th style={{ ...thS, background: '#fff7ed' }}>E&M Metal</th>}
                  {colVis.mejor_precio && <th style={thS}>Mejor precio</th>}
                  <th style={thS}>Estado</th>
                  {colVis.observaciones && <th style={thS}>Obs.</th>}
                  <th style={thS}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={totalCols} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Sin resultados</td></tr>
                ) : items.map((it, i) => {
                  const est = ESTADO_STYLE[it.estado_cot]
                  const best = bestPrice(it)
                  return (
                    <tr key={it.id} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--n-100)' : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>

                      <td style={tdS}><span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-400)' }}>{it.item}</span></td>

                      {colVis.imagen && (
                        <td style={{ ...tdS, padding: '4px 6px' }}>
                          {it.imagen ? (
                            <img src={it.imagen} alt=""
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--n-150)', cursor: 'pointer', display: 'block' }}
                              onClick={() => window.open(it.imagen!, '_blank')} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 5, border: '1px dashed var(--n-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={14} style={{ color: 'var(--n-300)' }} />
                            </div>
                          )}
                        </td>
                      )}

                      {colVis.proceso && (
                        <td style={tdS}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: it.proceso === 'Compra' ? 'var(--brand-50)' : 'var(--n-100)', color: it.proceso === 'Compra' ? 'var(--brand-700)' : 'var(--n-600)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {it.proceso === 'Compra' ? <ShoppingCart size={9} /> : <Package size={9} />}
                            {it.proceso}
                          </span>
                        </td>
                      )}

                      {colVis.tipo        && <td style={{ ...tdS, color: 'var(--n-600)', whiteSpace: 'nowrap' }}>{it.tipo}</td>}
                      {colVis.cantidad    && <td style={{ ...tdS, fontWeight: 600, whiteSpace: 'nowrap' }}>{it.cantidad}</td>}

                      <td style={{ ...tdS, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--n-800)' }} title={it.descripcion}>{it.descripcion}</td>

                      {colVis.codigo      && <td style={{ ...tdS, color: 'var(--n-500)', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.codigo}>{it.codigo || '—'}</td>}
                      {colVis.material    && <td style={{ ...tdS, color: 'var(--n-500)', whiteSpace: 'nowrap' }}>{it.material}</td>}
                      {colVis.masa        && <td style={{ ...tdS, color: 'var(--n-500)', whiteSpace: 'nowrap' }}>{it.masa}</td>}
                      {colVis.comentarios && <td style={{ ...tdS, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--n-400)', fontSize: 11 }} title={it.comentarios}>{it.comentarios || '—'}</td>}

                      {(['polimetales', 'othero', 'pernos', 'ducasse', 'em_metal'] as ColKey[]).map(ck => {
                        if (!colVis[ck]) return null
                        const prov = priceColMap[ck]
                        const val = Number(it[prov.key]) || 0
                        const isBest = best && best.label === prov.label && val > 0
                        return (
                          <td key={ck} style={{ ...tdS, textAlign: 'right', fontWeight: val > 0 ? 600 : 400, color: isBest ? 'var(--green-700)' : val > 0 ? 'var(--n-800)' : 'var(--n-300)', background: isBest ? 'var(--green-50)' : undefined }}>
                            {val > 0 ? `S/ ${val.toFixed(2)}` : '—'}
                          </td>
                        )
                      })}

                      {colVis.mejor_precio && (
                        <td style={{ ...tdS, textAlign: 'right' }}>
                          {best ? (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green-700)', background: 'var(--green-50)', padding: '2px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                              {best.label}: S/ {best.val.toFixed(2)}
                            </span>
                          ) : <span style={{ color: 'var(--n-300)' }}>—</span>}
                        </td>
                      )}

                      <td style={tdS}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: est.bg, color: est.color, border: `1px solid ${est.border}`, whiteSpace: 'nowrap' }}>
                          {it.estado_cot}
                        </span>
                      </td>

                      {colVis.observaciones && <td style={{ ...tdS, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--n-400)', fontSize: 11 }} title={it.observaciones}>{it.observaciones || '—'}</td>}

                      <td style={{ ...tdS, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(it)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--n-200)', background: '#fff', cursor: 'pointer', color: 'var(--n-500)', display: 'flex', alignItems: 'center' }}><Edit2 size={11} /></button>
                          <button onClick={() => setConfirmDelete(it.id)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--red-100)', background: 'var(--red-50)', cursor: 'pointer', color: 'var(--red-500)', display: 'flex', alignItems: 'center' }}><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} ítems
            </span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              style={{ height: 26, padding: '0 6px', borderRadius: 6, border: '1px solid var(--n-200)', background: '#fff', fontSize: 11.5, color: 'var(--n-700)', cursor: 'pointer' }}>
              <option value={15}>15 / pág.</option>
              <option value={30}>30 / pág.</option>
              <option value={50}>50 / pág.</option>
              <option value={100}>100 / pág.</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnS(page === 1)}>
              <ChevronLeft size={13} />
            </button>
            {pageNumbers(totalPages, page).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--n-400)' }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)} style={pageBtnS(false, p === page)}>
                  {p}
                </button>
              )
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnS(page === totalPages)}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Nuevo/Editar ──────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px 18px', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>{editId ? 'Editar Ítem' : 'Nuevo Ítem BOM'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={14} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <FL>#ITEM</FL>
                <input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} placeholder="Ej: 42" style={iStyle} />
              </div>
              <div>
                <FL>Proceso</FL>
                <select value={form.proceso} onChange={e => setForm(p => ({ ...p, proceso: e.target.value as ProcesoBOM }))} style={{ ...iStyle, cursor: 'pointer' }}>
                  <option value="Compra">Compra</option>
                  <option value="Fabricación">Fabricación</option>
                </select>
              </div>
              <div>
                <FL>Estado Cotización</FL>
                <select value={form.estado_cot} onChange={e => setForm(p => ({ ...p, estado_cot: e.target.value as EstadoCotBOM }))} style={{ ...iStyle, cursor: 'pointer' }}>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN PROCESO">EN PROCESO</option>
                  <option value="COMPRADO">COMPRADO</option>
                </select>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <FL>Imagen</FL>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 8, border: '1px solid var(--n-200)', overflow: 'hidden', background: 'var(--n-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {previewUrl
                      ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <ImageIcon size={20} style={{ color: 'var(--n-300)' }} />
                    }
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer', color: 'var(--n-700)', fontWeight: 500 }}>
                      <Upload size={12} />
                      {uploading ? 'Subiendo…' : previewUrl ? 'Cambiar imagen' : 'Subir imagen'}
                    </button>
                    {previewUrl && (
                      <button type="button" onClick={() => { setForm(p => ({ ...p, imagen: null })); setPreviewUrl(null) }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--red-100)', background: 'var(--red-50)', fontSize: 11.5, cursor: 'pointer', color: 'var(--red-600)', fontWeight: 500 }}>
                        <X size={11} /> Quitar imagen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <FL>Descripción *</FL>
                <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del material o equipo" style={iStyle} autoFocus />
              </div>
              <div>
                <FL>Tipo</FL>
                <input value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} placeholder="Ej: Pernería, Corte" style={iStyle} />
              </div>
              <div>
                <FL>Cantidad</FL>
                <input value={form.cantidad} onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} placeholder="Ej: 4, 1500 mm" style={iStyle} />
              </div>
              <div>
                <FL>Material</FL>
                <input value={form.material} onChange={e => setForm(p => ({ ...p, material: e.target.value }))} placeholder="ASTM A36, Zincado…" style={iStyle} />
              </div>
              <div>
                <FL>Masa</FL>
                <input value={form.masa} onChange={e => setForm(p => ({ ...p, masa: e.target.value }))} placeholder="Ej: 1.5 kg" style={iStyle} />
              </div>
              <div>
                <FL>DXF</FL>
                <input value={form.dxf} onChange={e => setForm(p => ({ ...p, dxf: e.target.value }))} placeholder="SI / NO / TUBO" style={iStyle} />
              </div>
              <div>
                <FL>Código</FL>
                <input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Código de referencia" style={iStyle} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <FL>Comentarios</FL>
                <input value={form.comentarios} onChange={e => setForm(p => ({ ...p, comentarios: e.target.value }))} placeholder="Especificaciones adicionales" style={iStyle} />
              </div>

              <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--n-150)', paddingTop: 10, marginTop: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', marginBottom: 8, letterSpacing: '0.04em' }}>PRECIOS POR PROVEEDOR (S/)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {PROVEEDORES.map(p => (
                    <div key={p.key}>
                      <FL>{p.label}</FL>
                      <input type="number" min={0} step={0.01} value={form[p.key] || ''} onChange={e => setForm(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))} placeholder="0.00" style={{ ...iStyle, textAlign: 'right' }} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <FL>Observaciones</FL>
                <input value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Ej: Ya se encuentra en San Pedrito" style={iStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12.5, cursor: 'pointer', color: 'var(--n-700)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 16px', borderRadius: 7, border: 'none', background: saving ? 'var(--brand-300)' : 'var(--brand-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                <Check size={13} /> {saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Agregar ítem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ─────────────────────────────────────────────────── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', width: 360, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)', marginBottom: 6 }}>¿Eliminar ítem?</div>
            <div style={{ fontSize: 12.5, color: 'var(--n-500)', marginBottom: 18 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12.5, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--red-600)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-600)', marginBottom: 4 }}>{children}</div>
}

const thS: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }
const tdS: React.CSSProperties = { padding: '7px 10px', color: 'var(--n-700)' }
const iStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 12.5, color: 'var(--n-800)', boxSizing: 'border-box', background: '#fff' }

function pageBtnS(disabled: boolean, active = false): React.CSSProperties {
  return {
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer',
    border: active ? '1.5px solid var(--brand-400)' : '1px solid var(--n-200)',
    background: active ? 'var(--brand-50)' : '#fff',
    color: active ? 'var(--brand-700)' : disabled ? 'var(--n-300)' : 'var(--n-600)',
  }
}

function pageNumbers(totalPages: number, current: number): (number | '…')[] {
  const pages: (number | '…')[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) {
      pages.push(p)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return pages
}
