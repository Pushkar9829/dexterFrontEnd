// Finance · GST details (Figma 95:7894 list, 98:7683 record view, 211:19323 edit).
// 24 source fields in 4 bands of 6. All fields optional; Net Amount is entered manually (we only suggest a calculation).
import { createStore } from '@/lib/store'
import { FRANCHISEES, SITES, rng } from './cbrSites'

export const GST_INVOICE_STATUSES = ['Pending at FR End', 'Pending at Hitachi End'] as const
export const GST_PAYMENT_STATUSES = ['Pending', 'Done'] as const
export type GstInvoiceStatus = (typeof GST_INVOICE_STATUSES)[number]
export type GstPaymentStatus = (typeof GST_PAYMENT_STATUSES)[number]

export const FIN_YEARS = ['24-25', '25-26', '26-27'] as const
export const FY_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'] as const

export type GstRecord = {
  id: string // GST-0001
  sn: number // system-assigned
  fYear: string
  month: string
  siteId: string
  atmId: string
  sapCode: string
  franchiseeName: string
  contactNo: string
  locationName: string
  gstNumber: string
  invoiceNumber: string
  invoiceAmount: string
  tds: string
  cashShortageDeduction: string
  disputeDeduction: string
  chargebackDeduction: string
  gstRelatedDeduction: string
  netAmount: string
  paidAmount: string
  paymentDate: string // ISO yyyy-mm-dd
  utrNumber: string
  invoiceStatus: GstInvoiceStatus | ''
  paymentStatus: GstPaymentStatus | ''
  remark: string
  updatedAt: string
  updatedBy: string
}

export const DEDUCTION_KEYS = ['tds', 'cashShortageDeduction', 'disputeDeduction', 'chargebackDeduction', 'gstRelatedDeduction'] as const

/** 4 sections × 6 fields, in source order. */
export const GST_SECTIONS: { title: string; sub: string; fields: { key: keyof GstRecord; label: string }[] }[] = [
  {
    title: 'Identity & reporting period',
    sub: 'Record identifiers and reporting period. S.N. is system-assigned.',
    fields: [
      { key: 'sn', label: 'S.N.' },
      { key: 'fYear', label: 'F. Year' },
      { key: 'month', label: 'Month' },
      { key: 'siteId', label: 'Site ID' },
      { key: 'atmId', label: 'ATM Id' },
      { key: 'sapCode', label: 'SAP Code' },
    ],
  },
  {
    title: 'Franchise & invoice details',
    sub: 'Franchise contact, location, GST registration and invoice information.',
    fields: [
      { key: 'franchiseeName', label: 'Franchisee Name' },
      { key: 'contactNo', label: 'Contact No.' },
      { key: 'locationName', label: 'Location Name' },
      { key: 'gstNumber', label: 'GST Number' },
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'invoiceAmount', label: 'Invoice Amount' },
    ],
  },
  {
    title: 'Deductions & net amount',
    sub: 'Enter the supplied amounts in INR. Net Amount is entered manually; no calculation is applied.',
    fields: [
      { key: 'tds', label: 'TDS' },
      { key: 'cashShortageDeduction', label: 'Cash Shortage Deduction' },
      { key: 'disputeDeduction', label: 'Dispute Deduction' },
      { key: 'chargebackDeduction', label: 'Charge back Deduction' },
      { key: 'gstRelatedDeduction', label: 'GST Related Deduction' },
      { key: 'netAmount', label: 'Net Amount' },
    ],
  },
  {
    title: 'Payment, status & remarks',
    sub: 'Payment reference and source status choices. Leave unspecified values blank.',
    fields: [
      { key: 'paidAmount', label: 'Paid Amount' },
      { key: 'paymentDate', label: 'Payment Date' },
      { key: 'utrNumber', label: 'UTR Number' },
      { key: 'invoiceStatus', label: 'GST Invoice Status' },
      { key: 'paymentStatus', label: 'GST Payment Status' },
      { key: 'remark', label: 'Remark' },
    ],
  },
]

