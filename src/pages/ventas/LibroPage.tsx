import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  BookOpen, Upload, Search, ChevronLeft, ChevronRight,
  Trash2, X, FileText, Package, Layers, CloudUpload,
  AlertCircle, CheckCircle2, ChevronRight as ChevronRightSm, Plus, Check,
} from 'lucide-react'
import { useLibro, PAGE_SIZE, type LibroEntry, type LibroPartida, type LibroInsumo } from '../../hooks/useLibro'
import { StatCard } from '../../components/ui/StatCard'
import { Button, IconButton } from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Loader'

// ── table styles ──────────────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '7px 10px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 10,
  color: 'var(--n-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  borderBottom: '1px solid var(--n-150)',
  whiteSpace: 'nowrap',
  background: 'var(--n-25)',
  position: 'sticky',
  top: 0,
  zIndex: 1,
}
const TD: React.CSSProperties = { padding: '7px 10px', verticalAlign: 'middle', fontSize: 11.5 }

// ── small helpers ─────────────────────────────────────────────────────────────
function Num({ v }: { v: number | null | undefined }) {
  if (!v) return <span style={{ color: 'var(--n-350, var(--n-400))' }}>—</span>
  return (
    <span className="mono tnum">
      {v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function Trunc({ text, title }: { text: string; title?: string }) {
  return (
    <span
      title={title ?? text}
      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
    >
      {text}
    </span>
  )
}

const pagerBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 5,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11.5, cursor: 'pointer',
  border: '1px solid var(--n-200)',
  background: 'transparent', color: 'var(--n-700)',
  transition: 'all .12s',
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null

  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const nums  = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderTop: '1px solid var(--n-150)', flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: 'var(--n-500)', flex: 1 }} className="mono">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
      </span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} style={{ ...pagerBtn, opacity: page <= 1 ? 0.35 : 1 }}>
        <ChevronLeft size={13} />
      </button>
      {nums.map(p => (
        <button key={p} onClick={() => onPage(p)} style={{
          ...pagerBtn,
          background: p === page ? 'var(--brand-600)' : 'transparent',
          color: p === page ? '#fff' : 'var(--n-700)',
          fontWeight: p === page ? 700 : 400,
          borderColor: p === page ? 'var(--brand-600)' : 'var(--n-200)',
        }}>
          {p}
        </button>
      ))}
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} style={{ ...pagerBtn, opacity: page >= pages ? 0.35 : 1 }}>
        <ChevronRight size={13} />
      </button>
    </div>
  )
}

type TipoDoc = 'partidas' | 'insumos'

const TIPOS: { value: TipoDoc; label: string; icon: typeof Layers; color: string; bg: string }[] = [
  { value: 'partidas', label: 'Partidas',  icon: Layers,  color: 'var(--brand-700)', bg: 'var(--brand-50)' },
  { value: 'insumos',  label: 'Insumos',   icon: Package, color: '#15803d',          bg: '#f0fdf4'         },
]

