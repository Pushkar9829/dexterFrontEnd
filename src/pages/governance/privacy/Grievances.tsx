// Data Privacy & Grievance Management (DPDP complaint parameters 1–18).
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, FileText, MessageSquareWarning, Plus } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { SelectField, TextAreaField, TextField, fmtSize } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { maskEmail, maskMobile } from '@/lib/mask'
import {
  DEPARTMENTS,
  GRIEVANCE_CATEGORIES,
  OPEN_STATES,
  addDays,
  escalateOverdue,
  isOverdue,
  logPrivacy,
  patchItem,
  usePrivacy,
  type CommEntry,
  type Grievance,
  type GrievanceStatus,
  type Priority,
} from '@/data/privacy'
import { DataGrid, Note, PageShell, Section, Stat, Tabs, type Col } from '../security/kit'
import { actor, fmtDT, useNow } from '../security/util'
import { GrievanceForm } from './GrievanceForm'

const BASE = '/governance/privacy/grievances'
const statusTone = (s: GrievanceStatus): Tone => (s === 'Closed' ? 'gray' : s === 'Resolved' ? 'green' : s === 'Open' ? 'blue' : 'amber')
const prioTone = (p: Priority): Tone => (p === 'High' ? 'red' : p === 'Medium' ? 'amber' : 'blue')
const shell = { back: '/governance/privacy', backLabel: 'Back to DPDP Compliance', Icon: MessageSquareWarning, color: 'text-amber-600 bg-amber-50 border-amber-200' }

function dueText(g: Grievance, now: number) {
  if (g.draft) return 'Draft'
  if (!OPEN_STATES.includes(g.status)) return 'Done'
  const ms = new Date(g.dueAt).getTime() - now
  const d = Math.floor(Math.abs(ms) / 86_400_000)
  const h = Math.floor((Math.abs(ms) % 86_400_000) / 3_600_000)
  return ms < 0 ? `Overdue ${d}d ${h}h` : `${d}d ${h}h left`
}

/** Runs automatic escalation whenever the clock ticks. */
function useAutoEscalation(now: number) {
  useEffect(() => {
    const n = escalateOverdue(now)
    if (n) toast(`${n} overdue complaint(s) escalated to senior authority.`, 'info')
  }, [now])
}

