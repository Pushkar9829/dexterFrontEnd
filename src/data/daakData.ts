// Postal & Courier Management (Operations spec §9 Inward Dak, §10 Outgoing Dak, §10.1 Address Master,
// §10.2 HRMS expense integration). Mock store (localStorage) — stands in for the API.
import { createStore } from '@/lib/store'
import { actorName, addressSnapshot, addressStore, emitWorkflow, logAudit, newTrail, nowIso, type Address, type AuditTrail } from '@/data/workflow'
import { patch as httpPatch, post as httpPost, uploadFile, type UploadMeta } from '@/lib/api'
import { apiEnabled, createLoader, errMsg, fetchAll, fromPaise, toPaise } from './opsApi'

// ── Masters ───────────────────────────────────────────────────────────────
export type DakMode = 'Courier' | 'Speed Post' | 'Registered Post' | 'Ordinary Post' | 'Hand Delivery'
export const DAK_MODES: DakMode[] = ['Courier', 'Speed Post', 'Registered Post', 'Ordinary Post', 'Hand Delivery']
export const COURIER_COMPANIES = ['BlueDart', 'DTDC', 'Trackon', 'Professional Couriers', 'Delhivery', 'India Post', 'By Hand']
export const ENVELOPE_TYPES = ['Sealed envelope', 'Tamper-evident bag', 'Window envelope', 'Parcel / box', 'Folder / file', 'Open document']
export const DOCUMENT_TYPES = ['Agreement / Stamp paper', 'Legal notice', 'Bank letter', 'NPCI / Network notice', 'Security cheque', 'KYC documents', 'Invoice / Bill', 'EOD / CBR physical copy', 'Government / Tax letter', 'Other']
export const DEPARTMENTS = ['Operations', 'Legal', 'Finance', 'Projects', 'Administration', 'HR', 'Management']
export const DAK_TAGS = ['Legal', 'Cheque', 'Agreement', 'KYC', 'Bank', 'NPCI', 'Franchise', 'Site', 'Urgent', 'Confidential', 'Original', 'Copy']
export const RACKS = ['Rack A / Shelf 1', 'Rack A / Shelf 2', 'Rack B / Shelf 1', 'Rack B / Shelf 3', 'Rack C / Box 4', 'Fireproof Safe 1', 'Fireproof Safe 2', 'Legal Cabinet L-2']

export type DakFile = { name: string; size: number; kind: string; at: string; by: string }
export type CustodyEvent = { at: string; by: string; action: string; from?: string; to?: string; location?: string; note?: string }

// ── Inward Dak (§9) ───────────────────────────────────────────────────────
export type InwardStatus = 'Received' | 'Inwarded' | 'Assigned' | 'Stored' | 'Dispatched'
export const INWARD_STATUSES: InwardStatus[] = ['Received', 'Inwarded', 'Assigned', 'Stored', 'Dispatched']

export type InwardDak = {
  id: string
  receivedAt: string // ISO date-time of receipt
  mode: DakMode
  courierCompany: string
  docketNo: string
  sender: { name: string; organization: string; address: string; phone: string }
  envelope: { number: string; type: string; identification: string }
  documentType: string
  description: string
  scans: DakFile[]
  receivedBy: string
  department: string
  owner: string
  rack: string
  register: string
  mapping: { legalRef: string; siteId: string; atmId: string; franchise: string }
  tags: string[]
  status: InwardStatus
  custodian: string
  outwardRef?: string
  history: CustodyEvent[]
  trail: AuditTrail
}

// ── Outward Dak (§10) ─────────────────────────────────────────────────────
export type DeliveryStatus = 'Dispatched' | 'In Transit' | 'Delivered' | 'Returned'
export const DELIVERY_STATUSES: DeliveryStatus[] = ['Dispatched', 'In Transit', 'Delivered', 'Returned']
export type PaidByKind = 'Employee' | 'Department' | 'Company'
export const PAID_BY_KINDS: PaidByKind[] = ['Employee', 'Department', 'Company']

export type OutwardDak = {
  id: string
  dispatchDate: string // yyyy-mm-dd
  recipientName: string
  addressId: string
  addressSnapshot: string // frozen at dispatch time (§10.1)
  document: { name: string; type: string; reference: string }
  copy?: DakFile
  courierCompany: string
  awb: string
  charges: number
  paidBy: { kind: PaidByKind; name: string }
  paymentProof?: DakFile
  department: string
  costCentre: string // project / site the spend is for (§10.2)
  deliveryStatus: DeliveryStatus
  deliveredAt?: string
  returnReason?: string
  pod?: DakFile
  expenseRef?: string
  inwardRef?: string
  dispatchedBy: string
  approval: 'Pending' | 'Approved'
  history: CustodyEvent[]
  trail: AuditTrail
  /** API mode: HRMS expense link state (Created / Pending HRMS / Not applicable). */
  expenseStatus?: string
}

// ── HRMS expense link (§10.2) ─────────────────────────────────────────────
// HRMS Expense Management keeps its claims in page state (no shared store yet), so the generated
// expense / bill lives here and is shown with its reference; HRMS picks it up through this store.
export type DakExpenseStatus = 'Submitted' | 'Pending Approval' | 'Approved' | 'Reimbursed' | 'Rejected'
export type DakExpense = {
  ref: string
  outwardId: string
  createdAt: string
  date: string
  expenseHead: string
  category: string
  amount: number
  paidByKind: PaidByKind
  paidBy: string
  department: string
  costCentre: string
  billSubmittedBy: string
  description: string
  receipt?: string
  status: DakExpenseStatus
  history: CustodyEvent[]
}

export type ChequeRecord = {
  chequeId: string
  chequeNumber: string
  bankName: string
  branchName: string
  partyName: string
  franchiseeId: string
  atmId: string
  amount: number
  chequeDate: string
  accountNumber: string
  ifscCode: string
  verificationStatus: 'Verified' | 'Under Custody' | 'Deposited' | 'Awaiting Receipt' | 'Discrepancy'
  custodian: string
  vaultLocation: string
  originatingDakId: string
  originatingDocket: string
  courier: string
  receivedDate: string
  linkType: 'CONTAINS' | 'REPLACEMENT_FOR' | 'SUPPORTING_DOC'
  podAttachmentName?: string
  envelopeAttachmentName?: string
  notes?: string
}

export type DaakState = { inward: InwardDak[]; outward: OutwardDak[]; expenses: DakExpense[]; cheques: ChequeRecord[] }

// ── Seed ──────────────────────────────────────────────────────────────────
const T = (by: string, at: string): AuditTrail => ({ createdBy: by, createdAt: at, submittedBy: by, submittedAt: at, modifications: [], documents: [], taskRefs: [] })
const F = (name: string, kind: string, at: string, by: string, size = 240_000): DakFile => ({ name, size, kind, at, by })
const NEHA = 'Neha Sharma'

