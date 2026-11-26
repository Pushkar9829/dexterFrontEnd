// Additional Loading Fund (ALF) Master — Operations §4. Separate store; linked to Cash Loading Master records
// (Self Funding). Workflow: Request → CRM / Ops verification → Submit for Email → Fund disbursement record
// (Admin approval) → Cash Loading mapping → Recovery / Adjustment → Recovered → Closed.
import { createStore } from '@/lib/store'
import { emitWorkflow, logAudit, newTrail, isOwnRecord, actorName, nowIso, wfStore, type AuditTrail } from '@/data/workflow'
import { checkSiteFor, franchiseUser, type SiteSnapshot } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { siteStore } from '@/data/network'
import { rng } from '@/data/cbrSites'
import { apiEnabled, createLoader } from '@/data/opsApi'
import { alfApi } from '@/data/alfApi'

export type AlfStatus = 'Draft' | 'Submitted' | 'Verified' | 'Approved' | 'Recovered' | 'Closed' | 'Rejected'
export const ALF_STATUSES: AlfStatus[] = ['Draft', 'Submitted', 'Verified', 'Approved', 'Recovered', 'Closed', 'Rejected']
export const ALF_PURPOSES = ['High weekend / festival demand', 'Delayed settlement credit', 'Cash-out risk (low cassette balance)', 'Salary-day demand', 'Bank holiday buffer', 'Other']

export type AlfRecovery = { id: string; date: string; amount: number; mode: 'Recovery' | 'Adjustment'; clRef?: string; remarks: string; by: string; at: string }
export type AlfRecord = SiteSnapshot & {
  id: string
  requestDate: string
  requestedAmount: number
  purpose: string
  remarks: string
  approvedAmount?: number
  disbursementDate?: string
  disbursementRef?: string
  expectedRecoveryDate?: string
  actualRecoveryDate?: string
  clRefs: string[]
  recoveries: AlfRecovery[]
  status: AlfStatus
  emailSubmittedAt?: string
  emailRef?: string
  closedBy?: string
  closedAt?: string
  rejectReason?: string
  trail: AuditTrail
  statusLog: { at: string; by: string; status: AlfStatus; note?: string }[]
}
export type AlfResult = { ok: true; id: string } | { ok: false; error: string }

