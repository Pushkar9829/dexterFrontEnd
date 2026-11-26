import { lazy } from 'react'
import { Route } from 'react-router-dom'
const Mfa = lazy(() => import('./Mfa'))
const DeviceVerify = lazy(() => import('./DeviceVerify'))
const SessionConflict = lazy(() => import('./SessionConflict'))
const ForceChangePassword = lazy(() => import('./ForceChangePassword'))
/** Extra sign-in steps (Security §5–§8). Public routes — render outside <AppShell />. */
export const authRoutes = [
  <Route key="login-mfa" path="/login/mfa" element={<Mfa />} />,
  <Route key="login-device" path="/login/device" element={<DeviceVerify />} />,
  <Route key="login-session" path="/login/session" element={<SessionConflict />} />,
  <Route key="login-change-password" path="/login/change-password" element={<ForceChangePassword />} />,
]
