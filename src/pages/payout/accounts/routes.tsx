import { withPayoutData } from '../PayoutShell'
import { lazy } from 'react'
import { Route } from 'react-router-dom'
const AccountApprovals = lazy(() => import('./AccountPages').then((m) => ({ default: m.AccountApprovals })))
const BeneficiaryList = lazy(() => import('./AccountPages').then((m) => ({ default: m.BeneficiaryList })))
const PayoutDataTab = lazy(() => import('./AccountPages').then((m) => ({ default: m.PayoutDataTab })))
const BeneficiaryRoute = lazy(() => import('./BeneficiaryForm').then((m) => ({ default: m.BeneficiaryRoute })))
const TlRuleRoute = lazy(() => import('./TlRules').then((m) => ({ default: m.TlRuleRoute })))
const TlRulesList = lazy(() => import('./TlRules').then((m) => ({ default: m.TlRulesList })))
const TlCalculation = lazy(() => import('./TlCalculation'))
// Static segments rank above /:id in react-router v7, so "beneficiaries", "approvals", "new" and
// "calculation" never collide with record ids. The existing /finance/payout* routes stay untouched:
// the Payout Data list embedded here keeps linking to them for New / View / Edit.
export const accountRoutes = withPayoutData([
  <Route key="payout-accounts" path="/finance/payouts/accounts" element={<PayoutDataTab />} />,
  <Route key="payout-accounts-beneficiaries" path="/finance/payouts/accounts/beneficiaries" element={<BeneficiaryList />} />,
  <Route key="payout-accounts-approvals" path="/finance/payouts/accounts/approvals" element={<AccountApprovals />} />,
  <Route key="payout-accounts-new" path="/finance/payouts/accounts/new" element={<BeneficiaryRoute />} />,
  <Route key="payout-accounts-id" path="/finance/payouts/accounts/:id" element={<BeneficiaryRoute />} />,
  <Route key="payout-tl" path="/finance/payouts/team-leader" element={<TlRulesList />} />,
  <Route key="payout-tl-calc" path="/finance/payouts/team-leader/calculation" element={<TlCalculation />} />,
  <Route key="payout-tl-new" path="/finance/payouts/team-leader/new" element={<TlRuleRoute />} />,
  <Route key="payout-tl-id" path="/finance/payouts/team-leader/:id" element={<TlRuleRoute />} />,
])

const BASE = ['Finance', 'Payouts']
export const accountCrumbs: Record<string, string[]> = {
  '/finance/payouts/accounts': [...BASE, 'Account Mapping', 'Payout Data'],
  '/finance/payouts/accounts/beneficiaries': [...BASE, 'Account Mapping', 'Beneficiary Accounts'],
  '/finance/payouts/accounts/approvals': [...BASE, 'Account Mapping', 'Approvals'],
  '/finance/payouts/accounts/new': [...BASE, 'Account Mapping', 'New Beneficiary Account'],
  '/finance/payouts/accounts/:id': [...BASE, 'Account Mapping', 'Beneficiary Account'],
  '/finance/payouts/team-leader': [...BASE, 'Team Leader', 'Sharing Rules'],
  '/finance/payouts/team-leader/calculation': [...BASE, 'Team Leader', 'Monthly Calculation'],
  '/finance/payouts/team-leader/new': [...BASE, 'Team Leader', 'New Sharing Rule'],
  '/finance/payouts/team-leader/:id': [...BASE, 'Team Leader', 'Sharing Rule'],
}
