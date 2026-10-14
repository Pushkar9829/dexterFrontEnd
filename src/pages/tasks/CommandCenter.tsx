import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, ChevronDown, CircleCheck, Clock3, GitBranch, Gauge, ShieldCheck, Sparkles, TrendingUp, TriangleAlert, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { CURRENT_EMPLOYEE, DEPTS, getTask, isOpen, REGIONS, reassign, slaOf, tasksStore, VERIFICATION_TEAM, type Dept, type Region, type Task } from '@/data/tasks'
import {
  BLOCKER_REGION_W,
  BLOCKERS,
  DEPT_BASE,
  kpis,
  LAST_MONTH,
  PERIODS,
  share,
  STAGES,
  WF_TOTALS,
  WORKFLOWS,
  type Period,
  type StageStatus,
  type Workflow,
} from '@/data/tasksCommand'
import { Footer, HeroBanner } from './ui'

const STAGE_CLS: Record<StageStatus, string> = {
  Complete: 'bg-emerald-50 text-emerald-700',
  Approval: 'bg-amber-50 text-amber-700',
  Blocked: 'bg-red-50 text-red-700',
  'In progress': 'bg-primary-soft text-primary',
  Waiting: 'bg-amber-50 text-amber-700',
  Queued: 'bg-slate-100 text-slate-600',
}

/** Workflow stages reflect live task state (closing TSK-1048 completes Verification and frees Finance). */
function liveStages(wf: Workflow, t?: Task): StageStatus[] {
  const st = [...wf.stages]
  if (!t) return st
  const i = wf.stageOfTask
  if (t.status === 'Closed') {
    st[i] = 'Complete'
    if (i + 1 < st.length && st[i + 1] !== 'Complete') st[i + 1] = 'In progress'
  } else if (t.status === 'Pending Approval') st[i] = 'Approval'
  else if (t.status === 'Waiting/Blocked') st[i] = 'Waiting'
  else if (t.status === 'In Progress') st[i] = 'In progress'
  return st
}

