// KPI + chart aggregations for Site Master and Site Installation (Project spec §9, §9.2).
// N/A and non-applicable items are never part of a denominator.
import { useMemo } from 'react'
import { LIFECYCLES, PENDING_CATEGORIES, buildSiteMasterRows, useProjects, type Lifecycle, type PendingCategory, type SiteMasterRow } from '@/data/projects'
import { STAGES, activePhotos, checklistItems, installCompletion, isNA, isDone, isRunning, stageState, useSiteInstallations, type InstallRecord } from '@/data/siteInstallation'
import { useWorkflow, type WfTask } from '@/data/workflow'
import { useNetwork, useSites } from '@/data/network'
import { useFranchises } from '@/data/franchises'
import { AGING, agingOf, isOpenTask, isOverdueTask, type AgingBucket } from './format'

export const PROJECT_MODULES = ['Site Installation', 'Projects'] as const
export const projectTasks = (tasks: WfTask[]) => tasks.filter((t) => (PROJECT_MODULES as readonly string[]).includes(t.module))

export function lifecycleCounts(rows: SiteMasterRow[]) {
  const c = Object.fromEntries(LIFECYCLES.map((l) => [l, 0])) as Record<Lifecycle, number>
  rows.forEach((r) => c[r.lifecycle]++)
  return c
}

export function pendingCounts(rows: SiteMasterRow[]) {
  const c = Object.fromEntries(PENDING_CATEGORIES.map((p) => [p, 0])) as Record<PendingCategory, number>
  rows.forEach((r) => r.pending.forEach((p) => c[p.cat]++))
  return c
}

const hours = (a?: string, b?: string) => (a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 3600_000 : NaN)
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)

export type Kpis = {
  siteCompletion: { n: number; d: number }
  installCompletion: { n: number; d: number }
  approvalTatHrs: number
  avgInstallTatDays: number
  overdueTasks: number
  rejection: { n: number; d: number }
  employeeCompletion: { n: number; d: number }
}
export function computeKpis(rows: SiteMasterRow[], installs: InstallRecord[], tasks: WfTask[]): Kpis {
  const eligible = rows.filter((r) => r.lifecycle === 'Active' || r.lifecycle === 'Incomplete' || r.lifecycle === 'Completed')
  const completed = eligible.filter((r) => r.lifecycle === 'Completed').length
  const running = installs.filter(isRunning)
  const ic = running.reduce((a, r) => {
    const c = installCompletion(r)
    return { n: a.n + c.done, d: a.d + c.total }
  }, { n: 0, d: 0 })
  const approved = installs.filter((r) => r.approvedAt && r.submittedAt)
  const photos = installs.flatMap((r) => r.photos.filter((p) => p.review !== 'Pending Review'))
  const adminDecisions = installs.flatMap((r) => r.history.filter((h) => h.action.startsWith('Admin approved') || h.action === 'Admin rejected'))
  const rejected = photos.filter((p) => p.review === 'Rejected').length + adminDecisions.filter((h) => h.action === 'Admin rejected').length
  const assigned = rows.filter((r) => r.lifecycle !== 'Closed' && r.lifecycle !== 'Archived' && r.lifecycle !== 'Pipeline' && r.p.executive !== 'Unassigned')
  return {
    siteCompletion: { n: completed, d: eligible.length },
    installCompletion: ic,
    approvalTatHrs: avg(approved.map((r) => hours(r.submittedAt, r.approvedAt)).filter((x) => x >= 0)),
    avgInstallTatDays: avg(approved.map((r) => hours(r.startedAt, r.approvedAt) / 24).filter((x) => x >= 0)),
    overdueTasks: projectTasks(tasks).filter(isOverdueTask).length,
    rejection: { n: rejected, d: photos.length + adminDecisions.length },
    employeeCompletion: { n: assigned.filter((r) => r.lifecycle === 'Completed').length, d: assigned.length },
  }
}

export function employeePerf(rows: SiteMasterRow[]) {
  const m = new Map<string, { name: string; assigned: number; completed: number; incomplete: number; days: number[] }>()
  rows.forEach((r) => {
    if (r.lifecycle === 'Closed' || r.lifecycle === 'Archived' || r.lifecycle === 'Pipeline') return
    const e = m.get(r.p.executive) ?? { name: r.p.executive, assigned: 0, completed: 0, incomplete: 0, days: [] }
    e.assigned++
    if (r.lifecycle === 'Completed') {
      e.completed++
      if (r.completedOn) e.days.push(Math.max(0, (new Date(r.completedOn).getTime() - new Date(r.p.startDate ?? r.p.createdAt).getTime()) / 86400_000))
    }
    if (r.lifecycle === 'Incomplete') e.incomplete++
    m.set(r.p.executive, e)
  })
  return [...m.values()].map((e) => ({ ...e, avgDays: Math.round(avg(e.days)) })).sort((a, b) => b.assigned - a.assigned)
}

