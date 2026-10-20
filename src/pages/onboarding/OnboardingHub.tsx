import { Building2, ShieldCheck, SlidersHorizontal, UserCheck, Users } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface OnboardingTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Users
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const ONBOARDING_TILES: OnboardingTileConfig[] = [
  {
    title: 'USERS / EMPLOYEE MANAGEMENT',
    sub: 'Manage internal operators, roles, credentials and staff assignments.',
    to: '/onboarding/users',
    Icon: Users,
    theme: 'blue',
    tag: 'Staff & Roles',
    badge: 'Access',
    actionText: 'Manage operators',
  },
  {
    title: 'FRANCHISE MANAGEMENT',
    sub: 'Configure franchise tiers, master data registry and Apna App tools.',
    to: '/franchise',
    Icon: Building2,
    theme: 'purple',
    tag: 'Tiers & Partners',
    badge: '5 Tiers',
    actionText: 'Configure tiers',
  },
  {
    title: 'KYC MANAGEMENT',
    sub: 'Review identity documents, upload queues and approval compliance.',
    to: '/kyc',
    Icon: ShieldCheck,
    theme: 'emerald',
    tag: 'Compliance',
    badge: 'Verification',
    actionText: 'Verify documents',
  },
  {
    title: 'SETUP',
    sub: 'Define SLA rules, escalation hierarchies and business organization units.',
    to: '/setup',
    Icon: SlidersHorizontal,
    theme: 'amber',
    tag: 'Configuration',
    badge: 'SLA Matrix',
    actionText: 'System rules',
  },
  {
    title: 'APPROVALS',
    sub: 'Review pending authorizations, workflow sign-offs and audit items.',
    to: '/onboarding/approvals',
    Icon: UserCheck,
    theme: 'rose',
    tag: 'Authorization',
    badge: 'Audit Flow',
    actionText: 'Review requests',
  },
]

export default function OnboardingHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Onboarding</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage users, franchise networks, KYC verification, setup and approvals in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ONBOARDING_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

