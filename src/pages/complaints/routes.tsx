import { Route } from 'react-router-dom'
import ManagementDashboard from './ManagementDashboard'
import OperationsDashboard from './OperationsDashboard'
import AssetDashboard from './AssetDashboard'
import AiDashboard from './AiDashboard'
import CreateComplaint from './CreateComplaint'
import Complaint360 from './Complaint360'

export const complaintRoutes = [
  <Route key="cmp-mgmt" path="/operations/complaints" element={<ManagementDashboard />} />,
  <Route key="cmp-ops" path="/operations/complaints/operations" element={<OperationsDashboard />} />,
  <Route key="cmp-assets" path="/operations/complaints/assets" element={<AssetDashboard />} />,
  <Route key="cmp-ai" path="/operations/complaints/ai" element={<AiDashboard />} />,
  <Route key="cmp-new" path="/operations/complaints/new" element={<CreateComplaint />} />,
  <Route key="cmp-360" path="/operations/complaints/:complaintId" element={<Complaint360 />} />,
]
