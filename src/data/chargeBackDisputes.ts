import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { KNOWN_ATMS } from '@/data/txnData'

export interface ChargeBackDisputeRecord {
  id: string
  ticketNumber: string
  fundingType: 'FFM' | 'SF'
  atmId: string
  cardNumber: string
  rrnNumber: string
  txnAmt: string
  adjustedAmt: string
  disputeAmt: string
  mspReferenceNo: string
  sendStatus: string
  natureOfIncident?: string
  errorDescription: string
  txnDate: string
  txnTime: string
  txnType: string
  txnId: string
  utr: string
  wlaoRemark?: string
  hitachiEmailDate?: string
  emailResponseDate?: string
  frRemark?: string
  uploadedDocuments?: string[]
  remarks: string
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Draft'
  createdAt: string
}

export const INITIAL_CHARGE_BACK_DISPUTES: ChargeBackDisputeRecord[] = [
  {
    id: 'CB-1001',
    ticketNumber: 'CBD-2026-1042',
    fundingType: 'FFM',
    atmId: 'MBP12121',
    cardNumber: '6082********2486',
    rrnNumber: '626915392411',
    txnAmt: '5000',
    adjustedAmt: '0',
    disputeAmt: '400',
    mspReferenceNo: '4192',
    sendStatus: 'Send',
    natureOfIncident: 'Pre-Arbitration Raise',
    errorDescription: 'POWER INTERRUPTION D TRXN STATUS JAM',
    txnDate: '28-09-2026',
    txnTime: '10:53:20',
    txnType: 'Withdrawal - Card',
    txnId: 'TXN88921041',
    utr: 'UTR88921001',
    wlaoRemark: 'Done',
    hitachiEmailDate: '03-10-2026',
    emailResponseDate: '05-10-2026',
    frRemark: 'FR Confirm No Overage Found.',
    uploadedDocuments: ['ej_log_mbp12121.pdf', 'cbr_statement.pdf', 'dispute_slip.jpg'],
    remarks: 'Customer debited but cash jammed in dispenser cassette #2.',
    status: 'Pending',
    createdAt: '2026-09-28T10:53:20Z',
  },
  {
    id: 'CB-1002',
    ticketNumber: 'CBD-2026-1055',
    fundingType: 'SF',
    atmId: 'MCRM7303',
    cardNumber: '817509******6868',
    rrnNumber: '629118042190',
    txnAmt: '800',
    adjustedAmt: '0',
    disputeAmt: '800',
    mspReferenceNo: '4192',
    sendStatus: 'DONE',
    natureOfIncident: 'Chargeback Raised',
    errorDescription: 'TRXN STATUS JAM',
    txnDate: '18-10-2026',
    txnTime: '12:00:00',
    txnType: 'Withdrawal - UPI',
    txnId: 'TXN88922119',
    utr: 'UTR88922312',
    wlaoRemark: 'Done',
    hitachiEmailDate: '03-10-2026',
    emailResponseDate: '05-10-2026',
    frRemark: 'FR Confirm No Overage Found.',
    uploadedDocuments: ['ej_log_mcrm7303.pdf'],
    remarks: 'Disputed amount 800 reversed by issuing bank.',
    status: 'In Progress',
    createdAt: '2026-10-18T12:00:00Z',
  },
  {
    id: 'CB-1003',
    ticketNumber: 'CBD-2026-1090',
    fundingType: 'FFM',
    atmId: 'ATM-100234',
    cardNumber: '5102********9012',
    rrnNumber: '626915498210',
    txnAmt: '4500',
    adjustedAmt: '0',
    disputeAmt: '4500',
    mspReferenceNo: '3310',
    sendStatus: 'DONE',
    natureOfIncident: 'Representment Filed',
    errorDescription: 'SHUTTER OPEN TIMEOUT',
    txnDate: '15-10-2026',
    txnTime: '16:20:15',
    txnType: 'Withdrawal - Card',
    txnId: 'TXN88923011',
    utr: 'UTR88923400',
    wlaoRemark: 'Verified with Bank',
    hitachiEmailDate: '16-10-2026',
    emailResponseDate: '18-10-2026',
    frRemark: 'Overage of 4500 accounted in CBR.',
    uploadedDocuments: ['audit_cbr_1510.pdf', 'ej_log_100234.pdf'],
    remarks: 'Representment successful, proof submitted to acquiring partner.',
    status: 'Resolved',
    createdAt: '2026-10-15T16:20:15Z',
  },
  {
    id: 'CB-1004',
    ticketNumber: 'CBD-2026-1104',
    fundingType: 'SF',
    atmId: 'ATM-100235',
    cardNumber: '4512********3319',
    rrnNumber: '629118559012',
    txnAmt: '2000',
    adjustedAmt: '500',
    disputeAmt: '1500',
    mspReferenceNo: '5512',
    sendStatus: 'Send',
    natureOfIncident: 'Chargeback Raised',
    errorDescription: 'PARTIAL CASH DISPENSED',
    txnDate: '12-10-2026',
    txnTime: '14:10:05',
    txnType: 'Withdrawal - Card',
    txnId: 'TXN88924089',
    utr: 'UTR88924512',
    wlaoRemark: 'Pending WLAO confirmation',
    hitachiEmailDate: '13-10-2026',
    emailResponseDate: '15-10-2026',
    frRemark: 'Discrepancy verified by site technician.',
    uploadedDocuments: ['site_visit_slip.pdf'],
    remarks: 'Disputed amount adjusted to 1500 after 500 partial dispense confirmed.',
    status: 'Pending',
    createdAt: '2026-10-12T14:10:05Z',
  },
  {
    id: 'CB-1005',
    ticketNumber: 'CBD-2026-1120',
    fundingType: 'FFM',
    atmId: 'ATM-100236',
    cardNumber: '6521********8801',
    rrnNumber: '626915662390',
    txnAmt: '10000',
    adjustedAmt: '0',
    disputeAmt: '10000',
    mspReferenceNo: '6201',
    sendStatus: 'Send',
    natureOfIncident: 'Pre-Arbitration Raise',
    errorDescription: 'NETWORK TIMEOUT / COMM FAIL',
    txnDate: '09-10-2026',
    txnTime: '18:45:30',
    txnType: 'Deposit - UPI',
    txnId: 'TXN88925102',
    utr: 'UTR88925990',
    wlaoRemark: 'Sent to Switch Ops',
    hitachiEmailDate: '10-10-2026',
    emailResponseDate: '12-10-2026',
    frRemark: 'Switch logs requested from MSP.',
    uploadedDocuments: ['switch_trace.pdf'],
    remarks: 'Customer raised pre-arbitration citing uncredited UPI deposit.',
    status: 'In Progress',
    createdAt: '2026-10-09T18:45:30Z',
  },
  {
    id: 'CB-1006',
    ticketNumber: 'CBD-2026-1135',
    fundingType: 'SF',
    atmId: 'ATM-100237',
    cardNumber: '5420********1140',
    rrnNumber: '629118774011',
    txnAmt: '3000',
    adjustedAmt: '0',
    disputeAmt: '3000',
    mspReferenceNo: '7100',
    sendStatus: 'DONE',
    natureOfIncident: 'Chargeback Raised',
    errorDescription: 'CARD RETRACTED / PURGE ERROR',
    txnDate: '05-10-2026',
    txnTime: '09:15:00',
    txnType: 'Withdrawal - Card',
    txnId: 'TXN88926040',
    utr: 'UTR88926410',
    wlaoRemark: 'Done',
    hitachiEmailDate: '06-10-2026',
    emailResponseDate: '08-10-2026',
    frRemark: 'Purge bin cash counted and balanced.',
    uploadedDocuments: ['purge_log.pdf'],
    remarks: 'Purge bin verification completed, settlement processed.',
    status: 'Resolved',
    createdAt: '2026-10-05T09:15:00Z',
  },
]

