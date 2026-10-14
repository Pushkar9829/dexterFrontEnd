import { createStore } from '@/lib/store'

/* ------------------------------------------------------------------ */
/*  Clock — one fixed "now" so every SLA number matches the design.    */
/*  Tuesday, 06 October 2026, 09:14 IST. SLA clocks never pause.        */
/* ------------------------------------------------------------------ */
export const NOW = Date.parse('2026-10-06T09:14:00+05:30')
const MIN = 60_000
const HOUR = 60 * MIN

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TaskStatus = 'New' | 'Assigned' | 'In Progress' | 'Pending Approval' | 'Waiting/Blocked' | 'Closed'
export type Dept = 'Sales' | 'Franchise' | 'Verification' | 'Finance' | 'Legal' | 'Operations' | 'Projects' | 'Support'
export type TaskKind = 'Ad-hoc' | 'Daily Routine' | 'Monthly'
export type Region = 'West' | 'North' | 'South' | 'East'

export const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low']
export const STATUSES: TaskStatus[] = ['New', 'Assigned', 'In Progress', 'Pending Approval', 'Waiting/Blocked', 'Closed']
export const DEPTS: Dept[] = ['Sales', 'Franchise', 'Verification', 'Finance', 'Legal', 'Operations', 'Projects', 'Support']
export const REGIONS: Region[] = ['West', 'North', 'South', 'East']
export const LIFECYCLE: TaskStatus[] = ['New', 'Assigned', 'In Progress', 'Pending Approval', 'Closed']

