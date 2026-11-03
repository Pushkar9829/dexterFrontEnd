import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'

export type BroadcastPriority = 'Critical' | 'Urgent' | 'Important' | 'Normal'
export type BroadcastStatus =
  | 'Published'
  | 'Scheduled'
  | 'Pending Approval'
  | 'Draft'
  | 'Rejected'
  | 'Changes Requested'
  | 'Approved'

export interface BroadcastRecord {
  id: string
  title: string
  subject: string
  type: string
  audience: string
  audienceGroups?: string[]
  recipientsCount: number
  priority: BroadcastPriority
  language: string
  message: string
  attachment?: { name: string; size: string }
  publishType: 'Instant' | 'Scheduled'
  scheduledFor?: string
  date: string
  status: BroadcastStatus
  readPercentage: number
  channels: string[]
  ackRequired: boolean
  approvalLevel?: string
  createdBy: string
  submittedAt: string
  reviewerRemarks?: string
  aiSummary?: string
}

export interface BroadcastState {
  broadcasts: BroadcastRecord[]
  selectedId: string | null
}

export const INITIAL_BROADCASTS: BroadcastRecord[] = [
  {
    id: 'BR-2611-1040',
    title: 'Cash Loading Policy - Revised Guidelines',
    subject: 'New Cash Loading Policy - Effective 10 Nov 2026',
    type: 'Policy Circular',
    audience: 'Operations',
    audienceGroups: ['Cash Live Franchisees (142)', 'Operations (38)', 'Field Team (96)', 'Cash Loading Team (24)', 'Managers & HODs (19)'],
    recipientsCount: 319,
    priority: 'Critical',
    language: 'English + Hindi',
    message: `Dear Team,

Please note that revised cash loading guidelines will apply to all Cash Live sites from 10 Nov 2026. Cash loading must be confirmed in the ERP before 11:00 AM, and every mismatch must be reported in the same-day CBR.

Kindly acknowledge this notice after reading.

Regards, Operations Department`,
    attachment: { name: 'Cash_Loading_Policy_v3.pdf', size: '1.2 MB' },
    publishType: 'Scheduled',
    scheduledFor: '05 Nov 2026, 10:30 AM',
    date: '3 Nov 2026',
    status: 'Published',
    readPercentage: 96,
    channels: ['In-App', 'Email', 'WhatsApp'],
    ackRequired: true,
    approvalLevel: 'HOD',
    createdBy: 'Paras Dubey',
    submittedAt: '1h ago',
  },
  {
    id: 'BR-2611-1039',
    title: 'EOD Submission Deadline Reminder',
    subject: 'Daily EOD Docket Submission Deadline Fixed at 6:00 PM',
    type: 'SOP Update',
    audience: 'Legal',
    audienceGroups: ['Legal (18)', 'Regional Compliance (22)'],
    recipientsCount: 40,
    priority: 'Urgent',
    language: 'English',
    message: 'All regional coordinators must verify EOD slips and upload countersigned docket receipts before 6:00 PM daily. Delays impact settlement SLA.',
    publishType: 'Scheduled',
    scheduledFor: '5 Nov 2026, 10:30',
    date: '5 Nov 2026',
    status: 'Scheduled',
    readPercentage: 88,
    channels: ['All Channels'],
    ackRequired: true,
    approvalLevel: 'Admin Approval',
    createdBy: 'Anita Verma',
    submittedAt: '2h ago',
  },
  {
    id: 'BR-2611-1038',
    title: 'Diwali Wishes & Office Closure',
    subject: 'Diwali Festival Greetings & Regional Branch Holiday Schedule',
    type: 'Festival Greeting',
    audience: 'All Franchisees',
    audienceGroups: ['All Franchisees (480)', 'Corporate Staff (120)'],
    recipientsCount: 600,
    priority: 'Important',
    language: 'English + Hindi',
    message: 'Dexter India wishes all franchisees and partners a joyous and prosperous Diwali. Regional offices will observe holidays on 12-14 Nov 2026. ATM cash operations will remain 24/7.',
    publishType: 'Scheduled',
    scheduledFor: '6 Nov 2026, 11:00',
    date: '7 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['WhatsApp', 'In-App'],
    ackRequired: false,
    approvalLevel: 'HOD',
    createdBy: 'R. K. Singh',
    submittedAt: '3h ago',
  },
  {
    id: 'BR-2611-1037',
    title: 'New CBR Format Mandatory',
    subject: 'Mandatory Migration to CBR Version 2.4 Format',
    type: 'Compliance Alert',
    audience: 'Finance',
    audienceGroups: ['Finance (35)', 'Accounts & Audit (15)'],
    recipientsCount: 50,
    priority: 'Normal',
    language: 'English',
    message: 'Starting next billing cycle, only CBR v2.4 templates with transaction UTR hashing will be accepted for interchange claims.',
    publishType: 'Instant',
    scheduledFor: '7 Nov 2026, 14:00',
    date: '9 Nov 2026',
    status: 'Draft',
    readPercentage: 0,
    channels: ['In-App', 'Email'],
    ackRequired: true,
    createdBy: 'Paras Dubey',
    submittedAt: '4h ago',
  },
  {
    id: 'BR-2611-1036',
    title: 'GST Filing Notice - Q2',
    subject: 'Quarterly GST Reconciliation & Input Tax Credit Attestation',
    type: 'Training Notice',
    audience: 'Projects',
    audienceGroups: ['Projects (42)', 'Vendor Partners (68)'],
    recipientsCount: 110,
    priority: 'Critical',
    language: 'English',
    message: 'Vendor invoices without valid GSTIN and HSN code for signage or IT installations will not be processed for Q2 closing.',
    publishType: 'Instant',
    date: '4 Nov 2026',
    status: 'Published',
    readPercentage: 96,
    channels: ['All Channels'],
    ackRequired: true,
    createdBy: 'Anita Verma',
    submittedAt: '5h ago',
  },
  {
    id: 'BR-2611-1035',
    title: 'Hitachi Money Spot Branding Guide',
    subject: 'Updated Canopy, Lollipop & Fascia Signage Standards',
    type: 'Scheme Launch',
    audience: 'Cash Loading',
    audienceGroups: ['Cash Loading Team (24)', 'Site Supervisors (32)'],
    recipientsCount: 56,
    priority: 'Urgent',
    language: 'English',
    message: 'New Hitachi Money Spot co-branding specifications are now live. All sites transitioning to CRM must deploy the revised lollipop and dual camera housing.',
    publishType: 'Scheduled',
    scheduledFor: '9 Nov 2026, 09:00',
    date: '6 Nov 2026',
    status: 'Scheduled',
    readPercentage: 88,
    channels: ['WhatsApp'],
    ackRequired: false,
    createdBy: 'R. K. Singh',
    submittedAt: '6h ago',
  },
  {
    id: 'BR-2611-1034',
    title: 'WLA Aspire Scheme Update',
    subject: 'Revised Incentive Slabs for High Volume Semi-Urban Sites',
    type: 'Holiday Notice',
    audience: 'HR & Admin',
    audienceGroups: ['HR & Admin (28)', 'Regional Leads (18)'],
    recipientsCount: 46,
    priority: 'Important',
    language: 'English',
    message: 'Franchisees exceeding 4,000 monthly dispense transactions will qualify for the 15% interchange bonus under WLA Aspire Scheme.',
    publishType: 'Scheduled',
    scheduledFor: '10 Nov 2026, 10:30',
    date: '8 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['In-App', 'Email'],
    ackRequired: true,
    createdBy: 'Paras Dubey',
    submittedAt: '7h ago',
  },
  {
    id: 'BR-2611-1033',
    title: 'Field Visit Reporting SOP',
    subject: 'Mobile Geo-Tagged Photo Upload Protocol for Field Engineers',
    type: 'System Maintenance',
    audience: 'Field Team',
    audienceGroups: ['Field Team (96)'],
    recipientsCount: 96,
    priority: 'Normal',
    language: 'English + Hindi',
    message: 'Field engineers must complete the 6-point maintenance checklist on the mobile app within 30 minutes of arriving at the ATM lobby.',
    publishType: 'Instant',
    scheduledFor: '11 Nov 2026, 11:00',
    date: '3 Nov 2026',
    status: 'Draft',
    readPercentage: 0,
    channels: ['All Channels'],
    ackRequired: false,
    createdBy: 'R. K. Singh',
    submittedAt: '8h ago',
  },
  {
    id: 'BR-2611-1032',
    title: 'Server Maintenance - Sunday 2 AM',
    subject: 'Core Switch Maintenance & Temporary Payout Interruption',
    type: 'Policy Circular',
    audience: 'Operations',
    audienceGroups: ['Operations (38)', 'All Franchisees (480)'],
    recipientsCount: 518,
    priority: 'Critical',
    language: 'English',
    message: 'Core database indexing is scheduled between 02:00 AM and 04:30 AM this Sunday. Real-time balance queries will temporarily failover to standby.',
    publishType: 'Scheduled',
    scheduledFor: '12 Nov 2026, 14:00',
    date: '5 Nov 2026',
    status: 'Published',
    readPercentage: 96,
    channels: ['WhatsApp', 'SMS'],
    ackRequired: false,
    createdBy: 'Paras Dubey',
    submittedAt: '9h ago',
  },
  {
    id: 'BR-2611-1031',
    title: 'KYC Re-upload Instructions',
    subject: 'Handling Incomplete Aadhaar/PAN Submissions and 48-Hour SLA',
    type: 'SOP Update',
    audience: 'Legal',
    audienceGroups: ['Legal (18)', 'KYC Team (20)'],
    recipientsCount: 38,
    priority: 'Urgent',
    language: 'English',
    message: 'Applications pending KYC discrepancy correction over 48 hours must be flagged for manual telephonic verification.',
    publishType: 'Scheduled',
    scheduledFor: '13 Nov 2026, 10:00',
    date: '7 Nov 2026',
    status: 'Scheduled',
    readPercentage: 88,
    channels: ['In-App', 'Email'],
    ackRequired: true,
    createdBy: 'Anita Verma',
    submittedAt: '10h ago',
  },
  {
    id: 'BR-2611-1030',
    title: 'Monthly Compliance Checklist',
    subject: 'Statutory RBI & Cash Replenishment Compliance Log',
    type: 'Festival Greeting',
    audience: 'All Franchisees',
    audienceGroups: ['All Franchisees (480)'],
    recipientsCount: 480,
    priority: 'Important',
    language: 'English',
    message: 'Submit the signed physical inspection and CCTV uptime register for the preceding month before the 5th working day.',
    publishType: 'Instant',
    scheduledFor: '14 Nov 2026, 15:00',
    date: '9 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['All Channels'],
    ackRequired: true,
    createdBy: 'R. K. Singh',
    submittedAt: '11h ago',
  },
  {
    id: 'BR-2611-1029',
    title: 'Franchise Payout Calendar',
    subject: 'Direct Commission Disbursement Dates for Current Quarter',
    type: 'Compliance Alert',
    audience: 'Finance',
    audienceGroups: ['Finance (35)', 'All Franchisees (480)'],
    recipientsCount: 515,
    priority: 'Normal',
    language: 'English',
    message: 'Monthly interchange revenue sharing will be credited to registered settlement accounts on or before the 10th of every calendar month.',
    publishType: 'Instant',
    scheduledFor: '15 Nov 2026, 09:30',
    date: '4 Nov 2026',
    status: 'Draft',
    readPercentage: 0,
    channels: ['Email'],
    ackRequired: false,
    createdBy: 'Paras Dubey',
    submittedAt: '12h ago',
  },
  // Approval Queue specific records (Matching Image 5)
  {
    id: 'BR-2611-1150',
    title: 'Cash Loading Policy - Revised Guidelines',
    subject: 'New Cash Loading Policy',
    type: 'Policy Circular',
    audience: 'Operations',
    audienceGroups: ['Operations (38)', 'Cash Loading Team (24)', 'Cash Live Franchisees (142)'],
    recipientsCount: 319,
    priority: 'Critical',
    language: 'English + Hindi',
    message: 'Cash loading must be confirmed in the ERP before 11:00 AM on all Cash Live sites from 10 Nov 2026. Every mismatch must be reported in the same-day CBR.',
    publishType: 'Instant',
    date: '3 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['In-App', 'Email', 'WhatsApp'],
    ackRequired: true,
    approvalLevel: 'HOD',
    createdBy: 'Paras Dubey',
    submittedAt: '1h ago',
  },
  {
    id: 'BR-2611-1151',
    title: 'EOD Submission Deadline Reminder',
    subject: 'EOD Submission Deadline Reminder',
    type: 'SOP Update',
    audience: 'Legal',
    recipientsCount: 45,
    priority: 'Urgent',
    language: 'English',
    message: 'Daily EOD closing balances must be locked by 6:00 PM without exception.',
    publishType: 'Instant',
    date: '3 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['All Channels'],
    ackRequired: true,
    createdBy: 'Anita Verma',
    submittedAt: '2h ago',
  },
  {
    id: 'BR-2611-1152',
    title: 'Diwali Wishes & Office Closure',
    subject: 'Diwali Wishes & Office Closure',
    type: 'Festival Greeting',
    audience: 'All Franchisees',
    recipientsCount: 480,
    priority: 'Important',
    language: 'English',
    message: 'Greetings of Diwali to all partners. Branch operations will be offline on festival days.',
    publishType: 'Scheduled',
    scheduledFor: '06 Nov 2026, 11:00 AM',
    date: '3 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['WhatsApp'],
    ackRequired: false,
    createdBy: 'R. K. Singh',
    submittedAt: '3h ago',
  },
  {
    id: 'BR-2611-1153',
    title: 'New CBR Format Mandatory',
    subject: 'New CBR Format Mandatory',
    type: 'Compliance Alert',
    audience: 'Finance',
    recipientsCount: 50,
    priority: 'Normal',
    language: 'English',
    message: 'Mandatory reconciliation through revised CBR template starts 15 Nov 2026.',
    publishType: 'Instant',
    date: '3 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['In-App', 'Email'],
    ackRequired: true,
    createdBy: 'Paras Dubey',
    submittedAt: '4h ago',
  },
  {
    id: 'BR-2611-1154',
    title: 'GST Filing Notice - Q2',
    subject: 'GST Filing Notice - Q2',
    type: 'Training Notice',
    audience: 'Projects',
    recipientsCount: 110,
    priority: 'Critical',
    language: 'English',
    message: 'Vendor ITC reconciliation closing this Friday. Ensure all bill uploads are done.',
    publishType: 'Instant',
    date: '3 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['All Channels'],
    ackRequired: true,
    createdBy: 'Anita Verma',
    submittedAt: '5h ago',
  },
  {
    id: 'BR-2611-1155',
    title: 'Hitachi Money Spot Branding Guide',
    subject: 'Hitachi Money Spot Branding Guide',
    type: 'Scheme Launch',
    audience: 'Cash Loading',
    recipientsCount: 56,
    priority: 'Urgent',
    language: 'English',
    message: 'Revised site layout and canopy specifications for Hitachi Money Spot.',
    publishType: 'Instant',
    date: '3 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['WhatsApp'],
    ackRequired: false,
    createdBy: 'R. K. Singh',
    submittedAt: '6h ago',
  },
  {
    id: 'BR-2611-1156',
    title: 'WLA Aspire Scheme Update',
    subject: 'WLA Aspire Scheme Update',
    type: 'Holiday Notice',
    audience: 'HR & Admin',
    recipientsCount: 46,
    priority: 'Important',
    language: 'English',
    message: 'Performance criteria and payout brackets for the Aspire growth program.',
    publishType: 'Instant',
    date: '3 Nov 2026',
    status: 'Pending Approval',
    readPercentage: 0,
    channels: ['In-App', 'Email'],
    ackRequired: true,
    createdBy: 'Paras Dubey',
    submittedAt: '7h ago',
  },
]

