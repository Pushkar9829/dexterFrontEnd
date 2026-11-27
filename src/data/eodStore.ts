// EOD Management (Operations spec §5) — Common EOD Master for CRM machines.
// Exactly three EOD types: Routine, Cash Audit and Monthly (Monthly lives in pages/operations/eod2/monthly.ts).
// NCR & Perto (dispenser) sites have no docket / CRM request: the franchise only marks "EOD done", which lands on the
// CBR History (Full Funding) or Cash Loading History (Self Funding). The two funding ledgers never mix (§19.1).
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { siteStore, type Site } from '@/data/network'
import { getFranchise } from '@/data/franchises'
import {
  ACK_TEXT, ACK_VERSION, actorName, emitWorkflow, fundingOf, isOwnRecord, logAudit, newTrail, nowIso, wid,
  type AuditTrail, type OpsStatus, type RecordVars,
} from '@/data/workflow'
import { post } from '@/lib/api'
import { currentRole } from '@/lib/rbac'
import { apiCall, apiEnabled, createLoader, fetchAll, fromPaise, toPaise } from '@/data/opsApi'
import { uploadDoc } from '@/data/docsApi'

// ── types ────────────────────────────────────────────────────────────────
export type EodType = 'Routine' | 'Cash Audit'
export const EOD_TYPES = ['Routine EOD', 'Cash Audit EOD', 'Monthly EOD'] as const
export type EodFunding = 'Full Funding' | 'Self Funding'
export type Ledger = 'CBR History' | 'Cash Loading History'
export const ledgerOf = (f: EodFunding): Ledger => (f === 'Full Funding' ? 'CBR History' : 'Cash Loading History')

/** §5.1.3 — mandatory for CRM + Full Funding sites. */
export const EOD_CATEGORIES = ['Routine Clearance', 'Cash Jam', 'Dispute', 'Reconciliation', 'Balance Difference', 'Other'] as const
export type EodCategory = (typeof EOD_CATEGORIES)[number]

/** §5.4 — when a Cash Audit EOD is done. */
export const AUDIT_REASONS = [
  'Cash jam during cash loading',
  'Customer cash stuck during deposit',
  'Customer cash stuck during withdrawal',
  'Cash tear / damage',
  'Cash balance difference',
  'Random audit',
  'Other operational requirement / dispute',
] as const

/**
 * §5.3 points 3–4 — "the counter slip must show ₹40,000". The exact interpretation is still to be confirmed with
 * Operations, so the rule is one config object: today it is read as "counter-slip amount must be at least ₹40,000".
 */
export const COUNTER_SLIP_RULE = {
  amount: 40000,
  mode: 'minimum' as 'minimum' | 'exact',
  pendingNote: 'Exact interpretation of the ₹40,000 rule is pending confirmation (spec §5.3.3).',
}
export function checkCounterSlip(amount: number) {
  const a = Number(amount) || 0
  const passed = COUNTER_SLIP_RULE.mode === 'exact' ? a === COUNTER_SLIP_RULE.amount : a >= COUNTER_SLIP_RULE.amount
  const rule = COUNTER_SLIP_RULE.mode === 'exact' ? 'exactly ₹40,000' : 'at least ₹40,000'
  return {
    passed,
    message: passed
      ? `Counter slip shows ₹${a.toLocaleString('en-IN')} — meets the rule (${rule}).`
      : `Counter slip shows ₹${a.toLocaleString('en-IN')}; the rule needs ${rule}. The request will go to the Operations exception review instead of normal verification.`,
  }
}

export type EodStage =
  | 'Exception Review' // ₹40,000 rule failed (UAT 9)
  | 'Pending Verification'
  | 'Returned for Correction'
  | 'Docket Generated' // verified → docket emailed, OTC link issued
  | 'OTC Generated'
  | 'Vault Opened'
  | 'Cash Acknowledged' // history written, admin approval pending
  | 'Approved'
  | 'Rejected'

export const EOD_STAGES: EodStage[] = ['Exception Review', 'Pending Verification', 'Returned for Correction', 'Docket Generated', 'OTC Generated', 'Vault Opened', 'Cash Acknowledged', 'Approved', 'Rejected']

export type Ack = { text: string; version: string; lang: 'Hindi' | 'English'; at: string; by: string }

export type AuditEvent = {
  id: string
  seq: number // n-th opening on this EOD
  at: string // audit date & time (ISO)
  boltOpenedAt: string // HH:mm — mandatory
  boltClosedAt?: string
  authorizedBy: string
  countedBy: string
  expectedCash: number
  actualCash: number
  difference: number // actual − expected
  diffType: 'Overage' | 'Shortage' | 'Nil'
  docs: string[]
  remarks?: string
  recordedBy: string
  recordedAt: string
  verifiedBy?: string
  verifiedAt?: string
  approvedBy?: string
  approvedAt?: string
}

export type Otc = {
  code: string
  generatedAt: string
  generatedBy: string // franchise authorized user
  designation: string
  mobile: string
  purpose: string
  linkToken: string
}

export type EodRecord = {
  id: string
  type: EodType
  siteId: string
  atmId: string
  frId: string
  franchiseName: string
  siteType: string
  funding: EodFunding
  machineType: 'CRM'
  eodDate: string
  category?: EodCategory
  auditReason?: string
  auditReasonOther?: string
  channel: 'Mobile App' | 'Web (CRM exceptional)'
  exceptionalReason?: string // why CRM created it instead of the franchise (§5.1.1)
  counterSlip: { file: string; size: number; slipNo: string; slipDate: string; amount: number }
  declaredCash: number
  rule: { passed: boolean; message: string; checkedAt: string; reviewedBy?: string; reviewedAt?: string; decision?: 'Cleared' | 'Returned'; remark?: string }
  docket?: { no: string; at: string; by: string; emailId?: string }
  otcLinkToken?: string
  otcLinkIssuedAt?: string
  otc?: Otc
  events: AuditEvent[]
  cash?: { mode: 'Cash Replacement' | 'Cash Loading'; amount: number; remarks?: string; ack: Ack; at: string; by: string }
  historyRef?: { ledger: Ledger; entryId: string; at: string }
  stage: EodStage
  status: OpsStatus
  trail: AuditTrail
  log: { at: string; by: string; text: string }[]
  /** Controlled correction of an approved / locked record (API mode): current version + what was corrected. */
  version?: number
  corrections?: EodCorrection[]
  versions?: { version: number; at: string; by: string; reason: string }[]
}
export type EodCorrection = { version: number; at: string; by: string; field: string; label: string; oldValue: string; newValue: string; reason: string }
/** Fields an Admin may correct on a locked EOD (backend EOD_CORRECTABLE). Money values are in rupees in the UI. */
export const EOD_CORRECTABLE_FIELDS = [
  { key: 'declaredCashPaise', label: 'Declared cash (₹)', money: true },
  { key: 'slipNo', label: 'Counter slip no.' },
  { key: 'slipDate', label: 'Counter slip date', date: true },
  { key: 'slipAmountPaise', label: 'Counter slip amount (₹)', money: true },
  { key: 'cashAmountPaise', label: 'Acknowledged cash amount (₹)', money: true },
  { key: 'cashRemarks', label: 'Cash acknowledgement remarks' },
  { key: 'category', label: 'EOD category' },
  { key: 'auditReason', label: 'Cash audit reason' },
  { key: 'auditReasonOther', label: 'Audit reason (other)' },
] as const
export type EodCorrectableKey = (typeof EOD_CORRECTABLE_FIELDS)[number]['key']

export type HistoryEntry = {
  id: string
  ledger: Ledger
  siteId: string
  atmId: string
  frId: string
  machineType: string
  date: string
  source: 'CRM Routine EOD' | 'CRM Cash Audit EOD' | 'NCR / Perto EOD mark'
  refId: string
  docketNo?: string
  otc?: string
  amount?: number
  text: string
  at: string
  by: string
}

