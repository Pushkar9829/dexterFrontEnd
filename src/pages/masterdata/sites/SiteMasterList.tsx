import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Columns3, Download, Eye, Filter, Layers, Plus, RotateCcw, Search } from 'lucide-react'
import { useFranchises, type Franchise } from '@/data/franchises'
import { ENGINEERS, MANAGERS, useCategories, useMasterLoad, useNetwork, useSites } from '@/data/network'
import { masterAccess, useRole, can, type MasterAccess } from '@/lib/rbac'
import { maskAccount } from '@/lib/mask'
import { downloadCsv } from '@/lib/export'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { Bar, Crumbs, FSelect, FText, StatusBadge, Val } from './ui'
import {
  COMPLETION_BUCKETS, bucketOf, buildRows, canSeeAccountNo, fmtDate, isAdmin, siteMasterStore, useSiteMaster, type SiteRow,
} from './siteData'

type Ctx = { showAcc: boolean; custom: Record<string, Record<string, string>> }
type Col = {
  key: string
  label: string
  access: MasterAccess[] // which master-access levels see this column
  fixed?: boolean // cannot be hidden
  render: (r: SiteRow, ctx: Ctx) => ReactNode
  csv: (r: SiteRow, ctx: Ctx) => string
}

const ALL: MasterAccess[] = ['full', 'project', 'finance', 'legal']
const PROJ: MasterAccess[] = ['full', 'project']
const FIN: MasterAccess[] = ['full', 'project', 'finance']
const LEG: MasterAccess[] = ['full', 'project', 'legal']
const pend = (v?: string | number) => (v === undefined || v === '' ? 'Pending' : String(v))

function text(key: string, label: string, access: MasterAccess[], get: (r: SiteRow) => string | undefined): Col {
  return { key, label, access, render: (r) => <Val v={get(r)} />, csv: (r) => pend(get(r)) }
}
function status(key: string, label: string, access: MasterAccess[], get: (r: SiteRow) => string | undefined): Col {
  return { key, label, access, render: (r) => <StatusBadge s={get(r)} />, csv: (r) => pend(get(r)) }
}

// §9.1 — the 30 Site Master columns, then role-specific extras (finance: account/payout, legal: per-document status).
const BASE_COLS: Col[] = [
  { key: 'sr', label: 'Sr. No.', access: ALL, fixed: true, render: () => null, csv: () => '' },
  { key: 'siteId', label: 'Site ID', access: ALL, fixed: true, render: (r) => r.site.siteId, csv: (r) => r.site.siteId },
  text('projectId', 'Project ID', PROJ, (r) => r.site.projectId),
  text('frId', 'FR ID', ALL, (r) => r.site.frId),
  text('frName', 'Franchise Name', ALL, (r) => r.frName),
  text('smf', 'Parent SMF', PROJ, (r) => r.h.smf),
  text('mf', 'Parent MF', PROJ, (r) => r.h.mf),
  text('tl', 'Team Leader', PROJ, (r) => r.h.tl),
  text('projectType', 'Project Type', PROJ, (r) => r.site.projectType),
  text('plan', 'Plan Type', PROJ, (r) => r.site.plan),
  text('siteType', 'Site Type', PROJ, (r) => r.site.siteType),
  text('atmId', 'ATM ID', ALL, (r) => r.site.atmId),
  text('machineType', 'ATM Machine Type', PROJ, (r) => r.site.machineType),
  text('location', 'Site Location', PROJ, (r) => r.site.location),
  text('state', 'State', PROJ, (r) => r.site.state),
  text('district', 'District', PROJ, (r) => r.site.district),
  text('pin', 'PIN Code', PROJ, (r) => r.site.pin),
  text('accountType', 'Account Type', FIN, (r) => r.accountType),
  text('settlementBank', 'Settlement Bank', FIN, (r) => r.site.account?.bank),
  text('manager', 'Manager / RM', PROJ, (r) => r.site.manager?.name),
  text('engineer', 'Engineer Name', PROJ, (r) => r.site.engineer?.name),
  status('projectStatus', 'Project Status', PROJ, (r) => r.projectStatus),
  status('installation', 'Installation Status', PROJ, (r) => r.site.installation),
  status('legalStatus', 'Legal Status', LEG, (r) => r.legalStatus),
  status('accountStatus', 'Account Mapping Status', FIN, (r) => r.accountStatus),
  status('agreementStatus', 'Agreement Status', LEG, (r) => r.agreementStatus),
  text('tisBy', 'TIS Created By', PROJ, (r) => r.tisBy),
  { key: 'completion', label: 'Overall Completion', access: PROJ, render: (r) => <Bar pct={r.pct} className="w-[120px]" />, csv: (r) => `${r.pct}%` },
  { key: 'updated', label: 'Last Updated Date', access: ALL, render: (r) => fmtDate(r.site.updatedAt), csv: (r) => fmtDate(r.site.updatedAt) },
  // finance-only extras
  {
    key: 'accountNo', label: 'Account No.', access: ['finance'],
    render: (r, c) => <Val v={r.site.account ? (c.showAcc ? r.site.account.accountNo : maskAccount(r.site.account.accountNo)) : ''} />,
    csv: (r, c) => pend(r.site.account ? (c.showAcc ? r.site.account.accountNo : maskAccount(r.site.account.accountNo)) : ''),
  },
  text('ifsc', 'IFSC', ['finance'], (r) => r.site.account?.ifsc),
  status('settlement', 'Settlement Status', ['finance'], (r) => r.site.account?.settlement),
  text('payoutBank', 'Payout Bank', ['finance'], (r) => r.site.payout?.bank),
  status('payoutStatus', 'Payout Status', ['finance'], (r) => r.site.payout?.status),
  // legal-only extras (§18.2)
  ...(['LOI', 'Affidavit', 'Agreement', 'KYC', 'PVC'] as const).map((d) =>
    status(`legal_${d}`, `${d} Status`, ['legal'], (r) => (r.site.legal[d].verification === 'Re-upload Required' ? 'Re-upload Required' : r.site.legal[d].final)),
  ),
]

