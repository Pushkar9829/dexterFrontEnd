// Business Model vertical — page-local metadata that the shared payout model (src/data/payout.ts)
// does not carry: maker/checker, mapping history, expense submissions, form drafts.
// Mock only (localStorage). Business data itself always lives in businessStore.
import { createStore } from '@/lib/store'
import { apiEnabled } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { currentRole, can } from '@/lib/rbac'
import { franchiseStore, type Franchise } from '@/data/franchises'
import type { NetworkState } from '@/data/network'
import { pid, nowIso, type BmExpense, type BmSite, type ExpenseStatus, type FinanceRules, type Paise } from '@/data/payout'

export type HistoryEntry = { at: string; by: string; action: string; detail?: string }
export type MakerMeta = { maker: string; createdAt: string; checker?: string; checkedAt?: string; history: HistoryEntry[] }
export type FileRef = { name: string; size: number; file?: File; fileId?: string }

export type ExpenseSubmission = {
  id: string
  atmId: string
  month: string
  expenseIds: string[]
  total: Paise
  count: number
  bills: FileRef[]
  submittedAt: string
  submittedBy: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  remark?: string
}

export type BmLocal = {
  siteMeta: Record<string, MakerMeta> // by BM site code
  payoutMeta: Record<string, MakerMeta> // by BmPayout id
  forecastMeta: Record<string, MakerMeta> // by ForecastRow id
  alfMeta: Record<string, MakerMeta> // by AlfRow id
  categoryMeta: Record<string, MakerMeta> // by BM category code
  submissions: ExpenseSubmission[]
  drafts: Record<string, unknown>
}

export const bmLocal = createStore<BmLocal>(apiEnabled ? 'dexter.payout.bm.local.api' : 'dexter.payout.bm.local.v1', () => ({
  siteMeta: {}, payoutMeta: {}, forecastMeta: {}, alfMeta: {}, categoryMeta: {}, submissions: [], drafts: {},
}))
export const useBmLocal = () => bmLocal.use()

export const actor = () => getSession()?.name ?? 'Unknown user'
export const SEED_MAKER = 'System (migrated)'

type MetaKey = 'siteMeta' | 'payoutMeta' | 'forecastMeta' | 'alfMeta' | 'categoryMeta'
export function metaOf(l: BmLocal, key: MetaKey, id: string): MakerMeta {
  return l[key][id] ?? { maker: SEED_MAKER, createdAt: '2026-04-01T10:00:00.000Z', history: [] }
}
/** Append a history line (creates the meta with the current user as maker when missing). */
export function touchMeta(key: MetaKey, id: string, action: string, detail?: string, patch: Partial<MakerMeta> = {}) {
  const by = actor()
  bmLocal.set((l) => {
    const cur = l[key][id] ?? { maker: by, createdAt: nowIso(), history: [] }
    return { ...l, [key]: { ...l[key], [id]: { ...cur, ...patch, history: [{ at: nowIso(), by, action, detail }, ...cur.history] } } }
  })
}

/** Maker-checker: the checker must be authorised and must not be the maker. Returns a reason when blocked. */
export function checkerBlock(maker: string): string | null {
  if (!can('Approve')) return `Your role (${currentRole()}) cannot approve.`
  if (maker === actor()) return 'Maker-checker: you created this record, so another authorised user must approve it.'
  return null
}

// ── drafts ──────────────────────────────────────────────────────────────
export const getDraft = <T,>(k: string) => bmLocal.get().drafts[k] as T | undefined
export const saveDraft = (k: string, v: unknown) => bmLocal.set((l) => ({ ...l, drafts: { ...l.drafts, [k]: v } }))
export const clearDraft = (k: string) =>
  bmLocal.set((l) => {
    const d = { ...l.drafts }
    delete d[k]
    return { ...l, drafts: d }
  })

