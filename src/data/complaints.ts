import { createStore } from '@/lib/store'

/* ------------------------------------------------------------------------------------------------
 * Complaints module mock data (Operations › Complaints).
 * Demo clock: the design is frozen at 07 Oct 2026, 09:14 IST (CMP-1048 resolution deadline 06 Oct 10:30
 * → "Breach by 22h 44m"). The clock starts there on every page load and then ticks with real time.
 * ---------------------------------------------------------------------------------------------- */

export const NOW_BASE = Date.parse('2026-10-07T09:14:00+05:30')
const LOADED_AT = Date.now()
/** Current demo time in ms (fixed base + real elapsed time since load). */
export const nowMs = () => NOW_BASE + (Date.now() - LOADED_AT)

export const PERIOD_FROM = '2026-10-01'
export const PERIOD_TO = '2026-10-06'
export const CURRENT_USER = 'Paras Dubey'
export const NETWORK_ATM_COUNT = 1284 // commissioned assets in the asset register (detail kept for ATMs in ATM_MASTER)

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low']
export const SLA_HOURS: Record<Priority, number> = { Critical: 24, High: 48, Medium: 72, Low: 120 }
export const RESPONSE_MIN: Record<Priority, number> = { Critical: 30, High: 60, Medium: 120, Low: 240 }

export type Department = 'HD Team' | 'Field Service' | 'Network Operations' | 'Cash Management' | 'Vendor Management'
export const DEPARTMENTS: Department[] = ['HD Team', 'Field Service', 'Network Operations', 'Cash Management', 'Vendor Management']
/** Escalation matrix: L1 → L2 → L3 roles per department. */
export const ESCALATION_MATRIX: Record<Department, [string, string, string]> = {
  'HD Team': ['HD Team', 'RM', 'Operations Head'],
  'Field Service': ['Field Service desk', 'Service Manager', 'Operations Head'],
  'Network Operations': ['NOC Team', 'NOC Lead', 'Operations Head'],
  'Cash Management': ['Cash Ops Team', 'RM', 'Operations Head'],
  'Vendor Management': ['Vendor Desk', 'Procurement Manager', 'Operations Head'],
}
const ROLE_PEOPLE: Record<string, string> = {
  'Service Manager': 'Meera Iyer',
  'NOC Lead': 'Priya Menon',
  'Procurement Manager': 'Vikram Shah',
  'Operations Head': 'Suresh Nair',
}

export const REPORTING_AUTHORITIES = [
  'Franchise representative (FR)',
  'Field Officer',
  'Site engineer',
  'Bank / sponsor',
  'Customer',
  'Internal monitoring (NOC)',
]
export const channelFor = (authority: string) =>
  authority.startsWith('Franchise') || authority === 'Field Officer'
    ? 'FR / Field Officer Mobile App'
    : authority === 'Site engineer'
      ? 'Engineer app'
      : authority.startsWith('Bank')
        ? 'Email'
        : authority === 'Customer'
          ? 'Call centre'
          : 'Remote monitoring'

export const CATEGORIES: Record<string, string[]> = {
  'Power & UPS': ['Battery failure', 'UPS alarm', 'Mains power outage'],
  Network: ['Network offline', 'Network unstable', 'Router fault'],
  'Cash dispenser': ['Dispenser jam', 'Cash sensor error', 'Note reject'],
  'Card reader': ['Card reader fault', 'Card capture'],
  'Receipt printer': ['Printer fault', 'Paper jam'],
  'Cooling & environment': ['Cooling fan alarm', 'AC failure'],
  'Software & EJ': ['Application hang', 'EJ upload failure'],
}
export const CATEGORY_LIST = Object.keys(CATEGORIES)
/** Label used in recurring-issue charts. */
export const RECURRING_LABEL: Record<string, string> = {
  'Power & UPS': 'Power / UPS battery',
  Network: 'Network interruption',
  'Cash dispenser': 'Cash dispenser faults',
  'Receipt printer': 'Receipt printer',
  'Card reader': 'Card reader',
  'Cooling & environment': 'Cooling & environment',
  'Software & EJ': 'Software & EJ',
}
export const RECURRING_ADVICE: Record<string, string> = {
  'Power & UPS': 'Inspect charging quality',
  Network: 'Review carrier stability',
  'Cash dispenser': 'Check preventive servicing',
  'Receipt printer': 'Validate replacement stock',
  'Card reader': 'Audit reader firmware',
  'Cooling & environment': 'Clean filters before summer load',
  'Software & EJ': 'Patch the EJ upload agent',
}
export const COMPONENTS = [
  'UPS battery · Exide 12V 42Ah',
  'UPS unit · APC 2kVA',
  'Router · Airtel 4G router',
  'Dispenser module · NCR S2',
  'Cash sensor · NCR S2',
  'Card reader · NCR-CR22',
  'Receipt printer · TP-07',
  'Cooling fan · 120mm',
  'Air conditioner · 1.5T split',
  'Application software · EJ module',
]
export const DEFAULT_COMPONENT: Record<string, string> = {
  'Battery failure': COMPONENTS[0],
  'UPS alarm': COMPONENTS[1],
  'Mains power outage': COMPONENTS[1],
  'Network offline': COMPONENTS[2],
  'Network unstable': COMPONENTS[2],
  'Router fault': COMPONENTS[2],
  'Dispenser jam': COMPONENTS[3],
  'Cash sensor error': COMPONENTS[4],
  'Note reject': COMPONENTS[3],
  'Card reader fault': COMPONENTS[5],
  'Card capture': COMPONENTS[5],
  'Printer fault': COMPONENTS[6],
  'Paper jam': COMPONENTS[6],
  'Cooling fan alarm': COMPONENTS[7],
  'AC failure': COMPONENTS[8],
  'Application hang': COMPONENTS[9],
  'EJ upload failure': COMPONENTS[9],
}
export const DEPARTMENT_FOR: Record<string, Department> = {
  'Power & UPS': 'HD Team',
  Network: 'Network Operations',
  'Cash dispenser': 'Field Service',
  'Card reader': 'Field Service',
  'Receipt printer': 'HD Team',
  'Cooling & environment': 'Field Service',
  'Software & EJ': 'HD Team',
}
/** Component group used for replacement counts. */
export const REPLACEMENT_GROUPS = ['UPS batteries', 'Card readers', 'Receipt printers', 'Dispenser modules', 'Cooling fans', 'Routers']

export const OWNERS = ['Paras Dubey', 'Rohit Verma', 'Priya Nair', 'Kavita Reddy', 'Amit Desai', 'Rahul Kumar']
export const SUB_STATUSES = ['Assigned', 'In progress', 'Pending', 'Awaiting spare', 'Awaiting vendor', 'Awaiting repair']

/* --------------------------------------- ATM master --------------------------------------------- */

export type Atm = {
  atmId: string
  siteId: string
  siteName: string
  address: string
  city: string
  state: string
  zone: string
  franchiseId: string
  franchise: string
  complainant: string
  mobile: string
  email: string
  projectId: string
  project: string
  model: string
  serial: string
  installed: string
  ssm: string
  rm: string
  engineer: string
  engineerPhone: string
  battery: string
}

