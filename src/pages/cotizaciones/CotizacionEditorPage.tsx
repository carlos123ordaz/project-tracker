import { useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  useCotizacionEditor,
  calcPrecioVenta,
  calcularTarifa,
} from '../../hooks/useCotizacionEditor'
import { usePersonalTarifas } from '../../hooks/usePersonalTarifas'
import { useGastosGeneralesCot } from '../../hooks/useGastosGeneralesCot'
import { useCronogramaCot } from '../../hooks/useCronogramaCot'
import { useBitrixProductos } from '../../hooks/useBitrixProductos'
import type {
  CotizacionDisciplina, CotizacionSegmento, CotizacionStatus,
  PartidaTipo, DisciplinaTipo, CotizacionPartida,
} from '../../lib/types'
import { DISCIPLINAS_CONFIG, COTIZACION_STATUSES } from '../../lib/types'
import {
  ChevronLeft, Plus, Trash2, ChevronDown, ChevronRight,
  Check, AlertCircle, Loader2, MapPin, User, FolderOpen, Search,
} from 'lucide-react'

// Tab components
import GastosGeneralesTab from './tabs/GastosGeneralesTab'
import CronogramaTab from './tabs/CronogramaTab'
import ResumenCISACTab from './tabs/ResumenCISACTab'
import ResumenClienteTab from './tabs/ResumenClienteTab'
import CashFlowTab from './tabs/CashFlowTab'
import ResumenB24PRYTab from './tabs/ResumenB24PRYTab'
import ResumenUNTab from './tabs/ResumenUNTab'

// ── Constants ────────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<PartidaTipo, string> = {
  mo: 'MO', material: 'MAT', viatico: 'VIÁ', epp: 'EPP', subcontrato: 'SUB', otro: 'OTRO',
}
const TIPO_COLORS: Record<PartidaTipo, { bg: string; color: string }> = {
  mo:          { bg: 'var(--brand-50)',  color: 'var(--brand-700)'  },
  material:    { bg: 'var(--green-50)',  color: 'var(--green-700)'  },
  viatico:     { bg: 'var(--amber-50)',  color: 'var(--amber-700)'  },
  epp:         { bg: 'var(--red-50)',    color: 'var(--red-600)'    },
  subcontrato: { bg: 'var(--n-100)',     color: 'var(--n-700)'      },
  otro:        { bg: 'var(--n-50)',      color: 'var(--n-500)'      },
}
const STATUS_STYLE: Record<CotizacionStatus, { bg: string; color: string; border: string }> = {
  'Borrador':    { bg: 'var(--n-100)',    color: 'var(--n-600)',     border: 'var(--n-200)'     },
  'En revisión': { bg: 'var(--amber-50)', color: 'var(--amber-700)', border: 'var(--amber-200)' },
  'Enviada':     { bg: 'var(--blue-50)',  color: 'var(--blue-500)',  border: 'var(--blue-100)'  },
  'Aprobada':    { bg: 'var(--green-50)', color: 'var(--green-700)', border: 'var(--green-200)' },
  'Rechazada':   { bg: 'var(--red-50)',   color: 'var(--red-600)',   border: 'var(--red-100)'   },
}
const SEG_TOOLTIP: Record<CotizacionSegmento, string> = {
  A: 'Minería — factor 1.9, sueldo_seg_a',
  B: 'Aguas / Saneamiento — factor empresa, sueldo_seg_b',
  C: 'Otros sectores — factor empresa, sueldo_seg_c',
}

type TabId = 'partidas' | 'gastos' | 'cronograma' | 'cisac' | 'cliente' | 'cashflow' | 'b24pry' | 'resumen_un'
const TABS: { id: TabId; label: string }[] = [
  { id: 'partidas',   label: 'Partidas' },
  { id: 'gastos',     label: 'Gastos Generales' },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'cisac',      label: 'Resumen CISAC' },
  { id: 'cliente',    label: 'Resumen Cliente' },
  { id: 'cashflow',   label: 'Cash Flow' },
  { id: 'b24pry',     label: 'B24 PRY' },
  { id: 'resumen_un', label: 'Resumen UN' },
]

