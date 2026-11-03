import { Link } from 'react-router-dom'
import { FileText, FileSpreadsheet, PlusCircle, ArrowLeft, Receipt } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface InvoiceSubTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof FileText
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const INVOICE_TILES: InvoiceSubTileConfig[] = [
  {
    title: 'GST INVOICE DATA',
    sub: 'Browse all registered GST invoices, track payment status, view breakdown, and export reconciliation reports.',
    to: '/finance/gst/invoice/data',
    Icon: FileSpreadsheet,
    theme: 'blue',
    tag: 'Records & Reports',
    badge: 'Invoice Register',
    actionText: 'View Invoice Data',
  },
  {
    title: 'NEW GST INVOICE ENTRY',
    sub: 'Record and generate a new franchise GST invoice with automated tax calculations, deductions, and e-invoice details.',
    to: '/finance/gst/invoice/new',
    Icon: PlusCircle,
    theme: 'emerald',
    tag: 'Create Invoice',
    badge: 'New Billing',
    actionText: 'New Invoice Entry',
  },
]

export default function GstInvoiceHub() {
  return (
    <div className="max-w-[1020px] space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <Link to="/finance" className="hover:text-primary transition-colors">
            Finance
          </Link>
          <span>/</span>
          <Link to="/finance/gst" className="hover:text-primary transition-colors">
            GST Module
          </Link>
          <span>/</span>
          <span className="font-semibold text-ink">GST Invoice</span>
        </div>

        <Link
          to="/finance/gst"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to GST Hub</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">
          GST Invoice Workspace
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Select an action to view invoice data records or generate a new GST invoice entry for franchise White Label ATM operations.
        </p>
      </div>

      {/* Main Two Tiles Grid */}
      <div className="grid gap-5 sm:grid-cols-3">
        {INVOICE_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
              <Receipt size={17} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-ink">Need to map or update Franchise GST details first?</div>
              <div className="text-[11px] text-muted">Verify Franchise GSTIN, registered billing address, and PAN status in GST Mapping.</div>
            </div>
          </div>
          <Link
            to="/finance/gst/mapping"
            className="inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline whitespace-nowrap"
          >
            Open GST Mapping →
          </Link>
        </div>
      </div>
    </div>
  )
}

