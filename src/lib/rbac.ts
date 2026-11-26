// Role-based access (Security Framework §12 + Franchise spec §19/§20).
// Frontend gating only — the backend must enforce the same rules (spec §14).
import { useSyncExternalStore } from 'react'
import { getSession, setSessionRole } from './auth'
import { apiEnabled, get, patch as apiPatch, post, put } from './api'
import { toast } from '@/components/ui/Toast'

export type Role =
  | 'Super Admin'
  | 'Admin'
  | 'Sub-Admin'
  | 'Project Head'
  | 'Project Team'
  | 'Finance Team'
  | 'Legal Team'
  | 'Operations Team'
  | 'MIS Team'
  | 'Field Officer / Team Leader'
  | 'Engineer'
  | 'Franchisee'

export const ROLES: Role[] = [
  'Super Admin', 'Admin', 'Sub-Admin', 'Project Head', 'Project Team', 'Finance Team', 'Legal Team',
  'Operations Team', 'MIS Team', 'Field Officer / Team Leader', 'Engineer', 'Franchisee',
]

export type Action = 'View' | 'Create' | 'Edit' | 'Delete' | 'Approve' | 'Reject' | 'Assign' | 'Export' | 'Import' | 'Close' | 'Print' | 'Copy' | 'Download'
export const ACTIONS: Action[] = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Reject', 'Assign', 'Export', 'Import', 'Close', 'Print', 'Copy', 'Download']
export type DataScope = 'Company' | 'Project' | 'Region' | 'Team' | 'Employee' | 'Franchise'
export const DATA_SCOPES: DataScope[] = ['Company', 'Project', 'Region', 'Team', 'Employee', 'Franchise']

/** Master Data visibility (§19.1). 'full' = overview + database, 'project' / 'finance' / 'legal' = only their part, 'none' = hidden. */
export type MasterAccess = 'full' | 'project' | 'finance' | 'legal' | 'none'
export const MASTER_ACCESS: Record<Role, MasterAccess> = {
  'Super Admin': 'full',
  Admin: 'full',
  'Sub-Admin': 'none',
  'Project Head': 'full',
  'Project Team': 'project',
  'Finance Team': 'finance',
  'Legal Team': 'legal',
  'Operations Team': 'none', // §19.2 — never visible to Operations
  'MIS Team': 'none',
  'Field Officer / Team Leader': 'none',
  Engineer: 'none',
  Franchisee: 'none',
}

/** Default action rights per role; editable in Governance › Roles & Permissions. */
export const DEFAULT_ACTIONS: Record<Role, Action[]> = {
  'Super Admin': ACTIONS,
  Admin: ACTIONS.filter((a) => a !== 'Delete'),
  'Sub-Admin': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Assign', 'Close', 'Export'],
  'Project Head': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Assign', 'Export', 'Close', 'Download'],
  'Project Team': ['View', 'Create', 'Edit', 'Download'],
  'Finance Team': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Import', 'Export', 'Download', 'Print'],
  'Legal Team': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Export', 'Download', 'Print'],
  'Operations Team': ['View', 'Create', 'Edit', 'Assign', 'Close', 'Export', 'Download'],
  'MIS Team': ['View', 'Create', 'Export', 'Download', 'Print'],
  'Field Officer / Team Leader': ['View', 'Create', 'Edit', 'Assign', 'Close'],
  Engineer: ['View', 'Edit', 'Close'],
  Franchisee: ['View', 'Create', 'Download'], // submits own CBR / EOD / requests on the mobile app
}

const permKey = 'dexter.rolePerms.v1'
let perms: Record<Role, Action[]> = (() => {
  if (apiEnabled) return DEFAULT_ACTIONS // API mode: replaced by the server rights after sign-in
  try {
    const raw = localStorage.getItem(permKey)
    return raw ? { ...DEFAULT_ACTIONS, ...JSON.parse(raw) } : DEFAULT_ACTIONS
  } catch {
    return DEFAULT_ACTIONS
  }
})()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
export function setRolePerms(role: Role, actions: Action[]) {
  const prev = perms[role]
  perms = { ...perms, [role]: actions }
  if (apiEnabled) {
    // Optimistic; the server is the source of truth (PUT /rbac/roles/:role/actions), rolled back on error.
    emit()
    put<{ actions?: Action[] }>(`/rbac/roles/${encodeURIComponent(role)}/actions`, { actions })
      .then((res) => {
        if (res?.actions) setPermsNoPersist({ ...perms, [role]: res.actions })
      })
      .catch((e: Error) => {
        setPermsNoPersist({ ...perms, [role]: prev })
        toast(e.message || 'Could not save the role rights.', 'error')
      })
    return
  }
  try {
    localStorage.setItem(permKey, JSON.stringify(perms))
  } catch {
    /* ignore */
  }
  emit()
}
export const getRolePerms = () => perms

export function currentRole(): Role {
  const r = getSession()?.role
  if (r && (ROLES as string[]).includes(r)) return r as Role
  if (r && /super/i.test(r)) return 'Super Admin'
  return 'Super Admin'
}
export function switchRole(role: Role) {
  if (apiEnabled) return // API mode: the role comes from the server session
  setSessionRole(role)
  emit()
}
/** Notify subscribers (role / rights changed after an API sync). */
export const rbacChanged = () => emit()
/** Re-renders when the demo role or permissions change. */
export function useRole(): Role {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => currentRole(),
  )
}
export function usePerms() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => perms,
  )
}

export const can = (action: Action, role: Role = currentRole()) => (perms[role] ?? []).includes(action)
export const masterAccess = (role: Role = currentRole()) => MASTER_ACCESS[role]

