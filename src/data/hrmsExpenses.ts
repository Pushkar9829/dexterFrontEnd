// Shared HRMS expense store (mock, localStorage). Single source for the HRMS › Expenses page and for
// other modules that raise an expense (e.g. Postal & Courier outward dispatch charges).
import { createStore } from '@/lib/store'
import { emitWorkflow } from './workflow'
import { getSession } from '@/lib/auth'
import { get, patch as apiPatch, post } from '@/lib/api'
import { apiCall, apiEnabled, createLoader, fetchAll, fromPaise, isoToPrettyTime, toPaise, toastError } from './bizApi'
import {
  DEFAULT_EMPLOYEE,
  INITIAL_APPROVALS,
  INITIAL_FIELD_EXPENSES,
  INITIAL_OFFICE_EXPENSES,
  type ApprovalClaim,
  type ExpenseClaimItem,
} from './expensesData'

export type HrmsExpenseSegment = 'Office' | 'Field' | 'Other'
export type HrmsExpenseSource = 'Self' | 'Courier' | 'Field' | 'Other'

export type HrmsExpense = ExpenseClaimItem & {
  segment: HrmsExpenseSegment
  source: HrmsExpenseSource
  /** Reference in the originating module (e.g. courier expense / docket / AWB). */
  refId?: string
  /** API mode: the backend claim this line belongs to, and its status. */
  claimNo?: string
  claimStatus?: 'Draft' | 'Pending' | 'Approved' | 'Rejected'
}
export type HrmsApproval = ApprovalClaim & {
  source?: HrmsExpenseSource
  refId?: string
  decidedBy?: string
  decidedAt?: string
  /** API mode: per-stage approval trail. */
  trail?: { stage: string; decision: string; by: string; at: string; remark?: string }[]
}
export type HrmsExpenseState = { items: HrmsExpense[]; approvals: HrmsApproval[] }

const SEED_OTHER: ExpenseClaimItem[] = [
  { id: 'oth-1', date: '10.08.2026', category: 'Pantry & Tea', purpose: 'Monthly tea & refreshment for branch office staff', vendorRef: 'CASH-REC-441', amount: 850, paymentMode: 'Cash', receiptName: 'Pantry_Cash_Slip.pdf', remarks: 'Staff Welfare' },
  { id: 'oth-2', date: '22.08.2026', category: 'Housekeeping Consumables', purpose: 'Cleaning supplies & phenyl for Bewar office', vendorRef: 'INV-CL-009', amount: 620, paymentMode: 'UPI', receiptName: 'Cleaning_Supplies.pdf', remarks: '-' },
]

function seed(): HrmsExpenseState {
  const tag = (seg: HrmsExpenseSegment) => (i: ExpenseClaimItem): HrmsExpense => ({ ...i, segment: seg, source: 'Self' })
  return {
    items: [...INITIAL_OFFICE_EXPENSES.map(tag('Office')), ...INITIAL_FIELD_EXPENSES.map(tag('Field')), ...SEED_OTHER.map(tag('Other'))],
    approvals: INITIAL_APPROVALS.map((a) => ({ ...a, source: 'Self' as const })),
  }
}

export const hrmsExpenseStore = createStore<HrmsExpenseState>('dexter.hrms.expenses.v1', seed)
export const useHrmsExpenses = () => hrmsExpenseStore.use()

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`
const fmtDate = (d = new Date()) => d.toLocaleDateString('en-GB').replace(/\//g, '.')
const fmtStamp = (d = new Date()) => `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

/** Replace the rows of one segment (Office / Field / Other) — used by the claim tables. */
export function setHrmsSegment(segment: HrmsExpenseSegment, fn: (prev: HrmsExpense[]) => ExpenseClaimItem[]) {
  hrmsExpenseStore.set((s) => {
    const mine = s.items.filter((i) => i.segment === segment)
    const rest = s.items.filter((i) => i.segment !== segment)
    const next = fn(mine).map((i) => ({ source: 'Self' as const, ...i, segment }) as HrmsExpense)
    return { ...s, items: [...next, ...rest] }
  })
}

export type AddHrmsExpenseInput = {
  source: HrmsExpenseSource
  refId?: string
  segment?: HrmsExpenseSegment
  date?: string
  category: string
  purpose: string
  vendorRef?: string
  amount: number
  paymentMode?: ExpenseClaimItem['paymentMode']
  receiptName?: string
  remarks?: string
  route?: string
  travelMode?: string
  km?: number | string
  empName?: string
  department?: string
  /** Emit HRMS 'Submit' workflow (default true; pass false when the caller already emitted one). */
  notify?: boolean
}