export function GrievanceList() {
  const nav = useNavigate()
  const p = usePrivacy()
  const now = useNow(60_000)
  useAutoEscalation(now)
  const real = p.grievances.filter((g) => !g.draft)
  const cols: Col<Grievance>[] = [
    { key: 'id', label: 'Complaint ID', value: (g) => g.id, render: (g) => (<Link to={`${BASE}/${g.id}`} className="font-mono text-[11.5px] font-semibold text-[#0066FF] hover:underline">{g.id}</Link>) },
    { key: 'at', label: 'Registered', value: (g) => fmtDT(g.createdAt), className: 'whitespace-nowrap text-muted' },
    { key: 'who', label: 'Complainant', value: (g) => g.complainant.name, render: (g) => (<>{g.complainant.name}<span className="block text-[10.5px] text-muted">{g.source}</span></>) },
    { key: 'cat', label: 'Category', value: (g) => g.category || '—' },
    { key: 'subj', label: 'Subject', value: (g) => g.subject, className: 'max-w-[220px] text-muted' },
    { key: 'pri', label: 'Priority', value: (g) => g.priority, render: (g) => <Badge tone={prioTone(g.priority)}>{g.priority}</Badge> },
    { key: 'dept', label: 'Assigned to', value: (g) => `${g.department || 'Unassigned'}${g.officer ? ` · ${g.officer}` : ''}`, className: 'text-[11.5px]' },
    { key: 'st', label: 'Status', value: (g) => (g.draft ? 'Draft' : g.status), render: (g) => (g.draft ? <Badge tone="gray">Draft</Badge> : (<><Badge tone={statusTone(g.status)}>{g.status}</Badge>{g.escalated && <span className="mt-0.5 block text-[10.5px] font-medium text-rose-600">Escalated</span>}</>)) },
    { key: 'due', label: 'Timeline', value: (g) => dueText(g, now), render: (g) => <span className={`whitespace-nowrap text-[11.5px] ${isOverdue(g, now) ? 'font-semibold text-rose-600' : 'text-muted'}`}>{dueText(g, now)}</span> },
  ]
  return (
    <PageShell {...shell} title="Data Privacy Grievances" sub="Register, assign, resolve and close personal-data complaints with SLA tracking and escalation." actions={<Button icon={<Plus size={15} />} onClick={() => nav(`${BASE}/new`)}>Register complaint</Button>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={real.length} />
        <Stat label="Pending" value={real.filter((g) => OPEN_STATES.includes(g.status)).length} tone="blue" />
        <Stat label="Resolved / Closed" value={real.filter((g) => !OPEN_STATES.includes(g.status)).length} tone="green" />
        <Stat label="Overdue" value={real.filter((g) => isOverdue(g, now)).length} tone="red" />
        <Stat label="Escalated" value={real.filter((g) => g.escalated).length} tone="amber" />
      </div>
      <Note>
        Resolution timeline: High {p.settings.grievanceSlaDays.High}d · Medium {p.settings.grievanceSlaDays.Medium}d · Low {p.settings.grievanceSlaDays.Low}d. Overdue complaints are escalated automatically to <strong>{p.settings.escalationAuthority}</strong> (configure in DPDP Compliance).
      </Note>
      <DataGrid
        rows={p.grievances}
        cols={cols}
        rowKey={(g) => g.id}
        fileName="privacy-grievances"
        searchPlaceholder="Search complaint ID, complainant, subject…"
        filters={[
          { key: 'st', label: 'Statuses', get: (g) => (g.draft ? 'Draft' : g.status), options: ['Draft', ...['Open', 'Under Review', 'In Progress', 'Resolved', 'Closed']] },
          { key: 'cat', label: 'Categories', get: (g) => g.category, options: [...GRIEVANCE_CATEGORIES] },
          { key: 'pri', label: 'Priorities', get: (g) => g.priority, options: ['High', 'Medium', 'Low'] },
          { key: 'dept', label: 'Departments', get: (g) => g.department, options: [...DEPARTMENTS] },
          { key: 'esc', label: 'Escalation', get: (g) => (isOverdue(g, now) ? 'Overdue' : g.escalated ? 'Escalated' : 'On time'), options: ['On time', 'Overdue', 'Escalated'] },
        ]}
        date={(g) => g.createdAt}
        actions={(g) => <Button size="sm" variant="secondary" onClick={() => nav(`${BASE}/${g.id}`)}>{g.draft ? 'Continue' : 'Open'}</Button>}
      />
    </PageShell>
  )
}

export function GrievanceNew() {
  const nav = useNavigate()
  return (
    <PageShell {...shell} back={BASE} backLabel="Back to Grievances" title="Register Data Privacy Complaint" sub="A unique complaint number is generated and an acknowledgement is sent to the complainant on submit.">
      <GrievanceForm mode="admin" onBack={() => nav(BASE)} onDone={(g) => nav(g.draft ? BASE : `${BASE}/${g.id}`)} />
    </PageShell>
  )
}

type DTab = 'details' | 'actions' | 'comms' | 'history'

export function GrievanceDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const p = usePrivacy()
  const now = useNow(60_000)
  useAutoEscalation(now)
  const g = p.grievances.find((x) => x.id === id)
  const [tab, setTab] = useState<DTab>('details')

  if (!g)
    return (
      <PageShell {...shell} back={BASE} backLabel="Back to Grievances" title="Complaint not found">
        <Note tone="amber">No complaint with ID {id}.</Note>
      </PageShell>
    )

  if (g.draft)
    return (
      <PageShell {...shell} back={BASE} backLabel="Back to Grievances" title={`Draft ${g.id}`} sub="Complete the form and submit to register the complaint.">
        <GrievanceForm mode="admin" initial={g} onBack={() => nav(BASE)} onDone={(x) => nav(x.draft ? BASE : `${BASE}/${x.id}`)} />
      </PageShell>
    )

  const overdue = isOverdue(g, now)
  return (
    <PageShell {...shell} back={BASE} backLabel="Back to Grievances" title={g.id} sub={`${g.category} · ${g.subject}`}>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <Badge tone={statusTone(g.status)}>{g.status}</Badge>
        <Badge tone={prioTone(g.priority)}>{g.priority} priority</Badge>
        {g.escalated && <Badge tone="red">Escalated to {g.escalatedTo}</Badge>}
        {g.reopenCount > 0 && <Badge tone="purple">Reopened ×{g.reopenCount}</Badge>}
        <span className={overdue ? 'font-semibold text-rose-600' : 'text-muted'}>
          {overdue && <AlertTriangle size={13} className="mr-1 inline" />}
          Due {fmtDT(g.dueAt)} · {dueText(g, now)}
        </span>
      </div>
      <Tabs
        tabs={[
          { value: 'details', label: 'Details' },
          { value: 'actions', label: 'Workflow' },
          { value: 'comms', label: 'Communication', count: g.communications.length },
          { value: 'history', label: 'History', count: g.history.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'details' && <Details g={g} />}
      {tab === 'actions' && <Workflow key={`${g.status}-${g.reopenCount}`} g={g} />}
      {tab === 'comms' && <Comms g={g} />}
      {tab === 'history' && (
        <DataGrid
          rows={[...g.history].reverse()}
          rowKey={(h) => `${h.at}-${h.action}-${h.detail ?? ''}`}
          fileName={`${g.id}-history`}
          filters={[{ key: 'a', label: 'Actions', get: (h) => h.action }]}
          cols={[
            { key: 'at', label: 'Date & time', value: (h) => fmtDT(h.at), className: 'whitespace-nowrap text-muted' },
            { key: 'actor', label: 'By', value: (h) => h.actor },
            { key: 'a', label: 'Action', value: (h) => h.action, className: 'font-medium text-ink' },
            { key: 'd', label: 'Detail', value: (h) => h.detail ?? '', className: 'text-muted' },
          ]}
        />
      )}
    </PageShell>
  )
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{k}</div>
      <div className="text-[12.5px] font-medium text-ink">{v || '—'}</div>
    </div>
  )
}

function Details({ g }: { g: Grievance }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Complainant">
        <div className="grid grid-cols-2 gap-3">
          <KV k="Name" v={g.complainant.name} />
          <KV k="Reference" v={g.complainant.ref} />
          <KV k="Mobile" v={maskMobile(g.complainant.mobile)} />
          <KV k="Email" v={maskEmail(g.complainant.email)} />
          <KV k="Identity verification" v={g.verification.verified ? `Verified — ${g.verification.method}` : 'Not verified'} />
          <KV k="Registered via" v={`${g.source}, ${fmtDT(g.createdAt)}`} />
          <KV k="Acknowledged" v={g.acknowledgedAt ? `${fmtDT(g.acknowledgedAt)} (complaint no. ${g.id})` : '—'} />
          <KV k="Assigned" v={`${g.department || 'Unassigned'}${g.officer ? ` → ${g.officer}` : ''}`} />
        </div>
      </Section>
      <Section title="Complaint">
        <p className="text-[12.5px] whitespace-pre-wrap text-ink">{g.description}</p>
        <div className="mt-3 space-y-1.5">
          {g.evidence.length === 0 && <p className="text-[12px] text-muted">No evidence attached.</p>}
          {g.evidence.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-[12px]">
              <FileText size={14} className="text-primary" /> {f.name} <span className="text-muted">({fmtSize(f.size)})</span>
            </div>
          ))}
        </div>
        {g.resolutionRemarks && (
          <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
            <strong>Resolution:</strong> {g.resolutionRemarks}
          </div>
        )}
        {g.closure && (
          <div className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-[12px] text-slate-700">
            <strong>Closed</strong> {fmtDT(g.closure.at)} by {g.closure.by}: {g.closure.details} {g.closure.userInformed && '(user informed)'}
          </div>
        )}
      </Section>
    </div>
  )
}

