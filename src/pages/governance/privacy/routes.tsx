import { lazy } from 'react'
import { Route } from 'react-router-dom'
const PrivacyDashboard = lazy(() => import('./PrivacyDashboard'))
import Consent from './Consent'
const GrievanceDetail = lazy(() => import('./Grievances').then((m) => ({ default: m.GrievanceDetail })))
const GrievanceList = lazy(() => import('./Grievances').then((m) => ({ default: m.GrievanceList })))
const GrievanceNew = lazy(() => import('./Grievances').then((m) => ({ default: m.GrievanceNew })))
const BreachDetail = lazy(() => import('./Breaches').then((m) => ({ default: m.BreachDetail })))
const BreachList = lazy(() => import('./Breaches').then((m) => ({ default: m.BreachList })))
const BreachNew = lazy(() => import('./Breaches').then((m) => ({ default: m.BreachNew })))
import Rights from './Rights'
import Retention from './Retention'
import Vendors from './Vendors'
const MyPrivacy = lazy(() => import('./MyPrivacy'))
const P = '/governance/privacy'
export const privacyRoutes = [
  <Route key="dpdp-home" path={P} element={<PrivacyDashboard />} />,
  <Route key="dpdp-consent" path={`${P}/consent`} element={<Consent />} />,
  <Route key="dpdp-grievances" path={`${P}/grievances`} element={<GrievanceList />} />,
  <Route key="dpdp-grievance-new" path={`${P}/grievances/new`} element={<GrievanceNew />} />,
  <Route key="dpdp-grievance" path={`${P}/grievances/:id`} element={<GrievanceDetail />} />,
  <Route key="dpdp-breaches" path={`${P}/breaches`} element={<BreachList />} />,
  <Route key="dpdp-breach-new" path={`${P}/breaches/new`} element={<BreachNew />} />,
  <Route key="dpdp-breach" path={`${P}/breaches/:id`} element={<BreachDetail />} />,
  <Route key="dpdp-rights" path={`${P}/rights`} element={<Rights />} />,
  <Route key="dpdp-retention" path={`${P}/retention`} element={<Retention />} />,
  <Route key="dpdp-vendors" path={`${P}/vendors`} element={<Vendors />} />,
  <Route key="dpdp-my" path={`${P}/my`} element={<MyPrivacy />} />,
]

const D = ['Workspace', 'Governance', 'DPDP Compliance']
/** Param routes are listed with their `:id` pattern; match them by prefix if the layout needs it. */
export const privacyCrumbs: Record<string, string[]> = {
  [P]: D,
  [`${P}/consent`]: [...D, 'Consent'],
  [`${P}/grievances`]: [...D, 'Grievances'],
  [`${P}/grievances/new`]: [...D, 'Grievances', 'Register'],
  [`${P}/grievances/:id`]: [...D, 'Grievances', 'Complaint'],
  [`${P}/breaches`]: [...D, 'Data Breaches'],
  [`${P}/breaches/new`]: [...D, 'Data Breaches', 'Register'],
  [`${P}/breaches/:id`]: [...D, 'Data Breaches', 'Incident'],
  [`${P}/rights`]: [...D, 'User Rights'],
  [`${P}/retention`]: [...D, 'Retention & Deletion'],
  [`${P}/vendors`]: [...D, 'Vendors'],
  [`${P}/my`]: ['Workspace', 'My Privacy'],
}

export const privacyTiles: { title: string; sub: string; to: string }[] = [
  { title: 'DPDP COMPLIANCE', sub: 'DPDP Act 2023 dashboard — 8 modules, priorities, data protection contact and legal timelines.', to: P },
  { title: 'CONSENT', sub: 'Consent records, withdrawal, consent history and privacy notice versions.', to: `${P}/consent` },
  { title: 'PRIVACY GRIEVANCES', sub: 'Register, assign, resolve, close and reopen data-privacy complaints with SLA escalation.', to: `${P}/grievances` },
  { title: 'DATA BREACHES', sub: 'Security incidents, containment, Board intimation and the 72-hour detailed report.', to: `${P}/breaches` },
  { title: 'USER RIGHTS', sub: 'Access, correction, erasure, grievance, withdraw consent and nomination requests.', to: `${P}/rights` },
  { title: 'RETENTION & DELETION', sub: 'Retention period per data category and the secure deletion queue with legal hold.', to: `${P}/retention` },
  { title: 'VENDORS', sub: 'Third-party processors and their data-protection agreements.', to: `${P}/vendors` },
  { title: 'MY PRIVACY', sub: 'Self-service: my consents, rights requests, complaints and their status.', to: `${P}/my` },
]
