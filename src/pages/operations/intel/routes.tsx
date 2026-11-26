import { lazy } from 'react'
import { Route } from 'react-router-dom'
const AiOverview = lazy(() => import('./AiOverview'))
const Mis = lazy(() => import('./Mis'))
import Permissions from './Permissions'
const Masters = lazy(() => import('./Masters'))
const ComplaintMaster = lazy(() => import('./ComplaintMaster'))
export const opsIntelRoutes = [
  <Route key="ops-ai-overview" path="/operations/ai-overview" element={<AiOverview />} />,
  <Route key="ops-mis" path="/operations/mis" element={<Mis />} />,
  <Route key="ops-permissions" path="/operations/permissions" element={<Permissions />} />,
  <Route key="ops-masters" path="/operations/masters" element={<Masters />} />,
  <Route key="ops-complaint-master" path="/operations/complaint-master" element={<ComplaintMaster />} />,
]

export const opsIntelCrumbs: Record<string, string[]> = {
  '/operations/ai-overview': ['Operations', 'AI Overview'],
  '/operations/mis': ['Operations', 'MIS & Reports'],
  '/operations/permissions': ['Operations', 'Permissions'],
  '/operations/masters': ['Operations', 'Master Data'],
  '/operations/complaint-master': ['Operations', 'Complaint Master'],
}
