import { Route } from 'react-router-dom'
import ManagementDashboard from './ManagementDashboard'
import OperationsDashboard from './OperationsDashboard'
import AssetDashboard from './AssetDashboard'
import AiDashboard from './AiDashboard'
import CreateComplaint from './CreateComplaint'
import Complaint360 from './Complaint360'
import OperationsHub from '../operations/OperationsHub'
import ReconciliationHub from '../operations/ReconciliationHub'
import FailedTxnsDisputeList from '../operations/FailedTxnsDisputeList'
import FailedTxnsDisputeCreate from '../operations/FailedTxnsDisputeCreate'
import ChargeBackDisputeList from '../operations/ChargeBackDisputeList'
import ChargeBackDisputeForm from '../operations/ChargeBackDisputeForm'
import TxnDataList from '../operations/TxnDataList'
import TxnDataDaily from '../operations/TxnDataDaily'
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
  <Route key="ops-txn" path="/operations/txn-data" element={<TxnDataList />} />,
  <Route key="ops-txn-new" path="/operations/txn-data/new" element={<TxnDataDaily />} />,
  <Route key="ops-txn-daily" path="/operations/txn-data/daily" element={<TxnDataDaily />} />,
  <Route key="ops-txn-edit" path="/operations/txn-data/:atmId" element={<TxnDataDaily />} />,
  <Route key="ops-daak" path="/operations/daak" element={<Placeholder />} />,
  <Route key="ops-reco" path="/operations/reconciliation" element={<ReconciliationHub />} />,
  <Route key="ops-reco-failed" path="/operations/reconciliation/failed-txns" element={<FailedTxnsDisputeList />} />,
  <Route key="ops-reco-failed-new" path="/operations/reconciliation/failed-txns/new" element={<FailedTxnsDisputeCreate />} />,
  <Route key="ops-reco-failed-id" path="/operations/reconciliation/failed-txns/:id" element={<FailedTxnsDisputeCreate />} />,
  <Route key="ops-reco-failed-edit" path="/operations/reconciliation/failed-txns/:id/edit" element={<FailedTxnsDisputeCreate />} />,
  <Route key="ops-reco-chargeback" path="/operations/reconciliation/charge-back" element={<ChargeBackDisputeList />} />,
  <Route key="ops-reco-cb-new" path="/operations/reconciliation/charge-back/new" element={<ChargeBackDisputeForm />} />,
  <Route key="ops-reco-cb-id" path="/operations/reconciliation/charge-back/:id" element={<ChargeBackDisputeForm />} />,
  <Route key="ops-reco-cb-edit" path="/operations/reconciliation/charge-back/:id/edit" element={<ChargeBackDisputeForm />} />,
]
