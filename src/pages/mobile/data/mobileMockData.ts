export interface MobileUser {
  id: string
  name: string
  role: 'franchise' | 'team_leader' | 'admin'
  roleTitle: string
  franchiseId: string
  phone: string
  email: string
  avatar: string
  lastLogin: string
  primarySiteId: string
  primaryAtmId: string
}

export const DEMO_MOBILE_USERS: Record<'franchise' | 'team_leader' | 'admin', MobileUser> = {
  franchise: {
    id: 'USR-FR-01',
    name: 'Ranjeet Pal',
    role: 'franchise',
    roleTitle: 'Franchise Partner',
    franchiseId: 'FR-UP-2026-8812',
    phone: '+91 8126817131',
    email: 'ranjeetpal@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    lastLogin: '07 Oct 2026, 10:15 AM',
    primarySiteId: '2014124545',
    primaryAtmId: 'ATM-001'
  },
  team_leader: {
    id: 'USR-TL-02',
    name: 'Mukesh Singh',
    role: 'team_leader',
    roleTitle: 'Field Officer / Team Leader',
    franchiseId: 'EMP-TL-409',
    phone: '+91 9719020867',
    email: 'wlasupport@dexterindia.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    lastLogin: '07 Oct 2026, 11:30 AM',
    primarySiteId: '2014124545',
    primaryAtmId: 'ATM-002'
  },
  admin: {
    id: 'USR-ADM-03',
    name: 'Vikram Mehta',
    role: 'admin',
    roleTitle: 'System Administrator',
    franchiseId: 'ADM-HO-001',
    phone: '+91 8954008232',
    email: 'admin@dexterindia.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    lastLogin: '07 Oct 2026, 09:00 AM',
    primarySiteId: 'ALL',
    primaryAtmId: 'ALL'
  }
}

// 53 Complaint Types from Reference Master List
export const COMPLAINT_TYPES = [
  '100 Denomination Cassette Issue',
  '200 Denomination Cassette Issue',
  '500 Denomination Cassette Issue',
  'ATM Dispenser Issue',
  'ATM Display Issue',
  'ATM Keypad (EPP) Issue',
  'ATM Machine Branding Issue',
  'ATM Machine Issue',
  'ATM Presenter Issue',
  'ATM Site Wall Stickers Issue',
  'ATM Slow TXN Processing Issue',
  'ATM Software Issue',
  'ATM Withdrawal Slip Issue',
  'Battery Backup Issue',
  'Camera Issue',
  'Card Reader Issue',
  'Cassette Configuration Issue',
  'DB Box Issue',
  'Dispenser Shutter Issue',
  'Duracell Battery Issue',
  'Earthing Issue',
  'Isolation Transformer (IT) Issue',
  'Electrical Issue',
  'EOD Docket',
  'EOD Docket Number – Cash Stuck',
  'EOD Cash Reconciliation',
  'Grouting Issue',
  'Hard Disk Issue',
  'Hood Lock Issue',
  'Lobby Door Issue',
  'Lollipop Issue',
  'ATM Shutter Issue',
  'Main Door Issue',
  'MCB Issue',
  'Network Flapping Issue',
  'Network Issue',
  'ONTICO App Issue',
  'Power Issue',
  'Printer Issue',
  'Raw Power Issue',
  'RP Roll Issuance',
  'Router Issue',
  'Routine Preventive Maintenance',
  'ATM Shutter Tampering Issue',
  'Signage Board Issue',
  'SNG Lock Issue',
  'Stabilizer Issue',
  'Timer Issue',
  'Tubelight Issue',
  'UPI Application Issue',
  'UPS Issue',
  'V-SAT Issue',
  'White Card Issue'
]

export interface MobileComplaint {
  id: string
  docketNo: string
  atmId: string
  siteId: string
  problemType: string
  status: 'Open' | 'In Progress' | 'Resolved' | 'On Hold'
  raisedOn: string
  resolvedOn?: string
  engineerName: string
  engineerPhone: string
  flm: 'Done' | 'Not Done'
  remark: string
  photosCount: number
  videosCount: number
}

