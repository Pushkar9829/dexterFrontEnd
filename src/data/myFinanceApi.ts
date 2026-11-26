// Franchise self-service finance (backend /my/finance/*) for the mobile Accounts screen — API mode, Franchisee only.
// A franchisee submits GST invoices, CLF payments, security deposits and A/C change requests into the SAME registers
// the Finance team works on (created directly as Submitted; a Finance checker approves). Reads are scoped to the
// caller's own franchise. The records are adapted with the register configs (financeApi.fromApi) and written into the
// same frontend stores the screen already reads, so the list views stay unchanged. Mock mode: nothing here runs.
import { apiEnabled, get, post, uploadFile } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { createLoader, fetchAll } from './opsApi'
import { fromApi, type BRec } from './financeApi'
import { gstCfg } from './financeGst'
import { clfCfg } from './financeClf'
import { sdCfg } from './financeSdStore'
import { acChangeCfg } from './financeSettlementBank'

export type MyFinanceKind = 'gst-invoices' | 'clf' | 'security-deposits' | 'ac-change-requests'
export type MyFinanceSummary = { frId: string; modules: Record<MyFinanceKind, Record<'Draft' | 'Submitted' | 'Approved' | 'Rejected', number>> }

/** API mode with a Franchisee session → /my/finance is the source; preview roles (Admins) keep the local path. */
export const myFinanceApiOn = () => apiEnabled && getSession()?.role === 'Franchisee'

let summary: MyFinanceSummary | null = null
export const myFinanceSummary = () => summary

/** Hydrates the four registers (own franchise only) + the status summary. */
export const myFinanceLoader = createLoader('your finance records', async () => {
  if (!myFinanceApiOn()) return
  const [gst, clf, sd, acr, sum] = await Promise.all([
    fetchAll<BRec>('/my/finance/gst-invoices'),
    fetchAll<BRec>('/my/finance/clf'),
    fetchAll<BRec>('/my/finance/security-deposits'),
    fetchAll<BRec>('/my/finance/ac-change-requests'),
    get<MyFinanceSummary>('/my/finance/summary'),
  ])
  gstCfg.set(gst.map((r) => fromApi(gstCfg, r)))
  clfCfg.set(clf.map((r) => fromApi(clfCfg, r)))
  sdCfg.set(sd.map((r) => fromApi(sdCfg, r)))
  acChangeCfg.set(acr.map((r) => fromApi(acChangeCfg, r)))
  summary = sum
})

/** Upload an attachment as the franchise user's own file (the backend only accepts the caller's uploads). */
export async function uploadMyFinanceFile(file: File, purpose: string): Promise<string> {
  return (await uploadFile(file, { purpose, entity: 'FinanceRecord' })).fileId
}

/** POST /my/finance/:kind → the created record (Submitted). Re-hydrates the lists. Throws the ApiError on refusal. */
export async function submitMyFinance(kind: MyFinanceKind, body: Record<string, unknown>): Promise<BRec> {
  const r = await post<BRec>(`/my/finance/${kind}`, body)
  await myFinanceLoader.reload()
  return r
}

// ── small converters for the form values the screen holds ──
/** "2,50,000.50" / 250000 (rupees) → integer paise. */
export const rupeesToPaise = (v: string | number) => Math.round((Number(String(v).replace(/[,₹\s]/g, '')) || 0) * 100)
/** dd-mm-yyyy or yyyy-mm-dd → yyyy-mm-dd. */
export const isoDate = (v: string) => {
  const s = v.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s
}
/** Financial year of a yyyy-mm-dd date ("2026-27"). */
export const fyOf = (iso: string) => {
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7))
  const start = m >= 4 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
