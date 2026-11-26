import { lazy } from 'react'
import { Route } from 'react-router-dom'
const SecurityAdmin = lazy(() => import('./SecurityAdmin'))
const UsersAccess = lazy(() => import('./UsersAccess'))
const LiveSessions = lazy(() => import('./LiveSessions'))
import Devices from './Devices'
const LoginHistory = lazy(() => import('./LoginHistory'))
const SecurityAlerts = lazy(() => import('./SecurityAlerts'))
const RolesPermissions = lazy(() => import('./RolesPermissions'))
import Backup from './Backup'
const SecurityAudit = lazy(() => import('./SecurityAudit'))
export const securityAdminRoutes = [
  <Route key="sec-admin" path="/governance/security-admin" element={<SecurityAdmin />} />,
  <Route key="sec-users" path="/governance/users-access" element={<UsersAccess />} />,
  <Route key="sec-sessions" path="/governance/live-sessions" element={<LiveSessions />} />,
  <Route key="sec-devices" path="/governance/devices" element={<Devices />} />,
  <Route key="sec-logins" path="/governance/login-history" element={<LoginHistory />} />,
  <Route key="sec-alerts" path="/governance/alerts" element={<SecurityAlerts />} />,
  <Route key="sec-roles" path="/governance/roles" element={<RolesPermissions />} />,
  <Route key="sec-backup" path="/governance/backup" element={<Backup />} />,
  <Route key="sec-audit" path="/governance/security-audit" element={<SecurityAudit />} />,
]

const G = ['Workspace', 'Governance']
export const securityAdminCrumbs: Record<string, string[]> = {
  '/governance/security-admin': [...G, 'Security Administration'],
  '/governance/users-access': [...G, 'Users & Access'],
  '/governance/live-sessions': [...G, 'Live Sessions'],
  '/governance/devices': [...G, 'Devices'],
  '/governance/login-history': [...G, 'Login History'],
  '/governance/alerts': [...G, 'Security Alerts'],
  '/governance/roles': [...G, 'Roles & Permissions'],
  '/governance/backup': [...G, 'Backup & Recovery'],
  '/governance/security-audit': [...G, 'Security Audit'],
}

export const securityAdminTiles: { title: string; sub: string; to: string }[] = [
  { title: 'SECURITY ADMINISTRATION', sub: 'Central password, lockout, OTP / MFA, session, device, watermark, retention and backup policy.', to: '/governance/security-admin' },
  { title: 'USERS & ACCESS', sub: 'Unlock, block, disable, default password, reset MFA and force logout.', to: '/governance/users-access' },
  { title: 'LIVE SESSIONS', sub: 'Single active session per user — terminate a session or all sessions of a user.', to: '/governance/live-sessions' },
  { title: 'DEVICES', sub: 'Registered devices, attestation, rooted flags and device-change approvals.', to: '/governance/devices' },
  { title: 'LOGIN HISTORY', sub: 'Every login with IP, location, device, session and status.', to: '/governance/login-history' },
  { title: 'SECURITY ALERTS', sub: 'Suspicious logins, unusual IP / location, device changes — acknowledge, resolve, block.', to: '/governance/alerts' },
  { title: 'ROLES & PERMISSIONS', sub: 'Role × action matrix, data-access scope and Master Data visibility.', to: '/governance/roles' },
  { title: 'BACKUP & RECOVERY', sub: 'Encrypted backups, run now, guided restore, RPO / RTO.', to: '/governance/backup' },
  { title: 'SECURITY AUDIT', sub: 'Append-only trail of logins, admin, policy and permission changes.', to: '/governance/security-audit' },
]
