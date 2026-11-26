import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BellRing, BookOpen, ChevronDown, ChevronRight, Database, FileClock, FileSignature, Landmark, Layers, Network, Sparkles, UserCog, Wrench } from 'lucide-react'
import { HubTile } from '@/components/ui/HubTile'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  COMPLETION_STEPS,
  LEGAL_SEQUENCE,
  accountStatusOf,
  agreementStatusOf,
  completionOf,
  pendingActivities,
  useSites,
  type Department,
  type Site,
} from '@/data/network'
import { useFrMap } from './hooks'
import { addReminders, currentStage, fmtDate, predictCompletion, setStuckDays, STEP_TARGET_DAYS, useHub } from './hubStore'
import { AiGuardNote, DataTable, FilterSelect, PageShell, Panel, StatStrip, TableBar, Tabs, type Col } from './ui'

const TILES = [
  { title: 'SITE MASTER', sub: 'Site-wise master database of every FR site, linked by ATM ID.', to: '/master-data/sites', Icon: Database, theme: 'indigo', tag: '§9', actionText: 'Open list' },
  { title: 'ENGINEER MAPPING', sub: 'Map engineers to sites by ATM ID; previous engineer kept in history.', to: '/master-data/engineers', Icon: Wrench, theme: 'teal', tag: '§12', actionText: 'Map engineers' },
  { title: 'MANAGER / RM MAPPING', sub: 'Manager and Relationship Manager mapped to each site.', to: '/master-data/managers', Icon: UserCog, theme: 'purple', tag: '§8.7', actionText: 'Map managers' },
  { title: 'STAFF / TEAM MAPPING', sub: 'SMF / MF / Team Leader / Direct Company parent mapping with approval.', to: '/master-data/staff', Icon: Network, theme: 'blue', tag: '§8.6', actionText: 'Map teams' },
  { title: 'CATEGORIES', sub: 'Project type, plan, site type, settlement, machine, engineer and TIS masters.', to: '/master-data/categories', Icon: Layers, theme: 'cyan', tag: '§8', actionText: 'Manage' },
  { title: 'LEGAL TRACKING', sub: 'LOI, Affidavit, Agreement, KYC and PVC status for every site.', to: '/master-data/legal-tracking', Icon: FileSignature, theme: 'rose', tag: '§18', actionText: 'Track documents' },
  { title: 'TIS REGISTER', sub: 'Who created the TIS, photos, verification status and remarks.', to: '/master-data/tis', Icon: BookOpen, theme: 'amber', tag: '§16', actionText: 'Open register' },
  { title: 'ACCOUNT MAPPING', sub: 'WLA / Axis Indent / ICICI settlement and payout account mapping.', to: '/master-data/accounts', Icon: Landmark, theme: 'emerald', tag: '§17', actionText: 'Open register' },
  { title: 'AUDIT LOG', sub: 'Who changed what and when — old and new value for every master change.', to: '/master-data/audit', Icon: FileClock, theme: 'indigo', tag: '§25', actionText: 'View log' },
] as const

const DEPTS: Department[] = ['Project', 'Legal', 'Finance', 'Operations', 'Technical']
const DEPT_ACTIVITIES: Record<Department, string> = {
  Project: 'Site mapping / TIS / Assets delivery / Installation / Inauguration photos',
  Legal: 'LOI / Affidavit / Agreement / PVC / KYC verification',
  Finance: 'Bank account & payout mapping / SD mapping',
  Operations: '1st transaction starting',
  Technical: 'Engineer mapping',
}
const STEP_BY_WORK = new Map(COMPLETION_STEPS.map((c) => [c.label.split(' (')[0], c.key]))

type Tab = 'dept' | 'pending' | 'insights' | 'employee' | 'predict' | 'alerts'
type Act = ReturnType<typeof pendingActivities>[number]

