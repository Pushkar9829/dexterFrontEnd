import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { get, patch, post } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { toast } from '@/components/ui/Toast'
import { apiCall, apiEnabled, background, createLoader, fetchAll } from '@/data/bizApi'

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

// API mode keeps its own cache key so mock seeds never mix with server rows.
export const broadcastStore = createStore<BroadcastState>(apiEnabled ? 'dexter.broadcasts.api.v1' : 'dexter.broadcasts.v1', apiEnabled ? () => ({ broadcasts: [], selectedId: null }) : seed)

// ── backend adapter (API mode) ─────────────────────────────────────────────
type ApiAudience = { allStaff: boolean; allFranchisees: boolean; roles: string[]; departments: string[]; franchiseIds: string[]; states: string[] }
export type ApiBroadcast = {
  broadcastId: string
  title: string
  subject?: string
  type?: string
  audienceLabel?: string
  audience?: ApiAudience
  recipientsCount?: number
  priority: BroadcastPriority
  language?: string
  message?: string
  attachment?: { fileId?: string; name: string; sizeKb?: number }
  publishType?: 'Instant' | 'Scheduled'
  scheduledFor?: string
  status: BroadcastStatus
  channels?: string[]
  ackRequired?: boolean
  approvalLevel?: string
  createdBy?: string
  createdByName?: string
  submittedAt?: string
  reviewerRemarks?: string
  publishedAt?: string
  createdAt?: string
  readAt?: string
  ackAt?: string
  stats?: { readPercentage: number }
}
const prettyDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const prettyDayTime = (iso?: string) => {
  if (!iso) return undefined
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}
const ago = (iso?: string) => {
  if (!iso) return ''
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (m < 24 * 60) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}
function audienceGroupsOf(a?: ApiAudience): string[] {
  if (!a) return []
  return [
    ...(a.allStaff ? ['All Staff'] : []),
    ...(a.allFranchisees ? ['All Franchisees'] : []),
    ...a.roles,
    ...a.departments,
    ...a.states.map((s) => `Franchisees · ${s}`),
    ...(a.franchiseIds.length ? [`Franchisees (${a.franchiseIds.length})`] : []),
  ]
}
export function fromApiBroadcast(b: ApiBroadcast, readPct?: number): BroadcastRecord {
  const groups = audienceGroupsOf(b.audience)
  return {
    id: b.broadcastId,
    title: b.title,
    subject: b.subject || b.title,
    type: b.type ?? 'Announcement',
    audience: b.audienceLabel || groups[0] || 'All Staff',
    audienceGroups: groups,
    recipientsCount: b.recipientsCount ?? 0,
    priority: b.priority,
    language: b.language ?? 'English',
    message: b.message ?? '',
    attachment: b.attachment ? { name: b.attachment.name, size: b.attachment.sizeKb ? `${(b.attachment.sizeKb / 1024).toFixed(1)} MB` : '' } : undefined,
    publishType: b.publishType ?? 'Instant',
    scheduledFor: prettyDayTime(b.scheduledFor),
    date: prettyDay(b.publishedAt ?? b.scheduledFor ?? b.submittedAt ?? b.createdAt),
    status: b.status,
    readPercentage: readPct ?? b.stats?.readPercentage ?? (b.readAt ? 100 : 0),
    channels: b.channels ?? ['In-App'],
    ackRequired: !!b.ackRequired,
    approvalLevel: b.approvalLevel,
    createdBy: b.createdByName ?? '',
    submittedAt: ago(b.submittedAt ?? b.createdAt),
    reviewerRemarks: b.reviewerRemarks,
  }
}

