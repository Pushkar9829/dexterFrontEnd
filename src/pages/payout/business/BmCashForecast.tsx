import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, Banknote, Building, Check, Coins, FileSpreadsheet, HandCoins, Pencil, RotateCcw, Search, Send, X } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { apiEnabled, apiForecastStatus, apiSaveForecast } from '@/data/payoutApi'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { useSites } from '@/data/network'
import { businessStore, fromPaise, inrP, logPayout, pid, sumP, useBusiness, type ForecastRow, nowIso } from '@/data/payout'
import { actor, checkerBlock, fmtDate, metaOf, parseRupees, rupeesInput, today, touchMeta, useBmLocal } from './bmStore'
import { DataTable, FilterSelect, Kpi, Money, OpsPage, Panel, TableBar, type Col } from './ui'

type Kind = 'BM' | 'FFM'
type Filters = { date: string; bank: string; state: string; city: string; atm: string; status: string }
type Entry = { id: string | null; atmId: string; cra: string; morning: string; dispensed: string; today: string; required: string; reason: string }
const EMPTY_ENTRY: Entry = { id: null, atmId: '', cra: 'CMS', morning: '', dispensed: '', today: '0', required: '', reason: '' }
const CRA = ['CMS', 'SIS', 'Writer', 'Brinks', 'Other']
const STATUSES: ForecastRow['status'][] = ['Draft', 'Submitted', 'Approved', 'Rejected']

/** BM / FFM / ALF segmented switch used on the forecast screens. */
export function ForecastSwitch({ value, onChange }: { value: 'BM' | 'FFM' | 'ALF'; onChange: (v: 'BM' | 'FFM' | 'ALF') => void }) {
  return (
    <div className="flex rounded-xl border border-blue-200 bg-white p-1 shadow-sm">
      {(['BM', 'FFM', 'ALF'] as const).map((k) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={cn('h-9 w-[96px] rounded-lg text-[14px] font-bold transition-colors', value === k ? 'bg-[#0066FF] text-white' : 'text-slate-800 hover:bg-blue-50')}>
          {k}
        </button>
      ))}
    </div>
  )
}

