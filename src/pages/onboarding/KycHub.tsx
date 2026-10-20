import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Upload } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface KycTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Upload
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const KYC_TILES: KycTileConfig[] = [
  {
    title: 'UPLOAD',
    sub: 'Upload franchise identity proof, bank verification and GST documents.',
    to: '/kyc/upload',
    Icon: Upload,
    theme: 'blue',
    tag: 'Document Ingestion',
    badge: 'Fast Intake',
    actionText: 'Upload files',
  },
  {
    title: 'VERIFICATION',
    sub: 'Review and verify queued documents, compliance checks and audit status.',
    to: '/kyc/verification',
    Icon: ShieldCheck,
    theme: 'emerald',
    tag: 'Compliance Audit',
    badge: 'Live Queue',
    actionText: 'Audit & verify',
  },
]

export default function KycHub() {
  return (
    <div className="max-w-[1020px]">
      <Link to="/onboarding" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Onboarding
      </Link>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">KYC Management</h1>
        <p className="mt-1 text-[13px] text-muted">Upload documents and verify identity compliance across franchise partners.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 max-w-[720px]">
        {KYC_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