/** Add an expense line + a pending approval claim. Idempotent per (source, refId). Returns the claim no. */
export function addHrmsExpense(input: AddHrmsExpenseInput): string {
  const s = hrmsExpenseStore.get()
  if (input.refId) {
    const dup = s.approvals.find((a) => a.refId === input.refId && a.source === input.source)
    if (dup) return dup.claimNo
  }
  const segment = input.segment ?? (input.source === 'Field' ? 'Field' : input.source === 'Other' ? 'Other' : 'Office')
  const item: HrmsExpense = {
    id: uid('EXP'),
    date: input.date ?? fmtDate(),
    category: input.category,
    purpose: input.purpose,
    vendorRef: input.vendorRef || input.refId || 'N/A',
    amount: Number(input.amount) || 0,
    paymentMode: input.paymentMode ?? 'UPI',
    receiptName: input.receiptName || 'Receipt_voucher.pdf',
    remarks: input.remarks ?? (input.refId ? `${input.source} ref ${input.refId}` : '-'),
    route: input.route,
    travelMode: input.travelMode,
    km: input.km,
    segment,
    source: input.source,
    refId: input.refId,
  }
  const claimNo = `CLM-${new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase()}-${uid('').slice(1)}`
  const approval: HrmsApproval = {
    id: uid('APP'),
    claimNo,
    empName: input.empName ?? getSession()?.name ?? DEFAULT_EMPLOYEE.name,
    empCode: DEFAULT_EMPLOYEE.code,
    department: input.department ?? DEFAULT_EMPLOYEE.department,
    claimType: segment,
    date: item.date,
    itemsCount: 1,
    amount: item.amount,
    submittedDate: fmtStamp(),
    stage: 'Senior',
    receiptName: item.receiptName,
    status: 'Pending',
    source: input.source,
    refId: input.refId,
  }
  hrmsExpenseStore.set((p) => ({ items: [item, ...p.items], approvals: [approval, ...p.approvals] }))
  if (apiEnabled) {
    // Courier / other-module claims are raised server-side by the backend contract (hrms/api.ts addHrmsExpense);
    // only the user's own claims are POSTed. Either way the store re-hydrates so the server claim no. replaces the local one.
    if (input.source === 'Self')
      void createClaimApi(segment, [item], true).catch(() =>
        hrmsExpenseStore.set((p) => ({ items: p.items.filter((i) => i.id !== item.id), approvals: p.approvals.filter((a) => a.id !== approval.id) })),
      )
    else setTimeout(() => void hrmsExpensesLoader.reload(), 800)
    return claimNo
  }
  if (input.notify !== false)
    emitWorkflow({
      module: 'HRMS', event: 'Submit', refId: claimNo,
      vars: { Record_ID: claimNo, Current_Status: 'Pending', Pending_Action: 'Expense approval' },
      nextAction: { title: `Approve expense claim ${claimNo} (₹${item.amount})` },
    })
  return claimNo
}

/** Approve / reject a claim and fire the HRMS workflow event. */
export function decideHrmsClaim(id: string, status: 'Approved' | 'Rejected', remark?: string) {
  const a = hrmsExpenseStore.get().approvals.find((x) => x.id === id)
  if (!a) return
  if (apiEnabled) {
    void decideHrmsClaimApi(a.claimNo, status, remark).catch(() => undefined)
    return
  }
  const by = getSession()?.name ?? 'System'
  hrmsExpenseStore.set((p) => ({ ...p, approvals: p.approvals.map((x) => (x.id === id ? { ...x, status, decidedBy: by, decidedAt: new Date().toISOString() } : x)) }))
  emitWorkflow({
    module: 'HRMS', event: status === 'Approved' ? 'Approve' : 'Reject', refId: a.claimNo,
    vars: { Record_ID: a.claimNo, Current_Status: status, Approver_Name: by, Pending_Action: status === 'Approved' ? 'Payment processing' : 'Clarification / resubmission' },
  })
}

// ══════════════════════════════ Backend API (VITE_API_URL) ══════════════════════════════

type ApiItem = { itemId: string; date: string; category: string; purpose: string; vendorRef?: string; amountPaise: number; paymentMode: ExpenseClaimItem['paymentMode']; receiptName?: string; receiptFileId?: string; remarks?: string; route?: string; travelMode?: string; km?: number }
export type ApiClaim = {
  claimNo: string; segment: HrmsExpenseSegment; source: string; refId?: string; empName: string; empCode: string; department: string; month: string
  items: ApiItem[]; amountPaise: number; stage: ApprovalClaim['stage']; status: 'Draft' | 'Pending' | 'Approved' | 'Rejected'
  approvals: { stage: string; decision: string; by: string; at: string; remark?: string }[]; submittedAt?: string; decidedBy?: string; decidedAt?: string; createdAt: string
}
export type HrmsSummaryHead = { head: string; officePaise: number; fieldPaise: number; otherPaise: number; totalPaise: number; claims: number }

/** 'yyyy-mm-dd' → 'dd.mm.yyyy' (HRMS page convention). */
const isoToDot = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10).split('-').reverse().join('.') : s ?? '')
/** 'dd.mm.yyyy' / 'dd/mm/yyyy' → 'yyyy-mm-dd'. */
const dotToIso = (s: string) => {
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s.slice(0, 10)
}
const srcOf = (s: string): HrmsExpenseSource => (s === 'Courier' || s === 'Field' || s === 'Other' ? s : 'Self')

