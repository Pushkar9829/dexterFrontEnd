import { createStore } from '@/lib/store'

export type OtherDocCategory =
  | 'Bank Mandate'
  | 'Power of Attorney'
  | 'NOC Clearance'
  | 'Indemnity Bond'
  | 'Rent Agreement'
  | 'Board Resolution'
  | 'Property Deed'
  | 'Other'

export type OtherDocStatus = 'Verified' | 'Pending Review' | 'Action Required' | 'Expired'

export interface OtherDocFile {
  name: string
  sizeKb: number
  type: string
}

export interface OtherDocRecord {
  id: string
  sn: number
  siteId: string
  atmId: string
  franchiseeName: string
  mobileNumber: string
  model: string
  category: OtherDocCategory
  docTitle: string
  docRefNumber: string
  issuingAuthority: string
  issueDate: string
  expiryDate: string
  status: OtherDocStatus
  verifiedBy: string
  verificationDate: string
  documents: OtherDocFile[]
  remark: string
  createdAt: string
  updatedAt: string
}

export interface OtherDocsState {
  records: OtherDocRecord[]
}

const SEED_OTHER_DOCS: OtherDocRecord[] = [
  {
    id: 'DOC-2025-001',
    sn: 1,
    siteId: 'S-1001',
    atmId: 'ATM001',
    franchiseeName: 'Shree Sai Financial Services',
    mobileNumber: '+91 98765 43210',
    model: 'Hitachi ATM Model XYZ',
    category: 'Bank Mandate',
    docTitle: 'HDFC Corporate Settlement Mandate',
    docRefNumber: 'BNK-MND-HDFC-0921',
    issuingAuthority: 'HDFC Bank Ltd., Kothrud Branch',
    issueDate: '10/08/2025',
    expiryDate: '09/08/2028',
    status: 'Verified',
    verifiedBy: 'Paras Dubey',
    verificationDate: '12/08/2025',
    documents: [
      { name: 'HDFC_Bank_Mandate_Signed.pdf', sizeKb: 1450, type: 'application/pdf' },
      { name: 'Cancelled_Cheque_HDFC.jpg', sizeKb: 420, type: 'image/jpeg' },
    ],
    remark: 'Verified with bank signatory card and IFSC confirmation',
    createdAt: '2025-08-10T11:00:00.000Z',
    updatedAt: '2025-08-12T14:30:00.000Z',
  },
  {
    id: 'DOC-2025-002',
    sn: 2,
    siteId: 'S-1005',
    atmId: 'ATM003',
    franchiseeName: 'Om Finserve',
    mobileNumber: '+91 98123 45678',
    model: 'GRG ATM Model ABC',
    category: 'Rent Agreement',
    docTitle: 'Commercial Shop Lease Deed (5 Years)',
    docRefNumber: 'LEASE-AHM-2025-4829',
    issuingAuthority: 'Sub-Registrar Office, Ahmedabad',
    issueDate: '01/08/2025',
    expiryDate: '31/07/2030',
    status: 'Verified',
    verifiedBy: 'Meera Iyer',
    verificationDate: '05/08/2025',
    documents: [
      { name: 'Registered_Rent_Agreement_5Y.pdf', sizeKb: 3820, type: 'application/pdf' },
      { name: 'Electricity_Bill_Premises.pdf', sizeKb: 510, type: 'application/pdf' },
    ],
    remark: 'Registered lease deed with municipal tax receipts attached',
    createdAt: '2025-08-01T09:30:00.000Z',
    updatedAt: '2025-08-05T16:20:00.000Z',
  },
  {
    id: 'DOC-2025-003',
    sn: 3,
    siteId: 'S-1012',
    atmId: 'ATM007',
    franchiseeName: 'Kuber ATM Solutions',
    mobileNumber: '+91 97654 32109',
    model: 'NCR ATM Model 5886',
    category: 'Power of Attorney',
    docTitle: 'Special Power of Attorney (Site Operations)',
    docRefNumber: 'POA-BLR-004921',
    issuingAuthority: 'Notary Public, Bengaluru',
    issueDate: '15/08/2025',
    expiryDate: '14/08/2028',
    status: 'Pending Review',
    verifiedBy: 'Ananya Sharma',
    verificationDate: '18/08/2025',
    documents: [
      { name: 'Special_POA_Kuber_ATM.pdf', sizeKb: 2120, type: 'application/pdf' },
    ],
    remark: 'Awaiting notary seal legibility re-check',
    createdAt: '2025-08-15T10:15:00.000Z',
    updatedAt: '2025-08-18T11:00:00.000Z',
  },
  {
    id: 'DOC-2025-004',
    sn: 4,
    siteId: 'S-1018',
    atmId: 'ATM011',
    franchiseeName: 'Madhav Enterprises',
    mobileNumber: '+91 98987 65432',
    model: 'Diebold ATM Model 5500',
    category: 'NOC Clearance',
    docTitle: 'Society & Landlord No-Objection Certificate',
    docRefNumber: 'NOC-LKO-2025-0918',
    issuingAuthority: 'Mayur Commercial Society, Lucknow',
    issueDate: '18/08/2025',
    expiryDate: '17/08/2027',
    status: 'Verified',
    verifiedBy: 'Paras Dubey',
    verificationDate: '20/08/2025',
    documents: [
      { name: 'Society_NOC_Letter.pdf', sizeKb: 1140, type: 'application/pdf' },
    ],
    remark: 'Full society committee resolution attached with clearance seal',
    createdAt: '2025-08-18T13:45:00.000Z',
    updatedAt: '2025-08-20T10:30:00.000Z',
  },
  {
    id: 'DOC-2025-005',
    sn: 5,
    siteId: 'S-1024',
    atmId: 'ATM015',
    franchiseeName: 'Shakti Associates',
    mobileNumber: '+91 90012 34567',
    model: 'Hitachi ATM Model ABC',
    category: 'Indemnity Bond',
    docTitle: 'Operator Cash Handling Indemnity Bond',
    docRefNumber: 'IND-CHN-2025-8841',
    issuingAuthority: 'Judicial Magistrate, Chennai',
    issueDate: '22/08/2025',
    expiryDate: '21/08/2028',
    status: 'Verified',
    verifiedBy: 'Rahul Patil',
    verificationDate: '25/08/2025',
    documents: [
      { name: 'Indemnity_Bond_Stamp_500.pdf', sizeKb: 1980, type: 'application/pdf' },
    ],
    remark: 'Executed on Rs. 500 stamp paper with two witness signatures',
    createdAt: '2025-08-22T14:20:00.000Z',
    updatedAt: '2025-08-25T15:10:00.000Z',
  },
  {
    id: 'DOC-2025-006',
    sn: 6,
    siteId: 'S-1030',
    atmId: 'ATM018',
    franchiseeName: 'Balaji FinTech',
    mobileNumber: '+91 94250 87654',
    model: 'GRG ATM Model H22N',
    category: 'Board Resolution',
    docTitle: 'Certified Board Resolution for Bank Account Linking',
    docRefNumber: 'BR-2025-08-019',
    issuingAuthority: 'Balaji FinTech Private Limited Board',
    issueDate: '24/08/2025',
    expiryDate: '23/08/2029',
    status: 'Action Required',
    verifiedBy: 'Meera Iyer',
    verificationDate: '26/08/2025',
    documents: [
      { name: 'Board_Resolution_Extract.pdf', sizeKb: 980, type: 'application/pdf' },
    ],
    remark: 'Director DIN numbers missing in resolution extract; resubmission requested',
    createdAt: '2025-08-24T16:00:00.000Z',
    updatedAt: '2025-08-26T17:40:00.000Z',
  },
]

