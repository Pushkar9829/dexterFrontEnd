import { Route, useParams } from 'react-router-dom'
import FinanceHub from './FinanceHub'
import GstList from './GstList'
import GstRecordPage from './GstRecord'
import PayoutList from './PayoutList'
import PayoutRecordPage from './PayoutRecord'

// keyed by :id so moving between records (or new → created) remounts with fresh form state
function GstRecordRoute() {
  const { id = '' } = useParams()
  return <GstRecordPage key={id} />
}
function PayoutRecordRoute() {
  const { id = '' } = useParams()
  return <PayoutRecordPage key={id} />
}

export const financeRoutes = [
  <Route key="finance-hub" path="/finance" element={<FinanceHub />} />,
  <Route key="finance-hr-payments" path="/finance/hr-payments" element={<FinanceHub showHrModalInitial />} />,
  <Route key="finance-gst" path="/finance/gst" element={<GstList />} />,
  <Route key="finance-gst-id" path="/finance/gst/:id" element={<GstRecordRoute />} />,
  <Route key="finance-payout" path="/finance/payout" element={<PayoutList />} />,
  <Route key="finance-payout-id" path="/finance/payout/:id" element={<PayoutRecordRoute />} />,
]
