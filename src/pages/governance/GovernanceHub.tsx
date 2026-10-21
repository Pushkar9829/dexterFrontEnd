import {
  Bell,
  History,
  Laptop,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface GovernanceTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof History
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const GOVERNANCE_TILES: GovernanceTileConfig[] = [
  {
    title: 'AUDIT',
    sub: 'Track system events, configuration changes, and immutable audit logs.',
    to: '/governance/audit',
    Icon: History,
    theme: 'blue',
    tag: 'Audit Trail',
    badge: 'Immutable',
    actionText: 'View audit logs',
  },
  {
    title: 'SESSIONS',
    sub: 'Monitor active user sessions, sign-in activity, and access tokens.',
    to: '/governance/sessions',
    Icon: Laptop,
    theme: 'purple',
    tag: 'Session Monitor',
    badge: 'Live',
    actionText: 'Monitor sessions',
  },
  {
    title: 'SECURITY',
    sub: 'Manage security policies, access controls, and authentication rules.',
    to: '/governance/security',
    Icon: ShieldAlert,
    theme: 'emerald',
    tag: 'Access Control',
    badge: 'Active',
    actionText: 'Manage security',
  },
  {
    title: 'NOTICES',
    sub: 'Publish, broadcast and acknowledge internal notices and advisories.',
    to: '/notices',
    Icon: Bell,
    theme: 'amber',
    tag: 'Broadcasts',
    badge: 'Alerts',
    actionText: 'View notices',
  },
  {
    title: 'COMPLIANCE',
    sub: 'Review regulatory standards, RBI checklists, and compliance exceptions.',
    to: '/governance/compliance',
    Icon: Scale,
    theme: 'rose',
    tag: 'Regulatory',
    badge: 'Compliant',
    actionText: 'Check compliance',
  },
]

export default function GovernanceHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Governance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage audit logs, user sessions, security controls, notices, and compliance in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GOVERNANCE_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
