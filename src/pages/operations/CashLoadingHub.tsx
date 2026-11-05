import { Link } from 'react-router-dom'
import { Banknote, FileSpreadsheet, ArrowLeft, Home, ChevronRight } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface CashLoadingTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof FileSpreadsheet
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const CASH_LOADING_TILES: CashLoadingTileConfig[] = [
  {
    title: 'OVERVIEW',
    sub: 'View system-generated daily CBR and counter update reports across Self Funding (SF) ATM sites.',
    to: '/operations/cash-loading/overview',
    Icon: FileSpreadsheet,
    theme: 'blue',
    tag: 'System Generated Report',
    badge: 'SF Sites',
    actionText: 'View Overview Report',
  },
  {
    title: 'CASH LOADING REGISTER',
    sub: 'Access the consolidated cash loading register, verify machine balances, and create new cash loading entries.',
    to: '/operations/cash-loading/register',
    Icon: Banknote,
    theme: 'amber',
    tag: 'Cash Ops & Vault',
    badge: 'Loading Register',
    actionText: 'Open Cash Register',
  },
]

export default function CashLoadingHub() {
  return (
    <div className="max-w-[1020px] space-y-6">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#64748B]">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-[#0066FF] hover:text-[#0052CC] transition-colors"
            title="Home"
          >
            <Home size={14} />
            <span>Workspace</span>
          </Link>
          <ChevronRight size={13} className="shrink-0 text-[#94A3B8]" />
          <Link to="/operations" className="hover:text-[#1E293B] transition-colors">
            Operations
          </Link>
          <ChevronRight size={13} className="shrink-0 text-[#94A3B8]" />
          <span className="font-semibold text-[#0F172A]">Cash Loading Register</span>
        </nav>

        <Link
          to="/operations"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Operations</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-[#DCE8F6] bg-gradient-to-r from-[#F0F7FD] via-white to-[#F0F7FD] p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0066FF] text-white shadow-md shadow-blue-500/20">
            <Banknote size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Cash Loading Module
            </h1>
            <p className="mt-1 text-[13px] text-[#64748B]">
              Choose between the Self Funding (SF) system overview report and the consolidated cash loading register.
            </p>
          </div>
        </div>
      </div>

      {/* Two Hub Tiles: OVERVIEW & CASH LOADING REGISTER */}
      <div className="grid gap-5 sm:grid-cols-3">
        {CASH_LOADING_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}

