import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  CURRENT_USER,
  RESPONSE_MIN,
  SLA_HOURS,
  atmById,
  complaintStore,
  escalationChain,
  fmtDT,
  fmtDate,
  fmtDur,
  nextTaskId,
  pendingDays,
  setLastOpened,
  sla,
  statusLabel,
  taskStatus,
  updateComplaint,
  type CTask,
} from '@/data/complaints'
import { recStore } from '@/data/complaintsAi'
import { ComplaintsShell, Entry, GridCard, KV, LinkBtn, Panel, ViewAll, BASE, priorityTone, useNow } from './shared'
import { AddActionModal, AssignOwnerModal, ComposeEmailModal, EditDetailsModal, EscalateModal, ResolutionModal, ScheduleVisitModal } from './Complaint360Modals'

const H = 3_600_000
type ModalKind = 'owner' | 'action' | 'edit' | 'visit' | 'email' | 'escalate' | 'resolution' | null

const ANCHORS: [string, string][] = [
  ['Context', 'c360-context'],
  ['Issue & AI', 'c360-issue'],
  ['Tasks', 'c360-tasks'],
  ['Emails', 'c360-emails'],
  ['Field visits', 'c360-emails'],
  ['SLA & escalation', 'c360-sla'],
  ['Resolution', 'c360-resolution'],
  ['Asset history', 'c360-history'],
  ['Audit trail', 'c360-history'],
]
const FAULT: Record<string, string> = {
  'Power & UPS': 'power failure',
  Network: 'network fault',
  'Cash dispenser': 'dispenser fault',
  'Card reader': 'card reader fault',
  'Receipt printer': 'printer fault',
  'Cooling & environment': 'cooling fault',
  'Software & EJ': 'software fault',
}
const minLabel = (m: number) => (m >= 60 ? `${m / 60}h` : `${m}m`)

