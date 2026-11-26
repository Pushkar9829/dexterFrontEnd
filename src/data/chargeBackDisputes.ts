// Chargeback Dispute — Full Funding & Self Funding (Operations spec §11.2 / §11.3, UAT 19–20).
// NPCI / Bank email or file → AI (rule-based) extraction → DRAFT record → franchise notified + CRM verification
// (modify with reason) → franchise evidence (mobile) → CRM evidence check vs CBR (Full) / Cash Loading (Self)
// → response report submitted within 24 h → follow-up → closure. Reminders follow the Setup schedule.
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { actorName, emitWorkflow, hierarchyStore, logAudit, nowIso, scheduleStore, wfStore, wid, type AuditTrail, type FundingModel, type NotifySchedule } from '@/data/workflow'
import { atmInfo, normaliseDate, sourceRecordsFor } from '@/pages/operations/recon2/atmDirectory'
import { legacyCbrSite } from '@/data/cbrSites'
import { siteAt, resolveSite } from '@/lib/siteRef'
import { get as httpGet, post as httpPost } from '@/lib/api'
import { apiEnabled, createLoader, errMsg, fetchAll, fromPaise, toPaise } from './opsApi'

export const CB_STAGES = ['New', 'CRM Review', 'Franchise Response', 'Submitted', 'Closed'] as const
export type CbStage = (typeof CB_STAGES)[number]
export const CB_WORKFLOW = ['Email / file received', 'AI extraction – draft', 'CRM verification', 'Franchise notification', 'Franchise evidence', 'CRM evidence verification', 'Response report (24 h)', 'Follow-up / status', 'Closure'] as const

export type CbSource = 'NPCI' | 'Bank'
export type EvidenceKind = 'Transaction confirmation' | 'EOD details' | 'Video evidence' | 'Document'
export const EVIDENCE_KINDS: EvidenceKind[] = ['Transaction confirmation', 'EOD details', 'Video evidence', 'Document']
export const TXN_CONFIRMATIONS = ['Successful — cash dispensed', 'Failed — cash not dispensed', 'Partial dispense', 'Not sure — see EOD']
export const REPORT_DECISIONS = ['Representment — transaction successful', 'Accept chargeback — debit franchise', 'Accept chargeback — overage found', 'Partial representment']
export const CB_OUTCOMES = ['Won — representment accepted', 'Lost — chargeback debited', 'Partially accepted', 'Withdrawn by issuer']

export type CbFile = { name: string; size: number; kind: EvidenceKind | string; at: string; by: string }
export type CbFieldKey = 'atmId' | 'rrn' | 'amount' | 'txnDate' | 'reason' | 'cardNumber' | 'caseRef' | 'txnTime'
export type Extracted = Partial<Record<CbFieldKey, string>>
export type CbEvidence = { txnConfirmation: string; eodDetails: string; files: CbFile[]; remarks: string; submittedAt: string; submittedBy: string }
export type CbReminder = { id: string; audience: 'Franchise' | 'CRM'; slot: string; loggedAt: string; to: string; channel: 'Mobile push' | 'In-app' }

export interface ChargeBackDisputeRecord {
  id: string
  source: CbSource
  caseRef: string
  receivedAt: string
  dueAt: string // response report deadline (24 h from receipt)
  intake: { kind: 'Email' | 'File' | 'Manual'; fileName?: string; raw: string; importedBy: string }
  extracted: Extracted
  atmId: string
  siteId: string
  franchiseName: string
  fundingModel: FundingModel
  cardNumber: string
  rrn: string
  txnAmount: number
  disputeAmount: number
  txnDate: string
  txnTime: string
  txnType: string
  reason: string
  dataVerified?: { by: string; at: string }
  franchiseNotifiedAt?: string
  evidence?: CbEvidence
  priorEvidence: (CbEvidence & { returnedReason: string })[]
  evidenceCheck?: { against: string; refs: string[]; result: 'Matched' | 'Mismatch'; note: string; by: string; at: string }
  report?: { decision: string; summary: string; preparedBy: string; preparedAt: string; approvedBy?: string; submittedAt?: string; channel: string; withinSla?: boolean }
  followUps: { id: string; at: string; by: string; note: string; bankStatus: string }[]
  closure?: { outcome: string; note: string; at: string; by: string }
  reminders: CbReminder[]
  trail: AuditTrail
  history: { at: string; by: string; text: string }[]
  /** API mode: backend status (Awaiting Franchise Response, Escalated, Evidence Submitted, Evidence Verified, Pending Approval, Approved, Submitted to Bank, Closed). */
  apiStatus?: string
  escalation?: { at: string; level: number; note: string }
  cashSource?: { kind: string; refId: string; atmId: string; date: string; funding: string; status: string } | null
  /** API mode: Finance review recovery amount (rupees). */
  recovery?: number
  submission?: { channel: string; reference: string; by: string }
  evidenceLate?: boolean
}

export const AI_AGENT = 'Dexter AI Agent'
const HOUR = 3600_000