export default function MasterOverview() {
  const { sites } = useSites()
  const frMap = useFrMap()
  const hub = useHub()
  const [tab, setTab] = useState<Tab>('dept')
  const frName = useCallback((id: string) => frMap.get(id)?.name ?? id, [frMap])

  const acts = useMemo(() => pendingActivities({ sites }), [sites])
  const completed = useMemo(() => sites.filter((s) => completionOf(s).complete).length, [sites])

  return (
    <PageShell
      back={false}
      title="Master Data Overview"
      sub="AI-based monitoring of completion and pendency across every FR site (§11). Figures come from the live Master Data."
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-navy-950 via-primary to-banner p-5 text-white shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide">
          <Sparkles size={13} className="text-amber-300" /> DEXTER AI · MASTER DATA INTELLIGENCE
        </div>
        <h2 className="mt-2 text-[20px] font-bold tracking-tight">Which department, site, project and employee has what work pending</h2>
        <p className="mt-1 max-w-3xl text-[12.5px] text-white/80">Department-wise and employee-wise pendency, missing documents, delays, completion prediction and automatic pending alerts — re-computed every time the data changes.</p>
      </div>

      <AiGuardNote />

      <StatStrip
        items={[
          { label: 'Total Sites', value: sites.length.toLocaleString('en-IN'), tone: 'blue' },
          { label: 'Completed Sites', value: completed.toLocaleString('en-IN'), tone: 'green' },
          { label: 'Incomplete Projects', value: (sites.length - completed).toLocaleString('en-IN'), tone: 'amber' },
          { label: 'Pending Activities', value: acts.length.toLocaleString('en-IN'), tone: 'red' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <HubTile key={t.to} {...t} />
        ))}
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'dept', label: 'Department-wise' },
          { key: 'pending', label: 'AI Pending Tasks', count: acts.length },
          { key: 'insights', label: 'AI Insights' },
          { key: 'employee', label: 'Employee-wise' },
          { key: 'predict', label: 'Completion Prediction' },
          { key: 'alerts', label: 'Pending Alerts' },
        ]}
      />

      {tab === 'dept' && <DeptView sites={sites} acts={acts} />}
      {tab === 'pending' && <PendingTable acts={acts} frName={frName} />}
      {tab === 'insights' && <Insights sites={sites} acts={acts} frName={frName} stuckDays={hub.stuckDays} />}
      {tab === 'employee' && <EmployeeView acts={acts} />}
      {tab === 'predict' && <PredictView sites={sites} frName={frName} />}
      {tab === 'alerts' && <AlertsView acts={acts} frName={frName} reminders={hub.reminders} />}
    </PageShell>
  )
}

