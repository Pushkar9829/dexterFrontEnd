// Mock auth: no backend yet. The session is kept in localStorage so a refresh keeps you signed in.
const KEY = 'dexter.session'

export type Session = { name: string; role: string; initials: string; email?: string }

export const DEMO_USER: Session = {
  name: 'Paras Dubey',
  role: 'Super administrator',
  initials: 'PD',
  email: 'parasdubey@gmail.com',
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
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

/** Sign in as a specific person / role (demo personas on the login page). */
export function signInAs(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage blocked — ignore */
  }
}

/** Demo: switch the role of the signed-in user (used by the role switcher in the top bar). */
export function setSessionRole(role: string) {
  const s = getSession()
  if (!s) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, role }))
  } catch {
    /* ignore */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
