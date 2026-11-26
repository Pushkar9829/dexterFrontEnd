import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, FilePen, GitBranch, Layers, Plus } from 'lucide-react'
import { usePlans, planMappingStore } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { latestByCode } from './model'
import { PlanListCard } from './ui'

export default function PlanList() {
  const plans = usePlans()
  const mappings = planMappingStore.use()
  const latest = latestByCode(plans)
  const tiles = [
    { label: 'Plans', value: latest.length, icon: <Layers size={18} />, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Active versions', value: plans.filter((p) => p.status === 'Active').length, icon: <CheckCircle2 size={18} />, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Pending approval', value: plans.filter((p) => p.status === 'Pending Approval').length, icon: <Clock3 size={18} />, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Drafts', value: plans.filter((p) => p.status === 'Draft').length, icon: <FilePen size={18} />, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Site mappings pending', value: mappings.filter((m) => m.status === 'Pending Approval').length, icon: <GitBranch size={18} />, tone: 'bg-slate-100 text-slate-700' },
  ]
  return (
    <PayoutPage
      title="Plan Mapping"
      sub="Payout plans with transaction slabs, incentives and Rental / MG rules, and their site-wise mapping (§10)."
      crumbs={['Plan Mapping']}
      actions={
        <>
          <Link to="/finance/payouts/plans/mapping" className="flex h-10 w-[180px] items-center justify-center gap-2 rounded-lg border border-line bg-white text-[13px] font-semibold text-ink hover:bg-surface">
            <GitBranch size={15} className="text-[#0066FF]" /> Site-wise Mapping
          </Link>
          <Link to="/finance/payouts/plans/new" className="flex h-10 w-[160px] items-center justify-center gap-2 rounded-lg bg-[#0066FF] text-[13px] font-semibold text-white hover:bg-[#0066FF]/90">
            <Plus size={16} strokeWidth={2.6} /> Create Plan
          </Link>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="flex h-[74px] items-center gap-3 rounded-xl border border-line bg-white px-4">
            <span className={`grid h-10 w-10 place-items-center rounded-lg ${t.tone}`}>{t.icon}</span>
            <div>
              <div className="text-[20px] font-bold text-ink tabular-nums">{t.value}</div>
              <div className="text-[11.5px] text-muted">{t.label}</div>
            </div>
          </div>
        ))}
      </div>
      <PlanListCard />
    </PayoutPage>
  )
}
