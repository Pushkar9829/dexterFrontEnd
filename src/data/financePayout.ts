// Finance · Payout details — Pay-out Account master (Figma 98:9841 list, 98:10848 view, 211:19638 edit).
// 11 fields: S.N. (system), LOI Code, ATM ID, Pan name, PAN NO | Acc. Name / Acc. No. / Bank Name / IFSC (Settlement) | Email Subject, Status.
// The design supplies no Status options — Status is a free-text field; Active | Pending verification | Inactive are offered as suggestions only.
import { createStore } from '@/lib/store'
import { SITES, getFranchisee } from './cbrSites'

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
  const out: PayoutRecord[] = []
  // each site's ATM, plus a second ATM on a few high-volume sites
  const extra: [string, string][] = [
    ['ST-MH-PUN-00124', 'DX-MH-01483'],
    ['ST-MH-PUN-00131', 'DX-MH-01498'],
    ['ST-KA-BLR-00076', 'DX-KA-00762'],
    ['ST-KA-BLR-00081', 'DX-KA-00769'],
    ['ST-GJ-AMD-00218', 'DX-GJ-02188'],
    ['ST-UP-LKO-00305', 'DX-UP-03052'],
  ]
  const pairs: [string, string][] = [...SITES.map((s) => [s.siteId, s.atmId] as [string, string]), ...extra]
  pairs.forEach(([siteId, atmId], i) => {
    const site = SITES.find((s) => s.siteId === siteId)!
    const fr = getFranchisee(site.franchiseId)!
    const sn = i + 1
    const status: string = i === 9 ? 'Inactive' : i >= 14 ? 'Pending verification' : i === 11 ? '' : 'Active'
    out.push({
      id: `PAY-${String(sn).padStart(4, '0')}`,
      sn,
      loiCode: site.loi,
      atmId,
      panName: fr.panName,
      panNo: fr.pan,
      accName: fr.panName,
      accNo: i >= 12 ? fr.accNo.slice(0, -2) + String(10 + i) : fr.accNo,
      bankName: fr.bank,
      ifsc: fr.ifsc,
      emailSubject: `Payout advice – ${atmId} – ${fr.name}`,
      status,
      updatedAt: '2026-10-08T12:15:00+05:30',
      updatedBy: 'Vikram Shah',
    })
  })
  return out
}

export const payoutStore = createStore<PayoutRecord[]>('dexter.finance.payout.v1', seed)
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
    return created
  }
  const saved = { ...rec, ...stamp }
  payoutStore.set((all) => all.map((p) => (p.id === rec.id ? saved : p)))
  return saved
}