export default function CommandCenter() {
  const { tasks } = tasksStore.use()
  const nav = useNavigate()
  const [depts, setDepts] = useState<Dept[]>([...DEPTS])
  const [regions, setRegions] = useState<Region[]>([...REGIONS])
  const [period, setPeriod] = useState<Period>('month')
  const [allWf, setAllWf] = useState(false)
  const [rebalance, setRebalance] = useState(false)
  const [trends, setTrends] = useState(false)

  const k = useMemo(() => kpis(period, depts, regions), [period, depts, regions])
  const sh = useMemo(() => share(period, depts, regions), [period, depts, regions])
  const scope = (n: number) => Math.round(n * sh)

  const wfs = WORKFLOWS.filter(
    (w) => regions.includes(w.region) && (depts.includes(w.ownerDept) || liveStages(w, getTask(w.taskId)).some((s, i) => s !== 'Complete' && depts.includes(STAGES[i] as Dept))),
  )
  const shownWf = allWf ? wfs : wfs.slice(0, 4)

  const regionW = regions.reduce((a, r) => a + BLOCKER_REGION_W[r], 0)
  const periodW = kpis(period, [...DEPTS], [...REGIONS]).total / kpis('month', [...DEPTS], [...REGIONS]).total
  const blockers = BLOCKERS.map((b) => ({ ...b, count: Math.round(depts.reduce((a, d) => a + (b.byDept[d] ?? 0), 0) * regionW * periodW) }))
  const blockTotal = blockers.reduce((a, b) => a + b.count, 0)
  const biggest = [...blockers].sort((a, b) => b.count - a.count)[0]

  // the panel tracks the three hand-off departments of the activation pipeline (as in CRM-07); other filters fall back to the selected departments
  const PIPELINE: Dept[] = ['Verification', 'Franchise', 'Finance']
  const wlDepts = PIPELINE.some((d) => depts.includes(d)) ? PIPELINE.filter((d) => depts.includes(d)) : depts
  const workload = DEPT_BASE.filter((d) => wlDepts.includes(d.dept))
    .map((d) => ({ dept: d.dept, pct: Math.round((d.active / d.capacity) * 100) }))
    .sort((a, b) => b.pct - a.pct)

  const t1048 = tasks.find((t) => t.id === 'TSK-1048')
  const rahulActive = tasks.filter((t) => !t.subtask && t.assignee === CURRENT_EMPLOYEE && isOpen(t) && !['New', 'Assigned'].includes(t.status)).length
  const overCap = Math.max(0, rahulActive - 6)

  const pct = (n: number) => `${n.toFixed(1)}%`
  const deptLabel = depts.length === DEPTS.length ? 'All departments' : depts.length === 1 ? depts[0] : `${depts.length} departments`
  const regionLabel = regions.length === REGIONS.length ? 'All regions' : regions.length === 1 ? `${regions[0]} region` : `${regions.length} regions`

  return (
    <div className="space-y-5">
      <HeroBanner title="Management Command Center" sub="Organization-wide task performance, dependencies and exceptions." code="CRM-07" />

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect label={deptLabel} all={[...DEPTS]} value={depts} onChange={(v) => setDepts(v as Dept[])} />
        <label className="relative flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white pr-2 pl-3 text-[13px] font-semibold">
          <CalendarDays size={14} className="text-primary" />
          <select aria-label="Date range" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="h-full cursor-pointer appearance-none bg-transparent pr-4 outline-none">
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 text-muted" />
        </label>
        <MultiSelect label={regionLabel} all={[...REGIONS]} value={regions} onChange={(v) => setRegions(v as Region[])} />
        {(depts.length !== DEPTS.length || regions.length !== REGIONS.length || period !== 'month') && (
          <button
            className="text-[12px] font-semibold text-primary hover:underline"
            onClick={() => {
              setDepts([...DEPTS])
              setRegions([...REGIONS])
              setPeriod('month')
            }}
          >
            Reset
          </button>
        )}
        <span className="ml-auto text-[12px] text-muted">Director / Senior Management · {k.total.toLocaleString('en-IN')} tasks in scope</span>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<CircleCheck size={17} />} title="Overall Task Completion" value={pct(k.completion)} caption={`${k.closed.toLocaleString('en-IN')} of ${k.total.toLocaleString('en-IN')} tasks closed`} trend={`${Math.abs(LAST_MONTH.completion)} pp vs last month`} good up />
        <Kpi icon={<ShieldCheck size={17} />} title="SLA Compliance" value={pct(k.sla)} caption={`Target ≥ 95% · ${k.breaches} breaches`} trend={`${LAST_MONTH.sla} pp vs last month`} good={false} up={false} />
        <Kpi icon={<Clock3 size={17} />} title="Average TAT" value={`${k.tat.toFixed(1)}h`} caption="Across all completed tasks" trend={`${LAST_MONTH.tat}h vs last month`} good up={false} />
        <Kpi icon={<Gauge size={17} />} title="Organizational Productivity" value={`${k.score} / 100`} caption={`Aggregated score · ${k.depts} departments`} trend={`${Math.abs(LAST_MONTH.score)} points vs last month`} good up />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,330px)_minmax(0,316px)]">
        {/* Coordination matrix */}
        <Card className="min-w-0 xl:col-start-1 xl:row-start-1">
          <div className="px-5 pt-5">
            <h3 className="text-[15px] font-semibold">Department Coordination Matrix</h3>
            <p className="mt-0.5 text-[12px] text-muted">Active cross-department pipeline · {wfs.length} priority workflows</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded bg-primary-soft px-2 py-1 text-primary">{scope(WF_TOTALS.active)} active workflows</span>
              <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">{scope(WF_TOTALS.waiting)} waiting</span>
              <span className="rounded bg-red-50 px-2 py-1 text-red-700">{scope(WF_TOTALS.overdue)} overdue</span>
            </div>
          </div>
          <div className="divide-y divide-line-soft px-5">
            {shownWf.length === 0 && <p className="py-8 text-center text-[13px] text-muted">No priority workflows for this filter.</p>}
            {shownWf.map((w) => {
              const t = getTask(w.taskId)
              const stages = liveStages(w, t)
              const s = t ? slaOf(t) : undefined
              return (
                <div key={w.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink">{w.name}</div>
                      <Link to={`/tasks/my/${w.taskId}`} className="mt-1 block truncate text-[13px] text-primary hover:underline">
                        {w.taskId} · {w.taskTitle}
                      </Link>
                    </div>
                    <span className="shrink-0 rounded border border-line px-2 py-0.5 text-[11px] text-muted">{w.id}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {STAGES.map((st, i) => (
                      <div key={st}>
                        <div className="text-[11px] text-muted">
                          {st}
                          {i < 3 && ' →'}
                        </div>
                        <span className={cn('mt-1 inline-block rounded px-2 py-0.5 text-[11px] font-semibold', STAGE_CLS[stages[i]])}>{stages[i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap justify-between gap-2 text-[12px]">
                    <span className="text-muted">
                      {w.owner} · {w.ownerDept}
                    </span>
                    {s && <span className={cn(s.closed ? 'text-emerald-700' : s.overdue || s.remainingMin <= 240 ? 'text-red-600' : 'text-muted')}>{s.closed ? `Closed · ${s.line}` : `${s.ratio} · ${s.line}`}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          {wfs.length > 4 && (
            <div className="border-t border-line px-5 py-3">
              <button onClick={() => setAllWf((v) => !v)} className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
                {allWf ? 'Show priority workflows only' : 'View all department workflows'} <ArrowRight size={13} />
              </button>
            </div>
          )}
        </Card>

        {/* Why is work stuck */}
        <Card className="min-w-0 xl:col-start-2 xl:row-start-1">
          <div className="px-5 pt-5">
            <h3 className="text-[15px] font-semibold">Why Is Work Stuck?</h3>
            <p className="mt-0.5 text-[12px] text-muted">{blockTotal} pending tasks · grouped by primary blocker</p>
          </div>
          <div className="divide-y divide-line-soft px-5">
            {blockers.map((b) => {
              const p = blockTotal ? Math.round((b.count / blockTotal) * 100) : 0
              return (
                <div key={b.key} className="py-4">
                  <div className="flex justify-between text-[13px]">
                    <span className="font-semibold text-ink">{b.label}</span>
                    <span className="font-semibold text-amber-700">
                      {b.count} · {p}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-700" style={{ width: `${p}%` }} />
                  </div>
                  <div className="mt-2 text-[12px] text-muted">{b.who}</div>
                  <Link to={`/tasks/my/${b.taskId}`} className="mt-1 block text-[12px] text-primary hover:underline">
                    {b.taskId} · {b.taskLabel}
                  </Link>
                </div>
              )
            })}
          </div>
          <div className="px-5 pb-5">
            {biggest && biggest.count > 0 && (
              <div className="rounded-lg bg-amber-50 p-4 text-[12px] text-amber-800">
                <div className="font-semibold">{biggest.key === 'approval' ? 'Approval queue is the largest bottleneck' : `${biggest.label} is the largest bottleneck`}</div>
                <p className="mt-1.5">
                  {biggest.key === 'approval'
                    ? '6 approvals reach SLA within 2 hours. Prioritize manager review before finance handoff.'
                    : `${biggest.count} tasks are waiting on ${biggest.label.toLowerCase()}. Escalate the oldest items first.`}
                </p>
              </div>
            )}
            <Button variant="secondary" size="sm" className="mt-4" icon={<ArrowRight size={14} />} onClick={() => nav('/tasks/approval-pending')}>
              Review approval queue
            </Button>
          </div>
        </Card>

        {/* AI panel + workload */}
        <div className="min-w-0 space-y-5 xl:col-start-3 xl:row-span-2 xl:row-start-1">
          <Card>
            <div className="px-5 pt-5">
              <h3 className="text-[15px] font-semibold">AI Intelligence Panel</h3>
              <p className="mt-0.5 text-[12px] text-muted">Updated 09:14 IST · Organization-wide</p>
              <span className="mt-3 inline-block rounded bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary">4 actionable insights</span>
            </div>
            <div className="divide-y divide-line-soft px-5">
              <Insight icon={<TriangleAlert size={16} className="text-brand-red" />} title="SLA breach risks" link={{ label: 'Open at-risk tasks', to: '/tasks/today' }}>
                6 tasks are likely to breach in 2 hours.{' '}
                {t1048 && isOpen(t1048) ? `TSK-1048 has ${slaOf(t1048).line.replace(' left', ' remaining')} and an 82% risk score; manager approval is pending.` : 'TSK-1048 has been closed and no longer contributes to breach risk.'}
              </Insight>
              <Insight icon={<Users size={16} className="text-primary" />} title="Workload imbalances" link={{ label: 'Review team allocation', to: '/tasks/my?tab=team' }} onClick={() => tasksStore.set((s) => ({ ...s, viewAs: 'Team Leader' }))}>
                Verification is at 132% capacity; Finance is at 74%. Rahul Kumar has 9 active tasks against a capacity of 6.
              </Insight>
              <Insight icon={<TrendingUp size={16} className="text-primary" />} title="Performance trends" link={{ label: 'View department trends' }} onClick={() => setTrends(true)}>
                Completion improved 4.2 pp this month, but Verification SLA fell to 86%. Approval delays account for most breaches.
              </Insight>
              <Insight icon={<GitBranch size={16} className="text-primary" />} title="Process bottlenecks" link={{ label: 'Inspect handoff delays', to: '/tasks/blocked' }}>
                Verification → Finance handoff averages 6.8h, up 2.1h. 18 manager approvals are holding downstream work.
              </Insight>
            </div>
            <p className="border-t border-line-soft px-5 py-3 text-[11px] text-muted">AI recommendations support decisions; owners remain accountable for actions.</p>
          </Card>

          <Card>
            <div className="px-5 pt-5">
              <h3 className="text-[15px] font-semibold">Department workload</h3>
              <p className="mt-0.5 text-[12px] text-muted">Active tasks / planned daily capacity</p>
            </div>
            <div className="space-y-4 px-5 pt-4 pb-5">
              {workload.map((w) => (
                <div key={w.dept}>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink">{w.dept}</span>
                    <span className={cn('font-semibold', w.pct > 100 ? 'text-red-600' : w.pct >= 90 ? 'text-bright' : 'text-emerald-700')}>{w.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', w.pct > 100 ? 'bg-red-600' : w.pct >= 90 ? 'bg-bright' : 'bg-emerald-700')} style={{ width: `${Math.min(100, w.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Management interventions */}
        <Card className="min-w-0 xl:col-span-2 xl:col-start-1 xl:row-start-2">
          <div className="px-5 pt-5">
            <h3 className="text-[15px] font-semibold">Management interventions</h3>
            <p className="mt-0.5 text-[12px] text-muted">Recommended actions requiring department leadership</p>
          </div>
          <div className="divide-y divide-line-soft px-5 pb-2">
            {t1048 && isOpen(t1048) ? (
              <Intervention id="TSK-1048" to="/tasks/my/TSK-1048" what="KYC approval · ABC Franchise" who="Meera Iyer" when="Due 11:00 IST" whenCls="text-red-600" action="Review now" onAction={() => nav('/tasks/my/TSK-1048')} />
            ) : (
              <div className="py-4 text-[13px] text-emerald-700">TSK-1048 closed — KYC approval intervention resolved.</div>
            )}
            <Intervention id="TEAM-VER" what="Rebalance Verification queue" who="Suresh Nair" when={overCap ? `${overCap} tasks above capacity` : 'Within capacity'} whenCls={overCap ? 'text-amber-700' : 'text-emerald-700'} action="Reassign tasks" onAction={() => setRebalance(true)} />
          </div>
        </Card>
      </div>

      <Footer />

      {rebalance && <RebalanceModal onClose={() => setRebalance(false)} />}
      {trends && <TrendsModal onClose={() => setTrends(false)} />}
    </div>
  )
}

function Kpi({ icon, title, value, caption, trend, up, good }: { icon: ReactNode; title: string; value: string; caption: string; trend: string; up: boolean; good: boolean }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-white p-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="mt-1 text-[28px] leading-tight font-semibold text-ink">{value}</div>
        <div className="mt-1 text-[12px] text-muted">{caption}</div>
        <div className={cn('mt-1.5 flex items-center gap-1 text-[12px]', good ? 'text-emerald-700' : 'text-red-600')}>
          {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {trend}
        </div>
      </div>
    </div>
  )
}

function Insight({ icon, title, children, link, onClick }: { icon: ReactNode; title: string; children: ReactNode; link: { label: string; to?: string }; onClick?: () => void }) {
  return (
    <div className="py-4">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{children}</p>
      {link.to ? (
        <Link to={link.to} onClick={onClick} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
          {link.label} <ArrowRight size={12} />
        </Link>
      ) : (
        <button onClick={onClick} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
          {link.label} <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

function Intervention({ id, to, what, who, when, whenCls, action, onAction }: { id: string; to?: string; what: string; who: string; when: string; whenCls: string; action: string; onAction: () => void }) {
  return (
    <div className="grid grid-cols-2 items-center gap-x-4 gap-y-1 py-4 text-[13px] md:grid-cols-[100px_1fr_140px_180px_auto]">
      {to ? (
        <Link to={to} className="font-semibold text-primary hover:underline">
          {id}
        </Link>
      ) : (
        <span className="font-semibold text-primary">{id}</span>
      )}
      <span className="text-ink">{what}</span>
      <span className="text-ink-2">{who}</span>
      <span className={whenCls}>{when}</span>
      <Button variant="secondary" size="sm" onClick={onAction} className="col-span-2 justify-self-start md:col-span-1 md:justify-self-end">
        {action}
      </Button>
    </div>
  )
}

function MultiSelect({ label, all, value, onChange }: { label: string; all: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const toggle = (x: string) => {
    const next = value.includes(x) ? value.filter((v) => v !== x) : [...value, x]
    if (next.length === 0) {
      toast('Keep at least one selected.', 'info')
      return
    }
    onChange(all.filter((a) => next.includes(a)))
  }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold hover:border-primary/40">
        <ChevronDown size={14} className="text-primary" />
        {label}
      </button>
      {open && (
        <div className="absolute top-11 left-0 z-30 w-56 rounded-lg border border-line bg-white p-2 shadow-lg">
          <div className="mb-1 flex justify-between px-2 text-[11px]">
            <button className="font-semibold text-primary" onClick={() => onChange([...all])}>
              Select all
            </button>
            <button className="text-muted" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
          {all.map((x) => (
            <label key={x} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-surface">
              <input type="checkbox" checked={value.includes(x)} onChange={() => toggle(x)} className="accent-[#1e3f95]" />
              {x}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function RebalanceModal({ onClose }: { onClose: () => void }) {
  const { tasks } = tasksStore.use()
  const candidates = tasks.filter((t) => !t.subtask && t.assignee === CURRENT_EMPLOYEE && isOpen(t) && t.status !== 'Pending Approval')
  const [sel, setSel] = useState<string[]>([])
  const [to, setTo] = useState('Sana Ali')
  const [reason, setReason] = useState('Rebalance Verification queue — Rahul Kumar above capacity')
  const submit = () => {
    if (!sel.length) {
      toast('Select at least one task to reassign.', 'info')
      return
    }
    sel.forEach((id) => reassign(id, to, 'Suresh Nair', reason))
    toast(`${sel.length} task${sel.length > 1 ? 's' : ''} reassigned to ${to}.`)
    onClose()
  }
  return (
    <Modal
      title="Reassign tasks · TEAM-VER"
      sub="Move work from Rahul Kumar (above capacity) to another Verification team member. Original SLAs are retained."
      onClose={onClose}
      width={620}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Reassign {sel.length || ''} task{sel.length === 1 ? '' : 's'}</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-semibold">
          Reassign to
          <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] font-normal">
            {VERIFICATION_TEAM.filter((n) => n !== CURRENT_EMPLOYEE).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-semibold">
          Reason
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-line px-2 text-[13px] font-normal" />
        </label>
      </div>
      <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-line">
        {candidates.map((t) => {
          const s = slaOf(t)
          return (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 border-b border-line-soft px-3 py-2.5 text-[13px] last:border-0 hover:bg-surface">
              <input type="checkbox" checked={sel.includes(t.id)} onChange={() => setSel((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))} className="accent-[#1e3f95]" />
              <span className="w-20 shrink-0 font-medium text-primary">{t.id}</span>
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <span className={cn('shrink-0 text-[12px]', s.overdue ? 'text-red-600' : 'text-muted')}>{s.line}</span>
            </label>
          )
        })}
        {!candidates.length && <p className="p-6 text-center text-[13px] text-muted">No reassignable tasks left in Rahul Kumar's queue.</p>}
      </div>
    </Modal>
  )
}

function TrendsModal({ onClose }: { onClose: () => void }) {
  const data = DEPT_BASE.map((d) => {
    const thisSla = Math.round((1 - d.breaches / d.total) * 1000) / 10
    return { dept: d.dept, 'SLA this month': thisSla, 'SLA last month': Math.round((thisSla + LAST_MONTH.sla) * 10) / 10 }
  })
  return (
    <Modal title="Department trends" sub="SLA compliance by department · This month vs last month" onClose={onClose} width={760}>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -16, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
            <XAxis dataKey="dept" tick={{ fontSize: 11 }} interval={0} />
            <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="SLA last month" fill="#c3cbd9" radius={[3, 3, 0, 0]} />
            <Bar dataKey="SLA this month" fill="#1e3f95" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[12px] text-muted">
        <Sparkles size={12} className="mr-1 inline text-primary" />
        Verification SLA is the lowest at 86%; approval delays account for most breaches.
      </p>
    </Modal>
  )
}