// ── dates / FY ──────────────────────────────────────────────────────────
export const today = () => new Date().toISOString().slice(0, 10)
export function fyOf(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = m >= 4 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
export const fmtDate = (d?: string) => (d ? new Date(d.length > 10 ? d : `${d}T00:00:00`).toLocaleDateString('en-GB') : '—')
export const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

// ── expense status (accrual vs actual §12.3) ────────────────────────────
/** Unpaid approved/due expenses past their due date are Overdue. */
export function effectiveStatus(e: BmExpense, on = today()): ExpenseStatus {
  if ((e.status === 'Due' || e.status === 'Approved' || e.status === 'Partially Paid') && e.paid < e.amount && e.dueDate && e.dueDate < on) return 'Overdue'
  return e.status
}
/** Roll-up of several expense rows into one status (history / register). */
export function rollupStatus(rows: BmExpense[]): ExpenseStatus | '—' {
  if (!rows.length) return '—'
  const st = rows.map((e) => effectiveStatus(e))
  const live = st.filter((s) => s !== 'Rejected')
  if (!live.length) return 'Rejected'
  if (live.includes('Overdue')) return 'Overdue'
  if (live.every((s) => s === 'Paid')) return 'Paid'
  if (live.some((s) => s === 'Paid' || s === 'Partially Paid')) return 'Partially Paid'
  if (live.includes('Due')) return 'Due'
  if (live.every((s) => s === 'Approved')) return 'Approved'
  return 'Recorded'
}
export const EXPENSE_TONE: Record<string, 'green' | 'red' | 'amber' | 'gray' | 'blue'> = {
  Recorded: 'blue', Approved: 'green', Due: 'amber', 'Partially Paid': 'amber', Paid: 'green', Overdue: 'red', Rejected: 'red', '—': 'gray',
}
export const UNPAID_APPROVED: ExpenseStatus[] = ['Approved', 'Due', 'Partially Paid', 'Overdue']

// ── eligible entities (§2.2) ────────────────────────────────────────────
export type Entity = { id: string; name: string; code: string; parentSmf?: string }
export function eligibleEntities(net: NetworkState, frs: Franchise[]) {
  const byId = new Map(frs.map((f) => [f.id, f]))
  const nm = (id: string) => byId.get(id)?.name ?? id
  const nodes = Object.values(net.nodes)
  const ok = (s: string) => s === 'Active'
  const smfs: Entity[] = nodes.filter((n) => n.tier === 'Super Master' && ok(n.status)).map((n) => ({ id: n.frId, name: nm(n.frId), code: n.code }))
  const mfs: Entity[] = nodes
    .filter((n) => n.tier === 'Master' && ok(n.status))
    .map((n) => ({ id: n.frId, name: nm(n.frId), code: n.code, parentSmf: n.parent.kind === 'SMF' ? n.parent.name : undefined }))
  const franchisees: Entity[] = nodes.filter((n) => n.tier === 'Franchise').slice(0, 40).map((n) => ({ id: n.frId, name: nm(n.frId), code: n.code }))
  const sort = (a: Entity, b: Entity) => a.name.localeCompare(b.name)
  return { smfs: smfs.sort(sort), mfs: mfs.sort(sort), franchisees }
}
export const franchiseName = (id: string) => franchiseStore.get().find((f) => f.id === id)?.name ?? id

export const FRANCHISEE_BM_REJECTION =
  'Business Model Sites can only be mapped to eligible Master Franchisees or Super Master Franchisees. Franchisee mapping is not permitted.'

/** BM site mapping that is live for a month (approved + active + effective). */
export function liveInMonth(s: BmSite, month: string) {
  const start = `${month}-01`
  const end = `${month}-31`
  return s.approval === 'Approved' && s.status === 'Active' && s.effectiveFrom <= end && (!s.effectiveTo || s.effectiveTo >= start)
}

export const ruleOr = (r: FinanceRules, k: keyof FinanceRules, pending = 'Pending Finance rule') => {
  const v = r[k]
  return v === null || v === undefined ? pending : String(v)
}

let fseq = 0
export const fileId = () => pid(`F${fseq++}`)

/** Parse a rupee amount typed by a user into paise; NaN for invalid. */
export function parseRupees(v: string): number {
  const t = v.replace(/[,₹\s]/g, '')
  if (!t) return NaN
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN
  const [a, b = ''] = t.split('.')
  return Number(a) * 100 + Number(b.padEnd(2, '0'))
}
export const rupeesInput = (p: Paise) => (p % 100 === 0 ? String(p / 100) : (p / 100).toFixed(2))
