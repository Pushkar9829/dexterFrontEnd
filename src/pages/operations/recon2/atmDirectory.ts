// ATM → site / franchise / funding-model resolution and §11.3 source-record lookup for disputes.
// Full Funding → CBR Master + Full Funding EOD; Self Funding → Cash Loading Master + Self-Funding EOD.
import { fundingOf, type FundingModel } from '@/data/workflow'
import { siteByAtm } from '@/data/network'
import { franchiseNameOf, siteAt } from '@/lib/siteRef'
import { getFranchise } from '@/data/franchises'
import { KNOWN_ATMS } from '@/data/txnData'
import { SITES, getFranchisee } from '@/data/cbrSites'
import { dailyForSite, reconcile, amountOf } from '@/data/cbr'
import { cashLoadingRegisterStore } from '@/data/cashLoadingRegisterStore'
import { ffmSfStore } from '@/data/eodStore'

export type AtmInfo = { atmId: string; siteId: string; franchiseId: string; franchiseName: string; funding: FundingModel; known: boolean }

// Self Funding (Cash Loading) ATMs come from the Site Master — no module-specific IDs.
const CASH_LOADING_ATMS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => siteAt(i * 3, (s) => s.siteType === 'SF')).map((s) => [s.atmId, franchiseNameOf(s)]),
)

export function atmInfo(atmIdRaw: string): AtmInfo {
  const atmId = atmIdRaw.trim().toUpperCase()
  const site = atmId ? siteByAtm(atmId) : undefined
  if (site) {
    const fr = getFranchise(site.frId)
    return { atmId: site.atmId, siteId: site.siteId, franchiseId: site.frId, franchiseName: fr?.name ?? site.frId, funding: fundingOf(site.siteType), known: true }
  }
  const cbr = SITES.find((s) => s.atmId.toUpperCase() === atmId)
  if (cbr) {
    const fr = getFranchisee(cbr.franchiseId)
    return { atmId: cbr.atmId, siteId: cbr.siteId, franchiseId: cbr.franchiseId, franchiseName: fr?.name ?? cbr.franchiseId, funding: 'Full Funding', known: true }
  }
  const k = KNOWN_ATMS.find((a) => a.atmId.toUpperCase() === atmId)
  if (k) return { atmId: k.atmId, siteId: k.siteId, franchiseId: '—', franchiseName: k.name, funding: k.type === 'FFM' ? 'Full Funding' : 'Self Funding', known: true }
  const cl = Object.keys(CASH_LOADING_ATMS).find((a) => a.toUpperCase() === atmId)
  if (cl) { const st = siteByAtm(cl); return { atmId: cl, siteId: st?.siteId ?? '—', franchiseId: st?.frId ?? '—', franchiseName: CASH_LOADING_ATMS[cl], funding: 'Self Funding', known: true } }
  const e = ffmSfStore.get().find((r) => r.atmId.toUpperCase() === atmId)
  if (e) return { atmId: e.atmId, siteId: e.siteId, franchiseId: '—', franchiseName: e.frName, funding: e.fundingType === 'FFM' ? 'Full Funding' : 'Self Funding', known: true }
  return { atmId, siteId: '—', franchiseId: '—', franchiseName: '—', funding: 'Self Funding', known: false }
}

/** Picker options: CBR (Full Funding) sites, transaction-data ATMs and Cash Loading (Self Funding) ATMs. */
export function atmOptions(): string[] {
  const ids = [...SITES.map((s) => s.atmId), ...KNOWN_ATMS.map((a) => a.atmId), ...Object.keys(CASH_LOADING_ATMS)]
  return [...new Set(ids)]
}

export type SourceRecord = { source: string; ref: string; detail: string; found: boolean }

const toIso = (d: string) => {
  // accepts yyyy-mm-dd, dd-mm-yyyy, dd.mm.yyyy, dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
  const m = d.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/)
  if (!m) return ''
  const y = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}
export const normaliseDate = toIso
const rs = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** §11.3 — the only records a dispute may be verified against, chosen by funding model (never mixed). */
export function sourceRecordsFor(funding: FundingModel, atmId: string, txnDate: string): SourceRecord[] {
  const iso = toIso(txnDate)
  const id = atmId.trim().toUpperCase()
  const out: SourceRecord[] = []
  if (funding === 'Full Funding') {
    const site = SITES.find((s) => s.atmId.toUpperCase() === id)
    if (site) {
      const days = dailyForSite(site.siteId)
      const day = days.find((d) => d.date === iso) ?? days[days.length - 1]
      if (day) {
        const r = reconcile(day)
        out.push({
          source: 'CBR Master',
          ref: day.id,
          detail: `${day.date === iso ? '' : `No CBR for ${iso || 'txn date'} — nearest `}${day.date} · overage ${rs(amountOf(day.groups.overage))} · shortage ${rs(amountOf(day.groups.shortage))} · closing diff ${rs(r.diff)}`,
          found: day.date === iso,
        })
      }
    } else out.push({ source: 'CBR Master', ref: '—', detail: 'ATM not found in CBR Master', found: false })
    const eod = ffmSfStore.get().find((r) => r.fundingType === 'FFM' && r.atmId.toUpperCase() === id)
    out.push(eod ? { source: 'Full Funding EOD', ref: eod.id, detail: `${eod.month} · closing overage ${rs(eod.closeOverage)} · machine ${rs(eod.actualMachine)}`, found: true } : { source: 'Full Funding EOD', ref: '—', detail: 'No Full Funding EOD for this ATM', found: false })
  } else if (funding === 'Self Funding') {
    const rows = cashLoadingRegisterStore.get().filter((r) => r.atmId.toUpperCase() === id)
    const hit = rows.find((r) => toIso(r.date) === iso) ?? rows[0]
    out.push(
      hit
        ? { source: 'Cash Loading Master', ref: `CL-${hit.no}`, detail: `${toIso(hit.date) === iso ? '' : `No loading for ${iso || 'txn date'} — nearest `}${hit.date} · loading ${rs(hit.loading)} · overage ${rs(hit.overage)} · shortage ${rs(hit.shortage)}`, found: toIso(hit.date) === iso }
        : { source: 'Cash Loading Master', ref: '—', detail: 'ATM not found in Cash Loading register', found: false },
    )
    const eod = ffmSfStore.get().find((r) => r.fundingType === 'SF' && r.atmId.toUpperCase() === id)
    out.push(eod ? { source: 'Self-Funding EOD', ref: eod.id, detail: `${eod.month} · closing overage ${rs(eod.closeOverage)} · machine ${rs(eod.actualMachine)}`, found: true } : { source: 'Self-Funding EOD', ref: '—', detail: 'No Self-Funding EOD for this ATM', found: false })
  } else {
    out.push({ source: 'Transaction Data', ref: '—', detail: `${funding} site — verify against transaction records`, found: false })
  }
  return out
}

/** §11.3 label for the record set a dispute type uses. */
export const sourceLabel = (funding: FundingModel) =>
  funding === 'Full Funding' ? 'CBR Master + Full Funding EOD + supporting evidence' : funding === 'Self Funding' ? 'Cash Loading Master + Self-Funding EOD + supporting evidence' : 'Relevant transaction records'
