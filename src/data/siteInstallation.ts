import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'

export interface SiteInstallationRecord {
  id: string
  sn: number
  siteLoi: string
  franchisee: string
  frContact: string
  frEmail: string
  siteLocation: string
  model: string
  sdStatus: string
  electrical: string
  tisStatus: string
  // Installation Status (ATM & accessories)
  atmMachine: string
  vsat: string
  ups: string
  grouting: string
  signage: string
  lollypop: string
  hitachi: string
  monkeyCage: string
  // Operational Status
  techLive: string
  cashLive: string
  projectionDate: string
  // Documentation / Account Status
  agreementStatus: string
  apnaApp: string
  wlaAccount: string
  payoutAccount: string
  gstStatus: string
  // Final Status
  status: string
  statusDate: string
  createdAt: string
  updatedAt: string
}

export interface SiteInstallationState {
  records: SiteInstallationRecord[]
}

// Sample predefined site candidates for easy auto-fill
export const KNOWN_SITES = [
  {
    siteLoi: 'SIT-2025-001',
    franchisee: 'Om Sai Enterprises',
    frContact: '+91 98220 12345',
    frEmail: 'contact@omsaienterprises.in',
    siteLocation: 'FC Road, Pune, Maharashtra',
    model: 'Garnet Model',
  },
  {
    siteLoi: 'SIT-2025-002',
    franchisee: 'Balaji Financial Services',
    frContact: '+91 98450 67890',
    frEmail: 'balaji.services@fintech.in',
    siteLocation: 'Indiranagar, Bangalore, Karnataka',
    model: 'Sapphire Model',
  },
  {
    siteLoi: 'SIT-2025-003',
    franchisee: 'Shree Ganesh Associates',
    frContact: '+91 98110 54321',
    frEmail: 'ganesh.assoc@gmail.com',
    siteLocation: 'Connaught Place, New Delhi',
    model: 'Diamond Model',
  },
  {
    siteLoi: 'ST-MH-PUN-00124',
    franchisee: 'Apex Logistics & Fin',
    frContact: '+91 97654 32109',
    frEmail: 'apex.ops@pune.in',
    siteLocation: 'Kothrud, Pune, Maharashtra',
    model: 'Garnet Model',
  },
  {
    siteLoi: 'ST-KA-BLR-00125',
    franchisee: 'Star FinTech Solutions',
    frContact: '+91 99887 76655',
    frEmail: 'star.fintech@blr.co.in',
    siteLocation: 'Whitefield, Bangalore, Karnataka',
    model: 'Platinum Model',
  },
  {
    siteLoi: 'ST-TN-CHN-00126',
    franchisee: 'Chennai Express Retail',
    frContact: '+91 94440 11223',
    frEmail: 'express.chennai@retail.in',
    siteLocation: 'T Nagar, Chennai, Tamil Nadu',
    model: 'Sapphire Model',
  },
]

