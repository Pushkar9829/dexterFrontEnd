// Site Master — Projects core master dashboard (Project spec §4.3, §4.4, §4.5, §9, §13).
// One page for /projects/active (all), /projects/{complete,incomplete,closed,archived,ai-overview} and the
// "Others" section (/projects/other, /projects/other/closed). Filters live in the URL so every chart and
// AI card drills down to the filtered site list.
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Activity, Building2, Download, Eye, History, ListChecks, Pencil, Plus, RotateCcw, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { can, routeBlock, usePerms, useRole } from '@/lib/rbac'
import { useReportMode } from '@/hooks/useReportMode'
import type { WfTask } from '@/data/workflow'
import { LIFECYCLES, LIFECYCLE_MEANING, PENDING_CATEGORIES, exportSiteMaster, type Lifecycle, type SiteMasterRow } from '@/data/projects'
import { Crumbs } from '@/pages/masterdata/sites/ui'
import { AiProjectOverview } from './AiProjectOverview'
import { Bars, ChartCard, Donut, FilterSelect, FilterText, LifecycleBadge, PendingChips, ProgressBar, StatTile, Trend } from './bands'
import { fmtD, lifecycleSlices, pctTxt, todayIso, type AgingBucket } from './format'
import { computeKpis, employeePerf, franchisePerf, lifecycleCounts, monthlyCompletion, pendingCounts, siteIdsWithAging, taskAging, useSiteMasterData } from './metrics'