export type Person = { name: string; role: string; dept: string; initials: string }
export const PEOPLE: Person[] = [
  { name: 'Rahul Kumar', role: 'Employee', dept: 'Verification', initials: 'RK' },
  { name: 'Priya Menon', role: 'Team Leader', dept: 'Verification', initials: 'PM' },
  { name: 'Meera Iyer', role: 'Manager', dept: 'Verification', initials: 'MI' },
  { name: 'Suresh Nair', role: 'Head', dept: 'Verification', initials: 'SN' },
  { name: 'Vikram Shah', role: 'Manager', dept: 'Finance', initials: 'VS' },
  { name: 'Sana Ali', role: 'Employee', dept: 'Verification', initials: 'SA' },
  { name: 'Neha Das', role: 'Employee', dept: 'Verification', initials: 'ND' },
  { name: 'Karan Mehta', role: 'Employee', dept: 'Verification', initials: 'KM' },
  { name: 'Arjun Sethi', role: 'Employee', dept: 'Franchise', initials: 'AS' },
  { name: 'Amit Jadhav', role: 'Engineer', dept: 'Operations', initials: 'AJ' },
  { name: 'Neha Deshmukh', role: 'RM', dept: 'Sales', initials: 'ND' },
  { name: 'Rohan Gupta', role: 'Employee', dept: 'Legal', initials: 'RG' },
  { name: 'Ananya Sharma', role: 'Super administrator', dept: 'India operations', initials: 'AS' },
]
export const VERIFICATION_TEAM = ['Rahul Kumar', 'Priya Menon', 'Sana Ali', 'Neha Das', 'Karan Mehta']
export const person = (name: string): Person =>
  PEOPLE.find((p) => p.name === name) ?? { name: name || 'Unassigned', role: '—', dept: '—', initials: name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—' }

export type Evidence = { id: string; name: string; type: string; size: number; label?: string; by: string; at: string; verified: boolean }
export type TaskComment = { id: string; by: string; role: string; at: string; text: string }
export type AuditKind = 'create' | 'assign' | 'reassign' | 'evidence' | 'submit' | 'approve' | 'return' | 'close' | 'comment' | 'ai' | 'reminder' | 'unblock' | 'start' | 'verify'
export type AuditEntry = { id: string; at: string; kind: AuditKind; title: string; detail: string }

export type Task = {
  id: string
  title: string
  description: string
  expectedOutcome: string
  priority: Priority
  status: TaskStatus
  department: Dept
  region: Region
  kind: TaskKind
  /** module that produced the task, e.g. "CRM Transaction" */
  source: string
  /** linked entity id (FR-…, ATM-…, tracker…) */
  entityId?: string
  /** human label shown under the task name, e.g. "ABC Franchise · Pune" */
  entityLabel: string
  assignee: string
  owner: string
  reviewer: string
  approver: string
  createdAt: string
  tatHours: number
  closedAt?: string
  parentId?: string
  subtask?: boolean
  /** short label used in dependency lists ("Manager sign-off") */
  depLabel?: string
  blockedBy: string[]
  workflowId?: string
  approved?: boolean
  aiRisk?: number
  riskDrivers?: string
  riskAction?: string
  /** risk-alert phrasing, e.g. "manager approval pending" */
  alertNote?: string
  /** SLA banner second line */
  slaNote?: string
  evidence: Evidence[]
  comments: TaskComment[]
  audit: AuditEntry[]
}

/* ------------------------------ time & SLA ------------------------------ */

const iso = (ms: number) => new Date(ms).toISOString()
/** createdAt that yields the given elapsed time at NOW */
const ago = (h: number, m = 0) => iso(NOW - h * HOUR - m * MIN)
const at = (s: string) => new Date(s + '+05:30').toISOString()

export function fmtDur(min: number) {
  const a = Math.abs(Math.round(min))
  const h = Math.floor(a / 60)
  const m = a % 60
  if (h === 0) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

export type Sla = {
  elapsedMin: number
  targetMin: number
  remainingMin: number
  pct: number
  due: number
  overdue: boolean
  closed: boolean
  /** "22h 14m / 24h" */
  ratio: string
  /** "1h 46m left" | "3h overdue" | "Within SLA" | "Breached by 2h" */
  line: string
  tone: 'red' | 'amber' | 'green' | 'blue'
}

export function slaOf(t: Task): Sla {
  const created = Date.parse(t.createdAt)
  const end = t.closedAt ? Date.parse(t.closedAt) : NOW
  const elapsedMin = Math.max(0, Math.round((end - created) / MIN))
  const targetMin = t.tatHours * 60
  const remainingMin = targetMin - elapsedMin
  const closed = t.status === 'Closed'
  const overdue = remainingMin < 0
  let line: string
  let tone: Sla['tone']
  if (closed) {
    line = overdue ? `Breached by ${fmtDur(-remainingMin)}` : 'Within SLA'
    tone = overdue ? 'red' : 'green'
  } else if (overdue) {
    line = `${fmtDur(-remainingMin)} overdue`
    tone = 'red'
  } else {
    line = `${fmtDur(remainingMin)} left`
    tone = remainingMin <= 4 * 60 ? 'red' : remainingMin <= 12 * 60 ? 'amber' : 'blue'
  }
  return {
    elapsedMin,
    targetMin,
    remainingMin,
    pct: targetMin ? elapsedMin / targetMin : 0,
    due: created + targetMin * MIN,
    overdue,
    closed,
    ratio: `${fmtDur(elapsedMin)} / ${t.tatHours}h`,
    line,
    tone,
  }
}

const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' }
/** "05 Oct 2026, 11:00 IST" */
export function fmtIst(ms: number | string, withYear = true) {
  const d = new Date(ms)
  const date = d.toLocaleDateString('en-GB', { ...IST, day: '2-digit', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
  const time = d.toLocaleTimeString('en-GB', { ...IST, hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date}, ${time} IST`
}
/** "05 Oct · 11:00" */
export function fmtShort(ms: number | string) {
  const d = new Date(ms)
  const date = d.toLocaleDateString('en-GB', { ...IST, day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { ...IST, hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} · ${time}`
}
export const istDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', IST)
export const isDueToday = (t: Task) => istDay(slaOf(t).due) === istDay(NOW)
export const isOpen = (t: Task) => t.status !== 'Closed'

/** AI risk: explicit for curated tasks, otherwise derived from SLA consumption, priority and status. */
export function riskOf(t: Task) {
  if (t.status === 'Closed') return 0
  if (t.aiRisk != null) return t.aiRisk
  const s = slaOf(t)
  const pr = { Critical: 18, High: 10, Medium: 4, Low: 0 }[t.priority]
  const st = t.status === 'Waiting/Blocked' ? 12 : t.status === 'Pending Approval' ? 8 : 0
  return Math.max(5, Math.min(97, Math.round(s.pct * 62 + pr + st)))
}
export const riskBand = (r: number) => (r >= 70 ? 'High Risk' : r >= 40 ? 'Medium Risk' : 'Low Risk')

export const regionOf = (entityId = ''): Region =>
  /-(KA|TN|KL|AP|TS)-/.test(entityId) ? 'South' : /-(UP|DL|PB|HR|RJ)-/.test(entityId) ? 'North' : /-(WB|OD|AS|BR)-/.test(entityId) ? 'East' : 'West'

/** Link target for a linked entity id, if the app has a page for it. */
export function entityHref(id?: string) {
  if (!id) return undefined
  if (/^FR-[A-Z]{2}-\d+$/.test(id)) return `/franchise/master-data/${id}`
  if (/^(ATM|FIN|LEG)-\d{4}-\d+$/.test(id)) return `/email/inbox`
  return undefined
}

/* ------------------------------ seed ------------------------------ */

let seq = 0
const uid = (p: string) => `${p}-${(++seq).toString(36)}`

type SeedIn = Partial<Task> & Pick<Task, 'id' | 'title' | 'priority' | 'status' | 'department' | 'entityLabel' | 'source' | 'expectedOutcome' | 'createdAt' | 'tatHours'>

function mk(x: SeedIn): Task {
  const assignee = x.assignee ?? 'Rahul Kumar'
  const t: Task = {
    description: x.description ?? `${x.title} for ${x.entityLabel}. Record the outcome and attach supporting evidence before handing off.`,
    region: x.region ?? regionOf(x.entityId),
    kind: 'Ad-hoc',
    assignee,
    owner: x.owner ?? 'Suresh Nair',
    reviewer: x.reviewer ?? 'Priya Menon',
    approver: x.approver ?? 'Meera Iyer',
    blockedBy: [],
    evidence: [],
    comments: [],
    audit: [],
    ...x,
  }
  if (!x.audit) {
    const created = Date.parse(t.createdAt)
    t.audit = [
      { id: uid('a'), at: t.createdAt, kind: 'create', title: 'Task created', detail: `${t.source === 'Manual' ? 'Created manually' : `CRM automation created ${t.id} from ${t.source.toLowerCase()}`}. SLA started: ${t.tatHours} hours.` },
    ]
    if (assignee && t.status !== 'New')
      t.audit.push({ id: uid('a'), at: iso(created + 5 * MIN), kind: 'assign', title: `Assigned to ${assignee}`, detail: `${t.owner} assigned the task. Status: New → Assigned.` })
    if (['In Progress', 'Pending Approval', 'Waiting/Blocked', 'Closed'].includes(t.status))
      t.audit.push({ id: uid('a'), at: iso(created + 40 * MIN), kind: 'start', title: 'Work started', detail: `${assignee || 'Assignee'} moved the task to In Progress.` })
    if (t.status === 'Waiting/Blocked')
      t.audit.push({ id: uid('a'), at: iso(created + 3 * HOUR), kind: 'return', title: 'Marked Waiting/Blocked', detail: t.alertNote ? `Waiting: ${t.alertNote}. SLA continues to run.` : 'Dependency outstanding. SLA continues to run.' })
    if (t.status === 'Pending Approval')
      t.audit.push({ id: uid('a'), at: iso(created + 6 * HOUR), kind: 'submit', title: 'Submitted for approval', detail: `Submitted to ${t.approver}. Status: In Progress → Pending Approval.` })
    if (t.closedAt) t.audit.push({ id: uid('a'), at: t.closedAt, kind: 'close', title: 'Task closed', detail: `Closed by ${assignee}. ${slaOf(t).line}.` })
  }
  return t
}

const ABC = 'ABC Franchise · Pune'

function seedTasks(): Task[] {
  seq = 0
  const curated: Task[] = [
    mk({
      id: 'TSK-1048',
      title: 'Verify KYC & release recommendation',
      description:
        'Validate the KYC documents for ABC Franchise, Pune (FR-MH-00124), reconcile the PAN, address and bank details, and submit a release recommendation. Review is complete; manager sign-off is required before Finance can release the security deposit.',
      expectedOutcome: 'Approved KYC pack for Finance handoff, with signed verification checklist, validated bank proof and an auditable release recommendation.',
      priority: 'Critical',
      status: 'Pending Approval',
      department: 'Verification',
      entityId: 'FR-MH-00124',
      entityLabel: ABC,
      source: 'CRM Transaction',
      createdAt: at('2026-10-05T11:00:00'),
      tatHours: 24,
      parentId: 'TSK-1040',
      blockedBy: ['TSK-1048-2'],
      workflowId: 'WF-2081',
      aiRisk: 82,
      riskDrivers: 'Assignee workload: 9 active / capacity 6. Similar approvals exceeded SLA in 7 of the last 10 cases.',
      riskAction: "Recommended: expedite Meera Iyer's sign-off.",
      alertNote: 'manager approval pending',
      slaNote: "Awaiting Meera Iyer's approval since 05 Oct, 17:00. Finance handoff is blocked; SLA continues to run.",
      evidence: [
        { id: 'ev1', name: 'KYC_checklist_ABC.pdf', type: 'PDF', label: 'Document', size: 1.2 * 1024 * 1024, by: 'Rahul Kumar', at: at('2026-10-05T16:20:00'), verified: true },
        { id: 'ev2', name: 'Verification_report_Pune.xlsx', type: 'XLSX', label: 'Report', size: 480 * 1024, by: 'Rahul Kumar', at: at('2026-10-05T16:20:00'), verified: true },
        { id: 'ev3', name: 'Site_verification_photos.zip', type: 'ZIP', label: '6 photos', size: 8.4 * 1024 * 1024, by: 'Rahul Kumar', at: at('2026-10-05T16:20:00'), verified: true },
      ],
      comments: [
        { id: 'c1', by: 'Rahul Kumar', role: 'Current Assignee', at: at('2026-10-06T08:45:00'), text: 'All KYC checks passed. Please approve before 11:00; Finance cannot release the deposit without sign-off.' },
      ],
      audit: [
        { id: 'a1', at: at('2026-10-05T11:00:00'), kind: 'create', title: 'Task created', detail: 'CRM automation created TSK-1048 from franchise transaction FR-MH-00124. SLA started: 24 hours.' },
        { id: 'a2', at: at('2026-10-05T11:05:00'), kind: 'assign', title: 'Assigned to Neha Das', detail: 'Suresh Nair assigned the KYC review. Status: New → Assigned.' },
        { id: 'a3', at: at('2026-10-05T14:30:00'), kind: 'reassign', title: 'Reassigned to Rahul Kumar', detail: "Priya Menon reassigned after Neha's leave request. Status: Assigned → In Progress. Original SLA retained." },
        { id: 'a4', at: at('2026-10-05T16:20:00'), kind: 'evidence', title: 'Evidence added', detail: 'Rahul uploaded KYC checklist, verification report and site photos. Priya completed evidence review.' },
        { id: 'a5', at: at('2026-10-05T17:00:00'), kind: 'submit', title: 'Submitted for approval', detail: 'Rahul submitted the release recommendation to Meera Iyer. Status: In Progress → Pending Approval.' },
        { id: 'a6', at: at('2026-10-06T08:45:00'), kind: 'comment', title: 'Comment · Rahul Kumar', detail: '“All KYC checks passed. Please approve before 11:00; Finance cannot release the deposit without sign-off.”' },
        { id: 'a7', at: at('2026-10-06T09:14:00'), kind: 'ai', title: 'AI risk refreshed · 82% High Risk', detail: 'Workload above capacity and historical approval delays raise breach risk. Manager notified; no SLA pause applied.' },
      ],
    }),
    mk({
      id: 'TSK-1048-1', subtask: true, parentId: 'TSK-1048', depLabel: 'Document & bank proof checks',
      title: 'Document & bank proof checks', expectedOutcome: 'PAN, address and bank proof reconciled', priority: 'High', status: 'Closed',
      department: 'Verification', entityId: 'FR-MH-00124', entityLabel: ABC, source: 'CRM Transaction',
      createdAt: at('2026-10-05T11:05:00'), tatHours: 8, closedAt: at('2026-10-05T16:10:00'),
    }),
    mk({
      id: 'TSK-1048-2', subtask: true, parentId: 'TSK-1048', depLabel: 'Manager sign-off', assignee: 'Meera Iyer',
      title: 'Manager sign-off', expectedOutcome: 'Signed release recommendation', priority: 'Critical', status: 'Pending Approval',
      department: 'Verification', entityId: 'FR-MH-00124', entityLabel: ABC, source: 'CRM Transaction',
      createdAt: at('2026-10-05T17:00:00'), tatHours: 18, approver: 'Meera Iyer',
    }),
    mk({
      id: 'TSK-1049', depLabel: 'Security deposit release', assignee: 'Vikram Shah', owner: 'Vikram Shah', reviewer: 'Vikram Shah', approver: 'Suresh Nair',
      title: 'Security deposit release', expectedOutcome: 'Security deposit released to franchise account', priority: 'High', status: 'Waiting/Blocked',
      department: 'Finance', entityId: 'FR-MH-00124', entityLabel: ABC, source: 'CRM Transaction', workflowId: 'WF-2081',
      createdAt: at('2026-10-05T17:00:00'), tatHours: 24, blockedBy: ['TSK-1048'], alertNote: 'KYC release recommendation (TSK-1048) pending',
    }),
    mk({
      id: 'TSK-1040', assignee: 'Arjun Sethi', title: 'Activate ABC Franchise, Pune', expectedOutcome: 'Franchise activated with KYC, agreement and deposit closed',
      priority: 'High', status: 'In Progress', department: 'Franchise', entityId: 'FR-MH-00124', entityLabel: ABC, source: 'CRM Transaction',
      createdAt: at('2026-10-03T10:00:00'), tatHours: 120, workflowId: 'WF-2081',
    }),

    // ---- Rahul Kumar: curated rows from the CRM-06 grid ----
    mk({ id: 'TSK-1032', title: 'Resolve bank account mismatch', entityId: 'FR-KA-00076', entityLabel: 'Namma ATM Network', source: 'Email', priority: 'High', status: 'Waiting/Blocked', department: 'Verification', createdAt: ago(27), tatHours: 24, expectedOutcome: 'Corrected bank proof received and verified', workflowId: 'WF-2076', alertNote: 'customer response pending', aiRisk: 74 }),
    mk({ id: 'TSK-1057', title: 'Close cash loading discrepancy', entityId: 'ATM-MH-1024', entityLabel: 'Site MH-1024', source: 'Complaint', priority: 'Critical', status: 'In Progress', department: 'Operations', createdAt: ago(10), tatHours: 8, expectedOutcome: 'Reconciled ₹25,000 variance with evidence', aiRisk: 77, alertNote: 'variance evidence outstanding' }),
    mk({ id: 'TSK-1053', title: 'Reconcile security deposit receipt', entityId: 'FR-GJ-00218', entityLabel: 'Patel Cash Solutions', source: 'CRM Transaction', priority: 'High', status: 'In Progress', department: 'Finance', createdAt: ago(8), tatHours: 24, expectedOutcome: 'Deposit ledger updated; receipt attached', workflowId: 'WF-2084', owner: 'Vikram Shah' }),
    mk({ id: 'TSK-1061', title: 'Validate franchise application', entityId: 'FR-UP-00305', entityLabel: 'Awadh Banking Point', source: 'Onboarding', priority: 'Medium', status: 'Assigned', department: 'Franchise', createdAt: ago(4), tatHours: 48, expectedOutcome: 'Complete application ready for KYC review', workflowId: 'WF-2090', owner: 'Arjun Sethi' }),
    mk({ id: 'TSK-1041', title: 'Upload signed franchise agreement', entityId: 'FR-MH-00124', entityLabel: 'ABC Franchise', source: 'Legal', priority: 'High', status: 'Waiting/Blocked', department: 'Legal', createdAt: ago(52), tatHours: 48, expectedOutcome: 'Countersigned agreement in document store', parentId: 'TSK-1040', alertNote: 'countersignature from franchise pending', aiRisk: 71 }),
    mk({ id: 'TSK-1064', kind: 'Daily Routine', title: 'Prepare daily verification report', entityLabel: 'Daily Routine', source: 'Reports', priority: 'Medium', status: 'In Progress', department: 'Verification', createdAt: ago(1), tatHours: 8, expectedOutcome: 'Daily exceptions report sent to team leader' }),
    mk({ id: 'TSK-1065', kind: 'Monthly', title: 'Review October compliance checklist', entityLabel: 'Monthly Tasks', source: 'Governance', priority: 'Low', status: 'New', department: 'Verification', createdAt: ago(6), tatHours: 72, expectedOutcome: 'Checklist completed for 12 franchise sites' }),
    mk({ id: 'TSK-1046', title: 'Approve address verification report', entityId: 'FR-TN-00412', entityLabel: 'Southern Cash Services', source: 'KYC', priority: 'Medium', status: 'Pending Approval', department: 'Verification', createdAt: ago(20), tatHours: 24, expectedOutcome: 'Reviewed address report with sign-off', alertNote: 'approval pending' }),
    mk({ id: 'TSK-1039', title: 'Confirm complaint resolution', entityId: 'SITE-DL-0091', entityLabel: 'Site DL-0091', source: 'Complaint', priority: 'Low', status: 'Closed', department: 'Operations', createdAt: at('2026-10-05T14:00:00'), tatHours: 8, closedAt: at('2026-10-05T20:00:00'), expectedOutcome: 'Customer confirmation recorded; ticket closed', region: 'North' }),

    // ---- Rahul Kumar: rest of the queue ----
    mk({ id: 'TSK-1066', kind: 'Daily Routine', title: 'Verify exception queue', entityLabel: 'Daily Routine', source: 'Verification', priority: 'Medium', status: 'In Progress', department: 'Verification', createdAt: at('2026-10-06T09:00:00'), tatHours: 4, expectedOutcome: 'Exception queue cleared and flagged cases escalated' }),
    mk({ id: 'TSK-1067', kind: 'Daily Routine', title: 'Update KYC tracker sheet', entityLabel: 'Daily Routine', source: 'Reports', priority: 'Low', status: 'Assigned', department: 'Verification', createdAt: at('2026-10-06T08:30:00'), tatHours: 10, expectedOutcome: "Tracker sheet updated with today's KYC outcomes" }),
    mk({ id: 'TSK-1068', kind: 'Daily Routine', title: 'Call back pending document requests', entityLabel: 'Daily Routine', source: 'Email', priority: 'Medium', status: 'Assigned', department: 'Verification', createdAt: at('2026-10-06T08:00:00'), tatHours: 11, expectedOutcome: 'All pending document requests followed up' }),
    mk({ id: 'TSK-1069', kind: 'Daily Routine', title: 'Review site photos for new ATM installs', entityLabel: 'Daily Routine', source: 'Projects', priority: 'Low', status: 'New', department: 'Verification', createdAt: at('2026-10-06T09:00:00'), tatHours: 9, expectedOutcome: 'Geo-tagged photos checked for every new install' }),
    mk({ id: 'TSK-1070', kind: 'Daily Routine', title: 'Prepare handover notes for night shift', entityLabel: 'Daily Routine', source: 'Verification', priority: 'Low', status: 'New', department: 'Verification', createdAt: at('2026-10-06T09:00:00'), tatHours: 16, expectedOutcome: 'Open cases and blockers handed over in writing' }),
    mk({ id: 'TSK-1071', kind: 'Monthly', title: 'Compliance checklist · 12 sites', entityLabel: 'Monthly Tasks', source: 'Governance', priority: 'Medium', status: 'Assigned', department: 'Verification', createdAt: at('2026-10-01T17:00:00'), tatHours: 168, expectedOutcome: 'Compliance checklist signed for 12 franchise sites' }),
    mk({ id: 'TSK-1072', kind: 'Monthly', title: 'Monthly dormant-account audit', entityLabel: 'Monthly Tasks', source: 'Finance', priority: 'Low', status: 'New', department: 'Finance', createdAt: at('2026-10-01T10:00:00'), tatHours: 336, expectedOutcome: 'Dormant franchise accounts flagged to Finance' }),
    mk({ id: 'TSK-1036', kind: 'Monthly', title: 'September KYC exceptions report', entityLabel: 'Monthly Tasks', source: 'Reports', priority: 'Medium', status: 'Closed', department: 'Verification', createdAt: at('2026-10-01T10:00:00'), tatHours: 72, closedAt: at('2026-10-03T16:00:00'), expectedOutcome: 'Exceptions report published to management' }),
    mk({ id: 'TSK-1050', title: 'Verify franchise bank proof re-submission', entityId: 'FR-WB-00183', entityLabel: 'Bengal Rural Payments', source: 'CRM Transaction', priority: 'High', status: 'In Progress', department: 'Verification', createdAt: ago(20), tatHours: 48, expectedOutcome: 'Bank proof validated against penny-drop result' }),
    mk({ id: 'TSK-1052', title: 'Cross-check PAN for Patel Cash director', entityId: 'FR-GJ-00218', entityLabel: 'Patel Cash Solutions', source: 'KYC', priority: 'Medium', status: 'In Progress', department: 'Verification', createdAt: ago(30), tatHours: 72, expectedOutcome: 'PAN verified against NSDL record' }),
    mk({ id: 'TSK-1055', title: 'Site address verification visit report', entityId: 'ST-MH-PUN-00124', entityLabel: 'Kothrud · Paud Road', source: 'Projects', priority: 'Medium', status: 'In Progress', department: 'Projects', createdAt: ago(12), tatHours: 48, expectedOutcome: 'Signed visit report with geo-tagged photos' }),
    mk({ id: 'TSK-1058', title: 'Review ATM DX-MH-01482 cash-loading logs', entityId: 'DX-MH-01482', entityLabel: 'ATM DX-MH-01482', source: 'Operations', priority: 'Low', status: 'In Progress', department: 'Operations', createdAt: ago(18), tatHours: 72, expectedOutcome: 'Variance-free loading log for September' }),
    mk({ id: 'TSK-1059', title: 'Collect GST certificate from franchise', entityId: 'FR-KA-00076', entityLabel: 'Namma ATM Network', source: 'Email', priority: 'Medium', status: 'Waiting/Blocked', department: 'Verification', createdAt: ago(26), tatHours: 72, expectedOutcome: 'GST certificate uploaded and verified', alertNote: 'customer response pending' }),
    mk({ id: 'TSK-1060', title: 'Await legal opinion on lease deed', entityId: 'FR-UP-00305', entityLabel: 'Awadh Banking Point', source: 'Legal', priority: 'High', status: 'Waiting/Blocked', department: 'Legal', createdAt: ago(40), tatHours: 96, expectedOutcome: 'Legal clearance recorded on the lease deed', alertNote: 'legal opinion pending' }),
    mk({ id: 'TSK-1062', title: 'Finance confirmation for SD refund', entityId: 'FR-WB-00183', entityLabel: 'Bengal Rural Payments', source: 'CRM Transaction', priority: 'Medium', status: 'Waiting/Blocked', department: 'Finance', createdAt: ago(22), tatHours: 48, expectedOutcome: 'Finance confirms refund eligibility', alertNote: 'finance dependency' }),
    mk({ id: 'TSK-1063', title: 'Validate address proof for new partner', entityId: 'FR-UP-00305', entityLabel: 'Awadh Banking Point', source: 'Onboarding', priority: 'Low', status: 'Assigned', department: 'Franchise', createdAt: ago(3), tatHours: 72, expectedOutcome: 'Address proof verified for onboarding file' }),
  ]

  // ---- Verification team queue (other members + unassigned), deterministic ----
  const titles = [
    ['Verify PAN & Aadhaar linkage', 'KYC'],
    ['Review bank statement for SD source', 'CRM Transaction'],
    ['Validate shop & establishment licence', 'Onboarding'],
    ['Reconcile site rent agreement details', 'Legal'],
    ['Check police verification certificate', 'KYC'],
    ['Confirm GST registration status', 'Email'],
    ['Verify cancelled cheque details', 'CRM Transaction'],
    ['Inspect site photographs and geo-tags', 'Projects'],
    ['Review dispute documentation', 'Complaint'],
    ['Validate director KYC for partnership', 'KYC'],
    ['Cross-verify electricity bill address', 'Onboarding'],
  ]
  const ents: [string, string][] = [
    ['FR-GJ-00218', 'Patel Cash Solutions'],
    ['FR-KA-00076', 'Namma ATM Network'],
    ['FR-UP-00305', 'Awadh Banking Point'],
    ['FR-WB-00183', 'Bengal Rural Payments'],
    ['FR-MH-00124', 'ABC Franchise'],
    ['FR-TN-00412', 'Southern Cash Services'],
  ]
  const members = ['Sana Ali', 'Neha Das', 'Karan Mehta', 'Priya Menon']
  const team: Task[] = []
  for (let i = 0; i < 44; i++) {
    const [title, source] = titles[i % titles.length]
    const [eid, elabel] = ents[(i * 5) % ents.length]
    const unassigned = i < 9
    const status: TaskStatus = unassigned ? 'New' : i < 13 ? 'Pending Approval' : i % 4 === 0 ? 'Waiting/Blocked' : i % 3 === 0 ? 'Assigned' : 'In Progress'
    const elapsed = 1 + ((i * 7) % 30)
    const tat = elapsed > 18 ? 48 : [24, 48, 72][i % 3]
    team.push(
      mk({
        id: `TSK-${1100 + i}`,
        title,
        entityId: eid,
        entityLabel: elabel,
        source,
        priority: PRIORITIES[(i * 3 + 1) % 4],
        status,
        department: 'Verification',
        assignee: unassigned ? '' : members[i % members.length],
        createdAt: ago(elapsed, (i * 13) % 60),
        tatHours: tat,
        expectedOutcome: `${title.replace(/^(Verify|Review|Validate|Reconcile|Check|Confirm|Inspect|Cross-verify)\s/, '')} completed with evidence`,
        alertNote: status === 'Waiting/Blocked' ? 'customer response pending' : undefined,
      }),
    )
  }
  return [...curated, ...team]
}

export type RoutineItem = { id: string; time: string; text: string; done: boolean; taskId?: string }
const seedRoutine = (): RoutineItem[] => [
  { id: 'r1', time: '08:30', text: 'Check overnight SLA alerts', done: true },
  { id: 'r2', time: '09:00', text: 'Review new KYC submissions', done: true },
  { id: 'r3', time: '09:30', text: 'Verify exception queue and prepare daily report', done: false, taskId: 'TSK-1064' },
  { id: 'r4', time: '11:00', text: 'Follow up on pending document requests', done: true },
  { id: 'r5', time: '14:00', text: 'Update verification tracker', done: true },
  { id: 'r6', time: '17:30', text: 'Send end-of-day summary to team leader', done: false },
]

export type TasksState = { tasks: Task[]; routine: RoutineItem[]; viewAs: 'Employee' | 'Team Leader' }
export const tasksStore = createStore<TasksState>('dexter.tasks.v1', () => ({ tasks: seedTasks(), routine: seedRoutine(), viewAs: 'Employee' }))

/* ------------------------------ actions ------------------------------ */

export const CURRENT_EMPLOYEE = 'Rahul Kumar'
export const CURRENT_LEAD = 'Priya Menon'

export const getTask = (id: string) => tasksStore.get().tasks.find((t) => t.id === id)

function patch(id: string, fn: (t: Task) => Task) {
  tasksStore.set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)) }))
}

