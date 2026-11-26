// Centralized Workflow & Communication Engine (Operations spec §14, Project spec §8).
// One engine for every ERP module: an event → (task create/update) + (email template → resolved recipients
// from hierarchy) + in-app notification + logs. Mock only (localStorage); no real email is sent.
import { useEffect, useState } from 'react'
import { createStore } from '@/lib/store'
import { apiEnabled, get as apiGet, patch as apiPatch, post as apiPost } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { getSession } from '@/lib/auth'

export const nowIso = () => new Date().toISOString()
let seq = 0
export const wid = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`
export const actorName = () => getSession()?.name ?? 'System'

export type WfModule = 'Operations' | 'CBR' | 'Cash Loading' | 'ALF' | 'EOD' | 'WLA Statement' | 'TDS Letter' | 'Transaction Data' | 'Postal & Courier' | 'Reconciliation' | 'Complaint' | 'Projects' | 'Site Installation' | 'Onboarding' | 'Legal' | 'Finance' | 'Work Management' | 'Reports & MIS' | 'HRMS'
export const WF_MODULES: WfModule[] = ['Operations', 'CBR', 'Cash Loading', 'ALF', 'EOD', 'WLA Statement', 'TDS Letter', 'Transaction Data', 'Postal & Courier', 'Reconciliation', 'Complaint', 'Projects', 'Site Installation', 'Onboarding', 'Legal', 'Finance', 'Work Management', 'Reports & MIS', 'HRMS']
export type WfEvent = 'Submit' | 'Verify' | 'Approve' | 'Reject' | 'Return' | 'Pending' | 'Due' | 'Overdue' | 'Assign' | 'Close'
export const WF_EVENTS: WfEvent[] = ['Submit', 'Verify', 'Approve', 'Reject', 'Return', 'Pending', 'Due', 'Overdue', 'Assign', 'Close']
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

// ── Hierarchy & escalation (§14.2 / §8.3) ────────────────────────────────
export type HierarchyLevel = 0 | 1 | 2 | 3 | 4 | 5
export type Employee = { id: string; name: string; email: string; designation: string; department: string; reportsTo?: string; status: 'Active' | 'Exited'; replacedBy?: string; emailHistory: { email: string; from: string; to?: string }[] }
export type EscalationRule = { module: WfModule; level: HierarchyLevel; designation: string; afterHours: number }
export type HierarchyState = { employees: Employee[]; escalation: EscalationRule[]; moduleOwners: Partial<Record<WfModule, string>> }

const E = (id: string, name: string, designation: string, department: string, reportsTo?: string): Employee => ({
  id, name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@dexterindia.in`, designation, department, reportsTo, status: 'Active', emailHistory: [{ email: `${name.toLowerCase().replace(/\s+/g, '.')}@dexterindia.in`, from: '2025-04-01' }],
})
function seedHierarchy(): HierarchyState {
  const employees = [
    E('EMP-001', 'Paras Dubey', 'Super Admin / Management', 'Management'),
    E('EMP-002', 'Meera Iyer', 'Admin', 'Administration', 'EMP-001'),
    E('EMP-003', 'Vikram Mehta', 'Department Head', 'Operations', 'EMP-002'),
    E('EMP-004', 'Deepak Joshi', 'Team Leader', 'Operations', 'EMP-003'),
    E('EMP-005', 'Kiran Rao', 'CRM Executive', 'Operations', 'EMP-004'),
    E('EMP-006', 'Sunil Yadav', 'Operations Executive', 'Operations', 'EMP-004'),
    E('EMP-007', 'Priya Nair', 'Department Head', 'Finance', 'EMP-002'),
    E('EMP-008', 'Sanjay Gupta', 'Finance Executive', 'Finance', 'EMP-007'),
    E('EMP-009', 'Rohit Verma', 'Department Head', 'Projects', 'EMP-002'),
    E('EMP-010', 'Arjun Sethi', 'Project Executive', 'Projects', 'EMP-009'),
    E('EMP-011', 'Kavita Rao', 'Department Head', 'Legal', 'EMP-002'),
    E('EMP-012', 'Neha Sharma', 'Postal / Courier Executive', 'Administration', 'EMP-002'),
  ]
  employees[0].email = 'admin@dexterindia.com'
  employees[0].emailHistory = [{ email: 'admin@dexterindia.com', from: '2025-04-01' }]
  const levels: [HierarchyLevel, string, number][] = [[1, 'Assigned Executive', 0], [2, 'Team Leader / Manager', 24], [3, 'Department Head', 48], [4, 'Admin / Authorized Approver', 72], [5, 'Super Admin / Management', 120]]
  const escalation: EscalationRule[] = WF_MODULES.flatMap((m) => levels.map(([level, designation, afterHours]) => ({ module: m, level, designation, afterHours })))
  return {
    employees,
    escalation,
    moduleOwners: { CBR: 'EMP-005', 'Cash Loading': 'EMP-005', ALF: 'EMP-006', EOD: 'EMP-006', 'WLA Statement': 'EMP-005', 'TDS Letter': 'EMP-008', 'Transaction Data': 'EMP-005', 'Postal & Courier': 'EMP-012', Reconciliation: 'EMP-005', Complaint: 'EMP-006', Projects: 'EMP-010', 'Site Installation': 'EMP-010', Onboarding: 'EMP-005', Legal: 'EMP-011', Finance: 'EMP-008', Operations: 'EMP-006' },
  }
}
export const hierarchyStore = createStore<HierarchyState>('dexter.wf.hierarchy.v1', seedHierarchy)
export const useHierarchy = () => hierarchyStore.use()
export const employeeById = (id?: string) => (id ? hierarchyStore.get().employees.find((e) => e.id === id) : undefined)
/** Active employee for an id, following replacement on exit (§14.2 exit rule). */
export function activeEmployee(id?: string): Employee | undefined {
  let e = employeeById(id)
  let guard = 0
  while (e && e.status === 'Exited' && e.replacedBy && guard++ < 10) e = employeeById(e.replacedBy)
  return e && e.status === 'Active' ? e : undefined
}
/** Recipient chain L1..L5 for an owner (owner, then reportsTo upward). */
export function chainFor(ownerId?: string): Employee[] {
  const out: Employee[] = []
  let e = activeEmployee(ownerId)
  let guard = 0
  while (e && guard++ < 6) {
    out.push(e)
    e = activeEmployee(e.reportsTo)
  }
  return out
}
/** Employee exit: replacement takes over future mappings; history untouched (§14.2). */
export function exitEmployee(id: string, replacementId: string, reason: string) {
  hierarchyStore.set((h) => ({
    ...h,
    employees: h.employees.map((e) => (e.id === id ? { ...e, status: 'Exited', replacedBy: replacementId } : e.reportsTo === id ? { ...e, reportsTo: replacementId } : e)),
    moduleOwners: Object.fromEntries(Object.entries(h.moduleOwners).map(([m, o]) => [m, o === id ? replacementId : o])) as HierarchyState['moduleOwners'],
  }))
  wfStore.set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.assignedTo === id && t.status !== 'Completed' ? { ...t, assignedTo: replacementId, history: [...t.history, { at: nowIso(), by: actorName(), text: `Reassigned on employee exit (${reason})` }] } : t)) }))
  logAudit('Hierarchy', id, 'Employee exited / replaced', `${id} → ${replacementId}: ${reason}`)
}
export function changeEmployeeEmail(id: string, email: string) {
  const today = nowIso().slice(0, 10)
  hierarchyStore.set((h) => ({ ...h, employees: h.employees.map((e) => (e.id === id ? { ...e, email, emailHistory: [...e.emailHistory.map((x) => (x.to ? x : { ...x, to: today })), { email, from: today }] } : e)) }))
  logAudit('Hierarchy', id, 'Email ID changed', email)
}