function seedInward(): InwardDak[] {
  const mk = (p: Omit<InwardDak, 'history' | 'trail' | 'custodian'> & { custodian?: string; extra?: CustodyEvent[] }): InwardDak => {
    const { extra = [], custodian, ...rest } = p
    const base: CustodyEvent[] = [{ at: p.receivedAt, by: p.receivedBy, action: 'Received at dak desk', to: p.receivedBy, note: `${p.mode}${p.docketNo ? ` · ${p.docketNo}` : ''}` }]
    return { ...rest, custodian: custodian ?? p.receivedBy, history: [...base, ...extra], trail: { ...T(NEHA, p.receivedAt), documents: p.scans.map((s) => ({ at: s.at, by: s.by, name: s.name, action: 'Uploaded' as const })) } }
  }
  return [
    mk({
      id: 'DAAK-IN-2026-0142', receivedAt: '2026-10-24T11:30:00+05:30', mode: 'Courier', courierCompany: 'BlueDart', docketNo: 'BD-884910281',
      sender: { name: 'Ranjeet Pal & Shikha Pal', organization: 'Franchisee – Mainpuri', address: 'Station Road, Near Tehsil Gate, Mainpuri, UP - 205001', phone: '+91 81268 17131' },
      envelope: { number: 'ENV-24-0142', type: 'Sealed envelope', identification: 'Brown A4, BlueDart seal intact' },
      documentType: 'Security cheque', description: '2 post-dated security cheques (HDFC 482019 / 482020) + Rs 500 stamp-paper tripartite franchise agreement + KYC set',
      scans: [F('Envelope_Scan_0142.jpg', 'Envelope', '2026-10-24T11:40:00+05:30', NEHA), F('Agreement_0142.pdf', 'Document', '2026-10-24T11:45:00+05:30', NEHA, 1_850_000)],
      receivedBy: NEHA, department: 'Legal', owner: 'Kavita Rao', rack: 'Fireproof Safe 2', register: 'Inward Register Vol-7 / Pg 42',
      mapping: { legalRef: 'AGR-UP-02391', siteId: 'SITE-UP-0012', atmId: 'DXUP70084', franchise: 'DX-UP-02391' }, tags: ['Cheque', 'Agreement', 'Original', 'Franchise'], status: 'Stored', custodian: 'Kavita Rao',
      extra: [
        { at: '2026-10-24T12:10:00+05:30', by: NEHA, action: 'Inwarded', note: 'Inward Register Vol-7 / Pg 42' },
        { at: '2026-10-24T14:15:00+05:30', by: NEHA, action: 'Custody transferred', from: NEHA, to: 'Kavita Rao', note: 'Assigned to Legal' },
        { at: '2026-10-24T16:00:00+05:30', by: 'Kavita Rao', action: 'Stored', location: 'Fireproof Safe 2' },
      ],
    }),
    mk({
      id: 'DAAK-IN-2026-0149', receivedAt: '2026-10-26T10:15:00+05:30', mode: 'Courier', courierCompany: 'Trackon', docketNo: 'TC-9912048',
      sender: { name: 'Vinod Mehra', organization: 'Vinod Mehra & Sons', address: 'Shop 12, Sanjay Place, Agra, UP - 282002', phone: '+91 98370 11223' },
      envelope: { number: 'ENV-26-0149', type: 'Window envelope', identification: 'White, slightly torn at flap' },
      documentType: 'Security cheque', description: 'Security cheque Rs 3,00,000 with franchise agreement annexure (amount mismatch noted)',
      scans: [F('Envelope_Vinod.jpg', 'Envelope', '2026-10-26T10:30:00+05:30', NEHA)],
      receivedBy: NEHA, department: 'Finance', owner: 'Sanjay Gupta', rack: '', register: 'Inward Register Vol-7 / Pg 44',
      mapping: { legalRef: '', siteId: '', atmId: '', franchise: 'DX-UP-02410' }, tags: ['Cheque', 'Urgent'], status: 'Assigned', custodian: 'Sanjay Gupta',
      extra: [
        { at: '2026-10-26T10:40:00+05:30', by: NEHA, action: 'Inwarded', note: 'Inward Register Vol-7 / Pg 44' },
        { at: '2026-10-26T11:05:00+05:30', by: NEHA, action: 'Custody transferred', from: NEHA, to: 'Sanjay Gupta', note: 'Amount mismatch — Finance to confirm' },
      ],
    }),
    mk({
      id: 'DAAK-IN-2026-0155', receivedAt: '2026-10-28T14:45:00+05:30', mode: 'Courier', courierCompany: 'DTDC', docketNo: 'DTDC-7721903',
      sender: { name: 'Rameshwar Kulkarni', organization: 'Franchisee – Pune', address: 'Flat 402, Shiv Sadan, Model Colony, Pune - 411016', phone: '+91 94220 55110' },
      envelope: { number: 'ENV-28-0155', type: 'Tamper-evident bag', identification: 'Bag barcode TB-55019' },
      documentType: 'Security cheque', description: 'ICICI security cheque + NOC & bank solvency certificate',
      scans: [], receivedBy: NEHA, department: 'Finance', owner: '', rack: '', register: 'Inward Register Vol-7 / Pg 47',
      mapping: { legalRef: '', siteId: '', atmId: 'DX-MH-01482', franchise: 'FR-MH-00124' }, tags: ['Cheque', 'Bank'], status: 'Inwarded',
      extra: [{ at: '2026-10-28T15:00:00+05:30', by: NEHA, action: 'Inwarded', note: 'Inward Register Vol-7 / Pg 47' }],
    }),
    mk({
      id: 'DAAK-IN-2026-0160', receivedAt: '2026-10-29T12:05:00+05:30', mode: 'Speed Post', courierCompany: 'India Post', docketNo: 'EU887279954IN',
      sender: { name: 'Disputes Cell', organization: 'NPCI', address: 'Bandra Kurla Complex, Mumbai - 400051', phone: '022-40000000' },
      envelope: { number: 'ENV-29-0160', type: 'Sealed envelope', identification: 'NPCI franked cover' },
      documentType: 'NPCI / Network notice', description: 'Chargeback pre-arbitration notice — ATM DX-MH-01482, RRN 626915392411',
      scans: [F('NPCI_notice_0160.pdf', 'Document', '2026-10-29T12:20:00+05:30', NEHA, 640_000)],
      receivedBy: NEHA, department: 'Operations', owner: 'Kiran Rao', rack: 'Rack B / Shelf 3', register: 'Inward Register Vol-7 / Pg 48',
      mapping: { legalRef: '', siteId: 'ST-MH-PUN-00124', atmId: 'DX-MH-01482', franchise: 'FR-MH-00124' }, tags: ['NPCI', 'Bank', 'Urgent'], status: 'Stored', custodian: 'Kiran Rao',
      extra: [
        { at: '2026-10-29T12:30:00+05:30', by: NEHA, action: 'Inwarded', note: 'Inward Register Vol-7 / Pg 48' },
        { at: '2026-10-29T12:45:00+05:30', by: NEHA, action: 'Custody transferred', from: NEHA, to: 'Kiran Rao', note: 'Chargeback desk' },
        { at: '2026-10-30T10:00:00+05:30', by: 'Kiran Rao', action: 'Stored', location: 'Rack B / Shelf 3' },
      ],
    }),
    mk({
      id: 'DAAK-IN-2026-0168', receivedAt: '2026-11-01T09:45:00+05:30', mode: 'Hand Delivery', courierCompany: 'By Hand', docketNo: '',
      sender: { name: 'Surya Pratap Singh', organization: 'Awadh Cash Management', address: 'Civil Lines, Hazratganj, Lucknow, UP - 226001', phone: '+91 99350 44120' },
      envelope: { number: 'ENV-01-0168', type: 'Folder / file', identification: 'Green file, 14 pages' },
      documentType: 'EOD / CBR physical copy', description: 'Signed physical cash-loading register pages for Oct 2026',
      scans: [], receivedBy: NEHA, department: '', owner: '', rack: '', register: '',
      mapping: { legalRef: '', siteId: '', atmId: 'DX-UP-03051', franchise: '' }, tags: ['Site'], status: 'Received',
    }),
    mk({
      id: 'DAAK-IN-2026-0128', receivedAt: '2026-10-18T16:20:00+05:30', mode: 'Speed Post', courierCompany: 'India Post', docketNo: 'EU887283335IN',
      sender: { name: 'Nodal Officer', organization: 'Axis Bank – Currency Chest', address: 'Sector 18, Noida, UP - 201301', phone: '0120-4000000' },
      envelope: { number: 'ENV-18-0128', type: 'Sealed envelope', identification: 'Axis Bank logo cover' },
      documentType: 'Bank letter', description: 'Replacement security cheque and covering letter from bank',
      scans: [F('Axis_cover_letter.pdf', 'Document', '2026-10-18T16:40:00+05:30', NEHA, 310_000)],
      receivedBy: NEHA, department: 'Legal', owner: 'Kavita Rao', rack: 'Legal Cabinet L-2', register: 'Inward Register Vol-7 / Pg 31',
      mapping: { legalRef: 'AGR-UP-02391', siteId: '', atmId: '', franchise: 'DX-UP-02391' }, tags: ['Bank', 'Cheque'], status: 'Dispatched', custodian: 'Kavita Rao', outwardRef: 'DAAK-OUT-2026-0089',
      extra: [
        { at: '2026-10-18T16:45:00+05:30', by: NEHA, action: 'Inwarded', note: 'Inward Register Vol-7 / Pg 31' },
        { at: '2026-10-19T10:00:00+05:30', by: NEHA, action: 'Custody transferred', from: NEHA, to: 'Kavita Rao' },
        { at: '2026-10-19T12:00:00+05:30', by: 'Kavita Rao', action: 'Stored', location: 'Legal Cabinet L-2' },
        { at: '2026-10-25T16:15:00+05:30', by: NEHA, action: 'Dispatched', note: 'Sent out under DAAK-OUT-2026-0089' },
      ],
    }),
  ]
}

