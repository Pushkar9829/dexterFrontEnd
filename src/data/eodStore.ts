import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { SITES } from './cbrSites'

export interface MonthlyEodRecord {
  id: string
  date: string
  atmId: string
  siteId: string
  location: string
  franchiseName: string
  cutoffTime: string
  switchBalance: number
  physicalCash: number
  variance: number
  status: 'Submitted' | 'Late' | 'Pending' | 'Discrepancy'
  verifiedBy: string
}

export interface CrmEodRequest {
  id: string
  ticketNo: string
  atmId: string
  siteId: string
  location: string
  franchiseName: string
  machineType: 'Hitachi CRM 400' | 'Hitachi Cash Recycler 300' | 'Diebold Recycler' | string
  requestDate: string
  requestTime: string
  depositBalance: number
  dispenseBalance: number
  totalCash: number
  counterClearStatus: 'Cleared' | 'Pending Clear' | 'Awaiting CRA'
  custodianName: string
  craAgency: string
  status: 'Pending Verification' | 'Approved' | 'In Review' | 'Rejected'
  remarks: string
}

// Generate realistic Monthly EOD records
export const INITIAL_MONTHLY_EOD: MonthlyEodRecord[] = Array.from({ length: 30 }, (_, idx) => {
  const day = 30 - idx
  const dateStr = `${String(day).padStart(2, '0')}-11-2026`
  const s = SITES[idx % SITES.length]
  const baseCash = 250000 + (idx % 7) * 50000
  const hasVariance = idx % 9 === 0
  const variance = hasVariance ? -1500 : 0
  const isLate = idx % 7 === 3
  const isPending = idx === 0 || idx === 1

  return {
    id: `MEOD-${1000 + idx}`,
    date: dateStr,
    atmId: s.atmId,
    siteId: s.siteId,
    location: s.location,
    franchiseName: idx % 3 === 0 ? 'Shree Sai Financial Services' : idx % 3 === 1 ? 'ABC Services' : 'XYZ Enterprises',
    cutoffTime: `23:${String(30 + (idx % 25)).padStart(2, '0')}`,
    switchBalance: baseCash,
    physicalCash: baseCash + variance,
    variance,
    status: isPending ? 'Pending' : hasVariance ? 'Discrepancy' : isLate ? 'Late' : 'Submitted',
    verifiedBy: isPending ? '—' : 'Paras Dubey (Operations)',
  }
})

