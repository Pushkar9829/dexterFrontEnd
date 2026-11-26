// API-mode sign-in step machine (backend /auth/*). The backend decides every step:
// password → MFA OTP → device verification → session conflict → forced password change → tokens.
// Each step answer is kept in sessionStorage so the step pages survive a refresh.
import { api, apiEnabled, ApiError, deviceId, setTokens } from '@/lib/api'
import { signInAs, type Session } from '@/lib/auth'
import { applyServerRights, type ServerRights } from '@/lib/rbac'
import { policyStore } from '@/data/security'
import { describeBrowser, initialsOf } from './flow'

export const DEMO_DEVICE_ID = 'demo-web-device'

export type OtpInfo = { channel: 'Email' | 'SMS'; sentTo: string; expiresAt: string; resendsLeft: number; devOtp?: string }
export type ApiUser = {
  userId: string
  name: string
  email: string
  mobile: string
  role: string
  status: string
  employeeId?: string
  franchiseId?: string
  mfaMethod?: string
  mfaEnrolled?: boolean
  mustChangePassword?: boolean
  passwordChangedAt?: string
  lastLoginAt?: string
}
export type DoneStep = {
  step: 'done'
  accessToken: string
  refreshToken: string
  expiresIn: number
  sessionId: string
  idleTimeoutMinutes: number
  user: ApiUser
  rights: ServerRights
}
export type PendingStep =
  | { step: 'mfa'; challengeId: string; method: string; otp: OtpInfo }
  | { step: 'device_verification'; challengeId: string; otp: OtpInfo }
  | { step: 'session_conflict'; challengeId: string; transferAllowed: boolean; activeOn: { device: string; ip?: string; since: string }[] }
  | { step: 'password_change'; challengeId: string; reason: 'must_change' | 'expired' }
export type StepResult = PendingStep | DoneStep

export type ApiPending = { identity: string; startedAt: number; res: PendingStep; device: string; location: string }

const KEY = 'dexter.auth.apiPending'
const TTL = 15 * 60_000
export function readApiPending(): ApiPending | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const p = raw ? (JSON.parse(raw) as ApiPending) : null
    return p && Date.now() - p.startedAt < TTL ? p : null
  } catch {
    return null
  }
}
function writeApiPending(p: ApiPending | null) {
  try {
    if (p) sessionStorage.setItem(KEY, JSON.stringify(p))
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
export const clearApiPending = () => writeApiPending(null)

export const STEP_ROUTE: Record<PendingStep['step'], string> = {
  mfa: '/login/mfa',
  device_verification: '/login/device',
  session_conflict: '/login/session',
  password_change: '/login/change-password',
}

/** Public (unauthenticated) auth call — never sends / refreshes a stale bearer token. */
export const authCall = <T>(path: string, body?: unknown, method = 'POST') => api<T>(path, { method, body, auth: false })

/** Store tokens, the session object (name, role, franchiseId …) and the effective rights. */
export function finishApiLogin(d: DoneStep) {
  setTokens({ accessToken: d.accessToken, refreshToken: d.refreshToken, expiresIn: d.expiresIn })
  signInAs(sessionFromUser(d.user, { sessionId: d.sessionId, idleTimeoutMinutes: d.idleTimeoutMinutes }))
  applyServerRights(d.rights)
  if (d.idleTimeoutMinutes) policyStore.set((p) => ({ ...p, sessionIdleMinutes: d.idleTimeoutMinutes }))
  clearApiPending()
}

export function sessionFromUser(u: ApiUser, extra: Partial<Session> = {}): Session {
  return {
    name: u.name,
    role: u.role,
    initials: initialsOf(u.name),
    email: u.email,
    mobile: u.mobile,
    userId: u.userId,
    employeeId: u.employeeId,
    franchiseId: u.franchiseId,
    ...extra,
  }
}

/** Route to show for a step answer (and remember it). `done` signs in and returns '/auth-success'. */
export function routeForStep(res: StepResult, base?: Partial<ApiPending>): string {
  if (res.step === 'done') {
    finishApiLogin(res)
    return '/auth-success'
  }
  const prev = readApiPending()
  writeApiPending({
    identity: base?.identity ?? prev?.identity ?? '',
    device: base?.device ?? prev?.device ?? describeBrowser().label,
    location: base?.location ?? prev?.location ?? '',
    startedAt: prev?.startedAt ?? Date.now(),
    res,
  })
  return STEP_ROUTE[res.step]
}

/** Step 1: identity + password. */
export async function apiLogin(identity: string, password: string, location: string, captcha?: { id: string; answer: string }) {
  if (!apiEnabled) throw new ApiError(0, 'API_DISABLED', 'API mode is off')
  setTokens(null)
  clearApiPending()
  const b = describeBrowser()
  const res = await authCall<StepResult>('/auth/login', {
    identity: identity.trim(),
    password,
    deviceId: deviceId(),
    deviceName: b.label,
    platform: 'Web',
    location: location || undefined,
    captchaId: captcha?.id,
    captchaAnswer: captcha?.answer,
  })
  return routeForStep(res, { identity: identity.trim(), device: b.label, location, startedAt: Date.now() })
}

/** Make this browser use the device id pre-registered for the demo personas (raw value, as lib/api reads it). */
export function setDemoDevice(on: boolean) {
  try {
    if (on) localStorage.setItem('dexter.deviceId', DEMO_DEVICE_ID)
    else if (localStorage.getItem('dexter.deviceId') === DEMO_DEVICE_ID) localStorage.removeItem('dexter.deviceId')
  } catch {
    /* ignore */
  }
}
export const usingDemoDevice = () => {
  try {
    return localStorage.getItem('dexter.deviceId') === DEMO_DEVICE_ID
  } catch {
    return false
  }
}

/** Human text for the backend's auth error codes. */
export function authErrorText(e: unknown): { title: string; text: string } {
  if (!(e instanceof ApiError)) return { title: 'Cannot reach the server', text: 'Check your connection and try again.' }
  const d = (e.details ?? {}) as { attemptsLeft?: number; until?: string }
  switch (e.code) {
    case 'INVALID_CREDENTIALS':
      return { title: 'Sign-in failed', text: `The mobile number / email or password is incorrect.${d.attemptsLeft !== undefined ? ` ${d.attemptsLeft} attempt(s) left before the account is locked.` : ''}` }
    case 'ACCOUNT_LOCKED':
      return { title: 'Account locked', text: e.message }
    case 'ACCOUNT_INACTIVE':
      return { title: 'Account not active', text: e.message }
    case 'OTP_INVALID':
      return { title: 'Code not accepted', text: `Incorrect code.${d.attemptsLeft !== undefined ? ` ${d.attemptsLeft} attempt(s) left.` : ''}` }
    case 'OTP_EXPIRED':
      return { title: 'Code expired', text: 'This code has expired. Request a new one.' }
    case 'OTP_USED':
      return { title: 'Code already used', text: 'Request a new code.' }
    case 'OTP_RESTRICTED':
      return { title: 'Verification restricted', text: e.message }
    case 'CHALLENGE_EXPIRED':
      return { title: 'Sign-in expired', text: e.message }
    case 'SESSION_CONFLICT':
      return { title: 'Second-system login blocked', text: e.message }
    case 'RATE_LIMITED':
      return { title: 'Too many attempts', text: e.message || 'Wait a minute and try again.' }
    default:
      return { title: 'Request failed', text: e.message }
  }
}