// ── libro selector ────────────────────────────────────────────────────────────
function LibroSelector({ libros, value, onChange, onNew }: {
  libros: LibroEntry[]
  value: string
  onChange: (v: string) => void
  onNew: (nombre: string) => Promise<void>
}) {
  const [adding,   setAdding]   = useState(libros.length === 0)
  const [draft,    setDraft]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saveErr,  setSaveErr]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])

  const confirm = async () => {
    const name = draft.trim()
    if (!name) return
    setSaving(true)
    setSaveErr('')
    try {
      await onNew(name)
      onChange(name)
      setDraft('')
      setAdding(false)
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    height: 32, flex: 1, padding: '0 10px', fontSize: 12.5,
    border: '1px solid var(--n-200)', borderRadius: 6,
    background: 'var(--n-0)', color: 'var(--n-900)',
    outline: 'none', boxSizing: 'border-box',
  }
  const iconBtn: React.CSSProperties = {
    height: 32, width: 32, borderRadius: 6, flexShrink: 0,
    border: '1px solid var(--n-200)', background: 'var(--n-0)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .15s',
  }

  if (adding) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => { setDraft(e.target.value); setSaveErr('') }}
            onKeyDown={e => {
              if (e.key === 'Enter') confirm()
              if (e.key === 'Escape' && libros.length > 0) { setDraft(''); setSaveErr(''); setAdding(false) }
            }}
            placeholder="Nombre del libro…"
            style={{ ...fieldStyle, borderColor: saveErr ? '#fca5a5' : 'var(--n-200)' }}
            disabled={saving}
          />
          <button
            onClick={confirm}
            disabled={!draft.trim() || saving}
            style={{ ...iconBtn, borderColor: 'var(--brand-300)', background: 'var(--brand-50)', color: draft.trim() && !saving ? 'var(--brand-600)' : 'var(--n-300)' }}
            title="Guardar libro"
          >
            {saving
              ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--brand-200)', borderTopColor: 'var(--brand-600)', animation: 'spin 0.7s linear infinite' }} />
              : <Check size={14} />
            }
          </button>
          {libros.length > 0 && (
            <button onClick={() => { setDraft(''); setSaveErr(''); setAdding(false) }} style={{ ...iconBtn, color: 'var(--n-500)' }} title="Cancelar" disabled={saving}>
              <X size={14} />
            </button>
          )}
        </div>
        {saveErr && <span style={{ fontSize: 11, color: '#b91c1c' }}>{saveErr}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...fieldStyle, cursor: 'pointer' }}
      >
        {!value && <option value="">Seleccionar libro…</option>}
        {libros.map(l => (
          <option key={l.id} value={l.nombre}>
            {l.nombre}{l.anio ? ` (${l.anio})` : ''}
          </option>
        ))}
      </select>
      <button
        onClick={() => setAdding(true)}
        title="Nuevo libro"
        style={{ ...iconBtn, borderColor: 'var(--brand-300)', background: 'var(--brand-50)', color: 'var(--brand-600)' }}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ── upload modal ──────────────────────────────────────────────────────────────
type ModalStatus = 'idle' | 'processing' | 'preview' | 'saving' | 'done' | 'error'

type Extracted = {
  partidas: Record<string, unknown>[]
  insumos:  Record<string, unknown>[]
  count:    number
}