export type EodState = { records: EodRecord[]; history: HistoryEntry[] }

// ── site helpers (Site Master driven, §19) ───────────────────────────────
export const eodFundingOf = (s: Pick<Site, 'siteType'>): EodFunding | null => {
  const f = fundingOf(s.siteType)
  return f === 'Full Funding' || f === 'Self Funding' ? f : null
}
export const isCrmSite = (s: Site) => s.machineType === 'CRM'
export const isDispenserSite = (s: Site) => s.machineType === 'NCR' || s.machineType === 'Perto'
/** Sites that can raise a CRM EOD (CRM machine on a CBR / Cash Loading funding model). */
export const crmEodSites = (sites: Site[]) => sites.filter((s) => isCrmSite(s) && eodFundingOf(s))
export const dispenserEodSites = (sites: Site[]) => sites.filter((s) => isDispenserSite(s) && eodFundingOf(s))
export const categoryRequired = (s: Pick<Site, 'machineType' | 'siteType'>) => s.machineType === 'CRM' && fundingOf(s.siteType) === 'Full Funding'
export const frNameOf = (frId: string) => getFranchise(frId)?.name ?? frId
/** Display name used for franchise-side actions (maker identity for maker-checker). */
export const frUser = (frId: string) => `${frNameOf(frId)} (Franchise user)`

const vars = (r: Pick<EodRecord, 'id' | 'siteId' | 'atmId' | 'frId'>, extra: RecordVars = {}): RecordVars => ({ Record_ID: r.id, Site_ID: r.siteId, ATM_ID: r.atmId, Franchise_Name: frNameOf(r.frId), ...extra })

