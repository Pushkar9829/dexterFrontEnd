// Operations §17 role table for EOD / WLA Statement / TDS Letter / Transaction Data.
// The ERP role list (src/lib/rbac.ts) has no separate "CRM Executive" role — CRM and Operations executives both sit
// in the Operations department, so 'Operations Team' gets the CRM column here. Every right is ALSO gated by the
// editable action rights (`can`) so Governance › Roles & Permissions keeps the final say. Backend must enforce the same.
import { can, type Role } from '@/lib/rbac'
import { get } from '@/lib/api'
import { apiEnabled, createLoader } from '@/data/opsApi'

export type OpsPersona = 'Franchise' | 'CRM' | 'Finance' | 'Operations' | 'Admin' | 'None'

export function personaOf(role: Role): OpsPersona {
  if (role === 'Super Admin' || role === 'Admin') return 'Admin'
  if (role === 'Operations Team') return 'CRM'
  if (role === 'Finance Team') return 'Finance'
  if (role === 'Project Head' || role === 'Sub-Admin' || role === 'MIS Team') return 'Operations'
  if (role === 'Franchisee') return 'Franchise'
  return 'None'
}

export type OpsModule = 'Routine EOD' | 'Cash Audit EOD' | 'Monthly EOD' | 'WLA Statement' | 'TDS Letter' | 'Transaction Data'

/** §17 table, as written in the spec (shown on each page so users see why a button is missing). */
export const ROLE_TABLE: Record<OpsModule, Record<Exclude<OpsPersona, 'None'>, string>> = {
  'Routine EOD': { Franchise: 'Submit / View own', CRM: 'Verify', Finance: 'View as authorized', Operations: 'Verify', Admin: 'Approve as configured' },
  'Cash Audit EOD': { Franchise: 'Submit / View own', CRM: 'Verify', Finance: 'View as authorized', Operations: 'Verify', Admin: 'Approve as configured' },
  'Monthly EOD': { Franchise: 'View own status', CRM: 'Verify', Finance: 'Reconcile', Operations: 'Verify', Admin: 'Approve' },
  'WLA Statement': { Franchise: 'Upload / View own', CRM: 'Verify', Finance: 'View / Process', Operations: 'No default access', Admin: 'Control' },
  'TDS Letter': { Franchise: 'View / Download own', CRM: 'Upload', Finance: 'Upload / Review', Operations: 'No default access', Admin: 'Control' },
  'Transaction Data': { Franchise: 'Read only – own sites', CRM: 'Create / Edit / Verify as authorized', Finance: 'View / Analyze as authorized', Operations: 'View / Analyze as authorized', Admin: 'Full control' },
}

export type OpsRights = {
  view: boolean
  create: boolean // CRM exceptional creation / upload / entry
  edit: boolean
  verify: boolean
  reconcile: boolean
  approve: boolean
  export: boolean
  process?: boolean // Finance processing (WLA) — API mode only
}

const NONE: OpsRights = { view: false, create: false, edit: false, verify: false, reconcile: false, approve: false, export: false }

function localRightsFor(module: OpsModule, role: Role): OpsRights {
  const p = personaOf(role)
  const ex = can('Export', role)
  if (p === 'None') return NONE
  if (p === 'Admin') return { view: true, create: can('Create', role), edit: can('Edit', role), verify: can('Edit', role), reconcile: can('Edit', role), approve: can('Approve', role), export: ex }
  switch (module) {
    case 'Routine EOD':
    case 'Cash Audit EOD':
      if (p === 'CRM' || p === 'Operations') return { ...NONE, view: true, create: can('Create', role), edit: can('Edit', role), verify: can('Edit', role) || can('Approve', role), export: ex }
      if (p === 'Finance') return { ...NONE, view: true, export: ex }
      return { ...NONE, view: true, create: true } // Franchise (mobile)
    case 'Monthly EOD':
      if (p === 'CRM' || p === 'Operations') return { ...NONE, view: true, verify: can('Edit', role) || can('Approve', role), export: ex }
      if (p === 'Finance') return { ...NONE, view: true, reconcile: can('Edit', role), export: ex }
      return { ...NONE, view: true }
    case 'WLA Statement':
      if (p === 'CRM') return { ...NONE, view: true, verify: can('Edit', role), export: ex }
      if (p === 'Finance') return { ...NONE, view: true, verify: can('Edit', role), export: ex }
      if (p === 'Operations') return NONE
      return { ...NONE, view: true, create: true }
    case 'TDS Letter':
      if (p === 'CRM') return { ...NONE, view: true, create: can('Create', role), export: ex }
      if (p === 'Finance') return { ...NONE, view: true, create: can('Create', role), verify: can('Edit', role), export: ex }
      if (p === 'Operations') return NONE
      return { ...NONE, view: true }
    case 'Transaction Data':
      if (p === 'CRM') return { ...NONE, view: true, create: can('Create', role), edit: can('Edit', role), verify: can('Edit', role), export: ex }
      if (p === 'Finance' || p === 'Operations') return { ...NONE, view: true, export: ex }
      return { ...NONE, view: true } // Franchise: read-only own sites (UAT 14)
  }
}

// ── API mode: effective rights from the backend Operations permission matrix (GET /ops-permissions/me) ──
// The backend is authoritative (§17 matrix + per-employee overrides). Until it has loaded, the local table above is used.
type OpsMe = { role: string; opsRoles: string[]; modules: Record<string, string[]> }
let opsMe: OpsMe | null = null
export const opsMeLoader = createLoader('operations permissions', async () => {
  opsMe = await get<OpsMe>('/ops-permissions/me')
})

function fromBackend(module: OpsModule, role: Role, acts: string[]): OpsRights {
  const has = (...a: string[]) => acts.includes('Control') || a.some((x) => acts.includes(x))
  const view = acts.length > 0
  const verify = module === 'Transaction Data' ? has('Create', 'Verify') : module === 'TDS Letter' ? has('Review') : has('Verify')
  return {
    view,
    create: module === 'Routine EOD' || module === 'Cash Audit EOD' ? has('Verify') && can('Create', role) : has('Create', 'Upload', 'Submit'),
    edit: module === 'Transaction Data' ? has('Create') : has('Control'),
    verify,
    reconcile: has('Reconcile'),
    approve: has('Approve'),
    process: has('Process'),
    export: view && (has('Export') || can('Export', role)),
  }
}

export function rightsFor(module: OpsModule, role: Role): OpsRights {
  if (apiEnabled) {
    void opsMeLoader.load()
    if (opsMe && opsMe.role === role) return fromBackend(module, role, opsMe.modules[module] ?? [])
  }
  return localRightsFor(module, role)
}
