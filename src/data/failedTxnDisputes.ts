import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { KNOWN_ATMS } from '@/data/txnData'

export interface FailedTxnDisputeRecord {
  id: string
  ticketNumber: string
  atmId: string
  siteId: string
  machineType: 'CRM' | 'ATM' | string
  txnType: 'Deposit - UPI' | 'Deposit - Card' | 'Withdrawal - UPI' | 'Withdrawal - Card' | string
  txnId: string
  utr: string
  txnDate: string
  txnTime: string
  customerName: string
  accountNo: string
  bankName: string
  ifscCode: string
  cardDetails: string
  branch: string
  rrn: string
  amount: string
  txnSlipName?: string
  remarks: string
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Draft'
  createdAt: string
}

export const INITIAL_DUMMY_DISPUTES: FailedTxnDisputeRecord[] = [
  {
    id: 'DISP-1001',
    ticketNumber: 'DISP-2026-1042',
    atmId: 'ATM-100234',
    siteId: 'ST-MH-PUN-00124',
    machineType: 'CRM',
    txnType: 'Withdrawal - UPI',
    txnId: 'TXN98421034',
    utr: 'UTR9021481029',
    txnDate: '19.10.2026',
    txnTime: '08:00 PM',
    customerName: 'Rahul Deshmukh',
    accountNo: 'XXXX-XXXX-4512',
    bankName: 'State Bank of India',
    ifscCode: 'SBIN0001423',
    cardDetails: 'Card **** 8921',
    branch: 'Shivaji Nagar, Pune',
    rrn: '428910248102',
    amount: '5000',
    txnSlipName: 'slip_98421034.pdf',
    remarks: 'Cash not dispensed, amount debited from account via UPI.',
    status: 'Pending',
    createdAt: '2026-10-19T20:00:00Z',
  },
  {
    id: 'DISP-1002',
    ticketNumber: 'DISP-2026-1088',
    atmId: 'ATM-100235',
    siteId: 'ST-KA-BLR-00125',
    machineType: 'ATM',
    txnType: 'Withdrawal - Card',
    txnId: 'TXN98421455',
    utr: 'UTR9021481180',
    txnDate: '18.10.2026',
    txnTime: '02:30 PM',
    customerName: 'Priya Sundaram',
    accountNo: 'XXXX-XXXX-7823',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0000240',
    cardDetails: 'Card **** 3341',
    branch: 'Koramangala, Bengaluru',
    rrn: '428910398210',
    amount: '2500',
    txnSlipName: 'receipt_428910.jpg',
    remarks: 'ATM timed out during cash dispensing cycle.',
    status: 'In Progress',
    createdAt: '2026-10-18T14:30:00Z',
  },
  {
    id: 'DISP-1003',
    ticketNumber: 'DISP-2026-2104',
    atmId: 'ATM-100236',
    siteId: 'ST-TN-CHN-00126',
    machineType: 'CRM',
    txnType: 'Deposit - UPI',
    txnId: 'TXN98422310',
    utr: 'UTR9021482390',
    txnDate: '17.10.2026',
    txnTime: '11:15 AM',
    customerName: 'Karthik Raja',
    accountNo: 'XXXX-XXXX-9901',
    bankName: 'ICICI Bank',
    ifscCode: 'ICIC0000012',
    cardDetails: 'UPI / GPay',
    branch: 'T Nagar, Chennai',
    rrn: '428910419203',
    amount: '10000',
    txnSlipName: 'deposit_slip_2104.pdf',
    remarks: 'Deposit amount debited from customer UPI but not credited to account.',
    status: 'Pending',
    createdAt: '2026-10-17T11:15:00Z',
  },
  {
    id: 'DISP-1004',
    ticketNumber: 'DISP-2026-2319',
    atmId: 'ATM-100237',
    siteId: 'ST-DL-DEL-00127',
    machineType: 'ATM',
    txnType: 'Withdrawal - Card',
    txnId: 'TXN98423980',
    utr: '-',
    txnDate: '16.10.2026',
    txnTime: '06:45 PM',
    customerName: 'Amit Verma',
    accountNo: 'XXXX-XXXX-1144',
    bankName: 'Punjab National Bank',
    ifscCode: 'PUNB0014200',
    cardDetails: 'Card **** 6612',
    branch: 'Connaught Place, New Delhi',
    rrn: '428910550192',
    amount: '1500',
    txnSlipName: undefined,
    remarks: 'Power trip occurred during cash count, account debited.',
    status: 'Resolved',
    createdAt: '2026-10-16T18:45:00Z',
  },
  {
    id: 'DISP-1005',
    ticketNumber: 'DISP-2026-3051',
    atmId: 'ATM-100238',
    siteId: 'ST-GJ-AHM-00128',
    machineType: 'CRM',
    txnType: 'Deposit - Card',
    txnId: 'TXN98425120',
    utr: 'UTR9021484511',
    txnDate: '15.10.2026',
    txnTime: '09:20 AM',
    customerName: 'Mehul Patel',
    accountNo: 'XXXX-XXXX-3388',
    bankName: 'Bank of Baroda',
    ifscCode: 'BARB0AHMEDA',
    cardDetails: 'Card **** 4590',
    branch: 'Navrangpura, Ahmedabad',
    rrn: '428910682910',
    amount: '8000',
    txnSlipName: 'patel_deposit.pdf',
    remarks: 'Notes rejected by validator but amount debited in statement.',
    status: 'Pending',
    createdAt: '2026-10-15T09:20:00Z',
  },
]