// ── seed ────────────────────────────────────────────────────────────────
const TODAY = '2026-11-25'
const dayIso = (offset: number) => {
  const d = new Date(`${TODAY}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
const at = (date: string, hm: string) => new Date(`${date}T${hm}:00+05:30`).toISOString()

function seed(): EodState {
  const sites = crmEodSites(siteStore.get().sites)
  const records: EodRecord[] = []
  const history: HistoryEntry[] = []
  const plan: [EodType, EodStage, number][] = [
    ['Routine', 'Pending Verification', 49000],
    ['Routine', 'Exception Review', 32000],
    ['Routine', 'Docket Generated', 52000],
    ['Cash Audit', 'Pending Verification', 61000],
    ['Routine', 'OTC Generated', 45000],
    ['Cash Audit', 'Vault Opened', 78000],
    ['Routine', 'Cash Acknowledged', 40000],
    ['Cash Audit', 'Approved', 66000],
    ['Routine', 'Approved', 48500],
    ['Routine', 'Returned for Correction', 41000],
    ['Cash Audit', 'Docket Generated', 39000],
    ['Routine', 'Pending Verification', 57000],
  ]
  let rt = 0
  let ca = 0
  plan.forEach(([type, stage, amount], i) => {
    const s = sites[(i * 7) % Math.max(1, sites.length)]
    if (!s) return
    const funding = eodFundingOf(s)!
    const date = dayIso(-(i % 9) - 1)
    const fu = frUser(s.frId)
    const id = type === 'Routine' ? `EOD-RT-${String(++rt).padStart(4, '0')}` : `EOD-CA-${String(++ca).padStart(4, '0')}`
    const rule = checkCounterSlip(amount)
    const ack: Ack = { text: ACK_TEXT.English, version: ACK_VERSION, lang: 'English', at: at(date, '21:05'), by: fu }
    const trail: AuditTrail = { ...newTrail(), createdBy: fu, createdAt: at(date, '21:05'), submittedBy: fu, submittedAt: at(date, '21:05'), acknowledgement: ack, documents: [{ at: at(date, '21:04'), by: fu, name: `counter-slip-${s.atmId}-${date}.jpg`, action: 'Uploaded' }] }
    const reached = (st: EodStage) => EOD_STAGES.indexOf(stage) >= EOD_STAGES.indexOf(st) && stage !== 'Returned for Correction' && stage !== 'Rejected'
    const reason = AUDIT_REASONS[i % AUDIT_REASONS.length]
    const rec: EodRecord = {
      id, type, siteId: s.siteId, atmId: s.atmId, frId: s.frId, franchiseName: frNameOf(s.frId), siteType: s.siteType, funding, machineType: 'CRM', eodDate: date,
      category: categoryRequired(s) ? (type === 'Cash Audit' ? 'Cash Jam' : i % 3 === 0 ? 'Reconciliation' : 'Routine Clearance') : undefined,
      auditReason: type === 'Cash Audit' ? reason : undefined,
      auditReasonOther: type === 'Cash Audit' && reason.startsWith('Other') ? 'Bank raised a dispute on 3 deposit transactions' : undefined,
      channel: 'Mobile App',
      counterSlip: { file: `counter-slip-${s.atmId}-${date}.jpg`, size: 284_000, slipNo: `CS-${s.atmId.slice(-5)}-${date.replace(/-/g, '').slice(2)}`, slipDate: date, amount },
      declaredCash: amount,
      rule: { ...rule, checkedAt: at(date, '21:05') },
      events: [],
      stage,
      status: 'Pending Verification',
      trail,
      log: [{ at: at(date, '21:05'), by: fu, text: `${type} EOD request submitted from the mobile app with counter slip` }],
    }
    if (stage === 'Exception Review') {
      rec.status = 'In Progress'
      rec.log.push({ at: at(date, '21:05'), by: 'System', text: 'Counter-slip rule failed → sent to Operations exception review' })
    }
    if (stage === 'Returned for Correction') {
      rec.status = 'Returned for Correction'
      rec.trail.returnedBy = 'Sunil Yadav'
      rec.trail.returnReason = 'Counter slip image is blurred — slip number not readable. Please re-upload.'
      rec.log.push({ at: at(date, '22:10'), by: 'Sunil Yadav', text: 'Returned for correction: counter slip not readable' })
    }
    if (reached('Docket Generated')) {
      const dk = `DKT/${date.replace(/-/g, '')}/${String(1100 + i)}`
      rec.docket = { no: dk, at: at(date, '22:00'), by: 'Sunil Yadav' }
      rec.otcLinkToken = `L${(i + 11).toString(36).toUpperCase()}X${(i * 7919 + 13).toString(36).toUpperCase()}`
      rec.otcLinkIssuedAt = at(date, '22:00')
      rec.trail.verifiedBy = 'Sunil Yadav'
      rec.trail.verifiedAt = at(date, '22:00')
      rec.status = 'Verified'
      rec.log.push({ at: at(date, '22:00'), by: 'Sunil Yadav', text: `Verified. Docket ${dk} generated and emailed; OTC link issued` })
    }
    if (reached('OTC Generated')) {
      rec.otc = { code: `OTC-${String(400000 + i * 7331)}`, generatedAt: at(date, '22:20'), generatedBy: `${frNameOf(s.frId).split(' ')[0]} Authorized User`, designation: 'Proprietor', mobile: '9800000021', purpose: 'Vault opening for EOD', linkToken: rec.otcLinkToken! }
      rec.status = 'In Progress'
      rec.log.push({ at: at(date, '22:20'), by: rec.otc.generatedBy, text: `OTC ${rec.otc.code} generated via link` })
    }
    if (reached('Vault Opened')) {
      const n = type === 'Cash Audit' ? 2 : 1
      for (let k = 0; k < n; k++) {
        const exp = 180000 + i * 5000
        const diff = k === 0 && type === 'Cash Audit' ? -500 : 0
        const done = reached('Cash Acknowledged')
        rec.events.push({
          id: `${id}-EV${k + 1}`, seq: k + 1, at: at(date, k === 0 ? '22:35' : '23:10'), boltOpenedAt: k === 0 ? '22:35' : '23:10', boltClosedAt: k === 0 ? '22:55' : '23:25',
          authorizedBy: 'Deepak Joshi', countedBy: `${frNameOf(s.frId).split(' ')[0]} staff`, expectedCash: exp, actualCash: exp + diff, difference: diff, diffType: diff > 0 ? 'Overage' : diff < 0 ? 'Shortage' : 'Nil',
          docs: [`vault-${k + 1}-${s.atmId}.jpg`], recordedBy: fu, recordedAt: at(date, k === 0 ? '22:56' : '23:26'),
          verifiedBy: done ? 'Sunil Yadav' : undefined, verifiedAt: done ? at(date, '23:40') : undefined,
        })
      }
      rec.status = 'In Progress'
      rec.log.push({ at: at(date, '22:56'), by: fu, text: `${n} vault / bolt opening event(s) recorded` })
    }
    if (reached('Cash Acknowledged')) {
      const amt2 = 200000
      rec.cash = { mode: funding === 'Full Funding' ? 'Cash Replacement' : 'Cash Loading', amount: amt2, ack: { ...ack, at: at(date, '23:45') }, at: at(date, '23:45'), by: fu }
      const h: HistoryEntry = {
        id: `HIS-${id}`, ledger: ledgerOf(funding), siteId: s.siteId, atmId: s.atmId, frId: s.frId, machineType: 'CRM', date, source: type === 'Routine' ? 'CRM Routine EOD' : 'CRM Cash Audit EOD',
        refId: id, docketNo: rec.docket?.no, otc: rec.otc?.code, amount: amt2, text: `${rec.cash.mode} ₹${amt2.toLocaleString('en-IN')} acknowledged`, at: at(date, '23:45'), by: fu,
      }
      history.push(h)
      rec.historyRef = { ledger: h.ledger, entryId: h.id, at: h.at }
      rec.status = 'Pending Approval'
      rec.log.push({ at: at(date, '23:45'), by: fu, text: `${rec.cash.mode} acknowledged → ${h.ledger} updated` })
    }
    if (stage === 'Approved') {
      const ap = at(dayIso(-(i % 9)), '10:30')
      rec.status = 'Locked'
      rec.trail.approvedBy = 'Meera Iyer'
      rec.trail.approvedAt = ap
      rec.events = rec.events.map((e) => ({ ...e, approvedBy: 'Meera Iyer', approvedAt: ap }))
      rec.log.push({ at: ap, by: 'Meera Iyer', text: 'Approved and locked' })
    }
    records.push(rec)
  })
  // NCR / Perto marks for the last few days
  dispenserEodSites(siteStore.get().sites).slice(0, 10).forEach((s, i) => {
    for (let d = 1; d <= 3; d++) {
      if ((i + d) % 4 === 0) continue
      const date = dayIso(-d)
      const f = eodFundingOf(s)!
      history.push({ id: `HIS-NCR-${s.atmId}-${date}`, ledger: ledgerOf(f), siteId: s.siteId, atmId: s.atmId, frId: s.frId, machineType: s.machineType, date, source: 'NCR / Perto EOD mark', refId: `${s.atmId}|${date}`, text: `EOD done on machine (${s.machineType}) — no docket required`, at: at(date, '21:40'), by: frUser(s.frId) })
    }
  })
  return { records: records.reverse(), history: history.sort((a, b) => b.at.localeCompare(a.at)) }
}

export const eodStore = createStore<EodState>('dexter.eod.v2', seed)
/** Hydrates from the backend in API mode (no-op in mock mode). */
export const useEod = () => {
  eodLoader.use()
  return eodStore.use()
}
export const eodById = (id?: string) => eodStore.get().records.find((r) => r.id === id)

function patch(id: string, fn: (r: EodRecord) => EodRecord) {
  eodStore.set((s) => ({ ...s, records: s.records.map((r) => (r.id === id ? fn(r) : r)) }))
}
const line = (text: string, by = actorName()) => ({ at: nowIso(), by, text })

// ── request (Routine / Cash Audit) ──────────────────────────────────────
export type EodRequestInput = {
  type: EodType
  siteId: string
  eodDate: string
  category?: EodCategory | ''
  auditReason?: string
  auditReasonOther?: string
  slipNo: string
  slipDate: string
  slipAmount: string
  declaredCash: string
  file: { name: string; size: number } | null
  ackLang: 'Hindi' | 'English'
  ackChecked: boolean
  exceptionalReason?: string // required when CRM creates it on the web
}

/** UAT 8 — every mandatory field of an EOD request. Returns field → message. */
export function validateEodRequest(i: EodRequestInput, channel: EodRecord['channel']): Record<string, string> {
  const e: Record<string, string> = {}
  const site = siteStore.get().sites.find((s) => s.siteId === i.siteId)
  if (!site) e.siteId = 'Select the site / ATM'
  else if (!isCrmSite(site)) e.siteId = `${site.machineType} machines have no CRM EOD request — use "Mark EOD done (NCR / Perto)"`
  else if (!eodFundingOf(site)) e.siteId = `Funding model "${fundingOf(site.siteType)}" has no CBR / Cash Loading source — EOD not applicable`
  if (!i.eodDate) e.eodDate = 'EOD date is required'
  else if (i.eodDate > new Date().toISOString().slice(0, 10)) e.eodDate = 'EOD date cannot be in the future'
  if (site && categoryRequired(site) && !i.category) e.category = 'EOD category is mandatory for CRM + Full Funding sites'
  if (i.type === 'Cash Audit' && !i.auditReason) e.auditReason = 'Select why the cash audit is being done'
  if (i.type === 'Cash Audit' && i.auditReason?.startsWith('Other') && !i.auditReasonOther?.trim()) e.auditReasonOther = 'Describe the requirement / dispute'
  if (!i.file) e.file = 'Upload the counter slip'
  if (!i.slipNo.trim()) e.slipNo = 'Counter slip number is required'
  if (!i.slipDate) e.slipDate = 'Counter slip date is required'
  if (!(Number(i.slipAmount) > 0)) e.slipAmount = 'Enter the amount shown on the counter slip'
  if (!(Number(i.declaredCash) > 0)) e.declaredCash = 'Enter the declared cash'
  if (!i.ackChecked) e.ack = 'Accept the acknowledgement to submit'
  if (channel === 'Web (CRM exceptional)' && !i.exceptionalReason?.trim()) e.exceptionalReason = 'CRM-created EOD needs the exceptional reason'
  if (site && i.eodDate && eodStore.get().records.some((r) => r.siteId === site.siteId && r.eodDate === i.eodDate && r.type === i.type && r.stage !== 'Rejected'))
    e.eodDate = `A ${i.type} EOD already exists for this ATM on this date`
  return e
}

export function createEodRequest(i: EodRequestInput, channel: EodRecord['channel']): EodRecord {
  const site = siteStore.get().sites.find((s) => s.siteId === i.siteId)!
  const funding = eodFundingOf(site)!
  const maker = channel === 'Mobile App' ? frUser(site.frId) : actorName()
  const st = eodStore.get()
  const prefix = i.type === 'Routine' ? 'EOD-RT-' : 'EOD-CA-'
  const n = st.records.filter((r) => r.id.startsWith(prefix)).reduce((m, r) => Math.max(m, Number(r.id.slice(prefix.length)) || 0), 0) + 1
  const id = `${prefix}${String(n).padStart(4, '0')}`
  const rule = checkCounterSlip(Number(i.slipAmount))
  const ack: Ack = { text: ACK_TEXT[i.ackLang], version: ACK_VERSION, lang: i.ackLang, at: nowIso(), by: maker }
  const rec: EodRecord = {
    id, type: i.type, siteId: site.siteId, atmId: site.atmId, frId: site.frId, franchiseName: frNameOf(site.frId), siteType: site.siteType, funding, machineType: 'CRM', eodDate: i.eodDate,
    category: (i.category || undefined) as EodCategory | undefined, auditReason: i.type === 'Cash Audit' ? i.auditReason : undefined, auditReasonOther: i.auditReasonOther?.trim() || undefined,
    channel, exceptionalReason: i.exceptionalReason?.trim() || undefined,
    counterSlip: { file: i.file!.name, size: i.file!.size, slipNo: i.slipNo.trim(), slipDate: i.slipDate, amount: Number(i.slipAmount) },
    declaredCash: Number(i.declaredCash),
    rule: { ...rule, checkedAt: nowIso() },
    events: [],
    stage: rule.passed ? 'Pending Verification' : 'Exception Review',
    status: rule.passed ? 'Pending Verification' : 'In Progress',
    trail: { ...newTrail(), createdBy: maker, submittedBy: maker, submittedAt: nowIso(), acknowledgement: ack, documents: [{ at: nowIso(), by: maker, name: i.file!.name, action: 'Uploaded' }] },
    log: [line(`${i.type} EOD request submitted (${channel})${channel !== 'Mobile App' ? ` — ${i.exceptionalReason}` : ''}`, maker)],
  }
  if (!rule.passed) rec.log.push(line('Counter-slip rule failed → Operations exception review', 'System'))
  const task = emitWorkflow({
    module: 'EOD', event: 'Submit', refId: id, vars: vars(rec, { Current_Status: rec.stage }),
    nextAction: { title: rule.passed ? `Verify ${i.type} EOD counter slip – ${site.atmId}` : `Review counter-slip exception – ${site.atmId}`, dueHours: 4, priority: rule.passed ? 'High' : 'Critical' },
  })
  if (task) rec.trail.taskRefs.push(task.id)
  eodStore.set((s) => ({ ...s, records: [rec, ...s.records] }))
  return rec
}

/** Franchise re-submits a returned request with a new counter slip. */
export function resubmitEod(id: string, input: { file: { name: string; size: number }; slipNo: string; slipAmount: number; ackLang: 'Hindi' | 'English'; ackChecked: boolean }) {
  const r = eodById(id)
  if (!r || r.stage !== 'Returned for Correction') return 'Only returned requests can be re-submitted'
  if (!input.slipNo.trim() || !(input.slipAmount > 0)) return 'Counter slip number and amount are required'
  if (!input.ackChecked) return 'Accept the acknowledgement'
  const maker = r.channel === 'Mobile App' ? frUser(r.frId) : actorName()
  const rule = checkCounterSlip(input.slipAmount)
  patch(id, (x) => ({
    ...x,
    counterSlip: { ...x.counterSlip, file: input.file.name, size: input.file.size, slipNo: input.slipNo.trim(), amount: input.slipAmount },
    rule: { ...rule, checkedAt: nowIso() },
    stage: rule.passed ? 'Pending Verification' : 'Exception Review',
    status: rule.passed ? 'Pending Verification' : 'In Progress',
    trail: {
      ...x.trail, submittedAt: nowIso(), submittedBy: maker,
      acknowledgement: { text: ACK_TEXT[input.ackLang], version: ACK_VERSION, lang: input.ackLang, at: nowIso(), by: maker },
      documents: [...x.trail.documents, { at: nowIso(), by: maker, name: input.file.name, action: 'Replaced' }],
      modifications: [...x.trail.modifications, { at: nowIso(), by: maker, field: 'Counter slip amount', oldValue: String(x.counterSlip.amount), newValue: String(input.slipAmount), reason: 'Re-submitted after return' }],
    },
    log: [...x.log, line('Re-submitted with a corrected counter slip', maker)],
  }))
  emitWorkflow({ module: 'EOD', event: 'Submit', refId: id, vars: vars(r), nextAction: { title: `${rule.passed ? 'Verify' : 'Review exception on'} re-submitted EOD – ${r.atmId}`, dueHours: 4, priority: 'High' } })
  return null
}

/** UAT 9 — Operations decides on a failed ₹40,000 rule. */
export function reviewException(id: string, decision: 'Cleared' | 'Returned', remark: string) {
  const r = eodById(id)
  if (!r || r.stage !== 'Exception Review') return 'Record is not in exception review'
  if (isOwnRecord(r.trail)) return 'Maker-checker: you cannot review a request you submitted'
  if (!remark.trim()) return 'Remark is required'
  patch(id, (x) => ({
    ...x,
    rule: { ...x.rule, decision, remark: remark.trim(), reviewedBy: actorName(), reviewedAt: nowIso() },
    stage: decision === 'Cleared' ? 'Pending Verification' : 'Returned for Correction',
    status: decision === 'Cleared' ? 'Pending Verification' : 'Returned for Correction',
    trail: decision === 'Returned' ? { ...x.trail, returnedBy: actorName(), returnReason: remark.trim() } : x.trail,
    log: [...x.log, line(`Exception ${decision === 'Cleared' ? 'cleared — proceed to verification' : 'returned to franchise'}: ${remark.trim()}`)],
  }))
  emitWorkflow({ module: 'EOD', event: decision === 'Cleared' ? 'Pending' : 'Return', refId: id, vars: vars(r), nextAction: decision === 'Cleared' ? { title: `Verify EOD counter slip – ${r.atmId}`, dueHours: 4, priority: 'High' } : undefined })
  return null
}

const uniqueToken = () => `L${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`

/** Operations verification (maker-checker) → docket number + email (template EOD_DOCKET) + OTC link. */
export function verifyEod(id: string, remark: string) {
  const r = eodById(id)
  if (!r || r.stage !== 'Pending Verification') return 'Only requests pending verification can be verified'
  if (isOwnRecord(r.trail)) return 'Maker-checker: you cannot verify a request you submitted (UAT 5)'
  const ymd = r.eodDate.replace(/-/g, '')
  const seq = eodStore.get().records.filter((x) => x.docket).length + 1101
  const no = `DKT/${ymd}/${seq}`
  const token = uniqueToken()
  const task = emitWorkflow({
    module: 'EOD', event: 'Verify', refId: id,
    vars: vars(r, { Current_Status: `Docket ${no} generated`, Pending_Action: `Generate OTC via link (docket ${no})` }),
    nextAction: { title: `Generate OTC & record vault opening – ${r.atmId} (docket ${no})`, dueHours: 6, priority: 'High' },
  })
  patch(id, (x) => ({
    ...x,
    docket: { no, at: nowIso(), by: actorName(), emailId: task?.emailRefs[0] },
    otcLinkToken: token,
    otcLinkIssuedAt: nowIso(),
    stage: 'Docket Generated',
    status: 'Verified',
    trail: { ...x.trail, verifiedBy: actorName(), verifiedAt: nowIso(), taskRefs: task ? [...x.trail.taskRefs, task.id] : x.trail.taskRefs },
    log: [...x.log, line(`Verified${remark.trim() ? ` (${remark.trim()})` : ''}. Docket ${no} generated, emailed to mapped hierarchy; OTC link issued`)],
  }))
  return null
}

export function returnEod(id: string, reason: string) {
  const r = eodById(id)
  if (!r) return 'Not found'
  if (!['Pending Verification', 'Exception Review'].includes(r.stage)) return 'Only requests awaiting verification can be returned'
  if (isOwnRecord(r.trail)) return 'Maker-checker: you cannot return your own request'
  if (!reason.trim()) return 'Reason is required'
  patch(id, (x) => ({ ...x, stage: 'Returned for Correction', status: 'Returned for Correction', trail: { ...x.trail, returnedBy: actorName(), returnReason: reason.trim() }, log: [...x.log, line(`Returned for correction: ${reason.trim()}`)] }))
  emitWorkflow({ module: 'EOD', event: 'Return', refId: id, vars: vars(r, { Current_Status: 'Returned for Correction' }) })
  return null
}

export function rejectEod(id: string, reason: string) {
  const r = eodById(id)
  if (!r) return 'Not found'
  if (['Approved', 'Rejected', 'Cash Acknowledged'].includes(r.stage)) return 'This record can no longer be rejected'
  if (isOwnRecord(r.trail)) return 'Maker-checker: you cannot reject your own request'
  if (!reason.trim()) return 'Reason is required'
  patch(id, (x) => ({ ...x, stage: 'Rejected', status: 'Rejected', trail: { ...x.trail, returnedBy: actorName(), returnReason: reason.trim() }, log: [...x.log, line(`Rejected: ${reason.trim()}`)] }))
  emitWorkflow({ module: 'EOD', event: 'Reject', refId: id, vars: vars(r, { Current_Status: 'Rejected' }) })
  return null
}

// ── OTC (UAT 10) ─────────────────────────────────────────────────────────
export const eodByToken = (token?: string) => eodStore.get().records.find((r) => r.otcLinkToken && r.otcLinkToken === token)

export function generateOtc(token: string, input: { name: string; designation: string; mobile: string; purpose: string }): { error?: string; code?: string } {
  const r = eodByToken(token)
  if (!r) return { error: 'This OTC link is not valid' }
  if (r.otc) return { error: `OTC already generated for ${r.id} — it is view-only` }
  if (r.stage !== 'Docket Generated') return { error: 'OTC can be generated only after the docket is issued' }
  if (!input.name.trim() || !input.designation.trim() || !/^\d{10}$/.test(input.mobile.trim()) || !input.purpose.trim()) return { error: 'Fill all details (10-digit mobile)' }
  const used = new Set(eodStore.get().records.map((x) => x.otc?.code).filter(Boolean))
  let code = ''
  do code = `OTC-${String(Math.floor(100000 + Math.random() * 900000))}`
  while (used.has(code))
  const otc: Otc = { code, generatedAt: nowIso(), generatedBy: input.name.trim(), designation: input.designation.trim(), mobile: input.mobile.trim(), purpose: input.purpose.trim(), linkToken: token }
  patch(r.id, (x) => ({ ...x, otc, stage: 'OTC Generated', status: 'In Progress', log: [...x.log, line(`OTC ${code} generated via link by ${otc.generatedBy} (${otc.designation}) — linked to ${x.id}, docket ${x.docket?.no}`, otc.generatedBy)] }))
  logAudit('EOD', r.id, 'OTC generated', `${code} via link ${token}`)
  emitWorkflow({ module: 'EOD', event: 'Pending', refId: r.id, vars: vars(r, { Current_Status: 'OTC Generated' }), nextAction: { title: `Record vault opening / cash audit – ${r.atmId} (OTC ${code})`, dueHours: 4, priority: 'High' } })
  return { code }
}

// ── vault opening / cash audit events (UAT 11) ───────────────────────────
export type EventInput = { date: string; boltOpenedAt: string; boltClosedAt: string; authorizedBy: string; countedBy: string; expectedCash: string; actualCash: string; docs: string[]; remarks: string }
export const emptyEvent = (date = ''): EventInput => ({ date, boltOpenedAt: '', boltClosedAt: '', authorizedBy: '', countedBy: '', expectedCash: '', actualCash: '', docs: [], remarks: '' })
export function validateEvent(i: EventInput) {
  const e: Record<string, string> = {}
  if (!i.date) e.date = 'Date is required'
  if (!/^\d{2}:\d{2}$/.test(i.boltOpenedAt)) e.boltOpenedAt = 'Vault / bolt opening time is mandatory'
  if (i.boltClosedAt && i.boltClosedAt < i.boltOpenedAt) e.boltClosedAt = 'Closing time is before opening time'
  if (!i.authorizedBy.trim()) e.authorizedBy = 'Who authorized the opening?'
  if (!i.countedBy.trim()) e.countedBy = 'Who counted the cash?'
  if (i.expectedCash === '' || Number(i.expectedCash) < 0) e.expectedCash = 'Expected cash is required'
  if (i.actualCash === '' || Number(i.actualCash) < 0) e.actualCash = 'Actual cash found is required'
  if (!i.docs.length) e.docs = 'Attach at least one photo / document'
  return e
}
export function addEvent(id: string, i: EventInput, by: string) {
  const r = eodById(id)
  if (!r) return 'Not found'
  if (!r.otc) return 'Generate the OTC first — vault opening needs an OTC on record'
  if (!['OTC Generated', 'Vault Opened'].includes(r.stage)) return 'Events can be added only after OTC and before cash acknowledgement'
  if (r.type === 'Routine' && r.events.length >= 1) return 'Routine EOD has one vault opening — use a Cash Audit EOD for repeated openings'
  const exp = Number(i.expectedCash)
  const act = Number(i.actualCash)
  const diff = act - exp
  const ev: AuditEvent = {
    id: `${id}-EV${r.events.length + 1}`, seq: r.events.length + 1, at: new Date(`${i.date}T${i.boltOpenedAt}:00+05:30`).toISOString(), boltOpenedAt: i.boltOpenedAt, boltClosedAt: i.boltClosedAt || undefined,
    authorizedBy: i.authorizedBy.trim(), countedBy: i.countedBy.trim(), expectedCash: exp, actualCash: act, difference: diff, diffType: diff > 0 ? 'Overage' : diff < 0 ? 'Shortage' : 'Nil',
    docs: i.docs, remarks: i.remarks.trim() || undefined, recordedBy: by, recordedAt: nowIso(),
  }
  patch(id, (x) => ({
    ...x, events: [...x.events, ev], stage: 'Vault Opened', status: 'In Progress',
    trail: { ...x.trail, documents: [...x.trail.documents, ...i.docs.map((d) => ({ at: nowIso(), by, name: d, action: 'Uploaded' as const }))] },
    log: [...x.log, line(`Vault / bolt opening #${ev.seq} at ${ev.boltOpenedAt} recorded (${ev.diffType}${diff ? ` ₹${Math.abs(diff).toLocaleString('en-IN')}` : ''})`, by)],
  }))
  return null
}
export function verifyEvent(id: string, eventId: string) {
  const r = eodById(id)
  const ev = r?.events.find((e) => e.id === eventId)
  if (!r || !ev) return 'Not found'
  if (ev.verifiedBy) return 'Already verified'
  if (ev.recordedBy === actorName()) return 'Maker-checker: you recorded this event'
  patch(id, (x) => ({ ...x, events: x.events.map((e) => (e.id === eventId ? { ...e, verifiedBy: actorName(), verifiedAt: nowIso() } : e)), log: [...x.log, line(`Event #${ev.seq} verified`)] }))
  return null
}

