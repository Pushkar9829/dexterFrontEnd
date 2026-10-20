import { Building2, FolderOpen, HardHat } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface ProjectTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Building2
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const PROJECT_TILES: ProjectTileConfig[] = [
  {
    title: 'SITE MASTER',
    sub: 'Create, maintain, and manage site records.',
    to: '/projects/active',
    Icon: Building2,
    theme: 'blue',
    tag: 'Site Registry',
    badge: 'Active Sites',
    actionText: 'Manage sites',
  },
  {
    title: 'SITE INSTALLATION',
    sub: 'Track site installation progress and status.',
    to: '/projects/installation',
    Icon: HardHat,
    theme: 'cyan',
    tag: 'Deployment',
    badge: 'Workflows',
    actionText: 'Track installation',
  },
  {
    title: 'OTHER',
    sub: 'Access additional project workspaces as required.',
    to: '/projects/archived',
    Icon: FolderOpen,
    theme: 'indigo',
    tag: 'Document Vault',
    badge: 'Archives',
    actionText: 'Access workspaces',
  },
]

export default function ProjectsHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Projects</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage site master records and site installation workflows in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECT_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
