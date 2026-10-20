import { Link } from 'react-router-dom'
import { ArrowLeft, GitFork, Settings, SlidersHorizontal } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface SetupTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof SlidersHorizontal
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const SETUP_TILES: SetupTileConfig[] = [
  {
    title: 'SLA RULES',
    sub: 'Define service level agreements, turnaround targets and penalty triggers.',
    to: '/setup/sla-rules',
    Icon: SlidersHorizontal,
    theme: 'amber',
    tag: 'Service Targets',
    badge: 'Turnaround',
    actionText: 'Manage SLAs',
  },
  {
    title: 'ESCALATION MATRIX',
    sub: 'Configure multi-level escalation hierarchy, incident paths and contacts.',
    to: '/setup/escalation-matrix',
    Icon: GitFork,
    theme: 'purple',
    tag: 'Incident Flow',
    badge: 'Routing',
    actionText: 'Configure matrix',
  },
  {
    title: 'BUSINESS SETTINGS',
    sub: 'Manage corporate parameters, organization units and operational controls.',
    to: '/setup/business-settings',
    Icon: Settings,
    theme: 'teal',
    tag: 'Organization',
    badge: 'System Params',
    actionText: 'Open settings',
  },
]

export default function SetupHub() {
  return (
    <div className="max-w-[1020px]">
      <Link to="/onboarding" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Onboarding
      </Link>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Setup</h1>
        <p className="mt-1 text-[13px] text-muted">Configure SLA rules, escalation hierarchies and business organization units.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETUP_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

export function EscalationMatrixHub() {
  const tiles: SetupTileConfig[] = [
    {
      title: 'HIERARCHY',
      sub: 'Configure multi-level escalation hierarchy, incident routing and operational contacts.',
      to: '/setup/escalation-matrix/hierarchy',
      Icon: GitFork,
      theme: 'indigo',
      tag: 'Escalation Tiers',
      badge: 'Contacts',
      actionText: 'Edit hierarchy',
    },
  ]

  return (
    <div className="max-w-[1020px]">
      <Link to="/setup" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Setup
      </Link>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Escalation Matrix</h1>
        <p className="mt-1 text-[13px] text-muted">Manage incident resolution tiers, reporting lines and organizational hierarchy.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 max-w-[720px]">
        {tiles.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

export function BusinessSettingsHub() {
  const tiles: SetupTileConfig[] = [
    {
      title: 'ORGANIZATION UNIT',
      sub: 'Manage corporate departments, branch divisions and regional hierarchy.',
      to: '/setup/business-settings/org-unit',
      Icon: Settings,
      theme: 'blue',
      tag: 'Corporate Tree',
      badge: 'Divisions',
      actionText: 'Manage units',
    },
  ]

  return (
    <div className="max-w-[1020px]">
      <Link to="/setup" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Setup
      </Link>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Business Settings</h1>
        <p className="mt-1 text-[13px] text-muted">Manage corporate parameters, organization units and operational controls.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 max-w-[720px]">
        {tiles.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}


