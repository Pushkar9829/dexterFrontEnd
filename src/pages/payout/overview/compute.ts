// Payout Overview — read-only aggregation layer over the shared payout stores (spec §4, §5.3, §7).
// All money stays in INTEGER PAISE. Nothing here writes financial values; the only stores owned by this
// folder are MF adjustments (hold / recovery / debit / credit / UTR, audited) and AI alert reviews.
import { useMemo } from 'react'
import { createStore } from '@/lib/store'
import { getSession } from '@/lib/auth'
import {
  accountStore,
  bmPnl,
  businessStore,
  calcFranchise,
  DEDUCTION_LABELS,
  financeRulesStore,
  inrP,
  logPayout,
  payoutStore,
  planMappingStore,
  planStore,
  sumP,
  tlStore,
  type BeneficiaryAccount,
  type BmPayout,
  type BmSite,
  type BusinessState,
  type Deductions,
  type FinanceRules,
  type Paise,
  type PayoutBatch,
  type PayoutLine,
  type PayoutPlan,
  type PayoutState,
  type PlanMapping,
  type TlRule,
  type TlShare,
} from '@/data/payout'

// ── formatting (display only — never used for arithmetic) ────────────────
/** Exact rupee string from paise without floating point: 123456 → "1234.56". */
export const rs = (p: Paise) => {
  const a = Math.abs(Math.round(p))
  return `${p < 0 ? '-' : ''}${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`
}
export const inr0 = (p: Paise) => (p < 0 ? `-${inrP(-p, 0)}` : inrP(p, 0))
export const inr2 = (p: Paise) => (p < 0 ? `-${inrP(-p)}` : inrP(p))
export const signed = (p: Paise) => (p > 0 ? `+${inrP(p, 0)}` : p < 0 ? `-${inrP(-p, 0)}` : inrP(0, 0))
/** percentage for display, one decimal (ratio of two integers) */
export const pct1 = (num: number, den: number) => (den ? Math.round((num * 1000) / den) / 10 : 0)
export const actor = () => getSession()?.name ?? 'Paras Dubey'
export const logExport = (name: string) => (n: number) => logPayout({ by: actor(), area: 'Payout Overview', ref: name, action: `Exported ${n} rows (CSV)` })

