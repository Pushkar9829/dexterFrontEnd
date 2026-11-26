import { Link, useLocation } from 'react-router-dom'
import { Banknote, FilePlus2, Landmark, type LucideIcon } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { Button } from '@/components/ui/Button'
import { cbrMaster } from '@/data/cbr'
import { CashKpis, Crumbs, FundingChip, FundingReport, SeparationPanel } from './CashRecordUi'

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

export default function CbrHub() {
  const { pathname } = useLocation()
  const base = pathname.startsWith('/operations/cbr') ? '/operations/cbr' : '/cbr'
  const tiles: CbrTileConfig[] = [
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
      title: 'CASH REPLACEMENT MANAGEMENT',
      sub: 'Create a new CBR and list, search and filter submitted CBRs through verification, approval and the CBR Master.',
      to: `${base}/replenishment`,
      Icon: Banknote,
      theme: 'emerald',
      tag: 'Replenishment Ops',
      badge: 'Active Operations',
      actionText: 'Manage Replenishment',
      reportsCount: '6 Reports',
    },
    {
      title: 'NEW CBR',
      sub: 'Start a Cash Balance Report for a Full Funding ATM — site, bank and WLA details are fetched from the masters.',
      to: `${base}/replenishment/new`,
      Icon: FilePlus2,
      theme: 'blue',
      tag: 'Full Funding',
      badge: 'Create',
      actionText: 'Create CBR',
    },
  ]
  return (
    <div className="max-w-[1180px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Operations', to: '/operations' }, { label: 'CBR' }]} />

      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">CBR Module</h1>
          <p className="mt-1 text-[13px] text-muted">Cash Balance Report — CBR Overview and Cash Replacement Management for Full Funding sites.</p>
        </div>
        <div className="flex items-center gap-2">
          <FundingChip kind="CBR" />
          <Link to={`${base}/replenishment/new`}>
            <Button size="sm" icon={<FilePlus2 size={14} />}>
              New CBR
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>

      <h2 className="pt-2 text-[15px] font-bold text-slate-900">CBR Overview — workflow status</h2>
      <CashKpis master={cbrMaster} />
      <FundingReport initial="CBR" />
      <SeparationPanel />
    </div>
  )
}