// ── Department-wise pending overview ─────────────────────────────────────
function DeptView({ sites, acts }: { sites: Site[]; acts: Act[] }) {
  const rows = useMemo(() => {
    return DEPTS.map((d) => {
      const a = acts.filter((x) => x.dept === d)
      const byWork = new Map<string, number>()
      a.forEach((x) => byWork.set(x.work, (byWork.get(x.work) ?? 0) + 1))
      let breakdown = [...byWork].map(([w, n]) => `${w}: ${n}`)
      let pending = a.length
      if (d === 'Legal') {
        const docs = LEGAL_SEQUENCE.map((doc) => [doc, sites.filter((s) => s.legal[doc].final !== 'Complete').length] as const)
        breakdown = docs.map(([doc, n]) => `${doc === 'KYC' ? 'KYC verification' : doc}: ${n}`)
        pending = docs.reduce((t, [, n]) => t + n, 0)
      }
      if (d === 'Finance') {
        const payout = sites.filter((s) => s.payout?.status !== 'Mapped').length
        breakdown.push(`Payout account not mapped: ${payout}`)
      }
      return {
        dept: d,
        activities: DEPT_ACTIVITIES[d],
        pending,
        sites: d === 'Legal' ? sites.filter((s) => LEGAL_SEQUENCE.some((doc) => s.legal[doc].final !== 'Complete')).length : new Set(a.map((x) => x.siteId)).size,
        oldest: a.reduce((m, x) => Math.max(m, x.days), 0),
        onHold: a.filter((x) => x.status === 'On Hold').length,
        breakdown: breakdown.join(' · ') || '—',
      }
    })
  }, [sites, acts])

  const download = () => downloadCsv('master-data-department-pending', ['Department', 'Key activities', 'Pending items', 'Sites affected', 'Oldest pending (days)', 'On hold', 'Breakdown'], rows.map((r) => [r.dept, r.activities, String(r.pending), String(r.sites), String(r.oldest), String(r.onHold), r.breakdown]))

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Panel title="Pending by department" sub="Legal counts pending documents; others count pending workflow steps">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#667085' }} tickLine={false} axisLine={{ stroke: '#e8edf5' }} />
              <YAxis hide />
              <Tooltip cursor={{ fill: '#f6f8fc' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="pending" name="Pending" fill="#1e3f95" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                <LabelList dataKey="pending" position="top" style={{ fontSize: 10, fill: '#1e3f95' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Department-wise pending overview" sub="§11.1" action={<Button size="sm" variant="secondary" onClick={download}>Download</Button>}>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Key activities</th>
                <th className="px-3 py-2 text-right">Pending</th>
                <th className="px-3 py-2 text-right">Sites</th>
                <th className="px-3 py-2 text-right">Oldest</th>
                <th className="px-3 py-2">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.dept}>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{r.dept}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.activities}</td>
                  <td className="px-3 py-2.5 text-right font-bold">{r.pending}</td>
                  <td className="px-3 py-2.5 text-right">{r.sites}</td>
                  <td className="px-3 py-2.5 text-right">{r.oldest}d</td>
                  <td className="px-3 py-2.5 text-[11.5px] text-slate-600">{r.breakdown}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

// ── AI pending task identification (§11.3) ───────────────────────────────
function PendingTable({ acts, frName }: { acts: Act[]; frName: (id: string) => string }) {
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const [status, setStatus] = useState('all')
  const [user, setUser] = useState('all')
  const [age, setAge] = useState('all')
  const users = useMemo(() => [...new Set(acts.map((a) => a.assignedTo))].sort(), [acts])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return acts
      .filter((a) => (dept === 'all' || a.dept === dept) && (status === 'all' || a.status === status) && (user === 'all' || a.assignedTo === user) && (age === 'all' || a.days > Number(age)))
      .filter((a) => !s || `${a.siteId} ${a.atmId} ${a.frId} ${frName(a.frId)} ${a.work}`.toLowerCase().includes(s))
      .sort((a, b) => b.days - a.days)
  }, [acts, q, dept, status, user, age, frName])
  const cols: Col<Act>[] = [
    { key: 'site', header: 'Site ID', render: (a) => <Link className="font-semibold text-[#0066FF] hover:underline" to={`/master-data/sites/${a.siteId}`}>{a.siteId}</Link> },
    { key: 'atm', header: 'ATM ID', render: (a) => a.atmId },
    { key: 'fr', header: 'Franchise', render: (a) => frName(a.frId) },
    { key: 'dept', header: 'Department', render: (a) => a.dept },
    { key: 'work', header: 'Pending work', render: (a) => a.work },
    { key: 'user', header: 'Assigned user', render: (a) => a.assignedTo },
    { key: 'since', header: 'Pending since', render: (a) => `${fmtDate(a.since)} · ${a.days}d` },
    { key: 'status', header: 'Status', render: (a) => <Badge tone={toneFor(a.status)}>{a.status}</Badge> },
  ]
  const download = () => downloadCsv('master-data-ai-pending-tasks', ['Site ID', 'ATM ID', 'Franchise', 'Department', 'Pending work', 'Assigned user', 'Pending since', 'Days', 'Status'], rows.map((a) => [a.siteId, a.atmId, frName(a.frId), a.dept, a.work, a.assignedTo, a.since.slice(0, 10), String(a.days), a.status]))
  return (
    <DataTable
      rows={rows}
      cols={cols}
      rowKey={(a) => `${a.siteId}-${a.work}`}
      noun="pending activities"
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="Site ID, ATM ID, franchise…" onDownload={download}>
          <FilterSelect label="Department" value={dept} onChange={setDept} options={DEPTS} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={['Pending', 'In Progress', 'Email Submitted', 'On Hold']} />
          <FilterSelect label="Assigned user" value={user} onChange={setUser} options={users} />
          <FilterSelect label="Pending for" value={age} onChange={setAge} all="Any age" options={[{ value: '7', label: 'More than 7 days' }, { value: '15', label: 'More than 15 days' }, { value: '30', label: 'More than 30 days' }]} />
        </TableBar>
      }
    />
  )
}

// ── AI insights (§11.2 questions) ────────────────────────────────────────
type Insight = { id: string; q: string; headers: string[]; rows: string[][]; linkFirst?: boolean }

