// Security Framework (19.11.2026) — shared mock model for login, MFA, sessions, devices,
// lockout, alerts, policy administration and backups. The real enforcement belongs on the
// server (spec §6, §14, §22); this store only simulates it for the UI / UAT walkthrough.
import { createStore } from '@/lib/store'
import type { Role } from '@/lib/rbac'

export const nowIso = () => new Date().toISOString()
let seq = 0
export const sid = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`

// ── Central policy (§20 + the open decisions in §24) ─────────────────────
export type SecondSystemBehaviour = 'Block' | 'Approved Session Transfer'
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
    { id: 'SES-7001', accountId: 'USR-001', name: 'Paras Dubey', role: 'Super Admin', device: 'Windows PC (Office-07)', browser: 'Chrome 131 · 3 tabs', ip: '103.21.58.14', location: 'Noida, UP', startedAt: '2026-11-23T04:10:00.000Z', lastActiveAt: '2026-11-23T05:02:00.000Z', status: 'Active' },
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
export const securityStore = createStore<SecurityState>('dexter.security.v1', seed)
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
