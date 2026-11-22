// Role-based access (Security Framework §12 + Franchise spec §19/§20).
// Frontend gating only — the backend must enforce the same rules (spec §14).
import { useSyncExternalStore } from 'react'
import { getSession, setSessionRole } from './auth'

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
  'Sub-Admin': ['View', 'Create', 'Edit', 'Assign', 'Export'],
  'Project Head': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Assign', 'Export', 'Close', 'Download'],
  'Project Team': ['View', 'Create', 'Edit', 'Download'],
  'Finance Team': ['View', 'Create', 'Edit', 'Approve', 'Export', 'Download'],
  'Legal Team': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Download'],
  'Operations Team': ['View', 'Create', 'Edit', 'Download'],
  'MIS Team': ['View', 'Export', 'Download'],
  'Field Officer / Team Leader': ['View', 'Create'],
  Engineer: ['View', 'Edit'],
  Franchisee: ['View'],
}

const permKey = 'dexter.rolePerms.v1'
let perms: Record<Role, Action[]> = (() => {
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
  perms = { ...perms, [role]: actions }
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
  setSessionRole(role)
  emit()
}
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
  if (pathname.startsWith('/franchise/transfers') && pathname.endsWith('/approve')) {
    return role === 'Super Admin' ? null : 'Only Super Admin can give the final transfer approval.'
  }
  if (role === 'Franchisee' && !pathname.startsWith('/user') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/governance/privacy/my')) {
    return 'Franchise users use the mobile application. Only your profile, dashboard and privacy requests are available on the web portal.'
  }
  return null
}