export default function BmCashForecast() {
  const navigate = useNavigate()
  const b = useBusiness()
  const sites = useSites()
  const local = useBmLocal()
  const [kind, setKind] = useState<Kind>('BM')
  const latest = useMemo(() => b.forecasts.map((f) => f.date).sort().reverse()[0] ?? today(), [b.forecasts])
  const init: Filters = { date: latest, bank: 'all', state: 'all', city: 'all', atm: '', status: 'all' }
  const [pending, setPending] = useState<Filters>(init)
  const [applied, setApplied] = useState<Filters>(init)
  const [dateErr, setDateErr] = useState('')
  const [entry, setEntry] = useState<Entry>(EMPTY_ENTRY)
  const [entryErr, setEntryErr] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())

  const siteMap = useMemo(() => new Map(sites.sites.map((s) => [s.atmId, s])), [sites.sites])
  const eligibleAtms = useMemo(
    () => (kind === 'BM' ? b.bmSites.filter((s) => s.approval === 'Approved' && s.status === 'Active').map((s) => s.atmId) : sites.sites.filter((s) => s.siteType === 'FFM').map((s) => s.atmId)),
    [kind, b.bmSites, sites.sites],
  )
  const kindRows = useMemo(() => b.forecasts.filter((f) => f.kind === kind), [b.forecasts, kind])
  const opts = useMemo(() => ({
    banks: [...new Set(kindRows.map((r) => r.bank))].sort(),
    states: [...new Set(kindRows.map((r) => r.state))].sort(),
    cities: [...new Set(kindRows.filter((r) => pending.state === 'all' || r.state === pending.state).map((r) => r.city))].sort(),
  }), [kindRows, pending.state])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const a = applied
    return kindRows.filter(
      (r) =>
        r.date === a.date &&
        (a.bank === 'all' || r.bank === a.bank) &&
        (a.state === 'all' || r.state === a.state) &&
        (a.city === 'all' || r.city === a.city) &&
        (a.status === 'all' || r.status === a.status) &&
        (!a.atm.trim() || r.atmId.toLowerCase().includes(a.atm.trim().toLowerCase())) &&
        (!s || `${r.atmId} ${r.city} ${r.bank} ${r.state} ${r.nodalBranch}`.toLowerCase().includes(s)),
    )
  }, [kindRows, applied, q])

  const kpi = useMemo(() => {
    const siteCount =
      kind === 'BM'
        ? b.bmSites.filter((s) => s.status === 'Active' && s.approval === 'Approved' && (applied.state === 'all' || s.state === applied.state) && (applied.city === 'all' || s.city === applied.city)).length
        : sites.sites.filter((s) => s.siteType === 'FFM' && (applied.state === 'all' || s.state === applied.state) && (applied.city === 'all' || s.district === applied.city)).length
    return { siteCount, morning: sumP(rows.map((r) => r.morningBalance)), dispensed: sumP(rows.map((r) => r.dispensed)), today: sumP(rows.map((r) => r.todaysIndent)), required: sumP(rows.map((r) => r.requiredIndent)) }
  }, [rows, kind, b.bmSites, sites.sites, applied])

  const search = () => {
    if (!pending.date) {
      setDateErr('Forecast date is required')
      return
    }
    setDateErr('')
    setApplied(pending)
    setSel(new Set())
  }
  const reset = () => {
    setPending(init)
    setApplied(init)
    setDateErr('')
    setSel(new Set())
  }

  const switchKind = (k: 'BM' | 'FFM' | 'ALF') => {
    if (k === 'ALF') {
      navigate('/operations/alf-forecast')
      return
    }
    setKind(k)
    setEntry(EMPTY_ENTRY)
    setEntryErr({})
    setSel(new Set())
  }

  const saveEntry = () => {
    const e: Record<string, string> = {}
    const v = { morning: parseRupees(entry.morning), dispensed: parseRupees(entry.dispensed), today: parseRupees(entry.today || '0'), required: parseRupees(entry.required) }
    if (!applied.date) e.atmId = 'Pick a forecast date first'
    if (!entry.atmId) e.atmId = `Select a ${kind} ATM`
    else if (!eligibleAtms.includes(entry.atmId)) e.atmId = `${entry.atmId} is not an active ${kind} site`
    if (!Number.isFinite(v.morning) || v.morning < 0) e.morning = 'Invalid amount'
    if (!Number.isFinite(v.dispensed) || v.dispensed < 0) e.dispensed = 'Invalid amount'
    if (!Number.isFinite(v.today) || v.today < 0) e.today = 'Invalid amount'
    if (!Number.isFinite(v.required) || v.required <= 0) e.required = 'Required revised indent must be > 0'
    if (Number.isFinite(v.required) && Number.isFinite(v.today) && v.required !== v.today && !entry.reason.trim()) e.reason = 'Reason is required when the revised indent differs'
    if (!entry.id && entry.atmId && b.forecasts.some((f) => f.kind === kind && f.date === applied.date && f.atmId === entry.atmId)) e.atmId = `${entry.atmId} already has a forecast for ${fmtDate(applied.date)} — edit it in the list`
    setEntryErr(e)
    if (Object.keys(e).length) return
    const site = siteMap.get(entry.atmId)
    const bm = b.bmSites.find((s) => s.atmId === entry.atmId)
    const base = {
      date: applied.date, kind, atmId: entry.atmId, state: bm?.state ?? site?.state ?? '—', city: bm?.city ?? site?.district ?? '—', bank: site?.account?.bank ?? 'Axis Bank',
      nodalBranch: bm?.city ?? site?.district ?? '—', craFeasibility: entry.cra, morningBalance: v.morning, dispensed: v.dispensed, todaysIndent: v.today, requiredIndent: v.required, reason: entry.reason.trim(),
    }
    if (entry.id) {
      const id = entry.id
      businessStore.set((s) => ({ ...s, forecasts: s.forecasts.map((f) => (f.id === id ? { ...f, ...base, status: 'Draft' } : f)) }))
      touchMeta('forecastMeta', id, 'Edited', `Required indent ${inrP(v.required, 0)}`)
      if (apiEnabled) void apiSaveForecast(id, base)
      toast(`Forecast for ${entry.atmId} updated`)
    } else {
      const id = pid('FC')
      businessStore.set((s) => ({ ...s, forecasts: [{ id, ...base, status: 'Draft' }, ...s.forecasts] }))
      touchMeta('forecastMeta', id, 'Created')
      if (apiEnabled) void apiSaveForecast(null, base)
      toast(`Forecast for ${entry.atmId} added as Draft`)
    }
    setEntry(EMPTY_ENTRY)
  }

  const edit = (r: ForecastRow) => {
    if (r.status === 'Submitted' || r.status === 'Approved') {
      toast(`${r.status} forecasts cannot be edited`, 'error')
      return
    }
    setEntry({ id: r.id, atmId: r.atmId, cra: r.craFeasibility, morning: rupeesInput(r.morningBalance), dispensed: rupeesInput(r.dispensed), today: rupeesInput(r.todaysIndent), required: rupeesInput(r.requiredIndent), reason: r.reason })
    setEntryErr({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const bulk = (to: 'Submitted' | 'Approved' | 'Rejected') => {
    const chosen = rows.filter((r) => sel.has(r.id))
    if (!chosen.length) {
      toast('Select at least one forecast', 'error')
      return
    }
    const from: ForecastRow['status'][] = to === 'Submitted' ? ['Draft', 'Rejected'] : ['Submitted']
    let eligible = chosen.filter((r) => from.includes(r.status))
    let skipped = chosen.length - eligible.length
    if (to !== 'Submitted') {
      const blocked = eligible.filter((r) => checkerBlock(metaOf(local, 'forecastMeta', r.id).maker))
      if (blocked.length) {
        const reason = checkerBlock(metaOf(local, 'forecastMeta', blocked[0].id).maker)
        toast(`${blocked.length} skipped: ${reason}`, 'error')
      }
      eligible = eligible.filter((r) => !checkerBlock(metaOf(local, 'forecastMeta', r.id).maker))
      skipped = chosen.length - eligible.length
    }
    if (!eligible.length) {
      toast(`No selected forecast can be ${to.toLowerCase()} (needs status ${from.join(' / ')})`, 'error')
      return
    }
    const ids = new Set(eligible.map((r) => r.id))
    businessStore.set((s) => ({ ...s, forecasts: s.forecasts.map((f) => (ids.has(f.id) ? { ...f, status: to } : f)) }))
    if (apiEnabled) void apiForecastStatus([...ids], to)
    eligible.forEach((r) => touchMeta('forecastMeta', r.id, to, undefined, to === 'Submitted' ? {} : { checker: actor(), checkedAt: nowIso() }))
    logPayout({ by: actor(), area: `${kind} Cash Forecast`, ref: applied.date, action: `${ids.size} forecast(s) ${to.toLowerCase()}` })
    setSel(new Set())
    toast(`${ids.size} forecast(s) ${to.toLowerCase()}${skipped ? ` · ${skipped} skipped` : ''}`)
  }

  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.id))
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const cols: Col<ForecastRow>[] = [
    { key: 'sel', header: <input type="checkbox" aria-label="Select all" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} />, render: (r) => <input type="checkbox" aria-label={`Select ${r.atmId}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} /> },
    { key: 'atm', header: 'ATM ID', render: (r) => <b className="text-slate-900">{r.atmId}</b>, footer: `Total (${rows.length} Sites)` },
    { key: 'st', header: 'State', render: (r) => r.state },
    { key: 'city', header: 'City', render: (r) => r.city },
    { key: 'bank', header: 'Bank', render: (r) => r.bank },
    { key: 'nb', header: 'Nodal Branch', render: (r) => r.nodalBranch },
    { key: 'cra', header: 'CRA Feasibility', render: (r) => r.craFeasibility },
    { key: 'mb', header: 'Morning Balance (₹)', className: 'text-right', render: (r) => <Money p={r.morningBalance} />, footer: <Money p={kpi.morning} /> },
    { key: 'cd', header: 'Cash Dispensed (₹)', className: 'text-right', render: (r) => <Money p={r.dispensed} />, footer: <Money p={kpi.dispensed} /> },
    { key: 'ti', header: "Today's Indent (₹)", className: 'text-right', render: (r) => <Money p={r.todaysIndent} />, footer: <Money p={kpi.today} /> },
    { key: 'ri', header: 'Required Revised Indent (₹)', className: 'text-right', render: (r) => <Money p={r.requiredIndent} className="font-semibold" />, footer: <Money p={kpi.required} /> },
    { key: 'rs', header: 'Reason for Revised Indent', render: (r) => <span className="line-clamp-2 max-w-[240px]">{r.reason || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={toneFor(r.status)}>{r.status}</Badge> },
    { key: 'act', header: 'Action', render: (r) => <button type="button" aria-label={`Edit ${r.atmId}`} className="text-[#0066FF] disabled:text-slate-300" disabled={r.status === 'Submitted' || r.status === 'Approved'} onClick={() => edit(r)}><Pencil size={15} /></button> },
  ]

  const exportCsv = () =>
    downloadCsv(`${kind.toLowerCase()}_cash_forecast_${applied.date}`, ['ATM ID', 'State', 'City', 'Bank', 'Nodal Branch', 'CRA Feasibility', 'Morning Balance (₹)', 'Cash Dispensed (₹)', "Today's Indent (₹)", 'Required Revised Indent (₹)', 'Reason', 'Status'],
      rows.map((r) => [r.atmId, r.state, r.city, r.bank, r.nodalBranch, r.craFeasibility, String(fromPaise(r.morningBalance)), String(fromPaise(r.dispensed)), String(fromPaise(r.todaysIndent)), String(fromPaise(r.requiredIndent)), r.reason, r.status]))

  const amt = (k: 'morning' | 'dispensed' | 'today' | 'required', label: string) => (
    <td className="px-2 py-2 align-top">
      <input aria-label={label} inputMode="decimal" value={entry[k]} onChange={(e) => setEntry((x) => ({ ...x, [k]: e.target.value }))} className={cn('h-8 w-28 rounded-md border px-2 text-right text-[12px] outline-none focus:border-primary', entryErr[k] ? 'border-brand-red' : 'border-line')} />
      {entryErr[k] && <div className="mt-0.5 text-[10.5px] text-brand-red">{entryErr[k]}</div>}
    </td>
  )
  const entrySite = siteMap.get(entry.atmId)
  const entryBm = b.bmSites.find((s) => s.atmId === entry.atmId)

  return (
    <OpsPage title={`${kind} Site Cash Forecast`} crumbs={[`${kind} Site Cash Forecast`]} icon={BarChart3} actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* cross-link: the ALF Register holds the additional-loading-fund requests raised from these forecasts */}
          <Link to="/operations/alf" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-[12.5px] font-semibold text-[#0066FF] shadow-sm hover:bg-blue-50">
            <BookOpen size={14} /> ALF Register
          </Link>
          <ForecastSwitch value={kind} onChange={switchKind} />
        </div>
      }>
      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="block min-w-[150px]">
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">Forecast Date *</span>
          <input type="date" value={pending.date} onChange={(e) => setPending((p) => ({ ...p, date: e.target.value }))} className={cn('h-8.5 w-full rounded-lg border bg-white px-2.5 text-[12px] outline-none focus:border-[#0066FF]', dateErr ? 'border-brand-red' : 'border-slate-200')} />
          {dateErr && <span className="mt-0.5 block text-[10.5px] text-brand-red">{dateErr}</span>}
        </label>
        <FilterSelect label="Bank" value={pending.bank} onChange={(v) => setPending((p) => ({ ...p, bank: v }))} options={opts.banks} all="All Banks" />
        <FilterSelect label="State" value={pending.state} onChange={(v) => setPending((p) => ({ ...p, state: v, city: 'all' }))} options={opts.states} all="All States" />
        <FilterSelect label="City" value={pending.city} onChange={(v) => setPending((p) => ({ ...p, city: v }))} options={opts.cities} all="All Cities" />
        <label className="block min-w-[150px]">
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">ATM ID</span>
          <input value={pending.atm} onChange={(e) => setPending((p) => ({ ...p, atm: e.target.value }))} placeholder="Search ATM ID" className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-[#0066FF]" />
        </label>
        <FilterSelect label="Forecast Status" value={pending.status} onChange={(v) => setPending((p) => ({ ...p, status: v }))} options={STATUSES} all="All Status" />
        <div className="ml-auto flex gap-2">
          <Button icon={<Search size={14} />} onClick={search}>Search</Button>
          <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={`Total ${kind} Sites`} value={kpi.siteCount} icon={Building} />
        <Kpi label="Total Morning Balance" value={inrP(kpi.morning, 0)} icon={Coins} />
        <Kpi label="Total Cash Dispensed" value={inrP(kpi.dispensed, 0)} icon={Banknote} />
        <Kpi label="Total Fund Required" value={inrP(kpi.required, 0)} icon={HandCoins} tone="green" />
      </div>

      <Panel title={`Daily ${kind} Site Cash Forecast`} sub={`${entry.id ? 'Editing' : 'New entry'} for ${fmtDate(applied.date)}`} action={<Button variant="secondary" icon={<FileSpreadsheet size={14} />} onClick={exportCsv}>Export Excel</Button>}>
        <div className="scroll-thin overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1250px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>{['ATM ID', 'State', 'City', 'Bank', 'Nodal Branch', 'CRA Feasibility', 'Morning Balance (₹)', 'Cash Dispensed (₹)', "Today's Indent (₹)", 'Required Revised Indent (₹)', 'Reason for Revised Indent', 'Action'].map((h) => <th key={h} className="px-2 py-2.5 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-2 align-top">
                  <input aria-label="ATM ID" list="fc-atms" value={entry.atmId} disabled={!!entry.id} onChange={(e) => setEntry((x) => ({ ...x, atmId: e.target.value.trim() }))} placeholder={`${kind} ATM`} className={cn('h-8 w-32 rounded-md border px-2 text-[12px] outline-none focus:border-primary disabled:bg-surface', entryErr.atmId ? 'border-brand-red' : 'border-line')} />
                  <datalist id="fc-atms">{eligibleAtms.slice(0, 200).map((a) => <option key={a} value={a} />)}</datalist>
                  {entryErr.atmId && <div className="mt-0.5 max-w-[200px] text-[10.5px] text-brand-red">{entryErr.atmId}</div>}
                </td>
                <td className="px-2 py-2 align-top">{entryBm?.state ?? entrySite?.state ?? '—'}</td>
                <td className="px-2 py-2 align-top">{entryBm?.city ?? entrySite?.district ?? '—'}</td>
                <td className="px-2 py-2 align-top">{entrySite?.account?.bank ?? (entry.atmId ? 'Axis Bank' : '—')}</td>
                <td className="px-2 py-2 align-top">{entryBm?.city ?? entrySite?.district ?? '—'}</td>
                <td className="px-2 py-2 align-top">
                  <select aria-label="CRA feasibility" value={entry.cra} onChange={(e) => setEntry((x) => ({ ...x, cra: e.target.value }))} className="h-8 rounded-md border border-line px-1.5 text-[12px]">{CRA.map((c) => <option key={c}>{c}</option>)}</select>
                </td>
                {amt('morning', 'Morning balance')}
                {amt('dispensed', 'Cash dispensed')}
                {amt('today', "Today's indent")}
                {amt('required', 'Required revised indent')}
                <td className="px-2 py-2 align-top">
                  <textarea aria-label="Reason" rows={2} value={entry.reason} onChange={(e) => setEntry((x) => ({ ...x, reason: e.target.value }))} className={cn('w-56 rounded-md border px-2 py-1 text-[12px] outline-none focus:border-primary', entryErr.reason ? 'border-brand-red' : 'border-line')} />
                  {entryErr.reason && <div className="text-[10.5px] text-brand-red">{entryErr.reason}</div>}
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" onClick={saveEntry}>{entry.id ? 'Update' : 'Add'}</Button>
                    {(entry.id || entry.atmId) && <Button size="sm" variant="secondary" onClick={() => { setEntry(EMPTY_ENTRY); setEntryErr({}) }}>Clear</Button>}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.id}
        noun="records"
        minWidth={1500}
        showFooter
        empty={`No ${kind} forecasts for ${fmtDate(applied.date)} with these filters.`}
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Search by ATM ID, City, Bank…" onDownload={exportCsv}
            right={
              <>
                <span className="text-[11.5px] text-slate-500">{sel.size} selected</span>
                <Button size="sm" variant="secondary" icon={<Send size={13} />} onClick={() => bulk('Submitted')}>Submit</Button>
                <Button size="sm" variant="secondary" icon={<Check size={13} />} onClick={() => bulk('Approved')}>Approve</Button>
                <Button size="sm" variant="danger" icon={<X size={13} />} onClick={() => bulk('Rejected')}>Reject</Button>
              </>
            }>
            <span className="self-center text-[15px] font-bold text-slate-900">Daily Forecast List</span>
          </TableBar>
        }
      />
    </OpsPage>
  )
}
