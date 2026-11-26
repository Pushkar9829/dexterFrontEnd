// CRM Monthly EOD (Operations spec §5.5) — source auto-selected by the site's funding model:
//   Full Funding → CBR Master (CBR consolidated cash)   ·   Self Funding → Cash Loading Master (Cash Loading consolidated cash)
// The two sources are separate database mappings and never mix (§19.1). Monthly rows are derived on the fly from the
// source + the franchise's monthly EOD declaration; only reviews / corrections / sign-offs are persisted.
// NOTE: the exact cash matching formula, closing logic and exception handling are pending Finance / Operations
// sign-off (§5.5 dev req. 5) — today a day "matches" when EOD closing, loaded and dispensed equal the source to the rupee.
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { dailyForSite, amountOf, cbrMaster } from '@/data/cbr'
import { SITES as CBR_SITES } from '@/data/cbrSites'
import { cashLoadingRegisterStore, clMaster } from '@/data/cashLoadingRegisterStore'
import type { Site } from '@/data/network'
import { actorName, emitWorkflow, nowIso } from '@/data/workflow'
import { eodFundingOf, frNameOf, type EodFunding } from '@/data/eodStore'
import { get, post } from '@/lib/api'
import { currentRole } from '@/lib/rbac'
import { apiCall, apiEnabled, fromPaise, toPaise, toastError } from '@/data/opsApi'

export const MONTHS = ['2026-09', '2026-10', '2026-11'] as const
export const CURRENT_MONTH = '2026-11'
export const BUSINESS_CLOSE_NOTE = 'Machines close at 10:30 PM; cash reconciliation is done the next day, so each EOD day runs 10:30 PM → 10:30 PM.'
export const FORMULA_PENDING_NOTE = 'Exact matching formula, closing logic and exception handling are pending Finance / Operations finalisation (spec §5.5).'
export const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export type MonthlySource = 'CBR Master' | 'Cash Loading Master'
export const sourceOf = (f: EodFunding): MonthlySource => (f === 'Full Funding' ? 'CBR Master' : 'Cash Loading Master')

type Money = { opening: number; loaded: number; dispensed: number; closing: number }
export type MonthlyDay = {
  date: string
  source: Money
  eod: Money
  corrected?: { field: keyof Money; old: number; value: number; reason: string; by: string; at: string }
  accepted?: { reason: string; by: string; at: string }
  mismatch: boolean
}
export type MonthlyStatus = 'Month open' | 'Matched' | 'Mismatch' | 'Under Review' | 'Corrected' | 'Verified' | 'Approved'

export type MonthlyMeta = {
  corrections: { date: string; field: keyof Money; old: number; value: number; reason: string; by: string; at: string }[]
  accepted: { date: string; reason: string; by: string; at: string }[]
  reviews: { at: string; by: string; text: string }[]
  verifiedBy?: string
  verifiedAt?: string
  approvedBy?: string
  approvedAt?: string
}
export const monthlyStore = createStore<Record<string, MonthlyMeta>>('dexter.eod.monthly.v2', () => ({}))
export const useMonthlyMeta = () => monthlyStore.use()

export type MonthlyRow = {
  id: string
  month: string
  siteId: string
  atmId: string
  frId: string
  franchiseName: string
  funding: EodFunding
  source: MonthlySource
  sourceOrigin: string
  days: MonthlyDay[]
  totals: { source: Money; eod: Money }
  mismatchDays: number
  status: MonthlyStatus
  meta: MonthlyMeta
}

