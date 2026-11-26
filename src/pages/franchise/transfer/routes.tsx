import { lazy } from 'react'
import { Route } from 'react-router-dom'
const TransferList = lazy(() => import('./TransferList'))
const TransferForm = lazy(() => import('./TransferForm'))
const TransferDetail = lazy(() => import('./TransferDetail'))
const TransferHistory = lazy(() => import('./TransferHistory'))
const ExitList = lazy(() => import('./ExitList'))
const ExitForm = lazy(() => import('./ExitForm'))
const ExitDetail = lazy(() => import('./ExitDetail'))
export const transferRoutes = [
  <Route key="franchise-transfers" path="/franchise/transfers" element={<TransferList />} />,
  <Route key="franchise-transfers-new" path="/franchise/transfers/new" element={<TransferForm />} />,
  <Route key="franchise-transfers-history" path="/franchise/transfers/history" element={<TransferHistory />} />,
  <Route key="franchise-transfers-detail" path="/franchise/transfers/:id" element={<TransferDetail />} />,
  <Route key="franchise-exits" path="/franchise/exits" element={<ExitList />} />,
  <Route key="franchise-exits-new" path="/franchise/exits/new" element={<ExitForm />} />,
  <Route key="franchise-exits-detail" path="/franchise/exits/:id" element={<ExitDetail />} />,
]

const BASE = ['Onboarding', 'Franchise Management']
export const transferCrumbs: Record<string, string[]> = {
  '/franchise/transfers': [...BASE, 'Transfer & Portability'],
  '/franchise/transfers/new': [...BASE, 'Transfer & Portability', 'New Transfer Request'],
  '/franchise/transfers/history': [...BASE, 'Transfer & Portability', 'Transfer History'],
  '/franchise/transfers/:id': [...BASE, 'Transfer & Portability', 'Transfer Request'],
  '/franchise/exits': [...BASE, 'Exit Management'],
  '/franchise/exits/new': [...BASE, 'Exit Management', 'New Exit Request'],
  '/franchise/exits/:id': [...BASE, 'Exit Management', 'Exit Request'],
}

export const transferTiles: { title: string; sub: string; to: string }[] = [
  { title: 'Transfer & Portability', sub: 'NOC-based SMF / MF / FR transfers with Super Admin approval (§6).', to: '/franchise/transfers' },
  { title: 'Transfer History', sub: 'Permanent record of old and new mappings for every transfer (§6.3).', to: '/franchise/transfers/history' },
  { title: 'Exit Management', sub: 'One exit flow for SMF, MF and FR with network hand-over (§27 rule 9).', to: '/franchise/exits' },
]
