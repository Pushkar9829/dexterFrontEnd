import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  CATEGORIES,
  COMPONENTS,
  CURRENT_USER,
  ENGINEERS,
  OWNERS,
  PRIORITIES,
  SLA_HOURS,
  SUB_STATUSES,
  atmById,
  escalationChain,
  fmtDT,
  ist,
  istDay,
  nextTaskId,
  nextVisitId,
  nowMs,
  updateComplaint,
  type Complaint,
  type Outcome,
  type Priority,
} from '@/data/complaints'
import { recStore } from '@/data/complaintsAi'

const recTaskIds = () => recStore.get().flatMap((r) => (r.taskId ? [r.taskId] : []))
const nowIso = () => new Date(nowMs()).toISOString()
const timeOk = (t: string) => /^\d{2}:\d{2}$/.test(t)

type P = { c: Complaint; onClose: () => void }

function Foot({ onClose, onSave, label = 'Save', disabled }: { onClose: () => void; onSave: () => void; label?: string; disabled?: boolean }) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onSave} disabled={disabled}>
        {label}
      </Button>
    </>
  )
}

export function AssignOwnerModal({ c, onClose }: P) {
  const [owner, setOwner] = useState(c.owner)
  const [note, setNote] = useState('')
  const save = () => {
    if (owner === c.owner) return onClose()
    updateComplaint(c.id, () => ({ owner, lastAction: `Owner changed to ${owner}` }), { title: 'Owner reassigned', meta: `${CURRENT_USER} · ${c.owner} → ${owner}${note ? ` · ${note}` : ''}` })
    toast(`${c.id} assigned to ${owner}`)
    onClose()
  }
  return (
    <Modal title="Assign owner" sub={`${c.id} · accountable owner for resolution`} onClose={onClose} footer={<Foot onClose={onClose} onSave={save} label="Assign owner" />}>
      <div className="grid gap-4">
        <SelectField label="Owner" required options={OWNERS} value={owner} onChange={(e) => setOwner(e.target.value || c.owner)} hint={`Current owner: ${c.owner}`} />
        <TextAreaField label="Handover note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for the new owner" />
      </div>
    </Modal>
  )
}

const ACTION_TYPES = ['Note', 'Call with FR', 'Vendor follow-up', 'Engineer update', 'Reminder sent']

