import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, Building2, CircleCheck, FolderOpen, IdCard, LayoutGrid, Plus, Scale, ShieldCheck, Smartphone, Table2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/KpiCard'
import { Sparkline } from '@/components/ui/Sparkline'
import { TIER_SLUG, TIER_TITLE, TIERS, useFranchises } from '@/data/franchises'
import { FranchiseGrid, useAddFranchise } from './FranchiseGrid'

// ── Hub ────────────────────────────────────────────────────────────────
const HUB = [
  { title: 'MASTER DATA', sub: 'Manage core reference data and configurations.', to: '/franchise/master-data', Icon: Building2 },
  { title: 'FRANCHISE REGISTRATION', sub: 'Review and manage franchise registrations.', to: '/franchise/registration', Icon: LayoutGrid },
  { title: 'APNA APP', sub: 'Access app setup and operational tools.', to: '/franchise/apna-app', Icon: Smartphone },
  { title: 'PROJECTS', sub: 'Track franchise projects and milestones.', to: '/projects/active', Icon: FolderOpen },
  { title: 'LEGAL', sub: 'Manage agreements and legal documentation.', to: '/legal', Icon: Scale },
  { title: 'KYC MANAGEMENT', sub: 'Review identity documents and verification status.', to: '/kyc/verification', Icon: IdCard },
]