function UploadModal({ open, onClose, onDone, libros, onNewLibro }: {
  open: boolean
  onClose: () => void
  onDone: (partidas: Record<string, unknown>[], insumos: Record<string, unknown>[], filename: string, libroNombre: string) => Promise<void>
  libros: LibroEntry[]
  onNewLibro: (nombre: string) => Promise<void>
}) {
  const [tipo,        setTipo]        = useState<TipoDoc>('partidas')
  const [libroNombre, setLibroNombre] = useState('')
  const [file,        setFile]        = useState<File | null>(null)
  const [apiUrl,      setApiUrl]      = useState('http://localhost:8001')
  const [status,      setStatus]      = useState<ModalStatus>('idle')
  const [msg,         setMsg]         = useState('')
  const [showCfg,     setShowCfg]     = useState(false)
  const [extracted,   setExtracted]   = useState<Extracted | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) { setFile(null); setStatus('idle'); setMsg(''); setLibroNombre(''); setExtracted(null) }
  }, [open])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setExtracted(null); setStatus('idle'); setMsg('') }
  }

  // Step 1: call AI and show preview — does NOT save to DB yet
  const extract = async () => {
    if (!file || !libroNombre) return
    setStatus('processing')
    setMsg(`Enviando a Gemini para extraer ${tipo}…`)
    try {
      const form = new FormData()
      form.append('archivo', file)
      const res = await fetch(`${apiUrl}/extraer/libro/${tipo}`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail || `Error ${res.status}`)
      }
      const data    = await res.json() as { partidas?: unknown[]; insumos?: unknown[] }
      const partidas = (data.partidas ?? []) as Record<string, unknown>[]
      const insumos  = (data.insumos  ?? []) as Record<string, unknown>[]
      const count    = tipo === 'partidas' ? partidas.length : insumos.length
      setExtracted({ partidas, insumos, count })
      setMsg('')
      setStatus('preview')
    } catch (err: unknown) {
      setStatus('error')
      setMsg(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  // Step 2: user confirmed → save to DB
  const save = async () => {
    if (!extracted || !file) return
    setStatus('saving')
    setMsg(`Guardando ${extracted.count} ${tipo}…`)
    try {
      await onDone(extracted.partidas, extracted.insumos, file.name, libroNombre)
      setStatus('done')
      setMsg(`${extracted.count} ${tipo} guardados correctamente`)
      setExtracted(null)
    } catch (err: unknown) {
      setStatus('error')
      setMsg(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  // User discards — clears extraction, goes back to idle (file stays selected to retry)
  const discard = () => { setExtracted(null); setStatus('idle'); setMsg('') }

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    processing: { bg: 'var(--n-50)',  text: 'var(--n-700)', border: 'var(--n-200)' },
    saving:     { bg: 'var(--n-50)',  text: 'var(--n-700)', border: 'var(--n-200)' },
    done:       { bg: '#f0fdf4',      text: '#15803d',      border: '#bbf7d0'      },
    error:      { bg: '#fef2f2',      text: '#b91c1c',      border: '#fecaca'      },
  }

  const busy       = status === 'processing' || status === 'saving'
  const canExtract = !!file && !!libroNombre && (status === 'idle' || status === 'error')
  const previewItems = extracted
    ? (tipo === 'partidas' ? extracted.partidas : extracted.insumos)
    : []

  return (
    <Modal open={open} onClose={onClose} title="Cargar documento al libro" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Tipo selector */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 8 }}>
            ¿Qué contiene este documento?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TIPOS.map(t => {
              const active = tipo === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => { if (!busy && status !== 'preview') { setTipo(t.value); setStatus('idle'); setMsg('') } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8, cursor: busy || status === 'preview' ? 'default' : 'pointer',
                    border: `1.5px solid ${active ? t.color : 'var(--n-200)'}`,
                    background: active ? t.bg : 'var(--n-0)',
                    transition: 'all .15s', textAlign: 'left',
                    opacity: (busy || status === 'preview') && !active ? 0.5 : 1,
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: active ? t.color : 'var(--n-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    <t.icon size={14} style={{ color: active ? '#fff' : 'var(--n-500)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? t.color : 'var(--n-700)' }}>{t.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--n-500)', marginTop: 1 }}>
                      {t.value === 'partidas' ? 'CÓD · EDT · UND · P.U. · M.O. · MAT · EQU' : 'Nombre · UND · Cant · P.U. · Total'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Libro selector */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-700)', marginBottom: 8 }}>
            Nombre del libro
          </div>
          <LibroSelector key={open ? 'open' : 'closed'} libros={libros} value={libroNombre} onChange={setLibroNombre} onNew={onNewLibro} />
        </div>

        {/* Drop zone — disabled during preview/busy */}
        <div
          onDragOver={e => { if (!busy && status !== 'preview') e.preventDefault() }}
          onDrop={handleDrop}
          onClick={() => { if (!busy && status !== 'preview') inputRef.current?.click() }}
          style={{
            border: `2px dashed ${file ? 'var(--brand-400)' : 'var(--n-200)'}`,
            borderRadius: 10, padding: '24px 20px', textAlign: 'center',
            cursor: busy || status === 'preview' ? 'default' : 'pointer',
            transition: 'all .15s',
            background: file ? 'var(--brand-50)' : 'var(--n-25)',
            opacity: status === 'preview' ? 0.6 : 1,
          }}
        >
          <input
            ref={inputRef} type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setExtracted(null); setStatus('idle'); setMsg('') } }}
          />
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <FileText size={20} style={{ color: 'var(--brand-600)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB · Haz clic para cambiar</div>
              </div>
              {status !== 'preview' && !busy && (
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); setExtracted(null); setStatus('idle') }}
                  style={{ color: 'var(--n-400)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <>
              <CloudUpload size={28} style={{ color: 'var(--n-300)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-700)' }}>Arrastra el archivo o haz clic aquí</div>
              <div style={{ fontSize: 11.5, color: 'var(--n-500)', marginTop: 4 }}>PDF, JPG, PNG o WebP</div>
            </>
          )}
        </div>

        {/* Advanced config */}
        {status === 'idle' && (
          <div>
            <button
              onClick={() => setShowCfg(v => !v)}
              style={{ fontSize: 11, color: 'var(--n-500)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronRightSm size={11} style={{ transform: showCfg ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              Configuración avanzada
            </button>
            {showCfg && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--n-600)', display: 'block', marginBottom: 4 }}>URL del servicio extractor</label>
                <input
                  value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                  style={{ height: 30, width: '100%', padding: '0 10px', fontSize: 12, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Preview — shown after extraction, before saving */}
        {status === 'preview' && extracted && (
          <div style={{ border: '1px solid #bbf7d0', borderRadius: 8, background: '#f0fdf4', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d', flex: 1 }}>
                {extracted.count} {tipo} extraídos — revisa antes de guardar
              </span>
              <span style={{ fontSize: 10.5, color: '#16a34a' }}>primeros {Math.min(8, extracted.count)} de {extracted.count}</span>
            </div>
            <div style={{ maxHeight: 148, overflowY: 'auto' }}>
              {previewItems.slice(0, 8).map((item, i) => (
                <div
                  key={i}
                  style={{ padding: '5px 14px', borderBottom: '1px solid #d1fae5', display: 'flex', gap: 8, alignItems: 'baseline' }}
                >
                  {tipo === 'partidas' ? (
                    <>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#16a34a', flexShrink: 0, minWidth: 70 }}>
                        {(item.codigo as string) ?? '—'}
                      </span>
                      <span style={{ fontSize: 11, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.partida as string}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.nombre as string}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status message */}
        {msg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8, fontSize: 12,
            background: statusColors[status]?.bg ?? 'var(--n-50)',
            color:      statusColors[status]?.text ?? 'var(--n-700)',
            border:     `1px solid ${statusColors[status]?.border ?? 'var(--n-200)'}`,
          }}>
            {busy && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--brand-200)', borderTopColor: 'var(--brand-600)', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
            {status === 'error' && <AlertCircle size={14} style={{ flexShrink: 0 }} />}
            {status === 'done'  && <CheckCircle2 size={14} style={{ flexShrink: 0 }} />}
            <span>{msg}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} disabled={busy}>Cerrar</Button>

          {status === 'preview' && extracted && (
            <>
              <Button icon={X} onClick={discard}>Descartar y reintentar</Button>
              <Button variant="primary" icon={Check} onClick={save}>
                Guardar {extracted.count} {tipo}
              </Button>
            </>
          )}

          {(status === 'idle' || status === 'error') && (
            <Button variant="primary" icon={Upload} onClick={extract} disabled={!canExtract}>
              Procesar {tipo}
            </Button>
          )}

          {busy && (
            <Button variant="primary" disabled>
              {status === 'processing' ? 'Procesando…' : 'Guardando…'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── panel: partidas ───────────────────────────────────────────────────────────
function PartidasPanel({
  partidas, total, panelLoading, libros, onFetch, onDelete,
}: {
  partidas: LibroPartida[]
  total: number
  panelLoading: boolean
  libros: LibroEntry[]
  onFetch: (page: number, search: string, libroFilter: string) => void
  onDelete: (id: string) => void
}) {
  const [inputQ,      setInputQ]      = useState('')
  const [q,           setQ]           = useState('')
  const [page,        setPage]        = useState(1)
  const [libroFilter, setLibroFilter] = useState('')
  const mounted = useRef(false)

  // Debounce search: wait 300 ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => { setQ(inputQ); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [inputQ])

  // Fetch from DB whenever page / debounced-search / libroFilter change
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    onFetch(page, q, libroFilter)
  }, [page, q, libroFilter, onFetch])

  const handleLibro = (v: string) => { setLibroFilter(v); setPage(1) }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--n-150)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={13} style={{ color: 'var(--brand-600)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)' }}>Partidas</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '2px 8px', borderRadius: 10 }}>
            {total.toLocaleString()}
          </span>
          {panelLoading && (
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--brand-200)', borderTopColor: 'var(--brand-600)', animation: 'spin 0.7s linear infinite' }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {libros.length > 1 && (
            <select
              value={libroFilter}
              onChange={e => handleLibro(e.target.value)}
              style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', flexShrink: 0, maxWidth: 180, cursor: 'pointer' }}
            >
              <option value="">Todos los libros</option>
              {libros.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
            </select>
          )}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
            <input
              value={inputQ} onChange={e => setInputQ(e.target.value)}
              placeholder="Buscar partida, código o grupo…"
              style={{ width: '100%', height: 30, paddingLeft: 28, paddingRight: 10, fontSize: 12, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', opacity: panelLoading ? 0.5 : 1, transition: 'opacity .15s' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 80 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 110 }} />
            <col />
            <col style={{ width: 38 }} />
            <col style={{ width: 68 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 30 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Código</th>
              <th style={TH}>Libro</th>
              <th style={TH}>Grupo EDT</th>
              <th style={TH}>Partida</th>
              <th style={{ ...TH, textAlign: 'right' }}>Und</th>
              <th style={{ ...TH, textAlign: 'right' }}>P.U.</th>
              <th style={{ ...TH, textAlign: 'right' }}>M.O.</th>
              <th style={{ ...TH, textAlign: 'right' }}>MAT.</th>
              <th style={{ ...TH, textAlign: 'right' }}>EQU.</th>
              <th style={TH}></th>
            </tr>
          </thead>
          <tbody>
            {partidas.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--n-400)', fontSize: 12 }}>
                  {inputQ || libroFilter ? 'Sin resultados para esa búsqueda' : 'No hay partidas registradas'}
                </td>
              </tr>
            ) : partidas.map((p, i) => (
              <tr
                key={p.id}
                style={{ borderTop: i > 0 ? '1px solid var(--n-100)' : 'none', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...TD, color: 'var(--n-500)' }}><Trunc text={p.codigo ?? '—'} /></td>
                <td style={TD}>
                  {p.libro_nombre
                    ? <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap' }}>{p.libro_nombre}</span>
                    : <span style={{ color: 'var(--n-350, var(--n-400))' }}>—</span>
                  }
                </td>
                <td style={TD}><Trunc text={p.edt_grupo ?? '—'} /></td>
                <td style={TD}><Trunc text={p.partida} /></td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-600)', fontSize: 11 }}>{p.unidad ?? '—'}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--n-900)' }}><Num v={p.precio_unitario} /></td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-700)' }}><Num v={p.mano_de_obra} /></td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-700)' }}><Num v={p.material} /></td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-700)' }}><Num v={p.equipo} /></td>
                <td style={{ ...TD, padding: '4px 6px' }}>
                  <IconButton icon={Trash2} size={24} danger title="Eliminar" onClick={() => onDelete(p.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} total={total} onPage={setPage} />
    </div>
  )
}

// ── panel: insumos ────────────────────────────────────────────────────────────
function InsumosPanel({
  insumos, total, panelLoading, libros, onFetch, onDelete,
}: {
  insumos: LibroInsumo[]
  total: number
  panelLoading: boolean
  libros: LibroEntry[]
  onFetch: (page: number, search: string, libroFilter: string) => void
  onDelete: (id: string) => void
}) {
  const [inputQ,      setInputQ]      = useState('')
  const [q,           setQ]           = useState('')
  const [page,        setPage]        = useState(1)
  const [libroFilter, setLibroFilter] = useState('')
  const mounted = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => { setQ(inputQ); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [inputQ])

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    onFetch(page, q, libroFilter)
  }, [page, q, libroFilter, onFetch])

  const handleLibro = (v: string) => { setLibroFilter(v); setPage(1) }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--n-150)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={13} style={{ color: '#16a34a' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-900)' }}>Insumos</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '2px 8px', borderRadius: 10 }}>
            {total.toLocaleString()}
          </span>
          {panelLoading && (
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #bbf7d0', borderTopColor: '#16a34a', animation: 'spin 0.7s linear infinite' }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {libros.length > 1 && (
            <select
              value={libroFilter}
              onChange={e => handleLibro(e.target.value)}
              style={{ height: 30, padding: '0 8px', fontSize: 11.5, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-800)', outline: 'none', flexShrink: 0, maxWidth: 180, cursor: 'pointer' }}
            >
              <option value="">Todos los libros</option>
              {libros.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
            </select>
          )}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }} />
            <input
              value={inputQ} onChange={e => setInputQ(e.target.value)}
              placeholder="Buscar insumo o unidad…"
              style={{ width: '100%', height: 30, paddingLeft: 28, paddingRight: 10, fontSize: 12, border: '1px solid var(--n-200)', borderRadius: 6, background: 'var(--n-0)', color: 'var(--n-900)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', opacity: panelLoading ? 0.5 : 1, transition: 'opacity .15s' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col />
            <col style={{ width: 90 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 44 }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 30 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Nombre</th>
              <th style={{ ...TH, width: 90 }}>Categoría</th>
              <th style={{ ...TH, width: 110 }}>Libro</th>
              <th style={{ ...TH, width: 44, textAlign: 'right' }}>Und</th>
              <th style={{ ...TH, width: 72, textAlign: 'right' }}>Cant.</th>
              <th style={{ ...TH, width: 80, textAlign: 'right' }}>P.U.</th>
              <th style={{ ...TH, width: 85, textAlign: 'right' }}>Total</th>
              <th style={{ ...TH, width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {insumos.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--n-400)', fontSize: 12 }}>
                  {inputQ || libroFilter ? 'Sin resultados para esa búsqueda' : 'No hay insumos registrados'}
                </td>
              </tr>
            ) : insumos.map((ins, i) => (
              <tr
                key={ins.id}
                style={{ borderTop: i > 0 ? '1px solid var(--n-100)' : 'none', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={TD}><Trunc text={ins.nombre} /></td>
                <td style={TD}>
                  {ins.categoria
                    ? <span style={{ fontSize: 10.5, fontWeight: 600, color: '#92400e', background: '#fef3c7', padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{ins.categoria}</span>
                    : <span style={{ color: 'var(--n-350, var(--n-400))' }}>—</span>
                  }
                </td>
                <td style={TD}>
                  {ins.libro_nombre
                    ? <span style={{ fontSize: 10.5, fontWeight: 600, color: '#15803d', background: '#f0fdf4', padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap' }}>{ins.libro_nombre}</span>
                    : <span style={{ color: 'var(--n-350, var(--n-400))' }}>—</span>
                  }
                </td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-600)', fontSize: 11 }}>{ins.unidad ?? '—'}</td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-700)' }}><Num v={ins.cantidad} /></td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--n-700)' }}><Num v={ins.precio_unitario} /></td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--n-900)' }}><Num v={ins.total} /></td>
                <td style={{ ...TD, padding: '4px 6px' }}>
                  <IconButton icon={Trash2} size={24} danger title="Eliminar" onClick={() => onDelete(ins.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} total={total} onPage={setPage} />
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function LibroPage() {
  const {
    libros, loading,
    partidas, partidasTotal, partidasLoading, fetchPartidas,
    insumos, insumosTotal, insumosLoading, fetchInsumos,
    insertLibro, insertPartidas, insertInsumos, deletePartida, deleteInsumo,
  } = useLibro()
  const [showUpload, setShowUpload] = useState(false)
  const [tab, setTab] = useState<'partidas' | 'insumos'>('partidas')

  const handleDone = useCallback(async (
    rawPartidas: Record<string, unknown>[],
    rawInsumos:  Record<string, unknown>[],
    filename:    string,
    libroNombre: string,
  ) => {
    const pRows = rawPartidas.map(p => ({
      source_file:     filename,
      libro_nombre:    libroNombre,
      codigo:          (p.codigo     as string) ?? null,
      edt_grupo:       (p.edt_grupo  as string) ?? null,
      partida:         (p.partida    as string) ?? '',
      unidad:          (p.unidad     as string) ?? null,
      precio_unitario: Number(p.precio_unitario) || 0,
      mano_de_obra:    Number(p.mano_de_obra)    || 0,
      material:        Number(p.material)        || 0,
      equipo:          Number(p.equipo)          || 0,
    }))
    const iRows = rawInsumos.map(i => ({
      source_file:     filename,
      libro_nombre:    libroNombre,
      nombre:          (i.nombre as string) ?? '',
      unidad:          (i.unidad as string) ?? null,
      cantidad:        Number(i.cantidad)        || 0,
      precio_unitario: Number(i.precio_unitario) || 0,
      total:           Number(i.total)           || 0,
    }))
    await Promise.all([insertPartidas(pRows), insertInsumos(iRows)])
  }, [insertPartidas, insertInsumos])

  // Needed for useMemo below — libros is already fetched
  const grupos = useMemo(
    () => new Set(partidas.map(p => p.edt_grupo).filter(Boolean)).size,
    [partidas]
  )

  const TABS = [
    { key: 'partidas' as const, label: 'Partidas', count: partidasTotal, icon: Layers,  activeColor: 'var(--brand-600)', activeBg: 'var(--brand-50)' },
    { key: 'insumos'  as const, label: 'Insumos',  count: insumosTotal,  icon: Package, activeColor: '#16a34a',          activeBg: '#f0fdf4'        },
  ]

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PageLoader />
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header + stats + tabs */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={18} style={{ color: 'var(--brand-600)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--n-900)', margin: 0, letterSpacing: '-0.01em' }}>Libro de Precios</h1>
            <p style={{ fontSize: 12, color: 'var(--n-500)', margin: 0 }}>Precios estimados de partidas e insumos de construcción</p>
          </div>
          <div style={{ flex: 1 }} />
          <Button variant="primary" icon={Upload} onClick={() => setShowUpload(true)}>
            Cargar documento
          </Button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatCard icon={Layers}   label="Partidas"   numericValue={partidasTotal} sub="precios unitarios"       accent="brand"   sparkSeed={1.4} sparkBase={partidasTotal} />
          <StatCard icon={Package}  label="Insumos"    numericValue={insumosTotal}  sub="recursos y materiales"   accent="green"   sparkSeed={2.2} sparkBase={insumosTotal} />
          <StatCard icon={BookOpen} label="Libros"     numericValue={libros.length} sub="fuentes de precios"      accent="neutral" />
          <StatCard icon={BookOpen} label="Grupos EDT" numericValue={grupos}        sub="en página actual"        accent="neutral" />
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--n-150)' }}>
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px',
                  border: 'none', borderBottom: `2px solid ${active ? t.activeColor : 'transparent'}`,
                  background: 'none', cursor: 'pointer', marginBottom: -1,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  color: active ? 'var(--n-900)' : 'var(--n-500)',
                  transition: 'color .15s, border-color .15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--n-700)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--n-500)' }}
              >
                <t.icon size={14} style={{ color: active ? t.activeColor : 'var(--n-400)' }} />
                {t.label}
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                  color:      active ? t.activeColor : 'var(--n-500)',
                  background: active ? t.activeBg    : 'var(--n-100)',
                  transition: 'all .15s',
                }}>
                  {t.count.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active panel — fills remaining height */}
      <div style={{ flex: 1, padding: '12px 24px 20px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'partidas'
          ? <PartidasPanel partidas={partidas} total={partidasTotal} panelLoading={partidasLoading} libros={libros} onFetch={fetchPartidas} onDelete={deletePartida} />
          : <InsumosPanel  insumos={insumos}   total={insumosTotal}  panelLoading={insumosLoading}  libros={libros} onFetch={fetchInsumos}  onDelete={deleteInsumo}  />
        }
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onDone={handleDone} libros={libros} onNewLibro={insertLibro} />
    </div>
  )
}
