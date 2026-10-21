// CBR (cash balance report) — Consolidated Datewise CBR (75:5628), Daily CBR (75:5629 / 208:11219),
// CBR EOD Summary (209:12015) and Daily CBR mobile (75:5631).
// The daily denomination-wise record is the single source of truth; consolidated rows are derived from it.
import { createStore } from '@/lib/store'
import { SITES, getSite, rng, type CbrSite } from './cbrSites'

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
export const dailyStore = createStore<Record<string, DailyCbr>>('dexter.cbr.daily.v1', () => ({}))

export function dailyForSite(siteId: string): DailyCbr[] {
  const site = getSite(siteId)
  if (!site) return []
  const edits = dailyStore.get()
  return genSite(site).map((d) => edits[d.id] ?? d)
}

export function getDaily(id: string): DailyCbr | undefined {
  const site = SITES.find((s) => id.startsWith(`${s.siteId}-`))
  if (!site) return undefined
  return dailyStore.get()[id] ?? genSite(site).find((d) => d.id === id)
}

export function saveDaily(d: DailyCbr) {
  dailyStore.set((m) => ({ ...m, [d.id]: { ...d, updatedBy: 'Paras Dubey', updatedAt: new Date().toISOString() } }))
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
export const uploadStore = createStore<Record<string, UploadState>>('dexter.cbr.uploads.v1', seedUploads)

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
export const counterStore = createStore<CounterClear[]>('dexter.cbr.counters.v1', seedCounters)

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
