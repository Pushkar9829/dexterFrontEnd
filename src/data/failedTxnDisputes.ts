// Failed Transaction Dispute (Operations spec §11.1, mainly Self Funding sites).
// CRM / Franchise (mobile) entry → system dispute ID → CRM verification & submission (maker-checker)
// → Admin approval → email template trigger → bank / recipient response → follow-up & tasks → resolution / closure.
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { actorName, emitWorkflow, logAudit, newTrail, nowIso, wfStore, type AuditTrail, type FundingModel } from '@/data/workflow'
import { atmInfo, normaliseDate } from '@/pages/operations/recon2/atmDirectory'
import { legacyCbrSite } from '@/data/cbrSites'
import { siteAt, resolveSite } from '@/lib/siteRef'
import { get as httpGet, post as httpPost, patch as httpPatch } from '@/lib/api'
import { apiEnabled, createLoader, errMsg, fetchAll, fromPaise, toPaise } from './opsApi'
import { toast } from '@/components/ui/Toast'

// Mock flow: … → Pending Approval → (approve + email) In Progress → Resolved → Closed.
// Backend flow (API mode): … → Verified (CRM) → Processed (Operations) → Approved (Admin, locked) → Sent to Bank → Resolved → Closed.
export type FtdStatus = 'Draft' | 'Pending Verification' | 'Returned for Correction' | 'Pending Approval' | 'Approved' | 'Rejected' | 'In Progress' | 'Resolved' | 'Closed' | 'Verified' | 'Processed' | 'Sent to Bank'
const MOCK_FTD_STATUSES: FtdStatus[] = ['Draft', 'Pending Verification', 'Returned for Correction', 'Pending Approval', 'Approved', 'Rejected', 'In Progress', 'Resolved', 'Closed']
const API_FTD_STATUSES: FtdStatus[] = ['Draft', 'Pending Verification', 'Returned for Correction', 'Verified', 'Processed', 'Approved', 'Sent to Bank', 'Resolved', 'Rejected', 'Closed']
export const FTD_STATUSES: FtdStatus[] = apiEnabled ? API_FTD_STATUSES : MOCK_FTD_STATUSES
/** Process-flow steps (§11.1) shown as a stepper. */
export const FTD_STEPS = ['Dispute entry', 'Dispute ID', 'CRM verification', 'Admin approval', 'Email trigger', 'Bank response', 'Follow-up', 'Resolution / closure'] as const

export type RaisedVia = 'CRM Web' | 'Franchise Mobile'
export type ResponseFrom = 'Bank' | 'NPCI' | 'Recipient' | 'Customer'
export const RESPONSE_FROM: ResponseFrom[] = ['Bank', 'NPCI', 'Recipient', 'Customer']
export type FtdResponse = { id: string; at: string; by: string; from: ResponseFrom; text: string; attachment?: string }
export type FtdFollowUp = { id: string; at: string; by: string; note: string; dueAt: string; owner: string; taskId?: string; done: boolean; doneAt?: string }
export type FtdHistory = { at: string; by: string; text: string }

export interface FailedTxnDisputeRecord {
  id: string // system dispute ID
  raisedVia: RaisedVia
  raisedBy: string
  franchiseName: string
  atmId: string
  siteId: string
  fundingModel: FundingModel
  machineType: string
  txnType: string
  txnId: string
  utr: string
  txnDate: string // yyyy-mm-dd
  txnTime: string
  customerName: string
  customerMobile: string
  accountNo: string
  bankName: string
  ifscCode: string
  cardDetails: string
  branch: string
  rrn: string
  amount: number
  txnSlipName?: string
  remarks: string
  recipient: { name: string; email: string }
  status: FtdStatus
  trail: AuditTrail
  emailRefs: string[]
  responses: FtdResponse[]
  followUps: FtdFollowUp[]
  resolution?: { outcome: string; note: string; at: string; by: string }
  history: FtdHistory[]
  createdAt: string
  /** API mode: §11.3 source record found by the backend (CBR / Cash Loading / EOD). */
  cashSource?: { kind: string; refId: string; atmId: string; date: string; funding: string; status: string } | null
  /** API mode: Operations processing (between CRM verification and Admin approval). */
  processed?: { by: string; note: string }
  emailsSent?: { at: string; to: string[]; subject: string; ok: boolean }[]
  version?: number
}

export const FTD_TXN_TYPES = ['Withdrawal - Card', 'Withdrawal - UPI', 'Deposit - Card', 'Deposit - UPI', 'Balance Enquiry']
export const FTD_OUTCOMES = ['Amount reversed to customer', 'Customer credited by bank', 'Claim rejected — txn successful (EJ proof)', 'Settled with franchise', 'Withdrawn by customer']
export const BANK_RECIPIENTS = [
  { name: 'SBI – ATM Dispute Cell', email: 'atmdisputes@sbi.example' },
  { name: 'HDFC Bank – Card Disputes', email: 'carddisputes@hdfc.example' },
  { name: 'ICICI Bank – Chargeback Desk', email: 'chargeback@icici.example' },
  { name: 'Axis Bank – Acquiring Disputes', email: 'acq.disputes@axis.example' },
  { name: 'NPCI – UPI Dispute Redressal', email: 'udir@npci.example' },
]