/** UAT 8 / §5.1.4 — what is still missing before the cash acknowledgement / close. */
export function completeness(r: EodRecord) {
  const miss: string[] = []
  if (!r.otc) miss.push('OTC')
  if (!r.events.length) miss.push('Vault opening time')
  if (r.events.some((e) => !e.boltOpenedAt)) miss.push('Opening time on every event')
  if (r.events.some((e) => !e.verifiedBy)) miss.push(r.type === 'Cash Audit' ? 'Verification of every audit event' : 'Vault opening verification')
  return miss
}

// ── cash replacement / loading acknowledgement → CBR / Cash Loading history ──
export function acknowledgeCash(id: string, input: { amount: number; remarks: string; ackLang: 'Hindi' | 'English'; ackChecked: boolean }, by: string) {
  const r = eodById(id)
  if (!r) return 'Not found'
  if (r.stage !== 'Vault Opened') return 'Record the vault opening first'
  const miss = completeness(r)
  if (miss.length) return `Incomplete record — missing: ${miss.join(', ')}`
  if (!(input.amount > 0)) return 'Enter the replaced / loaded amount'
  if (!input.ackChecked) return 'Accept the acknowledgement'
  const mode: 'Cash Replacement' | 'Cash Loading' = r.funding === 'Full Funding' ? 'Cash Replacement' : 'Cash Loading'
  const ledger = ledgerOf(r.funding)
  const ack: Ack = { text: ACK_TEXT[input.ackLang], version: ACK_VERSION, lang: input.ackLang, at: nowIso(), by }
  const h: HistoryEntry = {
    id: wid('HIS'), ledger, siteId: r.siteId, atmId: r.atmId, frId: r.frId, machineType: 'CRM', date: r.eodDate, source: r.type === 'Routine' ? 'CRM Routine EOD' : 'CRM Cash Audit EOD',
    refId: r.id, docketNo: r.docket?.no, otc: r.otc?.code, amount: input.amount, text: `${mode} ₹${input.amount.toLocaleString('en-IN')} acknowledged${input.remarks.trim() ? ` — ${input.remarks.trim()}` : ''}`, at: nowIso(), by,
  }
  eodStore.set((s) => ({
    history: [h, ...s.history],
    records: s.records.map((x) => (x.id === id ? {
      ...x, cash: { mode, amount: input.amount, remarks: input.remarks.trim() || undefined, ack, at: nowIso(), by }, historyRef: { ledger, entryId: h.id, at: h.at },
      stage: 'Cash Acknowledged' as const, status: 'Pending Approval' as const, log: [...x.log, line(`${mode} acknowledged → ${ledger} updated (${h.id})`, by)],
    } : x)),
  }))
  emitWorkflow({ module: 'EOD', event: 'Pending', refId: id, vars: vars(r, { Current_Status: 'Pending Approval' }), nextAction: { title: `Approve ${r.type} EOD ${r.id}`, ownerId: 'EMP-002', dueHours: 24 } })
  return null
}

