import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Table2, UserRound } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  CURRENT_USER,
  OWNERS,
  PRIORITIES,
  atmById,
  complaintStore,
  fmtDT,
  fmtDate,
  fmtDur,
  fmtTime,
  inr,
  isOpen,
  istDay,
  sla,
  statusLabel,
  taskStatus,
  updateComplaint,
  type Complaint,
  type CTask,
  type CVendor,
  type CSpare,
  type CVisit,
  type Priority,
} from '@/data/complaints'
import { Banner, ComplaintsShell, Dropdown, Entry, Kpi, LinkBtn, Panel, PriorityBadge, SlaText, StatusBadge, ViewAll, BASE, useNow } from './shared'

const PRI_RANK: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const short = (iso: string, now: number) => (istDay(iso) === istDay(now) ? `Today, ${fmtTime(iso)}` : fmtDT(iso))

export default function OperationsDashboard() {
  const all = complaintStore.use()
  const now = useNow()
  const [user, setUser] = useState(CURRENT_USER)
  const [pri, setPri] = useState<Priority | ''>('')
  const [showAll, setShowAll] = useState(false)
  const [allVisits, setAllVisits] = useState(false)

  const d = useMemo(() => {
    const open = all.filter(isOpen).filter((c) => !pri || c.priority === pri)
    const mine = open
      .filter((c) => c.owner === user)
      .sort((a, b) => PRI_RANK[a.priority] - PRI_RANK[b.priority] || sla(a, now).remaining - sla(b, now).remaining)
    const tasks = open
      .flatMap((c) => c.tasks.map((t) => ({ t, c })))
      .filter(({ t }) => t.owner === user && !t.done)
      .sort((a, b) => Date.parse(a.t.due) - Date.parse(b.t.due))
    const overdue = tasks.filter(({ t }) => taskStatus(t, now) === 'Overdue')
    const dueToday = tasks.filter(({ t }) => taskStatus(t, now) === 'Due today')
    const visitsAll = mine
      .flatMap((c) => c.visits.map((v) => ({ v, c })))
      .filter(({ v }) => v.status !== 'Completed')
      .sort((a, b) => Date.parse(a.v.at) - Date.parse(b.v.at))
    const visitsToday = visitsAll.filter(({ v }) => istDay(v.at) === istDay(now))
    const vendors = mine.flatMap((c) => c.vendors.map((v) => ({ v, c }))).filter(({ v }) => v.status === 'Pending')
    const spares = mine.flatMap((c) => c.spares.map((s) => ({ s, c }))).filter(({ s }) => s.status !== 'Delivered')
    const pendingVisits = visitsAll.filter(({ v }) => v.status === 'Awaiting confirmation' || v.status === 'Awaiting spare')
    return { mine, tasks, overdue, dueToday, visitsAll, visitsToday, vendors, spares, pendingVisits }
  }, [all, user, pri, now])

  const pendingMine = d.mine.filter((c) => statusLabel(c) === 'Pending').length
  const ext = d.vendors.length + d.spares.length + d.pendingVisits.length
  const first = user.split(' ')[0]

  // Action-required banner: the most exposed complaint of this user.
  const top = d.mine.map((c) => ({ c, s: sla(c, now) })).sort((a, b) => a.s.remaining - b.s.remaining)[0]
  const topVendor = top && top.c.vendors.find((v) => v.status === 'Pending')
  const topVisit = top && top.c.visits.find((v) => v.status !== 'Completed' && istDay(v.at) === istDay(now))

  const taskDone = (c: Complaint, t: CTask) => {
    updateComplaint(c.id, (x) => ({ tasks: x.tasks.map((y) => (y.id === t.id ? { ...y, done: true } : y)), lastAction: `${t.title} · completed` }), { title: 'Task completed', meta: `${CURRENT_USER} · ${t.id} · ${t.title}` })
    toast(`${t.id} marked complete`)
  }
  const confirmVisit = (c: Complaint, v: CVisit) => {
    updateComplaint(c.id, (x) => ({ visits: x.visits.map((y) => (y.id === v.id ? { ...y, status: 'Confirmed', note: `${y.note.split(' · ')[0]} · Confirmed` } : y)) }), { title: 'Field visit confirmed', meta: `${CURRENT_USER} · ${v.id} · ${fmtDT(v.at)} · ${v.engineer}` })
    toast(`${v.id} confirmed with ${v.engineer}`)
  }
  const chase = (c: Complaint, v: CVendor) => {
    const at = new Date(now).toISOString()
    updateComplaint(
      c.id,
      (x) => ({ vendors: x.vendors.map((y) => (y.id === v.id ? { ...y, lastChased: at, log: [...y.log, `${fmtDT(at)} · Chased by ${CURRENT_USER}`] } : y)), lastAction: `${v.vendor} chased for ${v.item.toLowerCase()}` }),
      { title: 'Vendor chased', meta: `${CURRENT_USER} · ${v.vendor} · ${v.item}` },
    )
    toast(`${v.vendor} chased · logged on ${c.id}`)
  }
  const vendorReceived = (c: Complaint, v: CVendor) => {
    updateComplaint(c.id, (x) => ({ vendors: x.vendors.map((y) => (y.id === v.id ? { ...y, status: 'Received', log: [...y.log, `${fmtDT(now)} · Received`] } : y)), lastAction: `${v.vendor} · ${v.item} received` }), { title: 'Vendor dependency cleared', meta: `${CURRENT_USER} · ${v.vendor} · ${v.item}` })
    toast(`${v.item} received from ${v.vendor}`)
  }
  const spareStep = (c: Complaint, s: CSpare) => {
    const next: CSpare['status'] = s.status === 'Awaiting approval' ? 'Approved' : s.status === 'Approved' ? 'In transit' : 'Delivered'
    updateComplaint(
      c.id,
      (x) => ({
        spares: x.spares.map((y) => (y.id === s.id ? { ...y, status: next } : y)),
        subStatus: next === 'Delivered' ? 'In progress' : x.subStatus,
        lastAction: `${s.part} ${next.toLowerCase()}`,
      }),
      { title: next === 'Approved' ? 'Spare approved' : `Spare ${next.toLowerCase()}`, meta: `${CURRENT_USER} · ${s.part} · ${s.model} · ${s.depot}${s.cost ? ` · ${inr(s.cost)}` : ''}` },
    )
    toast(`${s.part} · ${next}`)
  }

  // Next commitments (today, after now)
  const commitments = [
    ...d.vendors.filter(({ v }) => v.expectedBy && Date.parse(v.expectedBy) >= now - 3_600_000).map(({ v, c }) => ({ at: v.expectedBy!, title: `${v.vendor} follow-up`, meta: `${c.id} · Escalate if ${v.item.toLowerCase()} is not confirmed` })),
    ...d.tasks.filter(({ t }) => Date.parse(t.due) >= now && istDay(t.due) === istDay(now)).map(({ t, c }) => ({ at: t.due, title: t.title, meta: `${c.id} · ${t.id}` })),
    ...d.visitsToday.filter(({ v }) => Date.parse(v.at) >= now).map(({ v, c }) => ({ at: v.at, title: `Field visit · ${v.purpose}`, meta: `${c.id} · ${v.engineer}` })),
    { at: `${istDay(now)}T17:30:00+05:30`, title: 'Team handover', meta: 'Record ETAs for all unresolved critical complaints' },
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))

  const cols: GridColumn<Complaint>[] = [
    { key: 'id', header: 'Complaint ID', width: 120, render: (c) => <Link to={`${BASE}/${c.id}`} className="font-medium text-primary hover:underline">{c.id}</Link> },
    { key: 'issue', header: 'Issue / ATM', width: 240, value: (c) => `${c.subcategory} · ${c.atmId}` },
    { key: 'priority', header: 'Priority', width: 100, value: (c) => c.priority, render: (c) => <PriorityBadge p={c.priority} /> },
    { key: 'next', header: 'Next action', width: 200, value: (c) => c.tasks.filter((t) => !t.done).sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0]?.title ?? c.lastAction },
    { key: 'due', header: 'Due / SLA', width: 150, value: (c) => sla(c, now).label, render: (c) => <SlaText c={c} now={now} /> },
    { key: 'status', header: 'Status', width: 100, value: statusLabel, render: (c) => <StatusBadge c={c} /> },
  ]
  const shown = showAll ? d.mine : d.mine.slice(0, 6)

  const exportAll = () =>
    downloadCsv(
      `my-work-${user.replace(' ', '-')}`,
      ['Type', 'Reference', 'Complaint', 'Detail', 'Due / time', 'Status'],
      [
        ...d.mine.map((c) => ['Complaint', c.id, c.id, `${c.subcategory} · ${c.atmId}`, sla(c, now).label, statusLabel(c)]),
        ...d.tasks.map(({ t, c }) => ['Task', t.id, c.id, t.title, fmtDT(t.due), taskStatus(t, now)]),
        ...d.visitsAll.map(({ v, c }) => ['Field visit', v.id, c.id, `${v.purpose} · ${v.engineer}`, fmtDT(v.at), v.status]),
        ...d.vendors.map(({ v, c }) => ['Vendor', v.id, c.id, `${v.vendor} · ${v.item}`, v.expectedBy ? fmtDT(v.expectedBy) : '', v.status]),
        ...d.spares.map(({ s, c }) => ['Spare', s.id, c.id, `${s.part} · ${s.model} · ${s.depot}`, s.eta ? fmtDT(s.eta) : '', s.status]),
      ],
    )

  return (
    <ComplaintsShell title="Operations Dashboard" sub={`${first}'s work queues, commitments and external dependencies for today.`} onExport={exportAll}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Dropdown
          width={240}
          label={
            <>
              <UserRound size={15} className="text-primary" /> {user} · {user === CURRENT_USER ? 'My work' : 'Work queue'}
            </>
          }
        >
          {(close) => (
            <div>
              {OWNERS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    setUser(o)
                    setShowAll(false)
                    close()
                  }}
                  className={`flex w-full rounded px-2 py-1.5 text-left text-[13px] hover:bg-surface ${o === user ? 'bg-primary-soft font-semibold text-primary' : ''}`}
                >
                  {o}
                  {o === CURRENT_USER && <span className="ml-auto text-muted">You</span>}
                </button>
              ))}
            </div>
          )}
        </Dropdown>
        <span className="flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold">
          <CalendarDays size={15} className="text-primary" /> Today · {fmtDate(now)}
        </span>
        <select value={pri} onChange={(e) => setPri(e.target.value as Priority | '')} aria-label="Priority" className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <span className="text-[12px] text-muted">{user === CURRENT_USER ? 'Your assigned work' : `${user}'s assigned work`} · India operations</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={user === CURRENT_USER ? 'My complaints' : 'Assigned complaints'} value={d.mine.length} caption={`${d.mine.length - pendingMine} active · ${pendingMine} pending dependencies`} />
        <Kpi label="My open tasks" value={d.tasks.length} caption={`Across ${new Set(d.tasks.map((x) => x.c.id)).size} assigned complaints`} />
        <Kpi label="Due today" value={d.dueToday.length} caption="Tasks not yet overdue" />
        <Kpi label="Overdue tasks" value={d.overdue.length} tone={d.overdue.length ? 'red' : undefined} caption="Escalate or revise commitment" />
        <Kpi label="External dependencies" value={ext} caption={`${d.vendors.length} vendor · ${d.spares.length} spares · ${d.pendingVisits.length} visits`} />
      </div>

      {top && (top.s.breached || top.s.atRisk) ? (
        <Banner
          lead="Action required"
          action={
            <Link to={`${BASE}/${top.c.id}`} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              Open Complaint 360 <ArrowRight size={13} />
            </Link>
          }
        >
          {top.c.id} is {top.s.breached ? 'SLA-breached' : `due in ${fmtDur(top.s.remaining)}`}.{' '}
          {topVendor
            ? `Chase ${topVendor.vendor.replace(' service desk', '')} ${topVendor.item.toLowerCase().includes('dispatch') ? 'dispatch' : topVendor.item.toLowerCase()}${topVendor.expectedBy ? ` by ${fmtTime(topVendor.expectedBy)}` : ''}${topVisit ? ` to protect ${topVisit.engineer.split(' ')[0]}'s ${fmtTime(topVisit.at)} field visit` : ''}.`
            : `Confirm the restoration ETA with ${atmById(top.c.atmId)?.engineer ?? 'the engineer'}.`}
        </Banner>
      ) : (
        <Banner tone="blue" lead="On track">
          No breached or at-risk complaints in this queue.
        </Banner>
      )}

      <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Table2 size={18} className="text-primary" />
          <h3 className="text-[15px] font-semibold">{user === CURRENT_USER ? 'My complaints' : `${first}'s complaints`}</h3>
          <span className="text-[12px] text-muted">
            Showing {shown.length} of {d.mine.length} assigned · Priority order
          </span>
          <div className="ml-auto">{d.mine.length > 6 && <ViewAll label={showAll ? 'Show fewer' : 'View all'} onClick={() => setShowAll((s) => !s)} />}</div>
        </div>
        <ExcelGrid title="My complaints" hideToolbar rowNumbers={false} rows={shown} columns={cols} rowId={(c) => c.id} pageSize={showAll ? 25 : 6} noun="complaints" emptyState="No open complaints assigned." />
      </section>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Panel title="My tasks · due & overdue" action={<ViewAll to="/tasks/my" label={`View all ${d.tasks.length}`} />}>
          {d.tasks.length === 0 && <p className="text-[12px] text-muted">No open tasks.</p>}
          {d.tasks.slice(0, 6).map(({ t, c }) => {
            const st = taskStatus(t, now)
            const late = st === 'Overdue'
            return (
              <Entry
                key={t.id}
                title={
                  <>
                    <Link to={`/tasks/my/${t.id}`} className="font-medium text-primary hover:underline">
                      {t.id}
                    </Link>{' '}
                    · {t.title}
                  </>
                }
                status={late ? `Overdue ${fmtDur(now - Date.parse(t.due))}` : st}
                tone={late ? 'red' : st === 'Due today' ? 'amber' : 'blue'}
                meta={
                  <>
                    <Link to={`${BASE}/${c.id}`} className="hover:text-primary">
                      {c.id}
                    </Link>{' '}
                    · {t.dependency} · Due {short(t.due, now)}
                  </>
                }
                action={<LinkBtn onClick={() => taskDone(c, t)}>Mark done</LinkBtn>}
              />
            )
          })}
        </Panel>

        <Panel title="Today's field coordination" action={<LinkBtn onClick={() => setAllVisits((s) => !s)}>{allVisits ? 'Show today only' : 'Open visit planner'}</LinkBtn>}>
          {(allVisits ? d.visitsAll : d.visitsToday).length === 0 && <p className="text-[12px] text-muted">No field visits {allVisits ? 'planned' : 'today'}.</p>}
          {(allVisits ? d.visitsAll : d.visitsToday).map(({ v, c }) => {
            const a = atmById(c.atmId)
            return (
              <Entry
                key={v.id}
                title={`${allVisits ? fmtDT(v.at) : fmtTime(v.at)} · ${a?.siteId} · ${a?.city}`}
                status={v.status === 'Awaiting confirmation' ? 'Confirmation due' : v.status}
                tone={v.status === 'Confirmed' ? 'green' : v.status === 'Scheduled' ? 'blue' : 'amber'}
                meta={`${c.id} · ${v.engineer} · ${v.purpose}`}
                action={(v.status === 'Awaiting confirmation' || v.status === 'Scheduled') && <LinkBtn onClick={() => confirmVisit(c, v)}>Mark confirmed</LinkBtn>}
              />
            )
          })}
          <p className="mt-2 text-[12px] text-muted">
            {d.pendingVisits.length
              ? `${d.pendingVisits.length} pending visit${d.pendingVisits.length > 1 ? 's are' : ' is'} included in your ${ext} external dependencies.`
              : 'No visits are waiting on confirmation.'}{' '}
            {d.visitsToday.some(({ v }) => v.status === 'Confirmed') && 'The confirmed visit is ready to proceed.'}
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={`Vendor dependencies · ${d.vendors.length}`}>
          {d.vendors.length === 0 && <p className="text-[12px] text-muted">No pending vendor dependencies.</p>}
          {d.vendors.map(({ v, c }) => (
            <Entry
              key={v.id}
              title={`${v.vendor} · ${v.item}`}
              status={v.status}
              tone="amber"
              meta={
                <>
                  {c.id} · {v.lastChased ? `Last chased ${fmtTime(v.lastChased)}` : 'Not chased yet'}
                  {v.expectedBy && ` · Expected by ${fmtTime(v.expectedBy)}`}
                  {v.log.length > 0 && <span className="block text-[11px]">Log: {v.log.at(-1)}</span>}
                  <span className="mt-1 flex gap-3">
                    <LinkBtn onClick={() => chase(c, v)}>Chase vendor</LinkBtn>
                    <LinkBtn onClick={() => vendorReceived(c, v)}>Mark received</LinkBtn>
                  </span>
                </>
              }
            />
          ))}
        </Panel>
        <Panel title={`Spare parts · ${d.spares.length}`}>
          {d.spares.length === 0 && <p className="text-[12px] text-muted">No spares outstanding.</p>}
          {d.spares.map(({ s, c }) => (
            <Entry
              key={s.id}
              title={`${s.part} · ${s.model}`}
              status={s.status === 'Awaiting approval' ? 'Approval' : s.status}
              tone={toneFor(s.status)}
              meta={
                <>
                  {c.id} · {s.depot}
                  {s.eta && ` · ETA ${short(s.eta, now)}`}
                  {s.cost && ` · ${inr(s.cost)}`}
                  <span className="mt-1 flex">
                    {s.status === 'Awaiting approval' ? (
                      <Button size="sm" onClick={() => spareStep(c, s)}>
                        Approve spare
                      </Button>
                    ) : (
                      <LinkBtn onClick={() => spareStep(c, s)}>{s.status === 'Approved' ? 'Mark dispatched' : 'Mark delivered'}</LinkBtn>
                    )}
                  </span>
                </>
              }
            />
          ))}
        </Panel>
        <Panel title="Next commitments">
          {commitments.map((x, i) => (
            <Entry key={i} title={`${fmtTime(x.at)} · ${x.title}`} status={istDay(x.at) === istDay(now) ? 'Today' : fmtDT(x.at)} tone={Date.parse(x.at) < now ? 'red' : 'gray'} meta={x.meta} />
          ))}
        </Panel>
      </div>
    </ComplaintsShell>
  )
}
