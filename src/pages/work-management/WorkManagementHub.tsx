import {
  ListChecks,
  Mail,
  Megaphone,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface WorkManagementTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Mail
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const WORK_MANAGEMENT_TILES: WorkManagementTileConfig[] = [
  {
    title: 'EMAIL',
    sub: 'Manage mailboxes, inbound communications, correspondence and official drafts.',
    to: '/email/inbox',
    Icon: Mail,
    theme: 'blue',
    tag: 'Mailbox',
    badge: 'Inbox',
    actionText: 'Open mailbox',
  },
  {
    title: 'TASK MANAGEMENT',
    sub: 'Track operational routines, assignments, approval requests, and daily SLA tasks.',
    to: '/tasks/command-center',
    Icon: ListChecks,
    theme: 'purple',
    tag: 'Workflows',
    badge: 'Active Queue',
    actionText: 'Manage tasks',
  },
  {
    title: 'BROADCAST',
    sub: 'Publish, broadcast and acknowledge internal notices, alerts, and operational bulletins.',
    to: '/notices',
    Icon: Megaphone,
    theme: 'amber',
    tag: 'Bulletins',
    badge: 'Broadcasts',
    actionText: 'View broadcasts',
  },
]

export default function WorkManagementHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Work Management</h1>
        <p className="mt-1 text-[13px] text-muted">
          Central hub for email correspondence, operational tasks, and company broadcasts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WORK_MANAGEMENT_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