// ── Email templates (§14.1 / §8.2) ───────────────────────────────────────
export type EmailTemplate = {
  code: string
  name: string
  module: WfModule
  event: WfEvent
  subject: string
  body: string
  to: 'Assigned Employee' | 'Hierarchy L1' | 'Hierarchy L2' | 'Hierarchy L3' | 'Approver' | 'Franchise'
  cc: string[]
  bcc: string[]
  escalationLevel: HierarchyLevel
  timing: 'Immediate' | 'Before due date' | 'On due date' | 'After overdue' | 'Scheduled'
  reminderEveryHours: number
  version: number
  status: 'Active' | 'Inactive'
  history: { version: number; at: string; by: string; subject: string }[]
}
export const TEMPLATE_VARS = ['{Module_Name}', '{Record_ID}', '{Site_ID}', '{ATM_ID}', '{Site_LOI_Number}', '{Franchise_Name}', '{Employee_Name}', '{Assigned_To}', '{Approver_Name}', '{Submission_Date}', '{Due_Date}', '{Pending_Days}', '{Current_Status}', '{Pending_Action}', '{Escalation_Level}', '{Portal_Link}', '{Task_ID}']
function seedTemplates(): EmailTemplate[] {
  const t = (code: string, module: WfModule, event: WfEvent, subject: string, to: EmailTemplate['to'], timing: EmailTemplate['timing'] = 'Immediate', level: HierarchyLevel = 1): EmailTemplate => ({
    code, name: `${module} – ${event}`, module, event, subject,
    body: `Dear {Assigned_To},\n\n{Module_Name} record {Record_ID} (Site {Site_ID} / ATM {ATM_ID}, {Franchise_Name}) is now "{Current_Status}".\nPending action: {Pending_Action}. Due: {Due_Date}.\n\nOpen: {Portal_Link}\n\nDexter India ERP`,
    to, cc: [], bcc: [], escalationLevel: level, timing, reminderEveryHours: timing === 'After overdue' ? 12 : 24, version: 1, status: 'Active', history: [{ version: 1, at: '2026-11-01T10:00:00.000Z', by: 'System', subject }],
  })
  return [
    t('CBR_SUBMIT', 'CBR', 'Submit', 'CBR {Record_ID} submitted for verification – {ATM_ID}', 'Assigned Employee'),
    t('CBR_VERIFY', 'CBR', 'Verify', 'CBR {Record_ID} verified – Admin approval pending', 'Approver'),
    t('CBR_APPROVE', 'CBR', 'Approve', 'CBR {Record_ID} approved & locked – {ATM_ID}', 'Hierarchy L1'),
    t('CL_SUBMIT', 'Cash Loading', 'Submit', 'Cash Loading {Record_ID} submitted – {ATM_ID}', 'Assigned Employee'),
    t('CL_APPROVE', 'Cash Loading', 'Approve', 'Cash Loading {Record_ID} approved – {ATM_ID}', 'Hierarchy L1'),
    t('ALF_VERIFY', 'ALF', 'Verify', 'ALF request {Record_ID} verified – disbursement email', 'Approver'),
    t('EOD_DOCKET', 'EOD', 'Verify', 'EOD docket {Record_ID} generated – {ATM_ID}', 'Hierarchy L1'),
    t('EOD_SUBMIT', 'EOD', 'Submit', 'EOD request {Record_ID} raised – {ATM_ID}', 'Assigned Employee'),
    t('WLA_SUBMIT', 'WLA Statement', 'Submit', 'WLA statement uploaded – {Franchise_Name}', 'Assigned Employee'),
    t('DISPUTE_APPROVE', 'Reconciliation', 'Approve', 'Dispute {Record_ID} approved – sent to bank', 'Hierarchy L1'),
    t('CHARGEBACK_PENDING', 'Reconciliation', 'Pending', 'Chargeback {Record_ID}: franchise response due within 24 hours', 'Franchise', 'Scheduled'),
    t('COMPLAINT_ASSIGN', 'Complaint', 'Assign', 'Complaint {Record_ID} assigned to you – {Site_ID}', 'Assigned Employee'),
    t('INSTALL_SUBMIT', 'Site Installation', 'Submit', 'Site {Site_LOI_Number} submitted for Admin approval', 'Approver'),
    t('INSTALL_REJECT', 'Site Installation', 'Reject', 'Site {Site_LOI_Number} returned for correction', 'Assigned Employee'),
    t('INSTALL_APPROVE', 'Site Installation', 'Approve', 'Site {Site_LOI_Number} installation approved', 'Hierarchy L1'),
    t('TASK_OVERDUE', 'Work Management', 'Overdue', 'Overdue: {Task_ID} pending {Pending_Days} day(s) – escalation L{Escalation_Level}', 'Hierarchy L1', 'After overdue', 2),
    t('TASK_ASSIGN', 'Work Management', 'Assign', 'Task {Record_ID} assigned to you – due {Due_Date}', 'Assigned Employee'),
    t('LEGAL_SUBMIT', 'Legal', 'Submit', 'Legal document {Record_ID} uploaded – verification pending ({Site_ID})', 'Assigned Employee'),
    t('LEGAL_APPROVE', 'Legal', 'Approve', 'Legal document {Record_ID} verified – {Site_ID}', 'Hierarchy L1'),
    t('LEGAL_REJECT', 'Legal', 'Reject', 'Legal document {Record_ID} rejected – re-upload required ({Site_ID})', 'Assigned Employee'),
    t('FIN_SUBMIT', 'Finance', 'Submit', 'Finance record {Record_ID} submitted for approval', 'Approver'),
    t('FIN_APPROVE', 'Finance', 'Approve', 'Finance record {Record_ID} approved', 'Hierarchy L1'),
    t('FIN_REJECT', 'Finance', 'Reject', 'Finance record {Record_ID} rejected – correction required', 'Assigned Employee'),
    t('HRMS_SUBMIT', 'HRMS', 'Submit', 'HR request {Record_ID} submitted for approval', 'Approver'),
    t('HRMS_APPROVE', 'HRMS', 'Approve', 'HR request {Record_ID} approved', 'Assigned Employee'),
    t('HRMS_REJECT', 'HRMS', 'Reject', 'HR request {Record_ID} rejected', 'Assigned Employee'),
    t('ONB_SUBMIT', 'Onboarding', 'Submit', 'Onboarding {Record_ID} submitted – review pending', 'Approver'),
    t('ONB_APPROVE', 'Onboarding', 'Approve', 'Onboarding {Record_ID} approved', 'Hierarchy L1'),
    // Generic fallbacks: used when a module has no template of its own for an event (so no event goes without an email).
    ...WF_EVENTS.map((ev) => ({ ...t(`GENERIC_${ev.toUpperCase()}`, 'Operations', ev, `{Module_Name} {Record_ID}: ${ev.toLowerCase()} – {Current_Status}`, ev === 'Approve' || ev === 'Close' ? 'Hierarchy L1' : ev === 'Submit' || ev === 'Verify' ? 'Approver' : 'Assigned Employee', ev === 'Overdue' ? 'After overdue' : ev === 'Due' ? 'On due date' : 'Immediate'), name: `Generic – ${ev}` })),
  ]
}
export const templateStore = createStore<EmailTemplate[]>('dexter.wf.templates.v2', seedTemplates)
export const useTemplates = () => templateStore.use()

