import { withPayoutData } from '../PayoutShell'
import { lazy } from 'react'
import { Route } from 'react-router-dom'
const MonthlyPayout = lazy(() => import('./MonthlyPayout'))
const BatchDetail = lazy(() => import('./BatchDetail'))
export const monthlyRoutes = withPayoutData([
  <Route key="payout-monthly" path="/finance/payouts/monthly" element={<MonthlyPayout />} />,
  <Route key="payout-monthly-batch" path="/finance/payouts/monthly/:batchId" element={<BatchDetail />} />,
])

const BASE = ['Finance', 'Payouts']
export const monthlyCrumbs: Record<string, string[]> = {
  '/finance/payouts/monthly': [...BASE, 'Monthly Payout'],
  '/finance/payouts/monthly/:batchId': [...BASE, 'Monthly Payout', 'Payout Batch'],
}
