// Security mutations shared by several admin pages. Each one writes the store and an audit entry.
import { createStore } from '@/lib/store'
import type { DataScope, Role } from '@/lib/rbac'
import { logSecurity, securityApi, securityStore } from '@/data/security'
import { apiEnabled } from '@/lib/api'
import { toast } from '@/components/ui/Toast'

const apiFail = (e: Error) => toast(e.message || 'The server rejected the request.', 'error')

/** Terminate one session (status → Terminated). Returns false when it was not live. */
export function terminateSession(sessionId: string, who: string, reason = 'Terminated by Admin') {
  const s = securityStore.get().sessions.find((x) => x.id === sessionId)
  if (!s || s.status === 'Terminated') return false
  if (apiEnabled) {
    securityApi.terminateSession(sessionId).catch(apiFail) // audited server-side
    return true
  }
  securityStore.set((st) => ({ ...st, sessions: st.sessions.map((x) => (x.id === sessionId ? { ...x, status: 'Terminated' } : x)) }))
  logSecurity({ actor: who, action: 'Session terminated', target: s.accountId, detail: `${s.id} (${s.name}, ${s.device}) — ${reason}`, ip: s.ip })
  return true
}

/** Terminate every live session of a user; tokens are revoked server-side. Returns the count. */
export function terminateUserSessions(accountId: string, who: string, reason: string) {
  const live = securityStore.get().sessions.filter((x) => x.accountId === accountId && x.status !== 'Terminated')
  if (live.length === 0) return 0
  if (apiEnabled) {
    Promise.all(live.map((x) => securityApi.terminateSession(x.id))).catch(apiFail)
    return live.length
  }
  securityStore.set((st) => ({ ...st, sessions: st.sessions.map((x) => (x.accountId === accountId && x.status !== 'Terminated' ? { ...x, status: 'Terminated' } : x)) }))
  logSecurity({ actor: who, action: 'All sessions terminated', target: accountId, detail: `${live.length} session(s): ${live.map((s) => s.id).join(', ')} — ${reason}` })
  return live.length
}

// ── Data-access scope per role (§12) ─────────────────────────────────────
export const DEFAULT_SCOPES: Record<Role, DataScope> = {
  'Super Admin': 'Company',
  Admin: 'Company',
  'Sub-Admin': 'Region',
  'Project Head': 'Project',
  'Project Team': 'Project',
  'Finance Team': 'Company',
  'Legal Team': 'Company',
  'Operations Team': 'Region',
  'MIS Team': 'Company',
  'Field Officer / Team Leader': 'Team',
  Engineer: 'Employee',
  Franchisee: 'Franchise',
}
export const scopeStore = createStore<Record<Role, DataScope>>('dexter.roleScopes.v1', () => DEFAULT_SCOPES)
