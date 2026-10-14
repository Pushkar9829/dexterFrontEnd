import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowDownUp, ArrowRight, CalendarDays, Filter, Plus, X } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  blocksOf,
  CURRENT_EMPLOYEE,
  CURRENT_LEAD,
  isDueToday,
  isOpen,
  NOW,
  PRIORITIES,
  reassign,
  riskOf,
  slaOf,
  STATUSES,
  tasksStore,
  VERIFICATION_TEAM,
  type Priority,
  type Task,
  type TaskStatus,
} from '@/data/tasks'
import { CreateTaskModal } from './CreateTaskModal'
import { Footer, HeroBanner, PillSelect, PriorityLabel, SlaCell, StatusBadge } from './ui'

export type WorkspaceView = 'my' | 'today' | 'daily' | 'monthly' | 'overdue' | 'blocked' | 'approval'

const VIEWS: Record<WorkspaceView, { title: string; sub: (first: string) => string; test: (t: Task) => boolean; path: string }> = {
  my: { title: 'My Tasks', sub: (n) => `Welcome back, ${n}. Prioritize your queue and keep every handoff on track.`, test: () => true, path: '/tasks/my' },
  today: { title: "Today's Tasks", sub: () => 'Everything due by end of day, 06 Oct 2026 (IST). Overdue items stay on top until closed.', test: (t) => isOpen(t) && isDueToday(t), path: '/tasks/today' },
  daily: { title: 'Daily Routine', sub: () => 'Recurring daily checks and reports. Tick the routine checklist as you go.', test: (t) => t.kind === 'Daily Routine', path: '/tasks/daily' },
  monthly: { title: 'Monthly Tasks', sub: () => 'October recurring compliance, audit and reporting tasks.', test: (t) => t.kind === 'Monthly', path: '/tasks/monthly' },
  overdue: { title: 'Overdue', sub: () => 'Tasks past their target TAT. SLA never pauses — escalate or close.', test: (t) => isOpen(t) && slaOf(t).overdue, path: '/tasks/overdue' },
  blocked: { title: 'Waiting / Blocked', sub: () => 'Tasks waiting on a dependency, a customer or another department.', test: (t) => t.status === 'Waiting/Blocked', path: '/tasks/blocked' },
  approval: { title: 'Approval Pending', sub: () => 'Submitted work awaiting reviewer or manager sign-off.', test: (t) => t.status === 'Pending Approval', path: '/tasks/approval-pending' },
}

type DueFilter = 'any' | 'today' | '48h' | 'week' | 'overdue'
type SortKey = 'soonest' | 'latest' | 'risk' | 'newest'