// ── Seed ──────────────────────────────────────────────────────────────────
const H = (at: string, by: string, text: string): FtdHistory => ({ at, by, text })
const TR = (by: string, at: string, extra: Partial<AuditTrail> = {}): AuditTrail => ({ createdBy: by, createdAt: at, submittedBy: by, submittedAt: at, modifications: [], documents: [], taskRefs: [], ...extra })
// Seed ATMs are Site Master sites (Self Funding = first SF sites in the Cash Loading Master; Full Funding = a CBR site).
const sfAtm = (i: number) => siteAt(i, (s) => s.siteType === 'SF').atmId
const ATM_A = sfAtm(2)
const ATM_B = sfAtm(0)
const ATM_C = sfAtm(1)
const ATM_D = legacyCbrSite('DX-MH-01482')?.atmId ?? 'DX-MH-01482'

function seed(): FailedTxnDisputeRecord[] {
  // franchise-side makers carry the real franchise name of the site
  const frA = atmInfo(ATM_A).franchiseName
  const frC = atmInfo(ATM_C).franchiseName
  return JSON.parse(JSON.stringify(seedRaw()).split('Om Sai Enterprises').join(frA).split('Guruprit Singh Enterprises').join(frC)) as FailedTxnDisputeRecord[]
}

function seedRaw(): FailedTxnDisputeRecord[] {
  const base = (p: Partial<FailedTxnDisputeRecord> & Pick<FailedTxnDisputeRecord, 'id' | 'atmId' | 'status' | 'createdAt' | 'raisedVia' | 'raisedBy'>): FailedTxnDisputeRecord => {
    const info = atmInfo(p.atmId)
    return {
      franchiseName: info.franchiseName, siteId: info.siteId, fundingModel: info.funding, machineType: 'ATM', txnType: 'Withdrawal - Card', txnId: '', utr: '', txnDate: p.createdAt.slice(0, 10), txnTime: '10:00',
      customerName: '', customerMobile: '', accountNo: '', bankName: '', ifscCode: '', cardDetails: '', branch: '', rrn: '', amount: 0, remarks: '', recipient: BANK_RECIPIENTS[0],
      trail: TR(p.raisedBy, p.createdAt), emailRefs: [], responses: [], followUps: [], history: [H(p.createdAt, p.raisedBy, `Dispute raised via ${p.raisedVia} — ID ${p.id} generated`)],
      ...p,
    }
  }
  return [
    base({
      id: 'FTD-2026-1042', raisedVia: 'Franchise Mobile', raisedBy: 'Franchise: Om Sai Enterprises', atmId: ATM_A, status: 'Pending Verification', createdAt: '2026-11-24T20:10:00+05:30',
      txnType: 'Withdrawal - UPI', txnId: 'TXN98421034', utr: 'UTR9021481029', txnDate: '2026-11-24', txnTime: '20:00', customerName: 'Rahul Deshmukh', customerMobile: '98220 11234', accountNo: 'XXXX-XXXX-4512', bankName: 'State Bank of India', ifscCode: 'SBIN0001423', cardDetails: 'UPI', branch: 'Shivaji Nagar, Pune', rrn: '428910248102', amount: 5000, txnSlipName: 'slip_98421034.pdf', remarks: 'Cash not dispensed, amount debited via UPI.',
    }),
    base({
      id: 'FTD-2026-1038', raisedVia: 'CRM Web', raisedBy: 'Sunil Yadav', atmId: ATM_B, status: 'Pending Approval', createdAt: '2026-11-22T14:30:00+05:30',
      txnId: 'TXN98421455', txnDate: '2026-11-22', txnTime: '14:30', customerName: 'Priya Sundaram', customerMobile: '99001 22334', accountNo: 'XXXX-XXXX-7823', bankName: 'HDFC Bank', ifscCode: 'HDFC0000240', cardDetails: 'Card **** 3341', branch: 'Koramangala', rrn: '428910398210', amount: 2500, remarks: 'ATM timed out during dispense cycle.', recipient: BANK_RECIPIENTS[1],
      trail: TR('Sunil Yadav', '2026-11-22T14:30:00+05:30', { verifiedBy: 'Kiran Rao', verifiedAt: '2026-11-22T17:00:00+05:30' }),
      history: [H('2026-11-22T14:30:00+05:30', 'Sunil Yadav', 'Dispute raised via CRM Web — ID FTD-2026-1038 generated'), H('2026-11-22T17:00:00+05:30', 'Kiran Rao', 'CRM verified & submitted for Admin approval')],
    }),
    base({
      id: 'FTD-2026-1031', raisedVia: 'CRM Web', raisedBy: 'Kiran Rao', atmId: ATM_C, status: 'In Progress', createdAt: '2026-11-18T11:15:00+05:30',
      txnType: 'Deposit - UPI', txnId: 'TXN98422310', utr: 'UTR9021482390', txnDate: '2026-11-18', txnTime: '11:15', customerName: 'Karthik Raja', customerMobile: '94440 55667', accountNo: 'XXXX-XXXX-9901', bankName: 'ICICI Bank', ifscCode: 'ICIC0000012', cardDetails: 'UPI / GPay', branch: 'T Nagar', rrn: '428910419203', amount: 10000, remarks: 'Deposit debited from UPI, not credited.', recipient: BANK_RECIPIENTS[2],
      trail: TR('Kiran Rao', '2026-11-18T11:15:00+05:30', { verifiedBy: 'Sunil Yadav', verifiedAt: '2026-11-18T15:00:00+05:30', approvedBy: 'Meera Iyer', approvedAt: '2026-11-19T10:00:00+05:30' }),
      responses: [{ id: 'R1', at: '2026-11-21T12:00:00+05:30', by: 'Kiran Rao', from: 'Bank', text: 'ICICI acknowledged; asked for EJ log and switch report.' }],
      followUps: [{ id: 'F1', at: '2026-11-21T12:30:00+05:30', by: 'Kiran Rao', note: 'Send EJ log + switch report to ICICI', dueAt: '2026-11-23T18:00:00+05:30', owner: 'Kiran Rao', done: false }],
      history: [H('2026-11-18T11:15:00+05:30', 'Kiran Rao', 'Dispute raised via CRM Web — ID FTD-2026-1031 generated'), H('2026-11-18T15:00:00+05:30', 'Sunil Yadav', 'CRM verified & submitted for Admin approval'), H('2026-11-19T10:00:00+05:30', 'Meera Iyer', 'Admin approved — email sent to ICICI Bank – Chargeback Desk'), H('2026-11-21T12:00:00+05:30', 'Kiran Rao', 'Bank response recorded')],
    }),
    base({
      id: 'FTD-2026-1019', raisedVia: 'Franchise Mobile', raisedBy: 'Franchise: Guruprit Singh Enterprises', atmId: ATM_C, status: 'Closed', createdAt: '2026-11-05T18:45:00+05:30',
      txnId: 'TXN98423980', txnDate: '2026-11-05', txnTime: '18:45', customerName: 'Amit Verma', accountNo: 'XXXX-XXXX-1144', bankName: 'Punjab National Bank', cardDetails: 'Card **** 6612', rrn: '428910550192', amount: 2000, remarks: 'Partial dispense.',
      trail: TR('Franchise: Guruprit Singh Enterprises', '2026-11-05T18:45:00+05:30', { verifiedBy: 'Kiran Rao', verifiedAt: '2026-11-06T10:00:00+05:30', approvedBy: 'Meera Iyer', approvedAt: '2026-11-06T12:00:00+05:30' }),
      responses: [{ id: 'R1', at: '2026-11-09T11:00:00+05:30', by: 'Kiran Rao', from: 'Bank', text: 'Reversal of ₹2,000 processed to customer account.' }],
      resolution: { outcome: 'Amount reversed to customer', note: 'Reversal ref RVSL-55120', at: '2026-11-10T10:00:00+05:30', by: 'Kiran Rao' },
      history: [H('2026-11-05T18:45:00+05:30', 'Franchise: Guruprit Singh Enterprises', 'Dispute raised via Franchise Mobile — ID generated'), H('2026-11-06T10:00:00+05:30', 'Kiran Rao', 'CRM verified & submitted'), H('2026-11-06T12:00:00+05:30', 'Meera Iyer', 'Admin approved — email sent'), H('2026-11-10T10:00:00+05:30', 'Kiran Rao', 'Resolved: Amount reversed to customer'), H('2026-11-10T12:00:00+05:30', 'Kiran Rao', 'Closed')],
    }),
    base({
      id: 'FTD-2026-1044', raisedVia: 'CRM Web', raisedBy: 'Kiran Rao', atmId: ATM_D, status: 'Returned for Correction', createdAt: '2026-11-25T10:20:00+05:30',
      txnDate: '2026-11-25', txnTime: '09:50', customerName: 'Sneha Patil', bankName: 'Axis Bank', cardDetails: 'Card **** 9910', rrn: '42891', amount: 3000, remarks: 'Cash not dispensed.', recipient: BANK_RECIPIENTS[3],
      trail: TR('Kiran Rao', '2026-11-25T10:20:00+05:30', { returnedBy: 'Sunil Yadav', returnReason: 'RRN must be 12 digits — check the switch report' }),
      history: [H('2026-11-25T10:20:00+05:30', 'Kiran Rao', 'Dispute raised via CRM Web — ID generated'), H('2026-11-25T12:00:00+05:30', 'Sunil Yadav', 'Returned for correction: RRN must be 12 digits — check the switch report')],
    }),
  ]
}

