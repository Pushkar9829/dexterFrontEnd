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

// Dates are relative to the clock: the newest notice is ~1 h old and the rest step back from it
// (the design's spacing is kept). IST is used for day labels.
const HOUR = 3600_000
const DAY = 24 * HOUR
const ANCHOR = Math.floor((Date.now() - HOUR) / 60_000) * 60_000
const IST = 5.5 * HOUR
const istDate = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10)
const yymmdd = (ms: number) => istDate(ms).slice(2).replace(/-/g, '')
const TASK_DAY = yymmdd(ANCHOR - 5 * DAY)

// `n` = how many notices of this type came before (0-based), so titles stay in the design's order.
const eodDay = (n: number) => istDate(ANCHOR - (n + 1) * DAY)
const breaches = [
  { id: '0008', details: 'Collect signed agreement for Vijay Nagar' },
  { id: '0006', details: 'Project Vijay Nagar Main Road: VSAT' },
  { id: '0004', details: 'Collect KYC documents for Shree Sai Financial Services' },
]

const templates: Record<NoticeType, { title: (n: number) => string; details: string | ((n: number) => string); link: string }> = {
  KYC: { title: () => '1 KYC document waiting over 48 h', details: 'Aadhaar', link: '/kyc/verification' },
  EOD: { title: (n) => `EOD not submitted for ${eodDay(n)} (1 ATM)`, details: 'DEMO0001', link: '/cbr/eod-summary' },
  Stage: { title: () => 'Stage pending 3 days: VSAT', details: `Vijay Nagar Main Road has not moved since ${istDate(ANCHOR - 5 * DAY)}`, link: '/projects/active' },
  'SLA breach': { title: (n) => `Task overdue: TSK-DEXTER-${TASK_DAY}-${breaches[n % 3].id}`, details: (n) => breaches[n % 3].details, link: '/tasks/overdue' },
  'SLA warning': { title: () => `Task due soon: TSK-DEXTER-${TASK_DAY}-0006`, details: `Project Vijay Nagar Main Road: VSAT · due ${new Date(ANCHOR + 20 * HOUR).toISOString()}`, link: '/tasks/my' },
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

// first ten timestamps keep the design's spacing (newest first, minutes before ANCHOR); the rest step back ~7 h each
const FIRST_AGO_MIN = [0, 0, 1470, 1470, 2387, 2387, 2387, 2582, 2582, 2582]
const last = ANCHOR - FIRST_AGO_MIN[FIRST_AGO_MIN.length - 1] * 60_000
const at = (i: number) => new Date(i < FIRST_AGO_MIN.length ? ANCHOR - FIRST_AGO_MIN[i] * 60_000 : last - (i - FIRST_AGO_MIN.length + 1) * 7 * HOUR).toISOString()

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
