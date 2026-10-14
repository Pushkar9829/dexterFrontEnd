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

const templates: Record<NoticeType, { title: (i: number) => string; details: string; link: string }> = {
  KYC: { title: () => '1 KYC document waiting over 48 h', details: 'Aadhaar', link: '/kyc/verification' },
  EOD: { title: (i) => `EOD not submitted for 2026-10-0${(i % 5) + 1} (1 ATM)`, details: 'DEMO0001', link: '/cbr/eod-summary' },
  Stage: { title: () => 'Stage pending 3 days: VSAT', details: 'Vijay Nagar Main Road has not moved since 2026-10-01', link: '/projects/active' },
  'SLA breach': { title: (i) => `Task overdue: TSK-DEXTER-261001-000${(i % 9) + 1}`, details: 'Collect signed agreement for Vijay Nagar', link: '/tasks/overdue' },
  'SLA warning': { title: () => 'Task due soon: TSK-DEXTER-261001-0006', details: 'Project Vijay Nagar Main Road: VSAT · due 2026-10-04T10:31:03.098Z', link: '/tasks/my' },
  Reminder: { title: () => 'Reminder: follow up on docket DX-78142', details: 'CMP-1048 · ATM-MH-1024', link: '/operations/complaints' },
  Escalation: { title: () => 'Escalated to L2: CMP-1048', details: 'Resolution SLA breached · Neha Deshmukh notified', link: '/operations/complaints' },
  Complaint: { title: () => 'New complaint: CMP-1060 Cooling fan alarm', details: 'ATM-GJ-0220 · Ahmedabad', link: '/operations/complaints' },
  Assignment: { title: (i) => `Assigned to you: TSK-10${40 + i}`, details: 'Verify KYC & release recommendation', link: '/tasks/my' },
  Application: { title: () => 'New application submitted: APP-2026-0248', details: 'Shree Sai Financial Services · Pune', link: '/onboarding/applications' },
}

// type counts from the design: KYC 4, EOD 8, Stage 6, SLA breach 3, SLA warning 1, Reminder 2, Escalation 3, Complaint 1, Assignment 6, Application 1
const sequence: NoticeType[] = [
  'KYC', 'EOD', 'KYC', 'EOD', 'Stage', 'SLA breach', 'SLA breach', 'KYC', 'EOD', 'SLA warning',
  'Assignment', 'Stage', 'EOD', 'Reminder', 'Escalation', 'Assignment', 'Stage', 'EOD', 'Complaint', 'Assignment',
  'Stage', 'EOD', 'Escalation', 'KYC', 'Assignment', 'SLA breach', 'Stage', 'EOD', 'Reminder', 'Assignment',
  'Application', 'Escalation', 'Stage', 'EOD', 'Assignment',
]

const base = new Date('2026-10-06T07:52:00+05:30').getTime()

export const NOTICES: Notice[] = sequence.map((type, i) => {
  const t = templates[type]
  return {
    id: `N-${String(i + 1).padStart(4, '0')}`,
    at: new Date(base - i * 3.4 * 3600_000).toISOString(),
    type,
    title: t.title(i),
    details: t.details,
    link: t.link,
    read: i >= 33,
  }
})
