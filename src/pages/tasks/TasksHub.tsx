import {
  AlertTriangle,
  Calendar,
  CalendarRange,
  CheckSquare,
  Clock,
  FileCheck,
  LayoutDashboard,
  RotateCw,
  type LucideIcon,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface TaskTileConfig {
  title: string
  sub: string
  to: string
  Icon: LucideIcon
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const TASK_TILES: TaskTileConfig[] = [
  {
    title: 'COMMAND CENTER',
    sub: 'High-level operations dashboard with task throughput, SLAs, and performance metrics.',
    to: '/tasks/command-center',
    Icon: LayoutDashboard,
    theme: 'blue',
    tag: 'Overview',
    badge: 'Live SLA',
    actionText: 'Open Command Center',
  },
  {
    title: 'MY TASKS',
    sub: 'Personal assigned queue, active checklists, pending action items, and personal focus tasks.',
    to: '/tasks/my',
    Icon: CheckSquare,
    theme: 'purple',
    tag: 'Assigned',
    badge: '24 Active',
    actionText: 'View my tasks',
  },
  {
    title: "TODAY'S TASKS",
    sub: 'Daily priorities, scheduled morning routines, and tasks due before end of day.',
    to: '/tasks/today',
    Icon: Calendar,
    theme: 'emerald',
    tag: 'Due Today',
    badge: 'Priority',
    actionText: "View today's tasks",
  },
  {
    title: 'DAILY ROUTINE',
    sub: 'Standard operating procedures, daily ATM checks, cash confirmations, and recurring tasks.',
    to: '/tasks/daily',
    Icon: RotateCw,
    theme: 'cyan',
    tag: 'Recurring',
    badge: 'Daily SOP',
    actionText: 'Open daily routine',
  },
  {
    title: 'MONTHLY TASKS',
    sub: 'Month-end reconciliations, franchise statement audits, and scheduled periodic reports.',
    to: '/tasks/monthly',
    Icon: CalendarRange,
    theme: 'indigo',
    tag: 'Periodic',
    badge: 'Month-End',
    actionText: 'View monthly tasks',
  },
  {
    title: 'OVERDUE',
    sub: 'Escalated action items and breach alerts requiring immediate managerial resolution.',
    to: '/tasks/overdue',
    Icon: AlertTriangle,
    theme: 'rose',
    tag: 'Escalated',
    badge: 'Breached SLA',
    actionText: 'Resolve overdue',
  },
  {
    title: 'WAITING / BLOCKED',
    sub: 'Tasks pending external dependencies, CRA vendor responses, or blocked on partner feedback.',
    to: '/tasks/blocked',
    Icon: Clock,
    theme: 'amber',
    tag: 'Dependencies',
    badge: 'Blocked',
    actionText: 'Review blocked',
  },
  {
    title: 'APPROVAL PENDING',
    sub: 'Maker-checker verification requests, payout authorizations, and supervisor sign-offs.',
    to: '/tasks/approval-pending',
    Icon: FileCheck,
    theme: 'teal',
    tag: 'Approvals',
    badge: 'Pending Review',
    actionText: 'Review approvals',
  },
]

export default function TasksHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Tasks</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage operational routines, assigned queues, approvals, and daily SLA tasks in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TASK_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