// ── AI extraction (rule-based parser standing in for the AI agent) ────────
const RX: Record<CbFieldKey, RegExp[]> = {
  atmId: [/\b(?:ATM|Terminal)\s*(?:ID|No\.?|Number)?\s*[:#-]?\s*([A-Z]{2,}[A-Z0-9-]{3,})/i, /\b(DX-?[A-Z]{2}-?\d{4,6}|M[A-Z]{1,3}\d{4,6}|ATM-\d{5,})\b/],
  rrn: [/\bRRN\s*(?:No\.?|Number)?\s*[:#-]?\s*(\d{12})\b/i, /\b(\d{12})\b/],
  amount: [/\b(?:Dispute\s*Amount|Disputed\s*Amount|Chargeback\s*Amount|Txn\s*Amount|Transaction\s*Amount|Amount|Amt)\s*(?:\((?:Rs\.?|INR|₹)\))?\s*[:#-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i, /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i],
  txnDate: [/\b(?:Txn|Transaction)?\s*Date\s*(?:of\s*Txn)?\s*[:#-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i, /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{2}-\d{2})\b/],
  txnTime: [/\b(?:Txn|Transaction)?\s*Time\s*[:#-]?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i],
  reason: [/\b(?:Dispute\s*Reason|Reason\s*Code|Reason|Error\s*Description|Error|Nature\s*of\s*Dispute)\s*[:#-]\s*(.+)/i],
  cardNumber: [/\bCard\s*(?:No\.?|Number)?\s*[:#-]?\s*([0-9Xx*]{4,}[0-9Xx* ]{2,}[0-9]{2,4})/i],
  caseRef: [/\b(?:Case|Complaint|Dispute|Ref(?:erence)?|Ticket)\s*(?:No\.?|ID|Number)\s*[:#-]?\s*([A-Z0-9/-]{4,})/i],
}
export const EXTRACT_FIELDS: { key: CbFieldKey; label: string; required: boolean }[] = [
  { key: 'atmId', label: 'ATM ID', required: true },
  { key: 'rrn', label: 'RRN', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'txnDate', label: 'Txn date', required: true },
  { key: 'reason', label: 'Reason', required: true },
  { key: 'txnTime', label: 'Txn time', required: false },
  { key: 'cardNumber', label: 'Card no.', required: false },
  { key: 'caseRef', label: 'NPCI / bank case ref.', required: false },
]

export function extractFromText(text: string): Extracted {
  const out: Extracted = {}
  for (const k of Object.keys(RX) as CbFieldKey[]) {
    for (const rx of RX[k]) {
      const m = text.match(rx)
      if (m?.[1]) {
        let v = m[1].trim()
        if (k === 'amount') v = v.replace(/,/g, '')
        if (k === 'txnDate') v = normaliseDate(v) || v
        if (k === 'reason') v = v.replace(/\s{2,}/g, ' ').slice(0, 160)
        if (k === 'atmId') v = v.toUpperCase()
        out[k] = v
        break
      }
    }
  }
  return out
}
export const detectSource = (text: string): CbSource => (/\bNPCI\b|\bNFS\b|\bUPI\b/i.test(text) ? 'NPCI' : 'Bank')

/** CSV file: header row mapped by fuzzy column name; each row → one draft. */
export function extractFromCsv(text: string): Extracted[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const split = (l: string) => {
    const cells: string[] = []
    let cur = ''
    let q = false
    for (const ch of l) {
      if (ch === '"') q = !q
      else if ((ch === ',' || ch === ';' || ch === '\t') && !q) {
        cells.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    cells.push(cur.trim())
    return cells
  }
  const head = split(lines[0]).map((h) => h.toLowerCase())
  const col = (re: RegExp) => head.findIndex((h) => re.test(h))
  const idx: Record<CbFieldKey, number> = {
    atmId: col(/atm|terminal/), rrn: col(/rrn|retrieval/), amount: col(/dispute.*amt|dispute.*amount|amount|amt/), txnDate: col(/date/), txnTime: col(/time/),
    reason: col(/reason|error|description|nature/), cardNumber: col(/card|pan/), caseRef: col(/case|ref|ticket|complaint/),
  }
  return lines.slice(1).map((l) => {
    const c = split(l)
    const e: Extracted = {}
    ;(Object.keys(idx) as CbFieldKey[]).forEach((k) => {
      const v = idx[k] >= 0 ? c[idx[k]]?.trim() : ''
      if (v) e[k] = k === 'amount' ? v.replace(/[^\d.]/g, '') : k === 'txnDate' ? normaliseDate(v) || v : k === 'atmId' ? v.toUpperCase() : v
    })
    return e
  })
}

// ── Seed (relative to first load so the 24 h countdowns are live) ──────────
// Seed ATMs are Site Master sites: Full Funding ones are the CBR sites, Self Funding ones the first SF sites (Cash Loading Master).
const cbrAtm = (legacy: string) => legacyCbrSite(legacy)?.atmId ?? legacy
const sfAtm = (i: number) => siteAt(i, (s) => s.siteType === 'SF').atmId

function seed(): ChargeBackDisputeRecord[] {
  const now = Date.now()
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString()
  const mk = (p: { id: string; hoursAgo: number; atmId: string; source: CbSource; rrn: string; amt: number; reason: string; card: string; caseRef: string; txnDate: string }, extra: Partial<ChargeBackDisputeRecord> = {}): ChargeBackDisputeRecord => {
    const info = atmInfo(p.atmId)
    const receivedAt = iso(p.hoursAgo * HOUR)
    const raw = `From: ${p.source === 'NPCI' ? 'disputes@npci.example' : 'chargeback@bank.example'}\nSubject: Chargeback raised – ${p.caseRef}\n\nCase No: ${p.caseRef}\nATM ID: ${p.atmId}\nRRN: ${p.rrn}\nCard No: ${p.card}\nTxn Date: ${p.txnDate}\nDispute Amount: Rs ${p.amt}\nReason: ${p.reason}\n\nPlease submit the response with EJ / CBR proof within 24 hours.`
    return {
      id: p.id, source: p.source, caseRef: p.caseRef, receivedAt, dueAt: new Date(new Date(receivedAt).getTime() + 24 * HOUR).toISOString(),
      intake: { kind: 'Email', raw, importedBy: 'Kiran Rao' }, extracted: extractFromText(raw),
      atmId: info.atmId, siteId: info.siteId, franchiseName: info.franchiseName, fundingModel: info.funding, cardNumber: p.card, rrn: p.rrn, txnAmount: p.amt, disputeAmount: p.amt,
      txnDate: normaliseDate(p.txnDate), txnTime: '10:42:10', txnType: 'Withdrawal - Card', reason: p.reason, franchiseNotifiedAt: receivedAt, priorEvidence: [], followUps: [], reminders: [],
      trail: { createdBy: AI_AGENT, createdAt: receivedAt, modifications: [], documents: [], taskRefs: [] },
      history: [{ at: receivedAt, by: AI_AGENT, text: `${p.source} email received — draft dispute created by AI extraction` }, { at: receivedAt, by: 'System', text: `Franchise ${info.franchiseName} notified for response & evidence` }],
      ...extra,
    }
  }
  const ev = (hoursAgo: number, by: string): CbEvidence => ({
    txnConfirmation: 'Successful — cash dispensed', eodDetails: 'EOD counters tally; no overage on the txn date.', remarks: 'CCTV clip shows customer collecting cash.', submittedAt: iso(hoursAgo * HOUR), submittedBy: `Franchise: ${by}`,
    files: [{ name: 'ej_log.pdf', size: 220_000, kind: 'Transaction confirmation', at: iso(hoursAgo * HOUR), by }, { name: 'eod_counter.jpg', size: 140_000, kind: 'EOD details', at: iso(hoursAgo * HOUR), by }, { name: 'cctv_clip.mp4', size: 8_400_000, kind: 'Video evidence', at: iso(hoursAgo * HOUR), by }],
  })
  const a = mk({ id: 'CBD-2026-1101', hoursAgo: 3, atmId: cbrAtm('DX-MH-01482'), source: 'NPCI', rrn: '626915392411', amt: 5000, reason: 'Cash not dispensed – customer debited', card: '6082XXXXXXXX2486', caseRef: 'NPCI/CB/2026/88412', txnDate: '24-11-2026' })
  const b = mk({ id: 'CBD-2026-1098', hoursAgo: 14, atmId: sfAtm(0), source: 'Bank', rrn: '629118042190', amt: 800, reason: 'TRXN STATUS JAM', card: '8175XXXXXXXX6868', caseRef: 'HDFC-CB-55190', txnDate: '24-11-2026' }, {})
  b.dataVerified = { by: 'Kiran Rao', at: new Date(now - 12 * HOUR).toISOString() }
  b.trail = { ...b.trail, verifiedBy: 'Kiran Rao', verifiedAt: b.dataVerified.at, modifications: [{ at: b.dataVerified.at, by: 'Kiran Rao', field: 'disputeAmount', oldValue: '800', newValue: '800', reason: 'Confirmed with switch report' }] }
  b.history.push({ at: b.dataVerified.at, by: 'Kiran Rao', text: 'CRM verified email vs AI-extracted data' })
  const c = mk({ id: 'CBD-2026-1090', hoursAgo: 20, atmId: cbrAtm('DX-MH-01497'), source: 'NPCI', rrn: '626915498210', amt: 4500, reason: 'SHUTTER OPEN TIMEOUT', card: '5102XXXXXXXX9012', caseRef: 'NPCI/CB/2026/88107', txnDate: '24-11-2026' })
  c.dataVerified = { by: 'Sunil Yadav', at: new Date(now - 18 * HOUR).toISOString() }
  c.evidence = ev(6, c.franchiseName)
  c.history.push({ at: c.dataVerified.at, by: 'Sunil Yadav', text: 'CRM verified email vs AI-extracted data' }, { at: c.evidence.submittedAt, by: c.evidence.submittedBy, text: 'Franchise submitted evidence (3 files)' })
  const d = mk({ id: 'CBD-2026-1085', hoursAgo: 27, atmId: sfAtm(1), source: 'Bank', rrn: '627004118321', amt: 2000, reason: 'Partial dispense', card: '4591XXXXXXXX1120', caseRef: 'SBI-ATM-77120', txnDate: '23-11-2026' })
  d.dataVerified = { by: 'Kiran Rao', at: new Date(now - 25 * HOUR).toISOString() }
  d.evidence = ev(15, d.franchiseName)
  d.evidenceCheck = { against: 'Cash Loading Master', refs: ['CL-7'], result: 'Matched', note: 'Loading and EOD match — no overage', by: 'Kiran Rao', at: new Date(now - 10 * HOUR).toISOString() }
  d.report = { decision: 'Representment — transaction successful', summary: 'EJ shows successful dispense; cash loading register tallies.', preparedBy: 'Kiran Rao', preparedAt: new Date(now - 9 * HOUR).toISOString(), channel: 'Bank' }
  d.history.push({ at: d.evidenceCheck.at, by: 'Kiran Rao', text: 'Evidence verified against Cash Loading Master — Matched' }, { at: d.report.preparedAt, by: 'Kiran Rao', text: 'Response report prepared — awaiting Admin approval' })
  const e = mk({ id: 'CBD-2026-1072', hoursAgo: 60, atmId: cbrAtm('DX-MH-01503'), source: 'NPCI', rrn: '626811902231', amt: 3000, reason: 'Customer claims non-receipt of cash', card: '6521XXXXXXXX7731', caseRef: 'NPCI/CB/2026/87011', txnDate: '22-11-2026' })
  e.dataVerified = { by: 'Kiran Rao', at: new Date(now - 58 * HOUR).toISOString() }
  e.evidence = ev(50, e.franchiseName)
  e.evidenceCheck = { against: 'CBR Master', refs: [`${legacyCbrSite('ST-MH-PUN-00138')?.siteId ?? 'ST-MH-PUN-00138'}-20261013`], result: 'Matched', note: 'CBR shows no overage', by: 'Kiran Rao', at: new Date(now - 45 * HOUR).toISOString() }
  e.report = { decision: 'Representment — transaction successful', summary: 'CBR + EJ + CCTV confirm dispense.', preparedBy: 'Kiran Rao', preparedAt: new Date(now - 44 * HOUR).toISOString(), approvedBy: 'Meera Iyer', submittedAt: new Date(now - 40 * HOUR).toISOString(), channel: 'NPCI', withinSla: true }
  e.followUps = [{ id: 'FU1', at: new Date(now - 20 * HOUR).toISOString(), by: 'Kiran Rao', note: 'Checked NPCI portal — under review', bankStatus: 'Under review' }]
  e.history.push({ at: e.report.submittedAt!, by: 'Meera Iyer', text: 'Response report approved & submitted to NPCI (within 24 h)' })
  const f = mk({ id: 'CBD-2026-1042', hoursAgo: 24 * 9, atmId: cbrAtm('DX-MH-01511'), source: 'NPCI', rrn: '626511200981', amt: 400, reason: 'POWER INTERRUPTION D TRXN STATUS JAM', card: '6082XXXXXXXX2486', caseRef: 'NPCI/CB/2026/85512', txnDate: '16-11-2026' })
  f.dataVerified = { by: 'Kiran Rao', at: new Date(now - (24 * 9 - 2) * HOUR).toISOString() }
  f.evidence = ev(24 * 9 - 8, f.franchiseName)
  f.evidenceCheck = { against: 'CBR Master', refs: ['—'], result: 'Mismatch', note: 'Overage of ₹400 found in CBR', by: 'Kiran Rao', at: new Date(now - (24 * 9 - 12) * HOUR).toISOString() }
  f.report = { decision: 'Accept chargeback — overage found', summary: 'Overage ₹400 in CBR on txn date.', preparedBy: 'Kiran Rao', preparedAt: new Date(now - (24 * 9 - 14) * HOUR).toISOString(), approvedBy: 'Meera Iyer', submittedAt: new Date(now - (24 * 9 - 16) * HOUR).toISOString(), channel: 'NPCI', withinSla: true }
  f.closure = { outcome: 'Lost — chargeback debited', note: 'Overage adjusted', at: new Date(now - 24 * 6 * HOUR).toISOString(), by: 'Kiran Rao' }
  f.history.push({ at: f.closure.at, by: 'Kiran Rao', text: 'Closed — Lost — chargeback debited' })
  return [a, b, c, d, e, f]
}

export const chargeBackStore = createStore<ChargeBackDisputeRecord[]>('dexter.cbd.v4', seed)
export const useChargebacks = () => chargeBackStore.use()

// ── Derivations ───────────────────────────────────────────────────────────
export function cbStage(r: ChargeBackDisputeRecord): CbStage {
  if (r.closure) return 'Closed'
  if (r.report?.submittedAt) return 'Submitted'
  if (!r.dataVerified) return r.evidence ? 'CRM Review' : 'New'
  if (!r.evidence) return 'Franchise Response'
  return 'CRM Review'
}
/** §18 common status word for the record. */
export function cbStatus(r: ChargeBackDisputeRecord, now = Date.now()): string {
  if (r.closure) return 'Closed'
  if (r.apiStatus === 'Escalated') return 'Escalated'
  if (r.apiStatus === 'Approved') return 'Approved — to submit'
  if (r.report?.submittedAt) return r.followUps.length ? 'In Progress' : 'Submitted'
  if (new Date(r.dueAt).getTime() < now) return 'Overdue'
  if (!r.dataVerified) return 'Draft'
  if (!r.evidence) return 'Pending — franchise response'
  if (!r.evidenceCheck) return 'Pending Verification'
  if (!r.report) return 'Verified'
  return 'Pending Approval'
}
export const isCbOverdue = (r: ChargeBackDisputeRecord, now = Date.now()) => !r.report?.submittedAt && !r.closure && new Date(r.dueAt).getTime() < now
/** Index into CB_WORKFLOW. */
export function cbStep(r: ChargeBackDisputeRecord): number {
  if (r.closure) return 8
  if (r.report?.submittedAt) return 7
  if (r.evidenceCheck) return 6
  if (r.evidence) return 5
  if (r.dataVerified) return 4
  return 2
}

// ── Reminder schedule (§11.2 Task & Notification: franchise 3/day, CRM 2/day, Setup-configurable) ─
export type PlannedReminder = { key: string; audience: 'Franchise' | 'CRM'; slot: string; state: 'Sent' | 'Due' | 'Upcoming' | 'Stopped'; loggedAt?: string }
function slots(times: string[], from: number, to: number) {
  const out: number[] = []
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  for (let day = d.getTime(); day <= to; day += 24 * HOUR) {
    for (const t of times) {
      const [h, m] = t.split(':').map(Number)
      const s = new Date(day)
      s.setHours(h || 0, m || 0, 0, 0)
      const ms = s.getTime()
      if (ms > from && ms <= to) out.push(ms)
    }
  }
  return out
}
const franchiseActive = (r: ChargeBackDisputeRecord) => !!r.franchiseNotifiedAt && !r.evidence && !r.closure
const crmActive = (r: ChargeBackDisputeRecord) => !r.report?.submittedAt && !r.closure
export function reminderPlan(r: ChargeBackDisputeRecord, schedules: NotifySchedule[], now = Date.now()): PlannedReminder[] {
  const fr = schedules.find((s) => s.key === 'chargeback_franchise')
  const crm = schedules.find((s) => s.key === 'chargeback_crm')
  const start = new Date(r.franchiseNotifiedAt ?? r.receivedAt).getTime()
  const due = new Date(r.dueAt).getTime()
  const plan: PlannedReminder[] = []
  const add = (aud: 'Franchise' | 'CRM', times: string[], from: number, to: number, active: boolean) => {
    for (const ms of slots(times, from, to)) {
      const slot = new Date(ms).toISOString()
      const key = `${aud}|${slot}`
      const logged = r.reminders.find((x) => `${x.audience}|${x.slot}` === key)
      plan.push({ key, audience: aud, slot, loggedAt: logged?.loggedAt, state: logged ? 'Sent' : !active ? 'Stopped' : ms <= now ? 'Due' : 'Upcoming' })
    }
  }
  if (fr) add('Franchise', fr.times, start, due, franchiseActive(r))
  // CRM keeps getting reminded until the report goes out (overdue window capped at +24 h)
  if (crm) add('CRM', crm.times, new Date(r.receivedAt).getTime(), due + 24 * HOUR, crmActive(r))
  return plan.sort((x, y) => x.slot.localeCompare(y.slot))
}

/** Log every reminder whose slot has arrived (called on a timer by the chargeback pages). */
export function processDueReminders(now = Date.now()) {
  if (apiEnabled) return 0 // reminders & escalation run as backend jobs in API mode
  const schedules = scheduleStore.get()
  const crmEmail = hierarchyStore.get().employees.find((e) => e.id === 'EMP-005')?.email ?? 'crm@dexterindia.in'
  const notices: { id: string; at: string; to: string; channel: 'In-app' | 'Mobile push'; module: 'Reconciliation'; refId: string; text: string; read: boolean }[] = []
  let changed = false
  const next = chargeBackStore.get().map((r) => {
    const due = reminderPlan(r, schedules, now).filter((p) => p.state === 'Due')
    if (!due.length) return r
    changed = true
    const at = new Date(now).toISOString()
    const add: CbReminder[] = due.map((p) => ({ id: wid('RMD'), audience: p.audience, slot: p.slot, loggedAt: at, to: p.audience === 'Franchise' ? `franchise:${r.franchiseName}` : crmEmail, channel: p.audience === 'Franchise' ? 'Mobile push' : 'In-app' }))
    add.forEach((x) =>
      notices.push({ id: wid('NTF'), at, to: x.to, channel: x.channel, module: 'Reconciliation', refId: r.id, read: false, text: x.audience === 'Franchise' ? `Reminder: chargeback ${r.id} (ATM ${r.atmId}) — submit response & evidence before ${new Date(r.dueAt).toLocaleString('en-IN')}` : `Reminder: chargeback ${r.id} — verification / response report due ${new Date(r.dueAt).toLocaleString('en-IN')}` }),
    )
    return { ...r, reminders: [...r.reminders, ...add], history: [...r.history, ...add.map((x) => ({ at, by: 'System', text: `${x.audience} reminder sent (${x.channel}) for slot ${new Date(x.slot).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` }))] }
  })
  if (!changed) return 0
  chargeBackStore.set(next)
  wfStore.set((s) => ({ ...s, notices: [...notices, ...s.notices].slice(0, 3000) }))
  return notices.length
}

// ── Actions ───────────────────────────────────────────────────────────────
type Result = { ok: true; id: string } | { ok: false; error: string }
const get = (id: string) => chargeBackStore.get().find((r) => r.id === id)
const patch = (id: string, fn: (r: ChargeBackDisputeRecord) => ChargeBackDisputeRecord) => chargeBackStore.set((p) => p.map((r) => (r.id === id ? fn(r) : r)))
const vars = (r: ChargeBackDisputeRecord, status: string) => ({ Site_ID: r.siteId, ATM_ID: r.atmId, Franchise_Name: r.franchiseName, Current_Status: status })

/** UAT 19 — each extracted item becomes a DRAFT dispute; franchise is notified at once (before CRM verification). */
export function importChargebacks(items: Extracted[], intake: { kind: 'Email' | 'File' | 'Manual'; fileName?: string; raw: string }, source: CbSource, receivedAt?: string): string[] {
  const by = actorName()
  const list = chargeBackStore.get()
  let n = list.map((r) => Number(r.id.match(/(\d+)$/)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 1000)
  const at = receivedAt ? new Date(receivedAt).toISOString() : nowIso()
  const recs: ChargeBackDisputeRecord[] = items.map((e) => {
    n += 1
    const id = `CBD-${new Date().getFullYear()}-${n}`
    const info = atmInfo(e.atmId ?? '')
    const amt = Number(e.amount ?? 0) || 0
    return {
      id, source, caseRef: e.caseRef ?? '', receivedAt: at, dueAt: new Date(new Date(at).getTime() + 24 * HOUR).toISOString(), intake: { ...intake, importedBy: by }, extracted: e,
      atmId: info.atmId, siteId: info.siteId, franchiseName: info.franchiseName, fundingModel: info.funding, cardNumber: e.cardNumber ?? '', rrn: e.rrn ?? '', txnAmount: amt, disputeAmount: amt,
      txnDate: e.txnDate ?? '', txnTime: e.txnTime ?? '', txnType: 'Withdrawal - Card', reason: e.reason ?? '', franchiseNotifiedAt: nowIso(), priorEvidence: [], followUps: [], reminders: [],
      trail: { createdBy: AI_AGENT, createdAt: nowIso(), modifications: [], documents: intake.fileName ? [{ at: nowIso(), by, name: intake.fileName, action: 'Uploaded' }] : [], taskRefs: [] },
      history: [
        { at, by: 'System', text: `${source} ${intake.kind.toLowerCase()} received${intake.fileName ? ` (${intake.fileName})` : ''} — imported by ${by}` },
        { at: nowIso(), by: AI_AGENT, text: `AI extraction created DRAFT — ${EXTRACT_FIELDS.filter((f) => e[f.key]).length}/${EXTRACT_FIELDS.length} fields found${info.known ? '' : ' · ATM not found in masters'}` },
        { at: nowIso(), by: 'System', text: `Franchise ${info.franchiseName} notified for response & evidence (before CRM verification)` },
      ],
    }
  })
  chargeBackStore.set((p) => [...recs, ...p])
  recs.forEach((r) => {
    logAudit('Reconciliation', r.id, 'Chargeback draft created by AI extraction', `${r.source} · ${r.atmId} · RRN ${r.rrn}`)
    // CHARGEBACK_PENDING template → franchise email; task → CRM verification (24 h)
    emitWorkflow({ module: 'Reconciliation', event: 'Pending', refId: r.id, vars: vars(r, 'Draft — franchise response due in 24 h'), franchiseEmail: `${r.franchiseName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@franchise.example`, nextAction: { title: `Verify chargeback ${r.id} (email vs AI data)`, ownerId: 'EMP-005', dueHours: 24, priority: 'High' } })
    wfStore.set((s) => ({ ...s, notices: [{ id: wid('NTF'), at: nowIso(), to: `franchise:${r.franchiseName}`, channel: 'Mobile push', module: 'Reconciliation', refId: r.id, text: `New chargeback ${r.id} on ATM ${r.atmId} — upload confirmation, EOD and video evidence within 24 h`, read: false }, ...s.notices] }))
  })
  return recs.map((r) => r.id)
}

export type CbEditable = Pick<ChargeBackDisputeRecord, 'atmId' | 'rrn' | 'txnAmount' | 'disputeAmount' | 'txnDate' | 'txnTime' | 'reason' | 'cardNumber' | 'caseRef' | 'txnType' | 'fundingModel'>

/** CRM Operations verification of email data vs AI-extracted data. Any change needs a valid reason (§11.2-3). */
export function verifyCbData(id: string, next: Partial<CbEditable>, reason: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (r.closure) return { ok: false, error: 'Dispute is closed' }
  const keys = (Object.keys(next) as (keyof CbEditable)[]).filter((k) => String(next[k] ?? '') !== String(r[k] ?? ''))
  if (keys.length && !reason.trim()) return { ok: false, error: 'A valid reason is mandatory when modifying extracted data' }
  const m = { ...r, ...next }
  if (!m.atmId || !/^\d{12}$/.test(m.rrn) || !(Number(m.disputeAmount) > 0) || !m.txnDate || !m.reason) return { ok: false, error: 'ATM ID, 12-digit RRN, dispute amount, txn date and reason must be valid before verification' }
  if (m.fundingModel !== 'Full Funding' && m.fundingModel !== 'Self Funding') return { ok: false, error: 'Chargebacks apply to Full Funding or Self Funding sites only — correct the funding model' }
  const by = actorName()
  const at = nowIso()
  const mods = keys.map((k) => ({ at, by, field: String(k), oldValue: String(r[k] ?? ''), newValue: String(next[k] ?? ''), reason }))
  if (keys.includes('atmId') && !resolveSite(String(next.atmId))) return { ok: false, error: `ATM / Site "${String(next.atmId)}" was not found in the Site Master` }
  const info = keys.includes('atmId') ? atmInfo(String(next.atmId)) : undefined
  patch(id, (x) => ({
    ...x, ...next, txnAmount: Number(next.txnAmount ?? x.txnAmount), disputeAmount: Number(next.disputeAmount ?? x.disputeAmount),
    ...(info ? { siteId: info.siteId, franchiseName: info.franchiseName, fundingModel: next.fundingModel ?? info.funding } : {}),
    dataVerified: x.dataVerified ?? { by, at },
    trail: { ...x.trail, verifiedBy: x.trail.verifiedBy ?? by, verifiedAt: x.trail.verifiedAt ?? at, modifications: [...x.trail.modifications, ...mods] },
    history: [...x.history, { at, by, text: keys.length ? `CRM modified ${keys.join(', ')} — ${reason}` : 'CRM verified email vs AI-extracted data (no change)' }],
  }))
  if (!r.dataVerified) emitWorkflow({ module: 'Reconciliation', event: 'Verify', refId: id, vars: vars(r, r.evidence ? 'Evidence received — CRM to verify' : 'Awaiting franchise evidence'), nextAction: r.evidence ? { title: `Verify franchise evidence for ${id}`, ownerId: 'EMP-005', dueHours: Math.max(1, (new Date(r.dueAt).getTime() - Date.now()) / HOUR) } : undefined })
  return { ok: true, id }
}

/** Franchise response & evidence (mobile app). */
export function submitCbEvidence(id: string, e: { txnConfirmation: string; eodDetails: string; remarks: string; files: { name: string; size: number; kind: string }[] }, franchise: string): Result {
  // API mode needs uploaded files (fileIds) — use submitCbEvidenceAsync with uploadFile results
  if (apiEnabled) return { ok: false, error: 'Evidence files must be uploaded to the server first (use the franchise app evidence upload).' }
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (r.closure || r.report?.submittedAt) return { ok: false, error: 'Response already submitted to the bank / NPCI' }
  if (!e.txnConfirmation) return { ok: false, error: 'Confirm the transaction status' }
  if (!e.eodDetails.trim()) return { ok: false, error: 'EOD details are required' }
  if (!e.files.some((f) => f.kind === 'Transaction confirmation' || f.kind === 'EOD details')) return { ok: false, error: 'Upload at least the transaction confirmation or EOD proof' }
  const by = `Franchise: ${franchise}`
  const at = nowIso()
  const files: CbFile[] = e.files.map((f) => ({ ...f, at, by }))
  patch(id, (x) => ({
    ...x, evidence: { txnConfirmation: e.txnConfirmation, eodDetails: e.eodDetails, remarks: e.remarks, files, submittedAt: at, submittedBy: by },
    trail: { ...x.trail, submittedBy: by, submittedAt: at, documents: [...x.trail.documents, ...files.map((f) => ({ at, by, name: f.name, action: 'Uploaded' as const }))] },
    history: [...x.history, { at, by, text: `Franchise submitted evidence (${files.length} file(s): ${[...new Set(files.map((f) => f.kind))].join(', ')})` }],
  }))
  emitWorkflow({ module: 'Reconciliation', event: 'Submit', refId: id, vars: vars(r, 'Evidence submitted'), nextAction: { title: `Verify franchise evidence for ${id} against ${r.fundingModel === 'Full Funding' ? 'CBR' : 'Cash Loading'}`, ownerId: 'EMP-005', dueHours: Math.max(1, (new Date(r.dueAt).getTime() - Date.now()) / HOUR), priority: 'High' } })
  return { ok: true, id }
}

/** CRM evidence verification — only against the funding model's own source (§11.3; CBR and Cash Loading never mix). */
export function verifyCbEvidence(id: string, result: 'Matched' | 'Mismatch', note: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (!r.dataVerified) return { ok: false, error: 'Verify the email / extracted data first' }
  if (!r.evidence) return { ok: false, error: 'No franchise evidence yet' }
  if (r.evidence.submittedBy === `Franchise: ${actorName()}`) return { ok: false, error: 'Maker-checker: the evidence submitter cannot verify it' }
  if (result === 'Mismatch' && !note.trim()) return { ok: false, error: 'Explain the mismatch' }
  const against = r.fundingModel === 'Full Funding' ? 'CBR Master' : 'Cash Loading Master'
  const refs = sourceRecordsFor(r.fundingModel, r.atmId, r.txnDate).map((s) => s.ref).filter((x) => x !== '—')
  const by = actorName()
  patch(id, (x) => ({ ...x, evidenceCheck: { against, refs, result, note, by, at: nowIso() }, history: [...x.history, { at: nowIso(), by, text: `Evidence verified against ${against} — ${result}${note ? ` (${note})` : ''}` }] }))
  return { ok: true, id }
}

/** CRM asks the franchise for more / corrected evidence (previous submission is kept). */
export function returnCbEvidence(id: string, reason: string): Result {
  const r = get(id)
  if (!r?.evidence) return { ok: false, error: 'No evidence to return' }
  if (!reason.trim()) return { ok: false, error: 'Reason is mandatory' }
  const by = actorName()
  patch(id, (x) => ({ ...x, priorEvidence: [...x.priorEvidence, { ...x.evidence!, returnedReason: reason }], evidence: undefined, evidenceCheck: undefined, report: undefined, history: [...x.history, { at: nowIso(), by, text: `Evidence returned to franchise: ${reason}` }] }))
  wfStore.set((s) => ({ ...s, notices: [{ id: wid('NTF'), at: nowIso(), to: `franchise:${r.franchiseName}`, channel: 'Mobile push', module: 'Reconciliation', refId: id, text: `Chargeback ${id}: more evidence needed — ${reason}`, read: false }, ...s.notices] }))
  return { ok: true, id }
}

export function prepareCbReport(id: string, decision: string, summary: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (!r.evidenceCheck) return { ok: false, error: 'Verify the evidence before preparing the response report' }
  if (!decision || !summary.trim()) return { ok: false, error: 'Decision and report summary are required' }
  const by = actorName()
  patch(id, (x) => ({ ...x, report: { decision, summary, preparedBy: by, preparedAt: nowIso(), channel: x.source }, history: [...x.history, { at: nowIso(), by, text: `Response report prepared: ${decision}` }] }))
  emitWorkflow({ module: 'Reconciliation', event: 'Verify', refId: id, vars: vars(r, 'Report pending approval'), nextAction: { title: `Approve & submit chargeback response ${id}`, ownerId: 'EMP-002', dueHours: Math.max(1, (new Date(r.dueAt).getTime() - Date.now()) / HOUR), priority: 'Critical' } })
  return { ok: true, id }
}

/** Approved response report submitted to Bank / NPCI — 24 h SLA recorded. */
export function approveSubmitCbReport(id: string): Result {
  const r = get(id)
  if (!r?.report) return { ok: false, error: 'No report prepared' }
  const by = actorName()
  if (r.report.preparedBy === by) return { ok: false, error: 'Maker-checker: the report preparer cannot approve it' }
  const at = nowIso()
  const withinSla = new Date(at).getTime() <= new Date(r.dueAt).getTime()
  emitWorkflow({ module: 'Reconciliation', event: 'Approve', refId: id, vars: vars(r, `Response submitted to ${r.source}`), nextAction: { title: `Follow up ${r.source} decision on ${id}`, ownerId: 'EMP-005', dueHours: 72 } })
  patch(id, (x) => ({
    ...x, report: { ...x.report!, approvedBy: by, submittedAt: at, withinSla }, trail: { ...x.trail, approvedBy: by, approvedAt: at },
    history: [...x.history, { at, by, text: `Response report approved & submitted to ${x.source} ${withinSla ? '(within 24 h)' : '(LATE — after 24 h deadline)'}` }],
  }))
  return { ok: true, id }
}

export function addCbFollowUp(id: string, note: string, bankStatus: string): Result {
  if (!note.trim()) return { ok: false, error: 'Follow-up note is required' }
  const by = actorName()
  patch(id, (x) => ({ ...x, followUps: [...x.followUps, { id: `FU${x.followUps.length + 1}`, at: nowIso(), by, note, bankStatus }], history: [...x.history, { at: nowIso(), by, text: `Follow-up: ${bankStatus} — ${note}` }] }))
  return { ok: true, id }
}

export function closeCb(id: string, outcome: string, note: string): Result {
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  if (!r.report?.submittedAt) return { ok: false, error: 'Submit the response report before closing' }
  if (!outcome) return { ok: false, error: 'Select the final outcome' }
  const by = actorName()
  patch(id, (x) => ({ ...x, closure: { outcome, note, at: nowIso(), by }, history: [...x.history, { at: nowIso(), by, text: `Closed — ${outcome}${note ? ` (${note})` : ''}` }] }))
  emitWorkflow({ module: 'Reconciliation', event: 'Close', refId: id, vars: vars(r, 'Closed') })
  return { ok: true, id }
}

export function exportChargeBackCsv(records: ChargeBackDisputeRecord[], filename = 'chargeback-disputes') {
  downloadCsv(
    filename,
    ['Dispute ID', 'Source', 'Case ref', 'Received', 'Due (24 h)', 'ATM ID', 'Site', 'Franchise', 'Funding', 'RRN', 'Card', 'Txn date', 'Txn amount', 'Dispute amount', 'Reason', 'Stage', 'Evidence', 'Evidence check', 'Report', 'Within SLA', 'Outcome'],
    records.map((r) => [r.id, r.source, r.caseRef, r.receivedAt, r.dueAt, r.atmId, r.siteId, r.franchiseName, r.fundingModel, r.rrn, r.cardNumber, r.txnDate, String(r.txnAmount), String(r.disputeAmount), r.reason, cbStage(r), r.evidence ? 'Submitted' : 'Pending', r.evidenceCheck?.result ?? '', r.report?.decision ?? '', r.report?.submittedAt ? (r.report.withinSla ? 'Yes' : 'No') : '', r.closure?.outcome ?? '']),
  )
}

// ── Backend API (VITE_API_URL set) ─────────────────────────────────────────
// Store above stays the page-facing state; in API mode it is hydrated from /disputes/chargebacks and every mutation
// goes to the backend, then the returned record replaces the local one. Backend flow: Awaiting Franchise Response
// (24 h, cron → Escalated) → Evidence Submitted → Evidence Verified → Pending Approval (Finance review) → Approved
// (Admin) → Submitted to Bank → Closed. Reminders / escalation run on the server.
type ApiFile = { fileId: string; name: string; kind: string; at: string; by: string }
type ApiEvidence = { txnConfirmation: string; eodDetails: string; files: ApiFile[]; remarks: string; submittedAt: string; submittedBy: string; submittedByName: string; late: boolean; returnedReason?: string; onBehalf?: boolean; onBehalfReason?: string }
type ApiCb = {
  cbId: string; source: CbSource; caseRef: string; receivedAt: string; responseDueAt: string
  intake?: { kind: 'Email' | 'File' | 'Manual'; fileName?: string; raw?: string; importedBy?: string; importedByName?: string; row?: number }
  extracted?: Record<string, string>
  atmId: string; siteId: string; frId: string; franchiseName: string; funding: FundingModel; cardNumber: string; rrn: string
  txnAmountPaise: number; disputeAmountPaise: number; txnDate: string; txnTime: string; txnType: string; reason: string; status: string
  dataVerified?: { by: string; byName: string; at: string }
  escalation?: { at: string; level: number; note: string }
  evidence?: ApiEvidence
  priorEvidence?: ApiEvidence[]
  cashSource?: { kind: string; refId: string; atmId: string; date: string; funding: string; status: string } | null
  evidenceCheck?: { against: string; result: 'Matched' | 'Mismatch'; note: string; by: string; byName: string; at: string }
  review?: { decision: string; summary: string; recoveryPaise: number; by: string; byName: string; at: string }
  approval?: { by: string; byName: string; at: string; note?: string }
  submission?: { at: string; by: string; channel: string; reference: string; withinSla: boolean }
  followUps?: { at: string; by: string; note: string; bankStatus: string }[]
  closure?: { outcome: string; note: string; at: string; by: string }
  version?: number
  versions?: { version: number; at: string; by: string; reason: string; changes?: { field: string; from: unknown; to: unknown }[] }[]
  history?: { at: string; by: string; text: string }[]
}

const evidenceFromApi = (e: ApiEvidence): CbEvidence => ({
  txnConfirmation: e.txnConfirmation, eodDetails: e.eodDetails, remarks: e.remarks ?? '', submittedAt: e.submittedAt, submittedBy: e.onBehalf ? `${e.submittedByName ?? e.submittedBy} (CRM, on behalf of the franchise${e.onBehalfReason ? ` — ${e.onBehalfReason}` : ''})` : `Franchise: ${e.submittedByName ?? e.submittedBy}`,
  files: (e.files ?? []).map((f) => ({ name: f.name, size: 0, kind: f.kind, at: f.at, by: f.by })),
})

/** Backend chargeback → page record (paise → rupees, user ids → names). */
export function cbFromApi(d: ApiCb): ChargeBackDisputeRecord {
  const importedBy = d.intake?.importedByName ?? d.intake?.importedBy ?? 'System'
  const ev = d.evidence ? evidenceFromApi(d.evidence) : undefined
  return {
    id: d.cbId, source: d.source, caseRef: d.caseRef ?? '', receivedAt: d.receivedAt, dueAt: d.responseDueAt,
    intake: { kind: d.intake?.kind ?? 'Manual', fileName: d.intake?.fileName, raw: d.intake?.raw ?? '', importedBy },
    extracted: (d.extracted ?? {}) as Extracted,
    atmId: d.atmId, siteId: d.siteId, franchiseName: d.franchiseName, fundingModel: d.funding, cardNumber: d.cardNumber ?? '', rrn: d.rrn ?? '',
    txnAmount: fromPaise(d.txnAmountPaise), disputeAmount: fromPaise(d.disputeAmountPaise), txnDate: d.txnDate ?? '', txnTime: d.txnTime ?? '', txnType: d.txnType ?? '', reason: d.reason ?? '',
    dataVerified: d.dataVerified ? { by: d.dataVerified.byName ?? d.dataVerified.by, at: d.dataVerified.at } : undefined,
    franchiseNotifiedAt: d.receivedAt,
    evidence: ev,
    priorEvidence: (d.priorEvidence ?? []).map((p) => ({ ...evidenceFromApi(p), returnedReason: p.returnedReason ?? '' })),
    evidenceCheck: d.evidenceCheck ? { against: d.evidenceCheck.against, refs: d.cashSource ? [d.cashSource.refId] : [], result: d.evidenceCheck.result, note: d.evidenceCheck.note, by: d.evidenceCheck.byName ?? d.evidenceCheck.by, at: d.evidenceCheck.at } : undefined,
    report: d.review
      ? { decision: d.review.decision, summary: d.review.summary, preparedBy: d.review.byName ?? d.review.by, preparedAt: d.review.at, approvedBy: d.approval?.byName, submittedAt: d.submission?.at, channel: d.submission?.channel ?? d.source, withinSla: d.submission?.withinSla }
      : undefined,
    followUps: (d.followUps ?? []).map((f, i) => ({ id: `FU${i + 1}`, at: f.at, by: f.by, note: f.note, bankStatus: f.bankStatus })),
    closure: d.closure,
    reminders: [],
    trail: {
      createdBy: importedBy, createdAt: d.receivedAt, verifiedBy: d.dataVerified?.byName, verifiedAt: d.dataVerified?.at, submittedBy: ev?.submittedBy, submittedAt: ev?.submittedAt,
      approvedBy: d.approval?.byName, approvedAt: d.approval?.at, taskRefs: [],
      modifications: (d.versions ?? []).flatMap((v) => (v.changes ?? []).map((c) => ({ at: v.at, by: v.by, field: c.field, oldValue: String(c.from ?? ''), newValue: String(c.to ?? ''), reason: v.reason }))),
      documents: (ev?.files ?? []).map((f) => ({ at: f.at, by: f.by, name: f.name, action: 'Uploaded' as const })),
    },
    history: d.history ?? [],
    apiStatus: d.status,
    escalation: d.escalation,
    cashSource: d.cashSource ?? null,
    recovery: d.review ? fromPaise(d.review.recoveryPaise) : undefined,
    submission: d.submission ? { channel: d.submission.channel, reference: d.submission.reference, by: d.submission.by } : undefined,
    evidenceLate: d.evidence?.late,
  }
}

const upsertCb = (rec: ChargeBackDisputeRecord) => chargeBackStore.set((p) => (p.some((r) => r.id === rec.id) ? p.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...p]))

/** Hydrates `chargeBackStore` from the backend (no-op in mock mode). */
export const cbLoader = createLoader('chargeback disputes', async () => {
  const items = await fetchAll<ApiCb>('/disputes/chargebacks')
  chargeBackStore.set(items.map(cbFromApi))
})
export const useCbLoad = () => cbLoader.use()

/** Re-fetch one chargeback (detail page; includes the raw intake text). */
export async function refreshCb(id: string) {
  if (!apiEnabled) return
  upsertCb(cbFromApi(await httpGet<ApiCb>(`/disputes/chargebacks/${encodeURIComponent(id)}`)))
}

async function actCb(fn: () => Promise<ApiCb>): Promise<Result> {
  try {
    const rec = cbFromApi(await fn())
    upsertCb(rec)
    return { ok: true, id: rec.id }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}
const CP = (id: string, action: string) => `/disputes/chargebacks/${encodeURIComponent(id)}/${action}`

/** Text the backend extractor reads (labelled lines first; the original email follows for the CRM record). */
function intakeText(e: Extracted, original?: string) {
  const lines = [
    e.caseRef && `Case No: ${e.caseRef}`,
    e.atmId && `ATM ID: ${e.atmId.toUpperCase()}`,
    e.rrn && `RRN: ${e.rrn}`,
    e.cardNumber && `Card No: ${e.cardNumber}`,
    e.txnDate && `Txn Date: ${normaliseDate(e.txnDate) || e.txnDate}`,
    e.txnTime && `Txn Time: ${e.txnTime}`,
    e.amount && `Dispute Amount: Rs ${String(e.amount).replace(/,/g, '')}`,
    e.reason && `Reason: ${e.reason.replace(/\s+/g, ' ')}`,
  ].filter(Boolean)
  return `${lines.join('\n')}${original ? `\n\n----- Original -----\n${original}` : ''}`.slice(0, 20_000)
}

/** API-aware import: each (human-checked) extracted row becomes one draft via POST /disputes/chargebacks/intake. */
export async function importChargebacksAsync(
  items: Extracted[],
  intake: { kind: 'Email' | 'File' | 'Manual'; fileName?: string; raw: string },
  source: CbSource,
  receivedAt?: string,
): Promise<{ ids: string[]; errors: string[] }> {
  if (!apiEnabled) return { ids: importChargebacks(items, intake, source, receivedAt), errors: [] }
  const ids: string[] = []
  const errors: string[] = []
  const at = receivedAt ? new Date(receivedAt).toISOString() : undefined
  for (const [i, e] of items.entries()) {
    const original = intake.kind === 'Email' && items.length === 1 ? intake.raw : intake.fileName ? `Imported from ${intake.fileName}, row ${i + 2}` : undefined
    try {
      const r = await httpPost<{ created: string[] }>('/disputes/chargebacks/intake', { text: intakeText(e, original), kind: intake.kind === 'Email' ? 'Email' : 'Manual', source, ...(at ? { receivedAt: at } : {}) })
      ids.push(...r.created)
    } catch (err) {
      errors.push(`Row ${i + 1}: ${errMsg(err)}`)
    }
  }
  if (ids.length) await cbLoader.reload()
  return { ids, errors }
}

export async function verifyCbDataAsync(id: string, next: Partial<CbEditable>, reason: string): Promise<Result> {
  if (!apiEnabled) return verifyCbData(id, next, reason)
  const r = get(id)
  if (!r) return { ok: false, error: 'Dispute not found' }
  // verify-data may be repeated until the franchise evidence is in (reason mandatory); afterwards → ALREADY_VERIFIED
  if (r.dataVerified && r.evidence) return { ok: false, error: 'Data already verified and the franchise evidence is in — later changes need an Admin correction.' }
  if (r.dataVerified && reason.trim().length < 3) return { ok: false, error: 'A reason is mandatory when verifying the data again.' }
  const keys = (Object.keys(next) as (keyof CbEditable)[]).filter((k) => String(next[k] ?? '') !== String(r[k] ?? ''))
  if (keys.includes('cardNumber') || keys.includes('fundingModel')) return { ok: false, error: 'Card number and funding model come from the bank file / Site Master and cannot be changed here.' }
  if (keys.length && reason.trim().length < 3) return { ok: false, error: 'A valid reason is mandatory when modifying extracted data' }
  const patch: Record<string, unknown> = {}
  for (const k of keys) {
    if (k === 'txnAmount') patch.txnAmountPaise = toPaise(Number(next.txnAmount))
    else if (k === 'disputeAmount') patch.disputeAmountPaise = toPaise(Number(next.disputeAmount))
    else if (k === 'txnDate') patch.txnDate = normaliseDate(String(next.txnDate)) || next.txnDate
    else if (k === 'atmId') patch.atmId = String(next.atmId).toUpperCase()
    else patch[k] = next[k]
  }
  return actCb(() => httpPost<ApiCb>(CP(id, 'verify-data'), { patch, reason: reason.trim() }))
}

/**
 * Evidence: each file must carry the `fileId` returned by `uploadFile`. Franchise (mobile) submits its own; CRM staff
 * may submit **on behalf of** the franchise with a mandatory `onBehalfReason` (recorded in evidence / history / audit).
 */
export async function submitCbEvidenceAsync(id: string, e: { txnConfirmation: string; eodDetails: string; remarks: string; files: { name: string; size: number; kind: string; fileId?: string }[] }, franchise: string, opts: { onBehalfReason?: string } = {}): Promise<Result> {
  if (!apiEnabled) {
    const res = submitCbEvidence(id, e, franchise)
    if (res.ok && opts.onBehalfReason) patch(id, (x) => ({ ...x, history: [...x.history, { at: nowIso(), by: actorName(), text: `Evidence submitted on behalf of the franchise — ${opts.onBehalfReason}` }] }))
    return res
  }
  if (opts.onBehalfReason !== undefined && opts.onBehalfReason.trim().length < 3) return { ok: false, error: 'Submitting evidence on behalf of the franchise needs a reason' }
  const files = e.files.filter((f) => f.fileId).map((f) => ({ fileId: f.fileId!, kind: f.kind }))
  if (!files.length) return { ok: false, error: 'Upload at least the transaction confirmation or EOD proof' }
  return actCb(() => httpPost<ApiCb>(CP(id, 'evidence'), { txnConfirmation: e.txnConfirmation, eodDetails: e.eodDetails, remarks: e.remarks, files, ...(opts.onBehalfReason ? { onBehalfReason: opts.onBehalfReason.trim() } : {}) }))
}
export const verifyCbEvidenceAsync = (id: string, result: 'Matched' | 'Mismatch', note: string): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'evidence-check'), { result, note })) : Promise.resolve(verifyCbEvidence(id, result, note))
export const returnCbEvidenceAsync = (id: string, reason: string): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'evidence-return'), { reason })) : Promise.resolve(returnCbEvidence(id, reason))
/** Mock: CRM prepares the report. API: Finance review (decision + summary + recovery amount). */
export const prepareCbReportAsync = (id: string, decision: string, summary: string, recovery = 0): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'review'), { decision, summary, recoveryPaise: toPaise(recovery) })) : Promise.resolve(prepareCbReport(id, decision, summary))
/** Mock: approve + submit in one step. API: Admin approval only (submission is `submitCbToBankAsync`). */
export const approveCbReportAsync = (id: string, note?: string): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'approve'), note ? { note } : {})) : Promise.resolve(approveSubmitCbReport(id))
/** API only — approver sends the review back to Finance. */
export const rejectCbReviewAsync = (id: string, reason: string): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'reject-review'), { reason })) : Promise.resolve({ ok: false, error: 'Backend step only' })
/** API only — CRM records the submission of the approved response to the bank / NPCI. */
export const submitCbToBankAsync = (id: string, channel: string, reference: string): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'submit-to-bank'), { channel, reference })) : Promise.resolve(approveSubmitCbReport(id))
export const addCbFollowUpAsync = (id: string, note: string, bankStatus: string): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'follow-ups'), { note, bankStatus })) : Promise.resolve(addCbFollowUp(id, note, bankStatus))
export const closeCbAsync = (id: string, outcome: string, note: string): Promise<Result> =>
  apiEnabled ? actCb(() => httpPost<ApiCb>(CP(id, 'close'), { outcome, note })) : Promise.resolve(closeCb(id, outcome, note))
