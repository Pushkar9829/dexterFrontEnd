// CBR (cash balance report) — Consolidated Datewise CBR (75:5628), Daily CBR (75:5629 / 208:11219),
// CBR EOD Summary (209:12015) and Daily CBR mobile (75:5631).
// The daily denomination-wise record is the single source of truth; consolidated rows are derived from it.
import { createStore } from '@/lib/store'
import { SITES, getSite, rng, dmy, type CbrSite } from './cbrSites'
import { siteStore, siteByAtm, categoryStore, type Site } from './network'
import { getFranchise } from './franchises'
import { emitWorkflow, logAudit, newTrail, isOwnRecord, actorName, nowIso, ACK_TEXT, ACK_VERSION, fundingOf, type AuditTrail, type OpsStatus, type FundingModel, type WfModule } from './workflow'
import type { Role } from '@/lib/rbac'
import { apiEnabled, createLoader } from './opsApi'
import { cashApi, eodSummaryApi, listCounters, listDaily, recordCounterClearApi, saveDailyApi } from './cbrApi'

/** API mode: a store that hydrates itself from the backend the first time a component subscribes. */
function hydrateOnUse<T>(store: { use(): T }, loader: { use(): unknown }) {
  if (!apiEnabled) return
  const orig = store.use
  store.use = function () {
    loader.use()
    return orig.call(store)
  }
}
/** Replace the contents of an exported constant array in place (API mode: live dates instead of the demo range). */
function refill<T>(arr: T[], next: T[]) {
  if (next.length) arr.splice(0, arr.length, ...next)
}

export const DENOS = [100, 200, 500, 1000, 2000] as const
export type Qty = (number | null)[] // one per DENOS entry; null = blank source cell (shown "—"), 0 = zero

export type GroupKey = 'opening' | 'dispensed' | 'purge' | 'overage' | 'shortage' | 'physical' | 'replenishment' | 'closing' | 'switch'

export const GROUPS: Record<GroupKey, string> = {
  opening: 'Opening Balance',
  dispensed: 'Cash Dispensed',
  purge: 'Cash in Purge Bin',
  overage: 'Overage',
  shortage: 'Shortage',
  physical: 'Physical Cash in ATM before Replenishment',
  replenishment: 'Cash Replenishment',
  closing: 'Closing Balance',
  switch: 'Switch Counter',
}

export const BANDS: { title: string; groups: GroupKey[] }[] = [
  { title: 'Cash movement & opening balance', groups: ['opening', 'dispensed', 'purge', 'overage'] },
  { title: 'Reconciliation & closing balance', groups: ['shortage', 'physical', 'replenishment', 'closing'] },
  { title: 'Switch counter', groups: ['switch'] },
]

export type DailyCbr = {
  id: string // <siteId>-<yyyymmdd>
  siteId: string
  date: string // ISO yyyy-mm-dd
  cra: string
  location: string
  bank: string
  srNo: string
  atmLocation: string
  atmId: string
  indentNo: string
  eodTime: string // HH:mm
  mfName: string
  remarks: string
  groups: Record<GroupKey, Qty>
  updatedBy?: string
  updatedAt?: string
}

export const amountOf = (q: Qty) => q.reduce<number>((s, n, i) => s + (n ?? 0) * DENOS[i], 0)
export const notesOf = (q: Qty) => (q.every((n) => n == null) ? null : q.reduce<number>((s, n) => s + (n ?? 0), 0))

/** Opening − Dispensed − Purge + Replenishment + Overage − Shortage → expected closing. */
export function reconcile(d: DailyCbr) {
  const t = (k: GroupKey) => amountOf(d.groups[k])
  const expected = t('opening') - t('dispensed') - t('purge') + t('replenishment') + t('overage') - t('shortage')
  const closing = t('closing')
  return { expected, closing, diff: closing - expected }
}

// ── seed ───────────────────────────────────────────────────────────────
export const CBR_END = '2026-10-13'
const DAYS = 20

