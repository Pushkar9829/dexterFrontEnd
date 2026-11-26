import { apiEnabled, post as apiPost } from '@/lib/api'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, Play, RefreshCw, Send, UserCog, Zap } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField, TextField, SelectField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { can, useRole } from '@/lib/rbac'
import {
  WF_EVENTS, WF_MODULES, actorName, emitWorkflow, loadTasks, logAudit, nowIso, runEscalations, useHierarchy, useWorkflow, useWorkflowLoad, wfApi, wfStore, wid,
  type EmailLog, type HierarchyState, type Priority, type WfEvent, type WfModule, type WfTask,
} from '@/data/workflow'
import { BTN_PRIMARY, BTN_SECONDARY, Drawer, EmptyRow, FilterCard, FilterSelect, PageHead, PickField, Stat, TD, THead, TROW, TableCard, WfCrumbs } from './ui'
import { empLabel, fmtDT, usePaged } from './helpers'
import { MailModal } from './MailModal'

const COLS = ['Task ID', 'Module', 'Reference', 'Site', 'Task Title', 'Assigned To', 'Assigned By', 'Created', 'Due', 'Priority', 'Status', 'Esc. Level', 'Remarks', 'Completed', 'Email Ref.', '']
const STATUSES = ['Pending', 'In Progress', 'Overdue', 'Completed', 'Cancelled']
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical']
const FLOW = ['Module event occurs', 'Workflow engine', 'Create / update task + fetch email template', 'Fetch assignee, due date, hierarchy & escalation matrix', 'Determine recipient', 'Send email / notification', 'Monitor task status']
const isOpen = (t: WfTask) => t.status !== 'Completed' && t.status !== 'Cancelled'
const prTone = (p: Priority) => (p === 'Critical' ? 'red' : p === 'High' ? 'amber' : p === 'Medium' ? 'blue' : 'gray')

type Check = { at: string; escalated: number; auto: boolean }

/** Run the engine's escalation scan and report how many tasks moved. */
function checkNow(auto: boolean): Check {
  const before = new Map(wfStore.get().tasks.map((t) => [t.id, `${t.status}|${t.escalationLevel}`]))
  runEscalations()
  const escalated = wfStore.get().tasks.filter((t) => before.get(t.id) !== undefined && before.get(t.id) !== `${t.status}|${t.escalationLevel}`).length
  if (escalated) logAudit('Work Management', 'Escalation check', auto ? 'Automatic escalation check' : 'Manual escalation check', `${escalated} task(s) escalated`)
  return { at: nowIso(), escalated, auto }
}

