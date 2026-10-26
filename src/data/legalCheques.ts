import { createStore } from '@/lib/store'

export type ChequeCollectionType = 'Employee' | 'SMF' | 'MF' | 'FR' | 'Party Vendor'
export type ChequeAcknowledgementStatus = 'Acknowledged' | 'Pending' | 'Received' | 'Rejected'
export type ChequeAllottedTo = 'Hitachi' | 'Dexter' | 'Bank' | 'Both'

export interface ChequeEntry {
  id: string
  sn: number
  bankName: string
  accountNumber: string
  chequeNumber: string
  allottedTo: ChequeAllottedTo
}

export interface ChequeDocument {
  name: string
  sizeKb: number
  type: string
}

export interface ChequeRecord {
  id: string
  sn: number
  siteId: string
  atmId: string
  franchiseeName: string
  mobileNumber: string
  model: string
  type: ChequeCollectionType
  frBankName: string
  frPod: string
  frPodDate: string
  hitachiChequeNumber: string
  dexterChequeNumber: string
  podToBank: string
  bankPodDate: string
  acknowledgement: ChequeAcknowledgementStatus
  dispatchedBy: string
  receivedBy: string
  documentType: 'Cheque Scan PDF' | 'Email Acknowledgment'
  documents: ChequeDocument[]
  handoverStaff: string
  remark: string
  chequeEntries: ChequeEntry[]
  createdAt: string
  updatedAt: string
}

export interface ChequesState {
  records: ChequeRecord[]
}

export const KNOWN_SITES = [
  {
    siteId: 'S-1001',
    atmId: 'ATM001',
    franchiseeName: 'Shree Sai Financial Services',
    mobileNumber: '+91 98765 43210',
    model: 'Hitachi ATM Model XYZ',
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
  },
  {
    siteId: 'S-1005',
    atmId: 'ATM003',
    franchiseeName: 'Om Finserve',
    mobileNumber: '+91 98123 45678',
    model: 'GRG ATM Model ABC',
    bankName: 'State Bank of India',
    accountNumber: '38291048592',
  },
  {
    siteId: 'S-1012',
    atmId: 'ATM007',
    franchiseeName: 'Kuber ATM Solutions',
    mobileNumber: '+91 97654 32109',
    model: 'NCR ATM Model 5886',
    bankName: 'ICICI Bank',
    accountNumber: '001105024891',
  },
  {
    siteId: 'S-1018',
    atmId: 'ATM011',
    franchiseeName: 'Madhav Enterprises',
    mobileNumber: '+91 98987 65432',
    model: 'Diebold ATM Model 5500',
    bankName: 'Axis Bank',
    accountNumber: '918020048192841',
  },
  {
    siteId: 'S-1024',
    atmId: 'ATM015',
    franchiseeName: 'Shakti Associates',
    mobileNumber: '+91 90012 34567',
    model: 'Hitachi ATM Model ABC',
    bankName: 'Punjab National Bank',
    accountNumber: '184900210008472',
  },
  {
    siteId: 'S-1030',
    atmId: 'ATM018',
    franchiseeName: 'Balaji FinTech',
    mobileNumber: '+91 94250 87654',
    model: 'GRG ATM Model H22N',
    bankName: 'Bank of Baroda',
    accountNumber: '29480100049281',
  },
]

