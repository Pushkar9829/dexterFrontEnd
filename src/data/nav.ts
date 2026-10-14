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
    label: 'Overview', icon: LayoutGrid, children: [
      { label: 'Home', to: '/home' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Notices', to: '/notices', badge: 33 },
    ],
  },
  {
    label: 'Onboarding', icon: UserPlus, children: [
      { label: 'Application', to: '/onboarding/applications' },
      { label: 'Users / Employee Management', to: '/onboarding/users' },
      {
        label: 'Franchise Management', children: [
          { label: 'Overview', to: '/franchise' },
          { label: 'Franchise Registration', to: '/franchise/registration' },
          { label: 'Super Master Franchise', to: '/franchise/super-master' },
          { label: 'Master Franchise', to: '/franchise/master' },
          { label: 'Franchise', to: '/franchise/franchise' },
          { label: 'Master Data', to: '/franchise/master-data' },
          { label: 'Apna App', to: '/franchise/apna-app' },
        ],
      },
      {
        label: 'KYC Management', children: [
          { label: 'Upload', to: '/kyc/upload' },
          { label: 'Verification', to: '/kyc/verification' },
        ],
      },
      {
        label: 'Setup', children: [
          { label: 'Escalation matrix', to: '/setup/escalation-matrix' },
          { label: 'Business Settings', to: '/setup/business-settings' },
          { label: 'SLA Rules', to: '/setup/sla-rules' },
        ],
      },
      { label: 'Approvals', to: '/onboarding/approvals' },
    ],
  },
  {
    label: 'Legal', icon: Scale, children: [
      { label: 'Legal Data', to: '/legal' },
      { label: 'Franchisee App (mobile)', to: '/franchisee-app' },
    ],
  },
  {
    label: 'Projects', icon: FolderKanban, children: [
      { label: 'Active Projects', to: '/projects/active' },
      { label: 'Archived Projects', to: '/projects/archived' },
    ],
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
    label: 'Operations', icon: SlidersHorizontal, children: [
      {
        label: 'Complaints', children: [
          { label: 'Management', to: '/operations/complaints' },
          { label: 'Operations', to: '/operations/complaints/operations' },
          { label: 'Assets', to: '/operations/complaints/assets' },
          { label: 'AI insights', to: '/operations/complaints/ai' },
          { label: 'Create complaint', to: '/operations/complaints/new' },
        ],
      },
    ],
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
const PREFIX_TRAIL: Record<string, string[]> = { '/email/case': ['Email', 'Cases'] }

export function trailFor(pathname: string): string[] {
  const exact = trailOf(pathname)
  if (exact) return exact
  for (const [prefix, trail] of Object.entries(PREFIX_TRAIL))
    if (pathname.startsWith(prefix + '/')) return [...trail, ...pathname.slice(prefix.length + 1).split('/').map(decodeURIComponent)]
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
  if (ROUTES.includes(pathname)) return pathname
  return ROUTES.filter((r) => pathname.startsWith(r + '/')).sort((a, b) => b.length - a.length)[0]
}

/** True if this nav item or any descendant owns the path. */
export function containsPath(item: NavItem, pathname: string): boolean {
  const owner = activeRoute(pathname)
  const has = (it: NavItem): boolean => it.to === owner || !!it.children?.some(has)
  return !!owner && has(item)
}
