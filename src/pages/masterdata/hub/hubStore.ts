// Local state for the Master Data hub pages (reminders, staff-mapping requests, drafts, AI settings).
// Mock only — persisted via createStore until the backend exists.
import { createStore } from '@/lib/store'
import { getSession } from '@/lib/auth'
import { CURRENT_ACTOR, COMPLETION_STEPS, uid, nowIso, type Department, type ParentRef, type Site, type StepStatus } from '@/data/network'

export const actor = () => getSession()?.name ?? CURRENT_ACTOR
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const daysSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400_000))
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—')
export const addDays = (days: number) => new Date(Date.now() + days * 86400_000).toISOString()

// ── Reminders (§10: the Task department keeps sending reminders) ─────────
export type Reminder = { id: string; at: string; from: string; sentBy: string; to: string; siteId: string; dept: Department; work: string; pendingDays: number }

// ── Staff / team mapping change requests (§8.6) ──────────────────────────
export type StaffMapRequest = {
  id: string
  frId: string
  from: ParentRef
  to: ParentRef
  reason: string
  effectiveDate: string
  requestedBy: string
  requestedAt: string
  status: 'Pending Approval' | 'Approved' | 'Rejected'
  decidedBy?: string
  decidedAt?: string
  remark?: string
}

export type HubState = {
  reminders: Reminder[]
  staffRequests: StaffMapRequest[]
  drafts: Record<string, Record<string, string>>
  stuckDays: number
}

export const hubStore = createStore<HubState>('dexter.masterHub.v1', () => ({ reminders: [], staffRequests: [], drafts: {}, stuckDays: 30 }))
export const useHub = () => hubStore.use()

export function addReminders(items: Omit<Reminder, 'id' | 'at' | 'from' | 'sentBy'>[]) {
  const by = actor()
  const at = nowIso()
  const rows: Reminder[] = items.map((i) => ({ ...i, id: uid('REM'), at, from: 'Task Department', sentBy: by }))
  hubStore.set((s) => ({ ...s, reminders: [...rows, ...s.reminders].slice(0, 3000) }))
  return rows.length
}
export function setStuckDays(n: number) {
  hubStore.set((s) => ({ ...s, stuckDays: n }))
}
export function saveDraft(key: string, data: Record<string, string>) {
  hubStore.set((s) => ({ ...s, drafts: { ...s.drafts, [key]: data } }))
}
export function clearDraft(key: string) {
  hubStore.set((s) => {
    const drafts = { ...s.drafts }
    delete drafts[key]
    return { ...s, drafts }
  })
}
export const getDraft = (key: string) => hubStore.get().drafts[key]

export function addStaffRequest(r: Omit<StaffMapRequest, 'id' | 'requestedBy' | 'requestedAt' | 'status'>) {
  const req: StaffMapRequest = { ...r, id: uid('SMR'), requestedBy: actor(), requestedAt: nowIso(), status: 'Pending Approval' }
  hubStore.set((s) => ({ ...s, staffRequests: [req, ...s.staffRequests] }))
  return req
}
export function decideStaffRequest(id: string, status: 'Approved' | 'Rejected', remark: string) {
  hubStore.set((s) => ({ ...s, staffRequests: s.staffRequests.map((r) => (r.id === id ? { ...r, status, remark, decidedBy: actor(), decidedAt: nowIso() } : r)) }))
}

// ── Analysis helpers (pure; used by the AI overview) ─────────────────────
/** Target days per step — used to flag delays and to estimate completion (estimate only). */
export const STEP_TARGET_DAYS: Record<string, number> = {
  onboarding: 7, projectMapping: 5, tis: 10, siteSetup: 15, assetsDelivery: 10, sdMapping: 7,
  accountMapping: 10, legal: 15, engineerMapping: 5, firstTxn: 10, final: 7,
}

/** The step a site is currently on (first non-completed step). */
export function currentStage(s: Site) {
  const step = COMPLETION_STEPS.find((c) => s.steps[c.key]?.status !== 'Completed')
  if (!step) return null
  const st = s.steps[step.key]
  return { ...step, status: st?.status ?? ('Not Started' as StepStatus), assignedTo: st?.assignedTo ?? '—', since: st?.since ?? s.updatedAt, days: daysSince(st?.since ?? s.updatedAt) }
}

/** Heuristic ETA: remaining target days for every open step, minus progress already spent on the current one. */
export function predictCompletion(s: Site) {
  const open = COMPLETION_STEPS.filter((c) => s.steps[c.key]?.status !== 'Completed')
  if (!open.length) return null
  const cur = currentStage(s)
  const curTarget = STEP_TARGET_DAYS[open[0].key] ?? 7
  const curLeft = cur && cur.status !== 'Not Started' ? Math.max(2, curTarget - cur.days) : curTarget
  const onHoldPenalty = cur?.status === 'On Hold' ? 10 : 0
  const rest = open.slice(1).reduce((a, c) => a + (STEP_TARGET_DAYS[c.key] ?? 7), 0)
  const days = curLeft + rest + onHoldPenalty
  return { stepsLeft: open.length, days, eta: addDays(days), confidence: cur?.status === 'On Hold' ? 'Low' : open.length <= 3 ? 'High' : open.length <= 6 ? 'Medium' : 'Low' }
}
