// Operations Intelligence data layer (Operations spec §12, §13, §15, §17).
// Own stores only — every other module's data is read, never written, except through the shared
// workflow engine (emitWorkflow / wfStore) and the complaint store helpers.
import { createStore } from '@/lib/store'
import { can, currentRole, type Action, type Role } from '@/lib/rbac'
import { CATEGORIES, DEPARTMENT_FOR, PRIORITIES, SLA_HOURS, type Department, type Priority } from '@/data/complaints'
import { actorName, hierarchyStore, nowIso, wid } from '@/data/workflow'
import { api, get, post, put } from '@/lib/api'
import { apiEnabled, apiCall, createLoader } from '@/data/opsApi'

// ── Complaint Master (§12 "Configured Complaint Master") ─────────────────
export type AssignTeam = 'CRM' | 'Field'
export type ComplaintCategory = {
  code: string
  category: string
  subcategory: string
  department: Department
  team: AssignTeam
  defaultAssignee: string // hierarchy employee id
  sla: Record<Priority, number> // resolution hours per priority
  defaultPriority: Priority
  active: boolean
  updatedAt: string
  updatedBy: string
}
const FIELD_CATS = new Set(['Cash dispenser', 'Card reader', 'Cooling & environment'])
function seedCategories(): ComplaintCategory[] {
  let n = 0
  return Object.entries(CATEGORIES).flatMap(([category, subs]) =>
    subs.map((subcategory) => {
      const team: AssignTeam = FIELD_CATS.has(category) ? 'Field' : 'CRM'
      n += 1
      return {
        code: `CC-${String(n).padStart(3, '0')}`,
        category,
        subcategory,
        department: DEPARTMENT_FOR[category] ?? 'HD Team',
        team,
        defaultAssignee: team === 'Field' ? 'EMP-006' : 'EMP-005',
        sla: { ...SLA_HOURS },
        defaultPriority: category === 'Cash dispenser' || category === 'Power & UPS' ? 'High' : 'Medium',
        active: true,
        updatedAt: '2026-11-01T10:00:00.000Z',
        updatedBy: 'System',
      }
    }),
  )
}
export const complaintMasterStore = createStore<ComplaintCategory[]>('dexter.ops.complaintMaster.v1', seedCategories)
export const useComplaintMaster = () => complaintMasterStore.use()
export const issueKey = (c: Pick<ComplaintCategory, 'category' | 'subcategory'>) => `${c.category} / ${c.subcategory}`
export const categoryFor = (category: string, subcategory: string) => complaintMasterStore.get().find((c) => c.category === category && c.subcategory === subcategory)
export const slaHoursFor = (category: string, subcategory: string, p: Priority) => categoryFor(category, subcategory)?.sla[p] ?? SLA_HOURS[p]

// ── Complaint ↔ workflow link (site master mapping, assignment, evidence, resolution, closure) ──
export type EvidenceKind = 'Photo' | 'Video' | 'PDF'
export type ComplaintLink = {
  complaintId: string
  siteId?: string // Site Master reference
  frId?: string
  fundingModel?: string
  categoryCode?: string
  slaHours: number
  team: AssignTeam
  assigneeId: string
  evidence: { name: string; kind: EvidenceKind; size: number }[]
  taskId?: string
  resolvedBy?: string
  resolvedAt?: string
  resolutionNote?: string
  closedBy?: string
  closedAt?: string
  closureNote?: string
  log: { at: string; by: string; text: string }[]
}
export const complaintLinkStore = createStore<Record<string, ComplaintLink>>('dexter.ops.complaintLinks.v1', () => ({}))
export const useComplaintLinks = () => complaintLinkStore.use()
export function saveLink(id: string, patch: Partial<ComplaintLink>, logText?: string) {
  complaintLinkStore.set((m) => {
    const prev = m[id] ?? { complaintId: id, slaHours: 72, team: 'CRM' as AssignTeam, assigneeId: 'EMP-005', evidence: [], log: [] }
    const log = logText ? [...prev.log, { at: nowIso(), by: actorName(), text: logText }] : prev.log
    return { ...m, [id]: { ...prev, ...patch, log } }
  })
}
export const evidenceKind = (name: string): EvidenceKind | null =>
  /\.(jpe?g|png|webp|heic)$/i.test(name) ? 'Photo' : /\.(mp4|mov|webm|3gp)$/i.test(name) ? 'Video' : /\.pdf$/i.test(name) ? 'PDF' : null

