// Franchise-scoped read models for the mobile app (alerts, broadcasts, payout, complaints) built from the shared
// web stores, plus the few small persisted stores for app-only state (read / acknowledged flags, local uploads,
// indent confirmations) that no web store holds yet.
import { useEffect, useMemo } from 'react'
import { createStore } from '@/lib/store'
import { apiEnabled, get } from '@/lib/api'
import { createLoader } from '@/data/opsApi'
import { useBroadcasts, type BroadcastRecord } from '@/data/broadcasts'
import { atmById, complaintStore, type Complaint } from '@/data/complaints'
import { dossierFor } from '@/data/franchises'
import { DOC_META, docTitle, pendingLine, useLegal } from '@/data/legal'
import { usePayout, type PayoutBatch, type PayoutLine } from '@/data/payout'
import { cbrMaster } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { useWorkflow, wfStore, type Notice } from '@/data/workflow'
import { useMobileUser, useMyScope } from './mobileSession'

// ── app-only persisted state ─────────────────────────────────────────────
/** accountId → broadcastId → acknowledged at (ISO). */
export const broadcastAckStore = createStore<Record<string, Record<string, string>>>('dexter.mobile.broadcastAcks.v1', () => ({}))
/** accountId → derived alert ids already read. */
export const alertReadStore = createStore<Record<string, string[]>>('dexter.mobile.alertsRead.v1', () => ({}))
/** CBR / Cash Loading record id → franchise indent confirmation. */
export type IndentConfirmation = { at: string; by: string; amount: number; note?: string }
export const indentConfirmStore = createStore<Record<string, IndentConfirmation>>('dexter.mobile.indentConfirm.v1', () => ({}))
/** Generic franchise uploads from the Upload Center (no web store for these yet). */
export type MobileUpload = { id: string; frId: string; category: string; siteId: string; atmId: string; title: string; remarks: string; fileName: string; sizeKb: number; at: string; by: string; status: 'Pending Verification' | 'Approved' | 'Rejected' }
export const mobileUploadStore = createStore<MobileUpload[]>('dexter.mobile.uploads.v1', () => [])
/** Franchise-added KYC documents (Legal › KYC) pending CRM review. */
export type KycUpload = { id: string; frId: string; docType: string; docNumber: string; fileName: string; sizeKb: number; notes: string; at: string; by: string }
export const kycUploadStore = createStore<KycUpload[]>('dexter.mobile.kycUploads.v1', () => [])

// ── broadcasts ───────────────────────────────────────────────────────────
export const isForFranchisees = (b: BroadcastRecord) =>
  /franchis/i.test(b.audience) || (b.audienceGroups ?? []).some((g) => /franchis/i.test(g)) || /^all\b/i.test(b.audience)
export type BroadcastCategory = 'Policies' | 'Circulars' | 'Holidays' | 'Compliance' | 'Greetings'
export function broadcastCategory(b: BroadcastRecord): BroadcastCategory {
  const t = `${b.type} ${b.title}`.toLowerCase()
  if (/greet|wish|festival/.test(t)) return /holiday|closure/.test(t) ? 'Holidays' : 'Greetings'
  if (/holiday|closure/.test(t)) return 'Holidays'
  if (/policy/.test(t)) return 'Policies'
  if (/complian|kyc|audit|rbi|mandatory/.test(t)) return 'Compliance'
  return 'Circulars'
}
export function useFranchiseBroadcasts() {
  const { broadcasts } = useBroadcasts()
  const user = useMobileUser()
  const acks = broadcastAckStore.use()
  const mine = acks[user?.accountId ?? ''] ?? {}
  const list = useMemo(() => broadcasts.filter((b) => b.status === 'Published' && isForFranchisees(b)), [broadcasts])
  const acknowledge = (id: string) => {
    if (!user) return
    broadcastAckStore.set((s) => ({ ...s, [user.accountId]: { ...(s[user.accountId] ?? {}), [id]: new Date().toISOString() } }))
  }
  return { list, acks: mine, acknowledge }
}

