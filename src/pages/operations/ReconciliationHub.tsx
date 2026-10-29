import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronRight,
  Home,
  RotateCcw,
  Scale,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface ReconciliationTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof AlertTriangle
  theme: HubTileTheme
  tag: string
  reportsCount: string
  badge: string
  actionText: string
}

const RECONCILIATION_TILES: ReconciliationTileConfig[] = [
  {
    title: 'FAILED TXNS DISPUTE',
    sub: 'Track and resolve customer disputes for failed ATM cash withdrawals, reversal requests, and debited accounts.',
    to: '/operations/reconciliation/failed-txns',
    Icon: AlertTriangle,
    theme: 'rose',
    tag: 'ATM Reversals',
    reportsCount: 'Disputes',
    badge: 'Active Queue',
    actionText: 'View failed TXNs',
  },
  {
    title: 'CHARGE BACK DISPUTE',
    sub: 'Manage chargeback notifications raised by issuing banks, representment filings, and dispute documentation.',
    to: '/operations/reconciliation/charge-back',
    Icon: RotateCcw,
    theme: 'indigo',
    tag: 'Chargebacks',
    reportsCount: 'Claims',
    badge: 'SLA Tracking',
    actionText: 'Manage chargebacks',
  },
]

export default function ReconciliationHub() {
  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12 font-sans">
      {/* Breadcrumb: Workspace > Operations > Reconciliation */}
      <div className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/dashboard" className="transition-colors hover:text-[#0066FF]">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations" className="transition-colors hover:text-[#0066FF]">
          Operations
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Reconciliation</span>
      </div>

      {/* Page Header */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#0066FF] shadow-xs">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
              Reconciliation
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              Manage failed transaction disputes, bank chargeback claims, and settlement reconciliations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout: Tiles Grid */}
      <div className="flex flex-col items-start gap-5 xl:flex-row">
        {/* Left Area: Tiles Grid */}
        <div className="w-full min-w-0 flex-1">
          <div className="grid max-w-[840px] gap-4 sm:grid-cols-3">
            {RECONCILIATION_TILES.map((tile) => (
              <HubTile key={tile.title} {...tile} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

