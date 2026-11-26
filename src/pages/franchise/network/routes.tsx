import { lazy } from 'react'
import { Route } from 'react-router-dom'
const TierDashboard = lazy(() => import('./Dashboard'))
const Register = lazy(() => import('./Register'))
const NetworkProfile = lazy(() => import('./Profile'))
import Hierarchy from './Hierarchy'
import Onboarding from './Onboarding'
import Approvals from './Approvals'

export const networkRoutes = [
  <Route key="fr-net-dashboard" path="/franchise/dashboard/:tier" element={<TierDashboard />} />,
  <Route key="fr-net-register" path="/franchise/register/:tier" element={<Register />} />,
  <Route key="fr-net-profile" path="/franchise/network/:frId" element={<NetworkProfile />} />,
  <Route key="fr-net-hierarchy" path="/franchise/hierarchy" element={<Hierarchy />} />,
  <Route key="fr-net-onboarding" path="/franchise/onboarding" element={<Onboarding />} />,
  <Route key="fr-net-approvals" path="/franchise/onboarding/approvals" element={<Approvals />} />,
]

const FM = ['Onboarding', 'Franchise Management']
export const networkCrumbs: Record<string, string[]> = {
  '/franchise/hierarchy': [...FM, 'Hierarchy'],
  '/franchise/onboarding': [...FM, 'Onboarding Workflow'],
  '/franchise/onboarding/approvals': [...FM, 'Onboarding Workflow', 'Admin Approvals'],
  '/franchise/dashboard/super-master': [...FM, 'SMF Dashboard'],
  '/franchise/dashboard/master': [...FM, 'MF Dashboard'],
  '/franchise/dashboard/franchise': [...FM, 'FR Dashboard'],
  '/franchise/register/super-master': [...FM, 'Onboarding Workflow', 'SMF Registration'],
  '/franchise/register/master': [...FM, 'Onboarding Workflow', 'MF Registration'],
  '/franchise/register/franchise': [...FM, 'Onboarding Workflow', 'FR Registration'],
}

export const networkTiles: { title: string; sub: string; to: string }[] = [
  { title: 'NETWORK DASHBOARDS', sub: 'SMF, MF and FR dashboards — network size, sites, operational, pending agreements / NOC, transfers and exits.', to: '/franchise/dashboard/super-master' },
  { title: 'FRANCHISE HIERARCHY', sub: 'Dexter India → SMF → MF → FR → Sites tree, incl. direct-company and Team Leader mappings.', to: '/franchise/hierarchy' },
  { title: 'ONBOARDING WORKFLOW', sub: 'CRM onboarding: Method A (app link + self KYC) or Method B (full CRM form).', to: '/franchise/onboarding' },
  { title: 'ADMIN APPROVALS', sub: 'Mandatory approval gate for new registrations, parent mapping and entity type changes.', to: '/franchise/onboarding/approvals' },
]
