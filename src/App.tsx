import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
const Login = lazy(() => import('@/pages/auth/Login'))
const VerifyOtp = lazy(() => import('@/pages/auth/VerifyOtp'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const CreatePassword = lazy(() => import('@/pages/auth/CreatePassword'))
const AuthSuccess = lazy(() => import('@/pages/auth/AuthResult').then((m) => ({ default: m.AuthSuccess })))
const ResetSuccess = lazy(() => import('@/pages/auth/AuthResult').then((m) => ({ default: m.ResetSuccess })))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Notices = lazy(() => import('@/pages/Notices'))
const Placeholder = lazy(() => import('@/pages/Placeholder'))
const Applications = lazy(() => import('@/pages/onboarding/Applications'))
const OnboardingHub = lazy(() => import('@/pages/onboarding/OnboardingHub'))
const EmployeeList = lazy(() => import('@/pages/onboarding/employee/EmployeeList'))
const EmployeeRecord = lazy(() => import('@/pages/onboarding/employee/EmployeeRecord'))
const EmployeeOnboardingForm = lazy(() => import('@/pages/onboarding/employee/EmployeeOnboardingForm'))
const KycHub = lazy(() => import('@/pages/onboarding/KycHub'))
const KycUpload = lazy(() => import('@/pages/onboarding/KycUpload'))
const SetupHub = lazy(() => import('@/pages/onboarding/SetupHub'))
const BusinessSettingsHub = lazy(() => import('@/pages/onboarding/SetupHub').then((m) => ({ default: m.BusinessSettingsHub })))
const EscalationMatrixHub = lazy(() => import('@/pages/onboarding/SetupHub').then((m) => ({ default: m.EscalationMatrixHub })))
const SlaRules = lazy(() => import('@/pages/setup/SlaRules'))
const EscalationHierarchy = lazy(() => import('@/pages/setup/EscalationHierarchy'))
const OrgUnitList = lazy(() => import('@/pages/setup/OrgUnitList'))
const OnboardingApprovals = lazy(() => import('@/pages/onboarding/OnboardingApprovals'))
import { Toaster } from '@/components/ui/Toast'
const FranchiseHub = lazy(() => import('@/pages/franchise/FranchisePages').then((m) => ({ default: m.FranchiseHub })))
const FranchiseRegistration = lazy(() => import('@/pages/franchise/FranchisePages').then((m) => ({ default: m.FranchiseRegistration })))
const MasterData = lazy(() => import('@/pages/franchise/FranchisePages').then((m) => ({ default: m.MasterData })))
const TierList = lazy(() => import('@/pages/franchise/FranchisePages').then((m) => ({ default: m.TierList })))
const Dossier = lazy(() => import('@/pages/franchise/Dossier'))
const SdManagement = lazy(() => import('@/pages/franchise/SdManagement'))
const ApnaAppList = lazy(() => import('@/pages/franchise/ApnaAppList'))
const ApnaAppRecord = lazy(() => import('@/pages/franchise/ApnaAppRecord'))
const KycQueue = lazy(() => import('@/pages/franchise/Kyc').then((m) => ({ default: m.KycQueue })))
const KycWorkspace = lazy(() => import('@/pages/franchise/Kyc').then((m) => ({ default: m.KycWorkspace })))
import { legalRoutes } from '@/pages/legal/routes'
import { projectRoutes } from '@/pages/projects/routes'
import { reportRoutes } from '@/pages/reports/routes'
import { financeRoutes } from '@/pages/finance/routes'
import { cbrRoutes } from '@/pages/cbr/routes'
import { operationsRoutes } from '@/pages/operations/routes'
import { taskRoutes } from '@/pages/tasks/routes'
import { emailRoutes } from '@/pages/email/routes'
import { complaintRoutes } from '@/pages/complaints/routes'
import { governanceRoutes } from '@/pages/governance/routes'
import { workManagementRoutes } from '@/pages/work-management/routes'
import { hrmsRoutes } from '@/pages/hrms/routes'
import { userRoutes } from '@/pages/user/routes'
import { getSession } from '@/lib/auth'
import { authRoutes } from '@/pages/auth/routes'
import { networkRoutes, networkCrumbs } from '@/pages/franchise/network/routes'
import { transferRoutes, transferCrumbs } from '@/pages/franchise/transfer/routes'
import { siteRoutes, siteCrumbs } from '@/pages/masterdata/sites/routes'
import { masterHubRoutes, masterHubCrumbs } from '@/pages/masterdata/hub/routes'
import { securityAdminRoutes, securityAdminCrumbs } from '@/pages/governance/security/routes'
import { privacyRoutes, privacyCrumbs } from '@/pages/governance/privacy/routes'
import { overviewRoutes, overviewCrumbs } from '@/pages/payout/overview/routes'
import { accountRoutes, accountCrumbs } from '@/pages/payout/accounts/routes'
import { monthlyRoutes, monthlyCrumbs } from '@/pages/payout/monthly/routes'
import { planRoutes, planCrumbs } from '@/pages/payout/plans/routes'
import { businessRoutes, businessCrumbs } from '@/pages/payout/business/routes'
import { workflowRoutes, workflowCrumbs } from '@/pages/setup/workflow/routes'
import { alfRoutes, alfCrumbs } from '@/pages/operations/alf/routes'
import { eodRoutes, eodCrumbs } from '@/pages/operations/eod2/routes'
import { opsIntelRoutes, opsIntelCrumbs } from '@/pages/operations/intel/routes'
import { reconRoutes, reconCrumbs } from '@/pages/operations/recon2/routes'
import { registerCrumbs } from '@/data/nav'

registerCrumbs(
  Object.fromEntries(
    Object.entries({ ...networkCrumbs, ...transferCrumbs, ...siteCrumbs, ...masterHubCrumbs, ...securityAdminCrumbs, ...privacyCrumbs, ...overviewCrumbs, ...accountCrumbs, ...monthlyCrumbs, ...planCrumbs, ...businessCrumbs, ...workflowCrumbs, ...alfCrumbs, ...eodCrumbs, ...opsIntelCrumbs, ...reconCrumbs }).filter(([k]) => !k.includes(':')),
  ),
)
const MobileAppShell = lazy(() => import('@/pages/mobile/MobileAppShell').then((m) => ({ default: m.MobileAppShell })))
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-[13px] text-slate-500">Loading…</div>}>
      <Routes>
        {/* Dedicated Native Mobile App Simulator Experience */}
        <Route path="/mobile" element={<MobileAppShell />} />
        <Route path="/mobile/*" element={<MobileAppShell />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password/reset" element={<CreatePassword />} />
        <Route path="/forgot-password/done" element={<ResetSuccess />} />
        <Route path="/auth-success" element={<AuthSuccess />} />
        {authRoutes}

        {/* App */}
        <Route element={<AppShell />}>
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/operations" element={<Dashboard />} />
          <Route path="/dashboard/view" element={<Dashboard />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/onboarding" element={<OnboardingHub />} />
          <Route path="/onboarding/users" element={<EmployeeList />} />
          <Route path="/onboarding/users/new" element={<EmployeeOnboardingForm />} />
          <Route path="/onboarding/users/:id" element={<EmployeeRecord />} />
          <Route path="/onboarding/users/:id/edit" element={<EmployeeOnboardingForm />} />
          <Route path="/employees" element={<Navigate to="/onboarding/users" replace />} />
          <Route path="/employee-onboarding" element={<Navigate to="/onboarding/users/new" replace />} />
          <Route path="/onboarding/applications" element={<Applications />} />
          <Route path="/onboarding/applications/:appId" element={<Applications />} />
          <Route path="/onboarding/approvals" element={<OnboardingApprovals />} />
          {networkRoutes}
          {transferRoutes}
          {siteRoutes}
          {masterHubRoutes}
          <Route path="/franchise" element={<FranchiseHub />} />
          <Route path="/franchise/registration" element={<FranchiseRegistration />} />
          <Route path="/franchise/master-data" element={<MasterData />} />
          <Route path="/franchise/master-data/:id" element={<Dossier />} />
          <Route path="/franchise/master-data/:id/sd" element={<SdManagement />} />
          <Route path="/franchise/apna-app" element={<ApnaAppList />} />
          <Route path="/franchise/apna-app/new" element={<ApnaAppRecord />} />
          <Route path="/franchise/apna-app/:id" element={<ApnaAppRecord />} />
          <Route path="/franchise/:tier" element={<TierList />} />
          <Route path="/kyc" element={<KycHub />} />
          <Route path="/kyc/upload" element={<KycUpload />} />
          <Route path="/kyc/verification" element={<KycQueue />} />
          <Route path="/kyc/verification/:caseId" element={<KycWorkspace />} />
          <Route path="/setup" element={<SetupHub />} />
          <Route path="/setup/sla-rules" element={<SlaRules />} />
          <Route path="/setup/escalation-matrix" element={<EscalationMatrixHub />} />
          <Route path="/setup/escalation-matrix/hierarchy" element={<EscalationHierarchy />} />
          <Route path="/setup/business-settings" element={<BusinessSettingsHub />} />
          <Route path="/setup/business-settings/org-unit" element={<OrgUnitList />} />
          {legalRoutes}
          {projectRoutes}
          {reportRoutes}
          {financeRoutes}
          {cbrRoutes}
          {operationsRoutes}
          {taskRoutes}
          {emailRoutes}
          {complaintRoutes}
          {workflowRoutes}
          {/* one Address Master (Onboarding › Setup) — the recon module's duplicate route is dropped */}
          {reconRoutes.filter((r) => r.props.path !== '/setup/address-master')}
          {alfRoutes}
          {eodRoutes}
          {opsIntelRoutes}
          {overviewRoutes}
          {accountRoutes}
          {monthlyRoutes}
          {planRoutes}
          {businessRoutes}
          {securityAdminRoutes}
          {privacyRoutes}
          {/* The old mock Sessions / Security pages are replaced by the live security administration pages. */}
          <Route path="/governance/sessions" element={<Navigate to="/governance/live-sessions" replace />} />
          <Route path="/governance/security" element={<Navigate to="/governance/security-admin" replace />} />
          {governanceRoutes}
          {workManagementRoutes}
          {hrmsRoutes}
          {userRoutes}
          <Route path="*" element={<Placeholder />} />
        </Route>

        <Route index element={<Navigate to={getSession() ? '/dashboard' : '/login'} replace />} />
      </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  )
}