export const disputeStore = createStore<FailedTxnDisputeRecord[]>('dexter.ftd.v4', seed)
export const useFailedTxnDisputes = () => disputeStore.use()

type Result = { ok: true; id: string } | { ok: false; error: string }
export const FTD_EDITABLE: FtdStatus[] = ['Draft', 'Returned for Correction', 'Pending Verification']
const vars = (r: FailedTxnDisputeRecord) => ({ Site_ID: r.siteId, ATM_ID: r.atmId, Franchise_Name: r.franchiseName, Current_Status: r.status })
const patch = (id: string, fn: (r: FailedTxnDisputeRecord) => FailedTxnDisputeRecord) => disputeStore.set((p) => p.map((r) => (r.id === id ? fn(r) : r)))
const get = (id: string) => disputeStore.get().find((r) => r.id === id)
export const isOwnFtd = (r: FailedTxnDisputeRecord, who = actorName()) => [r.trail.createdBy, r.trail.submittedBy].includes(who)

export type FtdInput = Pick<FailedTxnDisputeRecord,
  'raisedVia' | 'atmId' | 'machineType' | 'txnType' | 'txnId' | 'utr' | 'txnDate' | 'txnTime' | 'customerName' | 'customerMobile' | 'accountNo' | 'bankName' | 'ifscCode' | 'cardDetails' | 'branch' | 'rrn' | 'amount' | 'txnSlipName' | 'remarks' | 'recipient'>