const STAFF_ROLES = ['Super Admin', 'Admin', 'Sub-Admin', 'Project Head', 'Project Team', 'Finance Team', 'Legal Team', 'Operations Team', 'MIS Team', 'Field Officer / Team Leader', 'Engineer']
const DEPARTMENTS = ['Management', 'Administration', 'Operations', 'Finance', 'Projects', 'Legal', 'Field Operations', 'Technical']
/** UI audience group labels ("Operations (38)", "Cash Live Franchisees (142)") → backend audience. Unknown labels → all staff. */
export function toApiAudience(groups: string[]): ApiAudience {
  const a: ApiAudience = { allStaff: false, allFranchisees: false, roles: [], departments: [], franchiseIds: [], states: [] }
  for (const raw of groups) {
    const g = raw.replace(/\s*\(\d+\)\s*$/, '').trim()
    const low = g.toLowerCase()
    const role = STAFF_ROLES.find((r) => r.toLowerCase() === low)
    const dept = DEPARTMENTS.find((d) => d.toLowerCase() === low)
    if (/franchis/.test(low)) a.allFranchisees = true
    else if (role) a.roles.push(role)
    else if (dept) a.departments.push(dept)
    else if (/^all\b|staff|corporate|employees/.test(low)) a.allStaff = true
    else if (/field/.test(low)) a.departments.push('Field Operations')
    else if (/manager|hod|head/.test(low)) a.departments.push('Management')
    else if (/cash|operation|eod|cbr/.test(low)) a.departments.push('Operations')
    else if (/financ|account|audit/.test(low)) a.departments.push('Finance')
    else if (/legal|compliance/.test(low)) a.departments.push('Legal')
    else if (/project|install/.test(low)) a.departments.push('Projects')
    else if (/tech|engineer/.test(low)) a.departments.push('Technical')
    else a.allStaff = true
  }
  a.departments = [...new Set(a.departments)]
  if (!a.allStaff && !a.allFranchisees && !a.roles.length && !a.departments.length) a.allStaff = true
  return a
}
/** Loose "Schedule - 05 Nov 2026, 10:30 AM" / ISO / datetime-local → ISO, or undefined when unparseable or not in the future. */
export function parseSchedule(text?: string): string | undefined {
  if (!text) return undefined
  const t = text.replace(/^\s*schedule[d]?\s*[-:–]\s*/i, '').replace(',', '').trim()
  const d = new Date(t)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now() + 60_000) return undefined
  return d.toISOString()
}
const CHANNEL_MAP: Record<string, string> = { 'IN-APP': 'In-App', EMAIL: 'Email', WHATSAPP: 'WhatsApp', SMS: 'SMS', PUSH: 'Push', 'ALL CHANNELS': 'All Channels', INAPP: 'In-App' }
function toApiBody(item: Partial<Omit<BroadcastRecord, 'id' | 'date'>>, submit: boolean) {
  const scheduledFor = parseSchedule(item.scheduledFor)
  const channels = [...new Set((item.channels ?? ['In-App']).map((c) => CHANNEL_MAP[c.toUpperCase()]).filter(Boolean))]
  const sizeKb = item.attachment ? Math.round((parseFloat(item.attachment.size) || 0) * (/mb/i.test(item.attachment.size) ? 1024 : 1)) : 0
  return {
    title: item.title,
    subject: item.subject ?? '',
    type: item.type,
    audienceLabel: item.audience ?? '',
    audience: toApiAudience(item.audienceGroups?.length ? item.audienceGroups : [item.audience ?? 'All Staff']),
    priority: item.priority,
    language: item.language,
    message: item.message,
    publishType: scheduledFor ? 'Scheduled' : 'Instant',
    ...(scheduledFor ? { scheduledFor } : {}),
    channels: channels.length ? channels : ['In-App'],
    ackRequired: item.ackRequired,
    approvalLevel: item.approvalLevel,
    ...(item.attachment ? { attachment: { name: item.attachment.name, sizeKb } } : {}),
    submit,
  }
}
const isFranchiseeUser = () => /franchisee/i.test(getSession()?.role ?? '')

export const broadcastsLoader = createLoader('broadcasts', async () => {
  if (isFranchiseeUser()) {
    const r = await get<{ items: ApiBroadcast[] }>('/my/broadcasts')
    // own deliveries are always addressed to the franchise
    const rows = r.items.map((b) => ({ ...fromApiBroadcast(b), audience: b.audienceLabel && /franchis/i.test(b.audienceLabel) ? b.audienceLabel : 'All Franchisees' }))
    broadcastStore.set((s) => ({ ...s, broadcasts: rows }))
    return
  }
  const [items, reports] = await Promise.all([
    fetchAll<ApiBroadcast>('/broadcasts'),
    get<{ items: { broadcastId: string; readPercentage: number }[] }>('/broadcasts/reports').catch(() => ({ items: [] })),
  ])
  const pct = new Map(reports.items.map((r) => [r.broadcastId, r.readPercentage]))
  broadcastStore.set((s) => ({ ...s, broadcasts: items.map((b) => fromApiBroadcast(b, pct.get(b.broadcastId))) }))
})
const resync = () => void broadcastsLoader.reload()
const replaceOne = (b: ApiBroadcast) =>
  broadcastStore.set((s) => {
    const prev = s.broadcasts.find((x) => x.id === b.broadcastId)
    const rec = fromApiBroadcast(b, prev?.readPercentage)
    return { ...s, broadcasts: prev ? s.broadcasts.map((x) => (x.id === b.broadcastId ? rec : x)) : [rec, ...s.broadcasts] }
  })