export const AMOUNT_KEYS: (keyof GstRecord)[] = ['invoiceAmount', ...DEDUCTION_KEYS, 'netAmount', 'paidAmount']

export const numOr0 = (v: string) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v))
export const deductionsOf = (r: Pick<GstRecord, (typeof DEDUCTION_KEYS)[number]>) => DEDUCTION_KEYS.reduce((s, k) => s + numOr0(r[k]), 0)
export const calcNet = (r: GstRecord) => Math.round((numOr0(r.invoiceAmount) - deductionsOf(r)) * 100) / 100

/** Calendar year of a FY month, e.g. ('25-26','January') → 2026 */
export function calYear(fy: string, month: string) {
  const start = 2000 + Number(fy.slice(0, 2))
  return FY_MONTHS.indexOf(month as (typeof FY_MONTHS)[number]) >= 9 ? start + 1 : start
}

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
export const UTR_RE = /^[A-Z0-9]{12,22}$/
export const MOBILE_RE = /^[6-9]\d{9}$/

function seed(): GstRecord[] {
  const r = rng(2026)
  // (fy, month) periods with how many records each, ending Sep 2026 (current FY 26-27)
  const periods: [string, string, number][] = [
    ['24-25', 'October', 2], ['24-25', 'December', 2], ['24-25', 'February', 2],
    ['25-26', 'April', 2], ['25-26', 'June', 2], ['25-26', 'August', 2], ['25-26', 'October', 2], ['25-26', 'November', 2], ['25-26', 'December', 2],
    ['25-26', 'January', 2], ['25-26', 'February', 2], ['25-26', 'March', 2],
    ['26-27', 'April', 3], ['26-27', 'May', 3], ['26-27', 'June', 3], ['26-27', 'July', 3], ['26-27', 'August', 3], ['26-27', 'September', 3],
  ]
  const out: GstRecord[] = []
  let siteIdx = 0
  const invSeq: Record<string, number> = {}
  for (const [fy, month, n] of periods) {
    for (let k = 0; k < n; k++) {
      const site = SITES[siteIdx++ % SITES.length]
      const fr = FRANCHISEES.find((f) => f.id === site.franchiseId)!
      const sn = out.length + 1
      const year = calYear(fy, month)
      const mIdx = (FY_MONTHS.indexOf(month as (typeof FY_MONTHS)[number]) + 3) % 12 // 0 = Jan
      const seqKey = `${fr.short}-${fy}`
      invSeq[seqKey] = (invSeq[seqKey] ?? 0) + 1
      const invoice = Math.round(18000 + r() * 47000)
      const taxable = invoice / 1.18
      const tds = Math.round(taxable * 0.02)
      const shortage = r() < 0.18 ? [500, 1000, 2000, 2500][Math.floor(r() * 4)] : 0
      const dispute = r() < 0.12 ? [700, 1200, 1500][Math.floor(r() * 3)] : 0
      const chargeback = r() < 0.1 ? [400, 900][Math.floor(r() * 2)] : 0
      const recent = fy === '26-27' && ['July', 'August', 'September'].includes(month)
      const mid = fy === '26-27' && ['May', 'June'].includes(month)
      let invoiceStatus: GstRecord['invoiceStatus'] = ''
      let paymentStatus: GstRecord['paymentStatus'] = 'Done'
      if (recent) {
        invoiceStatus = r() < 0.55 ? 'Pending at FR End' : 'Pending at Hitachi End'
        paymentStatus = 'Pending'
      } else if (mid && r() < 0.5) {
        invoiceStatus = 'Pending at Hitachi End'
        paymentStatus = 'Pending'
      } else if (r() < 0.06) {
        paymentStatus = ''
      }
      // GST portion is withheld until the invoice is reflected on the GST portal
      const gstRelated = invoiceStatus === 'Pending at FR End' ? Math.round(invoice - taxable) : 0
      const net = invoice - tds - shortage - dispute - chargeback - gstRelated
      const done = paymentStatus === 'Done'
      const payMonth = (mIdx + 1) % 12
      const payYear = mIdx === 11 ? year + 1 : year
      const payDate = `${payYear}-${String(payMonth + 1).padStart(2, '0')}-${String(8 + Math.floor(r() * 15)).padStart(2, '0')}`
      const bankCode = fr.ifsc.slice(0, 4)
      out.push({
        id: `GST-${String(sn).padStart(4, '0')}`,
        sn,
        fYear: fy,
        month,
        siteId: site.siteId,
        atmId: site.atmId,
        sapCode: fr.sapCode,
        franchiseeName: fr.name,
        contactNo: fr.contact,
        locationName: `${site.location}, ${site.city}`,
        gstNumber: fr.gstin,
        invoiceNumber: invoiceStatus === 'Pending at FR End' && r() < 0.4 ? '' : `${fr.short}/${fy}/${String(invSeq[seqKey]).padStart(3, '0')}`,
        invoiceAmount: String(invoice),
        tds: String(tds),
        cashShortageDeduction: shortage ? String(shortage) : '',
        disputeDeduction: dispute ? String(dispute) : '',
        chargebackDeduction: chargeback ? String(chargeback) : '',
        gstRelatedDeduction: gstRelated ? String(gstRelated) : '',
        netAmount: String(net),
        paidAmount: done ? String(net) : '',
        paymentDate: done ? payDate : '',
        utrNumber: done ? `${bankCode}N${payYear % 100}${String(Math.floor(r() * 1e9)).padStart(9, '0')}` : '', // 16-char NEFT UTR
        invoiceStatus,
        paymentStatus,
        remark: shortage
          ? `Cash shortage recovered for ${month} EOD.`
          : dispute
            ? 'Dispute deduction as per chargeback register.'
            : invoiceStatus === 'Pending at FR End'
              ? 'GST invoice awaited from franchisee.'
              : invoiceStatus === 'Pending at Hitachi End'
                ? 'Invoice received; under GSTR-2B reconciliation.'
                : '',
        updatedAt: done ? `${payDate}T11:30:00+05:30` : '2026-10-10T10:00:00+05:30',
        updatedBy: done ? 'Vikram Shah' : 'Paras Dubey',
      })
    }
  }
  return out
}