// ── Operations permission matrix (§17) ───────────────────────────────────
export type OpsRole = 'Franchise' | 'CRM Executive' | 'Finance Executive' | 'Operations Executive' | 'Admin'
export const OPS_ROLES: OpsRole[] = ['Franchise', 'CRM Executive', 'Finance Executive', 'Operations Executive', 'Admin']
export type OpsModule =
  | 'CBR' | 'Cash Loading' | 'ALF' | 'Routine EOD' | 'Cash Audit EOD' | 'Monthly EOD' | 'WLA Statement' | 'TDS Letter'
  | 'Transaction Data' | 'Postal / Courier' | 'Field Transaction Dispute' | 'Chargeback Dispute' | 'Forecasting' | 'Complaint' | 'MIS & Reports' | 'AI Overview'
export const OPS_MODULES: OpsModule[] = ['CBR', 'Cash Loading', 'ALF', 'Routine EOD', 'Cash Audit EOD', 'Monthly EOD', 'WLA Statement', 'TDS Letter', 'Transaction Data', 'Postal / Courier', 'Field Transaction Dispute', 'Chargeback Dispute', 'Forecasting', 'Complaint', 'MIS & Reports', 'AI Overview']
export type OpsAction = 'View Own' | 'View' | 'Create' | 'Submit' | 'Upload' | 'Request' | 'Raise' | 'Respond' | 'Verify' | 'Assign' | 'Process' | 'Review' | 'Reconcile' | 'Analyze' | 'Approve' | 'Close' | 'Export' | 'Download' | 'Control'
export const OPS_ACTIONS: OpsAction[] = ['View Own', 'View', 'Create', 'Submit', 'Upload', 'Request', 'Raise', 'Respond', 'Verify', 'Assign', 'Process', 'Review', 'Reconcile', 'Analyze', 'Approve', 'Close', 'Export', 'Download', 'Control']
/** Spec wording per cell (§17) — shown next to the editable actions. */
export const SPEC_TEXT: Partial<Record<OpsModule, Record<OpsRole, string>>> = {
  CBR: { Franchise: 'Create / View Own', 'CRM Executive': 'Verify / Authorized Entry', 'Finance Executive': 'View as Authorized', 'Operations Executive': 'View as Authorized', Admin: 'Approve / Control' },
  'Cash Loading': { Franchise: 'Create / View Own', 'CRM Executive': 'Verify / Authorized Entry', 'Finance Executive': 'View as Authorized', 'Operations Executive': 'View as Authorized', Admin: 'Approve / Control' },
  ALF: { Franchise: 'Request / View Own', 'CRM Executive': 'Verify', 'Finance Executive': 'Financial Review', 'Operations Executive': 'Operational Review', Admin: 'Approve' },
  'Routine EOD': { Franchise: 'Submit / View Own', 'CRM Executive': 'Verify', 'Finance Executive': 'View as Authorized', 'Operations Executive': 'Verify', Admin: 'Approve as configured' },
  'Cash Audit EOD': { Franchise: 'Submit / View Own', 'CRM Executive': 'Verify', 'Finance Executive': 'View as Authorized', 'Operations Executive': 'Verify', Admin: 'Approve as configured' },
  'Monthly EOD': { Franchise: 'View Own Status', 'CRM Executive': 'Verify', 'Finance Executive': 'Reconcile', 'Operations Executive': 'Verify', Admin: 'Approve' },
  'WLA Statement': { Franchise: 'Upload / View Own', 'CRM Executive': 'Verify', 'Finance Executive': 'View / Process', 'Operations Executive': 'No default access', Admin: 'Control' },
  'TDS Letter': { Franchise: 'View / Download Own', 'CRM Executive': 'Upload', 'Finance Executive': 'Upload / Review', 'Operations Executive': 'No default access', Admin: 'Control' },
  'Transaction Data': { Franchise: 'Read Only Own', 'CRM Executive': 'Create / Edit as authorized', 'Finance Executive': 'View as authorized', 'Operations Executive': 'View as authorized', Admin: 'Control' },
  'Postal / Courier': { Franchise: 'No default access', 'CRM Executive': 'As authorized', 'Finance Executive': 'As authorized', 'Operations Executive': 'As authorized', Admin: 'Control' },
  'Field Transaction Dispute': { Franchise: 'Raise / View Own', 'CRM Executive': 'Verify', 'Finance Executive': 'View as authorized', 'Operations Executive': 'Process', Admin: 'Approve' },
  'Chargeback Dispute': { Franchise: 'Respond / Evidence', 'CRM Executive': 'Verify / Process', 'Finance Executive': 'Financial Review', 'Operations Executive': 'Process', Admin: 'Approve' },
  Forecasting: { Franchise: 'View own data as authorized', 'CRM Executive': 'View', 'Finance Executive': 'View / Analyze', 'Operations Executive': 'View', Admin: 'Full Access' },
  Complaint: { Franchise: 'Raise / View Own', 'CRM Executive': 'Verify / Assign', 'Finance Executive': 'As authorized', 'Operations Executive': 'Process', Admin: 'Control' },
}
type Matrix = Record<OpsModule, Record<OpsRole, OpsAction[]>>
function seedMatrix(): Matrix {
  const m = {} as Matrix
  const row = (f: OpsAction[], crm: OpsAction[], fin: OpsAction[], ops: OpsAction[], adm: OpsAction[]) => ({ Franchise: f, 'CRM Executive': crm, 'Finance Executive': fin, 'Operations Executive': ops, Admin: adm })
  m.CBR = row(['Create', 'Submit', 'View Own'], ['Verify', 'Create', 'View'], ['View'], ['View'], ['Approve', 'Control'])
  m['Cash Loading'] = row(['Create', 'Submit', 'View Own'], ['Verify', 'Create', 'View'], ['View'], ['View'], ['Approve', 'Control'])
  m.ALF = row(['Request', 'View Own'], ['Verify', 'View'], ['Review', 'View'], ['Review', 'View'], ['Approve', 'View'])
  m['Routine EOD'] = row(['Submit', 'View Own'], ['Verify', 'View'], ['View'], ['Verify', 'View'], ['Approve', 'View'])
  m['Cash Audit EOD'] = row(['Submit', 'View Own'], ['Verify', 'View'], ['View'], ['Verify', 'View'], ['Approve', 'View'])
  m['Monthly EOD'] = row(['View Own'], ['Verify', 'View'], ['Reconcile', 'View'], ['Verify', 'View'], ['Approve', 'View'])
  m['WLA Statement'] = row(['Upload', 'View Own'], ['Verify', 'View'], ['View', 'Process'], [], ['Control'])
  m['TDS Letter'] = row(['View Own', 'Download'], ['Upload', 'View'], ['Upload', 'Review', 'View'], [], ['Control'])
  m['Transaction Data'] = row(['View Own'], ['Create', 'View'], ['View'], ['View'], ['Control'])
  m['Postal / Courier'] = row([], ['View'], ['View'], ['View'], ['Control'])
  m['Field Transaction Dispute'] = row(['Raise', 'View Own'], ['Verify', 'View'], ['View'], ['Process', 'View'], ['Approve', 'View'])
  m['Chargeback Dispute'] = row(['Respond', 'View Own'], ['Verify', 'Process', 'View'], ['Review', 'View'], ['Process', 'View'], ['Approve', 'View'])
  m.Forecasting = row(['View Own'], ['View'], ['View', 'Analyze'], ['View'], ['Control'])
  m.Complaint = row(['Raise', 'View Own'], ['Verify', 'Assign', 'View'], [], ['Process', 'View'], ['Control'])
  m['MIS & Reports'] = row([], ['View', 'Export'], ['View', 'Export'], ['View', 'Export'], ['Control'])
  m['AI Overview'] = row([], ['View'], ['View'], ['View'], ['Control'])
  return m
}
export type PermOverride = { id: string; employeeId: string; module: OpsModule; action: OpsAction; effect: 'Grant' | 'Revoke'; reason: string; by: string; at: string }
export type PermState = {
  matrix: Matrix
  userRoles: Record<string, OpsRole[]> // explicit role mapping per employee (never derived from designation)
  overrides: PermOverride[]
  history: { at: string; by: string; text: string }[]
}
const seedPerms = (): PermState => ({
  matrix: seedMatrix(),
  userRoles: { 'EMP-001': ['Admin'], 'EMP-002': ['Admin'], 'EMP-003': ['Operations Executive'], 'EMP-004': ['Operations Executive'], 'EMP-005': ['CRM Executive'], 'EMP-006': ['Operations Executive'], 'EMP-007': ['Finance Executive'], 'EMP-008': ['Finance Executive'], 'EMP-012': ['CRM Executive'] },
  overrides: [],
  history: [],
})
export const permStore = createStore<PermState>(apiEnabled ? 'dexter.api.ops.permissions.v1' : 'dexter.ops.permissions.v1', seedPerms)
export const usePermState = () => permStore.use()

