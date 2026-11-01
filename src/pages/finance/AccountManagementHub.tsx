import { Link } from 'react-router-dom'
import { Home, ChevronRight, Wallet, Landmark, FileCheck } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface AccountTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Wallet
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const ACCOUNT_TILES: AccountTileConfig[] = [
  {
    title: 'PAYOUT',
    sub: 'Process, schedule, and track monthly payouts, PAN routing and bank disbursements for partners.',
    to: '/finance/payout',
    Icon: Wallet,
    theme: 'rose',
    tag: 'Partner Settlements',
    badge: 'Disbursements',
    actionText: 'Manage Payouts',
  },
  {
    title: 'SETTLEMENT BANK',
    sub: 'Manage settlement bank account mapping, A/C change requests, and new account openings.',
    to: '/finance/settlement-bank',
    Icon: Landmark,
    theme: 'blue',
    tag: 'Banking Operations',
    badge: '3 Modules',
    actionText: 'Explore Settlement Bank',
  },
  {
    title: 'TDS COMPLIANCE',
    sub: 'Monitor Section 194N cash withdrawal TDS, 194C contractor deductions, and Form 15G/15H filings.',
    to: '/finance/tds-compliance',
    Icon: FileCheck,
    theme: 'emerald',
    tag: 'Tax Deductions',
    badge: '194N & 194C',
    actionText: 'View TDS Compliance',
  },
]

export default function AccountManagementHub() {
  return (
    <div className="space-y-4 max-w-[1080px] pb-12 font-sans">
      {/* Breadcrumb: Workspace > Finance > Account Management */}
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
        <span className="font-semibold text-slate-800">Account Management</span>
      </div>

      {/* Page Header */}
      <div className="mb-5 sm:mb-6 pt-1">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          Account Management
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Manage partner settlement payouts, master bank accounts, and statutory TDS compliance operations.
        </p>
      </div>

      {/* Tiles Grid matching Legal & HR style */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ACCOUNT_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

