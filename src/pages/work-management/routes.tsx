import { Navigate, Route } from 'react-router-dom'
import WorkManagementHub from './WorkManagementHub'
import BroadcastLayout from '@/pages/broadcast/BroadcastLayout'
import BroadcastOverview from '@/pages/broadcast/BroadcastOverview'
import BroadcastCreate from '@/pages/broadcast/BroadcastCreate'
import BroadcastScheduled from '@/pages/broadcast/BroadcastScheduled'
import BroadcastApprovalQueue from '@/pages/broadcast/BroadcastApprovalQueue'
import BroadcastReports from '@/pages/broadcast/BroadcastReports'
import Notices from '@/pages/Notices'

export const workManagementRoutes = [
  <Route key="work-management-hub" path="/work-management" element={<WorkManagementHub />} />,

  // Broadcast module under /work-management/broadcast
  <Route key="wm-broadcast-layout" path="/work-management/broadcast" element={<BroadcastLayout />}>
    <Route index element={<BroadcastOverview />} />
    <Route path="overview" element={<BroadcastOverview />} />
    <Route path="all" element={<BroadcastScheduled defaultTab="all" />} />
    <Route path="create" element={<BroadcastCreate />} />
    <Route path="scheduled" element={<BroadcastScheduled defaultTab="scheduled" />} />
    <Route path="drafts" element={<BroadcastScheduled defaultTab="drafts" />} />
    <Route path="approval-queue" element={<BroadcastApprovalQueue />} />
    <Route path="published" element={<BroadcastScheduled defaultTab="published" />} />
    <Route path="notices" element={<Notices />} />
    <Route path="reports" element={<BroadcastReports />} />
    <Route path="assistant" element={<BroadcastCreate />} />
  </Route>,

  // Top-level alias /broadcast matching quick-links
  <Route key="broadcast-layout" path="/broadcast" element={<BroadcastLayout />}>
    <Route index element={<Navigate to="/work-management/broadcast" replace />} />
    <Route path="overview" element={<Navigate to="/work-management/broadcast/overview" replace />} />
    <Route path="all" element={<Navigate to="/work-management/broadcast/all" replace />} />
    <Route path="create" element={<Navigate to="/work-management/broadcast/create" replace />} />
    <Route path="scheduled" element={<Navigate to="/work-management/broadcast/scheduled" replace />} />
    <Route path="drafts" element={<Navigate to="/work-management/broadcast/drafts" replace />} />
    <Route path="approval-queue" element={<Navigate to="/work-management/broadcast/approval-queue" replace />} />
    <Route path="published" element={<Navigate to="/work-management/broadcast/published" replace />} />
    <Route path="notices" element={<Navigate to="/work-management/broadcast/notices" replace />} />
    <Route path="reports" element={<Navigate to="/work-management/broadcast/reports" replace />} />
    <Route path="assistant" element={<Navigate to="/work-management/broadcast/assistant" replace />} />
  </Route>,
]