type StateSetup = {
  state: string
  franchiseId: string
  franchise: string
  complainant: string
  mobile: string
  email: string
  projectId: string
  project: string
  ssm: string
  rm: string
  engineers: [string, string][]
}
const STATES: Record<string, StateSetup> = {
  MH: { state: 'Maharashtra', franchiseId: 'FR-MH-00124', franchise: 'Shree Sai Financial Services', complainant: 'Rahul Mehta', mobile: '+91 98765 43210', email: 'rahul.mehta@shreesai.in', projectId: 'PRJ-021', project: 'WLA Maharashtra', ssm: 'Suresh Patil', rm: 'Neha Deshmukh', engineers: [['Amit Jadhav', '+91 98220 45180'], ['Manish Kale', '+91 98231 66402']] },
  GJ: { state: 'Gujarat', franchiseId: 'FR-GJ-00218', franchise: 'Patel Cash Solutions', complainant: 'Kiran Patel', mobile: '+91 98250 11842', email: 'kiran.patel@patelcash.in', projectId: 'PRJ-024', project: 'WLA Gujarat', ssm: 'Hitesh Joshi', rm: 'Jignesh Patel', engineers: [['Kunal Shah', '+91 98793 20415']] },
  KA: { state: 'Karnataka', franchiseId: 'FR-KA-00076', franchise: 'Namma ATM Network', complainant: 'Manjunath Hegde', mobile: '+91 98450 33721', email: 'manjunath@nammaatm.in', projectId: 'PRJ-026', project: 'WLA Karnataka', ssm: 'Ravi Kumar', rm: 'Lakshmi Rao', engineers: [['Santosh Gowda', '+91 99000 48213']] },
  UP: { state: 'Uttar Pradesh', franchiseId: 'FR-UP-00305', franchise: 'Awadh Banking Point', complainant: 'Sanjay Srivastava', mobile: '+91 94150 27736', email: 'sanjay@awadhbp.in', projectId: 'PRJ-028', project: 'WLA Uttar Pradesh', ssm: 'Alok Mishra', rm: 'Deepak Singh', engineers: [['Vivek Yadav', '+91 94155 61207']] },
  TN: { state: 'Tamil Nadu', franchiseId: 'FR-TN-00142', franchise: 'Chennai Cash Point', complainant: 'Karthik Raman', mobile: '+91 98410 72290', email: 'karthik@chennaicash.in', projectId: 'PRJ-031', project: 'WLA Tamil Nadu', ssm: 'Arun Prakash', rm: 'Meenakshi Iyer', engineers: [['Senthil Kumar', '+91 98404 11963']] },
  RJ: { state: 'Rajasthan', franchiseId: 'FR-RJ-00267', franchise: 'Marudhar Money Services', complainant: 'Mahendra Singh', mobile: '+91 94140 58826', email: 'mahendra@marudharmoney.in', projectId: 'PRJ-033', project: 'WLA Rajasthan', ssm: 'Mahesh Rathore', rm: 'Anil Choudhary', engineers: [['Rakesh Meena', '+91 94141 30778']] },
  WB: { state: 'West Bengal', franchiseId: 'FR-WB-00183', franchise: 'Bengal Rural Payments', complainant: 'Sourav Ghosh', mobile: '+91 98300 24519', email: 'sourav@bengalrural.in', projectId: 'PRJ-035', project: 'WLA West Bengal', ssm: 'Subhash Das', rm: 'Rina Sen', engineers: [['Arindam Paul', '+91 98311 70642']] },
}

// [atmId, area, city, address, model, serial, installed, engineer index]
const ATM_ROWS: [string, string, string, string, string, string, string, number][] = [
  ['ATM-MH-1024', 'MG Road', 'Pune', '101, City Plaza, MG Road, Pune 411001', 'NCR SelfServ 22e', 'NCR-PN-221084', '18 Mar 2023', 0],
  ['ATM-MH-1045', 'Kothrud', 'Pune', 'Shop 4, Paud Road, Kothrud, Pune 411038', 'NCR SelfServ 22e', 'NCR-PN-221145', '02 Jun 2023', 0],
  ['ATM-MH-1032', 'Hadapsar', 'Pune', '12, Magarpatta Road, Hadapsar, Pune 411028', 'NCR SelfServ 22e', 'NCR-PN-221102', '11 Apr 2023', 0],
  ['ATM-MH-1028', 'Baner', 'Pune', '7, Baner Road, Baner, Pune 411045', 'Hyosung MX 2800T', 'HYO-28-77310', '25 Jan 2023', 0],
  ['ATM-MH-1041', 'Nashik Road', 'Nashik', '3, Bytco Point, Nashik Road, Nashik 422101', 'NCR SelfServ 22e', 'NCR-PN-221131', '14 May 2023', 1],
  ['ATM-MH-1036', 'Wakad', 'Pune', '22, Datta Mandir Road, Wakad, Pune 411057', 'Hyosung MX 2800T', 'HYO-28-77342', '09 Feb 2023', 1],
  ['ATM-MH-1019', 'Thane West', 'Thane', '5, Gokhale Road, Thane West 400602', 'Diebold 5550', 'DB-55-40917', '30 Nov 2022', 1],
  ['ATM-GJ-0218', 'Navrangpura', 'Ahmedabad', '14, CG Road, Navrangpura, Ahmedabad 380009', 'NCR SelfServ 22e', 'NCR-AH-118204', '07 Jul 2022', 0],
  ['ATM-GJ-0220', 'Maninagar', 'Ahmedabad', '9, Jawahar Chowk, Maninagar, Ahmedabad 380008', 'Hyosung MX 2800T', 'HYO-28-60215', '19 Aug 2022', 0],
  ['ATM-GJ-0231', 'Adajan', 'Surat', '31, Honey Park Road, Adajan, Surat 395009', 'Diebold 5550', 'DB-55-38822', '04 Oct 2022', 0],
  ['ATM-KA-0076', 'Jayanagar', 'Bengaluru', '45, 11th Main, Jayanagar, Bengaluru 560041', 'NCR SelfServ 22e', 'NCR-BL-090776', '21 Mar 2022', 0],
  ['ATM-KA-0081', 'Whitefield', 'Bengaluru', '8, ITPL Main Road, Whitefield, Bengaluru 560066', 'Hyosung MX 2800T', 'HYO-28-51081', '16 May 2022', 0],
  ['ATM-KA-0094', 'Mysuru Road', 'Mysuru', '2, Mysuru Road, Mysuru 570008', 'Diebold 5550', 'DB-55-31094', '28 Jun 2022', 0],
  ['ATM-UP-0305', 'Hazratganj', 'Lucknow', '17, Hazratganj Market, Lucknow 226001', 'NCR SelfServ 22e', 'NCR-LK-130305', '12 Dec 2022', 0],
  ['ATM-UP-0311', 'Gomti Nagar', 'Lucknow', '40, Vibhuti Khand, Gomti Nagar, Lucknow 226010', 'Hyosung MX 2800T', 'HYO-28-63311', '23 Jan 2023', 0],
  ['ATM-UP-0322', 'Civil Lines', 'Kanpur', '6, Mall Road, Civil Lines, Kanpur 208001', 'Diebold 5550', 'DB-55-42322', '06 Mar 2023', 0],
  ['ATM-TN-0142', 'T. Nagar', 'Chennai', '58, Usman Road, T. Nagar, Chennai 600017', 'NCR SelfServ 22e', 'NCR-CH-100142', '15 Sep 2022', 0],
  ['ATM-TN-0150', 'Anna Nagar', 'Chennai', '11, 2nd Avenue, Anna Nagar, Chennai 600040', 'Hyosung MX 2800T', 'HYO-28-58150', '03 Nov 2022', 0],
  ['ATM-RJ-0267', 'Malviya Nagar', 'Jaipur', '27, JLN Marg, Malviya Nagar, Jaipur 302017', 'NCR SelfServ 22e', 'NCR-JP-120267', '20 Oct 2022', 0],
  ['ATM-RJ-0272', 'Sardarpura', 'Jodhpur', '4, C Road, Sardarpura, Jodhpur 342003', 'Diebold 5550', 'DB-55-36272', '01 Dec 2022', 0],
  ['ATM-WB-0183', 'Salt Lake', 'Kolkata', 'BD-12, Sector 1, Salt Lake, Kolkata 700064', 'NCR SelfServ 22e', 'NCR-KO-110183', '08 Aug 2022', 0],
  ['ATM-WB-0190', 'Howrah Maidan', 'Howrah', '3, GT Road, Howrah 711101', 'Hyosung MX 2800T', 'HYO-28-55190', '17 Sep 2022', 0],
]