export function validateFtd(i: FtdInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (!i.atmId.trim()) e.atmId = 'ATM ID is required'
  else if (!resolveSite(i.atmId)) e.atmId = 'ATM / Site ID not found in the Site Master'
  if (!i.txnDate) e.txnDate = 'Transaction date is required'
  if (!/^\d{12}$/.test(i.rrn.trim())) e.rrn = 'RRN must be 12 digits'
  if (!(Number(i.amount) > 0)) e.amount = 'Amount must be greater than zero'
  if (!i.customerName.trim()) e.customerName = 'Customer name is required'
  if (!i.bankName.trim()) e.bankName = 'Bank is required'
  if (!i.remarks.trim()) e.remarks = 'Describe the failure'
  return e
}

/** Entry by CRM (web) or Franchise (mobile). System dispute ID is generated here. */
export function raiseFtd(input: FtdInput, opts: { draft?: boolean; franchiseActor?: string } = {}): Result {
  if (apiEnabled) {
    // sync callers (mobile screen) in API mode: send to the backend in the background, report failures by toast
    void raiseFtdAsync(input, opts).then((r) => (r.ok ? toast(`Dispute ${r.id} raised`) : toast(r.error, 'error')))
    return { ok: true, id: 'pending' }
  }
  if (!opts.draft) {
    const e = validateFtd(input)
    if (Object.keys(e).length) return { ok: false, error: Object.values(e)[0] }
  } else if (!input.atmId.trim()) return { ok: false, error: 'ATM ID is required even for a draft' }
  else if (!resolveSite(input.atmId)) return { ok: false, error: `ATM / Site "${input.atmId.trim()}" was not found in the Site Master` }
  const list = disputeStore.get()
  const n = list.map((r) => Number(r.id.match(/(\d+)$/)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 1000) + 1
  const id = `FTD-${new Date().getFullYear()}-${n}`
  const info = atmInfo(input.atmId)
  const by = opts.franchiseActor ? `Franchise: ${opts.franchiseActor}` : actorName()
  const trail: AuditTrail = { ...newTrail(), createdBy: by, ...(opts.draft ? {} : { submittedBy: by, submittedAt: nowIso() }) }
  if (input.txnSlipName) trail.documents.push({ at: nowIso(), by, name: input.txnSlipName, action: 'Uploaded' })
  const rec: FailedTxnDisputeRecord = {
    ...input, amount: Number(input.amount), txnDate: normaliseDate(input.txnDate) || input.txnDate, id, raisedBy: by, siteId: info.siteId, fundingModel: info.funding, franchiseName: opts.franchiseActor ?? info.franchiseName,
    status: opts.draft ? 'Draft' : 'Pending Verification', trail, emailRefs: [], responses: [], followUps: [], createdAt: nowIso(),
    history: [{ at: nowIso(), by, text: `Dispute ${opts.draft ? 'saved as draft' : 'raised'} via ${input.raisedVia} — ID ${id} generated` }],
  }
  disputeStore.set((p) => [rec, ...p])
  logAudit('Reconciliation', id, 'Failed txn dispute raised', `${input.raisedVia} · ${input.atmId} · ₹${input.amount}`)
  if (!opts.draft) emitWorkflow({ module: 'Reconciliation', event: 'Submit', refId: id, vars: vars(rec), nextAction: { title: `Verify failed txn dispute ${id} (${input.atmId})`, ownerId: 'EMP-005' } })
  return { ok: true, id }
}

const show = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** Edit before Admin approval — logs old / new / reason per field (§18). */
export function editFtd(id: string, next: Partial<FtdInput>, reason: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (!FTD_EDITABLE.includes(r.status)) return { ok: false, error: `Record is ${r.status} — editing is locked.` }
  if (!reason.trim()) return { ok: false, error: 'Modification reason is mandatory' }
  const keys = (Object.keys(next) as (keyof FtdInput)[]).filter((k) => show(next[k]) !== show(r[k]))
  if (!keys.length) return { ok: false, error: 'Nothing changed' }
  if (keys.includes('atmId') && next.atmId && !resolveSite(next.atmId)) return { ok: false, error: `ATM / Site "${next.atmId}" was not found in the Site Master` }
  const by = actorName()
  const mods = keys.map((k) => ({ at: nowIso(), by, field: String(k), oldValue: show(r[k]), newValue: show(next[k]), reason }))
  const info = keys.includes('atmId') && next.atmId ? atmInfo(next.atmId) : undefined
  patch(id, (x) => ({
    ...x, ...next, amount: Number(next.amount ?? x.amount), ...(info ? { siteId: info.siteId, fundingModel: info.funding, franchiseName: x.raisedVia === 'Franchise Mobile' ? x.franchiseName : info.franchiseName } : {}),
    trail: { ...x.trail, modifications: [...x.trail.modifications, ...mods] }, history: [...x.history, { at: nowIso(), by, text: `Modified ${keys.join(', ')} — ${reason}` }],
  }))
  return { ok: true, id }
}

/** Draft / returned record → (re)submit for CRM verification. */
export function submitFtd(id: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (r.status !== 'Draft' && r.status !== 'Returned for Correction') return { ok: false, error: `Cannot submit a ${r.status} dispute` }
  const e = validateFtd(r)
  if (Object.keys(e).length) return { ok: false, error: Object.values(e)[0] }
  const by = actorName()
  patch(id, (x) => ({ ...x, status: 'Pending Verification', trail: { ...x.trail, submittedBy: by, submittedAt: nowIso() }, history: [...x.history, { at: nowIso(), by, text: 'Submitted for CRM verification' }] }))
  emitWorkflow({ module: 'Reconciliation', event: 'Submit', refId: id, vars: { ...vars(r), Current_Status: 'Pending Verification' }, nextAction: { title: `Verify failed txn dispute ${id}`, ownerId: 'EMP-005' } })
  return { ok: true, id }
}

/** CRM Executive verification & submission (maker-checker: never by the person who raised it). */
export function verifyFtd(id: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (r.status !== 'Pending Verification') return { ok: false, error: `Cannot verify a ${r.status} dispute` }
  if (isOwnFtd(r)) return { ok: false, error: 'Maker-checker: you raised / submitted this dispute and cannot verify it.' }
  const e = validateFtd(r)
  if (Object.keys(e).length) return { ok: false, error: `Fix before verifying: ${Object.values(e)[0]}` }
  const by = actorName()
  patch(id, (x) => ({ ...x, status: 'Pending Approval', trail: { ...x.trail, verifiedBy: by, verifiedAt: nowIso() }, history: [...x.history, { at: nowIso(), by, text: 'CRM verified & submitted for Admin approval' }] }))
  emitWorkflow({ module: 'Reconciliation', event: 'Verify', refId: id, vars: { ...vars(r), Current_Status: 'Pending Approval' }, nextAction: { title: `Approve failed txn dispute ${id}`, ownerId: 'EMP-002' } })
  return { ok: true, id }
}

export function returnFtd(id: string, reason: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (!reason.trim()) return { ok: false, error: 'Return reason is mandatory' }
  if (r.status !== 'Pending Verification' && r.status !== 'Pending Approval') return { ok: false, error: `Cannot return a ${r.status} dispute` }
  if (isOwnFtd(r)) return { ok: false, error: 'Maker-checker: you cannot return your own dispute.' }
  const by = actorName()
  patch(id, (x) => ({ ...x, status: 'Returned for Correction', trail: { ...x.trail, returnedBy: by, returnReason: reason }, history: [...x.history, { at: nowIso(), by, text: `Returned for correction: ${reason}` }] }))
  emitWorkflow({ module: 'Reconciliation', event: 'Return', refId: id, vars: { ...vars(r), Current_Status: 'Returned for Correction' }, nextAction: { title: `Correct failed txn dispute ${id}`, ownerId: 'EMP-005' } })
  return { ok: true, id }
}

/** Admin approval → email template trigger to the bank / recipient. */
export function approveFtd(id: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (r.status !== 'Pending Approval') return { ok: false, error: `Cannot approve a ${r.status} dispute` }
  const by = actorName()
  if (isOwnFtd(r, by) || r.trail.verifiedBy === by) return { ok: false, error: 'Maker-checker: the maker / verifier cannot approve this dispute.' }
  emitWorkflow({ module: 'Reconciliation', event: 'Approve', refId: id, vars: { ...vars(r), Current_Status: 'Approved — sent to bank' }, nextAction: { title: `Await ${r.recipient.name} response — ${id}`, ownerId: 'EMP-005', dueHours: 72 } })
  // the email just logged by the engine is the dispute mail; keep its reference on the record
  const mail = wfStore.get().emails.find((m) => m.refId === id && m.event === 'Approve')
  patch(id, (x) => ({
    ...x, status: 'In Progress', trail: { ...x.trail, approvedBy: by, approvedAt: nowIso() }, emailRefs: mail ? [...x.emailRefs, mail.id] : x.emailRefs,
    history: [...x.history, { at: nowIso(), by, text: 'Admin approved' }, { at: nowIso(), by: 'System', text: `Email template ${mail?.templateCode ?? 'DISPUTE_APPROVE'} triggered — dispute sent to ${r.recipient.name} <${r.recipient.email}>` }],
  }))
  return { ok: true, id }
}

export function rejectFtd(id: string, reason: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (!reason.trim()) return { ok: false, error: 'Rejection reason is mandatory' }
  const by = actorName()
  if (isOwnFtd(r, by)) return { ok: false, error: 'Maker-checker: you cannot reject your own dispute.' }
  patch(id, (x) => ({ ...x, status: 'Rejected', trail: { ...x.trail, returnedBy: by, returnReason: reason }, history: [...x.history, { at: nowIso(), by, text: `Rejected: ${reason}` }] }))
  emitWorkflow({ module: 'Reconciliation', event: 'Reject', refId: id, vars: { ...vars(r), Current_Status: 'Rejected' } })
  return { ok: true, id }
}

export function addFtdResponse(id: string, from: ResponseFrom, text: string, attachment?: string): Result {
  if (!text.trim()) return { ok: false, error: 'Response text is required' }
  const by = actorName()
  patch(id, (x) => ({
    ...x, responses: [...x.responses, { id: `R${x.responses.length + 1}`, at: nowIso(), by, from, text, attachment }], history: [...x.history, { at: nowIso(), by, text: `${from} response recorded` }],
    trail: attachment ? { ...x.trail, documents: [...x.trail.documents, { at: nowIso(), by, name: attachment, action: 'Uploaded' }] } : x.trail,
  }))
  return { ok: true, id }
}

/** Follow-up → a task in Task & Notification Management (workflow engine). */
export function addFtdFollowUp(id: string, note: string, dueAt: string, ownerId: string, ownerName: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (!note.trim() || !dueAt) return { ok: false, error: 'Follow-up note and due date are required' }
  const hours = Math.max(1, Math.round((new Date(dueAt).getTime() - Date.now()) / 3600_000))
  const task = emitWorkflow({ module: 'Reconciliation', event: 'Assign', refId: id, vars: vars(r), nextAction: { title: `Follow-up ${id}: ${note}`, ownerId, dueHours: hours, priority: 'High' } })
  const by = actorName()
  patch(id, (x) => ({
    ...x, followUps: [...x.followUps, { id: `F${x.followUps.length + 1}`, at: nowIso(), by, note, dueAt: new Date(dueAt).toISOString(), owner: ownerName, taskId: task?.id, done: false }],
    trail: task ? { ...x.trail, taskRefs: [...x.trail.taskRefs, task.id] } : x.trail, history: [...x.history, { at: nowIso(), by, text: `Follow-up task ${task?.id ?? ''} → ${ownerName}: ${note}` }],
  }))
  return { ok: true, id }
}

export function completeFtdFollowUp(id: string, fid: string) {
  const by = actorName()
  const f = get(id)?.followUps.find((x) => x.id === fid)
  if (f?.taskId) wfStore.set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === f.taskId ? { ...t, status: 'Completed' as const, completedAt: nowIso(), history: [...t.history, { at: nowIso(), by, text: 'Follow-up done' }] } : t)) }))
  patch(id, (x) => ({ ...x, followUps: x.followUps.map((y) => (y.id === fid ? { ...y, done: true, doneAt: nowIso() } : y)), history: [...x.history, { at: nowIso(), by, text: `Follow-up ${fid} completed` }] }))
}

