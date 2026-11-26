import { withPayoutData } from '../PayoutShell'
import { lazy } from 'react'
import { Route } from 'react-router-dom'
const PlanList = lazy(() => import('./PlanList'))
const PlanWizard = lazy(() => import('./PlanWizard'))
const PlanView = lazy(() => import('./PlanView'))
const PlanMapping = lazy(() => import('./PlanMapping'))
export const planRoutes = withPayoutData([
  <Route key="payout-plans" path="/finance/payouts/plans" element={<PlanList />} />,
  <Route key="payout-plans-new" path="/finance/payouts/plans/new" element={<PlanWizard />} />,
  <Route key="payout-plans-mapping" path="/finance/payouts/plans/mapping" element={<PlanMapping />} />,
  <Route key="payout-plans-edit" path="/finance/payouts/plans/:code/edit" element={<PlanWizard />} />,
  <Route key="payout-plans-view" path="/finance/payouts/plans/:code" element={<PlanView />} />,
])

const BASE = ['Finance', 'Payouts', 'Plan Mapping']
export const planCrumbs: Record<string, string[]> = {
  '/finance/payouts/plans': BASE,
  '/finance/payouts/plans/new': [...BASE, 'Create Plan'],
  '/finance/payouts/plans/mapping': [...BASE, 'Site-wise Mapping'],
  '/finance/payouts/plans/:code/edit': [...BASE, 'Edit Plan'],
  '/finance/payouts/plans/:code': [...BASE, 'Plan'],
}
