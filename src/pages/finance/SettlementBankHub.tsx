import { Link } from 'react-router-dom'
import { Home, ChevronRight, Layers, RefreshCw, Building2 } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface SettlementBankTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Layers
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const SETTLEMENT_BANK_TILES: SettlementBankTileConfig[] = [
  {
    title: 'ACCOUNT MAPPING',
    sub: 'Map ATM IDs and franchisee accounts to settlement bank nodal and escrow accounts.',
    to: '/finance/settlement-bank/account-mapping',
    Icon: Layers,
    theme: 'blue',
    tag: 'Routing & Mapping',
    badge: 'Active Mappings',
    actionText: 'Manage Mappings',
  },
  {
    title: 'A/C CHANGE REQUEST',
    sub: 'Review, verify, and approve franchisee bank account modification requests.',
    to: '/finance/settlement-bank/ac-change-request',
    Icon: RefreshCw,
    theme: 'amber',
    tag: 'Franchise Requests',
    badge: 'Approval Queue',
    actionText: 'Review Requests',
  },
  {
    title: 'ACCOUNT OPENING',
    sub: 'Track and manage new nodal, escrow, and virtual pool bank account opening applications.',
    to: '/finance/settlement-bank/account-opening',
    Icon: Building2,
    theme: 'emerald',
    tag: 'New Accounts',
    badge: 'Onboarding',
    actionText: 'View Applications',
  },
]

export default function SettlementBankHub() {
  return (
    <div className="space-y-4 max-w-[1080px] pb-12 font-sans">
      {/* Breadcrumb: Workspace > Finance > Account Management > Settlement Bank */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/account-management" className="hover:text-[#0066FF] transition-colors">
          Account Management
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Settlement Bank</span>
      </div>

      {/* Page Header */}
      <div className="mb-5 sm:mb-6 pt-1">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          Settlement Bank
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Manage settlement bank account mapping, A/C change requests, and new account openings.
        </p>
      </div>

      {/* Tiles Grid matching Legal & HR style */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SETTLEMENT_BANK_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