export function log(id: string, kind: AuditKind, title: string, detail: string) {
  patch(id, (t) => ({ ...t, audit: [...t.audit, { id: uid('a') + Date.now().toString(36), at: iso(NOW), kind, title, detail }] }))
}

export function nextTaskId() {
  const max = tasksStore.get().tasks.reduce((m, t) => {
    const n = /^TSK-(\d+)$/.exec(t.id)
    return n ? Math.max(m, +n[1]) : m
  }, 1000)
  return `TSK-${max + 1}`
}

export type NewTaskInput = {
  title: string
  description: string
  expectedOutcome: string
  priority: Priority
  department: Dept
  assignee: string
  dueMs: number
  parentId?: string
  entityId?: string
  entityLabel?: string
  source?: string
  createdBy?: string
}

export function createTask(x: NewTaskInput): Task {
  const id = nextTaskId()
  const tat = Math.max(1, Math.ceil((x.dueMs - NOW) / HOUR))
  const by = x.createdBy ?? 'Ananya Sharma'
  const t: Task = {
    id,
    title: x.title,
    description: x.description || x.title,
    expectedOutcome: x.expectedOutcome,
    priority: x.priority,
    status: x.assignee ? 'Assigned' : 'New',
    department: x.department,
    region: regionOf(x.entityId),
    kind: 'Ad-hoc',
    source: x.source ?? 'Manual',
    entityId: x.entityId || undefined,
    entityLabel: x.entityLabel || x.entityId || x.department,
    assignee: x.assignee,
    owner: by,
    reviewer: 'Priya Menon',
    approver: 'Meera Iyer',
    createdAt: iso(NOW),
    tatHours: tat,
    parentId: x.parentId || undefined,
    blockedBy: [],
    evidence: [],
    comments: [],
    audit: [
      { id: uid('a') + 'n', at: iso(NOW), kind: 'create', title: 'Task created', detail: `${by} created ${id}${x.source && x.source !== 'Manual' ? ` from ${x.source}` : ''}. SLA started: ${tat} hours.` },
      ...(x.assignee ? [{ id: uid('a') + 'm', at: iso(NOW), kind: 'assign' as const, title: `Assigned to ${x.assignee}`, detail: 'Status: New → Assigned.' }] : []),
    ],
  }
  tasksStore.set((s) => ({ ...s, tasks: [t, ...s.tasks] }))
  return t
}

