import { useRef, useState, type ReactNode } from 'react'
import { complaintStore, maintenanceStore } from '@/data/complaints'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Bell,
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileText,
  GitBranch,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UploadCloud,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  addComment,
  addEvidence,
  blocksOf,
  CURRENT_EMPLOYEE,
  CURRENT_LEAD,
  entityHref,
  fmtIst,
  fmtShort,
  isDueToday,
  LIFECYCLE,
  log,
  mentionsIn,
  needsApproval,
  openBlockers,
  PEOPLE,
  person,
  reassign,
  riskBand,
  riskOf,
  slaOf,
  subtasksOf,
  tasksStore,
  toggleVerify,
  transition,
  type Action,
  type AuditKind,
  type Task,
} from '@/data/tasks'
import { fmtSize } from '@/components/ui/Form'
import { Avatar, Footer, StatusBadge } from './ui'

const ACCEPT = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png']
const MAX_MB = 20

export default function TaskDetail() {
  const { taskId = '' } = useParams()
  const { tasks, viewAs } = tasksStore.use()
  const t = tasks.find((x) => x.id === taskId)
  const actor = viewAs === 'Team Leader' ? CURRENT_LEAD : CURRENT_EMPLOYEE
  const [modal, setModal] = useState<null | 'reassign' | 'remind' | 'return'>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  if (!t) {
    // tasks raised from complaints / maintenance live in the complaints module
    const cmp = complaintStore.get().find((c) => c.tasks.some((x) => x.id === taskId))
    const ct = cmp?.tasks.find((x) => x.id === taskId)
    const mt = maintenanceStore.get().find((m) => m.id === taskId)
    if (ct || mt)
      return (
        <div className="max-w-2xl rounded-xl border border-line bg-white p-6">
          <div className="text-[12px] text-muted">{cmp ? `Complaint task · ${cmp.id}` : 'Preventive maintenance task'}</div>
          <h1 className="mt-1 text-[22px] font-semibold">
            {taskId} · {ct?.title ?? mt?.title}
          </h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div><dt className="text-muted">Owner</dt><dd className="font-medium">{ct?.owner ?? mt?.owner}</dd></div>
            <div><dt className="text-muted">Due</dt><dd className="font-medium">{new Date(ct?.due ?? mt!.due).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</dd></div>
            <div><dt className="text-muted">Status</dt><dd className="font-medium">{ct ? (ct.done ? 'Done' : 'Open') : 'Open'}</dd></div>
            <div><dt className="text-muted">{ct ? 'Dependency' : 'ATM'}</dt><dd className="font-medium">{ct?.dependency ?? mt?.atmId}</dd></div>
          </dl>
          <p className="mt-4 text-[12px] text-muted">This task is tracked on its complaint. Update it from Complaint 360.</p>
          <Link to={cmp ? `/operations/complaints/${cmp.id}` : '/operations/complaints/assets'} className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
            Open {cmp ? `Complaint 360 · ${cmp.id}` : 'Asset Dashboard'} →
          </Link>
        </div>
      )
    return (
      <div className="rounded-xl border border-line bg-white p-10 text-center">
        <p className="text-[15px] font-semibold">Task {taskId} not found</p>
        <p className="mt-1 text-[13px] text-muted">It may have been removed or the link is incorrect.</p>
        <Link to="/tasks/my" className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
          <ArrowLeft size={14} /> Back to My Tasks
        </Link>
      </div>
    )
  }

  const s = slaOf(t)
  const href = entityHref(t.entityId)
  const run = (a: Action, by = actor, note = '') => {
    const r = transition(t.id, a, by, note)
    toast(r.message, r.ok ? 'success' : 'info')
    return r
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <Link to="/tasks/my" className="flex items-center gap-1 text-primary hover:underline">
              <ArrowLeft size={14} /> My Tasks
            </Link>
            <span className="font-semibold text-ink">{t.id}</span>
            <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', t.priority === 'Critical' ? 'bg-red-50 text-red-700' : t.priority === 'High' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>{t.priority}</span>
            <StatusBadge s={t.status} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Users size={14} />} onClick={() => setModal('reassign')} disabled={t.status === 'Closed'}>
              Reassign
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<MessageSquare size={14} />}
              onClick={() => {
                commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => commentRef.current?.focus(), 300)
              }}
            >
              Add comment
            </Button>
            <Button size="sm" icon={<Bell size={14} />} onClick={() => setModal('remind')} disabled={t.status === 'Closed'}>
              Send reminder
            </Button>
          </div>
        </div>
        <h1 className="mt-3 text-[24px] font-semibold text-ink sm:text-[28px]">{t.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted">
          <span>Source Module: {t.source}</span>
          {t.entityId &&
            (href ? (
              <Link to={href} className="flex items-center gap-1 text-primary hover:underline">
                {t.entityId} · {t.entityLabel} <ExternalLink size={11} />
              </Link>
            ) : (
              <span className="text-ink-2">
                {t.entityId} · {t.entityLabel}
              </span>
            ))}
          <span>Created {fmtIst(t.createdAt)}</span>
          <span className={cn(!s.closed && (s.overdue || isDueToday(t)) && 'text-red-600')}>Due {fmtIst(s.due)}</span>
        </div>

        <Lifecycle t={t} />
        <ActionBar t={t} actor={actor} run={run} onReturn={() => setModal('return')} />
      </section>

      <SlaBanner t={t} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div className="min-w-0 space-y-5">
          <Panel title="Description & Expected Outcome">
            <p className="text-[13px] leading-relaxed text-ink">{t.description}</p>
            <div className="mt-4 rounded-lg bg-primary-soft/70 p-4">
              <div className="text-[12px] font-semibold text-primary">Expected Outcome</div>
              <p className="mt-1.5 text-[13px] text-ink">{t.expectedOutcome}</p>
            </div>
            {t.workflowId && <p className="mt-3 text-[11px] text-muted">Workflow {t.workflowId} · Sales → Franchise → Verification → Finance</p>}
          </Panel>

          <Dependencies t={t} all={tasks} />
          <Evidence t={t} actor={actor} />
          <Comments t={t} actor={actor} inputRef={commentRef} />
        </div>

        <div className="min-w-0 space-y-5">
          <Panel title="Accountability" sub="Ownership remains visible across every handoff">
            <div className="space-y-3">
              {(
                [
                  [t.owner, 'Accountable Owner'],
                  [t.assignee, 'Current Assignee'],
                  [t.reviewer, 'Reviewer'],
                  [t.approver, 'Approver'],
                ] as const
              ).map(([n, role]) => {
                const p = person(n)
                return (
                  <div key={role} className="flex items-center gap-3">
                    <Avatar name={p.name} initials={p.initials} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[13px] font-semibold', n ? 'text-ink' : 'text-amber-700')}>{n || 'Unassigned'}</div>
                      <div className="text-[11px] text-muted">{n ? `${p.role} · ${p.dept}` : 'Use Reassign to set an owner'}</div>
                    </div>
                    <span className="text-[11px] text-muted">{role}</span>
                  </div>
                )
              })}
            </div>
          </Panel>

          <RiskCard t={t} />
          <AuditTrail t={t} />
        </div>
      </div>

      <Footer />

      {modal === 'reassign' && <ReassignModal t={t} actor={actor} onClose={() => setModal(null)} />}
      {modal === 'remind' && <ReminderModal t={t} actor={actor} onClose={() => setModal(null)} />}
      {modal === 'return' && (
        <ReturnModal
          t={t}
          onClose={() => setModal(null)}
          onSubmit={(note) => {
            run('return', t.approver, note)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function Panel({ title, sub, children, action }: { title: string; sub?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ---------------------------- lifecycle ---------------------------- */

function Lifecycle({ t }: { t: Task }) {
  const cur = t.status === 'Waiting/Blocked' ? 2 : LIFECYCLE.indexOf(t.status)
  return (
    <ol className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-5">
      {LIFECYCLE.map((st, i) => {
        const done = i < cur || t.status === 'Closed'
        const now = i === cur && t.status !== 'Closed'
        const label = now && t.status === 'Waiting/Blocked' ? 'Waiting/Blocked' : st
        return (
          <li
            key={st}
            className={cn(
              'flex h-10 items-center gap-2 rounded-lg border px-3 text-[13px]',
              done && 'border-line bg-primary-soft/40 font-medium text-primary',
              now && (t.status === 'Pending Approval' ? 'border-amber-300 bg-amber-50 font-semibold text-amber-800' : t.status === 'Waiting/Blocked' ? 'border-red-200 bg-red-50 font-semibold text-red-700' : 'border-primary bg-primary-soft font-semibold text-primary'),
              !done && !now && 'border-line bg-surface/60 text-muted',
            )}
          >
            {done ? <Check size={15} /> : now ? <Clock3 size={15} /> : <Circle size={14} />}
            <span className="truncate">{label}</span>
            {i < LIFECYCLE.length - 1 && <ArrowRight size={13} className="ml-auto hidden opacity-60 sm:block" />}
          </li>
        )
      })}
    </ol>
  )
}

function ActionBar({ t, actor, run, onReturn }: { t: Task; actor: string; run: (a: Action, by?: string, note?: string) => unknown; onReturn: () => void }) {
  const all = tasksStore.get().tasks
  const blockers = openBlockers(t, all)
  const approval = needsApproval(t)
  const closeBlockReason = blockers.length
    ? `Blocked by ${blockers.map((b) => `${b.id} (${b.depLabel ?? b.title})`).join(', ')}`
    : approval && !(t.status === 'Pending Approval' && t.approved)
      ? `Needs ${t.approver}'s approval first`
      : ''

  if (t.status === 'Closed')
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
        <CheckCircle2 size={15} /> Closed {t.closedAt ? fmtIst(t.closedAt) : ''} · {slaOf(t).line} ({slaOf(t).ratio})
      </div>
    )

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-[12px]">
      <span className="font-semibold text-ink-2">Next step</span>
      {t.status === 'New' && (
        <Button size="sm" icon={<UserPlus size={14} />} onClick={() => run('assign')}>
          Confirm assignment
        </Button>
      )}
      {t.status === 'Assigned' && (
        <Button size="sm" icon={<Play size={14} />} onClick={() => run('start')}>
          Start
        </Button>
      )}
      {t.status === 'Waiting/Blocked' && (
        <Button size="sm" icon={<Play size={14} />} onClick={() => run('resume')} disabled={blockers.length > 0} title={blockers.length ? `Waiting on ${blockers.map((b) => b.id).join(', ')}` : undefined}>
          Resume work
        </Button>
      )}
      {t.status === 'In Progress' && approval && (
        <Button size="sm" icon={<Send size={14} />} onClick={() => run('submit')}>
          Submit for approval
        </Button>
      )}
      {t.status === 'Pending Approval' && (
        <span className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-white px-2 py-1">
          <span className="text-muted">Approver · {t.approver}</span>
          <Button size="sm" variant="secondary" icon={<ShieldCheck size={14} className="text-emerald-600" />} onClick={() => run('approve', t.approver)} disabled={!!t.approved}>
            {t.approved ? 'Approved' : 'Approve'}
          </Button>
          <Button size="sm" variant="danger" icon={<RotateCcw size={14} />} onClick={onReturn}>
            Return
          </Button>
        </span>
      )}
      {(t.status === 'In Progress' || t.status === 'Pending Approval') && (
        <Button size="sm" variant={closeBlockReason ? 'secondary' : 'primary'} icon={<CheckCircle2 size={14} />} onClick={() => run('close')} disabled={!!closeBlockReason} title={closeBlockReason || undefined}>
          Close task
        </Button>
      )}
      {closeBlockReason && (t.status === 'In Progress' || t.status === 'Pending Approval') && (
        <span className="flex items-center gap-1 text-muted">
          <CircleAlert size={13} /> {closeBlockReason}
        </span>
      )}
      {t.status === 'Waiting/Blocked' && blockers.length > 0 && <span className="text-muted">Waiting on {blockers.map((b) => b.id).join(', ')} — resumes automatically when it closes.</span>}
      <span className="ml-auto text-[11px] text-muted">Acting as {actor}</span>
    </div>
  )
}

/* ---------------------------- SLA ---------------------------- */

function SlaBanner({ t }: { t: Task }) {
  const s = slaOf(t)
  const tone = s.closed ? (s.overdue ? 'red' : 'green') : s.overdue ? 'red' : s.remainingMin <= 4 * 60 ? 'amber' : 'blue'
  const cls = { red: 'border-red-200 bg-red-50 text-red-800', amber: 'border-amber-200 bg-amber-50 text-amber-800', green: 'border-emerald-200 bg-emerald-50 text-emerald-800', blue: 'border-line bg-white text-ink' }[tone]
  const bar = { red: 'bg-red-600', amber: 'bg-amber-700', green: 'bg-emerald-600', blue: 'bg-primary' }[tone]
  const dueTxt = isDueToday(t)
    ? `Due today at ${new Date(s.due).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })} IST`
    : `Due ${fmtIst(s.due, false)}`
  const note = s.closed
    ? 'Task closed. Final SLA recorded in the audit trail.'
    : (t.slaNote && t.status === 'Pending Approval'
        ? t.slaNote
        : t.status === 'Pending Approval'
          ? `Awaiting ${t.approver}'s approval. SLA continues to run.`
          : t.status === 'Waiting/Blocked'
            ? `Waiting: ${t.alertNote ?? 'dependency outstanding'}. SLA continues to run — it never pauses.`
            : 'SLA clock is running from creation and never pauses.')
  return (
    <section className={cn('flex flex-wrap items-center gap-4 rounded-xl border px-5 py-4', cls)}>
      <Clock3 size={22} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">
          {s.closed ? `Closed in ${s.ratio.split(' / ')[0]}` : s.overdue ? `${s.line}` : `${s.line.replace(' left', ' remaining')}`} · Target TAT {t.tatHours}h · Elapsed {s.ratio.split(' / ')[0]}
        </div>
        <p className="mt-0.5 text-[12px] opacity-90">{note}</p>
      </div>
      <div className="w-full sm:w-64">
        <div className="text-[11px] sm:text-right">
          {Math.round(s.pct * 100)}% of SLA consumed · {s.closed ? s.line : dueTxt}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
          <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, s.pct * 100)}%` }} />
        </div>
      </div>
    </section>
  )
}

/* ---------------------------- dependencies ---------------------------- */

function Dependencies({ t, all }: { t: Task; all: Task[] }) {
  const parent = t.parentId ? all.find((x) => x.id === t.parentId) : undefined
  const subs = subtasksOf(t, all)
  const blocks = blocksOf(t, all)
  const blockedByOthers = t.blockedBy.map((id) => all.find((x) => x.id === id)).filter((x): x is Task => !!x && !subs.includes(x))
  const statusLabel = (x: Task) => (x.status === 'Closed' ? 'Completed' : x.status === 'Waiting/Blocked' ? 'Blocked' : x.status)
  const Row = ({ x, note }: { x: Task; note?: string }) => (
    <div className="grid grid-cols-[96px_1fr_auto] items-center gap-3 border-b border-line-soft py-3 last:border-0">
      <Link to={`/tasks/my/${x.id}`} className="text-[13px] font-medium text-primary hover:underline">
        {x.id}
      </Link>
      <div className="min-w-0">
        <div className="truncate text-[13px] text-ink">
          {x.depLabel ?? x.title}
          {note && ` · ${note}`}
        </div>
        <div className="text-[11px] text-muted">{x.assignee || 'Unassigned'}</div>
      </div>
      <StatusBadge s={x.status} label={statusLabel(x)} />
    </div>
  )
  const deptOf = (ids: Task[]) => [...new Set(ids.map((b) => b.department))].join(' / ')
  return (
    <Panel title="Dependencies" sub="Parent task and connected sub-tasks">
      {parent && (
        <Link to={`/tasks/my/${parent.id}`} className="mb-2 flex items-center gap-3 rounded-lg bg-surface px-3 py-3 text-[13px] hover:bg-primary-soft/50">
          <GitBranch size={15} className="text-primary" />
          <span className="min-w-0 flex-1 truncate">
            Parent Task ID: {parent.id} · {parent.title}
          </span>
          <span className="text-[11px] font-semibold text-primary">{parent.status}</span>
        </Link>
      )}
      {subs.map((x) => (
        <Row key={x.id} x={x} note={t.blockedBy.includes(x.id) ? 'blocks this task' : undefined} />
      ))}
      {blockedByOthers.map((x) => (
        <Row key={x.id} x={x} note="blocks this task" />
      ))}
      {blocks.map((x) => (
        <Row key={x.id} x={x} note="blocked by this task" />
      ))}
      {!parent && !subs.length && !blocks.length && !blockedByOthers.length && <p className="text-[13px] text-muted">No parent, sub-tasks or dependent tasks.</p>}
      <p className="mt-3 text-[11px] text-muted">
        {blocks.length
          ? blocks.every((b) => b.status !== 'Waiting/Blocked')
            ? `${blocks.map((b) => b.id).join(', ')} no longer blocked by ${t.id}.`
            : `Closing ${t.id} unblocks ${deptOf(blocks)} task ${blocks.map((b) => b.id).join(', ')} automatically.`
          : 'No downstream tasks depend on this task.'}
      </p>
    </Panel>
  )
}

/* ---------------------------- evidence ---------------------------- */

function Evidence({ t, actor }: { t: Task; actor: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const take = (files: FileList | null) => {
    if (!files?.length) return
    const errs: string[] = []
    let ok = 0
    Array.from(files).forEach((f) => {
      const ext = (f.name.split('.').pop() ?? '').toLowerCase()
      if (!ACCEPT.includes(ext)) errs.push(`${f.name}: only PDF, DOCX, XLSX, JPG or PNG files are accepted.`)
      else if (f.size > MAX_MB * 1024 * 1024) errs.push(`${f.name}: larger than ${MAX_MB} MB.`)
      else {
        addEvidence(t.id, { name: f.name, size: f.size }, actor)
        ok++
      }
    })
    setErrors(errs)
    if (ok) toast(`${ok} file${ok > 1 ? 's' : ''} added to ${t.id} evidence.`)
  }
  const icon = (type: string) => (['JPG', 'JPEG', 'PNG', 'ZIP'].includes(type) ? <FileImage size={16} /> : type === 'XLSX' ? <FileSpreadsheet size={16} /> : <FileText size={16} />)
  const reviewed = t.evidence.length > 0 && t.evidence.every((e) => e.verified)
  return (
    <Panel title="Evidence Management" sub={`${t.evidence.length} file${t.evidence.length === 1 ? '' : 's'} · Documents, reports and photos`}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          take(e.dataTransfer.files)
        }}
        className={cn('flex flex-col items-center rounded-lg border border-dashed px-4 py-6 text-center', drag ? 'border-primary bg-primary-soft/50' : 'border-line bg-surface/60')}
      >
        <UploadCloud size={22} className="text-primary" />
        <div className="mt-2 text-[13px] font-semibold text-ink">Drag files here or browse to upload</div>
        <div className="mt-1 text-[11px] text-muted">PDF, DOCX, XLSX, JPG, PNG · Up to 20 MB per file</div>
        <Button variant="secondary" size="sm" className="mt-3" icon={<Plus size={14} />} onClick={() => ref.current?.click()}>
          Browse files
        </Button>
        <input
          ref={ref}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            take(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {errors.map((e) => (
        <p key={e} className="mt-2 flex items-center gap-1 text-[11px] text-brand-red">
          <XCircle size={12} /> {e}
        </p>
      ))}
      <div className="mt-3">
        {t.evidence.map((e) => (
          <div key={e.id} className="flex items-center gap-3 border-b border-line-soft py-3 last:border-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">{icon(e.type)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{e.name}</div>
              <div className="text-[11px] text-muted">
                {e.label ?? 'Document'} · {fmtSize(e.size)} · {e.by} · {fmtShort(e.at).replace(' · ', ', ')} IST
              </div>
            </div>
            <button
              onClick={() => toggleVerify(t.id, e.id, actor === CURRENT_EMPLOYEE ? 'Priya Menon' : actor)}
              title={e.verified ? 'Click to mark as unverified' : 'Mark as verified (reviewer)'}
              className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', e.verified ? 'bg-emerald-50 text-emerald-700' : 'border border-line text-muted hover:border-primary hover:text-primary')}
            >
              {e.verified ? 'Verified' : 'Verify'}
            </button>
            <button aria-label={`Download ${e.name}`} onClick={() => toast(`${e.name} is a demo record — no file content is stored in this preview.`, 'info')} className="text-muted hover:text-primary">
              <Download size={15} />
            </button>
          </div>
        ))}
      </div>
      {t.evidence.length > 0 && <p className="mt-2 text-[11px] text-muted">{reviewed ? 'Reviewed by Priya Menon · All files retained in the audit record.' : 'Awaiting reviewer verification · All files retained in the audit record.'}</p>}
    </Panel>
  )
}

/* ---------------------------- comments ---------------------------- */

function renderMentions(text: string) {
  const names = PEOPLE.map((p) => p.name).sort((a, b) => b.length - a.length)
  const re = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'g')
  return text.split(re).map((part, i) =>
    part.startsWith('@') && names.includes(part.slice(1)) ? (
      <span key={i} className="rounded bg-primary-soft px-1 font-medium text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function Comments({ t, actor, inputRef }: { t: Task; actor: string; inputRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const [text, setText] = useState('')
  const [q, setQ] = useState<string | null>(null)
  const latest = t.comments[t.comments.length - 1]
  const onChange = (v: string) => {
    setText(v)
    const m = /@([A-Za-z]*)$/.exec(v)
    setQ(m ? m[1].toLowerCase() : null)
  }
  const pick = (name: string) => {
    setText((v) => v.replace(/@([A-Za-z]*)$/, `@${name} `))
    setQ(null)
    inputRef.current?.focus()
  }
  const post = () => {
    const v = text.trim()
    if (!v) {
      toast('Write a comment first.', 'info')
      return
    }
    addComment(t.id, actor, v)
    const men = mentionsIn(v)
    toast(men.length ? `Comment posted · ${men.join(', ')} notified.` : 'Comment posted.')
    setText('')
  }
  const sugg = q != null ? PEOPLE.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6) : []
  return (
    <Panel title="Comments" sub={latest ? `Latest update · ${fmtIst(latest.at)}` : 'No comments yet'}>
      <div className="space-y-4">
        {t.comments.map((c) => (
          <div key={c.id}>
            <div className="flex flex-wrap justify-between gap-2 text-[12px]">
              <span className="font-semibold text-ink">
                {c.by} · {c.role}
              </span>
              <span className="text-muted">{fmtShort(c.at)}</span>
            </div>
            <p className="mt-1 text-[13px] text-ink">{renderMentions(c.text)}</p>
          </div>
        ))}
      </div>
      <div className="relative mt-4 rounded-lg border border-line p-2 focus-within:border-primary">
        <textarea
          ref={inputRef}
          rows={2}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) post()
            if (e.key === 'Escape') setQ(null)
          }}
          placeholder="Add a comment or @mention a colleague..."
          className="w-full resize-none bg-transparent px-1 text-[13px] outline-none placeholder:text-muted"
        />
        <div className="flex items-center justify-between">
          <button onClick={() => onChange(text + (text.endsWith(' ') || !text ? '@' : ' @'))} className="flex items-center gap-1 text-[12px] text-muted hover:text-primary">
            <AtSign size={13} /> Mention
          </button>
          <Button variant="secondary" size="sm" onClick={post}>
            Post comment
          </Button>
        </div>
        {sugg.length > 0 && (
          <div className="absolute bottom-full left-2 z-20 mb-1 w-64 rounded-lg border border-line bg-white p-1 shadow-lg">
            {sugg.map((p) => (
              <button key={p.name} onClick={() => pick(p.name)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-surface">
                <Avatar name={p.name} initials={p.initials} size={22} />
                <span className="font-medium">{p.name}</span>
                <span className="ml-auto text-muted">{p.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

/* ---------------------------- risk + audit ---------------------------- */

function RiskCard({ t }: { t: Task }) {
  const r = riskOf(t)
  const band = t.status === 'Closed' ? 'Closed' : riskBand(r)
  const color = t.status === 'Closed' ? '#059669' : r >= 70 ? '#dc2626' : r >= 40 ? '#d97706' : '#059669'
  const R = 40
  const C = 2 * Math.PI * R
  const s = slaOf(t)
  const drivers =
    t.riskDrivers ??
    (t.status === 'Closed'
      ? 'Task closed — no breach risk remains.'
      : `${Math.round(s.pct * 100)}% of SLA consumed · ${t.priority} priority${t.status === 'Waiting/Blocked' ? ' · waiting on a dependency' : t.status === 'Pending Approval' ? ' · approval pending' : ''}.`)
  const action = t.riskAction ?? (t.status === 'Closed' ? '' : r >= 70 ? `Recommended: escalate to ${t.owner}.` : r >= 40 ? 'Recommended: confirm the next step with the reviewer today.' : 'No action needed.')
  return (
    <Panel title="AI Risk Score" sub="SLA breach likelihood · Updated 09:14 IST">
      <div className="flex flex-wrap items-center gap-5">
        <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label={`AI risk ${r}%`}>
          <circle cx="52" cy="52" r={R} fill="none" stroke="#e8edf5" strokeWidth="9" />
          <circle cx="52" cy="52" r={R} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(C * r) / 100} ${C}`} transform="rotate(-90 52 52)" />
          <text x="52" y="59" textAnchor="middle" fontSize="22" fontWeight="600" fill={color}>
            {r}%
          </text>
        </svg>
        <div className="min-w-0 flex-1">
          <span className="rounded px-2 py-0.5 text-[11px] font-semibold" style={{ background: color + '14', color }}>
            {band}
          </span>
          <p className="mt-2 text-[12px] text-ink-2">{drivers}</p>
          {action && <p className="mt-1.5 text-[12px] font-semibold text-primary">{action}</p>}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted">Decision support only · Based on workload and historical delay.</p>
    </Panel>
  )
}

const AUDIT_ICON: Record<AuditKind, ReactNode> = {
  create: <Plus size={13} />,
  assign: <UserPlus size={13} />,
  reassign: <Users size={13} />,
  evidence: <Paperclip size={13} />,
  verify: <ShieldCheck size={13} />,
  submit: <Send size={13} />,
  approve: <ShieldCheck size={13} />,
  return: <RotateCcw size={13} />,
  close: <CheckCircle2 size={13} />,
  comment: <MessageSquare size={13} />,
  ai: <TriangleAlert size={13} />,
  reminder: <Bell size={13} />,
  unblock: <GitBranch size={13} />,
  start: <Play size={13} />,
}

function AuditTrail({ t }: { t: Task }) {
  const items = [...t.audit].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  return (
    <Panel title="Audit Trail" sub="Complete chronological history · All times IST">
      <ol className="space-y-4">
        {items.map((a) => (
          <li key={a.id} className="flex gap-3">
            <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', a.kind === 'ai' ? 'bg-red-50 text-red-600' : a.kind === 'close' || a.kind === 'approve' ? 'bg-emerald-50 text-emerald-700' : 'bg-primary-soft text-primary')}>
              {AUDIT_ICON[a.kind]}
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-muted">{fmtShort(a.at)}</div>
              <div className="text-[13px] font-semibold text-ink">{a.title}</div>
              <p className="mt-0.5 text-[12px] text-ink-2">{a.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/* ---------------------------- modals ---------------------------- */

function ReassignModal({ t, actor, onClose }: { t: Task; actor: string; onClose: () => void }) {
  const [to, setTo] = useState(t.assignee)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const save = () => {
    if (to === t.assignee) return setErr('Choose a different assignee.')
    if (!reason.trim()) return setErr('Give a reason — it is recorded in the audit trail.')
    reassign(t.id, to, actor, reason.trim())
    toast(`${t.id} reassigned to ${to || 'Unassigned'}. SLA unchanged.`)
    onClose()
  }
  return (
    <Modal
      title={`Reassign ${t.id}`}
      sub="The original SLA is retained; the clock does not restart."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Reassign</Button>
        </>
      }
    >
      <label className="block text-[12px] font-semibold">
        New assignee
        <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] font-normal">
          <option value="">Unassigned</option>
          {PEOPLE.filter((p) => p.name !== 'Ananya Sharma').map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} · {p.role} · {p.dept}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-[12px] font-semibold">
        Reason *
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Leave request, workload rebalance" className="mt-1.5 w-full rounded-md border border-line px-2 py-1.5 text-[13px] font-normal outline-none focus:border-primary" />
      </label>
      {err && <p className="mt-2 text-[12px] text-brand-red">{err}</p>}
    </Modal>
  )
}

function ReminderModal({ t, actor, onClose }: { t: Task; actor: string; onClose: () => void }) {
  const opts = [
    ...(t.status === 'Pending Approval' ? [[t.approver, 'Approver']] : []),
    [t.assignee, 'Current Assignee'],
    [t.reviewer, 'Reviewer'],
    [t.owner, 'Accountable Owner'],
  ].filter(([n]) => n && n !== actor) as [string, string][]
  const s = slaOf(t)
  const [to, setTo] = useState(opts[0]?.[0] ?? '')
  const [msg, setMsg] = useState(`Reminder: ${t.id} ${t.title} — ${s.line}. ${t.status === 'Pending Approval' ? 'Please review and approve.' : 'Please update the task.'}`)
  const send = () => {
    if (!to) return
    log(t.id, 'reminder', `Reminder sent to ${to}`, `${actor}: “${msg}”`)
    toast(`Reminder sent to ${to}.`)
    onClose()
  }
  return (
    <Modal
      title="Send reminder"
      sub={`${t.id} · ${s.line}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<Bell size={14} />} onClick={send} disabled={!to}>
            Send reminder
          </Button>
        </>
      }
    >
      <label className="block text-[12px] font-semibold">
        Recipient
        <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] font-normal">
          {opts.map(([n, r]) => (
            <option key={r + n} value={n}>
              {n} · {r}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-[12px] font-semibold">
        Message
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="mt-1.5 w-full rounded-md border border-line px-2 py-1.5 text-[13px] font-normal outline-none focus:border-primary" />
      </label>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
        <Sparkles size={11} /> Reminders are logged in the audit trail. The SLA is not paused.
      </p>
    </Modal>
  )
}

function ReturnModal({ t, onClose, onSubmit }: { t: Task; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <Modal
      title={`Return ${t.id} for rework`}
      sub={`As approver ${t.approver}. The task goes back to In Progress; the SLA keeps running.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!note.trim()} onClick={() => onSubmit(note.trim())}>
            Return task
          </Button>
        </>
      }
    >
      <label className="block text-[12px] font-semibold">
        What needs to change? *
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="mt-1.5 w-full rounded-md border border-line px-2 py-1.5 text-[13px] font-normal outline-none focus:border-primary" />
      </label>
    </Modal>
  )
}
