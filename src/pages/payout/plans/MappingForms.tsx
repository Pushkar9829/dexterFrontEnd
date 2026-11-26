import { useMemo, useState } from 'react'
import { Building2, ListChecks, Search, Send, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { planMappingStore, usePlans } from '@/data/payout'
import { useSites, type Site } from '@/data/network'
import {
  addMappings, beneficiaryName, buildMapping, EMPTY_MAP, entityOf, findSite, logPlanMapping, runMappings, today, validateMapBasics,
  type Entity, type MapDraft,
} from './model'
import { BeneficiaryAndDates, PlanPicker, RunResultModal, StepLabel, type RunResult } from './mappingUi'
import { IssueList, SectionBar, inputCls, tdCls, theadCls, thCls } from './ui'

const start = (): MapDraft => ({ ...EMPTY_MAP, effectiveFrom: today() })
const useDraft = () => {
  const [d, setD] = useState<MapDraft>(start)
  const set = (p: Partial<MapDraft>) => setD((x) => ({ ...x, ...p }))
  return { d, set, reset: () => setD(start()) }
}

function EntityCard({ en }: { en: Entity }) {
  const s = en.site
  const kv: [string, string][] = [
    ['ATM ID', s.atmId], ['Site ID', s.siteId], ['Vertical', en.vertical], ['Site Category', en.category ?? 'Not in BM site master'], ['Site Type', s.siteType], ['Machine', s.machineType],
    ['Location', `${s.district}, ${s.state}`], ['Operational', s.operational ? 'Yes' : 'No'], ['Franchisee', en.vertical === 'Business Model' ? 'n/a (BM site)' : en.franchisee ? `${en.franchisee.name} (${en.franchisee.id})` : '—'],
    ['MF', en.mf ?? '—'], ['Super MF', en.superMf ?? '—'], ['Project', s.projectId],
  ]
  return (
    <div className="grid gap-x-6 gap-y-2 rounded-lg border border-line bg-surface/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
      {kv.map(([k, v]) => (
        <div key={k}><div className="text-[10.5px] font-semibold text-muted uppercase">{k}</div><div className="text-[12.5px] text-ink">{v}</div></div>
      ))}
    </div>
  )
}

// ── Individual mapping (§10.2 steps 1–8) ──────────────────────────────────────
export function IndividualMapping() {
  const plans = usePlans()
  const { sites } = useSites()
  const { d, set, reset } = useDraft()
  const [q, setQ] = useState('')
  const [site, setSite] = useState<Site | null>(null)
  const [searchErr, setSearchErr] = useState('')
  const [show, setShow] = useState(false)

  const en = site ? entityOf(site) : null
  const errors = validateMapBasics(d, plans)
  const shownErrors = show ? errors : {}
  const atmOptions = useMemo(() => sites.filter((s) => !d.vertical || (d.vertical === 'Business Model' ? s.siteType === 'BM' : s.siteType !== 'BM')).slice(0, 300), [sites, d.vertical])
  const preview = en && Object.keys(errors).length === 0 ? buildMapping(d, en.site, plans, planMappingStore.get(), 'Individual') : null
  const siteIssue = en && d.vertical && en.vertical !== d.vertical ? `${en.site.atmId} is a ${en.vertical} site — choose that vertical or another site.` : en && d.siteCategory && en.category !== d.siteCategory ? `This site's category is "${en.category ?? 'not registered'}", not "${d.siteCategory}".` : null

  const fetchSite = () => {
    const s = findSite(q)
    if (!q.trim()) return setSearchErr('Enter an ATM ID or Site ID.')
    if (!s) {
      setSite(null)
      return setSearchErr(`No site found for “${q.trim()}”.`)
    }
    setSearchErr('')
    setSite(s)
  }
  const submit = () => {
    setShow(true)
    if (!site) return setSearchErr('Search and select the ATM / Site first.')
    if (Object.keys(errors).length) return toast('Complete the highlighted fields', 'error')
    const r = buildMapping(d, site, plans, planMappingStore.get(), 'Individual')
    if ('error' in r) return toast(r.error, 'error')
    addMappings([r.ok])
    logPlanMapping(r.ok, 'Mapping submitted for approval')
    toast(`${site.atmId} mapped to ${r.ok.planCode} v${r.ok.planVersion} — sent for approval`)
    setSite(null)
    setQ('')
    setShow(false)
  }

  return (
    <section className="space-y-4 rounded-xl border border-line bg-white p-4">
      <SectionBar icon={<Building2 size={16} />} title="Individual Site Mapping" sub="Map one ATM / site to an approved plan version. Each mapping goes to a checker." />
      <PlanPicker d={d} set={set} errors={shownErrors} />
      <div>
        <StepLabel n={4} required>Search ATM ID / Site ID</StepLabel>
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[260px] flex-1 sm:max-w-[420px]">
            <Search size={14} className="pointer-events-none absolute top-2.5 left-2.5 text-muted" />
            <input list="atm-options" value={q} onChange={(e) => { setQ(e.target.value); setSearchErr('') }} onKeyDown={(e) => e.key === 'Enter' && fetchSite()} placeholder="e.g. DXMH70007 or SITE-MH-0001" aria-label="ATM or Site ID" className={cn(inputCls, 'h-9 pl-8', searchErr ? 'border-brand-red' : 'border-line')} />
            <datalist id="atm-options">{atmOptions.map((s) => <option key={s.atmId} value={s.atmId}>{s.siteId} · {s.district}</option>)}</datalist>
          </label>
          <Button className="w-[150px]" icon={<Search size={14} />} onClick={fetchSite}>Fetch details</Button>
        </div>
        {searchErr && <p className="mt-1 text-[11px] text-brand-red">{searchErr}</p>}
      </div>
      {en && (
        <div>
          <StepLabel n={5}>Entity Details (auto-fetched)</StepLabel>
          <EntityCard en={en} />
          {siteIssue && <p className="mt-1.5 text-[11.5px] text-brand-red">{siteIssue}</p>}
        </div>
      )}
      <BeneficiaryAndDates d={d} set={set} errors={shownErrors}
        names={en ? { Franchisee: beneficiaryName(en, 'Franchisee'), MF: beneficiaryName(en, 'MF'), 'Super MF': beneficiaryName(en, 'Super MF') } : undefined} />
      {preview && 'error' in preview && <IssueList items={[preview.error]} title="This mapping cannot be submitted" />}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3">
        <StepLabel n={8}>Submit for approval</StepLabel>
        <span className="flex-1" />
        <Button variant="secondary" className="w-[130px]" onClick={() => { reset(); setSite(null); setQ(''); setShow(false); setSearchErr('') }}>Reset</Button>
        <Button variant="bright" className="w-[200px]" icon={<Send size={14} />} onClick={submit}>Submit for Approval</Button>
      </div>
    </section>
  )
}

// ── Bulk mapping: choose many sites by filter, every one checked for overlap ────
export function BulkMapping() {
  const plans = usePlans()
  const { sites } = useSites()
  const { d, set } = useDraft()
  const [f, setF] = useState({ q: '', state: '', type: '', operational: false })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [show, setShow] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)

  const errors = validateMapBasics(d, plans)
  const pool = useMemo(() => {
    if (!d.vertical || !d.siteCategory) return []
    return sites.map(entityOf).filter((e) => e.vertical === d.vertical && e.category === d.siteCategory)
  }, [sites, d.vertical, d.siteCategory])
  const states = useMemo(() => [...new Set(pool.map((e) => e.state))].sort(), [pool])
  const types = useMemo(() => [...new Set(pool.map((e) => e.site.siteType))].sort(), [pool])
  const rows = useMemo(() => {
    const k = f.q.trim().toLowerCase()
    return pool.filter((e) => (!f.state || e.state === f.state) && (!f.type || e.site.siteType === f.type) && (!f.operational || e.site.operational) && (!k || `${e.site.atmId} ${e.site.siteId} ${e.city} ${e.franchisee?.name ?? ''} ${e.mf ?? ''}`.toLowerCase().includes(k)))
  }, [pool, f])
  const pageRows = rows.slice((page - 1) * size, page * size)
  const allOn = rows.length > 0 && rows.every((e) => picked.has(e.site.atmId))
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setPicked((s) => { const n = new Set(s); rows.forEach((e) => (allOn ? n.delete(e.site.atmId) : n.add(e.site.atmId))); return n })
  const setFilter = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setPage(1) }

  const mapAll = () => {
    setShow(true)
    if (Object.keys(errors).length) return toast('Complete the plan, beneficiary and period first', 'error')
    const chosen = sites.filter((s) => picked.has(s.atmId))
    if (!chosen.length) return toast('Select at least one site', 'error')
    const r = runMappings(d, chosen, 'Bulk')
    setResult({ title: 'Bulk mapping result', ...r })
    setPicked(new Set())
  }

  return (
    <section className="space-y-4 rounded-xl border border-line bg-white p-4">
      <SectionBar icon={<ListChecks size={16} />} title="Bulk Mapping" sub="Filter sites, select many and map them in one go. Each site is checked separately; clashes are skipped and reported." />
      <PlanPicker d={d} set={(p) => { set(p); setPicked(new Set()); setPage(1) }} errors={show ? errors : {}} />
      <BeneficiaryAndDates d={d} set={set} errors={show ? errors : {}} n0={4} />
      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-surface px-3 py-2.5">
        <label className="relative w-[240px]">
          <Search size={14} className="pointer-events-none absolute top-2.5 left-2.5 text-muted" />
          <input value={f.q} onChange={(e) => setFilter({ q: e.target.value })} placeholder="ATM / Site / city / MF…" aria-label="Search sites" className={cn(inputCls, 'h-9 border-line pl-8')} />
        </label>
        <select value={f.state} onChange={(e) => setFilter({ state: e.target.value })} aria-label="State" className={cn(inputCls, 'h-9 w-[180px] border-line')}>
          <option value="">All States</option>{states.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={f.type} onChange={(e) => setFilter({ type: e.target.value })} aria-label="Site type" className={cn(inputCls, 'h-9 w-[150px] border-line')}>
          <option value="">All Site Types</option>{types.map((s) => <option key={s}>{s}</option>)}
        </select>
        <Checkbox checked={f.operational} onChange={(v) => setFilter({ operational: v })} label={<span className="text-[12px]">Operational only</span>} />
        <span className="ml-auto text-[12px] text-ink-2">{picked.size} selected · {rows.length} matching</span>
        <Button variant="bright" className="w-[190px]" icon={<Send size={14} />} onClick={mapAll}>Map selected ({picked.size})</Button>
      </div>
      <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr className={theadCls}>
              <th className={cn(thCls, 'w-10')}><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Select all matching sites" /></th>
              {['ATM ID', 'Site ID', 'Site Type', 'State', 'District', 'Franchisee', 'MF', 'Super MF', 'Operational'].map((h) => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((e) => (
              <tr key={e.site.atmId} className={cn('border-t border-line-soft', picked.has(e.site.atmId) && 'bg-[#f3f7ff]')}>
                <td className={tdCls}><input type="checkbox" checked={picked.has(e.site.atmId)} onChange={() => toggle(e.site.atmId)} aria-label={`Select ${e.site.atmId}`} /></td>
                <td className={cn(tdCls, 'font-medium')}>{e.site.atmId}</td>
                <td className={tdCls}>{e.site.siteId}</td>
                <td className={tdCls}>{e.site.siteType}</td>
                <td className={tdCls}>{e.state}</td>
                <td className={tdCls}>{e.city}</td>
                <td className={cn(tdCls, 'text-left')}>{e.franchisee?.name ?? '—'}</td>
                <td className={cn(tdCls, 'text-left')}>{e.mf ?? '—'}</td>
                <td className={cn(tdCls, 'text-left')}>{e.superMf ?? '—'}</td>
                <td className={tdCls}>{e.site.operational ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {!pageRows.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-[12px] text-muted">{d.siteCategory ? 'No sites match the filters.' : 'Choose the vertical and site category to list sites.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="sites" />
      {result && <RunResultModal result={result} onClose={() => setResult(null)} />}
    </section>
  )
}

// ── Rule-based mapping: all sites matching a rule → plan ──────────────────────
export function RuleMapping() {
  const plans = usePlans()
  const { sites } = useSites()
  const { d, set } = useDraft()
  const [rule, setRule] = useState({ type: '', state: '', district: '', operational: true })
  const [show, setShow] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const errors = validateMapBasics(d, plans)

  const pool = useMemo(() => (d.vertical && d.siteCategory ? sites.map(entityOf).filter((e) => e.vertical === d.vertical && e.category === d.siteCategory) : []), [sites, d.vertical, d.siteCategory])
  const states = useMemo(() => [...new Set(pool.map((e) => e.state))].sort(), [pool])
  const types = useMemo(() => [...new Set(pool.map((e) => e.site.siteType))].sort(), [pool])
  const districts = useMemo(() => [...new Set(pool.filter((e) => !rule.state || e.state === rule.state).map((e) => e.city))].sort(), [pool, rule.state])
  const matched = pool.filter((e) => (!rule.type || e.site.siteType === rule.type) && (!rule.state || e.state === rule.state) && (!rule.district || e.city === rule.district) && (!rule.operational || e.site.operational))
  const ruleText = [
    `Vertical = ${d.vertical || '?'}`, `Category = ${d.siteCategory || '?'}`, rule.type && `Site type = ${rule.type}`, rule.state && `State = ${rule.state}`,
    rule.district && `District = ${rule.district}`, rule.operational && 'Operational only',
  ].filter(Boolean).join('; ')

  const apply = () => {
    setShow(true)
    if (Object.keys(errors).length) return toast('Complete the plan, beneficiary and period first', 'error')
    if (!matched.length) return toast('No sites match this rule', 'error')
    const r = runMappings(d, matched.map((e) => e.site), 'Rule-based', ruleText)
    setResult({ title: 'Rule-based mapping result', ...r })
  }

  return (
    <section className="space-y-4 rounded-xl border border-line bg-white p-4">
      <SectionBar icon={<Wand2 size={16} />} title="Rule-based Mapping" sub="Map every site that matches a rule (e.g. all FFM sites in a state) to a plan. Each resulting mapping still goes through maker-checker." />
      <PlanPicker d={d} set={set} errors={show ? errors : {}} />
      <div>
        <StepLabel n={4} required>Rule</StepLabel>
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-surface px-3 py-2.5">
          <select value={rule.type} onChange={(e) => setRule((r) => ({ ...r, type: e.target.value }))} aria-label="Site type" className={cn(inputCls, 'h-9 w-[170px] border-line')}>
            <option value="">Any site type</option>{types.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={rule.state} onChange={(e) => setRule((r) => ({ ...r, state: e.target.value, district: '' }))} aria-label="State" className={cn(inputCls, 'h-9 w-[190px] border-line')}>
            <option value="">Any state</option>{states.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={rule.district} onChange={(e) => setRule((r) => ({ ...r, district: e.target.value }))} aria-label="District" className={cn(inputCls, 'h-9 w-[190px] border-line')}>
            <option value="">Any district</option>{districts.map((s) => <option key={s}>{s}</option>)}
          </select>
          <Checkbox checked={rule.operational} onChange={(v) => setRule((r) => ({ ...r, operational: v }))} label={<span className="text-[12px]">Operational sites only</span>} />
        </div>
        <p className="mt-1.5 text-[12px] text-ink-2"><b>{matched.length}</b> site(s) match: <span className="text-muted">{ruleText}</span></p>
        {matched.length > 0 && <p className="mt-0.5 text-[11px] text-muted">{matched.slice(0, 12).map((e) => e.site.atmId).join(', ')}{matched.length > 12 ? ` … +${matched.length - 12} more` : ''}</p>}
      </div>
      <BeneficiaryAndDates d={d} set={set} errors={show ? errors : {}} n0={5} />
      <div className="flex justify-end border-t border-line pt-3">
        <Button variant="bright" className="w-[220px]" icon={<Send size={14} />} onClick={apply}>Apply rule ({matched.length})</Button>
      </div>
      {result && <RunResultModal result={result} onClose={() => setResult(null)} />}
    </section>
  )
}