export default function WorkflowTasks() {
  const role = useRole()
  const canEdit = can('Edit', role)
  const { tasks, emails } = useWorkflow()
  useWorkflowLoad(['tasks', 'emails', 'hierarchy']) // API mode: /workflow/tasks, /workflow/emails, /employees
  const h = useHierarchy()
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('all')
  const [st, setSt] = useState('all')
  const [pr, setPr] = useState('all')
  const [who, setWho] = useState('all')
  const [lvl, setLvl] = useState('all')
  const [sel, setSel] = useState<string | null>(null)
  const [sim, setSim] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [last, setLast] = useState<Check | null>(null)

  // Automatic escalation check every 60 s while this page is open (§14.4 "Monitor task status").
  useEffect(() => {
    if (apiEnabled) return // API mode: the server runs the escalation scan every 15 min (cron)
    const tick = () => {
      setLast(checkNow(true))
      setNow(Date.now())
    }
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 60_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [])

  const runManual = () => {
    if (apiEnabled) {
      // POST /workflow/escalations/run (Super Admin / Admin)
      wfApi
        .runEscalations()
        .then((n) => {
          setLast({ at: nowIso(), escalated: n, auto: false })
          setNow(Date.now())
          toast(n ? `${n} task(s) marked overdue / escalated.` : 'Escalation check done — nothing new to escalate.', n ? 'success' : 'info')
        })
        .catch((e: Error) => toast(e.message || 'Escalation run failed.', 'error'))
      return
    }
    const c = checkNow(false)
    setLast(c)
    setNow(Date.now())
    toast(c.escalated ? `${c.escalated} task(s) marked overdue / escalated; reminder emails logged.` : 'Escalation check done — nothing new to escalate.', c.escalated ? 'success' : 'info')
  }

  const assignees = useMemo(() => [...new Set(tasks.map((t) => t.assignedTo))].map((id) => ({ id, label: empLabel(id) })), [tasks])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return tasks.filter(
      (t) =>
        (mod === 'all' || t.module === mod) &&
        (st === 'all' || t.status === st) &&
        (pr === 'all' || t.priority === pr) &&
        (who === 'all' || empLabel(t.assignedTo) === who) &&
        (lvl === 'all' || `L${t.escalationLevel}` === lvl) &&
        (!s || [t.id, t.refId, t.title, t.siteId ?? '', t.atmId ?? '', empLabel(t.assignedTo)].some((v) => v.toLowerCase().includes(s))),
    )
  }, [tasks, q, mod, st, pr, who, lvl])
  const pg = usePaged(rows, `${q}|${mod}|${st}|${pr}|${who}|${lvl}`)
  const selected = sel ? tasks.find((t) => t.id === sel) : undefined

  return (
    <div className="space-y-5 pb-16 max-w-[1500px]">
      <WfCrumbs root="work" trail={[{ label: 'Workflow Tasks' }]} />
      <PageHead
        title="Central Workflow Tasks"
        sub="One task list for every ERP module: what action is pending, with whom, by when, and the escalation level. Emails and notifications come from the same engine."
        actions={
          <>
            {canEdit && <button type="button" className={BTN_SECONDARY} onClick={() => setSim(true)}><Zap size={15} /> Simulate module event</button>}
            <button type="button" className={BTN_PRIMARY} onClick={runManual}><RefreshCw size={15} /> Run escalation check</button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open tasks" value={tasks.filter(isOpen).length} tone="text-[#0066FF]" />
        <Stat label="Overdue" value={tasks.filter((t) => t.status === 'Overdue').length} tone="text-red-600" />
        <Stat label="Escalated (L2+)" value={tasks.filter((t) => isOpen(t) && t.escalationLevel >= 2).length} tone="text-amber-600" />
        <Stat label="Completed" value={tasks.filter((t) => t.status === 'Completed').length} tone="text-emerald-600" hint={last ? `Last check ${fmtDT(last.at)} (${last.auto ? 'auto' : 'manual'}) · auto every 60 s` : 'Auto check every 60 s'} />
      </div>

      <FlowLegend />

      <FilterCard
        search={q}
        onSearch={setQ}
        placeholder="Task ID, reference, site, title…"
        cols={5}
        onReset={() => {
          setQ('')
          setMod('all')
          setSt('all')
          setPr('all')
          setWho('all')
          setLvl('all')
        }}
        onDownload={() =>
          downloadCsv('workflow-tasks', COLS.slice(0, -1), rows.map((t) => [t.id, t.module, t.refId, t.siteId ?? '', t.title, empLabel(t.assignedTo), t.assignedBy, fmtDT(t.createdAt), fmtDT(t.dueAt), t.priority, t.status, `L${t.escalationLevel}`, t.remarks ?? '', fmtDT(t.completedAt), t.emailRefs.join('; ')]))
        }
      >
        <FilterSelect label="Module" value={mod} onChange={setMod} options={WF_MODULES} all="All modules" />
        <FilterSelect label="Status" value={st} onChange={setSt} options={STATUSES} all="All statuses" />
        <FilterSelect label="Priority" value={pr} onChange={setPr} options={PRIORITIES} all="All priorities" />
        <FilterSelect label="Assigned To" value={who} onChange={setWho} options={assignees.map((a) => a.label)} all="Everyone" />
        <FilterSelect label="Escalation level" value={lvl} onChange={setLvl} options={['L1', 'L2', 'L3', 'L4', 'L5']} all="All levels" />
      </FilterCard>

      <TableCard title="Workflow tasks" total={rows.length} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} noun="tasks" minWidth={1900}>
        <THead cols={COLS} />
        <tbody>
          {pg.slice.length === 0 && <EmptyRow cols={COLS.length} text={tasks.length ? 'No tasks match the filters.' : 'No workflow tasks yet — they are created when a module fires an event (use "Simulate module event" to try it).'} />}
          {pg.slice.map((t) => {
            const late = isOpen(t) && new Date(t.dueAt).getTime() < now
            return (
              <tr key={t.id} className={cn(TROW, 'cursor-pointer')} onClick={() => setSel(t.id)}>
                <td className={`${TD} font-semibold text-[#0066FF]`}>{t.id}</td>
                <td className={TD}>{t.module}</td>
                <td className={TD}>{t.refId}</td>
                <td className={TD}>{t.siteId ?? '—'}</td>
                <td className={`${TD} max-w-[240px] truncate`} title={t.title}>{t.title}</td>
                <td className={TD}>{empLabel(t.assignedTo)}</td>
                <td className={TD}>{t.assignedBy}</td>
                <td className={TD}>{fmtDT(t.createdAt)}</td>
                <td className={cn(TD, late && 'font-semibold text-red-600')}>{fmtDT(t.dueAt)}</td>
                <td className={TD}><Badge tone={prTone(t.priority)}>{t.priority}</Badge></td>
                <td className={TD}><Badge tone={toneFor(t.status)}>{t.status}</Badge></td>
                <td className={TD}>L{t.escalationLevel}</td>
                <td className={`${TD} max-w-[180px] truncate`} title={t.remarks}>{t.remarks ?? '—'}</td>
                <td className={TD}>{fmtDT(t.completedAt)}</td>
                <td className={TD}>{t.emailRefs.length ? t.emailRefs[0] + (t.emailRefs.length > 1 ? ` +${t.emailRefs.length - 1}` : '') : '—'}</td>
                <td className={TD}><span className="inline-flex items-center gap-1 font-semibold text-[#0066FF]"><Eye size={13} /> Open</span></td>
              </tr>
            )
          })}
        </tbody>
      </TableCard>

      {selected && <TaskDrawer key={selected.id} task={selected} emails={emails} h={h} canEdit={canEdit} onClose={() => setSel(null)} />}
      {sim && <SimulateModal h={h} onClose={() => setSim(false)} />}
    </div>
  )
}