export function approveEod(id: string, remark: string) {
  const r = eodById(id)
  if (!r || r.stage !== 'Cash Acknowledged') return 'Only acknowledged records can be approved'
  if (isOwnRecord(r.trail) || r.trail.verifiedBy === actorName()) return 'Maker-checker: the submitter / verifier cannot approve'
  patch(id, (x) => ({
    ...x, stage: 'Approved', status: 'Locked',
    events: x.events.map((e) => ({ ...e, approvedBy: actorName(), approvedAt: nowIso() })),
    trail: { ...x.trail, approvedBy: actorName(), approvedAt: nowIso() },
    log: [...x.log, line(`Approved and locked${remark.trim() ? ` (${remark.trim()})` : ''}`)],
  }))
  emitWorkflow({ module: 'EOD', event: 'Approve', refId: id, vars: vars(r, { Current_Status: 'Approved' }) })
  return null
}

// ── NCR / Perto: "EOD done" mark only (§5.2) ─────────────────────────────
export function markDispenserEod(siteId: string, date: string, by: string, remarks = '') {
  const s = siteStore.get().sites.find((x) => x.siteId === siteId)
  if (!s) return 'Select a site'
  if (!isDispenserSite(s)) return 'Only NCR / Perto machines use the simple EOD mark — CRM sites raise an EOD request'
  const f = eodFundingOf(s)
  if (!f) return `Funding model "${fundingOf(s.siteType)}" is not CBR / Cash Loading`
  if (!date) return 'Date is required'
  if (date > new Date().toISOString().slice(0, 10)) return 'Date cannot be in the future'
  const ref = `${s.atmId}|${date}`
  if (eodStore.get().history.some((h) => h.refId === ref)) return 'EOD is already marked for this ATM and date'
  const h: HistoryEntry = { id: wid('HIS'), ledger: ledgerOf(f), siteId: s.siteId, atmId: s.atmId, frId: s.frId, machineType: s.machineType, date, source: 'NCR / Perto EOD mark', refId: ref, text: `EOD done on machine (${s.machineType}) — no docket required${remarks.trim() ? ` · ${remarks.trim()}` : ''}`, at: nowIso(), by }
  eodStore.set((st) => ({ ...st, history: [h, ...st.history] }))
  logAudit('EOD', ref, 'NCR / Perto EOD marked', `${h.ledger} · ${by}`)
  return null
}