// ── Tasks, email log, notifications (§14.3 / §14.4) ──────────────────────
export type WfTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled'
export type WfTask = {
  id: string
  module: WfModule
  refId: string
  siteId?: string
  atmId?: string
  title: string
  assignedTo: string // employee id
  assignedBy: string
  createdAt: string
  dueAt: string
  priority: Priority
  status: WfTaskStatus
  escalationLevel: HierarchyLevel
  remarks?: string
  completedAt?: string
  emailRefs: string[]
  history: { at: string; by: string; text: string }[]
}
export type EmailLog = { id: string; at: string; templateCode: string; templateVersion: number; module: WfModule; refId: string; event: WfEvent; to: string[]; cc: string[]; subject: string; body: string; status: 'Sent' | 'Failed' | 'Pending'; taskId?: string }
export type Notice = { id: string; at: string; to: string; channel: 'In-app' | 'Mobile push' | 'Email'; module: WfModule; refId: string; text: string; read: boolean }
export type WfAudit = { id: string; at: string; by: string; area: string; ref: string; action: string; detail?: string }
export type WfState = { tasks: WfTask[]; emails: EmailLog[]; notices: Notice[]; audit: WfAudit[] }
export const wfStore = createStore<WfState>('dexter.wf.state.v1', () => ({ tasks: [], emails: [], notices: [], audit: [] }))
export const useWorkflow = () => wfStore.use()