export function franchisePerf(rows: SiteMasterRow[], installs: InstallRecord[]) {
  const pendingSub = new Map<string, number>()
  installs.filter((r) => r.status === 'Submitted by Franchise' || r.status === 'Correction Requested' || r.status === 'In Progress').forEach((r) => pendingSub.set(r.frId, (pendingSub.get(r.frId) ?? 0) + 1))
  const m = new Map<string, { frId: string; name: string; sites: number; completed: number; incomplete: number; pct: number; pendingSubmissions: number }>()
  rows.forEach((r) => {
    if (r.lifecycle === 'Closed' || r.lifecycle === 'Archived') return
    const e = m.get(r.site.frId) ?? { frId: r.site.frId, name: r.frName, sites: 0, completed: 0, incomplete: 0, pct: 0, pendingSubmissions: pendingSub.get(r.site.frId) ?? 0 }
    e.sites++
    if (r.lifecycle === 'Completed') e.completed++
    if (r.lifecycle === 'Incomplete') e.incomplete++
    e.pct += r.pct
    m.set(r.site.frId, e)
  })
  return [...m.values()].map((e) => ({ ...e, pct: Math.round(e.pct / e.sites) }))
}

/** Month-wise completed sites, last 12 months (key = yyyy-mm). */
export function monthlyCompletion(rows: SiteMasterRow[]) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, name: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), value: 0 }
  })
  rows.forEach((r) => {
    if (!r.completedOn) return
    const k = r.completedOn.slice(0, 7)
    const m = months.find((x) => x.key === k)
    if (m) m.value++
  })
  return months
}

export function taskAging(tasks: WfTask[]) {
  const open = projectTasks(tasks).filter(isOpenTask)
  return AGING.map((b) => {
    const inB = open.filter((t) => agingOf(t) === b)
    return { name: b, 'Site Installation': inB.filter((t) => t.module === 'Site Installation').length, Projects: inB.filter((t) => t.module === 'Projects').length }
  })
}
export const siteIdsWithAging = (tasks: WfTask[], b: AgingBucket) => new Set(projectTasks(tasks).filter((t) => isOpenTask(t) && agingOf(t) === b).map((t) => t.siteId).filter(Boolean) as string[])

// ── installation aggregates ──────────────────────────────────────────────
export function stageProgress(installs: InstallRecord[]) {
  return STAGES.map((s) => {
    let complete = 0
    let pending = 0
    let correction = 0
    installs.forEach((r) => {
      const st = stageState(r, s.key)
      if (st === 'Complete') complete++
      else if (st === 'Correction') correction++
      else pending++
    })
    return { name: s.label, key: s.key, Complete: complete, Pending: pending, Correction: correction }
  })
}

export function approvalSplit(installs: InstallRecord[]) {
  const c = { Pending: 0, Approved: 0, Rejected: 0, 'Not Submitted': 0 }
  installs.forEach((r) => c[r.approval]++)
  return c
}

export function equipmentStatus(installs: InstallRecord[]) {
  return checklistItems('equipment')
    .filter((i) => i.mandatory)
    .map((i) => {
      let done = 0
      let pending = 0
      let na = 0
      installs.forEach((r) => {
        const s = r.equipment[i.key]?.status
        if (isNA(s)) na++
        else if (isDone(s)) done++
        else pending++
      })
      return { name: i.label, key: i.key, Done: done, Pending: pending, NA: na }
    })
}

export const pendingReviewCount = (r: InstallRecord) => activePhotos(r).filter((p) => p.review === 'Pending Review').length
export const rejectedPhotoCount = (r: InstallRecord) => activePhotos(r).filter((p) => p.review === 'Rejected').length

/** Live Site Master rows (siteStore + project overlay + installation + hierarchy) for any page. */
export function useSiteMasterData() {
  const { sites } = useSites()
  const ps = useProjects()
  const inst = useSiteInstallations()
  const frs = useFranchises()
  const net = useNetwork()
  const wf = useWorkflow()
  const rows = useMemo(() => buildSiteMasterRows(sites, ps, inst, frs, net), [sites, ps, inst, frs, net])
  return { rows, installs: inst.records, tasks: wf.tasks, ps, wf }
}
