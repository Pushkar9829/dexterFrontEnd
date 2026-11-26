// Operations §17 — explicit role / user permission mapping for Postal & Courier and Reconciliation.
// Mock mode: frontend gating from the workflow hierarchy (designation), with demo personas.
// API mode: gating follows the signed-in user's effective Operations rights (GET /ops-permissions/me);
// the backend enforces the same rules (and maker-checker) and its errors are shown as toasts.
import { useSyncExternalStore } from 'react'
import { getSession, signInAs } from '@/lib/auth'
import { get as httpGet } from '@/lib/api'
import { switchRole, useRole, type Role } from '@/lib/rbac'
import { hierarchyStore } from '@/data/workflow'
import { apiEnabled } from '@/data/opsApi'

export type Persona = { name: string; designation: string; role: Role; empId: string }

/** Demo personas so the maker-checker flows can be exercised in one browser. */
export const PERSONAS: Persona[] = [
  { name: 'Paras Dubey', designation: 'Super Admin / Management', role: 'Super Admin', empId: 'EMP-001' },
  { name: 'Meera Iyer', designation: 'Admin', role: 'Admin', empId: 'EMP-002' },
  { name: 'Kiran Rao', designation: 'CRM Executive', role: 'Operations Team', empId: 'EMP-005' },
  { name: 'Sunil Yadav', designation: 'Operations Executive', role: 'Operations Team', empId: 'EMP-006' },
  { name: 'Neha Sharma', designation: 'Postal / Courier Executive', role: 'Operations Team', empId: 'EMP-012' },
  { name: 'Sanjay Gupta', designation: 'Finance Executive', role: 'Finance Team', empId: 'EMP-008' },
]

export function designationOf(name: string): string {
  const emp = hierarchyStore.get().employees.find((e) => e.name === name && e.status === 'Active')
  return emp?.designation ?? PERSONAS.find((p) => p.name === name)?.designation ?? ''
}

// ── API mode: effective Operations rights of the signed-in user ───────────
export type OpsRights = { role?: string; opsRoles: string[]; modules: Record<string, string[]> }
let rights: OpsRights | null = null
let rightsReq: Promise<void> | null = null
const rightsListeners = new Set<() => void>()
function loadRights() {
  if (!apiEnabled || rights || rightsReq) return
  rightsReq = httpGet<OpsRights>('/ops-permissions/me')
    .then((r) => {
      rights = { role: r.role, opsRoles: r.opsRoles ?? [], modules: r.modules ?? {} }
      rightsListeners.forEach((l) => l())
    })
    .catch(() => undefined)
    .finally(() => {
      rightsReq = null
    })
}
const subscribeRights = (l: () => void) => (rightsListeners.add(l), () => rightsListeners.delete(l))
/** Operations module rights (API mode); `null` until loaded / in mock mode. */
export function useOpsRights(): OpsRights | null {
  loadRights()
  return useSyncExternalStore(subscribeRights, () => rights)
}
const has = (r: OpsRights | null, module: string, ...actions: string[]) => {
  const a = r?.modules[module] ?? []
  return a.includes('Control') || actions.some((x) => a.includes(x))
}

export type OpsUser = {
  name: string
  role: Role
  designation: string
  isAdmin: boolean
  isCrm: boolean
  isPostal: boolean
  isFinance: boolean
}

export function opsUser(role: Role, r: OpsRights | null = rights): OpsUser {
  const name = getSession()?.name ?? 'System'
  const isAdmin = role === 'Super Admin' || role === 'Admin'
  if (apiEnabled) {
    return {
      name,
      role,
      designation: r?.opsRoles.join(', ') || role,
      isAdmin,
      isCrm: isAdmin || has(r, 'Field Transaction Dispute', 'Raise', 'Verify', 'Process') || has(r, 'Chargeback Dispute', 'Verify', 'Process'),
      // backend: dak desk work = Operations Team / Sub-Admin staff + Admin
      isPostal: isAdmin || role === 'Operations Team' || role === 'Sub-Admin',
      isFinance: role === 'Finance Team' || has(r, 'Chargeback Dispute', 'Review'),
    }
  }
  const designation = designationOf(name)
  return {
    name,
    role,
    designation,
    isAdmin,
    isCrm: /CRM Executive|Operations Executive/i.test(designation),
    isPostal: /Postal|Courier/i.test(designation),
    isFinance: /Finance/i.test(designation) || role === 'Finance Team',
  }
}

/** Re-renders on role / persona switch (and when the API rights arrive). */
export function useOpsUser(): OpsUser {
  const role = useRole()
  const r = useOpsRights()
  return opsUser(role, r)
}

export function actAs(p: Persona) {
  if (apiEnabled) return // the real signed-in user acts in API mode
  const initials = p.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const emp = hierarchyStore.get().employees.find((e) => e.id === p.empId)
  signInAs({ name: p.name, role: p.role, initials, email: emp?.email })
  switchRole(p.role) // notifies useRole subscribers
}

/** §9 / §17: only an authorised Postal / Courier Executive (or Admin as control) creates / updates dak records. */
export const canManageDak = (u: OpsUser) => u.isPostal || u.isAdmin
/** §17: Failed txn dispute — CRM raises / verifies; Admin approves. */
export const canCrmAct = (u: OpsUser) => u.isCrm || u.isAdmin
export const canApprove = (u: OpsUser) => u.isAdmin