function FlowLegend() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-[13px] font-bold text-slate-900">Integrated task + email workflow (§14.4)</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight size={12} className="text-slate-400" />}
            <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-[#0066FF]">{s}</span>
          </span>
        ))}
        <ArrowRight size={12} className="text-slate-400" />
        <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-semibold text-slate-700">Completed within SLA?</span>
      </div>
      <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800"><b>Yes:</b> close task &amp; log email → audit trail</div>
        <div className="rounded-md bg-red-50 px-3 py-2 text-red-800"><b>No:</b> reminder &amp; escalation → assign / notify next level (L2…L5) → audit trail</div>
      </div>
    </div>
  )
}

// ── Task drawer ──────────────────────────────────────────────────────────
function TaskDrawer({ task, emails, h, canEdit, onClose }: { task: WfTask; emails: EmailLog[]; h: HierarchyState; canEdit: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'view' | 'reassign' | 'complete'>('view')
  const [to, setTo] = useState('')
  const [remark, setRemark] = useState('')
  const [err, setErr] = useState<{ to?: string; remark?: string }>({})
  const [mail, setMail] = useState<EmailLog | null>(null)
  const linked = emails.filter((e) => task.emailRefs.includes(e.id) || e.taskId === task.id)
  const open = isOpen(task)
  const options = h.employees.filter((e) => e.status === 'Active' && e.id !== task.assignedTo).map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))

  const patch = (fn: (t: WfTask) => WfTask) => wfStore.set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === task.id ? fn(t) : t)) }))
  const start = () => {
    if (apiEnabled) {
      wfApi.startTask(task.id).then((ok) => ok && toast(`${task.id} is now In Progress.`))
      return
    }
    patch((t) => ({ ...t, status: 'In Progress', history: [...t.history, { at: nowIso(), by: actorName(), text: 'Marked In Progress' }] }))
    logAudit(task.module, task.id, 'Task started')
    toast(`${task.id} is now In Progress.`)
  }
  const reassign = () => {
    const e: typeof err = {}
    if (!to) e.to = 'Select the new assignee.'
    if (remark.trim().length < 3) e.remark = 'Give a reason for reassignment.'
    setErr(e)
    if (Object.keys(e).length) return
    const emp = h.employees.find((x) => x.id === to)
    if (apiEnabled) {
      wfApi.assignTask(task.id, to).then((ok) => {
        if (!ok) return
        toast(`${task.id} reassigned to ${emp?.name ?? to}.`)
        setMode('view')
        setRemark('')
        setTo('')
      })
      return
    }
    patch((t) => ({ ...t, assignedTo: to, history: [...t.history, { at: nowIso(), by: actorName(), text: `Reassigned ${empLabel(task.assignedTo)} → ${empLabel(to)}: ${remark.trim()}` }] }))
    if (emp) wfStore.set((s) => ({ ...s, notices: [{ id: wid('NTF'), at: nowIso(), to: emp.email, channel: 'In-app' as const, module: task.module, refId: task.refId, text: `Task ${task.id} reassigned to you: ${task.title}`, read: false }, ...s.notices].slice(0, 3000) }))
    logAudit(task.module, task.id, 'Task reassigned', `${task.assignedTo} → ${to}: ${remark.trim()}`)
    toast(`${task.id} reassigned to ${emp?.name ?? to}.`)
    setMode('view')
    setRemark('')
    setTo('')
  }
  const complete = () => {
    if (remark.trim().length < 3) {
      setErr({ remark: 'A completion remark is required.' })
      return
    }
    if (apiEnabled) {
      wfApi.completeTask(task.id, remark.trim()).then((ok) => {
        if (!ok) return
        toast(`${task.id} completed. No further reminders will be sent.`)
        setMode('view')
        setRemark('')
      })
      return
    }
    const at = nowIso()
    patch((t) => ({ ...t, status: 'Completed', completedAt: at, remarks: remark.trim(), history: [...t.history, { at, by: actorName(), text: `Completed: ${remark.trim()} (reminders stopped)` }] }))
    logAudit(task.module, task.id, 'Task completed', remark.trim())
    toast(`${task.id} completed. No further reminders will be sent.`)
    setMode('view')
    setRemark('')
  }

  const footer = !canEdit || !open ? undefined : mode === 'view' ? (
    <>
      {task.status === 'Pending' && <button type="button" className={BTN_SECONDARY} onClick={start}><Play size={14} /> Start</button>}
      <button type="button" className={BTN_SECONDARY} onClick={() => { setMode('reassign'); setErr({}) }}><UserCog size={14} /> Reassign</button>
      <button type="button" className={BTN_PRIMARY} onClick={() => { setMode('complete'); setErr({}) }}><CheckCircle2 size={14} /> Complete</button>
    </>
  ) : (
    <>
      <button type="button" className={BTN_SECONDARY} onClick={() => { setMode('view'); setErr({}) }}>Cancel</button>
      <button type="button" className={BTN_PRIMARY} onClick={mode === 'reassign' ? reassign : complete}>{mode === 'reassign' ? 'Save reassignment' : 'Mark completed'}</button>
    </>
  )

  const facts: [string, string][] = [
    ['Module', task.module], ['Reference', task.refId], ['Site / ATM', [task.siteId, task.atmId].filter(Boolean).join(' / ') || '—'], ['Assigned to', empLabel(task.assignedTo)], ['Assigned by', task.assignedBy],
    ['Created', fmtDT(task.createdAt)], ['Due', fmtDT(task.dueAt)], ['Priority', task.priority], ['Escalation level', `L${task.escalationLevel}`], ['Completed', fmtDT(task.completedAt)], ['Remarks', task.remarks ?? '—'],
  ]
  return (
    <Drawer title={`${task.id} · ${task.title}`} sub={<span className="flex items-center gap-2"><Badge tone={toneFor(task.status)}>{task.status}</Badge> {task.module} · {task.refId}</span>} onClose={onClose} footer={footer}>
      {mode === 'reassign' && (
        <div className="mb-5 space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
          <PickField label="Reassign to" required options={options} value={to} onChange={(e) => { setTo(e.target.value); setErr((x) => ({ ...x, to: undefined })) }} error={err.to} />
          <TextAreaField label="Reason" required value={remark} onChange={(e) => { setRemark(e.target.value); setErr((x) => ({ ...x, remark: undefined })) }} error={err.remark} />
        </div>
      )}
      {mode === 'complete' && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <TextAreaField label="Completion remark" required value={remark} onChange={(e) => { setRemark(e.target.value); setErr({}) }} error={err.remark} hint="Completing stops all further reminders and escalations for this task." />
        </div>
      )}
      <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[12px]">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold text-slate-500">{k}</dt>
            <dd className="text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-6 mb-2 text-[13px] font-bold text-slate-900">Linked emails ({linked.length})</h3>
      {linked.length === 0 ? (
        <p className="text-[12px] text-slate-500">No emails linked to this task.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[12px]">
          {linked.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.subject}</div>
                <div className="text-[11px] text-slate-500">{m.id} · {m.templateCode} v{m.templateVersion} · {fmtDT(m.at)} · {m.to.join(', ') || 'no recipient'}</div>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone={toneFor(m.status)}>{m.status}</Badge>
                <button type="button" className="font-semibold text-[#0066FF] hover:underline" onClick={() => setMail(m)}>View</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt-6 mb-2 text-[13px] font-bold text-slate-900">History</h3>
      <ol className="space-y-2 border-l-2 border-slate-200 pl-4 text-[12px]">
        {[...task.history].reverse().map((x, i) => (
          <li key={`${x.at}-${i}`}>
            <div className="text-slate-800">{x.text}</div>
            <div className="text-[11px] text-slate-500">{fmtDT(x.at)} · {x.by}</div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[11px] text-slate-500">
        Full activity: <Link to="/setup/workflow-audit" className="font-semibold text-[#0066FF] hover:underline">Workflow audit log</Link>
      </p>
      {mail && <MailModal mail={mail} onClose={() => setMail(null)} />}
    </Drawer>
  )
}

// ── Simulate a module event (demo of the engine; real modules call emitWorkflow) ──
function SimulateModal({ h, onClose }: { h: HierarchyState; onClose: () => void }) {
  const [f, setF] = useState({ module: 'CBR' as WfModule | '', event: 'Submit' as WfEvent | '', refId: '', siteId: '', atmId: '', title: '', owner: '', dueHours: '24', priority: 'Medium' as Priority | '' })
  const [err, setErr] = useState<Partial<Record<keyof typeof f, string>>>({})
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    setErr((e) => ({ ...e, [k]: undefined }))
  }
  const owners = h.employees.filter((e) => e.status === 'Active').map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))
  const fire = () => {
    const e: typeof err = {}
    if (!f.module) e.module = 'Select the module.'
    if (!f.event) e.event = 'Select the event.'
    if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{2,39}$/.test(f.refId.trim())) e.refId = 'Enter the record ID (3–40 letters, digits, - / _).'
    const d = Number(f.dueHours)
    if (f.title.trim() && (!Number.isFinite(d) || d < -720 || d > 720)) e.dueHours = 'Due in hours: −720 to 720 (negative = already overdue).'
    setErr(e)
    if (Object.keys(e).length) return
    if (apiEnabled) {
      // POST /workflow/events — the server engine creates the task, emails and notifications.
      apiPost<{ task?: { taskId: string } }>('/workflow/events', {
        module: f.module, event: f.event, refId: f.refId.trim(),
        vars: Object.fromEntries(Object.entries({ Site_ID: f.siteId.trim(), ATM_ID: f.atmId.trim() }).filter(([, v]) => v)),
        nextAction: f.title.trim() ? { title: f.title.trim(), ownerId: f.owner || undefined, dueHours: Math.max(0, d), priority: f.priority || 'Medium' } : undefined,
      })
        .then((r) => {
          toast(`${f.module} ${f.event} fired for ${f.refId.trim()}.${r?.task?.taskId ? ` Task ${r.task.taskId} created.` : ''}`)
          loadTasks().catch(() => undefined)
          onClose()
        })
        .catch((e: Error) => toast(e.message || 'The server rejected the event.', 'error'))
      return
    }
    const task = emitWorkflow({
      module: f.module as WfModule,
      event: f.event as WfEvent,
      refId: f.refId.trim(),
      vars: { Site_ID: f.siteId.trim() || undefined, ATM_ID: f.atmId.trim() || undefined },
      nextAction: f.title.trim() ? { title: f.title.trim(), ownerId: f.owner || undefined, dueHours: d, priority: (f.priority || 'Medium') as Priority } : undefined,
    })
    const mail = wfStore.get().emails[0]
    const mailNote = mail && mail.refId === f.refId.trim() && mail.event === f.event ? ` Email ${mail.templateCode}: ${mail.status}.` : ' No active template for this module/event — no email sent.'
    toast(`${f.module} ${f.event} fired for ${f.refId.trim()}.${task ? ` Task ${task.id} created.` : ' Open task(s) closed.'}${mailNote}`)
    onClose()
  }
  return (
    <Modal
      title="Simulate module event"
      sub="Fires the workflow engine exactly as a module would: closes the record's open task, creates the next task, sends the active template, notifies and logs."
      onClose={onClose}
      width={640}
      footer={<><button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button><button type="button" className={BTN_PRIMARY} onClick={fire}><Send size={14} /> Fire event</button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Module" required options={WF_MODULES} value={f.module} onChange={(e) => set('module', e.target.value as WfModule)} error={err.module} />
        <SelectField label="Event" required options={WF_EVENTS} value={f.event} onChange={(e) => set('event', e.target.value as WfEvent)} error={err.event} />
        <TextField label="Record ID" required value={f.refId} onChange={(e) => set('refId', e.target.value)} error={err.refId} placeholder="CBR-2026-00142" />
        <TextField label="Site ID" value={f.siteId} onChange={(e) => set('siteId', e.target.value)} placeholder="SITE-UP-0231" />
        <TextField label="ATM ID" value={f.atmId} onChange={(e) => set('atmId', e.target.value)} />
        <TextField label="Next action (task title)" value={f.title} onChange={(e) => set('title', e.target.value)} hint="Leave empty to only complete the open task." placeholder="Verify CBR" />
        <PickField label="Assign to" options={owners} value={f.owner} onChange={(e) => set('owner', e.target.value)} placeholder={`Module owner${f.module && h.moduleOwners[f.module] ? ` (${empLabel(h.moduleOwners[f.module])})` : ''}`} />
        <TextField label="Due in (hours)" type="number" value={f.dueHours} onChange={(e) => set('dueHours', e.target.value)} error={err.dueHours} hint="Use a negative value to test overdue escalation." />
        <SelectField label="Priority" options={PRIORITIES} value={f.priority} onChange={(e) => set('priority', e.target.value as Priority)} />
      </div>
    </Modal>
  )
}
