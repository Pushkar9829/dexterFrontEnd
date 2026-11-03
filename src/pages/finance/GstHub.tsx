import { Link } from 'react-router-dom'
import { FileText, Landmark, ArrowLeft, ShieldCheck } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface GstTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof FileText
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const GST_TILES: GstTileConfig[] = [
  {
    title: 'GST MAPPING',
    sub: 'Map and manage franchise GST details, legal entity names, GSTIN, PAN, and state tax jurisdictions.',
    to: '/finance/gst/mapping',
    Icon: Landmark,
    theme: 'purple',
    tag: 'Franchise Tax Master',
    badge: 'Franchise Mapping',
    actionText: 'Manage GST Mapping',
  },
  {
    title: 'GST INVOICE',
    sub: 'View all monthly GST invoice records, monitor payment reconciliation, and create new GST invoice entries.',
    to: '/finance/gst/invoice',
    Icon: FileText,
    theme: 'blue',
    tag: 'Invoices & Returns',
    badge: 'Monthly Invoicing',
    actionText: 'Access GST Invoices',
  },
]

export default function GstHub() {
  return (
    <div className="max-w-[1020px] space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <Link to="/finance" className="hover:text-primary transition-colors">
            Finance
          </Link>
          <span>/</span>
          <span className="font-semibold text-ink">GST Module</span>
        </div>

        <Link
          to="/finance"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Finance</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">
          GST Module
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Unified GST compliance hub for franchise tax mappings, monthly invoice records, reconciliation, and statutory return filing.
        </p>
      </div>

      {/* Main Two Tiles Grid */}
      <div className="grid gap-5 sm:grid-cols-3">
        {GST_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>

      {/* Quick Overview Highlights */}
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-blue-50/30 to-purple-50/30 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                White Label ATM GST Compliance Standards
              </h3>
              <p className="text-[12px] text-muted">
                All franchise transactions adhere to SAC Code 9985 (ATM Support Services) under 18% GST (CGST 9% + SGST 9% or IGST 18%).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px]">
            <Link
              to="/finance/gst/mapping"
              className="font-semibold text-primary hover:underline"
            >
              Verify Franchise GSTINs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

