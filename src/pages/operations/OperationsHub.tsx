import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CalendarCheck,
  FileText,
  Landmark,
  Mail,
  MessageSquare,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface OperationTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof MessageSquare
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const OPERATION_TILES: OperationTileConfig[] = [
  {
    title: 'COMPLAINTS',
    sub: 'View, manage and resolve customer complaints.',
    to: '/operations/complaints',
    Icon: MessageSquare,
    theme: 'blue',
    tag: 'Service Desk',
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
    badge: '5 Reports',
    actionText: 'Manage daak',
  },
]

export default function OperationsHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Operations</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage day-to-day operations, transactions and service related activities.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPERATION_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
