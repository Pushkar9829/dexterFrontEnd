import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'

// ─────────────────────────────────────────────────────────────────────────────
// 1. SETTLEMENT BANK DATA MODEL & STORE
// ─────────────────────────────────────────────────────────────────────────────

export interface SettlementBankRecord {
  id: string
  bankName: string
  accountNo: string
  accountName: string
  accountType: 'Nodal' | 'Escrow' | 'Current' | 'Virtual'
  ifscCode: string
  branchLocation: string
  dailyLimit: number
  settlementCycle: 'T+0 (Instant)' | 'T+1 (End of Day)' | 'T+2 (Batch)'
  status: 'Active' | 'Primary Nodal' | 'Standby' | 'Under Audit'
  registeredDate: string
}

export const INITIAL_SETTLEMENT_BANKS: SettlementBankRecord[] = [
  {
    id: 'SB-001',
    bankName: 'Axis Bank',
    accountNo: '921020054812301',
    accountName: 'Dexter Technologies Primary Nodal A/C',
    accountType: 'Nodal',
    ifscCode: 'UTIB0000124',
    branchLocation: 'Nariman Point, Mumbai',
    dailyLimit: 50000000,
    settlementCycle: 'T+0 (Instant)',
    status: 'Primary Nodal',
    registeredDate: '15-01-2025',
  },
  {
    id: 'SB-002',
    bankName: 'HDFC Bank',
    accountNo: '502000847120349',
    accountName: 'Dexter Franchise Payout Escrow',
    accountType: 'Escrow',
    ifscCode: 'HDFC0000452',
    branchLocation: 'Connaught Place, New Delhi',
    dailyLimit: 40000000,
    settlementCycle: 'T+0 (Instant)',
    status: 'Active',
    registeredDate: '10-03-2025',
  },
  {
    id: 'SB-003',
    bankName: 'ICICI Bank',
    accountNo: '004705018924301',
    accountName: 'Dexter ATM Cash Replenishment Pool',
    accountType: 'Current',
    ifscCode: 'ICIC0000047',
    branchLocation: 'Bandra Kurla Complex, Mumbai',
    dailyLimit: 35000000,
    settlementCycle: 'T+1 (End of Day)',
    status: 'Active',
    registeredDate: '22-04-2025',
  },
  {
    id: 'SB-004',
    bankName: 'State Bank of India',
    accountNo: '394810245601249',
    accountName: 'Dexter Treasury & Government Dues A/C',
    accountType: 'Current',
    ifscCode: 'SBIN0004412',
    branchLocation: 'Sansad Marg, New Delhi',
    dailyLimit: 25000000,
    settlementCycle: 'T+1 (End of Day)',
    status: 'Active',
    registeredDate: '05-06-2025',
  },
  {
    id: 'SB-005',
    bankName: 'Kotak Mahindra Bank',
    accountNo: '841209384729104',
    accountName: 'Dexter Standby Settlement Route',
    accountType: 'Nodal',
    ifscCode: 'KKBK0000651',
    branchLocation: 'MG Road, Bangalore',
    dailyLimit: 30000000,
    settlementCycle: 'T+0 (Instant)',
    status: 'Standby',
    registeredDate: '18-08-2025',
  },
  {
    id: 'SB-006',
    bankName: 'IndusInd Bank',
    accountNo: '201004819203912',
    accountName: 'Dexter Merchant Virtual Settlement Hub',
    accountType: 'Virtual',
    ifscCode: 'INDB0000301',
    branchLocation: 'Gachibowli, Hyderabad',
    dailyLimit: 20000000,
    settlementCycle: 'T+0 (Instant)',
    status: 'Active',
    registeredDate: '14-11-2025',
  },
  {
    id: 'SB-007',
    bankName: 'Punjab National Bank',
    accountNo: '182400210084712',
    accountName: 'Dexter North Zone Settlement A/C',
    accountType: 'Current',
    ifscCode: 'PUNB0182400',
    branchLocation: 'Hazratganj, Lucknow',
    dailyLimit: 15000000,
    settlementCycle: 'T+1 (End of Day)',
    status: 'Active',
    registeredDate: '02-02-2026',
  },
  {
    id: 'SB-008',
    bankName: 'Bank of Baroda',
    accountNo: '309402000192840',
    accountName: 'Dexter West Zone Disbursal A/C',
    accountType: 'Current',
    ifscCode: 'BARB0ALKAXX',
    branchLocation: 'Alkapuri, Vadodara',
    dailyLimit: 15000000,
    settlementCycle: 'T+1 (End of Day)',
    status: 'Under Audit',
    registeredDate: '19-05-2026',
  },
]

