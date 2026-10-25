import { createStore } from '@/lib/store'
import {
  SEED_SECURITY_DEPOSITS,
  createEmptySecurityDeposit,
  type SecurityDeposit,
  type SecurityDepositStatus,
} from './financeSd'

function sanitizeDeposits(list: SecurityDeposit[]): SecurityDeposit[] {
  return list.filter((s) => Boolean(s.franchiseeName?.trim() || s.siteId?.trim() || s.txnNumber?.trim()))
}

export const securityDepositStore = createStore<SecurityDeposit[]>(
  'dexter.finance.sd.v1',
  () => SEED_SECURITY_DEPOSITS,
)

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

  return toSave
}

export function deleteSecurityDeposit(id: string) {
  securityDepositStore.set((list) => list.filter((s) => s.id !== id))
}

export function setSecurityDepositStatus(ids: string[], status: SecurityDepositStatus) {
  const now = new Date().toISOString()
  securityDepositStore.set((list) =>
    list.map((s) => (ids.includes(s.id) ? { ...s, status, updatedAt: now } : s)),
  )
}

export { createEmptySecurityDeposit }
