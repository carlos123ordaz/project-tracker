import type { PeriodType } from './types'

export interface Period {
  date: Date
  endDate: Date
  label: string
  isoDate: string
}

export function generatePeriods(startIso: string, endIso: string, type: PeriodType): Period[] {
  const periods: Period[] = []
  const start = new Date(startIso + 'T00:00:00')
  const end   = new Date(endIso   + 'T00:00:00')

  if (type === 'day') {
    const cur = new Date(start)
    while (cur <= end) {
      periods.push({
        date: new Date(cur), endDate: new Date(cur),
        label: cur.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        isoDate: cur.toISOString().slice(0, 10),
      })
      cur.setDate(cur.getDate() + 1)
    }
  } else if (type === 'week') {
    const cur = new Date(start)
    const d = cur.getDay()
    cur.setDate(cur.getDate() - (d === 0 ? 6 : d - 1))
    let n = 1
    while (cur <= end) {
      const sun = new Date(cur)
      sun.setDate(sun.getDate() + 6)
      periods.push({
        date: new Date(cur), endDate: sun,
        label: `S${n}`,
        isoDate: cur.toISOString().slice(0, 10),
      })
      cur.setDate(cur.getDate() + 7)
      n++
    }
  } else {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const endBound = new Date(end.getFullYear(), end.getMonth() + 1, 0)
    while (cur <= endBound) {
      const last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      periods.push({
        date: new Date(cur), endDate: last,
        label: cur.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }).toUpperCase(),
        isoDate: cur.toISOString().slice(0, 10),
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  return periods
}

export function getOverlappingPeriods(
  startIso: string, endIso: string, periods: Period[],
): { start: number; end: number } | null {
  const s = new Date(startIso + 'T00:00:00')
  const e = new Date(endIso   + 'T00:00:00')
  let si = -1, ei = -1
  periods.forEach((p, i) => {
    if (s <= p.endDate && e >= p.date) {
      if (si === -1) si = i
      ei = i
    }
  })
  return si === -1 ? null : { start: si, end: ei }
}

export function distributeItemCost(
  totalCost: number,
  itemStartIso: string,
  itemEndIso: string,
  periods: Period[],
): number[] {
  const result = periods.map(() => 0)
  const iStart = new Date(itemStartIso + 'T00:00:00')
  const iEnd   = new Date(itemEndIso   + 'T00:00:00')

  const overlapping: { index: number; days: number }[] = []
  periods.forEach((p, i) => {
    const oStart = iStart > p.date    ? iStart : p.date
    const oEnd   = iEnd   < p.endDate ? iEnd   : p.endDate
    if (oEnd >= oStart) {
      const days = Math.round((oEnd.getTime() - oStart.getTime()) / 86400000) + 1
      overlapping.push({ index: i, days })
    }
  })

  const totalDays = overlapping.reduce((s, o) => s + o.days, 0)
  if (totalDays > 0) {
    overlapping.forEach(o => { result[o.index] = totalCost * (o.days / totalDays) })
  }
  return result
}

export function cumulative(arr: number[]): number[] {
  const res: number[] = []
  let sum = 0
  for (const v of arr) { sum += v; res.push(sum) }
  return res
}

export function todayPeriodIndex(periods: Period[]): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < periods.length; i++) {
    if (today >= periods[i].date && today <= periods[i].endDate) return i
  }
  return today < (periods[0]?.date ?? today) ? -1 : periods.length
}

export function periodContaining(dateIso: string, periods: Period[]): number {
  const d = new Date(dateIso + 'T00:00:00')
  return periods.findIndex(p => d >= p.date && d <= p.endDate)
}