export function resolveFtd(id: string, outcome: string, note: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (r.status !== 'In Progress' && r.status !== 'Approved') return { ok: false, error: 'Only an approved / in-progress dispute can be resolved' }
  if (!outcome) return { ok: false, error: 'Select the resolution outcome' }
  const by = actorName()
  patch(id, (x) => ({ ...x, status: 'Resolved', resolution: { outcome, note, at: nowIso(), by }, history: [...x.history, { at: nowIso(), by, text: `Resolved: ${outcome}${note ? ` — ${note}` : ''}` }] }))
  return { ok: true, id }
}

export function closeFtd(id: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (r.status !== 'Resolved' && r.status !== 'Rejected') return { ok: false, error: 'Resolve the dispute before closing it' }
  const by = actorName()
  patch(id, (x) => ({ ...x, status: 'Closed', history: [...x.history, { at: nowIso(), by, text: 'Closed' }] }))
  emitWorkflow({ module: 'Reconciliation', event: 'Close', refId: id, vars: { ...vars(r), Current_Status: 'Closed' } })
  return { ok: true, id }
}

/** Index of the current §11.1 process-flow step (for the stepper). */
export function ftdStep(r: FailedTxnDisputeRecord): number {
  if (r.status === 'Closed' || r.status === 'Resolved' || r.status === 'Rejected') return 7
  if (r.followUps.length) return 6
  if (r.responses.length) return 5
  if (r.status === 'Sent to Bank') return 5
  if (r.status === 'In Progress' || r.status === 'Approved') return 4
  if (r.status === 'Pending Approval' || r.status === 'Verified' || r.status === 'Processed') return 3
  if (r.status === 'Pending Verification' || r.status === 'Returned for Correction') return 2
  return 0
}

