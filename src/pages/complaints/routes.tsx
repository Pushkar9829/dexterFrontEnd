import { Route } from 'react-router-dom'
import ManagementDashboard from './ManagementDashboard'
import OperationsDashboard from './OperationsDashboard'
import AssetDashboard from './AssetDashboard'
import AiDashboard from './AiDashboard'
import CreateComplaint from './CreateComplaint'
import Complaint360 from './Complaint360'
import OperationsHub from '../operations/OperationsHub'
import Placeholder from '../Placeholder'

export const complaintRoutes = [
  <Route key="ops-hub" path="/operations" element={<OperationsHub />} />,
  <Route key="cmp-mgmt" path="/operations/complaints" element={<ManagementDashboard />} />,
  <Route key="cmp-ops" path="/operations/complaints/operations" element={<OperationsDashboard />} />,
  <Route key="cmp-assets" path="/operations/complaints/assets" element={<AssetDashboard />} />,
  <Route key="cmp-ai" path="/operations/complaints/ai" element={<AiDashboard />} />,
  <Route key="cmp-new" path="/operations/complaints/new" element={<CreateComplaint />} />,
  <Route key="cmp-360" path="/operations/complaints/:complaintId" element={<Complaint360 />} />,
  <Route key="ops-cash" path="/operations/cash-loading" element={<Placeholder />} />,
  <Route key="ops-bank" path="/operations/bank-statement" element={<Placeholder />} />,
  <Route key="ops-tds" path="/operations/tds" element={<Placeholder />} />,
  <Route key="ops-txn" path="/operations/txn-data" element={<Placeholder />} />,
  <Route key="ops-daak" path="/operations/daak" element={<Placeholder />} />,
]
