import { createStore } from '@/lib/store'

export type DakDirection = 'Incoming' | 'Outgoing'

export type CourierService =
  | 'BlueDart'
  | 'DTDC'
  | 'Speed Post'
  | 'Trackon'
  | 'Professional Couriers'
  | 'Hand Delivery'

export type DakStatus =
  | 'Received'
  | 'Dispatched'
  | 'Handed Over'
  | 'In Transit'
  | 'Pending Review'
  | 'Discrepancy'
  | 'Closed'

export type DocumentCategory =
  | 'Security Cheque'
  | 'Franchise Agreement (Stamp Paper)'
  | 'KYC Dossier (PAN, Aadhaar, Bank Details)'
  | 'NOC & Bank Solvency Certificate'
  | 'Affidavit & Indemnity Bond'
  | 'ATM Key Handover Memo'
  | 'Cash Loading Register physical copy'
  | 'Welcome Kit & ATM Dongle'
  | 'Termination & Legal Notice'
  | 'Other Commercial Papers'

export interface DakDocumentItem {
  id: string
  category: DocumentCategory
  description: string
  count: number
  chequeIncluded: boolean
  linkedChequeIds?: string[]
  notes?: string
}

export interface LinkedChequeRef {
  chequeId: string
  chequeNumber: string
  bankName: string
  amount: number
  partyName: string
  franchiseeId?: string
  linkType: 'CONTAINS' | 'REPLACEMENT_FOR' | 'SUPPORTING_DOC'
  linkedAt: string
}

export interface PodAttachment {
  name: string
  sizeKb: number
  type: string
  uploadedAt: string
  previewUrl?: string
}

export interface CustodianHandover {
  handedOverTo: string
  handoverDate: string
  verifiedBy: string
  vaultLocation: string
  status: 'Handed Over' | 'Pending Handover' | 'Vault Locked'
}

export interface DakRecord {
  id: string
  sn: number
  direction: DakDirection
  date: string
  time: string
  branch: string
  partyName: string
  senderRecipientAddress: string
  senderRecipientPhone: string
  senderRecipientEmail: string
  internalDepartment: string
  handledByStaff: string
  docketNumber: string
  courierType: CourierService
  status: DakStatus
  documents: DakDocumentItem[]
  chequeCount: number
  hasCheques: boolean
  isLinked: boolean
  linkedCheques: LinkedChequeRef[]
  podAttachment?: PodAttachment
  envelopeAttachment?: PodAttachment
  discrepancyNote?: string
  custodianHandover?: CustodianHandover
  remarks?: string
  createdAt: string
  updatedAt: string
}

export interface ChequeRecord {
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
  courier: CourierService
  receivedDate: string
  linkType: 'CONTAINS' | 'REPLACEMENT_FOR' | 'SUPPORTING_DOC'
  podAttachmentName?: string
  envelopeAttachmentName?: string
  notes?: string
}

export interface BranchMetric {
  branchName: string
  inwardToday: number
  outwardToday: number
  chequesReceived: number
  discrepancies: number
  pendingHandover: number
  avgTurnaround: string
  health: 'Optimal' | 'Warning' | 'Action Needed'
}

export interface DaakState {
  records: DakRecord[]
  cheques: ChequeRecord[]
  branches: BranchMetric[]
}