export function reassign(id: string, to: string, by: string, reason: string) {
  const t = getTask(id)
  if (!t || t.assignee === to) return
  patch(id, (x) => ({ ...x, assignee: to, status: x.status === 'New' && to ? 'Assigned' : x.status }))
  log(id, 'reassign', `Reassigned to ${to || 'Unassigned'}`, `${by} reassigned from ${t.assignee || 'Unassigned'}${reason ? `: ${reason}` : ''}. Original SLA retained.`)
}

export const openBlockers = (t: Task, all: Task[]) => t.blockedBy.map((b) => all.find((x) => x.id === b)).filter((b): b is Task => !!b && b.status !== 'Closed')
export const blocksOf = (t: Task, all: Task[]) => all.filter((x) => x.blockedBy.includes(t.id))
export const subtasksOf = (t: Task, all: Task[]) => all.filter((x) => x.parentId === t.id && x.subtask)
export const needsApproval = (t: Task) => t.kind === 'Ad-hoc' && !!t.approver

export type Action = 'assign' | 'start' | 'submit' | 'approve' | 'return' | 'close' | 'resume'
export type ActionResult = { ok: boolean; message: string; unblocked?: string[] }

/** Lifecycle engine: New → Assigned → In Progress → Pending Approval → Closed. SLA never pauses. */
export function transition(id: string, action: Action, actor: string, note = ''): ActionResult {
  const all = tasksStore.get().tasks
  const t = all.find((x) => x.id === id)
  if (!t) return { ok: false, message: 'Task not found.' }
  const blockers = openBlockers(t, all)
  const set = (status: TaskStatus, extra: Partial<Task> = {}) => patch(id, (x) => ({ ...x, status, ...extra }))

  switch (action) {
    case 'assign':
      if (t.status !== 'New') return { ok: false, message: 'Only New tasks can be assigned.' }
      if (!t.assignee) return { ok: false, message: 'Choose an assignee first (Reassign).' }
      set('Assigned')
      log(id, 'assign', `Assigned to ${t.assignee}`, `${actor} confirmed the assignment. Status: New → Assigned.`)
      return { ok: true, message: `${id} assigned to ${t.assignee}.` }
    case 'start':
      if (t.status !== 'Assigned') return { ok: false, message: 'Only Assigned tasks can be started.' }
      set('In Progress')
      log(id, 'start', 'Work started', `${actor} started work. Status: Assigned → In Progress.`)
      return { ok: true, message: `${id} is now In Progress.` }
    case 'resume':
      if (t.status !== 'Waiting/Blocked') return { ok: false, message: 'Task is not waiting.' }
      if (blockers.length) return { ok: false, message: `Still blocked by ${blockers.map((b) => b.id).join(', ')}.` }
      set('In Progress')
      log(id, 'start', 'Resumed', `${actor} resumed work. Status: Waiting/Blocked → In Progress.`)
      return { ok: true, message: `${id} resumed.` }
    case 'submit':
      if (t.status !== 'In Progress') return { ok: false, message: 'Only In Progress tasks can be submitted.' }
      if (!t.evidence.length) return { ok: false, message: 'Upload at least one evidence file before submitting for approval.' }
      set('Pending Approval', { approved: false })
      log(id, 'submit', 'Submitted for approval', `${actor} submitted to ${t.approver}. Status: In Progress → Pending Approval.${note ? ` Note: ${note}` : ''}`)
      return { ok: true, message: `Submitted to ${t.approver} for approval.` }
    case 'approve': {
      if (t.status !== 'Pending Approval') return { ok: false, message: 'Nothing to approve.' }
      const approvalSubs = subtasksOf(t, all).filter((s) => s.status === 'Pending Approval')
      approvalSubs.forEach((s) => {
        patch(s.id, (x) => ({ ...x, status: 'Closed', closedAt: iso(NOW), approved: true }))
        log(s.id, 'approve', 'Approved', `${actor} signed off. Status: Pending Approval → Closed.`)
      })
      patch(id, (x) => ({ ...x, approved: true }))
      log(id, 'approve', `Approved by ${actor}`, `${actor} approved the submission${note ? `: ${note}` : ''}.${approvalSubs.length ? ` Sub-task ${approvalSubs.map((s) => s.id).join(', ')} completed.` : ''} Ready to close.`)
      return { ok: true, message: `Approved. ${id} can now be closed.` }
    }
    case 'return':
      if (t.status !== 'Pending Approval') return { ok: false, message: 'Nothing to return.' }
      set('In Progress', { approved: false })
      log(id, 'return', `Returned by ${actor}`, `Sent back for rework${note ? `: ${note}` : ''}. Status: Pending Approval → In Progress. SLA continues to run.`)
      return { ok: true, message: `${id} returned to ${t.assignee || 'assignee'} for rework.` }
    case 'close': {
      if (t.status === 'Closed') return { ok: false, message: 'Already closed.' }
      if (blockers.length) return { ok: false, message: `Cannot close: ${blockers.map((b) => `${b.id} ${b.depLabel ?? b.title}`).join(', ')} is still open.` }
      if (needsApproval(t) && !(t.status === 'Pending Approval' && t.approved)) return { ok: false, message: `Approval from ${t.approver} is required before closing.` }
      if (!needsApproval(t) && !['In Progress', 'Pending Approval'].includes(t.status)) return { ok: false, message: 'Start the task before closing it.' }
      const from = t.status
      set('Closed', { closedAt: iso(NOW) })
      const s = slaOf({ ...t, status: 'Closed', closedAt: iso(NOW) })
      log(id, 'close', 'Task closed', `${actor} closed the task. Status: ${from} → Closed. ${s.line} (${s.ratio}).`)
      // auto-unblock dependents
      const unblocked: string[] = []
      for (const d of tasksStore.get().tasks.filter((x) => x.blockedBy.includes(id))) {
        const still = openBlockers(d, tasksStore.get().tasks)
        if (!still.length && d.status === 'Waiting/Blocked') {
          patch(d.id, (x) => ({ ...x, status: x.assignee ? 'Assigned' : 'New' }))
          log(d.id, 'unblock', 'Unblocked automatically', `${id} closed; dependency cleared. Status: Waiting/Blocked → ${d.assignee ? 'Assigned' : 'New'}.`)
          unblocked.push(d.id)
        }
      }
      if (unblocked.length) log(id, 'unblock', `Unblocked ${unblocked.join(', ')}`, `Closing ${id} unblocked ${unblocked.join(', ')} automatically.`)
      return { ok: true, message: unblocked.length ? `${id} closed. ${unblocked.join(', ')} unblocked automatically.` : `${id} closed.`, unblocked }
    }
  }
}

