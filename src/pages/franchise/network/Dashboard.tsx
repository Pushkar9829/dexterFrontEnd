import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { GitBranch, Plus } from 'lucide-react'
import { StatCard } from '@/components/ui/KpiCard'
import { Badge, toneFor } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useFranchises, type Franchise, type Tier } from '@/data/franchises'
import {
  NETWORK_STATUSES, agreementStatusOf, completionOf, useNetwork, usePortability, useSites,
  type NetworkNode, type PortabilityState,
} from '@/data/network'
import { STATES } from '@/data/applications'
import { CHILD_TIER, SLUG_TIER, TIER_LONG, TIER_SHORT, TIER_SLUGS, buildIndex, descendants, inrShort, paged, type NetIndex } from './model'
import { BTN_PRIMARY, BTN_SECONDARY, Crumbs, EmptyRow, FilterCard, FilterSelect, PageHead, TD, THead, TROW, TableCard, Tabs } from './shared'

type Metrics = {
  children: number
  activeChildren: number
  inactiveChildren: number
  frCount: number
  activeFr: number
  sites: number
  operational: number
  incomplete: number
  pendingAgr: number
  pendingNoc: number
  transfers: number
  exits: number
  investment: number
}

const OPEN_TRANSFER = new Set(['Pending', 'Under Review', 'Approved'])
const OPEN_EXIT = new Set(['Requested', 'Under Review', 'Approved'])

function metricsFor(roots: NetworkNode[], tier: Tier, idx: NetIndex, port: PortabilityState): Metrics {
  const childTier = CHILD_TIER[tier]
  const all = new Map<string, NetworkNode>()
  const kids: NetworkNode[] = []
  roots.forEach((r) => {
    all.set(r.frId, r)
    descendants(idx, r.frId).forEach((d) => all.set(d.frId, d))
    if (childTier) kids.push(...(idx.children.get(r.frId) ?? []).filter((c) => c.tier === childTier))
  })
  const nodes = [...all.values()]
  const frs = nodes.filter((n) => n.tier === 'Franchise')
  const sites = nodes.flatMap((n) => idx.sitesByFr.get(n.frId) ?? [])
  const ids = new Set(all.keys())
  return {
    children: kids.length,
    activeChildren: kids.filter((k) => k.status === 'Active').length,
    inactiveChildren: kids.filter((k) => k.status !== 'Active').length,
    frCount: frs.length,
    activeFr: frs.filter((f) => f.status === 'Active').length,
    sites: sites.length,
    operational: sites.filter((s) => s.operational).length,
    incomplete: sites.filter((s) => !completionOf(s).complete).length,
    pendingAgr: sites.filter((s) => agreementStatusOf(s) === 'Pending').length,
    pendingNoc: nodes.filter((n) => n.nocPending).length,
    transfers: port.transfers.filter((t) => OPEN_TRANSFER.has(t.status) && (t.subjectIds.some((i) => ids.has(i)) || ids.has(t.current.id) || ids.has(t.next.id))).length,
    exits: port.exits.filter((x) => OPEN_EXIT.has(x.status) && ids.has(x.frId)).length,
    investment: sites.reduce((a, s) => a + s.investment, 0),
  }
}

export default function TierDashboard() {
  const { tier: slug = '' } = useParams()
  const tier = SLUG_TIER[slug]
  if (!tier) return <Navigate to="/franchise/dashboard/super-master" replace />
  return <DashboardView key={tier} tier={tier} />
}

type Row = { node: NetworkNode; fr?: Franchise; m: Metrics }
type Col = { h: string; v: (r: Row) => ReactNode; csv: (r: Row) => string }

