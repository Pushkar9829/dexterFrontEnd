import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import Login from '@/pages/auth/Login'
import VerifyOtp from '@/pages/auth/VerifyOtp'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import CreatePassword from '@/pages/auth/CreatePassword'
import { AuthSuccess, ResetSuccess } from '@/pages/auth/AuthResult'
import Dashboard from '@/pages/Dashboard'
import Notices from '@/pages/Notices'
import Placeholder from '@/pages/Placeholder'
import Applications from '@/pages/onboarding/Applications'
import OnboardingHub from '@/pages/onboarding/OnboardingHub'
import EmployeeList from '@/pages/onboarding/employee/EmployeeList'
import EmployeeRecord from '@/pages/onboarding/employee/EmployeeRecord'
import EmployeeOnboardingForm from '@/pages/onboarding/employee/EmployeeOnboardingForm'
import KycHub from '@/pages/onboarding/KycHub'
import KycUpload from '@/pages/onboarding/KycUpload'
import SetupHub, { BusinessSettingsHub, EscalationMatrixHub } from '@/pages/onboarding/SetupHub'
import { Toaster } from '@/components/ui/Toast'
import { FranchiseHub, FranchiseRegistration, MasterData, TierList } from '@/pages/franchise/FranchisePages'
import Dossier from '@/pages/franchise/Dossier'
import SdManagement from '@/pages/franchise/SdManagement'
import ApnaAppList from '@/pages/franchise/ApnaAppList'
import ApnaAppRecord from '@/pages/franchise/ApnaAppRecord'
import { KycQueue, KycWorkspace } from '@/pages/franchise/Kyc'
import { legalRoutes } from '@/pages/legal/routes'
import { projectRoutes } from '@/pages/projects/routes'
import { reportRoutes } from '@/pages/reports/routes'
import { financeRoutes } from '@/pages/finance/routes'
import { cbrRoutes } from '@/pages/cbr/routes'
import { taskRoutes } from '@/pages/tasks/routes'
import { emailRoutes } from '@/pages/email/routes'
import { complaintRoutes } from '@/pages/complaints/routes'
import { governanceRoutes } from '@/pages/governance/routes'
import { workManagementRoutes } from '@/pages/work-management/routes'
import { hrmsRoutes } from '@/pages/hrms/routes'
import { userRoutes } from '@/pages/user/routes'
import { getSession } from '@/lib/auth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password/reset" element={<CreatePassword />} />
        <Route path="/forgot-password/done" element={<ResetSuccess />} />
        <Route path="/auth-success" element={<AuthSuccess />} />

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
          <Route path="/setup/escalation-matrix" element={<EscalationMatrixHub />} />
          <Route path="/setup/business-settings" element={<BusinessSettingsHub />} />
          {legalRoutes}
          {projectRoutes}
          {reportRoutes}
          {financeRoutes}
          {cbrRoutes}
          {taskRoutes}
          {emailRoutes}
          {complaintRoutes}
          {governanceRoutes}
          {workManagementRoutes}
          {hrmsRoutes}
          {userRoutes}
          <Route path="*" element={<Placeholder />} />
        </Route>

        <Route index element={<Navigate to={getSession() ? '/dashboard' : '/login'} replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