const emptyMeta = (): MonthlyMeta => ({ corrections: [], accepted: [], reviews: [] })
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
function rng(seed: number) {
  let s = seed % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
function datesOf(month: string) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cap = month === CURRENT_MONTH ? 24 : last // current month: up to yesterday
  return Array.from({ length: cap }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

/** Base daily series for the month from the funding model's own register (legacy daily stores), else a mock feed. */
function baseSeries(site: Site, funding: EodFunding, month: string): { origin: string; days: { date: string; v: Money }[] } {
  if (funding === 'Full Funding') {
    const cbr = CBR_SITES.find((c) => c.atmId === site.atmId)
    if (cbr) {
      const days = dailyForSite(cbr.siteId).filter((d) => d.date.startsWith(month)).map((d) => ({ date: d.date, v: { opening: amountOf(d.groups.opening), loaded: amountOf(d.groups.replenishment), dispensed: amountOf(d.groups.dispensed), closing: amountOf(d.groups.closing) } }))
      if (days.length) return { origin: 'daily CBR register', days }
    }
  } else {
    const days = cashLoadingRegisterStore.get().filter((r) => r.atmId === site.atmId)
      .map((r) => ({ date: `${r.date.slice(6, 10)}-${r.date.slice(3, 5)}-${r.date.slice(0, 2)}`, v: { opening: r.openingBalance, loaded: r.loading, dispensed: r.dispense, closing: r.closingBalance } }))
      .filter((d) => d.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date))
    if (days.length) return { origin: 'Cash Loading register', days }
  }
  // Legacy registries are not keyed to Site-Master ATM IDs → deterministic stand-in feed with the same shape.
  const r = rng(hash(`${site.atmId}${month}${funding}`))
  let opening = 600000 + Math.round(r() * 8) * 50000
  const days = datesOf(month).map((date) => {
    const dispensed = Math.round((150000 + r() * 250000) / 100) * 100
    const loaded = opening - dispensed < 300000 ? 800000 : 0
    const closing = opening - dispensed + loaded
    const v = { opening, loaded, dispensed, closing }
    opening = closing
    return { date, v }
  })
  return { origin: 'mock daily feed', days }
}

/**
 * Fetch the month's source rows from the funding model's master ONLY (§5.5 dev req. 1–3):
 * Full Funding → cbrMaster records, Self Funding → clMaster records (never the other one). Master records
 * (injection / loading amount and withdrawal) override the base daily series on their dates; closings re-run.
 */
function fetchSource(site: Site, funding: EodFunding, month: string): { origin: string; days: { date: string; v: Money }[] } {
  const master = funding === 'Full Funding' ? cbrMaster : clMaster
  const recs = master.store.get().filter((x) => x.atmId === site.atmId && x.date.startsWith(month) && x.status !== 'Rejected' && x.status !== 'Draft')
  const base = baseSeries(site, funding, month)
  const name = sourceOf(funding)
  if (!recs.length) return { origin: `${name} · ${base.origin}`, days: base.days }
  const days = base.days.map((d) => ({ ...d, v: { ...d.v } }))
  recs.forEach((x) => {
    const d = days.find((y) => y.date === x.date)
    if (d) {
      d.v.loaded = x.amount
      d.v.dispensed = x.cashWithdrawal
    } else days.push({ date: x.date, v: { opening: 0, loaded: x.amount, dispensed: x.cashWithdrawal, closing: 0 } })
  })
  days.sort((a, b) => a.date.localeCompare(b.date))
  let open = days[0]?.v.opening ?? 0
  days.forEach((d) => {
    d.v.opening = open
    d.v.closing = open + d.v.loaded - d.v.dispensed
    open = d.v.closing
  })
  return { origin: `${name} (${recs.length} record${recs.length > 1 ? 's' : ''}: ${recs.map((x) => x.id).join(', ')}) · ${base.origin}`, days }
}

const sum = (xs: Money[]): Money => ({ opening: xs[0]?.opening ?? 0, loaded: xs.reduce((s, x) => s + x.loaded, 0), dispensed: xs.reduce((s, x) => s + x.dispensed, 0), closing: xs[xs.length - 1]?.closing ?? 0 })

export function buildMonthly(site: Site, month: string, all: Record<string, MonthlyMeta>): MonthlyRow | null {
  if (apiEnabled) {
    void loadMonthlyApi(month)
    return apiRows.get(`MEOD-${month}-${site.siteId}`) ?? null
  }
  const funding = eodFundingOf(site)
  if (!funding || site.machineType !== 'CRM') return null
  const id = `MEOD-${month}-${site.siteId}`
  const meta = all[id] ?? emptyMeta()
  const src = fetchSource(site, funding, month)
  const r = rng(hash(`${id}eod`))
  const deviant = r() < 0.35 // ~1/3 of sites have a declaration difference to show the exception path
  const devDays = new Set(deviant ? [Math.floor(r() * src.days.length), Math.floor(r() * src.days.length)] : [])
  const days: MonthlyDay[] = src.days.map((d, i) => {
    const eod: Money = { ...d.v }
    if (devDays.has(i)) eod.closing = d.v.closing + (r() < 0.5 ? -1 : 1) * (Math.round(r() * 20) + 1) * 100
    const corr = [...meta.corrections].reverse().find((c) => c.date === d.date)
    for (const c of meta.corrections) if (c.date === d.date) eod[c.field] = c.value
    const acc = meta.accepted.find((a) => a.date === d.date)
    const differs = eod.closing !== d.v.closing || eod.loaded !== d.v.loaded || eod.dispensed !== d.v.dispensed
    return { date: d.date, source: d.v, eod, corrected: corr, accepted: acc, mismatch: differs && !acc }
  })
  const mismatchDays = days.filter((d) => d.mismatch).length
  const status: MonthlyStatus = meta.approvedBy ? 'Approved' : meta.verifiedBy ? 'Verified' : month === CURRENT_MONTH ? 'Month open'
    : mismatchDays ? (meta.reviews.length ? 'Under Review' : 'Mismatch') : meta.corrections.length || meta.accepted.length ? 'Corrected' : 'Matched'
  return {
    id, month, siteId: site.siteId, atmId: site.atmId, frId: site.frId, franchiseName: frNameOf(site.frId), funding, source: sourceOf(funding), sourceOrigin: src.origin,
    days, totals: { source: sum(days.map((d) => d.source)), eod: sum(days.map((d) => d.eod)) }, mismatchDays, status, meta,
  }
}

function setMeta(id: string, fn: (m: MonthlyMeta) => MonthlyMeta) {
  monthlyStore.set((s) => ({ ...s, [id]: fn(s[id] ?? emptyMeta()) }))
}

export function startReview(row: MonthlyRow, text: string) {
  if (!text.trim()) return 'Add a review note'
  setMeta(row.id, (m) => ({ ...m, reviews: [...m.reviews, { at: nowIso(), by: actorName(), text: text.trim() }] }))
  emitWorkflow({ module: 'EOD', event: 'Pending', refId: row.id, vars: { Record_ID: row.id, Site_ID: row.siteId, ATM_ID: row.atmId, Franchise_Name: row.franchiseName, Current_Status: 'Under Review' }, nextAction: { title: `Resolve Monthly EOD mismatch – ${row.atmId} ${monthLabel(row.month)}`, dueHours: 48 } })
  return null
}
export function correctDay(row: MonthlyRow, date: string, field: keyof Money, value: number, reason: string) {
  if (row.meta.verifiedBy) return 'Verified months are locked'
  if (!reason.trim()) return 'Correction reason is required'
  if (!(value >= 0)) return 'Enter a valid amount'
  const day = row.days.find((d) => d.date === date)
  if (!day) return 'Day not found'
  setMeta(row.id, (m) => ({ ...m, corrections: [...m.corrections, { date, field, old: day.eod[field], value, reason: reason.trim(), by: actorName(), at: nowIso() }] }))
  return null
}
export function acceptDifference(row: MonthlyRow, date: string, reason: string) {
  if (row.meta.verifiedBy) return 'Verified months are locked'
  if (!reason.trim()) return 'Explain why the difference is accepted'
  setMeta(row.id, (m) => ({ ...m, accepted: [...m.accepted.filter((a) => a.date !== date), { date, reason: reason.trim(), by: actorName(), at: nowIso() }] }))
  return null
}
export function verifyMonthly(row: MonthlyRow) {
  if (row.status === 'Month open') return 'The month is still running'
  if (row.mismatchDays) return `${row.mismatchDays} mismatch day(s) still open — correct or accept them first`
  if (row.meta.verifiedBy) return 'Already verified'
  if ([...row.meta.corrections, ...row.meta.accepted].some((c) => c.by === actorName())) return 'Maker-checker: you corrected this month, another user must verify'
  setMeta(row.id, (m) => ({ ...m, verifiedBy: actorName(), verifiedAt: nowIso() }))
  emitWorkflow({ module: 'EOD', event: 'Pending', refId: row.id, vars: { Record_ID: row.id, Site_ID: row.siteId, ATM_ID: row.atmId, Franchise_Name: row.franchiseName, Current_Status: 'Verified' }, nextAction: { title: `Approve Monthly EOD – ${row.atmId} ${monthLabel(row.month)}`, ownerId: 'EMP-002', dueHours: 48 } })
  return null
}
export function approveMonthly(row: MonthlyRow) {
  if (!row.meta.verifiedBy) return 'Verify first'
  if (row.meta.approvedBy) return 'Already approved'
  if (row.meta.verifiedBy === actorName()) return 'Maker-checker: the verifier cannot approve'
  setMeta(row.id, (m) => ({ ...m, approvedBy: actorName(), approvedAt: nowIso() }))
  emitWorkflow({ module: 'EOD', event: 'Approve', refId: row.id, vars: { Record_ID: row.id, Site_ID: row.siteId, ATM_ID: row.atmId, Current_Status: 'Approved' } })
  return null
}

export function exportMonthlyCsv(rows: MonthlyRow[], name: string) {
  downloadCsv(name, ['Monthly EOD ID', 'Month', 'Site ID', 'ATM ID', 'Franchise', 'Funding', 'Source', 'Source closing', 'EOD closing', 'Source loaded', 'EOD loaded', 'Source dispensed', 'EOD dispensed', 'Mismatch days', 'Status', 'Verified by', 'Approved by'], rows.map((r) => [
    r.id, r.month, r.siteId, r.atmId, r.franchiseName, r.funding, r.source, String(r.totals.source.closing), String(r.totals.eod.closing), String(r.totals.source.loaded), String(r.totals.eod.loaded), String(r.totals.source.dispensed), String(r.totals.eod.dispensed), String(r.mismatchDays), r.status, r.meta.verifiedBy ?? '', r.meta.approvedBy ?? '',
  ]))
}

// ── API mode (backend /eod/monthly, franchise /my/eod/monthly) ───────────
// Rows are computed server-side (source = funding model's master, EOD = CRM acknowledgements in the history ledger).
// `buildMonthly` returns the cached server row; list rows have no `days` until the row is opened (loadMonthlyRow).
type ApiMoney = { opening: number; loaded: number; dispensed: number; closing: number }
type ApiMonthly = {
  monthlyId: string; month: string; siteId: string; atmId: string; frId: string; franchiseName: string; funding: EodFunding; source: MonthlySource; sourceOrigin: string
  days?: { date: string; source: ApiMoney; eod: ApiMoney; corrected?: { field: keyof Money; oldPaise: number; valuePaise: number; reason: string; by: string; byName?: string; at: string }; accepted?: { reason: string; by: string; byName?: string; at: string }; mismatch: boolean }[]
  totals: { source: ApiMoney; eod: ApiMoney }; mismatchDays: number; status: MonthlyStatus | 'Reconciled'; dayCount?: number
  meta: {
    corrections: { date: string; field: keyof Money; oldPaise: number; valuePaise: number; reason: string; by: string; byName?: string; at: string }[]
    accepted: { date: string; reason: string; by: string; byName?: string; at: string }[]
    reviews: { at: string; by: string; byName?: string; text: string; kind?: string }[]
    verifiedBy?: string; verifiedByName?: string; verifiedAt?: string; approvedBy?: string; approvedByName?: string; approvedAt?: string; reconciledByName?: string
  }
}
const rup = (m: ApiMoney): Money => ({ opening: fromPaise(m.opening), loaded: fromPaise(m.loaded), dispensed: fromPaise(m.dispensed), closing: fromPaise(m.closing) })

function fromApiMonthly(r: ApiMonthly): MonthlyRow {
  const meta: MonthlyMeta = {
    corrections: (r.meta?.corrections ?? []).map((c) => ({ date: c.date, field: c.field, old: fromPaise(c.oldPaise), value: fromPaise(c.valuePaise), reason: c.reason, by: c.byName ?? c.by, at: c.at })),
    accepted: (r.meta?.accepted ?? []).map((a) => ({ date: a.date, reason: a.reason, by: a.byName ?? a.by, at: a.at })),
    reviews: (r.meta?.reviews ?? []).map((v) => ({ at: v.at, by: v.byName ?? v.by, text: v.kind === 'Reconcile' ? `Reconciliation: ${v.text}` : v.text })),
    verifiedBy: r.meta?.verifiedByName ?? r.meta?.verifiedBy, verifiedAt: r.meta?.verifiedAt, approvedBy: r.meta?.approvedByName ?? r.meta?.approvedBy, approvedAt: r.meta?.approvedAt,
  }
  return {
    id: r.monthlyId, month: r.month, siteId: r.siteId, atmId: r.atmId, frId: r.frId, franchiseName: r.franchiseName, funding: r.funding, source: r.source, sourceOrigin: r.sourceOrigin,
    days: (r.days ?? []).map((d) => ({
      date: d.date, source: rup(d.source), eod: rup(d.eod), mismatch: d.mismatch,
      corrected: d.corrected ? { field: d.corrected.field, old: fromPaise(d.corrected.oldPaise), value: fromPaise(d.corrected.valuePaise), reason: d.corrected.reason, by: d.corrected.byName ?? d.corrected.by, at: d.corrected.at } : undefined,
      accepted: d.accepted ? { reason: d.accepted.reason, by: d.accepted.byName ?? d.accepted.by, at: d.accepted.at } : undefined,
    })),
    totals: { source: rup(r.totals.source), eod: rup(r.totals.eod) }, mismatchDays: r.mismatchDays,
    status: (r.status === 'Reconciled' ? 'Corrected' : r.status) as MonthlyStatus, meta,
  }
}

const apiRows = new Map<string, MonthlyRow>()
const monthState = new Map<string, 'loading' | 'loaded' | 'error'>()
const bump = () => monthlyStore.set((s) => ({ ...s }))
const isFrRole = () => currentRole() === 'Franchisee'
const mBase = () => (isFrRole() ? '/my/eod/monthly' : '/eod/monthly')

/** Load all monthly rows of a month (summary, no days). Re-renders subscribers of useMonthlyMeta. */
export async function loadMonthlyApi(month: string, force = false) {
  if (!apiEnabled) return
  const st = monthState.get(month)
  if (!force && (st === 'loading' || st === 'loaded')) return
  monthState.set(month, 'loading')
  try {
    const rows: ApiMonthly[] = []
    for (let page = 1; page <= 25; page++) {
      const r = await get<{ items: ApiMonthly[]; pages: number }>(mBase(), { month, page, limit: 200 })
      rows.push(...r.items)
      if (page >= r.pages) break
    }
    rows.forEach((x) => {
      const prev = apiRows.get(x.monthlyId)
      const row = fromApiMonthly(x)
      apiRows.set(x.monthlyId, prev?.days.length && !force ? { ...row, days: prev.days } : row)
    })
    monthState.set(month, 'loaded')
  } catch (e) {
    monthState.set(month, 'error')
    toastError(e, 'Could not load Monthly EOD')
  }
  bump()
}
export const monthlyLoadState = (month: string) => monthState.get(month)

/** Full row with day-wise detail. */
export async function loadMonthlyRow(siteId: string, month: string) {
  if (!apiEnabled) return
  const r = await apiCall(() => get<ApiMonthly>(`${mBase()}/${encodeURIComponent(siteId)}/${month}`))
  apiRows.set(r.monthlyId, fromApiMonthly(r))
  bump()
}

async function mAct(row: MonthlyRow, path: string, body: unknown): Promise<string | null> {
  try {
    const r = await apiCall(() => post<ApiMonthly>(`/eod/monthly/${encodeURIComponent(row.siteId)}/${row.month}/${path}`, body))
    apiRows.set(r.monthlyId, fromApiMonthly(r))
    bump()
    return null
  } catch (e) {
    return (e as Error).message
  }
}
export async function startReviewAsync(row: MonthlyRow, text: string) {
  if (!apiEnabled) return startReview(row, text)
  if (text.trim().length < 3) return 'Add a review note (min 3 characters)'
  return mAct(row, 'review', { text: text.trim() })
}
/** Finance reconciliation note (API mode only). */
export async function reconcileMonthlyAsync(row: MonthlyRow, text: string) {
  if (!apiEnabled) return startReview(row, `Reconciliation: ${text}`)
  if (text.trim().length < 3) return 'Add a reconciliation note (min 3 characters)'
  return mAct(row, 'reconcile', { text: text.trim() })
}
export async function correctDayAsync(row: MonthlyRow, date: string, field: keyof Money, value: number, reason: string) {
  if (!apiEnabled) return correctDay(row, date, field, value, reason)
  if (reason.trim().length < 3) return 'Correction reason is required'
  if (!(value >= 0)) return 'Enter a valid amount'
  return mAct(row, 'correct', { date, field, valuePaise: toPaise(value), reason: reason.trim() })
}
export async function acceptDifferenceAsync(row: MonthlyRow, date: string, reason: string) {
  if (!apiEnabled) return acceptDifference(row, date, reason)
  if (reason.trim().length < 3) return 'Explain why the difference is accepted'
  return mAct(row, 'accept', { date, reason: reason.trim() })
}
export async function verifyMonthlyAsync(row: MonthlyRow) {
  if (!apiEnabled) return verifyMonthly(row)
  return mAct(row, 'verify', {})
}
export async function approveMonthlyAsync(row: MonthlyRow) {
  if (!apiEnabled) return approveMonthly(row)
  return mAct(row, 'approve', {})
}
