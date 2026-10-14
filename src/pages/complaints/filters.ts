import { atmById, istDay, type Complaint } from '@/data/complaints'

export type RangeFilter = { from: string; to: string }
export type DashFilter = RangeFilter & { projects: string[]; states: string[] }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parts = (d: string) => {
  const [y, m, dd] = d.split('-')
  return { y, m: MONTHS[Number(m) - 1], d: dd }
}
export function rangeLabel({ from, to }: RangeFilter) {
  const a = parts(from)
  const b = parts(to)
  if (from === to) return `${a.d} ${a.m} ${a.y}`
  if (a.m === b.m && a.y === b.y) return `${a.d}–${b.d} ${b.m} ${b.y}`
  return `${a.d} ${a.m}–${b.d} ${b.m} ${b.y}`
}
export const shortRange = (r: RangeFilter) => rangeLabel(r).replace(/ \d{4}$/, '')

export const RANGE_PRESETS: { label: string; from: string; to: string }[] = [
  { label: 'Reporting period', from: '2026-10-01', to: '2026-10-06' },
  { label: 'Last 3 days', from: '2026-10-04', to: '2026-10-06' },
  { label: 'Latest day', from: '2026-10-06', to: '2026-10-06' },
  { label: 'Prior period', from: '2026-09-25', to: '2026-09-30' },
  { label: 'Last 30 days', from: '2026-09-07', to: '2026-10-06' },
]

export const projectKey = (c: Complaint) => {
  const a = atmById(c.atmId)
  return a ? `${a.project} · ${a.projectId}` : ''
}
export const stateOf = (c: Complaint) => atmById(c.atmId)?.state ?? ''

export function matches(c: Complaint, f: DashFilter) {
  const d = istDay(c.receivedAt)
  if (d < f.from || d > f.to) return false
  if (f.projects.length && !f.projects.includes(projectKey(c))) return false
  if (f.states.length && !f.states.includes(stateOf(c))) return false
  return true
}

/** Days between two YYYY-MM-DD dates, inclusive list. */
export function daysBetween(from: string, to: string) {
  const out: string[] = []
  let t = Date.parse(`${from}T12:00:00+05:30`)
  const end = Date.parse(`${to}T12:00:00+05:30`)
  while (t <= end && out.length < 62) {
    out.push(istDay(t))
    t += 86_400_000
  }
  return out
}

export function priorRange({ from, to }: RangeFilter): RangeFilter {
  const len = daysBetween(from, to).length
  const start = Date.parse(`${from}T12:00:00+05:30`)
  return { from: istDay(start - len * 86_400_000), to: istDay(start - 86_400_000) }
}

export const percentile = (xs: number[], p: number) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = (s.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return s[lo] + (s[hi] - s[lo]) * (i - lo)
}
