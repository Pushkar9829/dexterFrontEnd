import { Outlet, useLocation, Link } from 'react-router-dom'

const SECTION_NAMES: Record<string, string> = {
  overview: 'Overview Dashboard',
  all: 'All Broadcasts',
  create: 'Create New Broadcast',
  scheduled: 'Scheduled Broadcasts',
  drafts: 'Drafts',
  'approval-queue': 'Approval Queue',
  published: 'Published / Sent',
  notices: 'Notice Board',
  reports: 'Broadcast Reports',
  assistant: 'AI Broadcast Assistant',
}

export default function BroadcastLayout() {
  const { pathname } = useLocation()

  // Determine section from pathname
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const currentSection = SECTION_NAMES[lastSegment] || (segments.includes('broadcast') ? 'Overview Dashboard' : 'Broadcast Management')

  return (
    <div className="space-y-3">
      {/* Breadcrumb row matching screenshots: Workspace > Broadcast Management > [Section] */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-[#64748B]">
        <Link to="/" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <span className="text-[#94A3B8]">&gt;</span>
        <Link to="/work-management/broadcast" className="hover:text-[#0066FF] transition-colors">
          Broadcast Management
        </Link>
        <span className="text-[#94A3B8]">&gt;</span>
        <span className="font-semibold text-[#0F172A]">{currentSection}</span>
      </nav>

      {/* Main view outlet */}
      <Outlet />
    </div>
  )
}