const SEED_BRANCHES: BranchMetric[] = [
  {
    branchName: 'Delhi Central Hub',
    inwardToday: 38,
    outwardToday: 24,
    chequesReceived: 18,
    discrepancies: 1,
    pendingHandover: 3,
    avgTurnaround: '1.8 hrs',
    health: 'Optimal',
  },
  {
    branchName: 'Agra Zonal Office',
    inwardToday: 29,
    outwardToday: 19,
    chequesReceived: 14,
    discrepancies: 2,
    pendingHandover: 4,
    avgTurnaround: '2.4 hrs',
    health: 'Warning',
  },
  {
    branchName: 'Jaipur Regional Office',
    inwardToday: 22,
    outwardToday: 16,
    chequesReceived: 11,
    discrepancies: 0,
    pendingHandover: 1,
    avgTurnaround: '1.5 hrs',
    health: 'Optimal',
  },
  {
    branchName: 'Mumbai Headquarters (BKC)',
    inwardToday: 45,
    outwardToday: 32,
    chequesReceived: 27,
    discrepancies: 2,
    pendingHandover: 2,
    avgTurnaround: '1.2 hrs',
    health: 'Optimal',
  },
  {
    branchName: 'Lucknow Operations Hub',
    inwardToday: 18,
    outwardToday: 12,
    chequesReceived: 8,
    discrepancies: 1,
    pendingHandover: 3,
    avgTurnaround: '3.1 hrs',
    health: 'Warning',
  },
  {
    branchName: 'Patna Regional Office',
    inwardToday: 14,
    outwardToday: 9,
    chequesReceived: 6,
    discrepancies: 1,
    pendingHandover: 1,
    avgTurnaround: '2.0 hrs',
    health: 'Optimal',
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

const SEED_DAK_RECORDS: DakRecord[] = [
  {
    id: 'DAAK-IN-2026-0142',
    sn: 1,
    direction: 'Incoming',
    date: '2026-10-24',
    time: '11:30 AM',
    branch: 'Agra Zonal Office',
    partyName: 'Ranjeet Pal & Shikha Pal',
    senderRecipientAddress: 'Station Road, Near Tehsil Gate, Mainpuri, UP - 205001',
    senderRecipientPhone: '+91 81268 17131',
    senderRecipientEmail: 'ranjeetpal.mainpuri@gmail.com',
    internalDepartment: 'Cheque Clearing Team',
    handledByStaff: 'Pooja Verma',
    docketNumber: 'BD-884910281',
    courierType: 'BlueDart',
    status: 'Handed Over',
    documents: [
      {
        id: 'doc-1',
        category: 'Security Cheque',
        description: '2 Post-Dated Security Cheques (HDFC 482019 & 482020)',
        count: 2,
        chequeIncluded: true,
        linkedChequeIds: ['CHQ-2026-0814', 'CHQ-2026-0815'],
        notes: 'Handover complete to vault manager.',
      },
      {
        id: 'doc-2',
        category: 'Franchise Agreement (Stamp Paper)',
        description: 'Original Rs 500 Stamp Paper Tripartite Franchise Agreement',
        count: 1,
        chequeIncluded: false,
        notes: 'Forwarded to Legal team for franking record.',
      },
      {
        id: 'doc-3',
        category: 'KYC Dossier (PAN, Aadhaar, Bank Details)',
        description: 'Self-attested PAN, Aadhaar and cancelled cheque copies',
        count: 4,
        chequeIncluded: false,
      },
    ],
    chequeCount: 2,
    hasCheques: true,
    isLinked: true,
    linkedCheques: [
      {
        chequeId: 'CHQ-2026-0814',
        chequeNumber: '482019',
        bankName: 'HDFC Bank',
        amount: 500000,
        partyName: 'Ranjeet Pal & Shikha Pal',
        franchiseeId: 'DX-UP-02391',
        linkType: 'CONTAINS',
        linkedAt: '2026-10-24 14:15',
      },
      {
        chequeId: 'CHQ-2026-0815',
        chequeNumber: '482020',
        bankName: 'HDFC Bank',
        amount: 250000,
        partyName: 'Ranjeet Pal & Shikha Pal',
        franchiseeId: 'DX-UP-02391',
        linkType: 'CONTAINS',
        linkedAt: '2026-10-24 14:15',
      },
    ],
    podAttachment: {
      name: 'POD_BD_884910281.pdf',
      sizeKb: 342,
      type: 'application/pdf',
      uploadedAt: '2026-10-24 11:35',
    },
    envelopeAttachment: {
      name: 'Envelope_Scan_0142.jpg',
      sizeKb: 618,
      type: 'image/jpeg',
      uploadedAt: '2026-10-24 11:35',
    },
    custodianHandover: {
      handedOverTo: 'Amit Sharma (Vault Manager - Mumbai HQ)',
      handoverDate: '2026-10-24 15:30',
      verifiedBy: 'Pooja Verma',
      vaultLocation: 'Locker B-14, Fireproof Safe 2',
      status: 'Vault Locked',
    },
    remarks: 'Envelope received in sealed condition without tamper marks.',
    createdAt: '2026-10-24T11:30:00Z',
    updatedAt: '2026-10-24T15:30:00Z',
  },
  {
    id: 'DAAK-OUT-2026-0089',
    sn: 2,
    direction: 'Outgoing',
    date: '2026-10-25',
    time: '04:15 PM',
    branch: 'Delhi Central Hub',
    partyName: 'Bhavin Patel (Apex ATM Ventures)',
    senderRecipientAddress: 'Plot 42, GIDC Phase 2, Ring Road, Surat, Gujarat - 395002',
    senderRecipientPhone: '+91 98250 99887',
    senderRecipientEmail: 'bhavin.patel@apexatm.in',
    internalDepartment: 'ATM Operations & Logistics',
    handledByStaff: 'Sunil Sharma',
    docketNumber: 'BD-991204821',
    courierType: 'BlueDart',
    status: 'In Transit',
    documents: [
      {
        id: 'doc-4',
        category: 'Welcome Kit & ATM Dongle',
        description: 'Secure VPN USB Dongle, Quick Ops Manual, Station ID Card',
        count: 1,
        chequeIncluded: false,
      },
      {
        id: 'doc-5',
        category: 'Franchise Agreement (Stamp Paper)',
        description: 'Countersigned Dexter India Ltd Master Franchise Agreement copy',
        count: 1,
        chequeIncluded: false,
      },
    ],
    chequeCount: 0,
    hasCheques: false,
    isLinked: false,
    linkedCheques: [],
    podAttachment: {
      name: 'BlueDart_Dispatch_0089.pdf',
      sizeKb: 215,
      type: 'application/pdf',
      uploadedAt: '2026-10-25 16:30',
    },
    remarks: 'Dispatched via Priority Air Cargo with insured seal.',
    createdAt: '2026-10-25T16:15:00Z',
    updatedAt: '2026-10-25T16:30:00Z',
  },
  {
    id: 'DAAK-IN-2026-0149',
    sn: 3,
    direction: 'Incoming',
    date: '2026-10-26',
    time: '10:15 AM',
    branch: 'Delhi Central Hub',
    partyName: 'Vinod Mehra & Sons',
    senderRecipientAddress: 'Shop 12, Sanjay Place, Agra, UP - 282002',
    senderRecipientPhone: '+91 94120 44820',
    senderRecipientEmail: 'vinod.mehra@agra.com',
    internalDepartment: 'Cheque Clearing Team',
    handledByStaff: 'Pooja Verma',
    docketNumber: 'TC-9912048',
    courierType: 'Trackon',
    status: 'Discrepancy',
    documents: [
      {
        id: 'doc-6',
        category: 'Security Cheque',
        description: 'Bank of Baroda Cheque 665120',
        count: 1,
        chequeIncluded: true,
        linkedChequeIds: ['CHQ-2026-0845'],
        notes: 'Discrepancy on amount mismatch.',
      },
      {
        id: 'doc-7',
        category: 'Franchise Agreement (Stamp Paper)',
        description: 'Franchise Addendum stating Rs. 5 Lakhs Security Deposit',
        count: 1,
        chequeIncluded: false,
      },
    ],
    chequeCount: 1,
    hasCheques: true,
    isLinked: true,
    linkedCheques: [
      {
        chequeId: 'CHQ-2026-0845',
        chequeNumber: '665120',
        bankName: 'Bank of Baroda',
        amount: 300000,
        partyName: 'Vinod Mehra & Sons',
        franchiseeId: 'DX-UP-01934',
        linkType: 'CONTAINS',
        linkedAt: '2026-10-26 12:00',
      },
    ],
    podAttachment: {
      name: 'Trackon_POD_9912048.pdf',
      sizeKb: 180,
      type: 'application/pdf',
      uploadedAt: '2026-10-26 10:25',
    },
    envelopeAttachment: {
      name: 'Envelope_Vinod.jpg',
      sizeKb: 490,
      type: 'image/jpeg',
      uploadedAt: '2026-10-26 10:25',
    },
    discrepancyNote:
      'Declared Cheque Amount was Rs. 5,00,000, but physical Cheque #665120 is drawn for Rs. 3,00,000. Franchisor notified.',
    remarks: 'Placed under Discrepancy Hold pending franchisee clarification.',
    createdAt: '2026-10-26T10:15:00Z',
    updatedAt: '2026-10-26T12:00:00Z',
  },
  {
    id: 'DAAK-IN-2026-0155',
    sn: 4,
    direction: 'Incoming',
    date: '2026-10-28',
    time: '02:45 PM',
    branch: 'Mumbai Headquarters (BKC)',
    partyName: 'Rameshwar Kulkarni',
    senderRecipientAddress: 'Flat 402, Shiv Sadan, Model Colony, Pune - 411016',
    senderRecipientPhone: '+91 98220 41765',
    senderRecipientEmail: 'rameshwar.kulkarni@pune.in',
    internalDepartment: 'Cheque Clearing Team',
    handledByStaff: 'Amit Sharma',
    docketNumber: 'DTDC-7721903',
    courierType: 'DTDC',
    status: 'Pending Review',
    documents: [
      {
        id: 'doc-8',
        category: 'Security Cheque',
        description: 'ICICI Bank Security Cheque #739201',
        count: 1,
        chequeIncluded: true,
        linkedChequeIds: ['CHQ-2026-0830'],
      },
      {
        id: 'doc-9',
        category: 'NOC & Bank Solvency Certificate',
        description: 'Bank of Maharashtra Solvency Certificate original',
        count: 1,
        chequeIncluded: false,
      },
    ],
    chequeCount: 1,
    hasCheques: true,
    isLinked: true,
    linkedCheques: [
      {
        chequeId: 'CHQ-2026-0830',
        chequeNumber: '739201',
        bankName: 'ICICI Bank',
        amount: 500000,
        partyName: 'Rameshwar Kulkarni',
        franchiseeId: 'DX-MH-01482',
        linkType: 'CONTAINS',
        linkedAt: '2026-10-28 15:30',
      },
    ],
    podAttachment: {
      name: 'DTDC_Slip_7721903.pdf',
      sizeKb: 295,
      type: 'application/pdf',
      uploadedAt: '2026-10-28 14:50',
    },
    custodianHandover: {
      handedOverTo: 'Amit Sharma (Vault Manager - Mumbai HQ)',
      handoverDate: '2026-10-28 16:00',
      verifiedBy: 'Sunil Sharma',
      vaultLocation: 'Transit Inspection Safe',
      status: 'Pending Handover',
    },
    remarks: 'Awaiting signature verification from ICICI Nodal Desk.',
    createdAt: '2026-10-28T14:45:00Z',
    updatedAt: '2026-10-28T16:00:00Z',
  },
  {
    id: 'DAAK-IN-2026-0160',
    sn: 5,
    direction: 'Incoming',
    date: '2026-10-29',
    time: '12:05 PM',
    branch: 'Jaipur Regional Office',
    partyName: 'Marwar Financial Services (Pawan Sharma)',
    senderRecipientAddress: 'Shop 18, MI Road, Jaipur, Rajasthan - 302001',
    senderRecipientPhone: '+91 97840 21900',
    senderRecipientEmail: 'pawan.marwar@jaipur.com',
    internalDepartment: 'Legal & Compliance',
    handledByStaff: 'Deepak Joshi',
    docketNumber: 'SP-RJ4419208',
    courierType: 'Speed Post',
    status: 'Received',
    documents: [
      {
        id: 'doc-10',
        category: 'Affidavit & Indemnity Bond',
        description: 'Notarized Indemnity Bond on Rs 100 Non-Judicial stamp',
        count: 1,
        chequeIncluded: false,
      },
      {
        id: 'doc-11',
        category: 'NOC & Bank Solvency Certificate',
        description: 'NOC from landlord for ATM shop installation',
        count: 2,
        chequeIncluded: false,
      },
    ],
    chequeCount: 0,
    hasCheques: false,
    isLinked: false,
    linkedCheques: [],
    podAttachment: {
      name: 'SpeedPost_RJ_4419208.pdf',
      sizeKb: 210,
      type: 'application/pdf',
      uploadedAt: '2026-10-29 12:15',
    },
    remarks: 'All documents in order, forwarded to Legal Desk.',
    createdAt: '2026-10-29T12:05:00Z',
    updatedAt: '2026-10-29T12:15:00Z',
  },
  {
    id: 'DAAK-OUT-2026-0095',
    sn: 6,
    direction: 'Outgoing',
    date: '2026-10-30',
    time: '03:30 PM',
    branch: 'Agra Zonal Office',
    partyName: 'Hitachi Payment Services Pvt Ltd',
    senderRecipientAddress: 'Hitachi Towers, Plot 21, Sector 18, Gurugram, Haryana - 122015',
    senderRecipientPhone: '+91 124 4920100',
    senderRecipientEmail: 'operations.cbr@hitachi-payments.com',
    internalDepartment: 'ATM Operations & Logistics',
    handledByStaff: 'Sunil Sharma',
    docketNumber: 'BD-883921004',
    courierType: 'BlueDart',
    status: 'Dispatched',
    documents: [
      {
        id: 'doc-12',
        category: 'ATM Key Handover Memo',
        description: 'Dual-Custody ATM Combinations & Electronic Lock Audit logs',
        count: 3,
        chequeIncluded: false,
      },
      {
        id: 'doc-13',
        category: 'Cash Loading Register physical copy',
        description: 'Monthly physical CBR register audit printouts for North Zone',
        count: 4,
        chequeIncluded: false,
      },
    ],
    chequeCount: 0,
    hasCheques: false,
    isLinked: false,
    linkedCheques: [],
    podAttachment: {
      name: 'BD_Docket_883921004.pdf',
      sizeKb: 195,
      type: 'application/pdf',
      uploadedAt: '2026-10-30 15:45',
    },
    remarks: 'High-security tamper-evident bag barcode: SE-8841029.',
    createdAt: '2026-10-30T15:30:00Z',
    updatedAt: '2026-10-30T15:45:00Z',
  },
  {
    id: 'DAAK-IN-2026-0168',
    sn: 7,
    direction: 'Incoming',
    date: '2026-11-01',
    time: '09:45 AM',
    branch: 'Lucknow Operations Hub',
    partyName: 'Awadh Cash Management (Surya Pratap Singh)',
    senderRecipientAddress: 'Civil Lines, Hazratganj, Lucknow, UP - 226001',
    senderRecipientPhone: '+91 94500 11920',
    senderRecipientEmail: 'surya.awadh@lucknow.com',
    internalDepartment: 'Cheque Clearing Team',
    handledByStaff: 'Vikas Mishra',
    docketNumber: 'HD-LKO-0412',
    courierType: 'Hand Delivery',
    status: 'Received',
    documents: [
      {
        id: 'doc-14',
        category: 'Security Cheque',
        description: 'Punjab National Bank Cheque #339182 for Rs 5,00,000',
        count: 1,
        chequeIncluded: true,
        notes: 'Hand delivered in person by CRA field manager.',
      },
    ],
    chequeCount: 1,
    hasCheques: true,
    isLinked: false,
    linkedCheques: [],
    envelopeAttachment: {
      name: 'Handover_Memo_LKO.jpg',
      sizeKb: 520,
      type: 'image/jpeg',
      uploadedAt: '2026-11-01 09:50',
    },
    remarks: 'Inward recorded. Cheque needs FFM linking and vault booking.',
    createdAt: '2026-11-01T09:45:00Z',
    updatedAt: '2026-11-01T09:45:00Z',
  },
]

export const daakStore = createStore<DaakState>('dexter_daak_store_v1', () => ({
  records: SEED_DAK_RECORDS,
  cheques: SEED_CHEQUES,
  branches: SEED_BRANCHES,
}))

export function useDaakState() {
  return daakStore.use()
}

export function addIncomingDak(data: {
  branch: string
  partyName: string
  senderAddress: string
  senderPhone: string
  senderEmail: string
  internalDepartment: string
  handledByStaff: string
  docketNumber: string
  courierType: CourierService
  documents: Omit<DakDocumentItem, 'id'>[]
  podAttachment?: PodAttachment
  envelopeAttachment?: PodAttachment
  remarks?: string
}): DakRecord {
  const current = daakStore.get()
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const newSn = current.records.length + 1
  const idStr = `DAAK-IN-2026-${String(newSn + 140).padStart(4, '0')}`

  const docItems: DakDocumentItem[] = data.documents.map((d, idx) => ({
    ...d,
    id: `doc-${Date.now()}-${idx}`,
  }))

  const chequeCount = docItems.reduce((acc, it) => (it.chequeIncluded ? acc + it.count : acc), 0)
  const hasCheques = chequeCount > 0

  const newRecord: DakRecord = {
    id: idStr,
    sn: newSn,
    direction: 'Incoming',
    date: dateStr,
    time: timeStr,
    branch: data.branch,
    partyName: data.partyName,
    senderRecipientAddress: data.senderAddress,
    senderRecipientPhone: data.senderPhone,
    senderRecipientEmail: data.senderEmail,
    internalDepartment: data.internalDepartment,
    handledByStaff: data.handledByStaff,
    docketNumber: data.docketNumber,
    courierType: data.courierType,
    status: 'Received',
    documents: docItems,
    chequeCount,
    hasCheques,
    isLinked: false,
    linkedCheques: [],
    podAttachment: data.podAttachment,
    envelopeAttachment: data.envelopeAttachment,
    remarks: data.remarks,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  daakStore.set((prev) => ({
    ...prev,
    records: [newRecord, ...prev.records],
  }))

  return newRecord
}

export function addOutgoingDak(data: {
  branch: string
  recipientName: string
  recipientAddress: string
  recipientPhone: string
  recipientEmail: string
  internalDepartment: string
  handledByStaff: string
  docketNumber: string
  courierType: CourierService
  documents: Omit<DakDocumentItem, 'id' | 'chequeIncluded'>[]
  podAttachment?: PodAttachment
  remarks?: string
}): DakRecord {
  const current = daakStore.get()
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const newSn = current.records.length + 1
  const idStr = `DAAK-OUT-2026-${String(newSn + 90).padStart(4, '0')}`

  const docItems: DakDocumentItem[] = data.documents.map((d, idx) => ({
    ...d,
    id: `doc-${Date.now()}-${idx}`,
    chequeIncluded: false,
  }))

  const newRecord: DakRecord = {
    id: idStr,
    sn: newSn,
    direction: 'Outgoing',
    date: dateStr,
    time: timeStr,
    branch: data.branch,
    partyName: data.recipientName,
    senderRecipientAddress: data.recipientAddress,
    senderRecipientPhone: data.recipientPhone,
    senderRecipientEmail: data.recipientEmail,
    internalDepartment: data.internalDepartment,
    handledByStaff: data.handledByStaff,
    docketNumber: data.docketNumber,
    courierType: data.courierType,
    status: 'Dispatched',
    documents: docItems,
    chequeCount: 0,
    hasCheques: false,
    isLinked: false,
    linkedCheques: [],
    podAttachment: data.podAttachment,
    remarks: data.remarks,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  daakStore.set((prev) => ({
    ...prev,
    records: [newRecord, ...prev.records],
  }))

  return newRecord
}

export function linkChequeToDak(
  dakId: string,
  chequeData: {
    chequeNumber: string
    bankName: string
    branchName?: string
    amount: number
    partyName: string
    franchiseeId?: string
    atmId?: string
    chequeDate?: string
    accountNumber?: string
    ifscCode?: string
    linkType: 'CONTAINS' | 'REPLACEMENT_FOR' | 'SUPPORTING_DOC'
    custodian: string
    vaultLocation: string
    notes?: string
  }
): { dak: DakRecord; cheque: ChequeRecord } {
  const current = daakStore.get()
  const targetDak = current.records.find((r) => r.id === dakId)
  if (!targetDak) throw new Error(`Dak with ID ${dakId} not found`)

  const newChequeId = `CHQ-2026-${String(Math.floor(Math.random() * 800) + 100).padStart(4, '0')}`
  const now = new Date()

  const newCheque: ChequeRecord = {
    chequeId: newChequeId,
    chequeNumber: chequeData.chequeNumber,
    bankName: chequeData.bankName,
    branchName: chequeData.branchName || 'Central Branch',
    partyName: chequeData.partyName,
    franchiseeId: chequeData.franchiseeId || 'DX-GEN-001',
    atmId: chequeData.atmId || 'ATM-GEN-01',
    amount: chequeData.amount,
    chequeDate: chequeData.chequeDate || now.toISOString().split('T')[0],
    accountNumber: chequeData.accountNumber || 'XXXXXXXXXX',
    ifscCode: chequeData.ifscCode || 'IFSC0000001',
    verificationStatus: 'Verified',
    custodian: chequeData.custodian,
    vaultLocation: chequeData.vaultLocation,
    originatingDakId: targetDak.id,
    originatingDocket: targetDak.docketNumber,
    courier: targetDak.courierType,
    receivedDate: targetDak.date,
    linkType: chequeData.linkType,
    podAttachmentName: targetDak.podAttachment?.name,
    envelopeAttachmentName: targetDak.envelopeAttachment?.name,
    notes: chequeData.notes,
  }

  const linkedRef: LinkedChequeRef = {
    chequeId: newChequeId,
    chequeNumber: chequeData.chequeNumber,
    bankName: chequeData.bankName,
    amount: chequeData.amount,
    partyName: chequeData.partyName,
    franchiseeId: chequeData.franchiseeId,
    linkType: chequeData.linkType,
    linkedAt: now.toISOString().replace('T', ' ').slice(0, 16),
  }

  const updatedRecords = current.records.map((r) => {
    if (r.id !== dakId) return r
    return {
      ...r,
      isLinked: true,
      hasCheques: true,
      chequeCount: Math.max(r.chequeCount, r.linkedCheques.length + 1),
      linkedCheques: [...r.linkedCheques, linkedRef],
      updatedAt: now.toISOString(),
    }
  })

  daakStore.set({
    ...current,
    records: updatedRecords,
    cheques: [newCheque, ...current.cheques],
  })

  const updatedDak = updatedRecords.find((r) => r.id === dakId)!
  return { dak: updatedDak, cheque: newCheque }
}

export function updateDakStatus(dakId: string, status: DakStatus, discrepancyNote?: string) {
  daakStore.set((prev) => ({
    ...prev,
    records: prev.records.map((r) =>
      r.id === dakId
        ? {
            ...r,
            status,
            discrepancyNote: discrepancyNote ?? r.discrepancyNote,
            updatedAt: new Date().toISOString(),
          }
        : r
    ),
  }))
}