// ── Backend (/ops-permissions) ──────────────────────────────────────────
// The backend holds the authoritative matrix. Super Admin / Admin read and edit it (GET /ops-permissions);
// everyone else gets their own effective rights (GET /ops-permissions/me) and sees the §17 defaults read-only.
type ApiPermState = { matrix: Matrix; userRoles: Record<string, OpsRole[]>; overrides: (Omit<PermOverride, 'at'> & { at: string })[]; updatedBy?: string; updatedAt?: string }
export const isPermAdmin = (role: Role = currentRole()) => role === 'Super Admin' || role === 'Admin'
const applyPerm = (r: ApiPermState) =>
  permStore.set((p) => ({
    ...p,
    matrix: { ...seedMatrix(), ...r.matrix },
    userRoles: r.userRoles ?? {},
    overrides: (r.overrides ?? []).map((o) => ({ ...o, at: String(o.at) })),
  }))
export const permLoader = createLoader('operations permissions', async () => {
  if (!isPermAdmin()) return
  applyPerm(await get<ApiPermState>('/ops-permissions'))
})

/** The signed-in user's effective rights from the backend (API mode). */
type OpsMe = { role: string; employeeId: string | null; opsRoles: OpsRole[]; modules: Record<string, OpsAction[]> }
export const opsMeStore = createStore<OpsMe | null>('dexter.api.ops.me.v1', () => null)
export const opsMeIntelLoader = createLoader('your operations rights', async () => {
  opsMeStore.set(await get<OpsMe>('/ops-permissions/me'))
})

