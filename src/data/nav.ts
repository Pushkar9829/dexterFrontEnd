import {
  LayoutGrid, UserPlus, Scale, FolderKanban, BarChart3, SlidersHorizontal,
  Landmark, Banknote, Mail, ShieldCheck, ListChecks, type LucideIcon,
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
    label: 'Legal', icon: Scale, to: '/legal',
  },
  {
    label: 'Projects', icon: FolderKanban, to: '/projects',
  },
  {
    label: 'Reports', icon: BarChart3, children: [
      { label: 'Unified Reports Hub', to: '/reports' },
      {
        label: 'Financial Report', children: [
          { label: 'BS', to: '/reports/financial/bs' },
          { label: 'Axis & ICD', to: '/reports/financial/axis-icd' },
          { label: 'CLF', to: '/reports/financial/clf' },
          { label: 'SD', to: '/reports/financial/sd' },
          { label: 'FFM EOD', to: '/reports/financial/ffm-eod' },
          { label: 'Overage deposit', to: '/reports/financial/overage-deposit' },
          { label: 'DLR2', to: '/reports/financial/dlr2' },
          { label: 'DLR3', to: '/reports/financial/dlr3' },
        ],
      },
    ],
  },
  {
    label: 'Operations', icon: SlidersHorizontal, to: '/operations',
  },
  {
    label: 'CBR', icon: Banknote, children: [
      { label: 'Consolidated Datewise CBR', to: '/cbr/consolidated' },
      { label: 'CBR EOD Summary', to: '/cbr/eod-summary' },
      { label: 'Daily CBR (mobile)', to: '/cbr/mobile' },
    ],
  },
  {
    label: 'Finance', icon: Landmark, children: [
      { label: 'GST', to: '/finance/gst' },
      { label: 'Payout', to: '/finance/payout' },
    ],
  },
  {
    label: 'Email', icon: Mail, children: [
      { label: 'My Inbox', to: '/email/inbox' },
      { label: 'Sent', to: '/email/sent' },
      { label: 'Drafts', to: '/email/drafts' },
    ],
  },
  {
    label: 'Governance', icon: ShieldCheck, children: [
      { label: 'Audit', to: '/governance/audit' },
      { label: 'Sessions', to: '/governance/sessions' },
      { label: 'Security / Notices', to: '/governance/security' },
    ],
  },
  {
    label: 'Tasks', icon: ListChecks, children: [
      { label: 'Command Center', to: '/tasks/command-center' },
      { label: 'My Tasks', to: '/tasks/my', badge: 24 },
      { label: "Today's Tasks", to: '/tasks/today' },
      { label: 'Daily Routine', to: '/tasks/daily' },
      { label: 'Monthly Tasks', to: '/tasks/monthly' },
      { label: 'Overdue', to: '/tasks/overdue' },
      { label: 'Waiting / Blocked', to: '/tasks/blocked' },
      { label: 'Approval Pending', to: '/tasks/approval-pending' },
    ],
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
  '/onboarding/approvals': ['Onboarding', 'Approvals'],
  '/franchise/super-master': ['Onboarding', 'Franchise Management', 'Super Master Franchise'],
  '/franchise/master': ['Onboarding', 'Franchise Management', 'Master Franchise'],
  '/franchise/franchise': ['Onboarding', 'Franchise Management', 'Franchise'],
  '/franchise/master-data': ['Onboarding', 'Franchise Management', 'Master Data'],
  '/franchise/apna-app': ['Onboarding', 'Franchise Management', 'Apna App'],
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
  '/legal/loi': ['Legal', 'LOI'],
  '/legal/affidavit': ['Legal', 'Affidavit'],
  '/legal/agreement': ['Legal', 'Agreement'],
  '/legal/fm-checks': ['Legal', 'FM Checks'],
  '/legal/pvc': ['Legal', 'PVC'],
  '/legal/other-documents': ['Legal', 'Other Legal Documents'],
  '/legal/data': ['Legal', 'Legal Data'],
  '/legal': ['Legal'],
  '/projects/active': ['Workspace', 'Projects', 'Site Master'],
  '/projects/archived': ['Workspace', 'Projects', 'Archived Projects'],
  '/projects/installation': ['Workspace', 'Projects', 'Site Installation'],
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
  '/operations/txn-data': ['Workspace', 'Operations', 'TXN Data'],
  '/operations/daak': ['Workspace', 'Operations', 'Daak Management'],
  '/operations': ['Workspace', 'Operations'],
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
  if (ROUTES.includes(pathname)) return pathname
  return ROUTES.filter((r) => pathname.startsWith(r + '/')).sort((a, b) => b.length - a.length)[0]
}

/** True if this nav item or any descendant owns the path. */
export function containsPath(item: NavItem, pathname: string): boolean {
  const owner = activeRoute(pathname)
  const has = (it: NavItem): boolean => it.to === owner || !!it.children?.some(has)
  return !!owner && has(item)
}