export function AddActionModal({ c, onClose }: P) {
  const [type, setType] = useState(ACTION_TYPES[0])
  const [remark, setRemark] = useState('')
  const [withTask, setWithTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskOwner, setTaskOwner] = useState(c.owner)
  const [date, setDate] = useState(istDay(nowMs()))
  const [time, setTime] = useState('17:00')
  const [tried, setTried] = useState(false)
  const okTask = !withTask || (taskTitle.trim() && date && timeOk(time))
  const save = () => {
    setTried(true)
    if (!remark.trim() || !okTask) return
    const taskId = withTask ? nextTaskId(recTaskIds()) : null
    const at = nowIso()
    updateComplaint(
      c.id,
      (x) => ({
        lastAction: remark.trim(),
        remark: remark.trim(),
        tasks: taskId ? [...x.tasks, { id: taskId, title: taskTitle.trim(), owner: taskOwner, due: ist(date, time), dependency: type === 'Vendor follow-up' ? 'Vendor' : x.department }] : x.tasks,
        lastReminder: type === 'Reminder sent' ? { at, task: taskId ?? x.lastReminder?.task ?? '' } : x.lastReminder,
        reminderDate: type === 'Reminder sent' ? istDay(at) : x.reminderDate,
      }),
      { title: type, meta: `${CURRENT_USER} · ${remark.trim()}${taskId ? ` · ${taskId} linked` : ''}` },
    )
    toast(taskId ? `Action logged · ${taskId} created` : 'Action logged')
    onClose()
  }
  return (
    <Modal title="Add action" sub={`${c.id} · updates Last Action Status and the audit trail`} onClose={onClose} width={560} footer={<Foot onClose={onClose} onSave={save} label="Add action" />}>
      <div className="grid gap-4">
        <SelectField label="Action type" required options={ACTION_TYPES} value={type} onChange={(e) => setType(e.target.value || ACTION_TYPES[0])} />
        <TextAreaField label="Remark" required value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="What was done or agreed" error={tried && !remark.trim() ? 'Enter a remark' : undefined} />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={withTask} onChange={(e) => setWithTask(e.target.checked)} /> Create linked follow-up task
        </label>
        {withTask && (
          <div className="grid gap-4 rounded-lg bg-surface p-3 sm:grid-cols-2">
            <TextField className="sm:col-span-2" label="Task" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} error={tried && !taskTitle.trim() ? 'Enter the task' : undefined} />
            <SelectField label="Owner" required options={[...new Set([...OWNERS, atmById(c.atmId)?.engineer ?? ''])].filter(Boolean)} value={taskOwner} onChange={(e) => setTaskOwner(e.target.value || c.owner)} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Due date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} error={tried && !date ? 'Required' : undefined} />
              <TextField label="Time" required type="time" value={time} onChange={(e) => setTime(e.target.value)} error={tried && !timeOk(time) ? 'Required' : undefined} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

const ISSUE_OPTIONS = Object.entries(CATEGORIES).flatMap(([cat, subs]) => subs.map((s) => `${cat} / ${s}`))

export function EditDetailsModal({ c, onClose }: P) {
  const [issue, setIssue] = useState(`${c.category} / ${c.subcategory}`)
  const [component, setComponent] = useState(c.component)
  const [priority, setPriority] = useState<Priority>(c.priority)
  const [title, setTitle] = useState(c.title)
  const [details, setDetails] = useState(c.details)
  const [lastAction, setLastAction] = useState(c.lastAction)
  const [tried, setTried] = useState(false)
  const save = () => {
    setTried(true)
    if (!title.trim() || details.trim().length < 15 || !issue || !component) return
    const [category, subcategory] = issue.split(' / ')
    const changes: string[] = []
    if (priority !== c.priority) changes.push(`Priority ${c.priority} → ${priority} · SLA ${SLA_HOURS[c.priority]}h → ${SLA_HOURS[priority]}h`)
    if (issue !== `${c.category} / ${c.subcategory}`) changes.push(`Category → ${issue}`)
    if (component !== c.component) changes.push(`Component → ${component}`)
    if (title.trim() !== c.title || details.trim() !== c.details) changes.push('Title / details updated')
    if (lastAction.trim() !== c.lastAction) changes.push(`Last action → ${lastAction.trim()}`)
    if (!changes.length) return onClose()
    updateComplaint(c.id, () => ({ category, subcategory, component, priority, title: title.trim(), details: details.trim(), lastAction: lastAction.trim() }), { title: 'Issue details edited', meta: `${CURRENT_USER} · ${changes.join(' · ')}` })
    toast('Issue details updated')
    onClose()
  }
  return (
    <Modal title="Edit issue details" sub={`${c.id} · changes are recorded in the audit trail`} onClose={onClose} width={620} footer={<Foot onClose={onClose} onSave={save} label="Save details" />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Issue category" required options={ISSUE_OPTIONS} value={issue} onChange={(e) => setIssue(e.target.value)} error={tried && !issue ? 'Select a category' : undefined} />
        <SelectField label="Component" required options={COMPONENTS} value={component} onChange={(e) => setComponent(e.target.value)} error={tried && !component ? 'Select a component' : undefined} />
        <SelectField label="Priority" required options={PRIORITIES} value={priority} onChange={(e) => e.target.value && setPriority(e.target.value as Priority)} hint={`Resolution SLA ${SLA_HOURS[priority]} hours`} />
        <TextField label="Last Action Status" value={lastAction} onChange={(e) => setLastAction(e.target.value)} />
        <TextField className="sm:col-span-2" label="Issue title" required value={title} onChange={(e) => setTitle(e.target.value)} error={tried && !title.trim() ? 'Enter a title' : undefined} />
        <TextAreaField className="sm:col-span-2" label="Issue details" required rows={4} value={details} onChange={(e) => setDetails(e.target.value)} error={tried && details.trim().length < 15 ? 'At least 15 characters' : undefined} />
      </div>
    </Modal>
  )
}

export function ScheduleVisitModal({ c, onClose }: P) {
  const atm = atmById(c.atmId)
  const [date, setDate] = useState(istDay(nowMs() + 86_400_000))
  const [time, setTime] = useState('11:00')
  const [engineer, setEngineer] = useState(atm ? `${atm.engineer} · ${atm.engineerPhone}` : ENGINEERS[0])
  const [purpose, setPurpose] = useState('')
  const [tried, setTried] = useState(false)
  const past = date && timeOk(time) && Date.parse(ist(date, time)) < nowMs()
  const save = () => {
    setTried(true)
    if (!date || !timeOk(time) || !purpose.trim() || past) return
    const id = nextVisitId()
    const name = engineer.split(' · ')[0]
    updateComplaint(
      c.id,
      (x) => ({ visits: [{ id, at: ist(date, time), purpose: purpose.trim(), engineer: name, status: 'Scheduled', note: `${atm?.siteId ?? ''} · Awaiting engineer confirmation` }, ...x.visits], lastAction: `Field visit ${id} scheduled` }),
      { title: 'Field visit scheduled', meta: `${CURRENT_USER} · ${id} · ${fmtDT(ist(date, time))} · ${name}` },
    )
    toast(`${id} scheduled with ${name}`)
    onClose()
  }
  return (
    <Modal title="Schedule visit" sub={`${c.id} · ${atm?.siteId} · ${atm?.siteName}`} onClose={onClose} footer={<Foot onClose={onClose} onSave={save} label="Schedule visit" />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Visit date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} error={tried && (!date ? 'Required' : past ? 'Choose a future time' : undefined) || undefined} />
        <TextField label="Time" required type="time" value={time} onChange={(e) => setTime(e.target.value)} error={tried && !timeOk(time) ? 'Required' : undefined} />
        <SelectField className="sm:col-span-2" label="Engineer" required options={ENGINEERS} value={engineer} onChange={(e) => setEngineer(e.target.value || engineer)} hint="Default engineer from the ATM mapping" />
        <TextField className="sm:col-span-2" label="Purpose" required value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Battery replacement & UPS test" error={tried && !purpose.trim() ? 'Enter the visit purpose' : undefined} />
      </div>
    </Modal>
  )
}

export function ComposeEmailModal({ c, onClose }: P) {
  const atm = atmById(c.atmId)
  const [to, setTo] = useState(atm ? `${atm.email}; hdteam@dexterindia.in` : '')
  const [subject, setSubject] = useState(`Re: ${c.docket !== 'NA' ? c.docket : c.id} · ${c.title}`)
  const [body, setBody] = useState('')
  const [tried, setTried] = useState(false)
  const save = () => {
    setTried(true)
    if (!to.trim() || !subject.trim() || !body.trim()) return
    const at = nowIso()
    updateComplaint(
      c.id,
      (x) => ({ emails: [{ id: `EM-${c.id.slice(4)}-${x.emails.length + 1}`, subject: subject.trim(), status: 'Sent', route: `${CURRENT_USER.split(' ')[0]} → ${to.split(';')[0].trim()}`, at, meta: 'Linked to complaint' }, ...x.emails], lastAction: `Email sent · ${subject.trim()}` }),
      { title: 'Email sent', meta: `${CURRENT_USER} · ${subject.trim()}` },
    )
    toast('Email logged on the complaint (demo · not delivered)', 'info')
    onClose()
  }
  return (
    <Modal title="Compose email" sub={`${c.id} · sent from the HD Team account and linked to this complaint`} onClose={onClose} width={620} footer={<Foot onClose={onClose} onSave={save} label="Send email" />}>
      <div className="grid gap-4">
        <TextField label="To" required value={to} onChange={(e) => setTo(e.target.value)} error={tried && !to.trim() ? 'Enter a recipient' : undefined} />
        <TextField label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} error={tried && !subject.trim() ? 'Enter a subject' : undefined} />
        <TextAreaField label="Message" required rows={6} value={body} onChange={(e) => setBody(e.target.value)} error={tried && !body.trim() ? 'Write a message' : undefined} />
      </div>
    </Modal>
  )
}

export function EscalateModal({ c, onClose }: P) {
  const chain = escalationChain(c.department, atmById(c.atmId))
  const next = chain[c.escalationLevel] // level is 1-based → next index
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const save = () => {
    setTried(true)
    if (!next || !reason.trim()) return
    const at = nowIso()
    const lvl = (c.escalationLevel + 1) as 2 | 3
    updateComplaint(
      c.id,
      (x) => ({ escalationLevel: lvl, escalations: [...x.escalations, { level: lvl, at, note: `Manual · ${reason.trim()}` }], lastAction: `Escalated to L${lvl} · ${next.person}` }),
      { title: `Escalated to L${lvl}`, meta: `${CURRENT_USER} · ${next.role} (${next.person}) notified · ${reason.trim()}` },
    )
    toast(`${c.id} escalated to L${lvl} · ${next.person}`)
    onClose()
  }
  return (
    <Modal title="Escalate now" sub={`${c.id} · ${c.department} escalation matrix`} onClose={onClose} footer={<Foot onClose={onClose} onSave={save} label={next ? `Escalate to L${c.escalationLevel + 1}` : 'Escalate'} disabled={!next} />}>
      <ol className="mb-4 grid gap-2">
        {chain.map((l) => (
          <li key={l.level} className={cn('flex items-center justify-between rounded-lg border px-3 py-2 text-[13px]', l.level === c.escalationLevel ? 'border-primary bg-primary-soft' : l.level === c.escalationLevel + 1 ? 'border-amber-300 bg-amber-50' : 'border-line')}>
            <span>
              L{l.level} · {l.role} · {l.person}
            </span>
            <span className="text-[11px] text-muted">{l.level === c.escalationLevel ? 'Current' : l.level === c.escalationLevel + 1 ? 'Next' : l.level < c.escalationLevel ? 'Passed' : ''}</span>
          </li>
        ))}
      </ol>
      {next ? (
        <TextAreaField label="Reason for escalation" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Vendor dispatch not confirmed after two follow-ups" error={tried && !reason.trim() ? 'Enter a reason' : undefined} />
      ) : (
        <p className="text-[13px] text-muted">The complaint is already at the highest level (L3 · Operations Head).</p>
      )}
    </Modal>
  )
}

const OUTCOMES: Outcome[] = ['Pending', 'Resolved', 'Partially resolved', 'Not resolved']

export function ResolutionModal({ c, onClose }: P) {
  const [proposedFix, setFix] = useState(c.proposedFix)
  const [redressalDate, setRedressal] = useState(c.redressalDate ?? '')
  const [outcome, setOutcome] = useState<Outcome>(c.outcome)
  const [outcomeDate, setOutcomeDate] = useState(c.outcomeDate ?? '')
  const [outcomeRemark, setRemark] = useState(c.outcomeRemark)
  const [subStatus, setSub] = useState(c.status === 'Open' ? c.subStatus : 'In progress')
  const [evidence, setEvidence] = useState(c.evidence)
  const [fr, setFr] = useState(c.frSignOff)
  const [hd, setHd] = useState(c.hdValidation)
  const closed = c.status === 'Closed'

  const blockers = [
    outcome !== 'Resolved' && 'Outcome must be Resolved',
    !redressalDate && 'Date of redressal not recorded',
    !fr && 'FR sign-off not ticked',
    !hd && 'HD Team validation not ticked',
  ].filter(Boolean) as string[]

  const fields = () => ({ proposedFix: proposedFix.trim(), redressalDate: redressalDate || undefined, outcome, outcomeDate: outcomeDate || undefined, outcomeRemark: outcomeRemark.trim(), evidence, frSignOff: fr, hdValidation: hd })
  const save = () => {
    updateComplaint(c.id, () => ({ ...fields(), subStatus: closed ? c.subStatus : subStatus }), {
      title: 'Resolution updated',
      meta: `${CURRENT_USER} · Outcome ${outcome}${fr ? ' · FR sign-off' : ''}${hd ? ' · HD validation' : ''}`,
    })
    toast('Resolution updated')
    onClose()
  }
  const close = () => {
    if (blockers.length) return
    const at = nowIso()
    updateComplaint(c.id, () => ({ ...fields(), status: 'Closed', subStatus: 'Resolved', closedAt: at, outcomeDate: outcomeDate || istDay(at), lastAction: 'Complaint closed after FR confirmation' }), {
      title: 'Complaint closed',
      meta: `${CURRENT_USER} · ${outcomeRemark.trim() || 'Resolved'} · FR sign-off & HD Team validation recorded`,
    })
    toast(`${c.id} closed`)
    onClose()
  }
  const reopen = () => {
    updateComplaint(c.id, () => ({ status: 'Open', subStatus: 'In progress', closedAt: undefined, outcome: 'Pending', frSignOff: false, hdValidation: false }), { title: 'Complaint reopened', meta: `${CURRENT_USER} · Resolution not holding` })
    toast(`${c.id} reopened`, 'info')
    onClose()
  }

  return (
    <Modal
      title="Update resolution"
      sub={`${c.id} · closure needs outcome, FR sign-off and HD Team validation`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {closed ? (
            <Button variant="danger" onClick={reopen}>
              Reopen complaint
            </Button>
          ) : (
            <Button variant="secondary" onClick={close} disabled={blockers.length > 0} title={blockers.join(' · ')}>
              Close complaint
            </Button>
          )}
          <Button onClick={save}>Save resolution</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Proposed fix" value={proposedFix} onChange={(e) => setFix(e.target.value)} />
        <TextField label="Date of redressal" type="date" max={istDay(nowMs())} value={redressalDate} onChange={(e) => setRedressal(e.target.value)} />
        <SelectField label="Outcome" options={OUTCOMES} value={outcome} onChange={(e) => setOutcome((e.target.value || 'Pending') as Outcome)} />
        <TextField label="Outcome date" type="date" value={outcomeDate} onChange={(e) => setOutcomeDate(e.target.value)} />
        {!closed && <SelectField label="Closure status" options={SUB_STATUSES} value={subStatus} onChange={(e) => setSub(e.target.value || subStatus)} hint="Open · sub-status" />}
        <TextAreaField className="sm:col-span-2" label="Outcome remark" value={outcomeRemark} onChange={(e) => setRemark(e.target.value)} placeholder="Resolution, tests completed and complainant confirmation" />
        <div className="grid gap-2 sm:col-span-2">
          {[
            ['Restoration evidence recorded', evidence, setEvidence],
            ['FR sign-off received', fr, setFr],
            ['HD Team validation complete', hd, setHd],
          ].map(([label, v, fn]) => (
            <label key={label as string} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={v as boolean} onChange={(e) => (fn as (b: boolean) => void)(e.target.checked)} /> {label as string}
            </label>
          ))}
        </div>
        {!closed && (
          <div className={cn('rounded-lg px-3 py-2 text-[12px] sm:col-span-2', blockers.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
            {blockers.length ? `Closure blocked: ${blockers.join(' · ')}` : 'All closure checks passed. The complaint can be closed.'}
          </div>
        )}
      </div>
    </Modal>
  )
}