export const recoveredOf = (r: AlfRecord) => r.recoveries.reduce((s, x) => s + x.amount, 0)
export const outstandingOf = (r: AlfRecord) => (r.approvedAmount == null ? 0 : Math.max(0, r.approvedAmount - recoveredOf(r)))
export const overdueDays = (r: AlfRecord, today = new Date().toISOString().slice(0, 10)) =>
  r.status === 'Approved' && r.expectedRecoveryDate && r.expectedRecoveryDate < today && outstandingOf(r) > 0 ? Math.round((Date.parse(today) - Date.parse(r.expectedRecoveryDate)) / 86400_000) : 0

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function seed(): AlfRecord[] {
  const r = rng(4711)
  const sites = siteStore.get().sites.filter((s) => s.siteType === 'SF').slice(0, 8)
  const plan: AlfStatus[] = ['Approved', 'Approved', 'Recovered', 'Closed', 'Verified', 'Submitted', 'Draft', 'Approved', 'Rejected', 'Submitted']
  const out: AlfRecord[] = []
  plan.forEach((status, i) => {
    const site = sites[i % Math.max(1, sites.length)]
    if (!site) return
    const chk = checkSiteFor('Cash Loading', site.atmId)
    if (!chk.ok) return
    const snap = chk.snap
    const fu = franchiseUser(snap.franchiseName)
    const req = addDays('2026-11-20', -i * 3)
    const at = (d: string, h: number) => `${d}T${String(h).padStart(2, '0')}:15:00.000Z`
    const requested = Math.round(1 + r() * 4) * 100000
    const rec: AlfRecord = {
      ...snap,
      id: `ALF-2026-${String(101 + i).padStart(4, '0')}`,
      requestDate: req,
      requestedAmount: requested,
      purpose: ALF_PURPOSES[i % ALF_PURPOSES.length],
      remarks: '',
      clRefs: [],
      recoveries: [],
      status,
      trail: { createdBy: fu, createdAt: at(req, 9), modifications: [], documents: [], taskRefs: [] },
      statusLog: [{ at: at(req, 9), by: fu, status: 'Draft' }],
    }
    if (status !== 'Draft') {
      rec.trail.submittedBy = fu
      rec.trail.submittedAt = at(req, 10)
      rec.statusLog.push({ at: at(req, 10), by: fu, status: 'Submitted' })
    }
    if (['Verified', 'Approved', 'Recovered', 'Closed', 'Rejected'].includes(status)) {
      rec.trail.verifiedBy = 'Sunil Yadav'
      rec.trail.verifiedAt = at(req, 12)
      rec.emailSubmittedAt = at(req, 12)
      rec.statusLog.push({ at: at(req, 12), by: 'Sunil Yadav', status: 'Verified', note: 'Submitted for email' })
    }
    if (['Approved', 'Recovered', 'Closed'].includes(status)) {
      rec.approvedAmount = requested - (i % 2 ? 50000 : 0)
      rec.disbursementDate = addDays(req, 1)
      rec.disbursementRef = `UTR${String(880000 + i * 137)}`
      rec.expectedRecoveryDate = addDays(req, 7 + (i % 3) * 7)
      rec.trail.approvedBy = 'Meera Iyer'
      rec.trail.approvedAt = at(addDays(req, 1), 11)
      rec.statusLog.push({ at: at(addDays(req, 1), 11), by: 'Meera Iyer', status: 'Approved', note: `Disbursed ₹${rec.approvedAmount.toLocaleString('en-IN')}` })
      const cl = clMaster.store.get().find((c) => c.atmId === snap.atmId && c.locked)
      if (cl) rec.clRefs = [cl.id]
    }
    if (status === 'Approved' && i === 1) {
      rec.recoveries.push({ id: `REC-${i}-1`, date: addDays(req, 5), amount: Math.round((rec.approvedAmount ?? 0) / 2), mode: 'Adjustment', clRef: rec.clRefs[0], remarks: 'Adjusted against next loading', by: 'Sunil Yadav', at: at(addDays(req, 5), 15) })
    }
    if (status === 'Recovered' || status === 'Closed') {
      rec.recoveries.push({ id: `REC-${i}-1`, date: addDays(req, 6), amount: rec.approvedAmount ?? 0, mode: 'Recovery', clRef: rec.clRefs[0], remarks: 'Recovered from settlement credit', by: 'Sunil Yadav', at: at(addDays(req, 6), 15) })
      rec.actualRecoveryDate = addDays(req, 6)
      rec.statusLog.push({ at: at(addDays(req, 6), 15), by: 'Sunil Yadav', status: 'Recovered' })
    }
    if (status === 'Closed') {
      rec.closedBy = 'Meera Iyer'
      rec.closedAt = at(addDays(req, 7), 10)
      rec.statusLog.push({ at: rec.closedAt, by: 'Meera Iyer', status: 'Closed' })
    }
    if (status === 'Rejected') {
      rec.rejectReason = 'Existing ALF still outstanding for this site.'
      rec.trail.returnedBy = 'Meera Iyer'
      rec.trail.returnReason = rec.rejectReason
      rec.statusLog.push({ at: at(addDays(req, 1), 11), by: 'Meera Iyer', status: 'Rejected', note: rec.rejectReason })
    }
    out.push(rec)
  })
  return out
}

export const alfStore = createStore<AlfRecord[]>(apiEnabled ? 'dexter.api.alf.master.v1' : 'dexter.alf.master.v1', () => (apiEnabled ? [] : seed()))
const get = (id: string) => alfStore.get().find((x) => x.id === id)
const put = (rec: AlfRecord) => alfStore.set((l) => (l.some((x) => x.id === rec.id) ? l.map((x) => (x.id === rec.id ? rec : x)) : [rec, ...l]))
// API mode: GET /alf/records (franchise: /my/alf/records); actions POST to the backend and replace the local record.
const remote = alfApi(put)
export const alfLoader = createLoader('ALF register', async () => alfStore.set(await remote.list()))
export const useAlf = () => {
  alfLoader.use()
  return alfStore.use()
}
const log = (rec: AlfRecord, status: AlfStatus, note?: string, by = actorName()): AlfRecord => ({ ...rec, statusLog: [...rec.statusLog, { at: nowIso(), by, status, note }] })
const vars = (r: AlfRecord, pending: string) => ({ Record_ID: r.id, Site_ID: r.siteId, ATM_ID: r.atmId, Franchise_Name: r.franchiseName, Current_Status: r.status, Pending_Action: pending })
const withTask = (r: AlfRecord, taskId?: string): AlfRecord => (taskId ? { ...r, trail: { ...r.trail, taskRefs: [...r.trail.taskRefs, taskId] } } : r)