export const ATM_MASTER: Atm[] = ATM_ROWS.map(([atmId, area, city, address, model, serial, installed, eng], i) => {
  const code = atmId.split('-')[1]
  const s = STATES[code]
  const [engineer, engineerPhone] = s.engineers[eng] ?? s.engineers[0]
  const num = atmId.split('-')[2]
  return {
    atmId,
    siteId: `SITE-${num}`,
    siteName: `${area}, ${city}`,
    address,
    city,
    state: s.state,
    zone: `${city === 'Thane' ? 'Mumbai' : city} Zone`,
    franchiseId: s.franchiseId,
    franchise: s.franchise,
    complainant: s.complainant,
    mobile: s.mobile,
    email: s.email,
    projectId: s.projectId,
    project: s.project,
    model,
    serial,
    installed,
    ssm: s.ssm,
    rm: s.rm,
    engineer,
    engineerPhone,
    battery: atmId === 'ATM-MH-1024' ? 'EX-42-09023 · Replaced 09 Sep 2026' : `EX-42-0${7100 + i * 37} · Installed ${installed}`,
  }
})
export const atmById = (id: string) => ATM_MASTER.find((a) => a.atmId === id)
export const STATE_LIST = [...new Set(ATM_MASTER.map((a) => a.state))]
export const PROJECT_LIST = [...new Set(ATM_MASTER.map((a) => `${a.project} · ${a.projectId}`))]
export const ENGINEERS = [...new Set(ATM_MASTER.map((a) => `${a.engineer} · ${a.engineerPhone}`))]

/** L1/L2/L3 names for a department + ATM (RM comes from the ATM's state mapping). */
export function escalationChain(dept: Department, atm?: Atm): { level: number; role: string; person: string }[] {
  return ESCALATION_MATRIX[dept].map((role, i) => ({
    level: i + 1,
    role,
    person: i === 0 ? role : role === 'RM' ? (atm?.rm ?? 'Regional Manager') : (ROLE_PEOPLE[role] ?? role),
  }))
}

/* --------------------------------------- Complaint types ---------------------------------------- */

export type CTask = { id: string; title: string; owner: string; due: string; dependency: string; done?: boolean }
export type CEmail = { id: string; subject: string; status: string; route: string; at: string; meta: string }
export type VisitStatus = 'Scheduled' | 'Awaiting confirmation' | 'Awaiting spare' | 'Confirmed' | 'Completed'
export type CVisit = { id: string; at: string; purpose: string; engineer: string; status: VisitStatus; note: string }
export type CVendor = { id: string; vendor: string; item: string; status: 'Pending' | 'Received'; lastChased?: string; expectedBy?: string; log: string[] }
export type SpareStatus = 'Awaiting approval' | 'Approved' | 'In transit' | 'Delivered'
export type CSpare = { id: string; part: string; model: string; depot: string; status: SpareStatus; eta?: string; cost?: number }
export type CAudit = { at: string; title: string; meta: string }
export type Impact = 'Down' | 'Degraded' | 'None'
export type Outcome = 'Pending' | 'Resolved' | 'Partially resolved' | 'Not resolved'
export type AiInfo = {
  summary: string
  nextAction: string
  faultLabel: string
  faultConfidence: number
  score: number
  confidence: number
  horizon: string
  horizonH: number
  prediction: string
  reason: string
  driver: string
  updated: string
  reviewed?: { by: string; at: string }
  acceptedTask?: string
}

export type Complaint = {
  id: string
  receivedAt: string
  reportingAuthority: string
  channel: string
  atmId: string
  component: string
  category: string
  subcategory: string
  priority: Priority
  title: string
  details: string
  attachments: string[]
  forwardedOn: string
  department: Department
  docket: string
  owner: string
  status: 'Open' | 'Closed'
  subStatus: string
  respondedAt?: string
  reminderDate?: string
  lastReminder?: { at: string; task: string }
  lastAction: string
  remark: string
  proposedFix: string
  outcome: Outcome
  outcomeDate?: string
  outcomeRemark: string
  redressalDate?: string
  frSignOff: boolean
  hdValidation: boolean
  evidence: boolean
  closedAt?: string
  escalationLevel: 1 | 2 | 3
  escalations: { level: number; at: string; note: string }[]
  impact: Impact
  downtimeH?: number
  replacement?: string
  tasks: CTask[]
  emails: CEmail[]
  visits: CVisit[]
  vendors: CVendor[]
  spares: CSpare[]
  audit: CAudit[]
  ai?: AiInfo
}

export type MaintenanceTask = { id: string; atmId: string; title: string; owner: string; due: string; createdAt: string; source: string }

/* ------------------------------------------ helpers --------------------------------------------- */

const H = 3_600_000
export const ist = (d: string, t = '10:00') => `${d}T${t}:00+05:30`
const addH = (iso: string, h: number) => new Date(Date.parse(iso) + h * H).toISOString()

