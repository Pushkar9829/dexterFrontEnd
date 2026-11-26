// Monthly Payout workspace (spec §9, §14.1, §16.1, §17) — shared, non-visual logic.
// Money is INTEGER PAISE throughout. Approved batches are never overwritten: corrections are
// adjustment entries kept beside the batch (§16.1). Mock only — persisted in localStorage.
import { createStore } from '@/lib/store'
import { apiEnabled } from '@/lib/api'
import * as papi from '@/data/payoutApi'
import { getSession } from '@/lib/auth'
import { downloadCsv } from '@/lib/export'
import { siteByAtm, networkStore, type Site } from '@/data/network'
import { franchiseStore } from '@/data/franchises'
import {
  payoutStore, planStore, planMappingStore, accountStore, financeRulesStore, businessStore, bmPnl, calcFranchise, logPayout, pid, nowIso, sumP,
  DEDUCTION_LABELS, ZERO_DED, monthLabel,
  type PayoutBatch, type PayoutLine, type PayoutState, type ReconStatus, type BatchStatus, type Paise, type PayoutPlan, type Vertical, type TxnData, type Deductions,
} from '@/data/payout'

// ── options ──────────────────────────────────────────────────────────────
export type Mode = 'file' | 'manual' | 'auto'
export const MODE_TYPE: Record<Mode, PayoutBatch['type']> = { file: 'File-Based Payout', manual: 'Manual Payout', auto: 'Auto Reconciliation' }
export const PAYMENT_MODES = ['NEFT', 'RTGS', 'IMPS']
/** Company debit accounts approved for payouts (mock — the backend will serve the approved list). */
export const COMPANY_ACCOUNTS = ['Dexter Ops Account - 1234567890', 'Dexter Payout Account - 5012004471']
export const BENEFICIARIES = ['Franchisee', 'MF', 'Super MF', 'Team Leader']
export const VERTICAL_LABEL: Record<Vertical, string> = { 'Franchise Model': 'Franchise', 'Business Model': 'Business Model (BM)' }
export const MODEL_OPTIONS = ['Citrine', 'Peridot Alfa Plus', 'Peridot Alfa', 'Jade', 'Palladium Lite', 'Green Coral', 'Yellow Emerald', 'Green Emerald', 'Coral']
export const CREDIT_STATUSES = ['Pending', 'Credited', 'Failed', 'On Hold'] as const
export const REMARK_MAX = 250

export const actor = () => getSession()?.name ?? 'Unknown user'

/** FY "2026-27" → 2026-04 … 2027-03 */
export function fyMonths(fy: string) {
  const y = Number(fy.slice(0, 4))
  if (!y) return []
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1
    return `${i < 9 ? y : y + 1}-${String(m).padStart(2, '0')}`
  })
}
export const fyOf = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const start = m >= 4 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const SUFFIX: Record<Mode, string> = { file: '', manual: 'MAN', auto: 'AUTO' }
const norm = (s: string) => s.trim().toUpperCase()
export const batchNameTaken = (name: string, ignoreId?: string) => payoutStore.get().batches.some((b) => b.id !== ignoreId && norm(b.name) === norm(name))
/** PAYOUT_OCT26_001 / PAYOUT_SEP26_MAN / PAYOUT_SEP26_AUTO — the next free one. */
export function suggestBatchName(month: string, mode: Mode) {
  if (!month) return ''
  const [y, m] = month.split('-')
  const base = `PAYOUT_${MON[Number(m) - 1]}${y.slice(2)}`
  for (let i = 1; i < 999; i++) {
    const n = SUFFIX[mode] ? `${base}_${SUFFIX[mode]}${i > 1 ? `_${i}` : ''}` : `${base}_${String(i).padStart(3, '0')}`
    if (!batchNameTaken(n)) return n
  }
  return `${base}_${Date.now()}`
}