function Workflow({ g }: { g: Grievance }) {
  const p = usePrivacy()
  const [dept, setDept] = useState(g.department)
  const [officer, setOfficer] = useState(g.officer)
  const [prio, setPrio] = useState<Priority>(g.priority)
  const [next, setNext] = useState<'' | 'Under Review' | 'In Progress'>('')
  const [remarks, setRemarks] = useState(g.resolutionRemarks ?? '')
  const [closeDetails, setCloseDetails] = useState(g.resolutionRemarks ?? '')
  const [informed, setInformed] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const open = OPEN_STATES.includes(g.status)

  const write = (fn: (x: Grievance) => Grievance, action: string, detail?: string) => {
    const at = new Date().toISOString()
    const by = actor()
    patchItem('grievances', g.id, (x) => {
      const y = fn(x as Grievance)
      return { ...y, history: [...y.history, { at, actor: by, action, detail }] }
    })
    logPrivacy(by, `Grievance ${action.toLowerCase()}`, g.id, detail)
  }

  const saveAssignment = () => {
    if (!dept) return setErr({ dept: 'Select a department.' })
    if (!officer.trim()) return setErr({ officer: 'Enter the authorized officer.' })
    setErr({})
    const sla = p.settings.grievanceSlaDays[prio]
    write((x) => ({ ...x, department: dept, officer: officer.trim(), priority: prio, slaDays: sla, dueAt: addDays(x.createdAt, sla) }), 'Assigned', `${dept} → ${officer.trim()}, ${prio} priority (${sla}-day timeline)`)
    toast('Assignment saved.')
  }
  const changeStatus = () => {
    if (!next) return setErr({ next: 'Choose the new status.' })
    setErr({})
    write((x) => ({ ...x, status: next }), `Status → ${next}`)
    toast(`Status changed to ${next}.`)
  }
  const resolve = () => {
    if (remarks.trim().length < 10) return setErr({ remarks: 'Enter the resolution remarks (cause and action taken, min 10 characters).' })
    setErr({})
    const at = new Date().toISOString()
    write((x) => ({ ...x, status: 'Resolved', resolutionRemarks: remarks.trim(), communications: [...x.communications, { at, channel: 'Email', message: `Your complaint ${x.id} has been resolved: ${remarks.trim()}`, by: actor() }] }), 'Status → Resolved', remarks.trim())
    toast('Complaint resolved and the complainant informed.')
  }
  const close = () => {
    const e: Record<string, string> = {}
    if (closeDetails.trim().length < 10) e.close = 'Resolution details are mandatory before closing.'
    if (!informed) e.informed = 'Confirm the complainant has been informed.'
    setErr(e)
    if (Object.keys(e).length) return
    const at = new Date().toISOString()
    const by = actor()
    write(
      (x) => ({ ...x, status: 'Closed', resolutionRemarks: x.resolutionRemarks || closeDetails.trim(), closure: { details: closeDetails.trim(), at, by, userInformed: true }, communications: [...x.communications, { at, channel: 'Email', message: `Complaint ${x.id} closed. Resolution: ${closeDetails.trim()}. You may reopen it if you are not satisfied.`, by }] }),
      'Closed',
      closeDetails.trim(),
    )
    toast('Complaint closed.')
  }
  const reopen = () => {
    if (reopenReason.trim().length < 5) return setErr({ reopen: 'Give the reason the complainant is not satisfied.' })
    setErr({})
    const at = new Date().toISOString()
    write((x) => ({ ...x, status: 'Under Review', reopenCount: x.reopenCount + 1, escalated: false, escalatedAt: undefined, escalatedTo: undefined, closure: undefined, dueAt: addDays(at, x.slaDays) }), 'Reopened', reopenReason.trim())
    toast('Complaint reopened with a fresh resolution timeline.')
  }
  const escalate = () => {
    const at = new Date().toISOString()
    write((x) => ({ ...x, escalated: true, escalatedAt: at, escalatedTo: p.settings.escalationAuthority }), 'Escalated', `Manually → ${p.settings.escalationAuthority}`)
    toast(`Escalated to ${p.settings.escalationAuthority}.`)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Assignment & priority" sub="Parameters 8–9">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Department" required options={[...DEPARTMENTS]} value={dept} onChange={(e) => setDept(e.target.value)} error={err.dept} />
          <TextField label="Authorized officer" required value={officer} onChange={(e) => setOfficer(e.target.value)} error={err.officer} />
          <SelectField label="Priority" required options={['High', 'Medium', 'Low']} value={prio} onChange={(e) => setPrio(e.target.value as Priority)} hint={`${p.settings.grievanceSlaDays[prio]}-day resolution timeline`} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={saveAssignment} disabled={!open}>Save assignment</Button>
        </div>
      </Section>

      {open ? (
        <Section title="Status & resolution" sub="Parameters 10–13">
          <div className="flex flex-wrap items-end gap-2">
            <SelectField className="min-w-[180px] flex-1" label="Move to" options={(['Under Review', 'In Progress'] as const).filter((s) => s !== g.status)} value={next} onChange={(e) => setNext(e.target.value as typeof next)} error={err.next} />
            <Button size="sm" className="mb-px h-9" variant="secondary" onClick={changeStatus}>Update status</Button>
          </div>
          <TextAreaField className="mt-3" label="Resolution remarks" required value={remarks} onChange={(e) => setRemarks(e.target.value)} error={err.remarks} hint="Cause of the complaint and the action taken." />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {!g.escalated && <Button size="sm" variant="danger" onClick={escalate}>Escalate now</Button>}
            <Button size="sm" onClick={resolve}>Mark resolved</Button>
          </div>
        </Section>
      ) : g.status === 'Resolved' ? (
        <Section title="Closure confirmation" sub="Parameter 15 — resolution details are mandatory.">
          <TextAreaField label="Resolution details" required value={closeDetails} onChange={(e) => setCloseDetails(e.target.value)} error={err.close} />
          <div className="mt-3">
            <Checkbox checked={informed} onChange={setInformed} label={<span className="text-ink">The complainant has been informed of the final decision</span>} />
            {err.informed && <p className="mt-1 text-[11px] text-brand-red">{err.informed}</p>}
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={close}>Close complaint</Button>
          </div>
        </Section>
      ) : (
        <Section title="Closed" sub={g.closure ? `${fmtDT(g.closure.at)} by ${g.closure.by}` : undefined}>
          <p className="text-[12.5px] text-ink">{g.closure?.details}</p>
        </Section>
      )}

      {!open && (
        <Section title="Reopen complaint" sub="Parameter 16 — when the complainant is not satisfied.">
          <TextAreaField label="Reason for reopening" required value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} error={err.reopen} />
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="secondary" onClick={reopen}>Reopen</Button>
          </div>
        </Section>
      )}
    </div>
  )
}