// ── export ───────────────────────────────────────────────────────────────
export function exportEodCsv(rows: EodRecord[], name = 'eod-master') {
  downloadCsv(name, ['EOD ID', 'Type', 'Site ID', 'ATM ID', 'Franchise', 'Funding', 'Category', 'EOD Date', 'Counter slip ₹', 'Rule', 'Docket', 'OTC', 'Vault openings', 'Stage', 'Status', 'Submitted by', 'Verified by', 'Approved by'], rows.map((r) => [
    r.id, r.type, r.siteId, r.atmId, r.franchiseName, r.funding, r.category ?? '—', r.eodDate, String(r.counterSlip.amount), r.rule.passed ? 'Passed' : `Failed${r.rule.decision ? ` / ${r.rule.decision}` : ''}`,
    r.docket?.no ?? '', r.otc?.code ?? '', String(r.events.length), r.stage, r.status, r.trail.submittedBy ?? '', r.trail.verifiedBy ?? '', r.trail.approvedBy ?? '',
  ]))
}
export function exportHistoryCsv(rows: HistoryEntry[], name = 'eod-history') {
  downloadCsv(name, ['Ledger', 'Date', 'Site ID', 'ATM ID', 'Machine', 'Source', 'Reference', 'Docket', 'OTC', 'Amount', 'Detail', 'By', 'At'], rows.map((h) => [h.ledger, h.date, h.siteId, h.atmId, h.machineType, h.source, h.refId, h.docketNo ?? '', h.otc ?? '', h.amount != null ? String(h.amount) : '', h.text, h.by, h.at]))
}

/**
 * @deprecated Compatibility view for modules written against the old "FFM / SF monthly EOD" store
 * (recon2/atmDirectory). Read-only, derived from the Common EOD Master; new code should use `eodStore` /
 * `pages/operations/eod2/monthly.ts`.
 */
export type FfmSfCompatRow = { id: string; atmId: string; siteId: string; frName: string; fundingType: 'FFM' | 'SF'; month: string; closeOverage: number; actualMachine: number }
export const ffmSfStore = {
  get: (): FfmSfCompatRow[] =>
    eodStore.get().records.map((r) => ({
      id: r.id, atmId: r.atmId, siteId: r.siteId, frName: r.franchiseName, fundingType: r.funding === 'Full Funding' ? 'FFM' : 'SF', month: r.eodDate.slice(0, 7),
      closeOverage: r.events.reduce((s, e) => s + e.difference, 0), actualMachine: r.events[r.events.length - 1]?.actualCash ?? 0,
    })),
}

// ── API mode (backend /eod, franchise /my/eod) ───────────────────────────
type ApiAck = { text: string; version: string; lang: 'Hindi' | 'English'; at: string; by: string; byName?: string }
type ApiEvent = {
  eventId: string; seq: number; at: string; boltOpenedAt: string; boltClosedAt?: string; authorizedBy: string; countedBy: string; expectedCashPaise: number; actualCashPaise: number; differencePaise: number
  diffType: AuditEvent['diffType']; fileIds: string[]; remarks?: string; recordedBy: string; recordedByName?: string; recordedAt: string; verifiedBy?: string; verifiedByName?: string; verifiedAt?: string; approvedBy?: string; approvedAt?: string
}
export type ApiEod = {
  eodId: string; type: EodType; siteId: string; atmId: string; frId: string; franchiseName: string; siteType: string; funding: EodFunding; machineType: 'CRM'; eodDate: string
  category?: EodCategory; auditReason?: string; auditReasonOther?: string; channel: EodRecord['channel']; exceptionalReason?: string
  counterSlip: { fileId?: string; name: string; size: number; slipNo: string; slipDate: string; amountPaise: number }; declaredCashPaise: number
  rule: { passed: boolean; message: string; checkedAt: string; reviewedBy?: string; reviewedByName?: string; reviewedAt?: string; decision?: 'Cleared' | 'Returned'; remark?: string }
  docket?: { no: string; at: string; by: string; byName?: string; emailId?: string }; otcLinkToken?: string; otcLinkIssuedAt?: string; otc?: Otc & { generatedByUserId?: string }
  events?: ApiEvent[]; cash?: { mode: 'Cash Replacement' | 'Cash Loading'; amountPaise: number; remarks?: string; ack: ApiAck; at: string; by: string; byName?: string }
  historyRef?: { ledger: Ledger; entryId: string; at: string }; stage: EodStage; status: OpsStatus
  trail?: Record<string, unknown> & { acknowledgement?: ApiAck; modifications?: AuditTrail['modifications']; documents?: AuditTrail['documents'] }
  modifications?: AuditTrail['modifications']; log?: { at: string; by: string; text: string }[]; taskRefs?: string[]; createdAt?: string
  version?: number; versions?: { version: number; at: string; by: string; byName?: string; reason: string }[]
  corrections?: (Omit<EodCorrection, 'by'> & { by: string; byName?: string })[]
}
type ApiHistory = { entryId: string; ledger: Ledger; siteId: string; atmId: string; frId: string; machineType: string; date: string; source: HistoryEntry['source']; refId: string; docketNo?: string; otc?: string; amountPaise?: number; text: string; at: string; by: string; byName?: string }

