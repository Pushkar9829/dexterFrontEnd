import {
  LifeBuoy,
  User,
  type LucideIcon,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface UserCategoryTileConfig {
  title: string
  sub: string
  to: string
  Icon: LucideIcon
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const USER_PRIMARY_TILES: UserCategoryTileConfig[] = [
  {
    title: 'MY ACCOUNT',
    sub: 'Manage your personal profile, employee credentials, and authentication password.',
    to: '/user/my-account',
    Icon: User,
    theme: 'blue',
    tag: 'Account Settings',
    badge: '2 Sub-tiles',
    actionText: 'Open My Account',
  },
  {
    title: 'HELP & SUPPORT',
    sub: 'Raise support tickets, browse knowledge base articles, and take a product walkthrough.',
    to: '/user/help-support',
    Icon: LifeBuoy,
    theme: 'purple',
    tag: 'Support Desk',
    badge: '3 Sub-tiles',
    actionText: 'Open Help & Support',
  },
]

export default function UserHub() {
  return (
    <div className="max-w-[1020px] pb-12 font-sans">
      {/* Page Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">User</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage your personal account credentials, access controls, and help resources.
        </p>
      </div>

      {/* Two Main Tiles: My Account & Help & Support */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {USER_PRIMARY_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