export default function Workspace({ view }: { view: WorkspaceView }) {
  const { tasks, viewAs, routine } = tasksStore.use()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const isLead = viewAs === 'Team Leader'
  const tab: 'my' | 'team' = isLead && params.get('tab') === 'team' ? 'team' : 'my'
  const me = isLead ? CURRENT_LEAD : CURRENT_EMPLOYEE
  const cfg = VIEWS[view]

  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [due, setDue] = useState<DueFilter>('any')
  const [sort, setSort] = useState<SortKey>('soonest')
  const [creating, setCreating] = useState(false)
  const [dismissed, setDismissed] = useState<string | null>(null)

  const top = tasks.filter((t) => !t.subtask)
  const mine = top.filter((t) => t.assignee === me)
  const team = top.filter((t) => isOpen(t) && (VERIFICATION_TEAM.includes(t.assignee) || (!t.assignee && t.department === 'Verification')))
  const base = tab === 'team' ? team : mine

  const setTab = (t: 'my' | 'team') => {
    const p = new URLSearchParams(params)
    if (t === 'team') p.set('tab', 'team')
    else p.delete('tab')
    setParams(p, { replace: true })
  }
  const setViewAs = (v: 'Employee' | 'Team Leader') => {
    tasksStore.set((s) => ({ ...s, viewAs: v }))
    if (v === 'Employee') setTab('my')
  }

  const rows = useMemo(() => {
    let out = base.filter(cfg.test)
    if (priority !== 'all') out = out.filter((t) => t.priority === priority)
    if (status !== 'all') out = out.filter((t) => t.status === status)
    if (due !== 'any')
      out = out.filter((t) => {
        const s = slaOf(t)
        if (s.closed) return false
        if (due === 'overdue') return s.overdue
        if (due === 'today') return isDueToday(t)
        if (due === '48h') return s.due - NOW <= 48 * 3600_000
        return s.due - NOW <= 7 * 24 * 3600_000
      })
    const key = (t: Task) => {
      const s = slaOf(t)
      if (sort === 'risk') return -riskOf(t)
      if (sort === 'newest') return -Date.parse(t.createdAt)
      const r = s.closed ? 1e9 : s.remainingMin
      return sort === 'soonest' ? r : -r
    }
    return [...out].sort((a, b) => key(a) - key(b))
  }, [base, cfg, priority, status, due, sort])

  // summary metrics (always for the persona's own queue)
  const open = mine.filter(isOpen)
  const m = {
    open: open.length,
    assigned: open.filter((t) => t.status === 'New' || t.status === 'Assigned').length,
    today: open.filter(isDueToday).length,
    approaching: open.filter((t) => isDueToday(t) && slaOf(t).remainingMin > 0 && slaOf(t).remainingMin <= 4 * 60).length,
    overdue: open.filter((t) => slaOf(t).overdue).length,
    waiting: open.filter((t) => t.status === 'Waiting/Blocked').length,
    pending: open.filter((t) => t.status === 'Pending Approval').length,
  }

  // risk alert: the riskiest open task in scope that is still within SLA, else the riskiest overall
  const alertTask = useMemo(() => {
    const cands = base.filter((t) => isOpen(t) && cfg.test(t) && riskOf(t) >= 70)
    return cands.sort((a, b) => Number(slaOf(b).remainingMin > 0) - Number(slaOf(a).remainingMin > 0) || riskOf(b) - riskOf(a))[0]
  }, [base, cfg])
  const alertBlocks = alertTask ? blocksOf(alertTask, tasks).filter(isOpen) : []

  const columns: GridColumn<Task>[] = [
    { key: 'id', header: 'Task ID', width: 110, sortable: true, render: (t) => <Link to={`/tasks/my/${t.id}`} className="font-medium text-primary hover:underline">{t.id}</Link> },
    {
      key: 'title', header: 'Task Name', width: 300, value: (t) => `${t.title} ${t.entityLabel} ${t.source}`,
      render: (t) => (
        <Link to={`/tasks/my/${t.id}`} className="block leading-tight">
          <span className="text-[13px] text-ink">{t.title}</span>
          <span className="mt-0.5 block text-[12px] text-ink-2">
            {t.entityLabel} · {t.source}
          </span>
        </Link>
      ),
    },
    ...(tab === 'team'
      ? [
          {
            key: 'assignee', header: 'Assignee', width: 160, value: (t: Task) => t.assignee || 'Unassigned',
            render: (t: Task) => (
              <select
                aria-label={`Assignee for ${t.id}`}
                value={t.assignee}
                onChange={(e) => {
                  reassign(t.id, e.target.value, CURRENT_LEAD, 'Team queue rebalanced')
                  toast(`${t.id} assigned to ${e.target.value || 'Unassigned'}`)
                }}
                className={cn('h-8 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-primary', !t.assignee && 'text-amber-700')}
              >
                <option value="">Unassigned</option>
                {VERIFICATION_TEAM.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            ),
          } satisfies GridColumn<Task>,
        ]
      : []),
    { key: 'priority', header: 'Priority', width: 110, value: (t) => PRIORITIES.indexOf(t.priority), render: (t) => <PriorityLabel p={t.priority} /> },
    { key: 'sla', header: 'Target TAT / SLA', label: 'Target TAT / SLA', width: 150, sortable: true, filterable: true, value: (t) => (slaOf(t).closed ? 1e9 : slaOf(t).remainingMin), render: (t) => <SlaCell t={t} /> },
    { key: 'status', header: 'Status', width: 150, filterable: true, render: (t) => <StatusBadge s={t.status} /> },
    { key: 'expectedOutcome', header: 'Expected Outcome', width: 300, sortable: true, filterable: true },
  ]

  const daily = mine.filter((t) => t.kind === 'Daily Routine')
  const monthly = mine.filter((t) => t.kind === 'Monthly')
  const nextMonthly = monthly.filter(isOpen).sort((a, b) => slaOf(a).due - slaOf(b).due)[0]
  const routineDone = routine.filter((r) => r.done).length
  const teamUnassigned = team.filter((t) => !t.assignee).length
  const teamReview = team.filter((t) => t.status === 'Pending Approval').length
  const teamRisk = team.filter((t) => slaOf(t).remainingMin < 120).length

  const toggleRoutine = (id: string) => {
    const item = routine.find((r) => r.id === id)
    tasksStore.set((s) => ({ ...s, routine: s.routine.map((r) => (r.id === id ? { ...r, done: !r.done } : r)) }))
    if (item) toast(item.done ? `Unticked: ${item.text}` : `Done: ${item.text}`, item.done ? 'info' : 'success')
  }

  return (
    <div className="space-y-5">
      <HeroBanner title={cfg.title} sub={cfg.sub(me.split(' ')[0])} code="CRM-06" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className="font-semibold text-ink-2">View as</span>
          <div role="radiogroup" aria-label="View as" className="flex rounded-lg border border-line bg-white p-0.5">
            {(['Employee', 'Team Leader'] as const).map((v) => (
              <button
                key={v}
                role="radio"
                aria-checked={viewAs === v}
                onClick={() => setViewAs(v)}
                className={cn('h-8 rounded-md px-3 text-[12px] font-semibold', viewAs === v ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface')}
              >
                {v}
              </button>
            ))}
          </div>
          <span className="hidden sm:inline">
            {me} · {isLead ? 'Team Leader' : 'Employee'} · Verification
          </span>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Create Task
        </Button>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric value={m.open} label="My open tasks" caption={`${m.assigned} assigned to you`} onClick={() => nav('/tasks/my')} />
        <Metric value={m.today} label="Due today" caption={`${m.approaching} approaching SLA`} onClick={() => nav('/tasks/today')} />
        <Metric value={m.overdue} label="Overdue" caption={m.overdue ? 'Escalation required' : 'No escalations'} red={m.overdue > 0} onClick={() => nav('/tasks/overdue')} />
        <Metric value={m.waiting} label="Waiting / blocked" caption={`${m.pending} pending approval`} onClick={() => nav('/tasks/blocked')} />
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <div role="tablist" className="flex">
          <TabBtn active={tab === 'my'} onClick={() => setTab('my')}>
            My Tasks · {mine.filter(isOpen).length}
          </TabBtn>
          {isLead && (
            <TabBtn active={tab === 'team'} onClick={() => setTab('team')}>
              Team Tasks · {team.length}
            </TabBtn>
          )}
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <PillSelect label="Priority" icon={<Filter size={13} />} value={priority} onChange={setPriority} options={[{ value: 'all', label: 'All priorities' }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]} />
          <PillSelect label="Status" icon={<Filter size={13} />} value={status} onChange={setStatus} options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((p) => ({ value: p, label: p }))]} />
          <PillSelect
            label="Due date"
            icon={<CalendarDays size={13} />}
            value={due}
            onChange={setDue}
            options={[
              { value: 'any', label: 'Due date' },
              { value: 'today', label: 'Due today' },
              { value: '48h', label: 'Due in 48 hours' },
              { value: 'week', label: 'Due this week' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <PillSelect
            label="Sort"
            icon={<ArrowDownUp size={13} />}
            value={sort}
            onChange={setSort}
            options={[
              { value: 'soonest', label: 'SLA: Soonest first' },
              { value: 'latest', label: 'SLA: Latest first' },
              { value: 'risk', label: 'AI risk: Highest first' },
              { value: 'newest', label: 'Newest first' },
            ]}
          />
        </div>
      </div>

      {alertTask && dismissed !== alertTask.id && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1">
            {alertTask.id} needs attention: {alertTask.alertNote ?? alertTask.status.toLowerCase()} · {slaOf(alertTask).line} · AI risk {riskOf(alertTask)}%.
            {alertBlocks.length > 0 && ` ${alertBlocks[0].department} ${/release/i.test(alertBlocks[0].title) ? 'release' : 'handoff'} remains blocked.`}
          </span>
          <Link to={`/tasks/my/${alertTask.id}`} className="flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface">
            Open task <ArrowRight size={13} />
          </Link>
          <button aria-label="Dismiss alert" onClick={() => setDismissed(alertTask.id)} className="text-amber-700 hover:text-amber-900">
            <X size={16} />
          </button>
        </div>
      )}

      <ExcelGrid
        key={tab + view}
        title={tab === 'team' ? 'Team Tasks' : cfg.title}
        countLabel={`${rows.length} tasks`}
        rows={rows}
        columns={columns}
        rowId={(t) => t.id}
        searchPlaceholder="Search task ID or name"
        rowNumbers={false}
        noun="tasks"
        exportName={`${cfg.title} ${tab === 'team' ? 'team' : me}`}
        rowClassName={(t) => (t.id === alertTask?.id ? 'bg-primary-soft/40' : undefined)}
        emptyState={<span>No tasks match these filters. <button className="font-semibold text-primary" onClick={() => { setPriority('all'); setStatus('all'); setDue('any') }}>Clear filters</button></span>}
      />

      {/* Queue cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QueueCard title="Daily Routine" sub={`Today · ${routineDone} of ${routine.length} completed`} chip={`${routine.length - routineDone} remaining`} chipTone="amber" link={{ to: '/tasks/daily', label: 'Open routine' }}>
          <ul className="space-y-1.5">
            {routine.map((r) => (
              <li key={r.id}>
                <label className="flex cursor-pointer items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={r.done} onChange={() => toggleRoutine(r.id)} className="mt-0.5 accent-[#1e3f95]" />
                  <span className={cn(r.done ? 'text-muted line-through' : 'text-ink')}>
                    {r.time} · {r.text}
                    {r.taskId && (
                      <Link to={`/tasks/my/${r.taskId}`} className="ml-1 text-[11px] text-primary no-underline hover:underline">
                        {r.taskId}
                      </Link>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">{daily.length} daily routine tasks in your queue.</p>
        </QueueCard>
        <QueueCard title="Monthly Tasks" sub={`October · ${monthly.filter((t) => !isOpen(t)).length} of ${monthly.length} completed`} chip={`${monthly.filter(isOpen).length} scheduled`} chipTone="blue" link={{ to: '/tasks/monthly', label: 'View monthly tasks' }}>
          {nextMonthly ? (
            <Link to={`/tasks/my/${nextMonthly.id}`} className="text-[13px] text-ink hover:text-primary">
              {nextMonthly.title} · Due {new Date(slaOf(nextMonthly).due).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
            </Link>
          ) : (
            <p className="text-[13px] text-muted">All monthly tasks completed.</p>
          )}
        </QueueCard>
        <QueueCard
          title="Team Leader overview"
          sub={`Verification · ${team.length} team tasks`}
          chip={isLead ? 'Team access' : 'Team Leader access only'}
          chipTone="gray"
          link={{
            label: 'Review team queue',
            onClick: () => {
              if (!isLead) {
                setViewAs('Team Leader')
                toast('Switched to Team Leader view (Priya Menon).', 'info')
              }
              const p = new URLSearchParams(params)
              p.set('tab', 'team')
              setParams(p, { replace: true })
            },
          }}
        >
          <p className="text-[13px] text-ink">
            {teamUnassigned} unassigned · {teamReview} awaiting review · {teamRisk} SLA risks
          </p>
        </QueueCard>
      </div>

      <Footer />
      {creating && <CreateTaskModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function Metric({ value, label, caption, red, onClick }: { value: number; label: string; caption: string; red?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 rounded-xl border border-line bg-white px-5 py-4 text-left transition-colors hover:border-primary/40">
      <span className={cn('text-[30px] leading-none font-semibold', red ? 'text-brand-red' : 'text-ink')}>{value}</span>
      <span>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        <span className="block text-[12px] text-muted">{caption}</span>
      </span>
    </button>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} className={cn('-mb-px border-b-2 px-4 py-2.5 text-[13px]', active ? 'border-primary bg-primary-soft/60 font-semibold text-primary' : 'border-transparent text-muted hover:text-ink')}>
      {children}
    </button>
  )
}

function QueueCard({
  title,
  sub,
  chip,
  chipTone,
  link,
  children,
}: {
  title: string
  sub: string
  chip: string
  chipTone: 'amber' | 'blue' | 'gray'
  link: { to?: string; label: string; onClick?: () => void }
  children: React.ReactNode
}) {
  const chipCls = { amber: 'bg-amber-50 text-amber-700', blue: 'bg-primary-soft text-primary', gray: 'bg-slate-100 text-slate-600' }[chipTone]
  return (
    <section className="flex flex-col rounded-xl border border-line bg-white p-5">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-[12px] text-muted">{sub}</p>
      <div className="mt-3 flex-1">{children}</div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', chipCls)}>{chip}</span>
        {link.to ? (
          <Link to={link.to} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
            {link.label} <ArrowRight size={13} />
          </Link>
        ) : (
          <button onClick={link.onClick} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
            {link.label} <ArrowRight size={13} />
          </button>
        )}
      </div>
    </section>
  )
}

