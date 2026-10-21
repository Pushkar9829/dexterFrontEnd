import { Link } from 'react-router-dom'
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CalendarCheck,
  ChevronRight,
  FileText,
  Landmark,
  Mail,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { cn } from '@/lib/cn'

interface OperationTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof MessageSquare
  theme: HubTileTheme
  tag: string
  reportsCount: string
  badge?: string
  actionText?: string
}

const OPERATION_TILES: OperationTileConfig[] = [
  {
    title: 'COMPLAINTS',
    sub: 'View, manage and resolve customer complaints.',
    to: '/operations/complaints',
    Icon: MessageSquare,
    theme: 'blue',
    tag: 'Service Desk',
    reportsCount: '16 Reports',
    badge: '16 Reports',
    actionText: 'Manage complaints',
  },
  {
    title: 'CBR',
    sub: 'Track CBR details and related information.',
    to: '/cbr/consolidated',
    Icon: Landmark,
    theme: 'purple',
    tag: 'Cash Balancing',
    reportsCount: '8 Reports',
    badge: '8 Reports',
    actionText: 'Track CBR',
  },
  {
    title: 'EOD',
    sub: 'Manage end of day operations and reports.',
    to: '/cbr/eod-summary',
    Icon: CalendarCheck,
    theme: 'emerald',
    tag: 'End of Day',
    reportsCount: '5 Reports',
    badge: '5 Reports',
    actionText: 'Manage EOD',
  },
  {
    title: 'CASH LOADING REGISTER',
    sub: 'Maintain cash loading records and transactions.',
    to: '/operations/cash-loading',
    Icon: Banknote,
    theme: 'amber',
    tag: 'Cash Ops',
    reportsCount: '7 Reports',
    badge: '7 Reports',
    actionText: 'View register',
  },
  {
    title: 'BANK STATEMENT',
    sub: 'View and download bank statements.',
    to: '/operations/bank-statement',
    Icon: Building2,
    theme: 'cyan',
    tag: 'Reconciliation',
    reportsCount: '6 Reports',
    badge: '6 Reports',
    actionText: 'View statements',
  },
  {
    title: 'TDS LETTERS',
    sub: 'Manage TDS letters and related documents.',
    to: '/operations/tds',
    Icon: FileText,
    theme: 'rose',
    tag: 'Tax Records',
    reportsCount: '4 Reports',
    badge: '4 Reports',
    actionText: 'Manage TDS',
  },
  {
    title: 'TXN DATA',
    sub: 'Track transaction dates and manage records.',
    to: '/operations/txn-data',
    Icon: ArrowLeftRight,
    theme: 'indigo',
    tag: 'Transactions',
    reportsCount: '6 Reports',
    badge: '6 Reports',
    actionText: 'Track TXN data',
  },
  {
    title: 'DAAK MANAGEMENT',
    sub: 'Manage daak (mail) records and related activities.',
    to: '/operations/daak',
    Icon: Mail,
    theme: 'teal',
    tag: 'Postal Dispatch',
    reportsCount: '5 Reports',
    badge: '5 Reports',
    actionText: 'Manage daak',
  },
]

const QUICK_ACCESS_ITEMS = [
  {
    title: 'Complaints',
    to: '/operations/complaints',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
    Icon: MessageSquare,
  },
  {
    title: 'CBR',
    to: '/cbr/consolidated',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
    Icon: Landmark,
  },
  {
    title: 'EOD',
    to: '/cbr/eod-summary',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Icon: CalendarCheck,
  },
  {
    title: 'Cash Loading Register',
    to: '/operations/cash-loading',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    Icon: Banknote,
  },
  {
    title: 'Bank Statement',
    to: '/operations/bank-statement',
    iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    Icon: Building2,
  },
  {
    title: 'TDS Letters',
    to: '/operations/tds',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
    Icon: FileText,
  },
  {
    title: 'TXN Data',
    to: '/operations/txn-data',
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    Icon: ArrowLeftRight,
  },
  {
    title: 'Daak Management',
    to: '/operations/daak',
    iconBg: 'bg-teal-50 text-teal-600 border-teal-200',
    Icon: Mail,
  },
]

export default function OperationsHub() {
  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12 font-sans">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Operations</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage day-to-day operations, transactions and service related activities.
        </p>
      </div>

      {/* Main Layout: Tiles Grid + Quick Access */}
      <div className="flex flex-col items-start gap-5 xl:flex-row">
        {/* Left Area: Tiles Grid (maintaining legal height, width & design pattern) */}
        <div className="min-w-0 flex-1 w-full">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OPERATION_TILES.map((tile) => (
              <HubTile key={tile.title} {...tile} />
            ))}
          </div>
        </div>

        {/* Right Area: Quick Access Column */}
        <div className="w-full shrink-0 xl:w-[260px] 2xl:w-[276px]">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            {/* Header */}
            <div className="flex items-start gap-2.5">
              <Zap size={22} className="shrink-0 text-[#0066FF] fill-[#0066FF]" />
              <div>
                <h3 className="text-[15.5px] font-bold text-[#1E293B]">Quick Access</h3>
                <p className="mt-0.5 text-[11px] text-[#64748B] leading-tight">
                  Get to your important reports faster
                </p>
              </div>
            </div>

            {/* Quick Access List */}
            <div className="mt-4 space-y-2">
              {QUICK_ACCESS_ITEMS.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-2.5 transition-all duration-150 hover:bg-[#F8FAFC] hover:translate-x-0.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', item.iconBg)}>
                      <item.Icon size={16} />
                    </span>
                    <span className="truncate text-[12.5px] font-semibold text-[#1E293B]">
                      {item.title}
                    </span>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-[#94A3B8]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
