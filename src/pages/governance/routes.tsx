import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
const GovernanceHub = lazy(() => import('./GovernanceHub'))
const GovernanceView = lazy(() => import('./GovernanceView'))
const PushNotifications = lazy(() => import('./PushNotifications'))
// The old demo Audit / Sessions / Compliance views were replaced by the real Security Audit,
// Live Sessions and DPDP Compliance pages — the legacy URLs redirect there.
export const governanceRoutes = [
  <Route key="governance-hub" path="/governance" element={<GovernanceHub />} />,
  <Route key="governance-push" path="/governance/push-notifications" element={<PushNotifications />} />,
  <Route key="governance-push-alias" path="/push-notifications" element={<PushNotifications />} />,
  <Route key="governance-audit" path="/governance/audit" element={<Navigate to="/governance/security-audit" replace />} />,
  <Route key="governance-sessions" path="/governance/sessions" element={<Navigate to="/governance/live-sessions" replace />} />,
  <Route key="governance-security" path="/governance/security" element={<GovernanceView section="security" />} />,
  <Route key="governance-compliance" path="/governance/compliance" element={<Navigate to="/governance/privacy" replace />} />,
]
