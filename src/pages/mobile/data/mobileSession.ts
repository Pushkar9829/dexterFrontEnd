// Mobile franchisee app ↔ web auth bridge. The mobile app signs in against the SAME mock auth as the web portal
// (security accounts + password store in src/pages/auth/flow.ts, session in src/lib/auth.ts), maps the signed-in
// franchisee to their Franchise Master record and scopes every screen to that franchise's Site Master sites.
import { useMemo, useSyncExternalStore } from 'react'
import { createStore } from '@/lib/store'
import { apiEnabled, ApiError, api, deviceId, setTokens } from '@/lib/api'
import { getSession, signInAs, signOut } from '@/lib/auth'
import {
  findAccount,
  logSecurity,
  nowIso,
  policyStore,
  raiseAlert,
  recordLogin,
  securityStore,
  updateAccount,
  type SecurityAccount,
} from '@/data/security'
import {
  applyAutoUnlock,
  browserDeviceId,
  checkPassword,
  initialsOf,
  issueOtp,
  maskMobile,
  mockIp,
  terminateBrowserSession,
  verifyOtp,
} from '@/pages/auth/flow'
import { franchiseStore, useFranchises, type Franchise } from '@/data/franchises'
import { networkStore, siteStore, useSites, type Site } from '@/data/network'
import { mobileFrStore, useMobileFr } from '@/pages/operations/eod2/fmt'

// ── roles ────────────────────────────────────────────────────────────────
/** Roles that may preview the franchisee app with the demo franchise switch. */
export const PREVIEW_ROLES = ['Super Admin', 'Admin', 'Super administrator']
export const isPreviewRole = (role?: string) => !!role && PREVIEW_ROLES.includes(role)
/** Roles allowed into the franchisee app at all. */
export const MOBILE_ROLES = ['Franchisee', ...PREVIEW_ROLES]
export const canUseMobile = (role?: string) => !!role && MOBILE_ROLES.includes(role)

/**
 * Security account → Franchise Master mapping for franchisee logins. The security store has no franchise link yet
 * (backend will carry it on the user record); Ranjeet Pal (USR-009, Uttar Pradesh) is the Awadh Banking Point
 * franchisee in Lucknow — the UP franchise used across Complaints / CBR / Legal seeds.
 */
export const FRANCHISEE_FR: Record<string, string> = { 'USR-009': 'FR-UP-00305' }

export function franchiseIdForAccount(acc: SecurityAccount | undefined): string {
  if (!acc) return ''
  if (FRANCHISEE_FR[acc.id]) return FRANCHISEE_FR[acc.id]
  const byName = franchiseStore.get().find((f) => f.name.toLowerCase() === acc.name.toLowerCase())
  return byName?.id ?? ''
}

// ── persisted mobile login meta (who signed in on the app + previous login time) ──
/** `api` is set when the app signed in against the backend (VITE_API_URL): the user record comes from /auth, not the mock security store. */
export type MobileApiUser = { userId: string; name: string; role: string; email?: string; mobile?: string; frId: string }
export type MobileAuthMeta = { accountId: string; loginAt: string; prevLoginAt?: string; channel: 'Password' | 'OTP'; api?: MobileApiUser }
export const mobileAuthStore = createStore<MobileAuthMeta | null>('dexter.mobile.auth.v1', () => null)

export type MobileUser = {
  accountId: string
  name: string
  role: string
  roleTitle: string
  initials: string
  phone: string
  email: string
  isPreview: boolean
  frId: string
  franchise?: Franchise
  franchiseCode: string
  loginAt?: string
  prevLoginAt?: string
}

