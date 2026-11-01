import { CalendarDays, FileSpreadsheet, Smartphone } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface EodTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof FileSpreadsheet
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const EOD_TILES: EodTileConfig[] = [
  {
    title: 'CONSOLIDATED REPORT / OVERVIEW',
    sub: 'Review datewise consolidated CBR balances, daily cash movements, and EOD upload compliance.',
    to: '/operations/eod/overview',
    Icon: FileSpreadsheet,
    theme: 'emerald',
    tag: 'Tab 1',
    badge: 'Overview',
    actionText: 'Open Overview',
  },
  {
    title: 'MONTHLY EOD',
    sub: 'Track full calendar month EOD submissions, switch balances vs physical cash counts, and variance alerts.',
    to: '/operations/eod/monthly',
    Icon: CalendarDays,
    theme: 'purple',
    tag: 'Tab 02',
    badge: 'Monthly',
    actionText: 'View Monthly EOD',
  },
  {
    title: 'CRM EOD REQUEST',
    sub: 'Submit and review Cash Recycler Machine EOD clearances, counter clearing tickets, and CRA reconciliation.',
    to: '/operations/eod/crm',
    Icon: Smartphone,
    theme: 'blue',
    tag: 'Tab 03',
    badge: 'Recycler',
    actionText: 'Manage CRM Requests',
  },
]

export default function EodHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">EOD Module</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage consolidated cash balance reports, monthly EOD submissions, and CRM recycler requests in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EOD_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
