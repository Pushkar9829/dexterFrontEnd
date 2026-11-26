import { BellRing, Scale, ShieldAlert } from 'lucide-react'
import { routeBlock, useRole } from '@/lib/rbac'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { securityAdminTiles } from './security/routes'
import { privacyTiles } from './privacy/routes'

interface GovernanceTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof BellRing
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const THEMES: HubTileTheme[] = ['indigo', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'teal', 'blue']
const EXTRA_TILES: GovernanceTileConfig[] = [
  ...securityAdminTiles.map((t, i) => ({ ...t, title: t.title.toUpperCase(), Icon: ShieldAlert, theme: THEMES[i % THEMES.length], tag: 'Security', badge: 'Security Framework', actionText: 'Open' })),
  ...privacyTiles.map((t, i) => ({ ...t, title: t.title.toUpperCase(), Icon: Scale, theme: THEMES[(i + 3) % THEMES.length], tag: 'DPDP Act 2023', badge: 'Privacy', actionText: 'Open' })),
]

// One tile per real page. The legacy demo Audit / Sessions / Security / Compliance views were
// superseded by Security Audit, Live Sessions, Security Administration and DPDP Compliance.
const GOVERNANCE_TILES: GovernanceTileConfig[] = [
  {
    title: 'PUSH NOTIFICATIONS',
    sub: 'Create, schedule, broadcast, and monitor push notifications across branches and departments.',
    to: '/governance/push-notifications',
    Icon: BellRing,
    theme: 'amber',
    tag: 'Broadcasts',
    badge: 'Live',
    actionText: 'Manage push notifications',
  },
]

export default function GovernanceHub() {
  const role = useRole()
  const tiles = [...GOVERNANCE_TILES, ...EXTRA_TILES].filter((t) => !routeBlock(t.to, role))
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Governance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage audit logs, user sessions, security controls, push notifications, and compliance in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
