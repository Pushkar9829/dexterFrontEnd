// Live read-only snapshot of every Operations master / transaction store (§13, §16 "reports read from
// authorized master / transaction records"). All module-store access for the AI / MIS / Masters pages is
// isolated here, so a module data-shape change only needs this adapter updated.
import { useEffect, useMemo } from 'react'
import { apiEnabled } from '@/lib/api'
import { dailyLoader, uploadLoader } from '@/data/cbr'
import { eodLoader } from '@/data/eodStore'
import { txnLoader } from '@/data/txnData'
import { ftdLoader } from '@/data/failedTxnDisputes'
import { cbLoader } from '@/data/chargeBackDisputes'
import { wlaLoader } from '@/data/wlaStatements'
import { tdsLoader } from '@/data/tdsLetters'
import { daakLoader } from '@/data/daakData'
import { complaintLoader } from '@/data/complaints'
import { opsMeIntelLoader, opsMeStore } from './opsData'
import { CBR_DATES, EOD_DATES, cbrMaster, dailyForSite, dailyStore, uploadKey, uploadStore, type CashRecord, type DailyCbr } from '@/data/cbr'
import { SITES, FRANCHISEES } from '@/data/cbrSites'
import { cashLoadingRegisterStore, clMaster } from '@/data/cashLoadingRegisterStore'
import { eodStore } from '@/data/eodStore'
import { txnStore } from '@/data/txnData'
import { disputeStore } from '@/data/failedTxnDisputes'
import { cbStage, cbStatus, chargeBackStore, isCbOverdue } from '@/data/chargeBackDisputes'
import { wlaStore } from '@/data/wlaStatements'
import { tdsStore } from '@/data/tdsLetters'
import { daakStore } from '@/data/daakData'
import { businessStore } from '@/data/payout'
import { complaintStore } from '@/data/complaints'
import { addressStore, hierarchyStore, templateStore, wfStore } from '@/data/workflow'
import { siteStore } from '@/data/network'
import { franchiseStore } from '@/data/franchises'
import { CURRENT_MONTH, MONTHS, buildMonthly, monthlyStore, type MonthlyRow } from '@/pages/operations/eod2/monthly'

/**
 * API mode: hydrate every Operations store the AI / MIS / Masters pages read — only for modules the signed-in
 * user may view (GET /ops-permissions/me), so missing rights don't produce a burst of 403 toasts.
 * (CBR / Cash Loading masters hydrate themselves on first use.)
 */
function useHydrateSources() {
  const me = opsMeStore.use()
  useEffect(() => {
    if (!apiEnabled) return
    if (!me) return void opsMeIntelLoader.load()
    const can = (m: string) => me.role === 'Super Admin' || (me.modules[m] ?? []).length > 0
    const plan: [boolean, { load(): Promise<void> }][] = [
      [can('CBR'), dailyLoader],
      [can('CBR'), uploadLoader],
      [can('Routine EOD') || can('Cash Audit EOD'), eodLoader],
      [can('Transaction Data'), txnLoader],
      [can('Field Transaction Dispute'), ftdLoader],
      [can('Chargeback Dispute'), cbLoader],
      [can('WLA Statement'), wlaLoader],
      [can('TDS Letter'), tdsLoader],
      [can('Postal / Courier'), daakLoader],
      [can('Complaint'), complaintLoader],
    ]
    for (const [ok, l] of plan) if (ok) void l.load()
  }, [me])
}

export function useOpsSources() {
  useHydrateSources()
  const daily = dailyStore.use()
  const uploads = uploadStore.use()
  const cbr: CashRecord[] = cbrMaster.store.use()
  const cl: CashRecord[] = clMaster.store.use()
  const register = cashLoadingRegisterStore.use()
  const eod = eodStore.use()
  const monthlyMeta = monthlyStore.use()
  const txn = txnStore.use()
  const disputes = disputeStore.use()
  const chargebacks = chargeBackStore.use()
  const wla = wlaStore.use()
  const tds = tdsStore.use()
  const daak = daakStore.use()
  const business = businessStore.use()
  const complaints = complaintStore.use()
  const wf = wfStore.use()
  const hierarchy = hierarchyStore.use()
  const templates = templateStore.use()
  const addresses = addressStore.use()
  const sites = siteStore.use()
  const franchises = franchiseStore.use()
  const norm = useMemo(() => normalize(txn.records, disputes, chargebacks, wla, tds), [txn, disputes, chargebacks, wla, tds])
  const cbrDaily = useMemo<DailyCbr[]>(() => {
    void daily // dailyForSite reads edits from dailyStore; recompute when they change
    return SITES.flatMap((s) => dailyForSite(s.siteId))
  }, [daily])
  const monthly = useMemo<MonthlyRow[]>(
    () => MONTHS.flatMap((m) => sites.sites.map((s) => buildMonthly(s, m, monthlyMeta)).filter((r): r is MonthlyRow => !!r)),
    [sites, monthlyMeta],
  )
  // One stable object per store change, so consumers' useMemo([s]) only recompute when data changes.
  return useMemo(
    () => ({
      cbr, cl, cbrDaily, uploads, register, eod: eod.records, eodHistory: eod.history, monthly, ...norm,
      inward: daak.inward, outward: daak.outward, alf: business.alf, forecasts: business.forecasts, complaints, wf, hierarchy, templates, addresses,
      sites: sites.sites, franchises,
    }),
    [cbr, cl, cbrDaily, uploads, register, eod, monthly, norm, daak, business, complaints, wf, hierarchy, templates, addresses, sites, franchises],
  )
}
export type OpsSources = ReturnType<typeof useOpsSources>