export const gstStore = createStore<GstRecord[]>('dexter.finance.gst.v1', seed)
export const getGst = (id: string) => gstStore.get().find((g) => g.id === id)

export function emptyGst(fy = '26-27'): GstRecord {
  return {
    id: '', sn: 0, fYear: fy, month: '', siteId: '', atmId: '', sapCode: '', franchiseeName: '', contactNo: '', locationName: '', gstNumber: '',
    invoiceNumber: '', invoiceAmount: '', tds: '', cashShortageDeduction: '', disputeDeduction: '', chargebackDeduction: '', gstRelatedDeduction: '',
    netAmount: '', paidAmount: '', paymentDate: '', utrNumber: '', invoiceStatus: '', paymentStatus: '', remark: '', updatedAt: '', updatedBy: '',
  }
}

export function saveGst(rec: GstRecord): GstRecord {
  const stamp = { updatedAt: new Date().toISOString(), updatedBy: 'Paras Dubey' }
  if (!rec.id) {
    const all = gstStore.get()
    const sn = all.reduce((m, g) => Math.max(m, g.sn), 0) + 1
    const created = { ...rec, ...stamp, sn, id: `GST-${String(sn).padStart(4, '0')}` }
    gstStore.set([...all, created])
    return created
  }
  const saved = { ...rec, ...stamp }
  gstStore.set((all) => all.map((g) => (g.id === rec.id ? saved : g)))
  return saved
}

export function deleteGst(id: string) {
  gstStore.set((all) => all.filter((g) => g.id !== id))
}

/** List filter (View by / F.Y. / Month) — persisted so the record page can show the report context. */
export type GstView = { mode: 'Yearly' | 'Monthly'; fy: string; month: string }
export const gstViewStore = createStore<GstView>('dexter.finance.gstview.v1', () => ({ mode: 'Yearly', fy: '26-27', month: '' }))
