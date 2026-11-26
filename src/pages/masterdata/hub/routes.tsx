import { lazy } from 'react'
import { Route } from 'react-router-dom'
const MasterOverview = lazy(() => import('./MasterOverview'))
const EngineerMapping = lazy(() => import('./EngineerMapping'))
const ManagerMapping = lazy(() => import('./ManagerMapping'))
const StaffMapping = lazy(() => import('./StaffMapping'))
const Categories = lazy(() => import('./Categories'))
const LegalTracking = lazy(() => import('./LegalTracking'))
const TisRegister = lazy(() => import('./TisRegister'))
const AccountMapping = lazy(() => import('./AccountMapping'))
const AuditLog = lazy(() => import('./AuditLog'))
export const masterHubRoutes = [
  <Route key="master-hub" path="/master-data" element={<MasterOverview />} />,
  <Route key="master-hub-overview" path="/master-data/overview" element={<MasterOverview />} />,
  <Route key="master-hub-engineers" path="/master-data/engineers" element={<EngineerMapping />} />,
  <Route key="master-hub-managers" path="/master-data/managers" element={<ManagerMapping />} />,
  <Route key="master-hub-staff" path="/master-data/staff" element={<StaffMapping />} />,
  <Route key="master-hub-categories" path="/master-data/categories" element={<Categories />} />,
  <Route key="master-hub-legal" path="/master-data/legal-tracking" element={<LegalTracking />} />,
  <Route key="master-hub-tis" path="/master-data/tis" element={<TisRegister />} />,
  <Route key="master-hub-accounts" path="/master-data/accounts" element={<AccountMapping />} />,
  <Route key="master-hub-audit" path="/master-data/audit" element={<AuditLog />} />,
]

export const masterHubCrumbs: Record<string, string[]> = {
  '/master-data': ['Master Data'],
  '/master-data/overview': ['Master Data', 'AI Overview'],
  '/master-data/engineers': ['Master Data', 'Engineer Mapping'],
  '/master-data/managers': ['Master Data', 'Manager / RM Mapping'],
  '/master-data/staff': ['Master Data', 'Staff / Team Mapping'],
  '/master-data/categories': ['Master Data', 'Category Masters'],
  '/master-data/legal-tracking': ['Master Data', 'Legal Tracking'],
  '/master-data/tis': ['Master Data', 'TIS Register'],
  '/master-data/accounts': ['Master Data', 'Account Mapping'],
  '/master-data/audit': ['Master Data', 'Audit Log'],
}