function buildUser(): MobileUser | null {
  const s = getSession()
  const meta = mobileAuthStore.get()
  if (!s || !canUseMobile(s.role)) return null
  if (apiEnabled && meta?.api && meta.api.name === s.name) {
    const u = meta.api
    const isPrev = isPreviewRole(u.role)
    const fr = isPrev ? mobileFrStore.get() : u.frId
    return {
      accountId: u.userId, name: u.name, role: u.role, roleTitle: isPrev ? `${u.role} · Preview` : 'Franchise Partner', initials: s.initials || initialsOf(u.name),
      phone: u.mobile ? `+91 ${u.mobile}` : '—', email: u.email ?? '—', isPreview: isPrev, frId: fr, franchise: franchiseStore.get().find((x) => x.id === fr),
      franchiseCode: networkStore.get().nodes[fr]?.code ?? fr, loginAt: meta.loginAt, prevLoginAt: meta.prevLoginAt,
    }
  }
  const acc = (meta && securityStore.get().accounts.find((a) => a.id === meta.accountId && a.name === s.name)) || (s.email ? findAccount(s.email) : undefined)
  const isPreview = isPreviewRole(s.role)
  const frId = isPreview ? mobileFrStore.get() : franchiseIdForAccount(acc)
  const franchise = franchiseStore.get().find((f) => f.id === frId)
  return {
    accountId: acc?.id ?? '',
    name: s.name,
    role: s.role,
    roleTitle: isPreview ? `${s.role} · Preview` : 'Franchise Partner',
    initials: s.initials || initialsOf(s.name),
    phone: acc?.mobile ? `+91 ${acc.mobile}` : '—',
    email: s.email ?? acc?.email ?? '—',
    isPreview,
    frId,
    franchise,
    franchiseCode: networkStore.get().nodes[frId]?.code ?? frId,
    loginAt: meta?.accountId === acc?.id ? meta?.loginAt : undefined,
    prevLoginAt: meta?.accountId === acc?.id ? meta?.prevLoginAt : acc?.lastLoginAt,
  }
}

// cached snapshot so useSyncExternalStore gets a stable reference
let cacheKey = ''
let cacheUser: MobileUser | null = null
function snapshot(): MobileUser | null {
  const s = getSession()
  const key = JSON.stringify([s, mobileAuthStore.get(), mobileFrStore.get(), securityStore.get().accounts.length, franchiseStore.get().length])
  if (key !== cacheKey) {
    cacheKey = key
    cacheUser = buildUser()
  }
  return cacheUser
}
const listeners = new Set<() => void>()
/** Call after signIn / signOut (lib/auth is not a reactive store). */
export const notifySession = () => listeners.forEach((l) => l())
function subscribe(l: () => void) {
  listeners.add(l)
  const offs = [mobileAuthStore.subscribe(l), mobileFrStore.subscribe(l), securityStore.subscribe(l), franchiseStore.subscribe(l)]
  const onStorage = (e: StorageEvent) => e.key === 'dexter.session' && l()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    offs.forEach((o) => o())
    window.removeEventListener('storage', onStorage)
  }
}
export const useMobileUser = () => useSyncExternalStore(subscribe, snapshot)

/** Keep the shared mobile franchise context (used by CBR / EOD / WLA / TDS / Transactions) on the signed-in franchise. */
export function syncFranchiseContext(user: MobileUser | null) {
  if (user && !user.isPreview && user.frId && mobileFrStore.get() !== user.frId) mobileFrStore.set(user.frId)
}

// ── sign in / out ────────────────────────────────────────────────────────
export type SignInResult = { ok: true } | { ok: false; error: string }
const deviceMeta = () => {
  const id = browserDeviceId()
  return { ip: mockIp(id), location: 'Not shared (mobile app)', device: 'Dexter Franchise App (web preview)' }
}

function checkAccount(identity: string): { acc: SecurityAccount } | { error: string } {
  const raw = findAccount(identity)
  if (!raw) return { error: 'The mobile number / email or password is incorrect.' }
  const acc = applyAutoUnlock(raw)
  if (acc.status !== 'Active') {
    recordLogin({ accountId: acc.id, name: acc.name, ...deviceMeta(), status: acc.status === 'Locked' ? 'Locked' : 'Blocked', reason: `Mobile app sign-in on ${acc.status.toLowerCase()} account` })
    return { error: `This account is ${acc.status.toLowerCase()}. Contact your Admin.` }
  }
  if (!canUseMobile(String(acc.role))) return { error: `${acc.role} accounts use the web portal. The franchise app is for franchise partners (Admins may preview).` }
  if (!isPreviewRole(String(acc.role)) && !franchiseIdForAccount(acc)) return { error: 'No franchise is mapped to this login yet. Contact your CRM manager.' }
  return { acc }
}

