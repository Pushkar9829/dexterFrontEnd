import {
  LayoutGrid, UserPlus, Briefcase, Scale, FolderKanban, BarChart3, SlidersHorizontal,
  Landmark, ShieldCheck, Users, type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  to?: string
  badge?: number
  children?: NavItem[]
}

export type NavGroup = NavItem & { icon: LucideIcon }

// Full sidebar from the Figma (all modules). Routes without a built page fall back to a placeholder.
export const NAV: NavGroup[] = [
  {
    label: 'Dashboard', icon: LayoutGrid, to: '/dashboard',
  },
  {
    label: 'Onboarding', icon: UserPlus, to: '/onboarding',
  },
  {
    label: 'Work Management', icon: Briefcase, to: '/work-management',
  },
  {
    label: 'Legal', icon: Scale, to: '/legal',
  },
  {
    label: 'Projects', icon: FolderKanban, to: '/projects',
  },
  {
    label: 'Reports & MIS', icon: BarChart3, to: '/reports',
  },
  {
    label: 'Operations', icon: SlidersHorizontal, to: '/operations',
  },
  {
    label: 'Finance', icon: Landmark, to: '/finance',
  },
  {
    label: 'Governance', icon: ShieldCheck, to: '/governance',
  },
  {
    label: 'HRMS', icon: Users, to: '/hrms',
  },
]

/** Nav trail (labels) for an exact route, or null. */
function trailOf(path: string, items: NavItem[] = NAV, trail: string[] = []): string[] | null {
  for (const it of items) {
    const next = [...trail, it.label]
    if (it.to === path) return next
    if (it.children) {
      const hit = trailOf(path, it.children, next)
      if (hit) return hit
    }
  }
  return null
}

const SEGMENT_LABEL: Record<string, string> = { new: 'New', sd: 'SD Management', audit: 'Audit history', documents: 'Documents', compose: 'Compose Email', daily: 'Daily CBR' }

/**
 * Breadcrumb trail for a path. Detail routes (e.g. /onboarding/applications/APP-2026-0248)
 * use the closest parent route plus the last segment.
 */
