// Finance · Payout details — Pay-out Account master (Figma 98:9841 list, 98:10848 view, 211:19638 edit).
// 11 fields: S.N. (system), LOI Code, ATM ID, Pan name, PAN NO | Acc. Name / Acc. No. / Bank Name / IFSC (Settlement) | Email Subject, Status.
// The design supplies no Status options — Status is a free-text field; Active | Pending verification | Inactive are offered as suggestions only.
import { createStore } from '@/lib/store'
import { apiEnabled, finDelete, finLoader, finSave, type FinCfg } from './financeApi'
import { FRANCHISEES } from './cbrSites'
import { franchiseNameOf, siteAt } from '@/lib/siteRef'

export const PAYOUT_STATUSES = ['Active', 'Pending verification', 'Inactive'] as const
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]

export type PayoutRecord = {
  id: string // PAY-0001
  sn: number
  loiCode: string
  atmId: string
  panName: string
  panNo: string
  accName: string
  accNo: string
  bankName: string
  ifsc: string
  emailSubject: string
  status: string
  updatedAt: string
  updatedBy: string
}

export const PAYOUT_SECTIONS: { title: string; sub: string; fields: { key: keyof PayoutRecord; label: string }[] }[] = [
  {
    title: 'Identifiers & PAN',
    sub: 'Record identifiers and PAN details. S.N. is system-assigned and read-only.',
    fields: [
      { key: 'sn', label: 'S.N.' },
      { key: 'loiCode', label: 'LOI Code' },
      { key: 'atmId', label: 'ATM ID' },
      { key: 'panName', label: 'Pan name' },
      { key: 'panNo', label: 'PAN NO' },
    ],
  },
  {
    title: 'Settlement account & bank',
    sub: 'Keep the settlement account name and number separate from the PAN details.',
    fields: [
      { key: 'accName', label: 'Acc. Name (Settlement)' },
      { key: 'accNo', label: 'Acc. No. (Settlement)' },
      { key: 'bankName', label: 'Bank Name' },
      { key: 'ifsc', label: 'IFSC (Settlement)' },
    ],
  },
  {
    title: 'Email subject & status',
    sub: 'Email Subject is a subject field, not an email address. Status is unspecified; no options are supplied.',
    fields: [
      { key: 'emailSubject', label: 'Email Subject' },
      { key: 'status', label: 'Status' },
    ],
  },
]

export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const ACC_RE = /^\d{9,18}$/

export const maskAcc = (v: string) => (v ? `•••• ${v.slice(-4)}` : '')

function seed(): PayoutRecord[] {
  // Site identity from the common Site Master (siteAt is deterministic); bank details from the static payee list.
  const out: PayoutRecord[] = []
  for (let i = 0; i < 20; i++) {
    const site = siteAt(i)
    const fr = FRANCHISEES[i % FRANCHISEES.length]
    if (!site || !fr) continue
    const sn = i + 1
    const status: string = i === 9 ? 'Inactive' : i >= 14 ? 'Pending verification' : i === 11 ? '' : 'Active'
    out.push({
      id: `PAY-${String(sn).padStart(4, '0')}`,
      sn,
      loiCode: site.siteId,
      atmId: site.atmId,
      panName: fr.panName,
      panNo: fr.pan,
      accName: fr.panName,
      accNo: i >= 12 ? fr.accNo.slice(0, -2) + String(10 + i) : fr.accNo,
      bankName: fr.bank,
      ifsc: fr.ifsc,
      emailSubject: `Payout advice – ${site.atmId} – ${franchiseNameOf(site) || fr.name}`,
      status,
      updatedAt: '2026-10-08T12:15:00+05:30',
      updatedBy: 'Vikram Shah',
    })
  }
  return out
}

const payoutRaw = createStore<PayoutRecord[]>(apiEnabled ? 'dexter.finance.payout.api' : 'dexter.finance.payout.v2', apiEnabled ? () => [] : seed)
/** API mode: payout accounts ↔ /finance/payout-accounts (approval writes the Site Master payout mapping). */
export const payoutAccCfg: FinCfg<PayoutRecord> = {
  key: 'payout-accounts', label: 'Payout account', get: () => payoutRaw.get(), set: (l) => payoutRaw.set(l),
  fields: ['loiCode', 'panName', 'panNo', 'accName', 'accNo', 'bankName', 'ifsc', 'emailSubject', 'payoutStatus'],
  rename: { status: 'payoutStatus' }, statusField: 'status',
  fromExtra: (r) => ({ sn: Number(String(r.recordId).replace(/\D/g, '')) || 0, updatedBy: r.approvedByName ?? r.createdByName ?? '', updatedAt: r.updatedAt ?? '' }),
}
/** payoutStore.use() also hydrates from the backend in API mode. */
export const payoutStore = { ...payoutRaw, use: (): PayoutRecord[] => (finLoader(payoutAccCfg).use(), payoutRaw.use()) }
export const getPayout = (id: string) => payoutStore.get().find((p) => p.id === id)

export const emptyPayout = (): PayoutRecord => ({
  id: '', sn: 0, loiCode: '', atmId: '', panName: '', panNo: '', accName: '', accNo: '', bankName: '', ifsc: '', emailSubject: '', status: '', updatedAt: '', updatedBy: '',
})

export function savePayout(rec: PayoutRecord): PayoutRecord {
  const stamp = { updatedAt: new Date().toISOString(), updatedBy: 'Paras Dubey' }
  if (!rec.id) {
    const all = payoutStore.get()
    const sn = all.reduce((m, p) => Math.max(m, p.sn), 0) + 1
    const created = { ...rec, ...stamp, sn, id: `PAY-${String(sn).padStart(4, '0')}` }
    payoutStore.set([...all, created])
    if (apiEnabled) void finSave(payoutAccCfg, undefined, created)
    return created
  }
  const prev = payoutStore.get().find((p) => p.id === rec.id)
  const saved = { ...rec, ...stamp }
  payoutStore.set((all) => all.map((p) => (p.id === rec.id ? saved : p)))
  if (apiEnabled) void finSave(payoutAccCfg, prev, saved)
  return saved
}

export function deletePayout(id: string) {
  if (apiEnabled) void finDelete(payoutAccCfg, id)
  payoutStore.set((all) => all.filter((p) => p.id !== id))
}
