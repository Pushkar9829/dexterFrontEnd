import { useMemo } from 'react'
import { useFranchises, type Franchise } from '@/data/franchises'
import { useRole, masterAccess, type Role } from '@/lib/rbac'

/** frId → franchise, memoised (1,284 franchises). */
export function useFrMap() {
  const frs = useFranchises()
  return useMemo(() => new Map<string, Franchise>(frs.map((f) => [f.id, f])), [frs])
}

/** What the current role may do on the Master Data hub pages. */
export function useHubRights() {
  const role: Role = useRole()
  const ma = masterAccess(role)
  const admin = role === 'Super Admin' || role === 'Admin'
  return {
    role,
    access: ma,
    full: ma === 'full',
    admin,
    /** Project-side mapping work (engineer, manager, TIS verification). */
    project: ma === 'full' || ma === 'project',
    finance: admin || role === 'Finance Team',
    legal: ma === 'full' || ma === 'legal',
    /** Account numbers are shown in full only to Finance / Admin (§19, DPDP masking). */
    seeAccounts: admin || role === 'Finance Team',
  }
}
