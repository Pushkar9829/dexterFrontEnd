import { ClipboardCheck, FileCheck2, FileText, FolderOpen, Scale, ShieldCheck } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface LegalTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof FileText
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const LEGAL_TILES: LegalTileConfig[] = [
  {
    title: 'LOI',
    sub: 'Manage Letter of Intent records and workflows.',
    to: '/legal/loi',
    Icon: FileText,
    theme: 'blue',
    tag: 'Letter of Intent',
    badge: 'Active Queue',
    actionText: 'Manage LOI',
  },
  {
    title: 'AFFIDAVIT',
    sub: 'Manage affidavits and supporting documents.',
    to: '/legal/affidavit',
    Icon: FileCheck2,
    theme: 'purple',
    tag: 'Sworn Affidavits',
    badge: 'Verified',
    actionText: 'Manage affidavits',
  },
  {
    title: 'AGREEMENT',
    sub: 'Create and manage legal agreements.',
    to: '/legal/agreement',
    Icon: Scale,
    theme: 'emerald',
    tag: 'Contracts',
    badge: 'Sign-offs',
    actionText: 'Manage agreements',
  },
  {
    title: 'FM CHECKS',
    sub: 'Review and track FM checks and verification.',
    to: '/legal/fm-checks',
    Icon: ClipboardCheck,
    theme: 'amber',
    tag: 'Site Verification',
    badge: 'Audits',
    actionText: 'Track FM checks',
  },
  {
    title: 'PVC',
    sub: 'Manage PVC documentation and status.',
    to: '/legal/pvc',
    Icon: ShieldCheck,
    theme: 'rose',
    tag: 'Police Verification',
    badge: 'Clearance',
    actionText: 'View PVC status',
  },
  {
    title: 'OTHER LEGAL DOCUMENTS',
    sub: 'Access additional legal workspaces as required.',
    to: '/legal/other-documents',
    Icon: FolderOpen,
    theme: 'cyan',
    tag: 'Document Vault',
    badge: 'Archives',
    actionText: 'Access documents',
  },
]

export default function LegalHub() {
  return (
    <div className="max-w-[1020px]">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Legal Module</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage legal documentation, checks, and records in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEGAL_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
