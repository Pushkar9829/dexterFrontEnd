// Finance · GST details (Figma 95:7894 list, 98:7683 record view, 211:19323 edit).
// Enhanced to match the unified GST Invoice Management & Payout Reconciliation UI.
import { createStore } from '@/lib/store'
import { FRANCHISEES, SITES, rng } from './cbrSites'

export const GST_INVOICE_STATUSES = [
  'Pending at Franchise',
  'Pending at Team',
  'Approved',
  'Reconciled',
] as const

export const GST_PAYMENT_STATUSES = ['Pending', 'Paid'] as const

export type GstInvoiceStatus = (typeof GST_INVOICE_STATUSES)[number]
export type GstPaymentStatus = (typeof GST_PAYMENT_STATUSES)[number]

export const FIN_YEARS = ['2026-27', '2025-26', '2024-25'] as const
export const FY_MONTHS = [
  'April 2026',
  'May 2026',
  'June 2026',
  'July 2026',
  'August 2026',
  'September 2026',
  'October 2026',
  'November 2026',
  'December 2026',
  'January 2027',
  'February 2027',
  'March 2027',
] as const

export const INDIAN_STATES = [
  'Uttar Pradesh',
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Gujarat',
  'Rajasthan',
  'West Bengal',
  'Madhya Pradesh',
  'Haryana',
  'Punjab',
  'Bihar',
  'Odisha',
  'Telangana',
  'Andhra Pradesh',
  'Kerala',
] as const

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
  state: string
  stateCode: string
  panNumber: string
  address: string
  invoiceNumber: string
  invoicePrefix?: string
  invoiceSeq?: string
  invoiceDate: string // DD-MM-YYYY
  basicAmount: string
  cgst: string
  sgst: string
  roundOff: string
  invoiceAmount: string
  tds: string
  cashShortageDeduction: string
  disputeDeduction: string
  chargebackDeduction: string
  gstRelatedDeduction: string
  netAmount: string
  paidAmount: string
  paymentDate: string // DD-MM-YYYY
  utrNumber: string
  invoiceStatus: GstInvoiceStatus | string
  paymentStatus: GstPaymentStatus | string
  remark: string
  updatedAt: string
  updatedBy: string
}

export const DEDUCTION_KEYS = [
  'tds',
  'cashShortageDeduction',
  'disputeDeduction',
  'chargebackDeduction',
  'gstRelatedDeduction',
] as const

export const numOr0 = (v: string | number) => {
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v
  if (!v) return 0
  const clean = v.replace(/,/g, '').trim()
  const n = Number(clean)
  return Number.isNaN(n) ? 0 : n
}