export function FranchiseHub() {
  return (
    <div>
      <div className="pt-4">
        <PageHeader title="Franchise Management" sub="Manage franchise operations, records, and compliance in one place." />
      </div>
      <div className="grid max-w-[1240px] gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {HUB.map(({ title, sub, to, Icon }) => (
          <Link key={title} to={to} className="group relative h-[196px] overflow-hidden rounded-xl border border-line bg-white p-6 transition-shadow hover:shadow-lg">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon size={26} strokeWidth={1.6} />
            </span>
            <span className="absolute top-8 right-5 grid h-9 w-9 place-items-center rounded-full bg-surface text-ink transition-transform group-hover:translate-x-0.5">
              <ArrowRight size={18} />
            </span>
            <div className="mt-5 text-[19px] font-bold tracking-tight">{title}</div>
            <p className="mt-1 max-w-[220px] text-[12px] text-muted">{sub}</p>
            <span className="pointer-events-none absolute -right-8 -bottom-16 h-36 w-36 rounded-full bg-primary/25" />
            <span className="pointer-events-none absolute -right-24 -bottom-24 h-36 w-36 rounded-full bg-primary/5" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Registration: pick a tier ──────────────────────────────────────────
export function FranchiseRegistration() {
  const all = useFranchises()
  const icons = [<Building2 size={16} />, <Table2 size={16} />, <CircleCheck size={16} />]
  return (
    <div>
      <h1 className="mb-5 text-[24px] font-semibold">Franchise Registration</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t, i) => {
          const slug = Object.keys(TIER_SLUG).find((k) => TIER_SLUG[k] === t)
          const n = all.filter((f) => f.tier === t).length
          return (
            <Link key={t} to={`/franchise/${slug}`} className="group h-[152px] rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-md">
              <div className="flex justify-between text-[12px] text-muted">
                Franchise Management <span className="text-primary">{icons[i]}</span>
              </div>
              <div className="mt-2 text-[24px] font-semibold">{TIER_TITLE[t]}</div>
              <div className="mt-1 text-[11px] text-muted">{TIER_TITLE[t]} · Full registry</div>
              <div className="mt-6 flex items-center gap-1 text-[12px] font-semibold text-primary">
                {n.toLocaleString('en-IN')} records <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Tier list (Super Master / Master / Franchise) ──────────────────────
export function TierList() {
  const { tier: slug = '' } = useParams()
  const tier = TIER_SLUG[slug]
  const all = useFranchises()
  const add = useAddFranchise(tier)
  if (!tier) return <Navigate to="/franchise/registration" replace />

  const rows = all.filter((f) => f.tier === tier)
  const active = rows.filter((f) => f.status === 'Active').length
  const verified = rows.filter((f) => f.kyc === 'Verified').length
  const pending = rows.filter((f) => f.kyc === 'Pending').length
  const review = rows.filter((f) => f.kyc === 'In review').length
  const lower = tier === 'Franchise' ? '' : `${tier.toLowerCase()} `

  return (
    <div>
      <PageHeader
        title={TIER_TITLE[tier]}
        sub={`View ${lower}franchise records from your governed franchise master data.`}
        actions={
          <>
            <Button variant="secondary" icon={<Upload size={16} />} onClick={add.openImport}>
              Import .xlsx
            </Button>
            <Button icon={<Plus size={16} />} onClick={add.openAdd}>
              Add franchise
            </Button>
          </>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard label="Tier registry total" value={rows.length.toLocaleString('en-IN')} caption={`${tier} · Full registry`} icon={<Building2 size={16} />} />
        <StatCard label="Active" value={active.toLocaleString('en-IN')} caption={`${rows.length - active} inactive`} icon={<CircleCheck size={16} />} />
        <StatCard label="Verified KYC" value={verified.toLocaleString('en-IN')} caption={`${pending} pending · ${review} in review`} icon={<ShieldCheck size={16} />} />
        <StatCard label="ATMs in tier" value={rows.reduce((s, f) => s + f.atms, 0).toLocaleString('en-IN')} caption="Across active and inactive" icon={<Table2 size={16} />} />
      </div>
      <FranchiseGrid key={tier} rows={rows} mode="tier" scope={`Tier: ${tier}`} />
      {add.ui}
    </div>
  )
}

// ── Master data (all tiers) ────────────────────────────────────────────
export function MasterData() {
  const all = useFranchises()
  const add = useAddFranchise()
  const active = all.filter((f) => f.status === 'Active').length
  const pending = all.filter((f) => f.kyc === 'Pending').length
  const review = all.filter((f) => f.kyc === 'In review').length
  const states = new Set(all.map((f) => f.state)).size
  const mix = TIERS.map((t) => [t, all.filter((f) => f.tier === t).length] as const)

  return (
    <div>
      <PageHeader
        title="Franchise master data"
        sub="Maintain your franchise network with one governed, editable source of truth."
        actions={
          <>
            <Button variant="secondary" icon={<Upload size={16} />} onClick={add.openImport}>
              Import .xlsx
            </Button>
            <Button icon={<Plus size={16} />} onClick={add.openAdd}>
              Add franchise
            </Button>
          </>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex justify-between text-[13px] text-muted">Total Franchises <Building2 size={16} className="text-primary" /></div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-[28px] font-semibold leading-none">{all.length.toLocaleString('en-IN')}</span>
            <Sparkline points={[3, 4, 3.5, 5, 4.6, 6, 6.4, 8]} />
          </div>
          <div className="mt-3 text-[12px] text-muted">↑ 36 added this month</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex justify-between text-[13px] text-muted">Active franchises <CircleCheck size={16} className="text-primary" /></div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-[28px] font-semibold leading-none">{active.toLocaleString('en-IN')}</span>
            <Sparkline points={[2, 3, 2.7, 4, 3.6, 5, 5.4, 7]} color="#047857" />
          </div>
          <div className="mt-3 text-[12px] text-muted">{((active / all.length) * 100).toFixed(1)}% of the total network</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex justify-between text-[13px] text-muted">Pending KYCs <ShieldCheck size={16} className="text-primary" /></div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-[28px] font-semibold leading-none">{pending + review}</span>
            <Sparkline points={[7, 6.5, 7, 5.5, 6, 4.5, 4.8, 3.6]} color="#a16207" />
          </div>
          <div className="mt-3 text-[12px] text-amber-700">
            {pending} awaiting documents · {review} in review
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex justify-between text-[13px] text-muted">
            Franchise tier mix <span className="text-[12px] text-primary">{states} states</span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full">
            {mix.map(([t, n], i) => (
              <span key={t} className={['bg-navy-900', 'bg-primary', 'bg-blue-300'][i]} style={{ width: `${Math.max(3, (n / all.length) * 100)}%` }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 text-[11px] text-muted">
            {mix.map(([t, n]) => (
              <div key={t}>
                <div className="text-[18px] font-semibold text-ink">{n.toLocaleString('en-IN')}</div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
      <FranchiseGrid rows={all} mode="master" />
      {add.ui}
    </div>
  )
}