function Finder() {
  const all = complaintStore.use()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const go = () => {
    const s = q.trim().toUpperCase()
    const hit = all.find((c) => c.id === s || c.id === `CMP-${s}` || c.docket.toUpperCase() === s || c.atmId === s)
    if (hit) {
      nav(`${BASE}/${hit.id}`)
      setQ('')
    } else toast(`No complaint matches "${q}"`, 'info')
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
      className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 sm:w-64"
    >
      <Search size={14} className="text-muted" />
      <input list="cmp-ids" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Open complaint · ID, docket or ATM" aria-label="Open complaint" className="w-full bg-transparent text-[13px] outline-none" />
      <datalist id="cmp-ids">
        {all.slice(0, 80).map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </datalist>
    </form>
  )
}

export default function Complaint360() {
  const { complaintId = '' } = useParams()
  const all = complaintStore.use()
  const now = useNow(15_000)
  const [modal, setModal] = useState<ModalKind>(null)
  const [fullLog, setFullLog] = useState(false)
  const c = all.find((x) => x.id === complaintId)

  useEffect(() => {
    if (c) setLastOpened(c.id)
  }, [c])

  if (!c)
    return (
      <ComplaintsShell title="Complaint 360" sub="A complete view of the complaint, its dependencies and every action." onExport={() => toast('Open a complaint to export it', 'info')}>
        <div className="rounded-xl border border-line bg-white p-6">
          <h3 className="text-[15px] font-semibold">Complaint {complaintId} was not found</h3>
          <p className="mt-1 mb-4 text-[13px] text-muted">Search by complaint ID, docket number or ATM ID, or open a recent complaint.</p>
          <Finder />
          <div className="mt-4 grid gap-1">
            {all.filter((x) => x.status === 'Open').slice(0, 8).map((x) => (
              <Link key={x.id} to={`${BASE}/${x.id}`} className="text-[13px] text-primary hover:underline">
                {x.id} · {x.title}
              </Link>
            ))}
          </div>
        </div>
      </ComplaintsShell>
    )

  const atm = atmById(c.atmId)!
  const s = sla(c, now)
  const open = c.status === 'Open'
  const chain = escalationChain(c.department, atm)
  const current = chain[c.escalationLevel - 1]
  const lastEsc = c.escalations.at(-1)
  const nextLvl = chain[c.escalationLevel]
  const nextAt = s.deadline + (c.escalationLevel - 1) * 24 * H
  const respMin = c.respondedAt ? Math.round((Date.parse(c.respondedAt) - Date.parse(c.receivedAt)) / 60000) : null
  const respMet = respMin != null && respMin <= RESPONSE_MIN[c.priority]
  const overdue = c.tasks.filter((t) => taskStatus(t, now) === 'Overdue').length
  const history = all.filter((x) => x.atmId === c.atmId && x.id !== c.id).sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
  const audit = [...c.audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const approvals = !c.frSignOff && !c.hdValidation ? 'FR sign-off and HD Team validation required' : !c.frSignOff ? 'HD Team validation recorded · FR sign-off required' : !c.hdValidation ? 'FR sign-off received · HD Team validation required' : 'FR sign-off & HD Team validation recorded'

  const markTask = (t: CTask) => {
    updateComplaint(c.id, (x) => ({ tasks: x.tasks.map((y) => (y.id === t.id ? { ...y, done: true } : y)), lastAction: `${t.title} · completed` }), { title: 'Task completed', meta: `${CURRENT_USER} · ${t.id} · ${t.title}` })
    toast(`${t.id} marked complete`)
  }
  const visitStep = (id: string, status: 'Confirmed' | 'Completed') => {
    const v = c.visits.find((x) => x.id === id)!
    updateComplaint(c.id, (x) => ({ visits: x.visits.map((y) => (y.id === id ? { ...y, status } : y)), lastAction: `Field visit ${id} ${status.toLowerCase()}` }), { title: `Field visit ${status.toLowerCase()}`, meta: `${CURRENT_USER} · ${id} · ${v.engineer}` })
    toast(`${id} ${status.toLowerCase()}`)
  }
  const reviewAi = () => {
    updateComplaint(c.id, (x) => ({ ai: { ...x.ai!, reviewed: { by: CURRENT_USER, at: new Date(now).toISOString() } } }), { title: 'AI summary reviewed', meta: `${CURRENT_USER} · Human review recorded` })
    toast('AI summary marked as reviewed')
  }
  const acceptAi = () => {
    const id = nextTaskId(recStore.get().flatMap((r) => (r.taskId ? [r.taskId] : [])))
    const title = c.ai!.nextAction.replace(/\.$/, '')
    updateComplaint(
      c.id,
      (x) => ({
        ai: { ...x.ai!, acceptedTask: id, reviewed: x.ai!.reviewed ?? { by: CURRENT_USER, at: new Date(now).toISOString() } },
        tasks: [...x.tasks, { id, title: title.length > 70 ? `${title.slice(0, 67)}…` : title, owner: x.owner, due: new Date(now + 4 * H).toISOString(), dependency: 'AI recommendation' }],
        lastAction: `AI recommendation accepted · ${id}`,
      }),
      { title: 'AI recommendation accepted', meta: `${CURRENT_USER} · Follow-up ${id} created for ${c.owner}` },
    )
    toast(`Recommendation accepted · ${id} created`)
  }

  const taskCols: GridColumn<CTask>[] = [
    { key: 'id', header: 'Task ID', width: 100, render: (t) => <Link to={`/tasks/my/${t.id}`} className="font-medium text-primary hover:underline">{t.id}</Link> },
    { key: 'title', header: 'Task / next action', width: 420 },
    { key: 'owner', header: 'Owner', width: 130 },
    { key: 'due', header: 'Due date', width: 120, value: (t) => fmtDT(t.due) },
    { key: 'dependency', header: 'Dependency', width: 120 },
    {
      key: 'status',
      header: 'Status',
      width: 150,
      value: (t) => taskStatus(t, now),
      render: (t) => (
        <span className="group/cell flex items-center gap-2">
          {taskStatus(t, now)}
          {!t.done && (
            <button type="button" onClick={() => markTask(t)} className="ml-auto text-[11px] font-medium text-primary group-hover/cell:opacity-100 hover:underline focus:opacity-100 [@media(hover:hover)]:opacity-0">
              Mark done
            </button>
          )}
        </span>
      ),
    },
  ]

  const exportOne = () =>
    downloadCsv(`${c.id}-360`, ['Section', 'Field', 'Value'], [
      ['Complaint', 'ID', c.id],
      ['Complaint', 'Title', c.title],
      ['Complaint', 'Received', fmtDT(c.receivedAt)],
      ['Complaint', 'Status', `${statusLabel(c)} · ${c.subStatus}`],
      ['Complaint', 'Priority', c.priority],
      ['Complaint', 'Owner', c.owner],
      ['Complaint', 'Docket', c.docket],
      ['Site', 'ATM / Site', `${c.atmId} · ${atm.siteId} · ${atm.siteName}`],
      ['Site', 'Franchise', `${atm.franchise} · ${atm.complainant}`],
      ['SLA', 'Resolution', s.label],
      ['Escalation', 'Level', `L${c.escalationLevel} · ${current.person}`],
      ['Resolution', 'Outcome', `${c.outcome} · ${c.outcomeRemark}`],
      ...c.tasks.map((t) => ['Task', t.id, `${t.title} · ${t.owner} · ${fmtDT(t.due)} · ${taskStatus(t, now)}`]),
      ...audit.map((a) => ['Audit', fmtDT(a.at), `${a.title} · ${a.meta}`]),
    ])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <ComplaintsShell title="Complaint 360" sub="A complete view of the complaint, its dependencies and every action." onExport={exportOne}>
      {/* Header */}
      <section className="mb-4 rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-primary">
              {c.id} · Received {fmtDate(c.receivedAt)}, {fmtDT(c.receivedAt).split(', ')[1]} IST
            </div>
            <h2 className="mt-1 text-[20px] leading-snug font-semibold text-ink sm:text-[22px]">{c.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
              <Badge tone={open ? 'blue' : 'green'} dot={false}>
                {open ? `Open · ${c.subStatus}` : 'Closed · Resolved'}
              </Badge>
              <Badge tone={priorityTone(c.priority)} dot={false}>
                {c.priority}
              </Badge>
              <Badge tone={s.tone} dot={false}>
                {open ? (s.breached ? `SLA breached · ${fmtDur(-s.remaining)}` : `SLA · ${fmtDur(s.remaining)} remaining`) : s.label}
              </Badge>
              <span>
                Owner: {c.owner} · {c.department} · Docket {c.docket}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModal('owner')}>
              Assign owner
            </Button>
            <Button onClick={() => setModal('action')}>Add action</Button>
          </div>
        </div>
      </section>

      <div className="mb-4 rounded-lg bg-primary-soft px-3 py-2.5 text-[12px] text-primary">
        <nav aria-label="On this page" className="min-w-0">
          On this page:{' '}
          {ANCHORS.map(([label, id], i) => (
            <span key={label}>
              <button type="button" onClick={() => scrollTo(id)} className="hover:underline">
                {label}
              </button>
              {i < ANCHORS.length - 1 && ' · '}
            </span>
          ))}
        </nav>
      </div>

      {/* Context */}
      <div id="c360-context" className="mb-4 grid scroll-mt-4 gap-4 lg:grid-cols-2">
        <Panel title="Customer & complainant">
          <KV k="Franchise / name">
            <Link to={`/franchise/master-data/${atm.franchiseId}`} className="hover:text-primary hover:underline">
              {atm.franchise}
            </Link>{' '}
            · {atm.complainant}
          </KV>
          <KV k="Reporting authority">{c.reportingAuthority}</KV>
          <KV k="Mobile number">{atm.mobile}</KV>
          <KV k="FR email">{atm.email}</KV>
          <KV k="Receiving channel">{c.channel}</KV>
        </Panel>
        <Panel title="Project & site">
          <KV k="Project">
            {atm.project} · {atm.projectId}
          </KV>
          <KV k="Site ID">
            {atm.siteId} · {atm.siteName}
          </KV>
          <KV k="Site address">{atm.address}</KV>
          <KV k="State / zone">
            {atm.state} · {atm.zone}
          </KV>
          <KV k="SSM / RM">
            {atm.ssm} / {atm.rm}
          </KV>
        </Panel>
      </div>

      <div id="c360-issue" className="mb-4 grid scroll-mt-4 gap-4 lg:grid-cols-2">
        <Panel title="ATM asset & component">
          <KV k="ATM ID">
            {c.atmId} · {atm.model}
          </KV>
          <KV k="Asset serial">
            {atm.serial} · Installed {atm.installed}
          </KV>
          <KV k="Component">{c.component}</KV>
          {c.category === 'Power & UPS' && <KV k="Battery serial">{atm.battery}</KV>}
          <KV k="Engineer">
            {atm.engineer} · {atm.engineerPhone}
          </KV>
          <KV k="Health / downtime">
            {!open ? 'Healthy · Restored' : c.impact === 'None' ? 'Degraded · Operational with open fault' : `${c.impact} · `}
            {open && c.impact !== 'None' && (s.breached ? `${fmtDur(-s.remaining)} since SLA deadline` : `${fmtDur(s.elapsed)} since complaint`)}
          </KV>
        </Panel>
        <Panel title="Issue details" action={<LinkBtn onClick={() => setModal('edit')}>Edit details</LinkBtn>}>
          <p className="text-[12px] font-semibold text-ink">
            {c.category} / {c.subcategory}
          </p>
          <p className="mt-2 mb-3 text-[12px] leading-[18px] text-ink-2">{c.details}</p>
          <KV k="Pending since">
            {open ? `${pendingDays(c.receivedAt, now)} day${pendingDays(c.receivedAt, now) === 1 ? '' : 's'} · Calculated from receiving date` : `Closed ${fmtDT(c.closedAt)}`}
          </KV>
          <KV k="Last action status">{c.lastAction}</KV>
          <KV k="Attachments">{c.attachments.length ? c.attachments.join(' · ') : 'None'}</KV>
        </Panel>
      </div>

      {c.ai && (
        <Panel
          className="mb-4"
          title="AI summary"
          sub={c.ai.reviewed ? `AI-generated · Demo prediction · Reviewed by ${c.ai.reviewed.by} · ${fmtDT(c.ai.reviewed.at)}` : `AI-generated · Updated ${fmtDT(c.ai.updated)} · Human review required · Demo prediction`}
          action={!c.ai.reviewed && <LinkBtn onClick={reviewAi}>Review summary</LinkBtn>}
        >
          <div className="grid gap-5 md:grid-cols-[1fr_300px]">
            <div>
              <p className="text-[12px] leading-[18px] text-ink-2">{c.ai.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="blue" dot={false}>
                  {c.ai.faultLabel} · {c.ai.faultConfidence}% confidence
                </Badge>
                {c.ai.prediction !== 'Within SLA' ? (
                  <Badge tone="amber" dot={false}>
                    {c.ai.prediction.replace(/^L\d /, '').replace(/^\w/, (m) => m.toUpperCase())} predicted · {c.ai.confidence}%
                  </Badge>
                ) : (
                  <Badge tone="green" dot={false}>
                    Within SLA predicted · {c.ai.confidence}%
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-ink">Recommended next action</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{c.ai.nextAction}</p>
              {c.ai.acceptedTask ? (
                <p className="mt-3 text-[12px] text-emerald-700">
                  Accepted · Follow-up{' '}
                  <Link to={`/tasks/my/${c.ai.acceptedTask}`} className="font-semibold hover:underline">
                    {c.ai.acceptedTask}
                  </Link>{' '}
                  created
                </p>
              ) : (
                <Button className="mt-3" onClick={acceptAi} disabled={!open}>
                  Accept recommendation
                </Button>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* Tasks */}
      <GridCard
        id="c360-tasks"
        className="mb-4"
        title="Tasks"
        sub={`${c.tasks.length} linked task${c.tasks.length === 1 ? '' : 's'} · ${overdue} overdue`}
        onExport={() => downloadCsv(`${c.id}-tasks`, ['Task ID', 'Task / next action', 'Owner', 'Due date', 'Dependency', 'Status'], c.tasks.map((t) => [t.id, t.title, t.owner, fmtDT(t.due), t.dependency, taskStatus(t, now)]))}
        viewAll={<ViewAll to="/tasks/my" />}
        footer={`Showing ${Math.min(5, c.tasks.length)} priority record${c.tasks.length === 1 ? '' : 's'}`}
      >
        <ExcelGrid title="Tasks" hideToolbar hidePagination={c.tasks.length <= 5} rowNumbers={false} rows={[...c.tasks].sort((a, b) => Date.parse(a.due) - Date.parse(b.due))} columns={taskCols} rowId={(t) => t.id} pageSize={5} noun="tasks" emptyState="No linked tasks. Use Add action to create one." />
      </GridCard>

      <div id="c360-emails" className="mb-4 grid scroll-mt-4 gap-4 lg:grid-cols-2">
        <Panel title="Emails" action={<LinkBtn onClick={() => setModal('email')}>Compose email</LinkBtn>}>
          {c.emails.length === 0 && <p className="text-[12px] text-muted">No linked emails.</p>}
          {c.emails.map((e) => (
            <Entry
              key={e.id}
              title={
                <Link to="/email/inbox" className="hover:text-primary hover:underline">
                  {e.subject}
                </Link>
              }
              status={e.status}
              tone={e.status === 'Awaiting reply' ? 'amber' : e.status === 'Sent' ? 'blue' : 'gray'}
              meta={`${e.route} · ${fmtDT(e.at)} · ${e.meta}`}
            />
          ))}
        </Panel>
        <Panel title="Field visits" action={<LinkBtn onClick={() => setModal('visit')}>Schedule visit</LinkBtn>}>
          {c.visits.length === 0 && <p className="text-[12px] text-muted">No field visits yet.</p>}
          {[...c.visits, ...history.flatMap((h) => h.visits.filter((v) => v.purpose.startsWith('Previous')))].map((v) => (
            <Entry
              key={v.id}
              title={`${fmtDT(v.at)} · ${v.purpose}`}
              status={v.status}
              tone={v.status === 'Completed' ? 'green' : v.status === 'Confirmed' ? 'green' : v.status === 'Scheduled' ? 'blue' : 'amber'}
              meta={`${v.engineer} · ${v.note}`}
              action={
                c.visits.some((x) => x.id === v.id) &&
                v.status !== 'Completed' && (
                  <span className="flex gap-3">
                    {v.status !== 'Confirmed' && <LinkBtn onClick={() => visitStep(v.id, 'Confirmed')}>Confirm</LinkBtn>}
                    <LinkBtn onClick={() => visitStep(v.id, 'Completed')}>Complete</LinkBtn>
                  </span>
                )
              }
            />
          ))}
        </Panel>
      </div>

      <div id="c360-sla" className="mb-4 grid scroll-mt-4 gap-4 lg:grid-cols-2">
        <Panel title="SLA" sub={`${c.priority} ${FAULT[c.category]} · Response ${minLabel(RESPONSE_MIN[c.priority])} / Resolution ${SLA_HOURS[c.priority]}h`}>
          <KV k="Response">{respMin == null ? 'Not responded' : `${respMet ? 'Met' : 'Missed'} · ${fmtDT(c.respondedAt)} (${respMin} minutes)`}</KV>
          <KV k="Resolution deadline">{fmtDT(s.deadline)} IST</KV>
          <KV k={open ? 'Current reference time' : 'Closed at'}>{open ? `${fmtDT(now)} IST` : `${fmtDT(c.closedAt)} IST`}</KV>
          <KV k="Resolution elapsed">
            {fmtDur(s.elapsed)} · {s.breached ? `Breach by ${fmtDur(open ? -s.remaining : s.elapsed - SLA_HOURS[c.priority] * H)}` : open ? `${fmtDur(s.remaining)} remaining` : 'Within SLA'}
          </KV>
          <KV k="Clock policy">Runs continuously · Not paused for vendor</KV>
          <div className="mt-3">
            <Badge tone={s.tone} dot={false}>
              {open ? (s.breached ? 'Breached · Immediate follow-up' : s.atRisk ? 'At risk · Follow up today' : 'Within SLA · On track') : s.label}
            </Badge>
          </div>
        </Panel>
        <Panel title="Escalation" action={open && nextLvl && <LinkBtn onClick={() => setModal('escalate')}>Escalate now</LinkBtn>}>
          <KV k="Routing">{chain.map((l) => (l.role === 'RM' ? 'Regional Manager' : l.role)).join(' → ')}</KV>
          <KV k="Current level">
            L{c.escalationLevel} · {current.person} · Auto-selected for {c.department}
          </KV>
          <KV k="Triggered">{lastEsc ? `${fmtDT(lastEsc.at)} · ${lastEsc.note}` : 'Not escalated · L1 handling'}</KV>
          <KV k="Next level">{nextLvl ? `L${nextLvl.level} · ${nextLvl.role === 'RM' ? 'Regional Manager' : nextLvl.role} · ${fmtDT(nextAt)}` : 'Highest level reached'}</KV>
          <KV k="Last reminder">{c.lastReminder ? `${fmtDT(c.lastReminder.at)}${c.lastReminder.task ? ` · Linked task ${c.lastReminder.task}` : ''}` : 'No reminder sent'}</KV>
          <div className="mt-3">
            <Badge tone={open && c.escalationLevel > 1 ? 'amber' : 'gray'} dot={false}>
              {open && c.escalationLevel > 1 ? 'Escalation active' : open ? 'No active escalation' : 'Closed'}
            </Badge>
          </div>
        </Panel>
      </div>

      <Panel
        id="c360-resolution"
        className="mb-4"
        title="Resolution"
        sub={open ? 'Complaint is open. Closure is unavailable until restoration evidence and FR confirmation are recorded.' : `Complaint closed on ${fmtDT(c.closedAt)}.`}
        action={<LinkBtn onClick={() => setModal('resolution')}>Update resolution</LinkBtn>}
      >
        <div className="grid gap-x-8 md:grid-cols-2">
          <div>
            <KV k="Proposed fix">{c.proposedFix || 'Not yet recorded'}</KV>
            <KV k="Date of redressal">{c.redressalDate ? fmtDate(`${c.redressalDate}T12:00:00+05:30`) : 'Not yet recorded'}</KV>
            <KV k="Outcome">
              {c.outcome}
              {c.outcomeRemark && ` · ${c.outcomeRemark}`}
            </KV>
          </div>
          <div>
            <KV k="Closure status">{open ? `Open · ${c.subStatus}` : 'Closed · Resolved'}</KV>
            <KV k="Remark">{c.remark || '—'}</KV>
            <KV k="Approval">{approvals}</KV>
          </div>
        </div>
      </Panel>

      <div id="c360-history" className="grid scroll-mt-4 gap-4 lg:grid-cols-2">
        <Panel title="Asset history" action={<LinkBtn to={`${BASE}/assets?atm=${c.atmId}`}>Open asset record</LinkBtn>}>
          {history.slice(0, 5).map((h) => (
            <Entry
              key={h.id}
              title={
                <>
                  {fmtDate(h.receivedAt)} ·{' '}
                  <Link to={`${BASE}/${h.id}`} className="text-primary hover:underline">
                    {h.id}
                  </Link>{' '}
                  · {h.title}
                </>
              }
              status={h.category === c.category && h.status === 'Closed' && Date.parse(c.receivedAt) - Date.parse(h.receivedAt) <= 30 * 24 * H && Date.parse(h.receivedAt) < Date.parse(c.receivedAt) ? 'Repeat issue' : statusLabel(h)}
              tone={h.category === c.category && Date.parse(h.receivedAt) < Date.parse(c.receivedAt) && Date.parse(c.receivedAt) - Date.parse(h.receivedAt) <= 30 * 24 * H ? 'amber' : h.status === 'Closed' ? 'green' : 'blue'}
              meta={h.status === 'Closed' ? `${h.outcomeRemark || 'Resolved'} · ${(h.downtimeH ?? 0).toFixed(1)}h downtime · Closed` : `${h.lastAction} · Open`}
            />
          ))}
          <Entry title={`${atm.installed} · ATM commissioned`} status="Installed" tone="gray" meta={`${atm.model} · ${atm.project} · ${atm.siteId}`} />
        </Panel>
        <Panel title="Audit trail" action={audit.length > 4 && <LinkBtn onClick={() => setFullLog((f) => !f)}>{fullLog ? 'Show latest' : 'View full log'}</LinkBtn>}>
          {(fullLog ? audit : audit.slice(0, 4)).map((a, i) => (
            <Entry key={`${a.at}-${i}`} title={`${fmtDT(a.at)} · ${a.title}`} meta={a.meta} />
          ))}
        </Panel>
      </div>

      {modal === 'owner' && <AssignOwnerModal c={c} onClose={() => setModal(null)} />}
      {modal === 'action' && <AddActionModal c={c} onClose={() => setModal(null)} />}
      {modal === 'edit' && <EditDetailsModal c={c} onClose={() => setModal(null)} />}
      {modal === 'visit' && <ScheduleVisitModal c={c} onClose={() => setModal(null)} />}
      {modal === 'email' && <ComposeEmailModal c={c} onClose={() => setModal(null)} />}
      {modal === 'escalate' && <EscalateModal c={c} onClose={() => setModal(null)} />}
      {modal === 'resolution' && <ResolutionModal c={c} onClose={() => setModal(null)} />}
    </ComplaintsShell>
  )
}