function seedOutward(): OutwardDak[] {
  const ev = (at: string, action: string, note?: string, by = NEHA): CustodyEvent => ({ at, by, action, note })
  return [
    {
      id: 'DAAK-OUT-2026-0089', dispatchDate: '2026-10-25', recipientName: 'Legal Head', addressId: 'ADR-003',
      addressSnapshot: 'Legal Head, Dexter India – Head Office, A-12, Sector 63, Noida, Uttar Pradesh - 201309 (0120-4111111)',
      document: { name: 'Replacement security cheque + bank letter', type: 'Security cheque', reference: 'DAAK-IN-2026-0128' }, copy: F('Dispatch_copy_0089.pdf', 'Document copy', '2026-10-25T16:00:00+05:30', NEHA),
      courierCompany: 'BlueDart', awb: 'BD-991204821', charges: 240, paidBy: { kind: 'Employee', name: NEHA }, paymentProof: F('BD_receipt_991204821.jpg', 'Payment proof', '2026-10-25T16:10:00+05:30', NEHA, 90_000),
      department: 'Legal', costCentre: 'Head Office', deliveryStatus: 'Delivered', deliveredAt: '2026-10-27T11:00:00+05:30', pod: F('POD_BD_991204821.pdf', 'POD', '2026-10-27T15:00:00+05:30', NEHA, 120_000),
      expenseRef: 'EXP-DAK-2026-0001', inwardRef: 'DAAK-IN-2026-0128', dispatchedBy: NEHA, approval: 'Approved',
      history: [ev('2026-10-25T15:50:00+05:30', 'Created'), ev('2026-10-25T16:05:00+05:30', 'Approved', undefined, 'Meera Iyer'), ev('2026-10-25T16:15:00+05:30', 'Dispatched', 'BlueDart BD-991204821'), ev('2026-10-27T11:00:00+05:30', 'Delivered', 'POD uploaded')],
      trail: { ...T(NEHA, '2026-10-25T15:50:00+05:30'), approvedBy: 'Meera Iyer', approvedAt: '2026-10-25T16:05:00+05:30' },
    },
    {
      id: 'DAAK-OUT-2026-0095', dispatchDate: '2026-10-30', recipientName: 'Disputes Cell', addressId: 'ADR-002',
      addressSnapshot: 'Disputes Cell, NPCI, Bandra Kurla Complex, Mumbai, Maharashtra - 400051 (022-40000000)',
      document: { name: 'Chargeback response report with CBR extract', type: 'NPCI / Network notice', reference: 'CBD-2026-1042' }, copy: F('CB_response_1042.pdf', 'Document copy', '2026-10-30T15:00:00+05:30', NEHA),
      courierCompany: 'India Post', awb: 'EU887290011IN', charges: 84, paidBy: { kind: 'Company', name: 'Dexter India – Operations' },
      department: 'Operations', costCentre: 'Reconciliation', deliveryStatus: 'In Transit', dispatchedBy: NEHA, approval: 'Approved',
      history: [ev('2026-10-30T15:10:00+05:30', 'Created'), ev('2026-10-30T15:20:00+05:30', 'Approved', undefined, 'Meera Iyer'), ev('2026-10-30T15:30:00+05:30', 'Dispatched', 'Speed Post EU887290011IN'), ev('2026-10-31T09:00:00+05:30', 'In Transit')],
      trail: { ...T(NEHA, '2026-10-30T15:10:00+05:30'), approvedBy: 'Meera Iyer', approvedAt: '2026-10-30T15:20:00+05:30' },
    },
    {
      id: 'DAAK-OUT-2026-0101', dispatchDate: '2026-11-12', recipientName: 'Nodal Officer', addressId: 'ADR-001',
      addressSnapshot: 'Nodal Officer, Axis Bank – Currency Chest, Sector 18, Noida, Uttar Pradesh - 201301 (0120-4000000)',
      document: { name: 'Failed txn dispute letter + EJ log', type: 'Bank letter', reference: 'FTD-2026-1002' },
      courierCompany: 'DTDC', awb: 'DTDC-7739120', charges: 120, paidBy: { kind: 'Department', name: 'Operations' },
      department: 'Operations', costCentre: 'Reconciliation', deliveryStatus: 'Returned', returnReason: 'Addressee not available — returned to sender', dispatchedBy: NEHA, approval: 'Approved',
      history: [ev('2026-11-12T11:00:00+05:30', 'Created'), ev('2026-11-12T11:20:00+05:30', 'Approved', undefined, 'Meera Iyer'), ev('2026-11-12T12:00:00+05:30', 'Dispatched'), ev('2026-11-16T17:00:00+05:30', 'Returned', 'Addressee not available')],
      trail: { ...T(NEHA, '2026-11-12T11:00:00+05:30'), approvedBy: 'Meera Iyer', approvedAt: '2026-11-12T11:20:00+05:30' },
    },
    {
      id: 'DAAK-OUT-2026-0108', dispatchDate: '2026-11-24', recipientName: 'Disputes Cell', addressId: 'ADR-002',
      addressSnapshot: 'Disputes Cell, NPCI, Bandra Kurla Complex, Mumbai, Maharashtra - 400051 (022-40000000)',
      document: { name: 'Representment documents', type: 'NPCI / Network notice', reference: 'CBD-2026-1090' },
      courierCompany: 'BlueDart', awb: 'BD-993310044', charges: 260, paidBy: { kind: 'Employee', name: NEHA },
      department: 'Operations', costCentre: 'Reconciliation', deliveryStatus: 'Dispatched', dispatchedBy: NEHA, approval: 'Pending',
      history: [ev('2026-11-24T16:00:00+05:30', 'Created')],
      trail: T(NEHA, '2026-11-24T16:00:00+05:30'),
    },
  ]
}

const seedExpenses = (): DakExpense[] => [
  {
    ref: 'EXP-DAK-2026-0001', outwardId: 'DAAK-OUT-2026-0089', createdAt: '2026-10-25T16:30:00+05:30', date: '2026-10-25', expenseHead: 'Courier & Postage', category: 'Courier',
    amount: 240, paidByKind: 'Employee', paidBy: NEHA, department: 'Legal', costCentre: 'Head Office', billSubmittedBy: NEHA,
    description: 'BlueDart BD-991204821 — Replacement security cheque + bank letter to Legal Head', receipt: 'BD_receipt_991204821.jpg', status: 'Reimbursed',
    history: [{ at: '2026-10-25T16:30:00+05:30', by: NEHA, action: 'Expense created from Outward Dak' }, { at: '2026-10-28T10:00:00+05:30', by: 'Sanjay Gupta', action: 'Reimbursed' }],
  },
]