export type AlfInput = { atmId: string; requestDate: string; requestedAmount: number; purpose: string; remarks: string }

/** Request (Draft) — Self Funding sites only (ALF is linked to the Cash Loading Master). */
function saveAlfLocal(input: AlfInput, opts: { id?: string; asFranchise?: boolean; submit?: boolean } = {}): AlfResult {
  const chk = checkSiteFor('Cash Loading', input.atmId)
  if (!chk.ok) return { ok: false, error: chk.error.replace('Cash Loading is only', 'ALF (linked to Cash Loading) is only') }
  if (!(input.requestedAmount > 0)) return { ok: false, error: 'Requested amount must be greater than 0.' }
  if (!input.purpose.trim()) return { ok: false, error: 'Purpose / reason is required.' }
  const prev = opts.id ? get(opts.id) : undefined
  if (prev && prev.status !== 'Draft') return { ok: false, error: `${prev.id} is ${prev.status} and cannot be edited.` }
  const maker = opts.asFranchise ? franchiseUser(chk.snap.franchiseName) : actorName()
  const nums = alfStore.get().map((x) => Number(x.id.split('-').pop()) || 0)
  let rec: AlfRecord = prev
    ? { ...prev, ...chk.snap, ...input }
    : { ...chk.snap, ...input, id: `ALF-2026-${String(Math.max(100, ...nums) + 1).padStart(4, '0')}`, clRefs: [], recoveries: [], status: 'Draft', trail: { ...newTrail(), createdBy: maker }, statusLog: [{ at: nowIso(), by: maker, status: 'Draft' }] }
  if (opts.submit) {
    rec = log({ ...rec, status: 'Submitted', trail: { ...rec.trail, submittedBy: maker, submittedAt: nowIso() } }, 'Submitted', undefined, maker)
    const task = emitWorkflow({ module: 'ALF', event: 'Submit', refId: rec.id, vars: vars(rec, 'CRM / Operations verification'), nextAction: { title: `Verify ALF ${rec.id} – ${rec.atmId}`, dueHours: 24, priority: 'High' } })
    rec = withTask(rec, task?.id)
  }
  put(rec)
  return { ok: true, id: rec.id }
}

function submitAlfLocal(id: string): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  return saveAlfLocal({ atmId: rec.atmId, requestDate: rec.requestDate, requestedAmount: rec.requestedAmount, purpose: rec.purpose, remarks: rec.remarks }, { id, submit: true, asFranchise: rec.trail.createdBy !== actorName() && rec.trail.createdBy.endsWith('(Franchise)') })
}

/** CRM / Operations verification (maker-checker). */
function verifyAlfLocal(id: string, remark?: string): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  if (rec.status !== 'Submitted') return { ok: false, error: `Only Submitted requests can be verified (now ${rec.status}).` }
  if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: you raised this ALF request, so you cannot verify it.' }
  put(log({ ...rec, status: 'Verified', trail: { ...rec.trail, verifiedBy: actorName(), verifiedAt: nowIso() } }, 'Verified', remark))
  return { ok: true, id }
}

/** "Submit for Email" — fires the ALF_VERIFY template (disbursement email) and creates the Admin task. */
function submitAlfForEmailLocal(id: string): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  if (rec.status !== 'Verified') return { ok: false, error: 'Verify the request before submitting it for email.' }
  if (rec.emailSubmittedAt) return { ok: false, error: `Already submitted for email on ${new Date(rec.emailSubmittedAt).toLocaleString('en-IN')}.` }
  const task = emitWorkflow({ module: 'ALF', event: 'Verify', refId: id, vars: vars(rec, 'Approve & record fund disbursement'), nextAction: { title: `Approve & disburse ALF ${id} – ${rec.atmId}`, ownerId: 'EMP-002', dueHours: 24, priority: 'High' } })
  const mail = wfStore.get().emails.find((e) => e.refId === id)
  put(withTask(log({ ...rec, emailSubmittedAt: nowIso(), emailRef: mail?.id }, 'Verified', `Submitted for email${mail ? ` (${mail.id} → ${mail.to.join(', ')})` : ''}`), task?.id))
  return { ok: true, id }
}