// Seed with INITIAL_DUMMY_DISPUTES
export const disputeStore = createStore<FailedTxnDisputeRecord[]>(
  'dexter_failed_txn_disputes_v2',
  () => INITIAL_DUMMY_DISPUTES
)

export function useDisputeStore() {
  const records = disputeStore.use()
  return {
    records,
    addRecord: (record: Omit<FailedTxnDisputeRecord, 'id' | 'ticketNumber' | 'createdAt'>) => {
      const now = new Date()
      const randomSeq = Math.floor(1000 + Math.random() * 9000)
      const ticketNumber = `DISP-${now.getFullYear()}-${randomSeq}`
      const newRecord: FailedTxnDisputeRecord = {
        ...record,
        id: `DISP-${Date.now()}`,
        ticketNumber,
        createdAt: now.toISOString(),
      }
      disputeStore.set((prev) => [newRecord, ...prev])
      return newRecord
    },
    updateRecord: (id: string, updates: Partial<FailedTxnDisputeRecord>) => {
      disputeStore.set((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      )
    },
    deleteRecord: (id: string) => {
      disputeStore.set((prev) => prev.filter((r) => r.id !== id))
    },
    resetDummyData: () => {
      disputeStore.set(INITIAL_DUMMY_DISPUTES)
    },
    clearAll: () => {
      disputeStore.set([])
    },
  }
}

export function exportDisputesToCsv(records: FailedTxnDisputeRecord[], filename = 'dispute-failed-txns') {
  const headers = [
    'S.N.',
    'ATM ID',
    'Ticket Number',
    'TXN Type',
    'TXN ID',
    'UTR',
    'TXN Date',
    'TXN Time',
    'RRN',
    'Amount (₹)',
    'Customer Name',
    'Account No',
    'Bank Name',
    'Status',
    'Remarks',
  ]

  const rows = records.map((r, i) => [
    String(i + 1),
    r.atmId,
    r.ticketNumber,
    r.txnType,
    r.txnId,
    r.utr || '-',
    r.txnDate,
    r.txnTime,
    r.rrn || '-',
    r.amount,
    r.customerName,
    r.accountNo || '-',
    r.bankName || '-',
    r.status,
    r.remarks || '-',
  ])

  downloadCsv(filename, headers, rows)
}

export const ATM_LIST = KNOWN_ATMS.map((k) => ({
  atmId: k.atmId,
  siteId: k.siteId,
}))