const SEED_CHEQUES: ChequeRecord[] = [
  {
    chequeId: 'CHQ-2026-0814',
    chequeNumber: '482019',
    bankName: 'HDFC Bank',
    branchName: 'Mainpuri Branch',
    partyName: 'Ranjeet Pal & Shikha Pal',
    franchiseeId: 'DX-UP-02391',
    atmId: 'ATM-UP-0412',
    amount: 500000,
    chequeDate: '2026-10-22',
    accountNumber: '502000622323610',
    ifscCode: 'HDFC0003925',
    verificationStatus: 'Verified',
    custodian: 'Amit Sharma (Vault Manager - Mumbai HQ)',
    vaultLocation: 'Locker B-14, Fireproof Safe 2',
    originatingDakId: 'DAAK-IN-2026-0142',
    originatingDocket: 'BD-884910281',
    courier: 'BlueDart',
    receivedDate: '2026-10-24',
    linkType: 'CONTAINS',
    podAttachmentName: 'POD_BD_884910281.pdf',
    envelopeAttachmentName: 'Envelope_Scan_0142.jpg',
    notes: 'Primary Security Deposit Cheque against WLA ATM-UP-0412 installation.',
  },
  {
    chequeId: 'CHQ-2026-0815',
    chequeNumber: '482020',
    bankName: 'HDFC Bank',
    branchName: 'Mainpuri Branch',
    partyName: 'Ranjeet Pal & Shikha Pal',
    franchiseeId: 'DX-UP-02391',
    atmId: 'ATM-UP-0412',
    amount: 250000,
    chequeDate: '2026-10-22',
    accountNumber: '502000622323610',
    ifscCode: 'HDFC0003925',
    verificationStatus: 'Under Custody',
    custodian: 'Amit Sharma (Vault Manager - Mumbai HQ)',
    vaultLocation: 'Locker B-14, Fireproof Safe 2',
    originatingDakId: 'DAAK-IN-2026-0142',
    originatingDocket: 'BD-884910281',
    courier: 'BlueDart',
    receivedDate: '2026-10-24',
    linkType: 'CONTAINS',
    podAttachmentName: 'POD_BD_884910281.pdf',
    envelopeAttachmentName: 'Envelope_Scan_0142.jpg',
    notes: 'Secondary Vault Cash Margin instrument.',
  },
  {
    chequeId: 'CHQ-2026-0792',
    chequeNumber: '110943',
    bankName: 'State Bank of India',
    branchName: 'Surat Ring Road',
    partyName: 'Bhavin Patel (Apex ATM Ventures)',
    franchiseeId: 'DX-GJ-02988',
    atmId: 'ATM-GJ-1102',
    amount: 1000000,
    chequeDate: '2026-10-18',
    accountNumber: '20194857610',
    ifscCode: 'SBIN0001844',
    verificationStatus: 'Deposited',
    custodian: 'Pooja Verma (Branch Ops - Delhi)',
    vaultLocation: 'Vault Cage 1 - Central Locker',
    originatingDakId: 'DAAK-IN-2026-0128',
    originatingDocket: 'SP-IN982104523',
    courier: 'Speed Post',
    receivedDate: '2026-10-20',
    linkType: 'CONTAINS',
    podAttachmentName: 'SpeedPost_Receipt_0128.pdf',
    envelopeAttachmentName: 'Env_Scan_Bhavin.jpg',
    notes: 'Super Master Franchisee Security Deposit cheque cleared with SBI.',
  },
  {
    chequeId: 'CHQ-2026-0830',
    chequeNumber: '739201',
    bankName: 'ICICI Bank',
    branchName: 'Pune Shivaji Nagar',
    partyName: 'Rameshwar Kulkarni',
    franchiseeId: 'DX-MH-01482',
    atmId: 'ATM-MH-0921',
    amount: 500000,
    chequeDate: '2026-10-26',
    accountNumber: '000405012345',
    ifscCode: 'ICIC0000004',
    verificationStatus: 'Awaiting Receipt',
    custodian: 'Pending Inward Receipt',
    vaultLocation: 'Unassigned',
    originatingDakId: 'DAAK-IN-2026-0155',
    originatingDocket: 'DTDC-7721903',
    courier: 'DTDC',
    receivedDate: '2026-10-28',
    linkType: 'CONTAINS',
    podAttachmentName: 'DTDC_Slip_7721903.pdf',
    notes: 'Consignment in transit from Pune Hub. Tracking DTDC-7721903.',
  },
  {
    chequeId: 'CHQ-2026-0845',
    chequeNumber: '665120',
    bankName: 'Bank of Baroda',
    branchName: 'Agra Cantt',
    partyName: 'Vinod Mehra & Sons',
    franchiseeId: 'DX-UP-01934',
    atmId: 'ATM-UP-0873',
    amount: 300000,
    chequeDate: '2026-10-25',
    accountNumber: '44910283710',
    ifscCode: 'BARB0AGRCAN',
    verificationStatus: 'Discrepancy',
    custodian: 'Pooja Verma (Branch Ops - Delhi)',
    vaultLocation: 'Holding Tray (Discrepancy Hold)',
    originatingDakId: 'DAAK-IN-2026-0149',
    originatingDocket: 'TC-9912048',
    courier: 'Trackon',
    receivedDate: '2026-10-26',
    linkType: 'CONTAINS',
    podAttachmentName: 'Trackon_POD_9912048.pdf',
    envelopeAttachmentName: 'Envelope_Vinod.jpg',
    notes: 'Mismatch: Cheque amount is Rs. 3,00,000 but accompanying agreement specifies Rs. 5,00,000.',
  },
]


export const daakStore = createStore<DaakState>('dexter.daak.v2', () => ({ inward: seedInward(), outward: seedOutward(), expenses: seedExpenses(), cheques: SEED_CHEQUES }))
export const useDaakState = () => daakStore.use()

