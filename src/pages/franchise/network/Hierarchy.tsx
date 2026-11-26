import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, MapPin, Search, UserRound } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useFranchises, type Franchise } from '@/data/franchises'
import { COMPANY, NETWORK_STATUSES, TEAM_LEADERS, useNetwork, useSites, type NetworkNode, type Site } from '@/data/network'
import { TIER_SHORT, buildIndex } from './model'
import { BTN_SECONDARY, Crumbs, PageHead } from './shared'
import { cn } from '@/lib/cn'

type Counts = { mf: number; fr: number; sites: number }
const TL_GROUP = 'group:team-leaders'
const ROOT = COMPANY.id
const TIER_ORDER = { 'Super Master': 0, Master: 1, Franchise: 2 } as const

/** §1 hierarchy: Dexter India → SMF → MF → FR → Sites (incl. direct-company and Team Leader mappings). */
export default function Hierarchy() {
  const net = useNetwork()
  const st = useSites()
  const frs = useFranchises()
  const idx = useMemo(() => buildIndex(net.nodes, st.sites), [net.nodes, st.sites])
  const frById = useMemo(() => new Map(frs.map((f) => [f.id, f])), [frs])

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([ROOT]))
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [hits, setHits] = useState<string[]>([])
  const [hitIdx, setHitIdx] = useState(0)
  const focus = hits[hitIdx] ?? null

  const visible = (n: NetworkNode) => status === 'all' || n.status === status
  const kidsOf = (id: string) =>
    (idx.children.get(id) ?? [])
      .filter((n) => n.status !== 'Draft' && visible(n))
      .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.code.localeCompare(b.code))

  // counts per node (whole subtree)
  const counts = useMemo(() => {
    const memo = new Map<string, Counts>()
    const walk = (id: string, seen: Set<string>): Counts => {
      const hit = memo.get(id)
      if (hit) return hit
      const c: Counts = { mf: 0, fr: 0, sites: idx.sitesByFr.get(id)?.length ?? 0 }
      for (const k of idx.children.get(id) ?? []) {
        if (seen.has(k.frId)) continue
        seen.add(k.frId)
        const sub = walk(k.frId, seen)
        c.mf += sub.mf + (k.tier === 'Master' ? 1 : 0)
        c.fr += sub.fr + (k.tier === 'Franchise' ? 1 : 0)
        c.sites += sub.sites
      }
      memo.set(id, c)
      return c
    }
    walk(ROOT, new Set([ROOT]))
    const tl: Counts = { mf: 0, fr: 0, sites: 0 }
    TEAM_LEADERS.forEach((t) => {
      const c = walk(t.id, new Set([t.id]))
      tl.mf += c.mf
      tl.fr += c.fr
      tl.sites += c.sites
    })
    memo.set(TL_GROUP, tl)
    return memo
  }, [idx])

  /** Ancestor chain of a node (for expanding to a search match). */
  const chainOf = (frId: string): string[] => {
    const out: string[] = []
    let cur = net.nodes[frId]
    const seen = new Set<string>()
    while (cur && !seen.has(cur.frId)) {
      seen.add(cur.frId)
      const p = cur.parent
      if (p.kind === 'Company') {
        out.push(ROOT)
        break
      }
      if (p.kind === 'Team Leader') {
        out.push(p.id, TL_GROUP, ROOT)
        break
      }
      out.push(p.id)
      cur = net.nodes[p.id]
    }
    return out
  }

  const find = () => {
    const q = query.trim().toLowerCase()
    if (!q) {
      setHits([])
      return
    }
    const found: string[] = []
    Object.values(net.nodes).forEach((n) => {
      if (n.status === 'Draft' || !visible(n)) return
      const f = frById.get(n.frId)
      if ([n.code, n.frId, n.partnerCode, f?.name ?? ''].some((v) => v.toLowerCase().includes(q))) found.push(n.frId)
    })
    st.sites.forEach((s) => {
      if (s.siteId.toLowerCase().includes(q) || s.atmId.toLowerCase().includes(q)) found.push(`site:${s.siteId}`)
    })
    TEAM_LEADERS.forEach((t) => {
      if (t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)) found.push(t.id)
    })
    if (!found.length) {
      setHits([])
      toast('No node matches the search', 'info')
      return
    }
    setHits(found)
    setHitIdx(0)
    reveal(found[0])
  }
  const reveal = (id: string) => {
    let chain: string[]
    if (id.startsWith('site:')) {
      const s = st.sites.find((x) => `site:${x.siteId}` === id)
      chain = s ? [s.frId, ...chainOf(s.frId)] : []
    } else if (TEAM_LEADERS.some((t) => t.id === id)) chain = [TL_GROUP, ROOT]
    else chain = chainOf(id)
    setExpanded((e) => new Set([...e, ...chain]))
  }
  const next = () => {
    if (!hits.length) return
    const i = (hitIdx + 1) % hits.length
    setHitIdx(i)
    reveal(hits[i])
  }

  useEffect(() => {
    if (!focus) return
    const t = setTimeout(() => document.getElementById(`tree-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
    return () => clearTimeout(t)
  }, [focus, hits])

  const toggle = (id: string) =>
    setExpanded((e) => {
      const n = new Set(e)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const expandTop = () => setExpanded(new Set([ROOT, TL_GROUP, ...kidsOf(ROOT).filter((n) => n.tier === 'Super Master').map((n) => n.frId)]))

  const download = () => {
    const rows: string[][] = Object.values(net.nodes)
      .filter((n) => n.status !== 'Draft' && visible(n))
      .map((n) => {
        const c = counts.get(n.frId) ?? { mf: 0, fr: 0, sites: 0 }
        const f = frById.get(n.frId)
        return [n.code, n.frId, f?.name ?? '', TIER_SHORT[n.tier], n.parent.kind, n.parent.name, n.status, String(c.mf), String(c.fr), String(c.sites)]
      })
    downloadCsv(`franchise-hierarchy-${new Date().toISOString().slice(0, 10)}`, ['Code', 'ID', 'Name', 'Tier', 'Parent type', 'Parent', 'Status', 'MFs below', 'FRs below', 'Sites'], rows)
    toast(`${rows.length} node(s) downloaded`)
  }

  const renderNode = (n: NetworkNode, depth: number): ReactNode => {
    const f = frById.get(n.frId)
    const kids = kidsOf(n.frId)
    const sites = n.tier === 'Franchise' ? idx.sitesByFr.get(n.frId) ?? [] : []
    const open = expanded.has(n.frId)
    const hasKids = kids.length > 0 || sites.length > 0
    return (
      <div key={n.frId}>
        <Row
          id={n.frId}
          depth={depth}
          open={open}
          hasKids={hasKids}
          onToggle={() => toggle(n.frId)}
          focused={focus === n.frId}
          label={
            <>
              <Badge tone={n.tier === 'Super Master' ? 'purple' : n.tier === 'Master' ? 'blue' : 'gray'} dot={false}>{TIER_SHORT[n.tier]}</Badge>
              <Link to={`/franchise/network/${n.frId}`} className="font-semibold text-slate-900 hover:text-[#0066FF] hover:underline">{n.code} · {f?.name ?? n.frId}</Link>
              <Badge tone={toneFor(n.status)}>{n.status}</Badge>
            </>
          }
          counts={counts.get(n.frId)}
          tier={n.tier}
        />
        {open && kids.map((k) => renderNode(k, depth + 1))}
        {open && sites.map((s) => <SiteRow key={s.siteId} s={s} depth={depth + 1} focused={focus === `site:${s.siteId}`} />)}
      </div>
    )
  }

  const rootKids = kidsOf(ROOT)
  const tlOpen = expanded.has(TL_GROUP)

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      <Crumbs trail={[{ label: 'Hierarchy' }]} />
      <PageHead
        title="Franchise Hierarchy"
        sub="Dexter India → Super Master Franchise → Master Franchise → Franchise → ATM Sites, including direct-company and Team Leader mappings."
        actions={
          <>
            <button type="button" onClick={expandTop} className={BTN_SECONDARY}><ChevronsUpDown size={14} className="text-[#0066FF]" /> Expand SMFs</button>
            <button type="button" onClick={() => setExpanded(new Set([ROOT]))} className={BTN_SECONDARY}><ChevronsDownUp size={14} className="text-[#0066FF]" /> Collapse</button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-[280px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-slate-700">Search</label>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && find()}
              placeholder="SMF / MF / FR code, name, ID, Site ID, ATM ID, Team Leader…"
              className="h-8.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[12px] outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-700">Status</label>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setHits([]) }} className="h-8.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#0066FF]">
            <option value="all">All status</option>
            {NETWORK_STATUSES.filter((s) => s !== 'Draft').map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={find} className="h-8.5 rounded-lg bg-[#0066FF] px-4 text-[12px] font-semibold text-white hover:bg-[#0052CC]">Find</button>
        <button type="button" onClick={next} disabled={hits.length < 2} className="h-8.5 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-medium text-slate-700 disabled:opacity-50">Next match</button>
        <button type="button" onClick={download} className="h-8.5 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-medium text-slate-700 hover:bg-slate-50">Download</button>
        {hits.length > 0 && <span className="text-[12px] text-slate-500">Match {hitIdx + 1} of {hits.length}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2 shadow-sm">
        <div className="min-w-[900px]">
          <Row
            id={ROOT}
            depth={0}
            open={expanded.has(ROOT)}
            hasKids
            onToggle={() => toggle(ROOT)}
            focused={false}
            label={<><Building2 size={15} className="text-[#0066FF]" /><span className="font-bold text-slate-900">Dexter India (Company)</span></>}
            counts={counts.get(ROOT)}
            extra={`${rootKids.filter((n) => n.tier === 'Super Master').length} SMF · ${rootKids.filter((n) => n.tier === 'Master').length} direct MF · ${rootKids.filter((n) => n.tier === 'Franchise').length} direct FR`}
          />
          {expanded.has(ROOT) && (
            <>
              {rootKids.map((n) => renderNode(n, 1))}
              <Row
                id={TL_GROUP}
                depth={1}
                open={tlOpen}
                hasKids
                onToggle={() => toggle(TL_GROUP)}
                focused={false}
                label={<><UserRound size={14} className="text-[#0066FF]" /><span className="font-semibold text-slate-900">Team Leaders</span></>}
                counts={counts.get(TL_GROUP)}
              />
              {tlOpen &&
                TEAM_LEADERS.map((t) => {
                  const kids = kidsOf(t.id)
                  const open = expanded.has(t.id)
                  return (
                    <div key={t.id}>
                      <Row
                        id={t.id}
                        depth={2}
                        open={open}
                        hasKids={kids.length > 0}
                        onToggle={() => toggle(t.id)}
                        focused={focus === t.id}
                        label={<><Badge tone="amber" dot={false}>TL</Badge><span className="font-semibold text-slate-900">{t.id} · {t.name}</span></>}
                        counts={counts.get(t.id)}
                      />
                      {open && kids.map((k) => renderNode(k, 3))}
                    </div>
                  )
                })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  id, depth, open, hasKids, onToggle, focused, label, counts, extra, tier,
}: { id: string; depth: number; open: boolean; hasKids: boolean; onToggle: () => void; focused: boolean; label: ReactNode; counts?: Counts; extra?: string; tier?: Franchise['tier'] }) {
  return (
    <div id={`tree-${id}`} className={cn('flex items-center gap-2 border-l-2 py-1.5 pr-4 text-[12px] hover:bg-blue-50/40', focused ? 'border-[#0066FF] bg-blue-50' : 'border-transparent')} style={{ paddingLeft: 12 + depth * 22 }}>
      <button type="button" onClick={onToggle} disabled={!hasKids} aria-label={open ? 'Collapse' : 'Expand'} className="grid h-5 w-5 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-0">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      <span className="flex min-w-0 items-center gap-2">{label}</span>
      <span className="ml-auto flex shrink-0 items-center gap-3 text-[11px] text-slate-500">
        {extra && <span>{extra}</span>}
        {counts && tier !== 'Franchise' && tier !== 'Master' && <span>{counts.mf} MF</span>}
        {counts && tier !== 'Franchise' && <span>{counts.fr} FR</span>}
        {counts && <span className="font-semibold text-slate-700">{counts.sites} sites</span>}
      </span>
    </div>
  )
}

function SiteRow({ s, depth, focused }: { s: Site; depth: number; focused: boolean }) {
  return (
    <div id={`tree-site:${s.siteId}`} className={cn('flex items-center gap-2 border-l-2 py-1 pr-4 text-[11.5px] text-slate-600', focused ? 'border-[#0066FF] bg-blue-50' : 'border-transparent')} style={{ paddingLeft: 12 + depth * 22 + 28 }}>
      <MapPin size={12} className="text-slate-400" />
      <Link to={`/master-data/sites/${s.siteId}`} className="font-medium text-slate-800 hover:text-[#0066FF] hover:underline">{s.siteId}</Link>
      <span className="font-mono text-slate-500">{s.atmId}</span>
      <span className="truncate">{s.location}</span>
      <span className="ml-auto">{s.operational ? <Badge tone="green">Operational</Badge> : <Badge tone="gray">Not live</Badge>}</span>
    </div>
  )
}