export const prevMonthOf = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`
}
export const nextMonthOf = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}
export const fyOfMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  const start = mo >= 4 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
export { median }

// ── own stores ───────────────────────────────────────────────────────────
export type MfAdj = { hold: Paise; recovery: Paise; debit: Paise; credit: Paise; taxPct: number | null; utr?: string; paidDate?: string; remarks?: string; updatedAt: string; updatedBy: string }
export const mfAdjStore = createStore<Record<string, MfAdj>>('dexter.payout.overview.mfAdj.v1', () => ({}))
export const mfKey = (month: string, mf: string) => `${month}|${mf}`

export type AlertReview = { status: 'Acknowledged' | 'Dismissed'; by: string; at: string; note?: string }
export const alertReviewStore = createStore<Record<string, AlertReview>>('dexter.payout.overview.alertReview.v1', () => ({}))

// ── snapshot of every store the overview reads ───────────────────────────
export type Snapshot = {
  payout: PayoutState
  business: BusinessState
  plans: PayoutPlan[]
  accounts: BeneficiaryAccount[]
  tl: { rules: TlRule[]; shares: TlShare[] }
  rules: FinanceRules
  mappings: PlanMapping[]
  mfAdj: Record<string, MfAdj>
}
export function useSnapshot(): Snapshot {
  const payout = payoutStore.use()
  const business = businessStore.use()
  const plans = planStore.use()
  const accounts = accountStore.use()
  const tl = tlStore.use()
  const rules = financeRulesStore.use()
  const mappings = planMappingStore.use()
  const mfAdj = mfAdjStore.use()
  return useMemo(() => ({ payout, business, plans, accounts, tl, rules, mappings, mfAdj }), [payout, business, plans, accounts, tl, rules, mappings, mfAdj])
}

// ── Franchise Model: one row per ATM per month, three sources side by side ──
export type PayStatus = 'Pending' | 'Paid' | 'Hold' | 'Failed'
export type FrRecon = 'Matched' | 'Variance Found' | 'Data Pending'
export type FrRow = {
  key: string
  month: string
  fy: string
  atmId: string
  siteId: string
  frId: string
  frName: string
  mfName: string
  smfName: string
  state: string
  city: string
  category: string
  manual?: PayoutLine
  file?: PayoutLine
  auto?: PayoutLine
  /** record used for payable figures: Auto (plan engine) → File → Manual */
  line: PayoutLine
  batch?: PayoutBatch
  payStatus: PayStatus
  recon: FrRecon
  mVa: Paise | null
  fVa: Paise | null
  mVf: Paise | null
  maxAbs: Paise
  remark: string
  duplicates: number
  tlBase: Paise
  tlIds: string[]
  acct: 'Verified' | 'Pending' | 'Missing'
}

export function payStatusOf(line: PayoutLine, batch?: PayoutBatch): PayStatus {
  if (batch?.status === 'On Hold' || line.creditStatus === 'On Hold') return 'Hold'
  if (batch?.status === 'Rejected' || line.creditStatus === 'Failed') return 'Failed'
  if (batch && (batch.status === 'Released' || batch.status === 'Completed') && line.creditStatus === 'Credited') return 'Paid'
  return 'Pending'
}

const DED_KEYS = Object.keys(DEDUCTION_LABELS) as (keyof Deductions)[]
/** First component that differs between the available sources — the variance reason. */
export function varianceReason(ls: PayoutLine[]): string {
  if (ls.length < 2) return 'Source data missing'
  const diff = (get: (l: PayoutLine) => number) => {
    const v = ls.map(get)
    return Math.max(...v) - Math.min(...v)
  }
  if (new Set(ls.map((l) => l.planCode ?? '')).size > 1) return 'Plan mapping mismatch'
  const t = ls[0].txn
  if (ls.some((l) => l.txn.cash !== t.cash || l.txn.nonCash !== t.nonCash || l.txn.postCash !== t.postCash || l.txn.postNonCash !== t.postNonCash || l.txn.deposit !== t.deposit)) return 'Transaction count difference'
  for (const k of DED_KEYS) {
    const d = diff((l) => l.ded[k])
    if (d) return `${DEDUCTION_LABELS[k]} difference ${inr0(d)}`
  }
  if (diff((l) => l.gross)) return 'Gross revenue difference'
  if (diff((l) => l.taxAmt)) return 'TDS / GST difference'
  return 'All values matched'
}

export function buildFrRows(s: Snapshot): FrRow[] {
  const batchById = new Map(s.payout.batches.map((b) => [b.id, b]))
  const planByCode = new Map(s.plans.map((p) => [p.code, p]))
  const groups = new Map<string, PayoutLine[]>()
  s.payout.lines.forEach((l) => {
    const k = `${l.month}|${l.atmId}`
    const g = groups.get(k)
    if (g) g.push(l)
    else groups.set(k, [l])
  })
  const tol = s.rules.varianceTolerance ?? 0
  const acctOf = (frId: string): FrRow['acct'] => {
    const xs = s.accounts.filter((a) => a.beneficiaryId === frId && a.status !== 'Superseded' && a.status !== 'Rejected')
    if (!xs.length) return 'Missing'
    return xs.some((a) => a.status === 'Active' && a.kycVerified) ? 'Verified' : 'Pending'
  }
  const out: FrRow[] = []
  groups.forEach((ls, key) => {
    const pick = (src: PayoutLine['source']) => ls.find((l) => l.source === src)
    const manual = pick('Manual')
    const file = pick('File-Based')
    const auto = pick('Auto')
    const line = (auto ?? file ?? manual) as PayoutLine
    const present = [manual, file, auto].filter(Boolean) as PayoutLine[]
    const counts = new Map<string, number>()
    ls.forEach((l) => counts.set(l.source, (counts.get(l.source) ?? 0) + 1))
    const duplicates = [...counts.values()].reduce((a, n) => a + Math.max(0, n - 1), 0)
    const mVa = manual && auto ? manual.net - auto.net : null
    const fVa = file && auto ? file.net - auto.net : null
    const mVf = manual && file ? manual.net - file.net : null
    const maxAbs = Math.max(0, ...[mVa, fVa, mVf].filter((x) => x !== null).map((x) => Math.abs(x)))
    const recon: FrRecon = present.length < 3 ? 'Data Pending' : maxAbs > tol ? 'Variance Found' : 'Matched'
    const batch = batchById.get(line.batchId)
    const plan = planByCode.get(line.planCode ?? '')
    const tlBase = plan ? calcFranchise(plan, line.txn, line.ded, line.taxPct).tlBase : 0
    out.push({
      key,
      month: line.month,
      fy: batch?.fy ?? fyOfMonth(line.month),
      atmId: line.atmId,
      siteId: line.siteId,
      frId: line.frId,
      frName: line.frName,
      mfName: line.mfName || '—',
      smfName: line.smfName || '—',
      state: line.state,
      city: line.city,
      category: plan?.siteCategory ?? 'WLA ATM',
      manual,
      file,
      auto,
      line,
      batch,
      payStatus: payStatusOf(line, batch),
      recon,
      mVa,
      fVa,
      mVf,
      maxAbs,
      remark: recon === 'Matched' ? 'All values matched' : varianceReason(present),
      duplicates,
      tlBase,
      tlIds: s.tl.rules.filter((r) => r.siteAtmIds.includes(line.atmId)).map((r) => r.tlId),
      acct: acctOf(line.frId),
    })
  })
  return out.sort((a, b) => (a.month === b.month ? a.atmId.localeCompare(b.atmId) : a.month < b.month ? 1 : -1))
}

// ── Business Model: one row per BM site per month ───────────────────────
export type BmRow = {
  key: string
  month: string
  fy: string
  site: BmSite
  categoryName: string
  payout?: BmPayout
  pnl: ReturnType<typeof bmPnl>
  rentRisk: boolean
}
export function buildBmRows(s: Snapshot): BmRow[] {
  const b = s.business
  const months = [...new Set([...b.bmPayouts.map((p) => p.month), ...b.expenses.map((e) => e.month)])].sort()
  const catName = new Map(b.bmCategories.map((c) => [c.code, c.name]))
  const out: BmRow[] = []
  months.forEach((m) =>
    b.bmSites.forEach((site) => {
      if (site.status !== 'Active') return
      const payout = b.bmPayouts.find((p) => p.atmId === site.atmId && p.month === m)
      const pnl = bmPnl(b, site.atmId, m)
      const rentRisk = !!payout && payout.rentDeductedAtSource > 0 && b.expenses.some((e) => e.atmId === site.atmId && e.month === m && e.head === 'Rent' && e.status !== 'Rejected')
      out.push({ key: `${m}|${site.atmId}`, month: m, fy: payout?.fy ?? fyOfMonth(m), site, categoryName: catName.get(site.category) ?? site.category, payout, pnl, rentRisk })
    }),
  )
  return out
}

// ── global filters (§4.1) ────────────────────────────────────────────────
export type VerticalSel = 'Consolidated' | 'Franchise Model' | 'Business Model'
export type Filters = {
  fy: string
  month: string
  batch: string
  vertical: VerticalSel
  category: string // 'FR|WLA ATM' or 'BM|BMC-01'
  businessModel: string
  state: string
  city: string
  atm: string
  smf: string
  mf: string
  franchisee: string
  tl: string
  payoutStatus: string
  reconStatus: string // Matched / Variance / Pending
}
export const emptyFilters = (month: string, fy = '2026-27'): Filters => ({
  fy, month, batch: '', vertical: 'Consolidated', category: '', businessModel: '', state: '', city: '', atm: '', smf: '', mf: '', franchisee: '', tl: '', payoutStatus: '', reconStatus: '',
})

/** Franchise-only filters exclude BM records (and vice versa) — never cross-include (§4.1). */
export function filterFr(rows: FrRow[], f: Filters, ignoreMonth = false): FrRow[] {
  if (f.vertical === 'Business Model') return []
  if (f.businessModel || f.category.startsWith('BM|')) return []
  const q = f.atm.trim().toLowerCase()
  return rows.filter(
    (r) =>
      (ignoreMonth || !f.month || r.month === f.month) &&
      (!f.fy || r.fy === f.fy) &&
      (!f.batch || [r.manual, r.file, r.auto].some((l) => l?.batchId === f.batch)) &&
      (!f.category || f.category === `FR|${r.category}`) &&
      (!f.state || r.state === f.state) &&
      (!f.city || r.city === f.city) &&
      (!q || r.atmId.toLowerCase().includes(q) || r.siteId.toLowerCase().includes(q)) &&
      (!f.smf || r.smfName === f.smf) &&
      (!f.mf || r.mfName === f.mf) &&
      (!f.franchisee || r.frName === f.franchisee) &&
      (!f.tl || r.tlIds.includes(f.tl)) &&
      (!f.payoutStatus || r.payStatus === f.payoutStatus) &&
      (!f.reconStatus || (f.reconStatus === 'Matched' ? r.recon === 'Matched' : f.reconStatus === 'Variance' ? r.recon === 'Variance Found' : r.recon === 'Data Pending')),
  )
}
export const bmReconOf = (r: BmRow) => (r.pnl.status === 'Incomplete' || r.pnl.status === 'Reconciliation Pending' ? 'Pending' : 'Matched')
export function filterBm(rows: BmRow[], f: Filters, ignoreMonth = false): BmRow[] {
  if (f.vertical === 'Franchise Model') return []
  if (f.batch || f.franchisee || f.tl || f.payoutStatus || f.category.startsWith('FR|')) return []
  const q = f.atm.trim().toLowerCase()
  return rows.filter(
    (r) =>
      (ignoreMonth || !f.month || r.month === f.month) &&
      (!f.fy || r.fy === f.fy) &&
      (!f.category || f.category === `BM|${r.site.category}`) &&
      (!f.businessModel || r.site.businessModel === f.businessModel) &&
      (!f.state || r.site.state === f.state) &&
      (!f.city || r.site.city === f.city) &&
      (!q || r.site.atmId.toLowerCase().includes(q) || r.site.siteId.toLowerCase().includes(q)) &&
      (!f.smf || r.site.superMf === f.smf) &&
      (!f.mf || r.site.mf === f.mf) &&
      (!f.reconStatus || (f.reconStatus === 'Variance' ? false : bmReconOf(r) === f.reconStatus)),
  )
}

// ── MF payout (§5.3) and Super MF consolidation (§7, no double counting) ──
export type MfRow = {
  key: string
  month: string
  mf: string
  smf: string
  sites: number
  frRows: FrRow[]
  netMf: Paise
  hold: Paise
  recovery: Paise
  debit: Paise
  credit: Paise
  withoutTds: Paise
  taxPct: number | null
  tax: Paise
  net: Paise
  utr?: string
  paidDate?: string
  adj?: MfAdj
}
/**
 * MF payout w/o TDS = Net MF − Hold − Recovery − Debit + Credit; TDS/GST only when a rate has been set
 * for that MF (no default assumed, §21-11). PROVISIONAL until Finance signs off §21-04.
 */
export function buildMfRows(fr: FrRow[], adjMap: Record<string, MfAdj>): MfRow[] {
  const g = new Map<string, FrRow[]>()
  fr.forEach((r) => {
    const k = mfKey(r.month, r.mfName)
    const x = g.get(k)
    if (x) x.push(r)
    else g.set(k, [r])
  })
  return [...g.entries()]
    .map(([key, rows]) => {
      const adj = adjMap[key]
      const netMf = sumP(rows.map((r) => r.line.mfRevenue))
      const hold = adj?.hold ?? 0
      const recovery = adj?.recovery ?? 0
      const debit = adj?.debit ?? 0
      const credit = adj?.credit ?? 0
      const withoutTds = netMf - hold - recovery - debit + credit
      const taxPct = adj?.taxPct ?? null
      const tax = taxPct !== null && withoutTds > 0 ? Math.round((withoutTds * taxPct) / 100) : 0
      return {
        key, month: rows[0].month, mf: rows[0].mfName, smf: rows[0].smfName, sites: new Set(rows.map((r) => r.atmId)).size, frRows: rows,
        netMf, hold, recovery, debit, credit, withoutTds, taxPct, tax, net: withoutTds - tax, utr: adj?.utr, paidDate: adj?.paidDate, adj,
      }
    })
    .sort((a, b) => b.net - a.net)
}
export type SmfRow = { key: string; month: string; smf: string; mfs: MfRow[]; sites: number; netMf: Paise; adjustments: Paise; withoutTds: Paise; tax: Paise; net: Paise; frNet: Paise }
export function buildSmfRows(mf: MfRow[]): SmfRow[] {
  const g = new Map<string, MfRow[]>()
  mf.forEach((m) => {
    const k = `${m.month}|${m.smf}`
    const x = g.get(k)
    if (x) x.push(m)
    else g.set(k, [m])
  })
  return [...g.entries()]
    .map(([key, mfs]) => {
      // each FR row belongs to exactly one MF and each MF to one Super MF → no double counting
      const atms = new Set(mfs.flatMap((m) => m.frRows.map((r) => r.atmId)))
      return {
        key, month: mfs[0].month, smf: mfs[0].smf, mfs, sites: atms.size,
        netMf: sumP(mfs.map((m) => m.netMf)), adjustments: sumP(mfs.map((m) => m.credit - m.hold - m.recovery - m.debit)),
        withoutTds: sumP(mfs.map((m) => m.withoutTds)), tax: sumP(mfs.map((m) => m.tax)), net: sumP(mfs.map((m) => m.net)),
        frNet: sumP(mfs.flatMap((m) => m.frRows.map((r) => r.line.net))),
      }
    })
    .sort((a, b) => b.net - a.net)
}

/** BM P&L grouped by MF or Super MF; each site is counted once (its own mapping). */
export type BmGroup = { name: string; sites: number; received: Paise; expenses: Paise; net: Paise; profitable: number; loss: number; incomplete: number; rows: BmRow[] }
export function groupBm(rows: BmRow[], by: 'mf' | 'smf' | 'category'): BmGroup[] {
  const g = new Map<string, BmRow[]>()
  rows.forEach((r) => {
    const k = by === 'mf' ? r.site.mf : by === 'smf' ? r.site.superMf : r.categoryName
    const x = g.get(k)
    if (x) x.push(r)
    else g.set(k, [r])
  })
  return [...g.entries()]
    .map(([name, rs_]) => ({
      name, sites: new Set(rs_.map((r) => r.site.atmId)).size, received: sumP(rs_.map((r) => r.pnl.received)), expenses: sumP(rs_.map((r) => r.pnl.total)), net: sumP(rs_.map((r) => r.pnl.net)),
      profitable: rs_.filter((r) => r.pnl.status === 'Profitable').length, loss: rs_.filter((r) => r.pnl.status === 'Loss Making').length, incomplete: rs_.filter((r) => r.pnl.status === 'Incomplete').length, rows: rs_,
    }))
    .sort((a, b) => b.net - a.net)
}

// ── TL share for a month (from tlStore only — never computed with an assumed %) ──
export const tlSharesFor = (s: Snapshot, month: string, tl = '') => s.tl.shares.filter((x) => (!month || x.month === month) && (!tl || x.tlId === tl))

// ── one hook for the whole overview ──────────────────────────────────────
export type Model = {
  snap: Snapshot
  frAll: FrRow[]
  bmAll: BmRow[]
  months: string[]
  fys: string[]
  latestMonth: string
}
export function useModel(): Model {
  const snap = useSnapshot()
  return useMemo(() => {
    const frAll = buildFrRows(snap)
    const bmAll = buildBmRows(snap)
    const months = [...new Set([...frAll.map((r) => r.month), ...bmAll.map((r) => r.month)])].sort()
    const fys = [...new Set([...snap.payout.batches.map((b) => b.fy), ...frAll.map((r) => r.fy), ...bmAll.map((r) => r.fy)])].sort()
    return { snap, frAll, bmAll, months, fys, latestMonth: months[months.length - 1] ?? '' }
  }, [snap])
}

/** Filtered view for a filter set (memoise at call site). */
export type View = {
  fr: FrRow[]
  bm: BmRow[]
  frTrend: FrRow[]
  bmTrend: BmRow[]
  mf: MfRow[]
  mfTrend: MfRow[]
  smf: SmfRow[]
  prevMonth: string
  frPrev: FrRow[]
  bmPrev: BmRow[]
}
export function buildView(m: Model, f: Filters): View {
  const frTrend = filterFr(m.frAll, { ...f, fy: '' }, true)
  const bmTrend = filterBm(m.bmAll, { ...f, fy: '' }, true)
  const fr = filterFr(m.frAll, f)
  const bm = filterBm(m.bmAll, f)
  const mf = buildMfRows(fr, m.snap.mfAdj)
  const prevMonth = f.month ? prevMonthOf(f.month) : ''
  return {
    fr, bm, frTrend, bmTrend, mf, mfTrend: buildMfRows(frTrend, m.snap.mfAdj), smf: buildSmfRows(mf), prevMonth,
    frPrev: frTrend.filter((r) => r.month === prevMonth), bmPrev: bmTrend.filter((r) => r.month === prevMonth),
  }
}

export function optionLists(m: Model) {
  const uniq = (xs: string[]) => [...new Set(xs.filter((x) => x && x !== '—'))].sort()
  const b = m.snap.business
  return {
    states: uniq([...m.frAll.map((r) => r.state), ...m.bmAll.map((r) => r.site.state)]),
    citiesFor: (state: string) => uniq([...m.frAll.filter((r) => !state || r.state === state).map((r) => r.city), ...m.bmAll.filter((r) => !state || r.site.state === state).map((r) => r.site.city)]),
    smfFr: uniq(m.frAll.map((r) => r.smfName)),
    smfBm: uniq(b.bmSites.map((s) => s.superMf)),
    mfFr: uniq(m.frAll.map((r) => r.mfName)),
    mfBm: uniq(b.bmSites.map((s) => s.mf)),
    franchisees: uniq(m.frAll.map((r) => r.frName)),
    frCategories: uniq(m.frAll.map((r) => r.category)),
    bmCategories: b.bmCategories.map((c) => ({ value: `BM|${c.code}`, label: `BM · ${c.name}` })),
    businessModels: uniq(b.bmSites.map((s) => s.businessModel)),
    batches: m.snap.payout.batches.map((x) => ({ value: x.id, label: `${x.name} (${x.type})` })),
    tls: m.snap.tl.rules.map((r) => ({ value: r.tlId, label: r.tlName })),
  }
}

// ── generic table payload (reports, Ask AI answers) ──────────────────────
export type ColKind = 'text' | 'money' | 'num' | 'pct' | 'status'
export type Col = { label: string; kind?: ColKind }
export type Cell = string | number
export type TableData = { columns: Col[]; rows: Cell[][]; note?: string }
export const cellText = (c: Cell, k?: ColKind) =>
  k === 'money' ? inr2(Number(c)) : k === 'pct' ? `${c}%` : typeof c === 'number' ? c.toLocaleString('en-IN') : c
export const cellCsv = (c: Cell, k?: ColKind) => (k === 'money' ? rs(Number(c)) : String(c))
export const isNumeric = (k?: ColKind) => k === 'money' || k === 'num' || k === 'pct'
