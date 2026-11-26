// Complaint ↔ Operations workflow integration (§12): Site Master mapping, Complaint Master SLA, assignment task,
// hierarchy escalation, resolution by the assigned employee, closure by an authorized user, audit trail.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { updateComplaint, type Complaint } from '@/data/complaints'
import { getFranchise } from '@/data/franchises'
import { siteByAtm, useSites } from '@/data/network'
import { actorName, chainFor, emitWorkflow, fundingOf, loadTasksFor, logAudit, nowIso, runEscalations, useHierarchy, useWorkflow, wfStore, wid, type HierarchyLevel } from '@/data/workflow'
import { categoryFor, employeeCan, opsCan, saveLink, slaHoursFor, useComplaintLinks, usePermState } from './opsData'
import { selectCls } from './ui'
import { fmtDT } from './fmt'
import { apiEnabled, assignComplaintAsync, closeComplaintAsync, resolveComplaintAsync } from '@/data/complaintsApi'

const OPEN = new Set(['Pending', 'In Progress', 'Overdue'])

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1 text-[12px] leading-[18px]">
      <span className="text-muted">{k}</span>
      <span className="text-ink-2">{children}</span>
    </div>
  )
}

export function ComplaintWorkflowPanel({ c }: { c: Complaint }) {
  const links = useComplaintLinks()
  const wf = useWorkflow()
  // API mode: the backend creates / completes the complaint's tasks — show them here.
  useEffect(() => {
    if (apiEnabled) loadTasksFor(c.id).catch(() => undefined)
  }, [c.id, c.status, c.owner]) // eslint-disable-line react-hooks/exhaustive-deps
  const h = useHierarchy()
  const perms = usePermState()
  const { sites } = useSites()
  const link = links[c.id]
  const actor = actorName()
  const tasks = wf.tasks.filter((t) => t.refId === c.id)
  const openTask = tasks.find((t) => OPEN.has(t.status))
  const emails = wf.emails.filter((e) => e.refId === c.id)
  const audit = wf.audit.filter((a) => a.ref === c.id)
  const assignee = link ? h.employees.find((e) => e.id === link.assigneeId) : undefined
  const site = link?.siteId ? sites.find((s) => s.siteId === link.siteId) : undefined
  const cat = categoryFor(c.category, c.subcategory)
  const chain = chainFor(openTask?.assignedTo ?? link?.assigneeId)
  const staff = h.employees.filter((e) => e.status === 'Active' && ['Operations', 'Administration', 'Management'].includes(e.department))
  const [pick, setPick] = useState('')
  const [note, setNote] = useState('')
  const open = c.status === 'Open'
  const canAssign = opsCan('Complaint', 'Assign', perms)
  const canClose = opsCan('Complaint', 'Close', perms)
  const isAssignee = !!assignee && assignee.name === actor
  const resolved = !!link?.resolvedAt
  const vars = () => ({ Site_ID: site?.siteId ?? '—', ATM_ID: site?.atmId ?? c.atmId, Franchise_Name: site ? (getFranchise(site.frId)?.name ?? site.frId) : '—' })

  const assign = async (empId: string, why: string) => {
    const emp = h.employees.find((e) => e.id === empId)
    if (!emp) return
    if (apiEnabled) {
      // server assigns, creates the workflow task and sends COMPLAINT_ASSIGN
      try {
        await assignComplaintAsync(c, emp.name, why)
      } catch {
        return
      }
      const autoSite = link?.siteId ? site : siteByAtm(c.atmId)
      saveLink(c.id, { assigneeId: emp.id, slaHours: link?.slaHours ?? slaHoursFor(c.category, c.subcategory, c.priority), categoryCode: link?.categoryCode ?? cat?.code, ...(link?.siteId || !autoSite ? {} : { siteId: autoSite.siteId, frId: autoSite.frId, fundingModel: fundingOf(autoSite.siteType) }) }, `${why} → ${emp.name}`)
      setPick('')
      toast(`${c.id} assigned to ${emp.name}`)
      return
    }
    const autoSite = link?.siteId ? site : siteByAtm(c.atmId)
    const slaH = slaHoursFor(c.category, c.subcategory, c.priority)
    const task = emitWorkflow({
      module: 'Complaint',
      event: 'Assign',
      refId: c.id,
      vars: { ...vars(), Site_ID: autoSite?.siteId ?? '—', Current_Status: 'Assigned', Pending_Action: `Resolve complaint – ${c.title}` },
      nextAction: { title: `Resolve complaint ${c.id} · ${c.category} / ${c.subcategory}`, ownerId: emp.id, dueHours: slaH, priority: c.priority },
    })
    saveLink(
      c.id,
      { assigneeId: emp.id, taskId: task?.id, slaHours: link?.slaHours ?? slaH, categoryCode: link?.categoryCode ?? cat?.code, ...(link?.siteId || !autoSite ? {} : { siteId: autoSite.siteId, frId: autoSite.frId, fundingModel: fundingOf(autoSite.siteType) }) },
      `${why} → ${emp.name} · task ${task?.id ?? '—'}`,
    )
    updateComplaint(c.id, () => ({ owner: emp.name, subStatus: 'Assigned', lastAction: `Assigned to ${emp.name}` }), { title: `${why} · ${emp.name}`, meta: `${actor} · Workflow task ${task?.id ?? '—'} · email via COMPLAINT_ASSIGN` })
    setPick('')
    toast(`Task ${task?.id ?? ''} assigned to ${emp.name}`)
  }

  const escalate = () => {
    if (!openTask) return
    const level = Math.min(5, openTask.escalationLevel + 1) as HierarchyLevel
    const rcpt = chain[Math.min(level - 1, chain.length - 1)]
    const s = wfStore.get()
    const mailId = wid('EML')
    wfStore.set({
      ...s,
      tasks: s.tasks.map((t) => (t.id === openTask.id ? { ...t, escalationLevel: level, history: [...t.history, { at: nowIso(), by: actor, text: `Manually escalated to L${level}${rcpt ? ` (${rcpt.name})` : ''}` }], emailRefs: [...t.emailRefs, mailId] } : t)),
      emails: [{ id: mailId, at: nowIso(), templateCode: 'TASK_OVERDUE', templateVersion: 1, module: 'Complaint', refId: c.id, event: 'Overdue', to: rcpt ? [rcpt.email] : [], cc: [], subject: `Escalation L${level}: ${c.id} ${c.title}`, body: `Complaint ${c.id} escalated to L${level} by ${actor}.`, status: rcpt ? 'Sent' : 'Failed', taskId: openTask.id }, ...s.emails],
    })
    logAudit('Complaint', c.id, `Escalated to L${level}`, rcpt?.name)
    saveLink(c.id, {}, `Escalated via hierarchy to L${level}${rcpt ? ` · ${rcpt.name} (${rcpt.designation})` : ''}`)
    updateComplaint(c.id, () => ({ lastAction: `Escalated to L${level}` }), { title: `Hierarchy escalation L${level}`, meta: `${actor} · ${rcpt?.name ?? 'No recipient'} · email ${rcpt?.email ?? '—'}` })
    toast(`Escalated to L${level}${rcpt ? ` · ${rcpt.name}` : ''}`)
  }

  const checkOverdue = () => {
    const changed = runEscalations()
    toast(changed ? 'Overdue tasks escalated per escalation matrix' : 'No overdue tasks to escalate', changed ? 'success' : 'info')
  }

  const resolve = async () => {
    if (!note.trim()) return toast('Add a resolution note', 'info')
    const at = nowIso()
    if (apiEnabled) {
      try {
        await resolveComplaintAsync(c.id, { outcome: 'Resolved', note: note.trim() })
      } catch {
        return
      }
      saveLink(c.id, { resolvedBy: actor, resolvedAt: at, resolutionNote: note.trim() }, `Resolved by assigned employee: ${note.trim()}`)
      setNote('')
      return toast('Resolution recorded · awaiting closure by an authorized user')
    }
    const task = emitWorkflow({ module: 'Complaint', event: 'Submit', refId: c.id, vars: { ...vars(), Current_Status: 'Resolved', Pending_Action: 'Verify resolution & close' }, nextAction: { title: `Verify & close complaint ${c.id}`, ownerId: 'EMP-002', dueHours: 24, priority: c.priority } })
    saveLink(c.id, { resolvedBy: actor, resolvedAt: at, resolutionNote: note.trim(), taskId: task?.id }, `Resolved by assigned employee: ${note.trim()}`)
    updateComplaint(c.id, () => ({ subStatus: 'Resolved · awaiting closure', outcome: 'Resolved', proposedFix: note.trim(), lastAction: 'Resolved by assigned employee', redressalDate: at.slice(0, 10) }), { title: 'Resolution recorded', meta: `${actor} · ${note.trim()}` })
    setNote('')
    toast('Resolution recorded · closure task created for authorized user')
  }

  const close = async () => {
    const at = nowIso()
    if (apiEnabled) {
      try {
        if (!c.subStatus.startsWith('Resolved')) await resolveComplaintAsync(c.id, { outcome: 'Resolved', note: link?.resolutionNote ?? (note.trim() || 'Verified and closed') })
        await closeComplaintAsync(c.id, { hdValidation: true, frSignOff: true, note: note.trim() || undefined })
      } catch {
        return
      }
      saveLink(c.id, { closedBy: actor, closedAt: at, closureNote: note.trim() || 'Verified and closed' }, `Closed by authorized user${note.trim() ? `: ${note.trim()}` : ''}`)
      setNote('')
      return toast(`${c.id} closed`)
    }
    emitWorkflow({ module: 'Complaint', event: 'Close', refId: c.id, vars: { ...vars(), Current_Status: 'Closed' } })
    saveLink(c.id, { closedBy: actor, closedAt: at, closureNote: note.trim() || 'Verified and closed' }, `Closed by authorized user${note.trim() ? `: ${note.trim()}` : ''}`)
    updateComplaint(c.id, () => ({ status: 'Closed', subStatus: 'Resolved', closedAt: at, outcome: 'Resolved', outcomeDate: at.slice(0, 10), outcomeRemark: link?.resolutionNote ?? note.trim(), frSignOff: true, hdValidation: true, evidence: true, lastAction: 'Closed by authorized user' }), { title: 'Complaint closed', meta: `${actor} · Authorized closure` })
    setNote('')
    toast(`${c.id} closed`)
  }

  if (!link)
    return (
      <section id="c360-workflow" className="mb-4 scroll-mt-4 rounded-xl border border-line bg-white p-4">
        <h3 className="text-[14px] font-semibold text-ink">Operations workflow</h3>
        <p className="mt-1 text-[12px] text-muted">{apiEnabled ? 'Not assigned yet.' : 'This complaint was registered before the workflow integration.'} Assign it to a CRM / Field employee to create the task (due = category SLA {slaHoursFor(c.category, c.subcategory, c.priority)}h), send the assignment email and map it to Site Master{siteByAtm(c.atmId) ? '' : ' (no Site Master match for this ATM ID — map it from Create Complaint for new records)'}.</p>
        {canAssign && open ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <select aria-label="Assign to employee" className={selectCls} value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Select CRM / Field employee</option>
              {staff.map((e) => (
                <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>
              ))}
            </select>
            <Button disabled={!pick} onClick={() => assign(pick, 'Assigned via workflow')}>Assign & create task</Button>
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-amber-700">{open ? 'You need the Complaint “Assign” permission.' : 'Complaint is closed.'}</p>
        )}
      </section>
    )

  return (
    <section id="c360-workflow" className="mb-4 scroll-mt-4 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[14px] font-semibold text-ink">Operations workflow</h3>
        <Badge tone={!open ? 'green' : resolved ? 'purple' : openTask?.status === 'Overdue' ? 'red' : 'blue'} dot={false}>
          {!open ? 'Closed' : resolved ? 'Resolved · awaiting closure' : openTask ? `Task ${openTask.status}` : 'No open task'}
        </Badge>
        <span className="text-[11px] text-muted">Task Management + Email + Hierarchy (§12 / §14)</span>
        <span className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={checkOverdue}>Run escalation check</Button>
          {open && openTask && canAssign && <Button size="sm" variant="secondary" onClick={escalate}>Escalate via hierarchy</Button>}
        </span>
      </div>
      <div className="mt-3 grid gap-x-8 lg:grid-cols-2">
        <div>
          <Row k="Site Master">{site ? `${site.siteId} · ATM ${site.atmId} · ${getFranchise(site.frId)?.name ?? site.frId}` : link.siteId ?? 'Not mapped'}</Row>
          <Row k="Funding model">{link.fundingModel ?? '—'}</Row>
          <Row k="Category (master)">{link.categoryCode ?? cat?.code ?? '—'} · {c.category} / {c.subcategory}</Row>
          <Row k="SLA (category)">{link.slaHours}h for {c.priority} priority</Row>
          <Row k="Assigned to">{assignee ? `${assignee.name} · ${assignee.designation} · ${link.team} team` : link.assigneeId}</Row>
          <Row k="Workflow task">
            {openTask ? (
              <>
                <Link to="/tasks/my" className="font-medium text-primary hover:underline">{openTask.id}</Link> · {openTask.title} · due {fmtDT(openTask.dueAt)} · L{openTask.escalationLevel}
              </>
            ) : tasks[0] ? `${tasks[0].id} · ${tasks[0].status}` : '—'}
          </Row>
          <Row k="Escalation chain">{chain.length ? chain.map((e, i) => `L${i + 1} ${e.name}`).join(' → ') : '—'}</Row>
          <Row k="Evidence">{link.evidence.length ? link.evidence.map((e) => `${e.kind}: ${e.name}`).join(' · ') : 'None'}</Row>
          <Row k="Resolution">{resolved ? `${link.resolvedBy} · ${fmtDT(link.resolvedAt)} · ${link.resolutionNote}` : 'Pending (assigned employee only)'}</Row>
          <Row k="Closure">{link.closedAt ? `${link.closedBy} · ${fmtDT(link.closedAt)}` : 'Pending (authorized user only)'}</Row>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-ink">Emails ({emails.length})</div>
          <ul className="mt-1 space-y-1">
            {emails.slice(0, 5).map((e) => (
              <li key={e.id} className="text-[11.5px] text-ink-2">
                <span className={e.status === 'Sent' ? 'text-emerald-700' : 'text-red-700'}>{e.status}</span> · {e.subject} · to {e.to.join(', ') || '—'} · {fmtDT(e.at)}
              </li>
            ))}
            {emails.length === 0 && <li className="text-[11.5px] text-muted">No workflow emails.</li>}
          </ul>
          <div className="mt-3 text-[12px] font-semibold text-ink">Workflow audit</div>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
            {[...link.log.map((l) => ({ key: `l-${l.at}-${l.text}`, at: l.at, text: `${l.by} · ${l.text}` })), ...audit.map((a) => ({ key: a.id, at: a.at, text: `${a.by} · ${a.action}${a.detail ? ` · ${a.detail}` : ''}` }))]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((x) => (
                <li key={x.key} className="text-[11.5px] text-ink-2">{fmtDT(x.at)} · {x.text}</li>
              ))}
          </ul>
        </div>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 border-t border-line-soft pt-3 lg:grid-cols-2">
          <div>
            <div className="text-[12px] font-semibold text-ink">Reassign</div>
            {canAssign ? (
              <div className="mt-1.5 flex flex-wrap gap-2">
                <select aria-label="Reassign to" className={selectCls} value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Select employee</option>
                  {staff.filter((e) => e.id !== link.assigneeId).map((e) => (
                    <option key={e.id} value={e.id}>{e.name} · {e.designation}{employeeCan(e.id, 'Complaint', 'Process', perms) ? '' : ' (no Complaint permission)'}</option>
                  ))}
                </select>
                <Button size="sm" disabled={!pick} onClick={() => assign(pick, 'Reassigned')}>Reassign</Button>
              </div>
            ) : (
              <p className="mt-1 text-[11.5px] text-muted">Needs Complaint “Assign” permission.</p>
            )}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-ink">{resolved ? 'Closure (authorized user)' : 'Resolution (assigned employee)'}</div>
            <textarea aria-label="Resolution or closure note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={resolved ? 'Closure remark (optional)' : 'What was done to resolve the issue'} className="mt-1.5 w-full rounded-md border border-line px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary" />
            {!resolved ? (
              <>
                <Button size="sm" className="mt-1.5" disabled={!isAssignee} onClick={resolve}>Mark resolved</Button>
                {!isAssignee && <p className="mt-1 text-[11px] text-amber-700">Only the assigned employee ({assignee?.name ?? '—'}) can record the resolution. You are signed in as {actor}.</p>}
              </>
            ) : (
              <>
                <Button size="sm" className="mt-1.5" disabled={!canClose || link.resolvedBy === actor} onClick={close}>Verify & close</Button>
                {!canClose && <p className="mt-1 text-[11px] text-amber-700">Closure needs the Complaint “Close” permission (authorized user).</p>}
                {canClose && link.resolvedBy === actor && <p className="mt-1 text-[11px] text-amber-700">Maker-checker: the employee who resolved the complaint cannot close it.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