type Filters = {
  q: string; siteId: string; atmId: string; frName: string; smf: string; mf: string; tl: string; projectType: string; plan: string; siteType: string
  accountType: string; machineType: string; manager: string; engineer: string; projectStatus: string; legalStatus: string; completion: string
}
const EMPTY: Filters = {
  q: '', siteId: '', atmId: '', frName: '', smf: '', mf: '', tl: '', projectType: '', plan: '', siteType: '', accountType: '', machineType: '',
  manager: '', engineer: '', projectStatus: '', legalStatus: '', completion: '',
}
const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b))

export default function SiteMasterList() {
  useMasterLoad(['sites']) // API mode: refresh GET /sites
  const navigate = useNavigate()
  const role = useRole()
  const access = masterAccess(role)
  const { sites } = useSites()
  const franchises = useFranchises()
  const network = useNetwork()
  const cats = useCategories()
  const sm = useSiteMaster()

  const frMap = useMemo(() => new Map<string, Franchise>(franchises.map((f) => [f.id, f])), [franchises])
  const rows = useMemo(() => buildRows(sites, frMap, network, cats), [sites, frMap, network, cats])

  const [draft, setDraft] = useState<Filters>(EMPTY)
  const [applied, setApplied] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [colsOpen, setColsOpen] = useState(false)

  const ctx: Ctx = useMemo(() => ({ showAcc: canSeeAccountNo(role), custom: sm.values }), [role, sm.values])

  const columns = useMemo(() => {
    const customCols: Col[] = sm.custom.map((c) => ({
      key: c.key, label: c.label, access: PROJ,
      render: (r, x) => <Val v={x.custom[r.site.siteId]?.[c.key]} />,
      csv: (r, x) => pend(x.custom[r.site.siteId]?.[c.key]),
    }))
    return [...BASE_COLS, ...customCols].filter((c) => c.access.includes(access) && (c.fixed || !sm.hidden.includes(c.key)))
  }, [sm.custom, sm.hidden, access])

  const options = useMemo(() => ({
    smf: uniq(rows.map((r) => r.h.smf)),
    mf: uniq(rows.map((r) => r.h.mf)),
    tl: uniq(rows.map((r) => r.h.tl)),
    projectType: uniq([...cats.projectTypes.map((c) => c.name), ...rows.map((r) => r.site.projectType)]),
    plan: uniq([...cats.plans.map((c) => c.name), ...rows.map((r) => r.site.plan)]),
    siteType: uniq([...cats.siteTypes.map((c) => c.code), ...rows.map((r) => r.site.siteType)]),
    accountType: uniq(cats.settlementTypes.map((c) => c.name)),
    machineType: uniq([...cats.machineTypes.map((c) => c.name), ...rows.map((r) => r.site.machineType)]),
    manager: uniq([...MANAGERS.map((m) => m.name), ...rows.map((r) => r.site.manager?.name ?? '')]),
    engineer: uniq([...ENGINEERS.map((m) => m.name), ...rows.map((r) => r.site.engineer?.name ?? '')]),
  }), [rows, cats])

  const filtered = useMemo(() => {
    const f = applied
    const has = (v: string, q: string) => v.toLowerCase().includes(q.trim().toLowerCase())
    const q = f.q.trim().toLowerCase()
    return rows.filter((r) => {
      const s = r.site
      if (f.siteId && !has(s.siteId, f.siteId)) return false
      if (f.atmId && !has(s.atmId, f.atmId)) return false
      if (f.frName && !has(r.frName, f.frName) && !has(s.frId, f.frName)) return false
      if (f.smf && r.h.smf !== f.smf) return false
      if (f.mf && r.h.mf !== f.mf) return false
      if (f.tl && r.h.tl !== f.tl) return false
      if (f.projectType && s.projectType !== f.projectType) return false
      if (f.plan && s.plan !== f.plan) return false
      if (f.siteType && s.siteType !== f.siteType) return false
      if (f.accountType && r.accountType !== f.accountType) return false
      if (f.machineType && s.machineType !== f.machineType) return false
      if (f.manager && s.manager?.name !== f.manager) return false
      if (f.engineer && s.engineer?.name !== f.engineer) return false
      if (f.projectStatus && r.projectStatus !== f.projectStatus) return false
      if (f.legalStatus && r.legalStatus !== f.legalStatus) return false
      if (f.completion && bucketOf(r.pct) !== f.completion) return false
      if (q) {
        const hay = `${s.siteId} ${s.atmId} ${s.projectId} ${s.frId} ${r.frName} ${s.location} ${s.district} ${s.state}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, applied])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const curPage = Math.min(page, pages)
  const pageRows = useMemo(() => filtered.slice((curPage - 1) * pageSize, curPage * pageSize), [filtered, curPage, pageSize])

  const set = (k: keyof Filters) => (v: string) => setDraft((d) => ({ ...d, [k]: v }))
  const apply = () => {
    setApplied(draft)
    setPage(1)
  }
  const reset = () => {
    setDraft(EMPTY)
    setApplied(EMPTY)
    setPage(1)
  }

  const mayExport = can('Export', role) || can('Download', role)
  const exportCsv = () => {
    if (!mayExport) {
      toast('Your role cannot download Master Data.', 'error')
      return
    }
    if (filtered.length === 0) {
      toast('No records to export', 'info')
      return
    }
    const cols = columns.filter((c) => c.key !== 'sr')
    downloadCsv(
      `site-master-${new Date().toISOString().slice(0, 10)}`,
      ['Sr. No.', ...cols.map((c) => c.label)],
      filtered.map((r, i) => [String(i + 1), ...cols.map((c) => c.csv(r, ctx))]),
    )
    toast(`${filtered.length} site record(s) exported`)
  }

  const canCreate = access === 'full' || access === 'project'
  const admin = isAdmin(role)

  // §9.2 filters, limited to the user's part of Master Data for Finance / Legal.
  const filterDefs: { key: keyof Filters; access: MasterAccess[]; node: ReactNode }[] = [
    { key: 'q', access: ALL, node: <FText label="Search" value={draft.q} onChange={set('q')} placeholder="Site, ATM, Project, FR, location…" /> },
    { key: 'siteId', access: ALL, node: <FText label="Site ID" value={draft.siteId} onChange={set('siteId')} placeholder="SITE-…" /> },
    { key: 'atmId', access: ALL, node: <FText label="ATM ID" value={draft.atmId} onChange={set('atmId')} placeholder="DX…" /> },
    { key: 'frName', access: ALL, node: <FText label="Franchise Name" value={draft.frName} onChange={set('frName')} placeholder="Name or FR ID" /> },
    { key: 'smf', access: PROJ, node: <FSelect label="SMF" value={draft.smf} onChange={set('smf')} options={options.smf} /> },
    { key: 'mf', access: PROJ, node: <FSelect label="MF" value={draft.mf} onChange={set('mf')} options={options.mf} /> },
    { key: 'tl', access: PROJ, node: <FSelect label="Team Leader" value={draft.tl} onChange={set('tl')} options={options.tl} /> },
    { key: 'projectType', access: PROJ, node: <FSelect label="Project Type" value={draft.projectType} onChange={set('projectType')} options={options.projectType} /> },
    { key: 'plan', access: PROJ, node: <FSelect label="Plan" value={draft.plan} onChange={set('plan')} options={options.plan} /> },
    { key: 'siteType', access: PROJ, node: <FSelect label="Site Type" value={draft.siteType} onChange={set('siteType')} options={options.siteType} /> },
    { key: 'accountType', access: FIN, node: <FSelect label="Account Type" value={draft.accountType} onChange={set('accountType')} options={options.accountType} /> },
    { key: 'machineType', access: PROJ, node: <FSelect label="Machine Type" value={draft.machineType} onChange={set('machineType')} options={options.machineType} /> },
    { key: 'manager', access: PROJ, node: <FSelect label="Manager / RM" value={draft.manager} onChange={set('manager')} options={options.manager} /> },
    { key: 'engineer', access: PROJ, node: <FSelect label="Engineer" value={draft.engineer} onChange={set('engineer')} options={options.engineer} /> },
    { key: 'projectStatus', access: PROJ, node: <FSelect label="Project Status" value={draft.projectStatus} onChange={set('projectStatus')} options={['Completed', 'Incomplete']} /> },
    { key: 'legalStatus', access: LEG, node: <FSelect label="Legal Status" value={draft.legalStatus} onChange={set('legalStatus')} options={['Complete', 'Pending']} /> },
    { key: 'completion', access: PROJ, node: <FSelect label="Completion Status" value={draft.completion} onChange={set('completion')} options={COMPLETION_BUCKETS} /> },
  ]

  const stickyLeft = (key: string) => (key === 'sr' ? 'sticky left-0 w-[56px] min-w-[56px]' : key === 'siteId' ? 'sticky left-[56px] min-w-[130px] shadow-[2px_0_4px_rgba(0,0,0,0.04)]' : '')

  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <Crumbs items={[{ label: 'Master Data', to: '/master-data' }, { label: 'Site Master' }]} />

      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-slate-900">Site Master</h1>
          <p className="mt-1 text-[13px] text-slate-500">Consolidated site-wise master database of every franchise. Fields fill in as each onboarding step completes.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {admin && (
            <Button variant="secondary" icon={<Columns3 size={14} className="text-[#0066FF]" />} onClick={() => setColsOpen(true)}>
              Columns
            </Button>
          )}
          {mayExport && (
            <Button variant="secondary" icon={<Download size={14} className="text-[#0066FF]" />} onClick={exportCsv}>
              Export CSV
            </Button>
          )}
          {canCreate && (
            <Button variant="bright" icon={<Plus size={16} />} onClick={() => navigate('/master-data/sites/new')}>
              Add Site
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] leading-tight font-bold text-slate-900">Filter</h2>
            <p className="text-[12px] text-slate-500">Use the filters below to search the site master.</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            apply()
          }}
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {filterDefs.filter((d) => d.access.includes(access)).map((d) => (
              <div key={d.key}>{d.node}</div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2.5">
            <Button type="submit" size="sm" variant="bright" icon={<Search size={14} />}>
              Search
            </Button>
            <Button type="button" size="sm" variant="secondary" icon={<RotateCcw size={14} />} onClick={reset}>
              Reset
            </Button>
            {mayExport && (
              <Button type="button" size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>
                Download
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-sm">
              <Layers size={16} />
            </div>
            <h2 className="text-[15px] leading-tight font-bold text-slate-900">Site Master Records</h2>
          </div>
          <span className="text-[12px] font-medium text-slate-600">Total Records: {filtered.length}</span>
        </div>

        <div className="scroll-thin max-h-[65vh] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[11px] text-slate-700">
            <thead>
              <tr className="text-center font-bold text-slate-800">
                {columns.map((c) => (
                  <th key={c.key} className={cn('sticky top-0 border-r border-b border-[#D9E5F5] bg-[#EEF4FC] px-3 py-2.5 whitespace-nowrap', c.key === 'sr' || c.key === 'siteId' ? `${stickyLeft(c.key)} z-30` : 'z-20')}>
                    {c.label}
                  </th>
                ))}
                <th className="sticky top-0 right-0 z-30 border-b border-[#D9E5F5] bg-[#EEF4FC] px-3 py-2.5 whitespace-nowrap shadow-[-2px_0_4px_rgba(0,0,0,0.04)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-10 text-center text-[12px] text-slate-400">
                    No sites match the selected filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr key={r.site.siteId} className="group text-center">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          'border-r border-b border-slate-100 bg-white px-3 py-2 whitespace-nowrap group-hover:bg-[#F5F9FF]',
                          (c.key === 'sr' || c.key === 'siteId') && `${stickyLeft(c.key)} z-10`,
                          c.key === 'frName' && 'text-left',
                        )}
                      >
                        {c.key === 'sr' ? (
                          <span className="font-medium text-slate-500">{(curPage - 1) * pageSize + i + 1}</span>
                        ) : c.key === 'siteId' ? (
                          <Link to={`/master-data/sites/${encodeURIComponent(r.site.siteId)}`} className="font-semibold text-[#0066FF] hover:underline">
                            {r.site.siteId}
                          </Link>
                        ) : (
                          c.render(r, ctx)
                        )}
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-3 py-2 whitespace-nowrap shadow-[-2px_0_4px_rgba(0,0,0,0.04)] group-hover:bg-[#F5F9FF]">
                      <button
                        type="button"
                        onClick={() => navigate(`/master-data/sites/${encodeURIComponent(r.site.siteId)}`)}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-[#0066FF] hover:bg-blue-100"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200">
          <Pagination
            page={curPage}
            pageSize={pageSize}
            total={filtered.length}
            noun="sites"
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n)
              setPage(1)
            }}
          />
        </div>
      </div>

      {colsOpen && <ColumnManager onClose={() => setColsOpen(false)} />}
    </div>
  )
}

/** §9.1 note — Admin can add fields: add custom columns and hide / show any non-fixed column. */
function ColumnManager({ onClose }: { onClose: () => void }) {
  const sm = useSiteMaster()
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const all = [...BASE_COLS.filter((c) => c.access.includes('full')), ...sm.custom.map((c) => ({ key: c.key, label: c.label, fixed: false }))]

  const toggle = (key: string) =>
    siteMasterStore.set((s) => ({ ...s, hidden: s.hidden.includes(key) ? s.hidden.filter((k) => k !== key) : [...s.hidden, key] }))

  const add = () => {
    const name = label.trim()
    if (!name) {
      setError('Enter a column name.')
      return
    }
    if (all.some((c) => c.label.toLowerCase() === name.toLowerCase())) {
      setError('A column with this name already exists.')
      return
    }
    const key = `cf_${Date.now().toString(36)}`
    siteMasterStore.set((s) => ({ ...s, custom: [...s.custom, { key, label: name, createdOn: new Date().toISOString(), createdBy: 'Admin' }] }))
    setLabel('')
    setError('')
    toast(`Column "${name}" added — fill it per site in Site Profile › Custom Fields`)
  }

  return (
    <Modal title="Manage columns" sub="Add Admin-defined fields and choose which columns the Site Master shows." onClose={onClose} footer={<Button onClick={onClose}>Done</Button>} width={560}>
      <div className="flex items-end gap-2">
        <TextField
          label="New column name"
          className="flex-1"
          name="newColumn"
          value={label}
          error={error}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Electricity Meter No."
        />
        <Button type="button" variant="bright" icon={<Plus size={14} />} onClick={add} className={error ? 'mb-[22px]' : ''}>
          Add
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {all.map((c) => (
          <label key={c.key} className={cn('flex items-center gap-2 text-[12px]', c.fixed ? 'text-slate-400' : 'text-slate-800')}>
            <input type="checkbox" checked={c.fixed || !sm.hidden.includes(c.key)} disabled={c.fixed} onChange={() => toggle(c.key)} />
            {c.label}
            {c.key.startsWith('cf_') && <span className="rounded bg-violet-50 px-1.5 text-[10px] text-violet-700">custom</span>}
          </label>
        ))}
      </div>
    </Modal>
  )
}
