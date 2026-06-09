import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useComparativoDetail } from '../../hooks/usePurchaseComparisons'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useBudgetItemsByProject } from '../../hooks/useBudgetItemsByProject'
import { useProjects } from '../../hooks/useProjects'
import type { ComparisonStatus, ComparisonItem, ComparisonQuote } from '../../lib/types'
import { COMPARISON_STATUSES } from '../../lib/types'
import {
  ArrowLeft, Plus, Trash2, X, Check, Star, StarOff,
  ChevronDown, Pencil, Building2, PackagePlus,
  TrendingDown, Search, FolderOpen,
} from 'lucide-react'

const STATUS_STYLE: Record<ComparisonStatus, { bg: string; color: string; border: string }> = {
  'Borrador':      { bg: 'var(--n-100)',    color: 'var(--n-600)',     border: 'var(--n-200)' },
  'En Evaluación': { bg: 'var(--amber-50)', color: 'var(--amber-700)', border: 'var(--amber-200)' },
  'Aprobado':      { bg: 'var(--green-50)', color: 'var(--green-700)', border: 'var(--green-200)' },
  'Cerrado':       { bg: 'var(--brand-50)', color: 'var(--brand-700)', border: 'var(--brand-200)' },
}

function fmt(amount: number, currency = 'PEN') {
  const sym = currency === 'USD' ? 'US$ ' : 'S/ '
  return sym + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtNum(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ComparativoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    comparison, items, compSuppliers, quotes, loading, error,
    addItem, updateItem, deleteItem,
    addSupplier, removeSupplier,
    upsertQuote, selectQuote, updateComparison,
  } = useComparativoDetail(id!)

  const { suppliers } = useSuppliers()
  const { projects } = useProjects()
  const { items: budgetItems, loading: loadingInsumos } = useBudgetItemsByProject(comparison?.project_id ?? null)

  const projectName = useMemo(
    () => projects.find(p => p.id === comparison?.project_id)?.name,
    [projects, comparison?.project_id],
  )

  // ── Cell editing ───────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{ itemId: string; csId: string } | null>(null)
  const [cellValue, setCellValue] = useState('')
  const cellInputRef = useRef<HTMLInputElement>(null)

  // ── Modal states ───────────────────────────────────────────
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [showEditMeta, setShowEditMeta] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null)
  const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState<string | null>(null)

  // ── Item form ──────────────────────────────────────────────
  const [insumoSearch, setInsumoSearch] = useState('')
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState('')
  const [itemForm, setItemForm] = useState({ description: '', unit: 'und', quantity: '1', notes: '' })
  const [itemFormErr, setItemFormErr] = useState('')
  const [savingItem, setSavingItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // ── Supplier form ──────────────────────────────────────────
  const [supplierInput, setSupplierInput] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [savingSupplier, setSavingSupplier] = useState(false)

  // ── Meta form ──────────────────────────────────────────────
  const [metaForm, setMetaForm] = useState({ title: '', currency: 'PEN', notes: '' })
  const [savingMeta, setSavingMeta] = useState(false)

  useEffect(() => {
    if (editingCell && cellInputRef.current) cellInputRef.current.focus()
  }, [editingCell])

  // ── Derived ────────────────────────────────────────────────
  const quoteMap = useMemo(() => {
    const m = new Map<string, ComparisonQuote>()
    quotes.forEach(q => m.set(`${q.item_id}:${q.comparison_supplier_id}`, q))
    return m
  }, [quotes])

  const filteredInsumos = useMemo(() =>
    budgetItems.filter(bi =>
      !insumoSearch ||
      bi.name.toLowerCase().includes(insumoSearch.toLowerCase()) ||
      (bi.code ?? '').toLowerCase().includes(insumoSearch.toLowerCase())
    ), [budgetItems, insumoSearch])

  function getQuote(itemId: string, csId: string) {
    return quoteMap.get(`${itemId}:${csId}`)
  }

  function getBestPrice(itemId: string): number | null {
    const prices = compSuppliers
      .map(cs => getQuote(itemId, cs.id))
      .filter((q): q is ComparisonQuote => !!q && q.unit_price > 0)
      .map(q => q.unit_price)
    if (prices.length === 0) return null
    return Math.min(...prices)
  }

  function getSupplierTotal(csId: string): number {
    return items.reduce((sum, item) => {
      const q = getQuote(item.id, csId)
      return sum + (q && q.unit_price > 0 ? q.unit_price * item.quantity : 0)
    }, 0)
  }

  function getSelectedTotal(): number {
    return items.reduce((sum, item) => {
      const sel = quotes.find(q => q.item_id === item.id && q.is_selected)
      return sum + (sel ? sel.unit_price * item.quantity : 0)
    }, 0)
  }

  function getSelectedSupplierForItem(itemId: string) {
    const sel = quotes.find(q => q.item_id === itemId && q.is_selected)
    if (!sel) return null
    return compSuppliers.find(cs => cs.id === sel.comparison_supplier_id) ?? null
  }

  const completedItems = items.filter(item => !!quotes.find(q => q.item_id === item.id && q.is_selected)).length
  const currency = comparison?.currency ?? 'PEN'

  // ── Cell ───────────────────────────────────────────────────
  function startEdit(itemId: string, csId: string) {
    const q = getQuote(itemId, csId)
    setEditingCell({ itemId, csId })
    setCellValue(q && q.unit_price > 0 ? String(q.unit_price) : '')
  }

  async function commitEdit(itemId: string, csId: string) {
    const price = parseFloat(cellValue.replace(',', '.')) || 0
    setEditingCell(null)
    if (price >= 0) {
      try { await upsertQuote(itemId, csId, price) } catch { /* handled */ }
    }
  }

  function handleCellKeyDown(e: React.KeyboardEvent, itemId: string, csId: string) {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit(itemId, csId) }
    if (e.key === 'Escape') setEditingCell(null)
  }

  // ── Items ──────────────────────────────────────────────────
  function openAddItem() {
    setEditingItemId(null)
    setInsumoSearch('')
    setSelectedBudgetItemId('')
    setItemForm({ description: '', unit: 'und', quantity: '1', notes: '' })
    setItemFormErr('')
    setShowAddItem(true)
  }

  function openEditItem(item: ComparisonItem) {
    setEditingItemId(item.id)
    setSelectedBudgetItemId(item.budget_item_id ?? '')
    setItemForm({ description: item.description, unit: item.unit, quantity: String(item.quantity), notes: item.notes ?? '' })
    setItemFormErr('')
    setShowAddItem(true)
  }

  function selectInsumo(budgetItemId: string) {
    const bi = budgetItems.find(b => b.id === budgetItemId)
    if (!bi) return
    setSelectedBudgetItemId(budgetItemId)
    setItemForm(p => ({ ...p, description: bi.name, unit: bi.unit }))
  }

  async function handleSaveItem() {
    if (!itemForm.description.trim()) { setItemFormErr('La descripción es requerida'); return }
    const qty = parseFloat(itemForm.quantity.replace(',', '.'))
    if (!qty || qty <= 0) { setItemFormErr('La cantidad debe ser mayor a 0'); return }
    setSavingItem(true)
    try {
      const payload = {
        description: itemForm.description.trim(),
        unit: itemForm.unit,
        quantity: qty,
        notes: itemForm.notes || undefined,
        budget_item_id: selectedBudgetItemId || undefined,
      }
      if (editingItemId) await updateItem(editingItemId, payload)
      else await addItem(payload)
      setShowAddItem(false)
    } catch (e) {
      setItemFormErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSavingItem(false)
    }
  }

  // ── Suppliers ──────────────────────────────────────────────
  async function handleAddSupplier() {
    const name = selectedSupplierId
      ? suppliers.find(s => s.id === selectedSupplierId)?.name ?? supplierInput.trim()
      : supplierInput.trim()
    if (!name) return
    setSavingSupplier(true)
    try {
      await addSupplier(name, selectedSupplierId || undefined)
      setShowAddSupplier(false)
      setSupplierInput('')
      setSelectedSupplierId('')
    } catch { /* handled */ } finally {
      setSavingSupplier(false)
    }
  }

  // ── Meta ───────────────────────────────────────────────────
  function openEditMeta() {
    if (!comparison) return
    setMetaForm({ title: comparison.title, currency: comparison.currency, notes: comparison.notes ?? '' })
    setShowEditMeta(true)
  }

  async function handleSaveMeta() {
    if (!metaForm.title.trim()) return
    setSavingMeta(true)
    try {
      await updateComparison({ title: metaForm.title.trim(), currency: metaForm.currency, notes: metaForm.notes || null })
      setShowEditMeta(false)
    } catch { /* handled */ } finally {
      setSavingMeta(false)
    }
  }

  async function handleChangeStatus(status: ComparisonStatus) {
    setShowStatusMenu(false)
    try { await updateComparison({ status }) } catch { /* handled */ }
  }

  // ──────────────────────────────────────────────────────────
  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
  if (error || !comparison) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--red-600)', fontSize: 13 }}>{error ?? 'No encontrado'}</div>

  const st = STATUS_STYLE[comparison.status]
  const selectedTotal = getSelectedTotal()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--n-150)', background: '#fff', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 54 }}>
          <button
            onClick={() => navigate('/compras')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--n-500)', fontSize: 12.5, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--n-100)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ArrowLeft size={14} /> Compras
          </button>
          <span style={{ color: 'var(--n-300)' }}>/</span>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-400)', letterSpacing: '0.06em', flexShrink: 0 }}>
              PC-{String(comparison.number).padStart(3, '0')}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {comparison.title}
            </span>
            {projectName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                <FolderOpen size={11} />{projectName}
              </span>
            )}
          </div>

          {/* Status */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', border: 'none', background: st.bg, color: st.color, fontSize: 12, fontWeight: 600 }}
            >
              {comparison.status} <ChevronDown size={11} />
            </button>
            {showStatusMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setShowStatusMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 40, background: '#fff', border: '1px solid var(--n-150)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', minWidth: 160 }}>
                  {COMPARISON_STATUSES.map(s => {
                    const ss = STATUS_STYLE[s]
                    return (
                      <button key={s} onClick={() => handleChangeStatus(s)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer', background: comparison.status === s ? 'var(--n-50)' : '#fff', fontSize: 13, color: ss.color, textAlign: 'left' }}>
                        {comparison.status === s ? <Check size={12} /> : <span style={{ width: 12 }} />}
                        {s}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <button onClick={openEditMeta} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12.5, cursor: 'pointer', color: 'var(--n-700)', flexShrink: 0 }}>
            <Pencil size={13} /> Editar
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ flexShrink: 0, background: 'var(--n-25)', borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', padding: '0 24px', height: 44, gap: 0, overflowX: 'auto' }}>
        {[
          { label: 'Ítems', value: items.length },
          { label: 'Proveedores', value: compSuppliers.length },
          { label: 'Con selección', value: `${completedItems} / ${items.length}` },
          { label: 'Total seleccionado', value: fmt(selectedTotal, currency), highlight: true },
        ].map((s, i) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div style={{ width: 1, height: 20, background: 'var(--n-200)', margin: '0 16px' }} />}
            <div style={{ whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 11, color: 'var(--n-500)', marginRight: 6 }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.highlight ? 'var(--brand-700)' : 'var(--n-900)' }}>{s.value}</span>
            </div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={openAddItem} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--n-200)', background: '#fff', fontSize: 12, cursor: 'pointer', color: 'var(--n-700)', marginRight: 8, flexShrink: 0 }}>
          <PackagePlus size={13} /> Agregar ítem
        </button>
        <button
          onClick={() => { setSupplierInput(''); setSelectedSupplierId(''); setShowAddSupplier(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--brand-200)', background: 'var(--brand-50)', fontSize: 12, cursor: 'pointer', color: 'var(--brand-700)', flexShrink: 0 }}
        >
          <Building2 size={13} /> Agregar proveedor
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {items.length === 0 && compSuppliers.length === 0 ? (
          <EmptyHint onAddItem={openAddItem} hasProject={!!comparison.project_id} />
        ) : (
          <div style={{ minWidth: 'max-content' }}>
            <table style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--n-150)' }}>
              <thead>
                <tr style={{ background: 'var(--n-25)', borderBottom: '2px solid var(--n-150)' }}>
                  <TH width={36}>#</TH>
                  <TH width={280} align="left">Insumo / Descripción</TH>
                  <TH width={60}>Und</TH>
                  <TH width={80}>Cantidad</TH>
                  {compSuppliers.map(cs => (
                    <TH key={cs.id} width={140}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-800)' }}>{cs.supplier_name}</span>
                        <button
                          onClick={() => setConfirmDeleteSupplier(cs.id)}
                          style={{ padding: '1px 4px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-300)', borderRadius: 4 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red-500)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--n-300)'}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </TH>
                  ))}
                  <TH width={120} align="left">Seleccionado</TH>
                  <TH width={110} align="right">P. Unit.</TH>
                  <TH width={110} align="right">Total ítem</TH>
                  <TH width={40}></TH>
                </tr>
              </thead>

              <tbody>
                {items.map((item, idx) => {
                  const best = getBestPrice(item.id)
                  const selCs = getSelectedSupplierForItem(item.id)
                  const selQuote = selCs ? getQuote(item.id, selCs.id) : null
                  const itemTotal = selQuote ? selQuote.unit_price * item.quantity : 0

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--n-100)', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--n-25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={tdS({ center: true })}>
                        <span style={{ fontSize: 11.5, color: 'var(--n-400)', fontWeight: 600 }}>{idx + 1}</span>
                      </td>
                      <td style={tdS({})}>
                        <div onClick={() => openEditItem(item)} style={{ cursor: 'pointer' }} title="Editar ítem">
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--n-900)' }}>{item.description}</div>
                          {item.notes && <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 1 }}>{item.notes}</div>}
                        </div>
                      </td>
                      <td style={tdS({ center: true })}>
                        <span style={{ fontSize: 12, color: 'var(--n-500)' }}>{item.unit}</span>
                      </td>
                      <td style={tdS({ center: true })}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--n-800)' }}>{fmtNum(item.quantity)}</span>
                      </td>

                      {compSuppliers.map(cs => {
                        const q = getQuote(item.id, cs.id)
                        const price = q?.unit_price ?? 0
                        const isLowest = best !== null && price > 0 && price === best
                        const isSelected = q?.is_selected ?? false
                        const isEditing = editingCell?.itemId === item.id && editingCell?.csId === cs.id

                        return (
                          <td key={cs.id} style={{
                            padding: '6px 10px', textAlign: 'right', verticalAlign: 'middle',
                            background: isSelected ? 'rgba(34,197,94,.08)' : isLowest ? 'rgba(34,197,94,.04)' : 'transparent',
                            borderLeft: '1px solid var(--n-100)',
                            borderRight: isSelected ? '1px solid rgba(34,197,94,.3)' : '1px solid var(--n-100)',
                            cursor: 'pointer', minWidth: 120,
                          }}>
                            {isEditing ? (
                              <input
                                ref={cellInputRef}
                                type="number" step="0.01" min="0"
                                value={cellValue}
                                onChange={e => setCellValue(e.target.value)}
                                onBlur={() => commitEdit(item.id, cs.id)}
                                onKeyDown={e => handleCellKeyDown(e, item.id, cs.id)}
                                style={{ width: '100%', textAlign: 'right', padding: '2px 6px', border: '2px solid var(--brand-400)', borderRadius: 6, fontSize: 13, fontWeight: 600, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                              />
                            ) : (
                              <div onClick={() => startEdit(item.id, cs.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, minHeight: 28 }}>
                                {isLowest && price > 0 && <TrendingDown size={12} style={{ color: 'var(--green-600)', flexShrink: 0 }} />}
                                <span style={{ fontSize: 13, fontWeight: price > 0 ? 600 : 400, color: isLowest ? 'var(--green-700)' : price > 0 ? 'var(--n-800)' : 'var(--n-300)' }}>
                                  {price > 0 ? fmtNum(price) : '—'}
                                </span>
                                {price > 0 && !isSelected && (
                                  <button
                                    onClick={e => { e.stopPropagation(); selectQuote(item.id, cs.id) }}
                                    style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-300)', flexShrink: 0 }}
                                    onMouseEnter={ev => ev.currentTarget.style.color = 'var(--amber-500)'}
                                    onMouseLeave={ev => ev.currentTarget.style.color = 'var(--n-300)'}
                                    title="Seleccionar"
                                  >
                                    <StarOff size={12} />
                                  </button>
                                )}
                                {isSelected && (
                                  <button
                                    onClick={e => { e.stopPropagation(); selectQuote(item.id, '__none__') }}
                                    style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--amber-500)', flexShrink: 0 }}
                                    title="Deseleccionar"
                                  >
                                    <Star size={12} fill="currentColor" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      <td style={{ ...tdS({}), borderLeft: '2px solid var(--n-150)' }}>
                        {selCs ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-700)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={11} />{selCs.supplier_name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--n-300)', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>

                      <td style={tdS({ right: true })}>
                        {selQuote && selQuote.unit_price > 0
                          ? <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-800)' }}>{fmtNum(selQuote.unit_price)}</span>
                          : <span style={{ color: 'var(--n-300)', fontSize: 12 }}>—</span>}
                      </td>

                      <td style={tdS({ right: true })}>
                        {itemTotal > 0
                          ? <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)' }}>{fmtNum(itemTotal)}</span>
                          : <span style={{ color: 'var(--n-300)', fontSize: 12 }}>—</span>}
                      </td>

                      <td style={{ padding: '0 8px', textAlign: 'center' }}>
                        <button onClick={() => setConfirmDeleteItem(item.id)} style={{ padding: '4px 5px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-300)', borderRadius: 4 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red-500)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--n-300)'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {items.length > 0 && compSuppliers.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--n-50)', borderTop: '2px solid var(--n-150)' }}>
                    <td colSpan={4} style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--n-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Total por proveedor
                    </td>
                    {compSuppliers.map(cs => {
                      const total = getSupplierTotal(cs.id)
                      return (
                        <td key={cs.id} style={{ padding: '10px 10px', textAlign: 'right', borderLeft: '1px solid var(--n-150)', borderRight: '1px solid var(--n-150)' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: total > 0 ? 'var(--n-800)' : 'var(--n-300)' }}>
                            {total > 0 ? fmt(total, currency) : '—'}
                          </span>
                        </td>
                      )
                    })}
                    <td colSpan={3} style={{ padding: '10px 14px', borderLeft: '2px solid var(--n-150)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--n-500)' }}>Total seleccionado</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-700)' }}>
                          {fmt(selectedTotal, currency)}
                        </span>
                      </div>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>

            <button onClick={openAddItem} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '8px 14px', borderRadius: 8, border: '1.5px dashed var(--n-200)', background: 'transparent', fontSize: 12.5, color: 'var(--n-500)', cursor: 'pointer', transition: 'border-color .15s, color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-400)'; e.currentTarget.style.color = 'var(--brand-600)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--n-200)'; e.currentTarget.style.color = 'var(--n-500)' }}
            >
              <Plus size={14} /> Agregar ítem
            </button>
          </div>
        )}
      </div>

      {/* ════ Modals ════ */}

      {/* Add / Edit Item */}
      {showAddItem && (
        <Modal title={editingItemId ? 'Editar ítem' : 'Agregar ítem'} onClose={() => setShowAddItem(false)} width={520}>
          {!editingItemId && (
            <>
              {/* Insumo picker from budget */}
              <div style={{ marginBottom: 16 }}>
                <FL>
                  {comparison.project_id
                    ? 'Seleccionar insumo del presupuesto'
                    : 'Insumos del presupuesto (sin proyecto asignado)'}
                </FL>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                  <input
                    value={insumoSearch}
                    onChange={e => setInsumoSearch(e.target.value)}
                    placeholder="Buscar insumo por nombre o código…"
                    autoFocus
                    style={{ ...iStyle, paddingLeft: 32 }}
                  />
                </div>
                {loadingInsumos && (
                  <div style={{ fontSize: 12, color: 'var(--n-400)', padding: '8px 12px' }}>Cargando insumos…</div>
                )}
                {!loadingInsumos && filteredInsumos.length > 0 && (
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--n-150)', borderRadius: 8, background: '#fff' }}>
                    {filteredInsumos.map(bi => (
                      <button
                        key={bi.id}
                        onClick={() => selectInsumo(bi.id)}
                        style={{
                          display: 'flex', alignItems: 'center', width: '100%', padding: '8px 12px',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: selectedBudgetItemId === bi.id ? 'var(--brand-50)' : '#fff',
                          borderBottom: '1px solid var(--n-100)',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => { if (selectedBudgetItemId !== bi.id) e.currentTarget.style.background = 'var(--n-25)' }}
                        onMouseLeave={e => { if (selectedBudgetItemId !== bi.id) e.currentTarget.style.background = '#fff' }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: selectedBudgetItemId === bi.id ? 'var(--brand-700)' : 'var(--n-900)' }}>
                            {bi.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 1 }}>
                            {[bi.code && `#${bi.code}`, bi.description].filter(Boolean).join(' · ') || ' '}
                          </div>
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '2px 6px', borderRadius: 5, marginLeft: 8, flexShrink: 0 }}>
                          {bi.unit}
                        </span>
                        {selectedBudgetItemId === bi.id && <Check size={14} style={{ color: 'var(--brand-600)', marginLeft: 6 }} />}
                      </button>
                    ))}
                  </div>
                )}
                {!loadingInsumos && !comparison.project_id && (
                  <div style={{ fontSize: 12, color: 'var(--amber-700)', padding: '8px 12px', background: 'var(--amber-50)', borderRadius: 8, textAlign: 'center' }}>
                    Este comparativo no tiene proyecto asignado — no hay insumos disponibles
                  </div>
                )}
                {!loadingInsumos && comparison.project_id && filteredInsumos.length === 0 && !insumoSearch && (
                  <div style={{ fontSize: 12, color: 'var(--n-400)', padding: '8px 12px', background: 'var(--n-25)', borderRadius: 8, textAlign: 'center' }}>
                    El proyecto no tiene insumos en el presupuesto — completa los campos manualmente
                  </div>
                )}
                {insumoSearch && filteredInsumos.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--n-400)', padding: '8px 12px', background: 'var(--n-25)', borderRadius: 8, textAlign: 'center' }}>
                    Sin resultados — completa los campos manualmente
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--n-400)', fontSize: 11.5 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--n-150)' }} />
                {selectedBudgetItemId ? 'O modifica los campos' : 'O escribe manualmente'}
                <div style={{ flex: 1, height: 1, background: 'var(--n-150)' }} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <FL>Descripción *</FL>
              <input value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} placeholder="Nombre o descripción del insumo" style={iStyle} autoFocus={!!editingItemId} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FL>Unidad</FL>
                <input value={itemForm.unit} onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))} placeholder="und, bls, m3…" style={iStyle} />
              </div>
              <div>
                <FL>Cantidad</FL>
                <input type="number" step="0.01" min="0.01" value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: e.target.value }))} style={iStyle} />
              </div>
            </div>
            <div>
              <FL>Notas (opcional)</FL>
              <input value={itemForm.notes} onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} placeholder="Especificaciones adicionales…" style={iStyle} />
            </div>
            {itemFormErr && <ErrorMsg>{itemFormErr}</ErrorMsg>}
          </div>
          <ModalFooter onCancel={() => setShowAddItem(false)} onSave={handleSaveItem} saving={savingItem} label={editingItemId ? 'Guardar' : 'Agregar'} />
        </Modal>
      )}

      {/* Add Supplier */}
      {showAddSupplier && (
        <Modal title="Agregar proveedor" onClose={() => setShowAddSupplier(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <FL>Desde catálogo de proveedores</FL>
              <select value={selectedSupplierId} onChange={e => { setSelectedSupplierId(e.target.value); if (e.target.value) setSupplierInput(suppliers.find(s => s.id === e.target.value)?.name ?? '') }} style={{ ...iStyle, cursor: 'pointer' }} autoFocus>
                <option value="">— Seleccionar proveedor —</option>
                {suppliers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--n-400)', fontSize: 11.5 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--n-150)' }} />o ingresar manualmente<div style={{ flex: 1, height: 1, background: 'var(--n-150)' }} />
            </div>
            <div>
              <FL>Nombre del proveedor</FL>
              <input value={supplierInput} onChange={e => { setSupplierInput(e.target.value); setSelectedSupplierId('') }} placeholder="Ej: Ferretería Central SAC" style={iStyle} />
            </div>
          </div>
          <ModalFooter onCancel={() => setShowAddSupplier(false)} onSave={handleAddSupplier} saving={savingSupplier} label="Agregar" />
        </Modal>
      )}

      {/* Edit Meta */}
      {showEditMeta && (
        <Modal title="Editar comparativo" onClose={() => setShowEditMeta(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div>
              <FL>Título *</FL>
              <input value={metaForm.title} onChange={e => setMetaForm(p => ({ ...p, title: e.target.value }))} autoFocus style={iStyle} />
            </div>
            <div>
              <FL>Moneda</FL>
              <select value={metaForm.currency} onChange={e => setMetaForm(p => ({ ...p, currency: e.target.value }))} style={{ ...iStyle, cursor: 'pointer' }}>
                <option value="PEN">PEN — Soles</option>
                <option value="USD">USD — Dólares</option>
              </select>
            </div>
            <div>
              <FL>Notas</FL>
              <textarea value={metaForm.notes} onChange={e => setMetaForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...iStyle, resize: 'vertical' as const }} />
            </div>
          </div>
          <ModalFooter onCancel={() => setShowEditMeta(false)} onSave={handleSaveMeta} saving={savingMeta} label="Guardar" />
        </Modal>
      )}

      {confirmDeleteItem && (
        <ConfirmModal title="¿Eliminar ítem?" body="Se eliminarán el ítem y todas sus cotizaciones asociadas." onCancel={() => setConfirmDeleteItem(null)} onConfirm={async () => { await deleteItem(confirmDeleteItem); setConfirmDeleteItem(null) }} />
      )}
      {confirmDeleteSupplier && (
        <ConfirmModal title="¿Quitar proveedor?" body="Se eliminarán todas las cotizaciones de este proveedor en el comparativo." onCancel={() => setConfirmDeleteSupplier(null)} onConfirm={async () => { await removeSupplier(confirmDeleteSupplier); setConfirmDeleteSupplier(null) }} />
      )}
    </div>
  )
}

