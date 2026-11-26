import { withPayoutData } from '../PayoutShell'
import { lazy } from 'react'
import { Route } from 'react-router-dom'
const BusinessHub = lazy(() => import('./BusinessHub'))
const BmSites = lazy(() => import('./BmSites'))
const BmCategories = lazy(() => import('./BmCategories'))
const BmPayouts = lazy(() => import('./BmPayouts'))
const PayoutFormRoute = lazy(() => import('./formRoutes').then((m) => ({ default: m.PayoutFormRoute })))
const SiteFormRoute = lazy(() => import('./formRoutes').then((m) => ({ default: m.SiteFormRoute })))
const BmPnl = lazy(() => import('./BmPnl'))
const SiteExpenses = lazy(() => import('./SiteExpenses'))
const BmCashForecast = lazy(() => import('./BmCashForecast'))
const AlfForecast = lazy(() => import('./AlfForecast'))
export const businessRoutes = withPayoutData([
  <Route key="bm-hub" path="/finance/payouts/business" element={<BusinessHub />} />,
  <Route key="bm-sites" path="/finance/payouts/business/sites" element={<BmSites />} />,
  <Route key="bm-sites-new" path="/finance/payouts/business/sites/new" element={<SiteFormRoute />} />,
  <Route key="bm-sites-code" path="/finance/payouts/business/sites/:code" element={<SiteFormRoute />} />,
  <Route key="bm-categories" path="/finance/payouts/business/categories" element={<BmCategories />} />,
  <Route key="bm-payouts" path="/finance/payouts/business/payouts" element={<BmPayouts />} />,
  <Route key="bm-payouts-new" path="/finance/payouts/business/payouts/new" element={<PayoutFormRoute />} />,
  <Route key="bm-payouts-id" path="/finance/payouts/business/payouts/:id" element={<PayoutFormRoute />} />,
  <Route key="bm-pnl" path="/finance/payouts/business/pnl" element={<BmPnl />} />,
  <Route key="ops-site-expenses" path="/operations/site-expenses" element={<SiteExpenses />} />,
  <Route key="ops-bm-cash-forecast" path="/operations/bm-cash-forecast" element={<BmCashForecast />} />,
  <Route key="ops-alf-forecast" path="/operations/alf-forecast" element={<AlfForecast />} />,
])

const BM = ['Workspace', 'Finance', 'Payouts', 'Business Model']
export const businessCrumbs: Record<string, string[]> = {
  '/finance/payouts/business': BM,
  '/finance/payouts/business/sites': [...BM, 'BM Site Master'],
  '/finance/payouts/business/sites/new': [...BM, 'BM Site Master', 'New'],
  '/finance/payouts/business/categories': [...BM, 'Category Master'],
  '/finance/payouts/business/payouts': [...BM, 'Site Wise Payout'],
  '/finance/payouts/business/payouts/new': [...BM, 'Site Wise Payout', 'New'],
  '/finance/payouts/business/pnl': [...BM, 'P&L Overview'],
  '/operations/site-expenses': ['Workspace', 'Operations', 'Site Expenses (BM)'],
  '/operations/bm-cash-forecast': ['Workspace', 'Operations', 'BM Site Cash Forecast'],
  '/operations/alf-forecast': ['Workspace', 'Operations', 'ALF Forecast'],
}
