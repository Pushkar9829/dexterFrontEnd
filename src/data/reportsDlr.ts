// DLR2 / DLR3 daily liquidity reports: per-ATM summary (CBR upload tracker) + per-ATM detail sheets.
import { createStore } from '@/lib/store'
import { SITES, rng, type Row } from './reportsFinancial'

export type DlrKind = 'dlr2' | 'dlr3'
export const DENOS = ['100', '200', '500'] as const

const pad = (n: number) => String(n).padStart(2, '0')
const round = (n: number, to = 100) => Math.round(n / to) * to
/** consecutive ISO dates ending on `end` */
function dates(end: string, n: number) {
  const [y, m, d] = end.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const dt = new Date(y, m - 1, d - (n - 1 - i))
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
  })
}

// ── Summary (CBR upload tracker) ──────────────────────────────────────────
export type DlrSummaryRow = { id: string; atmId: string; franchise: string; frId: string; cbrDate: string; uploaded: 'Uploaded' | 'Pending' }

function seedSummary(kind: DlrKind): DlrSummaryRow[] {
  return SITES.map((s, i) => {
    const pending = kind === 'dlr2' ? i % 4 === 2 : i % 3 === 1
    return {
      id: s.atmId,
      atmId: s.atmId,
      franchise: s.franchise,
      frId: s.frId,
      cbrDate: pending ? '2026-10-12' : '2026-10-13',
      uploaded: pending ? 'Pending' : 'Uploaded',
    }
  })
}

export const dlrSummaryStores = {
  dlr2: createStore<DlrSummaryRow[]>('dexter.reports.dlr2-summary.v1', () => seedSummary('dlr2')),
  dlr3: createStore<DlrSummaryRow[]>('dexter.reports.dlr3-summary.v1', () => seedSummary('dlr3')),
}

// ── Detail sheets ─────────────────────────────────────────────────────────
export const dlrDetailStores = {
  dlr2: createStore<Record<string, Row[]>>('dexter.reports.dlr2-detail.v1', () => ({})),
  dlr3: createStore<Record<string, Row[]>>('dexter.reports.dlr3-detail.v1', () => ({})),
}

const siteIndex = (atmId: string) => Math.max(0, SITES.findIndex((s) => s.atmId === atmId))

function seedDlr2(atmId: string): Row[] {
  const r = rng(101 + siteIndex(atmId) * 13)
  let wla = round(40000 + r() * 60000)
  return dates('2026-10-13', 15).map((d, i) => {
    const fund = [100000, 150000, 200000, 250000, 300000][Math.floor(r() * 5)]
    const n500 = Math.floor((fund * 0.6) / 500)
    const n200 = Math.floor((fund * 0.25) / 200)
    const n100 = Math.floor((fund - n500 * 500 - n200 * 200) / 100)
    const dispense = round(fund * (0.75 + r() * 0.2))
    const counter = dispense + (r() < 0.2 ? 100 : 0)
    const p500 = Math.floor(r() * 30)
    const p200 = Math.floor(r() * 20)
    const p100 = Math.floor(r() * 25)
    const purge = r() < 0.6 ? `100×${Math.floor(r() * 6)} / 200×${Math.floor(r() * 4)} / 500×${Math.floor(r() * 3)}` : ''
    const excess = purge ? round(r() * 1500) : 0
    const diff = r() < 0.15 ? (r() < 0.5 ? -500 : 200) : 0
    wla = Math.max(0, wla + fund - round(fund * (0.9 + r() * 0.1)))
    return {
      id: `${atmId}-D2-${i + 1}`,
      totalFund: String(fund),
      fundsDate: d,
      fundsReceived: `500×${n500} / 200×${n200} / 100×${n100}`,
      wlaBalance: String(wla),
      physical2300: `100×${p100} / 200×${p200} / 500×${p500}`,
      actualDispense: String(dispense),
      counterDispense: String(counter),
      rejectPurge: purge,
      excessPurge: excess ? String(excess) : '0',
      settlementDiff: String(diff),
      loadingDate: d,
      amountLoaded: `500×${n500} / 200×${n200} / 100×${n100}`,
      remark: diff < 0 ? 'Shortage raised with settlement team' : diff > 0 ? 'Excess adjusted in next settlement' : counter !== dispense ? 'Counter mismatch — CBR checked' : '',
    }
  })
}