export const formatInr = (n: number | string) => {
  const num = typeof n === 'string' ? numOr0(n) : n
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const deductionsOf = (r: Partial<GstRecord>) =>
  DEDUCTION_KEYS.reduce((s, k) => s + numOr0(r[k] ?? '0'), 0)

export const calcNet = (r: Partial<GstRecord>) => {
  const inv = numOr0(r.invoiceAmount ?? '0')
  const ded = deductionsOf(r)
  return Math.max(0, Math.round((inv - ded) * 100) / 100)
}

function seed(): GstRecord[] {
  const r = rng(2026)
  const out: GstRecord[] = []

  // Top 4 exact records matching the screenshot
  const initial4: GstRecord[] = [
    {
      id: 'GST-0001',
      sn: 1,
      fYear: '2026-27',
      month: 'October 2026',
      siteId: '201',
      atmId: 'ATM12345',
      sapCode: 'SAP001256',
      franchiseeName: 'ABC Pvt. Ltd.',
      contactNo: '9876543210',
      locationName: 'Shop No. 1st Surajpur, Greater Noida',
      gstNumber: '09AABC134522J1ZE',
      state: 'Uttar Pradesh',
      stateCode: '09',
      panNumber: 'AAB1325482J',
      address: 'Shop No. 1st Surajpur\nGreater Noida\nUttar Pradesh - 201306',
      invoiceNumber: 'GST/26-27/00125',
      invoicePrefix: 'GST/26-27/',
      invoiceSeq: '00125',
      invoiceDate: '05-10-2026',
      basicAmount: '50,000.00',
      cgst: '4,500.00',
      sgst: '4,500.00',
      roundOff: '0.00',
      invoiceAmount: '59,000.00',
      tds: '0.00',
      cashShortageDeduction: '0.00',
      disputeDeduction: '0.00',
      chargebackDeduction: '0.00',
      gstRelatedDeduction: '0.00',
      netAmount: '59,000.00',
      paidAmount: '0.00',
      paymentDate: '',
      utrNumber: '',
      invoiceStatus: 'Pending at Franchise',
      paymentStatus: 'Pending',
      remark: 'Fresh invoice generated for October 2026 payout.',
      updatedAt: '2026-10-05T10:30:00+05:30',
      updatedBy: 'Vikram Shah',
    },
    {
      id: 'GST-0002',
      sn: 2,
      fYear: '2026-27',
      month: 'October 2026',
      siteId: '205',
      atmId: 'ATM12349',
      sapCode: 'SAP001257',
      franchiseeName: 'XYZ Services',
      contactNo: '9811223344',
      locationName: 'Sector 62, Noida, Uttar Pradesh',
      gstNumber: '09XYZ134522J1ZF',
      state: 'Uttar Pradesh',
      stateCode: '09',
      panNumber: 'XYZ134522J',
      address: 'Sector 62, Noida\nUttar Pradesh - 201301',
      invoiceNumber: 'GST/26-27/00126',
      invoicePrefix: 'GST/26-27/',
      invoiceSeq: '00126',
      invoiceDate: '06-10-2026',
      basicAmount: '40,000.00',
      cgst: '3,600.00',
      sgst: '3,600.00',
      roundOff: '0.00',
      invoiceAmount: '47,200.00',
      tds: '800.00',
      cashShortageDeduction: '1,700.00',
      disputeDeduction: '0.00',
      chargebackDeduction: '0.00',
      gstRelatedDeduction: '0.00',
      netAmount: '44,700.00',
      paidAmount: '0.00',
      paymentDate: '',
      utrNumber: '',
      invoiceStatus: 'Pending at Team',
      paymentStatus: 'Pending',
      remark: 'Under verification by operations team.',
      updatedAt: '2026-10-06T14:15:00+05:30',
      updatedBy: 'Paras Dubey',
    },
    {
      id: 'GST-0003',
      sn: 3,
      fYear: '2026-27',
      month: 'September 2026',
      siteId: '198',
      atmId: 'ATM12340',
      sapCode: 'SAP001258',
      franchiseeName: 'Global ATM Ltd.',
      contactNo: '9871100223',
      locationName: 'Kasna Road, Greater Noida',
      gstNumber: '09GLOB1234K1Z9',
      state: 'Uttar Pradesh',
      stateCode: '09',
      panNumber: 'GLOB1234K',
      address: 'Kasna Road, Greater Noida\nUttar Pradesh - 201310',
      invoiceNumber: 'GST/26-27/00118',
      invoicePrefix: 'GST/26-27/',
      invoiceSeq: '00118',
      invoiceDate: '12-09-2026',
      basicAmount: '52,847.46',
      cgst: '4,756.27',
      sgst: '4,756.27',
      roundOff: '0.00',
      invoiceAmount: '62,360.00',
      tds: '1,050.00',
      cashShortageDeduction: '1,200.00',
      disputeDeduction: '0.00',
      chargebackDeduction: '0.00',
      gstRelatedDeduction: '0.00',
      netAmount: '60,110.00',
      paidAmount: '60,110.00',
      paymentDate: '20-09-2026',
      utrNumber: 'HDFCN26092837461',
      invoiceStatus: 'Approved',
      paymentStatus: 'Paid',
      remark: 'Verified and approved for payment disbursement.',
      updatedAt: '2026-09-20T11:00:00+05:30',
      updatedBy: 'Vikram Shah',
    },
    {
      id: 'GST-0004',
      sn: 4,
      fYear: '2026-27',
      month: 'September 2026',
      siteId: '220',
      atmId: 'ATM12360',
      sapCode: 'SAP001259',
      franchiseeName: 'Secure Cash Pvt. Ltd.',
      contactNo: '9899887766',
      locationName: 'Alpha 1, Commercial Belt, Greater Noida',
      gstNumber: '09SECUR9876J1Z8',
      state: 'Uttar Pradesh',
      stateCode: '09',
      panNumber: 'SECUR9876J',
      address: 'Alpha 1, Commercial Belt, Greater Noida\nUttar Pradesh - 201308',
      invoiceNumber: 'GST/26-27/00119',
      invoicePrefix: 'GST/26-27/',
      invoiceSeq: '00119',
      invoiceDate: '15-09-2026',
      basicAmount: '35,000.00',
      cgst: '3,150.00',
      sgst: '3,150.00',
      roundOff: '0.00',
      invoiceAmount: '41,300.00',
      tds: '700.00',
      cashShortageDeduction: '1,300.00',
      disputeDeduction: '0.00',
      chargebackDeduction: '0.00',
      gstRelatedDeduction: '0.00',
      netAmount: '39,300.00',
      paidAmount: '39,300.00',
      paymentDate: '24-09-2026',
      utrNumber: 'SBIN26093847291',
      invoiceStatus: 'Reconciled',
      paymentStatus: 'Paid',
      remark: 'Reconciled with 2B and payment cleared.',
      updatedAt: '2026-09-24T16:20:00+05:30',
      updatedBy: 'Vikram Shah',
    },
  ]

  out.push(...initial4)

  // Seed remaining records with clean short numeric site IDs matching the design
  let currentSn = 5

  const generateSeedBatch = (
    count: number,
    invStatus: GstInvoiceStatus,
    payStatus: GstPaymentStatus,
    monthName: string,
    fyName = '2026-27'
  ) => {
    for (let i = 0; i < count; i++) {
      const site = SITES[(currentSn + i) % SITES.length]
      const fr = FRANCHISEES.find((f) => f.id === site.franchiseId) || FRANCHISEES[0]
      const cleanSiteId = String(200 + ((currentSn * 7) % 85))
      const cleanAtmId = `ATM${12340 + ((currentSn * 11) % 900)}`
      const base = Math.round(25000 + r() * 40000)
      const cg = Math.round(base * 0.09 * 100) / 100
      const sg = cg
      const invTotal = Math.round((base + cg + sg) * 100) / 100
      const tds = Math.round(base * 0.02)
      const shortage = r() < 0.2 ? Math.round(500 + r() * 2000) : 0
      const net = Math.round((invTotal - tds - shortage) * 100) / 100
      const isPaid = payStatus === 'Paid'
      const payDate = isPaid ? `2026-08-${String(10 + (currentSn % 15)).padStart(2, '0')}` : ''
      const utr = isPaid ? `HDFCN2608${String(100000 + currentSn)}` : ''

      out.push({
        id: `GST-${String(currentSn).padStart(4, '0')}`,
        sn: currentSn,
        fYear: fyName,
        month: monthName,
        siteId: cleanSiteId,
        atmId: cleanAtmId,
        sapCode: fr.sapCode,
        franchiseeName: fr.name,
        contactNo: fr.contact,
        locationName: `${site.location}, ${site.city}`,
        gstNumber: fr.gstin,
        state: 'Uttar Pradesh',
        stateCode: '09',
        panNumber: fr.gstin.slice(2, 12),
        address: `${site.location}, ${site.city}, Uttar Pradesh`,
        invoiceNumber: `GST/26-27/${String(currentSn + 100).padStart(5, '0')}`,
        invoicePrefix: 'GST/26-27/',
        invoiceSeq: String(currentSn + 100).padStart(5, '0'),
        invoiceDate: `10-08-2026`,
        basicAmount: formatInr(base),
        cgst: formatInr(cg),
        sgst: formatInr(sg),
        roundOff: '0.00',
        invoiceAmount: formatInr(invTotal),
        tds: formatInr(tds),
        cashShortageDeduction: shortage ? formatInr(shortage) : '0.00',
        disputeDeduction: '0.00',
        chargebackDeduction: '0.00',
        gstRelatedDeduction: '0.00',
        netAmount: formatInr(net),
        paidAmount: isPaid ? formatInr(net) : '0.00',
        paymentDate: payDate,
        utrNumber: utr,
        invoiceStatus: invStatus,
        paymentStatus: payStatus,
        remark: invStatus === 'Pending at Franchise' ? 'Awaiting invoice submission' : '',
        updatedAt: '2026-09-10T12:00:00+05:30',
        updatedBy: 'Vikram Shah',
      })
      currentSn++
    }
  }

  // 23 more Pending at Franchise (Payment Pending) -> total 24
  generateSeedBatch(23, 'Pending at Franchise', 'Pending', 'October 2026')
  // 10 more Pending at Team (Payment Pending) -> total 11
  generateSeedBatch(10, 'Pending at Team', 'Pending', 'October 2026')
  // 2 more Approved with Payment Pending -> total payment pending 38
  generateSeedBatch(2, 'Approved', 'Pending', 'September 2026')
  // 125 more Reconciled (Paid) -> total 126
  generateSeedBatch(125, 'Reconciled', 'Paid', 'August 2026', '2026-27')

  return out
}

export const gstStore = createStore<GstRecord[]>('dexter.finance.gst.v4', seed)
export const getGst = (id: string) => gstStore.get().find((g) => g.id === id)

export function emptyGst(fy = '2026-27'): GstRecord {
  return {
    id: '',
    sn: 0,
    fYear: fy,
    month: 'October 2026',
    siteId: '',
    atmId: '',
    sapCode: '',
    franchiseeName: '',
    contactNo: '',
    locationName: '',
    gstNumber: '',
    state: 'Uttar Pradesh',
    stateCode: '',
    panNumber: '',
    address: '',
    invoiceNumber: '',
    invoicePrefix: 'GST/26-27/',
    invoiceSeq: '',
    invoiceDate: '',
    basicAmount: '',
    cgst: '',
    sgst: '',
    roundOff: '',
    invoiceAmount: '0.00',
    tds: '',
    cashShortageDeduction: '',
    disputeDeduction: '',
    chargebackDeduction: '',
    gstRelatedDeduction: '',
    netAmount: '0.00',
    paidAmount: '',
    paymentDate: '',
    utrNumber: '',
    invoiceStatus: 'Pending at Franchise',
    paymentStatus: 'Pending',
    remark: '',
    updatedAt: '',
    updatedBy: '',
  }
}

export function saveGst(rec: GstRecord): GstRecord {
  const stamp = { updatedAt: new Date().toISOString(), updatedBy: 'Vikram Shah' }
  if (!rec.id) {
    const all = gstStore.get()
    const sn = all.reduce((m, g) => Math.max(m, g.sn), 0) + 1
    const created = { ...rec, ...stamp, sn, id: `GST-${String(sn).padStart(4, '0')}` }
    gstStore.set([created, ...all])
    return created
  }
  const saved = { ...rec, ...stamp }
  gstStore.set((all) => all.map((g) => (g.id === rec.id ? saved : g)))
  return saved
}

export function deleteGst(id: string) {
  gstStore.set((all) => all.filter((g) => g.id !== id))
}
