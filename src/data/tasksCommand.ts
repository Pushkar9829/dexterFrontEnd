import type { Dept, Region } from './tasks'

/* Organisation-wide aggregates behind the Management Command Center (CRM-07).
   Department totals are exact for "This month · 01–06 Oct"; regions and other
   periods are derived deterministically so every filter recomputes the cards. */

export type Period = 'month' | 'week' | 'today'
export const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'This month · 01–06 Oct' },
  { key: 'week', label: 'Last 7 days · 30 Sep–06 Oct' },
  { key: 'today', label: 'Today · 06 Oct' },
]

type DeptBase = { dept: Dept; total: number; closed: number; breaches: number; tat: number; score: number; active: number; capacity: number }
export const DEPT_BASE: DeptBase[] = [
  { dept: 'Sales', total: 168, closed: 152, breaches: 8, tat: 12, score: 88, active: 41, capacity: 48 },
  { dept: 'Franchise', total: 186, closed: 166, breaches: 12, tat: 17, score: 86, active: 46, capacity: 48 },
  { dept: 'Verification', total: 236, closed: 198, breaches: 33, tat: 25, score: 78, active: 95, capacity: 72 },
  { dept: 'Finance', total: 172, closed: 151, breaches: 15, tat: 20, score: 84, active: 37, capacity: 50 },
  { dept: 'Legal', total: 118, closed: 101, breaches: 9, tat: 26, score: 82, active: 22, capacity: 28 },
  { dept: 'Operations', total: 162, closed: 144, breaches: 10, tat: 15, score: 86, active: 40, capacity: 46 },
  { dept: 'Projects', total: 104, closed: 90, breaches: 6, tat: 22, score: 83, active: 19, capacity: 24 },
  { dept: 'Support', total: 102, closed: 89, breaches: 5, tat: 10, score: 87, active: 18, capacity: 26 },
]
/** Last-month deltas used for the trend line (completion pp, SLA pp, TAT h, score pts). */
export const LAST_MONTH = { completion: -4.2, sla: 1.3, tat: 2.4, score: -6 }

const REGION_W: Record<Region, { total: number; closed: number; breaches: number }> = {
  West: { total: 0.38, closed: 0.39, breaches: 0.3 },
  North: { total: 0.24, closed: 0.23, breaches: 0.28 },
  South: { total: 0.23, closed: 0.24, breaches: 0.18 },
  East: { total: 0.15, closed: 0.14, breaches: 0.24 },
}
const PERIOD_F: Record<Period, { total: number; completion: number; sla: number; tat: number }> = {
  month: { total: 1, completion: 0, sla: 0, tat: 0 },
  week: { total: 1.17, completion: -0.006, sla: -0.003, tat: 0.4 },
  today: { total: 0.17, completion: -0.22, sla: 0.01, tat: -1.1 },
}

/** Largest-remainder split so regional pieces always sum back to the department total. */
function split(n: number, weights: number[]) {
  const raw = weights.map((w) => n * w)
  const out = raw.map(Math.floor)
  let rest = n - out.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0])
  for (let k = 0; rest > 0; k++, rest--) out[order[k % order.length][1]]++
  return out
}

export type Cell = { dept: Dept; region: Region; total: number; closed: number; breaches: number; tatSum: number; scoreSum: number }

export function cells(period: Period): Cell[] {
  const f = PERIOD_F[period]
  const out: Cell[] = []
  for (const d of DEPT_BASE) {
    const total = Math.round(d.total * f.total)
    const closed = Math.min(total, Math.round(total * (d.closed / d.total + f.completion)))
    const breaches = Math.max(0, Math.round(total * (d.breaches / d.total - f.sla)))
    const t = split(total, REGIONS_ORDER.map((r) => REGION_W[r].total))
    const c = split(closed, REGIONS_ORDER.map((r) => REGION_W[r].closed))
    const b = split(breaches, REGIONS_ORDER.map((r) => REGION_W[r].breaches))
    REGIONS_ORDER.forEach((region, i) => {
      const cl = Math.min(c[i], t[i])
      out.push({ dept: d.dept, region, total: t[i], closed: cl, breaches: b[i], tatSum: cl * (d.tat + f.tat), scoreSum: t[i] * d.score })
    })
  }
  return out
}
const REGIONS_ORDER: Region[] = ['West', 'North', 'South', 'East']

export type Kpis = {
  total: number
  closed: number
  completion: number
  sla: number
  breaches: number
  tat: number
  score: number
  depts: number
}
export function kpis(period: Period, depts: Dept[], regions: Region[]): Kpis {
  const cs = cells(period).filter((c) => depts.includes(c.dept) && regions.includes(c.region))
  const total = cs.reduce((a, c) => a + c.total, 0)
  const closed = cs.reduce((a, c) => a + c.closed, 0)
  const breaches = cs.reduce((a, c) => a + c.breaches, 0)
  const tatSum = cs.reduce((a, c) => a + c.tatSum, 0)
  const scoreSum = cs.reduce((a, c) => a + c.scoreSum, 0)
  return {
    total,
    closed,
    breaches,
    completion: total ? (closed / total) * 100 : 0,
    sla: total ? (1 - breaches / total) * 100 : 0,
    tat: closed ? tatSum / closed : 0,
    score: total ? Math.round(scoreSum / total) : 0,
    depts: new Set(cs.map((c) => c.dept)).size,
  }
}

