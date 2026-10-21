import {
  FileText,
  Inbox,
  PenSquare,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface EmailTileConfig {
  title: string
  sub: string
  to: string
  Icon: LucideIcon
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const EMAIL_TILES: EmailTileConfig[] = [
  {
    title: 'MY INBOX',
    sub: 'View incoming communications, partner enquiries, priority tickets, and unread mail.',
    to: '/email/inbox',
    Icon: Inbox,
    theme: 'blue',
    tag: 'Primary Mail',
    badge: 'Active',
    actionText: 'Open inbox',
  },
  {
    title: 'SENT',
    sub: 'Review transmitted communications, dispatches to franchisees, and outbound history.',
    to: '/email/sent',
    Icon: Send,
    theme: 'purple',
    tag: 'Outbound',
    badge: 'Delivered',
    actionText: 'View sent mail',
  },
  {
    title: 'DRAFTS',
    sub: 'Resume unsent messages, saved correspondence templates, and pending reviews.',
    to: '/email/drafts',
    Icon: FileText,
    theme: 'amber',
    tag: 'Unsent',
    badge: 'Saved',
    actionText: 'Open drafts',
  },
  {
    title: 'COMPOSE EMAIL',
    sub: 'Draft and send new official circulars, messages, and enquiries to network partners.',
    to: '/email/inbox/compose',
    Icon: PenSquare,
    theme: 'emerald',
    tag: 'New Message',
    badge: 'Composer',
    actionText: 'Draft email',
  },
]

export default function EmailHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Email</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage corporate email communications, outbound dispatches, and message drafts in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EMAIL_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
