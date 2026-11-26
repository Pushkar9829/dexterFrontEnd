// HRMS leave requests + attendance regularisation.
// API mode: /hrms/leaves (+ /balance, /:id/decision, /:id/cancel) and /hrms/attendance/regularisations (+ decision / cancel).
// Approvers (HRMS Approve) see everyone's requests, others only their own (server-side); nobody decides their own
// request (MAKER_CHECKER). Mock mode: a small local store with the same rules so the screens work without a backend.
import { createStore } from '@/lib/store'
import { get, post } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { apiCall, apiEnabled, createLoader, fetchAll } from './bizApi'

export const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Leave Without Pay'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]
const ENTITLEMENT: Record<LeaveType, number | null> = { 'Casual Leave': 12, 'Sick Leave': 12, 'Earned Leave': 15, 'Leave Without Pay': null }
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
type Hist = { at: string; by: string; action: string; detail?: string }

export type LeaveRequest = {
  leaveId: string; employeeId: string; empName: string; department: string; userId?: string; type: LeaveType; from: string; to: string; halfDay: boolean; days: number; fy: string
  reason: string; status: RequestStatus; decidedByName?: string; decidedAt?: string; remark?: string; history: Hist[]; createdAt: string
}
export type Regularisation = {
  regId: string; employeeId: string; empName: string; department: string; userId?: string; date: string; punchIn: string; punchOut: string; requestedStatus: 'Present' | 'Half Day'
  reason: string; status: RequestStatus; decidedByName?: string; decidedAt?: string; remark?: string; history: Hist[]; createdAt: string
}
export type LeaveBalance = { employeeId: string; fy: string; types: { type: LeaveType; entitled: number | null; used: number; pending: number; available: number | null }[] }

type State = { leaves: LeaveRequest[]; regs: Regularisation[]; balance: LeaveBalance | null }
export const hrmsLeaveStore = createStore<State>(apiEnabled ? 'dexter.api.hrms.leave.v1' : 'dexter.hrms.leave.v1', () => ({ leaves: [], regs: [], balance: null }))

/** FY "2026-27" of an ISO date (April–March). */
export const fyOf = (iso: string) => {
  const [y, m] = iso.split('-').map(Number)
  const start = m >= 4 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
const todayIso = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10)
/** Days between two dates, Sundays excluded; a half day counts 0.5. */
export function leaveDays(from: string, to: string, halfDay: boolean) {
  if (halfDay) return 0.5
  let n = 0
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) if (new Date(t).getUTCDay() !== 0) n++
  return n
}
const me = () => getSession()
const nowIso = () => new Date().toISOString()

// ── API ──────────────────────────────────────────────────────────────────
export const hrmsLeaveLoader = createLoader('leave & regularisation requests', async () => {
  const [leaves, regs, balance] = await Promise.all([
    fetchAll<LeaveRequest>('/hrms/leaves'),
    fetchAll<Regularisation>('/hrms/attendance/regularisations'),
    get<LeaveBalance>('/hrms/leaves/balance').catch(() => null), // no linked employee record → no balance
  ])
  hrmsLeaveStore.set({ leaves, regs, balance })
})
export const useHrmsLeave = () => {
  hrmsLeaveLoader.use()
  return hrmsLeaveStore.use()
}

/** Mock balance from the local requests of the signed-in user. */
export function localBalance(s: State, fy = fyOf(todayIso())): LeaveBalance {
  const mine = s.leaves.filter((l) => l.userId === (me()?.userId ?? me()?.name) && l.fy === fy)
  return {
    employeeId: me()?.employeeId ?? '—',
    fy,
    types: LEAVE_TYPES.map((type) => {
      const used = mine.filter((l) => l.type === type && l.status === 'Approved').reduce((a, l) => a + l.days, 0)
      const pending = mine.filter((l) => l.type === type && l.status === 'Pending').reduce((a, l) => a + l.days, 0)
      const entitled = ENTITLEMENT[type]
      return { type, entitled, used, pending, available: entitled === null ? null : entitled - used - pending }
    }),
  }
}

/** Is the request the signed-in user's own (no deciding it — maker-checker)? */
export const isOwnRequest = (r: { userId?: string; empName: string }) => (r.userId ? r.userId === (me()?.userId ?? me()?.name) : r.empName === me()?.name)