export const INITIAL_COMPLAINTS: MobileComplaint[] = [
  {
    id: 'CMP0004567',
    docketNo: 'DK0002341',
    atmId: 'ATM012345',
    siteId: '2014124545',
    problemType: 'Server Issue',
    status: 'Open',
    raisedOn: '07 Nov 2026, 10:24 AM',
    engineerName: 'Sanjay Sharma',
    engineerPhone: '+91 9876543210',
    flm: 'Done',
    remark: 'ATM not connecting with the switch server since morning.',
    photosCount: 1,
    videosCount: 0
  },
  {
    id: 'CMP0004566',
    docketNo: 'DK0002340',
    atmId: 'ATM012346',
    siteId: '2014124546',
    problemType: 'Dispenser Issue',
    status: 'In Progress',
    raisedOn: '06 Nov 2026, 04:15 PM',
    engineerName: 'Rajeev Kumar',
    engineerPhone: '+91 9811223344',
    flm: 'Done',
    remark: 'Notes getting jammed at exit shutter gate during dispense.',
    photosCount: 2,
    videosCount: 1
  },
  {
    id: 'CMP0004565',
    docketNo: 'DK0002339',
    atmId: 'ATM012340',
    siteId: '2014124545',
    problemType: 'Display Issue',
    status: 'Resolved',
    raisedOn: '05 Nov 2026, 11:02 AM',
    resolvedOn: '06 Nov 2026, 05:30 PM',
    engineerName: 'Amit Verma',
    engineerPhone: '+91 9723456789',
    flm: 'Done',
    remark: 'Touch screen flicker repaired and calibrated.',
    photosCount: 1,
    videosCount: 0
  },
  {
    id: 'CMP0004564',
    docketNo: 'DK0002338',
    atmId: 'ATM012338',
    siteId: '2014124545',
    problemType: 'ETC',
    status: 'On Hold',
    raisedOn: '04 Nov 2026, 09:20 AM',
    engineerName: 'Deepak Patel',
    engineerPhone: '+91 9654123456',
    flm: 'Not Done',
    remark: 'Awaiting spare parts arrival from OEM vendor.',
    photosCount: 1,
    videosCount: 0
  }
]

export interface SiteProjectItem {
  id: string
  siteId: string
  loiNo: string
  name: string
  location: string
  model: string
  overallStatus: 'Completed' | 'In Progress' | 'Pending'
  completedDate?: string
  expectedDate?: string
  progress: number
  steps: {
    siteInfo: boolean
    readiness: boolean
    installation: boolean
    activation: boolean
    documents: boolean
    final: boolean
  }
  readinessDetails: {
    tisStatus: string
    electricalWork: string
    dbBox: string
    signageBoard: string
    lollypop: string
    grouting: string
    monkeyCage: string
    hitachiBranding: string
  }
  equipmentDetails: {
    atmMachineType: string
    atmMachine: string
    isolationTransformer: string
    stabilizer: string
    ups: string
    battery: string
    batteryCage: string
    camera: string
    dvr: string
    vsatRouter: string
    vsatCompany: string
  }
  activationDetails: {
    techLive: string
    cashLive: string
    projectionCompletionDate: string
  }
  docsStatus: {
    agreement: string
    apnaApp: string
    wlaAccount: string
    payoutAccount: string
    gst: string
  }
}

