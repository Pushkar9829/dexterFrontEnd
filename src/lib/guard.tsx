// Action-level permissions for every web module (Security Framework §12).
// Effective right = module rule for the role (editable in Governance › Roles & Permissions › Module rights)
//                   AND the role's global action right (`can`, same screen). The global right is the ceiling.
// Frontend gating only — the backend must enforce the same rules on every API call.
import { useSyncExternalStore, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { createStore } from './store'
import { ACTIONS, ROLES, can, currentRole, onServerRights, useRole, usePerms, type Action, type Role } from './rbac'
import { apiEnabled, get, put } from './api'
import { toast } from '@/components/ui/Toast'

export type AppModule =
  | 'Legal' | 'Finance' | 'Onboarding' | 'Franchise' | 'Tasks' | 'Reports' | 'HRMS' | 'Email' | 'Broadcast' | 'Users' | 'Complaints' | 'Setup'
export const APP_MODULES: AppModule[] = ['Legal', 'Finance', 'Onboarding', 'Franchise', 'Tasks', 'Reports', 'HRMS', 'Email', 'Broadcast', 'Users', 'Complaints', 'Setup']

type Rights = Record<AppModule, Record<Role, Action[]>>
const ALL = ACTIONS
const V: Action[] = ['View']
const VD: Action[] = ['View', 'Download']

function seedRights(): Rights {
  const r = {} as Rights
  const row = (over: Partial<Record<Role, Action[]>>, fallback: Action[] = V): Record<Role, Action[]> =>
    Object.fromEntries(ROLES.map((ro) => [ro, ro === 'Super Admin' || ro === 'Admin' ? ALL : over[ro] ?? fallback])) as Record<Role, Action[]>
  r.Legal = row({
    'Legal Team': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Export', 'Download', 'Print'],
    'Project Head': ['View', 'Approve', 'Reject', 'Export', 'Download'],
    'Sub-Admin': ['View', 'Create', 'Edit', 'Download'],
    'Project Team': VD,
    Franchisee: [],
  })
  r.Finance = row({
    'Finance Team': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Export', 'Import', 'Download', 'Print'],
    'Sub-Admin': ['View', 'Export', 'Download'],
    'MIS Team': ['View', 'Export', 'Download'],
    'Project Head': VD,
    Franchisee: [],
  })
  r.Onboarding = row({
    'Sub-Admin': ['View', 'Create', 'Edit', 'Assign', 'Export'],
    'Project Head': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Assign', 'Export'],
    'Project Team': ['View', 'Create', 'Edit'],
    'Legal Team': ['View', 'Approve', 'Reject'],
    'Finance Team': ['View', 'Approve', 'Reject'],
    Franchisee: [],
  })
  r.Franchise = row({
    'Sub-Admin': ['View', 'Create', 'Edit', 'Assign', 'Export'],
    'Project Head': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Assign', 'Export', 'Close'],
    'Project Team': ['View', 'Create', 'Edit'],
    Franchisee: [],
  })
  r.Tasks = row({
    'Sub-Admin': ['View', 'Create', 'Edit', 'Assign', 'Close', 'Export'],
    'Project Head': ['View', 'Create', 'Edit', 'Assign', 'Close', 'Approve', 'Export'],
    'Operations Team': ['View', 'Create', 'Edit', 'Assign', 'Close'],
    'Field Officer / Team Leader': ['View', 'Create', 'Edit', 'Assign', 'Close'],
    Franchisee: [],
  }, ['View', 'Create', 'Edit', 'Close'])
  r.Reports = row({
    'MIS Team': ['View', 'Create', 'Export', 'Download', 'Print'],
    'Sub-Admin': ['View', 'Export', 'Download'],
    'Project Head': ['View', 'Export', 'Download'],
    'Finance Team': ['View', 'Export', 'Download'],
    Franchisee: [],
  })
  r.HRMS = row({
    'Sub-Admin': ['View', 'Create', 'Edit', 'Approve', 'Reject', 'Export'],
    'Project Head': ['View', 'Create', 'Approve', 'Reject'],
    'Finance Team': ['View', 'Create', 'Approve', 'Reject', 'Export'],
    Franchisee: [],
  }, ['View', 'Create']) // everyone may raise own leave / expense / attendance requests
  r.Email = row({ Franchisee: [] }, ['View', 'Create', 'Edit', 'Delete'])
  r.Broadcast = row({
    'Sub-Admin': ['View', 'Create', 'Edit'],
    'Project Head': ['View', 'Create', 'Edit', 'Approve'],
    'Operations Team': ['View', 'Create', 'Edit'],
    Franchisee: [],
  })
  r.Users = row({ 'Sub-Admin': ['View', 'Create', 'Edit'] }, V)
  r.Complaints = row({
    'Sub-Admin': ['View', 'Create', 'Edit', 'Assign', 'Close', 'Export'],
    'Operations Team': ['View', 'Create', 'Edit', 'Assign', 'Close', 'Export'],
    'Field Officer / Team Leader': ['View', 'Create', 'Edit', 'Close'],
    Engineer: ['View', 'Edit', 'Close'],
    'Project Head': ['View', 'Assign', 'Export'],
    'MIS Team': ['View', 'Export'],
    Franchisee: [],
  })
  r.Setup = row({ 'Sub-Admin': ['View', 'Edit'], 'Project Head': ['View', 'Edit'] }, V)
  return r
}

export const moduleRightsStore = createStore<Rights>('dexter.moduleRights.v1', seedRights)
export const useModuleRights = () => moduleRightsStore.use()
export const resetModuleRights = () => moduleRightsStore.reset()
export function setModuleRight(module: AppModule, role: Role, action: Action, on: boolean) {
  const prev = moduleRightsStore.get()[module]?.[role] ?? []
  const next = on ? [...new Set([...prev, action])] : prev.filter((a) => a !== action)
  moduleRightsStore.set((s) => ({ ...s, [module]: { ...s[module], [role]: next } }))
  if (apiEnabled) {
    // Optimistic; PUT /rbac/module-rights/:module/:role is the source of truth, rolled back on error.
    put<{ actions?: Action[] } | Record<string, unknown>>(`/rbac/module-rights/${encodeURIComponent(module)}/${encodeURIComponent(role)}`, { actions: next }).catch((e: Error) => {
      moduleRightsStore.set((s) => ({ ...s, [module]: { ...s[module], [role]: prev } }))
      toast(e.message || 'Could not save the module right.', 'error')
    })
  }
}

// ── API mode ────────────────────────────────────────────────────────────
/** The signed-in user's per-module rights (login / GET /rbac/me) replace their role's column. */
onServerRights((r) => {
  const role = r.role as Role
  moduleRightsStore.set((s) => {
    const next = { ...s }
    for (const m of APP_MODULES) next[m] = { ...(s[m] ?? {}), [role]: (r.modules?.[m] ?? []) as Action[] } as Record<Role, Action[]>
    return next
  })
})

/** Admin: load the full module × role matrix (GET /rbac/module-rights). */
export async function loadModuleRights() {
  if (!apiEnabled) return moduleRightsStore.get()
  const m = await get<Partial<Record<AppModule, Partial<Record<Role, Action[]>>>>>('/rbac/module-rights')
  moduleRightsStore.set((s) => {
    const next = { ...s }
    for (const mod of APP_MODULES) if (m[mod]) next[mod] = { ...s[mod], ...m[mod] } as Record<Role, Action[]>
    return next
  })
  return moduleRightsStore.get()
}

/** Can the role do `action` in `module`? Module rule AND global action right. */
export function canIn(module: AppModule, action: Action, role: Role = currentRole()): boolean {
  if (role === 'Super Admin') return true
  const rule = moduleRightsStore.get()[module]?.[role] ?? []
  return rule.includes(action) && can(action, role)
}

/** Reactive checker for components: `const allow = useCanIn('Legal'); allow('Create')`. */
export function useCanIn(module: AppModule) {
  const role = useRole()
  usePerms()
  useSyncExternalStore(moduleRightsStore.subscribe, moduleRightsStore.get)
  return (action: Action) => canIn(module, action, role)
}

/** Use inside click / submit handlers: returns false (and tells the user why) when not allowed. */
export function guardAct(module: AppModule, action: Action, what?: string): boolean {
  if (canIn(module, action)) return true
  toast(`Your role (${currentRole()}) cannot ${(what ?? action).toLowerCase()} in ${module}.`, 'error')
  return false
}

/** Like guardAct, but any one of `actions` is enough (e.g. Legal soft delete: Delete OR Edit). */
export function guardAnyAct(module: AppModule, actions: Action[], what?: string): boolean {
  if (actions.some((a) => canIn(module, a))) return true
  toast(`Your role (${currentRole()}) cannot ${(what ?? actions[0]).toLowerCase()} in ${module}.`, 'error')
  return false
}

/** Renders children when the role has any one of `actions` in `module`. */
export function CanAny({ module, actions, children }: { module: AppModule; actions: Action[]; children: ReactNode }) {
  const allow = useCanIn(module)
  return actions.some((a) => allow(a)) ? <>{children}</> : null
}

/** Renders children only when allowed (or a disabled lock hint when `fallback` is 'lock'). */
export function Can({ module, action, children, fallback }: { module: AppModule; action: Action; children: ReactNode; fallback?: 'lock' | ReactNode }) {
  const allow = useCanIn(module)
  if (allow(action)) return <>{children}</>
  if (fallback === 'lock')
    return (
      <span title={`Not permitted for your role (${action})`} className="inline-flex items-center gap-1 rounded-lg border border-line bg-slate-50 px-2.5 py-1.5 text-[12px] text-muted">
        <Lock size={12} /> {action} not permitted
      </span>
    )
  return <>{fallback ?? null}</>
}

/** Small banner for pages where the current role is view-only. */
export function ViewOnlyNote({ module }: { module: AppModule }) {
  const allow = useCanIn(module)
  const role = useRole()
  if (allow('Create') || allow('Edit') || allow('Approve')) return null
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
      <Lock size={13} /> View only — your role ({role}) cannot create, edit or approve in {module}.
    </div>
  )
}
