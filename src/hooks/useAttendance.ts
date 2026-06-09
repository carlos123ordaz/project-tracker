import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AttendanceRecord, AttendanceCondition, AttendanceMotive, Shift, UserProfile, GpsCoords } from '../lib/types'
// UserProfile used in checkIn params

function calcScheduledHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0
  const [ih, im] = checkIn.split(':').map(Number)
  const [oh, om] = checkOut.split(':').map(Number)
  return Math.max(0, (oh * 60 + om - (ih * 60 + im)) / 60)
}

function calcRealHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0
  const start = new Date(checkIn)
  const end   = new Date(checkOut)
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
}

export function useAttendance(userId?: string, dateFilter?: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    let q = supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (userId) q = q.eq('collaborator_id', userId)

    if (dateFilter) {
      // Trae la fecha seleccionada + siempre hoy (para estado de check-in/out)
      if (dateFilter === today) {
        q = q.eq('date', today)
      } else {
        q = q.or(`date.eq.${today},date.eq.${dateFilter}`)
      }
    } else {
      // Sin filtro: últimos 90 días para no traer toda la tabla
      const since = new Date()
      since.setDate(since.getDate() - 90)
      q = q.gte('date', since.toISOString().split('T')[0])
    }

    const { data } = await q
    setRecords((data as AttendanceRecord[]) || [])
    setLoading(false)
  }, [userId, dateFilter])

  useEffect(() => { fetch() }, [fetch])

  const todayRecord = (): AttendanceRecord | null => {
    const today = new Date().toISOString().split('T')[0]
    return records.find(r => r.date === today && r.collaborator_id === userId) ?? null
  }

  const checkIn = async (params: {
    profile: UserProfile
    condition: AttendanceCondition
    motive: AttendanceMotive
    observations: string
    shift: Shift
    project_id?: string | null
    project_name?: string | null
    project_type?: string | null
    coords?: GpsCoords | null
  }) => {
    const now   = new Date()
    const today = now.toISOString().split('T')[0]

    const scheduled = calcScheduledHours(params.profile.check_in_time, params.profile.check_out_time)
    const inTime    = params.condition === 'Asistencia' ? now.toISOString() : null

    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        date:             today,
        collaborator_id:  params.profile.id,
        collaborator_name: params.profile.full_name || params.profile.email,
        project_id:       params.project_id   ?? null,
        project_name:     params.project_name ?? null,
        project_type:     params.project_type ?? null,
        shift:            params.shift,
        check_in_time:    inTime,
        scheduled_hours:  scheduled,
        real_hours:       0,
        extra_hours:      0,
        condition:          params.condition,
        motive:             params.motive,
        observations:       params.observations,
        check_in_lat:       params.coords?.lat      ?? null,
        check_in_lng:       params.coords?.lng      ?? null,
        check_in_accuracy:  params.coords?.accuracy ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    const record = data as AttendanceRecord
    setRecords(prev => [record, ...prev])
    return record
  }

  const checkOut = async (recordId: string, coords?: GpsCoords | null) => {
    const now     = new Date()
    const record  = records.find(r => r.id === recordId)
    if (!record) throw new Error('Registro no encontrado')

    const real  = calcRealHours(record.check_in_time, now.toISOString())
    const extra = Math.max(0, real - record.scheduled_hours)

    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time:      now.toISOString(),
        real_hours:          parseFloat(real.toFixed(2)),
        extra_hours:         parseFloat(extra.toFixed(2)),
        check_out_lat:       coords?.lat      ?? null,
        check_out_lng:       coords?.lng      ?? null,
        check_out_accuracy:  coords?.accuracy ?? null,
      })
      .eq('id', recordId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    const updated = data as AttendanceRecord
    setRecords(prev => prev.map(r => r.id === recordId ? updated : r))
    return updated
  }

  return { records, loading, refetch: fetch, todayRecord, checkIn, checkOut }
}