// ── Small components ──────────────────────────────────────────

function TH({ children, width, align }: { children?: React.ReactNode; width?: number; align?: 'left' | 'right' }) {
  return (
    <th style={{ padding: '10px 10px', fontSize: 11, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: align ?? 'center', width, whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

function tdS({ center, right }: { center?: boolean; right?: boolean }): React.CSSProperties {
  return { padding: '8px 12px', verticalAlign: 'middle', textAlign: center ? 'center' : right ? 'right' : 'left' }
}

function EmptyHint({ onAddItem, hasProject }: { onAddItem: () => void; hasProject: boolean }) {
  return (
    <div style={{ padding: '52px 24px', textAlign: 'center', background: '#fff', border: '1.5px dashed var(--n-200)', borderRadius: 14 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-700)', marginBottom: 8 }}>Comparativo vacío</div>
      <div style={{ fontSize: 13, color: 'var(--n-400)', maxWidth: 400, margin: '0 auto 24px' }}>
        {hasProject
          ? 'Agrega insumos del presupuesto del proyecto y proveedores para comparar precios'
          : 'Agrega ítems y proveedores para comparar precios'}
      </div>
      <button onClick={onAddItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <Plus size={14} /> Agregar primer ítem
      </button>
    </div>
  )
}

function Modal({ title, children, onClose, width = 460 }: { title: string; children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 24px 20px', width: '100%', maxWidth: width, boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, label }: { onCancel: () => void; onSave: () => void; saving: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
      <button onClick={onCancel} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--n-200)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--n-700)' }}>Cancelar</button>
      <button onClick={onSave} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: saving ? 'var(--brand-300)' : 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Guardando…' : label}
      </button>
    </div>
  )
}

function ConfirmModal({ title, body, onCancel, onConfirm }: { title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 360, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--n-500)', marginBottom: 20 }}>{body}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--n-200)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--red-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-600)', marginBottom: 5 }}>{children}</div>
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', padding: '8px 12px', borderRadius: 8 }}>{children}</div>
}

const iStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--n-200)', fontSize: 13,
  color: 'var(--n-800)', boxSizing: 'border-box', background: '#fff',
}