function Insights({ sites, acts, frName, stuckDays }: { sites: Site[]; acts: Act[]; frName: (id: string) => string; stuckDays: number }) {
  const [daysInput, setDaysInput] = useState(String(stuckDays))
  const insights = useMemo<Insight[]>(() => {
    const incomplete = sites.filter((s) => !completionOf(s).complete)
    const byFr = new Map<string, Site[]>()
    incomplete.forEach((s) => byFr.set(s.frId, [...(byFr.get(s.frId) ?? []), s]))
    const totalByFr = new Map<string, number>()
    sites.forEach((s) => totalByFr.set(s.frId, (totalByFr.get(s.frId) ?? 0) + 1))
    const stages = incomplete.map((s) => ({ s, c: currentStage(s)! })).filter((x) => x.c)

    const deptMap = new Map<string, Act[]>()
    acts.forEach((a) => deptMap.set(a.dept, [...(deptMap.get(a.dept) ?? []), a]))
    const userMap = new Map<string, Act[]>()
    acts.forEach((a) => userMap.set(a.assignedTo, [...(userMap.get(a.assignedTo) ?? []), a]))

    const docRows: string[][] = []
    sites.forEach((s) =>
      LEGAL_SEQUENCE.forEach((d) => {
        const t = s.legal[d]
        if (t.upload === 'Pending' || t.verification === 'Re-upload Required' || t.verification === 'Rejected') docRows.push([s.siteId, frName(s.frId), d === 'PVC' ? 'Police Verification (PVC)' : d, t.upload, t.verification])
      }),
    )
    sites.forEach((s) => {
      if (!s.tis && s.steps.tis?.status !== 'Not Started') docRows.push([s.siteId, frName(s.frId), 'TIS photos / reference', 'Pending', '—'])
    })

    const accByFr = new Map<string, Site[]>()
    sites.filter((s) => accountStatusOf(s) !== 'Mapped').forEach((s) => accByFr.set(s.frId, [...(accByFr.get(s.frId) ?? []), s]))

    const list = (ids: string[]) => (ids.length > 4 ? `${ids.slice(0, 4).join(', ')} +${ids.length - 4}` : ids.join(', '))
    return [
      {
        id: 'fr', q: "Which FR's sites are still incomplete?", headers: ['FR ID', 'Franchise', 'Incomplete sites', 'Total sites', 'Site IDs'],
        rows: [...byFr].sort((a, b) => b[1].length - a[1].length).map(([id, ss]) => [id, frName(id), String(ss.length), String(totalByFr.get(id) ?? 0), list(ss.map((s) => s.siteId))]),
      },
      {
        id: 'step', q: 'Which project step is pending for each site?', linkFirst: true, headers: ['Site ID', 'Franchise', 'Pending step', 'Department', 'Status', 'Assigned user', 'Days'],
        rows: stages.map(({ s, c }) => [s.siteId, frName(s.frId), c.label.split(' (')[0], c.dept, c.status, c.assignedTo, String(c.days)]),
      },
      {
        id: 'dept', q: 'Which department has not finished its work?', headers: ['Department', 'Pending items', 'Sites affected', 'On hold', 'Oldest (days)'],
        rows: [...deptMap].sort((a, b) => b[1].length - a[1].length).map(([d, a]) => [d, String(a.length), String(new Set(a.map((x) => x.siteId)).size), String(a.filter((x) => x.status === 'On Hold').length), String(Math.max(...a.map((x) => x.days)))]),
      },
      {
        id: 'user', q: 'Which employee / user has work pending?', headers: ['User', 'Department', 'Pending items', 'Oldest (days)'],
        rows: [...userMap].sort((a, b) => b[1].length - a[1].length).map(([u, a]) => [u, [...new Set(a.map((x) => x.dept))].join(', '), String(a.length), String(Math.max(...a.map((x) => x.days)))]),
      },
      { id: 'doc', q: 'Which document has not been uploaded (or must be re-uploaded)?', linkFirst: true, headers: ['Site ID', 'Franchise', 'Document', 'Upload', 'Verification'], rows: docRows },
      {
        id: 'agr', q: "Which site's Agreement is pending?", linkFirst: true, headers: ['Site ID', 'Franchise', 'Upload', 'Verification', 'Final'],
        rows: sites.filter((s) => agreementStatusOf(s) === 'Pending').map((s) => [s.siteId, frName(s.frId), s.legal.Agreement.upload, s.legal.Agreement.verification, s.legal.Agreement.final]),
      },
      {
        id: 'acc', q: "Which franchise's bank account mapping is pending?", headers: ['FR ID', 'Franchise', 'Sites pending', 'No account', 'Approval pending', 'Site IDs'],
        rows: [...accByFr].sort((a, b) => b[1].length - a[1].length).map(([id, ss]) => [id, frName(id), String(ss.length), String(ss.filter((s) => !s.account).length), String(ss.filter((s) => s.account && s.account.approval !== 'Approved').length), list(ss.map((s) => s.siteId))]),
      },
      {
        id: 'eng', q: 'Which site has no engineer mapped?', linkFirst: true, headers: ['Site ID', 'ATM ID', 'Franchise', 'State', 'Engineer mapping step'],
        rows: sites.filter((s) => !s.engineer).map((s) => [s.siteId, s.atmId, frName(s.frId), s.state, s.steps.engineerMapping?.status ?? '—']),
      },
      {
        id: 'stuck', q: `Which sites are stuck in one stage for more than ${stuckDays} days?`, linkFirst: true, headers: ['Site ID', 'Franchise', 'Stage', 'Status', 'Since', 'Days'],
        rows: stages.filter(({ c }) => c.status !== 'Not Started' && c.days > stuckDays).sort((a, b) => b.c.days - a.c.days).map(({ s, c }) => [s.siteId, frName(s.frId), c.label.split(' (')[0], c.status, c.since.slice(0, 10), String(c.days)]),
      },
      {
        id: 'delay', q: 'Which projects are delayed beyond the set time?', linkFirst: true, headers: ['Site ID', 'Project ID', 'Franchise', 'Stage', 'Target days', 'Actual days', 'Delay (days)'],
        rows: stages
          .filter(({ c }) => c.status !== 'Not Started' && c.days > (STEP_TARGET_DAYS[c.key] ?? 7))
          .sort((a, b) => b.c.days - (STEP_TARGET_DAYS[b.c.key] ?? 7) - (a.c.days - (STEP_TARGET_DAYS[a.c.key] ?? 7)))
          .map(({ s, c }) => [s.siteId, s.projectId, frName(s.frId), c.label.split(' (')[0], String(STEP_TARGET_DAYS[c.key] ?? 7), String(c.days), String(c.days - (STEP_TARGET_DAYS[c.key] ?? 7))]),
      },
    ]
  }, [sites, acts, stuckDays, frName])

  const applyDays = () => {
    const n = Number(daysInput)
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      toast('Enter a whole number of days between 1 and 365', 'error')
      return
    }
    setStuckDays(n)
    toast(`Stuck-stage threshold set to ${n} days`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">Stuck-stage threshold (days)</span>
          <input type="number" min={1} max={365} value={daysInput} onChange={(e) => setDaysInput(e.target.value)} className="h-8.5 w-28 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-[#0066FF]" />
        </label>
        <Button size="sm" onClick={applyDays}>Apply</Button>
        <p className="text-[11.5px] text-slate-500">Delay uses a target number of days per step (e.g. TIS {STEP_TARGET_DAYS.tis}d, Legal {STEP_TARGET_DAYS.legal}d, Engineer mapping {STEP_TARGET_DAYS.engineerMapping}d).</p>
      </div>
      {insights.map((i, n) => (
        <InsightBlock key={i.id} n={n + 1} insight={i} />
      ))}
    </div>
  )
}

