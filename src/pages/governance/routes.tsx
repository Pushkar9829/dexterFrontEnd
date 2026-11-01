import { Route } from 'react-router-dom'
import GovernanceHub from './GovernanceHub'
import GovernanceView from './GovernanceView'
import PushNotifications from './PushNotifications'

export const governanceRoutes = [
  <Route key="governance-hub" path="/governance" element={<GovernanceHub />} />,
  <Route key="governance-push" path="/governance/push-notifications" element={<PushNotifications />} />,
  <Route key="governance-push-alias" path="/push-notifications" element={<PushNotifications />} />,
  <Route key="governance-audit" path="/governance/audit" element={<GovernanceView section="audit" />} />,
  <Route key="governance-sessions" path="/governance/sessions" element={<GovernanceView section="sessions" />} />,
  <Route key="governance-security" path="/governance/security" element={<GovernanceView section="security" />} />,
  <Route key="governance-compliance" path="/governance/compliance" element={<GovernanceView section="compliance" />} />,
]
