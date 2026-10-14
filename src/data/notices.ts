// Mock notices (Figma 56:3515). 35 system-generated notices, 33 unread.

export const NOTICE_TYPES = [
  'KYC', 'EOD', 'Stage', 'SLA breach', 'SLA warning', 'Reminder', 'Escalation', 'Complaint', 'Assignment', 'Application',
] as const
export type NoticeType = (typeof NOTICE_TYPES)[number]

export type Notice = {
  id: string
  at: string // ISO
  type: NoticeType
  title: string
  details: string
  link: string
  read: boolean
}

// `n` = how many notices of this type came before (0-based), so titles stay in the design's order.
const eodDay = (n: number) => new Date(Date.UTC(2026, 9, 5 - n)).toISOString().slice(0, 10)
const breaches = [
  { id: '0008', details: 'Collect signed agreement for Vijay Nagar' },
  { id: '0006', details: 'Project Vijay Nagar Main Road: VSAT' },
  { id: '0004', details: 'Collect KYC documents for Shree Sai Financial Services' },
]

const templates: Record<NoticeType, { title: (n: number) => string; details: string | ((n: number) => string); link: string }> = {
  KYC: { title: () => '1 KYC document waiting over 48 h', details: 'Aadhaar', link: '/kyc/verification' },
  EOD: { title: (n) => `EOD not submitted for ${eodDay(n)} (1 ATM)`, details: 'DEMO0001', link: '/cbr/eod-summary' },
  Stage: { title: () => 'Stage pending 3 days: VSAT', details: 'Vijay Nagar Main Road has not moved since 2026-10-01', link: '/projects/active' },
  'SLA breach': { title: (n) => `Task overdue: TSK-DEXTER-261001-${breaches[n % 3].id}`, details: (n) => breaches[n % 3].details, link: '/tasks/overdue' },
  'SLA warning': { title: () => 'Task due soon: TSK-DEXTER-261001-0006', details: 'Project Vijay Nagar Main Road: VSAT · due 2026-10-04T10:31:03.098Z', link: '/tasks/my' },
  Reminder: { title: () => 'Reminder: follow up on docket DX-78142', details: 'CMP-1048 · ATM-MH-1024', link: '/operations/complaints' },
  Escalation: { title: () => 'Escalated to L2: CMP-1048', details: 'Resolution SLA breached · Neha Deshmukh notified', link: '/operations/complaints' },
  Complaint: { title: () => 'New complaint: CMP-1060 Cooling fan alarm', details: 'ATM-GJ-0220 · Ahmedabad', link: '/operations/complaints' },
  Assignment: { title: (n) => `Assigned to you: TSK-${1048 - n}`, details: 'Verify KYC & release recommendation', link: '/tasks/my' },
  Application: { title: () => 'New application submitted: APP-2026-0248', details: 'Shree Sai Financial Services · Pune', link: '/onboarding/applications' },
}

// type counts from the design: KYC 4, EOD 8, Stage 6, SLA breach 3, SLA warning 1, Reminder 2, Escalation 3, Complaint 1, Assignment 6, Application 1
const sequence: NoticeType[] = [
  'KYC', 'EOD', 'KYC', 'EOD', 'Stage', 'SLA breach', 'SLA breach', 'KYC', 'EOD', 'SLA warning',
  'Assignment', 'Stage', 'EOD', 'Reminder', 'Escalation', 'Assignment', 'Stage', 'EOD', 'Complaint', 'Assignment',
  'Stage', 'EOD', 'Escalation', 'KYC', 'Assignment', 'SLA breach', 'Stage', 'EOD', 'Reminder', 'Assignment',
  'Application', 'Escalation', 'Stage', 'EOD', 'Assignment',
]

// first ten timestamps follow the design (newest first); the rest step back ~7 h each
const FIRST = [
  '2026-10-06T07:52', '2026-10-06T07:52', '2026-10-05T07:22', '2026-10-05T07:22', '2026-10-04T16:05',
  '2026-10-04T16:05', '2026-10-04T16:05', '2026-10-04T12:50', '2026-10-04T12:50', '2026-10-04T12:50',
]
const last = new Date('2026-10-04T12:50:00+05:30').getTime()
const at = (i: number) => (i < FIRST.length ? new Date(FIRST[i] + ':00+05:30') : new Date(last - (i - FIRST.length + 1) * 7 * 3600_000)).toISOString()

// 33 unread · 2 read — the newest notice (opened already) and the oldest one
const READ = new Set([0, 34])

const seen: Partial<Record<NoticeType, number>> = {}
export const NOTICES: Notice[] = sequence.map((type, i) => {
  const t = templates[type]
  const n = (seen[type] = (seen[type] ?? -1) + 1)
  return {
    id: `N-${String(i + 1).padStart(4, '0')}`,
    at: at(i),
    type,
    title: t.title(n),
    details: typeof t.details === 'function' ? t.details(n) : t.details,
    link: t.link,
    read: READ.has(i),
  }
})
