// Pure helpers shared by the Projects pages (kept out of component files for fast refresh).
import { LIFECYCLE_COLOR, type Lifecycle } from '@/data/projects'
import type { WfTask } from '@/data/workflow'

// ── formatting ───────────────────────────────────────────────────────────
export const fmtD = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const fmtDT = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const daysAgo = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)) : 0)
export const pctTxt = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : 'N/A')

export const todayIso = () => new Date().toISOString().slice(0, 10)
export const isoDaysFromNow = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10)
export const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString()
export const stamp = () => Date.now().toString(36)

export const lifecycleSlices = (counts: Record<Lifecycle, number>) =>
  (Object.keys(counts) as Lifecycle[]).map((k) => ({ name: k, value: counts[k], color: LIFECYCLE_COLOR[k] }))

// ── pending task aging (§9: 0–3, 4–7, 8–15, 15+ days) ─────────────────────
export const AGING = ['0–3', '4–7', '8–15', '15+'] as const
export type AgingBucket = (typeof AGING)[number]
export const agingOf = (t: WfTask): AgingBucket => {
  const d = daysAgo(t.createdAt)
  return d <= 3 ? '0–3' : d <= 7 ? '4–7' : d <= 15 ? '8–15' : '15+'
}
export const isOpenTask = (t: WfTask) => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Overdue'
export const isOverdueTask = (t: WfTask) => isOpenTask(t) && (t.status === 'Overdue' || new Date(t.dueAt).getTime() < Date.now())

