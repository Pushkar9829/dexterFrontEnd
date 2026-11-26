import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useFranchises } from '@/data/franchises'
import { completionOf, getSiteById, loadSite, projectStatusOf, useNetwork, useSites } from '@/data/network'
import { apiEnabled } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { masterAccess, useRole } from '@/lib/rbac'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Bar, Crumbs, KV, StatusBadge, Val } from './ui'
import { TABS, canEditTab, hierarchyOf, visibleTabs, type TabKey } from './siteData'
import { BasicTab, CustomTab, InvestmentTab, ProgressTab, TisTab } from './TabsProject'
import { AccountTab, HistoryTab, LegalTab, PayoutTab, PeopleTab } from './TabsOps'

export default function SiteProfile() {
  const { siteId = '' } = useParams()
  // API mode: full site record incl. account / engineer / manager history (GET /sites/:siteId).
  useEffect(() => {
    if (apiEnabled && siteId) loadSite(siteId).catch((e: Error) => toast(e.message || 'Could not load the site.', 'error'))
  }, [siteId])
  const navigate = useNavigate()
  const role = useRole()
  const access = masterAccess(role)
  const state = useSites()
  const network = useNetwork()
  const franchises = useFranchises()
  const site = getSiteById(state, siteId)
  const fr = useMemo(() => (site ? franchises.find((f) => f.id === site.frId) : undefined), [site, franchises])
  const h = useMemo(() => (site ? hierarchyOf(network, site.frId) : null), [site, network])
  const node = site ? network.nodes[site.frId] : undefined

  const tabs = TABS.filter((t) => visibleTabs(access).includes(t.key))
  const [picked, setPicked] = useState<TabKey | null>(null)
  const tab: TabKey | undefined = picked && tabs.some((t) => t.key === picked) ? picked : tabs[0]?.key

  const crumbs = [{ label: 'Master Data', to: '/master-data' }, { label: 'Site Master', to: '/master-data/sites' }, { label: site?.siteId ?? 'Site' }]

  if (!site || !h)
    return (
      <div className="space-y-4">
        <Crumbs items={crumbs} />
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-600">
          No site found with Site ID <b>{siteId}</b>.{' '}
          <Link to="/master-data/sites" className="font-medium text-[#0066FF] hover:underline">
            Back to Site Master
          </Link>
        </div>
      </div>
    )

  const c = completionOf(site)
  const edit = tab ? canEditTab(access, tab) : false

  return (
    <div className="max-w-[1400px] space-y-4 pb-12">
      <Crumbs items={crumbs} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-slate-900">Site Profile</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {site.siteId} · ATM {site.atmId}
          </p>
        </div>
        <Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate('/master-data/sites')}>
          Back
        </Button>
      </div>

      {/* §22: basic franchise information in a fixed box at the top */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-6">
          <KV k="Franchise Name"><Val v={fr?.name} /></KV>
          <KV k="FR ID">{site.frId}</KV>
          <KV k="Parent Group"><Val v={h.parentLabel} /></KV>
          <KV k="Parent SMF"><Val v={h.smf} /></KV>
          <KV k="Parent MF"><Val v={h.mf} /></KV>
          <KV k="Team Leader"><Val v={h.tl} /></KV>
          <KV k="Site ID">{site.siteId}</KV>
          <KV k="ATM ID">{site.atmId}</KV>
          <KV k="Project ID"><Val v={site.projectId} /></KV>
          <KV k="FR Code"><Val v={node?.code} /></KV>
          <KV k="Overall Completion">
            <Bar pct={c.pct} />
          </KV>
          <KV k="Project Status"><StatusBadge s={projectStatusOf(site)} /></KV>
        </div>
      </section>

      {/* §22: equal-size tabs — fixed width, not stretched when there are fewer tabs */}
      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setPicked(t.key)}
            className={cn(
              'h-9 w-[136px] shrink-0 truncate rounded-lg border px-2 text-[12px] font-semibold transition-colors',
              tab === t.key ? 'border-[#0066FF] bg-[#0066FF] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-[#0066FF]/50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'basic' && <BasicTab site={site} edit={edit} />}
        {tab === 'progress' && <ProgressTab site={site} edit={edit} />}
        {tab === 'investment' && <InvestmentTab site={site} edit={edit} />}
        {tab === 'account' && <AccountTab site={site} edit={edit} />}
        {tab === 'payout' && <PayoutTab site={site} edit={edit} />}
        {tab === 'legal' && <LegalTab site={site} edit={edit} />}
        {tab === 'tis' && <TisTab site={site} edit={edit} />}
        {tab === 'engineer' && <PeopleTab key="engineer" kind="engineer" site={site} edit={edit} />}
        {tab === 'manager' && <PeopleTab key="manager" kind="manager" site={site} edit={edit} />}
        {tab === 'custom' && <CustomTab site={site} edit={edit} />}
        {tab === 'history' && <HistoryTab site={site} />}
        {!tab && <p className="text-[13px] text-slate-500">Your role has no access to this site profile.</p>}
      </div>
    </div>
  )
}
