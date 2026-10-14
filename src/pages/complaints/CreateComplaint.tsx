import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionTitle, SelectField, TextAreaField, TextField, fmtSize } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  ATM_MASTER,
  CATEGORIES,
  COMPONENTS,
  CURRENT_USER,
  DEFAULT_COMPONENT,
  DEPARTMENTS,
  DEPARTMENT_FOR,
  PRIORITIES,
  REPORTING_AUTHORITIES,
  SLA_HOURS,
  aiDefault,
  atmById,
  channelFor,
  complaintStore,
  draftStore,
  escalationChain,
  fmtDate,
  ist,
  istDay,
  nextComplaintId,
  nextTaskId,
  nowMs,
  pendingDays,
  setLastOpened,
  type Complaint,
  type Department,
  type Priority,
} from '@/data/complaints'
import { recStore } from '@/data/complaintsAi'
import { ComplaintsShell, BASE } from './shared'

type Att = { name: string; size: number }
type FormState = {
  reportingAuthority: string
  atmId: string
  receivedDate: string
  issue: string // "Category / Subcategory"
  component: string
  priority: Priority | ''
  title: string
  details: string
  attachments: Att[]
  forwardedOn: string
  department: Department | ''
  docket: string
  status: 'Open' | 'Close'
  reminderDate: string
  linkTask: boolean
  remark: string
  redressalDate: string
  outcomeDate: string
  outcomeRemark: string
}

const ISSUE_OPTIONS = Object.entries(CATEGORIES).flatMap(([c, subs]) => subs.map((s) => `${c} / ${s}`))
const MAX_MB = 5

