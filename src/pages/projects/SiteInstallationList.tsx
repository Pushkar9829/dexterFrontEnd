// Site Installation listing (Project spec §5.1, §9). Shows only eligible running / in-progress records;
// approved records and sites that are closed / archived in the Site Master move to the History filter.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Camera, Download, Lock, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { can, usePerms, useRole } from '@/lib/rbac'
import { useReportMode } from '@/hooks/useReportMode'
import { STAGES, INSTALL_STATUSES, currentStage, exportInstallations, installCompletion, isCrmRole, isDone, isNA, isRunning, stageState, type InstallRecord, type StageKey } from '@/data/siteInstallation'
import type { SiteMasterRow } from '@/data/projects'
import { Crumbs } from '@/pages/masterdata/sites/ui'
import { Bars, ChartCard, Donut, FilterSelect, FilterText, InstallBadge, ProgressBar, StatTile } from './bands'
import { AGING, agingOf, fmtD, isOpenTask, pctTxt, todayIso, type AgingBucket } from './format'
import { approvalSplit, computeKpis, equipmentStatus, pendingReviewCount, rejectedPhotoCount, stageProgress, useSiteMasterData } from './metrics'

type Item = { r: InstallRecord; row?: SiteMasterRow; running: boolean }
const KEYS = ['q', 'fr', 'status', 'stage', 'st', 'approval', 'exec', 'history', 'item', 'aging'] as const
type Key = (typeof KEYS)[number]

