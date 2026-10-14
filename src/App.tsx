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
import { Toaster } from '@/components/ui/Toast'
import { FranchiseHub, FranchiseRegistration, MasterData, TierList } from '@/pages/franchise/FranchisePages'
import Dossier from '@/pages/franchise/Dossier'
import SdManagement from '@/pages/franchise/SdManagement'
import { KycQueue, KycWorkspace } from '@/pages/franchise/Kyc'
import { legalRoutes } from '@/pages/legal/routes'
import { projectRoutes } from '@/pages/projects/routes'
import { reportRoutes } from '@/pages/reports/routes'
import { financeRoutes } from '@/pages/finance/routes'
import { cbrRoutes } from '@/pages/cbr/routes'
import { taskRoutes } from '@/pages/tasks/routes'
import { emailRoutes } from '@/pages/email/routes'
import { complaintRoutes } from '@/pages/complaints/routes'
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
          <Route path="/notices" element={<Notices />} />
          <Route path="/onboarding/applications" element={<Applications />} />
          <Route path="/onboarding/applications/:appId" element={<Applications />} />
          <Route path="/franchise" element={<FranchiseHub />} />
          <Route path="/franchise/registration" element={<FranchiseRegistration />} />
          <Route path="/franchise/master-data" element={<MasterData />} />
          <Route path="/franchise/master-data/:id" element={<Dossier />} />
          <Route path="/franchise/master-data/:id/sd" element={<SdManagement />} />
          <Route path="/franchise/apna-app" element={<Placeholder />} />
          <Route path="/franchise/:tier" element={<TierList />} />
          <Route path="/kyc/verification" element={<KycQueue />} />
          <Route path="/kyc/verification/:caseId" element={<KycWorkspace />} />
          {legalRoutes}
          {projectRoutes}
          {reportRoutes}
          {financeRoutes}
          {cbrRoutes}
          {taskRoutes}
          {emailRoutes}
          {complaintRoutes}
          <Route path="*" element={<Placeholder />} />
        </Route>

        <Route index element={<Navigate to={getSession() ? '/dashboard' : '/login'} replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