const PREFIX_TRAIL: Record<string, string[]> = {
  '/email/case': ['Email', 'Cases'],
  '/dashboard/operations': ['Dashboard', 'Operations'],
  '/dashboard/view': ['Dashboard', 'Operations'],
  '/notices': ['Dashboard', 'Notices'],
  '/onboarding/users': ['Onboarding', 'Users / Employee Management'],
  '/onboarding/users/new': ['Onboarding', 'Users / Employee Management', 'New Employee'],
  '/onboarding/approvals': ['Onboarding', 'Approvals'],
  '/franchise/super-master': ['Onboarding', 'Franchise Management', 'Super Master Franchise'],
  '/franchise/master': ['Onboarding', 'Franchise Management', 'Master Franchise'],
  '/franchise/franchise': ['Onboarding', 'Franchise Management', 'Franchise'],
  '/franchise/master-data': ['Onboarding', 'Franchise Management', 'Master Data'],
  '/franchise/apna-app': ['Onboarding', 'Franchise Management', 'Apna App'],
  '/franchise/apna-app/new': ['Onboarding', 'Franchise Management', 'Apna App', 'New Registration'],
  '/franchise': ['Onboarding', 'Franchise Management'],
  '/kyc/upload': ['Onboarding', 'KYC Management', 'Upload'],
  '/kyc/verification': ['Onboarding', 'KYC Management', 'Verification'],
  '/kyc': ['Onboarding', 'KYC Management'],
  '/setup/sla-rules': ['Onboarding', 'Setup', 'SLA Rules'],
  '/setup/escalation-matrix/hierarchy': ['Onboarding', 'Setup', 'Escalation Matrix', 'Hierarchy'],
  '/setup/escalation-matrix': ['Onboarding', 'Setup', 'Escalation Matrix'],
  '/setup/business-settings/org-unit': ['Onboarding', 'Setup', 'Business Settings', 'Organization Unit'],
  '/setup/business-settings': ['Onboarding', 'Setup', 'Business Settings'],
  '/setup': ['Onboarding', 'Setup'],
  '/legal/loi/new': ['Workspace', 'Legal', 'LOI', 'Add LOI'],
  '/legal/loi/add': ['Workspace', 'Legal', 'LOI', 'Add LOI'],
  '/legal/loi': ['Workspace', 'Legal', 'LOI'],
  '/legal/affidavit/new': ['Workspace', 'Legal', 'Affidavit', 'Add Affidavit'],
  '/legal/affidavit/add': ['Workspace', 'Legal', 'Affidavit', 'Add Affidavit'],
  '/legal/affidavit': ['Workspace', 'Legal', 'Affidavit'],
  '/legal/agreement/new': ['Workspace', 'Legal', 'Agreement', 'Add Agreement'],
  '/legal/agreement/add': ['Workspace', 'Legal', 'Agreement', 'Add Agreement'],
  '/legal/agreement': ['Workspace', 'Legal', 'Agreement'],
  '/legal/fm-checks/new': ['Workspace', 'Legal', 'Cheques', 'New Cheque Collection'],
  '/legal/fm-checks/add': ['Workspace', 'Legal', 'Cheques', 'New Cheque Collection'],
  '/legal/fm-checks': ['Workspace', 'Legal', 'Cheques'],
  '/legal/cheques/new': ['Workspace', 'Legal', 'Cheques', 'New Cheque Collection'],
  '/legal/cheques/add': ['Workspace', 'Legal', 'Cheques', 'New Cheque Collection'],
  '/legal/cheques': ['Workspace', 'Legal', 'Cheques'],
  '/legal/pvc/new': ['Workspace', 'Legal', 'PVC', 'New PVC'],
  '/legal/pvc/add': ['Workspace', 'Legal', 'PVC', 'New PVC'],
  '/legal/pvc': ['Workspace', 'Legal', 'PVC'],
  '/legal/other-documents/new': ['Workspace', 'Legal', 'Other Legal Documents', 'New Document'],
  '/legal/other-documents/add': ['Workspace', 'Legal', 'Other Legal Documents', 'New Document'],
  '/legal/other-documents': ['Workspace', 'Legal', 'Other Legal Documents'],
  '/legal/data': ['Legal', 'Legal Data'],
  '/legal': ['Legal'],
  '/projects/active': ['Workspace', 'Projects', 'Site Master'],
  '/projects/archived': ['Workspace', 'Projects', 'Archived Projects'],
  '/projects/installation': ['Workspace', 'Projects', 'Site Installation'],
  '/projects/installation/new': ['Projects', 'Site Readiness', 'Site Number'],
  '/projects/site-readiness/site-number': ['Projects', 'Site Readiness', 'Site Number'],
  '/projects/other': ['Workspace', 'Projects', 'Other'],
  '/projects': ['Workspace', 'Projects'],
  '/operations/complaints': ['Workspace', 'Operations', 'Complaints'],
  '/operations/complaints/operations': ['Workspace', 'Operations', 'Complaints', 'Operations'],
  '/operations/complaints/assets': ['Workspace', 'Operations', 'Complaints', 'Assets'],
  '/operations/complaints/ai': ['Workspace', 'Operations', 'Complaints', 'AI Insights'],
  '/operations/complaints/new': ['Workspace', 'Operations', 'Complaints', 'New Complaint'],
  '/operations/cash-loading': ['Workspace', 'Operations', 'Cash Loading Register'],
  '/operations/bank-statement': ['Workspace', 'Operations', 'Bank Statement'],
  '/operations/tds': ['Workspace', 'Operations', 'TDS Letters'],
  '/operations/txn-data': ['Workspace', 'Reports & MIS', 'TXNs Data History', 'Weekly Report'],
  '/operations/txn-data/new': ['Operations', 'Daily Operations', 'Daily TXN Data'],
  '/operations/txn-data/daily': ['Operations', 'Daily Operations', 'Daily TXN Data'],
  '/operations/daak': ['Workspace', 'Operations', 'Daak Management'],
  '/operations': ['Workspace', 'Operations'],
  '/reports': ['Workspace', 'Reports & MIS'],
  '/reports/financial': ['Workspace', 'Reports & MIS', 'Financial Report'],
  '/finance': ['Workspace', 'Finance'],
  '/finance/sd': ['Workspace', 'Finance', 'Security Deposit '],
  '/finance/sd/new': ['Workspace', 'Finance', 'Security Deposit ', 'new'],
  '/finance/clf': ['Workspace', 'Finance', 'CLF Data'],
  '/finance/clf/new': ['Workspace', 'Finance', 'CLF Data', 'new'],
  '/operations/daily-operations/clf': ['Workspace', 'Operations', 'Daily Operations', 'Cash Loading Funds (CLF)'],
  '/finance/gst': ['Workspace', 'Finance', 'GST Data'],
  '/finance/gst/new': ['Workspace', 'Finance', 'GST Data', 'new'],
  '/finance/payout': ['Workspace', 'Finance', 'Payout Data'],
  '/finance/payout/new': ['Workspace', 'Finance', 'Payout Data', 'new'],
  '/finance/hr-payments': ['Workspace', 'Finance', 'HR Payments'],
  '/finance/hr-payments/salary': ['Workspace', 'Finance', 'HR Payments', 'Staff Salary'],
  '/finance/hr-payments/salary/new': ['Workspace', 'Finance', 'HR Payments', 'Staff Salary', 'new'],
  '/finance/hr-payments/expenses': ['Workspace', 'Finance', 'HR Payments', 'Expenses'],
  '/finance/hr-payments/expenses/new': ['Workspace', 'Finance', 'HR Payments', 'Expenses', 'new'],
  '/governance': ['Workspace', 'Governance'],
  '/governance/audit': ['Workspace', 'Governance', 'Audit'],
  '/governance/sessions': ['Workspace', 'Governance', 'Sessions'],
  '/governance/security': ['Workspace', 'Governance', 'Security'],
  '/governance/compliance': ['Workspace', 'Governance', 'Compliance'],
  '/work-management': ['Workspace', 'Work Management'],
  '/hrms': ['Workspace', 'HRMS'],
  '/hrms/attendance': ['Workspace', 'HRMS', 'Attendance'],
  '/hrms/expenses': ['Workspace', 'HRMS', 'Expenses'],
  '/tasks': ['Workspace', 'Tasks'],
  '/tasks/command-center': ['Workspace', 'Tasks', 'Command Center'],
  '/tasks/my': ['Workspace', 'Tasks', 'My Tasks'],
  '/tasks/today': ['Workspace', 'Tasks', "Today's Tasks"],
  '/tasks/daily': ['Workspace', 'Tasks', 'Daily Routine'],
  '/tasks/monthly': ['Workspace', 'Tasks', 'Monthly Tasks'],
  '/tasks/overdue': ['Workspace', 'Tasks', 'Overdue'],
  '/tasks/blocked': ['Workspace', 'Tasks', 'Waiting / Blocked'],
  '/tasks/approval-pending': ['Workspace', 'Tasks', 'Approval Pending'],
  '/email': ['Workspace', 'Email'],
  '/email/inbox': ['Workspace', 'Email', 'My Inbox'],
  '/email/sent': ['Workspace', 'Email', 'Sent'],
  '/email/drafts': ['Workspace', 'Email', 'Drafts'],
  '/user': ['Workspace', 'User'],
  '/user/my-account': ['Workspace', 'User', 'My Account'],
  '/user/help-support': ['Workspace', 'User', 'Help & Support'],
  '/user/profile': ['Workspace', 'User', 'My Account', 'Profile'],
  '/user/change-password': ['Workspace', 'User', 'My Account', 'Change Password'],
  '/user/tickets': ['Workspace', 'User', 'Help & Support', 'Tickets'],
  '/user/help-center': ['Workspace', 'User', 'Help & Support', 'Help Center'],
  '/user/tour': ['Workspace', 'User', 'Help & Support', 'Take a tour'],
  '/cbr/consolidated': ['Workspace', 'Reports & MIS', 'Consolidated Datewise CBR'],
  '/cbr/eod-summary': ['Workspace', 'Reports & MIS', 'CBR EOD Summary'],
  '/cbr/mobile': ['Workspace', 'Reports & MIS', 'Daily CBR'],
  '/cbr': ['Workspace', 'Reports & MIS', 'CBR'],
}