/** Store hook; in API mode hydrates from GET /broadcasts (+ /broadcasts/reports read %), franchisees from GET /my/broadcasts. */
export const useBroadcasts = () => {
  broadcastsLoader.use()
  return broadcastStore.use()
}
/** Loading / error state of the broadcast hydration (API mode). */
export const useBroadcastsLoad = () => broadcastsLoader.use()

/** API mode: mark a delivered broadcast read / acknowledged (staff /broadcasts, franchisee /my/broadcasts). */
export async function markBroadcastRead(id: string, ack = false) {
  if (!apiEnabled) return
  const base = isFranchiseeUser() ? '/my/broadcasts' : '/broadcasts'
  await apiCall(() => post(`${base}/${id}/${ack ? 'ack' : 'read'}`))
}

export async function addBroadcast(item: Omit<BroadcastRecord, 'id' | 'date'>): Promise<boolean> {
  if (apiEnabled) {
    try {
      const b = await apiCall(() => post<ApiBroadcast>('/broadcasts', toApiBody(item, item.status !== 'Draft')), 'Could not save broadcast')
      replaceOne(b)
      return true
    } catch {
      return false
    }
  }
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
  return true
}

export function updateBroadcast(id: string, change: Partial<BroadcastRecord>) {
  if (apiEnabled) {
    // backend: only the author edits a Draft / Changes Requested / Rejected broadcast (409 LOCKED otherwise);
    // an approved Scheduled broadcast cannot be cancelled or rescheduled.
    const cur = broadcastStore.get().broadcasts.find((b) => b.id === id)
    if (cur?.status === 'Scheduled') {
      toast(`${id} is approved and scheduled — the backend does not allow changing it any more.`, 'error')
      return
    }
    const body: Record<string, unknown> =
      change.title !== undefined || change.message !== undefined || change.audienceGroups !== undefined ? toApiBody({ ...cur, ...change }, change.status === 'Pending Approval') : {}
    if (change.scheduledFor !== undefined) {
      const iso = parseSchedule(change.scheduledFor)
      Object.assign(body, iso ? { publishType: 'Scheduled', scheduledFor: iso } : { publishType: 'Instant' })
    }
    if (change.status === 'Pending Approval') body.submit = true
    background(async () => replaceOne(await patch<ApiBroadcast>(`/broadcasts/${id}`, body)), 'Could not update broadcast', resync)
    return
  }
  broadcastStore.set((s) => ({
    ...s,
    broadcasts: s.broadcasts.map((b) => (b.id === id ? { ...b, ...change } : b)),
  }))
}

export function approveBroadcast(id: string, remarks?: string) {
  if (apiEnabled) {
    background(async () => replaceOne(await post<ApiBroadcast>(`/broadcasts/${id}/decision`, { decision: 'Approve', remarks: remarks?.trim() || undefined })), 'Decision failed', resync)
    return
  }
  broadcastStore.set((s) => ({
    ...s,
    broadcasts: s.broadcasts.map((b) =>
      b.id === id ? { ...b, status: 'Published', readPercentage: 96, reviewerRemarks: remarks } : b
    ),
  }))
}

export function rejectBroadcast(id: string, remarks?: string) {
  if (apiEnabled) {
    background(async () => replaceOne(await post<ApiBroadcast>(`/broadcasts/${id}/decision`, { decision: 'Reject', remarks: remarks?.trim() || 'Rejected' })), 'Decision failed', resync)
    return
  }
  broadcastStore.set((s) => ({
    ...s,
    broadcasts: s.broadcasts.map((b) =>
      b.id === id ? { ...b, status: 'Rejected', reviewerRemarks: remarks } : b
    ),
  }))
}

export function requestChangesBroadcast(id: string, remarks?: string) {
  if (apiEnabled) {
    background(async () => replaceOne(await post<ApiBroadcast>(`/broadcasts/${id}/decision`, { decision: 'Request Changes', remarks: remarks?.trim() || 'Changes requested' })), 'Decision failed', resync)
    return
  }
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