export const settlementBankStore = createStore<SettlementBankRecord[]>('dexter_settlement_banks_v1', () => INITIAL_SETTLEMENT_BANKS)

export function useSettlementBanks() {
  const banks = settlementBankStore.use()
  return {
    banks,
    addBank: (bank: SettlementBankRecord) => {
      settlementBankStore.set((prev) => [bank, ...prev])
    },
    updateBank: (bank: SettlementBankRecord) => {
      settlementBankStore.set((prev) => prev.map((b) => (b.id === bank.id ? bank : b)))
    },
    deleteBank: (id: string) => {
      settlementBankStore.set((prev) => prev.filter((b) => b.id !== id))
    },
    resetData: () => settlementBankStore.reset(),
  }
}

export function exportSettlementBanksCsv(records: SettlementBankRecord[]) {
  const headers = [
    'S.N.',
    'Bank ID',
    'Bank Name',
    'Account Number',
    'Account Name',
    'Account Type',
    'IFSC Code',
    'Branch Location',
    'Daily Limit (₹)',
    'Settlement Cycle',
    'Status',
    'Registered Date',
  ]
  const rows = records.map((r, i) => [
    String(i + 1),
    r.id,
    r.bankName,
    r.accountNo,
    r.accountName,
    r.accountType,
    r.ifscCode,
    r.branchLocation,
    String(r.dailyLimit),
    r.settlementCycle,
    r.status,
    r.registeredDate,
  ])
  downloadCsv(`Settlement_Bank_Master_${new Date().toISOString().slice(0, 10)}`, headers, rows)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TDS COMPLIANCE DATA MODEL & STORE
// ─────────────────────────────────────────────────────────────────────────────

export interface TdsComplianceRecord {
  id: string
  atmId: string
  franchiseName: string
  panNo: string
  sectionCode: '194N' | '194C' | '194J' | '194H'
  financialYear: string
  annualWithdrawal: number
  tdsRate: number // percentage e.g. 2 or 5
  tdsDeducted: number
  challanBsrCode: string
  form15GStatus: 'Filed & Verified' | 'Not Submitted' | 'Exempted' | 'Expired'
  status: 'Compliant' | 'Certificate Pending' | 'Threshold Warning' | 'Audit Required'
  lastAuditDate: string
}

export const INITIAL_TDS_COMPLIANCE: TdsComplianceRecord[] = [
  {
    id: 'TDS-2026-001',
    atmId: 'MCRM7303',
    franchiseName: 'ABC Services',
    panNo: 'AAACB1245P',
    sectionCode: '194N',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 14500000,
    tdsRate: 2,
    tdsDeducted: 290000,
    challanBsrCode: '0210041/2026/09',
    form15GStatus: 'Filed & Verified',
    status: 'Compliant',
    lastAuditDate: '28-10-2026',
  },
  {
    id: 'TDS-2026-002',
    atmId: 'MBP12121',
    franchiseName: 'XYZ Enterprises',
    panNo: 'BKPDE8921K',
    sectionCode: '194N',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 21500000,
    tdsRate: 5,
    tdsDeducted: 1075000,
    challanBsrCode: '0210041/2026/10',
    form15GStatus: 'Not Submitted',
    status: 'Threshold Warning',
    lastAuditDate: '26-10-2026',
  },
  {
    id: 'TDS-2026-003',
    atmId: 'NODR5566',
    franchiseName: 'KLM Services',
    panNo: 'CPQRS4512M',
    sectionCode: '194C',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 8400000,
    tdsRate: 2,
    tdsDeducted: 168000,
    challanBsrCode: '0210041/2026/11',
    form15GStatus: 'Filed & Verified',
    status: 'Compliant',
    lastAuditDate: '24-10-2026',
  },
  {
    id: 'TDS-2026-004',
    atmId: 'DLHY8890',
    franchiseName: 'PQR Solutions',
    panNo: 'DLMNP7812J',
    sectionCode: '194N',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 18900000,
    tdsRate: 2,
    tdsDeducted: 378000,
    challanBsrCode: '0210041/2026/12',
    form15GStatus: 'Filed & Verified',
    status: 'Certificate Pending',
    lastAuditDate: '21-10-2026',
  },
  {
    id: 'TDS-2026-005',
    atmId: 'GZBD2211',
    franchiseName: 'LMN Enterprises',
    panNo: 'ELKJH3219Q',
    sectionCode: '194C',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 6200000,
    tdsRate: 1,
    tdsDeducted: 62000,
    challanBsrCode: '0210041/2026/13',
    form15GStatus: 'Filed & Verified',
    status: 'Compliant',
    lastAuditDate: '19-10-2026',
  },
  {
    id: 'TDS-2026-006',
    atmId: 'PRYR3344',
    franchiseName: 'RST Services',
    panNo: 'FZXCV6541R',
    sectionCode: '194N',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 25400000,
    tdsRate: 5,
    tdsDeducted: 1270000,
    challanBsrCode: '0210041/2026/14',
    form15GStatus: 'Expired',
    status: 'Audit Required',
    lastAuditDate: '15-10-2026',
  },
  {
    id: 'TDS-2026-007',
    atmId: 'ABCZ11220',
    franchiseName: 'Mukesh Singh',
    panNo: 'GTYUI9871S',
    sectionCode: '194N',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 11200000,
    tdsRate: 2,
    tdsDeducted: 224000,
    challanBsrCode: '0210041/2026/15',
    form15GStatus: 'Filed & Verified',
    status: 'Compliant',
    lastAuditDate: '12-10-2026',
  },
  {
    id: 'TDS-2026-008',
    atmId: 'DCBA33411',
    franchiseName: 'Rajesh Kumar',
    panNo: 'HBNMK2345T',
    sectionCode: '194H',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 4800000,
    tdsRate: 5,
    tdsDeducted: 240000,
    challanBsrCode: '0210041/2026/16',
    form15GStatus: 'Filed & Verified',
    status: 'Compliant',
    lastAuditDate: '10-10-2026',
  },
  {
    id: 'TDS-2026-009',
    atmId: 'ABCD55678',
    franchiseName: 'Sunita Verma',
    panNo: 'JKLPO6543U',
    sectionCode: '194N',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 16800000,
    tdsRate: 2,
    tdsDeducted: 336000,
    challanBsrCode: '0210041/2026/17',
    form15GStatus: 'Filed & Verified',
    status: 'Compliant',
    lastAuditDate: '08-10-2026',
  },
  {
    id: 'TDS-2026-010',
    atmId: 'QWER77890',
    franchiseName: 'Amit Gupta',
    panNo: 'MNBVC8765V',
    sectionCode: '194J',
    financialYear: 'F.Y. 2026-27',
    annualWithdrawal: 3500000,
    tdsRate: 10,
    tdsDeducted: 350000,
    challanBsrCode: '0210041/2026/18',
    form15GStatus: 'Exempted',
    status: 'Compliant',
    lastAuditDate: '05-10-2026',
  },
]

export const tdsComplianceStore = createStore<TdsComplianceRecord[]>('dexter_tds_compliance_v1', () => INITIAL_TDS_COMPLIANCE)

export function useTdsCompliance() {
  const records = tdsComplianceStore.use()
  return {
    records,
    addRecord: (rec: TdsComplianceRecord) => {
      tdsComplianceStore.set((prev) => [rec, ...prev])
    },
    updateRecord: (rec: TdsComplianceRecord) => {
      tdsComplianceStore.set((prev) => prev.map((r) => (r.id === rec.id ? rec : r)))
    },
    deleteRecord: (id: string) => {
      tdsComplianceStore.set((prev) => prev.filter((r) => r.id !== id))
    },
    resetData: () => tdsComplianceStore.reset(),
  }
}

export function exportTdsComplianceCsv(records: TdsComplianceRecord[]) {
  const headers = [
    'S.N.',
    'Compliance ID',
    'ATM ID',
    'Franchise Name',
    'PAN Number',
    'Section Code',
    'Financial Year',
    'Annual Withdrawal (₹)',
    'TDS Rate (%)',
    'TDS Deducted (₹)',
    'Challan / BSR Code',
    'Form 15G/15H Status',
    'Compliance Status',
    'Last Audit Date',
  ]
  const rows = records.map((r, i) => [
    String(i + 1),
    r.id,
    r.atmId,
    r.franchiseName,
    r.panNo,
    r.sectionCode,
    r.financialYear,
    String(r.annualWithdrawal),
    `${r.tdsRate}%`,
    String(r.tdsDeducted),
    r.challanBsrCode,
    r.form15GStatus,
    r.status,
    r.lastAuditDate,
  ])
  downloadCsv(`TDS_Compliance_Report_${new Date().toISOString().slice(0, 10)}`, headers, rows)
}