export default function SiteInstallationList() {
  useRole()
  usePerms()
  const { isReport } = useReportMode()
  const [sp, setSp] = useSearchParams()
  const { rows, installs, tasks } = useSiteMasterData()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const f = (k: Key) => sp.get(k) ?? ''
  const setF = (k: Key, v: string) => {
    setPage(1)
    setSp(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (v) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )
  }
  const drill = (params: Partial<Record<Key, string>>) => {
    setPage(1)
    const n = new URLSearchParams()
    const src = sp.get('source')
    if (src) n.set('source', src)
    Object.entries(params).forEach(([k, v]) => v && n.set(k, v))
    setSp(n)
  }

  const items = useMemo<Item[]>(() => {
    const byId = new Map(rows.map((x) => [x.site.siteId, x]))
    return installs.map((r) => {
      const row = byId.get(r.siteId)
      const siteClosed = row?.lifecycle === 'Closed' || row?.lifecycle === 'Archived'
      return { r, row, running: isRunning(r) && !siteClosed }
    })
  }, [rows, installs])

  const history = f('history') // '' running · '1' history · 'all'
  const q = f('q').toLowerCase(), fr = f('fr'), status = f('status'), stage = f('stage') as StageKey | '', st = f('st'), approval = f('approval'), exec = f('exec'), item = f('item'), aging = f('aging')
  const scope = useMemo(() => items.filter((x) => (history === 'all' ? true : history === '1' ? !x.running : x.running)), [items, history])
  const filtered = useMemo(() => {
    const agingIds = aging ? new Set(tasks.filter((t) => t.module === 'Site Installation' && isOpenTask(t) && agingOf(t) === aging).map((t) => t.refId)) : null
    return scope.filter(({ r, row }) => {
      if (q && !(r.siteId.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || (row?.p.loiNumber ?? '').toLowerCase().includes(q))) return false
      if (fr && row?.frName !== fr) return false
      if (status && r.status !== status) return false
      if (approval && r.approval !== approval) return false
      if (exec && r.executive !== exec && r.crmExecutive !== exec) return false
      if (stage) {
        if (st) {
          const s = stageState(r, stage)
          if (st === 'Complete' ? s !== 'Complete' : st === 'Correction' ? s !== 'Correction' : s === 'Complete' || s === 'Correction') return false
        } else if (currentStage(r).key !== stage) return false
      }
      if (item) {
        const e = r.equipment[item]
        if (!e || isNA(e.status) || (st === 'Done' ? !isDone(e.status) : isDone(e.status))) return false
      }
      if (agingIds && !agingIds.has(r.id)) return false
      return true
    })
  }, [scope, q, fr, status, approval, exec, stage, st, item, aging, tasks])

  const recs = useMemo(() => scope.map((x) => x.r), [scope])
  const charts = useMemo(() => {
    const ap = approvalSplit(recs)
    const instTasks = tasks.filter((t) => t.module === 'Site Installation' && isOpenTask(t))
    return {
      stages: stageProgress(recs),
      approval: [
        { name: 'Pending', value: ap.Pending, color: '#7c3aed' },
        { name: 'Approved', value: ap.Approved, color: '#10b981' },
        { name: 'Rejected', value: ap.Rejected, color: '#ef4444' },
        { name: 'Not Submitted', value: ap['Not Submitted'], color: '#cbd5e1' },
      ],
      equipment: equipmentStatus(recs).map((e) => ({ ...e, name: e.name.length > 16 ? `${e.name.slice(0, 15)}…` : e.name, full: e.name })),
      aging: AGING.map((b) => ({ name: b, Tasks: instTasks.filter((t) => agingOf(t) === b).length })),
    }
  }, [recs, tasks])
  const kpi = useMemo(() => computeKpis([], installs, tasks), [installs, tasks])
  const count = (s: string) => items.filter((x) => x.running && x.r.status === s).length
  const opts = useMemo(() => {
    const u = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort()
    return { fr: u(items.map((x) => x.row?.frName)), exec: u(items.flatMap((x) => [x.r.executive, x.r.crmExecutive])) }
  }, [items])

  const pages = Math.max(1, Math.ceil(filtered.length / size))
  const cur = Math.min(page, pages)
  const pageRows = filtered.slice((cur - 1) * size, cur * size)
  const active = KEYS.filter((k) => f(k) && k !== 'history')

  return (
    <div className="space-y-5">
      <Crumbs items={[{ label: 'Projects', to: '/projects' }, { label: 'Site Installation' }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Site Installation</h1>
          <p className="mt-1 max-w-3xl text-[12.5px] text-muted">
            Readiness, equipment installation, operational activation, documentation and final approval — one workflow shared with the franchise mobile app. Only running records are listed; completed, closed and archived records are under History.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('Export') && (
            <Button
              variant="secondary"
              icon={<Download size={14} />}
              onClick={() => {
                exportInstallations(filtered.map(({ r, row }) => ({ r, franchise: row?.frName ?? r.frId, location: row?.location ?? '', model: row?.model ?? '' })), `site-installation-${todayIso()}`)
                toast(`${filtered.length} installation record(s) exported`)
              }}
            >
              Download
            </Button>
          )}
          {!isReport && isCrmRole() && (
            <Link to="/projects/installation/new" className="inline-flex h-[38px] items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover">
              <Plus size={14} /> New Site Installation
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Running installations" value={items.filter((x) => x.running).length} sub="Eligible in-progress records" active={!history && !status} onClick={() => drill({})} />
        <StatTile label="Awaiting CRM verification" value={count('Submitted by Franchise')} sub="Franchise submitted" active={status === 'Submitted by Franchise'} onClick={() => drill({ status: 'Submitted by Franchise' })} />
        <StatTile label="Correction requested" value={count('Correction Requested')} sub="With franchise" tone="text-amber-600" active={status === 'Correction Requested'} onClick={() => drill({ status: 'Correction Requested' })} />
        <StatTile label="Pending Admin approval" value={count('Pending Admin Approval')} sub="Verified by CRM" tone="text-violet-700" active={status === 'Pending Admin Approval'} onClick={() => drill({ status: 'Pending Admin Approval' })} />
        <StatTile label="Rejected by Admin" value={count('Rejected by Admin')} sub="CRM correction task" tone="text-brand-red" active={status === 'Rejected by Admin'} onClick={() => drill({ status: 'Rejected by Admin' })} />
        <StatTile label="Approved (history)" value={items.filter((x) => x.r.status === 'Approved').length} sub="Locked & synced to Site Master" tone="text-emerald-600" active={history === '1'} onClick={() => drill({ history: '1' })} />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-4">
        <MiniKpi label="Installation Completion %" value={pctTxt(kpi.installCompletion.n, kpi.installCompletion.d)} hint="Completed mandatory ÷ applicable items (N/A excluded)" />
        <MiniKpi label="Approval TAT" value={Number.isNaN(kpi.approvalTatHrs) ? 'N/A' : `${Math.round(kpi.approvalTatHrs)} h`} hint="Admin approval − final submission" />
        <MiniKpi label="Average Installation TAT" value={Number.isNaN(kpi.avgInstallTatDays) ? 'N/A' : `${Math.round(kpi.avgInstallTatDays)} days`} hint="Approval − installation start" />
        <MiniKpi label="Rejection Rate" value={pctTxt(kpi.rejection.n, kpi.rejection.d)} hint="Rejected ÷ reviewed photos + Admin decisions" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Installation Stage Progress" sub="Stage-wise completion · click a bar segment to open the list">
          <Bars
            data={charts.stages}
            horizontal
            series={[
              { key: 'Complete', label: 'Complete', color: '#10b981', stack: 'a' },
              { key: 'Pending', label: 'Pending', color: '#93c5fd', stack: 'a' },
              { key: 'Correction', label: 'Correction', color: '#f59e0b', stack: 'a' },
            ]}
            onPick={(name, series) => {
              const s = STAGES.find((x) => x.label === name)
              if (s) drill({ stage: s.key, st: series, history })
            }}
          />
        </ChartCard>
        <ChartCard title="Approval Status" sub="Admin approval split · click a slice">
          <Donut data={charts.approval} onPick={(n) => drill({ approval: n, history: n === 'Approved' ? 'all' : history })} />
        </ChartCard>
        <ChartCard title="Equipment Status" sub="Asset-wise installation status · click a bar">
          <Bars
            data={charts.equipment}
            series={[
              { key: 'Done', label: 'Done / Installed / Delivered', color: '#10b981', stack: 'a' },
              { key: 'Pending', label: 'Pending', color: '#f59e0b', stack: 'a' },
            ]}
            onPick={(name, series) => {
              const e = charts.equipment.find((x) => x.name === name)
              if (e) drill({ item: e.key, st: series, history })
            }}
          />
        </ChartCard>
        <ChartCard title="Pending Task Aging" sub="Open installation tasks by age (days) · click a bar">
          <Bars data={charts.aging} series={[{ key: 'Tasks', label: 'Open tasks', color: '#7c3aed' }]} onPick={(n) => drill({ aging: n as AgingBucket, history: 'all' })} />
        </ChartCard>
      </div>

      <section className="rounded-xl border border-line bg-white p-4">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
          <FilterText label="Site / LOI / Installation ID" value={f('q')} onChange={(v) => setF('q', v)} />
          <FilterSelect label="Franchise" value={fr} onChange={(v) => setF('fr', v)} options={opts.fr} />
          <FilterSelect label="Workflow status" value={status} onChange={(v) => setF('status', v)} options={INSTALL_STATUSES} />
          <FilterSelect label="Current stage" value={st ? '' : stage} onChange={(v) => setF('stage', v)} options={STAGES.map((s) => s.key)} />
          <FilterSelect label="Admin approval" value={approval} onChange={(v) => setF('approval', v)} options={['Not Submitted', 'Pending', 'Approved', 'Rejected']} />
          <FilterSelect label="Executive / CRM" value={exec} onChange={(v) => setF('exec', v)} options={opts.exec} />
          <FilterSelect label="Records" value={history} onChange={(v) => setF('history', v)} options={['1', 'all']} all="Running (in progress)" />
        </div>
        <p className="mt-2 text-[10.5px] text-muted">Records: “1” = History (approved / closed / archived), “all” = running + history.</p>
        {active.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {active.map((k) => (
              <button key={k} type="button" onClick={() => setF(k, '')} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                {k}: {f(k)} <X size={11} />
              </button>
            ))}
            <button type="button" onClick={() => drill({ history })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink">
              <RotateCcw size={11} /> Clear
            </button>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
          <h3 className="text-[13px] font-semibold text-ink">{history === '1' ? 'History — approved / closed / archived' : history === 'all' ? 'All installation records' : 'Running installations'}</h3>
          <span className="text-[11px] text-muted">{filtered.length} record(s)</span>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[1240px] text-[12px]">
            <thead className="bg-surface text-left text-[11px] text-muted">
              <tr>
                {['S.N.', 'Installation', 'Site / LOI Number', 'Franchise', 'Location', 'Model', 'Executive / CRM', 'Current stage', 'Completion', 'Photos', 'Status', 'Admin approval', 'Updated', ''].map((h, i) => (
                  <th key={h || i} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ r, row }, i) => {
                const pr = pendingReviewCount(r)
                const rj = rejectedPhotoCount(r)
                return (
                  <tr key={r.id} className="border-t border-line-soft align-top hover:bg-surface/60">
                    <td className="px-3 py-2.5 text-muted">{(cur - 1) * size + i + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Link to={`/projects/installation/${r.id}`} className="font-semibold text-primary hover:underline">
                        {r.id}
                      </Link>
                      {r.locked && <Lock size={11} className="ml-1 inline text-emerald-600" />}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.siteId}
                      <div className="text-[10.5px] text-muted">{row?.p.loiNumber}</div>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5">{row?.frName ?? r.frId}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row?.location}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row?.model}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.executive}
                      <div className="text-[10.5px] text-muted">CRM · {r.crmExecutive}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {currentStage(r).n}. {currentStage(r).short}
                    </td>
                    <td className="px-3 py-2.5">
                      <ProgressBar pct={installCompletion(r).pct} className="w-[110px]" />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Camera size={12} className="text-muted" />
                        {pr > 0 && <span className="rounded bg-amber-50 px-1 text-amber-700">{pr} to review</span>}
                        {rj > 0 && <span className="rounded bg-red-50 px-1 text-red-700">{rj} rejected</span>}
                        {!pr && !rj && <span className="text-muted">OK</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <InstallBadge s={r.status} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.approval}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{fmtD(r.updatedAt)}</td>
                    <td className="px-3 py-2.5">
                      <Link to={`/projects/installation/${r.id}`} className="text-[11.5px] font-semibold text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {!pageRows.length && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-muted">
                    No installation records found.{' '}
                    {!isReport && isCrmRole() && (
                      <Link to="/projects/installation/new" className="font-semibold text-primary">
                        Start a new site installation
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={cur} pageSize={size} total={filtered.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="records" />
      </section>
    </div>
  )
}

function MiniKpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <div className="text-[10.5px] font-semibold text-muted">{label}</div>
      <div className="text-[18px] font-semibold text-ink">{value}</div>
      <div className="truncate text-[10px] text-muted" title={hint}>
        {hint}
      </div>
    </div>
  )
}