/** Share of in-scope tasks vs the unfiltered month — used to scale workflow/blocker counts. */
export const share = (period: Period, depts: Dept[], regions: Region[]) => {
  const all = kpis('month', DEPT_BASE.map((d) => d.dept), REGIONS_ORDER).total
  return kpis(period, depts, regions).total / all
}

/* -------------------- Department Coordination Matrix -------------------- */

export type StageStatus = 'Complete' | 'Approval' | 'Blocked' | 'In progress' | 'Waiting' | 'Queued'
export const STAGES = ['Sales', 'Franchise', 'Verification', 'Finance'] as const
export type Workflow = {
  id: string
  name: string
  region: Region
  taskId: string
  taskTitle: string
  stages: StageStatus[]
  /** department of the stage that owns the linked task */
  stageOfTask: number
  owner: string
  ownerDept: Dept
}
export const WORKFLOWS: Workflow[] = [
  { id: 'WF-2081', name: 'ABC Franchise · Pune activation', region: 'West', taskId: 'TSK-1048', taskTitle: 'Verify KYC & release recommendation', stages: ['Complete', 'Complete', 'Approval', 'Blocked'], stageOfTask: 2, owner: 'Meera Iyer', ownerDept: 'Verification' },
  { id: 'WF-2084', name: 'Patel Cash Solutions · Ahmedabad', region: 'West', taskId: 'TSK-1053', taskTitle: 'Security deposit reconciliation', stages: ['Complete', 'Complete', 'Complete', 'In progress'], stageOfTask: 3, owner: 'Vikram Shah', ownerDept: 'Finance' },
  { id: 'WF-2076', name: 'Namma ATM Network · Bengaluru', region: 'South', taskId: 'TSK-1032', taskTitle: 'Resolve bank account mismatch', stages: ['Complete', 'Complete', 'Waiting', 'Queued'], stageOfTask: 2, owner: 'Sana Ali', ownerDept: 'Verification' },
  { id: 'WF-2090', name: 'Awadh Banking Point · Lucknow', region: 'North', taskId: 'TSK-1061', taskTitle: 'Validate franchise application', stages: ['Complete', 'In progress', 'Queued', 'Queued'], stageOfTask: 1, owner: 'Arjun Sethi', ownerDept: 'Franchise' },
  { id: 'WF-2093', name: 'Bengal Rural Payments · Kolkata', region: 'East', taskId: 'TSK-1050', taskTitle: 'Verify franchise bank proof re-submission', stages: ['Complete', 'Complete', 'In progress', 'Queued'], stageOfTask: 2, owner: 'Rahul Kumar', ownerDept: 'Verification' },
  { id: 'WF-2095', name: 'Southern Cash Services · Chennai', region: 'South', taskId: 'TSK-1046', taskTitle: 'Approve address verification report', stages: ['Complete', 'Complete', 'Approval', 'Queued'], stageOfTask: 2, owner: 'Meera Iyer', ownerDept: 'Verification' },
  { id: 'WF-2070', name: 'Shree Sai Financial Services · Pune', region: 'West', taskId: 'TSK-1041', taskTitle: 'Upload signed franchise agreement', stages: ['Complete', 'Waiting', 'Queued', 'Queued'], stageOfTask: 1, owner: 'Rohan Gupta', ownerDept: 'Legal' },
  { id: 'WF-2098', name: 'Patel Cash Solutions · Surat expansion', region: 'West', taskId: 'TSK-1052', taskTitle: 'Cross-check PAN for Patel Cash director', stages: ['Complete', 'Complete', 'In progress', 'Queued'], stageOfTask: 2, owner: 'Rahul Kumar', ownerDept: 'Verification' },
]
export const WF_TOTALS = { active: 128, waiting: 22, overdue: 14 }

/* -------------------- Why Is Work Stuck? -------------------- */

export type Blocker = { key: string; label: string; byDept: Partial<Record<Dept, number>>; who: string; taskId: string; taskLabel: string }
export const BLOCKERS: Blocker[] = [
  { key: 'approval', label: 'Manager Approval Pending', byDept: { Verification: 9, Franchise: 4, Sales: 2, Legal: 3 }, who: 'Meera Iyer · 6 approvals', taskId: 'TSK-1048', taskLabel: 'ABC Franchise' },
  { key: 'finance', label: 'Finance Dependency', byDept: { Finance: 8, Verification: 3, Franchise: 3 }, who: 'Vikram Shah · 4 reconciliations', taskId: 'TSK-1053', taskLabel: 'Patel Cash Solutions' },
  { key: 'customer', label: 'Customer Response Pending', byDept: { Verification: 5, Support: 4, Sales: 3 }, who: 'Sana Ali · 3 document requests', taskId: 'TSK-1032', taskLabel: 'Namma ATM Network' },
  { key: 'handoff', label: 'Internal Handoff', byDept: { Franchise: 3, Operations: 2, Projects: 2, Verification: 1 }, who: 'Arjun Sethi · 2 site reviews', taskId: 'TSK-1061', taskLabel: 'Awadh Banking Point' },
]
/** Region share of blockers (sums to 1). */
export const BLOCKER_REGION_W: Record<Region, number> = { West: 0.42, North: 0.25, South: 0.21, East: 0.12 }
