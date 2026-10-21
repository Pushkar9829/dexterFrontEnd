import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Compass,
  HelpCircle,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface SupportSubTileConfig {
  title: string
  sub: string
  to: string
  Icon: LucideIcon
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const SUPPORT_TILES: SupportSubTileConfig[] = [
  {
    title: 'TICKETS',
    sub: 'Raise and track internal IT support tickets, issue reports, and resolution SLAs.',
    to: '/user/tickets',
    Icon: Ticket,
    theme: 'purple',
    tag: 'Support Desk',
    badge: 'Live Queue',
    actionText: 'View tickets',
  },
  {
    title: 'HELP CENTER',
    sub: 'Access operating manuals, SOP documentation, system FAQs, and quick-start guides.',
    to: '/user/help-center',
    Icon: HelpCircle,
    theme: 'amber',
    tag: 'Knowledge Base',
    badge: 'Guides & FAQs',
    actionText: 'Browse help center',
  },
  {
    title: 'TAKE A TOUR',
    sub: 'Take an interactive guided walkthrough of the workspace features, navigation, and tools.',
    to: '/user/tour',
    Icon: Compass,
    theme: 'rose',
    tag: 'Product Tour',
    badge: 'Interactive',
    actionText: 'Start tour',
  },
]

export default function HelpSupportHub() {
  return (
    <div className="max-w-[1020px] pb-12 font-sans">
      <Link
        to="/user"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline"
      >
        <ArrowLeft size={15} /> Back to User
      </Link>

      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Help & Support</h1>
        <p className="mt-1 text-[13px] text-muted">
          Raise support tickets, browse knowledge base articles, and take a product walkthrough.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORT_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