// ── complaints ───────────────────────────────────────────────────────────
export const complaintFrId = (c: Complaint) => atmById(c.atmId)?.franchiseId
export function useMyComplaints() {
  const all = complaintStore.use()
  const { frId, atmIds } = useMyScope()
  return useMemo(() => all.filter((c) => atmIds.has(c.atmId) || complaintFrId(c) === frId), [all, frId, atmIds])
}

// ── payout ───────────────────────────────────────────────────────────────
const BATCH_RANK: Record<string, number> = { Completed: 7, Released: 6, Approved: 5, Validated: 4, 'Pending Approval': 3, Uploaded: 2, 'On Hold': 1, Draft: 0, Rejected: -1 }
export type MonthPayout = { month: string; batch: PayoutBatch; lines: PayoutLine[]; net: number; gross: number; tds: number; txns: number; credited: boolean; paidDate?: string; utr?: string }
/** One statement per month for this franchise: the most advanced batch of that month (Draft / Rejected excluded). */
/**
 * API mode: the franchise's own released / paid lines from GET /payout/self/payouts (Franchisee only; staff previewing
 * the app see nothing here because the staff payout stores are not franchise-scoped).
 */
type SelfLine = { month: string; atmId: string; siteId: string; txn: PayoutLine['txn']; gross: number; deductions: PayoutLine['ded']; taxPct: number; taxAmt: number; net: number; pay: string; utrStatus: string; utr?: string; paidDate?: string }
const selfPayoutStore = createStore<SelfLine[]>('dexter.mobile.selfPayout.api', () => [])
const selfPayoutLoader = createLoader('your payout statements', async () => {
  const r = await get<{ items: SelfLine[] }>('/payout/self/payouts')
  selfPayoutStore.set(r.items)
})
const fyOfMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  const start = mo >= 4 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
function selfPayoutMonths(items: SelfLine[], frId: string): MonthPayout[] {
  const byMonth = new Map<string, SelfLine[]>()
  items.forEach((l) => byMonth.set(l.month, [...(byMonth.get(l.month) ?? []), l]))
  return [...byMonth.entries()]
    .map(([month, ls]) => {
      const credited = ls.every((l) => l.utrStatus === 'Reconciled' || l.utrStatus === 'Paid')
      const lines: PayoutLine[] = ls.map((l, i) => ({
        id: `${month}-${l.atmId}-${i}`, batchId: `SELF-${month}`, source: 'Auto', month, atmId: l.atmId, siteId: l.siteId, model: '', cashLiveDate: '', frId, frName: '', mfName: '', smfName: '', mfCode: '',
        city: '', state: '', txn: l.txn, ded: l.deductions, gross: l.gross, mfRevenue: 0, taxPct: l.taxPct, taxAmt: l.taxAmt, withoutTds: l.net + l.taxAmt, net: l.net, pan: '',
        creditStatus: l.utrStatus === 'Reconciled' ? 'Credited' : l.pay === 'Failed' ? 'Failed' : 'Pending', paidDate: l.paidDate, utr: l.utr,
      }))
      const batch: PayoutBatch = {
        id: `SELF-${month}`, name: `Payout ${month}`, fy: fyOfMonth(month), month, type: 'Auto Reconciliation', vertical: 'Franchise Model', records: lines.length,
        gross: lines.reduce((a, l) => a + l.gross, 0), gst: 0, tds: lines.reduce((a, l) => a + l.taxAmt, 0), net: lines.reduce((a, l) => a + l.net, 0),
        status: credited ? 'Completed' : 'Released', maker: '—', createdAt: `${month}-01`,
      }
      return {
        month, batch, lines, net: batch.net, gross: batch.gross, tds: batch.tds, txns: lines.reduce((a, l) => a + l.txn.cash + l.txn.nonCash, 0), credited,
        paidDate: credited ? lines.map((l) => l.paidDate).filter(Boolean).sort().pop() : undefined, utr: credited ? lines[0]?.utr : undefined,
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

export function useMyPayout() {
  const { batches, lines } = usePayout()
  const { frId } = useMyScope()
  const self = selfPayoutStore.use()
  const isFranchisee = useMobileUser()?.role === 'Franchisee'
  useEffect(() => {
    if (apiEnabled && isFranchisee) void selfPayoutLoader.load()
  }, [isFranchisee])
  const apiMonths = useMemo(() => (apiEnabled && isFranchisee ? selfPayoutMonths(self, frId) : null), [self, frId, isFranchisee])
  const mock = useMemo<MonthPayout[]>(() => {
    const mine = lines.filter((l) => l.frId === frId)
    const byMonth = new Map<string, MonthPayout>()
    batches
      .filter((b) => (BATCH_RANK[b.status] ?? 0) >= 2)
      .forEach((b) => {
        const ls = mine.filter((l) => l.batchId === b.id)
        if (!ls.length) return
        const cur = byMonth.get(b.month)
        if (cur && (BATCH_RANK[cur.batch.status] ?? 0) >= (BATCH_RANK[b.status] ?? 0)) return
        const credited = (b.status === 'Completed' || b.status === 'Released') && ls.every((l) => l.creditStatus === 'Credited')
        byMonth.set(b.month, {
          month: b.month,
          batch: b,
          lines: ls,
          net: ls.reduce((s, l) => s + l.net, 0),
          gross: ls.reduce((s, l) => s + l.gross, 0),
          tds: ls.reduce((s, l) => s + l.taxAmt, 0),
          txns: ls.reduce((s, l) => s + l.txn.cash + l.txn.nonCash, 0),
          credited,
          paidDate: credited ? ls.map((l) => l.paidDate).filter(Boolean).sort().pop() : undefined,
          utr: credited ? ls[0]?.utr : undefined,
        })
      })
    return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month))
  }, [batches, lines, frId])
  return apiMonths ?? mock
}

// ── alerts (workflow notices + derived franchise events) ─────────────────
export type AlertType = 'approved' | 'updated' | 'payout' | 'reminder'
export type MobileAlert = { id: string; title: string; subtitle: string; at: string; read: boolean; type: AlertType; targetRoute?: string; noticeId?: string }
const MODULE_ROUTE: Record<string, string> = { Reconciliation: 'chargeback', 'Site Installation': 'sites', Legal: 'legal', 'WLA Statement': 'downloads', 'TDS Letter': 'downloads', CBR: 'cbr', 'Cash Loading': 'cbr', EOD: 'eod', Complaint: 'complaints', Finance: 'payout' }
const rupee = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

export function useMobileAlerts() {
  const user = useMobileUser()
  const { frId, franchise, atmIds } = useMyScope()
  const wf = useWorkflow()
  const legal = useLegal()
  const payout = useMyPayout()
  const complaints = useMyComplaints()
  const cbr = cbrMaster.store.use()
  const cl = clMaster.store.use()
  const readMap = alertReadStore.use()
  const read = useMemo(() => new Set(readMap[user?.accountId ?? ''] ?? []), [readMap, user?.accountId])

  const alerts = useMemo<MobileAlert[]>(() => {
    const out: MobileAlert[] = []
    // 1) workflow notices addressed to this franchise / user
    const to = new Set([franchise ? `franchise:${franchise.name}` : '', franchise ? (dossierFor(franchise).email ?? '') : '', user?.email ?? ''].filter(Boolean).map((x) => x.toLowerCase()))
    wf.notices
      .filter((n: Notice) => to.has(n.to.toLowerCase()))
      .forEach((n) => out.push({ id: n.id, noticeId: n.id, title: `${n.module} update`, subtitle: n.text, at: n.at, read: n.read, type: /approv|accept|verified/i.test(n.text) ? 'approved' : /remind|due|pending|overdue/i.test(n.text) ? 'reminder' : 'updated', targetRoute: MODULE_ROUTE[n.module] }))
    // 2) legal documents awaiting the franchise
    const legalSites = new Set(legal.sites.filter((s) => s.franchiseId === frId).map((s) => s.id))
    legal.docs
      .filter((d) => legalSites.has(d.siteId) && (d.status === 'Action Required' || d.status === 'Resubmission Required'))
      .forEach((d) => {
        const v = d.versions[d.versions.length - 1]
        out.push({ id: `LEG-${d.id}-${d.version}-${d.status}`, title: d.status === 'Resubmission Required' ? `${docTitle(d)} – resubmit` : `${docTitle(d)} – signature needed`, subtitle: pendingLine(d), at: d.uploads[d.uploads.length - 1]?.reviewedAt ?? v?.sharedAt ?? v?.createdAt ?? '', read: false, type: 'reminder', targetRoute: 'legal' })
      })
    legal.docs
      .filter((d) => legalSites.has(d.siteId) && d.status === 'Approved')
      .forEach((d) => {
        const up = [...d.uploads].reverse().find((u) => u.decision === 'Approved')
        if (up?.reviewedAt) out.push({ id: `LEGOK-${d.id}-${up.id}`, title: `${DOC_META[d.kind].short} approved`, subtitle: `Signed ${docTitle(d)} verified by the legal team`, at: up.reviewedAt, read: false, type: 'approved', targetRoute: 'legal' })
      })
    // 3) payout credited
    payout.filter((p) => p.credited).forEach((p) => out.push({ id: `PAY-${p.batch.id}`, title: 'Payout Processed', subtitle: `${monthName(p.month)} – ${rupee(p.net)}`, at: p.paidDate ? `${p.paidDate}T10:00:00.000Z` : p.batch.createdAt, read: false, type: 'payout', targetRoute: 'payout' }))
    // 4) complaints resolved / updated
    complaints.forEach((c) => {
      if (c.status === 'Closed' && c.closedAt) out.push({ id: `CMP-${c.id}-closed`, title: 'Complaint Resolved', subtitle: `${c.id} · ${c.atmId} · ${c.title}`, at: c.closedAt, read: false, type: 'approved', targetRoute: 'complaints' })
      else if (c.docket && c.docket !== 'NA') out.push({ id: `CMP-${c.id}-docket-${c.docket}`, title: 'Complaint docket assigned', subtitle: `${c.id} · Docket ${c.docket} · ${c.subStatus}`, at: c.respondedAt ?? c.receivedAt, read: false, type: 'updated', targetRoute: 'complaints' })
    })
    // 5) CBR / Cash Loading decisions on own submissions
    ;[...cbr, ...cl]
      .filter((r) => r.frId === frId || atmIds.has(r.atmId))
      .forEach((r) => {
        const last = r.statusLog[r.statusLog.length - 1]
        if (!last) return
        if (r.status === 'Approved' || r.status === 'Returned for Correction' || r.status === 'Rejected')
          out.push({ id: `CASH-${r.id}-${r.status}`, title: `${r.kind} ${r.status === 'Approved' ? 'approved' : r.status === 'Rejected' ? 'rejected' : 'returned'}`, subtitle: `${r.id} · ${r.atmId}${r.status !== 'Approved' && r.trail.returnReason ? ` — ${r.trail.returnReason}` : ''}`, at: last.at, read: false, type: r.status === 'Approved' ? 'approved' : 'reminder', targetRoute: 'cbr' })
      })
    return out
      .filter((a) => a.at)
      .map((a) => (a.noticeId ? a : { ...a, read: read.has(a.id) }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 40)
  }, [wf.notices, legal, payout, complaints, cbr, cl, frId, franchise, atmIds, user?.email, read])

  const markRead = (a: MobileAlert) => {
    if (a.noticeId) wfStore.set((s) => ({ ...s, notices: s.notices.map((n) => (n.id === a.noticeId ? { ...n, read: true } : n)) }))
    else if (user) alertReadStore.set((s) => ({ ...s, [user.accountId]: [...new Set([...(s[user.accountId] ?? []), a.id])].slice(-500) }))
  }
  const markAllRead = () => alerts.filter((a) => !a.read).forEach(markRead)
  return { alerts, unread: alerts.filter((a) => !a.read).length, markRead, markAllRead }
}