export const INITIAL_SITES: SiteProjectItem[] = [
  {
    id: 'SITE-01',
    siteId: '2014124545',
    loiNo: '2014124545',
    name: 'Bewar, Mainpuri Site',
    location: 'Bewar, Mainpuri, UP',
    model: 'Garnet Model',
    overallStatus: 'Completed',
    completedDate: '04 Oct 2021',
    progress: 100,
    steps: {
      siteInfo: true,
      readiness: true,
      installation: true,
      activation: true,
      documents: true,
      final: true
    },
    readinessDetails: {
      tisStatus: 'Complete',
      electricalWork: 'Complete',
      dbBox: 'Complete',
      signageBoard: 'Complete',
      lollypop: 'Done',
      grouting: 'Complete',
      monkeyCage: 'Complete',
      hitachiBranding: 'Done'
    },
    equipmentDetails: {
      atmMachineType: 'Delivered',
      atmMachine: 'Installation Done',
      isolationTransformer: 'Done',
      stabilizer: 'Done',
      ups: 'Installation Done',
      battery: 'Delivered',
      batteryCage: 'Done',
      camera: 'Done',
      dvr: 'Done',
      vsatRouter: 'Installation Done',
      vsatCompany: 'Hitachi'
    },
    activationDetails: {
      techLive: 'Done',
      cashLive: 'Done',
      projectionCompletionDate: '04 Oct 2021'
    },
    docsStatus: {
      agreement: 'Done',
      apnaApp: 'Done',
      wlaAccount: 'Done',
      payoutAccount: 'Mail Sent - Done',
      gst: 'Done'
    }
  },
  {
    id: 'SITE-02',
    siteId: '2014124546',
    loiNo: '2014124546',
    name: 'Mainpuri City Center',
    location: 'Mainpuri, UP',
    model: 'Garnet Model',
    overallStatus: 'In Progress',
    expectedDate: '20 Nov 2026',
    progress: 60,
    steps: {
      siteInfo: true,
      readiness: true,
      installation: true,
      activation: false,
      documents: false,
      final: false
    },
    readinessDetails: {
      tisStatus: 'Complete',
      electricalWork: 'Complete',
      dbBox: 'Complete',
      signageBoard: 'Pending',
      lollypop: 'Done',
      grouting: 'Pending',
      monkeyCage: 'Pending',
      hitachiBranding: 'Done'
    },
    equipmentDetails: {
      atmMachineType: 'Delivered',
      atmMachine: 'Installation Pending',
      isolationTransformer: 'Done',
      stabilizer: 'Pending',
      ups: 'Installation Done',
      battery: 'Delivered',
      batteryCage: 'Pending',
      camera: 'Done',
      dvr: 'Pending',
      vsatRouter: 'Installation Done',
      vsatCompany: 'Hitachi'
    },
    activationDetails: {
      techLive: 'Done',
      cashLive: 'Pending',
      projectionCompletionDate: '15 Nov 2026'
    },
    docsStatus: {
      agreement: 'Done',
      apnaApp: 'Done',
      wlaAccount: 'Pending',
      payoutAccount: 'Mail Sent for Necessary Letters – 01.09.2021',
      gst: 'Pending'
    }
  }
]

export interface ClfConsolidatedRecord {
  sn: number
  clfReference: string
  siteId: string
  depositAmount: number
  depositDate: string
  txnId: string
  expectedRefundDate: string
  refundAmount: number
  actualRefundDate?: string
  refundUtr?: string
  outstandingAmount: number
  status: 'Pending Verification' | 'Approved' | 'Partially Refunded' | 'Fully Refunded' | 'Refund Pending' | 'Rejected'
}

export const INITIAL_CLF_RECORDS: ClfConsolidatedRecord[] = [
  {
    sn: 1,
    clfReference: 'CLF-001',
    siteId: 'ATM-1001',
    depositAmount: 50000,
    depositDate: '01-11-2026',
    txnId: 'UTR12345',
    expectedRefundDate: '10-11-2026',
    refundAmount: 30000,
    actualRefundDate: '08-11-2026',
    refundUtr: 'REF123',
    outstandingAmount: 20000,
    status: 'Partially Refunded'
  },
  {
    sn: 2,
    clfReference: 'CLF-002',
    siteId: 'ATM-1002',
    depositAmount: 40000,
    depositDate: '03-11-2026',
    txnId: 'UTR67890',
    expectedRefundDate: '15-11-2026',
    refundAmount: 0,
    outstandingAmount: 40000,
    status: 'Refund Pending'
  },
  {
    sn: 3,
    clfReference: 'CLF-003',
    siteId: 'ATM-1003',
    depositAmount: 25000,
    depositDate: '05-11-2026',
    txnId: 'UTR45678',
    expectedRefundDate: '12-11-2026',
    refundAmount: 25000,
    actualRefundDate: '11-11-2026',
    refundUtr: 'REF456',
    outstandingAmount: 0,
    status: 'Fully Refunded'
  }
]