/**
 * Route-level gate. Returns null when allowed, else a reason shown on the No-access page.
 * Rules come from the specs: Master Data hidden from Operations / MIS / Franchise users (§19, §20),
 * security administration only for Super Admin / Admin (Security §20).
 */
export function routeBlock(pathname: string, role: Role = currentRole()): string | null {
  const ma = MASTER_ACCESS[role]
  if (pathname.startsWith('/master-data')) {
    if (ma === 'none') return 'Master Data is a confidential administrative database and is not available to your role.'
    const sub = pathname.split('/')[2] ?? ''
    if (ma === 'finance' && !['', 'sites', 'accounts'].includes(sub) && !pathname.startsWith('/master-data/sites/')) return 'Finance users can only work on Account Mapping.'
    if (ma === 'legal' && !['', 'sites', 'legal-tracking'].includes(sub) && !pathname.startsWith('/master-data/sites/')) return 'Legal users can only work on legal tracking.'
    if (ma !== 'full' && (sub === '' || sub === 'overview' || sub === 'audit')) return 'The Master Data Overview and AI analysis are limited to Admin and Project Head.'
    return null
  }
  if (pathname.startsWith('/governance/security-admin') || pathname.startsWith('/governance/roles') || pathname.startsWith('/governance/backup')) {
    return role === 'Super Admin' || role === 'Admin' ? null : 'Security administration is limited to Super Admin and Admin.'
  }
  // Payout Management roles (Payout spec §18): Admin, Finance, Payout team, Approver, Viewer (MIS = view only).
  if (pathname.startsWith('/finance/payouts')) {
    const ok: Role[] = ['Super Admin', 'Admin', 'Sub-Admin', 'Finance Team', 'MIS Team']
    if (!ok.includes(role)) return 'Payout Management is limited to Admin, Finance, Payout and authorised viewer roles.'
  }
  if (pathname.startsWith('/franchise/transfers') && pathname.endsWith('/approve')) {
    return role === 'Super Admin' ? null : 'Only Super Admin can give the final transfer approval.'
  }
  if (role === 'Franchisee' && !pathname.startsWith('/user') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/governance/privacy/my')) {
    return 'Franchise users use the mobile application. Only your profile, dashboard and privacy requests are available on the web portal.'
  }
  return null
}

// ── API mode: rights come from the backend ────────────────────────────────
/** Shape of `rights` in the login response, GET /auth/me and GET /rbac/me. */
export type ServerRights = {
  role: string
  actions: Action[]
  masterAccess: MasterAccess
  dataScope?: DataScope
  modules: Record<string, Action[]>
  opsRole?: string
}
/** Server role record (GET /rbac/roles). */
export type ServerRole = { role: Role; actions: Action[]; masterAccess: MasterAccess; dataScope: DataScope; system?: boolean; updatedAt?: string; updatedBy?: string }

let serverRights: ServerRights | null = null
export const getServerRights = () => serverRights
const moduleHooks = new Set<(r: ServerRights) => void>()
/** guard.tsx registers here to copy the per-module rights into its matrix (avoids a circular import). */
export const onServerRights = (fn: (r: ServerRights) => void) => (moduleHooks.add(fn), () => moduleHooks.delete(fn))

function setPermsNoPersist(next: Record<Role, Action[]>) {
  perms = next
  emit()
}

/** Apply the signed-in user's effective rights (global actions, master access, module rights). */
export function applyServerRights(r: ServerRights) {
  serverRights = r
  const role = r.role as Role
  if ((ROLES as string[]).includes(role)) {
    MASTER_ACCESS[role] = r.masterAccess
    setPermsNoPersist({ ...perms, [role]: r.actions })
  }
  moduleHooks.forEach((f) => f(r))
  emit()
}

/** GET /rbac/me → apply. */
export async function syncMyRights() {
  if (!apiEnabled) return null
  const r = await get<ServerRights>('/rbac/me')
  applyServerRights(r)
  return r
}

/** Admin: GET /rbac/roles → global action rights + master access of every role. */
export async function loadRoles(): Promise<ServerRole[]> {
  if (!apiEnabled) return ROLES.map((role) => ({ role, actions: perms[role], masterAccess: MASTER_ACCESS[role], dataScope: 'Company' }))
  const res = await get<{ items: ServerRole[] } | ServerRole[]>('/rbac/roles')
  const items = Array.isArray(res) ? res : res.items
  const next = { ...perms }
  for (const it of items) {
    if (!(ROLES as string[]).includes(it.role)) continue
    next[it.role] = it.actions
    MASTER_ACCESS[it.role] = it.masterAccess
  }
  setPermsNoPersist(next)
  return items
}

/** Admin: replace a role's global action rights (PUT /rbac/roles/:role/actions). Mock mode: local only. */
export async function saveRolePerms(role: Role, actions: Action[]) {
  if (!apiEnabled) return setRolePerms(role, actions)
  const res = await put<ServerRole>(`/rbac/roles/${encodeURIComponent(role)}/actions`, { actions })
  setPermsNoPersist({ ...perms, [role]: res?.actions ?? actions })
}

/** Admin: change a role's master-data access / data scope (PATCH /rbac/roles/:role). */
export async function saveRoleAccess(role: Role, body: { masterAccess?: MasterAccess; dataScope?: DataScope }) {
  if (!apiEnabled) {
    if (body.masterAccess) MASTER_ACCESS[role] = body.masterAccess
    emit()
    return
  }
  const res = await apiPatch<ServerRole>(`/rbac/roles/${encodeURIComponent(role)}`, body)
  MASTER_ACCESS[role] = res?.masterAccess ?? body.masterAccess ?? MASTER_ACCESS[role]
  emit()
}

/** Admin: POST /rbac/reset-defaults, then reload roles. */
export async function resetRolesOnServer() {
  await post('/rbac/reset-defaults')
  await loadRoles()
}
