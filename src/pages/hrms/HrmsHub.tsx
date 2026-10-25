import { CalendarCheck, Receipt, Users } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface HrmsTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof CalendarCheck
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const HRMS_TILES: HrmsTileConfig[] = [
  {
    title: 'ATTENDANCE',
    sub: 'Track employee daily punches, shifts, leaves, and attendance records.',
    to: '/hrms/attendance',
    Icon: CalendarCheck,
    theme: 'blue',
    tag: 'Time & Attendance',
    badge: 'Daily Log',
    actionText: 'Manage attendance',
  },
  {
    title: 'EXPENSES',
    sub: 'Submit, review, and approve employee travel, lodging, and field expense claims.',
    to: '/hrms/expenses',
    Icon: Receipt,
    theme: 'emerald',
    tag: 'Claims & Reimbursements',
    badge: 'Approvals',
    actionText: 'Manage expenses',
  },
]

export default function HrmsHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <div className="inline-flex items-center gap-2 rounded-md bg-[#0066FF]/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#0066FF] mb-2">
          <Users size={13} />
          <span>Human Resource Management</span>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">HRMS Module</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage employee attendance, daily shift punches, expense claims, and field reimbursements in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HRMS_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
