// Security Framework (19.11.2026) — shared mock model for login, MFA, sessions, devices,
// lockout, alerts, policy administration and backups. The real enforcement belongs on the
// server (spec §6, §14, §22); this store only simulates it for the UI / UAT walkthrough.
import { useEffect, useState } from 'react'
import { createStore } from '@/lib/store'
import type { Role } from '@/lib/rbac'
import { apiEnabled, get, patch, post } from '@/lib/api'

export const nowIso = () => new Date().toISOString()
let seq = 0
export const sid = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`

// ── Central policy (§20 + the open decisions in §24) ─────────────────────
export type SecondSystemBehaviour = 'Block' | 'Approved Session Transfer' | 'Replace Previous'
export type SecurityPolicy = {
  minPasswordLength: number
  requireUpper: boolean
  requireLower: boolean
  requireNumber: boolean
  requireSpecial: boolean
  passwordExpiryDays: number // 0 = never
  passwordHistory: number // last N passwords that cannot be reused
  maxFailedAttempts: number
  lockoutMinutes: number // 0 = until Admin unlocks
  captchaAfterAttempts: number
  otpValidityMinutes: number // spec: max 5
  otpResendLimit: number
  otpVerifyAttempts: number
  smsOtpEnabled: boolean // spec: OFF for now, enable after SMS API integration
  emailOtpEnabled: boolean
  totpEnabled: boolean
  passkeyEnabled: boolean
  mfaRequired: Record<string, boolean> // per role — spec table: mandatory for every role
  sessionIdleMinutes: number
  accessTokenMinutes: number
  refreshTokenDays: number
  secondSystem: SecondSystemBehaviour
  deviceBinding: boolean
  deviceChangeNeedsApproval: boolean
  blockRootedDevices: boolean
  ipRiskMonitoring: boolean
  newDeviceVerification: boolean
  watermarkEnabled: boolean
  auditRetentionDays: number
  backupFrequency: 'Hourly' | 'Every 6 hours' | 'Daily' | 'Weekly'
  rpoHours: number
  rtoHours: number
  alertRecipients: string[]
  updatedAt: string
  updatedBy: string
}
const ALL_ROLES = ['Super Admin', 'Admin', 'Sub-Admin', 'Finance Team', 'Field Officer / Team Leader', 'Franchisee', 'Project Head', 'Project Team', 'Legal Team', 'Operations Team', 'MIS Team', 'Engineer']
export const DEFAULT_POLICY: SecurityPolicy = {
  minPasswordLength: 10,
  requireUpper: true,
  requireLower: true,
  requireNumber: true,
  requireSpecial: true,
  passwordExpiryDays: 90,
  passwordHistory: 5,
  maxFailedAttempts: 5,
  lockoutMinutes: 0,
  captchaAfterAttempts: 3,
  otpValidityMinutes: 5,
  otpResendLimit: 3,
  otpVerifyAttempts: 5,
  smsOtpEnabled: false,
  emailOtpEnabled: true,
  totpEnabled: true,
  passkeyEnabled: false,
  mfaRequired: Object.fromEntries(ALL_ROLES.map((r) => [r, true])),
  sessionIdleMinutes: 15,
  accessTokenMinutes: 15,
  refreshTokenDays: 7,
  secondSystem: 'Block',
  deviceBinding: true,
  deviceChangeNeedsApproval: true,
  blockRootedDevices: true,
  ipRiskMonitoring: true,
  newDeviceVerification: true,
  watermarkEnabled: true,
  auditRetentionDays: 2555,
  backupFrequency: 'Daily',
  rpoHours: 24,
  rtoHours: 4,
  alertRecipients: ['security@dexterindia.com', 'parasdubey@gmail.com'],
  updatedAt: '2026-11-19T10:00:00.000Z',
  updatedBy: 'System default',
}
export const policyStore = createStore<SecurityPolicy>('dexter.securityPolicy.v1', () => DEFAULT_POLICY)
export const usePolicy = () => policyStore.use()
/** Fields still waiting for a final value from Dexter management (§24). */
export const PENDING_DECISIONS: (keyof SecurityPolicy)[] = [
  'minPasswordLength', 'passwordExpiryDays', 'passwordHistory', 'maxFailedAttempts', 'lockoutMinutes', 'otpResendLimit', 'otpVerifyAttempts',
  'sessionIdleMinutes', 'accessTokenMinutes', 'refreshTokenDays', 'deviceChangeNeedsApproval', 'secondSystem', 'auditRetentionDays', 'backupFrequency', 'rpoHours', 'rtoHours', 'alertRecipients',
]

export function passwordRules(p: SecurityPolicy = policyStore.get()) {
  return [
    { label: `${p.minPasswordLength}+ characters`, test: (v: string) => v.length >= p.minPasswordLength },
    ...(p.requireUpper ? [{ label: 'Uppercase letter', test: (v: string) => /[A-Z]/.test(v) }] : []),
    ...(p.requireLower ? [{ label: 'Lowercase letter', test: (v: string) => /[a-z]/.test(v) }] : []),
    ...(p.requireNumber ? [{ label: 'Number', test: (v: string) => /\d/.test(v) }] : []),
    ...(p.requireSpecial ? [{ label: 'Special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) }] : []),
    { label: 'Not a common / guessable password', test: (v: string) => !/^(password|admin|dexter|qwerty|123456|welcome)/i.test(v) },
  ]
}

// ── User accounts (security view) ────────────────────────────────────────
export type MfaMethod = 'Email OTP' | 'SMS OTP' | 'Authenticator (TOTP)' | 'Passkey'
export type SecurityAccount = {
  id: string
  name: string
  role: Role | string
  mobile: string
  email: string
  status: 'Active' | 'Locked' | 'Blocked' | 'Disabled'
  failedAttempts: number
  lockedAt?: string
  lockReason?: string
  mfaMethod: MfaMethod
  mfaEnrolled: boolean
  mustChangePassword: boolean
  passwordChangedAt: string
  lastLoginAt?: string
}
export type Device = {
  id: string
  accountId: string
  platform: 'Android' | 'iOS' | 'Windows' | 'macOS'
  model: string
  imei?: string
  deviceIdentifier: string
  attestation: 'Passed' | 'Failed' | 'Not supported'
  rooted: boolean
  status: 'Registered' | 'Pending Approval' | 'Deactivated' | 'Rejected'
  registeredAt: string
  approvedBy?: string
  lastSeenAt: string
}
export type LoginEvent = {
  id: string
  accountId: string
  name: string
  at: string
  logoutAt?: string
  ip: string
  location: string
  device: string
  sessionId: string
  status: 'Success' | 'Failed' | 'Blocked' | 'MFA Failed' | 'Locked'
  reason?: string
}
export type ActiveSession = {
  id: string
  accountId: string
  name: string
  role: string
  device: string
  browser: string
  ip: string
  location: string
  startedAt: string
  lastActiveAt: string
  status: 'Active' | 'Idle' | 'Terminated'
}
export type SecurityAlert = {
  id: string
  at: string
  kind: 'New device' | 'Unusual IP' | 'Unusual location' | 'Repeated failed logins' | 'Multiple unauthorized attempts' | 'Suspicious session' | 'Unauthorized device change' | 'Attempt limit exceeded' | 'Second-system login'
  accountId: string
  name: string
  detail: string
  severity: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'Acknowledged' | 'Resolved'
  notified: string[]
}
export type SecurityAuditEvent = { id: string; at: string; actor: string; action: string; target: string; detail?: string; ip?: string }
export type BackupRun = { id: string; at: string; kind: 'Scheduled' | 'Manual'; scope: 'Full database' | 'Security logs' | 'Documents'; sizeMb: number; encrypted: boolean; status: 'Completed' | 'Failed' | 'Running'; restoredAt?: string; restoredBy?: string }

export type SecurityState = {
  accounts: SecurityAccount[]
  devices: Device[]
  logins: LoginEvent[]
  sessions: ActiveSession[]
  alerts: SecurityAlert[]
  audit: SecurityAuditEvent[]
  backups: BackupRun[]
}

function seed(): SecurityState {
  const A = (id: string, name: string, role: string, mobile: string, email: string, extra: Partial<SecurityAccount> = {}): SecurityAccount => ({
    id, name, role, mobile, email, status: 'Active', failedAttempts: 0, mfaMethod: 'Email OTP', mfaEnrolled: true, mustChangePassword: false, passwordChangedAt: '2026-10-01T09:00:00.000Z', ...extra,
  })
  const accounts = [
    A('USR-001', 'Paras Dubey', 'Super Admin', '9876543210', 'admin@dexterindia.com', { mfaMethod: 'Authenticator (TOTP)', lastLoginAt: '2026-11-23T04:10:00.000Z' }),
    A('USR-002', 'Meera Iyer', 'Admin', '9822012345', 'meera.iyer@dexterindia.in', { lastLoginAt: '2026-11-22T11:00:00.000Z' }),
    A('USR-003', 'Vikram Mehta', 'Operations Team', '9719020867', 'ops.lead@dexterindia.in', { lastLoginAt: '2026-11-23T03:20:00.000Z' }),
    A('USR-004', 'Priya Nair', 'Finance Team', '9811122233', 'priya.nair@dexterindia.in'),
    A('USR-005', 'Kavita Rao', 'Legal Team', '9833344455', 'kavita.rao@dexterindia.in'),
    A('USR-006', 'Rohit Verma', 'Project Head', '9844455566', 'rohit.verma@dexterindia.in'),
    A('USR-007', 'Arjun Sethi', 'Sub-Admin', '9855566677', 'arjun.sethi@dexterindia.in', { status: 'Locked', failedAttempts: 5, lockedAt: '2026-11-22T17:42:00.000Z', lockReason: '5 failed password attempts' }),
    A('USR-008', 'Deepak Joshi', 'MIS Team', '9866677788', 'deepak.joshi@dexterindia.in', { mfaEnrolled: false }),
    A('USR-009', 'Ranjeet Pal', 'Franchisee', '8126817131', 'ranjeetpal@gmail.com', { lastLoginAt: '2026-11-21T08:00:00.000Z' }),
    A('USR-010', 'Manoj Kumar', 'Field Officer / Team Leader', '9877788899', 'manoj.kumar@dexterindia.in', { mustChangePassword: true }),
  ]
  const devices: Device[] = [
    { id: 'DEV-01', accountId: 'USR-009', platform: 'Android', model: 'Samsung Galaxy M34', imei: '35•••••••••4421', deviceIdentifier: 'a1f4-9c2e-77b0', attestation: 'Passed', rooted: false, status: 'Registered', registeredAt: '2026-09-12T10:00:00.000Z', approvedBy: 'Meera Iyer', lastSeenAt: '2026-11-21T08:00:00.000Z' },
    { id: 'DEV-02', accountId: 'USR-010', platform: 'Android', model: 'Redmi Note 12', imei: '86•••••••••9912', deviceIdentifier: 'b7d2-11ac-4e9f', attestation: 'Passed', rooted: false, status: 'Registered', registeredAt: '2026-08-02T10:00:00.000Z', approvedBy: 'Paras Dubey', lastSeenAt: '2026-11-22T14:00:00.000Z' },
    { id: 'DEV-03', accountId: 'USR-010', platform: 'Android', model: 'Vivo Y56', imei: '35•••••••••1180', deviceIdentifier: 'c9e1-52bb-08aa', attestation: 'Passed', rooted: false, status: 'Pending Approval', registeredAt: '2026-11-22T15:30:00.000Z', lastSeenAt: '2026-11-22T15:30:00.000Z' },
    { id: 'DEV-04', accountId: 'USR-009', platform: 'Android', model: 'Unknown (rooted)', imei: '99•••••••••0001', deviceIdentifier: 'f0f0-dead-beef', attestation: 'Failed', rooted: true, status: 'Rejected', registeredAt: '2026-11-10T21:05:00.000Z', lastSeenAt: '2026-11-10T21:05:00.000Z' },
    { id: 'DEV-05', accountId: 'USR-003', platform: 'iOS', model: 'iPhone 14', deviceIdentifier: 'e3a9-77cd-2b10', attestation: 'Passed', rooted: false, status: 'Registered', registeredAt: '2026-07-19T10:00:00.000Z', approvedBy: 'Paras Dubey', lastSeenAt: '2026-11-23T03:20:00.000Z' },
  ]
  const L = (i: number, acc: SecurityAccount, at: string, status: LoginEvent['status'], ip: string, location: string, device: string, reason?: string): LoginEvent => ({ id: `LG-${9000 + i}`, accountId: acc.id, name: acc.name, at, ip, location, device, sessionId: `SES-${7000 + i}`, status, reason, logoutAt: status === 'Success' ? new Date(new Date(at).getTime() + 3 * 3600_000).toISOString() : undefined })
  const logins: LoginEvent[] = [
    L(1, accounts[0], '2026-11-23T04:10:00.000Z', 'Success', '103.21.58.14', 'Noida, Uttar Pradesh', 'Windows · Chrome 131'),
    L(2, accounts[2], '2026-11-23T03:20:00.000Z', 'Success', '49.36.112.7', 'Gurugram, Haryana', 'iOS · Dexter App 2.4'),
    L(3, accounts[6], '2026-11-22T17:40:00.000Z', 'Failed', '182.68.4.90', 'Delhi', 'Windows · Edge 130', 'Wrong password'),
    L(4, accounts[6], '2026-11-22T17:42:00.000Z', 'Locked', '182.68.4.90', 'Delhi', 'Windows · Edge 130', 'Max failed attempts reached'),
    L(5, accounts[8], '2026-11-21T08:00:00.000Z', 'Success', '106.205.9.3', 'Lucknow, Uttar Pradesh', 'Android · Dexter App 2.4'),
    L(6, accounts[8], '2026-11-10T21:05:00.000Z', 'Blocked', '185.220.101.4', 'Frankfurt, Germany (VPN)', 'Android (rooted)', 'Unregistered rooted device'),
    L(7, accounts[1], '2026-11-22T11:00:00.000Z', 'Success', '103.21.58.20', 'Noida, Uttar Pradesh', 'macOS · Safari 18'),
    L(8, accounts[3], '2026-11-22T09:15:00.000Z', 'MFA Failed', '103.21.58.31', 'Noida, Uttar Pradesh', 'Windows · Chrome 131', 'Wrong OTP'),
  ]
  const sessions: ActiveSession[] = [
    { id: 'SES-7001', accountId: 'USR-001', name: 'Paras Dubey', role: 'Super Admin', device: 'Windows PC (Office-07)', browser: 'Chrome 131 · 3 tabs', ip: '103.21.58.14', location: 'Noida, UP', startedAt: '2026-11-23T04:10:00.000Z', lastActiveAt: '2026-11-23T05:02:00.000Z', status: 'Terminated' },
    { id: 'SES-7002', accountId: 'USR-003', name: 'Vikram Mehta', role: 'Operations Team', device: 'iPhone 14', browser: 'Dexter App 2.4', ip: '49.36.112.7', location: 'Gurugram, HR', startedAt: '2026-11-23T03:20:00.000Z', lastActiveAt: '2026-11-23T04:48:00.000Z', status: 'Active' },
    { id: 'SES-7007', accountId: 'USR-002', name: 'Meera Iyer', role: 'Admin', device: 'MacBook Air', browser: 'Safari 18 · 1 tab', ip: '103.21.58.20', location: 'Noida, UP', startedAt: '2026-11-22T11:00:00.000Z', lastActiveAt: '2026-11-22T13:40:00.000Z', status: 'Idle' },
  ]
  const alerts: SecurityAlert[] = [
    { id: 'ALT-301', at: '2026-11-22T17:42:00.000Z', kind: 'Repeated failed logins', accountId: 'USR-007', name: 'Arjun Sethi', detail: '5 wrong passwords in 2 minutes from 182.68.4.90 — account locked', severity: 'High', status: 'Open', notified: ['security@dexterindia.com', 'Arjun Sethi'] },
    { id: 'ALT-298', at: '2026-11-10T21:05:00.000Z', kind: 'Unusual location', accountId: 'USR-009', name: 'Ranjeet Pal', detail: 'Login attempt from Frankfurt via VPN on an unregistered rooted device', severity: 'High', status: 'Resolved', notified: ['security@dexterindia.com', 'Ranjeet Pal'] },
    { id: 'ALT-305', at: '2026-11-22T15:30:00.000Z', kind: 'Unauthorized device change', accountId: 'USR-010', name: 'Manoj Kumar', detail: 'New phone (Vivo Y56) tried to sign in; waiting for Admin approval', severity: 'Medium', status: 'Open', notified: ['security@dexterindia.com'] },
  ]
  const backups: BackupRun[] = [
    { id: 'BKP-0121', at: '2026-11-23T00:30:00.000Z', kind: 'Scheduled', scope: 'Full database', sizeMb: 2380, encrypted: true, status: 'Completed' },
    { id: 'BKP-0120', at: '2026-11-22T00:30:00.000Z', kind: 'Scheduled', scope: 'Full database', sizeMb: 2371, encrypted: true, status: 'Completed' },
    { id: 'BKP-0119', at: '2026-11-22T00:45:00.000Z', kind: 'Scheduled', scope: 'Security logs', sizeMb: 140, encrypted: true, status: 'Completed' },
    { id: 'BKP-0118', at: '2026-11-21T00:30:00.000Z', kind: 'Scheduled', scope: 'Full database', sizeMb: 2365, encrypted: true, status: 'Failed' },
  ]
  return { accounts, devices, logins, sessions, alerts, audit: [], backups }
}
export const securityStore = createStore<SecurityState>('dexter.security.v2', seed)
export const useSecurity = () => securityStore.use()

export function logSecurity(e: Omit<SecurityAuditEvent, 'id' | 'at'>) {
  securityStore.set((s) => ({ ...s, audit: [{ id: sid('SAU'), at: nowIso(), ...e }, ...s.audit].slice(0, 3000) }))
}
export function updateAccount(id: string, patch: Partial<SecurityAccount>, audit?: { actor: string; action: string; detail?: string }) {
  securityStore.set((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
  if (audit) logSecurity({ ...audit, target: id })
}
export const findAccount = (identity: string) => {
  const v = identity.trim().toLowerCase().replace(/\D/g, '') || identity.trim().toLowerCase()
  return securityStore.get().accounts.find((a) => a.mobile === v || a.email.toLowerCase() === identity.trim().toLowerCase())
}
export function raiseAlert(a: Omit<SecurityAlert, 'id' | 'at' | 'status' | 'notified'>) {
  const p = policyStore.get()
  securityStore.set((s) => ({ ...s, alerts: [{ id: sid('ALT'), at: nowIso(), status: 'Open', notified: [...p.alertRecipients, a.name], ...a }, ...s.alerts] }))
}
export function recordLogin(e: Omit<LoginEvent, 'id' | 'at' | 'sessionId'>) {
  const ev: LoginEvent = { id: sid('LG'), at: nowIso(), sessionId: sid('SES'), ...e }
  securityStore.set((s) => ({ ...s, logins: [ev, ...s.logins].slice(0, 2000) }))
  return ev
}

// ── API mode (backend /security, /users, /audit) ─────────────────────────
// The store keeps its shape; `loadSecurity()` fills it from the server and the `securityApi` mutations
// call the backend and then reload the affected slice. Backups have no endpoint yet (stay local).
type Page<T> = { items: T[]; total: number }
type ApiUserRow = { userId: string; name: string; role: string; mobile: string; email: string; status: SecurityAccount['status']; failedAttempts?: number; lockedAt?: string; lockReason?: string; mfaMethod?: MfaMethod; mfaEnrolled?: boolean; mustChangePassword?: boolean; passwordChangedAt?: string; lastLoginAt?: string; franchiseId?: string; employeeId?: string }
type ApiDevice = { deviceId: string; userId: string; platform: string; model: string; imei?: string; deviceIdentifier: string; attestation?: Device['attestation']; rooted?: boolean; status: Device['status']; registeredAt: string; approvedBy?: string; lastSeenAt: string }
type ApiSession = { sessionId: string; userId: string; name: string; role: string; device: string; userAgent?: string; ip?: string; location?: string; startedAt: string; lastSeenAt: string; status: 'Active' | 'Revoked'; revokedReason?: string }
type ApiLogin = { _id?: string; userId: string; name: string; at: string; logoutAt?: string; ip?: string; location?: string; device?: string; sessionId?: string; status: LoginEvent['status']; reason?: string }
type ApiAlert = { alertId: string; at: string; kind: SecurityAlert['kind']; userId: string; name: string; detail: string; severity: SecurityAlert['severity']; status: SecurityAlert['status']; notified?: string[] }
type ApiAudit = { _id: string; at: string; actor?: { name?: string }; action: string; entity?: string; ref?: string; detail?: string; ip?: string; outcome?: string }

export const toAccount = (u: ApiUserRow): SecurityAccount => ({
  id: u.userId, name: u.name, role: u.role, mobile: u.mobile, email: u.email, status: u.status, failedAttempts: u.failedAttempts ?? 0, lockedAt: u.lockedAt, lockReason: u.lockReason,
  mfaMethod: u.mfaMethod ?? 'Email OTP', mfaEnrolled: u.mfaEnrolled ?? true, mustChangePassword: !!u.mustChangePassword, passwordChangedAt: u.passwordChangedAt ?? '', lastLoginAt: u.lastLoginAt,
})
const toDevice = (d: ApiDevice): Device => ({
  id: d.deviceId, accountId: d.userId, platform: (['Android', 'iOS', 'Windows', 'macOS'].includes(d.platform) ? d.platform : 'Windows') as Device['platform'], model: d.model, imei: d.imei, deviceIdentifier: d.deviceIdentifier,
  attestation: d.attestation ?? 'Not supported', rooted: !!d.rooted, status: d.status, registeredAt: d.registeredAt, approvedBy: d.approvedBy, lastSeenAt: d.lastSeenAt,
})
function toSession(x: ApiSession, idleMin: number): ActiveSession {
  const idle = Date.now() - new Date(x.lastSeenAt).getTime() > idleMin * 60_000
  return {
    id: x.sessionId, accountId: x.userId, name: x.name, role: x.role, device: x.device, browser: x.userAgent ?? '', ip: x.ip ?? '', location: x.location ?? '',
    startedAt: x.startedAt, lastActiveAt: x.lastSeenAt, status: x.status === 'Revoked' ? 'Terminated' : idle ? 'Idle' : 'Active',
  }
}
const toLogin = (l: ApiLogin, i: number): LoginEvent => ({ id: l._id ?? `LG-${i}`, accountId: l.userId, name: l.name, at: l.at, logoutAt: l.logoutAt, ip: l.ip ?? '', location: l.location ?? '', device: l.device ?? '', sessionId: l.sessionId ?? '', status: l.status, reason: l.reason })
const toAlert = (a: ApiAlert): SecurityAlert => ({ id: a.alertId, at: a.at, kind: a.kind, accountId: a.userId, name: a.name, detail: a.detail, severity: a.severity, status: a.status, notified: a.notified ?? [] })
const toAudit = (a: ApiAudit): SecurityAuditEvent => ({ id: a._id, at: a.at, actor: a.actor?.name ?? 'System', action: a.action, target: [a.entity, a.ref].filter(Boolean).join(' '), detail: a.detail, ip: a.ip })

const all = { limit: 200 }
/** Security policy (GET /security/settings — Super Admin / Admin). */
export async function loadPolicy() {
  const p = await get<Partial<SecurityPolicy>>('/security/settings')
  policyStore.set((cur) => ({ ...cur, ...p }))
  return policyStore.get()
}
export async function loadAccounts() {
  const r = await get<Page<ApiUserRow>>('/users', all)
  securityStore.set((s) => ({ ...s, accounts: r.items.map(toAccount) }))
}
export async function loadDevices() {
  const r = await get<Page<ApiDevice>>('/security/devices', all)
  securityStore.set((s) => ({ ...s, devices: r.items.map(toDevice) }))
}
export async function loadSessions() {
  const r = await get<Page<ApiSession>>('/security/sessions', { ...all, sort: '-lastSeenAt' })
  const idle = policyStore.get().sessionIdleMinutes
  securityStore.set((s) => ({ ...s, sessions: r.items.map((x) => toSession(x, idle)) }))
}
export async function loadLogins() {
  const r = await get<Page<ApiLogin>>('/security/login-events', { ...all, sort: '-at' })
  securityStore.set((s) => ({ ...s, logins: r.items.map(toLogin) }))
}
export async function loadAlerts() {
  const r = await get<Page<ApiAlert>>('/security/alerts', { ...all, sort: '-at' })
  securityStore.set((s) => ({ ...s, alerts: r.items.map(toAlert) }))
}
export async function loadSecurityAudit() {
  const r = await get<Page<ApiAudit>>('/audit', { ...all, category: 'security', sort: '-at' })
  securityStore.set((s) => ({ ...s, audit: r.items.map(toAudit) }))
}

/** Hydrate everything the Security pages show. Failing slices are reported, the others still load. */
export async function loadSecurity() {
  if (!apiEnabled) return []
  await loadPolicy().catch(() => undefined)
  const res = await Promise.allSettled([loadAccounts(), loadDevices(), loadSessions(), loadLogins(), loadAlerts(), loadSecurityAudit()])
  return res.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => (r.reason as Error)?.message ?? 'Load failed')
}

/** Page hook: loads the security data once per mount in API mode. */
export function useSecurityLoad() {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: apiEnabled, error: null })
  const reload = () => {
    if (!apiEnabled) return
    setState((s) => ({ ...s, loading: true }))
    loadSecurity()
      .then((errs) => setState({ loading: false, error: errs.length ? errs[0] : null }))
      .catch((e: Error) => setState({ loading: false, error: e.message }))
  }
  useEffect(reload, [])
  return { ...state, reload }
}

/** Backend mutations (API mode). Each refreshes the slice it changed. */
export const securityApi = {
  savePolicy: async (p: Partial<SecurityPolicy>) => {
    const body: Partial<SecurityPolicy> = { ...p }
    delete body.updatedAt
    delete body.updatedBy
    const r = await patch<Partial<SecurityPolicy>>('/security/settings', body)
    policyStore.set((cur) => ({ ...cur, ...r }))
  },
  unlock: async (userId: string, reason?: string) => {
    await post(`/security/users/${encodeURIComponent(userId)}/unlock`, { reason })
    await loadAccounts()
  },
  disableUser: async (userId: string, reason?: string) => {
    await post(`/users/${encodeURIComponent(userId)}/disable`, { reason })
    await Promise.all([loadAccounts(), loadSessions()])
  },
  enableUser: async (userId: string, reason?: string) => {
    await post(`/users/${encodeURIComponent(userId)}/enable`, { reason })
    await loadAccounts()
  },
  /** POST /users/:id/block {reason} → Blocked (≠ Locked / Disabled), sessions ended; /enable refuses a blocked user. */
  blockUser: async (userId: string, reason: string) => {
    await post(`/users/${encodeURIComponent(userId)}/block`, { reason })
    await Promise.all([loadAccounts(), loadSessions()])
  },
  /** POST /users/:id/unblock {reason} → Active, failed attempts reset. */
  unblockUser: async (userId: string, reason: string) => {
    await post(`/users/${encodeURIComponent(userId)}/unblock`, { reason })
    await loadAccounts()
  },
  /** POST /users/:id/mfa/reset {reason, mfaMethod?} — clears the enrolment, ends sessions; next sign-in asks for the OTP and re-enrols. */
  resetMfa: async (userId: string, reason: string, mfaMethod?: MfaMethod) => {
    await post(`/users/${encodeURIComponent(userId)}/mfa/reset`, { reason, ...(mfaMethod ? { mfaMethod } : {}) })
    await Promise.all([loadAccounts(), loadSessions()])
  },
  resetPassword: async (userId: string) => {
    const r = await post<{ temporaryPassword?: string }>(`/users/${encodeURIComponent(userId)}/reset-password`)
    await loadAccounts()
    return r?.temporaryPassword
  },
  approveDevice: async (id: string) => {
    await post(`/security/devices/${encodeURIComponent(id)}/approve`)
    await loadDevices()
  },
  rejectDevice: async (id: string) => {
    await post(`/security/devices/${encodeURIComponent(id)}/reject`)
    await loadDevices()
  },
  deactivateDevice: async (id: string) => {
    await post(`/security/devices/${encodeURIComponent(id)}/deactivate`)
    await Promise.all([loadDevices(), loadSessions()])
  },
  terminateSession: async (id: string) => {
    await post(`/security/sessions/${encodeURIComponent(id)}/terminate`)
    await loadSessions()
  },
  setAlertStatus: async (id: string, status: 'Acknowledged' | 'Resolved') => {
    await patch(`/security/alerts/${encodeURIComponent(id)}`, { status })
    await loadAlerts()
  },
}
