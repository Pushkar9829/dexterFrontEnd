import { Route } from 'react-router-dom'
import GovernanceHub from './GovernanceHub'
import GovernanceView from './GovernanceView'

export const governanceRoutes = [
  <Route key="governance-hub" path="/governance" element={<GovernanceHub />} />,
  <Route key="governance-audit" path="/governance/audit" element={<GovernanceView section="audit" />} />,
  <Route key="governance-sessions" path="/governance/sessions" element={<GovernanceView section="sessions" />} />,
  <Route key="governance-security" path="/governance/security" element={<GovernanceView section="security" />} />,
  <Route key="governance-compliance" path="/governance/compliance" element={<GovernanceView section="compliance" />} />,
]