function Comms({ g }: { g: Grievance }) {
  const [channel, setChannel] = useState<CommEntry['channel'] | ''>('')
  const [message, setMessage] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const send = () => {
    const e: Record<string, string> = {}
    if (!channel) e.channel = 'Choose a channel.'
    if (message.trim().length < 5) e.message = 'Write the update for the complainant.'
    setErr(e)
    if (Object.keys(e).length || !channel) return
    const at = new Date().toISOString()
    const by = actor()
    patchItem('grievances', g.id, (x) => {
      const y = x as Grievance
      return { ...y, communications: [...y.communications, { at, channel, message: message.trim(), by }], history: [...y.history, { at, actor: by, action: 'User informed', detail: `${channel}: ${message.trim()}` }] }
    })
    logPrivacy(by, 'Grievance update sent to user', g.id, channel)
    setMessage('')
    setChannel('')
    toast('Update sent to the complainant.')
  }
  return (
    <div className="space-y-4">
      <DataGrid
        rows={[...g.communications].reverse()}
        rowKey={(c) => `${c.at}-${c.channel}-${c.message.slice(0, 20)}`}
        fileName={`${g.id}-communication`}
        filters={[{ key: 'ch', label: 'Channels', get: (c) => c.channel, options: ['Email', 'SMS', 'In-app', 'Phone'] }]}
        cols={[
          { key: 'at', label: 'Sent', value: (c) => fmtDT(c.at), className: 'whitespace-nowrap text-muted' },
          { key: 'ch', label: 'Channel', value: (c) => c.channel },
          { key: 'msg', label: 'Message', value: (c) => c.message, className: 'max-w-[480px]' },
          { key: 'by', label: 'By', value: (c) => c.by },
        ]}
        empty="No communication yet."
      />
      <Section title="Send progress update" sub="Parameter 14">
        <div className="grid gap-3 sm:grid-cols-4">
          <SelectField label="Channel" required options={['Email', 'SMS', 'In-app', 'Phone']} value={channel} onChange={(e) => setChannel(e.target.value as CommEntry['channel'])} error={err.channel} />
          <TextAreaField className="sm:col-span-3" label="Message" required value={message} onChange={(e) => setMessage(e.target.value)} error={err.message} rows={2} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={send}>Send update</Button>
        </div>
      </Section>
    </div>
  )
}