const permWrite = async (fn: () => Promise<unknown>, log: string) => {
  await apiCall(fn, 'Permission change failed')
  logPerm(log)
  await permLoader.reload()
  void opsMeIntelLoader.reload()
}
export const apiSetMatrixCell = (module: OpsModule, r: OpsRole, actions: OpsAction[], log: string) =>
  permWrite(() => put(`/ops-permissions/matrix/${encodeURIComponent(module)}/${encodeURIComponent(r)}`, { actions }), log)
export const apiSetUserRoles = (employeeId: string, roles: OpsRole[], log: string) =>
  permWrite(() => put(`/ops-permissions/user-roles/${encodeURIComponent(employeeId)}`, { roles }), log)
export const apiAddOverrides = (rows: Pick<PermOverride, 'employeeId' | 'module' | 'action' | 'effect' | 'reason'>[], log: string) =>
  permWrite(async () => {
    for (const r of rows) await post('/ops-permissions/overrides', r)
  }, log)
export const apiRemoveOverride = (id: string, reason: string, log: string) =>
  permWrite(() => api(`/ops-permissions/overrides/${encodeURIComponent(id)}`, { method: 'DELETE', body: { reason } }), log)
export const apiResetPerms = (reason: string) => permWrite(() => post('/ops-permissions/reset', { reason }), 'Matrix reset to the §17 proposed defaults')

