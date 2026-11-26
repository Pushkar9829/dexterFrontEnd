// Session of the signed-in user. Mock mode: kept in localStorage so a refresh keeps you signed in.
// API mode (VITE_API_URL set): the same object is filled from the backend login / GET /auth/me response
// (name, role, franchiseId …) and the tokens live in lib/api.ts.
import { apiEnabled, hasTokens, post, setTokens } from './api'

const KEY = 'dexter.session'

export type Session = {
  name: string
  role: string
  initials: string
  email?: string
  /** API mode: backend identifiers of the signed-in user. */
  userId?: string
  employeeId?: string
  franchiseId?: string
  mobile?: string
  sessionId?: string
  /** API mode: server idle timeout for this session (minutes). */
  idleTimeoutMinutes?: number
  watermark?: string | null
}

export const DEMO_USER: Session = {
  name: 'Paras Dubey',
  role: 'Super administrator',
  initials: 'PD',
  email: 'parasdubey@gmail.com',
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    const s = raw ? (JSON.parse(raw) as Session) : null
    // API mode: a session without tokens is not a session (tokens cleared after logout / revocation).
    if (s && apiEnabled && !hasTokens()) return null
    return s
  } catch {
    return null
  }
}

export function signIn() {
  try {
    localStorage.setItem(KEY, JSON.stringify(DEMO_USER))
  } catch {
    /* storage blocked — ignore */
  }
}

/** Sign in as a specific person / role (demo personas on the login page; API mode: from the backend user). */
export function signInAs(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage blocked — ignore */
  }
}

/** Merge fields into the stored session (API mode: refreshed from GET /auth/me). */
export function patchSession(patch: Partial<Session>) {
  const s = getSession()
  if (!s) return
  signInAs({ ...s, ...patch })
}

/** Demo: switch the role of the signed-in user (used by the role switcher in the top bar). Ignored in API mode. */
export function setSessionRole(role: string) {
  if (apiEnabled) return
  const s = getSession()
  if (!s) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, role }))
  } catch {
    /* ignore */
  }
}

/** Sign out. API mode: ends the server session (POST /auth/logout) and drops the tokens. */
export function signOut() {
  if (apiEnabled && hasTokens()) {
    // The request captures the bearer token synchronously, so the tokens can be dropped right after.
    post('/auth/logout').catch(() => undefined)
    setTokens(null)
  }
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