function claimToLines(c: ApiClaim): HrmsExpense[] {
  return c.items.map((i) => ({
    id: i.itemId, date: isoToDot(i.date), category: i.category, purpose: i.purpose, vendorRef: i.vendorRef || 'N/A',
    amount: fromPaise(i.amountPaise), paymentMode: i.paymentMode, receiptName: i.receiptName || '', remarks: i.remarks || '-',
    route: i.route, travelMode: i.travelMode, km: i.km, segment: c.segment, source: srcOf(c.source), refId: c.refId, claimNo: c.claimNo, claimStatus: c.status,
  }))
}
function claimToApproval(c: ApiClaim): HrmsApproval {
  return {
    id: c.claimNo, claimNo: c.claimNo, empName: c.empName, empCode: c.empCode, department: c.department, claimType: c.segment,
    date: isoToDot(c.items[0]?.date ?? c.createdAt), itemsCount: c.items.length, amount: fromPaise(c.amountPaise),
    submittedDate: isoToPrettyTime(c.submittedAt ?? c.createdAt), stage: c.stage, receiptName: c.items[0]?.receiptName ?? '',
    status: c.status === 'Draft' ? 'Pending' : c.status, source: srcOf(c.source), refId: c.refId, decidedBy: c.decidedBy, decidedAt: c.decidedAt,
    trail: c.approvals,
  }
}
const toApiItem = (i: ExpenseClaimItem) => ({
  date: dotToIso(i.date), category: i.category, purpose: i.purpose || 'Official expense', vendorRef: (i.vendorRef || 'N/A').slice(0, 60),
  amountPaise: toPaise(i.amount), paymentMode: i.paymentMode, receiptName: i.receiptName || '', remarks: i.remarks || '',
  ...(i.route ? { route: i.route } : {}), ...(i.travelMode ? { travelMode: i.travelMode } : {}),
  ...(i.km !== undefined && i.km !== '' && !isNaN(Number(i.km)) ? { km: Number(i.km) } : {}),
})

/** Backend claims, raw (for screens that need the full record). */
export const hrmsClaimsStore = createStore<ApiClaim[]>('dexter.hrms.claims.api.v1', () => [])
export const hrmsSummaryStore = createStore<{ heads: HrmsSummaryHead[]; totalPaise: number } | null>('dexter.hrms.summary.api.v1', () => null)

/** API mode: GET /hrms/expenses (all pages) + /hrms/expenses/summary → stores. Drafts appear as lines only. */
export const hrmsExpensesLoader = createLoader('expense claims', async () => {
  const [claims, summary] = await Promise.all([fetchAll<ApiClaim>('/hrms/expenses'), get<{ heads: HrmsSummaryHead[]; totalPaise: number }>('/hrms/expenses/summary')])
  hrmsClaimsStore.set(claims)
  hrmsSummaryStore.set(summary)
  hrmsExpenseStore.set({ items: claims.flatMap(claimToLines), approvals: claims.filter((c) => c.status !== 'Draft').map(claimToApproval) })
})
export const useHrmsExpensesLoad = () => hrmsExpensesLoader.use()

/** POST /hrms/expenses — one claim from lines (rupees). Returns the server claim no. */
export async function createClaimApi(segment: HrmsExpenseSegment, lines: ExpenseClaimItem[], submit = true): Promise<string> {
  const c = await apiCall(() => post<ApiClaim>('/hrms/expenses', { segment, items: lines.map(toApiItem), submit }), 'Could not submit claim')
  await hrmsExpensesLoader.reload()
  return c.claimNo
}
/** PATCH /hrms/expenses/:claimNo — edit a Draft / Rejected claim, optionally resubmit. */
export async function updateClaimApi(claimNo: string, lines?: ExpenseClaimItem[], submit?: boolean) {
  await apiCall(() => apiPatch('/hrms/expenses/' + encodeURIComponent(claimNo), { ...(lines ? { items: lines.map(toApiItem) } : {}), ...(submit !== undefined ? { submit } : {}) }), 'Could not update claim')
  await hrmsExpensesLoader.reload()
}
/** POST /hrms/expenses/:claimNo/decision — stage-wise (Senior → HR → Admin → Finance). */
export async function decideHrmsClaimApi(claimNo: string, decision: 'Approved' | 'Rejected', remark?: string) {
  const r = await apiCall(() => post<ApiClaim>(`/hrms/expenses/${encodeURIComponent(claimNo)}/decision`, { decision, ...(remark ? { remark } : {}) }), `Could not ${decision === 'Approved' ? 'approve' : 'reject'} ${claimNo}`)
  await hrmsExpensesLoader.reload().catch((e) => toastError(e))
  return r
}
