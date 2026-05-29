import type { GGItem, GGRubroId } from './types'

export interface GGRubroDef {
  label: string
  kind: 'fijo' | 'variable'
  fg: string
  bg: string
  dot: string
}

export const GG_RUBROS: Record<GGRubroId, GGRubroDef> = {
  gestion:      { label: 'Gestión y licitación',    kind: 'fijo',     fg: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  garantias:    { label: 'Garantías y pólizas',     kind: 'fijo',     fg: '#4338CA', bg: '#E0E7FF', dot: '#6366F1' },
  ensayos:      { label: 'Ensayos y control',       kind: 'fijo',     fg: '#0F766E', bg: '#CCFBF1', dot: '#14B8A6' },
  personal_tec: { label: 'Personal técnico',        kind: 'variable', fg: '#B45309', bg: '#FEF3C7', dot: '#F59E0B' },
  personal_adm: { label: 'Personal administrativo', kind: 'variable', fg: '#A16207', bg: '#FEF9C3', dot: '#EAB308' },
  servicios:    { label: 'Servicios de obra',       kind: 'variable', fg: '#047857', bg: '#D1FAE5', dot: '#10B981' },
  oficina:      { label: 'Oficina y equipamiento',  kind: 'variable', fg: '#7E22CE', bg: '#F3E8FF', dot: '#A855F7' },
}

export const GG_RUBRO_ORDER: GGRubroId[] = [
  'gestion', 'garantias', 'ensayos',
  'personal_tec', 'personal_adm', 'servicios', 'oficina',
]

export interface GGCatalogItem {
  id: string
  rubro: GGRubroId
  name: string
  unit: string
  price: number
}

export const GG_CATALOG: GGCatalogItem[] = [
  { id: 'gc-01', rubro: 'gestion',      name: 'Trámite de licencia de edificación',       unit: 'glb', price: 850 },
  { id: 'gc-02', rubro: 'gestion',      name: 'Documentos de licitación y propuesta',     unit: 'glb', price: 380 },
  { id: 'gc-03', rubro: 'gestion',      name: 'Visita técnica y elaboración de propuesta', unit: 'glb', price: 480 },
  { id: 'gc-04', rubro: 'garantias',    name: 'Carta fianza fiel cumplimiento',            unit: '%',   price: 1.0 },
  { id: 'gc-05', rubro: 'garantias',    name: 'Carta fianza adelanto directo',             unit: '%',   price: 0.6 },
  { id: 'gc-06', rubro: 'garantias',    name: 'Póliza CAR',                                unit: '%',   price: 0.40 },
  { id: 'gc-07', rubro: 'garantias',    name: 'Póliza SCTR salud',                         unit: 'mes', price: 280 },
  { id: 'gc-08', rubro: 'ensayos',      name: 'Ensayo de probetas de concreto',            unit: 'und', price: 95 },
  { id: 'gc-09', rubro: 'ensayos',      name: 'Diseño de mezcla',                          unit: 'und', price: 320 },
  { id: 'gc-10', rubro: 'ensayos',      name: 'Densidad de campo',                         unit: 'und', price: 80 },
  { id: 'gc-11', rubro: 'personal_tec', name: 'Residente de obra',                         unit: 'mes', price: 3800 },
  { id: 'gc-12', rubro: 'personal_tec', name: 'Asistente de residencia',                   unit: 'mes', price: 2400 },
  { id: 'gc-13', rubro: 'personal_tec', name: 'Maestro de obra',                           unit: 'mes', price: 2950 },
  { id: 'gc-14', rubro: 'personal_tec', name: 'Ingeniero de seguridad',                    unit: 'mes', price: 2800 },
  { id: 'gc-15', rubro: 'personal_adm', name: 'Administrador de obra',                     unit: 'mes', price: 2600 },
  { id: 'gc-16', rubro: 'personal_adm', name: 'Almacenero',                                unit: 'mes', price: 1600 },
  { id: 'gc-17', rubro: 'personal_adm', name: 'Guardián 24 hrs',                           unit: 'mes', price: 1850 },
  { id: 'gc-18', rubro: 'servicios',    name: 'Energía eléctrica (medidor provisional)',   unit: 'mes', price: 320 },
  { id: 'gc-19', rubro: 'servicios',    name: 'Agua para obra',                            unit: 'mes', price: 180 },
  { id: 'gc-20', rubro: 'servicios',    name: 'Internet y telefonía',                      unit: 'mes', price: 140 },
  { id: 'gc-21', rubro: 'servicios',    name: 'Movilidad de personal',                     unit: 'mes', price: 850 },
  { id: 'gc-22', rubro: 'oficina',      name: 'Alquiler de caseta de obra',                unit: 'mes', price: 480 },
  { id: 'gc-23', rubro: 'oficina',      name: 'Útiles de oficina',                         unit: 'mes', price: 180 },
  { id: 'gc-24', rubro: 'oficina',      name: 'EPP y uniformes',                           unit: 'glb', price: 1450 },
  { id: 'gc-25', rubro: 'oficina',      name: 'Botiquín de primeros auxilios',             unit: 'glb', price: 220 },
]

export function ggItemTotal(item: GGItem, directCost: number): number {
  if (item.unit === '%') {
    return (item.unit_price / 100) * (directCost || 0) * (item.qty || 1)
  }
  const kind = GG_RUBROS[item.rubro]?.kind
  if (kind === 'variable' && item.months) {
    return (item.qty || 1) * (item.unit_price || 0) * item.months
  }
  return (item.qty || 1) * (item.unit_price || 0)
}

export interface GGTotals {
  fijo: number
  variable: number
  total: number
  byRubro: Partial<Record<GGRubroId, number>>
  count: number
}

export function ggTotals(items: GGItem[], directCost: number): GGTotals {
  let fijo = 0, variable = 0
  const byRubro: Partial<Record<GGRubroId, number>> = {}
  items.forEach(it => {
    const t = ggItemTotal(it, directCost)
    const kind = GG_RUBROS[it.rubro]?.kind ?? 'fijo'
    if (kind === 'fijo') fijo += t; else variable += t
    byRubro[it.rubro] = (byRubro[it.rubro] || 0) + t
  })
  return { fijo, variable, total: fijo + variable, byRubro, count: items.length }
}

export function nextGGCode(items: GGItem[], rubro: GGRubroId): string {
  const kind = GG_RUBROS[rubro]?.kind
  const prefix = kind === 'fijo' ? '01' : '02'
  const inSection = items.filter(it => GG_RUBROS[it.rubro]?.kind === kind)
  const seq = String(inSection.length + 1).padStart(2, '0')
  return `${prefix}.${seq}`
}

export const GG_UNITS = ['glb', 'und', 'mes', 'm', 'm²', 'm³', 'kg', '%']
