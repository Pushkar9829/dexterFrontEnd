// Mock auth: no backend yet. The session is kept in localStorage so a refresh keeps you signed in.
const KEY = 'dexter.session'

export type Session = { name: string; role: string; initials: string }

export const DEMO_USER: Session = { name: 'Ananya Sharma', role: 'Super administrator', initials: 'AS' }

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

export function signOut() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