const nm = (t: Record<string, unknown> | undefined, k: string) => (t?.[`${k}Name`] as string | undefined) ?? (t?.[k] as string | undefined)
const ackOf = (a?: ApiAck): Ack | undefined => (a ? { text: a.text, version: a.version, lang: a.lang, at: a.at, by: a.byName ?? a.by } : undefined)

export function fromApiEod(r: ApiEod): EodRecord {
  const t = r.trail as Record<string, unknown> | undefined
  const createdBy = nm(t, 'createdBy') ?? ''
  const trail: AuditTrail = {
    createdBy, createdAt: (t?.createdAt as string) ?? r.createdAt ?? '', submittedBy: nm(t, 'submittedBy'), submittedAt: t?.submittedAt as string | undefined,
    verifiedBy: nm(t, 'verifiedBy'), verifiedAt: t?.verifiedAt as string | undefined, approvedBy: nm(t, 'approvedBy'), approvedAt: t?.approvedAt as string | undefined,
    returnedBy: nm(t, 'returnedBy'), returnReason: t?.returnReason as string | undefined,
    modifications: r.modifications ?? r.trail?.modifications ?? [],
    documents: r.trail?.documents ?? [{ at: (t?.submittedAt as string) ?? '', by: createdBy, name: r.counterSlip?.name ?? '', action: 'Uploaded' }],
    acknowledgement: ackOf(r.trail?.acknowledgement), taskRefs: r.taskRefs ?? [],
  }
  return {
    id: r.eodId, type: r.type, siteId: r.siteId, atmId: r.atmId, frId: r.frId, franchiseName: r.franchiseName, siteType: r.siteType, funding: r.funding, machineType: 'CRM', eodDate: r.eodDate,
    category: r.category, auditReason: r.auditReason, auditReasonOther: r.auditReasonOther, channel: r.channel, exceptionalReason: r.exceptionalReason,
    counterSlip: { file: r.counterSlip?.name ?? '', size: r.counterSlip?.size ?? 0, slipNo: r.counterSlip?.slipNo ?? '', slipDate: r.counterSlip?.slipDate ?? '', amount: fromPaise(r.counterSlip?.amountPaise) },
    declaredCash: fromPaise(r.declaredCashPaise),
    rule: { passed: r.rule?.passed ?? false, message: r.rule?.message ?? '', checkedAt: r.rule?.checkedAt ?? '', reviewedBy: r.rule?.reviewedByName ?? r.rule?.reviewedBy, reviewedAt: r.rule?.reviewedAt, decision: r.rule?.decision, remark: r.rule?.remark },
    docket: r.docket ? { no: r.docket.no, at: r.docket.at, by: r.docket.byName ?? r.docket.by, emailId: r.docket.emailId } : undefined,
    otcLinkToken: r.otcLinkToken, otcLinkIssuedAt: r.otcLinkIssuedAt,
    otc: r.otc ? { code: r.otc.code, generatedAt: r.otc.generatedAt, generatedBy: r.otc.generatedBy, designation: r.otc.designation, mobile: r.otc.mobile, purpose: r.otc.purpose, linkToken: r.otc.linkToken } : undefined,
    events: (r.events ?? []).map((e) => ({
      id: e.eventId, seq: e.seq, at: e.at, boltOpenedAt: e.boltOpenedAt, boltClosedAt: e.boltClosedAt, authorizedBy: e.authorizedBy, countedBy: e.countedBy,
      expectedCash: fromPaise(e.expectedCashPaise), actualCash: fromPaise(e.actualCashPaise), difference: fromPaise(e.differencePaise), diffType: e.diffType, docs: e.fileIds ?? [], remarks: e.remarks,
      recordedBy: e.recordedByName ?? e.recordedBy, recordedAt: e.recordedAt, verifiedBy: e.verifiedByName ?? e.verifiedBy, verifiedAt: e.verifiedAt, approvedBy: e.approvedBy, approvedAt: e.approvedAt,
    })),
    cash: r.cash ? { mode: r.cash.mode, amount: fromPaise(r.cash.amountPaise), remarks: r.cash.remarks, ack: ackOf(r.cash.ack)!, at: r.cash.at, by: r.cash.byName ?? r.cash.by } : undefined,
    historyRef: r.historyRef, stage: r.stage, status: r.status, trail, log: r.log ?? [],
    version: r.version ?? 1,
    corrections: (r.corrections ?? []).map((c) => ({ ...c, by: c.byName ?? c.by })),
    versions: (r.versions ?? []).map((v) => ({ version: v.version, at: v.at, by: v.byName ?? v.by, reason: v.reason })),
  }
}
const fromApiHistory = (h: ApiHistory): HistoryEntry => ({
  id: h.entryId, ledger: h.ledger, siteId: h.siteId, atmId: h.atmId, frId: h.frId, machineType: h.machineType, date: h.date, source: h.source, refId: h.refId, docketNo: h.docketNo, otc: h.otc,
  amount: h.amountPaise != null ? fromPaise(h.amountPaise) : undefined, text: h.text, at: h.at, by: h.byName ?? h.by,
})

const isFr = () => currentRole() === 'Franchisee'
const base = () => (isFr() ? '/my/eod' : '/eod')
const enc = encodeURIComponent

/** Loads every EOD record + the CBR / Cash Loading history ledgers. */
export const eodLoader = createLoader('EOD records', async () => {
  const [records, history] = await Promise.all([fetchAll<ApiEod>(`${base()}/records`, { sort: '-eodDate' }), fetchAll<ApiHistory>(`${base()}/history`, { sort: '-at' })])
  eodStore.set({ records: records.map(fromApiEod), history: history.map(fromApiHistory) })
})

const upsertEod = (r: ApiEod) => {
  const rec = fromApiEod(r)
  eodStore.set((s) => ({ ...s, records: s.records.some((x) => x.id === rec.id) ? s.records.map((x) => (x.id === rec.id ? rec : x)) : [rec, ...s.records] }))
  return rec
}
/** Run an EOD action; null on success, else the error message (already toasted). */
async function act(fn: () => Promise<ApiEod>, reloadHistory = false): Promise<string | null> {
  try {
    upsertEod(await apiCall(fn))
    if (reloadHistory) void eodLoader.reload()
    return null
  } catch (e) {
    return (e as Error).message
  }
}
const ackBody = (lang: 'Hindi' | 'English') => ({ lang, accepted: true as const })

