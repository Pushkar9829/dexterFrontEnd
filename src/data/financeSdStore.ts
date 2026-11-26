import { createStore } from '@/lib/store'
import { apiEnabled, finDelete, finLoader, finSave, type FinCfg } from './financeApi'
import { franchiseNameOf, siteAt } from '@/lib/siteRef'
import {
  SEED_SECURITY_DEPOSITS,
  createEmptySecurityDeposit,
  type SecurityDeposit,
  type SecurityDepositStatus,
} from './financeSd'

function sanitizeDeposits(list: SecurityDeposit[]): SecurityDeposit[] {
  return list.filter((s) => Boolean(s.franchiseeName?.trim() || s.siteId?.trim() || s.txnNumber?.trim()))
}

// Site identity (Site ID / ATM ID / franchise) from the common Site Master
const seedDeposits = (): SecurityDeposit[] =>
  SEED_SECURITY_DEPOSITS.map((d, i) => {
    const site = siteAt(i)
    return { ...d, siteId: site.siteId, atmId: site.atmId, franchiseeName: franchiseNameOf(site) || d.franchiseeName }
  })

export const securityDepositStore = createStore<SecurityDeposit[]>(apiEnabled ? 'dexter.finance.sd.api' : 'dexter.finance.sd.v2', apiEnabled ? () => [] : seedDeposits)
/** API mode: security deposits ↔ /finance/security-deposits (receipt no + Verified status set by the server; cash > ₹2 lakh refused). */
export const sdCfg: FinCfg<SecurityDeposit> = {
  key: 'security-deposits', label: 'Security deposit', get: () => securityDepositStore.get(), set: (l) => securityDepositStore.set(l),
  fields: ['paymentType', 'paymentDate', 'transactionDate', 'transferTime', 'txnNumber', 'amount', 'depositCategory', 'hpyAccount', 'cashLiveDate', 'frBankName', 'accountHolder', 'frAccount', 'frIfsc', 'branchName', 'franchiseeName', 'franchiseeNo', 'verifierRemarks'],
  money: ['amount'], dates: ['paymentDate', 'transactionDate', 'cashLiveDate'], dateOut: 'iso', times: ['transferTime'], statusField: 'status', blank: () => createEmptySecurityDeposit(),
  fromExtra: (r, f) => ({
    status: (f.sdStatus as string) || (r.status === 'Approved' ? 'Verified' : r.status === 'Rejected' ? 'Disputed' : 'Pending Verification'),
    transferTime: r.data.transferTime ? `${String(r.data.transferTime)}:00` : '',
    verifiedBy: r.approvedByName ?? '',
    verifiedAt: (r as { approvedAt?: string }).approvedAt ?? '',
  }),
}

// Auto-clean any ghost or empty records from local storage on load
try {
  const current = securityDepositStore.get()
  const cleaned = sanitizeDeposits(current)
  if (cleaned.length !== current.length) {
    securityDepositStore.set(cleaned)
  }
} catch {
  // Ignore in SSR/non-browser
}

export const useSecurityDeposits = () => {
  finLoader(sdCfg).use()
  const list = securityDepositStore.use()
  return sanitizeDeposits(list)
}

export function getSecurityDeposit(idOrTxn: string): SecurityDeposit | undefined {
  const all = sanitizeDeposits(securityDepositStore.get())
  return all.find(
    (s) =>
      s.id === idOrTxn ||
      s.txnNumber.toLowerCase() === idOrTxn.toLowerCase() ||
      s.receiptNo.toLowerCase() === idOrTxn.toLowerCase(),
  )
}

export function nextDepositId(): string {
  const all = securityDepositStore.get()
  const highest = all.reduce((max, s) => {
    const match = s.id.match(/(\d+)$/)
    if (match) return Math.max(max, parseInt(match[1], 10))
    return max
  }, 8)
  return `SD-2026-${String(highest + 1).padStart(4, '0')}`
}

export function nextReceiptNo(): string {
  const all = securityDepositStore.get()
  const highest = all.reduce((max, s) => {
    const match = s.receiptNo.match(/(\d+)$/)
    if (match) return Math.max(max, parseInt(match[1], 10))
    return max
  }, 8819)
  return `REC-SD-2026-${highest + 1}`
}

export function saveSecurityDeposit(deposit: SecurityDeposit): SecurityDeposit {
  const now = new Date().toISOString()
  const existing = deposit.id ? getSecurityDeposit(deposit.id) : undefined

  const toSave: SecurityDeposit = {
    ...deposit,
    id: existing?.id || deposit.id || nextDepositId(),
    receiptNo: deposit.receiptNo || existing?.receiptNo || nextReceiptNo(),
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }

  securityDepositStore.set((list) => {
    const exists = list.some((s) => s.id === toSave.id)
    if (exists) {
      return list.map((s) => (s.id === toSave.id ? toSave : s))
    }
    return [toSave, ...list]
  })

  if (apiEnabled) void finSave(sdCfg, existing, toSave)
  return toSave
}

export function deleteSecurityDeposit(id: string) {
  if (apiEnabled) void finDelete(sdCfg, id)
  securityDepositStore.set((list) => list.filter((s) => s.id !== id))
}

export function setSecurityDepositStatus(ids: string[], status: SecurityDepositStatus) {
  const now = new Date().toISOString()
  if (apiEnabled)
    ids.forEach((id) => {
      const prev = securityDepositStore.get().find((s) => s.id === id)
      if (prev) void finSave(sdCfg, prev, { ...prev, status })
    })
  securityDepositStore.set((list) =>
    list.map((s) => (ids.includes(s.id) ? { ...s, status, updatedAt: now } : s)),
  )
}

export { createEmptySecurityDeposit }