function isoAdd(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export const CBR_DATES = Array.from({ length: DAYS }, (_, i) => isoAdd(CBR_END, i - DAYS + 1))

const zero = (): Qty => [0, 0, 0, null, null]
const blank = (): Qty => [null, null, null, null, null]

function craFor(s: CbrSite) {
  return s.franchiseId === 'FR-KA-00076' || s.franchiseId === 'FR-UP-00305' ? { cra: 'CMS Info Systems', mf: 'CMS' } : { cra: 'FR', mf: 'FR' }
}

const cache = new Map<string, DailyCbr[]>()

function genSite(site: CbrSite): DailyCbr[] {
  const hit = cache.get(site.siteId)
  if (hit) return hit
  const idx = SITES.indexOf(site)
  const r = rng(7919 * (idx + 3))
  const scale = 0.65 + (idx % 5) * 0.12
  let opening: Qty = [400, 1500, 2400, null, null]
  const { cra, mf } = craFor(site)
  const out: DailyCbr[] = []
  CBR_DATES.forEach((date, day) => {
    const disp: Qty = [
      Math.min(opening[0]!, Math.round((30 + r() * 80) * scale)),
      Math.min(opening[1]!, Math.round((150 + r() * 230) * scale)),
      Math.min(opening[2]!, Math.round((280 + r() * 480) * scale)),
      null,
      null,
    ]
    const purgeRaw = [r() < 0.3 ? 1 + Math.floor(r() * 3) : 0, r() < 0.3 ? 1 + Math.floor(r() * 2) : 0, r() < 0.2 ? 1 : 0]
    const purge: Qty = [...purgeRaw.map((p, i) => Math.max(0, Math.min(p, opening[i]! - disp[i]! - 1))), null, null]
    const over = zero()
    const short = zero()
    const overDay = (idx * 3 + 13) % DAYS
    const shortDay = (idx * 5 + 7) % DAYS
    if (day === overDay) over[0] = 1
    if (day === shortDay) short[2] = 1
    const physical: Qty = opening.map((o, i) => (o == null ? null : o - (disp[i] ?? 0) - (purge[i] ?? 0) + (over[i] ?? 0) - (short[i] ?? 0)))
    const physicalAmt = amountOf(physical)
    const load = physicalAmt < 900000 ? ([200, 800, 1600, null, null] as Qty) : blank()
    const loaded = load.some((n) => n != null)
    const closing: Qty = physical.map((p, i) => (p == null ? null : p + (load[i] ?? 0)))
    const sw: Qty = opening.map((o, i) => (o == null ? null : o - (disp[i] ?? 0) - (purge[i] ?? 0) + (load[i] ?? 0)))
    const ymd = date.replace(/-/g, '')
    out.push({
      id: `${site.siteId}-${ymd}`,
      siteId: site.siteId,
      date,
      cra,
      location: site.city,
      bank: site.bank,
      srNo: '1',
      atmLocation: site.location,
      atmId: site.atmId,
      indentNo: loaded ? `IND/${site.atmId.slice(-5)}/${ymd.slice(2)}` : '',
      eodTime: `21:${String(15 + Math.floor(r() * 44)).padStart(2, '0')}`,
      mfName: mf,
      remarks:
        day === shortDay
          ? 'Shortage of 1 × ₹500 at EOD count; FR to deposit.'
          : day === overDay
            ? 'Overage of 1 × ₹100 moved to suspense.'
            : loaded
              ? `Cash loaded by ${cra === 'FR' ? 'FR' : cra} against indent.`
              : '',
      groups: { opening, dispensed: disp, purge, overage: over, shortage: short, physical, replenishment: load, closing, switch: sw },
    })
    opening = closing
  })
  cache.set(site.siteId, out)
  return out
}

/** Edited daily records (overrides on top of the deterministic seed). */
export const dailyStore = createStore<Record<string, DailyCbr>>(apiEnabled ? 'dexter.api.cbr.daily.v1' : 'dexter.cbr.daily.v2', () => ({}))

/** API mode: GET /cbr/daily (all pages) -> dailyStore keyed by `<siteId>-<yyyymmdd>`; CBR_DATES follows the live range. */
export const dailyLoader = createLoader('daily CBR', async () => {
  const rows = await listDaily()
  dailyStore.set(Object.fromEntries(rows.map((d) => [d.id, { ...d, location: getSite(d.siteId)?.city ?? d.location }])))
  refill(CBR_DATES, [...new Set(rows.map((r) => r.date))].sort())
})
hydrateOnUse(dailyStore, dailyLoader)

export function dailyForSite(siteId: string): DailyCbr[] {
  if (apiEnabled) {
    void dailyLoader.load()
    const site = getSite(siteId)
    const ids = new Set([siteId, site?.siteId].filter(Boolean))
    return Object.values(dailyStore.get())
      .filter((d) => ids.has(d.siteId))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  const site = getSite(siteId)
  if (!site) return []
  const edits = dailyStore.get()
  return genSite(site).map((d) => edits[d.id] ?? d)
}

export function getDaily(id: string): DailyCbr | undefined {
  if (apiEnabled) return dailyStore.get()[id]
  const site = SITES.find((s) => id.startsWith(`${s.siteId}-`))
  if (!site) return undefined
  return dailyStore.get()[id] ?? genSite(site).find((d) => d.id === id)
}

/**
 * Save a daily denomination record. API mode: PUT /cbr/daily/:atmId/:date (throws the ApiError on failure —
 * `DAILY_LOCKED`: staff retry with a `correctionReason`; `STAFF_ENTRY`: a franchise cannot overwrite a staff row).
 */
export async function saveDaily(d: DailyCbr, correctionReason?: string): Promise<DailyCbr> {
  if (apiEnabled) {
    const saved = await saveDailyApi(d, correctionReason)
    dailyStore.set((m) => ({ ...m, [saved.id]: saved }))
    return saved
  }
  const next = { ...d, updatedBy: actorName(), updatedAt: new Date().toISOString() }
  dailyStore.set((m) => ({ ...m, [d.id]: next }))
  return next
}

export type ConsolidatedRow = {
  id: string
  date: string
  atmId: string
  mfName: string
  indentNo: string
  eodTime: string
  opening: number
  dispense: number
  purge: number
  overage: number
  shortage: number
  physical: number
  loading: number
  closing: number
  remarks: string
  switchBalance: number
}

export const toConsolidated = (d: DailyCbr): ConsolidatedRow => ({
  id: d.id,
  date: d.date,
  atmId: d.atmId,
  mfName: d.mfName,
  indentNo: d.indentNo,
  eodTime: d.eodTime,
  opening: amountOf(d.groups.opening),
  dispense: amountOf(d.groups.dispensed),
  purge: amountOf(d.groups.purge),
  overage: amountOf(d.groups.overage),
  shortage: amountOf(d.groups.shortage),
  physical: amountOf(d.groups.physical),
  loading: amountOf(d.groups.replenishment),
  closing: amountOf(d.groups.closing),
  remarks: d.remarks,
  switchBalance: amountOf(d.groups.switch),
})

// ── CBR EOD Summary: upload tracker + last counter cleared ──────────────
export type UploadState = { uploaded: boolean; fileName?: string; at?: string; by?: string }
export const EOD_DATES = CBR_DATES.slice(-7)
export const uploadKey = (atmId: string, date: string) => `${atmId}|${date}`

function seedUploads(): Record<string, UploadState> {
  const r = rng(4242)
  const m: Record<string, UploadState> = {}
  for (const s of SITES)
    EOD_DATES.forEach((date, i) => {
      const age = EOD_DATES.length - 1 - i // 0 = latest day
      const uploaded = age >= 3 ? r() > 0.05 : age === 2 ? r() > 0.2 : age === 1 ? r() > 0.45 : r() > 0.8
      m[uploadKey(s.atmId, date)] = uploaded
        ? { uploaded, fileName: `CBR_${s.atmId}_${date.replace(/-/g, '')}.xlsx`, at: `${isoAdd(date, 1)}T10:${String(10 + Math.floor(r() * 40))}:00+05:30`, by: s.franchiseId === 'FR-MH-00124' ? 'Shree Sai Financial Services' : 'Franchise user' }
        : { uploaded }
    })
  return m
}
export const uploadStore = createStore<Record<string, UploadState>>(apiEnabled ? 'dexter.api.cbr.uploads.v1' : 'dexter.cbr.uploads.v2', apiEnabled ? () => ({}) : seedUploads)

/** API mode: GET /cbr/daily/eod-summary -> upload tracker (and EOD_DATES = the live 7-day window). */
export const uploadLoader = createLoader('CBR EOD summary', async () => {
  const r = await eodSummaryApi()
  refill(EOD_DATES, r.dates ?? [])
  const m: Record<string, UploadState> = {}
  for (const it of r.items ?? [])
    for (const d of it.days) m[uploadKey(it.atmId, d.date)] = d.uploaded ? { uploaded: true, fileName: `CBR_${it.atmId}_${d.date.replace(/-/g, '')}`, at: d.at, by: d.by } : { uploaded: false }
  uploadStore.set(m)
})
hydrateOnUse(uploadStore, uploadLoader)

export type CounterClear = { atmId: string; eodAt: string; make: string; lastClear: string; by?: string }

function seedCounters(): CounterClear[] {
  const r = rng(99)
  return SITES.map((s, i) => {
    const back = 1 + Math.floor(r() * 12)
    return {
      atmId: s.atmId,
      eodAt: `${CBR_END}T21:${String(15 + Math.floor(r() * 44)).padStart(2, '0')}`,
      make: s.make,
      lastClear: `${isoAdd(CBR_END, -back)}T${String(8 + (i % 4)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`,
      by: 'Amit Jadhav',
    }
  })
}
export const counterStore = createStore<CounterClear[]>(apiEnabled ? 'dexter.api.cbr.counters.v1' : 'dexter.cbr.counters.v2', apiEnabled ? () => [] : seedCounters)

/** API mode: GET /cbr/daily/counters (latest clear per ATM). */
export const counterLoader = createLoader('counter clears', async () => counterStore.set(await listCounters()))
hydrateOnUse(counterStore, counterLoader)

/** Record a counter clear. API mode: POST /cbr/daily/counters (throws on failure). `at` is local 'yyyy-mm-ddTHH:mm'. */
export async function recordCounterClear(atmId: string, at: string, fallback: { eodAt: string; make: string }): Promise<void> {
  if (apiEnabled) {
    const c = await recordCounterClearApi(atmId, at)
    counterStore.set((cs) =>
      cs.some((x) => x.atmId === atmId) ? cs.map((x) => (x.atmId === atmId ? { ...x, lastClear: c.lastClear, by: c.by, eodAt: c.eodAt || x.eodAt, make: c.make !== '—' ? c.make : x.make } : x)) : [...cs, c],
    )
    return
  }
  counterStore.set((cs) =>
    cs.some((c) => c.atmId === atmId)
      ? cs.map((c) => (c.atmId === atmId ? { ...c, lastClear: at, by: actorName() } : c))
      : [...cs, { atmId, eodAt: fallback.eodAt, make: fallback.make, lastClear: at, by: actorName() }],
  )
}

// ── Daily CBR mobile (franchisee entry) ─────────────────────────────────
export type FundingType = 'WLA account' | 'Axis indent'
export type MobileCbr = {
  id: string
  date: string
  fundingType: FundingType
  atmId: string
  lastDayDispense: string
  openingWla: string
  fundGiven: string
  withdrawal: string
  lot1: string
  lot2: string
  loadingAmount: string
  frOwnFund: string
}

export const MOBILE_FIELDS: Record<FundingType, { key: keyof MobileCbr | 'closingWla' | 'difference'; label: string; computed?: boolean }[]> = {
  'WLA account': [
    { key: 'atmId', label: 'ATM ID' },
    { key: 'lastDayDispense', label: 'Last day Dispense Amount (As per Apna ATM App)' },
    { key: 'openingWla', label: 'Opening Balance in WLA Account' },
    { key: 'fundGiven', label: 'Fund Given by HPY in WLA Account' },
    { key: 'withdrawal', label: 'Withdrawal Amount from WLA Account' },
    { key: 'closingWla', label: 'Closing Balance in WLA Account', computed: true },
    { key: 'loadingAmount', label: 'Loading Amount (As per CBR & Counter)' },
    { key: 'difference', label: 'Loading Amount Difference (If Any)', computed: true },
    { key: 'frOwnFund', label: "FR's own loading fund (If Any)" },
  ],
  'Axis indent': [
    { key: 'atmId', label: 'ATM ID' },
    { key: 'lastDayDispense', label: 'Last day Dispense Amount (As per Apna ATM App)' },
    { key: 'lot1', label: 'Axis Indent Amount - 1st Lot' },
    { key: 'lot2', label: 'Axis Indent Amount - 2nd Lot (If Any)' },
    { key: 'loadingAmount', label: 'Loading Amount (As per CBR & Counter)' },
    { key: 'difference', label: 'Loading Amount Difference (If Any)', computed: true },
    { key: 'frOwnFund', label: "FR's own loading fund (If Any)" },
  ],
}

const n = (v: string) => (v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/**
 * ASSUMED formulas (client to confirm):
 *  WLA:  Closing = Opening + Fund Given by HPY − Withdrawal; expected funding = Fund Given by HPY
 *  Axis: expected funding = 1st Lot + 2nd Lot
 *  Difference = expected funding − Loading Amount (blank when Loading Amount is blank)
 */
export function mobileComputed(m: MobileCbr) {
  if (m.fundingType === 'WLA account') {
    const o = n(m.openingWla)
    const f = n(m.fundGiven)
    const w = n(m.withdrawal)
    const closing = o == null && f == null && w == null ? null : (o ?? 0) + (f ?? 0) - (w ?? 0)
    const expected = f
    const load = n(m.loadingAmount)
    return { closingWla: closing, expected, difference: expected == null || load == null ? null : expected - load }
  }
  const l1 = n(m.lot1)
  const l2 = n(m.lot2)
  const expected = l1 == null && l2 == null ? null : (l1 ?? 0) + (l2 ?? 0)
  const load = n(m.loadingAmount)
  return { closingWla: null, expected, difference: expected == null || load == null ? null : expected - load }
}

function seedMobile(): MobileCbr[] {
  const base = (date: string, i: number, m: Partial<MobileCbr>): MobileCbr => ({
    id: `MCBR-${date.replace(/-/g, '')}-${i}`,
    date,
    fundingType: 'WLA account',
    atmId: '',
    lastDayDispense: '',
    openingWla: '',
    fundGiven: '',
    withdrawal: '',
    lot1: '',
    lot2: '',
    loadingAmount: '',
    frOwnFund: '',
    ...m,
  })
  const d1 = '2026-10-13'
  const d0 = '2026-10-12'
  return [
    base(d1, 1, { atmId: 'DX-MH-01482', lastDayDispense: '312400', openingWla: '50000', fundGiven: '100000', withdrawal: '150000', loadingAmount: '150000', frOwnFund: '50000' }),
    base(d1, 2, { fundingType: 'Axis indent', atmId: 'DX-MH-01497', lastDayDispense: '300100', lot1: '473100', lot2: '0', loadingAmount: '' }),
    base(d1, 3, { atmId: 'DX-MH-01503', lastDayDispense: '268700', openingWla: '120000', fundGiven: '300000', withdrawal: '300000', loadingAmount: '300000' }),
    base(d1, 4, { fundingType: 'Axis indent', atmId: 'DX-MH-01511', lastDayDispense: '354900', lot1: '400000', lot2: '150000', loadingAmount: '550000' }),
    base(d0, 1, { atmId: 'DX-MH-01482', lastDayDispense: '298600', openingWla: '25000', fundGiven: '300000', withdrawal: '275000', loadingAmount: '300000', frOwnFund: '' }),
    base(d0, 2, { fundingType: 'Axis indent', atmId: 'DX-MH-01497', lastDayDispense: '287300', lot1: '450000', lot2: '', loadingAmount: '440000' }),
    base(d0, 3, { atmId: 'DX-MH-01503', lastDayDispense: '241100', openingWla: '70000', fundGiven: '250000', withdrawal: '200000', loadingAmount: '250000' }),
    base(d0, 4, { fundingType: 'Axis indent', atmId: 'DX-MH-01511', lastDayDispense: '332800', lot1: '500000', lot2: '', loadingAmount: '500000' }),
  ]
}
export const mobileStore = createStore<MobileCbr[]>('dexter.cbr.mobile.v1', seedMobile)

// ═════════════════════════════════════════════════════════════════════════
// Funding-model cash masters — Operations spec §2 (CBR, Full Funding) and §3 (Cash Loading, Self Funding).
// One workflow ENGINE, two completely separate stores / masters (§3.2, §19.1): a CBR record can never be
// created for a Self Funding site and a Cash Loading record never for a Full Funding site.
// Flow: Draft → (franchise ack) Submitted / Pending Verification → CRM verify (maker-checker) or Return for
// Correction → Pending Approval → Admin approve (→ Approved + Locked in the master) or Reject.
// Approved records change only through Admin "controlled correction" (old / new / reason → modification log).
// ═════════════════════════════════════════════════════════════════════════

export type CashKind = 'CBR' | 'Cash Loading'

export const KIND_META: Record<CashKind, {
  funding: FundingModel
  siteType: 'FFM' | 'SF'
  module: WfModule
  prefix: string
  master: string
  register: string
  formNames: string[]
  amountLabel: string
  otherFunding: FundingModel
  otherRegister: string
}> = {
  CBR: {
    funding: 'Full Funding', siteType: 'FFM', module: 'CBR', prefix: 'CBR', master: 'CBR Master', register: 'CBR / Cash Replacement Management',
    formNames: ['CBR', 'Cash Replacement'], amountLabel: 'Injection Amount', otherFunding: 'Self Funding', otherRegister: 'Cash Loading Register',
  },
  'Cash Loading': {
    funding: 'Self Funding', siteType: 'SF', module: 'Cash Loading', prefix: 'CL', master: 'Cash Loading Master', register: 'Cash Loading Register',
    formNames: ['Cash Loading'], amountLabel: 'Loading Amount', otherFunding: 'Full Funding', otherRegister: 'CBR (Cash Replacement Management)',
  },
}

/** Identification fields fetched from Site / Franchise / Account masters — never retyped (§2.1). */
export type SiteSnapshot = {
  siteId: string
  atmId: string
  frId: string
  franchiseName: string
  atmLocation: string
  bank: string
  wlaAccount: string
  settlementExercise: string
  siteType: string
  fundingModel: FundingModel
}

const mask = (acc: string) => (acc.length > 4 ? `XXXX${acc.slice(-4)}` : acc)

export function siteSnapshot(site: Site): SiteSnapshot {
  const fr = getFranchise(site.frId)
  const st = categoryStore.get().settlementTypes.find((c) => c.code === site.account?.type)
  return {
    siteId: site.siteId,
    atmId: site.atmId,
    frId: site.frId,
    franchiseName: fr?.name ?? site.frId,
    atmLocation: site.location,
    bank: site.account?.bank ?? 'Not mapped',
    wlaAccount: site.account ? `${st?.name ?? site.account.type} · ${mask(site.account.accountNo)}` : 'Not mapped',
    settlementExercise: site.account ? `${st?.name ?? site.account.type} settlement · ${site.account.settlement}` : 'Settlement not mapped',
    siteType: site.siteType,
    fundingModel: fundingOf(site.siteType),
  }
}

/** UAT 1–3: the site's funding model (Site Master driven) decides which register may be used. */
export function checkSiteFor(kind: CashKind, atmId: string): { ok: true; site: Site; snap: SiteSnapshot } | { ok: false; error: string; snap?: SiteSnapshot } {
  const q = atmId.trim()
  if (!q) return { ok: false, error: 'Enter an ATM ID.' }
  const site = siteByAtm(q) ?? siteStore.get().sites.find((s) => s.siteId.toLowerCase() === q.toLowerCase())
  if (!site) return { ok: false, error: `ATM / Site "${q}" was not found in the Site Master.` }
  const snap = siteSnapshot(site)
  const m = KIND_META[kind]
  if (snap.fundingModel === m.funding) return { ok: true, site, snap }
  if (snap.fundingModel === m.otherFunding)
    return { ok: false, snap, error: `This is a ${snap.fundingModel} site — use ${m.otherRegister}. ${kind} is only for ${m.funding} sites.` }
  return { ok: false, snap, error: `This is a ${snap.fundingModel} site (${snap.siteType}) — CBR is only for Full Funding and Cash Loading only for Self Funding sites.` }
}

export type CashDoc = { id: string; name: string; size: number; at: string; by: string }
export type CashChannel = 'Franchise App' | 'Web – on behalf of Franchise' | 'Web – Authorized Entry'
export type CashRecord = SiteSnapshot & {
  id: string
  kind: CashKind
  formName: string
  date: string // CBR / loading date (yyyy-mm-dd)
  lastDate: string // last cash replacement / relevant date
  amount: number // CBR: injection amount · Cash Loading: loading amount
  dailyIndent: number
  cashWithdrawal: number
  openingBalance: number // Cash Loading balance calc (provisional)
  remarks: string
  documents: CashDoc[]
  status: OpsStatus
  locked: boolean
  channel: CashChannel
  trail: AuditTrail
  statusLog: { at: string; by: string; status: OpsStatus; note?: string }[]
  rejectReason?: string
}

/** PROVISIONAL (spec §3.1: exact formula to be frozen with Finance / Operations): Balance = Opening + Loading − Withdrawal. */
export const clBalance = (r: Pick<CashRecord, 'openingBalance' | 'amount' | 'cashWithdrawal'>) => r.openingBalance + r.amount - r.cashWithdrawal

export type CashInput = Pick<CashRecord, 'formName' | 'date' | 'lastDate' | 'amount' | 'dailyIndent' | 'cashWithdrawal' | 'openingBalance' | 'remarks'> & { atmId: string; documents?: CashDoc[] }

export type CorrectableKey = 'date' | 'lastDate' | 'amount' | 'dailyIndent' | 'cashWithdrawal' | 'openingBalance' | 'remarks' | 'formName'
export const CORRECTABLE: { key: CorrectableKey; label: string; num?: boolean; kinds?: CashKind[] }[] = [
  { key: 'amount', label: 'Injection / Loading Amount', num: true },
  { key: 'dailyIndent', label: 'Daily Indent', num: true },
  { key: 'cashWithdrawal', label: 'Cash Withdrawal', num: true },
  { key: 'openingBalance', label: 'Opening Balance', num: true, kinds: ['Cash Loading'] },
  { key: 'date', label: 'Record Date' },
  { key: 'lastDate', label: 'Last Date' },
  { key: 'formName', label: 'Form Name' },
  { key: 'remarks', label: 'Remarks' },
]

export const franchiseUser = (frName: string) => `${frName} (Franchise)`
export const ackText = () => `${ACK_TEXT.English}\n${ACK_TEXT.Hindi}`
export type Result = { ok: true; id: string } | { ok: false; error: string }

let docSeq = 0
export const newDoc = (name: string, size: number, by = actorName()): CashDoc => ({ id: `DOC-${Date.now().toString(36)}${(docSeq++).toString(36)}`.toUpperCase(), name, size, at: nowIso(), by })

function seedCash(kind: CashKind): CashRecord[] {
  const m = KIND_META[kind]
  const sites = siteStore.get().sites.filter((s) => s.siteType === m.siteType).slice(0, 10)
  const r = rng(kind === 'CBR' ? 515 : 919)
  const plan: OpsStatus[] = ['Approved', 'Approved', 'Approved', 'Pending Verification', 'Pending Verification', 'Pending Approval', 'Returned for Correction', 'Approved', 'Rejected', 'Draft', 'Pending Approval', 'Approved']
  const at = (d: string, h: number) => `${d}T${String(h).padStart(2, '0')}:${String(Math.floor(r() * 59)).padStart(2, '0')}:00.000Z`
  return plan.map((status, i) => {
    const site = sites[i % Math.max(1, sites.length)]
    const snap: SiteSnapshot = site
      ? siteSnapshot(site)
      : { siteId: '—', atmId: '—', frId: '—', franchiseName: '—', atmLocation: '—', bank: '—', wlaAccount: '—', settlementExercise: '—', siteType: m.siteType, fundingModel: m.funding }
    const date = isoAdd('2026-11-24', -i)
    const fu = franchiseUser(snap.franchiseName)
    const amount = Math.round((3 + r() * 6) * 50) * 1000
    const trail: AuditTrail = { createdBy: fu, createdAt: at(date, 9), modifications: [], documents: [], taskRefs: [] }
    const log: CashRecord['statusLog'] = [{ at: at(date, 9), by: fu, status: 'Draft' }]
    const docs: CashDoc[] = status === 'Draft' ? [] : [{ id: `DOC-SEED-${kind === 'CBR' ? 'C' : 'L'}${i}`, name: `${kind === 'CBR' ? 'CBR' : 'CL'}_${snap.atmId}_${date.replace(/-/g, '')}.pdf`, size: 180_000 + i * 9000, at: at(date, 10), by: fu }]
    trail.documents = docs.map((d) => ({ at: d.at, by: d.by, name: d.name, action: 'Uploaded' as const }))
    if (status !== 'Draft') {
      trail.submittedBy = fu
      trail.submittedAt = at(date, 10)
      trail.acknowledgement = { text: ackText(), version: ACK_VERSION, lang: i % 3 === 0 ? 'Hindi' : 'English', at: at(date, 10), by: fu }
      log.push({ at: at(date, 10), by: fu, status: 'Submitted' }, { at: at(date, 10), by: 'System', status: 'Pending Verification' })
    }
    if (status === 'Approved' || status === 'Pending Approval' || status === 'Rejected') {
      trail.verifiedBy = 'Kiran Rao'
      trail.verifiedAt = at(date, 13)
      log.push({ at: at(date, 13), by: 'Kiran Rao', status: 'Verified' }, { at: at(date, 13), by: 'System', status: 'Pending Approval' })
    }
    if (status === 'Approved') {
      trail.approvedBy = 'Meera Iyer'
      trail.approvedAt = at(date, 17)
      log.push({ at: at(date, 17), by: 'Meera Iyer', status: 'Approved' }, { at: at(date, 17), by: 'System', status: 'Locked', note: `Saved & locked in ${m.master}` })
    }
    if (status === 'Returned for Correction') {
      trail.returnedBy = 'Kiran Rao'
      trail.returnReason = 'Counter slip not legible — re-upload and confirm daily indent.'
      log.push({ at: at(date, 14), by: 'Kiran Rao', status, note: trail.returnReason })
    }
    let rejectReason: string | undefined
    if (status === 'Rejected') {
      rejectReason = 'Duplicate entry for the same replenishment cycle.'
      trail.returnedBy = 'Meera Iyer'
      trail.returnReason = rejectReason
      log.push({ at: at(date, 17), by: 'Meera Iyer', status, note: rejectReason })
    }
    const indent = amount + Math.round(r() * 20) * 1000
    return {
      ...snap,
      id: `${m.prefix}-2026-${String(1001 + i)}`,
      kind,
      formName: m.formNames[i % m.formNames.length],
      date,
      lastDate: isoAdd(date, -1 - (i % 3)),
      amount,
      dailyIndent: indent,
      cashWithdrawal: Math.round((indent * (0.4 + r() * 0.5)) / 1000) * 1000,
      openingBalance: kind === 'Cash Loading' ? Math.round(r() * 200) * 1000 : 0,
      remarks: status === 'Draft' ? 'Draft — counter slip pending' : '',
      documents: docs,
      status,
      locked: status === 'Approved',
      channel: i % 4 === 3 ? 'Web – on behalf of Franchise' : 'Franchise App',
      trail,
      statusLog: log,
      rejectReason,
    }
  })
}

const vars = (r: CashRecord, pending: string) => ({ Record_ID: r.id, Site_ID: r.siteId, ATM_ID: r.atmId, Franchise_Name: r.franchiseName, Current_Status: r.status, Pending_Action: pending })

/** Engine shared by CBR and Cash Loading — each call creates its OWN store (separate logical master). */
export function makeCashMaster(kind: CashKind, key: string) {
  const m = KIND_META[kind]
  const store = createStore<CashRecord[]>(apiEnabled ? `dexter.api.${key}` : key, () => (apiEnabled ? [] : seedCash(kind)))
  const get = (id: string) => store.get().find((x) => x.id === id)
  const put = (rec: CashRecord) => store.set((list) => (list.some((x) => x.id === rec.id) ? list.map((x) => (x.id === rec.id ? rec : x)) : [rec, ...list]))
  // API mode: records come from GET /cbr/records or /cash-loading/records (franchise: /my/...); every mutation
  // goes to the backend and the returned record replaces the local copy.
  const remote = cashApi(kind, put)
  const loader = createLoader(m.master, async () => store.set(await remote.list()))
  hydrateOnUse(store, loader)
  const log = (rec: CashRecord, status: OpsStatus, note?: string, by = actorName()): CashRecord => ({ ...rec, statusLog: [...rec.statusLog, { at: nowIso(), by, status, note }] })
  const nextId = () => {
    const nums = store.get().map((x) => Number(x.id.split('-').pop()) || 0)
    return `${m.prefix}-2026-${String(Math.max(1000, ...nums) + 1)}`
  }
  const editable = (s: OpsStatus) => s === 'Draft' || s === 'Returned for Correction'

  /** Create or update a Draft / Returned record. `asFranchise` records the franchise as maker. */
  function saveDraft(input: CashInput, opts: { id?: string; asFranchise?: boolean; channel?: CashChannel } = {}): Result {
    const chk = checkSiteFor(kind, input.atmId)
    if (!chk.ok) return { ok: false, error: chk.error }
    const prev = opts.id ? get(opts.id) : undefined
    if (prev && !editable(prev.status)) return { ok: false, error: `${prev.id} is ${prev.status} and can no longer be edited here.` }
    const maker = opts.asFranchise ? franchiseUser(chk.snap.franchiseName) : actorName()
    const docs = input.documents ?? prev?.documents ?? []
    const { documents: _ignored, ...fields } = input
    void _ignored
    const base: CashRecord = prev
      ? { ...prev, ...chk.snap, ...fields, documents: docs }
      : {
          ...chk.snap, ...fields, id: nextId(), kind, documents: docs, status: 'Draft', locked: false,
          channel: opts.channel ?? (opts.asFranchise ? 'Web – on behalf of Franchise' : 'Web – Authorized Entry'),
          trail: { ...newTrail(), createdBy: maker }, statusLog: [{ at: nowIso(), by: maker, status: 'Draft' }],
        }
    const before = prev?.documents ?? []
    const added = docs.filter((d) => !before.some((x) => x.id === d.id))
    const removed = before.filter((d) => !docs.some((x) => x.id === d.id))
    const rec: CashRecord = {
      ...base,
      trail: {
        ...base.trail,
        documents: [
          ...base.trail.documents,
          ...added.map((d) => ({ at: nowIso(), by: maker, name: d.name, action: 'Uploaded' as const })),
          ...removed.map((d) => ({ at: nowIso(), by: maker, name: d.name, action: 'Deleted' as const })),
        ],
      },
    }
    put(rec)
    return { ok: true, id: rec.id }
  }

  /** Franchise confirmation with bilingual acknowledgement → Submitted / Pending Verification (+ CRM task, UAT 4). */
  function submit(id: string, ack: { lang: 'Hindi' | 'English'; asFranchise?: boolean }): Result {
    const rec = get(id)
    if (!rec) return { ok: false, error: 'Record not found.' }
    if (!editable(rec.status)) return { ok: false, error: `${id} is already ${rec.status}.` }
    if (!rec.amount || rec.amount <= 0) return { ok: false, error: `${m.amountLabel} is required.` }
    if (!rec.documents.length) return { ok: false, error: 'Attach at least one supporting document (counter slip / proof).' }
    const dup = store.get().find((x) => x.id !== id && x.atmId === rec.atmId && x.date === rec.date && x.status !== 'Rejected' && x.status !== 'Draft')
    if (dup) return { ok: false, error: `Duplicate: ${dup.id} already exists for ATM ${rec.atmId} on ${dmy(rec.date)} (${dup.status}).` }
    const by = ack.asFranchise ? franchiseUser(rec.franchiseName) : actorName()
    const resubmit = rec.status === 'Returned for Correction'
    let next: CashRecord = {
      ...rec,
      status: 'Pending Verification',
      trail: { ...rec.trail, submittedBy: by, submittedAt: nowIso(), acknowledgement: { text: ackText(), version: ACK_VERSION, lang: ack.lang, at: nowIso(), by } },
    }
    next = log(log(next, 'Submitted', resubmit ? 'Resubmitted after correction' : `Acknowledged (${ack.lang}, ${ACK_VERSION})`, by), 'Pending Verification', undefined, 'System')
    const task = emitWorkflow({ module: m.module, event: 'Submit', refId: id, vars: vars(next, `CRM verification of ${kind} ${id}`), nextAction: { title: `Verify ${kind} ${id} – ${rec.atmId}`, dueHours: 24, priority: 'High' } })
    if (task) next = { ...next, trail: { ...next.trail, taskRefs: [...next.trail.taskRefs, task.id] } }
    put(next)
    return { ok: true, id }
  }

  /** CRM Executive verification — maker-checker enforced (UAT 5); creates the Admin approval task (UAT 6). */
  function verify(id: string, remark?: string): Result {
    const rec = get(id)
    if (!rec) return { ok: false, error: 'Record not found.' }
    if (rec.status !== 'Pending Verification') return { ok: false, error: `Only Pending Verification records can be verified (now ${rec.status}).` }
    if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: you created / submitted this record, so you cannot verify it. Another CRM Executive must verify.' }
    let next: CashRecord = { ...rec, status: 'Pending Approval', trail: { ...rec.trail, verifiedBy: actorName(), verifiedAt: nowIso() } }
    next = log(log(next, 'Verified', remark), 'Pending Approval', undefined, 'System')
    const task = emitWorkflow({ module: m.module, event: 'Verify', refId: id, vars: vars(next, `Admin approval of ${kind} ${id}`), nextAction: { title: `Approve ${kind} ${id} – ${rec.atmId}`, ownerId: 'EMP-002', dueHours: 24, priority: 'High' } })
    if (task) next = { ...next, trail: { ...next.trail, taskRefs: [...next.trail.taskRefs, task.id] } }
    put(next)
    return { ok: true, id }
  }

  function returnForCorrection(id: string, reason: string): Result {
    const rec = get(id)
    if (!rec) return { ok: false, error: 'Record not found.' }
    if (rec.status !== 'Pending Verification' && rec.status !== 'Pending Approval') return { ok: false, error: `Cannot return a ${rec.status} record.` }
    if (!reason.trim()) return { ok: false, error: 'A reason is required to return a record for correction.' }
    if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: you cannot act as checker on your own submission.' }
    let next: CashRecord = { ...rec, status: 'Returned for Correction', trail: { ...rec.trail, returnedBy: actorName(), returnReason: reason.trim() } }
    next = log(next, 'Returned for Correction', reason.trim())
    const task = emitWorkflow({ module: m.module, event: 'Return', refId: id, vars: vars(next, 'Franchise to correct and resubmit'), nextAction: { title: `Follow up correction of ${kind} ${id} with ${rec.franchiseName}`, dueHours: 48 } })
    if (task) next = { ...next, trail: { ...next.trail, taskRefs: [...next.trail.taskRefs, task.id] } }
    put(next)
    return { ok: true, id }
  }

  /** Admin approval → Approved + Locked in the master (UAT 7). */
  function approve(id: string, remark?: string): Result {
    const rec = get(id)
    if (!rec) return { ok: false, error: 'Record not found.' }
    if (rec.status !== 'Pending Approval') return { ok: false, error: `Only Pending Approval records can be approved (now ${rec.status}).` }
    if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: you cannot approve a record you created / submitted.' }
    let next: CashRecord = { ...rec, status: 'Approved', locked: true, trail: { ...rec.trail, approvedBy: actorName(), approvedAt: nowIso() } }
    next = log(log(next, 'Approved', remark), 'Locked', `Saved & locked in ${m.master}`, 'System')
    emitWorkflow({ module: m.module, event: 'Approve', refId: id, vars: vars(next, '—') })
    put(next)
    return { ok: true, id }
  }

  function reject(id: string, reason: string): Result {
    const rec = get(id)
    if (!rec) return { ok: false, error: 'Record not found.' }
    if (rec.status !== 'Pending Verification' && rec.status !== 'Pending Approval') return { ok: false, error: `Cannot reject a ${rec.status} record.` }
    if (!reason.trim()) return { ok: false, error: 'A rejection reason is required.' }
    if (isOwnRecord(rec.trail)) return { ok: false, error: 'Maker-checker rule: you cannot reject your own submission.' }
    let next: CashRecord = { ...rec, status: 'Rejected', rejectReason: reason.trim(), trail: { ...rec.trail, returnedBy: actorName(), returnReason: reason.trim() } }
    next = log(next, 'Rejected', reason.trim())
    emitWorkflow({ module: m.module, event: 'Reject', refId: id, vars: vars(next, '—') })
    put(next)
    return { ok: true, id }
  }

  /** Admin-only controlled correction of an approved / locked record (UAT 24). */
  function correct(id: string, field: CorrectableKey, value: string, reason: string): Result {
    const rec = get(id)
    if (!rec) return { ok: false, error: 'Record not found.' }
    if (!rec.locked) return { ok: false, error: 'Controlled correction applies to approved (locked) records only.' }
    if (!reason.trim()) return { ok: false, error: 'A modification reason is mandatory.' }
    const def = CORRECTABLE.find((c) => c.key === field)
    if (!def) return { ok: false, error: 'This field cannot be corrected.' }
    const oldValue = String(rec[field])
    const newVal: string | number = def.num ? Number(value) : value
    if (def.num && (value.trim() === '' || Number.isNaN(newVal) || (newVal as number) < 0)) return { ok: false, error: 'Enter a valid non-negative amount.' }
    if (String(newVal) === oldValue) return { ok: false, error: 'New value is the same as the old value.' }
    let next: CashRecord = { ...rec, [field]: newVal, trail: { ...rec.trail, modifications: [...rec.trail.modifications, { at: nowIso(), by: actorName(), field: def.label, oldValue, newValue: String(newVal), reason: reason.trim() }] } }
    next = log(next, 'Locked', `Controlled correction: ${def.label} ${oldValue} → ${newVal}`)
    logAudit(m.module, id, 'Controlled correction', `${def.label}: ${oldValue} → ${newVal} · ${reason.trim()}`)
    put(next)
    return { ok: true, id }
  }

  /** Document upload / replace / delete with history. On a locked record only via Admin with a reason. */
  function docAction(id: string, action: 'Uploaded' | 'Replaced' | 'Deleted', doc: { docId?: string; name?: string; size?: number }, reason?: string): Result {
    const rec = get(id)
    if (!rec) return { ok: false, error: 'Record not found.' }
    if (rec.status === 'Rejected') return { ok: false, error: 'Rejected records are read-only.' }
    const why = reason?.trim() ?? ''
    if (rec.locked && !why) return { ok: false, error: 'Record is locked — a reason is required (controlled correction).' }
    let docs = rec.documents
    let label = doc.name ?? ''
    let oldName = '—'
    if (action === 'Uploaded') docs = [...docs, newDoc(doc.name ?? 'document', doc.size ?? 0)]
    else {
      const old = docs.find((d) => d.id === doc.docId)
      if (!old) return { ok: false, error: 'Document not found.' }
      oldName = old.name
      if (action === 'Deleted') {
        docs = docs.filter((d) => d.id !== old.id)
        label = old.name
      } else {
        docs = docs.map((d) => (d.id === old.id ? newDoc(doc.name ?? d.name, doc.size ?? d.size) : d))
        label = `${old.name} → ${doc.name ?? old.name}`
      }
    }
    const mods = rec.locked
      ? [...rec.trail.modifications, { at: nowIso(), by: actorName(), field: 'Supporting Documents', oldValue: oldName, newValue: action === 'Deleted' ? '(deleted)' : (doc.name ?? ''), reason: why }]
      : rec.trail.modifications
    const next: CashRecord = { ...rec, documents: docs, trail: { ...rec.trail, documents: [...rec.trail.documents, { at: nowIso(), by: actorName(), name: label, action }], modifications: mods } }
    if (rec.locked) logAudit(m.module, id, `Document ${action.toLowerCase()} (controlled)`, `${label} · ${why}`)
    put(next)
    return { ok: true, id }
  }

  // Async variants used by the pages: backend in API mode, the local engine above in mock mode.
  const saveDraftAsync = async (input: CashInput, opts: { id?: string; asFranchise?: boolean; channel?: CashChannel } = {}): Promise<Result> =>
    apiEnabled ? remote.saveDraft(input, opts) : saveDraft(input, opts)
  const submitAsync = async (id: string, ack: { lang: 'Hindi' | 'English'; asFranchise?: boolean }): Promise<Result> => (apiEnabled ? remote.submit(id, ack.lang) : submit(id, ack))
  const verifyAsync = async (id: string, remark?: string): Promise<Result> => (apiEnabled ? remote.verify(id, remark) : verify(id, remark))
  const returnAsync = async (id: string, reason: string): Promise<Result> => {
    if (!reason.trim()) return { ok: false, error: 'A reason is required to return a record for correction.' }
    return apiEnabled ? remote.returnForCorrection(id, reason) : returnForCorrection(id, reason)
  }
  const approveAsync = async (id: string, remark?: string): Promise<Result> => (apiEnabled ? remote.approve(id, remark) : approve(id, remark))
  const rejectAsync = async (id: string, reason: string): Promise<Result> => {
    if (!reason.trim()) return { ok: false, error: 'A rejection reason is required.' }
    return apiEnabled ? remote.reject(id, reason) : reject(id, reason)
  }
  const correctAsync = async (id: string, field: CorrectableKey, value: string, reason: string): Promise<Result> => {
    if (!apiEnabled) return correct(id, field, value, reason)
    if (!reason.trim()) return { ok: false, error: 'A modification reason is mandatory.' }
    return remote.correct(id, field, value, reason)
  }
  /** API mode: `doc.fileId` is the uploaded file (POST /files) for Uploaded / Replaced. */
  const docActionAsync = async (id: string, action: 'Uploaded' | 'Replaced' | 'Deleted', doc: { docId?: string; fileId?: string; name?: string; size?: number }, reason?: string): Promise<Result> =>
    apiEnabled ? remote.docAction(id, action, doc, reason) : docAction(id, action, doc, reason)

  return {
    kind, meta: m, store, get, saveDraft, submit, verify, returnForCorrection, approve, reject, correct, docAction,
    loader, saveDraftAsync, submitAsync, verifyAsync, returnAsync, approveAsync, rejectAsync, correctAsync, docActionAsync,
  }
}
export type CashMaster = ReturnType<typeof makeCashMaster>

/** CBR Master — Full Funding only (separate store from the Cash Loading Master). */
export const cbrMaster = makeCashMaster('CBR', 'dexter.cbr.master.v1')

/** Role gates (Operations §17). Frontend only; the backend must enforce the same. */
export const CHECKER_ROLES: Role[] = ['Super Admin', 'Admin', 'Sub-Admin', 'Operations Team']
export const APPROVER_ROLES: Role[] = ['Super Admin', 'Admin']
export const canVerifyRole = (r: Role) => CHECKER_ROLES.includes(r)
export const canApproveRole = (r: Role) => APPROVER_ROLES.includes(r)
export const canCreateRole = (r: Role) => !['MIS Team', 'Finance Team', 'Legal Team', 'Engineer', 'Project Team', 'Project Head'].includes(r)