/** ERP role (top-bar switcher) → Operations role. Roles not listed have no Operations access. */
export const RBAC_TO_OPS: Partial<Record<Role, OpsRole>> = {
  'Super Admin': 'Admin',
  Admin: 'Admin',
  'Sub-Admin': 'CRM Executive',
  'Operations Team': 'Operations Executive',
  'MIS Team': 'Operations Executive',
  'Field Officer / Team Leader': 'Operations Executive',
  'Finance Team': 'Finance Executive',
  Franchisee: 'Franchise',
}
const satisfies = (have: OpsAction[], want: OpsAction) => have.includes('Control') || have.includes(want) || (want === 'View' && have.includes('View Own'))

/** Effective actions for a set of roles + per-user overrides. */
export function effectiveActions(s: PermState, roles: OpsRole[], module: OpsModule, employeeId?: string): OpsAction[] {
  const base = new Set<OpsAction>(roles.flatMap((r) => s.matrix[module]?.[r] ?? []))
  for (const o of s.overrides) {
    if (o.employeeId !== employeeId || o.module !== module) continue
    if (o.effect === 'Grant') base.add(o.action)
    else base.delete(o.action)
  }
  return [...base]
}
export const employeeByName = (name: string) => hierarchyStore.get().employees.find((e) => e.name === name && e.status === 'Active')
/** Permission check for the signed-in session: demo ERP role → Operations role, plus that person's explicit overrides. */
export function opsCan(module: OpsModule, action: OpsAction, s: PermState = permStore.get(), role: Role = currentRole()): boolean {
  if (apiEnabled) {
    // backend effective rights are authoritative; the local rule below applies only until they arrive
    void opsMeIntelLoader.load()
    const me = opsMeStore.get()
    if (me && me.role === role) return me.role === 'Super Admin' || satisfies(me.modules[module] ?? [], action)
  }
  const opsRole = RBAC_TO_OPS[role]
  const emp = employeeByName(actorName())
  if (!satisfies(effectiveActions(s, opsRole ? [opsRole] : [], module, emp?.id), action)) return false
  // One permission system: the global action right (Governance › Roles & Permissions) is the ceiling.
  return role === 'Super Admin' || action === 'Control' || can(OPS_TO_GLOBAL[action], role)
}
/** Operations action → global ERP action used as the ceiling. */
export const OPS_TO_GLOBAL: Record<OpsAction, Action> = {
  'View Own': 'View', View: 'View', Create: 'Create', Submit: 'Create', Upload: 'Create', Request: 'Create', Raise: 'Create', Respond: 'Create',
  Verify: 'Edit', Process: 'Edit', Review: 'Edit', Reconcile: 'Edit', Analyze: 'View', Assign: 'Assign', Approve: 'Approve', Close: 'Close',
  Export: 'Export', Download: 'Download', Control: 'Approve',
}
/** Permission check for a named employee (explicit role mapping + overrides). */
export function employeeCan(employeeId: string, module: OpsModule, action: OpsAction, s: PermState = permStore.get()): boolean {
  return satisfies(effectiveActions(s, s.userRoles[employeeId] ?? [], module, employeeId), action)
}
export function logPerm(text: string) {
  permStore.set((s) => ({ ...s, history: [{ at: nowIso(), by: actorName(), text }, ...s.history].slice(0, 500) }))
}

// ── AI output log (§15.3: model/version, rules, output logs) ─────────────
export const AI_MODEL = 'Dexter AI rules v1'
export type AiLog = { id: string; at: string; by: string; model: string; capability: string; period: string; inputs: number; outputs: number }
export const aiLogStore = createStore<AiLog[]>('dexter.ops.aiLog.v1', () => [])
export const useAiLog = () => aiLogStore.use()
export function logAiRun(rows: Omit<AiLog, 'id' | 'at' | 'by' | 'model'>[]) {
  const at = nowIso()
  aiLogStore.set((xs) => [...rows.map((r) => ({ ...r, id: wid('AIL'), at, by: actorName(), model: AI_MODEL })), ...xs].slice(0, 400))
}

export { PRIORITIES }
