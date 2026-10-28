import { Link } from 'react-router-dom'
import {
  Banknote,
  ChevronRight,
  Home,
  Landmark,
  type LucideIcon,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface CbrTileConfig {
  title: string
  sub: string
  to: string
  Icon: LucideIcon
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
  reportsCount?: string
}

const CBR_TILES: CbrTileConfig[] = [
  {
    title: 'CBR OVERVIEW',
    sub: 'Review consolidated datewise cash balance reports, site reconciliation, and daily denomination logs.',
    to: '/cbr/consolidated',
    Icon: Landmark,
    theme: 'purple',
    tag: 'Cash Balancing',
    badge: 'Consolidated View',
    actionText: 'Open CBR Overview',
    reportsCount: '8 Reports',
  },
  {
    title: 'CASH REPLENISHMENT MANAGEMENT',
    sub: 'Track ATM cash replenishment cycles, indent requests, cash loading schedules, and verification records.',
    to: '/cbr/replenishment',
    Icon: Banknote,
    theme: 'emerald',
    tag: 'Replenishment Ops',
    badge: 'Active Operations',
    actionText: 'Manage Replenishment',
    reportsCount: '6 Reports',
  },
]

export default function CbrHub() {
  return (
    <div className="space-y-4 pb-12 max-w-[1080px]">
      {/* Breadcrumb: Workspace > Operations > CBR */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
          Operations
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">CBR</span>
      </div>

      <div className="mb-5 sm:mb-6 pt-1">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">CBR Module</h1>
        <p className="mt-1 text-[13px] text-muted">
          Track cash balancing reports, site reconciliation, and cash replenishment operations in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {CBR_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
