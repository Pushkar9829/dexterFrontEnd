import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowDownUp, ArrowRight, CalendarDays, ChevronDown } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
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
  // CRM-06: the "My Tasks" tab is the employee queue (Rahul Kumar); "Team Tasks" is the team leader queue (Priya Menon)
  const tab: 'my' | 'team' = params.get('tab') === 'team' ? 'team' : 'my'
  const isLead = tab === 'team'
  useEffect(() => {
    const want = tab === 'team' ? 'Team Leader' : 'Employee'
    if (viewAs !== want) tasksStore.set((s) => ({ ...s, viewAs: want }))
  }, [tab, viewAs])
  const me = isLead ? CURRENT_LEAD : CURRENT_EMPLOYEE
  const cfg = VIEWS[view]

  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [due, setDue] = useState<DueFilter>('any')
  const [sort, setSort] = useState<SortKey>('soonest')
  // "Create Task" lives in the top bar; it opens this modal through ?create=1
  const creating = params.get('create') === '1'
  const setCreating = (v: boolean) => {
    const p = new URLSearchParams(params)
    if (v) p.set('create', '1')
    else p.delete('create')
    setParams(p, { replace: true })
  }

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
    { key: 'id', header: 'Task ID', width: 132, render: (t) => <Link to={`/tasks/my/${t.id}`} className="text-primary hover:underline">{t.id}</Link> },
    {
      key: 'title', header: 'Task Name', width: 378, value: (t) => `${t.title} ${t.entityLabel} ${t.source}`,
      render: (t) => (
        <Link to={`/tasks/my/${t.id}`} className="block py-[2.5px] leading-[14px]">
          <span className="text-[11px] text-ink">{t.title}</span>
          <span className="block text-[11px] text-ink-2">
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
    { key: 'priority', header: 'Priority', width: 130, value: (t) => PRIORITIES.indexOf(t.priority), render: (t) => <PriorityLabel p={t.priority} className="text-[11px]!" /> },
    { key: 'sla', header: 'Target TAT / SLA', label: 'Target TAT / SLA', width: 146, sortable: true, filterable: true, value: (t) => (slaOf(t).closed ? 1e9 : slaOf(t).remainingMin), render: (t) => <SlaCell t={t} small /> },
    { key: 'status', header: 'Status', width: 116, render: (t) => <StatusBadge s={t.status} className="gap-1! px-1.5! text-[9px]! leading-[14px]!" /> },
    { key: 'expectedOutcome', header: 'Expected Outcome', width: 380, sortable: true, filterable: true },
  ]

  const monthly = mine.filter((t) => t.kind === 'Monthly')
  const nextMonthly = monthly.filter(isOpen).sort((a, b) => slaOf(a).due - slaOf(b).due)[0]
  const routineDone = routine.filter((r) => r.done).length
  const nextRoutine = routine.find((r) => !r.done)
  const teamUnassigned = team.filter((t) => !t.assignee).length
  const teamReview = team.filter((t) => t.status === 'Pending Approval').length
  const teamRisk = team.filter((t) => slaOf(t).remainingMin < 120).length

  const toggleRoutine = (id: string) => {
    const item = routine.find((r) => r.id === id)
    tasksStore.set((s) => ({ ...s, routine: s.routine.map((r) => (r.id === id ? { ...r, done: !r.done } : r)) }))
    if (item) toast(item.done ? `Unticked: ${item.text}` : `Done: ${item.text}`, item.done ? 'info' : 'success')
  }

  return (
    <div className="space-y-4">
      <HeroBanner title={cfg.title} sub={cfg.sub(me.split(' ')[0])} code="CRM-06" />

      {/* Summary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric value={m.open} label="My open tasks" caption={`${m.assigned} assigned to you`} onClick={() => nav('/tasks/my')} />
        <Metric value={m.today} label="Due today" caption={`${m.approaching} approaching SLA`} onClick={() => nav('/tasks/today')} />
        <Metric value={m.overdue} label="Overdue" caption={m.overdue ? 'Escalation required' : 'No escalations'} red={m.overdue > 0} onClick={() => nav('/tasks/overdue')} />
        <Metric value={m.waiting} label="Waiting / blocked" caption={`${m.pending} pending approval`} onClick={() => nav('/tasks/blocked')} />
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" className="flex">
          <TabBtn active={tab === 'my'} onClick={() => setTab('my')}>
            My Tasks · {top.filter((t) => t.assignee === CURRENT_EMPLOYEE && isOpen(t)).length}
          </TabBtn>
          <TabBtn active={tab === 'team'} onClick={() => setTab('team')}>
            Team Tasks · {team.length}
          </TabBtn>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillSelect label="Priority" icon={<ChevronDown size={14} />} value={priority} onChange={setPriority} options={[{ value: 'all', label: 'All priorities' }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]} />
          <PillSelect label="Status" icon={<ChevronDown size={14} />} value={status} onChange={setStatus} options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((p) => ({ value: p, label: p }))]} />
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

      {alertTask && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#f3e3c0] bg-[#fff4df] py-2 pr-3 pl-4 text-[11px] text-[#98620a]">
          <AlertTriangle size={17} className="shrink-0 text-[#98620a]" />
          <span className="min-w-0 flex-1">
            {alertTask.id} needs attention: {alertTask.alertNote ?? alertTask.status.toLowerCase()} · {slaOf(alertTask).line} · AI risk {riskOf(alertTask)}%.
            {alertBlocks.length > 0 && ` ${alertBlocks[0].department} ${/release/i.test(alertBlocks[0].title) ? 'release' : 'handoff'} remains blocked.`}
          </span>
          <Link to={`/tasks/my/${alertTask.id}`} className="flex h-8 items-center gap-1 rounded-md border border-line bg-white px-3 text-[11px] font-semibold text-ink hover:bg-surface">
            Open task <ArrowRight size={12} />
          </Link>
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
        columnLines={false}
        rowClassName={(t) => (t.id === alertTask?.id ? 'bg-[#edf2ff]' : undefined)}
        emptyState={<span>No tasks match these filters. <button className="font-semibold text-primary" onClick={() => { setPriority('all'); setStatus('all'); setDue('any') }}>Clear filters</button></span>}
      />

      {/* Queue cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QueueCard title="Daily Routine" sub={`Today · ${routineDone} of ${routine.length} completed`} chip={`${routine.length - routineDone} remaining`} chipTone="amber" link={{ to: '/tasks/daily', label: 'Open routine' }}>
          {nextRoutine ? (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink" title="Tick when done">
              <input type="checkbox" checked={false} onChange={() => toggleRoutine(nextRoutine.id)} className="h-3 w-3 accent-[#1e3f95] opacity-60" />
              <span>
                {nextRoutine.time} · {nextRoutine.text}
              </span>
            </label>
          ) : (
            <p className="text-[11px] text-emerald-700">All {routine.length} routine checks done for today.</p>
          )}
        </QueueCard>
        <QueueCard title="Monthly Tasks" sub={`October · ${monthly.filter((t) => !isOpen(t)).length} of ${monthly.length} completed`} chip={`${monthly.filter(isOpen).length} scheduled`} chipTone="blue" link={{ to: '/tasks/monthly', label: 'View monthly tasks' }}>
          {nextMonthly ? (
            <Link to={`/tasks/my/${nextMonthly.id}`} className="text-[11px] text-ink hover:text-primary">
              {nextMonthly.title} · Due {new Date(slaOf(nextMonthly).due).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
            </Link>
          ) : (
            <p className="text-[11px] text-muted">All monthly tasks completed.</p>
          )}
        </QueueCard>
        <QueueCard
          title="Team Leader overview"
          sub={`Verification · ${team.length} team tasks`}
          chip="Team access"
          chipTone="gray"
          link={{
            label: 'Review team queue',
            onClick: () => {
              if (!isLead) toast('Showing the Team Leader queue (Priya Menon).', 'info')
              setTab('team')
            },
          }}
        >
          <p className="text-[11px] text-ink">
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
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-left transition-colors hover:border-primary/40">
      <span className={cn('text-[26px] leading-none font-semibold', red ? 'text-brand-red' : 'text-ink')}>{value}</span>
      <span>
        <span className="block text-[11px] leading-[15px] font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-[10px] leading-[14px] text-muted">{caption}</span>
      </span>
    </button>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} className={cn('border-b-2 px-4 py-[11px] text-[11px]', active ? 'border-primary bg-primary-soft/60 font-semibold text-primary' : 'border-transparent text-muted hover:text-ink')}>
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
    <section className="flex flex-col rounded-xl border border-line bg-white px-4 pt-4 pb-3.5">
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[11px] text-muted">{sub}</p>
      <div className="mt-3 flex-1">{children}</div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn('rounded px-2 py-1 text-[10px] font-semibold', chipCls)}>{chip}</span>
        {link.to ? (
          <Link to={link.to} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            {link.label} <ArrowRight size={12} />
          </Link>
        ) : (
          <button onClick={link.onClick} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            {link.label} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </section>
  )
}

