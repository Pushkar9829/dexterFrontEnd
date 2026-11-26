// Login / MFA / device / session flow for the web portal (Security Framework §2–§11).
// Everything here is a browser-side SIMULATION for UAT: the real checks (password hash with
// Argon2id, OTP issue/verify, device binding, single active session, lockout) must be enforced
// by the central authentication server (§6, §14, §22). Keep this module free of React so the
// rules can be read in one place.
import {
  findAccount,
  logSecurity,
  nowIso,
  policyStore,
  raiseAlert,
  recordLogin,
  securityStore,
  sid,
  updateAccount,
  type ActiveSession,
  type Device,
  type MfaMethod,
  type SecurityAccount,
  type SecurityPolicy,
} from '@/data/security'
import { signInAs } from '@/lib/auth'

/** Demo password for every seeded account until it is changed in this browser. */
export const DEMO_PASSWORD = 'Dexter@2026'
/** Wrong-OTP restriction window (not yet a policy field — §24 open decision). */
export const OTP_RESTRICT_MINUTES = 15
export const NO_LOCATION = 'Location permission not granted'

/**
 * Device-approval rule (§8): field / franchise users work on a bound device, so a new device
 * stays blocked until an Admin approves it. Office roles may continue after the new-device
 * email OTP; their device remains "Pending Approval" (they re-verify on each login from it)
 * until an Admin approves or rejects it.
 */
export const FIELD_ROLES = ['Franchisee', 'Field Officer / Team Leader', 'Engineer']
export const isFieldRole = (role: string) => FIELD_ROLES.includes(role)