/** Admin approval + fund disbursement record. */
function approveDisburseAlfLocal(id: string, d: { approvedAmount: number; disbursementDate: string; disbursementRef: string; expectedRecoveryDate: string }): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  if (rec.status !== 'Verified' || !rec.emailSubmittedAt) return { ok: false, error: 'Only verified requests that were submitted for email can be approved.' }
  if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: you cannot approve your own ALF request.' }
  if (!(d.approvedAmount > 0)) return { ok: false, error: 'Approved amount must be greater than 0.' }
  if (d.approvedAmount > rec.requestedAmount) return { ok: false, error: 'Approved amount cannot exceed the requested amount.' }
  if (!d.disbursementDate || !d.expectedRecoveryDate) return { ok: false, error: 'Disbursement date and expected recovery date are required.' }
  if (d.expectedRecoveryDate < d.disbursementDate) return { ok: false, error: 'Expected recovery date cannot be before the disbursement date.' }
  let next: AlfRecord = { ...rec, ...d, status: 'Approved', trail: { ...rec.trail, approvedBy: actorName(), approvedAt: nowIso() } }
  next = log(next, 'Approved', `Disbursed ₹${d.approvedAmount.toLocaleString('en-IN')} on ${d.disbursementDate}${d.disbursementRef ? ` · ${d.disbursementRef}` : ''}`)
  const hours = Math.max(24, Math.round((Date.parse(d.expectedRecoveryDate) - Date.now()) / 3600_000))
  const task = emitWorkflow({ module: 'ALF', event: 'Approve', refId: id, vars: vars(next, 'Track recovery / adjustment'), nextAction: { title: `Recover / adjust ALF ${id} by ${d.expectedRecoveryDate}`, dueHours: hours } })
  put(withTask(next, task?.id))
  return { ok: true, id }
}

function rejectAlfLocal(id: string, reason: string): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  if (rec.status !== 'Submitted' && rec.status !== 'Verified') return { ok: false, error: `Cannot reject a ${rec.status} request.` }
  if (!reason.trim()) return { ok: false, error: 'A rejection reason is required.' }
  if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: you cannot reject your own request.' }
  put(log({ ...rec, status: 'Rejected', rejectReason: reason.trim(), trail: { ...rec.trail, returnedBy: actorName(), returnReason: reason.trim() } }, 'Rejected', reason.trim()))
  emitWorkflow({ module: 'ALF', event: 'Reject', refId: id, vars: vars(rec, '—') })
  return { ok: true, id }
}

/** Map Cash Loading Master record(s) of the same ATM to this ALF (§4 integration). */
function mapCashLoadingLocal(id: string, clIds: string[]): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  if (rec.status !== 'Approved' && rec.status !== 'Recovered') return { ok: false, error: 'Cash Loading mapping is available after disbursement.' }
  const bad = clIds.find((c) => clMaster.get(c)?.atmId !== rec.atmId)
  if (bad) return { ok: false, error: `${bad} is not a Cash Loading record of ATM ${rec.atmId}.` }
  const before = rec.clRefs.join(', ') || '—'
  put(log({ ...rec, clRefs: clIds }, rec.status, `Cash Loading mapping: ${clIds.join(', ') || 'none'}`))
  logAudit('ALF', id, 'Cash Loading mapping', `${before} → ${clIds.join(', ') || '—'}`)
  return { ok: true, id }
}

