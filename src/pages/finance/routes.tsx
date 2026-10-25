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

export const financeRoutes = [
  <Route key="finance-hub" path="/finance" element={<FinanceHub />} />,
  <Route key="finance-hr-payments" path="/finance/hr-payments" element={<FinanceHub showHrModalInitial />} />,
  <Route key="finance-sd" path="/finance/sd" element={<SdList />} />,
  <Route key="finance-sd-new" path="/finance/sd/new" element={<SdRecordRoute />} />,
  <Route key="finance-sd-id" path="/finance/sd/:id" element={<SdRecordRoute />} />,
  <Route key="reports-financial-sd" path="/reports/financial/sd" element={<SdList />} />,
  <Route key="finance-clf" path="/finance/clf" element={<ClfList />} />,
  <Route key="finance-clf-new" path="/finance/clf/new" element={<ClfRecordRoute />} />,
  <Route key="finance-clf-id" path="/finance/clf/:id" element={<ClfRecordRoute />} />,
  <Route key="reports-financial-clf" path="/reports/financial/clf" element={<ClfList />} />,
  <Route key="finance-gst" path="/finance/gst" element={<GstList />} />,
  <Route key="finance-gst-id" path="/finance/gst/:id" element={<GstRecordRoute />} />,
  <Route key="finance-payout" path="/finance/payout" element={<PayoutList />} />,
  <Route key="finance-payout-id" path="/finance/payout/:id" element={<PayoutRecordRoute />} />,
]
