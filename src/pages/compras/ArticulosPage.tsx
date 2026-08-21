import { useState } from 'react'
import { useArticles } from '../../hooks/useArticles'
import { useAuth } from '../../hooks/useAuth'
import type { Article } from '../../lib/types'
import {
  Plus, Search, Pencil, Trash2, X,
  Package, Tag, CheckCircle2, XCircle, Hash,
} from 'lucide-react'

const EMPTY: Omit<Article, 'id' | 'created_at' | 'updated_at'> = {
  code: '', name: '', description: '', unit: 'und',
  category: '', notes: '', is_active: true, sort_order: 0,
}

export default function ArticulosPage() {
  const { hasPermission } = useAuth()
  const canAdd    = hasPermission('compras:comparativos', 'add')
  const canEdit   = hasPermission('compras:comparativos', 'edit')
  const canDelete = hasPermission('compras:comparativos', 'delete')

  const { articles, loading, categories, createArticle, updateArticle, deleteArticle } = useArticles()

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterActive, setFilterActive] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Article | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = articles.filter(a => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.code ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || a.category === filterCat
    const matchActive =
      filterActive === 'todos' ||
      (filterActive === 'activos' && a.is_active) ||
      (filterActive === 'inactivos' && !a.is_active)
    return matchSearch && matchCat && matchActive
  })

  const grouped = filtered.reduce<Record<string, Article[]>>((acc, a) => {
    const cat = a.category || '(Sin categoría)'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(a)
    return acc
  }, {})

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setErr('')
    setShowModal(true)
  }

  function openEdit(a: Article) {
    setEditing(a)
    setForm({
      code: a.code ?? '', name: a.name, description: a.description ?? '',
      unit: a.unit, category: a.category ?? '', notes: a.notes ?? '',
      is_active: a.is_active, sort_order: a.sort_order,
    })
    setErr('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setErr('El nombre es requerido'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        code: form.code?.trim() || null,
        description: form.description?.trim() || null,
        category: form.category?.trim() || null,
        notes: form.notes?.trim() || null,
      }
      if (editing) await updateArticle(editing.id, payload)
      else await createArticle(payload)
      setShowModal(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const f = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--amber-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={17} style={{ color: 'var(--amber-600)' }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>Artículos</h1>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--n-500)', marginLeft: 44 }}>
            Catálogo de artículos y materiales para comparativos de precios
          </p>
        </div>
        {canAdd && (
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={15} /> Nuevo Artículo
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: articles.length, color: 'var(--n-700)' },
          { label: 'Activos', value: articles.filter(a => a.is_active).length, color: 'var(--green-700)' },
          { label: 'Categorías', value: categories.length, color: 'var(--brand-700)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 10, padding: '10px 18px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 260px' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar artículo…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 10, height: 34, border: '1px solid var(--n-200)', borderRadius: 8, fontSize: 12.5, color: 'var(--n-800)', background: 'var(--n-0)', boxSizing: 'border-box' }}
          />
        </div>

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip label="Todas" active={!filterCat} onClick={() => setFilterCat('')} />
          {categories.map(cat => (
            <Chip key={cat} label={cat} active={filterCat === cat} onClick={() => setFilterCat(prev => prev === cat ? '' : cat)} />
          ))}
        </div>

        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value as typeof filterActive)}
          style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 12.5, color: 'var(--n-700)', cursor: 'pointer' }}
        >
          <option value="todos">Todos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--n-400)', fontSize: 13 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState hasFilter={!!search || !!filterCat} onNew={openCreate} canAdd={canAdd} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).sort(([a], [b]) => {
            if (a === '(Sin categoría)') return 1
            if (b === '(Sin categoría)') return -1
            return a.localeCompare(b)
          }).map(([cat, arts]) => (
            <div key={cat}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag size={12} style={{ color: 'var(--n-400)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {cat}
                </span>
                <span style={{ fontSize: 11, color: 'var(--n-400)', background: 'var(--n-100)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                  {arts.length}
                </span>
              </div>

              {/* Articles table */}
              <div style={{ background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--n-150)', background: 'var(--n-25)' }}>
                      {['Código', 'Nombre', 'Descripción', 'Unidad', 'Estado', ''].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {arts.map((a, idx) => (
                      <tr
                        key={a.id}
                        style={{ borderBottom: idx < arts.length - 1 ? '1px solid var(--n-100)' : 'none', transition: 'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 14px', width: 100 }}>
                          {a.code ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: 'var(--n-500)', fontFamily: 'monospace' }}>
                              <Hash size={10} />{a.code}
                            </span>
                          ) : <span style={{ color: 'var(--n-300)', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: a.is_active ? 'var(--n-900)' : 'var(--n-400)' }}>
                            {a.name}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                          <span style={{ fontSize: 12, color: 'var(--n-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {a.description || <span style={{ color: 'var(--n-300)' }}>—</span>}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', width: 80 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '2px 8px', borderRadius: 6 }}>
                            {a.unit}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', width: 100 }}>
                          {a.is_active ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--green-700)', background: 'var(--green-50)', padding: '2px 8px', borderRadius: 20 }}>
                              <CheckCircle2 size={11} /> Activo
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--n-400)', background: 'var(--n-100)', padding: '2px 8px', borderRadius: 20 }}>
                              <XCircle size={11} /> Inactivo
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', width: 80 }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {canEdit && <button onClick={() => openEdit(a)} style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid var(--n-200)', background: 'var(--n-0)', cursor: 'pointer', color: 'var(--n-600)' }}>
                              <Pencil size={12} />
                            </button>}
                            {canDelete && <button onClick={() => setConfirmDelete(a.id)} style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid var(--red-100)', background: 'var(--red-50)', cursor: 'pointer', color: 'var(--red-500)' }}>
                              <Trash2 size={12} />
                            </button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ background: 'var(--n-0)', borderRadius: 14, padding: '26px 26px 22px', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--n-900)', margin: 0 }}>
                {editing ? 'Editar Artículo' : 'Nuevo Artículo'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <FL>Nombre *</FL>
                <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Ej: Cemento Portland Tipo I" autoFocus style={iStyle} />
              </div>
              <div>
                <FL>Código interno (opcional)</FL>
                <input value={form.code ?? ''} onChange={e => f('code', e.target.value)} placeholder="Ej: MAT-001" style={iStyle} />
              </div>
              <div>
                <FL>Unidad de medida</FL>
                <input value={form.unit} onChange={e => f('unit', e.target.value)} placeholder="bls, m3, kg, und…" style={iStyle} />
              </div>
              <div>
                <FL>Categoría</FL>
                <input
                  value={form.category ?? ''}
                  onChange={e => f('category', e.target.value)}
                  placeholder="Ej: Materiales, Equipos…"
                  style={iStyle}
                  list="cat-suggestions"
                />
                <datalist id="cat-suggestions">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <FL>Descripción (opcional)</FL>
                <input value={form.description ?? ''} onChange={e => f('description', e.target.value)} placeholder="Especificaciones técnicas…" style={iStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <FL>Notas</FL>
                <textarea value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} rows={2} placeholder="Observaciones adicionales…" style={{ ...iStyle, resize: 'vertical' as const }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--brand-600)' }} />
                  <span style={{ fontSize: 13, color: 'var(--n-700)' }}>Artículo activo</span>
                </label>
              </div>
            </div>

            {err && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', padding: '8px 12px', borderRadius: 8 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 13, cursor: 'pointer', color: 'var(--n-700)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: saving ? 'var(--brand-300)' : 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear artículo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--n-0)', borderRadius: 14, padding: 26, width: 360, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-900)', marginBottom: 8 }}>¿Eliminar artículo?</div>
            <div style={{ fontSize: 13, color: 'var(--n-500)', marginBottom: 22 }}>
              El artículo se eliminará del catálogo. Los ítems en comparativos existentes no se verán afectados.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--n-200)', background: 'var(--n-0)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => { await deleteArticle(confirmDelete); setConfirmDelete(null) }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--danger-fill)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
        border: active ? '1.5px solid var(--brand-400)' : '1px solid var(--n-200)',
        background: active ? 'var(--brand-50)' : 'var(--n-0)',
        color: active ? 'var(--brand-700)' : 'var(--n-600)',
        transition: 'all .12s',
      }}
    >
      {label}
    </button>
  )
}

function EmptyState({ hasFilter, onNew, canAdd }: { hasFilter: boolean; onNew: () => void; canAdd?: boolean }) {
  return (
    <div style={{ padding: '52px 24px', textAlign: 'center', background: 'var(--n-0)', border: '1px solid var(--n-150)', borderRadius: 12 }}>
      <Package size={36} style={{ color: 'var(--n-300)', marginBottom: 12 }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--n-700)', marginBottom: 6 }}>
        {hasFilter ? 'Sin resultados' : 'No hay artículos en el catálogo'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--n-400)', marginBottom: 20 }}>
        {hasFilter ? 'Ajusta los filtros' : 'Crea artículos para usarlos en tus comparativos de precios'}
      </div>
      {!hasFilter && canAdd && (
        <button onClick={onNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Crear artículo
        </button>
      )}
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-600)', marginBottom: 5 }}>{children}</div>
}

const iStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--n-200)', fontSize: 13,
  color: 'var(--n-800)', boxSizing: 'border-box', background: 'var(--n-0)',
}