const today = () => istDay(nowMs())
const tomorrow = () => istDay(nowMs() + 86_400_000)
const blank = (): FormState => ({
  reportingAuthority: REPORTING_AUTHORITIES[0],
  atmId: '',
  receivedDate: today(),
  issue: '',
  component: '',
  priority: '',
  title: '',
  details: '',
  attachments: [],
  forwardedOn: today(),
  department: '',
  docket: 'NA',
  status: 'Open',
  reminderDate: tomorrow(),
  linkTask: true,
  remark: '',
  redressalDate: '',
  outcomeDate: '',
  outcomeRemark: '',
})
const clock = (ms: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(ms)

function Tag({ kind }: { kind: 'AUTO-FILLED' | 'CALCULATED' }) {
  return <span className="ml-auto pl-2 text-[10px] font-medium tracking-wide text-primary">{kind}</span>
}

function ReadOnly({ label, value, hint, kind = 'AUTO-FILLED', required, className }: { label: string; value: ReactNode; hint?: string; kind?: 'AUTO-FILLED' | 'CALCULATED' | null; required?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center text-[12px] font-semibold text-ink">
        {label}
        {required && <span>&nbsp;*</span>}
        {kind && <Tag kind={kind} />}
      </div>
      <div aria-readonly="true" aria-label={label} className={cn('flex min-h-9 items-center rounded-md border px-3 py-1.5 text-[13px] text-ink-2', kind ? 'border-line-soft bg-surface' : 'border-line bg-white')}>
        {value || <span className="text-muted">Select an ATM ID</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

function Section({ num, title, sub, children, cols = 3 }: { num: string; title: string; sub: string; children: ReactNode; cols?: 2 | 3 }) {
  return (
    <section className="mb-5 rounded-xl border border-line bg-white p-4 sm:p-6">
      <SectionTitle num={num} title={title} sub={sub} />
      <div className={cn('grid gap-x-5 gap-y-4 sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3')}>{children}</div>
    </section>
  )
}

function AtmPicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [q, setQ] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [prev, setPrev] = useState(value)
  if (prev !== value) {
    setPrev(value)
    setQ(value)
  }
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return ATM_MASTER.filter((a) => !s || a.atmId.toLowerCase().includes(s) || a.siteName.toLowerCase().includes(s) || a.siteId.toLowerCase().includes(s)).slice(0, 8)
  }, [q])
  return (
    <div ref={ref} className="relative">
      <label htmlFor="atmId" className="mb-1.5 block text-[12px] font-semibold text-ink">
        ATM ID *
      </label>
      <div className={cn('flex h-9 items-center gap-2 rounded-md border bg-white px-3 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10', error ? 'border-brand-red' : 'border-line')}>
        <input
          id="atmId"
          role="combobox"
          aria-expanded={open}
          aria-controls="atm-list"
          autoComplete="off"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            if (value) onChange('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && list[0]) {
              e.preventDefault()
              onChange(list[0].atmId)
              setOpen(false)
            }
          }}
          placeholder="Type an ATM ID or site name"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted/70"
        />
        {value && (
          <button type="button" aria-label="Clear ATM" onClick={() => onChange('')} className="text-muted hover:text-brand-red">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <ul id="atm-list" role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-lg">
          {list.length === 0 && <li className="px-3 py-2 text-[12px] text-muted">No matching ATM in master data</li>}
          {list.map((a) => (
            <li key={a.atmId} role="option" aria-selected={a.atmId === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(a.atmId)
                  setOpen(false)
                }}
                title={`${a.siteId} · ${a.franchise}`}
                className={cn('flex w-full rounded px-3 py-1.5 text-left text-[12px] hover:bg-surface', a.atmId === value ? 'bg-primary-soft text-primary' : 'text-ink')}
              >
                {a.atmId} · {a.siteName}, {a.city}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={cn('mt-1 text-[11px]', error ? 'text-brand-red' : 'text-muted')}>{error ?? 'Type an ATM ID or site name · Matching master records below'}</p>
    </div>
  )
}

function Attachments({ value, onChange }: { value: Att[]; onChange: (v: Att[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState('')
  const take = (files: FileList | null) => {
    if (!files) return
    const ok: Att[] = []
    const bad: string[] = []
    Array.from(files).forEach((f) => {
      if (!/\.(jpe?g|png|pdf)$/i.test(f.name)) bad.push(`${f.name} (type)`)
      else if (f.size > MAX_MB * 1024 * 1024) bad.push(`${f.name} (over ${MAX_MB} MB)`)
      else ok.push({ name: f.name, size: f.size })
    })
    setErr(bad.length ? `Not attached: ${bad.join(', ')}. Use JPG, PNG or PDF up to ${MAX_MB} MB.` : '')
    if (ok.length) onChange([...value, ...ok.filter((o) => !value.some((v) => v.name === o.name))])
  }
  return (
    <div className="sm:col-span-2 lg:col-span-3">
      <div
        role="button"
        aria-label="Attachments"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          take(e.dataTransfer.files)
        }}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-surface/60 px-3 py-4 hover:border-primary/50"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
          <UploadCloud size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-primary">Click to upload or drag a file · Add issue evidence</div>
          <div className="text-[11px] text-muted">
            JPG, PNG or PDF · Up to 5 MB each · {value.length ? `${value.length} file${value.length > 1 ? 's' : ''} attached` : 'No files attached'}
          </div>
        </div>
        <input ref={ref} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => {
            take(e.target.files)
            e.target.value = ''
          }} />
      </div>
      {err && <p className="mt-1 text-[11px] text-brand-red">{err}</p>}
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {value.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5 text-[12px]">
              <FileText size={14} className="text-emerald-600" />
              <span className="max-w-48 truncate">{f.name}</span>
              <span className="text-muted">{fmtSize(f.size)}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(value.filter((x) => x.name !== f.name))} className="text-muted hover:text-brand-red">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CreateComplaint() {
  const nav = useNavigate()
  const initialDraft = draftStore.get()
  const [f, setF] = useState<FormState>(() => ({ ...blank(), ...((initialDraft ?? {}) as Partial<FormState>) }))
  const [savedAt, setSavedAt] = useState<number | null>(initialDraft?.savedAt ?? null)
  const [tried, setTried] = useState(false)
  const lastSaved = useRef(JSON.stringify(f))

  // autosave draft (debounced) — only when the form actually changed
  useEffect(() => {
    const json = JSON.stringify(f)
    if (json === lastSaved.current) return
    const t = setTimeout(() => {
      const at = nowMs()
      lastSaved.current = json
      draftStore.set({ ...f, savedAt: at })
      setSavedAt(at)
    }, 700)
    return () => clearTimeout(t)
  }, [f])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((x) => ({ ...x, [k]: v }))
  const atm = atmById(f.atmId)
  const [category, subcategory] = f.issue ? f.issue.split(' / ') : ['', '']
  const chain = f.department ? escalationChain(f.department, atm) : []
  const receivedIso = f.receivedDate ? (f.receivedDate === today() ? new Date(nowMs()).toISOString() : ist(f.receivedDate, '10:00')) : ''
  const dueMs = f.priority && receivedIso ? Date.parse(receivedIso) + SLA_HOURS[f.priority] * 3_600_000 : null

  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!f.reportingAuthority) errors.reportingAuthority = 'Select the reporting authority'
  if (!atm) errors.atmId = 'Select an ATM ID from master data'
  if (!f.receivedDate) errors.receivedDate = 'Enter the receiving date'
  else if (f.receivedDate > today()) errors.receivedDate = 'Receiving date cannot be in the future'
  if (!f.issue) errors.issue = 'Select the issue category'
  if (!f.component) errors.component = 'Select the component'
  if (!f.priority) errors.priority = 'Select a priority'
  if (!f.title.trim()) errors.title = 'Enter an issue title'
  if (f.details.trim().length < 15) errors.details = 'Describe the issue (at least 15 characters)'
  if (!f.forwardedOn) errors.forwardedOn = 'Enter the forwarding date'
  else if (f.receivedDate && f.forwardedOn < f.receivedDate) errors.forwardedOn = 'Cannot be before the receiving date'
  if (!f.department) errors.department = 'Select the concerned department'
  if (f.reminderDate && f.receivedDate && f.reminderDate < f.receivedDate) errors.reminderDate = 'Reminder cannot be before the receiving date'
  if (f.status === 'Close') {
    if (!f.redressalDate) errors.redressalDate = 'Required to close the complaint'
    if (!f.outcomeDate) errors.outcomeDate = 'Required to close the complaint'
    if (!f.outcomeRemark.trim()) errors.outcomeRemark = 'Required to close the complaint'
  }
  const e = (k: keyof FormState) => (tried ? errors[k] : undefined)

  const saveDraft = () => {
    const at = nowMs()
    lastSaved.current = JSON.stringify(f)
    draftStore.set({ ...f, savedAt: at })
    setSavedAt(at)
    toast('Draft saved · not included in complaint totals', 'info')
  }

  const submit = () => {
    setTried(true)
    const n = Object.keys(errors).length
    if (n) {
      toast(`${n} field${n > 1 ? 's need' : ' needs'} attention`, 'info')
      setTimeout(() => document.querySelector('[class*="border-brand-red"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30)
      return
    }
    const id = nextComplaintId()
    const nowIso = new Date(nowMs()).toISOString()
    const pr = f.priority as Priority
    const dept = f.department as Department
    const closed = f.status === 'Close'
    const taskId = f.linkTask && f.reminderDate ? nextTaskId(recStore.get().flatMap((r) => (r.taskId ? [r.taskId] : []))) : null
    const lastAction = f.remark.trim() || 'Complaint registered'
    const c: Complaint = {
      id,
      receivedAt: receivedIso,
      reportingAuthority: f.reportingAuthority,
      channel: channelFor(f.reportingAuthority),
      atmId: f.atmId,
      component: f.component,
      category,
      subcategory,
      priority: pr,
      title: f.title.trim(),
      details: f.details.trim(),
      attachments: f.attachments.map((a) => a.name),
      forwardedOn: f.forwardedOn,
      department: dept,
      docket: f.docket.trim() || 'NA',
      owner: CURRENT_USER,
      status: closed ? 'Closed' : 'Open',
      subStatus: closed ? 'Resolved' : 'Assigned',
      respondedAt: nowIso,
      reminderDate: f.reminderDate || undefined,
      lastAction,
      remark: f.remark.trim(),
      proposedFix: '',
      outcome: closed ? 'Resolved' : 'Pending',
      outcomeDate: f.outcomeDate || undefined,
      outcomeRemark: f.outcomeRemark.trim(),
      redressalDate: f.redressalDate || undefined,
      frSignOff: closed,
      hdValidation: closed,
      evidence: closed,
      closedAt: closed ? (f.redressalDate === today() ? nowIso : ist(f.redressalDate, '18:00')) : undefined,
      escalationLevel: 1,
      escalations: [],
      impact: 'None',
      downtimeH: closed ? 0 : undefined,
      tasks: taskId ? [{ id: taskId, title: `Follow up on ${f.docket && f.docket !== 'NA' ? `docket ${f.docket}` : id}`, owner: CURRENT_USER, due: ist(f.reminderDate, '10:00'), dependency: dept }] : [],
      emails: [],
      visits: [],
      vendors: [],
      spares: [],
      audit: [
        { at: nowIso, title: 'Complaint registered', meta: `${CURRENT_USER} · ${channelFor(f.reportingAuthority)} · ${atm!.complainant} · Owner auto-assigned` },
        { at: nowIso, title: 'Routing applied', meta: `System · ${dept} escalation matrix · L1 ${chain[0]?.person}` },
        ...(taskId ? [{ at: nowIso, title: 'Follow-up task linked', meta: `${CURRENT_USER} · ${taskId} · Due ${fmtDate(ist(f.reminderDate, '10:00'))}` }] : []),
        ...(closed ? [{ at: nowIso, title: 'Complaint closed at registration', meta: `${CURRENT_USER} · ${f.outcomeRemark.trim()}` }] : []),
      ],
      ai: closed ? undefined : { ...aiDefault({ category, subcategory, priority: pr }, pr === 'Critical' ? 70 : pr === 'High' ? 55 : 35), updated: nowIso },
    }
    complaintStore.set((xs) => [c, ...xs])
    draftStore.set(null)
    setLastOpened(id)
    toast(`${id} created and routed to ${dept}`)
    nav(`${BASE}/${id}`)
  }

  return (
    <ComplaintsShell title="Create Complaint" sub="Register a complaint and route it to the responsible team. Fields marked * are required.">
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-primary-soft px-5 py-3.5 text-[12px]">
        <span className="font-medium text-primary">New registration · Draft</span>
        <span className="text-ink-2">Master data fills linked site and contact information. Calculated fields are read-only. Closure details can be added after resolution.</span>
      </div>

      <form
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault()
          submit()
        }}
      >
        <Section num="01" title="Reporting & ATM selection" sub="Select one canonical ATM ID. Site, franchise, mobile and FR email are populated from ATM master data.">
          <SelectField label="Reporting Authority" required options={REPORTING_AUTHORITIES} value={f.reportingAuthority} onChange={(x) => set('reportingAuthority', x.target.value)} error={e('reportingAuthority')} />
          <AtmPicker value={f.atmId} onChange={(v) => set('atmId', v)} error={e('atmId')} />
          <TextField label="Complaint Receiving Date" required type="date" max={today()} value={f.receivedDate} onChange={(x) => set('receivedDate', x.target.value)} error={e('receivedDate')} hint="Manual calendar · Date received from FR / Field Officer Mobile App" />
          <ReadOnly label="Site ID" value={atm && `${atm.siteId} · ${atm.siteName}`} />
          <ReadOnly label="Franchise Name / Name of Complainant" value={atm && `${atm.franchise} / ${atm.complainant}`} />
          <ReadOnly label="Receiving source" kind={null} value={channelFor(f.reportingAuthority)} />
          <ReadOnly label="Mobile Number" value={atm?.mobile} />
          <ReadOnly label="FR Email" value={atm?.email} />
          <ReadOnly label="State" required value={atm?.state} />
        </Section>

        <Section num="02" title="Issue & asset context" sub="Provide enough detail for the help desk and engineer to act without another callback.">
          <ReadOnly label="Project" required value={atm && `${atm.project} · ${atm.projectId}`} />
          <ReadOnly label="Asset / model" value={atm && `${atm.model} · ${atm.serial}`} />
          <SelectField label="Component" required options={COMPONENTS} value={f.component} onChange={(x) => set('component', x.target.value)} error={e('component')} />
          <SelectField
            label="Issue category"
            required
            options={ISSUE_OPTIONS}
            value={f.issue}
            onChange={(x) => {
              const v = x.target.value
              const [cat, sub] = v.split(' / ')
              setF((s) => ({ ...s, issue: v, component: v ? DEFAULT_COMPONENT[sub] : s.component, department: s.department || (v ? DEPARTMENT_FOR[cat] : '') }))
            }}
            error={e('issue')}
          />
          <SelectField label="Priority" required options={PRIORITIES} value={f.priority} onChange={(x) => set('priority', x.target.value as Priority | '')} error={e('priority')} />
          <ReadOnly label="Complaint Pending Since (No. of Days)" kind="CALCULATED" value={f.receivedDate ? `${pendingDays(ist(f.receivedDate))} day${pendingDays(ist(f.receivedDate)) === 1 ? '' : 's'}` : '—'} hint="Calculated from receiving date to today" />
          <TextField className="sm:col-span-2 lg:col-span-3" label="Issue title" required value={f.title} onChange={(x) => set('title', x.target.value)} placeholder="e.g. Low battery backup at Kothrud ATM" error={e('title')} maxLength={120} />
          <TextAreaField className="sm:col-span-2 lg:col-span-3" label="Issue details" required rows={4} value={f.details} onChange={(x) => set('details', x.target.value)} placeholder="What happened, since when, what the FR observed, current ATM state" error={e('details')} />
          <Attachments value={f.attachments} onChange={(v) => set('attachments', v)} />
        </Section>

        <Section num="03" title="Routing, ownership & escalation" sub="Escalation is selected automatically after the department is chosen. SSM, RM and engineer come from setup/database mappings.">
          <TextField label="Complaint Forwarded to the Concerned On" required type="date" value={f.forwardedOn} onChange={(x) => set('forwardedOn', x.target.value)} error={e('forwardedOn')} />
          <SelectField label="Concerned department" required options={DEPARTMENTS} value={f.department} onChange={(x) => set('department', x.target.value as Department | '')} error={e('department')} />
          <ReadOnly label="Escalation" value={chain.length ? chain.map((l) => `L${l.level} · ${l.role}`).join(' → ') : <span className="text-muted">Select a department</span>} hint={f.department ? `Auto-selected by ${f.department} escalation matrix` : undefined} />
          <ReadOnly label="SSM" value={atm?.ssm} />
          <ReadOnly label="RM" value={atm?.rm} />
          <ReadOnly label="Engineer Name & Number" value={atm && `${atm.engineer} · ${atm.engineerPhone}`} />
          <TextField label="Docket Number" value={f.docket} onChange={(x) => set('docket', x.target.value)} hint="Manual after company receipt · NA allowed" />
          <SelectField label="Complaint Status" required options={['Open', 'Close']} value={f.status} onChange={(x) => set('status', (x.target.value || 'Open') as 'Open' | 'Close')} hint="Available values: Open / Close" />
          <ReadOnly label="Resolution SLA" value={f.priority ? `${f.priority} priority · ${SLA_HOURS[f.priority]} hours` : <span className="text-muted">Select a priority</span>} hint={dueMs ? `From SLA setup · Due ${fmtDate(dueMs)}` : 'From SLA setup'} />
        </Section>

        <Section num="04" title="Follow-up & action tracking" sub="Reminders link to task management so every follow-up has an owner and due date.">
          <TextField label="Date of Reminder" type="date" value={f.reminderDate} onChange={(x) => set('reminderDate', x.target.value)} error={e('reminderDate')} hint="Manual calendar · Follow-up date" />
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-ink">Task-management tracker linkage</div>
            <label className="flex min-h-9 items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[13px]">
              <input type="checkbox" checked={f.linkTask} onChange={(x) => set('linkTask', x.target.checked)} />
              Create linked follow-up task on submission
            </label>
            <p className="mt-1 text-[11px] text-muted">{f.linkTask ? (f.reminderDate ? `Owner: ${CURRENT_USER} · Due ${fmtDate(ist(f.reminderDate))}, 10:00` : 'Set a reminder date to create the task') : 'No task will be created'}</p>
          </div>
          <ReadOnly label="Last Action Status" value={f.remark.trim() || 'Complaint registered'} hint="Default from Remark · Updates with the latest action" />
          <TextAreaField className="sm:col-span-2 lg:col-span-3" label="Remark" rows={2} value={f.remark} onChange={(x) => set('remark', x.target.value)} placeholder="e.g. HD Team reviewing battery test request" />
        </Section>

        <Section cols={2} num="05" title="Closure & outcome · Optional at creation" sub="Leave these fields blank while the complaint is open. Record the actual redressal date and dated outcome after restoration.">
          <TextField label="Date of Redressal of Complaint" required={f.status === 'Close'} type="date" value={f.redressalDate} onChange={(x) => set('redressalDate', x.target.value)} error={e('redressalDate')} hint="Manual calendar · Optional until closure" />
          <TextField label="Outcome date" required={f.status === 'Close'} type="date" value={f.outcomeDate} onChange={(x) => set('outcomeDate', x.target.value)} error={e('outcomeDate')} hint="Manual calendar · Date of the outcome" />
          <TextAreaField className="sm:col-span-2" label="Outcome remark" required={f.status === 'Close'} rows={2} value={f.outcomeRemark} onChange={(x) => set('outcomeRemark', x.target.value)} placeholder="Add resolution, tests completed and complainant confirmation" error={e('outcomeRemark')} />
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <div className="min-w-0 flex-1 text-[12px]">
            <div className={cn('font-medium', savedAt ? 'text-emerald-700' : 'text-ink')}>{savedAt ? 'Draft saved automatically' : 'New draft'}</div>
            <div className="text-muted">{savedAt ? `Last saved at ${clock(savedAt)}` : 'Changes save automatically'} · Not included in complaint totals</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              draftStore.set(null)
              nav(BASE)
            }}
          >
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={saveDraft}>
            Save draft
          </Button>
          <Button type="submit">Create complaint</Button>
        </div>
      </form>
    </ComplaintsShell>
  )
}