export function addEvidence(id: string, f: { name: string; size: number }, by: string) {
  const ext = (f.name.split('.').pop() ?? '').toUpperCase()
  const label = ['JPG', 'JPEG', 'PNG'].includes(ext) ? 'Photo' : ext === 'XLSX' ? 'Report' : 'Document'
  patch(id, (t) => ({ ...t, evidence: [...t.evidence, { id: uid('ev') + Date.now().toString(36), name: f.name, type: ext, label, size: f.size, by, at: iso(NOW), verified: false }] }))
  log(id, 'evidence', 'Evidence added', `${by} uploaded ${f.name}. Awaiting verification.`)
}

export function toggleVerify(id: string, evId: string, by: string) {
  const ev = getTask(id)?.evidence.find((e) => e.id === evId)
  if (!ev) return
  patch(id, (t) => ({ ...t, evidence: t.evidence.map((e) => (e.id === evId ? { ...e, verified: !e.verified } : e)) }))
  log(id, 'verify', ev.verified ? 'Verification withdrawn' : 'Evidence verified', `${by} ${ev.verified ? 'marked' : 'verified'} ${ev.name}${ev.verified ? ' as unverified' : ''}.`)
}

export function addComment(id: string, by: string, text: string) {
  const p = person(by)
  const t = getTask(id)
  const role = t?.assignee === by ? 'Current Assignee' : t?.approver === by ? 'Approver' : t?.reviewer === by ? 'Reviewer' : p.role
  patch(id, (x) => ({ ...x, comments: [...x.comments, { id: uid('c') + Date.now().toString(36), by, role, at: iso(NOW), text }] }))
  log(id, 'comment', `Comment · ${by}`, `“${text}”`)
}

export const mentionsIn = (text: string) => PEOPLE.filter((p) => text.includes('@' + p.name)).map((p) => p.name)
