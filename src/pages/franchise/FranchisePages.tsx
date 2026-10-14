import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, Building2, CircleCheck, FolderKanban, PanelsTopLeft, Plus, Scale, ShieldCheck, Tablet, Upload, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/KpiCard'
import { Sparkline } from '@/components/ui/Sparkline'
import { TIER_SLUG, TIER_TITLE, TIERS, useFranchises } from '@/data/franchises'
import { FranchiseGrid, useAddFranchise } from './FranchiseGrid'

// ── Hub ────────────────────────────────────────────────────────────────
const HUB = [
  { title: 'MASTER DATA', sub: 'Manage core reference data and configurations.', to: '/franchise/master-data', Icon: Building2, arrow: true },
  { title: 'FRANCHISE REGISTRATION', sub: 'Review and manage franchise registrations.', to: '/franchise/registration', Icon: PanelsTopLeft, arrow: true },
  { title: 'APNA APP', sub: 'Access app setup and operational tools.', to: '/franchise/apna-app', Icon: Tablet, arrow: true },
  { title: 'PROJECTS', sub: 'Track franchise projects and milestones.', to: '/projects/active', Icon: FolderKanban, arrow: false },
  { title: 'LEGAL', sub: 'Manage agreements and legal documentation.', to: '/legal', Icon: Scale, arrow: true },
  { title: 'KYC MANAGEMENT', sub: 'Review identity documents and verification status.', to: '/kyc/verification', Icon: UserPen, arrow: true },
]

export function FranchiseHub() {
  return (
    <div>
      <div className="pt-6">
        <div className="mb-12">
          <h1 className="text-[34px] font-bold tracking-tight text-ink">Franchise Management</h1>
          <p className="mt-1.5 text-[14px] text-muted">Manage franchise operations, records, and compliance in one place.</p>
        </div>
      </div>
      <div className="grid max-w-[1240px] gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {HUB.map(({ title, sub, to, Icon, arrow }) => (
          <Link key={title} to={to} className="group relative h-[236px] overflow-hidden rounded-xl border border-line bg-white p-6 transition-shadow hover:shadow-lg">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon size={34} strokeWidth={1.5} />
            </span>
            <span className="absolute top-8 right-5 grid h-10 w-10 place-items-center rounded-full bg-surface text-ink transition-transform group-hover:translate-x-0.5">
              {arrow && <ArrowRight size={20} />}
            </span>
            <div className="mt-6 text-[24px] leading-tight font-bold tracking-tight text-ink">{title}</div>
            <p className="mt-1 max-w-[220px] text-[13px] leading-snug text-muted">{sub}</p>
            <span className="pointer-events-none absolute -right-10 -bottom-20 h-44 w-44 rounded-full bg-primary/30" />
            <span className="pointer-events-none absolute -right-2 -bottom-28 h-44 w-48 rounded-full bg-primary/5" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Registration: pick a tier ──────────────────────────────────────────
export function FranchiseRegistration() {
  const icons = [Building2, PanelsTopLeft, CircleCheck]
  return (
    <div>
      <h1 className="mb-5 text-[28px] font-semibold tracking-tight">Franchise Registration</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t, i) => {
          const slug = Object.keys(TIER_SLUG).find((k) => TIER_SLUG[k] === t)
          const Icon = icons[i]
          return (
            <Link key={t} to={`/franchise/${slug}`} className="h-[200px] rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-md">
              <div className="flex justify-between text-[12px] text-muted">
                Franchise Management <span className="text-primary"><Icon size={16} /></span>
              </div>
              <div className="mt-2 text-[28px] font-semibold tracking-tight">{TIER_TITLE[t]}</div>
              <div className="mt-2 text-[11px] text-muted">{TIER_TITLE[t]} · Full registry</div>
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
  // "preview" = the records on the list's first page (the grid opens on 10 rows)
  const preview = rows.slice(0, 10)
  const active = preview.filter((f) => f.status === 'Active').length
  const verified = preview.filter((f) => f.kyc === 'Verified').length
  const pending = preview.filter((f) => f.kyc === 'Pending').length
  const review = preview.filter((f) => f.kyc === 'In review').length
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
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tier registry total" value={rows.length.toLocaleString('en-IN')} caption={`${TIER_TITLE[tier]} · Full registry`} icon={<Building2 size={16} />} />
        <StatCard label="Source preview" value={preview.length} caption={`${preview.length} supplied record${preview.length === 1 ? '' : 's'} shown below`} icon={<PanelsTopLeft size={16} />} />
        <StatCard label="Active in preview" value={active} caption={`${preview.length - active} inactive · Supplied records only`} icon={<CircleCheck size={16} />} />
        <StatCard label="Verified KYC in preview" value={verified} caption={`${pending} pending · ${review} in review in preview`} icon={<ShieldCheck size={16} />} />
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
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-sm">
            {mix.map(([t, n], i) => (
              <span key={t} className={['bg-navy-900', 'bg-primary', 'bg-blue-300'][i]} style={{ width: `${Math.max(3, (n / all.length) * 100)}%` }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 text-[11px] text-muted">
            {mix.map(([t, n], i) => (
              <div key={t} className={i === 1 ? 'text-center' : i === 2 ? 'text-right' : ''}>
                <div className="text-[18px] font-semibold text-ink">{n.toLocaleString('en-IN')}</div>
                <span className="inline-flex items-center gap-1">
                  <span className={['h-1.5 w-1.5 bg-navy-900', 'h-1.5 w-1.5 bg-primary', 'h-1.5 w-1.5 bg-blue-300'][i]} />
                  {t}
                </span>
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