// Initial CRM EOD Requests
export const INITIAL_CRM_EOD_REQUESTS: CrmEodRequest[] = [
  {
    id: 'CRM-REQ-101',
    ticketNo: 'CRM-EOD-2026-1042',
    atmId: 'MCRM7303',
    siteId: 'ST-UP-LKO-00305',
    location: 'Hazratganj, Lucknow',
    franchiseName: 'ABC Services',
    machineType: 'Hitachi CRM 400',
    requestDate: '01-11-2026',
    requestTime: '10:45 AM',
    depositBalance: 345000,
    dispenseBalance: 120000,
    totalCash: 465000,
    counterClearStatus: 'Cleared',
    custodianName: 'Amit Jadhav',
    craAgency: 'CMS Info Systems',
    status: 'Approved',
    remarks: 'Physical cash counters cleared and verified against switch report.',
  },
  {
    id: 'CRM-REQ-102',
    ticketNo: 'CRM-EOD-2026-1043',
    atmId: 'NODR5566',
    siteId: 'ST-MH-PUN-00124',
    location: 'Kothrud, Pune',
    franchiseName: 'Shree Sai Financial Services',
    machineType: 'Hitachi Cash Recycler 300',
    requestDate: '01-11-2026',
    requestTime: '09:30 AM',
    depositBalance: 520000,
    dispenseBalance: 180000,
    totalCash: 700000,
    counterClearStatus: 'Pending Clear',
    custodianName: 'Rajesh Sharma',
    craAgency: 'SIS Prosegur',
    status: 'Pending Verification',
    remarks: 'EOD submitted post weekend deposit accumulation. Waiting for CRA visit.',
  },
  {
    id: 'CRM-REQ-103',
    ticketNo: 'CRM-EOD-2026-1044',
    atmId: 'PRYR3344',
    siteId: 'ST-UP-LKO-00309',
    location: 'Prayagraj Civil Lines',
    franchiseName: 'RST Services',
    machineType: 'Hitachi CRM 400',
    requestDate: '31-10-2026',
    requestTime: '11:15 PM',
    depositBalance: 280000,
    dispenseBalance: 95000,
    totalCash: 375000,
    counterClearStatus: 'Cleared',
    custodianName: 'Suresh Nair',
    craAgency: 'Writer Safeguard',
    status: 'Approved',
    remarks: 'Month-end CRM reconciliation completed without discrepancies.',
  },
  {
    id: 'CRM-REQ-104',
    ticketNo: 'CRM-EOD-2026-1045',
    atmId: 'GZBD2211',
    siteId: 'ST-GJ-AMD-00218',
    location: 'Navrangpura, Ahmedabad',
    franchiseName: 'LMN Enterprises',
    machineType: 'Hitachi Cash Recycler 300',
    requestDate: '31-10-2026',
    requestTime: '08:20 PM',
    depositBalance: 410000,
    dispenseBalance: 150000,
    totalCash: 560000,
    counterClearStatus: 'Awaiting CRA',
    custodianName: 'Anand Verma',
    craAgency: 'CMS Info Systems',
    status: 'In Review',
    remarks: 'Purge bin cash count verification ongoing by regional operations desk.',
  },
  {
    id: 'CRM-REQ-105',
    ticketNo: 'CRM-EOD-2026-1046',
    atmId: 'MBP12121',
    siteId: 'ST-MH-PUN-00138',
    location: 'Hadapsar, Pune',
    franchiseName: 'XYZ Enterprises',
    machineType: 'Hitachi CRM 400',
    requestDate: '30-10-2026',
    requestTime: '06:40 PM',
    depositBalance: 390000,
    dispenseBalance: 130000,
    totalCash: 520000,
    counterClearStatus: 'Cleared',
    custodianName: 'Paras Dubey',
    craAgency: 'SIS Prosegur',
    status: 'Approved',
    remarks: 'EOD physical counter log verified.',
  },
  {
    id: 'CRM-REQ-106',
    ticketNo: 'CRM-EOD-2026-1047',
    atmId: 'DLHY8890',
    siteId: 'ST-KA-BLR-00076',
    location: 'Jayanagar, Bengaluru',
    franchiseName: 'PQR Solutions',
    machineType: 'Diebold Recycler',
    requestDate: '30-10-2026',
    requestTime: '02:15 PM',
    depositBalance: 195000,
    dispenseBalance: 85000,
    totalCash: 280000,
    counterClearStatus: 'Cleared',
    custodianName: 'Amit Jadhav',
    craAgency: 'CMS Info Systems',
    status: 'Approved',
    remarks: 'Standard EOD clearing completed.',
  },
]

export const monthlyEodStore = createStore<MonthlyEodRecord[]>('dexter_monthly_eod_v1', () => INITIAL_MONTHLY_EOD)
export const crmEodRequestStore = createStore<CrmEodRequest[]>('dexter_crm_eod_requests_v1', () => INITIAL_CRM_EOD_REQUESTS)