// ── storage helpers ──────────────────────────────────────────────────────
function readJson<T>(store: Storage, key: string, fallback: T): T {
  try {
    const raw = store.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJson(store: Storage, key: string, value: unknown) {
  try {
    if (value === null) store.removeItem(key)
    else store.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked — the demo keeps working for this page only */
  }
}

/** FNV-1a — NOT a password hash. Stands in for the server's Argon2id (§4). */
export function mockHash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export const accountById = (id: string) => securityStore.get().accounts.find((a) => a.id === id)
export { findAccount }
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

export function maskEmail(email: string) {
  const [user, domain] = email.split('@')
  return `${user.slice(0, 2)}••••@${domain ?? ''}`
}
export const maskMobile = (m: string) => `+91 ••••• ••${m.replace(/\D/g, '').slice(-2)}`

// ── this browser (device id, label, IP, location) ────────────────────────
const DEVICE_KEY = 'dexter.deviceId'
export function browserDeviceId() {
  const existing = readJson<string | null>(localStorage, DEVICE_KEY, null)
  if (existing) return existing
  const part = () => Math.random().toString(16).slice(2, 6)
  const id = `web-${part()}-${part()}-${part()}`
  writeJson(localStorage, DEVICE_KEY, id)
  return id
}

export function describeBrowser() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS'
  const m = /Edg\/(\d+)/.exec(ua) ?? /OPR\/(\d+)/.exec(ua) ?? /Firefox\/(\d+)/.exec(ua) ?? /Chrome\/(\d+)/.exec(ua) ?? /Version\/(\d+).*Safari/.exec(ua)
  const name = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const browser = m ? `${name} ${m[1]}` : name
  const platform: Device['platform'] = os === 'Android' || os === 'iOS' || os === 'macOS' ? os : 'Windows'
  return { os, browser, platform, label: `${os} · ${browser}` }
}

/** Mock public IP (the server reads the real one from the request). Stable per browser. */
export const mockIp = (deviceId: string) => `103.21.58.${10 + (parseInt(mockHash(deviceId).slice(0, 4), 16) % 200)}`

/** Browser location — subject to permission (§7, §22). Resolves within `timeoutMs`. */
export function detectLocation(timeoutMs = 4000): Promise<string> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve(NO_LOCATION)
    let done = false
    const finish = (v: string) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(v)
    }
    const timer = setTimeout(() => finish(NO_LOCATION), timeoutMs)
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)} (±${Math.round(pos.coords.accuracy)} m, browser location)`),
        () => finish(NO_LOCATION),
        { timeout: timeoutMs, maximumAge: 10 * 60_000 },
      )
    } catch {
      finish(NO_LOCATION)
    }
  })
}

// ── credentials (mock) ───────────────────────────────────────────────────
type Cred = { hash: string; history: string[] }
const CRED_KEY = 'dexter.auth.credentials.v1'
const creds = () => readJson<Record<string, Cred>>(localStorage, CRED_KEY, {})
const pwHash = (accountId: string, pw: string) => mockHash(`${accountId}:${pw}`)

export function checkPassword(acc: SecurityAccount, pw: string) {
  const c = creds()[acc.id]
  return c ? c.hash === pwHash(acc.id, pw) : pw === DEMO_PASSWORD
}
/** True when `pw` is the current password or one of the last `policy.passwordHistory`. */
export function isRecentPassword(acc: SecurityAccount, pw: string, policy: SecurityPolicy = policyStore.get()) {
  const c = creds()[acc.id]
  const hist = c ? [c.hash, ...c.history] : [pwHash(acc.id, DEMO_PASSWORD)]
  return hist.slice(0, Math.max(1, policy.passwordHistory)).includes(pwHash(acc.id, pw))
}
export function setPassword(acc: SecurityAccount, pw: string) {
  const all = creds()
  const prev = all[acc.id] ?? { hash: pwHash(acc.id, DEMO_PASSWORD), history: [] }
  all[acc.id] = { hash: pwHash(acc.id, pw), history: [prev.hash, ...prev.history].slice(0, 24) }
  writeJson(localStorage, CRED_KEY, all)
  updateAccount(acc.id, { mustChangePassword: false, passwordChangedAt: nowIso() })
}
export function passwordExpired(acc: SecurityAccount, policy: SecurityPolicy) {
  if (!policy.passwordExpiryDays) return false
  return Date.now() - new Date(acc.passwordChangedAt).getTime() > policy.passwordExpiryDays * 86_400_000
}

// ── lockout (§9) ─────────────────────────────────────────────────────────
/** Auto-unlock when the policy has a timed lockout. Returns the (possibly updated) account. */
export function applyAutoUnlock(acc: SecurityAccount): SecurityAccount {
  const p = policyStore.get()
  if (acc.status === 'Locked' && p.lockoutMinutes > 0 && acc.lockedAt && Date.now() >= new Date(acc.lockedAt).getTime() + p.lockoutMinutes * 60_000) {
    updateAccount(acc.id, { status: 'Active', failedAttempts: 0, lockedAt: undefined, lockReason: undefined }, { actor: 'System', action: 'Account auto-unlocked', detail: `Lockout period of ${p.lockoutMinutes} min elapsed` })
    return accountById(acc.id) ?? acc
  }
  return acc
}
export function unlockTime(acc: SecurityAccount) {
  const p = policyStore.get()
  if (!acc.lockedAt || p.lockoutMinutes <= 0) return null
  return new Date(new Date(acc.lockedAt).getTime() + p.lockoutMinutes * 60_000)
}

// ── OTP (email / SMS) and TOTP ───────────────────────────────────────────
export type OtpPurpose = 'mfa-email' | 'mfa-sms' | 'device' | 'reset'
export type OtpChallenge = { purpose: OtpPurpose; accountId: string; code: string; issuedAt: number; expiresAt: number; sends: number; used: boolean }
const otpKey = (p: OtpPurpose) => `dexter.auth.otp.${p}`
const ATTEMPT_KEY = 'dexter.auth.otpAttempts'
const RESTRICT_KEY = 'dexter.auth.otpRestrict'

export const readOtp = (purpose: OtpPurpose, accountId: string) => {
  const ch = readJson<OtpChallenge | null>(sessionStorage, otpKey(purpose), null)
  return ch && ch.accountId === accountId ? ch : null
}
export function otpRestrictedUntil(accountId: string): number | null {
  const until = readJson<Record<string, number>>(localStorage, RESTRICT_KEY, {})[accountId]
  return until && until > Date.now() ? until : null
}
export const resendsLeft = (ch: OtpChallenge | null) => Math.max(0, policyStore.get().otpResendLimit - Math.max(0, (ch?.sends ?? 1) - 1))

export type IssueResult = { ok: true; challenge: OtpChallenge } | { ok: false; reason: string }
/** Issue (or re-issue) an OTP. Resends are counted per chain; a chain is restarted only after use or 15 min. */
export function issueOtp(purpose: OtpPurpose, accountId: string): IssueResult {
  const p = policyStore.get()
  const until = otpRestrictedUntil(accountId)
  if (until) return { ok: false, reason: `Verification is temporarily restricted until ${new Date(until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.` }
  const prev = readOtp(purpose, accountId)
  const continuing = prev && !prev.used && Date.now() - prev.issuedAt < 15 * 60_000
  const sends = continuing ? prev.sends + 1 : 1
  if (sends - 1 > p.otpResendLimit) return { ok: false, reason: `Resend limit reached (${p.otpResendLimit}). Wait a few minutes or contact your Admin.` }
  const now = Date.now()
  const challenge: OtpChallenge = { purpose, accountId, code: String(Math.floor(100000 + Math.random() * 900000)), issuedAt: now, expiresAt: now + p.otpValidityMinutes * 60_000, sends, used: false }
  writeJson(sessionStorage, otpKey(purpose), challenge)
  if (!continuing) resetAttempts(purpose, accountId)
  return { ok: true, challenge }
}

function attempts() {
  return readJson<Record<string, number>>(sessionStorage, ATTEMPT_KEY, {})
}
function resetAttempts(purpose: string, accountId: string) {
  const a = attempts()
  delete a[`${purpose}:${accountId}`]
  writeJson(sessionStorage, ATTEMPT_KEY, a)
}
export const attemptsLeft = (purpose: string, accountId: string) => Math.max(0, policyStore.get().otpVerifyAttempts - (attempts()[`${purpose}:${accountId}`] ?? 0))

/** Count a wrong code; after policy.otpVerifyAttempts the account's OTP verification is restricted. */
function failAttempt(purpose: string, acc: SecurityAccount): 'wrong' | 'restricted' {
  const p = policyStore.get()
  const a = attempts()
  const k = `${purpose}:${acc.id}`
  a[k] = (a[k] ?? 0) + 1
  writeJson(sessionStorage, ATTEMPT_KEY, a)
  if (a[k] < p.otpVerifyAttempts) return 'wrong'
  const map = readJson<Record<string, number>>(localStorage, RESTRICT_KEY, {})
  map[acc.id] = Date.now() + OTP_RESTRICT_MINUTES * 60_000
  writeJson(localStorage, RESTRICT_KEY, map)
  delete a[k]
  writeJson(sessionStorage, ATTEMPT_KEY, a)
  raiseAlert({ kind: 'Attempt limit exceeded', accountId: acc.id, name: acc.name, detail: `${p.otpVerifyAttempts} wrong verification codes (${purpose}) — verification restricted for ${OTP_RESTRICT_MINUTES} min`, severity: 'High' })
  logSecurity({ actor: acc.name, action: 'OTP verification restricted', target: acc.id, detail: purpose })
  return 'restricted'
}

export type VerifyResult = 'ok' | 'wrong' | 'expired' | 'used' | 'missing' | 'restricted'
export function verifyOtp(purpose: OtpPurpose, acc: SecurityAccount, code: string): VerifyResult {
  if (otpRestrictedUntil(acc.id)) return 'restricted'
  const ch = readOtp(purpose, acc.id)
  if (!ch) return 'missing'
  if (ch.used) return 'used'
  if (Date.now() > ch.expiresAt) return 'expired'
  if (ch.code !== code) return failAttempt(purpose, acc)
  writeJson(sessionStorage, otpKey(purpose), { ...ch, used: true })
  resetAttempts(purpose, acc.id)
  return 'ok'
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
/** Demo TOTP secret (the server generates and stores the real one, encrypted). */
export function totpSecret(accountId: string) {
  let out = ''
  for (let i = 0; out.length < 16; i++) for (const ch of mockHash(`totp:${accountId}:${i}`)) if (out.length < 16) out += B32[parseInt(ch, 16) * 2 + (i % 2)]
  return out
}
export const totpStep = (at = Date.now()) => Math.floor(at / 30_000)
/** Demo 6-digit TOTP for a 30-second step (a real app uses RFC 6238 HMAC-SHA1). */
export const totpCode = (accountId: string, step = totpStep()) => String(parseInt(mockHash(`${totpSecret(accountId)}:${step}`), 16) % 1_000_000).padStart(6, '0')

const TOTP_USED_KEY = 'dexter.auth.totpUsed'
export function verifyTotp(acc: SecurityAccount, code: string): VerifyResult {
  if (otpRestrictedUntil(acc.id)) return 'restricted'
  const now = totpStep()
  const step = [now, now - 1].find((s) => totpCode(acc.id, s) === code)
  if (step === undefined) return failAttempt('totp', acc)
  const used = readJson<Record<string, number>>(localStorage, TOTP_USED_KEY, {})
  if ((used[acc.id] ?? -1) >= step) return 'used'
  used[acc.id] = step
  writeJson(localStorage, TOTP_USED_KEY, used)
  resetAttempts('totp', acc.id)
  return 'ok'
}

// ── pending login (between password and the app) ────────────────────────
export type DeviceMode = 'verify' | 'waiting' | 'rejected'
export type Pending = {
  accountId: string
  deviceId: string
  device: string
  browser: string
  platform: Device['platform']
  ip: string
  location: string
  startedAt: number
  mfaDone: boolean
  mfaMethod?: string
  deviceDone: boolean
  deviceVerified: boolean
  deviceMode?: DeviceMode
  sessionDone: boolean
  sessionConflict: boolean
  pwChanged: boolean
  flags: string[] // one-shot side effects already done (alerts / records)
}
const PENDING_KEY = 'dexter.auth.pending'
const PENDING_TTL = 15 * 60_000

export function readPending(): Pending | null {
  const p = readJson<Pending | null>(sessionStorage, PENDING_KEY, null)
  return p && Date.now() - p.startedAt < PENDING_TTL ? p : null
}
export const writePending = (p: Pending) => writeJson(sessionStorage, PENDING_KEY, p)
export const clearPending = () => writeJson(sessionStorage, PENDING_KEY, null)
export function patchPending(patch: Partial<Pending>) {
  const p = readPending()
  if (p) writePending({ ...p, ...patch })
}

export function startPending(acc: SecurityAccount, location: string): Pending {
  const deviceId = browserDeviceId()
  const b = describeBrowser()
  const p: Pending = {
    accountId: acc.id,
    deviceId,
    device: b.label,
    browser: b.browser,
    platform: b.platform,
    ip: mockIp(deviceId),
    location,
    startedAt: Date.now(),
    mfaDone: false,
    deviceDone: false,
    deviceVerified: false,
    sessionDone: false,
    sessionConflict: false,
    pwChanged: false,
    flags: [],
  }
  writePending(p)
  return p
}

const once = (p: Pending, flag: string, fn: () => void) => {
  if (p.flags.includes(flag)) return
  p.flags = [...p.flags, flag]
  fn()
}
const record = (p: Pending, acc: SecurityAccount, status: 'Success' | 'Failed' | 'Blocked' | 'MFA Failed' | 'Locked', reason?: string) =>
  recordLogin({ accountId: acc.id, name: acc.name, ip: p.ip, location: p.location, device: p.device, status, reason })

export function recordMfaFailure(acc: SecurityAccount, reason: string) {
  const p = readPending()
  if (p) record(p, acc, 'MFA Failed', reason)
}

// ── sessions (§6, §10) ───────────────────────────────────────────────────
const BROWSER_SESSIONS_KEY = 'dexter.auth.browserSessions'
const CURRENT_SESSION_KEY = 'dexter.auth.currentSession'
const browserSessions = () => readJson<string[]>(localStorage, BROWSER_SESSIONS_KEY, [])
/** The ActiveSession id of the signed-in user in this browser (all tabs share it). */
export const currentSessionId = () => readJson<string | null>(localStorage, CURRENT_SESSION_KEY, null)

/** Active sessions of the account on OTHER systems (same-browser tabs/windows are one session). */
export function conflictingSessions(accountId: string): ActiveSession[] {
  const mine = browserSessions()
  return securityStore.get().sessions.filter((s) => s.accountId === accountId && s.status === 'Active' && !mine.includes(s.id))
}

export function terminateSessions(accountId: string, filter: (s: ActiveSession) => boolean = () => true) {
  let n = 0
  securityStore.set((s) => ({
    ...s,
    sessions: s.sessions.map((x) => {
      if (x.accountId === accountId && x.status !== 'Terminated' && filter(x)) {
        n++
        return { ...x, status: 'Terminated' as const, lastActiveAt: nowIso() }
      }
      return x
    }),
  }))
  return n
}

/** End this browser's session (for the sign-out button / idle timeout). */
export function terminateBrowserSession(reason = 'Signed out') {
  const id = currentSessionId()
  if (!id) return
  const s = securityStore.get().sessions.find((x) => x.id === id)
  if (s) {
    terminateSessions(s.accountId, (x) => x.id === id)
    securityStore.set((st) => ({ ...st, logins: st.logins.map((l) => (l.sessionId === id && !l.logoutAt ? { ...l, logoutAt: nowIso() } : l)) }))
    logSecurity({ actor: s.name, action: reason, target: id })
  }
  writeJson(localStorage, CURRENT_SESSION_KEY, null)
}

/** Approved Session Transfer: end the session(s) on the other system and continue here. */
export function transferSession() {
  const p = readPending()
  const acc = p && accountById(p.accountId)
  if (!p || !acc) return
  const others = conflictingSessions(acc.id)
  const ids = new Set(others.map((o) => o.id))
  terminateSessions(acc.id, (x) => ids.has(x.id))
  logSecurity({ actor: acc.name, action: 'Session transferred', target: acc.id, detail: `Ended ${others.map((o) => `${o.id} (${o.device})`).join(', ')} → ${p.device}`, ip: p.ip })
  raiseAlert({ kind: 'Second-system login', accountId: acc.id, name: acc.name, detail: `Session transferred to ${p.device} (${p.ip}) after confirmation; previous session on ${others[0]?.device ?? 'another system'} ended`, severity: 'Medium' })
  writePending({ ...p, sessionDone: true, sessionConflict: false })
}

// ── devices (§8) ─────────────────────────────────────────────────────────
const devicesFor = (accountId: string, deviceId: string) => securityStore.get().devices.filter((d) => d.accountId === accountId && d.deviceIdentifier === deviceId)

function addDevice(p: Pending, acc: SecurityAccount, status: Device['status'], approvedBy?: string) {
  const d: Device = {
    id: sid('DEV'),
    accountId: acc.id,
    platform: p.platform,
    model: `${p.browser} (web browser)`,
    deviceIdentifier: p.deviceId,
    attestation: 'Not supported',
    rooted: false,
    status,
    registeredAt: nowIso(),
    approvedBy,
    lastSeenAt: nowIso(),
  }
  securityStore.set((s) => ({ ...s, devices: [d, ...s.devices] }))
  logSecurity({ actor: acc.name, action: status === 'Registered' ? 'Device registered' : 'Device registration requested', target: d.id, detail: `${p.device} · ${p.deviceId}`, ip: p.ip })
}

/** Returns the device route when a device step is needed, or null when the device is fine. Mutates `p`. */
function resolveDevice(p: Pending, acc: SecurityAccount, policy: SecurityPolicy): string | null {
  const devs = devicesFor(acc.id, p.deviceId)
  const reg = devs.find((d) => d.status === 'Registered')
  if (reg) {
    securityStore.set((s) => ({ ...s, devices: s.devices.map((d) => (d.id === reg.id ? { ...d, lastSeenAt: nowIso() } : d)) }))
    p.deviceDone = true
    return null
  }
  if (devs.some((d) => d.status === 'Rejected' || d.status === 'Deactivated')) {
    p.deviceMode = 'rejected'
    once(p, 'device-rejected', () => {
      record(p, acc, 'Blocked', 'Device rejected / deactivated by Admin')
      raiseAlert({ kind: 'Unauthorized device change', accountId: acc.id, name: acc.name, detail: `Sign-in from a rejected / deactivated device (${p.device}, ${p.ip})`, severity: 'High' })
    })
    return '/login/device'
  }
  const pending = devs.some((d) => d.status === 'Pending Approval')
  const field = isFieldRole(acc.role)
  const waiting = () => {
    p.deviceMode = 'waiting'
    once(p, 'device-waiting', () => {
      record(p, acc, 'Blocked', 'Device awaiting Admin approval')
      const hasOther = securityStore.get().devices.some((d) => d.accountId === acc.id && d.status === 'Registered')
      if (hasOther) raiseAlert({ kind: 'Unauthorized device change', accountId: acc.id, name: acc.name, detail: `New device ${p.device} tried to sign in; waiting for Admin approval`, severity: 'Medium' })
    })
    return '/login/device'
  }
  if (pending && policy.deviceChangeNeedsApproval && field) return waiting()
  if (policy.newDeviceVerification && !p.deviceVerified) {
    p.deviceMode = 'verify'
    once(p, 'device-new', () => {
      raiseAlert({ kind: 'New device', accountId: acc.id, name: acc.name, detail: `Sign-in from a new device: ${p.device} · ${p.ip} · ${p.location}`, severity: 'Medium' })
      issueOtp('device', acc.id)
    })
    return '/login/device'
  }
  if (!policy.deviceChangeNeedsApproval) {
    addDevice(p, acc, 'Registered', policy.newDeviceVerification ? 'Self (email OTP verified)' : 'Auto (policy)')
    p.deviceDone = true
    return null
  }
  if (!pending) addDevice(p, acc, 'Pending Approval')
  if (field) return waiting()
  p.deviceDone = true // office role: continue; device stays Pending Approval for the Admin
  return null
}

// ── the step machine ─────────────────────────────────────────────────────
export function mfaRequiredFor(role: string, policy: SecurityPolicy = policyStore.get()) {
  return policy.mfaRequired[role] ?? true
}
export function needsPasswordChange(acc: SecurityAccount, policy: SecurityPolicy) {
  return acc.mustChangePassword || passwordExpired(acc, policy)
}

/**
 * Decide the next step after the current one is complete. Call ONLY from event handlers:
 * it performs the one-shot side effects (alerts, login records, OTP issue, sign-in).
 */
export function nextRoute(): string {
  const p = readPending()
  const acc = p && accountById(p.accountId)
  if (!p || !acc) {
    clearPending()
    return '/login'
  }
  if (acc.status !== 'Active') {
    clearPending()
    return '/login'
  }
  const policy = policyStore.get()
  const go = (route: string) => {
    writePending(p)
    return route
  }
  if (!p.mfaDone) {
    if (mfaRequiredFor(acc.role, policy)) return go('/login/mfa')
    p.mfaDone = true
    p.mfaMethod = 'Not required by policy'
  }
  if (!p.deviceDone) {
    const r = resolveDevice(p, acc, policy)
    if (r) return go(r)
  }
  if (!p.sessionDone) {
    const others = conflictingSessions(acc.id)
    if (others.length) {
      p.sessionConflict = true
      if (policy.secondSystem === 'Block')
        once(p, 'second-system', () => {
          record(p, acc, 'Blocked', `Second-system login blocked — active on ${others[0].device}`)
          raiseAlert({ kind: 'Second-system login', accountId: acc.id, name: acc.name, detail: `Sign-in attempt from ${p.device} (${p.ip}) while active on ${others[0].device} (${others[0].ip}) — blocked`, severity: 'High' })
        })
      return go('/login/session')
    }
    p.sessionDone = true
    p.sessionConflict = false
  }
  if (!p.pwChanged && needsPasswordChange(acc, policy)) return go('/login/change-password')
  finishLogin(p, acc)
  return '/auth-success'
}

function finishLogin(p: Pending, acc: SecurityAccount) {
  const ev = record(p, acc, 'Success')
  // Previous sessions of this account from this same browser are replaced (tabs share one session).
  const mine = browserSessions()
  terminateSessions(acc.id, (x) => mine.includes(x.id))
  const session: ActiveSession = {
    id: ev.sessionId,
    accountId: acc.id,
    name: acc.name,
    role: String(acc.role),
    device: p.device,
    browser: `${p.browser} · web portal`,
    ip: p.ip,
    location: p.location,
    startedAt: nowIso(),
    lastActiveAt: nowIso(),
    status: 'Active',
  }
  securityStore.set((s) => ({ ...s, sessions: [session, ...s.sessions] }))
  writeJson(localStorage, BROWSER_SESSIONS_KEY, [ev.sessionId, ...mine].slice(0, 50))
  writeJson(localStorage, CURRENT_SESSION_KEY, ev.sessionId)
  updateAccount(acc.id, { lastLoginAt: nowIso(), failedAttempts: 0 })
  logSecurity({ actor: acc.name, action: 'Signed in', target: ev.sessionId, detail: `Web portal · 2nd factor: ${p.mfaMethod ?? '—'} · ${p.device}`, ip: p.ip })
  signInAs({ name: acc.name, role: String(acc.role), initials: initialsOf(acc.name), email: acc.email })
  clearPending()
}

/** Abandon a half-finished login (Back to sign in). */
export function abandonLogin() {
  clearPending()
}

export type { MfaMethod }

// ── password reset flow state (§3) ───────────────────────────────────────
export type ResetState = { accountId: string; verified: boolean; startedAt: number }
const RESET_KEY = 'dexter.auth.reset'
export function readReset(): ResetState | null {
  const r = readJson<ResetState | null>(sessionStorage, RESET_KEY, null)
  return r && Date.now() - r.startedAt < PENDING_TTL ? r : null
}
export const writeReset = (r: ResetState | null) => writeJson(sessionStorage, RESET_KEY, r)

/** mm:ss for countdowns. */
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export const otpComplete = (v: string) => /^\d{6}$/.test(v)
