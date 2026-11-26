// Dexter AI – Site Master Agent overview (Project spec §4.3, §7.2, §7.3).
// Mock "AI": every figure is computed from live ERP data the user's role can read. It is read-only —
// recommendations link to the normal workflow; the AI never changes a record.
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronUp, Clock, RefreshCw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { useRole } from '@/lib/rbac'
import { employeeById, logAudit, type WfTask } from '@/data/workflow'
import { LIFECYCLES, LIFECYCLE_COLOR, PENDING_CATEGORIES, incompleteReason, type Lifecycle, type SiteMasterRow } from '@/data/projects'
import { STAGES, activePhotos, currentStage, isRunning, type InstallRecord } from '@/data/siteInstallation'
import { daysAgo, fmtD, fmtDT, isOpenTask, isoDaysAgo, isOverdueTask } from './format'
import { employeePerf, franchisePerf, lifecycleCounts, pendingCounts, projectTasks } from './metrics'

export const AI_MODEL = 'Dexter AI · Site Master Agent v0.3 (rule-based mock)'

type Drill = (params: Record<string, string>) => void

export function AiProjectOverview({ rows, installs, tasks, onDrill, defaultOpen = false }: { rows: SiteMasterRow[]; installs: InstallRecord[]; tasks: WfTask[]; onDrill: Drill; defaultOpen?: boolean }) {
  const role = useRole()
  const [open, setOpen] = useState(defaultOpen)
  const [refreshedAt, setRefreshedAt] = useState(() => new Date().toISOString())
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  const a = useMemo(() => analyse(rows, installs, tasks), [rows, installs, tasks])
  const period = `${fmtD(isoDaysAgo(90))} – ${fmtD(refreshedAt)}`

  const refresh = () => {
    setRefreshedAt(new Date().toISOString())
    logAudit('Dexter AI', 'SITE-MASTER-OVERVIEW', 'AI overview refreshed', `${AI_MODEL} · ${rows.length} records in scope`)
    toast('AI overview refreshed from live Site Master data', 'info')
  }
  const sendFeedback = (v: 'up' | 'down') => {
    setFeedback(v)
    logAudit('Dexter AI', 'SITE-MASTER-OVERVIEW', 'AI feedback', `${v === 'up' ? 'Helpful' : 'Not helpful'} · ${AI_MODEL}`)
    toast('Thanks — feedback logged with the model version')
  }

  return (
    <section className="overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/70 via-white to-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-600 text-white">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
              Dexter AI – Overview <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">AI-generated</span>
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Reporting period {period} · Last refresh {fmtDT(refreshedAt)} · {AI_MODEL} · Sources: Site Master, Site Installation, Task Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={refresh}>
            Refresh
          </Button>
          <Button size="sm" variant="ghost" icon={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide analysis' : 'Full analysis'}
          </Button>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          <AiCard label="Total Sites" value={rows.length} color="#1e3f95" onClick={() => onDrill({})} />
          {(['Active', 'Incomplete', 'Pipeline', 'Completed', 'Closed', 'Archived'] as Lifecycle[]).map((l) => (
            <AiCard key={l} label={l === 'Active' ? 'Active Projects' : l === 'Closed' || l === 'Archived' ? `${l} Sites` : `${l} Projects`} value={a.lc[l]} color={LIFECYCLE_COLOR[l]} onClick={() => onDrill({ status: l })} />
          ))}
        </div>

        <div className="rounded-lg border border-violet-100 bg-white p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-violet-700">
            <Sparkles size={12} /> AI management summary
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-2">{a.summary}</p>
        </div>

        {open && (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Stage-wise analysis" sub="Running installations by current stage">
              {a.stages.map((s) => (
                <BarRow key={s.key} label={s.label} n={s.n} max={a.maxStage} to={`/projects/installation?stage=${s.key}`} />
              ))}
            </Panel>

            <Panel title="Pending analysis" sub="Which module is pending (detail stays in the module)">
              {PENDING_CATEGORIES.map((c) => (
                <BarRow key={c} label={c} n={a.pending[c]} max={a.maxPending} onClick={() => onDrill({ pending: c })} tone="bg-amber-500" />
              ))}
            </Panel>

            <Panel title="Delay analysis" sub="Incomplete projects and the reason" icon={<Clock size={13} />}>
              {a.delays.map((d) => (
                <BarRow key={d.reason} label={d.reason} n={d.n} max={a.maxDelay} onClick={() => onDrill({ status: 'Incomplete' })} tone="bg-red-500" />
              ))}
              <p className="mt-2 text-[11px] text-muted">Average {a.avgOverdue} day(s) past target date across {a.overdueCount} overdue project(s).</p>
            </Panel>

            <Panel title="Employee performance" sub="Assigned vs completed sites, average days to complete" icon={<Users size={13} />}>
              <table className="w-full text-[11.5px]">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-1 font-medium">Executive</th>
                    <th className="py-1 text-right font-medium">Assigned</th>
                    <th className="py-1 text-right font-medium">Done</th>
                    <th className="py-1 text-right font-medium">Rate</th>
                    <th className="py-1 text-right font-medium">Avg days</th>
                  </tr>
                </thead>
                <tbody>
                  {a.emp.slice(0, 6).map((e) => (
                    <tr key={e.name} className="cursor-pointer border-t border-line-soft hover:bg-surface" onClick={() => onDrill({ exec: e.name })}>
                      <td className="py-1 font-medium text-ink">{e.name}</td>
                      <td className="py-1 text-right">{e.assigned}</td>
                      <td className="py-1 text-right">{e.completed}</td>
                      <td className="py-1 text-right">{e.assigned ? Math.round((e.completed / e.assigned) * 100) : 0}%</td>
                      <td className="py-1 text-right">{Number.isNaN(e.avgDays) ? '—' : e.avgDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Franchise performance" sub="Most pending work and submissions" icon={<TrendingUp size={13} />}>
              {a.fr.map((f) => (
                <button key={f.frId} type="button" onClick={() => onDrill({ fr: f.name })} className="flex w-full items-center justify-between gap-2 border-t border-line-soft py-1.5 text-left text-[11.5px] first:border-0 hover:text-primary">
                  <span className="min-w-0 truncate font-medium">{f.name}</span>
                  <span className="shrink-0 text-muted">
                    {f.completed}/{f.sites} done · {f.incomplete} incomplete · {f.pendingSubmissions} submission(s)
                  </span>
                </button>
              ))}
            </Panel>

            <Panel title="Escalation overview" sub="Project / installation tasks" icon={<AlertTriangle size={13} />}>
              <div className="mb-2 grid grid-cols-4 gap-1.5 text-center">
                {[
                  ['Open', a.esc.open],
                  ['Overdue', a.esc.overdue],
                  ['L2', a.esc.l2],
                  ['L3+', a.esc.l3],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md bg-surface py-1.5">
                    <div className="text-[15px] font-semibold text-ink">{v}</div>
                    <div className="text-[10px] text-muted">{k}</div>
                  </div>
                ))}
              </div>
              {a.esc.top.map((t) => (
                <div key={t.id} className="border-t border-line-soft py-1.5 text-[11.5px]">
                  <div className="truncate font-medium text-ink">{t.title}</div>
                  <div className="text-muted">
                    {employeeById(t.assignedTo)?.name ?? t.assignedTo} · L{t.escalationLevel} · {daysAgo(t.dueAt)} day(s) overdue
                  </div>
                </div>
              ))}
              {!a.esc.top.length && <p className="text-[11.5px] text-muted">No overdue tasks.</p>}
            </Panel>

            <Panel title="Risk identification" sub="Missing documents, rejected photos, delayed approvals" icon={<AlertTriangle size={13} />}>
              {a.risks.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-2 border-t border-line-soft py-1.5 text-[11.5px] first:border-0">
                  <span>
                    <span className="font-medium text-ink">{r.label}</span>
                    <span className="block text-muted">{r.hint}</span>
                  </span>
                  {r.to ? (
                    <Link to={r.to} className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700 hover:underline">
                      {r.n}
                    </Link>
                  ) : (
                    <button type="button" onClick={r.drill} className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700 hover:underline">
                      {r.n}
                    </button>
                  )}
                </div>
              ))}
            </Panel>

            <Panel title="AI recommendations" sub="Next action, priority and responsible employee — suggestions only" icon={<Sparkles size={13} />} className="lg:col-span-2 xl:col-span-2">
              <ol className="space-y-1.5">
                {a.recs.map((r, i) => (
                  <li key={r.siteId} className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/40 px-2.5 py-2 text-[11.5px]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-600 text-[10px] font-bold text-white">{i + 1}</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', r.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{r.priority}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-ink">{r.siteId}</span> · {r.action}
                      <span className="block text-muted">
                        Responsible: {r.owner} · {r.why}
                      </span>
                    </span>
                    <Link to={r.to} className="shrink-0 font-semibold text-primary hover:underline">
                      Open
                    </Link>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600" />
            AI reads only records permitted for your role ({role}). AI cannot approve a site, delete records, alter financial/legal data or change project status — every action goes through an authorized user and the normal workflow.
          </span>
          <span className="flex items-center gap-1">
            Was this useful?
            <button type="button" aria-label="Helpful" onClick={() => sendFeedback('up')} className={cn('rounded p-1 hover:bg-white', feedback === 'up' && 'text-emerald-600')}>
              <ThumbsUp size={13} />
            </button>
            <button type="button" aria-label="Not helpful" onClick={() => sendFeedback('down')} className={cn('rounded p-1 hover:bg-white', feedback === 'down' && 'text-red-600')}>
              <ThumbsDown size={13} />
            </button>
          </span>
        </div>
      </div>
    </section>
  )
}

function AiCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-violet-300">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-1 text-[20px] leading-none font-semibold text-ink">{value.toLocaleString('en-IN')}</div>
    </button>
  )
}

function Panel({ title, sub, icon, children, className }: { title: string; sub?: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-line bg-white p-3', className)}>
      <h4 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
        {icon && <span className="text-violet-600">{icon}</span>}
        {title}
      </h4>
      {sub && <p className="mb-2 text-[10.5px] text-muted">{sub}</p>}
      {children}
    </div>
  )
}

function BarRow({ label, n, max, onClick, to, tone = 'bg-violet-500' }: { label: string; n: number; max: number; onClick?: () => void; to?: string; tone?: string }) {
  const inner = (
    <>
      <span className="w-[46%] truncate text-left text-ink-2">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${max ? (n / max) * 100 : 0}%` }} />
      </span>
      <span className="w-8 text-right font-semibold text-ink">{n}</span>
    </>
  )
  const cls = 'flex w-full items-center gap-2 py-1 text-[11.5px] hover:text-primary'
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

// ── analysis (deterministic, from live data) ─────────────────────────────
function analyse(rows: SiteMasterRow[], installs: InstallRecord[], tasks: WfTask[]) {
  const lc = lifecycleCounts(rows)
  const pending = pendingCounts(rows)
  const running = installs.filter(isRunning)
  const stages = STAGES.slice(1).map((s) => ({ key: s.key, label: s.key === 'final' ? 'Final approval' : s.label, n: running.filter((r) => currentStage(r).key === s.key).length }))
  const incomplete = rows.filter((r) => r.lifecycle === 'Incomplete')
  const reasonMap = new Map<string, number>()
  incomplete.forEach((r) => {
    const k = incompleteReason(r.p, r.site, r.install) || 'Mandatory activity pending'
    const key = k.startsWith('Step on hold') ? 'Step on hold (awaiting documents)' : k
    reasonMap.set(key, (reasonMap.get(key) ?? 0) + 1)
  })
  const delays = [...reasonMap.entries()].map(([reason, n]) => ({ reason, n })).sort((x, y) => y.n - x.n)
  const overdueRows = rows.filter((r) => (r.lifecycle === 'Active' || r.lifecycle === 'Incomplete') && new Date(r.p.targetDate).getTime() < Date.now())
  const avgOverdue = overdueRows.length ? Math.round(overdueRows.reduce((s, r) => s + daysAgo(r.p.targetDate), 0) / overdueRows.length) : 0
  const emp = employeePerf(rows)
  const fr = franchisePerf(rows, installs)
    .sort((x, y) => y.incomplete + y.pendingSubmissions - (x.incomplete + x.pendingSubmissions))
    .slice(0, 5)
  const pt = projectTasks(tasks)
  const openT = pt.filter(isOpenTask)
  const overdueT = pt.filter(isOverdueTask)
  const esc = {
    open: openT.length,
    overdue: overdueT.length,
    l2: overdueT.filter((t) => t.escalationLevel === 2).length,
    l3: overdueT.filter((t) => t.escalationLevel >= 3).length,
    top: [...overdueT].sort((x, y) => x.dueAt.localeCompare(y.dueAt)).slice(0, 3),
  }
  const live = rows.filter((r) => r.lifecycle === 'Active' || r.lifecycle === 'Incomplete')
  const missingDocs = live.filter((r) => Object.values(r.site.legal).some((l) => l.upload === 'Pending' || l.verification === 'Re-upload Required')).length
  const rejectedPhotoInst = running.filter((r) => activePhotos(r).some((p) => p.review === 'Rejected'))
  const delayedApprovals = running.filter((r) => r.status === 'Pending Admin Approval' && daysAgo(r.submittedAt) >= 2)
  const repeated = installs.filter((r) => r.history.filter((h) => /rejected/i.test(h.action)).length >= 2)
  const risks: { label: string; hint: string; n: number; to?: string; drill?: () => void }[] = [
    { label: 'Missing / re-upload legal documents', hint: 'Active sites with a document not uploaded or re-upload required', n: missingDocs, to: '/legal' },
    { label: 'Rejected photos awaiting re-upload', hint: 'Installations with an open CRM photo rejection', n: rejectedPhotoInst.length, to: '/projects/installation?status=Correction Requested' },
    { label: 'Delayed Admin approvals (≥ 2 days)', hint: 'Verified submissions waiting for Admin', n: delayedApprovals.length, to: '/projects/installation?status=Pending Admin Approval' },
    { label: 'Repeated rejections', hint: 'Installations rejected two or more times', n: repeated.length, to: '/projects/installation?history=all' },
  ]
  // recommendations — priority by escalation / overdue / stage
  const recs = [
    ...delayedApprovals.map((r) => ({ siteId: r.siteId, action: 'Admin to review and approve / reject the verified installation', owner: 'Meera Iyer (Admin)', priority: 'High' as const, score: 100 + daysAgo(r.submittedAt), why: `Waiting ${daysAgo(r.submittedAt)} day(s) for approval`, to: `/projects/installation/${r.id}` })),
    ...running
      .filter((r) => r.status === 'Rejected by Admin')
      .map((r) => ({ siteId: r.siteId, action: 'CRM to correct Admin-rejected items and resubmit', owner: `${r.crmExecutive} (CRM)`, priority: 'High' as const, score: 90, why: r.adminRemarks ?? 'Rejected by Admin', to: `/projects/installation/${r.id}` })),
    ...running
      .filter((r) => r.status === 'Submitted by Franchise')
      .map((r) => ({ siteId: r.siteId, action: 'Verify franchise submission and review pending photos', owner: `${r.crmExecutive} (CRM)`, priority: 'Medium' as const, score: 60 + daysAgo(r.franchiseSubmittedAt), why: `Submitted ${daysAgo(r.franchiseSubmittedAt)} day(s) ago`, to: `/projects/installation/${r.id}` })),
    ...incomplete
      .filter((r) => new Date(r.p.targetDate).getTime() < Date.now())
      .sort((x, y) => x.p.targetDate.localeCompare(y.p.targetDate))
      .slice(0, 5)
      .map((r) => ({ siteId: r.site.siteId, action: `Clear ${r.pending[0]?.cat ?? 'pending activity'}`, owner: `${r.p.executive} (Project Executive)`, priority: daysAgo(r.p.targetDate) > 30 ? ('High' as const) : ('Medium' as const), score: 40 + Math.min(50, daysAgo(r.p.targetDate)), why: `${daysAgo(r.p.targetDate)} day(s) past target`, to: `/projects/active/${encodeURIComponent(r.p.id)}` })),
  ]
    .sort((x, y) => y.score - x.score)
    .filter((r, i, arr) => arr.findIndex((z) => z.siteId === r.siteId) === i)
    .slice(0, 6)
  const topPending = PENDING_CATEGORIES.map((c) => [c, pending[c]] as const).sort((x, y) => y[1] - x[1])[0]
  const worstStage = [...stages].sort((x, y) => y.n - x.n)[0]
  const summary =
    `${lc.Incomplete.toLocaleString('en-IN')} of ${rows.length.toLocaleString('en-IN')} sites are incomplete and ${lc.Active.toLocaleString('en-IN')} are active; ${lc.Pipeline} are still in pipeline. ` +
    `The most common pending module is "${topPending[0]}" (${topPending[1]} sites). ` +
    (worstStage?.n ? `In Site Installation, ${worstStage.n} running record(s) are held at "${worstStage.label}". ` : '') +
    `${esc.overdue} project task(s) are overdue (${esc.l3} at L3 or above). ` +
    (delayedApprovals.length ? `${delayedApprovals.length} verified submission(s) are waiting ≥ 2 days for Admin approval — handle these first. ` : '') +
    `Priority is based on due dates, project stage and escalation level.`
  return {
    lc, pending, stages, maxStage: Math.max(1, ...stages.map((s) => s.n)), maxPending: Math.max(1, ...PENDING_CATEGORIES.map((c) => pending[c])),
    delays, maxDelay: Math.max(1, ...delays.map((d) => d.n)), avgOverdue, overdueCount: overdueRows.length, emp, fr, esc, risks, recs, summary,
    lifecycles: LIFECYCLES,
  }
}
