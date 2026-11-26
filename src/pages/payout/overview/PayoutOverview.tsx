import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, ListChecks, RotateCcw, Settings2, Sparkles, Upload, PencilLine, RefreshCw, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthLabel, pendingRuleCount, sumP } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { AiIntelligence } from './AiIntelligence'
import { buildView, emptyFilters, fyOfMonth, inr0, optionLists, useModel, type Filters, type VerticalSel } from './compute'
import { ReportCatalogue } from './Reports'
import { BusinessSection, ConsolidatedSection, FranchiseSection, PnlSection, ReconSection } from './Sections'
import { FInput, FSelect, Kpi, SectionTabs } from './ui'

const TABS = ['Consolidated', 'Franchise Model', 'Business Model', 'Reconciliation Analytics', 'Profit & Loss', 'AI Financial Intelligence', 'MIS & Reports'] as const
type Tab = (typeof TABS)[number]

export default function PayoutOverview() {
  const m = useModel()
  const init = () => emptyFilters(m.latestMonth, m.latestMonth ? fyOfMonth(m.latestMonth) : '2026-27')
  const [draft, setDraft] = useState<Filters>(init)
  const [f, setF] = useState<Filters>(init)
  const [tab, setTab] = useState<Tab>('Consolidated')
  const opts = useMemo(() => optionLists(m), [m])
  const v = useMemo(() => buildView(m, f), [m, f])
  const set = (k: keyof Filters) => (val: string) =>
    setDraft((x) => {
      const n = { ...x, [k]: val }
      if (k === 'vertical') Object.assign(n, { category: '', businessModel: '', franchisee: '', tl: '', payoutStatus: '', batch: '', smf: '', mf: '' })
      if (k === 'state') n.city = ''
      return n
    })
  const apply = () => setF(draft)
  const reset = () => {
    const x = init()
    setDraft(x)
    setF(x)
  }

  const k = useMemo(() => {
    const frSites = new Set(v.fr.map((r) => r.atmId)).size
    const bmSites = new Set(v.bm.map((r) => r.site.atmId)).size
    const loss = v.bm.filter((r) => r.pnl.status === 'Loss Making')
    const prof = v.bm.filter((r) => r.pnl.status === 'Profitable')
    const pending = v.fr.filter((r) => r.payStatus !== 'Paid')
    const variance = v.fr.filter((r) => r.recon === 'Variance Found')
    const tl = m.snap.tl.shares.filter((x) => (!f.month || x.month === f.month) && (!f.tl || x.tlId === f.tl) && f.vertical !== 'Business Model')
    return {
      frSites, bmSites, loss, prof, pending, variance, tl: sumP(tl.map((x) => x.share)), tlN: tl.length,
      frNet: sumP(v.fr.map((r) => r.line.net)), mfNet: sumP(v.mf.map((x) => x.net)),
      bmRecv: sumP(v.bm.map((r) => r.pnl.received)), bmExp: sumP(v.bm.map((r) => r.pnl.total)), bmOverall: sumP(v.bm.map((r) => r.pnl.net)),
    }
  }, [v, m.snap, f])
  const pendingRules = pendingRuleCount(m.snap.rules)
  const isFr = f.vertical !== 'Business Model'
  const isBm = f.vertical !== 'Franchise Model'
  const dv = draft.vertical
  const cats = dv === 'Business Model' ? opts.bmCategories : dv === 'Franchise Model' ? opts.frCategories.map((c) => ({ value: `FR|${c}`, label: c })) : [...opts.frCategories.map((c) => ({ value: `FR|${c}`, label: `FR · ${c}` })), ...opts.bmCategories]
  const smfs = dv === 'Business Model' ? opts.smfBm : dv === 'Franchise Model' ? opts.smfFr : [...new Set([...opts.smfFr, ...opts.smfBm])].sort()
  const mfs = dv === 'Business Model' ? opts.mfBm : dv === 'Franchise Model' ? opts.mfFr : [...new Set([...opts.mfFr, ...opts.mfBm])].sort()
  const goAi = () => setTab('AI Financial Intelligence')

  return (
    <PayoutPage
      title="Payout Overview & Reconciliation"
      sub="Consolidated view of File Payout, Manual Payout and Auto Reconciliation with cross-checks, variance analysis, P&L and AI insights — Franchise Model and Business Model reported separately."
      crumbs={['Payout Overview']}
      actions={
        <>
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-violet-600 px-2.5 text-[11px] font-semibold text-white"><Sparkles size={12} /> AI Powered</span>
          <Link to="/finance/payouts/monthly"><Button variant="secondary" icon={<Upload size={14} />}>File-Based Payout</Button></Link>
          <Link to="/finance/payouts/monthly"><Button variant="secondary" icon={<PencilLine size={14} />}>Manual Payout</Button></Link>
          <Link to="/finance/payouts/monthly"><Button variant="secondary" icon={<RefreshCw size={14} />}>Auto Reconciliation & Payout</Button></Link>
        </>
      }
    >
      {/* global filters §4.1 — dynamic per vertical */}
      <section className="rounded-xl border border-line bg-white p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <FSelect label="Financial Year" required value={draft.fy} onChange={set('fy')} options={m.fys.length ? m.fys : ['2026-27']} all="All years" />
          <FSelect label="Payout Month" required value={draft.month} onChange={set('month')} options={m.months.map((x) => ({ value: x, label: monthLabel(x) }))} all="All months" />
          <FSelect label="Business Vertical" value={dv} onChange={set('vertical')} options={['Consolidated', 'Franchise Model', 'Business Model'] as VerticalSel[]} all={null} />
          <FSelect label="Site Category" value={draft.category} onChange={set('category')} options={cats} all="All categories" />
          {dv !== 'Franchise Model' && <FSelect label="Business Model" value={draft.businessModel} onChange={set('businessModel')} options={opts.businessModels} />}
          <FSelect label="State" value={draft.state} onChange={set('state')} options={opts.states} />
          <FSelect label="City" value={draft.city} onChange={set('city')} options={opts.citiesFor(draft.state)} />
          <FInput label="ATM ID / Site ID" value={draft.atm} onChange={set('atm')} placeholder="e.g. MPZA1234" />
          <FSelect label="Super MF" value={draft.smf} onChange={set('smf')} options={smfs} />
          <FSelect label="Master Franchise" value={draft.mf} onChange={set('mf')} options={mfs} />
          {dv !== 'Business Model' && (
            <>
              <FSelect label="Payout Batch" value={draft.batch} onChange={set('batch')} options={opts.batches} all="All batches" />
              <FSelect label="Franchisee" value={draft.franchisee} onChange={set('franchisee')} options={opts.franchisees} all="All franchisees" />
              <FSelect label="Team Leader" value={draft.tl} onChange={set('tl')} options={opts.tls} />
              <FSelect label="Payout Status" value={draft.payoutStatus} onChange={set('payoutStatus')} options={['Pending', 'Paid', 'Hold', 'Failed']} />
            </>
          )}
          <FSelect label="Reconciliation Status" value={draft.reconStatus} onChange={set('reconStatus')} options={dv === 'Business Model' ? ['Matched', 'Pending'] : ['Matched', 'Variance', 'Pending']} />
          <div className="flex items-end gap-2">
            <Button icon={<Filter size={14} />} onClick={apply}>Apply Filter</Button>
            <Button variant="secondary" onClick={reset} aria-label="Reset filters" title="Reset filters"><RotateCcw size={14} /></Button>
          </div>
        </div>
        {dv === 'Consolidated' && <p className="mt-2 text-[11px] text-muted">Consolidated view: Franchise-only filters (batch, franchisee, team leader, payout status, FR category) exclude Business Model records, and BM-only filters exclude Franchise records — verticals are never cross-included.</p>}
      </section>

      {pendingRules > 0 && (
        <Link to="/finance/payouts/rules" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-900 hover:bg-amber-50">
          <Settings2 size={14} /> {pendingRules} business rules are pending Finance sign-off (§21). Affected figures are provisional — review Finance rules →
        </Link>
      )}

      {/* 12 KPIs §4.2 — kept as separate figures, never merged */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi n="01" label="Total Active Sites" value={k.frSites + k.bmSites} caption={`${k.frSites} FR + ${k.bmSites} BM`} onClick={() => setTab('Consolidated')} />
        <Kpi n="02" label="Franchise Model Sites" value={isFr ? k.frSites : '—'} caption="Sites with payout records" to={`/finance/payouts/franchise?month=${f.month}`} />
        <Kpi n="03" label="Business Model Sites" value={isBm ? k.bmSites : '—'} caption="Active BM sites" onClick={() => setTab('Business Model')} />
        <Kpi n="04" label="Franchisee Net Payout" value={inr0(k.frNet)} caption="Franchisee payable" to={`/finance/payouts/franchise?month=${f.month}`} />
        <Kpi n="05" label="MF Net Payout" value={inr0(k.mfNet)} caption={`${v.mf.length} MFs · provisional`} to={`/finance/payouts/mf?month=${f.month}`} />
        <Kpi n="06" label="Team Leader Share" value={inr0(k.tl)} caption={k.tlN ? `${k.tlN} approved shares` : 'No share — rule pending §21-02'} tone={k.tlN ? 'blue' : 'gray'} to="/finance/payouts/team-leader" />
        <Kpi n="07" label="BM Total Payout" value={inr0(k.bmRecv)} caption="Payout received" onClick={() => setTab('Business Model')} />
        <Kpi n="08" label="BM Total Expenses" value={inr0(k.bmExp)} caption="Operating expenses" tone="amber" onClick={() => setTab('Business Model')} />
        <Kpi n="09" label="BM Net Profit" value={inr0(sumP(k.prof.map((r) => r.pnl.net)))} caption={`${k.prof.length} profitable sites · overall ${inr0(k.bmOverall)}`} tone="green" onClick={() => setTab('Profit & Loss')} />
        <Kpi n="10" label="BM Net Loss" value={inr0(sumP(k.loss.map((r) => r.pnl.net)))} caption={`${k.loss.length} loss-making sites`} tone={k.loss.length ? 'red' : 'gray'} onClick={() => setTab('Profit & Loss')} />
        <Kpi n="11" label="Pending Payout" value={inr0(sumP(k.pending.map((r) => r.line.net)))} caption={`${k.pending.length} unreleased / unpaid lines`} tone="amber" to={`/finance/payouts/franchise?month=${f.month}&status=Pending`} />
        <Kpi n="12" label="Reconciliation Variance" value={inr0(sumP(k.variance.map((r) => r.maxAbs)))} caption={`${k.variance.length} ATMs unresolved`} tone={k.variance.length ? 'amber' : 'green'} onClick={() => setTab('Reconciliation Analytics')} />
      </div>

      <SectionTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'Consolidated' && <ConsolidatedSection m={m} v={v} month={f.month} onAnalyze={goAi} />}
      {tab === 'Franchise Model' && (isFr ? <FranchiseSection m={m} v={v} month={f.month} /> : <Empty text="Business Vertical filter is set to Business Model." />)}
      {tab === 'Business Model' && (isBm ? <BusinessSection v={v} /> : <Empty text="Business Vertical filter is set to Franchise Model." />)}
      {tab === 'Reconciliation Analytics' && <ReconSection m={m} v={v} month={f.month} onAnalyze={goAi} />}
      {tab === 'Profit & Loss' && <PnlSection m={m} v={v} />}
      {tab === 'AI Financial Intelligence' && <AiIntelligence m={m} v={v} month={f.month} />}
      {tab === 'MIS & Reports' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link to="/finance/payouts/reports"><Button variant="secondary" icon={<ListChecks size={14} />}>Open MIS & Reports</Button></Link>
            <Link to="/finance/payouts/rules"><Button variant="secondary" icon={<Settings2 size={14} />}>Finance sign-off rules</Button></Link>
            <Link to="/finance/payouts/audit"><Button variant="secondary" icon={<ScrollText size={14} />}>Payout audit log</Button></Link>
          </div>
          <ReportCatalogue />
        </div>
      )}
    </PayoutPage>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center text-[13px] text-muted">{text}</div>
}