const SEED_CHEQUE_RECORDS: ChequeRecord[] = [
  {
    id: 'CHQ-2025-001',
    sn: 1,
    siteId: 'S-1001',
    atmId: 'ATM001',
    franchiseeName: 'Shree Sai Financial Services',
    mobileNumber: '+91 98765 43210',
    model: 'Hitachi ATM Model XYZ',
    type: 'FR',
    frBankName: 'HDFC Bank',
    frPod: 'POD-MH-849201',
    frPodDate: '12/08/2025',
    hitachiChequeNumber: '048291',
    dexterChequeNumber: '048292',
    podToBank: 'BNK-POD-9921',
    bankPodDate: '16/08/2025',
    acknowledgement: 'Acknowledged',
    dispatchedBy: 'Sanjay Deshmukh',
    receivedBy: 'Ramesh Gupta',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'Cheque_Scan_S1001_5Entries.pdf', sizeKb: 1840, type: 'application/pdf' },
      { name: 'Bank_Acknowledgement_Receipt.pdf', sizeKb: 620, type: 'application/pdf' },
    ],
    handoverStaff: 'Paras Dubey',
    remark: 'All 5 cheques verified and recorded in Daak Register',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048291', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048292', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048293', allottedTo: 'Bank' },
      { id: 'entry-4', sn: 4, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048294', allottedTo: 'Both' },
      { id: 'entry-5', sn: 5, bankName: 'HDFC Bank', accountNumber: '50200012345678', chequeNumber: '048295', allottedTo: 'Dexter' },
    ],
    createdAt: '2025-08-12T10:30:00.000Z',
    updatedAt: '2025-08-16T15:45:00.000Z',
  },
  {
    id: 'CHQ-2025-002',
    sn: 2,
    siteId: 'S-1005',
    atmId: 'ATM003',
    franchiseeName: 'Om Finserve',
    mobileNumber: '+91 98123 45678',
    model: 'GRG ATM Model ABC',
    type: 'SMF',
    frBankName: 'State Bank of India',
    frPod: 'POD-GJ-110294',
    frPodDate: '15/08/2025',
    hitachiChequeNumber: '119284',
    dexterChequeNumber: '119285',
    podToBank: 'BNK-POD-4820',
    bankPodDate: '20/08/2025',
    acknowledgement: 'Pending',
    dispatchedBy: 'Vikram Joshi',
    receivedBy: 'Alok Sharma',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'OmFinserve_Cheques_Scan.pdf', sizeKb: 2150, type: 'application/pdf' },
    ],
    handoverStaff: 'Ananya Sharma',
    remark: 'Awaiting bank clearance report',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119284', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119285', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119286', allottedTo: 'Both' },
      { id: 'entry-4', sn: 4, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119287', allottedTo: 'Bank' },
      { id: 'entry-5', sn: 5, bankName: 'State Bank of India', accountNumber: '38291048592', chequeNumber: '119288', allottedTo: 'Hitachi' },
    ],
    createdAt: '2025-08-15T11:20:00.000Z',
    updatedAt: '2025-08-20T16:10:00.000Z',
  },
  {
    id: 'CHQ-2025-003',
    sn: 3,
    siteId: 'S-1012',
    atmId: 'ATM007',
    franchiseeName: 'Kuber ATM Solutions',
    mobileNumber: '+91 97654 32109',
    model: 'NCR ATM Model 5886',
    type: 'Party Vendor',
    frBankName: 'ICICI Bank',
    frPod: 'POD-KA-772910',
    frPodDate: '18/08/2025',
    hitachiChequeNumber: '772910',
    dexterChequeNumber: '772911',
    podToBank: 'BNK-POD-1039',
    bankPodDate: '22/08/2025',
    acknowledgement: 'Acknowledged',
    dispatchedBy: 'Naveen Kumar',
    receivedBy: 'Sunil Rao',
    documentType: 'Email Acknowledgment',
    documents: [
      { name: 'Kuber_ICICI_SignedCheques.pdf', sizeKb: 1680, type: 'application/pdf' },
      { name: 'Vendor_Email_Confirm.pdf', sizeKb: 340, type: 'application/pdf' },
    ],
    handoverStaff: 'Meera Iyer',
    remark: 'Physical cheques verified and stored in safe vault',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772910', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772911', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772912', allottedTo: 'Dexter' },
      { id: 'entry-4', sn: 4, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772913', allottedTo: 'Bank' },
      { id: 'entry-5', sn: 5, bankName: 'ICICI Bank', accountNumber: '001105024891', chequeNumber: '772914', allottedTo: 'Both' },
    ],
    createdAt: '2025-08-18T14:15:00.000Z',
    updatedAt: '2025-08-22T09:30:00.000Z',
  },
  {
    id: 'CHQ-2025-004',
    sn: 4,
    siteId: 'S-1018',
    atmId: 'ATM011',
    franchiseeName: 'Madhav Enterprises',
    mobileNumber: '+91 98987 65432',
    model: 'Diebold ATM Model 5500',
    type: 'MF',
    frBankName: 'Axis Bank',
    frPod: 'POD-UP-381920',
    frPodDate: '22/08/2025',
    hitachiChequeNumber: '883921',
    dexterChequeNumber: '883922',
    podToBank: 'BNK-POD-3301',
    bankPodDate: '26/08/2025',
    acknowledgement: 'Received',
    dispatchedBy: 'Gaurav Mishra',
    receivedBy: 'Deepak Verma',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'Madhav_AxisCheques.pdf', sizeKb: 1950, type: 'application/pdf' },
    ],
    handoverStaff: 'Paras Dubey',
    remark: 'Received at Mumbai branch office',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883921', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883922', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883923', allottedTo: 'Both' },
      { id: 'entry-4', sn: 4, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883924', allottedTo: 'Bank' },
      { id: 'entry-5', sn: 5, bankName: 'Axis Bank', accountNumber: '918020048192841', chequeNumber: '883925', allottedTo: 'Hitachi' },
    ],
    createdAt: '2025-08-22T16:00:00.000Z',
    updatedAt: '2025-08-26T11:40:00.000Z',
  },
  {
    id: 'CHQ-2025-005',
    sn: 5,
    siteId: 'S-1024',
    atmId: 'ATM015',
    franchiseeName: 'Shakti Associates',
    mobileNumber: '+91 90012 34567',
    model: 'Hitachi ATM Model ABC',
    type: 'Employee',
    frBankName: 'Punjab National Bank',
    frPod: 'POD-TN-664910',
    frPodDate: '25/08/2025',
    hitachiChequeNumber: '554910',
    dexterChequeNumber: '554911',
    podToBank: 'BNK-POD-8822',
    bankPodDate: '27/08/2025',
    acknowledgement: 'Acknowledged',
    dispatchedBy: 'Karthik Raja',
    receivedBy: 'M. Anand',
    documentType: 'Cheque Scan PDF',
    documents: [
      { name: 'Shakti_PNB_Cheques.pdf', sizeKb: 1420, type: 'application/pdf' },
    ],
    handoverStaff: 'Ananya Sharma',
    remark: 'Verified and linked to Daak item DAAK-2025-0482',
    chequeEntries: [
      { id: 'entry-1', sn: 1, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554910', allottedTo: 'Hitachi' },
      { id: 'entry-2', sn: 2, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554911', allottedTo: 'Dexter' },
      { id: 'entry-3', sn: 3, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554912', allottedTo: 'Bank' },
      { id: 'entry-4', sn: 4, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554913', allottedTo: 'Both' },
      { id: 'entry-5', sn: 5, bankName: 'Punjab National Bank', accountNumber: '184900210008472', chequeNumber: '554914', allottedTo: 'Dexter' },
    ],
    createdAt: '2025-08-25T09:10:00.000Z',
    updatedAt: '2025-08-27T17:20:00.000Z',
  },
]

export const chequesStore = createStore<ChequesState>(
  'dexter_cheques_store_v1',
  () => ({ records: SEED_CHEQUE_RECORDS })
)

export function useChequeRecords() {
  const state = chequesStore.use()
  return {
    records: state.records,
  }
}

export function getChequeRecord(id: string): ChequeRecord | undefined {
  return chequesStore.get().records.find((r) => r.id === id)
}

export function addChequeRecord(
  payload: Omit<ChequeRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>
): ChequeRecord {
  const state = chequesStore.get()
  const nextSn = state.records.length > 0 ? Math.max(...state.records.map((r) => r.sn)) + 1 : 1
  const numId = String(nextSn).padStart(3, '0')
  const id = `CHQ-2025-${numId}`
  const now = new Date().toISOString()

  const newRecord: ChequeRecord = {
    ...payload,
    id,
    sn: nextSn,
    createdAt: now,
    updatedAt: now,
  }

  chequesStore.set((s) => ({
    ...s,
    records: [newRecord, ...s.records],
  }))

  return newRecord
}

export function updateChequeRecord(
  id: string,
  payload: Partial<Omit<ChequeRecord, 'id' | 'sn' | 'createdAt'>>
): boolean {
  const state = chequesStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  const now = new Date().toISOString()
  chequesStore.set((s) => ({
    ...s,
    records: s.records.map((r) =>
      r.id === id ? { ...r, ...payload, updatedAt: now } : r
    ),
  }))

  return true
}

export function deleteChequeRecord(id: string): boolean {
  const state = chequesStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  chequesStore.set((s) => ({
    ...s,
    records: s.records.filter((r) => r.id !== id),
  }))

  return true
}