export interface EodRecord {
  id: string
  eodNo: string
  atmId: string
  eodDate: string
  purpose: string
  siteType: string
  status: 'Submitted' | 'In Progress' | 'Approved' | 'On Hold'
  counterSlip: string
  cbrSummary: string
  physicalCashTotal: number
  systemCashTotal: number
  difference: number
  remark: string
}

export const INITIAL_EOD_RECORDS: EodRecord[] = [
  {
    id: 'EOD-01',
    eodNo: 'DEXEOD-0129',
    atmId: 'AXIS277823',
    eodDate: '10 Nov 2026, 10:24 AM',
    purpose: 'Routine EOD',
    siteType: 'FTM',
    status: 'Submitted',
    counterSlip: 'counter_slip_axis277823.pdf',
    cbrSummary: 'Available & Adjusted',
    physicalCashTotal: 400000,
    systemCashTotal: 400000,
    difference: 0,
    remark: 'EOD completed successfully.'
  },
  {
    id: 'EOD-02',
    eodNo: 'DEXEOD-0128',
    atmId: 'ICICI164520',
    eodDate: '09 Nov 2026, 04:15 PM',
    purpose: 'Cash Audit',
    siteType: 'FFM',
    status: 'In Progress',
    counterSlip: 'audit_slip_icici164520.jpg',
    cbrSummary: 'Audit Under Review',
    physicalCashTotal: 334000,
    systemCashTotal: 335000,
    difference: -1000,
    remark: 'Discrepancy in ₹500 cassette count, team re-verifying.'
  },
  {
    id: 'EOD-03',
    eodNo: 'DEXEOD-0127',
    atmId: 'AXIS278901',
    eodDate: '08 Nov 2026, 11:02 AM',
    purpose: 'Monthly EOD',
    siteType: 'FTM',
    status: 'Approved',
    counterSlip: 'monthly_axis278901.pdf',
    cbrSummary: 'Reconciled & Cleared',
    physicalCashTotal: 500000,
    systemCashTotal: 500000,
    difference: 0,
    remark: 'Monthly audit verified by finance.'
  },
  {
    id: 'EOD-04',
    eodNo: 'DEXEOD-0126',
    atmId: 'ICICI164517',
    eodDate: '07 Nov 2026, 09:20 AM',
    purpose: 'Routine EOD',
    siteType: 'FFM',
    status: 'On Hold',
    counterSlip: 'counter_slip_hold.pdf',
    cbrSummary: 'Pending Cassette Audit',
    physicalCashTotal: 290000,
    systemCashTotal: 295000,
    difference: -5000,
    remark: 'Cash jam slip verification required.'
  }
]

export interface BroadcastItem {
  id: string
  title: string
  subtitle: string
  category: 'Policies' | 'Circulars' | 'Holidays' | 'Compliance' | 'Greetings'
  categoryLabel: string
  date: string
  department: string
  pinned?: boolean
  acknowledged: boolean
}

export const INITIAL_BROADCASTS: BroadcastItem[] = [
  {
    id: 'BC-01',
    title: 'New Cash Loading Policy – Effective 10 Nov',
    subtitle: 'Please read and acknowledge before the stated effective date.',
    category: 'Policies',
    categoryLabel: 'Policy',
    date: '3 Nov 2026',
    department: 'Operations',
    pinned: true,
    acknowledged: false
  },
  {
    id: 'BC-02',
    title: 'Diwali Office Closure: 8 – 10 Nov',
    subtitle: 'Please read and acknowledge before the stated effective date.',
    category: 'Holidays',
    categoryLabel: 'Holiday',
    date: '3 Nov 2026',
    department: 'Operations',
    acknowledged: true
  },
  {
    id: 'BC-03',
    title: 'EOD Submission Deadline: 8:00 PM',
    subtitle: 'Please read and acknowledge before the stated effective date.',
    category: 'Circulars',
    categoryLabel: 'SOP',
    date: '3 Nov 2026',
    department: 'Operations',
    acknowledged: true
  },
  {
    id: 'BC-04',
    title: 'New CBR Format Mandatory',
    subtitle: 'Please read and acknowledge before the stated effective date.',
    category: 'Compliance',
    categoryLabel: 'Compliance',
    date: '3 Nov 2026',
    department: 'Operations',
    acknowledged: false
  },
  {
    id: 'BC-05',
    title: 'Hitachi Money Spot Branding Guidelines',
    subtitle: 'Please read and acknowledge before the stated effective date.',
    category: 'Circulars',
    categoryLabel: 'Brand',
    date: '3 Nov 2026',
    department: 'Operations',
    acknowledged: true
  },
  {
    id: 'BC-06',
    title: 'Server Maintenance – Sunday 2 – 4 AM',
    subtitle: 'Please read and acknowledge before the stated effective date.',
    category: 'Circulars',
    categoryLabel: 'System',
    date: '3 Nov 2026',
    department: 'Operations',
    acknowledged: true
  }
]

