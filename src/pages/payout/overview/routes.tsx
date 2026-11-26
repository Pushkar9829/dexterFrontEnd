import { withPayoutData } from '../PayoutShell'
import { lazy } from 'react'
import { Route } from 'react-router-dom'
const PayoutOverview = lazy(() => import('./PayoutOverview'))
const FranchiseRegister = lazy(() => import('./Registers').then((m) => ({ default: m.FranchiseRegister })))
const MfRegister = lazy(() => import('./Registers').then((m) => ({ default: m.MfRegister })))
const SmfRegister = lazy(() => import('./Registers').then((m) => ({ default: m.SmfRegister })))
const ReportsPage = lazy(() => import('./Reports'))
const FinanceRulesPage = lazy(() => import('./FinanceRules'))
const PayoutAuditLog = lazy(() => import('./AuditLog'))
export const overviewRoutes = withPayoutData([
  <Route key="payout-overview" path="/finance/payouts" element={<PayoutOverview />} />,
  <Route key="payout-franchise" path="/finance/payouts/franchise" element={<FranchiseRegister />} />,
  <Route key="payout-mf" path="/finance/payouts/mf" element={<MfRegister />} />,
  <Route key="payout-smf" path="/finance/payouts/smf" element={<SmfRegister />} />,
  <Route key="payout-reports" path="/finance/payouts/reports" element={<ReportsPage />} />,
  <Route key="payout-rules" path="/finance/payouts/rules" element={<FinanceRulesPage />} />,
  <Route key="payout-audit" path="/finance/payouts/audit" element={<PayoutAuditLog />} />,
])

export const overviewCrumbs: Record<string, string[]> = {
  '/finance/payouts': ['Finance', 'Payouts', 'Payout Overview'],
  '/finance/payouts/franchise': ['Finance', 'Payouts', 'Franchise'],
  '/finance/payouts/mf': ['Finance', 'Payouts', 'Master Franchise'],
  '/finance/payouts/smf': ['Finance', 'Payouts', 'Super Master Franchise'],
  '/finance/payouts/reports': ['Finance', 'Payouts', 'MIS & Reports'],
  '/finance/payouts/rules': ['Finance', 'Payouts', 'Finance Rules'],
  '/finance/payouts/audit': ['Finance', 'Payouts', 'Audit Log'],
}
