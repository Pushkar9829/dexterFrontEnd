// HRMS attendance — backend adapter (API mode only). The attendance page keeps its own mock rows when the API is off.
import { useEffect, useState } from 'react'
import { get, post } from '@/lib/api'
import { apiCall, apiEnabled, errMsg, fetchAll, toastError } from './bizApi'

export type AttendanceStatus = 'Present' | 'Late' | 'On Leave' | 'Half Day'
/** Frontend row shape used by pages/hrms/HrmsAttendance.tsx. */
export type AttendanceRow = {
  id: string
  empId: string
  empName: string
  department: string
  designation: string
  shift: string
  date: string
  punchIn: string
  punchOut: string
  workHours: string
  status: AttendanceStatus
}
type ApiAttendance = {
  attId: string; employeeId: string; empName: string; department: string; designation?: string; shift?: string; date: string
  punchIn?: string; punchOut?: string; workMinutes?: number; status: AttendanceStatus
}
export type AttendanceStats = { total: number; present: number; late: number; onLeave: number; halfDay: number; avgWorkMinutes: number }

const hhmm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—')
export function toRow(a: ApiAttendance): AttendanceRow {
  const m = a.workMinutes ?? 0
  return {
    id: a.attId, empId: a.employeeId, empName: a.empName, department: a.department, designation: a.designation ?? '—',
    shift: a.shift ?? 'General (09:30 - 18:30)', date: a.date, punchIn: hhmm(a.punchIn), punchOut: hhmm(a.punchOut),
    workHours: a.status === 'On Leave' ? '0h' : a.punchIn && !a.punchOut ? 'In progress' : `${Math.floor(m / 60)}h ${m % 60}m`, status: a.status,
  }
}

/** GET /hrms/attendance?date=… (all pages) + stats. Roles without HRMS Edit get only their own rows (server-side). */
export function useAttendance(date: string) {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!apiEnabled) return
    let live = true
    setLoading(true)
    setError(null)
    const q = date ? { date } : {}
    Promise.all([fetchAll<ApiAttendance>('/hrms/attendance', q), get<{ stats: AttendanceStats }>('/hrms/attendance', { ...q, limit: 1 })])
      .then(([items, r]) => {
        if (!live) return
        setRows(items.map(toRow))
        setStats(r.stats)
      })
      .catch((e) => live && setError(toastError(e, 'Could not load attendance')))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [date, tick])
  return { rows, stats, loading, error, reload: () => setTick((t) => t + 1) }
}

export const punchIn = () => apiCall(() => post<ApiAttendance>('/hrms/attendance/punch-in', { source: 'Web' }), 'Punch in failed')
export const punchOut = () => apiCall(() => post<ApiAttendance>('/hrms/attendance/punch-out'), 'Punch out failed')
/** HR marks / corrects a day — POST /hrms/attendance/mark (HRMS Edit). */
export const markAttendance = (input: { employeeId: string; date: string; status: AttendanceStatus; remark: string }) =>
  apiCall(() => post<ApiAttendance>('/hrms/attendance/mark', input), 'Could not mark attendance')
export { errMsg }