export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\//g, '-') : '—')
export const fmtDate = (d?: string) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-GB').replace(/\//g, '-') : '—')
/** ₹ without the symbol, Indian grouping, 2 decimals */
export const amt = (p: Paise) => (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export { monthLabel }

// ── extension store (file meta, approval trail, adjustments, resolutions, release / UTR) ──
export type ProcStatus = 'Uploaded' | 'Processing' | 'Extracted' | 'Failed'
export type FileKind = 'File Upload' | 'PDF Statement' | 'Excel File'
export type IssueKind = 'Unmapped Site' | 'Duplicate' | 'Data Pending' | 'Duplicate File'
export type Issue = { row: number; atmId: string; kind: IssueKind; detail: string }
export type FileMeta = { name: string; type: string; sizeKb: number; uploadedAt: string; uploadedBy: string; status: ProcStatus; kind: FileKind; issues: Issue[]; note?: string; stored?: boolean }
export type TrailEntry = { id: string; batchId: string; at: string; by: string; action: string; note?: string }
/**
 * Correction entry beside an approved line. API mode: created **Pending** and counted only once a different checker
 * approves it (`status` Approved); mock mode / legacy entries have no status and count immediately.
 */
export type Adjustment = {
  id: string; batchId: string; lineId: string; atmId: string; kind: 'Adjustment' | 'Reversal'; before: Paise; after: Paise; delta: Paise; reason: string; by: string; at: string
  byId?: string; status?: 'Pending' | 'Approved' | 'Rejected'; decidedBy?: string; decidedAt?: string; remark?: string
}
/** Does the entry count towards the payable? (Approved, or a mock / legacy entry without a status.) */
export const adjCounts = (a: Adjustment) => !a.status || a.status === 'Approved'
export type Accepted = 'Auto' | 'Manual' | 'File-Based' | 'Custom'
export type Resolution = { batchId: string; atmId: string; status: ReconStatus; accepted: Accepted; amount: Paise | null; reason: string; by: string; at: string }
export type PayState = 'Ready' | 'Released' | 'Failed' | 'On Hold'
export type UtrState = 'Pending' | 'Paid' | 'Reconciled'
/** `failSource`: Provider (bank) / Manual (payout user, needs a 2nd-user confirmation before re-release) / Confirmed. */
export type Release = {
  pay: PayState; utrStatus: UtrState; utr?: string; paidDate?: string; by?: string; at?: string
  holdReason?: string; failReason?: string; failSource?: 'Provider' | 'Manual' | 'Confirmed'; failMarkedBy?: string
}
export type LineMeta = { flags: ReconStatus[]; accountNo?: string; row?: number }
/** `makerId` / `submittedBy`: backend user ids (API mode) — they can never release the batch. */
export type BatchMeta = { siteCategory?: string; beneficiary?: string; holdFrom?: BatchStatus; makerId?: string; submittedBy?: string }
export type MonthlyExt = {
  files: Record<string, FileMeta>
  trail: TrailEntry[]
  adjustments: Adjustment[]
  resolutions: Record<string, Resolution>
  release: Record<string, Release>
  lineMeta: Record<string, LineMeta>
  meta: Record<string, BatchMeta>
}
export const extStore = createStore<MonthlyExt>(apiEnabled ? 'dexter.payout.monthlyExt.api' : 'dexter.payout.monthlyExt.v1', () => ({ files: {}, trail: [], adjustments: [], resolutions: {}, release: {}, lineMeta: {}, meta: {} }))
export const useExt = () => extStore.use()

/** Original uploads ≤ 1 MB kept as data URLs (no backend yet); larger files keep metadata only. */
const FILE_KEY = 'dexter.payout.monthlyFiles.v1'
export async function storeOriginal(batchId: string, file: File): Promise<boolean> {
  if (file.size > 1024 * 1024) return false
  const url = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
  try {
    const all = JSON.parse(localStorage.getItem(FILE_KEY) ?? '{}') as Record<string, { name: string; url: string }>
    all[batchId] = { name: file.name, url }
    localStorage.setItem(FILE_KEY, JSON.stringify(all))
    return true
  } catch {
    return false
  }
}
export function downloadOriginal(batchId: string) {
  try {
    const f = (JSON.parse(localStorage.getItem(FILE_KEY) ?? '{}') as Record<string, { name: string; url: string }>)[batchId]
    if (!f) return false
    const a = document.createElement('a')
    a.href = f.url
    a.download = f.name
    a.click()
    return true
  } catch {
    return false
  }
}

export function addTrail(batchId: string, action: string, note?: string) {
  extStore.set((x) => ({ ...x, trail: [{ id: pid('TRL'), batchId, at: nowIso(), by: actor(), action, note }, ...x.trail].slice(0, 4000) }))
}

// ── master lookups ───────────────────────────────────────────────────────
export function parentsOf(frId: string) {
  const nodes = networkStore.get().nodes
  const n = nodes[frId]
  let mf = '—'
  let smf = '—'
  if (n?.parent.kind === 'MF') {
    mf = n.parent.name
    const mfn = nodes[n.parent.id]
    if (mfn?.parent.kind === 'SMF') smf = mfn.parent.name
  } else if (n?.parent.kind === 'SMF') smf = n.parent.name
  else if (n?.parent.kind === 'Company') mf = 'Dexter India (Direct Company)'
  return { mf, smf }
}
export type AtmInfo = { site: Site; frName: string; mf: string; smf: string }
export function atmInfo(atmId: string): AtmInfo | undefined {
  const site = siteByAtm(atmId)
  if (!site) return undefined
  const fr = franchiseStore.get().find((f) => f.id === site.frId)
  return { site, frName: fr?.name ?? site.frId, ...parentsOf(site.frId) }
}
/** BM sites come from the Business Model master; Franchise sites from the site master. */
export function isMapped(atmId: string, vertical: Vertical) {
  if (vertical === 'Business Model') return businessStore.get().bmSites.some((b) => b.atmId.toLowerCase() === atmId.trim().toLowerCase() && b.status === 'Active')
  return !!siteByAtm(atmId)
}

/** Approved plan for the ATM in that month: an active Plan Mapping first, else the active plan. */
export function planFor(atmId: string, month: string): { plan?: PayoutPlan; source: string } {
  const start = `${month}-01`
  const end = `${month}-31`
  const plans = planStore.get()
  const m = planMappingStore.get().find(
    (x) => x.atmId.toLowerCase() === atmId.trim().toLowerCase() && x.status === 'Active' && x.beneficiaryType === 'Franchisee' && x.effectiveFrom <= end && (x.effectiveTo === null || x.effectiveTo >= start),
  )
  if (m) {
    const p = plans.find((x) => x.code === m.planCode && x.version === m.planVersion) ?? plans.find((x) => x.code === m.planCode)
    if (p) return { plan: p, source: `Plan Mapping · ${p.code} v${p.version}` }
  }
  // No site-wise mapping: fall back to the longest-standing active Franchise plan (earliest effective date),
  // never simply the most recently created one.
  const a = plans
    .filter((x) => x.status === 'Active' && x.vertical === 'Franchise Model')
    .sort((x, y) => x.effectiveFrom.localeCompare(y.effectiveFrom) || x.code.localeCompare(y.code))[0]
  return { plan: a, source: a ? `Active plan ${a.code} (no site-wise mapping)` : 'No active plan' }
}

/** Registered beneficiary account: Account Mapping record first, else the site payout mapping. */
export function registeredAccount(frId: string, atmId: string): { state: 'Verified' | 'Pending'; accountNo?: string } {
  const acc = accountStore.get().find((a) => a.beneficiaryId === frId && a.status !== 'Rejected' && a.status !== 'Superseded')
  if (acc) return { state: acc.status === 'Active' && acc.kycVerified ? 'Verified' : 'Pending', accountNo: acc.accountNo }
  const site = siteByAtm(atmId)
  if (site?.payout?.status === 'Mapped') return { state: 'Verified', accountNo: site.payout.accountNo }
  return { state: 'Pending' }
}

export const tolerance = () => financeRulesStore.get().varianceTolerance

// ── amounts ──────────────────────────────────────────────────────────────
export const adjOf = (lineId: string, adjs: Adjustment[]) => sumP(adjs.filter((a) => a.lineId === lineId && adjCounts(a)).map((a) => a.delta))
export const effNet = (l: PayoutLine, adjs: Adjustment[]) => l.net + adjOf(l.id, adjs)
export const batchAdj = (batchId: string, adjs: Adjustment[]) => sumP(adjs.filter((a) => a.batchId === batchId && adjCounts(a)).map((a) => a.delta))
export const batchNet = (b: PayoutBatch, adjs: Adjustment[]) => b.net + batchAdj(b.id, adjs)

export const PRE_APPROVAL: BatchStatus[] = ['Draft', 'Uploaded', 'Validated', 'Pending Approval']
export const isLocked = (b: PayoutBatch) => !PRE_APPROVAL.includes(b.status) && b.status !== 'Rejected' && !(b.status === 'On Hold' && PRE_APPROVAL.includes(extStore.get().meta[b.id]?.holdFrom ?? 'Draft'))
export const approvedLike = (s: BatchStatus) => s === 'Approved' || s === 'Released' || s === 'Completed'

export function totalsOf(lines: PayoutLine[]) {
  return { records: lines.length, gross: sumP(lines.map((l) => l.gross)), tds: sumP(lines.map((l) => l.taxAmt)), net: sumP(lines.map((l) => l.net)) }
}

/** Franchise engine with the plan for the ATM; BM engine = received payout − expenses (bmPnl). */
export function autoCalc(vertical: Vertical, atmId: string, month: string, txn: TxnData, ded: Deductions, taxPct: number) {
  if (vertical === 'Business Model') {
    const p = bmPnl(businessStore.get(), atmId, month)
    return { gross: p.received, mfRevenue: 0, withoutTds: p.net, taxAmt: 0, net: p.net, planCode: undefined as string | undefined }
  }
  const { plan } = planFor(atmId, month)
  const c = calcFranchise(plan, txn, ded, taxPct)
  return { gross: c.gross, mfRevenue: c.mfRevenue, withoutTds: c.withoutTds, taxAmt: c.taxAmt, net: c.net, planCode: plan?.code }
}

// ── reconciliation (§9.4–9.6) ────────────────────────────────────────────
export const RECON_STATUSES: ReconStatus[] = ['Matched', 'Variance Found', 'PDF Only', 'Excel Only', 'Account Mismatch', 'Duplicate', 'Unmapped Site', 'Account Pending', 'Data Pending']
/** Highest priority first: a row shows the most serious condition. */
const PRIORITY: ReconStatus[] = ['Duplicate', 'Unmapped Site', 'Account Mismatch', 'Account Pending', 'Data Pending', 'PDF Only', 'Excel Only', 'Variance Found', 'Matched']
export const RECON_TONE: Record<ReconStatus, 'green' | 'amber' | 'red' | 'gray' | 'purple' | 'blue'> = {
  Matched: 'green', 'Variance Found': 'amber', 'PDF Only': 'purple', 'Excel Only': 'purple', 'Account Mismatch': 'red', Duplicate: 'red', 'Unmapped Site': 'red', 'Account Pending': 'amber', 'Data Pending': 'gray',
}
export const resKey = (batchId: string, atmId: string) => `${batchId}|${atmId.toUpperCase()}`

export type ReconRow = {
  atmId: string
  siteId: string
  frName: string
  frId: string
  manual?: Paise
  file?: Paise
  auto?: Paise
  manualLine?: PayoutLine
  fileLine?: PayoutLine
  autoLine?: PayoutLine
  mVsA?: Paise
  fVsA?: Paise
  mVsF?: Paise
  status: ReconStatus
  issues: ReconStatus[]
  remarks: string
  resolution?: Resolution
  critical: boolean
  stale: boolean
  live?: Paise
}
const isPdf = (b: PayoutBatch) => /pdf/i.test(b.fileType ?? '') || /\.pdf$/i.test(b.fileName ?? '')

export function sourcesFor(state: PayoutState, auto: PayoutBatch) {
  const same = (b: PayoutBatch) => b.month === auto.month && b.vertical === auto.vertical && b.status !== 'Rejected'
  const manual = state.batches.filter((b) => same(b) && b.type === 'Manual Payout')
  const files = state.batches.filter((b) => same(b) && b.type === 'File-Based Payout')
  return { manual, pdf: files.filter(isPdf), excel: files.filter((b) => !isPdf(b)), files }
}

function diffRemark(a?: PayoutLine, b?: PayoutLine) {
  if (!a || !b) return 'Amount difference'
  const keys = Object.keys(DEDUCTION_LABELS) as (keyof Deductions)[]
  const d = keys.filter((k) => (a.ded[k] ?? 0) !== (b.ded[k] ?? 0)).map((k) => DEDUCTION_LABELS[k])
  if (d.length) return `${d.join(', ')} difference`
  const t = (Object.keys(a.txn) as (keyof TxnData)[]).some((k) => a.txn[k] !== b.txn[k])
  if (t) return 'Transaction count difference'
  if (a.taxPct !== b.taxPct) return 'TDS / GST % difference'
  return 'Amount difference'
}

export function buildRecon(state: PayoutState, ext: MonthlyExt, auto: PayoutBatch): ReconRow[] {
  const { manual, pdf, excel, files } = sourcesFor(state, auto)
  const tol = tolerance() ?? 0
  const linesOf = (bs: PayoutBatch[]) => {
    const ids = new Set(bs.map((b) => b.id))
    const m = new Map<string, PayoutLine[]>()
    state.lines.forEach((l) => {
      if (!ids.has(l.batchId)) return
      const k = l.atmId.toUpperCase()
      m.set(k, [...(m.get(k) ?? []), l])
    })
    return m
  }
  const mMap = linesOf(manual)
  const pMap = linesOf(pdf)
  const eMap = linesOf(excel)
  const fMap = linesOf(files)
  const aMap = linesOf([auto])
  const atms = new Set<string>([...aMap.keys(), ...mMap.keys(), ...fMap.keys()])
  const rows: ReconRow[] = []
  atms.forEach((k) => {
    const ml = mMap.get(k)
    const fl = fMap.get(k)
    const al = aMap.get(k)
    const manualLine = ml?.[0]
    const fileLine = (excel.length ? eMap.get(k)?.[0] : undefined) ?? fl?.[0]
    const autoLine = al?.[0]
    const any = autoLine ?? fileLine ?? manualLine!
    const mv = manualLine ? effNet(manualLine, ext.adjustments) : undefined
    const fv = fileLine ? effNet(fileLine, ext.adjustments) : undefined
    const av = autoLine ? effNet(autoLine, ext.adjustments) : undefined
    const issues = new Set<ReconStatus>()
    if ((ml?.length ?? 0) > 1 || (al?.length ?? 0) > 1 || (eMap.get(k)?.length ?? 0) > 1 || (pMap.get(k)?.length ?? 0) > 1) issues.add('Duplicate')
    ;[...(ml ?? []), ...(fl ?? []), ...(al ?? [])].forEach((l) => ext.lineMeta[l.id]?.flags.forEach((f) => issues.add(f)))
    if (!isMapped(any.atmId, auto.vertical)) issues.add('Unmapped Site')
    const acc = registeredAccount(any.frId, any.atmId)
    const fileAcc = fl?.map((l) => ext.lineMeta[l.id]?.accountNo).find(Boolean)
    if (fileAcc && acc.accountNo && fileAcc.replace(/\D/g, '') !== acc.accountNo.replace(/\D/g, '')) issues.add('Account Mismatch')
    if (acc.state === 'Pending') issues.add('Account Pending')
    if (!autoLine || (manual.length && !ml) || (files.length && !fl)) issues.add('Data Pending')
    if (pdf.length && excel.length) {
      if (pMap.has(k) && !eMap.has(k)) issues.add('PDF Only')
      if (eMap.has(k) && !pMap.has(k)) issues.add('Excel Only')
    }
    const mVsA = mv !== undefined && av !== undefined ? mv - av : undefined
    const fVsA = fv !== undefined && av !== undefined ? fv - av : undefined
    const mVsF = mv !== undefined && fv !== undefined ? mv - fv : undefined
    if ([mVsA, fVsA, mVsF].some((d) => d !== undefined && Math.abs(d) > tol)) issues.add('Variance Found')
    const status = PRIORITY.find((s) => issues.has(s)) ?? 'Matched'
    const resolution = ext.resolutions[resKey(auto.id, k)]
    let live: Paise | undefined
    if (autoLine && auto.vertical === 'Franchise Model') live = autoCalc(auto.vertical, autoLine.atmId, auto.month, autoLine.txn, autoLine.ded, autoLine.taxPct).net
    let remarks = '—'
    if (status === 'Variance Found') remarks = diffRemark(mVsA ? manualLine : fileLine, autoLine)
    else if (status === 'Data Pending') remarks = !autoLine ? 'Not in auto batch — Recalculate' : manual.length && !ml ? 'Manual entry missing' : files.length && !fl ? 'Not in payout file' : 'Source numbers missing'
    else if (status === 'Unmapped Site') remarks = 'ATM not in site master'
    else if (status === 'Account Pending') remarks = 'Beneficiary account not verified'
    else if (status === 'Account Mismatch') remarks = 'Bank account differs from Account Mapping'
    else if (status === 'Duplicate') remarks = 'ATM appears more than once'
    else if (status !== 'Matched') remarks = `Record only in ${status === 'PDF Only' ? 'PDF' : 'Excel'}`
    if (resolution) remarks = resolution.reason
    rows.push({
      atmId: any.atmId, siteId: any.siteId, frName: any.frName, frId: any.frId, manual: mv, file: fv, auto: av, manualLine, fileLine, autoLine, mVsA, fVsA, mVsF,
      status, issues: PRIORITY.filter((s) => issues.has(s)), remarks, resolution, critical: status !== 'Matched' && !resolution,
      stale: live !== undefined && autoLine !== undefined && live !== autoLine.net, live,
    })
  })
  return rows.sort((a, b) => a.atmId.localeCompare(b.atmId))
}

// ── batch mutations ──────────────────────────────────────────────────────
export function makeLine(batchId: string, source: PayoutLine['source'], month: string, atmId: string, txn: TxnData, ded: Deductions, taxPct: number, vertical: Vertical, base?: Partial<PayoutLine>): PayoutLine {
  const info = atmInfo(atmId)
  const c = autoCalc(vertical, atmId, month, txn, ded, taxPct)
  return {
    id: pid('PL'), batchId, source, month, atmId: info?.site.atmId ?? atmId, siteId: info?.site.siteId ?? base?.siteId ?? '—', model: base?.model ?? info?.site.machineType ?? '—', cashLiveDate: base?.cashLiveDate ?? '',
    frId: info?.site.frId ?? base?.frId ?? '', frName: info?.frName ?? base?.frName ?? '—', mfName: info?.mf ?? base?.mfName ?? '—', smfName: info?.smf ?? base?.smfName ?? '—', mfCode: base?.mfCode ?? '',
    city: info?.site.district ?? base?.city ?? '', state: info?.site.state ?? base?.state ?? '', planCode: c.planCode, txn, ded, gross: c.gross, mfRevenue: c.mfRevenue, taxPct, taxAmt: c.taxAmt,
    withoutTds: c.withoutTds, net: c.net, pan: base?.pan ?? '',
  }
}

/** Re-runs the engine on an unapproved auto batch and adds ATMs present in the month's manual / file sources. */
export function recalculate(batch: PayoutBatch): { changed: number; added: number } {
  if (isLocked(batch)) throw new Error('Approved batches cannot be recalculated — add an adjustment entry instead.')
  if (apiEnabled) void papi.apiRecalculate(batch.id)
  const state = payoutStore.get()
  const { manual, files } = sourcesFor(state, batch)
  const srcIds = new Set([...files, ...manual].map((b) => b.id))
  const own = state.lines.filter((l) => l.batchId === batch.id)
  const have = new Set(own.map((l) => l.atmId.toUpperCase()))
  let changed = 0
  const updated = own.map((l) => {
    const c = autoCalc(batch.vertical, l.atmId, batch.month, l.txn, l.ded, l.taxPct)
    if (c.net === l.net && c.gross === l.gross && c.taxAmt === l.taxAmt) return l
    changed++
    return { ...l, gross: c.gross, mfRevenue: c.mfRevenue, withoutTds: c.withoutTds, taxAmt: c.taxAmt, net: c.net, planCode: c.planCode }
  })
  const added: PayoutLine[] = []
  // file data preferred over manual entry as the auto engine's transaction input
  const srcLines = [...state.lines.filter((l) => srcIds.has(l.batchId) && files.some((f) => f.id === l.batchId)), ...state.lines.filter((l) => srcIds.has(l.batchId) && manual.some((m) => m.id === l.batchId))]
  srcLines.forEach((s) => {
    const k = s.atmId.toUpperCase()
    if (have.has(k)) return
    have.add(k)
    added.push(makeLine(batch.id, 'Auto', batch.month, s.atmId, s.txn, s.ded, s.taxPct || 2, batch.vertical, s))
  })
  const all = [...updated, ...added]
  const t = totalsOf(all)
  payoutStore.set((st) => ({
    batches: st.batches.map((b) => (b.id === batch.id ? { ...b, ...t, gst: 0 } : b)),
    lines: [...st.lines.filter((l) => l.batchId !== batch.id), ...all],
  }))
  logPayout({ by: actor(), area: 'Monthly Payout', ref: batch.name, action: 'Recalculated', before: `${own.length} lines`, after: `${changed} changed, ${added.length} added` })
  addTrail(batch.id, 'Recalculated', `${changed} line(s) changed, ${added.length} added`)
  return { changed, added: added.length }
}

export function createAutoBatch(name: string, fy: string, month: string, vertical: Vertical, meta: BatchMeta) {
  const b: PayoutBatch = { id: pid('BAT'), name: name.trim(), fy, month, type: 'Auto Reconciliation', vertical, records: 0, gross: 0, gst: 0, tds: 0, net: 0, status: 'Draft', maker: actor(), createdAt: nowIso() }
  payoutStore.set((s) => ({ ...s, batches: [b, ...s.batches] }))
  extStore.set((x) => ({ ...x, meta: { ...x.meta, [b.id]: meta } }))
  addTrail(b.id, 'Created', 'Auto Reconciliation batch')
  logPayout({ by: actor(), area: 'Monthly Payout', ref: b.name, action: 'Batch created', after: 'Auto Reconciliation' })
  if (apiEnabled) {
    // the server computes an Auto batch on creation
    void papi.apiCreateBatch({ name: b.name, month, type: 'Auto Reconciliation', vertical, siteCategory: meta.siteCategory })
    return b.id
  }
  recalculate(b)
  return b.id
}

/** Batch status actions the backend has endpoints for (Released / Completed follow the bank status there). */
const API_ACTION: Record<string, 'submit' | 'approve' | 'reject' | 'hold' | 'unhold'> = { 'Submitted for approval': 'submit', Approved: 'approve', Rejected: 'reject', 'Put on hold': 'hold', 'Hold released': 'unhold' }
export function setStatus(batch: PayoutBatch, status: BatchStatus, action: string, note?: string, patch: Partial<PayoutBatch> = {}) {
  if (apiEnabled && API_ACTION[action]) void papi.apiBatchStatus(batch.id, API_ACTION[action], note)
  payoutStore.set((s) => ({ ...s, batches: s.batches.map((b) => (b.id === batch.id ? { ...b, ...patch, status } : b)) }))
  addTrail(batch.id, action, note)
  logPayout({ by: actor(), area: 'Monthly Payout', ref: batch.name, action, before: batch.status, after: status })
}

/** Returns a reason when the current user may not approve this batch. */
export function approvalBlock(batch: PayoutBatch, canApprove: boolean, unresolved: number): string | null {
  if (!canApprove) return 'Your role does not have the Approve right.'
  if (!PRE_APPROVAL.includes(batch.status)) return batch.status === 'On Hold' ? 'Batch is on hold — release the hold first.' : `Batch is already ${batch.status}.`
  if (batch.maker === actor()) return 'Maker-checker: the user who created this batch cannot approve it.'
  if (batch.records === 0) return 'No payout lines yet (extraction pending or empty batch).'
  if (unresolved > 0) return `${unresolved} critical mismatch(es) unresolved — resolve or hold before approval.`
  return null
}

export function holdBatch(batch: PayoutBatch, reason: string) {
  extStore.set((x) => ({ ...x, meta: { ...x.meta, [batch.id]: { ...x.meta[batch.id], holdFrom: batch.status } } }))
  setStatus(batch, 'On Hold', 'Put on hold', reason)
}
export function unholdBatch(batch: PayoutBatch) {
  const back = extStore.get().meta[batch.id]?.holdFrom ?? 'Pending Approval'
  setStatus(batch, back, 'Hold released', `Back to ${back}`)
}

export function addAdjustment(batch: PayoutBatch, line: PayoutLine, after: Paise, reason: string, kind: Adjustment['kind'] = 'Adjustment', mirrorApi = true) {
  const before = effNet(line, extStore.get().adjustments)
  const delta = after - before
  if (delta === 0) return
  const pending = apiEnabled && mirrorApi
  const a: Adjustment = { id: pid('ADJ'), batchId: batch.id, lineId: line.id, atmId: line.atmId, kind, before, after, delta, reason, by: actor(), byId: getSession()?.userId, at: nowIso(), ...(pending ? { status: 'Pending' as const } : {}) }
  if (pending) void papi.apiAdjust(batch.id, line.id, after, reason, kind)
  extStore.set((x) => ({ ...x, adjustments: [a, ...x.adjustments] }))
  logPayout({ by: actor(), area: 'Monthly Payout', ref: `${batch.name} / ${line.atmId}`, action: `${kind} entry`, before: String(before), after: String(after) })
  addTrail(batch.id, `${kind} ${pending ? 'requested' : 'entry'}`, `${line.atmId}: ${amt(before)} → ${amt(after)} — ${reason}${pending ? ' (pending approval)' : ''}`)
}
/** Is this adjustment the current user's own request? (They cannot decide it — maker-checker.) */
export const isOwnAdjustment = (a: Adjustment) => {
  const s = getSession()
  return a.byId ? a.byId === s?.userId : a.by === s?.name
}
/** Checker decision on a Pending adjustment (API: …/adjustments/:adjId/decision; a remark is required to reject). */
export async function decideAdjustment(batch: PayoutBatch, a: Adjustment, decision: 'Approved' | 'Rejected', remark?: string): Promise<boolean> {
  if (apiEnabled) return papi.apiDecideAdjustment(batch.id, a.lineId, a.id, decision, remark)
  extStore.set((x) => ({ ...x, adjustments: x.adjustments.map((y) => (y.id === a.id ? { ...y, status: decision, decidedBy: actor(), decidedAt: nowIso(), remark } : y)) }))
  addTrail(batch.id, `${a.kind} ${decision.toLowerCase()}`, `${a.atmId}: ${a.id}${remark ? ` — ${remark}` : ''}`)
  return true
}
/** Second user confirms a manually entered failure (API: …/lines/:lineId/failure/confirm) — only then it is re-released. */
export async function confirmFailure(batch: PayoutBatch, line: PayoutLine, reason: string): Promise<boolean> {
  if (apiEnabled) return papi.apiConfirmFailure(batch.id, line.id, reason)
  extStore.set((x) => ({ ...x, release: { ...x.release, [line.id]: { ...releaseOf(line, batch, x), failSource: 'Confirmed', by: actor(), at: nowIso() } } }))
  addTrail(batch.id, 'Manual bank failure confirmed', `${line.atmId}: ${reason}`)
  return true
}

// ── release & UTR (§17: Payment Ready/Released/Failed/On Hold; UTR Pending/Paid/Reconciled) ──
export function releaseOf(line: PayoutLine, batch: PayoutBatch, ext: MonthlyExt): Release {
  const r = ext.release[line.id]
  if (r) return r
  if (batch.status === 'Completed') return { pay: 'Released', utrStatus: 'Reconciled', utr: line.utr, paidDate: line.paidDate }
  if (batch.status === 'Released') return { pay: 'Released', utrStatus: line.utr ? 'Paid' : 'Pending', utr: line.utr, paidDate: line.paidDate }
  return { pay: 'Ready', utrStatus: 'Pending' }
}
export function setRelease(batch: PayoutBatch, lines: PayoutLine[], patch: (r: Release, l: PayoutLine) => Release, action: string) {
  const ext = extStore.get()
  const next = { ...ext.release }
  // pin every line's current state first: defaults depend on the batch status, which may change below
  const current = payoutStore.get().batches.find((b) => b.id === batch.id) ?? batch
  payoutStore.get().lines.forEach((l) => {
    if (l.batchId === batch.id && !next[l.id]) next[l.id] = releaseOf(l, current, ext)
  })
  lines.forEach((l) => {
    next[l.id] = { ...patch(releaseOf(l, batch, ext), l), by: actor(), at: nowIso() }
  })
  extStore.set((x) => ({ ...x, release: next }))
  if (apiEnabled) mirrorRelease(batch, lines, next, action)
  addTrail(batch.id, action, `${lines.length} line(s)`)
  logPayout({ by: actor(), area: 'Monthly Payout', ref: batch.name, action, after: `${lines.length} line(s)` })
  // batch status follows its lines
  const all = payoutStore.get().lines.filter((l) => l.batchId === batch.id)
  const st = all.map((l) => next[l.id] ?? releaseOf(l, batch, { ...ext, release: next }))
  const cur = payoutStore.get().batches.find((b) => b.id === batch.id)
  if (!cur) return
  let status: BatchStatus = cur.status
  if (st.length && st.every((r) => r.utrStatus === 'Reconciled')) status = 'Completed'
  else if (st.some((r) => r.pay === 'Released')) status = 'Released'
  if (status !== cur.status) setStatus(cur, status, status === 'Completed' ? 'All UTRs reconciled' : 'Payment released')
}
export const UTR_RE = /^[A-Z0-9]{8,22}$/

/**
 * API mode: "Release" sends every releasable line of the batch to the bank-payout provider (server decides which lines
 * go and which are held); UTR entry / reconcile / failure post the bank-status callback for the chosen lines.
 * Line-level Hold and Back to Ready have no endpoint — the change is refused and the server state reloaded.
 */
function mirrorRelease(batch: PayoutBatch, lines: PayoutLine[], next: Record<string, Release>, action: string) {
  if (action === 'Payment released') {
    void papi.apiRelease(batch.id, batch.paymentMode ?? 'NEFT', batch.bankAccount ?? COMPANY_ACCOUNTS[0], new Date().toISOString().slice(0, 10))
    return
  }
  const results = lines
    .map((l) => ({ l, r: next[l.id] }))
    .filter(({ l }) => papi.isServerId(l.id))
    .flatMap(({ l, r }): { ref: string; status: 'Credited' | 'Failed' | 'Pending'; utr?: string; reason?: string }[] =>
      r.pay === 'Failed' ? [{ ref: l.id, status: 'Failed', reason: r.failReason?.trim() || 'Marked failed by payout user' }] : r.utr && (r.utrStatus === 'Paid' || r.utrStatus === 'Reconciled') ? [{ ref: l.id, status: 'Credited', utr: r.utr }] : [],
    )
  if (results.length) void papi.apiBankStatus(batch.id, results)
  else void papi.mirror(action, () => Promise.reject(new Error(`"${action}" for individual lines is not supported by the backend (only batch release and bank status).`)), [papi.monthlyLoader])
}

// ── export ───────────────────────────────────────────────────────────────
export const REFERENCE_HEADERS = [
  'Month', 'ATM ID', 'Model', 'Cash Live Date', 'Site ID', 'Franchisee Name', 'Master Franchisee', 'Super MF', 'MF Status', 'MF Code', 'Address', 'City', 'State',
  'Cash', 'Non Cash', 'Post Cash', 'Post Non Cash', 'Deposit', 'MF Revenue', 'Franchisee Gross Revenue', 'Fixed Fee / CRA Cost', 'Negative Fixed Fee', 'ICICI SR Recovery',
  'NT Penalty', 'ALF Charges', 'Recovery', 'Waiver', 'Net Franchisee', 'PAN', 'Account Name', 'Acc No', 'Bank', 'IFSC Code', 'Additional Recovery', 'Credit Amount',
  'FR Payout without TDS', 'TDS/GST %', 'TDS / GST Amount', 'Net Payout', 'Remarks', 'Release date', 'Credit status', 'Paid Date', 'UTR',
]
export function downloadTemplate() {
  downloadCsv('Monthly_Payout_Template', REFERENCE_HEADERS, [])
}
const r2 = (p: Paise) => (p / 100).toFixed(2)
export function exportBatch(batch: PayoutBatch, ext: MonthlyExt) {
  const lines = payoutStore.get().lines.filter((l) => l.batchId === batch.id)
  const headers = [...REFERENCE_HEADERS.filter((h) => !['Address', 'MF Status', 'Account Name', 'Bank', 'IFSC Code'].includes(h)), 'Adjustments', 'Net after Adjustments', 'Payment Status', 'UTR Status']
  const rows = lines.map((l) => {
    const d = { ...ZERO_DED, ...l.ded }
    const netFr = l.gross - d.fixedFee - d.iciciSr - d.ntPenalty - d.alf - d.recovery + d.negativeFixedFee + d.waiver
    const rel = releaseOf(l, batch, ext)
    const adj = adjOf(l.id, ext.adjustments)
    return [
      monthLabel(l.month), l.atmId, l.model, l.cashLiveDate, l.siteId, l.frName, l.mfName, l.smfName, l.mfCode, l.city, l.state,
      String(l.txn.cash), String(l.txn.nonCash), String(l.txn.postCash), String(l.txn.postNonCash), String(l.txn.deposit), r2(l.mfRevenue), r2(l.gross), r2(d.fixedFee), r2(d.negativeFixedFee), r2(d.iciciSr),
      r2(d.ntPenalty), r2(d.alf), r2(d.recovery), r2(d.waiver), r2(netFr), l.pan, ext.lineMeta[l.id]?.accountNo ?? '', r2(d.additionalRecovery), r2(d.credit),
      r2(l.withoutTds), `${l.taxPct}%`, r2(l.taxAmt), r2(l.net), l.remarks ?? '', l.releaseDate ?? '', l.creditStatus ?? '', rel.paidDate ?? l.paidDate ?? '', rel.utr ?? l.utr ?? '',
      r2(adj), r2(l.net + adj), rel.pay, rel.utrStatus,
    ]
  })
  downloadCsv(`${batch.name}_lines`, headers, rows)
}