export async function applyLeave(input: { type: LeaveType; from: string; to: string; halfDay: boolean; reason: string }) {
  if (apiEnabled) {
    await apiCall(() => post('/hrms/leaves', input), 'Leave not submitted')
    await hrmsLeaveLoader.reload()
    return
  }
  if (input.to < input.from) throw new Error('"To" must be on or after "From".')
  const s = hrmsLeaveStore.get()
  const uid = me()?.userId ?? me()?.name ?? 'me'
  if (s.leaves.some((l) => l.userId === uid && ['Pending', 'Approved'].includes(l.status) && l.from <= input.to && input.from <= l.to)) throw new Error('You already have leave on these dates.')
  const days = leaveDays(input.from, input.to, input.halfDay)
  const bal = localBalance(s, fyOf(input.from)).types.find((t) => t.type === input.type)
  if (bal && bal.available !== null && days > bal.available) throw new Error(`Insufficient ${input.type} balance (${bal.available} day(s) left).`)
  const l: LeaveRequest = {
    leaveId: `LV-${String(s.leaves.length + 1).padStart(5, '0')}`, employeeId: me()?.employeeId ?? '—', empName: me()?.name ?? 'Me', department: '—', userId: uid, ...input,
    days, fy: fyOf(input.from), status: 'Pending', history: [{ at: nowIso(), by: me()?.name ?? 'Me', action: 'Applied' }], createdAt: nowIso(),
  }
  hrmsLeaveStore.set((x) => ({ ...x, leaves: [l, ...x.leaves] }))
}
export async function decideLeave(id: string, decision: 'Approved' | 'Rejected', remark?: string) {
  if (apiEnabled) {
    await apiCall(() => post(`/hrms/leaves/${encodeURIComponent(id)}/decision`, { decision, ...(remark?.trim() ? { remark: remark.trim() } : {}) }), `Leave not ${decision.toLowerCase()}`)
    await hrmsLeaveLoader.reload()
    return
  }
  hrmsLeaveStore.set((x) => ({ ...x, leaves: x.leaves.map((l) => (l.leaveId === id ? { ...l, status: decision, decidedByName: me()?.name, decidedAt: nowIso(), remark, history: [...l.history, { at: nowIso(), by: me()?.name ?? '', action: decision, detail: remark }] } : l)) }))
}
export async function cancelLeave(id: string, reason: string) {
  if (apiEnabled) {
    await apiCall(() => post(`/hrms/leaves/${encodeURIComponent(id)}/cancel`, { reason }), 'Leave not cancelled')
    await hrmsLeaveLoader.reload()
    return
  }
  hrmsLeaveStore.set((x) => ({ ...x, leaves: x.leaves.map((l) => (l.leaveId === id ? { ...l, status: 'Cancelled', history: [...l.history, { at: nowIso(), by: me()?.name ?? '', action: 'Cancelled', detail: reason }] } : l)) }))
}

export async function requestRegularisation(input: { date: string; punchIn: string; punchOut: string; requestedStatus?: 'Present' | 'Half Day'; reason: string }) {
  if (apiEnabled) {
    await apiCall(() => post('/hrms/attendance/regularisations', input), 'Regularisation not submitted')
    await hrmsLeaveLoader.reload()
    return
  }
  const s = hrmsLeaveStore.get()
  const uid = me()?.userId ?? me()?.name ?? 'me'
  if (s.regs.some((r) => r.userId === uid && r.date === input.date && r.status === 'Pending')) throw new Error('A regularisation for this day is already pending.')
  const mins = (Date.parse(input.punchOut) - Date.parse(input.punchIn)) / 60_000
  const r: Regularisation = {
    regId: `REG-${String(s.regs.length + 1).padStart(5, '0')}`, employeeId: me()?.employeeId ?? '—', empName: me()?.name ?? 'Me', department: '—', userId: uid, ...input,
    requestedStatus: input.requestedStatus ?? (mins < 270 ? 'Half Day' : 'Present'), status: 'Pending', history: [{ at: nowIso(), by: me()?.name ?? 'Me', action: 'Requested' }], createdAt: nowIso(),
  }
  hrmsLeaveStore.set((x) => ({ ...x, regs: [r, ...x.regs] }))
}
export async function decideRegularisation(id: string, decision: 'Approved' | 'Rejected', remark?: string) {
  if (apiEnabled) {
    await apiCall(() => post(`/hrms/attendance/regularisations/${encodeURIComponent(id)}/decision`, { decision, ...(remark?.trim() ? { remark: remark.trim() } : {}) }), `Regularisation not ${decision.toLowerCase()}`)
    await hrmsLeaveLoader.reload()
    return
  }
  hrmsLeaveStore.set((x) => ({ ...x, regs: x.regs.map((r) => (r.regId === id ? { ...r, status: decision, decidedByName: me()?.name, decidedAt: nowIso(), remark, history: [...r.history, { at: nowIso(), by: me()?.name ?? '', action: decision, detail: remark }] } : r)) }))
}
export async function cancelRegularisation(id: string) {
  if (apiEnabled) {
    await apiCall(() => post(`/hrms/attendance/regularisations/${encodeURIComponent(id)}/cancel`), 'Regularisation not cancelled')
    await hrmsLeaveLoader.reload()
    return
  }
  hrmsLeaveStore.set((x) => ({ ...x, regs: x.regs.map((r) => (r.regId === id ? { ...r, status: 'Cancelled', history: [...r.history, { at: nowIso(), by: me()?.name ?? '', action: 'Cancelled' }] } : r)) }))
}