export const DLR3_AMOUNT_KEYS = [
  'opening', 'dispensed', 'purge', 'beforeRepl', 'loaded', 'overage', 'shortage',
  'closing', 'fundsReceived', 'bankWithdrawal', 'wlaClosing', 'cashInHand', 'actualDispense', 'physical2300',
] as const

/** one row per date × denomination (100/200/500); the "Total=" row is computed, never stored */
function seedDlr3(atmId: string): Row[] {
  const r = rng(303 + siteIndex(atmId) * 7)
  const rows: Row[] = []
  const bal: Record<string, number> = { '100': 18000, '200': 46000, '500': 210000 }
  dates('2026-10-13', 5).forEach((d, gi) => {
    const group = `${atmId}-G${gi + 1}`
    for (const deno of DENOS) {
      const share = deno === '500' ? 0.62 : deno === '200' ? 0.25 : 0.13
      const opening = bal[deno]
      const dispensed = Math.min(opening, round(opening * (0.55 + r() * 0.3), Number(deno)))
      const purge = round(r() * 6, 1) * Number(deno)
      const before = opening - dispensed - purge
      const loaded = round(160000 * share * (0.8 + r() * 0.4), Number(deno))
      const over = r() < 0.12 ? Number(deno) : 0
      const short = r() < 0.08 ? Number(deno) : 0
      const closing = before + loaded + over - short
      bal[deno] = closing
      rows.push({
        id: `${group}-${deno}`,
        group,
        sn: String(gi + 1),
        date: d,
        deno,
        opening: String(opening),
        dispensed: String(dispensed),
        purge: String(purge),
        beforeRepl: String(before),
        loaded: String(loaded),
        overage: String(over),
        shortage: String(short),
        closing: String(closing),
        fundsReceived: String(loaded),
        bankWithdrawal: String(round(loaded * 0.1, Number(deno))),
        wlaClosing: String(round(30000 * share + r() * 5000, Number(deno))),
        cashInHand: String(round(r() * 8, 1) * Number(deno)),
        actualDispense: String(dispensed),
        physical2300: String(closing),
      })
    }
  })
  return rows
}

export function dlrRowsFor(kind: DlrKind, atmId: string): Row[] {
  const saved = dlrDetailStores[kind].get()[atmId]
  if (saved) return saved
  return kind === 'dlr2' ? seedDlr2(atmId) : seedDlr3(atmId)
}

export function saveDlr(kind: DlrKind, atmId: string, rows: Row[]) {
  dlrDetailStores[kind].set((m) => ({ ...m, [atmId]: rows }))
  const latest = rows.map((r) => (kind === 'dlr2' ? r.fundsDate : r.date)).filter(Boolean).sort().pop() ?? ''
  dlrSummaryStores[kind].set((list) => {
    const site = SITES.find((s) => s.atmId === atmId)
    const exists = list.some((x) => x.atmId === atmId)
    const upd: DlrSummaryRow = { id: atmId, atmId, franchise: site?.franchise ?? '', frId: site?.frId ?? '', cbrDate: latest, uploaded: 'Uploaded' }
    return exists ? list.map((x) => (x.atmId === atmId ? { ...x, cbrDate: latest || x.cbrDate, uploaded: 'Uploaded' } : x)) : [...list, upd]
  })
}

/** Adds a computed "Total=" row after each date group (read-only). */
export function withTotals(rows: Row[]): Row[] {
  const out: Row[] = []
  const groups = [...new Set(rows.map((r) => r.group))]
  for (const g of groups) {
    const gr = rows.filter((r) => r.group === g)
    out.push(...gr)
    const total: Row = { id: `${g}-total`, group: g, sn: '', date: gr[0]?.date ?? '', deno: 'Total=', isTotal: '1' }
    for (const k of DLR3_AMOUNT_KEYS) {
      const vals = gr.map((r) => r[k]).filter((v) => v !== '' && v != null)
      total[k] = vals.length ? String(vals.reduce((s, v) => s + (Number(v) || 0), 0)) : ''
    }
    out.push(total)
  }
  return out
}