function finish(acc: SecurityAccount, channel: MobileAuthMeta['channel']) {
  const meta = deviceMeta()
  const prev = acc.lastLoginAt
  recordLogin({ accountId: acc.id, name: acc.name, ...meta, status: 'Success' })
  updateAccount(acc.id, { lastLoginAt: nowIso(), failedAttempts: 0 })
  logSecurity({ actor: acc.name, action: 'Signed in', target: acc.id, detail: `Franchise mobile app · ${channel}`, ip: meta.ip })
  signInAs({ name: acc.name, role: String(acc.role), initials: initialsOf(acc.name), email: acc.email })
  mobileAuthStore.set({ accountId: acc.id, loginAt: nowIso(), prevLoginAt: prev, channel })
  const frId = franchiseIdForAccount(acc)
  if (!isPreviewRole(String(acc.role)) && frId) mobileFrStore.set(frId)
  notifySession()
}

export function mobileSignIn(identity: string, password: string): SignInResult {
  if (!identity.trim() || !password) return { ok: false, error: 'Enter your registered mobile / email and password.' }
  const r = checkAccount(identity)
  if ('error' in r) return { ok: false, error: r.error }
  const { acc } = r
  if (!checkPassword(acc, password)) {
    const p = policyStore.get()
    const n = acc.failedAttempts + 1
    const meta = deviceMeta()
    if (n >= p.maxFailedAttempts) {
      updateAccount(acc.id, { status: 'Locked', failedAttempts: n, lockedAt: nowIso(), lockReason: `${n} failed password attempts` }, { actor: 'System', action: 'Account locked', detail: `${n} failed attempts from the mobile app` })
      recordLogin({ accountId: acc.id, name: acc.name, ...meta, status: 'Locked', reason: 'Max failed attempts reached' })
      raiseAlert({ kind: 'Repeated failed logins', accountId: acc.id, name: acc.name, detail: `${n} wrong passwords from the franchise app — account locked`, severity: 'High' })
      return { ok: false, error: 'Too many failed attempts — account locked. Contact your Admin.' }
    }
    updateAccount(acc.id, { failedAttempts: n })
    recordLogin({ accountId: acc.id, name: acc.name, ...meta, status: 'Failed', reason: 'Wrong password' })
    return { ok: false, error: `The mobile number / email or password is incorrect. ${p.maxFailedAttempts - n} attempt(s) left.` }
  }
  finish(acc, 'Password')
  return { ok: true }
}

/** Login with OTP: issues an SMS OTP for the account (the demo shows the code — no SMS gateway yet). */
export function mobileOtpStart(identity: string): { ok: true; code: string; to: string } | { ok: false; error: string } {
  const r = checkAccount(identity)
  if ('error' in r) return { ok: false, error: r.error }
  const res = issueOtp('mfa-sms', r.acc.id)
  if (!res.ok) return { ok: false, error: res.reason }
  return { ok: true, code: res.challenge.code, to: maskMobile(r.acc.mobile) }
}
export function mobileOtpVerify(identity: string, code: string): SignInResult {
  const r = checkAccount(identity)
  if ('error' in r) return { ok: false, error: r.error }
  const v = verifyOtp('mfa-sms', r.acc, code)
  if (v !== 'ok') {
    const msg: Record<string, string> = { wrong: 'Incorrect code.', expired: 'Code expired — resend.', used: 'Code already used — resend.', missing: 'Request a code first.', restricted: 'Too many wrong codes — verification is temporarily restricted.' }
    recordLogin({ accountId: r.acc.id, name: r.acc.name, ...deviceMeta(), status: 'MFA Failed', reason: `Mobile OTP ${v}` })
    return { ok: false, error: msg[v] ?? 'Verification failed.' }
  }
  finish(r.acc, 'OTP')
  return { ok: true }
}

// ── backend sign-in (API mode): password → OTP (MFA, then new-device OTP when asked) → tokens ──
type AuthStep = { step: string; challengeId?: string; otp?: { sentTo?: string; devOtp?: string; channel?: string } }
type AuthDone = { step: 'done'; accessToken: string; refreshToken: string; expiresIn: number; user: { userId: string; name: string; email?: string; mobile?: string; role: string; franchiseId?: string } }
/** `login` = OTP-only sign-in challenge (/auth/otp-login/*); `mfa` / `device` = the steps after a password. */
export type OtpPurpose = 'mfa' | 'device' | 'login'
export type ApiLoginResult =
  | { ok: true }
  | { ok: 'otp'; challengeId: string; purpose: OtpPurpose; to: string; code?: string }
  | { ok: false; error: string }
