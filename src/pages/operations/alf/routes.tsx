import { lazy } from 'react'
import { Route } from 'react-router-dom'
const AlfRegister = lazy(() => import('./AlfRegister'))
const AlfForm = lazy(() => import('./AlfForm'))
// ALF Register (Operations §4). The ALF Forecast page stays at /operations/alf-forecast (payout/business routes).
export const alfRoutes = [
  <Route key="ops-alf" path="/operations/alf" element={<AlfRegister />} />,
  <Route key="ops-alf-new" path="/operations/alf/new" element={<AlfForm />} />,
]

const ALF = ['Workspace', 'Operations', 'Cash Loading Register', 'ALF Register']
export const alfCrumbs: Record<string, string[]> = {
  '/operations/alf': ALF,
  '/operations/alf/new': [...ALF, 'New ALF Request'],
}
