import { Route, useParams } from 'react-router-dom'
import FinanceHub from './FinanceHub'
import ClfList from './ClfList'
import ClfRecordPage from './ClfRecord'
import GstList from './GstList'
import GstRecordPage from './GstRecord'
import PayoutList from './PayoutList'
import PayoutRecordPage from './PayoutRecord'
import SdList from './SdList'
import SdRecordPage from './SdRecord'

import HrPaymentsHub from './HrPaymentsHub'
import StaffSalaryList from './StaffSalaryList'
import StaffSalaryRecordPage from './StaffSalaryRecord'
import StaffExpenseList from './StaffExpenseList'
import StaffExpenseRecordPage from './StaffExpenseRecord'

// keyed by :id so moving between records (or new → created) remounts with fresh form state
function ClfRecordRoute() {
  const { id = '' } = useParams()
  return <ClfRecordPage key={id} />
}
function GstRecordRoute() {
  const { id = '' } = useParams()
  return <GstRecordPage key={id} />
}
function PayoutRecordRoute() {
  const { id = '' } = useParams()
  return <PayoutRecordPage key={id} />
}
function SdRecordRoute() {
  const { id = '' } = useParams()
  return <SdRecordPage key={id} />
}
function StaffSalaryRecordRoute() {
  const { id = '' } = useParams()
  return <StaffSalaryRecordPage key={id} />
}
function StaffExpenseRecordRoute() {
  const { id = '' } = useParams()
  return <StaffExpenseRecordPage key={id} />
}

export const financeRoutes = [
  <Route key="finance-hub" path="/finance" element={<FinanceHub />} />,
  <Route key="finance-hr-payments" path="/finance/hr-payments" element={<HrPaymentsHub />} />,
  <Route key="finance-hr-salary" path="/finance/hr-payments/salary" element={<StaffSalaryList />} />,
  <Route key="finance-hr-salary-new" path="/finance/hr-payments/salary/new" element={<StaffSalaryRecordRoute />} />,
  <Route key="finance-hr-salary-id" path="/finance/hr-payments/salary/:id" element={<StaffSalaryRecordRoute />} />,
  <Route key="finance-hr-expenses" path="/finance/hr-payments/expenses" element={<StaffExpenseList />} />,
  <Route key="finance-hr-expenses-new" path="/finance/hr-payments/expenses/new" element={<StaffExpenseRecordRoute />} />,
  <Route key="finance-hr-expenses-id" path="/finance/hr-payments/expenses/:id" element={<StaffExpenseRecordRoute />} />,
  <Route key="finance-sd" path="/finance/sd" element={<SdList />} />,
  <Route key="finance-sd-new" path="/finance/sd/new" element={<SdRecordRoute />} />,
  <Route key="finance-sd-id" path="/finance/sd/:id" element={<SdRecordRoute />} />,
  <Route key="operations-sd" path="/operations/security-deposit" element={<SdList />} />,
  <Route key="operations-sd-new" path="/operations/security-deposit/new" element={<SdRecordRoute />} />,
  <Route key="operations-sd-id" path="/operations/security-deposit/:id" element={<SdRecordRoute />} />,
  <Route key="reports-financial-sd" path="/reports/financial/sd" element={<SdList />} />,
  <Route key="finance-clf" path="/finance/clf" element={<ClfList />} />,
  <Route key="finance-clf-new" path="/finance/clf/new" element={<ClfRecordRoute />} />,
  <Route key="finance-clf-id" path="/finance/clf/:id" element={<ClfRecordRoute />} />,
  <Route key="operations-daily-clf" path="/operations/daily-operations/clf" element={<ClfList />} />,
  <Route key="operations-daily-clf-new" path="/operations/daily-operations/clf/new" element={<ClfRecordRoute />} />,
  <Route key="operations-daily-clf-id" path="/operations/daily-operations/clf/:id" element={<ClfRecordRoute />} />,
  <Route key="operations-clf" path="/operations/clf" element={<ClfList />} />,
  <Route key="operations-clf-new" path="/operations/clf/new" element={<ClfRecordRoute />} />,
  <Route key="operations-clf-id" path="/operations/clf/:id" element={<ClfRecordRoute />} />,
  <Route key="reports-financial-clf" path="/reports/financial/clf" element={<ClfList />} />,
  <Route key="finance-gst" path="/finance/gst" element={<GstList />} />,
  <Route key="finance-gst-new" path="/finance/gst/new" element={<GstRecordRoute />} />,
  <Route key="finance-gst-id" path="/finance/gst/:id" element={<GstRecordRoute />} />,
  <Route key="finance-payout" path="/finance/payout" element={<PayoutList />} />,
  <Route key="finance-payout-new" path="/finance/payout/new" element={<PayoutRecordRoute />} />,
  <Route key="finance-payout-id" path="/finance/payout/:id" element={<PayoutRecordRoute />} />,
]