export function useMonthlyEod() {
  const records = monthlyEodStore.use()
  return {
    records,
    updateStatus: (id: string, status: MonthlyEodRecord['status']) => {
      monthlyEodStore.set((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    },
    resetData: () => monthlyEodStore.reset(),
  }
}

export function useCrmEodRequests() {
  const requests = crmEodRequestStore.use()
  return {
    requests,
    addRequest: (newReq: Omit<CrmEodRequest, 'id' | 'ticketNo'>) => {
      crmEodRequestStore.set((prev) => [
        {
          ...newReq,
          id: `CRM-REQ-${Date.now()}`,
          ticketNo: `CRM-EOD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        },
        ...prev,
      ])
    },
    updateRequestStatus: (id: string, status: CrmEodRequest['status']) => {
      crmEodRequestStore.set((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    },
    resetData: () => crmEodRequestStore.reset(),
  }
}

export function exportMonthlyEodCsv(records: MonthlyEodRecord[], filename = 'monthly-eod-report') {
  const headers = ['Date', 'ATM ID', 'Site ID', 'Location', 'Franchise', 'EOD Time', 'Switch Balance', 'Physical Cash', 'Variance', 'Status', 'Verified By']
  const rows = records.map((r) => [
    r.date,
    r.atmId,
    r.siteId,
    r.location,
    r.franchiseName,
    r.cutoffTime,
    String(r.switchBalance),
    String(r.physicalCash),
    String(r.variance),
    r.status,
    r.verifiedBy,
  ])
  downloadCsv(filename, headers, rows)
}

export function exportCrmRequestsCsv(requests: CrmEodRequest[], filename = 'crm-eod-requests') {
  const headers = ['Ticket No', 'Date', 'Time', 'ATM ID', 'Site ID', 'Location', 'Machine Type', 'Deposit Cash', 'Dispense Cash', 'Total Cash', 'Counter Clear', 'CRA', 'Status']
  const rows = requests.map((r) => [
    r.ticketNo,
    r.requestDate,
    r.requestTime,
    r.atmId,
    r.siteId,
    r.location,
    r.machineType,
    String(r.depositBalance),
    String(r.dispenseBalance),
    String(r.totalCash),
    r.counterClearStatus,
    r.craAgency,
    r.status,
  ])
  downloadCsv(filename, headers, rows)
}

// ---------------------------------------------------------------------------
// CRM EOD Docket Data Models & Store (Image 1: Page 01 & Image 2: Page 02)
// ---------------------------------------------------------------------------
export interface CrmEodDocketRecord {
  id: string
  atmId: string
  docketNumber: string
  franchise: string
  mobileNo: string
  purpose: 'Routine EOD' | 'Monthly EOD' | 'Cash Audit'
  counterSlip: 'Uploaded' | 'Pending'
  counterSlipFile?: string
  eodDate: string
  remark: string
  machine: string
  cbrOption: string
  counterFile?: string
  siteType: 'FFM' | 'SF'
  status?: 'Submitted' | 'Saved' | 'Cancelled' | 'Rejected'
}

export const KNOWN_CRM_ATMS: Record<string, { franchise: string; mobileNo: string; machine: string; siteType: 'FFM' | 'SF' }> = {
  ABCZ11220: { franchise: 'Mukesh Singh', mobileNo: '9719020867', machine: 'CRM', siteType: 'FFM' },
  DCBA33411: { franchise: 'Rajesh Kumar', mobileNo: '9876543210', machine: 'CRM', siteType: 'SF' },
  ABCD55678: { franchise: 'Sunita Verma', mobileNo: '9811122334', machine: 'CRM', siteType: 'FFM' },
  QWER77890: { franchise: 'Amit Gupta', mobileNo: '9873012345', machine: 'CRM', siteType: 'SF' },
  ZXCV90987: { franchise: 'Neha Sharma', mobileNo: '9898765432', machine: 'CRM', siteType: 'FFM' },
  LMNO66554: { franchise: 'Vikram Yadav', mobileNo: '9812345678', machine: 'CRM', siteType: 'SF' },
  PQRS22331: { franchise: 'Karan Mehta', mobileNo: '9871234560', machine: 'CRM', siteType: 'FFM' },
  TYUI44556: { franchise: 'Pooja Singh', mobileNo: '9966554433', machine: 'CRM', siteType: 'FFM' },
  MCRM7303: { franchise: 'ABC Services', mobileNo: '9876512345', machine: 'CRM', siteType: 'FFM' },
  MBP12121: { franchise: 'XYZ Enterprises', mobileNo: '9123456789', machine: 'CRM', siteType: 'SF' },
  NODR5566: { franchise: 'KLM Services', mobileNo: '9870198765', machine: 'CRM', siteType: 'FFM' },
  DLHY8890: { franchise: 'PQR Solutions', mobileNo: '9898765123', machine: 'CRM', siteType: 'SF' },
}

export const SEED_CRM_DOCKETS: CrmEodDocketRecord[] = [
  {
    id: 'DEX-EOD-0001',
    atmId: 'ABCZ11220',
    docketNumber: 'DEX-EOD-0001',
    franchise: 'Mukesh Singh',
    mobileNo: '9719020867',
    purpose: 'Routine EOD',
    counterSlip: 'Uploaded',
    counterSlipFile: 'Counter_Slip_ABCZ11220.pdf',
    eodDate: '25-10-2026',
    remark: 'EOD completed successfully',
    machine: 'CRM',
    cbrOption: 'Available & Attached',
    siteType: 'FFM',
    status: 'Submitted',
  },
  {
    id: 'DEX-EOD-0002',
    atmId: 'DCBA33411',
    docketNumber: 'DEX-EOD-0002',
    franchise: 'Rajesh Kumar',
    mobileNo: '9876543210',
    purpose: 'Monthly EOD',
    counterSlip: 'Pending',
    eodDate: '24-10-2026',
    remark: 'Counter slip pending',
    machine: 'CRM',
    cbrOption: 'Select Option',
    siteType: 'SF',
    status: 'Submitted',
  },
  {
    id: 'DEX-EOD-0003',
    atmId: 'ABCD55678',
    docketNumber: 'DEX-EOD-0003',
    franchise: 'Sunita Verma',
    mobileNo: '9811122334',
    purpose: 'Cash Audit',
    counterSlip: 'Uploaded',
    counterSlipFile: 'Audit_Slip_ABCD55678.pdf',
    eodDate: '23-10-2026',
    remark: 'Submitted for review',
    machine: 'CRM',
    cbrOption: 'Available & Attached',
    siteType: 'FFM',
    status: 'Submitted',
  },
  {
    id: 'DEX-EOD-0004',
    atmId: 'QWER77890',
    docketNumber: 'DEX-EOD-0004',
    franchise: 'Amit Gupta',
    mobileNo: '9873012345',
    purpose: 'Routine EOD',
    counterSlip: 'Pending',
    eodDate: '22-10-2026',
    remark: 'Awaiting counter slip',
    machine: 'CRM',
    cbrOption: 'Select Option',
    siteType: 'SF',
    status: 'Submitted',
  },
  {
    id: 'DEX-EOD-0005',
    atmId: 'ZXCV90987',
    docketNumber: 'DEX-EOD-0005',
    franchise: 'Neha Sharma',
    mobileNo: '9898765432',
    purpose: 'Monthly EOD',
    counterSlip: 'Uploaded',
    counterSlipFile: 'Counter_Slip_ZXCV90987.pdf',
    eodDate: '20-10-2026',
    remark: 'EOD verified',
    machine: 'CRM',
    cbrOption: 'Available & Attached',
    siteType: 'FFM',
    status: 'Submitted',
  },
  {
    id: 'DEX-EOD-0006',
    atmId: 'LMNO66554',
    docketNumber: 'DEX-EOD-0006',
    franchise: 'Vikram Yadav',
    mobileNo: '9812345678',
    purpose: 'Cash Audit',
    counterSlip: 'Pending',
    eodDate: '18-10-2026',
    remark: 'Counter slip not uploaded',
    machine: 'CRM',
    cbrOption: 'Select Option',
    siteType: 'SF',
    status: 'Submitted',
  },
  {
    id: 'DEX-EOD-0007',
    atmId: 'PQRS22331',
    docketNumber: 'DEX-EOD-0007',
    franchise: 'Karan Mehta',
    mobileNo: '9871234560',
    purpose: 'Routine EOD',
    counterSlip: 'Uploaded',
    counterSlipFile: 'Counter_Slip_PQRS22331.pdf',
    eodDate: '15-10-2026',
    remark: 'Completed and closed',
    machine: 'CRM',
    cbrOption: 'Available & Attached',
    siteType: 'FFM',
    status: 'Submitted',
  },
  {
    id: 'DEX-EOD-0008',
    atmId: 'TYUI44556',
    docketNumber: 'DEX-EOD-0008',
    franchise: 'Pooja Singh',
    mobileNo: '9966554433',
    purpose: 'Monthly EOD',
    counterSlip: 'Pending',
    eodDate: '14-10-2026',
    remark: 'Under process',
    machine: 'CRM',
    cbrOption: 'Select Option',
    siteType: 'FFM',
    status: 'Submitted',
  },
  // Generate additional records up to 128 to match screenshot Total Records: 128
  ...Array.from({ length: 120 }, (_, idx) => {
    const num = idx + 9
    const padded = String(num).padStart(4, '0')
    const atmKeys = Object.keys(KNOWN_CRM_ATMS)
    const atm = atmKeys[idx % atmKeys.length]
    const info = KNOWN_CRM_ATMS[atm]
    const purposes: Array<'Routine EOD' | 'Monthly EOD' | 'Cash Audit'> = ['Routine EOD', 'Monthly EOD', 'Cash Audit']
    const purpose = purposes[idx % 3]
    const uploaded = idx % 2 === 0
    const day = (30 - (idx % 28)).toString().padStart(2, '0')
    return {
      id: `DEX-EOD-${padded}`,
      atmId: atm,
      docketNumber: `DEX-EOD-${padded}`,
      franchise: info.franchise,
      mobileNo: info.mobileNo,
      purpose,
      counterSlip: uploaded ? ('Uploaded' as const) : ('Pending' as const),
      counterSlipFile: uploaded ? `Counter_Slip_${atm}.pdf` : undefined,
      eodDate: `${day}-10-2026`,
      remark: uploaded ? 'EOD completed successfully' : 'Counter slip pending',
      machine: 'CRM',
      cbrOption: uploaded ? 'Available & Attached' : 'Select Option',
      siteType: info.siteType,
      status: 'Submitted' as const,
    }
  }),
]

export const crmDocketStore = createStore<CrmEodDocketRecord[]>('dexter_crm_eod_dockets_v1', () => SEED_CRM_DOCKETS)

export function useCrmDockets() {
  const dockets = crmDocketStore.use()
  return {
    dockets,
    addOrUpdateDocket: (doc: CrmEodDocketRecord) => {
      crmDocketStore.set((prev) => {
        const idx = prev.findIndex((d) => d.id === doc.id || d.docketNumber === doc.docketNumber)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], ...doc }
          return next
        }
        return [doc, ...prev]
      })
    },
    deleteDocket: (id: string) => {
      crmDocketStore.set((prev) => prev.filter((d) => d.id !== id && d.docketNumber !== id))
    },
    resetData: () => crmDocketStore.reset(),
  }
}

export function exportCrmDocketsCsv(records: CrmEodDocketRecord[], filename = 'crm-eod-docket-data-report') {
  const headers = ['S.N.', 'ATM ID', 'Docket Number', 'Franchise', 'Mobile No.', 'Purpose', 'Counter Slip', 'EOD Date', 'Remark', 'Machine', 'Site Type']
  const rows = records.map((r, i) => [
    String(i + 1),
    r.atmId,
    r.docketNumber,
    r.franchise,
    r.mobileNo,
    r.purpose,
    r.counterSlip,
    r.eodDate,
    r.remark,
    r.machine,
    r.siteType,
  ])
  downloadCsv(filename, headers, rows)
}

// ─────────────────────────────────────────────────────────────────────────────
// FFM & SF MONTHLY EOD CONSOLIDATED REPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface FfmSfMonthlyEodRecord {
  id: string
  fundingType: 'FFM' | 'SF'
  month: string // e.g. 'October 2026', 'November 2026'
  siteId: string
  atmId: string
  frName: string
  state: string
  openDms: number
  openPhys: number
  openOverage: number
  hpyFund: number
  frLoading: number
  apnaDispense: number
  actualMachine: number
  closeDms: number
  closePhys: number
  closeOverage: number
}

export function getMonthDates(monthStr: string) {
  const months: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  }
  const parts = (monthStr || 'October 2026').trim().split(/\s+/)
  if (parts.length === 2 && months[parts[0].toLowerCase()] !== undefined) {
    const monthIdx = months[parts[0].toLowerCase()]
    const year = parseInt(parts[1], 10)
    const lastDayOfMonth = new Date(year, monthIdx + 1, 0)
    const lastDayOfPrevMonth = new Date(year, monthIdx, 0)

    const pad = (n: number) => String(n).padStart(2, '0')
    const format = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`

    return {
      openingDate: format(lastDayOfPrevMonth),
      closingDate: format(lastDayOfMonth),
      monthYear: monthStr,
    }
  }
  return {
    openingDate: '30.09.2026',
    closingDate: '31.10.2026',
    monthYear: monthStr || 'October 2026',
  }
}

export const INITIAL_FFM_SF_EOD: FfmSfMonthlyEodRecord[] = [
  // ── OCTOBER 2026: FULL FUNDING (FFM) ──
  {
    id: 'FFM-OCT-01',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-UP-LKO-00305',
    atmId: 'MCRM7303',
    frName: 'ABC Services',
    state: 'UP',
    openDms: 280000,
    openPhys: 280000,
    openOverage: 0,
    hpyFund: 1800000,
    frLoading: 150000,
    apnaDispense: 1820000,
    actualMachine: 410000,
    closeDms: 410000,
    closePhys: 410000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-02',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-UP-NOI-00198',
    atmId: 'NODR5566',
    frName: 'KLM Services',
    state: 'UP',
    openDms: 320000,
    openPhys: 320000,
    openOverage: 0,
    hpyFund: 2100000,
    frLoading: 180000,
    apnaDispense: 2050000,
    actualMachine: 550000,
    closeDms: 550000,
    closePhys: 550000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-03',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-UP-GZB-00211',
    atmId: 'GZBD2211',
    frName: 'LMN Enterprises',
    state: 'UP',
    openDms: 195000,
    openPhys: 195500,
    openOverage: 500,
    hpyFund: 1650000,
    frLoading: 140000,
    apnaDispense: 1720000,
    actualMachine: 265000,
    closeDms: 265000,
    closePhys: 265000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-04',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-UP-MRT-00109',
    atmId: 'ABCZ11220',
    frName: 'Mukesh Singh',
    state: 'UP',
    openDms: 410000,
    openPhys: 410000,
    openOverage: 0,
    hpyFund: 2400000,
    frLoading: 220000,
    apnaDispense: 2450000,
    actualMachine: 580000,
    closeDms: 580000,
    closePhys: 580000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-05',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-DL-DEL-00441',
    atmId: 'ABCD55678',
    frName: 'Sunita Verma',
    state: 'DL',
    openDms: 360000,
    openPhys: 360000,
    openOverage: 0,
    hpyFund: 1950000,
    frLoading: 160000,
    apnaDispense: 2100000,
    actualMachine: 370000,
    closeDms: 370000,
    closePhys: 370000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-06',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-MH-PUN-00124',
    atmId: 'ZXCV90987',
    frName: 'Neha Sharma',
    state: 'MH',
    openDms: 450000,
    openPhys: 450000,
    openOverage: 0,
    hpyFund: 2800000,
    frLoading: 250000,
    apnaDispense: 2790000,
    actualMachine: 710000,
    closeDms: 710000,
    closePhys: 711000,
    closeOverage: 1000,
  },
  {
    id: 'FFM-OCT-07',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-DL-ROH-00812',
    atmId: 'PQRS22331',
    frName: 'Karan Mehta',
    state: 'DL',
    openDms: 225000,
    openPhys: 225000,
    openOverage: 0,
    hpyFund: 1750000,
    frLoading: 130000,
    apnaDispense: 1810000,
    actualMachine: 295000,
    closeDms: 295000,
    closePhys: 295000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-08',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-UP-VNS-00912',
    atmId: 'VNSB9912',
    frName: 'Varanasi Fast Financials',
    state: 'UP',
    openDms: 310000,
    openPhys: 310000,
    openOverage: 0,
    hpyFund: 2200000,
    frLoading: 190000,
    apnaDispense: 2250000,
    actualMachine: 450000,
    closeDms: 450000,
    closePhys: 450000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-09',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-UP-AGR-00721',
    atmId: 'AGRA7721',
    frName: 'Taj Financials',
    state: 'UP',
    openDms: 275000,
    openPhys: 275000,
    openOverage: 0,
    hpyFund: 1900000,
    frLoading: 160000,
    apnaDispense: 1980000,
    actualMachine: 355000,
    closeDms: 355000,
    closePhys: 355000,
    closeOverage: 0,
  },
  {
    id: 'FFM-OCT-10',
    fundingType: 'FFM',
    month: 'October 2026',
    siteId: 'ST-UP-MRT-00410',
    atmId: 'MEER4410',
    frName: 'Meerut Cash Links',
    state: 'UP',
    openDms: 340000,
    openPhys: 340000,
    openOverage: 0,
    hpyFund: 2050000,
    frLoading: 175000,
    apnaDispense: 2120000,
    actualMachine: 445000,
    closeDms: 445000,
    closePhys: 445000,
    closeOverage: 0,
  },

  // ── OCTOBER 2026: SELF FUNDING (SF) ──
  {
    id: 'SF-OCT-01',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-UP-KNP-00212',
    atmId: 'MBP12121',
    frName: 'XYZ Enterprises',
    state: 'UP',
    openDms: 350000,
    openPhys: 350000,
    openOverage: 0,
    hpyFund: 1900000,
    frLoading: 160000,
    apnaDispense: 1950000,
    actualMachine: 460000,
    closeDms: 460000,
    closePhys: 460000,
    closeOverage: 0,
  },
  {
    id: 'SF-OCT-02',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-DL-DEL-00511',
    atmId: 'DLHY8890',
    frName: 'PQR Solutions',
    state: 'DL',
    openDms: 420000,
    openPhys: 420000,
    openOverage: 0,
    hpyFund: 2500000,
    frLoading: 210000,
    apnaDispense: 2540000,
    actualMachine: 590000,
    closeDms: 590000,
    closePhys: 590000,
    closeOverage: 0,
  },
  {
    id: 'SF-OCT-03',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-UP-PRY-00344',
    atmId: 'PRYR3344',
    frName: 'RST Services',
    state: 'UP',
    openDms: 240000,
    openPhys: 240000,
    openOverage: 0,
    hpyFund: 1600000,
    frLoading: 135000,
    apnaDispense: 1675000,
    actualMachine: 300000,
    closeDms: 300000,
    closePhys: 300000,
    closeOverage: 0,
  },
  {
    id: 'SF-OCT-04',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-UP-BRL-00341',
    atmId: 'DCBA33411',
    frName: 'Rajesh Kumar',
    state: 'UP',
    openDms: 290000,
    openPhys: 290000,
    openOverage: 0,
    hpyFund: 1850000,
    frLoading: 155000,
    apnaDispense: 1895000,
    actualMachine: 400000,
    closeDms: 400000,
    closePhys: 400000,
    closeOverage: 0,
  },
  {
    id: 'SF-OCT-05',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-UP-ALI-00789',
    atmId: 'QWER77890',
    frName: 'Amit Gupta',
    state: 'UP',
    openDms: 310000,
    openPhys: 310000,
    openOverage: 0,
    hpyFund: 2000000,
    frLoading: 170000,
    apnaDispense: 2060000,
    actualMachine: 420000,
    closeDms: 420000,
    closePhys: 420000,
    closeOverage: 0,
  },
  {
    id: 'SF-OCT-06',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-UP-JHN-00655',
    atmId: 'LMNO66554',
    frName: 'Vikram Yadav',
    state: 'UP',
    openDms: 260000,
    openPhys: 260000,
    openOverage: 0,
    hpyFund: 1700000,
    frLoading: 140000,
    apnaDispense: 1730000,
    actualMachine: 370000,
    closeDms: 370000,
    closePhys: 370000,
    closeOverage: 0,
  },
  {
    id: 'SF-OCT-07',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-UP-GKP-00445',
    atmId: 'TYUI44556',
    frName: 'Pooja Singh',
    state: 'UP',
    openDms: 380000,
    openPhys: 380000,
    openOverage: 0,
    hpyFund: 2300000,
    frLoading: 190000,
    apnaDispense: 2350000,
    actualMachine: 520000,
    closeDms: 520000,
    closePhys: 520000,
    closeOverage: 0,
  },
  {
    id: 'SF-OCT-08',
    fundingType: 'SF',
    month: 'October 2026',
    siteId: 'ST-MH-HIN-00109',
    atmId: 'PUNE1109',
    frName: 'Western Express Fintech',
    state: 'MH',
    openDms: 440000,
    openPhys: 440000,
    openOverage: 0,
    hpyFund: 2700000,
    frLoading: 230000,
    apnaDispense: 2740000,
    actualMachine: 630000,
    closeDms: 630000,
    closePhys: 630000,
    closeOverage: 0,
  },

  // ── NOVEMBER 2026: FULL FUNDING (FFM) ──
  {
    id: 'FFM-NOV-01',
    fundingType: 'FFM',
    month: 'November 2026',
    siteId: 'ST-UP-LKO-00305',
    atmId: 'MCRM7303',
    frName: 'ABC Services',
    state: 'UP',
    openDms: 410000,
    openPhys: 410000,
    openOverage: 0,
    hpyFund: 1950000,
    frLoading: 160000,
    apnaDispense: 1920000,
    actualMachine: 600000,
    closeDms: 600000,
    closePhys: 600000,
    closeOverage: 0,
  },
  {
    id: 'FFM-NOV-02',
    fundingType: 'FFM',
    month: 'November 2026',
    siteId: 'ST-UP-NOI-00198',
    atmId: 'NODR5566',
    frName: 'KLM Services',
    state: 'UP',
    openDms: 550000,
    openPhys: 550000,
    openOverage: 0,
    hpyFund: 2250000,
    frLoading: 190000,
    apnaDispense: 2210000,
    actualMachine: 780000,
    closeDms: 780000,
    closePhys: 780000,
    closeOverage: 0,
  },
  {
    id: 'FFM-NOV-03',
    fundingType: 'FFM',
    month: 'November 2026',
    siteId: 'ST-UP-GZB-00211',
    atmId: 'GZBD2211',
    frName: 'LMN Enterprises',
    state: 'UP',
    openDms: 265000,
    openPhys: 265000,
    openOverage: 0,
    hpyFund: 1720000,
    frLoading: 145000,
    apnaDispense: 1740000,
    actualMachine: 390000,
    closeDms: 390000,
    closePhys: 390000,
    closeOverage: 0,
  },
  {
    id: 'FFM-NOV-04',
    fundingType: 'FFM',
    month: 'November 2026',
    siteId: 'ST-UP-MRT-00109',
    atmId: 'ABCZ11220',
    frName: 'Mukesh Singh',
    state: 'UP',
    openDms: 580000,
    openPhys: 580000,
    openOverage: 0,
    hpyFund: 2500000,
    frLoading: 230000,
    apnaDispense: 2510000,
    actualMachine: 800000,
    closeDms: 800000,
    closePhys: 800000,
    closeOverage: 0,
  },

  // ── NOVEMBER 2026: SELF FUNDING (SF) ──
  {
    id: 'SF-NOV-01',
    fundingType: 'SF',
    month: 'November 2026',
    siteId: 'ST-UP-KNP-00212',
    atmId: 'MBP12121',
    frName: 'XYZ Enterprises',
    state: 'UP',
    openDms: 460000,
    openPhys: 460000,
    openOverage: 0,
    hpyFund: 2050000,
    frLoading: 170000,
    apnaDispense: 2010000,
    actualMachine: 670000,
    closeDms: 670000,
    closePhys: 670000,
    closeOverage: 0,
  },
  {
    id: 'SF-NOV-02',
    fundingType: 'SF',
    month: 'November 2026',
    siteId: 'ST-DL-DEL-00511',
    atmId: 'DLHY8890',
    frName: 'PQR Solutions',
    state: 'DL',
    openDms: 590000,
    openPhys: 590000,
    openOverage: 0,
    hpyFund: 2600000,
    frLoading: 220000,
    apnaDispense: 2580000,
    actualMachine: 830000,
    closeDms: 830000,
    closePhys: 830000,
    closeOverage: 0,
  },
]

export const ffmSfStore = createStore<FfmSfMonthlyEodRecord[]>('dexter_ffm_sf_eod_v1', () => INITIAL_FFM_SF_EOD)

export function useFfmSfEod() {
  const records = ffmSfStore.use()
  return {
    records,
    addOrUpdateRecord: (rec: FfmSfMonthlyEodRecord) => {
      ffmSfStore.set((prev) => {
        const idx = prev.findIndex((r) => r.id === rec.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], ...rec }
          return next
        }
        return [rec, ...prev]
      })
    },
    resetData: () => ffmSfStore.reset(),
  }
}

export function exportFfmSfEodCsv(
  records: FfmSfMonthlyEodRecord[],
  filename = 'ffm-sf-eod-report',
  openingDate = '30.09.2026',
  closingDate = '31.10.2026',
  monthYear = 'October 2026'
) {
  const headers = [
    'S.N.',
    'ATM ID',
    'FR Name',
    `Machine Balance as per DMS @11:00 PM (${openingDate})`,
    `Physical Balance as per FR @11:00 PM (${openingDate})`,
    `Actual Overage as on ${openingDate}`,
    `HPY Gen Fund ${monthYear}`,
    `FR Loading Fund ${monthYear}`,
    `Apna App Dispenser Fund ${monthYear}`,
    `Actual Machine Balance ${closingDate}`,
    `Machine Balance as per DMS @11:00 PM (${closingDate})`,
    `Physical Balance as per FR @11:00 PM (${closingDate})`,
    `Actual Overage as on ${closingDate}`,
  ]
  const rows = records.map((r, i) => [
    String(i + 1),
    r.atmId,
    r.frName,
    String(r.openDms),
    String(r.openPhys),
    String(r.openOverage),
    String(r.hpyFund),
    String(r.frLoading),
    String(r.apnaDispense),
    String(r.actualMachine),
    String(r.closeDms),
    String(r.closePhys),
    String(r.closeOverage),
  ])
  downloadCsv(filename, headers, rows)
}