/** Create a CRM-exceptional (web) or franchise EOD request; uploads the counter slip first. */
export async function createEodRequestAsync(i: EodRequestInput, channel: EodRecord['channel'], slip?: File | null): Promise<{ rec?: EodRecord; error?: string }> {
  if (!apiEnabled) return { rec: createEodRequest(i, channel) }
  const site = siteStore.get().sites.find((s) => s.siteId === i.siteId)
  if (!site) return { error: 'Select the site / ATM' }
  try {
    const slipFileId = await uploadDoc(slip, { purpose: 'EOD counter slip', entity: 'EodRecord' })
    const body = {
      type: i.type, atmId: site.atmId, eodDate: i.eodDate, category: i.category || undefined, auditReason: i.type === 'Cash Audit' ? i.auditReason || undefined : undefined, auditReasonOther: i.auditReasonOther?.trim() || undefined,
      slipFileId, slipNo: i.slipNo.trim(), slipDate: i.slipDate, slipAmountPaise: toPaise(Number(i.slipAmount)), declaredCashPaise: toPaise(Number(i.declaredCash)), ack: ackBody(i.ackLang),
      ...(channel === 'Web (CRM exceptional)' && !isFr() ? { exceptionalReason: i.exceptionalReason?.trim() } : {}),
    }
    const r = await apiCall(() => post<ApiEod>(`${base()}/records`, body))
    return { rec: upsertEod(r) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function resubmitEodAsync(id: string, input: { file: { name: string; size: number }; slipNo: string; slipAmount: number; ackLang: 'Hindi' | 'English'; ackChecked: boolean }, raw?: File | null) {
  if (!apiEnabled) return resubmitEod(id, input)
  if (!isFr()) return 'Only the franchise can re-submit a returned EOD (mobile app)'
  if (!input.ackChecked) return 'Accept the acknowledgement'
  try {
    const slipFileId = await uploadDoc(raw, { purpose: 'EOD counter slip', entity: 'EodRecord', ref: id })
    return act(() => post<ApiEod>(`/my/eod/records/${enc(id)}/resubmit`, { slipFileId, slipNo: input.slipNo.trim(), slipAmountPaise: toPaise(input.slipAmount), ack: ackBody(input.ackLang) }))
  } catch (e) {
    return (e as Error).message
  }
}

export async function reviewExceptionAsync(id: string, decision: 'Cleared' | 'Returned', remark: string) {
  if (!apiEnabled) return reviewException(id, decision, remark)
  if (remark.trim().length < 3) return 'Remark is required (min 3 characters)'
  return act(() => post<ApiEod>(`/eod/records/${enc(id)}/review-exception`, { decision, remark: remark.trim() }))
}
export async function verifyEodAsync(id: string, remark: string) {
  if (!apiEnabled) return verifyEod(id, remark)
  return act(() => post<ApiEod>(`/eod/records/${enc(id)}/verify`, { remark: remark.trim() || undefined }))
}
export async function returnEodAsync(id: string, reason: string) {
  if (!apiEnabled) return returnEod(id, reason)
  if (reason.trim().length < 3) return 'Reason is required (min 3 characters)'
  return act(() => post<ApiEod>(`/eod/records/${enc(id)}/return`, { reason: reason.trim() }))
}
export async function rejectEodAsync(id: string, reason: string) {
  if (!apiEnabled) return rejectEod(id, reason)
  if (reason.trim().length < 3) return 'Reason is required (min 3 characters)'
  return act(() => post<ApiEod>(`/eod/records/${enc(id)}/reject`, { reason: reason.trim() }))
}
export async function approveEodAsync(id: string, remark: string) {
  if (!apiEnabled) return approveEod(id, remark)
  return act(() => post<ApiEod>(`/eod/records/${enc(id)}/approve`, { remark: remark.trim() || undefined }))
}

/**
 * Controlled correction of an approved / locked EOD (Admin / EOD Approve-Control) — API mode only. `changes` carries
 * the corrected values (money in rupees, converted to paise here); a reason is mandatory.
 */
export async function correctEodAsync(id: string, changes: Partial<Record<EodCorrectableKey, string>>, reason: string): Promise<string | null> {
  if (!apiEnabled) return 'Controlled correction is available when connected to the backend (API mode).'
  if (reason.trim().length < 3) return 'A reason is mandatory (at least 3 characters).'
  const body: Record<string, string | number> = {}
  for (const f of EOD_CORRECTABLE_FIELDS) {
    const v = changes[f.key]?.trim()
    if (!v) continue
    if ('money' in f && f.money) {
      const n = Number(v)
      if (!Number.isFinite(n) || n <= 0) return `${f.label}: enter a positive amount`
      body[f.key] = toPaise(n)
    } else body[f.key] = v
  }
  if (!Object.keys(body).length) return 'Enter at least one corrected value.'
  return act(() => post<ApiEod>(`/eod/records/${enc(id)}/correct`, { changes: body, reason: reason.trim() }), true)
}

/** Vault opening / cash audit event. API mode uploads `files` (PDF / JPG / PNG) and sends their fileIds. */
export async function addEventAsync(id: string, i: EventInput, by: string, files: File[] = []) {
  if (!apiEnabled) return addEvent(id, i, by)
  if (!files.length) return 'Attach at least one photo / document'
  try {
    const fileIds: string[] = []
    for (const f of files) fileIds.push(await uploadDoc(f, { purpose: 'EOD vault opening', entity: 'EodRecord', ref: id }))
    const body = {
      date: i.date, boltOpenedAt: i.boltOpenedAt, boltClosedAt: i.boltClosedAt || undefined, authorizedBy: i.authorizedBy.trim(), countedBy: i.countedBy.trim(),
      expectedCashPaise: toPaise(Number(i.expectedCash)), actualCashPaise: toPaise(Number(i.actualCash)), fileIds, remarks: i.remarks.trim() || undefined,
    }
    return act(() => post<ApiEod>(`${base()}/records/${enc(id)}/events`, body))
  } catch (e) {
    return (e as Error).message
  }
}
export async function verifyEventAsync(id: string, eventId: string) {
  if (!apiEnabled) return verifyEvent(id, eventId)
  return act(() => post<ApiEod>(`/eod/records/${enc(id)}/events/${enc(eventId)}/verify`, {}))
}
export async function acknowledgeCashAsync(id: string, input: { amount: number; remarks: string; ackLang: 'Hindi' | 'English'; ackChecked: boolean }, by: string) {
  if (!apiEnabled) return acknowledgeCash(id, input, by)
  if (!(input.amount > 0)) return 'Enter the replaced / loaded amount'
  if (!input.ackChecked) return 'Accept the acknowledgement'
  return act(() => post<ApiEod>(`${base()}/records/${enc(id)}/acknowledge`, { amountPaise: toPaise(input.amount), remarks: input.remarks.trim() || undefined, ack: ackBody(input.ackLang) }), true)
}

/** OTC via link — generation is franchise-only on the backend (POST /my/eod/otc/:token). */
export async function generateOtcAsync(token: string, input: { name: string; designation: string; mobile: string; purpose: string }): Promise<{ error?: string; code?: string }> {
  if (!apiEnabled) return generateOtc(token, input)
  if (!isFr()) return { error: 'The OTC is generated by the franchise’s authorized user from the franchise app / login — staff can only view it.' }
  try {
    const r = await apiCall(() => post<{ eodId: string; docketNo?: string; otc?: Otc }>(`/my/eod/otc/${enc(token)}`, { name: input.name.trim(), designation: input.designation.trim(), mobile: input.mobile.trim(), purpose: input.purpose.trim() }))
    void eodLoader.reload()
    return { code: r.otc?.code }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

/** NCR / Perto "EOD done" mark (staff: Routine EOD Verify; franchise: own sites). */
export async function markDispenserEodAsync(siteId: string, date: string, by: string, remarks = '') {
  if (!apiEnabled) return markDispenserEod(siteId, date, by, remarks)
  const s = siteStore.get().sites.find((x) => x.siteId === siteId)
  if (!s) return 'Select a site'
  try {
    const h = await apiCall(() => post<ApiHistory>(`${base()}/ncr-mark`, { atmId: s.atmId, date, remarks: remarks.trim() || undefined }))
    if (h?.entryId) eodStore.set((st) => ({ ...st, history: [fromApiHistory(h), ...st.history] }))
    else void eodLoader.reload()
    return null
  } catch (e) {
    return (e as Error).message
  }
}