function InsightBlock({ n, insight }: { n: number; insight: Insight }) {
  const [open, setOpen] = useState(n === 1)
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? insight.rows.filter((r) => r.join(' ').toLowerCase().includes(s)) : insight.rows
  }, [insight.rows, q])
  const cols: Col<string[]>[] = insight.headers.map((h, i) => ({
    key: h,
    header: h,
    render: (r) => (i === 0 && insight.linkFirst ? <Link to={`/master-data/sites/${r[0]}`} className="font-semibold text-[#0066FF] hover:underline">{r[0]}</Link> : r[i]),
  }))
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#0066FF] text-[11px] font-bold text-white">{n}</span>
        <span className="flex-1 text-[13px] font-semibold text-slate-900">{insight.q}</span>
        <Badge tone={insight.rows.length ? 'amber' : 'green'}>{insight.rows.length ? `${insight.rows.length} found` : 'None'}</Badge>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-3">
          <DataTable
            rows={rows}
            cols={cols}
            rowKey={(r) => r.join('|')}
            pageSize={10}
            toolbar={<TableBar search={q} onSearch={setQ} onDownload={() => downloadCsv(`ai-insight-${insight.id}`, insight.headers, rows)} />}
          />
        </div>
      )}
    </section>
  )
}

// ── Employee-wise pending analysis ───────────────────────────────────────
type EmpRow = { user: string; depts: string; total: number; pending: number; inProgress: number; onHold: number; oldest: number; avg: number; overTarget: number }
function EmployeeView({ acts }: { acts: Act[] }) {
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const all = useMemo<EmpRow[]>(() => {
    const m = new Map<string, Act[]>()
    acts.forEach((a) => m.set(a.assignedTo, [...(m.get(a.assignedTo) ?? []), a]))
    return [...m]
      .map(([user, a]) => ({
        user,
        depts: [...new Set(a.map((x) => x.dept))].join(', '),
        total: a.length,
        pending: a.filter((x) => x.status === 'Pending').length,
        inProgress: a.filter((x) => x.status === 'In Progress' || x.status === 'Email Submitted').length,
        onHold: a.filter((x) => x.status === 'On Hold').length,
        oldest: Math.max(...a.map((x) => x.days)),
        avg: Math.round(a.reduce((t, x) => t + x.days, 0) / a.length),
        overTarget: a.filter((x) => x.days > (STEP_TARGET_DAYS[STEP_BY_WORK.get(x.work) ?? ''] ?? 7)).length,
      }))
      .sort((a, b) => b.total - a.total)
  }, [acts])
  const rows = useMemo(() => all.filter((r) => (dept === 'all' || r.depts.includes(dept)) && r.user.toLowerCase().includes(q.trim().toLowerCase())), [all, q, dept])
  const cols: Col<EmpRow>[] = [
    { key: 'u', header: 'Employee / user', render: (r) => <span className="font-semibold text-slate-900">{r.user}</span> },
    { key: 'd', header: 'Department', render: (r) => r.depts },
    { key: 't', header: 'Total pending', render: (r) => <b>{r.total}</b> },
    { key: 'p', header: 'Pending', render: (r) => r.pending },
    { key: 'i', header: 'In progress / submitted', render: (r) => r.inProgress },
    { key: 'h', header: 'On hold', render: (r) => r.onHold },
    { key: 'o', header: 'Beyond target', render: (r) => (r.overTarget ? <Badge tone="red">{r.overTarget}</Badge> : '0') },
    { key: 'a', header: 'Avg age (days)', render: (r) => r.avg },
    { key: 'x', header: 'Oldest (days)', render: (r) => r.oldest },
  ]
  return (
    <div className="space-y-4">
      <Panel title="Pending work per employee" sub="Top 12 by open items">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={all.slice(0, 12)} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="user" tick={{ fontSize: 10, fill: '#667085' }} tickLine={false} axisLine={{ stroke: '#e8edf5' }} interval={0} />
              <YAxis hide />
              <Tooltip cursor={{ fill: '#f6f8fc' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total" name="Pending items" fill="#1e3f95" radius={[3, 3, 0, 0]} maxBarSize={30} isAnimationActive={false}>
                <LabelList dataKey="total" position="top" style={{ fontSize: 10, fill: '#1e3f95' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.user}
        noun="employees"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Employee name…" onDownload={() => downloadCsv('master-data-employee-pending', ['User', 'Department', 'Total', 'Pending', 'In progress/submitted', 'On hold', 'Beyond target', 'Avg days', 'Oldest days'], rows.map((r) => [r.user, r.depts, String(r.total), String(r.pending), String(r.inProgress), String(r.onHold), String(r.overTarget), String(r.avg), String(r.oldest)]))}>
            <FilterSelect label="Department" value={dept} onChange={setDept} options={DEPTS} />
          </TableBar>
        }
      />
    </div>
  )
}

// ── Completion prediction (heuristic estimate) ───────────────────────────
type PredRow = { site: Site; stage: string; status: string; stepsLeft: number; days: number; eta: string; confidence: string }
function PredictView({ sites, frName }: { sites: Site[]; frName: (id: string) => string }) {
  const [q, setQ] = useState('')
  const [band, setBand] = useState('all')
  const [conf, setConf] = useState('all')
  const all = useMemo<PredRow[]>(
    () =>
      sites
        .map((s): PredRow | null => {
          const p = predictCompletion(s)
          const c = currentStage(s)
          return p && c ? { site: s, stage: c.label.split(' (')[0], status: c.status, stepsLeft: p.stepsLeft, days: p.days, eta: p.eta, confidence: p.confidence } : null
        })
        .filter((x): x is PredRow => x !== null)
        .sort((a, b) => a.days - b.days),
    [sites],
  )
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter(
      (r) =>
        (band === 'all' || (band === '30' ? r.days <= 30 : band === '60' ? r.days > 30 && r.days <= 60 : r.days > 60)) &&
        (conf === 'all' || r.confidence === conf) &&
        (!s || `${r.site.siteId} ${r.site.atmId} ${frName(r.site.frId)}`.toLowerCase().includes(s)),
    )
  }, [all, q, band, conf, frName])
  const cols: Col<PredRow>[] = [
    { key: 's', header: 'Site ID', render: (r) => <Link to={`/master-data/sites/${r.site.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{r.site.siteId}</Link> },
    { key: 'f', header: 'Franchise', render: (r) => frName(r.site.frId) },
    { key: 'c', header: 'Current stage', render: (r) => r.stage },
    { key: 'st', header: 'Stage status', render: (r) => <Badge tone={toneFor(r.status)}>{r.status}</Badge> },
    { key: 'l', header: 'Steps left', render: (r) => `${r.stepsLeft} / ${COMPLETION_STEPS.length}` },
    { key: 'd', header: 'Est. days', render: (r) => `~${r.days}` },
    { key: 'e', header: 'Estimated completion', render: (r) => fmtDate(r.eta) },
    { key: 'k', header: 'Confidence', render: (r) => <Badge tone={r.confidence === 'High' ? 'green' : r.confidence === 'Medium' ? 'blue' : 'gray'}>{r.confidence}</Badge> },
  ]
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[12.5px] text-blue-900">
        <b>Estimate only.</b> ETA = remaining target days of the current step + target days of every step still open (+10 days if the current step is On Hold). It is a planning aid — completion is recorded only when the authorised user completes each step.
      </div>
      <StatStrip
        items={[
          { label: 'Incomplete sites', value: all.length },
          { label: 'Likely within 30 days', value: all.filter((r) => r.days <= 30).length, tone: 'green' },
          { label: '31 – 60 days', value: all.filter((r) => r.days > 30 && r.days <= 60).length, tone: 'blue' },
          { label: 'More than 60 days', value: all.filter((r) => r.days > 60).length, tone: 'amber' },
        ]}
      />
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.site.siteId}
        noun="sites"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Site ID, ATM ID, franchise…" onDownload={() => downloadCsv('master-data-completion-estimate', ['Site ID', 'Franchise', 'Current stage', 'Stage status', 'Steps left', 'Estimated days', 'Estimated completion', 'Confidence'], rows.map((r) => [r.site.siteId, frName(r.site.frId), r.stage, r.status, String(r.stepsLeft), String(r.days), r.eta.slice(0, 10), r.confidence]))}>
            <FilterSelect label="Expected in" value={band} onChange={setBand} all="Any time" options={[{ value: '30', label: 'Within 30 days' }, { value: '60', label: '31 – 60 days' }, { value: '61', label: 'More than 60 days' }]} />
            <FilterSelect label="Confidence" value={conf} onChange={setConf} options={['High', 'Medium', 'Low']} />
          </TableBar>
        }
      />
    </div>
  )
}

// ── Automatic pending alerts + reminders from the Task department ────────
type AlertRow = Act & { priority: 'High' | 'Medium'; target: number; key: string; lastReminder?: string; reminders: number }
function AlertsView({ acts, frName, reminders }: { acts: Act[]; frName: (id: string) => string; reminders: ReturnType<typeof useHub>['reminders'] }) {
  const [q, setQ] = useState('')
  const [prio, setPrio] = useState('all')
  const [dept, setDept] = useState('all')
  const [rq, setRq] = useState('')
  const remIndex = useMemo(() => {
    const m = new Map<string, { last: string; n: number }>()
    reminders.forEach((r) => {
      const k = `${r.siteId}|${r.work}`
      const cur = m.get(k)
      m.set(k, { last: cur && cur.last > r.at ? cur.last : r.at, n: (cur?.n ?? 0) + 1 })
    })
    return m
  }, [reminders])
  const all = useMemo<AlertRow[]>(
    () =>
      acts
        .map((a) => {
          const target = STEP_TARGET_DAYS[STEP_BY_WORK.get(a.work) ?? ''] ?? 7
          const over = a.days > target
          if (!over && a.status !== 'On Hold') return null
          const key = `${a.siteId}|${a.work}`
          const r = remIndex.get(key)
          return { ...a, target, key, priority: a.status === 'On Hold' || a.days > target * 2 ? 'High' : 'Medium', lastReminder: r?.last, reminders: r?.n ?? 0 } as AlertRow
        })
        .filter((x): x is AlertRow => x !== null)
        .sort((a, b) => (a.priority === b.priority ? b.days - a.days : a.priority === 'High' ? -1 : 1)),
    [acts, remIndex],
  )
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((a) => (prio === 'all' || a.priority === prio) && (dept === 'all' || a.dept === dept) && (!s || `${a.siteId} ${a.atmId} ${frName(a.frId)} ${a.assignedTo} ${a.work}`.toLowerCase().includes(s)))
  }, [all, q, prio, dept, frName])

  const send = (list: AlertRow[]) => {
    if (!list.length) {
      toast('No alerts to remind', 'info')
      return
    }
    const n = addReminders(list.map((a) => ({ to: a.assignedTo, siteId: a.siteId, dept: a.dept, work: a.work, pendingDays: a.days })))
    toast(n === 1 ? `Reminder sent to ${list[0].assignedTo} for ${list[0].siteId}` : `${n} reminders sent from the Task department`)
  }

  const cols: Col<AlertRow>[] = [
    { key: 'p', header: 'Priority', render: (a) => <Badge tone={a.priority === 'High' ? 'red' : 'amber'}>{a.priority}</Badge> },
    { key: 's', header: 'Site ID', render: (a) => <Link to={`/master-data/sites/${a.siteId}`} className="font-semibold text-[#0066FF] hover:underline">{a.siteId}</Link> },
    { key: 'f', header: 'Franchise', render: (a) => frName(a.frId) },
    { key: 'd', header: 'Department', render: (a) => a.dept },
    { key: 'w', header: 'Pending work', render: (a) => a.work },
    { key: 'u', header: 'Assigned user', render: (a) => a.assignedTo },
    { key: 'a', header: 'Age / target', render: (a) => `${a.days}d / ${a.target}d` },
    { key: 'st', header: 'Status', render: (a) => <Badge tone={toneFor(a.status)}>{a.status}</Badge> },
    { key: 'r', header: 'Last reminder', render: (a) => (a.lastReminder ? `${fmtDate(a.lastReminder)} (${a.reminders})` : '—') },
    { key: 'x', header: 'Action', render: (a) => <Button size="sm" variant="secondary" icon={<BellRing size={13} />} onClick={() => send([a])}>Send reminder</Button> },
  ]

  const remRows = useMemo(() => {
    const s = rq.trim().toLowerCase()
    return s ? reminders.filter((r) => `${r.siteId} ${r.to} ${r.work} ${r.dept}`.toLowerCase().includes(s)) : reminders
  }, [reminders, rq])
  const remCols: Col<(typeof reminders)[number]>[] = [
    { key: 'at', header: 'Sent on', render: (r) => `${fmtDate(r.at)} ${new Date(r.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` },
    { key: 'f', header: 'From', render: (r) => r.from },
    { key: 'b', header: 'Sent by', render: (r) => r.sentBy },
    { key: 't', header: 'To', render: (r) => r.to },
    { key: 's', header: 'Site ID', render: (r) => r.siteId },
    { key: 'd', header: 'Department', render: (r) => r.dept },
    { key: 'w', header: 'Pending work', render: (r) => r.work },
    { key: 'p', header: 'Pending (days)', render: (r) => r.pendingDays },
  ]

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-slate-500">An alert is raised automatically when a step is On Hold or has been pending longer than its target days. High priority = On Hold or more than twice the target. Reminders are sent from the Task department and recorded below.</p>
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(a) => a.key}
        noun="alerts"
        toolbar={
          <TableBar
            search={q}
            onSearch={setQ}
            placeholder="Site, franchise, user…"
            onDownload={() => downloadCsv('master-data-pending-alerts', ['Priority', 'Site ID', 'Franchise', 'Department', 'Pending work', 'Assigned user', 'Days', 'Target days', 'Status', 'Last reminder', 'Reminders'], rows.map((a) => [a.priority, a.siteId, frName(a.frId), a.dept, a.work, a.assignedTo, String(a.days), String(a.target), a.status, a.lastReminder?.slice(0, 10) ?? '', String(a.reminders)]))}
            right={<Button size="sm" icon={<BellRing size={13} />} onClick={() => send(rows.filter((a) => a.priority === 'High'))}>Remind all High ({rows.filter((a) => a.priority === 'High').length})</Button>}
          >
            <FilterSelect label="Priority" value={prio} onChange={setPrio} options={['High', 'Medium']} />
            <FilterSelect label="Department" value={dept} onChange={setDept} options={DEPTS} />
          </TableBar>
        }
      />
      <h3 className="pt-2 text-[14px] font-bold text-slate-900">Reminders sent ({reminders.length})</h3>
      <DataTable
        rows={remRows}
        cols={remCols}
        rowKey={(r) => r.id}
        noun="reminders"
        empty="No reminders sent yet."
        toolbar={<TableBar search={rq} onSearch={setRq} placeholder="Site, user, work…" onDownload={() => downloadCsv('master-data-reminders', ['Sent on', 'From', 'Sent by', 'To', 'Site ID', 'Department', 'Pending work', 'Pending days'], remRows.map((r) => [r.at, r.from, r.sentBy, r.to, r.siteId, r.dept, r.work, String(r.pendingDays)]))} />}
      />
    </div>
  )
}