// Pre-seeded demo records if user clicks "Populate Sample Data"
export const DEMO_RECORDS: SiteInstallationRecord[] = [
  {
    id: 'INS-001',
    sn: 1,
    siteLoi: 'SIT-2025-001',
    franchisee: 'Om Sai Enterprises',
    frContact: '+91 98220 12345',
    frEmail: 'contact@omsaienterprises.in',
    siteLocation: 'FC Road, Pune, Maharashtra',
    model: 'Garnet Model',
    sdStatus: 'Received',
    electrical: 'Complete',
    tisStatus: 'Complete',
    atmMachine: 'Delivered / Pending / Installation Pending',
    vsat: 'Installation Done',
    ups: 'Delivered',
    grouting: 'Done',
    signage: 'Done',
    lollypop: 'Pending',
    hitachi: 'Done',
    monkeyCage: 'Done',
    techLive: 'Pending',
    cashLive: 'Pending',
    projectionDate: '2026-11-20',
    agreementStatus: 'Done',
    apnaApp: 'Registered',
    wlaAccount: 'Active',
    payoutAccount: 'Mail Sent for necessary letters _01.09.2021',
    gstStatus: 'Registered',
    status: 'Installation in progress',
    statusDate: '04.10.2021',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'INS-002',
    sn: 2,
    siteLoi: 'SIT-2025-002',
    franchisee: 'Balaji Financial Services',
    frContact: '+91 98450 67890',
    frEmail: 'balaji.services@fintech.in',
    siteLocation: 'Indiranagar, Bangalore, Karnataka',
    model: 'Sapphire Model',
    sdStatus: 'Received',
    electrical: 'Complete',
    tisStatus: 'Complete',
    atmMachine: 'Installation Done',
    vsat: 'Installation Done',
    ups: 'Installation Done',
    grouting: 'Done',
    signage: 'Done',
    lollypop: 'Done',
    hitachi: 'Done',
    monkeyCage: 'Done',
    techLive: 'Done',
    cashLive: 'Done',
    projectionDate: '2026-09-15',
    agreementStatus: 'Done',
    apnaApp: 'Registered',
    wlaAccount: 'Active',
    payoutAccount: 'Verified',
    gstStatus: 'Registered',
    status: 'Live · 04.10.2021',
    statusDate: '04.10.2021',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'INS-003',
    sn: 3,
    siteLoi: 'ST-MH-PUN-00124',
    franchisee: 'Apex Logistics & Fin',
    frContact: '+91 97654 32109',
    frEmail: 'apex.ops@pune.in',
    siteLocation: 'Kothrud, Pune, Maharashtra',
    model: 'Garnet Model',
    sdStatus: 'Pending',
    electrical: 'Pending',
    tisStatus: 'Pending',
    atmMachine: 'Pending',
    vsat: 'Pending',
    ups: 'Pending',
    grouting: 'Pending',
    signage: 'Pending',
    lollypop: 'Pending',
    hitachi: 'Pending',
    monkeyCage: 'Pending',
    techLive: 'Pending',
    cashLive: 'Pending',
    projectionDate: '2026-12-10',
    agreementStatus: 'Pending',
    apnaApp: 'Pending',
    wlaAccount: 'Pending',
    payoutAccount: 'Mail Sent for necessary letters _01.09.2021',
    gstStatus: 'Pending',
    status: 'Site preparation',
    statusDate: '01.09.2021',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Initialize store with 0 records by default to match Image 1 ("Total Records: 0", "No records found")
function seed(): SiteInstallationState {
  return {
    records: [],
  }
}

export const siteInstallationStore = createStore<SiteInstallationState>('dexter.siteInstallation.v1', seed)
export const useSiteInstallations = () => siteInstallationStore.use()

export function addSiteInstallationRecord(record: Omit<SiteInstallationRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'>) {
  siteInstallationStore.set((state) => {
    const sn = state.records.length + 1
    const id = `INS-${String(sn).padStart(3, '0')}`
    const now = new Date().toISOString()
    const newRecord: SiteInstallationRecord = {
      ...record,
      id,
      sn,
      createdAt: now,
      updatedAt: now,
    }
    return {
      records: [newRecord, ...state.records],
    }
  })
}

export function updateSiteInstallationRecord(id: string, updates: Partial<SiteInstallationRecord>) {
  siteInstallationStore.set((state) => ({
    records: state.records.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    ),
  }))
}

export function deleteSiteInstallationRecord(id: string) {
  siteInstallationStore.set((state) => ({
    records: state.records.filter((r) => r.id !== id),
  }))
}

export function populateSampleRecords() {
  siteInstallationStore.set(() => ({
    records: [...DEMO_RECORDS],
  }))
}

export function clearAllRecords() {
  siteInstallationStore.set(() => ({
    records: [],
  }))
}

export function exportSiteInstallationCsv(records: SiteInstallationRecord[], filename = 'site-installation-records') {
  const headers = [
    'S.N.',
    'Site/LOI Number',
    'Name of Franchisee',
    'FR Contact Number',
    'FR Email',
    'Site Location',
    'Model',
    'SD Status',
    'Electrical Work',
    'TIS Status',
    'ATM Machine',
    'V-SAT',
    'UPS',
    'Grouting',
    'Signage Board',
    'Lollipop',
    "Hitachi's Branding",
    'Monkey Cage',
    'Tech Live',
    'Cash Live',
    'Projection Completion Date',
    'Agreement Status',
    'Apna App Registration',
    'WLA Account Status',
    'Payout Account Status',
    'GST Status',
    'Status',
  ]

  const rows = records.map((r) => [
    String(r.sn),
    r.siteLoi,
    r.franchisee,
    r.frContact,
    r.frEmail,
    r.siteLocation,
    r.model,
    r.sdStatus,
    r.electrical,
    r.tisStatus,
    r.atmMachine,
    r.vsat,
    r.ups,
    r.grouting,
    r.signage,
    r.lollypop,
    r.hitachi,
    r.monkeyCage,
    r.techLive,
    r.cashLive,
    r.projectionDate,
    r.agreementStatus,
    r.apnaApp,
    r.wlaAccount,
    r.payoutAccount,
    r.gstStatus,
    r.status,
  ])

  downloadCsv(filename, headers, rows)
}