// ── Formatting helpers ────────────────────────────────────────────────────────
const fmtUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtNum = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Main component ────────────────────────────────────────────────────────────
export default function CotizacionEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const editor = useCotizacionEditor(id!)
  const { tarifas } = usePersonalTarifas()
  const { totalGG } = useGastosGeneralesCot(id!)
  const _cronograma = useCronogramaCot(id!)
  const { allProductos } = useBitrixProductos()

  const {
    cotizacion, disciplinas, secciones, partidas,
    loading, error, saving,
    updateCotizacion,
    createDisciplina, deleteDisciplina: _deleteDisciplina, updateDisciplina,
    createSeccion, deleteSeccion, updateSeccion: _updateSeccion,
    createPartida, updatePartida, deletePartida,
    setPartidaLocal,
    calcCostoDirecto,
  } = editor

  const [activeTab, setActiveTab] = useState<TabId>('partidas')
  const [activeDisciplinaId, setActiveDisciplinaId] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerEdit, setHeaderEdit] = useState({ titulo: '', cliente: '', proyecto: '', ubicacion: '' })
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [newPartidaBySection, setNewPartidaBySection] = useState<Record<string, Partial<CotizacionPartida> & { _open?: boolean }>>({})
  const [savingPartida, setSavingPartida] = useState(false)
  const [addSeccionDisciplinaId, setAddSeccionDisciplinaId] = useState<string | null>(null)
  const [newSeccionNombre, setNewSeccionNombre] = useState('')
  // Bitrix product search popover
  const [bitrixOpen, setBitrixOpen] = useState<string | null>(null) // partida id
  const [bitrixSearch, setBitrixSearch] = useState('')
  const [bitrixRect, setBitrixRect] = useState<DOMRect | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disciplinasCreatedRef = useRef(false)

  if (loading) return <LoadingScreen />
  if (error || !cotizacion) return <ErrorScreen error={error} onBack={() => navigate('/cotizaciones')} />

  // ── Computed helpers ─────────────────────────────────────────────────────
  const statusStyle = STATUS_STYLE[cotizacion.status as CotizacionStatus] ?? STATUS_STYLE['Borrador']
  const segStyle    = SEG_TOOLTIP[cotizacion.segmento as CotizacionSegmento] ?? SEG_TOOLTIP['B']

  // ── Computed active discipline ────────────────────────────────────────────
  const activeDisciplina = disciplinas.find(d => d.id === activeDisciplinaId) ?? disciplinas[0] ?? null
  const activeSecciones = secciones.filter(s => s.disciplina_id === activeDisciplina?.id).sort((a, b) => a.orden - b.orden)

  // ── Ensure all 5 disciplines exist — solo una vez cuando disciplinas ya cargaron ──
  const missingDiscs = DISCIPLINAS_CONFIG.filter(cfg => !disciplinas.some(d => d.tipo === cfg.tipo))
  if (missingDiscs.length > 0 && !disciplinasCreatedRef.current) {
    disciplinasCreatedRef.current = true
    missingDiscs.forEach(cfg => {
      createDisciplina({
        cotizacion_id: cotizacion.id,
        tipo: cfg.tipo as DisciplinaTipo,
        nombre: cfg.nombre,
        imprevistos_pct: 2,
        margen_pct: cfg.margen_pct,
        orden: cfg.orden,
      })
    })
  }

  // ── Header auto-save ──────────────────────────────────────────────────────
  function triggerAutoSave(updates: Parameters<typeof updateCotizacion>[0]) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => { updateCotizacion(updates) }, 800)
  }

  // ── Partida calculation helpers ───────────────────────────────────────────
  function getMetradoForMO(p: CotizacionPartida) { return p.personas * p.dias }
  function getPUForMO(p: CotizacionPartida): number {
    if (!p.perfil_id) return p.precio_unitario
    const perfil = tarifas.find(t => t.id === p.perfil_id)
    if (!perfil) return p.precio_unitario
    return calcularTarifa(perfil, cotizacion.segmento, cotizacion.tipo_cambio)
  }
  function getPrecioParcial(p: CotizacionPartida): number {
    if (p.tipo === 'mo') return getMetradoForMO(p) * getPUForMO(p)
    return p.metrado * p.precio_unitario
  }

  function getSubtotal(secId: string): number {
    return partidas.filter(p => p.seccion_id === secId).reduce((acc, p) => acc + getPrecioParcial(p), 0)
  }
  function getCostoDirecto(disc: CotizacionDisciplina): number {
    return secciones.filter(s => s.disciplina_id === disc.id).reduce((acc, s) => acc + getSubtotal(s.id), 0)
  }
  function getPrecioVentaDisc(disc: CotizacionDisciplina): number {
    return calcPrecioVenta(getCostoDirecto(disc), disc.imprevistos_pct, disc.margen_pct)
  }
  const totalOfertaDiscs = disciplinas.reduce((acc, d) => acc + getPrecioVentaDisc(d), 0)

  // GG contribution to price
  const ggConImprevistos = totalGG * (1 + 2 / 100)
  const precioVentaGG = ggConImprevistos > 0 ? ggConImprevistos / (1 - 0.10) : 0
  const totalOferta = totalOfertaDiscs + precioVentaGG

  // ── Inline partida update with debounce ───────────────────────────────────
  function updatePartidaField(partId: string, field: keyof CotizacionPartida, value: unknown) {
    setPartidaLocal(partId, { [field]: value } as Partial<CotizacionPartida>)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await updatePartida(partId, { [field]: value } as Partial<CotizacionPartida>)
    }, 600)
  }

  // ── Add partida ───────────────────────────────────────────────────────────
  function openNewPartida(secId: string) {
    setNewPartidaBySection(prev => ({
      ...prev,
      [secId]: { tipo: 'mo', descripcion: '', personas: 1, dias: 1, unidad: 'glb', metrado: 0, precio_unitario: 0, _open: true },
    }))
  }

  async function saveNewPartida(secId: string, disciplinaId: string) {
    const np = newPartidaBySection[secId]
    if (!np || !np.descripcion?.trim()) return
    setSavingPartida(true)
    try {
      await createPartida({
        seccion_id: secId,
        disciplina_id: disciplinaId,
        tipo: np.tipo as PartidaTipo ?? 'mo',
        descripcion: np.descripcion!,
        codigo: null,
        area: null,
        producto_bitrix: null,
        perfil_id: np.perfil_id ?? null,
        personas: np.personas ?? 1,
        dias: np.dias ?? 1,
        unidad: np.unidad ?? 'glb',
        metrado: np.metrado ?? 0,
        precio_unitario: np.precio_unitario ?? 0,
        costo_compra: 0,
        notas: null,
        orden: partidas.filter(p => p.seccion_id === secId).length,
      })
      setNewPartidaBySection(prev => { const n = { ...prev }; delete n[secId]; return n })
    } finally {
      setSavingPartida(false)
    }
  }

  // ── Add seccion ───────────────────────────────────────────────────────────
  async function handleAddSeccion(disciplinaId: string) {
    if (!newSeccionNombre.trim()) return
    await createSeccion({
      disciplina_id: disciplinaId,
      codigo: null,
      nombre: newSeccionNombre.trim(),
      orden: secciones.filter(s => s.disciplina_id === disciplinaId).length,
    })
    setNewSeccionNombre('')
    setAddSeccionDisciplinaId(null)
  }

  // ── Bitrix product search ─────────────────────────────────────────────────
  const filteredProductos = bitrixSearch.trim()
    ? allProductos.filter(p =>
        p.name.toLowerCase().includes(bitrixSearch.toLowerCase()) ||
        (p.code ?? '').toLowerCase().includes(bitrixSearch.toLowerCase()) ||
        (p.section_name ?? '').toLowerCase().includes(bitrixSearch.toLowerCase()),
      )
    : allProductos.slice(0, 50)

  // Group filtered products by section
  const productosGrouped = filteredProductos.reduce<Record<string, typeof filteredProductos>>((acc, p) => {
    const section = p.section_name ?? 'Sin sección'
    if (!acc[section]) acc[section] = []
    acc[section].push(p)
    return acc
  }, {})

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, borderBottom: '1px solid var(--n-150)',
        background: '#fff', padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 12, height: 52,
      }}>
        <Link to="/cotizaciones" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--n-400)', fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>
          <ChevronLeft size={14} /> Cotizaciones
        </Link>
        <span style={{ color: 'var(--n-300)', fontSize: 13 }}>/</span>
        <span style={{ fontSize: 11.5, color: 'var(--n-500)', fontWeight: 600 }}>
          COT-{String(cotizacion.numero).padStart(3, '0')}
        </span>

        {/* Editable title */}
        {editingHeader ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <input
              autoFocus
              value={headerEdit.titulo}
              onChange={e => setHeaderEdit(p => ({ ...p, titulo: e.target.value }))}
              style={{ ...hInput, maxWidth: 300 }}
              onKeyDown={e => { if (e.key === 'Enter') { updateCotizacion({ titulo: headerEdit.titulo, cliente: headerEdit.cliente || null, proyecto: headerEdit.proyecto || null, ubicacion: headerEdit.ubicacion || null }); setEditingHeader(false) } if (e.key === 'Escape') setEditingHeader(false) }}
            />
            <input placeholder="Cliente" value={headerEdit.cliente} onChange={e => setHeaderEdit(p => ({ ...p, cliente: e.target.value }))} style={{ ...hInput, maxWidth: 150 }} />
            <input placeholder="Proyecto" value={headerEdit.proyecto} onChange={e => setHeaderEdit(p => ({ ...p, proyecto: e.target.value }))} style={{ ...hInput, maxWidth: 150 }} />
            <input placeholder="Ubicación" value={headerEdit.ubicacion} onChange={e => setHeaderEdit(p => ({ ...p, ubicacion: e.target.value }))} style={{ ...hInput, maxWidth: 130 }} />
            <button onClick={() => { updateCotizacion({ titulo: headerEdit.titulo, cliente: headerEdit.cliente || null, proyecto: headerEdit.proyecto || null, ubicacion: headerEdit.ubicacion || null }); setEditingHeader(false) }} style={{ ...smBtn('brand') }}>
              <Check size={12} /> Guardar
            </button>
          </div>
        ) : (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => { setHeaderEdit({ titulo: cotizacion.titulo, cliente: cotizacion.cliente ?? '', proyecto: cotizacion.proyecto ?? '', ubicacion: cotizacion.ubicacion ?? '' }); setEditingHeader(true) }}
            title="Click para editar"
          >
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{cotizacion.titulo}</span>
            {cotizacion.cliente && <Chip icon={<User size={10} />} text={cotizacion.cliente} />}
            {cotizacion.proyecto && <Chip icon={<FolderOpen size={10} />} text={cotizacion.proyecto} />}
            {cotizacion.ubicacion && <Chip icon={<MapPin size={10} />} text={cotizacion.ubicacion} />}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
          {/* Segmento */}
          <select
            value={cotizacion.segmento}
            onChange={e => updateCotizacion({ segmento: e.target.value as CotizacionSegmento })}
            title={segStyle}
            style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 12, fontWeight: 600, color: 'var(--brand-700)', background: 'var(--brand-50)', cursor: 'pointer' }}
          >
            <option value="A">Seg A – Minería</option>
            <option value="B">Seg B – Aguas</option>
            <option value="C">Seg C – Otros</option>
          </select>

          {/* Plazo semanas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--n-600)' }}>
            <span>Plazo</span>
            <input
              key={cotizacion.plazo_semanas}
              type="number"
              step="1"
              min="1"
              defaultValue={cotizacion.plazo_semanas ?? ''}
              onBlur={e => updateCotizacion({ plazo_semanas: parseInt(e.target.value) || null })}
              placeholder="—"
              style={{ width: 52, height: 28, padding: '0 6px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 12, color: 'var(--n-800)' }}
            />
            <span>sem.</span>
          </div>

          {/* Tipo cambio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--n-600)' }}>
            <span>TC S/.</span>
            <input
              type="number"
              step="0.01"
              value={cotizacion.tipo_cambio}
              onChange={e => triggerAutoSave({ tipo_cambio: parseFloat(e.target.value) || 3.5 })}
              style={{ width: 60, height: 28, padding: '0 6px', borderRadius: 6, border: '1px solid var(--n-200)', fontSize: 12, color: 'var(--n-800)' }}
            />
          </div>

          {/* Status */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatusMenu(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {cotizacion.status} <ChevronDown size={10} />
            </button>
            {showStatusMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--n-150)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 30, minWidth: 140, overflow: 'hidden' }}>
                {COTIZACION_STATUSES.map(s => {
                  const st = STATUS_STYLE[s]
                  return (
                    <button
                      key={s}
                      onClick={() => { updateCotizacion({ status: s }); setShowStatusMenu(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 12, fontWeight: 500, background: cotizacion.status === s ? st.bg : 'transparent', color: cotizacion.status === s ? st.color : 'var(--n-700)', border: 'none', cursor: 'pointer' }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Save indicator */}
          {saving ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--n-400)' }}>
              <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Guardando…
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--green-600)' }}>
              <Check size={11} /> Guardado
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--n-150)',
        background: '#fff',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        height: 40,
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: 38,
                padding: '0 16px',
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--brand-700)' : 'var(--n-500)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--brand-600)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color .15s, border-color .15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--n-800)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--n-500)' }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* ── PARTIDAS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'partidas' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Left: Discipline tabs */}
            <div style={{
              width: 220, flexShrink: 0,
              borderRight: '1px solid var(--n-150)',
              background: 'var(--n-25)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto', padding: '12px 8px',
              gap: 2,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '2px 8px', marginBottom: 4 }}>
                Disciplinas
              </div>
              {DISCIPLINAS_CONFIG.map(cfg => {
                const disc = disciplinas.find(d => d.tipo === cfg.tipo)
                if (!disc) return null
                const isActive = disc.id === activeDisciplina?.id
                const costoDir = getCostoDirecto(disc)
                return (
                  <button
                    key={disc.id}
                    onClick={() => setActiveDisciplinaId(disc.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: isActive ? 'var(--brand-50)' : 'transparent',
                      textAlign: 'left', transition: 'background .15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--n-100)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {isActive && <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, background: 'var(--brand-500)', borderRadius: '0 2px 2px 0' }} />}
                    <span style={{ fontSize: 12.5, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--brand-800)' : 'var(--n-700)', lineHeight: 1.3 }}>{disc.nombre}</span>
                    {costoDir > 0 && (
                      <span style={{ fontSize: 10.5, color: isActive ? 'var(--brand-600)' : 'var(--n-400)', marginTop: 2, fontWeight: 600 }}>
                        {fmtUSD(costoDir)} CD
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Center: Sections & Partidas */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {!activeDisciplina ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>Cargando disciplinas…</div>
              ) : (
                <>
                  {/* Discipline header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>{activeDisciplina.nombre}</h2>
                    <button
                      onClick={() => { setAddSeccionDisciplinaId(activeDisciplina.id); setNewSeccionNombre('') }}
                      style={{ ...smBtn('brand'), marginLeft: 'auto' }}
                    >
                      <Plus size={12} /> Agregar sección
                    </button>
                  </div>

                  {/* Add section form */}
                  {addSeccionDisciplinaId === activeDisciplina.id && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, background: 'var(--brand-50)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--brand-100)' }}>
                      <input
                        autoFocus
                        value={newSeccionNombre}
                        onChange={e => setNewSeccionNombre(e.target.value)}
                        placeholder="Nombre de la sección…"
                        style={{ flex: 1, height: 30, padding: '0 10px', borderRadius: 6, border: '1px solid var(--brand-200)', fontSize: 12.5, background: '#fff' }}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSeccion(activeDisciplina.id); if (e.key === 'Escape') setAddSeccionDisciplinaId(null) }}
                      />
                      <button onClick={() => handleAddSeccion(activeDisciplina.id)} style={{ ...smBtn('brand') }}><Check size={12} /> Crear</button>
                      <button onClick={() => setAddSeccionDisciplinaId(null)} style={{ ...smBtn('n') }}><span>×</span></button>
                    </div>
                  )}

                  {activeSecciones.length === 0 && addSeccionDisciplinaId !== activeDisciplina.id && (
                    <div style={{ padding: '32px 24px', textAlign: 'center', background: 'var(--n-25)', border: '1px dashed var(--n-200)', borderRadius: 10 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--n-400)', marginBottom: 10 }}>Sin secciones en esta disciplina</div>
                      <button onClick={() => { setAddSeccionDisciplinaId(activeDisciplina.id); setNewSeccionNombre('') }} style={{ ...smBtn('brand') }}>
                        <Plus size={12} /> Agregar primera sección
                      </button>
                    </div>
                  )}

                  {/* Sections */}
                  {activeSecciones.map(sec => {
                    const isCollapsed = collapsedSections.has(sec.id)
                    const secPartidas = partidas.filter(p => p.seccion_id === sec.id).sort((a, b) => a.orden - b.orden)
                    const subtotal = getSubtotal(sec.id)
                    const np = newPartidaBySection[sec.id]

                    return (
                      <div key={sec.id} style={{ marginBottom: 14, background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, overflow: 'hidden' }}>
                        {/* Section header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                          background: 'var(--n-50)', borderBottom: isCollapsed ? 'none' : '1px solid var(--n-100)',
                          cursor: 'pointer',
                        }}
                          onClick={() => setCollapsedSections(prev => {
                            const n = new Set(prev)
                            if (n.has(sec.id)) n.delete(sec.id)
                            else n.add(sec.id)
                            return n
                          })}
                        >
                          {isCollapsed ? <ChevronRight size={13} style={{ color: 'var(--n-400)', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'var(--n-400)', flexShrink: 0 }} />}
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-800)', flex: 1 }}>{sec.nombre}</span>
                          {subtotal > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-700)', marginRight: 8 }}>
                              {fmtUSD(subtotal)}
                            </span>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); openNewPartida(sec.id) }}
                            style={{ ...smBtn('brand'), fontSize: 11 }}
                            title="Agregar partida"
                          >
                            <Plus size={11} /> Partida
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteSeccion(sec.id) }}
                            style={{ padding: '3px 5px', borderRadius: 5, border: '1px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-500)', cursor: 'pointer', fontSize: 11, display: 'flex' }}
                            title="Eliminar sección"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        {!isCollapsed && (
                          <div style={{ overflowX: 'auto' }}>
                            {/* Partidas table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr style={{ background: 'var(--n-25)' }}>
                                  <th style={th}>#</th>
                                  <th style={th}>Tipo</th>
                                  <th style={{ ...th, minWidth: 200 }}>Descripción / Perfil</th>
                                  <th style={{ ...th, minWidth: 140 }}>Producto Bitrix</th>
                                  <th style={th}>Pers.</th>
                                  <th style={th}>Días</th>
                                  <th style={th}>Unidad</th>
                                  <th style={th}>Metrado</th>
                                  <th style={th}>P.U. USD</th>
                                  <th style={{ ...th, background: 'var(--brand-50)', color: 'var(--brand-700)' }}>P. Parcial</th>
                                  <th style={th}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {secPartidas.map((p, i) => {
                                  const isMO = p.tipo === 'mo'
                                  const metrado = isMO ? getMetradoForMO(p) : p.metrado
                                  const pu = isMO ? getPUForMO(p) : p.precio_unitario
                                  const parcial = metrado * pu
                                  const tc = TIPO_COLORS[p.tipo]
                                  const isBitrixOpen = bitrixOpen === p.id

                                  return (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--n-75, var(--n-100))' }}>
                                      <td style={td}><span style={{ color: 'var(--n-400)', fontSize: 11 }}>{i + 1}</span></td>
                                      <td style={td}>
                                        <select
                                          value={p.tipo}
                                          onChange={e => updatePartidaField(p.id, 'tipo', e.target.value)}
                                          style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 5px', borderRadius: 20, border: 'none', background: tc.bg, color: tc.color, cursor: 'pointer' }}
                                        >
                                          {(Object.keys(TIPO_LABELS) as PartidaTipo[]).map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                                        </select>
                                      </td>
                                      <td style={td}>
                                        {isMO ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <select
                                              value={p.perfil_id ?? ''}
                                              onChange={e => updatePartidaField(p.id, 'perfil_id', e.target.value || null)}
                                              style={{ fontSize: 11.5, padding: '2px 6px', borderRadius: 5, border: '1px solid var(--n-200)', background: '#fff', color: 'var(--n-800)', width: '100%' }}
                                            >
                                              <option value="">— Perfil manual —</option>
                                              {tarifas.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.perfil}</option>)}
                                            </select>
                                            <input
                                              value={p.descripcion}
                                              onChange={e => updatePartidaField(p.id, 'descripcion', e.target.value)}
                                              placeholder="Descripción…"
                                              style={{ ...inlineInput, fontSize: 11 }}
                                            />
                                          </div>
                                        ) : (
                                          <input
                                            value={p.descripcion}
                                            onChange={e => updatePartidaField(p.id, 'descripcion', e.target.value)}
                                            placeholder="Descripción…"
                                            style={inlineInput}
                                          />
                                        )}
                                      </td>

                                      {/* Bitrix product searchable select */}
                                      <td style={td}>
                                        <button
                                          onClick={e => {
                                            if (isBitrixOpen) { setBitrixOpen(null); return }
                                            setBitrixRect(e.currentTarget.getBoundingClientRect())
                                            setBitrixOpen(p.id)
                                            setBitrixSearch('')
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            width: '100%',
                                            maxWidth: 140,
                                            height: 26,
                                            padding: '0 6px',
                                            borderRadius: 5,
                                            border: '1px solid var(--n-200)',
                                            background: '#fff',
                                            color: p.producto_bitrix ? 'var(--n-800)' : 'var(--n-400)',
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                          title={p.producto_bitrix ?? 'Seleccionar producto Bitrix'}
                                        >
                                          <Search size={10} style={{ flexShrink: 0, color: 'var(--n-400)' }} />
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                            {p.producto_bitrix ?? 'Producto…'}
                                          </span>
                                        </button>
                                      </td>

                                      <td style={td}>
                                        {isMO
                                          ? <NumInput value={p.personas} onChange={v => updatePartidaField(p.id, 'personas', v)} />
                                          : <span style={{ color: 'var(--n-300)', fontSize: 11 }}>—</span>}
                                      </td>
                                      <td style={td}>
                                        {isMO
                                          ? <NumInput value={p.dias} onChange={v => updatePartidaField(p.id, 'dias', v)} />
                                          : <span style={{ color: 'var(--n-300)', fontSize: 11 }}>—</span>}
                                      </td>
                                      <td style={td}>
                                        <input
                                          value={p.unidad}
                                          onChange={e => updatePartidaField(p.id, 'unidad', e.target.value)}
                                          style={{ ...inlineInput, width: 50 }}
                                        />
                                      </td>
                                      <td style={td}>
                                        {isMO
                                          ? <span style={{ fontSize: 12, color: 'var(--n-700)', fontWeight: 500 }}>{metrado}</span>
                                          : <NumInput value={p.metrado} onChange={v => updatePartidaField(p.id, 'metrado', v)} decimals />}
                                      </td>
                                      <td style={td}>
                                        {isMO && p.perfil_id
                                          ? <span style={{ fontSize: 12, color: 'var(--brand-700)', fontWeight: 600 }}>{fmtNum(pu)}</span>
                                          : <NumInput value={p.precio_unitario} onChange={v => updatePartidaField(p.id, 'precio_unitario', v)} decimals />}
                                      </td>
                                      <td style={{ ...td, background: 'var(--brand-50)', fontWeight: 700, color: 'var(--brand-800)', textAlign: 'right', paddingRight: 12 }}>
                                        {fmtNum(parcial)}
                                      </td>
                                      <td style={td}>
                                        <button onClick={() => deletePartida(p.id)} style={{ padding: '3px 5px', borderRadius: 5, border: '1px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-500)', cursor: 'pointer' }}>
                                          <Trash2 size={11} />
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                })}

                                {/* New partida row */}
                                {np?._open && (
                                  <tr style={{ borderBottom: '1px solid var(--n-100)', background: 'var(--green-50)' }}>
                                    <td style={td}><span style={{ color: 'var(--n-400)', fontSize: 11 }}>+</span></td>
                                    <td style={td}>
                                      <select
                                        value={np.tipo ?? 'mo'}
                                        onChange={e => setNewPartidaBySection(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], tipo: e.target.value as PartidaTipo } }))}
                                        style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 5px', borderRadius: 20, border: 'none', background: 'var(--n-100)', color: 'var(--n-700)', cursor: 'pointer' }}
                                      >
                                        {(Object.keys(TIPO_LABELS) as PartidaTipo[]).map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                                      </select>
                                    </td>
                                    <td style={td}>
                                      <input
                                        autoFocus
                                        value={np.descripcion ?? ''}
                                        onChange={e => setNewPartidaBySection(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], descripcion: e.target.value } }))}
                                        placeholder="Descripción…"
                                        style={inlineInput}
                                        onKeyDown={e => { if (e.key === 'Enter') saveNewPartida(sec.id, activeDisciplina.id); if (e.key === 'Escape') setNewPartidaBySection(prev => { const n = { ...prev }; delete n[sec.id]; return n }) }}
                                      />
                                    </td>
                                    <td style={td} />
                                    <td style={td}><NumInput value={np.personas ?? 1} onChange={v => setNewPartidaBySection(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], personas: v } }))} /></td>
                                    <td style={td}><NumInput value={np.dias ?? 1} onChange={v => setNewPartidaBySection(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], dias: v } }))} /></td>
                                    <td style={td}>
                                      <input value={np.unidad ?? 'glb'} onChange={e => setNewPartidaBySection(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], unidad: e.target.value } }))} style={{ ...inlineInput, width: 50 }} />
                                    </td>
                                    <td style={td}><NumInput value={np.metrado ?? 0} onChange={v => setNewPartidaBySection(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], metrado: v } }))} decimals /></td>
                                    <td style={td}><NumInput value={np.precio_unitario ?? 0} onChange={v => setNewPartidaBySection(prev => ({ ...prev, [sec.id]: { ...prev[sec.id], precio_unitario: v } }))} decimals /></td>
                                    <td style={{ ...td, background: 'var(--brand-50)' }}></td>
                                    <td style={td}>
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => saveNewPartida(sec.id, activeDisciplina.id)} disabled={savingPartida} style={{ padding: '3px 5px', borderRadius: 5, border: 'none', background: 'var(--green-500, var(--green-600))', color: '#fff', cursor: 'pointer' }}>
                                          <Check size={11} />
                                        </button>
                                        <button onClick={() => setNewPartidaBySection(prev => { const n = { ...prev }; delete n[sec.id]; return n })} style={{ padding: '3px 5px', borderRadius: 5, border: '1px solid var(--n-200)', background: '#fff', cursor: 'pointer', color: 'var(--n-500)' }}>
                                          <span style={{ fontSize: 12 }}>×</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}

                                {secPartidas.length === 0 && !np?._open && (
                                  <tr>
                                    <td colSpan={11} style={{ padding: '14px 14px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
                                      Sin partidas.{' '}
                                      <button onClick={() => openNewPartida(sec.id)} style={{ background: 'none', border: 'none', color: 'var(--brand-600)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>
                                        Agregar primera partida
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>

                            {/* Section subtotal row */}
                            {secPartidas.length > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '7px 14px', borderTop: '1px solid var(--n-100)', background: 'var(--n-25)' }}>
                                <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Subtotal sección: </span>
                                <span style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)' }}>{fmtUSD(subtotal)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* Right: Summary panel */}
            <div style={{
              width: 260, flexShrink: 0, overflowY: 'auto',
              borderLeft: '1px solid var(--n-150)',
              background: '#fff', padding: '16px 14px',
            }}>
              {activeDisciplina && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-700)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--n-100)' }}>
                    {activeDisciplina.nombre}
                  </div>

                  {/* Cost breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    <SummaryRow label="Costo Directo" value={fmtUSD(getCostoDirecto(activeDisciplina))} />

                    {/* Imprevistos editable */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Imprevistos %</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          step="0.5"
                          value={activeDisciplina.imprevistos_pct}
                          onChange={e => updateDisciplina(activeDisciplina.id, { imprevistos_pct: parseFloat(e.target.value) || 0 })}
                          style={{ width: 50, height: 24, padding: '0 6px', borderRadius: 5, border: '1px solid var(--n-200)', fontSize: 12, textAlign: 'right' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--n-400)' }}>%</span>
                      </div>
                    </div>

                    <SummaryRow
                      label="C.D. + Imprevistos"
                      value={fmtUSD(getCostoDirecto(activeDisciplina) * (1 + activeDisciplina.imprevistos_pct / 100))}
                      subtle
                    />

                    {/* Margen editable */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Margen %</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          step="0.5"
                          value={activeDisciplina.margen_pct}
                          onChange={e => updateDisciplina(activeDisciplina.id, { margen_pct: parseFloat(e.target.value) || 0 })}
                          style={{ width: 50, height: 24, padding: '0 6px', borderRadius: 5, border: '1px solid var(--n-200)', fontSize: 12, textAlign: 'right' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--n-400)' }}>%</span>
                      </div>
                    </div>

                    {/* Precio venta — highlighted */}
                    <div style={{ background: 'var(--brand-50)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--brand-100)', marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--brand-600)', marginBottom: 3 }}>Precio Venta</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-800)' }}>
                        {fmtUSD(getPrecioVentaDisc(activeDisciplina))}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--brand-500)', marginTop: 2 }}>
                        S/. {(getPrecioVentaDisc(activeDisciplina) * cotizacion.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Global summary */}
              <div style={{ borderTop: '1px solid var(--n-150)', paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Resumen global</div>
                {disciplinas.sort((a, b) => a.orden - b.orden).map(d => {
                  const pv = getPrecioVentaDisc(d)
                  return (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--n-600)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.nombre}>{d.nombre}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: pv > 0 ? 'var(--n-800)' : 'var(--n-300)' }}>{fmtUSD(pv)}</span>
                    </div>
                  )
                })}

                {/* GG line */}
                {totalGG > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--n-600)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>+ Gastos Generales</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-800)' }}>{fmtUSD(precioVentaGG)}</span>
                  </div>
                )}

                {/* Total */}
                <div style={{ background: 'var(--n-900)', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--n-300)', marginBottom: 3 }}>PRECIO OFERTA TOTAL</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{fmtUSD(totalOferta)}</div>
                  <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 2 }}>
                    S/. {(totalOferta * cotizacion.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GASTOS GENERALES TAB ────────────────────────────────────────── */}
        {activeTab === 'gastos' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <GastosGeneralesTab cotizacionId={id!} />
          </div>
        )}

        {/* ── CRONOGRAMA TAB ──────────────────────────────────────────────── */}
        {activeTab === 'cronograma' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <CronogramaTab
              cotizacionId={id!}
              plazoSemanas={cotizacion.plazo_semanas ?? 40}
            />
          </div>
        )}

        {/* ── RESUMEN CISAC TAB ───────────────────────────────────────────── */}
        {activeTab === 'cisac' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ResumenCISACTab
              cotizacion={cotizacion}
              disciplinas={disciplinas}
              secciones={secciones}
              partidas={partidas}
              tarifas={tarifas}
              calcCostoDirecto={calcCostoDirecto}
              totalGG={totalGG}
            />
          </div>
        )}

        {/* ── RESUMEN CLIENTE TAB ─────────────────────────────────────────── */}
        {activeTab === 'cliente' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ResumenClienteTab
              cotizacion={cotizacion}
              disciplinas={disciplinas}
              secciones={secciones}
              partidas={partidas}
              tarifas={tarifas}
              calcCostoDirecto={calcCostoDirecto}
              totalGG={totalGG}
              updateCotizacion={updateCotizacion}
            />
          </div>
        )}

        {/* ── CASH FLOW TAB ───────────────────────────────────────────────── */}
        {activeTab === 'cashflow' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <CashFlowTab
              cotizacionId={id!}
              plazoSemanas={cotizacion.plazo_semanas ?? 16}
              precioVentaTotal={totalOferta}
            />
          </div>
        )}

        {/* ── B24 PRY TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'b24pry' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ResumenB24PRYTab
              cotizacion={cotizacion}
              partidas={partidas}
              tarifas={tarifas}
            />
          </div>
        )}

        {/* ── RESUMEN UN TAB ──────────────────────────────────────────────── */}
        {activeTab === 'resumen_un' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ResumenUNTab
              cotizacion={cotizacion}
              disciplinas={disciplinas}
              secciones={secciones}
              partidas={partidas}
              tarifas={tarifas}
              totalGG={totalGG}
            />
          </div>
        )}
      </div>

      {/* Close overlays on outside click */}
      {showStatusMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={() => setShowStatusMenu(false)} />
      )}

      {/* Bitrix popover — fixed, fuera de la tabla para evitar clipping */}
      {bitrixOpen && bitrixRect && (() => {
        const POPOVER_W = 320
        const POPOVER_MAX_H = 280
        const spaceBelow = window.innerHeight - bitrixRect.bottom - 4
        const showAbove = spaceBelow < 200
        const top = showAbove
          ? bitrixRect.top - Math.min(POPOVER_MAX_H, 260) - 4
          : bitrixRect.bottom + 4
        const left = Math.min(bitrixRect.left, window.innerWidth - POPOVER_W - 8)
        const partida = partidas.find(p => p.id === bitrixOpen)

        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 45 }} onClick={() => setBitrixOpen(null)} />
            <div style={{
              position: 'fixed',
              top,
              left,
              zIndex: 46,
              width: POPOVER_W,
              background: '#fff',
              border: '1px solid var(--n-200)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
              overflow: 'hidden',
            }}>
              {/* Search */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--n-100)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Search size={12} style={{ color: 'var(--n-400)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={bitrixSearch}
                  onChange={e => setBitrixSearch(e.target.value)}
                  placeholder="Buscar producto…"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, color: 'var(--n-800)' }}
                />
              </div>
              {/* List */}
              <div style={{ maxHeight: POPOVER_MAX_H, overflowY: 'auto' }}>
                <button
                  onClick={() => { if (partida) updatePartidaField(partida.id, 'producto_bitrix', null); setBitrixOpen(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 11.5, color: 'var(--n-400)', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--n-100)' }}
                >
                  — Sin producto —
                </button>
                {Object.keys(productosGrouped).length === 0 && (
                  <div style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--n-400)', fontSize: 12 }}>
                    Sin resultados
                  </div>
                )}
                {Object.entries(productosGrouped).map(([section, prods]) => (
                  <div key={section}>
                    <div style={{ padding: '5px 12px 3px', fontSize: 10, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--n-25)', borderTop: '1px solid var(--n-100)' }}>
                      {section}
                    </div>
                    {prods.map(prod => (
                      <button
                        key={prod.id}
                        onClick={() => { if (partida) updatePartidaField(partida.id, 'producto_bitrix', prod.name); setBitrixOpen(null) }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '6px 12px', fontSize: 11.5,
                          color: partida?.producto_bitrix === prod.name ? 'var(--brand-700)' : 'var(--n-800)',
                          background: partida?.producto_bitrix === prod.name ? 'var(--brand-50)' : 'transparent',
                          border: 'none', cursor: 'pointer',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-50)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = partida?.producto_bitrix === prod.name ? 'var(--brand-50)' : 'transparent' }}
                        title={prod.name}
                      >
                        {prod.name}
                        {prod.code && <span style={{ color: 'var(--n-400)', fontSize: 10.5, marginLeft: 6 }}>{prod.code}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--n-500)', background: 'var(--n-75, var(--n-100))', padding: '2px 7px', borderRadius: 20 }}>
      {icon} {text}
    </span>
  )
}

function SummaryRow({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11.5, color: subtle ? 'var(--n-400)' : 'var(--n-500)' }}>{label}</span>
      <span style={{ fontSize: subtle ? 11.5 : 12, fontWeight: 600, color: subtle ? 'var(--n-600)' : 'var(--n-800)' }}>{value}</span>
    </div>
  )
}

function NumInput({ value, onChange, decimals }: { value: number; onChange: (v: number) => void; decimals?: boolean }) {
  return (
    <input
      type="number"
      step={decimals ? '0.01' : '1'}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      style={{ width: 72, height: 26, padding: '0 6px', borderRadius: 5, border: '1px solid var(--n-150)', fontSize: 12, color: 'var(--n-800)', textAlign: 'right', background: '#fff' }}
    />
  )
}

function LoadingScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-400)', fontSize: 12.5 }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Cargando cotización…
    </div>
  )
}
function ErrorScreen({ error, onBack }: { error: string | null; onBack: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <AlertCircle size={24} style={{ color: 'var(--red-500)' }} />
      <div style={{ fontSize: 13, color: 'var(--n-700)' }}>{error ?? 'Cotización no encontrada'}</div>
      <button onClick={onBack} style={{ fontSize: 12, color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Volver al listado</button>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
function smBtn(color: 'brand' | 'n'): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: color === 'brand' ? 'none' : '1px solid var(--n-200)',
    background: color === 'brand' ? 'var(--brand-600)' : '#fff',
    color: color === 'brand' ? '#fff' : 'var(--n-700)',
  }
}
const hInput: React.CSSProperties = {
  height: 30, padding: '0 10px', borderRadius: 6,
  border: '1px solid var(--brand-200)', fontSize: 13, fontWeight: 600,
  color: 'var(--n-900)', background: '#fff', outline: 'none',
}
const inlineInput: React.CSSProperties = {
  width: '100%', height: 26, padding: '0 6px', borderRadius: 5,
  border: '1px solid transparent', fontSize: 12.5,
  color: 'var(--n-800)', background: 'transparent',
  transition: 'border-color .15s, background .15s',
}
const th: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 700,
  color: 'var(--n-500)', borderBottom: '1px solid var(--n-100)', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '6px 8px', verticalAlign: 'middle',
}