export function logAudit(area: string, ref: string, action: string, detail?: string) {
  wfStore.set((s) => ({ ...s, audit: [{ id: wid('WAU'), at: nowIso(), by: actorName(), area, ref, action, detail }, ...s.audit].slice(0, 3000) }))
}

export type RecordVars = Partial<Record<'Record_ID' | 'Site_ID' | 'ATM_ID' | 'Site_LOI_Number' | 'Franchise_Name' | 'Current_Status' | 'Pending_Action' | 'Approver_Name' | 'Due_Date', string>>
const fill = (txt: string, vars: Record<string, string>) => txt.replace(/\{([A-Za-z_]+)\}/g, (m, k) => vars[k] ?? m)

/**
 * Fire a workflow event. Creates/updates a task for the next action, sends the active template's email
 * to the resolved recipients (hierarchy-based, never hard-coded), adds in-app notifications and logs.
 * `nextAction` = what is now pending and for whom (omit to just complete the open task for refId).
 */
export function emitWorkflow(input: {
  module: WfModule
  event: WfEvent
  refId: string
  vars?: RecordVars
  nextAction?: { title: string; ownerId?: string; dueHours?: number; priority?: Priority }
  franchiseEmail?: string
}) {
  const { module, event, refId, vars = {} } = input
  const state = wfStore.get()
  const h = hierarchyStore.get()
  // 1) close the open task of this record (business action done)
  const open = state.tasks.filter((t) => t.refId === refId && (t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Overdue'))
  let tasks = state.tasks.map((t) => (open.includes(t) ? { ...t, status: 'Completed' as const, completedAt: nowIso(), history: [...t.history, { at: nowIso(), by: actorName(), text: `Completed by ${event}` }] } : t))
  // 2) create the next task
  let task: WfTask | undefined
  if (input.nextAction) {
    const ownerId = input.nextAction.ownerId ?? h.moduleOwners[module] ?? 'EMP-002'
    const owner = activeEmployee(ownerId)
    const due = new Date(Date.now() + (input.nextAction.dueHours ?? 24) * 3600_000).toISOString()
    task = {
      id: wid('TSK'), module, refId, siteId: vars.Site_ID, atmId: vars.ATM_ID, title: input.nextAction.title, assignedTo: owner?.id ?? ownerId, assignedBy: actorName(),
      createdAt: nowIso(), dueAt: due, priority: input.nextAction.priority ?? 'Medium', status: 'Pending', escalationLevel: 1, emailRefs: [], history: [{ at: nowIso(), by: actorName(), text: `Created on ${event}` }],
    }
    tasks = [task, ...tasks]
  }
  // 3) email via active template + hierarchy recipients
  const tpls = templateStore.get()
  const tpl =
    tpls.find((t) => t.module === module && t.event === event && t.status === 'Active' && !t.code.startsWith('GENERIC_')) ??
    tpls.find((t) => t.code === `GENERIC_${event.toUpperCase()}` && t.status === 'Active')
  const emails = [...state.emails]
  const notices = [...state.notices]
  if (tpl) {
    const assignee = task ? activeEmployee(task.assignedTo) : activeEmployee(h.moduleOwners[module])
    const chain = chainFor(assignee?.id)
    const pick = (to: EmailTemplate['to']): string[] => {
      if (to === 'Franchise') return [input.franchiseEmail ?? 'franchise@partner.example']
      if (to === 'Approver') return [activeEmployee('EMP-002')?.email ?? '']
      if (to === 'Assigned Employee') return assignee ? [assignee.email] : []
      const idx = to === 'Hierarchy L1' ? 0 : to === 'Hierarchy L2' ? 1 : 2
      return chain[idx] ? [chain[idx].email] : assignee ? [assignee.email] : []
    }
    const all: Record<string, string> = {
      Module_Name: module, Record_ID: refId, Site_ID: vars.Site_ID ?? '—', ATM_ID: vars.ATM_ID ?? '—', Site_LOI_Number: vars.Site_LOI_Number ?? vars.Site_ID ?? '—', Franchise_Name: vars.Franchise_Name ?? '—',
      Employee_Name: actorName(), Assigned_To: assignee?.name ?? '—', Approver_Name: vars.Approver_Name ?? activeEmployee('EMP-002')?.name ?? '—', Submission_Date: new Date().toLocaleDateString('en-IN'),
      Due_Date: task ? new Date(task.dueAt).toLocaleString('en-IN') : vars.Due_Date ?? '—', Current_Status: vars.Current_Status ?? event, Pending_Action: vars.Pending_Action ?? task?.title ?? '—',
      Escalation_Level: String(task?.escalationLevel ?? 1), Portal_Link: `${location.origin}/`, Task_ID: task?.id ?? '—', Pending_Days: '0',
    }
    const to = pick(tpl.to).filter(Boolean)
    const mail: EmailLog = { id: wid('EML'), at: nowIso(), templateCode: tpl.code, templateVersion: tpl.version, module, refId, event, to, cc: tpl.cc, subject: fill(tpl.subject, all), body: fill(tpl.body, all), status: to.length ? 'Sent' : 'Failed', taskId: task?.id }
    emails.unshift(mail)
    if (task) task.emailRefs.push(mail.id)
    to.forEach((addr) => notices.unshift({ id: wid('NTF'), at: nowIso(), to: addr, channel: 'In-app', module, refId, text: mail.subject, read: false }))
  }
  wfStore.set({ ...state, tasks, emails: emails.slice(0, 3000), notices: notices.slice(0, 3000), audit: [{ id: wid('WAU'), at: nowIso(), by: actorName(), area: module, ref: refId, action: `Workflow event: ${event}`, detail: task ? `Task ${task.id} → ${task.assignedTo}` : undefined }, ...state.audit].slice(0, 3000) })
  return task
}

/** Scan open tasks: mark overdue, escalate to the next hierarchy level and send reminder emails (§14.4). */
export function runEscalations(now = Date.now()) {
  const s = wfStore.get()
  let changed = false
  const emails = [...s.emails]
  const tasks = s.tasks.map((t) => {
    if (t.status === 'Completed' || t.status === 'Cancelled') return t
    if (new Date(t.dueAt).getTime() > now) return t
    const hoursLate = (now - new Date(t.dueAt).getTime()) / 3600_000
    const rules = hierarchyStore.get().escalation.filter((r) => r.module === t.module).sort((a, b) => a.level - b.level)
    const target = rules.filter((r) => r.level > 1 && hoursLate >= r.afterHours - 24).pop()
    const level = Math.max(t.escalationLevel, target?.level ?? 2) as HierarchyLevel
    if (t.status === 'Overdue' && level === t.escalationLevel) return t
    changed = true
    const chain = chainFor(t.assignedTo)
    const rcpt = chain[Math.min(level - 1, chain.length - 1)]
    emails.unshift({ id: wid('EML'), at: nowIso(), templateCode: 'TASK_OVERDUE', templateVersion: 1, module: t.module, refId: t.refId, event: 'Overdue', to: rcpt ? [rcpt.email] : [], cc: [], subject: `Overdue: ${t.id} ${t.title} – escalation L${level}`, body: `Task ${t.id} is overdue.`, status: rcpt ? 'Sent' : 'Failed', taskId: t.id })
    return { ...t, status: 'Overdue' as const, escalationLevel: level, history: [...t.history, { at: nowIso(), by: 'System', text: `Overdue → escalated to L${level}${rcpt ? ` (${rcpt.name})` : ''}` }] }
  })
  if (changed) wfStore.set({ ...s, tasks, emails })
  return changed
}

// ── Common status & audit fields (Operations §18) ────────────────────────
export type OpsStatus = 'Draft' | 'Submitted' | 'Pending Verification' | 'Returned for Correction' | 'Verified' | 'Pending Approval' | 'Approved' | 'Rejected' | 'In Progress' | 'Overdue' | 'Resolved' | 'Closed' | 'Locked'
export const OPS_STATUSES: OpsStatus[] = ['Draft', 'Submitted', 'Pending Verification', 'Returned for Correction', 'Verified', 'Pending Approval', 'Approved', 'Rejected', 'In Progress', 'Overdue', 'Resolved', 'Closed', 'Locked']
export type AuditTrail = {
  createdBy: string
  createdAt: string
  submittedBy?: string
  submittedAt?: string
  verifiedBy?: string
  verifiedAt?: string
  approvedBy?: string
  approvedAt?: string
  returnedBy?: string
  returnReason?: string
  modifications: { at: string; by: string; field: string; oldValue: string; newValue: string; reason: string }[]
  documents: { at: string; by: string; name: string; action: 'Uploaded' | 'Replaced' | 'Deleted' }[]
  acknowledgement?: { text: string; version: string; lang: 'Hindi' | 'English'; at: string; by: string }
  taskRefs: string[]
}
export const newTrail = (): AuditTrail => ({ createdBy: actorName(), createdAt: nowIso(), modifications: [], documents: [], taskRefs: [] })
/** Maker-checker (Operations §1.2 / §19): the submitter can never verify / approve their own record. */
export const isOwnRecord = (t: AuditTrail) => [t.createdBy, t.submittedBy].includes(actorName())

/** Bilingual acknowledgement (Operations §2.2) — versioned text stored with each submission. */
export const ACK_VERSION = 'ACK-v1.0'
export const ACK_TEXT = {
  English: 'I confirm that I have entered and verified this data myself and that it is true and correct to the best of my knowledge.',
  Hindi: 'मैं पुष्टि करता/करती हूँ कि यह डेटा मैंने स्वयं भरा और सत्यापित किया है तथा यह मेरी जानकारी के अनुसार सही और सत्य है।',
}

// ── Funding model (Operations §3.2 / §19.1) — CBR (Full Funding) and Cash Loading (Self Funding) never mix ──
export type FundingModel = 'Full Funding' | 'Self Funding' | 'Business Model' | 'CRA'
export const fundingOf = (siteType?: string): FundingModel => (siteType === 'FFM' ? 'Full Funding' : siteType === 'SF' ? 'Self Funding' : siteType === 'BM' ? 'Business Model' : 'CRA')

// ── Address master (Operations §10.1) ────────────────────────────────────
export type Address = { id: string; name: string; organization: string; line1: string; city: string; state: string; pin: string; phone: string; tags: string[]; updatedAt: string; history: { at: string; by: string; snapshot: string }[] }
export const addressStore = createStore<Address[]>('dexter.wf.addresses.v1', () => [
  { id: 'ADR-001', name: 'Nodal Officer', organization: 'Axis Bank – Currency Chest', line1: 'Sector 18', city: 'Noida', state: 'Uttar Pradesh', pin: '201301', phone: '0120-4000000', tags: ['Bank'], updatedAt: '2026-10-01', history: [] },
  { id: 'ADR-002', name: 'Disputes Cell', organization: 'NPCI', line1: 'Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra', pin: '400051', phone: '022-40000000', tags: ['NPCI'], updatedAt: '2026-10-01', history: [] },
  { id: 'ADR-003', name: 'Legal Head', organization: 'Dexter India – Head Office', line1: 'A-12, Sector 63', city: 'Noida', state: 'Uttar Pradesh', pin: '201309', phone: '0120-4111111', tags: ['Internal'], updatedAt: '2026-10-01', history: [] },
])
export const useAddresses = () => addressStore.use()
export const addressSnapshot = (a: Address) => `${a.name}, ${a.organization}, ${a.line1}, ${a.city}, ${a.state} - ${a.pin} (${a.phone})`

// ── Configurable checklists (Project spec §5.5 "can be modified from setup") ──
export type ChecklistItem = { key: string; label: string; statuses: string[]; photos: 'Multiple' | 'Optional' | 'None'; mandatory: boolean; active: boolean }
export type ChecklistConfig = { readiness: ChecklistItem[]; equipment: ChecklistItem[] }
const CK = (key: string, label: string, statuses: string[], photos: ChecklistItem['photos'] = 'Multiple', mandatory = true): ChecklistItem => ({ key, label, statuses, photos, mandatory, active: true })
export const checklistStore = createStore<ChecklistConfig>('dexter.wf.checklists.v1', () => ({
  readiness: ['TIS Status', 'Electrical Work', 'DB Box', 'Signage Board', 'Lollypop', 'Grouting', 'Monkey Cage', 'Hitachi Branding'].map((l) => CK(l.toLowerCase().replace(/\W+/g, '_'), l, ['Complete', 'Pending', 'N/A'])),
  equipment: [
    CK('atm_type', 'ATM Machine Type', ['Delivered', 'Pending']),
    CK('atm_installed', 'ATM Machine', ['Installed', 'Pending']),
    CK('it', 'Isolation Transformer (IT)', ['Done', 'Pending']),
    CK('stabilizer', 'Stabilizer', ['Done', 'Pending']),
    CK('ups', 'UPS', ['Done', 'Pending']),
    CK('battery', 'Battery', ['Delivered', 'Pending']),
    CK('battery_cage', 'Battery Cage', ['Done', 'Pending']),
    CK('camera', 'Camera', ['Done', 'Pending']),
    CK('dvr', 'DVR', ['Done', 'Pending']),
    CK('vsat', 'V-SAT / Router', ['Installed', 'Pending']),
    CK('vsat_company', 'V-SAT / Router Company', ['Company name', 'N/A'], 'Optional', false),
  ],
}))
export const useChecklists = () => checklistStore.use()

// ── Operations notification schedule (chargeback reminders etc., §11.2) ──
export type NotifySchedule = { key: string; label: string; perDay: number; times: string[] }
export const scheduleStore = createStore<NotifySchedule[]>('dexter.wf.schedules.v1', () => [
  { key: 'chargeback_franchise', label: 'Chargeback – Franchise response reminders (within 24 h)', perDay: 3, times: ['10:00', '14:00', '18:00'] },
  { key: 'chargeback_crm', label: 'Chargeback – CRM Operations verification reminders', perDay: 2, times: ['11:00', '17:00'] },
])
export const useSchedules = () => scheduleStore.use()

// ── API mode (backend /employees, /workflow, /notifications) ─────────────
// Stores keep their shapes; `loadWorkflowSetup()` hydrates hierarchy + config, templates, tasks, email log
// and notifications. Setup pages call the `wfApi` mutations, which reload the slice they changed.
// `emitWorkflow` stays local: in API mode the backend modules emit their own workflow events on every
// business action, so posting again from the browser would duplicate tasks and emails.
type ApiEmployee = { employeeId: string; name: string; email: string; designation: string; department: string; reportsTo?: string; status: 'Active' | 'Exited'; replacedBy?: string; emailHistory?: Employee['emailHistory'] }
type ApiTask = Omit<WfTask, 'id' | 'escalationLevel'> & { taskId: string; escalationLevel: number }
type ApiEmail = Omit<EmailLog, 'id' | 'module' | 'event'> & { emailId: string; module: string; event: string }
type ApiNotice = { notificationId: string; at: string; to: string; channel: Notice['channel']; module: string; refId: string; text: string; read: boolean }
const toEmployee = (e: ApiEmployee): Employee => ({ id: e.employeeId, name: e.name, email: e.email, designation: e.designation, department: e.department, reportsTo: e.reportsTo, status: e.status, replacedBy: e.replacedBy, emailHistory: e.emailHistory ?? [] })
const toTask = (t: ApiTask): WfTask => ({ ...t, id: t.taskId, escalationLevel: t.escalationLevel as HierarchyLevel, emailRefs: t.emailRefs ?? [], history: t.history ?? [] })
const toEmail = (m: ApiEmail): EmailLog => ({ ...m, id: m.emailId, module: m.module as WfModule, event: m.event as WfEvent, cc: m.cc ?? [] })
const toNotice = (n: ApiNotice): Notice => ({ id: n.notificationId, at: n.at, to: n.to, channel: n.channel, module: n.module as WfModule, refId: n.refId, text: n.text, read: n.read })
const L200 = { limit: 200 }

export async function loadHierarchy() {
  if (!apiEnabled) return
  const [emps, cfg] = await Promise.all([
    // roles without Users / View get 403 on /employees → fall back to the staff people picker (Active, minimal fields)
    apiGet<{ items: ApiEmployee[] }>('/employees', L200).catch(() =>
      apiGet<{ items: Omit<ApiEmployee, 'email' | 'status'>[] }>('/employees/picker', { limit: 500 }).then((r) => ({ items: r.items.map((e) => ({ ...e, email: '', status: 'Active' as const })) })),
    ),
    apiGet<{ escalation?: EscalationRule[]; moduleOwners?: HierarchyState['moduleOwners'] }>('/workflow/config').catch(() => null),
  ])
  hierarchyStore.set((h) => ({ employees: emps.items.map(toEmployee), escalation: cfg?.escalation ?? h.escalation, moduleOwners: cfg?.moduleOwners ?? h.moduleOwners }))
}
export async function loadTemplates() {
  if (!apiEnabled) return
  const r = await apiGet<{ items: EmailTemplate[] }>('/workflow/templates', L200)
  // the list leaves out version history; keep any history already loaded for a template
  templateStore.set((cur) => r.items.map((t) => ({ ...t, cc: t.cc ?? [], bcc: t.bcc ?? [], history: t.history ?? cur.find((c) => c.code === t.code)?.history ?? [] })))
}
export async function loadTemplateHistory(code: string) {
  if (!apiEnabled) return
  const t = await apiGet<EmailTemplate>(`/workflow/templates/${encodeURIComponent(code)}`)
  templateStore.set((list) => list.map((x) => (x.code === t.code ? { ...x, ...t, history: t.history ?? x.history } : x)))
}
export async function loadTasks() {
  if (!apiEnabled) return
  const r = await apiGet<{ items: ApiTask[] }>('/workflow/tasks', { ...L200, sort: '-createdAt' })
  wfStore.set((s) => ({ ...s, tasks: r.items.map(toTask) }))
}
/** Tasks of one record (e.g. a complaint) from the server, merged into the store. */
export async function loadTasksFor(refId: string) {
  if (!apiEnabled) return
  const r = await apiGet<{ items: ApiTask[] }>('/workflow/tasks', { refId, limit: 50, sort: '-createdAt' })
  const mine = r.items.map(toTask)
  wfStore.set((s) => ({ ...s, tasks: [...mine, ...s.tasks.filter((t) => t.refId !== refId)] }))
}
export async function loadEmails() {
  if (!apiEnabled) return
  const r = await apiGet<{ items: ApiEmail[] }>('/workflow/emails', L200)
  wfStore.set((s) => ({ ...s, emails: r.items.map(toEmail) }))
}
export async function loadNotices() {
  if (!apiEnabled) return
  const r = await apiGet<{ items: ApiNotice[] }>('/notifications', L200)
  wfStore.set((s) => ({ ...s, notices: r.items.map(toNotice) }))
}
export async function loadWorkflowAudit() {
  if (!apiEnabled) return
  type A = { _id: string; at: string; actor?: { name?: string }; entity: string; ref: string; action: string; detail?: string }
  const r = await apiGet<{ items: A[] }>('/audit', { category: 'workflow', ...L200, sort: '-at' })
  wfStore.set((s) => ({ ...s, audit: r.items.map((a) => ({ id: a._id, at: a.at, by: a.actor?.name ?? 'System', area: a.entity, ref: a.ref, action: a.action, detail: a.detail })) }))
}

type Slice = 'hierarchy' | 'templates' | 'tasks' | 'emails' | 'notices' | 'audit'
const LOADERS: Record<Slice, () => Promise<void>> = { hierarchy: loadHierarchy, templates: loadTemplates, tasks: loadTasks, emails: loadEmails, notices: loadNotices, audit: loadWorkflowAudit }
/** Page hook: hydrate the listed slices once per mount (API mode). */
export function useWorkflowLoad(slices: Slice[]) {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: apiEnabled, error: null })
  const key = slices.join(',')
  useEffect(() => {
    if (!apiEnabled) return
    let alive = true
    Promise.allSettled(slices.map((s) => LOADERS[s]())).then((res) => {
      const bad = res.find((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (!alive) return
      setState({ loading: false, error: bad ? (bad.reason as Error)?.message ?? 'Load failed' : null })
      if (bad) toast((bad.reason as Error)?.message || 'Could not load workflow data.', 'error')
    })
    return () => {
      alive = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

const fail = (e: Error) => {
  toast(e.message || 'The server rejected the change.', 'error')
}
/** Backend mutations used by the Setup › Workflow pages (API mode). Resolve true on success. */
export const wfApi = {
  saveEmployee: (id: string, body: { reportsTo?: string | null; designation?: string; email?: string; reason?: string }) =>
    apiPatch(`/employees/${encodeURIComponent(id)}`, body).then(loadHierarchy).then(() => true, (e: Error) => (fail(e), false)),
  exitEmployee: (id: string, replacementId: string, reason: string) =>
    apiPost(`/employees/${encodeURIComponent(id)}/exit`, { replacementId, reason }).then(() => Promise.all([loadHierarchy(), loadTasks()])).then(() => true, (e: Error) => (fail(e), false)),
  saveConfig: (body: { moduleOwners?: HierarchyState['moduleOwners']; escalation?: EscalationRule[] }) =>
    apiPatch('/workflow/config', body).then(loadHierarchy).then(() => true, (e: Error) => (fail(e), false)),
  saveTemplate: (t: EmailTemplate, isNew: boolean) => {
    const common = { name: t.name, subject: t.subject, body: t.body, to: t.to, cc: t.cc.filter((c) => c.includes('@')), bcc: t.bcc.filter((c) => c.includes('@')), escalationLevel: t.escalationLevel, timing: t.timing, reminderEveryHours: t.reminderEveryHours }
    const p = isNew ? apiPost('/workflow/templates', { ...common, code: t.code, module: t.module, event: t.event }) : apiPatch(`/workflow/templates/${encodeURIComponent(t.code)}`, common)
    return p.then(loadTemplates).then(() => true, (e: Error) => (fail(e), false))
  },
  setTemplateStatus: (code: string, status: 'Active' | 'Inactive') =>
    apiPost(`/workflow/templates/${encodeURIComponent(code)}/status`, { status }).then(loadTemplates).then(() => true, (e: Error) => (fail(e), false)),
  restoreTemplate: (code: string, version: number) =>
    apiPost(`/workflow/templates/${encodeURIComponent(code)}/restore`, { version }).then(loadTemplates).then(() => true, (e: Error) => (fail(e), false)),
  startTask: (id: string) => apiPatch(`/workflow/tasks/${encodeURIComponent(id)}`, { status: 'In Progress' }).then(loadTasks).then(() => true, (e: Error) => (fail(e), false)),
  assignTask: (id: string, assignedTo: string) => apiPost(`/workflow/tasks/${encodeURIComponent(id)}/assign`, { assignedTo }).then(loadTasks).then(() => true, (e: Error) => (fail(e), false)),
  completeTask: (id: string, remarks: string) => apiPost(`/workflow/tasks/${encodeURIComponent(id)}/complete`, { remarks }).then(loadTasks).then(() => true, (e: Error) => (fail(e), false)),
  runEscalations: () => apiPost<{ escalated?: number }>('/workflow/escalations/run').then((r) => loadTasks().then(() => r?.escalated ?? 0)),
  markNoticesRead: (ids: string[]) => Promise.all(ids.map((id) => apiPost(`/notifications/${encodeURIComponent(id)}/read`))).then(loadNotices).catch(fail),
}