export const chargeBackStore = createStore<ChargeBackDisputeRecord[]>(
  'dexter_charge_back_disputes_v1',
  () => INITIAL_CHARGE_BACK_DISPUTES
)

export function useChargeBackStore() {
  const records = chargeBackStore.use()
  return {
    records,
    addRecord: (record: Omit<ChargeBackDisputeRecord, 'id' | 'ticketNumber' | 'createdAt'>) => {
      const now = new Date()
      const randomSeq = Math.floor(1000 + Math.random() * 9000)
      const ticketNumber = `CBD-${now.getFullYear()}-${randomSeq}`
      const newRecord: ChargeBackDisputeRecord = {
        ...record,
        id: `CB-${Date.now()}`,
        ticketNumber,
        createdAt: now.toISOString(),
      }
      chargeBackStore.set((prev) => [newRecord, ...prev])
      return newRecord
    },
    updateRecord: (id: string, updates: Partial<ChargeBackDisputeRecord>) => {
      chargeBackStore.set((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      )
    },
    deleteRecord: (id: string) => {
      chargeBackStore.set((prev) => prev.filter((r) => r.id !== id))
    },
    resetDummyData: () => {
      chargeBackStore.set(INITIAL_CHARGE_BACK_DISPUTES)
    },
    clearAll: () => {
      chargeBackStore.set([])
    },
  }
}

export function exportChargeBackCsv(records: ChargeBackDisputeRecord[], filename = 'charge-back-disputes') {
  const headers = [
    'S.N.',
    'Funding Type',
    'ATM ID',
    'Ticket Number',
    'TXN Type',
    'TXN ID',
    'UTR',
    'TXN Date',
    'TXN Time',
    'RRN',
    'Amount (₹)',
    'Dispute Amt (₹)',
    'Status',
    'Error Description',
    'Remarks',
  ]

  const rows = records.map((r, i) => [
    String(i + 1),
    r.fundingType,
    r.atmId,
    r.ticketNumber,
    r.txnType,
    r.txnId,
    r.utr || '-',
    r.txnDate,
    r.txnTime,
    r.rrnNumber,
    r.txnAmt,
    r.disputeAmt,
    r.status,
    r.errorDescription,
    r.remarks || '-',
  ])

  downloadCsv(filename, headers, rows)
}

export const CHARGEBACK_ATMS = [
  { atmId: 'MBP12121', siteId: 'ST-MH-MUM-00190' },
  { atmId: 'MCRM7303', siteId: 'ST-MH-PUN-00210' },
  ...KNOWN_ATMS.map((k) => ({ atmId: k.atmId, siteId: k.siteId })),
]

