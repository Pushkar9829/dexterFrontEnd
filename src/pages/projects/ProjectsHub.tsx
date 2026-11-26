// Projects landing (Project spec §2, §13): Site Master | Site Installation | Others.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, FolderOpen, HardHat } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { useSiteMasterData, lifecycleCounts } from './metrics'

type Tile = { title: string; sub: string; to: string; Icon: typeof Building2; theme: HubTileTheme; tag: string; badge: string; actionText: string }

export default function ProjectsHub() {
  const { rows, installs } = useSiteMasterData()
  const c = useMemo(() => lifecycleCounts(rows), [rows])
  const running = installs.filter((r) => r.status !== 'Approved').length
  const awaiting = installs.filter((r) => r.status === 'Pending Admin Approval').length

  const tiles: Tile[] = [
    { title: 'PROJECT SITE REGISTER', sub: 'Project view of the common Site Master — Dexter AI overview, lifecycle and consolidated pending modules.', to: '/projects/active', Icon: Building2, theme: 'blue', tag: 'Site Registry', badge: `${rows.length.toLocaleString('en-IN')} sites`, actionText: 'Open register' },
    { title: 'SITE INSTALLATION', sub: 'Six-stage readiness, equipment, activation, documentation and Admin approval workflow.', to: '/projects/installation', Icon: HardHat, theme: 'cyan', tag: 'Deployment', badge: `${running} running`, actionText: 'Track installation' },
    { title: 'OTHERS', sub: 'Closed and archived site projects retained for reference and history.', to: '/projects/other', Icon: FolderOpen, theme: 'indigo', tag: 'Other', badge: `${c.Closed + c.Archived} records`, actionText: 'View records' },
  ]

  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Projects</h1>
        <p className="mt-1 text-[13px] text-muted">The Project Site Register is the project view of Master Data › Site Master; Site Installation is its execution module, shared with the franchise mobile app.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <HubTile key={t.title} {...t} />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ['Active projects', c.Active, '/projects/active?status=Active'],
          ['Incomplete projects', c.Incomplete, '/projects/incomplete'],
          ['Pipeline', c.Pipeline, '/projects/active?status=Pipeline'],
          ['Awaiting Admin approval', awaiting, '/projects/installation?status=Pending Admin Approval'],
        ].map(([label, n, to]) => (
          <Link key={String(label)} to={String(to)} className="rounded-xl border border-line bg-white p-3.5 hover:border-primary/50">
            <div className="text-[11px] font-semibold text-muted">{label}</div>
            <div className="mt-1 text-[22px] font-semibold text-ink">{Number(n).toLocaleString('en-IN')}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