function seed(): BroadcastState {
  return {
    broadcasts: INITIAL_BROADCASTS,
    selectedId: 'BR-2611-1150',
  }
}

export const broadcastStore = createStore<BroadcastState>('dexter.broadcasts.v1', seed)
export const useBroadcasts = () => broadcastStore.use()

export function addBroadcast(item: Omit<BroadcastRecord, 'id' | 'date'>) {
  broadcastStore.set((s) => {
    const id = `BR-2611-${String(1041 + s.broadcasts.length)}`
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const created: BroadcastRecord = {
      ...item,
      id,
      date: now,
    }
    return {
      ...s,
      broadcasts: [created, ...s.broadcasts],
    }
  })
}

export function updateBroadcast(id: string, patch: Partial<BroadcastRecord>) {
  broadcastStore.set((s) => ({
    ...s,
    broadcasts: s.broadcasts.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  }))
}

export function approveBroadcast(id: string, remarks?: string) {
  broadcastStore.set((s) => ({
    ...s,
    broadcasts: s.broadcasts.map((b) =>
      b.id === id ? { ...b, status: 'Published', readPercentage: 96, reviewerRemarks: remarks } : b
    ),
  }))
}

export function rejectBroadcast(id: string, remarks?: string) {
  broadcastStore.set((s) => ({
    ...s,
    broadcasts: s.broadcasts.map((b) =>
      b.id === id ? { ...b, status: 'Rejected', reviewerRemarks: remarks } : b
    ),
  }))
}

export function requestChangesBroadcast(id: string, remarks?: string) {
  broadcastStore.set((s) => ({
    ...s,
    broadcasts: s.broadcasts.map((b) =>
      b.id === id ? { ...b, status: 'Changes Requested', reviewerRemarks: remarks } : b
    ),
  }))
}

export function setSelectedBroadcast(id: string | null) {
  broadcastStore.set((s) => ({ ...s, selectedId: id }))
}

export function exportBroadcastsCsv(records: BroadcastRecord[], filename = 'dexter-broadcasts') {
  const headers = ['Broadcast ID', 'Title', 'Subject', 'Type', 'Audience', 'Recipients', 'Priority', 'Status', 'Date', 'Read %', 'Channels']
  const rows = records.map((r) => [
    r.id,
    r.title,
    r.subject,
    r.type,
    r.audience,
    String(r.recipientsCount),
    r.priority,
    r.status,
    r.date,
    `${r.readPercentage}%`,
    r.channels.join(', '),
  ])
  downloadCsv(filename, headers, rows)
}