function DashboardView({ tier }: { tier: Tier }) {
  const navigate = useNavigate()
  const net = useNetwork()
  const st = useSites()
  const port = usePortability()
  const frs = useFranchises()
  const short = TIER_SHORT[tier]
  const childShort = CHILD_TIER[tier] ? TIER_SHORT[CHILD_TIER[tier]!] : ''

  const idx = useMemo(() => buildIndex(net.nodes, st.sites), [net.nodes, st.sites])
  const frById = useMemo(() => new Map(frs.map((f) => [f.id, f])), [frs])
  const entities = useMemo(() => Object.values(net.nodes).filter((n) => n.tier === tier && n.status !== 'Draft'), [net.nodes, tier])
  const rows: Row[] = useMemo(() => entities.map((node) => ({ node, fr: frById.get(node.frId), m: metricsFor([node], tier, idx, port) })), [entities, frById, tier, idx, port])

  // KPI scope: one entity (SMF / MF) or a mapping group (FR)
  const [scope, setScope] = useState('all')
  const scopeNodes = useMemo(() => {
    if (scope === 'all') return entities
    if (tier === 'Franchise') return entities.filter((n) => n.parent.kind === scope)
    return entities.filter((n) => n.frId === scope)
  }, [scope, entities, tier])
  const k = useMemo(() => metricsFor(scopeNodes, tier, idx, port), [scopeNodes, tier, idx, port])

  // table filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [state, setState] = useState('all')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter((r) => (status === 'all' || r.node.status === status) && (state === 'all' || r.fr?.state === state))
      .filter((r) => !q || [r.node.code, r.node.frId, r.fr?.name ?? '', r.node.parent.name, r.node.partnerCode].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.m.sites - a.m.sites)
  }, [rows, search, status, state])

  const kpis: { label: string; value: ReactNode; caption?: string }[] =
    tier === 'Franchise'
      ? [
          { label: 'Total Franchise', value: k.frCount },
          { label: 'Active Franchise', value: k.activeFr },
          { label: 'Inactive / Hold Franchise', value: k.frCount - k.activeFr },
          { label: 'Total ATM Sites', value: k.sites },
          { label: 'Total Investment', value: inrShort(k.investment) },
          { label: 'Operational Sites', value: k.operational },
          { label: 'Pending Projects', value: k.incomplete, caption: 'Project incomplete sites' },
          { label: 'Pending Agreements', value: k.pendingAgr },
          { label: 'Pending NOC', value: k.pendingNoc },
          { label: 'Transfer Requests', value: k.transfers, caption: 'Open requests' },
          { label: 'Exit Requests', value: k.exits, caption: 'Open requests' },
        ]
      : [
          { label: `Total ${TIER_LONG[CHILD_TIER[tier]!]}`, value: k.children },
          { label: `Active ${TIER_LONG[CHILD_TIER[tier]!]}`, value: k.activeChildren },
          { label: `Inactive ${TIER_LONG[CHILD_TIER[tier]!]}`, value: k.inactiveChildren, caption: 'Inactive, hold, suspended, pending' },
          ...(tier === 'Super Master' ? [{ label: 'Total Franchise Network', value: k.frCount }] : []),
          { label: 'Total ATM Sites', value: k.sites },
          { label: 'Operational Sites', value: k.operational },
          { label: 'Project Incomplete Sites', value: k.incomplete },
          { label: 'Pending Agreements', value: k.pendingAgr },
          { label: 'Pending NOC', value: k.pendingNoc },
          { label: 'Transfer Requests', value: k.transfers, caption: 'Open requests' },
          { label: 'Exit Requests', value: k.exits, caption: 'Open requests' },
          ...(tier === 'Master' ? [{ label: 'Total Investment', value: inrShort(k.investment) }] : []),
        ]

  const n = (v: number) => String(v)
  const cols: Col[] = [
    { h: `${short} Code`, v: (r) => <Link to={`/franchise/network/${r.node.frId}`} className="font-semibold text-[#0066FF] hover:underline">{r.node.code}</Link>, csv: (r) => r.node.code },
    { h: 'Name', v: (r) => <span className="font-semibold text-slate-900">{r.fr?.name ?? r.node.frId}</span>, csv: (r) => r.fr?.name ?? '' },
    ...(tier !== 'Super Master' ? [{ h: 'Parent', v: (r: Row) => `${r.node.parent.kind === 'Company' ? 'Direct Company' : `${r.node.parent.kind} · ${r.node.parent.name}`}`, csv: (r: Row) => `${r.node.parent.kind} ${r.node.parent.name}` }] : []),
    { h: 'State', v: (r) => r.fr?.state ?? '—', csv: (r) => r.fr?.state ?? '' },
    { h: 'Status', v: (r) => <Badge tone={toneFor(r.node.status)}>{r.node.status}</Badge>, csv: (r) => r.node.status },
    ...(tier !== 'Franchise'
      ? [
          { h: `${childShort}s`, v: (r: Row) => n(r.m.children), csv: (r: Row) => n(r.m.children) },
          { h: `Active ${childShort}s`, v: (r: Row) => n(r.m.activeChildren), csv: (r: Row) => n(r.m.activeChildren) },
        ]
      : []),
    ...(tier === 'Super Master' ? [{ h: 'FR Network', v: (r: Row) => n(r.m.frCount), csv: (r: Row) => n(r.m.frCount) }] : []),
    { h: 'Sites', v: (r) => <b>{r.m.sites}</b>, csv: (r) => n(r.m.sites) },
    { h: 'Operational', v: (r) => n(r.m.operational), csv: (r) => n(r.m.operational) },
    { h: 'Incomplete', v: (r) => n(r.m.incomplete), csv: (r) => n(r.m.incomplete) },
    { h: 'Investment', v: (r) => inrShort(r.m.investment), csv: (r) => String(r.m.investment) },
    { h: 'Pending Agr.', v: (r) => n(r.m.pendingAgr), csv: (r) => n(r.m.pendingAgr) },
    { h: 'Pending NOC', v: (r) => n(r.m.pendingNoc), csv: (r) => n(r.m.pendingNoc) },
    { h: 'Transfers', v: (r) => n(r.m.transfers), csv: (r) => n(r.m.transfers) },
    { h: 'Exits', v: (r) => n(r.m.exits), csv: (r) => n(r.m.exits) },
  ]

  const download = () => {
    if (!filtered.length) {
      toast('No records to download', 'info')
      return
    }
    downloadCsv(`${short.toLowerCase()}-network-breakdown-${new Date().toISOString().slice(0, 10)}`, cols.map((c) => c.h), filtered.map((r) => cols.map((c) => c.csv(r))))
    toast(`${filtered.length} row(s) downloaded`)
  }

  const scopeOptions =
    tier === 'Franchise'
      ? [{ value: 'MF', label: 'Under Master Franchise' }, { value: 'Company', label: 'Direct Company' }, { value: 'Team Leader', label: 'Under Team Leader' }]
      : [...rows].sort((a, b) => a.node.code.localeCompare(b.node.code)).map((r) => ({ value: r.node.frId, label: `${r.node.code} · ${r.fr?.name ?? ''}` }))

  const TABS = ['SMF Dashboard', 'MF Dashboard', 'FR Dashboard'] as const
  const tabOf: Record<Tier, (typeof TABS)[number]> = { 'Super Master': 'SMF Dashboard', Master: 'MF Dashboard', Franchise: 'FR Dashboard' }
  const tierOfTab = (t: (typeof TABS)[number]): Tier => (t === 'SMF Dashboard' ? 'Super Master' : t === 'MF Dashboard' ? 'Master' : 'Franchise')

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      <Crumbs trail={[{ label: `${short} Dashboard` }]} />
      <PageHead
        title={`${TIER_LONG[tier]} Dashboard`}
        sub={tier === 'Franchise' ? 'Overall franchise dashboard — sites, investment, operational and pending projects.' : `${short} network: ${childShort}s, franchise network, sites and transfer status.`}
        actions={
          <>
            <Link to="/franchise/hierarchy" className={BTN_SECONDARY}><GitBranch size={14} className="text-[#0066FF]" /> Hierarchy</Link>
            <button type="button" onClick={() => navigate(`/franchise/register/${TIER_SLUGS[tier]}`)} className={BTN_PRIMARY}><Plus size={16} /> Register {short}</button>
          </>
        }
      />
      <Tabs tabs={TABS} value={tabOf[tier]} onChange={(t) => navigate(`/franchise/dashboard/${TIER_SLUGS[tierOfTab(t)]}`)} />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-[12px] font-semibold text-slate-700">{tier === 'Franchise' ? 'Mapping' : `Scope (${short})`}</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-8.5 min-w-[260px] rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#0066FF]">
          <option value="all">{tier === 'Franchise' ? 'All franchises' : `All ${short}s (${rows.length})`}</option>
          {scopeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {scope !== 'all' && tier !== 'Franchise' && (
          <Link to={`/franchise/network/${scope}`} className="text-[12px] font-semibold text-[#0066FF] hover:underline">Open profile</Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((x) => (
          <StatCard key={x.label} label={x.label} value={x.value} caption={x.caption} />
        ))}
      </div>

      <FilterCard search={search} onSearch={(v) => { setSearch(v); setPage(1) }} placeholder={`${short} code, name, ID, parent…`} onReset={() => { setSearch(''); setStatus('all'); setState('all'); setPage(1) }} onDownload={download} cols={3}>
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={NETWORK_STATUSES} all="All status" />
        <FilterSelect label="State" value={state} onChange={(v) => { setState(v); setPage(1) }} options={STATES} all="All states" />
      </FilterCard>

      <TableCard title={`Per-${short} breakdown`} total={filtered.length} page={page} pageSize={size} onPage={setPage} onPageSize={setSize} minWidth={1300}>
        <THead cols={cols.map((c) => c.h)} />
        <tbody>
          {filtered.length === 0 ? (
            <EmptyRow cols={cols.length} />
          ) : (
            paged(filtered, page, size).map((r) => (
              <tr key={r.node.frId} className={TROW}>
                {cols.map((c) => (
                  <td key={c.h} className={TD}>{c.v(r)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  )
}