export function exportDisputesToCsv(records: FailedTxnDisputeRecord[], filename = 'failed-txn-disputes') {
  downloadCsv(
    filename,
    ['Dispute ID', 'Raised via', 'Raised by', 'ATM ID', 'Site ID', 'Funding', 'Franchise', 'Txn type', 'Txn ID', 'UTR', 'Txn date', 'Txn time', 'RRN', 'Amount', 'Customer', 'Bank', 'Recipient', 'Status', 'Verified by', 'Approved by', 'Resolution', 'Remarks'],
    records.map((r) => [r.id, r.raisedVia, r.raisedBy, r.atmId, r.siteId, r.fundingModel, r.franchiseName, r.txnType, r.txnId, r.utr, r.txnDate, r.txnTime, r.rrn, String(r.amount), r.customerName, r.bankName, r.recipient.name, r.status, r.trail.verifiedBy ?? '', r.trail.approvedBy ?? '', r.resolution?.outcome ?? '', r.remarks]),
  )
}

// ── Backend API (VITE_API_URL set) ─────────────────────────────────────────
// The store above stays the page-facing state; in API mode it is hydrated from /disputes/failed-txns and every
// mutation goes to the backend, then the returned record replaces the local one. Mock functions above are unchanged.
type ApiFtd = {
  disputeId: string; raisedVia: RaisedVia; frId: string; franchiseName: string; atmId: string; siteId: string; funding: FundingModel; machineType: string
  txnType: string; txnId: string; utr: string; txnDate: string; txnTime: string; customerName: string; customerMobile: string; accountNo: string; bankName: string
  ifscCode: string; cardDetails: string; branch: string; rrn: string; amountPaise: number; slip?: { fileId: string; name: string; at: string; by: string }; remarks: string
  recipient?: { name: string; email: string }; status: FtdStatus; cashSource?: FailedTxnDisputeRecord['cashSource']
  trail?: { createdBy?: string; createdByName?: string; submittedBy?: string; verifiedBy?: string; verifiedByName?: string; processedBy?: string; processedByName?: string; processNote?: string; approvedBy?: string; approvedByName?: string; approvedAt?: string; sentBy?: string; sentAt?: string; returnedBy?: string; returnReason?: string }
  emails?: { at: string; to: string[]; subject: string; ok: boolean }[]
  responses?: { id: string; at: string; by: string; from: ResponseFrom; text: string; attachment?: { name: string } }[]
  resolution?: { outcome: string; note: string; at: string; by: string }
  version?: number
  versions?: { version: number; at: string; by: string; reason: string; changes?: { field: string; from: unknown; to: unknown }[] }[]
  history?: FtdHistory[]
  createdAt: string
}

