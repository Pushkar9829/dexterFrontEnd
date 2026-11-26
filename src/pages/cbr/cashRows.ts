// Adapter for the older CBR report pages (Consolidated / Daily / EOD Summary): they now read the REAL records of the
// new flow — the CBR Master (Full Funding) and the Cash Loading Master (Self Funding) — instead of the old demo data.
import { cbrMaster, clBalance, type CashKind, type CashMaster, type CashRecord } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'

export type CashRow = {
  id: string
  kind: CashKind
  date: string
  lastDate: string
  atmId: string
  siteId: string
  franchiseName: string
  formName: string
  status: string
  locked: boolean
  channel: string
  amount: number
  dailyIndent: number
  cashWithdrawal: number
  openingBalance: number
  balance: number
  docs: number
  submittedBy: string
  approvedBy: string
  remarks: string
}

export const masterOf = (k: CashKind): CashMaster => (k === 'CBR' ? cbrMaster : clMaster)
export const parseKind = (v: string | null): CashKind => (v === 'cl' || v === 'Cash Loading' ? 'Cash Loading' : 'CBR')
export const kindParam = (k: CashKind) => (k === 'CBR' ? 'cbr' : 'cl')

/** Which master holds this record id (CBR-… / CL-…). */
export function recordById(id: string): { kind: CashKind; rec: CashRecord } | undefined {
  const c = cbrMaster.get(id)
  if (c) return { kind: 'CBR', rec: c }
  const l = clMaster.get(id)
  return l ? { kind: 'Cash Loading', rec: l } : undefined
}

/** Form route of the new flow for each master. */
export const formPathOf = (k: CashKind) => (k === 'CBR' ? '/cbr/replenishment/new' : '/operations/cash-loading/new')

export const toRow = (r: CashRecord): CashRow => ({
  id: r.id,
  kind: r.kind,
  date: r.date,
  lastDate: r.lastDate,
  atmId: r.atmId,
  siteId: r.siteId,
  franchiseName: r.franchiseName,
  formName: r.formName,
  status: r.status,
  locked: r.locked,
  channel: r.channel,
  amount: r.amount,
  dailyIndent: r.dailyIndent,
  cashWithdrawal: r.cashWithdrawal,
  openingBalance: r.openingBalance,
  balance: r.kind === 'Cash Loading' ? clBalance(r) : 0,
  docs: r.documents.length,
  submittedBy: r.trail.submittedBy ?? '',
  approvedBy: r.trail.approvedBy ?? '',
  remarks: r.rejectReason ? `Rejected: ${r.rejectReason}` : r.trail.returnReason && r.status === 'Returned for Correction' ? `Returned: ${r.trail.returnReason}` : r.remarks,
})

const DAY = 86_400_000
export const isoAddDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

/** "Uploaded" for the EOD tracker = submitted into the workflow (anything past Draft) with a supporting document. */
export const isUploaded = (r: CashRecord) => r.status !== 'Draft' && r.documents.length > 0