export const otherDocsStore = createStore<OtherDocsState>(
  'dexter_other_docs_store_v1',
  () => ({ records: SEED_OTHER_DOCS })
)

export function useOtherDocRecords() {
  const state = otherDocsStore.use()
  return {
    records: state.records,
  }
}

export function getOtherDocRecord(id: string): OtherDocRecord | undefined {
  return otherDocsStore.get().records.find((r) => r.id === id)
}

export function addOtherDocRecord(
  payload: Omit<OtherDocRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>
): OtherDocRecord {
  const state = otherDocsStore.get()
  const nextSn = state.records.length > 0 ? Math.max(...state.records.map((r) => r.sn)) + 1 : 1
  const numId = String(nextSn).padStart(3, '0')
  const id = `DOC-2025-${numId}`
  const now = new Date().toISOString()

  const newRecord: OtherDocRecord = {
    ...payload,
    id,
    sn: nextSn,
    createdAt: now,
    updatedAt: now,
  }

  otherDocsStore.set((s) => ({
    ...s,
    records: [newRecord, ...s.records],
  }))

  return newRecord
}

export function updateOtherDocRecord(
  id: string,
  payload: Partial<Omit<OtherDocRecord, 'id' | 'sn' | 'createdAt'>>
): boolean {
  const state = otherDocsStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  const now = new Date().toISOString()
  otherDocsStore.set((s) => ({
    ...s,
    records: s.records.map((r) =>
      r.id === id ? { ...r, ...payload, updatedAt: now } : r
    ),
  }))

  return true
}

export function deleteOtherDocRecord(id: string): boolean {
  const state = otherDocsStore.get()
  const exists = state.records.some((r) => r.id === id)
  if (!exists) return false

  otherDocsStore.set((s) => ({
    ...s,
    records: s.records.filter((r) => r.id !== id),
  }))

  return true
}