export interface AlertNotificationItem {
  id: string
  title: string
  subtitle: string
  time: string
  read: boolean
  type: 'approved' | 'updated' | 'payout' | 'reminder'
  targetRoute?: string
}

export const INITIAL_ALERTS: AlertNotificationItem[] = [
  {
    id: 'ALT-01',
    title: 'Site Approved',
    subtitle: 'ATM-001 – Ahmedabad',
    time: '20 Oct 2026, 10:54 AM',
    read: false,
    type: 'approved',
    targetRoute: 'sites'
  },
  {
    id: 'ALT-02',
    title: 'ATM Installation Updated',
    subtitle: 'ATM-002 – Gandhinagar',
    time: '19 Oct 2026, 05:40 PM',
    read: false,
    type: 'updated',
    targetRoute: 'sites'
  },
  {
    id: 'ALT-03',
    title: 'Payout Processed',
    subtitle: 'Aug 2026 – ₹1,25,600',
    time: '18 Oct 2026, 11:22 AM',
    read: false,
    type: 'payout',
    targetRoute: 'payout'
  },
  {
    id: 'ALT-04',
    title: 'EOD Submission Reminder',
    subtitle: 'Please submit EOD by 8:00 PM today.',
    time: '18 Oct 2026, 06:00 AM',
    read: true,
    type: 'reminder',
    targetRoute: 'eod'
  }
]

export interface DownloadDocumentItem {
  id: string
  title: string
  category: 'Bank Mandate' | 'Agreements' | 'Legal' | 'Other'
  format: 'PDF' | 'XLS' | 'DOC'
  size: string
  date: string
}

export const DOWNLOAD_DOCUMENTS: DownloadDocumentItem[] = [
  { id: 'DOC-01', title: 'Bank Mandate Form', category: 'Bank Mandate', format: 'PDF', size: '2.4 MB', date: '10 Nov 2026' },
  { id: 'DOC-02', title: 'Power of Attorney (Template)', category: 'Legal', format: 'XLS', size: '1.8 MB', date: '09 Nov 2026' },
  { id: 'DOC-03', title: 'NOC Clearance Format', category: 'Other', format: 'PDF', size: '1.2 MB', date: '07 Nov 2026' },
  { id: 'DOC-04', title: 'Indemnity Bond', category: 'Legal', format: 'PDF', size: '2.0 MB', date: '05 Nov 2026' },
  { id: 'DOC-05', title: 'Rent Agreement (Standard)', category: 'Agreements', format: 'DOC', size: '1.6 MB', date: '03 Nov 2026' },
  { id: 'DOC-06', title: 'Board Resolution Template', category: 'Legal', format: 'PDF', size: '1.3 MB', date: '01 Nov 2026' }
]

export interface SupportContactLevel {
  level: number
  levelTitle: string
  subtitle: string
  contactPerson: string
  phone: string
  whatsapp: string
  email: string
  responsibilities: string[]
}