const AUTH_MSG: Record<string, string> = {
  INVALID_CREDENTIALS: 'The mobile number / email or password is incorrect.',
  ACCOUNT_LOCKED: 'Too many failed attempts — account locked. Contact your Admin.',
  ACCOUNT_INACTIVE: 'This account is not active. Contact your Admin.',
  OTP_INVALID: 'Incorrect code.',
  OTP_EXPIRED: 'Code expired — resend.',
  OTP_USED: 'Code already used — resend.',
  OTP_RESTRICTED: 'Too many wrong codes — verification is temporarily restricted.',
  DEVICE_APPROVAL_PENDING: 'This device is waiting for Admin approval.',
  ACCOUNT_BLOCKED: 'Your account has been blocked by your Admin. Contact your Admin.',
  OTP_LOGIN_NOT_ALLOWED: 'Login with OTP is not enabled for your account — sign in with your password.',
  DEVICE_REJECTED: 'This device was rejected by your Admin.',
  DEVICE_ROOTED: 'Sign-in is not allowed on a rooted / jailbroken device.',
  CAPTCHA_REQUIRED: 'Too many attempts — sign in on the web portal (captcha required).',
}
function authErr(e: unknown): string {
  if (e instanceof ApiError) {
    const d = e.details as { attemptsLeft?: number; accountAttemptsLeft?: number } | undefined
    const left = d?.attemptsLeft ?? d?.accountAttemptsLeft
    const base = AUTH_MSG[e.code] ?? e.message
    return left !== undefined ? base + ' ' + left + ' attempt(s) left.' : base
  }
  return e instanceof Error ? e.message : 'Sign-in failed.'
}
async function nextStep(r: AuthStep | AuthDone): Promise<ApiLoginResult> {
  if (r.step === 'done') return finishApi(r as AuthDone)
  if ((r.step === 'mfa' || r.step === 'device_verification' || r.step === 'otp_login') && r.challengeId)
    return { ok: 'otp', challengeId: r.challengeId, purpose: r.step === 'mfa' ? 'mfa' : r.step === 'otp_login' ? 'login' : 'device', to: r.otp?.sentTo ?? 'your registered contact', code: r.otp?.devOtp }
  if (r.step === 'session_conflict' && r.challengeId) {
    if (!window.confirm('You are signed in on another system. Move the session to this app? The other session will end.')) return { ok: false, error: 'Sign-in cancelled — your other session stays active.' }
    return nextStep(await api<AuthStep | AuthDone>('/auth/session/transfer', { method: 'POST', body: { challengeId: r.challengeId }, auth: false }))
  }
  if (r.step === 'password_change') return { ok: false, error: 'Your password must be changed before first use — change it on the web portal, then sign in here.' }
  return { ok: false, error: 'Unexpected sign-in step: ' + r.step }
}
let pendingChannel: MobileAuthMeta['channel'] = 'Password'
function finishApi(r: AuthDone): ApiLoginResult {
  const u = r.user
  if (!canUseMobile(u.role)) return { ok: false, error: u.role + ' accounts use the web portal. The franchise app is for franchise partners (Admins may preview).' }
  if (!isPreviewRole(u.role) && !u.franchiseId) return { ok: false, error: 'No franchise is mapped to this login yet. Contact your CRM manager.' }
  setTokens(r)
  const prev = mobileAuthStore.get()
  signInAs({ name: u.name, role: u.role, initials: initialsOf(u.name), email: u.email })
  mobileAuthStore.set({
    accountId: u.userId, loginAt: nowIso(), prevLoginAt: (r as AuthDone & { previousLoginAt?: string | null }).previousLoginAt ?? (prev?.accountId === u.userId ? prev.loginAt : undefined), channel: pendingChannel,
    api: { userId: u.userId, name: u.name, role: u.role, email: u.email, mobile: u.mobile, frId: u.franchiseId ?? '' },
  })
  if (!isPreviewRole(u.role) && u.franchiseId) mobileFrStore.set(u.franchiseId)
  notifySession()
  return { ok: true }
}
/** Step 1 (API mode): identity + password → usually an OTP challenge (dev servers return the code for the demo). */
export async function mobileApiLogin(identity: string, password: string): Promise<ApiLoginResult> {
  if (!identity.trim() || !password) return { ok: false, error: 'Enter your registered mobile / email and password.' }
  pendingChannel = 'Password'
  try {
    const r = await api<AuthStep | AuthDone>('/auth/login', { method: 'POST', auth: false, body: { identity: identity.trim(), password, deviceId: deviceId(), deviceName: 'Dexter Franchise App (web preview)', platform: 'Web' } })
    return await nextStep(r)
  } catch (e) {
    return { ok: false, error: authErr(e) }
  }
}
/**
 * OTP-only sign-in (API mode): POST /auth/otp-login/start → `{step: 'otp_login', challengeId, otp}`. Allowed per role
 * by the security setting `allowOtpOnlyLogin` (default Franchisee only) — else 403 OTP_LOGIN_NOT_ALLOWED. Unknown
 * identities get an indistinguishable decoy challenge (the code is then simply refused).
 */