const PATH_STATUS: [string, Lifecycle][] = [
  ['/projects/complete', 'Completed'],
  ['/projects/incomplete', 'Incomplete'],
  ['/projects/closed', 'Closed'],
  ['/projects/archived', 'Archived'],
  ['/projects/other/closed', 'Closed'],
]
const statusForPath = (path: string): string => PATH_STATUS.find(([p]) => path.startsWith(p))?.[1] ?? ''
const FILTER_KEYS = ['q', 'fr', 'mf', 'smf', 'state', 'loc', 'model', 'exec', 'status', 'pending', 'from', 'to', 'month', 'aging'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

export default function ProjectRegister() {
  const location = useLocation()
  const [sp, setSp] = useSearchParams()
  const { isReport } = useReportMode()
  const role = useRole()
  usePerms()
  const { rows, installs, tasks } = useSiteMasterData()
  const tableRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)

  const isOther = location.pathname.startsWith('/projects/other')
  const pathStatus = statusForPath(location.pathname)
  const f = (k: FilterKey) => sp.get(k) ?? (k === 'status' ? pathStatus : '')
  const setF = (k: FilterKey, v: string) => {
    setPage(1)
    setSp(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (v) n.set(k, v)
        else n.delete(k)
        if (k === 'status' && !v && pathStatus) n.set('status', '')
        return n
      },
      { replace: true },
    )
  }
  const drill = (params: Record<string, string>) => {
    setPage(1)
    const n = new URLSearchParams()
    const src = sp.get('source')
    if (src) n.set('source', src)
    Object.entries(params).forEach(([k, v]) => n.set(k, v))
    if (!params.status && pathStatus) n.set('status', '')
    setSp(n)
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const clearAll = () => drill({})

  const scope = useMemo(() => (isOther ? rows.filter((r) => r.lifecycle === 'Closed' || r.lifecycle === 'Archived') : rows), [rows, isOther])

  // all filters except status (summary cards / KPIs show the split by status)
  const spKey = sp.toString()
  const filt = parseFilters(spKey, pathStatus)
  const { fr, mf, smf, state: st, model, exec, pending, from, to, status } = filt
  const base = useMemo(() => applyFilters(scope, parseFilters(spKey, pathStatus), tasks), [scope, spKey, pathStatus, tasks])
  const filtered = useMemo(() => (status ? base.filter((r) => r.lifecycle === status) : base), [base, status])

  const counts = useMemo(() => lifecycleCounts(base), [base])
  const kpi = useMemo(() => computeKpis(base, installs, tasks), [base, installs, tasks])
  const opts = useMemo(() => {
    const u = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort()
    return { fr: u(scope.map((r) => r.frName)), mf: u(scope.map((r) => r.hier.mf)), smf: u(scope.map((r) => r.hier.smf)), state: u(scope.map((r) => r.site.state)), model: u(scope.map((r) => r.model)), exec: u(scope.map((r) => r.p.executive)) }
  }, [scope])
  const charts = useMemo(() => {
    const frp = franchisePerf(base, installs).sort((a, b) => b.sites - a.sites).slice(0, 8)
    const emp = employeePerf(base)
    const pc = pendingCounts(base)
    return {
      monthly: monthlyCompletion(base),
      fr: frp.map((x) => ({ name: x.name.length > 18 ? `${x.name.slice(0, 17)}…` : x.name, full: x.name, Completed: x.completed, Incomplete: x.incomplete, Other: x.sites - x.completed - x.incomplete })),
      emp: emp.map((e) => ({ name: e.name, Assigned: e.assigned, Completed: e.completed })),
      aging: taskAging(tasks),
      pending: PENDING_CATEGORIES.map((c) => ({ name: c.replace(' – Incomplete', ''), full: c, Sites: pc[c] })),
    }
  }, [base, installs, tasks])

  const pages = Math.max(1, Math.ceil(filtered.length / size))
  const cur = Math.min(page, pages)
  const pageRows = filtered.slice((cur - 1) * size, cur * size)
  const activeFilters = FILTER_KEYS.filter((k) => f(k) && !(k === 'status' && f(k) === pathStatus))
  const canEdit = can('Edit') && !isReport

  const title = isOther ? 'Others — Closed & Archived' : 'Project Site Register'
  return (
    <div className="space-y-5">
      <Crumbs items={[{ label: 'Projects', to: '/projects' }, { label: title }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 max-w-3xl text-[12.5px] text-muted">
            {isOther
              ? 'Closed and archived site projects — retained in the Site Master for reference and history; not part of active work.'
              : 'Centralized Site & Project registry. Every site is identified by its unique Site ID and LOI number; only consolidated status and pending module are shown here — details stay in the module.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isReport && !routeBlock('/master-data/sites', role) && (
            <Link to="/master-data/sites" className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[12px] font-semibold text-primary hover:border-primary/50">
              <Building2 size={14} /> Open in Master Data › Site Master
            </Link>
          )}
          {can('Export') && (
            <Button
              variant="secondary"
              icon={<Download size={14} />}
              onClick={() => {
                exportSiteMaster(filtered, `site-master-${todayIso()}`)
                toast(`${filtered.length} site record(s) exported`)
              }}
            >
              Export
            </Button>
          )}
          {!isReport && can('Create') && (
            <Link to="/master-data/sites/new" className="inline-flex h-[38px] items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover">
              <Plus size={14} /> New Site (Master Data)
            </Link>
          )}
        </div>
      </div>

      {!isOther && <AiProjectOverview rows={rows} installs={installs} tasks={tasks} onDrill={drill} defaultOpen={location.pathname.startsWith('/projects/ai-overview')} />}

      {/* Summary cards (§13) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
        <StatTile label="Total Sites" value={base.length.toLocaleString('en-IN')} sub="In current filter" active={!status} onClick={() => setF('status', '')} />
        {(isOther ? (['Closed', 'Archived'] as Lifecycle[]) : LIFECYCLES).map((l) => (
          <StatTile key={l} label={l} value={counts[l].toLocaleString('en-IN')} sub={LIFECYCLE_MEANING[l]} active={status === l} onClick={() => setF('status', status === l ? '' : l)} />
        ))}
      </div>

      {/* KPIs (§9.2) */}
      {!isOther && (
        <section className="rounded-xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-ink">Key performance indicators</h3>
            <span className="text-[10.5px] text-muted">Period: live as of {fmtD(todayIso())} · Source: Site Master, Site Installation, Task Management · N/A items excluded from denominators</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            <Kpi label="Site Completion %" value={pctTxt(kpi.siteCompletion.n, kpi.siteCompletion.d)} hint={`${kpi.siteCompletion.n} completed ÷ ${kpi.siteCompletion.d} eligible`} />
            <Kpi label="Installation Completion %" value={pctTxt(kpi.installCompletion.n, kpi.installCompletion.d)} hint={`${kpi.installCompletion.n} ÷ ${kpi.installCompletion.d} applicable items`} />
            <Kpi label="Approval TAT" value={Number.isNaN(kpi.approvalTatHrs) ? 'N/A' : `${Math.round(kpi.approvalTatHrs)} h`} hint="Admin approval − final submission" />
            <Kpi label="Avg Installation TAT" value={Number.isNaN(kpi.avgInstallTatDays) ? 'N/A' : `${Math.round(kpi.avgInstallTatDays)} d`} hint="Approval − installation start" />
            <Kpi label="Overdue Tasks" value={String(kpi.overdueTasks)} hint="Open tasks beyond due date" danger={kpi.overdueTasks > 0} />
            <Kpi label="Rejection Rate" value={pctTxt(kpi.rejection.n, kpi.rejection.d)} hint={`${kpi.rejection.n} rejected ÷ ${kpi.rejection.d} reviewed`} />
            <Kpi label="Employee Completion Rate" value={pctTxt(kpi.employeeCompletion.n, kpi.employeeCompletion.d)} hint="Completed ÷ assigned sites" />
          </div>
        </section>
      )}

      {/* Charts (§9) — click any chart to drill down */}
      {!isOther && (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="Site Lifecycle Overview" sub="Click a slice to open the site list">
            <Donut data={lifecycleSlices(counts)} onPick={(n) => setF('status', n)} />
          </ChartCard>
          <ChartCard title="Monthly Site Completion" sub="Completed sites per month · click a point">
            <Trend data={charts.monthly} onPick={(k) => drill({ status: 'Completed', month: k })} />
          </ChartCard>
          <ChartCard title="Pending Modules" sub="Consolidated pending category · click a bar">
            <Bars data={charts.pending} series={[{ key: 'Sites', label: 'Sites', color: '#f59e0b' }]} horizontal onPick={(n) => setF('pending', charts.pending.find((p) => p.name === n)?.full ?? '')} />
          </ChartCard>
          <ChartCard title="Franchise Performance" sub="Top franchises by sites · click a bar">
            <Bars
              data={charts.fr}
              series={[
                { key: 'Completed', label: 'Completed', color: '#10b981', stack: 'a' },
                { key: 'Incomplete', label: 'Incomplete', color: '#f59e0b', stack: 'a' },
                { key: 'Other', label: 'Active / Pipeline', color: '#93c5fd', stack: 'a' },
              ]}
              onPick={(n) => setF('fr', charts.fr.find((x) => x.name === n)?.full ?? '')}
            />
          </ChartCard>
          <ChartCard title="Employee Performance" sub="Assigned vs completed sites · click a bar">
            <Bars
              data={charts.emp}
              series={[
                { key: 'Assigned', label: 'Assigned', color: '#1e3f95' },
                { key: 'Completed', label: 'Completed', color: '#10b981' },
              ]}
              onPick={(n) => setF('exec', n)}
            />
          </ChartCard>
          <ChartCard title="Pending Task Aging" sub="Open project / installation tasks by age (days) · click a bar">
            <Bars
              data={charts.aging}
              series={[
                { key: 'Site Installation', label: 'Site Installation', color: '#7c3aed', stack: 'a' },
                { key: 'Projects', label: 'Projects', color: '#0ea5e9', stack: 'a' },
              ]}
              onPick={(n) => setF('aging', n)}
            />
          </ChartCard>
        </div>
      )}

      {/* Filters (§13) */}
      <section ref={tableRef} className="scroll-mt-4 rounded-xl border border-line bg-white p-4">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-6">
          <FilterText label="Site / LOI Number" value={f('q')} onChange={(v) => setF('q', v)} placeholder="Site ID, LOI, ATM ID" />
          <FilterSelect label="Franchise" value={fr} onChange={(v) => setF('fr', v)} options={opts.fr} />
          <FilterSelect label="Master Franchise" value={mf} onChange={(v) => setF('mf', v)} options={opts.mf} />
          <FilterSelect label="Super Master Franchise" value={smf} onChange={(v) => setF('smf', v)} options={opts.smf} />
          <FilterSelect label="State" value={st} onChange={(v) => setF('state', v)} options={opts.state} />
          <FilterText label="Location" value={f('loc')} onChange={(v) => setF('loc', v)} placeholder="City, district, PIN" />
          <FilterSelect label="Model" value={model} onChange={(v) => setF('model', v)} options={opts.model} />
          <FilterSelect label="Project Executive" value={exec} onChange={(v) => setF('exec', v)} options={opts.exec} />
          <FilterSelect label="Status" value={status} onChange={(v) => setF('status', v)} options={isOther ? ['Closed', 'Archived'] : LIFECYCLES} />
          <FilterSelect label="Pending Module" value={pending} onChange={(v) => setF('pending', v)} options={PENDING_CATEGORIES} />
          <FilterText label="Created from" type="date" value={from} onChange={(v) => setF('from', v)} />
          <FilterText label="Created to" type="date" value={to} onChange={(v) => setF('to', v)} />
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeFilters.map((k) => (
              <button key={k} type="button" onClick={() => setF(k, '')} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                {k === 'aging' ? `Task age ${f(k)} days` : k === 'month' ? `Completed in ${f(k)}` : f(k)} <X size={11} />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink">
              <RotateCcw size={11} /> Clear all
            </button>
          </div>
        )}
      </section>

      {/* Records (§13) */}
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
          <h3 className="text-[13px] font-semibold text-ink">Project site records</h3>
          <span className="text-[11px] text-muted">{filtered.length.toLocaleString('en-IN')} record(s)</span>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[1180px] text-[12px]">
            <thead className="bg-surface text-left text-[11px] text-muted">
              <tr>
                {['S.N.', 'Site / LOI Number', 'Franchise', 'Location', 'Model', 'Assigned Executive', 'Project Status', 'Pending Module', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <Row key={r.site.siteId} r={r} sn={(cur - 1) * size + i + 1} canEdit={canEdit} />
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted">
                    No site records match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={cur} pageSize={size} total={filtered.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="sites" />
      </section>
    </div>
  )
}

function parseFilters(spKey: string, pathStatus: string) {
  const x = new URLSearchParams(spKey)
  const out = {} as Record<FilterKey, string>
  for (const k of FILTER_KEYS) out[k] = x.get(k) ?? (k === 'status' ? pathStatus : '')
  return out
}

function applyFilters(scope: SiteMasterRow[], f: Record<FilterKey, string>, tasks: WfTask[]) {
  const q = f.q.toLowerCase()
  const loc = f.loc.toLowerCase()
  const agingSet = f.aging ? siteIdsWithAging(tasks, f.aging as AgingBucket) : null
  return scope.filter(
    (r) =>
      (!q || r.site.siteId.toLowerCase().includes(q) || r.p.loiNumber.toLowerCase().includes(q) || r.site.atmId.toLowerCase().includes(q) || r.p.siteName.toLowerCase().includes(q)) &&
      (!f.fr || r.frName === f.fr) &&
      (!f.mf || r.hier.mf === f.mf) &&
      (!f.smf || r.hier.smf === f.smf) &&
      (!f.state || r.site.state === f.state) &&
      (!loc || r.location.toLowerCase().includes(loc) || r.site.address.toLowerCase().includes(loc) || r.site.pin.includes(loc)) &&
      (!f.model || r.model === f.model) &&
      (!f.exec || r.p.executive === f.exec) &&
      (!f.pending || r.pending.some((p) => p.cat === f.pending)) &&
      (!f.from || r.p.createdAt.slice(0, 10) >= f.from) &&
      (!f.to || r.p.createdAt.slice(0, 10) <= f.to) &&
      (!f.month || (r.completedOn ?? '').startsWith(f.month)) &&
      (!agingSet || agingSet.has(r.site.siteId)),
  )
}

function Kpi({ label, value, hint, danger }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2.5">
      <div className="text-[10.5px] font-semibold text-muted">{label}</div>
      <div className={`mt-0.5 text-[19px] font-semibold ${danger ? 'text-brand-red' : 'text-ink'}`}>{value}</div>
      <div className="truncate text-[10px] text-muted" title={hint}>
        {hint}
      </div>
    </div>
  )
}

function Row({ r, sn, canEdit }: { r: SiteMasterRow; sn: number; canEdit: boolean }) {
  const base = `/projects/${r.lifecycle === 'Archived' ? 'archived' : 'active'}/${encodeURIComponent(r.p.id)}`
  return (
    <tr className="border-t border-line-soft align-top hover:bg-surface/60">
      <td className="px-3 py-2.5 text-muted">{sn}</td>
      <td className="px-3 py-2.5">
        <Link to={base} className="font-semibold text-primary hover:underline">
          {r.site.siteId}
        </Link>
        <div className="text-[10.5px] text-muted">{r.p.loiNumber || 'LOI pending'}</div>
      </td>
      <td className="px-3 py-2.5">
        <div className="max-w-[200px] truncate font-medium text-ink">{r.frName}</div>
        <div className="max-w-[200px] truncate text-[10.5px] text-muted">{r.hier.mf ? `MF · ${r.hier.mf}` : r.hier.smf ? `SMF · ${r.hier.smf}` : 'Direct'}</div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">{r.location}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">{r.model}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">{r.p.executive}</td>
      <td className="px-3 py-2.5">
        <LifecycleBadge l={r.lifecycle} />
        <ProgressBar pct={r.pct} className="mt-1.5 w-[120px]" />
      </td>
      <td className="px-3 py-2.5">
        <PendingChips items={r.pending} max={2} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <IconLink to={base} label="View" icon={<Eye size={14} />} />
          {canEdit && <IconLink to={`${base}?edit=1`} label="Edit" icon={<Pencil size={14} />} />}
          <IconLink to={`${base}/audit`} label="Activity history" icon={<History size={14} />} />
          <IconLink to={`${base}/audit?tab=tasks`} label="Task history" icon={<ListChecks size={14} />} />
          <details className="relative">
            <summary className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-md text-ink-2 hover:bg-primary-soft hover:text-primary" title="Related modules" aria-label="Related modules">
              <Share2 size={14} />
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-line bg-white p-1 text-[12px] shadow-lg">
              <MenuLink to={`/master-data/sites/${encodeURIComponent(r.site.siteId)}`} icon={<Building2 size={13} />}>
                Master Data · Site Profile
              </MenuLink>
              <MenuLink to={r.install ? `/projects/installation/${r.install.id}` : `/projects/installation/new?site=${encodeURIComponent(r.site.siteId)}`} icon={<Activity size={13} />}>
                Site Installation {r.install ? `· ${r.install.status}` : '· start'}
              </MenuLink>
              <MenuLink to="/legal" icon={<Activity size={13} />}>
                Legal
              </MenuLink>
              <MenuLink to="/finance/settlement-bank/account-mapping" icon={<Activity size={13} />}>
                Finance · Account Mapping
              </MenuLink>
              <MenuLink to={`/franchise/network/${encodeURIComponent(r.site.frId)}`} icon={<Activity size={13} />}>
                Franchise network
              </MenuLink>
            </div>
          </details>
        </div>
      </td>
    </tr>
  )
}

function IconLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link to={to} title={label} aria-label={label} className="grid h-7 w-7 place-items-center rounded-md text-ink-2 hover:bg-primary-soft hover:text-primary">
      {icon}
    </Link>
  )
}
function MenuLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink-2 hover:bg-surface hover:text-primary">
      {icon}
      {children}
    </Link>
  )
}