export function trailFor(pathname: string): string[] {
  if (pathname === '/notices') return ['Dashboard', 'Notices']
  if (pathname === '/dashboard/operations' || pathname === '/dashboard/view') return ['Dashboard', 'Operations']
  if (PREFIX_TRAIL[pathname]) return PREFIX_TRAIL[pathname]
  for (const [prefix, trail] of Object.entries(PREFIX_TRAIL)) {
    if (pathname.startsWith(prefix + '/')) return [...trail, ...pathname.slice(prefix.length + 1).split('/').map(decodeURIComponent)]
  }
  const exact = trailOf(pathname)
  if (exact) return exact
  const parts = pathname.split('/').filter(Boolean)
  for (let i = parts.length - 1; i > 0; i--) {
    const hit = trailOf('/' + parts.slice(0, i).join('/'))
    if (hit) return [...hit, ...parts.slice(i).map((p) => SEGMENT_LABEL[p] ?? decodeURIComponent(p))]
  }
  return []
}

const allTo = (items: NavItem[]): string[] => items.flatMap((i) => [...(i.to ? [i.to] : []), ...(i.children ? allTo(i.children) : [])])
const ROUTES = allTo(NAV)

/** The nav route that owns a path: exact match, else the longest route that is a parent of it. */
export function activeRoute(pathname: string): string | undefined {
  if (pathname === '/notices' || pathname.startsWith('/dashboard/')) return '/dashboard'
  if (
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/franchise') ||
    pathname.startsWith('/kyc') ||
    pathname.startsWith('/setup')
  ) {
    return '/onboarding'
  }
  if (pathname.startsWith('/legal')) return '/legal'
  if (pathname.startsWith('/projects')) return '/projects'
  if (pathname.startsWith('/operations')) return '/operations'
  if (pathname.startsWith('/reports')) return '/reports'
  if (pathname.startsWith('/finance')) return '/finance'
  if (pathname.startsWith('/governance')) return '/governance'
  if (pathname.startsWith('/work-management')) return '/work-management'
  if (pathname.startsWith('/tasks')) return '/tasks'
  if (pathname.startsWith('/email')) return '/email'
  if (pathname.startsWith('/user')) return '/user'
  if (ROUTES.includes(pathname)) return pathname
  return ROUTES.filter((r) => pathname.startsWith(r + '/')).sort((a, b) => b.length - a.length)[0]
}

/** True if this nav item or any descendant owns the path. */
export function containsPath(item: NavItem, pathname: string): boolean {
  const owner = activeRoute(pathname)
  const has = (it: NavItem): boolean => it.to === owner || !!it.children?.some(has)
  return !!owner && has(item)
}