/** Backend dispute → page record (paise → rupees, user ids → names). */
export function ftdFromApi(d: ApiFtd): FailedTxnDisputeRecord {
  const t = d.trail ?? {}
  const createdByName = t.createdByName ?? t.createdBy ?? ''
  const submittedByName = t.submittedBy ? (t.submittedBy === t.createdBy ? createdByName : t.submittedBy) : undefined
  return {
    id: d.disputeId, raisedVia: d.raisedVia, raisedBy: d.raisedVia === 'Franchise Mobile' ? `Franchise: ${d.franchiseName}` : createdByName, franchiseName: d.franchiseName,
    atmId: d.atmId, siteId: d.siteId, fundingModel: d.funding, machineType: d.machineType ?? '', txnType: d.txnType ?? '', txnId: d.txnId ?? '', utr: d.utr ?? '',
    txnDate: d.txnDate ?? '', txnTime: d.txnTime ?? '', customerName: d.customerName ?? '', customerMobile: d.customerMobile ?? '', accountNo: d.accountNo ?? '',
    bankName: d.bankName ?? '', ifscCode: d.ifscCode ?? '', cardDetails: d.cardDetails ?? '', branch: d.branch ?? '', rrn: d.rrn ?? '', amount: fromPaise(d.amountPaise),
    txnSlipName: d.slip?.name, remarks: d.remarks ?? '', recipient: { name: d.recipient?.name ?? '', email: d.recipient?.email ?? '' }, status: d.status,
    trail: {
      createdBy: createdByName, createdAt: d.createdAt, submittedBy: submittedByName, verifiedBy: t.verifiedByName ?? t.verifiedBy, approvedBy: t.approvedByName ?? t.approvedBy, approvedAt: t.approvedAt,
      returnedBy: t.returnedBy, returnReason: t.returnReason, taskRefs: [],
      modifications: (d.versions ?? []).flatMap((v) => (v.changes ?? []).map((c) => ({ at: v.at, by: v.by, field: c.field, oldValue: String(c.from ?? ''), newValue: String(c.to ?? ''), reason: v.reason }))),
      documents: d.slip ? [{ at: d.slip.at, by: d.slip.by, name: d.slip.name, action: 'Uploaded' as const }] : [],
    },
    emailRefs: [],
    emailsSent: d.emails ?? [],
    responses: (d.responses ?? []).map((x) => ({ id: x.id, at: x.at, by: x.by, from: x.from, text: x.text, attachment: x.attachment?.name })),
    followUps: [],
    resolution: d.resolution,
    history: d.history ?? [],
    createdAt: d.createdAt,
    cashSource: d.cashSource ?? null,
    processed: t.processedBy ? { by: t.processedByName ?? t.processedBy, note: t.processNote ?? '' } : undefined,
    version: d.version,
  }
}

const upsert = (rec: FailedTxnDisputeRecord) => disputeStore.set((p) => (p.some((r) => r.id === rec.id) ? p.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...p]))

/** Hydrates `disputeStore` from the backend (no-op in mock mode). */
export const ftdLoader = createLoader('failed transaction disputes', async () => {
  const items = await fetchAll<ApiFtd>('/disputes/failed-txns')
  disputeStore.set(items.map(ftdFromApi))
})
export const useFtdLoad = () => ftdLoader.use()

/** Re-fetch one dispute (detail page). */
export async function refreshFtd(id: string) {
  if (!apiEnabled) return
  upsert(ftdFromApi(await httpGet<ApiFtd>(`/disputes/failed-txns/${encodeURIComponent(id)}`)))
}