/** Recovery / adjustment entry; when outstanding reaches 0 the request becomes Recovered. */
function addRecoveryLocal(id: string, x: { date: string; amount: number; mode: 'Recovery' | 'Adjustment'; clRef?: string; remarks: string }): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  if (rec.status !== 'Approved') return { ok: false, error: 'Recovery can only be recorded on an approved (disbursed) ALF.' }
  if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: the requester cannot record recovery on their own ALF.' }
  const outstanding = outstandingOf(rec)
  if (!(x.amount > 0)) return { ok: false, error: 'Amount must be greater than 0.' }
  if (x.amount > outstanding) return { ok: false, error: `Amount exceeds the outstanding ₹${outstanding.toLocaleString('en-IN')}.` }
  if (!x.date) return { ok: false, error: 'Recovery / adjustment date is required.' }
  if (rec.disbursementDate && x.date < rec.disbursementDate) return { ok: false, error: 'Recovery date cannot be before the disbursement date.' }
  let next: AlfRecord = { ...rec, recoveries: [...rec.recoveries, { id: `REC-${Date.now().toString(36).toUpperCase()}`, ...x, by: actorName(), at: nowIso() }] }
  next = log(next, rec.status, `${x.mode} ₹${x.amount.toLocaleString('en-IN')} on ${x.date}${x.clRef ? ` (${x.clRef})` : ''}`)
  if (outstandingOf(next) === 0) {
    next = log({ ...next, status: 'Recovered', actualRecoveryDate: x.date }, 'Recovered', 'Outstanding fully recovered / adjusted', 'System')
    emitWorkflow({ module: 'ALF', event: 'Close', refId: id, vars: vars(next, 'Close ALF'), nextAction: { title: `Close ALF ${id} (fully recovered)`, ownerId: 'EMP-002', dueHours: 48 } })
  }
  put(next)
  return { ok: true, id }
}

function closeAlfLocal(id: string): AlfResult {
  const rec = get(id)
  if (!rec) return { ok: false, error: 'Request not found.' }
  if (rec.status !== 'Recovered') return { ok: false, error: 'Only fully recovered requests can be closed.' }
  const next = log({ ...rec, status: 'Closed', closedBy: actorName(), closedAt: nowIso() }, 'Closed')
  emitWorkflow({ module: 'ALF', event: 'Close', refId: id, vars: vars(next, '—') })
  put(next)
  return { ok: true, id }
}

// ── Public actions: backend in API mode, the local engine above in mock mode ──
export const saveAlf = async (input: AlfInput, opts: { id?: string; asFranchise?: boolean; submit?: boolean } = {}): Promise<AlfResult> => {
  if (!apiEnabled) return saveAlfLocal(input, opts)
  if (!(input.requestedAmount > 0)) return { ok: false, error: 'Requested amount must be greater than 0.' }
  if (!input.purpose.trim()) return { ok: false, error: 'Purpose / reason is required.' }
  return remote.save(input, opts)
}
export const submitAlf = async (id: string): Promise<AlfResult> => (apiEnabled ? remote.submit(id) : submitAlfLocal(id))
export const verifyAlf = async (id: string, remark?: string): Promise<AlfResult> => (apiEnabled ? remote.verify(id, remark) : verifyAlfLocal(id, remark))
export const submitAlfForEmail = async (id: string): Promise<AlfResult> => (apiEnabled ? remote.submitEmail(id) : submitAlfForEmailLocal(id))
export const approveDisburseAlf = async (id: string, d: { approvedAmount: number; disbursementDate: string; disbursementRef: string; expectedRecoveryDate: string }): Promise<AlfResult> =>
  apiEnabled ? remote.approve(id, d) : approveDisburseAlfLocal(id, d)
export const rejectAlf = async (id: string, reason: string): Promise<AlfResult> => {
  if (!reason.trim()) return { ok: false, error: 'A rejection reason is required.' }
  return apiEnabled ? remote.reject(id, reason) : rejectAlfLocal(id, reason)
}
export const mapCashLoading = async (id: string, clIds: string[]): Promise<AlfResult> => (apiEnabled ? remote.mapCashLoading(id, clIds) : mapCashLoadingLocal(id, clIds))
export const addRecovery = async (id: string, x: { date: string; amount: number; mode: 'Recovery' | 'Adjustment'; clRef?: string; remarks: string }): Promise<AlfResult> =>
  apiEnabled ? remote.addRecovery(id, x) : addRecoveryLocal(id, x)
export const closeAlf = async (id: string): Promise<AlfResult> => (apiEnabled ? remote.close(id) : closeAlfLocal(id))
