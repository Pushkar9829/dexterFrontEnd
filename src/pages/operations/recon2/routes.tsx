import { lazy } from 'react'
import { Route } from 'react-router-dom'
const AddressMasterPage = lazy(() => import('./AddressMasterPage'))
const FailedTxnsDisputeCreate = lazy(() => import('../FailedTxnsDisputeCreate'))
const ChargeBackDisputeForm = lazy(() => import('../ChargeBackDisputeForm'))
// NEW routes for Postal & Courier / Reconciliation (Operations §9–§11). Existing /operations/daak[/:sub],
// /operations/reconciliation/* list + /new routes stay in operations/routes.tsx.
// The :id / :id/edit dispute routes are also declared in complaints/routes.tsx; repeating them here keeps
// the detail pages working if that file changes (same component, so the duplicate is harmless).
export const reconRoutes = [
  <Route key="recon2-address-master" path="/setup/address-master" element={<AddressMasterPage />} />,
  <Route key="recon2-ftd-id" path="/operations/reconciliation/failed-txns/:id" element={<FailedTxnsDisputeCreate />} />,
  <Route key="recon2-ftd-edit" path="/operations/reconciliation/failed-txns/:id/edit" element={<FailedTxnsDisputeCreate />} />,
  <Route key="recon2-cb-id" path="/operations/reconciliation/charge-back/:id" element={<ChargeBackDisputeForm />} />,
]

export const reconCrumbs: Record<string, string[]> = {
  '/setup/address-master': ['Setup', 'Address Master'],
  '/operations/daak/inward': ['Workspace', 'Operations', 'Postal & Courier', 'Inward Dak'],
  '/operations/daak/outward': ['Workspace', 'Operations', 'Postal & Courier', 'Outward Dak'],
  '/operations/daak/address-master': ['Workspace', 'Operations', 'Postal & Courier', 'Address Master'],
  '/operations/daak/expenses': ['Workspace', 'Operations', 'Postal & Courier', 'Linked Expenses'],
  '/operations/daak/cheques': ['Workspace', 'Operations', 'Postal & Courier', 'Cheques in Custody'],
  '/operations/reconciliation/charge-back/new': ['Workspace', 'Operations', 'Charge Back Dispute', 'Import NPCI / Bank Email or File'],
}