type Result = { ok: true; id: string } | { ok: false; error: string }
const year = () => new Date().getFullYear()
const nextId = (prefix: string, ids: string[]) => {
  const n = ids.map((i) => Number(i.match(/(\d+)$/)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 0) + 1
  return `${prefix}-${year()}-${String(n).padStart(4, '0')}`
}
const fileOf = (f: { name: string; size: number }, kind: string): DakFile => ({ ...f, kind, at: nowIso(), by: actorName() })

// ── Inward actions ────────────────────────────────────────────────────────
export type InwardInput = Omit<InwardDak, 'id' | 'history' | 'trail' | 'custodian' | 'outwardRef' | 'scans' | 'status'> & { scans: { name: string; size: number; kind: string }[] }

export function inwardMissing(i: Pick<InwardDak, 'status' | 'register' | 'department' | 'owner' | 'rack'>, status: InwardStatus = i.status): string | null {
  const idx = INWARD_STATUSES.indexOf(status)
  if (idx >= 1 && !i.register.trim()) return 'Register reference is required to mark the dak Inwarded.'
  if (idx >= 2 && (!i.department || !i.owner.trim())) return 'Department and owner are required to mark the dak Assigned.'
  if (idx >= 3 && !i.rack) return 'Rack / storage location is required to mark the dak Stored.'
  return null
}

export function createInward(input: InwardInput): Result {
  if (!input.sender.name.trim() || !input.description.trim() || !input.receivedAt) return { ok: false, error: 'Sender, received date / time and document description are required.' }
  const s = daakStore.get()
  const id = nextId('DAAK-IN', s.inward.map((r) => r.id))
  const by = actorName()
  // status follows what was captured: register → Inwarded, owner → Assigned, rack → Stored
  const status: InwardStatus = input.rack ? 'Stored' : input.owner && input.department ? 'Assigned' : input.register ? 'Inwarded' : 'Received'
  const scans = input.scans.map((f) => fileOf(f, f.kind))
  const history: CustodyEvent[] = [{ at: nowIso(), by, action: 'Received at dak desk', to: input.receivedBy, note: `${input.mode}${input.docketNo ? ` · ${input.docketNo}` : ''}` }]
  if (input.register) history.push({ at: nowIso(), by, action: 'Inwarded', note: input.register })
  if (input.owner) history.push({ at: nowIso(), by, action: 'Custody transferred', from: input.receivedBy, to: input.owner, note: `Assigned to ${input.department}` })
  if (input.rack) history.push({ at: nowIso(), by, action: 'Stored', location: input.rack })
  const trail = { ...newTrail(), submittedBy: by, submittedAt: nowIso(), documents: scans.map((f) => ({ at: f.at, by: f.by, name: f.name, action: 'Uploaded' as const })) }
  const rec: InwardDak = { ...input, id, scans, status, custodian: input.owner || input.receivedBy, history, trail }
  daakStore.set((p) => ({ ...p, inward: [rec, ...p.inward] }))
  logAudit('Postal & Courier', id, 'Inward dak created', `${input.sender.name} · ${status}`)
  if (input.owner) emitWorkflow({ module: 'Postal & Courier', event: 'Assign', refId: id, vars: { Site_ID: input.mapping.siteId, ATM_ID: input.mapping.atmId, Current_Status: status }, nextAction: { title: `Collect inward dak ${id} (${input.documentType})` } })
  return { ok: true, id }
}

const flat = (r: InwardDak): Record<string, string> => ({
  'Received date / time': r.receivedAt, Mode: r.mode, 'Courier company': r.courierCompany, 'Docket no.': r.docketNo,
  'Sender name': r.sender.name, 'Sender organisation': r.sender.organization, 'Sender address': r.sender.address, 'Sender phone': r.sender.phone,
  'Envelope no.': r.envelope.number, 'Envelope type': r.envelope.type, 'Envelope identification': r.envelope.identification,
  'Document type': r.documentType, 'Document description': r.description, 'Received by': r.receivedBy, Department: r.department, Owner: r.owner,
  'Rack / storage': r.rack, 'Register reference': r.register, 'Legal ref.': r.mapping.legalRef, 'Site ID': r.mapping.siteId, 'ATM ID': r.mapping.atmId, Franchise: r.mapping.franchise, Tags: r.tags.join(', '),
})

/** Edit an inward record — every changed field is logged with old / new value and the reason (§18). */
export function updateInward(id: string, next: Partial<InwardDak>, reason: string): Result {
  if (!reason.trim()) return { ok: false, error: 'A modification reason is mandatory.' }
  const cur = daakStore.get().inward.find((r) => r.id === id)
  if (!cur) return { ok: false, error: 'Record not found.' }
  const merged: InwardDak = { ...cur, ...next }
  const miss = inwardMissing(merged)
  if (miss) return { ok: false, error: miss }
  const a = flat(cur)
  const b = flat(merged)
  const changes = Object.keys(b).filter((k) => a[k] !== b[k])
  if (!changes.length) return { ok: false, error: 'Nothing changed.' }
  const by = actorName()
  const mods = changes.map((k) => ({ at: nowIso(), by, field: k, oldValue: a[k], newValue: b[k], reason }))
  daakStore.set((p) => ({ ...p, inward: p.inward.map((r) => (r.id === id ? { ...merged, trail: { ...r.trail, modifications: [...r.trail.modifications, ...mods] }, history: [...r.history, { at: nowIso(), by, action: 'Record updated', note: `${changes.join(', ')} — ${reason}` }] } : r)) }))
  logAudit('Postal & Courier', id, 'Inward dak updated', changes.join(', '))
  return { ok: true, id }
}

export function setInwardStatus(id: string, status: InwardStatus, note?: string): Result {
  const cur = daakStore.get().inward.find((r) => r.id === id)
  if (!cur) return { ok: false, error: 'Record not found.' }
  const miss = inwardMissing(cur, status)
  if (miss) return { ok: false, error: miss }
  const by = actorName()
  daakStore.set((p) => ({ ...p, inward: p.inward.map((r) => (r.id === id ? { ...r, status, history: [...r.history, { at: nowIso(), by, action: status, location: status === 'Stored' ? r.rack : undefined, note }] } : r)) }))
  logAudit('Postal & Courier', id, `Inward status → ${status}`, note)
  return { ok: true, id }
}

/** Physical custody transfer — each hand-over is a permanent movement-history entry (§9 audit). */
export function transferCustody(id: string, to: string, location: string, note: string): Result {
  if (!to.trim()) return { ok: false, error: 'Select who receives custody.' }
  const cur = daakStore.get().inward.find((r) => r.id === id)
  if (!cur) return { ok: false, error: 'Record not found.' }
  if (cur.custodian === to && (!location || location === cur.rack)) return { ok: false, error: `${to} already holds custody.` }
  const by = actorName()
  daakStore.set((p) => ({
    ...p,
    inward: p.inward.map((r) => (r.id === id ? { ...r, custodian: to, rack: location || r.rack, history: [...r.history, { at: nowIso(), by, action: 'Custody transferred', from: r.custodian, to, location: location || undefined, note: note || undefined }] } : r)),
  }))
  logAudit('Postal & Courier', id, 'Custody transferred', `${cur.custodian} → ${to}${location ? ` @ ${location}` : ''}`)
  return { ok: true, id }
}

export function addInwardScans(id: string, files: { name: string; size: number }[], kind: string) {
  const add = files.map((f) => fileOf(f, kind))
  daakStore.set((p) => ({
    ...p,
    inward: p.inward.map((r) => {
      if (r.id !== id) return r
      const docs = add.map((f) => ({ at: f.at, by: f.by, name: f.name, action: (r.scans.some((s) => s.name === f.name) ? 'Replaced' : 'Uploaded') as 'Replaced' | 'Uploaded' }))
      return { ...r, scans: [...r.scans.filter((s) => !add.some((f) => f.name === s.name)), ...add], trail: { ...r.trail, documents: [...r.trail.documents, ...docs] }, history: [...r.history, { at: nowIso(), by: actorName(), action: `${kind} uploaded`, note: add.map((f) => f.name).join(', ') }] }
    }),
  }))
}

export function setInwardTags(id: string, tags: string[]) {
  daakStore.set((p) => ({ ...p, inward: p.inward.map((r) => (r.id === id ? { ...r, tags, history: [...r.history, { at: nowIso(), by: actorName(), action: 'Tags updated', note: tags.join(', ') || '—' }] } : r)) }))
}

// ── Address master (§10.1) ────────────────────────────────────────────────
export function saveAddress(input: Omit<Address, 'id' | 'updatedAt' | 'history'> & { id?: string }, reason = ''): Result {
  if (!input.name.trim() || !input.line1.trim() || !input.city.trim() || !/^\d{6}$/.test(input.pin)) return { ok: false, error: 'Name, address line, city and a 6-digit PIN are required.' }
  const list = addressStore.get()
  const today = nowIso().slice(0, 10)
  if (input.id) {
    const cur = list.find((a) => a.id === input.id)
    if (!cur) return { ok: false, error: 'Address not found.' }
    // previous version kept in the address history; outward records keep their own frozen snapshot
    addressStore.set((p) => p.map((a) => (a.id === input.id ? { ...a, ...input, id: a.id, updatedAt: today, history: [...a.history, { at: nowIso(), by: actorName(), snapshot: `${addressSnapshot(a)}${reason ? ` — changed: ${reason}` : ''}` }] } : a)))
    logAudit('Address Master', input.id, 'Address updated', reason)
    return { ok: true, id: input.id }
  }
  const n = list.map((a) => Number(a.id.replace(/\D/g, ''))).reduce((a, b) => Math.max(a, b), 0) + 1
  const id = `ADR-${String(n).padStart(3, '0')}`
  addressStore.set((p) => [...p, { ...input, id, updatedAt: today, history: [] }])
  logAudit('Address Master', id, 'Address created', input.organization)
  return { ok: true, id }
}

// ── Outward actions ───────────────────────────────────────────────────────
export type OutwardInput = {
  dispatchDate: string
  recipientName: string
  addressId: string
  document: OutwardDak['document']
  copy?: { name: string; size: number }
  courierCompany: string
  awb: string
  charges: number
  paidBy: OutwardDak['paidBy']
  paymentProof?: { name: string; size: number }
  department: string
  costCentre: string
  inwardRef?: string
}

export function createOutward(input: OutwardInput): Result {
  const addr = addressStore.get().find((a) => a.id === input.addressId)
  if (!addr) return { ok: false, error: 'Pick a dispatch address from the Address Master.' }
  if (!input.recipientName.trim() || !input.document.name.trim() || !input.courierCompany || !input.dispatchDate) return { ok: false, error: 'Recipient, document, courier / postal company and dispatch date are required.' }
  if (input.courierCompany !== 'By Hand' && !input.awb.trim()) return { ok: false, error: 'AWB / tracking number is required for courier and postal dispatch.' }
  if (input.charges < 0) return { ok: false, error: 'Dispatch charges cannot be negative.' }
  const s = daakStore.get()
  const id = nextId('DAAK-OUT', s.outward.map((r) => r.id))
  const by = actorName()
  const copy = input.copy ? fileOf(input.copy, 'Document copy') : undefined
  const proof = input.paymentProof ? fileOf(input.paymentProof, 'Payment proof') : undefined
  const docs = [copy, proof].filter((f): f is DakFile => !!f).map((f) => ({ at: f.at, by: f.by, name: f.name, action: 'Uploaded' as const }))
  const rec: OutwardDak = {
    ...input, id, copy, paymentProof: proof, addressSnapshot: addressSnapshot(addr), deliveryStatus: 'Dispatched', dispatchedBy: by, approval: 'Pending',
    history: [{ at: nowIso(), by, action: 'Created', note: `${input.courierCompany}${input.awb ? ` · ${input.awb}` : ''}` }, { at: nowIso(), by, action: 'Dispatched', note: `To ${addr.organization}` }],
    trail: { ...newTrail(), submittedBy: by, submittedAt: nowIso(), documents: docs },
  }
  daakStore.set((p) => ({
    ...p,
    outward: [rec, ...p.outward],
    inward: input.inwardRef ? p.inward.map((r) => (r.id === input.inwardRef ? { ...r, status: 'Dispatched' as const, outwardRef: id, history: [...r.history, { at: nowIso(), by, action: 'Dispatched', note: `Sent out under ${id}` }] } : r)) : p.inward,
  }))
  logAudit('Postal & Courier', id, 'Outward dak created', `${addr.organization} · ${input.courierCompany} ${input.awb}`)
  emitWorkflow({ module: 'Postal & Courier', event: 'Submit', refId: id, vars: { Current_Status: 'Dispatched' }, nextAction: { title: `Approve outward dak ${id}`, ownerId: 'EMP-002' } })
  return { ok: true, id }
}

export function approveOutward(id: string): Result {
  const cur = daakStore.get().outward.find((r) => r.id === id)
  if (!cur) return { ok: false, error: 'Record not found.' }
  const by = actorName()
  if ([cur.trail.createdBy, cur.trail.submittedBy].includes(by)) return { ok: false, error: 'Maker-checker: you cannot approve a dispatch you created.' }
  daakStore.set((p) => ({ ...p, outward: p.outward.map((r) => (r.id === id ? { ...r, approval: 'Approved', trail: { ...r.trail, approvedBy: by, approvedAt: nowIso() }, history: [...r.history, { at: nowIso(), by, action: 'Approved' }] } : r)) }))
  emitWorkflow({ module: 'Postal & Courier', event: 'Approve', refId: id, vars: { Current_Status: 'Approved' } })
  return { ok: true, id }
}

export function setDeliveryStatus(id: string, status: DeliveryStatus, opts: { pod?: { name: string; size: number }; reason?: string } = {}): Result {
  const cur = daakStore.get().outward.find((r) => r.id === id)
  if (!cur) return { ok: false, error: 'Record not found.' }
  if (status === 'Delivered' && !opts.pod && !cur.pod) return { ok: false, error: 'Upload the proof of delivery (POD / acknowledgement) to mark Delivered.' }
  if (status === 'Returned' && !opts.reason?.trim()) return { ok: false, error: 'Return reason is required.' }
  const by = actorName()
  const pod = opts.pod ? fileOf(opts.pod, 'POD') : cur.pod
  daakStore.set((p) => ({
    ...p,
    outward: p.outward.map((r) =>
      r.id === id
        ? {
            ...r, deliveryStatus: status, pod, deliveredAt: status === 'Delivered' ? nowIso() : r.deliveredAt, returnReason: status === 'Returned' ? opts.reason : r.returnReason,
            trail: opts.pod ? { ...r.trail, documents: [...r.trail.documents, { at: nowIso(), by, name: opts.pod.name, action: r.pod ? 'Replaced' : 'Uploaded' }] } : r.trail,
            history: [...r.history, { at: nowIso(), by, action: status, note: status === 'Returned' ? opts.reason : opts.pod ? `POD ${opts.pod.name}` : undefined }],
          }
        : r,
    ),
  }))
  logAudit('Postal & Courier', id, `Delivery status → ${status}`)
  return { ok: true, id }
}

export function attachOutwardFile(id: string, slot: 'copy' | 'paymentProof', f: { name: string; size: number }) {
  const file = fileOf(f, slot === 'copy' ? 'Document copy' : 'Payment proof')
  daakStore.set((p) => ({
    ...p,
    outward: p.outward.map((r) => (r.id === id ? { ...r, [slot]: file, trail: { ...r.trail, documents: [...r.trail.documents, { at: file.at, by: file.by, name: file.name, action: r[slot] ? 'Replaced' : 'Uploaded' }] }, history: [...r.history, { at: file.at, by: file.by, action: `${file.kind} uploaded`, note: file.name }] } : r)),
  }))
}

/** §10.2 / UAT 18 — generate the HRMS expense / bill for a dispatch and link its reference back. */
export function createDakExpense(outwardId: string): Result {
  const s = daakStore.get()
  const o = s.outward.find((r) => r.id === outwardId)
  if (!o) return { ok: false, error: 'Outward record not found.' }
  if (o.expenseRef) return { ok: false, error: `Already linked to ${o.expenseRef}.` }
  if (!(o.charges > 0)) return { ok: false, error: 'Dispatch charges must be greater than zero to raise an expense.' }
  const ref = nextId('EXP-DAK', s.expenses.map((e) => e.ref))
  const by = actorName()
  const exp: DakExpense = {
    ref, outwardId, createdAt: nowIso(), date: o.dispatchDate, expenseHead: 'Courier & Postage', category: o.courierCompany === 'India Post' ? 'Speed Post' : 'Courier',
    amount: o.charges, paidByKind: o.paidBy.kind, paidBy: o.paidBy.name, department: o.department, costCentre: o.costCentre, billSubmittedBy: by,
    description: `${o.courierCompany} ${o.awb || ''} — ${o.document.name} to ${o.recipientName}`.trim(), receipt: o.paymentProof?.name, status: o.paidBy.kind === 'Employee' ? 'Pending Approval' : 'Submitted',
    history: [{ at: nowIso(), by, action: 'Expense created from Outward Dak', note: outwardId }],
  }
  daakStore.set((p) => ({ ...p, expenses: [exp, ...p.expenses], outward: p.outward.map((r) => (r.id === outwardId ? { ...r, expenseRef: ref, history: [...r.history, { at: nowIso(), by, action: 'HRMS expense linked', note: ref }] } : r)) }))
  logAudit('HRMS', ref, 'Courier expense generated', `${outwardId} · ₹${o.charges}`)
  emitWorkflow({ module: 'HRMS', event: 'Submit', refId: ref, vars: { Current_Status: exp.status }, nextAction: { title: `Process courier expense ${ref} (₹${o.charges})`, ownerId: 'EMP-008' } })
  return { ok: true, id: ref }
}

export function setExpenseStatus(ref: string, status: DakExpenseStatus) {
  daakStore.set((p) => ({ ...p, expenses: p.expenses.map((e) => (e.ref === ref ? { ...e, status, history: [...e.history, { at: nowIso(), by: actorName(), action: status }] } : e)) }))
  logAudit('HRMS', ref, `Courier expense → ${status}`)
}

export function searchInward(list: InwardDak[], q: string) {
  const t = q.trim().toLowerCase()
  if (!t) return list
  return list.filter((r) =>
    [r.id, r.docketNo, r.sender.name, r.sender.organization, r.description, r.documentType, r.register, r.rack, r.owner, r.department, r.custodian, r.mapping.legalRef, r.mapping.siteId, r.mapping.atmId, r.mapping.franchise, r.envelope.number, ...r.tags]
      .join(' ')
      .toLowerCase()
      .includes(t),
  )
}

// ── Backend API (VITE_API_URL set) ─────────────────────────────────────────
// In API mode `daakStore` (inward / outward / expenses) and the shared Address Master store are hydrated from
// /courier and every mutation goes to the backend. Cheques-in-custody have no backend yet and stay mock data.
type ApiDakFile = { fileId: string; name: string; kind: string; at: string; by: string }
type ApiInward = Omit<InwardDak, 'id' | 'scans' | 'mapping' | 'trail'> & { dakId: string; scans: ApiDakFile[]; mapping: { legalRef: string; siteId: string; atmId: string; frId: string }; createdBy?: string; createdAt?: string }
type ApiOutward = Omit<OutwardDak, 'id' | 'charges' | 'copy' | 'paymentProof' | 'pod' | 'trail' | 'expenseRef' | 'dispatchedBy'> & {
  dakId: string; chargesPaise: number; copy?: ApiDakFile; paymentProof?: ApiDakFile; pod?: ApiDakFile; dispatchedBy: string; dispatchedByName: string
  expense?: { ref?: string; status: 'Created' | 'Pending HRMS' | 'Not applicable'; amountPaise: number; at: string }; approvedBy?: string; approvedAt?: string; createdAt?: string
}
type ApiAddress = { addressId: string; name: string; organization: string; line1: string; city: string; state: string; pin: string; phone: string; tags: string[]; active: boolean; history?: { at: string; by: string; snapshot: string; reason?: string }[]; updatedAt?: string }
/** A file picked in the UI; `file` is uploaded via POST /files in API mode. */
export type DakUpload = { name: string; size: number; file?: File }

const dakFile = (f: ApiDakFile): DakFile => ({ name: f.name, size: 0, kind: f.kind, at: f.at, by: f.by })

export function inwardFromApi(d: ApiInward): InwardDak {
  const scans = (d.scans ?? []).map(dakFile)
  const first = d.history?.[0]
  return {
    id: d.dakId, receivedAt: d.receivedAt, mode: d.mode, courierCompany: d.courierCompany ?? '', docketNo: d.docketNo ?? '', sender: d.sender, envelope: d.envelope ?? { number: '', type: '', identification: '' },
    documentType: d.documentType ?? '', description: d.description ?? '', scans, receivedBy: d.receivedBy ?? '', department: d.department ?? '', owner: d.owner ?? '', rack: d.rack ?? '', register: d.register ?? '',
    mapping: { legalRef: d.mapping?.legalRef ?? '', siteId: d.mapping?.siteId ?? '', atmId: d.mapping?.atmId ?? '', franchise: d.mapping?.frId ?? '' }, tags: d.tags ?? [], status: d.status, custodian: d.custodian ?? '',
    outwardRef: d.outwardRef, history: d.history ?? [],
    trail: { createdBy: first?.by ?? '', createdAt: d.createdAt ?? d.receivedAt, submittedBy: first?.by, submittedAt: first?.at, modifications: [], taskRefs: [], documents: scans.map((s) => ({ at: s.at, by: s.by, name: s.name, action: 'Uploaded' as const })) },
  }
}

export function outwardFromApi(d: ApiOutward): OutwardDak {
  const approvedEv = [...(d.history ?? [])].reverse().find((h) => h.action === 'Approved')
  const files = [d.copy, d.paymentProof, d.pod].filter((f): f is ApiDakFile => !!f)
  return {
    id: d.dakId, dispatchDate: d.dispatchDate, recipientName: d.recipientName, addressId: d.addressId, addressSnapshot: d.addressSnapshot, document: d.document,
    copy: d.copy ? dakFile(d.copy) : undefined, courierCompany: d.courierCompany, awb: d.awb ?? '', charges: fromPaise(d.chargesPaise), paidBy: d.paidBy,
    paymentProof: d.paymentProof ? dakFile(d.paymentProof) : undefined, department: d.department ?? '', costCentre: d.costCentre ?? '', deliveryStatus: d.deliveryStatus,
    deliveredAt: d.deliveredAt, returnReason: d.returnReason, pod: d.pod ? dakFile(d.pod) : undefined, expenseRef: d.expense?.ref, inwardRef: d.inwardRef,
    dispatchedBy: d.dispatchedByName ?? d.dispatchedBy, approval: d.approval, history: d.history ?? [],
    trail: {
      createdBy: d.dispatchedByName ?? d.dispatchedBy, createdAt: d.createdAt ?? d.dispatchDate, submittedBy: d.dispatchedByName, approvedBy: approvedEv?.by ?? d.approvedBy, approvedAt: d.approvedAt,
      modifications: [], taskRefs: [], documents: files.map((f) => ({ at: f.at, by: f.by, name: f.name, action: 'Uploaded' as const })),
    },
    expenseStatus: d.expense?.status,
  }
}

/** API mode: HRMS expense links of courier charges, shown in the Linked Expenses tab (HRMS owns their approval). */
function expensesFromOutward(list: ApiOutward[]): DakExpense[] {
  return list
    .filter((o) => o.expense && o.expense.status !== 'Not applicable')
    .map((o) => ({
      ref: o.expense!.ref ?? `${o.dakId} (HRMS pending)`, outwardId: o.dakId, createdAt: o.expense!.at, date: o.dispatchDate, expenseHead: 'Courier & Postage', category: o.courierCompany === 'India Post' ? 'Speed Post' : 'Courier',
      amount: fromPaise(o.expense!.amountPaise), paidByKind: o.paidBy.kind, paidBy: o.paidBy.name, department: o.department, costCentre: o.costCentre, billSubmittedBy: o.dispatchedByName,
      description: `${o.courierCompany} ${o.awb || ''} — ${o.document.name} to ${o.recipientName}${o.expense!.status === 'Pending HRMS' ? ' · HRMS link pending' : ''}`.trim(), receipt: o.paymentProof?.name,
      status: (o.expense!.status === 'Created' ? 'Submitted' : 'Pending Approval') as DakExpenseStatus, history: [{ at: o.expense!.at, by: o.dispatchedByName, action: `HRMS expense: ${o.expense!.status}` }],
    }))
}

const addressFromApi = (a: ApiAddress): Address => ({
  id: a.addressId, name: a.name, organization: a.organization, line1: a.line1, city: a.city, state: a.state, pin: a.pin, phone: a.phone, tags: a.tags ?? [],
  updatedAt: (a.updatedAt ?? '').slice(0, 10), history: (a.history ?? []).map((h) => ({ at: h.at, by: h.by, snapshot: `${h.snapshot}${h.reason ? ` — ${h.reason}` : ''}` })),
})

let rawOutward: ApiOutward[] = []
/** Hydrates inward / outward / linked expenses and the Address Master from /courier (no-op in mock mode). */
export const daakLoader = createLoader('postal & courier', async () => {
  const [inward, outward, addresses] = await Promise.all([fetchAll<ApiInward>('/courier/inward'), fetchAll<ApiOutward>('/courier/outward'), fetchAll<ApiAddress>('/courier/addresses', { active: 'true' })])
  rawOutward = outward
  daakStore.set((p) => ({ ...p, inward: inward.map(inwardFromApi), outward: outward.map(outwardFromApi), expenses: expensesFromOutward(outward) }))
  addressStore.set(addresses.map(addressFromApi))
})
export const useDaakLoad = () => daakLoader.use()

async function upload(f: DakUpload | undefined | null, meta: UploadMeta): Promise<string | undefined> {
  if (!f?.file) return undefined
  return (await uploadFile(f.file, meta)).fileId
}
const putInward = (d: ApiInward) => {
  const rec = inwardFromApi(d)
  daakStore.set((p) => ({ ...p, inward: p.inward.some((r) => r.id === rec.id) ? p.inward.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...p.inward] }))
  return rec
}
const putOutward = (d: ApiOutward) => {
  rawOutward = [d, ...rawOutward.filter((o) => o.dakId !== d.dakId)]
  const rec = outwardFromApi(d)
  daakStore.set((p) => ({ ...p, outward: p.outward.some((r) => r.id === rec.id) ? p.outward.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...p.outward], expenses: expensesFromOutward(rawOutward) }))
  return rec
}
async function tryRes(fn: () => Promise<{ id: string }>): Promise<Result> {
  try {
    return { ok: true, id: (await fn()).id }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}
const IN = (id: string, a = '') => `/courier/inward/${encodeURIComponent(id)}${a ? `/${a}` : ''}`
const OUT = (id: string, a = '') => `/courier/outward/${encodeURIComponent(id)}${a ? `/${a}` : ''}`

export async function createInwardAsync(input: Omit<InwardInput, 'scans'> & { scans: (DakUpload & { kind: string })[] }): Promise<Result> {
  if (!apiEnabled) return createInward(input)
  if (!input.sender.name.trim() || !input.description.trim() || !input.receivedAt) return { ok: false, error: 'Sender, received date / time and document description are required.' }
  return tryRes(async () => {
    const ref = input.mapping.atmId || input.mapping.siteId
    const created = await httpPost<ApiInward>('/courier/inward', {
      receivedAt: input.receivedAt, mode: input.mode, courierCompany: input.courierCompany, docketNo: input.docketNo, sender: input.sender, envelope: input.envelope, documentType: input.documentType,
      description: input.description, receivedBy: input.receivedBy, department: input.department, owner: input.owner, rack: input.rack, register: input.register, tags: input.tags,
      mapping: { legalRef: input.mapping.legalRef, ...(input.mapping.atmId ? { atmId: input.mapping.atmId } : ref ? { siteId: ref } : {}) },
    })
    let last = created
    // scans go up per kind (Envelope / Document) so the kind is kept on the record
    const kinds = [...new Set(input.scans.filter((s) => s.file).map((s) => s.kind))]
    for (const kind of kinds) {
      const fileIds = (await Promise.all(input.scans.filter((s) => s.kind === kind).map((s) => upload(s, { entity: 'Dak', ref: created.dakId })))).filter((x): x is string => !!x)
      if (fileIds.length) last = await httpPost<ApiInward>(IN(created.dakId, 'scans'), { fileIds, kind })
    }
    return putInward(last)
  })
}

const INWARD_EDITABLE = ['receivedAt', 'mode', 'courierCompany', 'docketNo', 'sender', 'envelope', 'receivedBy', 'department', 'owner', 'rack', 'register', 'description', 'tags', 'documentType'] as const
/**
 * PATCH /courier/inward/:dakId (reason mandatory; not once Dispatched): receipt details (received at, mode, courier,
 * docket no. — required for Courier), sender, envelope, received by, routing, document type / description, tags and
 * the Site Master mapping (legal ref. + Site / ATM ID; the franchise follows the site).
 */
export async function updateInwardAsync(id: string, next: Partial<InwardDak>, reason: string): Promise<Result> {
  if (!apiEnabled) return updateInward(id, next, reason)
  if (reason.trim().length < 3) return { ok: false, error: 'A modification reason is mandatory.' }
  const cur = daakStore.get().inward.find((r) => r.id === id)
  if (!cur) return { ok: false, error: 'Record not found.' }
  const a = flat(cur)
  const b = flat({ ...cur, ...next })
  const changed = Object.keys(b).filter((k) => a[k] !== b[k])
  if (!changed.length) return { ok: false, error: 'Nothing changed.' }
  if (changed.length === 1 && changed[0] === 'Franchise') return { ok: false, error: 'The franchise follows the mapped Site / ATM — change the Site or ATM ID instead.' }
  const merged = { ...cur, ...next }
  if (merged.mode === 'Courier' && !merged.docketNo?.trim()) return { ok: false, error: 'Docket no. is required for Courier.' }
  const body: Record<string, unknown> = { reason: reason.trim() }
  for (const k of INWARD_EDITABLE) if (next[k] !== undefined && JSON.stringify(next[k]) !== JSON.stringify(cur[k])) body[k] = next[k]
  if (next.mapping && JSON.stringify({ ...next.mapping, franchise: '' }) !== JSON.stringify({ ...cur.mapping, franchise: '' })) {
    const m = next.mapping
    body.mapping = { legalRef: m.legalRef ?? '', ...(m.atmId ? { atmId: m.atmId } : {}), ...(m.siteId ? { siteId: m.siteId } : {}) }
  }
  return tryRes(async () => putInward(await httpPatch<ApiInward>(IN(id), body)))
}
export const setInwardStatusAsync = (id: string, status: InwardStatus, note?: string): Promise<Result> =>
  apiEnabled ? tryRes(async () => putInward(await httpPost<ApiInward>(IN(id, 'status'), { status, ...(note ? { note } : {}) }))) : Promise.resolve(setInwardStatus(id, status, note))
export const transferCustodyAsync = (id: string, to: string, location: string, note: string): Promise<Result> => {
  if (!apiEnabled) return Promise.resolve(transferCustody(id, to, location, note))
  if (!to.trim()) return Promise.resolve({ ok: false, error: 'Select who receives custody.' })
  return tryRes(async () => putInward(await httpPost<ApiInward>(IN(id, 'custody'), { to, location, note: note.trim().length >= 3 ? note.trim() : `Custody hand-over to ${to}` })))
}
export async function addInwardScansAsync(id: string, files: DakUpload[], kind: string): Promise<Result> {
  if (!apiEnabled) {
    addInwardScans(id, files, kind)
    return { ok: true, id }
  }
  return tryRes(async () => {
    const fileIds = (await Promise.all(files.map((f) => upload(f, { entity: 'Dak', ref: id })))).filter((x): x is string => !!x)
    if (!fileIds.length) throw new Error('No file to upload')
    return putInward(await httpPost<ApiInward>(IN(id, 'scans'), { fileIds, kind }))
  })
}
export async function setInwardTagsAsync(id: string, tags: string[]): Promise<Result> {
  if (!apiEnabled) {
    setInwardTags(id, tags)
    return { ok: true, id }
  }
  return tryRes(async () => putInward(await httpPatch<ApiInward>(IN(id), { tags, reason: 'Tags updated' })))
}

export async function saveAddressAsync(input: Omit<Address, 'id' | 'updatedAt' | 'history'> & { id?: string }, reason = ''): Promise<Result> {
  if (!apiEnabled) return saveAddress(input, reason)
  if (!input.name.trim() || !input.line1.trim() || !input.city.trim() || !/^\d{6}$/.test(input.pin)) return { ok: false, error: 'Name, address line, city and a 6-digit PIN are required.' }
  const body = { name: input.name, organization: input.organization, line1: input.line1, city: input.city, state: input.state, pin: input.pin, phone: input.phone, tags: input.tags }
  return tryRes(async () => {
    const a = input.id
      ? await httpPatch<ApiAddress>(`/courier/addresses/${encodeURIComponent(input.id)}`, { ...body, reason: reason.trim().length >= 3 ? reason.trim() : 'Address updated' })
      : await httpPost<ApiAddress>('/courier/addresses', body)
    const rec = addressFromApi(a)
    addressStore.set((p) => (p.some((x) => x.id === rec.id) ? p.map((x) => (x.id === rec.id ? rec : x)) : [...p, rec]))
    return rec
  })
}

export async function createOutwardAsync(input: Omit<OutwardInput, 'copy' | 'paymentProof'> & { copy?: DakUpload; paymentProof?: DakUpload }): Promise<Result> {
  if (!apiEnabled) return createOutward(input)
  if (!input.recipientName.trim() || !input.document.name.trim() || !input.courierCompany || !input.dispatchDate) return { ok: false, error: 'Recipient, document, courier / postal company and dispatch date are required.' }
  return tryRes(async () => {
    const copyFileId = await upload(input.copy, { entity: 'Dak' })
    const paymentProofFileId = await upload(input.paymentProof, { entity: 'Dak' })
    const o = await httpPost<ApiOutward>('/courier/outward', {
      dispatchDate: input.dispatchDate, recipientName: input.recipientName, addressId: input.addressId, document: input.document, courierCompany: input.courierCompany, awb: input.awb,
      chargesPaise: toPaise(input.charges), paidBy: input.paidBy, department: input.department, costCentre: input.costCentre,
      ...(copyFileId ? { copyFileId } : {}), ...(paymentProofFileId ? { paymentProofFileId } : {}), ...(input.inwardRef ? { inwardRef: input.inwardRef } : {}),
    })
    if (input.inwardRef) await daakLoader.reload() // the linked inward dak is now Dispatched
    return putOutward(o)
  })
}
export const approveOutwardAsync = (id: string): Promise<Result> => (apiEnabled ? tryRes(async () => putOutward(await httpPost<ApiOutward>(OUT(id, 'approve')))) : Promise.resolve(approveOutward(id)))
export async function setDeliveryStatusAsync(id: string, status: DeliveryStatus, opts: { pod?: DakUpload; reason?: string } = {}): Promise<Result> {
  if (!apiEnabled) return setDeliveryStatus(id, status, opts)
  if (status === 'Dispatched') return { ok: false, error: 'Already dispatched.' }
  return tryRes(async () => {
    const podFileId = await upload(opts.pod, { entity: 'Dak', ref: id })
    return putOutward(await httpPost<ApiOutward>(OUT(id, 'delivery'), { status, ...(podFileId ? { podFileId } : {}), ...(opts.reason ? { reason: opts.reason } : {}) }))
  })
}
/** Attach / replace the document copy or payment proof after dispatch. API: upload (owner Dak) → POST /courier/outward/:dakId/attachments. */
export async function attachOutwardFileAsync(id: string, slot: 'copy' | 'paymentProof', f: DakUpload, note?: string): Promise<Result> {
  if (!apiEnabled) {
    attachOutwardFile(id, slot, f)
    return { ok: true, id }
  }
  if (!f?.file) return { ok: false, error: 'Choose the file again — the selected file is no longer available for upload.' }
  return tryRes(async () => {
    const fileId = await upload(f, { purpose: slot === 'copy' ? 'courier-copy' : 'courier-payment-proof', entity: 'Dak', ref: id })
    return putOutward(await httpPost<ApiOutward>(OUT(id, 'attachments'), { [slot === 'copy' ? 'copyFileId' : 'paymentProofFileId']: fileId, ...(note?.trim() ? { note: note.trim() } : {}) }))
  })
}
/** Mock: creates the HRMS expense here. API: asks the server to (re)try the HRMS expense link. */
export const createDakExpenseAsync = (outwardId: string): Promise<Result> =>
  apiEnabled ? tryRes(async () => ({ id: putOutward(await httpPost<ApiOutward>(OUT(outwardId, 'expense'))).expenseRef ?? 'Pending HRMS' })) : Promise.resolve(createDakExpense(outwardId))