const fmtParts = (ms: number, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', ...opts }).format(ms).replace('Sept', 'Sep')
/** "05 Oct, 10:30" */
export const fmtDT = (iso?: string | number) =>
  iso == null ? '—' : `${fmtParts(typeof iso === 'number' ? iso : Date.parse(iso), { day: '2-digit', month: 'short' })}, ${fmtParts(typeof iso === 'number' ? iso : Date.parse(iso), { hour: '2-digit', minute: '2-digit', hour12: false })}`
/** "05 Oct 2026" */
export const fmtDate = (iso?: string | number) => (iso == null || iso === '' ? '—' : fmtParts(typeof iso === 'number' ? iso : Date.parse(iso), { day: '2-digit', month: 'short', year: 'numeric' }))
/** "05 Oct" */
export const fmtDay = (iso: string | number) => fmtParts(typeof iso === 'number' ? iso : Date.parse(iso), { day: '2-digit', month: 'short' })
/** "10:30" */
export const fmtTime = (iso: string | number) => fmtParts(typeof iso === 'number' ? iso : Date.parse(iso), { hour: '2-digit', minute: '2-digit', hour12: false })
/** IST calendar day "2026-10-05" */
export const istDay = (iso: string | number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(typeof iso === 'number' ? iso : Date.parse(iso))
/** "22h 44m" */
export const fmtDur = (ms: number) => {
  const m = Math.max(0, Math.round(Math.abs(ms) / 60000))
  const h = Math.floor(m / 60)
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
}
export const fmtHours = (h: number) => `${h.toFixed(1)}h`
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export type SlaInfo = { deadline: number; remaining: number; breached: boolean; atRisk: boolean; elapsed: number; met?: boolean; label: string; tone: 'red' | 'amber' | 'green' | 'blue' }
export const AT_RISK_HOURS = 12

export function sla(c: Complaint, now = nowMs()): SlaInfo {
  const start = Date.parse(c.receivedAt)
  const deadline = start + SLA_HOURS[c.priority] * H
  if (c.status === 'Closed') {
    const end = Date.parse(c.closedAt ?? c.receivedAt)
    const met = end <= deadline
    return { deadline, remaining: deadline - end, breached: !met, atRisk: false, elapsed: end - start, met, label: met ? 'Closed within SLA' : `Closed · breached ${fmtDur(end - deadline)}`, tone: met ? 'green' : 'red' }
  }
  const remaining = deadline - now
  const breached = remaining < 0
  const atRisk = !breached && remaining <= AT_RISK_HOURS * H
  return {
    deadline,
    remaining,
    breached,
    atRisk,
    elapsed: now - start,
    label: breached ? `Breached ${fmtDur(-remaining)}` : `Due in ${fmtDur(remaining)}`,
    tone: breached ? 'red' : atRisk ? 'amber' : 'blue',
  }
}

export const isOpen = (c: Complaint) => c.status === 'Open'
export const statusLabel = (c: Complaint) => (c.status === 'Closed' ? 'Closed' : /pending|awaiting/i.test(c.subStatus) ? 'Pending' : 'Open')
export const tatHours = (c: Complaint) => (c.closedAt ? (Date.parse(c.closedAt) - Date.parse(c.receivedAt)) / H : 0)
export const pendingDays = (receivedIso: string, now = nowMs()) =>
  Math.max(0, Math.round((Date.parse(istDay(now)) - Date.parse(istDay(receivedIso))) / (24 * H)))

export function taskStatus(t: CTask, now = nowMs()) {
  if (t.done) return 'Completed'
  const due = Date.parse(t.due)
  if (due < now) return 'Overdue'
  if (istDay(due) === istDay(now)) return 'Due today'
  return 'Scheduled'
}

/** Same ATM + category within the previous 30 days. */
export function repeatOf(c: Complaint, all: Complaint[]): Complaint | undefined {
  const t = Date.parse(c.receivedAt)
  return all
    .filter((o) => o.id !== c.id && o.atmId === c.atmId && o.category === c.category)
    .filter((o) => {
      const ot = Date.parse(o.receivedAt)
      return ot < t && t - ot <= 30 * 24 * H
    })
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0]
}

/** Downtime hours caused by a complaint (closed: recorded; open & ATM down: running clock). */
export function downtimeHours(c: Complaint, now = nowMs()) {
  if (c.status === 'Closed') return c.downtimeH ?? 0
  return c.impact === 'Down' ? (now - Date.parse(c.receivedAt)) / H : 0
}

export const maxNum = (ids: string[], prefix: string) =>
  ids.reduce((m, id) => (id.startsWith(prefix) ? Math.max(m, Number(id.slice(prefix.length)) || 0) : m), 0)

/* --------------------------------------- deterministic seed ------------------------------------- */

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DETAILS: Record<string, string> = {
  'Battery failure': 'The ATM powers down shortly after mains power drops. Battery backup is below the expected 30 minutes.',
  'UPS alarm': 'The UPS raises a continuous alarm and switches to bypass. The FR reports intermittent shutdowns during peak hours.',
  'Mains power outage': 'The site has no mains supply and the ATM is running on backup. The landlord has raised a ticket with the DISCOM.',
  'Network offline': 'The ATM has lost host connectivity and shows "Temporarily out of service". The router shows no carrier.',
  'Network unstable': 'Transactions time out intermittently. Remote monitoring shows repeated link drops through the day.',
  'Router fault': 'The router reboots repeatedly and the SIM is not registering on the carrier network.',
  'Dispenser jam': 'The dispenser jams on withdrawal and the ATM goes out of service until reset.',
  'Cash sensor error': 'The cash sensor reports a pick failure; customers are getting partial dispense errors.',
  'Note reject': 'High reject-bin count on the last two replenishments. Notes are being rejected as doubles.',
  'Card reader fault': 'The card reader fails to read chip cards; magstripe fallback works intermittently.',
  'Card capture': 'Customer cards are being captured without a host instruction.',
  'Printer fault': 'Receipts are not printing and the printer reports a head error.',
  'Paper jam': 'The receipt printer jams after a few transactions despite fresh paper rolls.',
  'Cooling fan alarm': 'The cabinet cooling fan alarm is active and internal temperature is above threshold.',
  'AC failure': 'The kiosk AC has stopped working and room temperature is rising in the afternoon.',
  'Application hang': 'The ATM application freezes on the language selection screen and needs a restart.',
  'EJ upload failure': 'Electronic journal uploads have failed for two days; reconciliation is pending.',
}
const FIXES: Record<string, string> = {
  'Power & UPS': 'Replace UPS battery and test charging circuit',
  Network: 'Replace router / SIM and run a link stability test',
  'Cash dispenser': 'Service dispenser module and replace worn pick belts',
  'Card reader': 'Replace card reader and update firmware',
  'Receipt printer': 'Replace printer head and test receipt output',
  'Cooling & environment': 'Replace cooling fan and clean air filters',
  'Software & EJ': 'Patch application and re-run EJ upload',
}
const RESOLUTIONS: Record<string, string> = {
  'Power & UPS': 'Battery replaced and backup verified for 30 minutes',
  Network: 'Router reset and SIM reseated · link stable',
  'Cash dispenser': 'Pick module serviced · test dispense passed',
  'Card reader': 'Card reader cleaned and recalibrated',
  'Receipt printer': 'Printer head cleaned · receipts printing',
  'Cooling & environment': 'Fan replaced · temperature normal',
  'Software & EJ': 'Application patched · EJ uploaded',
}
const REPLACEMENT_FOR: Record<string, [string, number]> = {
  'Battery failure': ['UPS batteries', 0.75],
  'UPS alarm': ['UPS batteries', 0.4],
  'Card reader fault': ['Card readers', 0.5],
  'Printer fault': ['Receipt printers', 0.45],
  'Paper jam': ['Receipt printers', 0.2],
  'Dispenser jam': ['Dispenser modules', 0.35],
  'Cash sensor error': ['Dispenser modules', 0.25],
  'Cooling fan alarm': ['Cooling fans', 0.6],
  'Router fault': ['Routers', 0.6],
  'Network offline': ['Routers', 0.25],
}

export function aiDefault(c: Pick<Complaint, 'category' | 'subcategory' | 'priority'>, score = 40): AiInfo {
  return {
    summary: `${c.subcategory} reported. Similar ${c.category.toLowerCase()} complaints were resolved by ${FIXES[c.category].toLowerCase()}. No external dependency is blocking resolution.`,
    nextAction: `Confirm engineer visit and ${FIXES[c.category].charAt(0).toLowerCase() + FIXES[c.category].slice(1)}.`,
    faultLabel: c.subcategory,
    faultConfidence: 80 + Math.round(score / 10),
    score,
    confidence: 70 + Math.round(score / 6),
    horizon: 'Next 24h',
    horizonH: 24,
    prediction: 'Within SLA',
    reason: 'No breach signal',
    driver: '',
    updated: ist('2026-10-07', '09:00'),
  }
}

type Base = {
  id: string
  at: string
  atm: string
  cat: string
  sub: string
  pri: Priority
  owner: string
  subStatus?: string
  impact?: Impact
  level?: 1 | 2 | 3
  title?: string
}

function build(b: Base, r: () => number, open: boolean): Complaint {
  const atm = atmById(b.atm)!
  const dept = DEPARTMENT_FOR[b.cat]
  const respondMin = Math.round(5 + r() * RESPONSE_MIN[b.pri] * 0.8)
  const c: Complaint = {
    id: b.id,
    receivedAt: b.at,
    reportingAuthority: r() < 0.8 ? 'Franchise representative (FR)' : 'Internal monitoring (NOC)',
    channel: '',
    atmId: b.atm,
    component: DEFAULT_COMPONENT[b.sub],
    category: b.cat,
    subcategory: b.sub,
    priority: b.pri,
    title: b.title ?? `${b.sub} at ${atm.siteName.split(',')[0]} ATM`,
    details: DETAILS[b.sub],
    attachments: r() < 0.5 ? ['site-photo.jpg'] : [],
    forwardedOn: istDay(b.at),
    department: dept,
    docket: `DX-7${String(7000 + Number(b.id.slice(4)) * 3).padStart(4, '0')}`,
    owner: b.owner,
    status: open ? 'Open' : 'Closed',
    subStatus: open ? (b.subStatus ?? 'In progress') : 'Resolved',
    respondedAt: addH(b.at, respondMin / 60),
    lastAction: open ? 'Engineer assigned' : 'Complaint closed after FR confirmation',
    remark: open ? 'Engineer assigned' : 'Closed after FR confirmation',
    proposedFix: FIXES[b.cat],
    outcome: open ? 'Pending' : 'Resolved',
    outcomeRemark: open ? '' : RESOLUTIONS[b.cat],
    frSignOff: !open,
    hdValidation: !open,
    evidence: !open,
    escalationLevel: b.level ?? 1,
    escalations: [],
    impact: b.impact ?? 'None',
    tasks: [],
    emails: [],
    visits: [],
    vendors: [],
    spares: [],
    audit: [],
  }
  c.channel = channelFor(c.reportingAuthority)
  c.audit.push({ at: b.at, title: 'Complaint registered', meta: `${c.channel === 'Remote monitoring' ? 'NOC monitoring' : `FR Mobile App · ${atm.complainant}`} · Owner auto-assigned` })
  c.emails.push({ id: `EM-${b.id.slice(4)}1`, subject: `Docket registered for ${b.atm}`, status: 'Received', route: `HD Team → FR & ${b.owner.split(' ')[0]}`, at: addH(b.at, 0.75), meta: c.docket })
  if (!open) {
    const slaH = SLA_HOURS[b.pri]
    let tat = Math.min(slaH * (0.06 + r() * 0.42), 6 + r() * 30)
    if (r() < 0.04) tat = slaH * (1.05 + r() * 0.3)
    let closed = Date.parse(b.at) + tat * H
    if (closed > NOW_BASE - 0.5 * H) closed = NOW_BASE - (0.5 + r() * 3) * H
    if (closed < Date.parse(b.at) + 2 * H) closed = Date.parse(b.at) + 2 * H
    c.closedAt = new Date(closed).toISOString()
    c.redressalDate = istDay(closed)
    c.outcomeDate = istDay(closed)
    const realTat = (closed - Date.parse(b.at)) / H
    c.downtimeH = r() < 0.5 ? 0 : Math.round(Math.min(realTat, 0.5 + r() * 5) * 10) / 10
    const rep = REPLACEMENT_FOR[b.sub]
    if (rep && r() < rep[1] * 0.6) c.replacement = rep[0]
    const eng = atm.engineer
    c.tasks.push({ id: '', title: `${FIXES[b.cat]}`, owner: eng, due: addH(b.at, Math.min(realTat, slaH * 0.6)), dependency: 'Field visit', done: true })
    c.visits.push({ id: '', at: addH(b.at, Math.max(1, realTat - 1.5)), purpose: FIXES[b.cat], engineer: eng, status: 'Completed', note: `${b.atm.replace('ATM', 'SITE').replace(/-[A-Z]{2}-/, '-')} · ${RESOLUTIONS[b.cat]}` })
    c.audit.push({ at: addH(b.at, Math.max(1, realTat - 1.5)), title: 'Field visit completed', meta: `${eng} · ${RESOLUTIONS[b.cat]}` })
    c.audit.push({ at: c.closedAt, title: 'Complaint closed', meta: `${b.owner} · FR sign-off & HD Team validation recorded` })
  } else {
    c.ai = aiDefault(c, Math.round(30 + r() * 25))
  }
  return c
}

/** Open complaints — hand-crafted so dashboards match the design's story. */
const OPEN: Base[] = [
  { id: 'CMP-1048', at: ist('2026-10-05', '10:30'), atm: 'ATM-MH-1024', cat: 'Power & UPS', sub: 'Battery failure', pri: 'Critical', owner: 'Paras Dubey', subStatus: 'In progress', impact: 'Degraded', level: 2, title: 'ATM power backup fails during mains outage' },
  { id: 'CMP-1039', at: ist('2026-10-06', '05:04'), atm: 'ATM-UP-0305', cat: 'Cash dispenser', sub: 'Dispenser jam', pri: 'Critical', owner: 'Rohit Verma', subStatus: 'Awaiting spare', impact: 'Down', level: 3, title: 'Dispenser jams on every withdrawal' },
  { id: 'CMP-1052', at: ist('2026-10-05', '10:34'), atm: 'ATM-KA-0076', cat: 'Network', sub: 'Network offline', pri: 'High', owner: 'Priya Nair', subStatus: 'Awaiting vendor', impact: 'Down', level: 2, title: 'ATM offline · no host connectivity' },
  { id: 'CMP-1044', at: ist('2026-10-05', '12:59'), atm: 'ATM-GJ-0218', cat: 'Power & UPS', sub: 'UPS alarm', pri: 'High', owner: 'Paras Dubey', subStatus: 'Awaiting spare', impact: 'Degraded', level: 2, title: 'UPS alarm and repeated shutdowns' },
  { id: 'CMP-1055', at: ist('2026-10-04', '15:24'), atm: 'ATM-TN-0142', cat: 'Receipt printer', sub: 'Printer fault', pri: 'Medium', owner: 'Kavita Reddy', subStatus: 'In progress', impact: 'Degraded', title: 'Receipt printer head error' },
  { id: 'CMP-1057', at: ist('2026-10-05', '16:44'), atm: 'ATM-RJ-0267', cat: 'Cash dispenser', sub: 'Cash sensor error', pri: 'High', owner: 'Amit Desai', subStatus: 'In progress', impact: 'Degraded', title: 'Cash sensor error · partial dispense' },
  { id: 'CMP-1059', at: ist('2026-10-06', '18:00'), atm: 'ATM-WB-0183', cat: 'Power & UPS', sub: 'Mains power outage', pri: 'Critical', owner: 'Kavita Reddy', subStatus: 'Pending', impact: 'Down', title: 'Site without mains power since evening' },
  { id: 'CMP-1050', at: ist('2026-10-06', '11:00'), atm: 'ATM-MH-1032', cat: 'Network', sub: 'Network unstable', pri: 'High', owner: 'Paras Dubey', subStatus: 'Awaiting vendor', title: 'Network unstable · transactions timing out' },
  { id: 'CMP-1046', at: ist('2026-10-05', '14:20'), atm: 'ATM-MH-1028', cat: 'Card reader', sub: 'Card reader fault', pri: 'Medium', owner: 'Paras Dubey', subStatus: 'Awaiting spare', impact: 'Degraded', title: 'Card reader fails on chip cards' },
  { id: 'CMP-1058', at: ist('2026-10-06', '10:15'), atm: 'ATM-MH-1041', cat: 'Receipt printer', sub: 'Printer fault', pri: 'Medium', owner: 'Paras Dubey', subStatus: 'In progress', title: 'Receipt printer not printing' },
  { id: 'CMP-1060', at: ist('2026-10-06', '16:40'), atm: 'ATM-GJ-0220', cat: 'Cooling & environment', sub: 'Cooling fan alarm', pri: 'Low', owner: 'Paras Dubey', subStatus: 'Assigned', title: 'Cooling fan alarm active' },
  { id: 'CMP-1047', at: ist('2026-10-05', '09:45'), atm: 'ATM-MH-1045', cat: 'Power & UPS', sub: 'Battery failure', pri: 'Medium', owner: 'Paras Dubey', subStatus: 'In progress', title: 'Low battery backup at Kothrud ATM' },
  { id: 'CMP-1033', at: ist('2026-10-04', '09:00'), atm: 'ATM-UP-0311', cat: 'Software & EJ', sub: 'EJ upload failure', pri: 'Low', owner: 'Rohit Verma', subStatus: 'Pending' },
  { id: 'CMP-1053', at: ist('2026-10-06', '09:30'), atm: 'ATM-UP-0322', cat: 'Power & UPS', sub: 'UPS alarm', pri: 'Medium', owner: 'Rohit Verma', subStatus: 'In progress' },
  { id: 'CMP-1054', at: ist('2026-10-06', '12:30'), atm: 'ATM-KA-0081', cat: 'Cash dispenser', sub: 'Note reject', pri: 'High', owner: 'Priya Nair', subStatus: 'In progress' },
  { id: 'CMP-1056', at: ist('2026-10-06', '13:10'), atm: 'ATM-KA-0094', cat: 'Receipt printer', sub: 'Paper jam', pri: 'Low', owner: 'Priya Nair', subStatus: 'Assigned' },
  { id: 'CMP-1051', at: ist('2026-10-05', '17:00'), atm: 'ATM-GJ-0231', cat: 'Network', sub: 'Router fault', pri: 'Medium', owner: 'Amit Desai', subStatus: 'Pending' },
  { id: 'CMP-1049', at: ist('2026-10-05', '15:30'), atm: 'ATM-MH-1019', cat: 'Software & EJ', sub: 'Application hang', pri: 'Low', owner: 'Kavita Reddy', subStatus: 'Pending' },
]

/** Pre-period history (for repeats, asset history and prior-period comparison). */
const HISTORY_FIXED: Base[] = [
  { id: 'CMP-0914', at: ist('2026-08-18', '11:20'), atm: 'ATM-MH-1024', cat: 'Network', sub: 'Network unstable', pri: 'Medium', owner: 'Paras Dubey', title: 'Network link unstable' },
  { id: 'CMP-0982', at: ist('2026-09-09', '09:10'), atm: 'ATM-MH-1024', cat: 'Power & UPS', sub: 'Battery failure', pri: 'High', owner: 'Paras Dubey', title: 'Battery replacement' },
  { id: 'CMP-0997', at: ist('2026-09-15', '12:40'), atm: 'ATM-UP-0305', cat: 'Cash dispenser', sub: 'Dispenser jam', pri: 'High', owner: 'Rohit Verma', title: 'Repeated dispenser jams' },
]

const DAY_COUNTS: [string, number][] = [
  ['2026-10-01', 8],
  ['2026-10-02', 11],
  ['2026-10-03', 10],
  ['2026-10-04', 13],
  ['2026-10-05', 9],
  ['2026-10-06', 9],
]

const CAT_WEIGHTS: [string, number][] = [
  ['Power & UPS', 0.33],
  ['Network', 0.2],
  ['Cash dispenser', 0.15],
  ['Receipt printer', 0.11],
  ['Card reader', 0.1],
  ['Cooling & environment', 0.05],
  ['Software & EJ', 0.06],
]
const PRI_WEIGHTS: [Priority, number][] = [
  ['Critical', 0.12],
  ['High', 0.3],
  ['Medium', 0.38],
  ['Low', 0.2],
]
const pick = <T,>(r: () => number, xs: [T, number][]) => {
  let x = r()
  for (const [v, w] of xs) {
    if ((x -= w) <= 0) return v
  }
  return xs[xs.length - 1][0]
}
// ATMs that see more traffic (repeat-prone)
const HOT_ATMS = ['ATM-MH-1045', 'ATM-GJ-0218', 'ATM-MH-1032', 'ATM-RJ-0267', 'ATM-TN-0142']
// ATMs whose complaint history is hand-written (CMP-1048 / CMP-1039 / CMP-1052 stories)
const STORY_ATMS = ['ATM-MH-1024', 'ATM-UP-0305', 'ATM-KA-0076']
const RANDOM_ATMS = ATM_MASTER.filter((a) => !STORY_ATMS.includes(a.atmId))

function seedComplaints(): Complaint[] {
  const r = rng(1048)
  const out: Complaint[] = []
  const reserved = new Set([...OPEN, ...HISTORY_FIXED].map((b) => `${b.atm}|${b.cat}`))
  const randomBase = (id: string, day: string): Base => {
    const hour = 8 + Math.floor(r() * 11)
    const min = Math.floor(r() * 60)
    let cat = pick(r, CAT_WEIGHTS)
    const atm = r() < 0.3 ? HOT_ATMS[Math.floor(r() * HOT_ATMS.length)] : RANDOM_ATMS[Math.floor(r() * RANDOM_ATMS.length)].atmId
    // keep the hand-crafted ATM stories (open complaints / fixed history) free of random look-alikes
    for (let i = 0; reserved.has(`${atm}|${cat}`) && i < CAT_WEIGHTS.length; i++) cat = CAT_WEIGHTS[(CAT_WEIGHTS.findIndex(([c]) => c === cat) + 1) % CAT_WEIGHTS.length][0]
    const subs = CATEGORIES[cat]
    const sub = cat === 'Power & UPS' && r() < 0.6 ? 'Battery failure' : subs[Math.floor(r() * subs.length)]
    return { id, at: ist(day, `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`), atm, cat, sub, pri: pick(r, PRI_WEIGHTS), owner: OWNERS[Math.floor(r() * OWNERS.length)] }
  }

  // history: fixed + 13 generated in 24–30 Sep (prior period)
  HISTORY_FIXED.forEach((b) => out.push(build(b, r, false)))
  const histIds = [986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 998, 999]
  const histDays = ['2026-09-24', '2026-09-25', '2026-09-25', '2026-09-26', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-28', '2026-09-29', '2026-09-29', '2026-09-30', '2026-09-30', '2026-09-30']
  histIds.forEach((n, i) => {
    const c = build(randomBase(`CMP-0${n}`, histDays[i]), r, false)
    // prior period ran a little slower
    if (c.closedAt) c.closedAt = new Date(Date.parse(c.receivedAt) + (Date.parse(c.closedAt) - Date.parse(c.receivedAt)) * 2).toISOString()
    out.push(c)
  })

  // period: open set + closed fill
  const openIds = new Set(OPEN.map((o) => o.id))
  const openPerDay: Record<string, number> = {}
  OPEN.forEach((o) => (openPerDay[istDay(o.at)] = (openPerDay[istDay(o.at)] ?? 0) + 1))
  const closedSlots: string[] = []
  DAY_COUNTS.forEach(([d, n]) => {
    for (let i = 0; i < n - (openPerDay[d] ?? 0); i++) closedSlots.push(d)
  })
  const closedIds: string[] = []
  for (let n = 1001; n <= 1060; n++) if (!openIds.has(`CMP-${n}`)) closedIds.push(`CMP-${n}`)
  closedIds.forEach((id, i) => {
    const day = closedSlots[Math.min(i, closedSlots.length - 1)]
    const base = randomBase(id, day)
    if (id === 'CMP-1008') Object.assign(base, { atm: 'ATM-KA-0076', cat: 'Network', sub: 'Network unstable', pri: 'Medium' as Priority })
    if (id === 'CMP-1021') Object.assign(base, { atm: 'ATM-RJ-0267', cat: 'Cash dispenser', sub: 'Cash sensor error', pri: 'High' as Priority })
    if (id === 'CMP-1027') Object.assign(base, { atm: 'ATM-MH-1036', cat: 'Software & EJ', sub: 'EJ upload failure', pri: 'Low' as Priority })
    out.push(build(base, r, false))
  })
  OPEN.forEach((b) => out.push(build(b, r, true)))

  // ---- enrich open complaints (tasks, visits, vendors, spares, AI) ----
  const get = (id: string) => out.find((c) => c.id === id)!
  const today = '2026-10-07'

  // CMP-1048 exactly as designed
  const k = get('CMP-1048')
  Object.assign(k, {
    reportingAuthority: 'Franchise representative (FR)',
    channel: 'FR / Field Officer Mobile App',
    details:
      'The ATM shuts down immediately when mains power drops. The FR reported two interrupted transactions. Remote checks show a battery voltage of 10.8V under load; transactions remain disabled until safe power backup is restored.',
    attachments: ['voltage-test.jpg', 'ups-error-log.pdf'],
    docket: 'DX-78142',
    respondedAt: ist('2026-10-05', '10:42'),
    lastAction: 'Spare battery requested from vendor',
    remark: 'Spare battery requested from vendor',
    proposedFix: 'Replace UPS battery and test charging circuit',
    outcomeRemark: 'Verify at least 30 minutes of backup',
    subStatus: 'In progress',
    reminderDate: today,
    lastReminder: { at: ist(today, '09:00'), task: 'TSK-2078' },
    escalations: [{ level: 2, at: ist('2026-10-06', '10:30'), note: 'Resolution SLA breached' }],
  } satisfies Partial<Complaint>)
  k.tasks = [
    { id: 'TSK-2081', title: 'Confirm spare battery dispatch', owner: 'Paras Dubey', due: ist(today, '11:00'), dependency: 'Vendor' },
    { id: 'TSK-2078', title: 'Follow up on docket DX-78142', owner: 'Paras Dubey', due: ist(today, '09:00'), dependency: 'HD Team' },
    { id: 'TSK-2083', title: 'Charging test & battery replacement', owner: 'Amit Jadhav', due: ist(today, '14:00'), dependency: 'Field visit' },
  ]
  k.emails = [
    { id: 'EM-10483', subject: 'Re: DX-78142 · Battery dispatch confirmation', status: 'Awaiting reply', route: 'Exide service desk → Ananya', at: ist(today, '08:45'), meta: 'ETA awaited' },
    { id: 'EM-10482', subject: 'Docket registered for ATM-MH-1024', status: 'Received', route: 'HD Team → FR & Ananya', at: ist('2026-10-05', '11:15'), meta: 'DX-78142' },
    { id: 'EM-10481', subject: 'Power backup failure reported', status: 'Linked', route: 'Rahul Mehta → HD Team', at: ist('2026-10-05', '10:30'), meta: '2 attachments' },
  ]
  k.visits = [
    { id: 'FV-0921', at: ist(today, '14:00'), purpose: 'Battery replacement & UPS test', engineer: 'Amit Jadhav', status: 'Awaiting spare', note: 'SITE-1024 · Dispatch approval pending' },
    { id: 'FV-0912', at: ist('2026-10-05', '16:20'), purpose: 'Initial diagnosis', engineer: 'Amit Jadhav', status: 'Completed', note: '10.8V load reading · Report FV-0912' },
  ]
  k.vendors = [{ id: 'VD-301', vendor: 'Exide service desk', item: 'Dispatch acknowledgment', status: 'Pending', lastChased: ist(today, '08:45'), expectedBy: ist(today, '11:00'), log: ['07 Oct, 08:45 · Chased by Paras Dubey · ETA awaited'] }]
  k.audit = [
    { at: ist('2026-10-05', '10:30'), title: 'Complaint registered', meta: 'FR Mobile App · Rahul Mehta · Owner auto-assigned' },
    { at: ist('2026-10-05', '16:35'), title: 'Diagnosis added', meta: 'Amit Jadhav · Voltage evidence attached' },
    { at: ist('2026-10-06', '10:30'), title: 'SLA breach & L2 escalation', meta: 'System · HD Team routing rule · RM notified' },
    { at: ist(today, '09:00'), title: 'Reminder sent', meta: 'Paras Dubey · Vendor follow-up · TSK-2078 linked' },
  ]
  k.ai = {
    summary:
      'Likely premature UPS battery degradation. A similar battery complaint was closed on 09 Sep. Vendor confirmation and a replacement visit are the remaining blockers. Verify the UPS charging circuit before replacing the battery again.',
    nextAction: 'Confirm battery dispatch by 11:00 and run a charging-circuit test during the engineer visit.',
    faultLabel: 'Battery fault',
    faultConfidence: 94,
    score: 94,
    confidence: 88,
    horizon: 'Next 24h',
    horizonH: 24,
    prediction: 'L3 escalation',
    reason: 'Battery dispatch delay',
    driver: 'Spare part ETA',
    updated: ist('2026-10-06', '09:00'),
  }
  // previous battery replacement visit on CMP-0982
  const h = get('CMP-0982')
  h.outcomeRemark = 'EX-42-09023 installed'
  h.downtimeH = 3.2
  h.replacement = 'UPS batteries'
  h.visits = [{ id: 'FV-0874', at: ist('2026-09-09', '11:40'), purpose: 'Previous battery replacement', engineer: 'Amit Jadhav', status: 'Completed', note: 'Linked CMP-0982 · EX-42-09023 installed' }]
  const h2 = get('CMP-0914')
  h2.outcomeRemark = 'Router reset and SIM reseated'
  h2.downtimeH = 1.1

  // other open complaints
  const T = (cid: string, task: CTask) => get(cid).tasks.push(task)
  T('CMP-1044', { id: 'TSK-2072', title: 'Approve replacement estimate', owner: 'Paras Dubey', due: ist('2026-10-06', '17:00'), dependency: 'Spare part' })
  T('CMP-1050', { id: 'TSK-2069', title: 'Confirm network test results', owner: 'Paras Dubey', due: ist('2026-10-06', '18:00'), dependency: 'Vendor' })
  T('CMP-1058', { id: 'TSK-2086', title: 'Review engineer evidence', owner: 'Paras Dubey', due: ist(today, '16:00'), dependency: 'Field visit' })
  T('CMP-1046', { id: 'TSK-2090', title: 'Update FR on card reader ETA', owner: 'Paras Dubey', due: ist(today, '13:30'), dependency: 'Spare part' })
  T('CMP-1060', { id: 'TSK-2091', title: 'Schedule cooling fan replacement', owner: 'Paras Dubey', due: ist('2026-10-08', '10:00'), dependency: 'Field visit' })
  T('CMP-1047', { id: 'TSK-2092', title: 'HD Team reminder · battery test request', owner: 'Paras Dubey', due: ist(today, '10:00'), dependency: 'HD Team' })
  T('CMP-1039', { id: 'TSK-2074', title: 'Approve dispenser module replacement', owner: 'Rohit Verma', due: ist(today, '10:30'), dependency: 'Spare part' })
  T('CMP-1052', { id: 'TSK-2088', title: 'Run overnight network stability diagnostics', owner: 'Priya Nair', due: ist(today, '15:00'), dependency: 'Vendor' })
  T('CMP-1055', { id: 'TSK-2076', title: 'Source printer head from Chennai depot', owner: 'Kavita Reddy', due: ist(today, '12:00'), dependency: 'Spare part' })
  T('CMP-1057', { id: 'TSK-2079', title: 'Replace cash sensor and test dispense', owner: 'Rakesh Meena', due: ist(today, '13:00'), dependency: 'Field visit' })
  T('CMP-1059', { id: 'TSK-2093', title: 'Confirm DISCOM restoration ETA', owner: 'Kavita Reddy', due: ist(today, '11:30'), dependency: 'External' })
  T('CMP-1033', { id: 'TSK-2066', title: 'Re-run EJ upload after patch', owner: 'Rohit Verma', due: ist('2026-10-08', '12:00'), dependency: 'HD Team' })
  T('CMP-1053', { id: 'TSK-2094', title: 'UPS load test', owner: 'Vivek Yadav', due: ist('2026-10-08', '11:00'), dependency: 'Field visit' })
  T('CMP-1054', { id: 'TSK-2095', title: 'Clean note validator', owner: 'Santosh Gowda', due: ist(today, '17:00'), dependency: 'Field visit' })
  T('CMP-1056', { id: 'TSK-2096', title: 'Replace paper guide', owner: 'Santosh Gowda', due: ist('2026-10-09', '12:00'), dependency: 'Field visit' })
  T('CMP-1051', { id: 'TSK-2097', title: 'Swap router SIM', owner: 'Kunal Shah', due: ist('2026-10-08', '15:00'), dependency: 'Vendor' })
  T('CMP-1049', { id: 'TSK-2098', title: 'Push application patch remotely', owner: 'Kavita Reddy', due: ist('2026-10-09', '10:00'), dependency: 'HD Team' })

  const V = (cid: string, v: CVisit) => get(cid).visits.unshift(v)
  V('CMP-1046', { id: 'FV-0922', at: ist(today, '15:00'), purpose: 'Card reader diagnostics', engineer: 'Amit Jadhav', status: 'Awaiting confirmation', note: 'SITE-1028 · Confirmation due' })
  V('CMP-1058', { id: 'FV-0923', at: ist(today, '17:00'), purpose: 'Printer test & FR sign-off', engineer: 'Manish Kale', status: 'Confirmed', note: 'SITE-1041 · Confirmed' })
  V('CMP-1039', { id: 'FV-0919', at: ist(today, '12:00'), purpose: 'Dispenser module swap', engineer: 'Vivek Yadav', status: 'Awaiting spare', note: 'SITE-0305 · Module approval pending' })
  V('CMP-1057', { id: 'FV-0920', at: ist(today, '13:00'), purpose: 'Cash sensor replacement', engineer: 'Rakesh Meena', status: 'Confirmed', note: 'SITE-0267 · Confirmed' })
  V('CMP-1052', { id: 'FV-0918', at: ist(today, '11:30'), purpose: 'Router swap with Airtel engineer', engineer: 'Santosh Gowda', status: 'Awaiting confirmation', note: 'SITE-0076 · Vendor slot pending' })

  get('CMP-1050').vendors = [{ id: 'VD-302', vendor: 'Airtel', item: 'Link stability report', status: 'Pending', lastChased: ist('2026-10-06', '17:10'), expectedBy: ist(today, '12:00'), log: ['06 Oct, 17:10 · Callback scheduled for 12:00'] }]
  get('CMP-1052').vendors = [{ id: 'VD-303', vendor: 'Airtel', item: 'Link restoration', status: 'Pending', lastChased: ist(today, '08:30'), expectedBy: ist(today, '11:30'), log: ['07 Oct, 08:30 · Chased by Priya Nair'] }]
  get('CMP-1059').vendors = [{ id: 'VD-304', vendor: 'CESC (DISCOM)', item: 'Mains restoration ETA', status: 'Pending', expectedBy: ist(today, '12:00'), log: [] }]
  get('CMP-1044').spares = [{ id: 'SP-511', part: 'UPS battery', model: 'EX-42Ah', depot: 'Ahmedabad depot', status: 'Awaiting approval', cost: 4800 }]
  get('CMP-1046').spares = [{ id: 'SP-512', part: 'Card reader', model: 'NCR-CR22', depot: 'Pune depot', status: 'In transit', eta: ist(today, '13:00') }]
  get('CMP-1039').spares = [{ id: 'SP-509', part: 'Dispenser module', model: 'NCR S2', depot: 'Lucknow depot', status: 'Awaiting approval', cost: 18500 }]
  get('CMP-1055').spares = [{ id: 'SP-510', part: 'Printer head', model: 'TP-07', depot: 'Chennai depot', status: 'Approved', eta: ist('2026-10-07', '16:00') }]

  get('CMP-1039').escalations = [
    { level: 2, at: ist('2026-10-06', '14:00'), note: 'Repeat dispenser failure · manual escalation' },
    { level: 3, at: ist(today, '05:04'), note: 'Resolution SLA breached at L2' },
  ]
  get('CMP-1052').escalations = [{ level: 2, at: ist('2026-10-06', '18:00'), note: 'Vendor response delay' }]
  get('CMP-1044').escalations = [{ level: 2, at: ist('2026-10-06', '17:30'), note: 'Spare approval pending' }]
  for (const id of ['CMP-1039', 'CMP-1052', 'CMP-1044']) {
    const c = get(id)
    c.escalations.forEach((e) => c.audit.push({ at: e.at, title: `L${e.level} escalation`, meta: `System · ${e.note}` }))
  }
  get('CMP-1044').lastAction = 'Replacement estimate awaiting approval'
  get('CMP-1050').lastAction = 'Airtel callback scheduled for 12:00'
  get('CMP-1046').lastAction = 'Card reader in transit from Pune depot'
  get('CMP-1047').lastAction = 'HD Team reviewing battery test request'
  get('CMP-1047').details = 'The FR reports that the ATM powers down within five minutes of a mains outage. Please test battery capacity and UPS charging output. The ATM is currently operational on mains power.'
  get('CMP-1039').lastAction = 'Dispenser module awaiting approval'
  get('CMP-1052').lastAction = 'Airtel link restoration chased'

  const P = (id: string, p: Partial<AiInfo>) => Object.assign(get(id).ai!, p)
  P('CMP-1052', { score: 92, confidence: 93, horizon: 'Next 2h', horizonH: 2, prediction: 'SLA breach', reason: 'Network vendor delay', driver: 'Vendor response delay', faultLabel: 'Carrier outage', faultConfidence: 90, summary: 'Intermittent link failures match earlier network complaints on this ATM (CMP-1008). Airtel has not confirmed restoration; the router swap visit is not yet confirmed.', nextAction: 'Chase Airtel for a restoration ETA and confirm the router swap slot.' })
  P('CMP-1044', { score: 87, confidence: 91, horizon: 'Next 4h', horizonH: 4, prediction: 'SLA breach', reason: 'Spare not approved', driver: 'Spare part ETA', faultLabel: 'UPS battery fault', faultConfidence: 89, summary: 'The UPS alarm points to a failed battery string. The replacement estimate (₹4,800) has been awaiting approval since 05 Oct.', nextAction: 'Approve the replacement estimate so the Ahmedabad depot can dispatch today.' })
  P('CMP-1057', { score: 84, confidence: 86, horizon: 'Next 8h', horizonH: 8, prediction: 'SLA breach', reason: 'Repeat cash sensor fault', driver: 'Repeated failure', faultLabel: 'Cash sensor fault', faultConfidence: 88 })
  P('CMP-1050', { score: 81, confidence: 82, horizon: 'Next 12h', horizonH: 12, prediction: 'Escalation', reason: 'Vendor callback overdue', driver: 'Vendor response delay', faultLabel: 'Carrier instability', faultConfidence: 84 })
  P('CMP-1046', { score: 80, confidence: 81, horizon: 'Next 18h', horizonH: 18, prediction: 'SLA breach', reason: 'Visit confirmation missing', driver: 'Visit not confirmed', faultLabel: 'Card reader fault', faultConfidence: 86 })
  P('CMP-1039', { score: 78, confidence: 84, horizon: 'Next 6h', horizonH: 6, prediction: 'Extended downtime', reason: 'Dispenser module awaiting approval', driver: 'Spare part ETA' })
  P('CMP-1059', { score: 76, confidence: 79, horizon: 'Next 9h', horizonH: 9, prediction: 'SLA breach', reason: 'Site power restoration pending', driver: 'Visit not confirmed' })
  P('CMP-1055', { score: 72, confidence: 75, horizon: 'Next 7h', horizonH: 7, prediction: 'SLA breach', reason: 'Printer spare in transit', driver: 'Spare part ETA' })
  P('CMP-1047', { score: 66, confidence: 72, horizon: 'Next 24h', horizonH: 24, prediction: 'Escalation', reason: 'Repeat battery complaint risk', driver: 'Repeated failure' })

  // assign ids to generated tasks / visits
  let tsk = 1900
  let fv = 800
  out.forEach((c) => {
    c.tasks.forEach((t) => (t.id ||= `TSK-${tsk++}`))
    c.visits.forEach((v) => (v.id ||= `FV-0${fv++}`))
    c.audit.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  })
  return out.sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
}

/* ------------------------------------------- stores --------------------------------------------- */

export const complaintStore = createStore<Complaint[]>('dexter.complaints.v1', seedComplaints)
export const maintenanceStore = createStore<MaintenanceTask[]>('dexter.complaints.maintenance.v1', () => [])

export type ComplaintDraft = Record<string, unknown> & { savedAt?: number }
export const draftStore = createStore<ComplaintDraft | null>('dexter.complaints.draft.v1', () => null)

const LAST_KEY = 'dexter.complaints.last.v1'
export const getLastOpened = () => {
  try {
    return localStorage.getItem(LAST_KEY) ?? 'CMP-1048'
  } catch {
    return 'CMP-1048'
  }
}
export const setLastOpened = (id: string) => {
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    /* ignore */
  }
}

/** Next free task id across complaints, maintenance tasks and AI recommendations. */
export function nextTaskId(extra: string[] = []) {
  const ids = [
    ...complaintStore.get().flatMap((c) => c.tasks.map((t) => t.id)),
    ...maintenanceStore.get().map((m) => m.id),
    ...extra,
  ]
  return `TSK-${maxNum(ids, 'TSK-') + 1}`
}
export const nextComplaintId = () => `CMP-${maxNum(complaintStore.get().map((c) => c.id), 'CMP-') + 1}`
export const nextVisitId = () => `FV-0${maxNum(complaintStore.get().flatMap((c) => c.visits.map((v) => v.id)), 'FV-') + 1}`

/** Immutable update of one complaint, optionally appending an audit entry. */
export function updateComplaint(id: string, fn: (c: Complaint) => Partial<Complaint>, audit?: { title: string; meta: string }) {
  complaintStore.set((xs) =>
    xs.map((c) => {
      if (c.id !== id) return c
      const next = { ...c, ...fn(c) }
      if (audit) next.audit = [...next.audit, { at: new Date(nowMs()).toISOString(), ...audit }]
      return next
    }),
  )
}