async function act(fn: () => Promise<ApiFtd>): Promise<Result> {
  try {
    const rec = ftdFromApi(await fn())
    upsert(rec)
    return { ok: true, id: rec.id }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}
const P = (id: string, action = '') => `/disputes/failed-txns/${encodeURIComponent(id)}${action ? `/${action}` : ''}`
const FTD_BODY_KEYS = ['txnType', 'txnId', 'utr', 'txnDate', 'txnTime', 'customerName', 'customerMobile', 'accountNo', 'bankName', 'ifscCode', 'cardDetails', 'branch', 'rrn', 'remarks'] as const
function bodyOf(i: Partial<FtdInput>) {
  const b: Record<string, unknown> = {}
  for (const k of FTD_BODY_KEYS) if (i[k] !== undefined) b[k] = k === 'txnDate' ? normaliseDate(String(i[k])) || i[k] : k === 'rrn' ? String(i[k]).trim() : i[k]
  if (i.amount !== undefined) b.amountPaise = toPaise(Number(i.amount))
  if (i.recipient) b.recipient = i.recipient
  return b
}

/** API-aware raise (CRM web / franchise). `slipFileId` comes from `uploadFile`. */
export async function raiseFtdAsync(input: FtdInput, opts: { draft?: boolean; franchiseActor?: string; slipFileId?: string } = {}): Promise<Result> {
  if (!apiEnabled) return raiseFtd(input, opts)
  if (!input.atmId.trim()) return { ok: false, error: 'ATM ID is required' }
  if (!opts.draft) {
    // Site Master lookup is the backend's job in API mode — skip the local atmId check
    const e = validateFtd(input)
    delete e.atmId
    if (Object.keys(e).length) return { ok: false, error: Object.values(e)[0] }
  }
  return act(() => httpPost<ApiFtd>('/disputes/failed-txns', { ...bodyOf(input), atmId: input.atmId.trim().toUpperCase(), draft: !!opts.draft, ...(opts.slipFileId ? { slipFileId: opts.slipFileId } : {}) }))
}
/**
 * PATCH /disputes/failed-txns/:id (Draft / Returned for Correction only — `LOCKED` otherwise; reason mandatory).
 * Besides the transaction fields it may change the ATM (site / franchise / funding / machine type follow; a franchise
 * only its own sites), the machine type and the slip (`slipFileId` from POST /files). The server keeps a field diff.
 */
export async function editFtdAsync(id: string, next: Partial<FtdInput>, reason: string, opts: { slipFileId?: string } = {}): Promise<Result> {
  if (!apiEnabled) return editFtd(id, next, reason)
  if (reason.trim().length < 3) return { ok: false, error: 'Modification reason is mandatory (min 3 characters)' }
  const cur = get(id)
  const b = bodyOf(next)
  if (cur) {
    const was = bodyOf(cur)
    for (const k of Object.keys(b)) if (JSON.stringify(b[k]) === JSON.stringify(was[k])) delete b[k]
  }
  const atm = next.atmId?.trim().toUpperCase()
  if (atm && atm !== cur?.atmId) b.atmId = atm
  if (next.machineType && next.machineType !== cur?.machineType) b.machineType = next.machineType
  if (opts.slipFileId) b.slipFileId = opts.slipFileId
  if (!Object.keys(b).length) return { ok: false, error: 'Nothing changed' }
  return act(() => httpPatch<ApiFtd>(P(id), { ...b, reason: reason.trim() }))
}
export const submitFtdAsync = (id: string): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'submit'))) : Promise.resolve(submitFtd(id)))
export const verifyFtdAsync = (id: string, note = ''): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'verify'), { note })) : Promise.resolve(verifyFtd(id)))
export const returnFtdAsync = (id: string, reason: string): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'return'), { reason })) : Promise.resolve(returnFtd(id, reason)))
/** API only — Operations processing after CRM verification. */
export const processFtdAsync = (id: string, note: string): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'process'), { note })) : Promise.resolve({ ok: false, error: 'Processing is a backend step' }))
export const approveFtdAsync = (id: string): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'approve'))) : Promise.resolve(approveFtd(id)))
export const rejectFtdAsync = (id: string, reason: string): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'reject'), { reason })) : Promise.resolve(rejectFtd(id, reason)))
/** API only — email the approved dispute to the bank / NPCI recipient. */
export const sendFtdToBankAsync = (id: string, recipient?: { name: string; email: string }): Promise<Result> =>
  apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'send-to-bank'), recipient?.email ? { recipient } : {})) : Promise.resolve({ ok: false, error: 'Sending is a backend step' })
export const addFtdResponseAsync = (id: string, from: ResponseFrom, text: string, attachment?: { name: string; fileId?: string }): Promise<Result> =>
  apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'responses'), { from, text, ...(attachment?.fileId ? { fileId: attachment.fileId } : {}) })) : Promise.resolve(addFtdResponse(id, from, text, attachment?.name))
export const resolveFtdAsync = (id: string, outcome: string, note: string): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'resolve'), { outcome, note })) : Promise.resolve(resolveFtd(id, outcome, note)))
export const closeFtdAsync = (id: string): Promise<Result> => (apiEnabled ? act(() => httpPost<ApiFtd>(P(id, 'close'))) : Promise.resolve(closeFtd(id)))
