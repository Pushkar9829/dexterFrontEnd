import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  User,
  type LucideIcon,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface AccountSubTileConfig {
  title: string
  sub: string
  to: string
  Icon: LucideIcon
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const ACCOUNT_TILES: AccountSubTileConfig[] = [
  {
    title: 'PROFILE',
    sub: 'View and update your personal information, employee credentials, and contact details.',
    to: '/user/profile',
    Icon: User,
    theme: 'blue',
    tag: 'Personal Info',
    badge: 'Active',
    actionText: 'View profile',
  },
  {
    title: 'CHANGE PASSWORD',
    sub: 'Update login credentials, manage session security, and configure two-factor authentication.',
    to: '/user/change-password',
    Icon: KeyRound,
    theme: 'emerald',
    tag: 'Security',
    badge: 'Credentials',
    actionText: 'Change password',
  },
]

export default function MyAccountHub() {
  return (
    <div className="max-w-[1020px] pb-12 font-sans">
      <Link
        to="/user"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline"
      >
        <ArrowLeft size={15} /> Back to User
      </Link>

      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">My Account</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage your personal profile, employee credentials, and security password.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACCOUNT_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
