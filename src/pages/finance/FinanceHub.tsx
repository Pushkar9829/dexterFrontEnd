import { Link } from 'react-router-dom'
import {
  ChevronRight,
  FileText,
  Landmark,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { cn } from '@/lib/cn'

interface FinanceTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof ShieldCheck
  theme: HubTileTheme
  tag: string
  reportsCount: string
}

const FINANCE_TILES: FinanceTileConfig[] = [
  {
    title: 'Security Deposit',
    sub: 'Track and manage security deposit details and transactions.',
    to: '/finance/sd',
    Icon: ShieldCheck,
    theme: 'emerald',
    tag: 'Deposits',
    reportsCount: '6 Reports',
  },
  {
    title: 'Cash Loading Funds (CLF)',
    sub: 'Manage cash loading funds, transactions and reconciliation.',
    to: '/finance/clf',
    Icon: Landmark,
    theme: 'amber',
    tag: 'Cash Loading',
    reportsCount: '5 Reports',
  },
  {
    title: 'GST',
    sub: 'Handle GST related data, invoices and returns.',
    to: '/finance/gst',
    Icon: FileText,
    theme: 'purple',
    tag: 'Tax & Invoices',
    reportsCount: '7 Reports',
  },
  {
    title: 'Payouts',
    sub: 'Process and track payouts for partners and vendors.',
    to: '/finance/payout',
    Icon: Wallet,
    theme: 'rose',
    tag: 'Settlements',
    reportsCount: '8 Reports',
  },
  {
    title: 'HR Payments',
    sub: 'Manage employee payments, allowances and deductions.',
    to: '/finance/hr-payments',
    Icon: Users,
    theme: 'blue',
    tag: 'Payroll',
    reportsCount: '4 Reports',
  },
]

const QUICK_ACCESS_ITEMS = [
  {
    title: 'Security Deposit',
    to: '/finance/sd',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Icon: ShieldCheck,
  },
  {
    title: 'Cash Loading Funds (CLF)',
    to: '/finance/clf',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    Icon: Landmark,
  },
  {
    title: 'GST',
    to: '/finance/gst',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
    Icon: FileText,
  },
  {
    title: 'Payouts',
    to: '/finance/payout',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
    Icon: Wallet,
  },
  {
    title: 'HR Payments',
    to: '/finance/hr-payments',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
    Icon: Users,
  },
]

export default function FinanceHub() {
  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12 font-sans">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Finance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage financial transactions, payouts, taxes and related activities.
        </p>
      </div>

      {/* ── Main Layout: Tiles Grid + Quick Access ──────────────────────── */}
      <div className="flex flex-col items-start gap-5 xl:flex-row">
        {/* Left Area: Tiles Grid */}
        <div className="min-w-0 flex-1 w-full">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCE_TILES.map((tile) => (
              <HubTile
                key={tile.title}
                title={tile.title}
                sub={tile.sub}
                to={tile.to}
                Icon={tile.Icon}
                theme={tile.theme}
                tag={tile.tag}
                reportsCount={tile.reportsCount}
              />
            ))}
          </div>
        </div>

        {/* Right Area: Quick Access Column */}
        <div className="w-full shrink-0 xl:w-[260px] 2xl:w-[276px]">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            {/* Header */}
            <div className="flex items-start gap-2.5">
              <Zap size={22} className="shrink-0 text-[#0066FF] fill-[#0066FF]" />
              <div>
                <h3 className="text-[15.5px] font-bold text-[#1E293B]">Quick Access</h3>
                <p className="mt-0.5 text-[11px] text-[#64748B] leading-tight">
                  Get to your important reports faster
                </p>
              </div>
            </div>

            {/* Quick Access List */}
            <div className="mt-4 space-y-2">
              {QUICK_ACCESS_ITEMS.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-2.5 transition-all duration-150 hover:bg-[#F8FAFC] hover:translate-x-0.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', item.iconBg)}>
                      <item.Icon size={16} />
                    </span>
                    <span className="truncate text-[12.5px] font-semibold text-[#1E293B]">
                      {item.title}
                    </span>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-[#94A3B8]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