// ── Normalised rows (module record shapes → stable shapes used by AI / MIS) ──
export type NTxn = { id: string; date: string; atmId: string; siteId: string; franchise: string; funding: string; count: number; amount: number; withdrawals: number; deposits: number; status: string }
export type NDispute = { id: string; date: string; atmId: string; siteId: string; franchise: string; funding: string; amount: number; rrn: string; utr: string; txnId: string; slip: string; bank: string; txnType: string; status: string; open: boolean; createdAt: string }
export type NChargeback = { id: string; caseRef: string; source: string; date: string; atmId: string; siteId: string; franchise: string; funding: string; rrn: string; amount: number; stage: string; status: string; open: boolean; overdue: boolean; frResponded: boolean; receivedAt: string; dueAt: string }
export type NWla = { id: string; period: string; atmId: string; siteId: string; franchise: string; account: string; bank: string; status: string; uploadedAt: string; channel: string }
export type NTds = { id: string; fy: string; period: string; franchise: string; docType: string; amount: number; uploadedAt: string; status: string }
const CLOSED_DISPUTE = new Set(['Resolved', 'Closed', 'Rejected'])
function normalize(
  txn: ReturnType<typeof txnStore.get>['records'],
  disputes: ReturnType<typeof disputeStore.get>,
  chargebacks: ReturnType<typeof chargeBackStore.get>,
  wla: ReturnType<typeof wlaStore.get>,
  tds: ReturnType<typeof tdsStore.get>,
) {
  const now = Date.now()
  const sitesNow = siteStore.get().sites
  const fundingOfSite = (siteId: string) => {
    const st = sitesNow.find((x) => x.siteId === siteId)?.siteType
    return st === 'FFM' ? 'Full Funding' : st === 'SF' ? 'Self Funding' : st === 'BM' ? 'Business Model' : st ? 'CRA' : '—'
  }
  return {
    txn: txn.map<NTxn>((r) => ({ id: r.id, date: toIso(r.txnDate), atmId: r.atmId, siteId: r.siteId, franchise: r.franchiseName, funding: fundingOfSite(r.siteId), count: r.txnCount, amount: r.amount, withdrawals: r.withdrawalCount, deposits: r.depositCount, status: r.verification })),
    disputes: disputes.map<NDispute>((d) => ({ id: d.id, date: toIso(d.txnDate), atmId: d.atmId, siteId: d.siteId, franchise: d.franchiseName, funding: d.fundingModel, amount: d.amount, rrn: d.rrn, utr: d.utr, txnId: d.txnId, slip: d.txnSlipName ?? '', bank: d.bankName, txnType: d.txnType, status: d.status, open: !CLOSED_DISPUTE.has(d.status), createdAt: d.createdAt })),
    chargebacks: chargebacks.map<NChargeback>((c) => ({ id: c.id, caseRef: c.caseRef, source: c.source, date: toIso(c.txnDate), atmId: c.atmId, siteId: c.siteId, franchise: c.franchiseName, funding: c.fundingModel, rrn: c.rrn, amount: c.disputeAmount, stage: cbStage(c), status: cbStatus(c, now), open: !c.closure, overdue: isCbOverdue(c, now), frResponded: !!c.evidence, receivedAt: c.receivedAt, dueAt: c.dueAt })),
    wla: wla.map<NWla>((w) => ({ id: w.id, period: w.period, atmId: w.atmId, siteId: w.siteId, franchise: w.franchiseName, account: w.wlaAccount, bank: w.bank, status: w.status, uploadedAt: toIso(w.uploadedAt), channel: w.channel })),
    tds: tds.map<NTds>((t) => ({ id: t.id, fy: t.fy, period: t.period, franchise: t.franchiseName, docType: t.docType, amount: t.tdsAmount ?? 0, uploadedAt: toIso(t.uploadedAt), status: t.status })),
  }
}

export const cbrFranchise = (franchiseId: string) => FRANCHISEES.find((f) => f.id === franchiseId)?.name ?? franchiseId
export const cbrSiteByAtm = (atmId: string) => SITES.find((s) => s.atmId === atmId)
export const CLOSED_MONTH = (m: string) => m < CURRENT_MONTH
export { SITES as CBR_SITES, CBR_DATES, EOD_DATES, uploadKey, CURRENT_MONTH }

/** Normalise the many date formats used by the module stores to yyyy-mm-dd ('' when unknown). */
export function toIso(d?: string): string {
  if (!d) return ''
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = /^(\d{2})[-/.](\d{2})[-/.](\d{4})/.exec(d)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const t = Date.parse(d)
  return Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10)
}
export const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[,₹\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
/** 'October 2026' / 'Oct-2026' / '2026-10' → '2026-10'. */
export function toMonth(m?: string): string {
  if (!m) return ''
  const a = /^(\d{4})-(\d{2})/.exec(m)
  if (a) return `${a[1]}-${a[2]}`
  const b = /^([A-Za-z]+)[\s-]+(\d{4})/.exec(m)
  if (b) {
    const i = MONTH_NAMES.findIndex((x) => x.startsWith(b[1].toLowerCase().slice(0, 3)))
    if (i >= 0) return `${b[2]}-${String(i + 1).padStart(2, '0')}`
  }
  return toIso(m).slice(0, 7)
}
export const PENDING_CASH = new Set(['Draft', 'Submitted', 'Pending Verification', 'Returned for Correction', 'Verified', 'Pending Approval'])
export const OPEN_TASK = new Set(['Pending', 'In Progress', 'Overdue'])
export const isOverdueTask = (t: { status: string; dueAt: string }, now: number) => OPEN_TASK.has(t.status) && (t.status === 'Overdue' || Date.parse(t.dueAt) < now)