export async function mobileApiOtpStart(identity: string): Promise<ApiLoginResult> {
  if (!identity.trim()) return { ok: false, error: 'Enter your registered mobile number or email.' }
  pendingChannel = 'OTP'
  try {
    const r = await api<AuthStep>('/auth/otp-login/start', { method: 'POST', auth: false, body: { identity: identity.trim(), deviceId: deviceId(), deviceName: 'Dexter Franchise App (web preview)', platform: 'Web' } })
    return await nextStep(r)
  } catch (e) {
    return { ok: false, error: authErr(e) }
  }
}
/** Step 2 (API mode): the OTP of the current challenge (OTP sign-in, MFA or new device) → the remaining steps. */
export async function mobileApiVerify(challengeId: string, purpose: OtpPurpose, code: string): Promise<ApiLoginResult> {
  try {
    const r = await api<AuthStep | AuthDone>(purpose === 'login' ? '/auth/otp-login/verify' : purpose === 'mfa' ? '/auth/mfa/verify' : '/auth/device/verify', { method: 'POST', auth: false, body: { challengeId, code } })
    return await nextStep(r)
  } catch (e) {
    return { ok: false, error: authErr(e) }
  }
}
export async function mobileApiResend(challengeId: string, purpose: OtpPurpose): Promise<{ ok: true; code?: string } | { ok: false; error: string }> {
  try {
    const r = await api<AuthStep>('/auth/otp/resend', { method: 'POST', auth: false, body: { challengeId, purpose } })
    return { ok: true, code: r.otp?.devOtp }
  } catch (e) {
    return { ok: false, error: authErr(e) }
  }
}

export function mobileSignOut() {
  if (apiEnabled && mobileAuthStore.get()?.api) {
    void api('/auth/logout', { method: 'POST' })
      .catch(() => undefined)
      .finally(() => setTokens(null))
    signOut()
    mobileAuthStore.set(null)
    notifySession()
    return
  }
  const s = getSession()
  terminateBrowserSession('Signed out (mobile app)')
  if (s) logSecurity({ actor: s.name, action: 'Signed out', target: 'Franchise mobile app' })
  signOut()
  mobileAuthStore.set(null)
  notifySession()
}

// ── scope helpers ────────────────────────────────────────────────────────
/** The signed-in franchise and its Site Master sites (record-level scope for every screen). */
export function useMyScope() {
  const frId = useMobileFr()
  const { sites } = useSites()
  const frs = useFranchises()
  return useMemo(() => {
    const mine: Site[] = sites.filter((s) => s.frId === frId)
    return {
      frId,
      franchise: frs.find((f) => f.id === frId),
      sites: mine,
      siteIds: new Set(mine.map((s) => s.siteId)),
      atmIds: new Set(mine.map((s) => s.atmId)),
    }
  }, [frId, sites, frs])
}
export const myScopeNow = () => {
  const frId = mobileFrStore.get()
  return { frId, sites: siteStore.get().sites.filter((s) => s.frId === frId) }
}

// ── date helpers ─────────────────────────────────────────────────────────
export const fmtDateTime = (iso?: string) =>
  iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
export const fmtDate = (iso?: string) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export function relTime(iso?: string, now = Date.now()) {
  if (!iso || Number.isNaN(Date.parse(iso))) return '—'
  const diff = now - Date.parse(iso)
  const m = Math.round(diff / 60_000)
  if (Math.abs(m) < 1) return 'just now'
  if (diff < 0) return fmtDateTime(iso)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`
  return fmtDateTime(iso)
}
export const greeting = (d = new Date()) => (d.getHours() < 12 ? 'Good Morning' : d.getHours() < 17 ? 'Good Afternoon' : 'Good Evening')