export const SUPPORT_LEVELS: SupportContactLevel[] = [
  {
    level: 1,
    levelTitle: 'Level 1 – Support & Help Desk',
    subtitle: 'For day-to-day queries, complaint management, CBR coordination and cash forecasting.',
    contactPerson: 'Harsh Pratap Singh',
    phone: '+91 89540 08232',
    whatsapp: '+91 89540 08232',
    email: 'wla@dexterindia.com',
    responsibilities: [
      'ATM Operations',
      'Cash Forecasting',
      'CBR Coordination',
      'Complaint Management',
      'General Queries'
    ]
  },
  {
    level: 2,
    levelTitle: 'Level 2 – Administration & Escalation',
    subtitle: 'For project coordination, reconciliation and dispute resolution.',
    contactPerson: 'Mukesh Singh',
    phone: '+91 97190 20867',
    whatsapp: '+91 97190 20867',
    email: 'wlasupport@dexterindia.com',
    responsibilities: [
      'Project Coordination',
      'Reconciliation',
      'Dispute Resolution',
      'Process & Operational Support'
    ]
  },
  {
    level: 3,
    levelTitle: 'Level 3 – Management & Escalation',
    subtitle: 'Overall supervision, departmental coordination and final escalation.',
    contactPerson: 'Kaushal Singh',
    phone: '+91 74510 08232',
    whatsapp: '+91 74510 08232',
    email: 'dextermanagementservices@gmail.com',
    responsibilities: [
      'Overall Supervision',
      'Departmental Coordination',
      'Final Escalation & Approvals'
    ]
  }
]

export interface TransactionSummaryDay {
  date: string
  txns: number
  amount: number
  deposit: number
  withdrawal: number
  cardDepositCount: number
  cardDepositAmt: number
  cardWithdrawalCount: number
  cardWithdrawalAmt: number
  upiDepositCount: number
  upiDepositAmt: number
  upiWithdrawalCount: number
  upiWithdrawalAmt: number
}

export const SIX_DAYS_TXN_DATA: TransactionSummaryDay[] = [
  {
    date: '19 Oct 2026',
    txns: 210,
    amount: 552000,
    deposit: 87000,
    withdrawal: 465000,
    cardDepositCount: 42,
    cardDepositAmt: 132000,
    cardWithdrawalCount: 108,
    cardWithdrawalAmt: 284000,
    upiDepositCount: 6,
    upiDepositAmt: 28000,
    upiWithdrawalCount: 4,
    upiWithdrawalAmt: 52000
  },
  {
    date: '18 Oct 2026',
    txns: 253,
    amount: 654000,
    deposit: 114000,
    withdrawal: 540000,
    cardDepositCount: 44,
    cardDepositAmt: 138000,
    cardWithdrawalCount: 112,
    cardWithdrawalAmt: 292000,
    upiDepositCount: 8,
    upiDepositAmt: 36000,
    upiWithdrawalCount: 4,
    upiWithdrawalAmt: 66000
  },
  {
    date: '17 Oct 2026',
    txns: 238,
    amount: 621000,
    deposit: 126000,
    withdrawal: 495000,
    cardDepositCount: 40,
    cardDepositAmt: 124000,
    cardWithdrawalCount: 106,
    cardWithdrawalAmt: 276000,
    upiDepositCount: 7,
    upiDepositAmt: 34000,
    upiWithdrawalCount: 5,
    upiWithdrawalAmt: 72000
  },
  {
    date: '16 Oct 2026',
    txns: 205,
    amount: 531000,
    deposit: 105000,
    withdrawal: 426000,
    cardDepositCount: 44,
    cardDepositAmt: 130000,
    cardWithdrawalCount: 108,
    cardWithdrawalAmt: 274000,
    upiDepositCount: 5,
    upiDepositAmt: 26000,
    upiWithdrawalCount: 4,
    upiWithdrawalAmt: 64000
  },
  {
    date: '15 Oct 2026',
    txns: 198,
    amount: 528000,
    deposit: 112000,
    withdrawal: 416000,
    cardDepositCount: 46,
    cardDepositAmt: 132000,
    cardWithdrawalCount: 104,
    cardWithdrawalAmt: 262000,
    upiDepositCount: 5,
    upiDepositAmt: 24000,
    upiWithdrawalCount: 4,
    upiWithdrawalAmt: 62000
  },
  {
    date: '14 Oct 2026',
    txns: 190,
    amount: 510000,
    deposit: 108000,
    withdrawal: 402000,
    cardDepositCount: 42,
    cardDepositAmt: 128000,
    cardWithdrawalCount: 104,
    cardWithdrawalAmt: 252000,
    upiDepositCount: 5,
    upiDepositAmt: 30000,
    upiWithdrawalCount: 3,
    upiWithdrawalAmt: 58000
  }
]
