import { Link } from 'react-router-dom'
import { Home, ChevronRight, Users, Receipt } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'

interface HrTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof Users
  theme: HubTileTheme
  tag: string
  badge: string
  actionText: string
}

const HR_TILES: HrTileConfig[] = [
  {
    title: 'STAFF SALARY',
    sub: 'Track and manage staff salary disbursements, allowances, deductions and monthly payroll.',
    to: '/finance/hr-payments/salary',
    Icon: Users,
    theme: 'blue',
    tag: 'Payroll & Wages',
    badge: 'Monthly Queue',
    actionText: 'Manage Staff Salary',
  },
  {
    title: 'EXPENSES',
    sub: 'Review, approve, and process employee expense claims, vouchers and reimbursements.',
    to: '/finance/hr-payments/expenses',
    Icon: Receipt,
    theme: 'emerald',
    tag: 'Reimbursements',
    badge: 'Claim Audits',
    actionText: 'Manage Expenses',
  },
]

export default function HrPaymentsHub() {
  return (
    <div className="space-y-4 max-w-[1080px] pb-12">
      {/* Breadcrumb: Workspace > Finance > HR Payments */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">HR Payments</span>
      </div>

      {/* Page Header */}
      <div className="mb-5 sm:mb-6 pt-1">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          HR Payments
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Manage staff monthly salaries, allowances, deductions, and employee reimbursement claims.
        </p>
      </div>

      {/* Tiles Grid matching Legal Module style */}
      <div className="grid gap-5 sm:grid-cols-3">
        {HR_TILES.map((tile) => (
          <HubTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  )
}
