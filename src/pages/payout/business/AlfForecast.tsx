import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Check, Coins, Database, FileSpreadsheet, Monitor, Pencil, Plus, RotateCcw, Search, Send, Trash2, Undo2, Upload, X } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { apiAlfStatus, apiDeleteAlf, apiEnabled, apiSaveAlf } from '@/data/payoutApi'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { useSites, type Site } from '@/data/network'
import { businessStore, fromPaise, inrP, logPayout, pid, sumP, useBusiness, type AlfRow, nowIso } from '@/data/payout'
import { actor, checkerBlock, fmtDate, fmtDateTime, metaOf, parseRupees, rupeesInput, today, touchMeta, useBmLocal } from './bmStore'
import { ForecastSwitch } from './BmCashForecast'
import { DataTable, FilterSelect, FixedTabs, Kpi, Money, Note, OpsPage, Panel, TableBar, type Col } from './ui'

type Tab = 'forecast' | 'history' | 'approval' | 'report'
type Filters = { type: string; from: string; to: string; bank: string; state: string; city: string; atm: string }
type Entry = { id: string | null; atmId: string; type: '' | AlfRow['type']; start: string; reversal: string; amount: string; purpose: string }
type Loc = { state: string; city: string; bank: string }
const EMPTY: Entry = { id: null, atmId: '', type: '', start: '', reversal: '', amount: '', purpose: '' }
const MAX_DAYS: Record<AlfRow['type'], number> = { Weekly: 7, Monthly: 31 }
const days = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)

function parseDate(v: string): string {
  const t = v.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
}

function validate(e: Omit<Entry, 'id'>, list: AlfRow[], siteOf: (a: string) => Site | undefined, ignoreId: string | null) {
  const err: Record<string, string> = {}
  const amount = parseRupees(e.amount)
  if (!e.atmId) err.atmId = 'ATM ID is required'
  else if (!siteOf(e.atmId)) err.atmId = `${e.atmId} not found in Site Master`
  if (!e.type) err.type = 'ALF type is required'
  if (!e.start) err.start = 'Funding start date is required'
  if (!e.reversal) err.reversal = 'Funding reversal date is required'
  else if (e.start && e.reversal <= e.start) err.reversal = 'Reversal date must be after the start date'
  else if (e.start && e.type && days(e.start, e.reversal) > MAX_DAYS[e.type]) err.reversal = `${e.type} ALF can run at most ${MAX_DAYS[e.type]} days`
  if (!Number.isFinite(amount) || amount <= 0) err.amount = 'Enter a valid amount'
  if (!err.atmId && e.start && e.reversal && !err.reversal) {
    const clash = list.find((r) => r.id !== ignoreId && r.atmId.toLowerCase() === e.atmId.toLowerCase() && r.status !== 'Rejected' && r.status !== 'Reversed' && r.start < e.reversal && e.start < r.reversal)
    if (clash) err.atmId = `${e.atmId} already has ALF ${fmtDate(clash.start)}–${fmtDate(clash.reversal)} (${clash.status})`
  }
  return { err, amount }
}

export default function AlfForecast() {
  const navigate = useNavigate()
  const b = useBusiness()
  const sites = useSites()
  const local = useBmLocal()
  const [tab, setTab] = useState<Tab>('forecast')
  const siteMap = useMemo(() => new Map(sites.sites.map((s) => [s.atmId.toLowerCase(), s])), [sites.sites])
  const siteOf = (a: string) => siteMap.get(a.trim().toLowerCase())
  const locOf = useMemo(() => {
    const m = new Map<string, Loc>()
    b.alf.forEach((r) => {
      const s = siteMap.get(r.atmId.toLowerCase())
      const bm = b.bmSites.find((x) => x.atmId === r.atmId)
      m.set(r.atmId, { state: bm?.state ?? s?.state ?? '—', city: bm?.city ?? s?.district ?? '—', bank: s?.account?.bank ?? '—' })
    })
    return m
  }, [b.alf, b.bmSites, siteMap])

  const range = useMemo(() => {
    const st = b.alf.map((r) => r.start).sort()
    const rv = b.alf.map((r) => r.reversal).sort()
    return { from: st[0] ?? today(), to: rv[rv.length - 1] ?? today() }
  }, [b.alf])
  const init: Filters = { type: 'all', from: range.from, to: range.to, bank: 'all', state: 'all', city: 'all', atm: '' }
  const [pending, setPending] = useState<Filters>(init)
  const [applied, setApplied] = useState<Filters>(init)
  const [periodErr, setPeriodErr] = useState('')

  const opts = useMemo(() => {
    const ls = [...locOf.values()]
    return {
      banks: [...new Set(ls.map((l) => l.bank))].filter((x) => x !== '—').sort(),
      states: [...new Set(ls.map((l) => l.state))].sort(),
      cities: [...new Set(ls.filter((l) => pending.state === 'all' || l.state === pending.state).map((l) => l.city))].sort(),
    }
  }, [locOf, pending.state])

  const filtered = useMemo(() => {
    const a = applied
    return b.alf.filter((r) => {
      const l = locOf.get(r.atmId)
      return (
        (a.type === 'all' || r.type === a.type) &&
        (!a.from || r.reversal >= a.from) && (!a.to || r.start <= a.to) &&
        (a.bank === 'all' || l?.bank === a.bank) && (a.state === 'all' || l?.state === a.state) && (a.city === 'all' || l?.city === a.city) &&
        (!a.atm.trim() || r.atmId.toLowerCase().includes(a.atm.trim().toLowerCase()))
      )
    })
  }, [b.alf, applied, locOf])

  const kpi = useMemo(() => {
    const live = filtered.filter((r) => r.status !== 'Rejected')
    const monthly = sumP(live.filter((r) => r.type === 'Monthly').map((r) => r.amount))
    const weekly = sumP(live.filter((r) => r.type === 'Weekly').map((r) => r.amount))
    return { sites: new Set(live.map((r) => r.atmId)).size, monthly, weekly, total: monthly + weekly }
  }, [filtered])

  const search = () => {
    if (!pending.from || !pending.to) {
      setPeriodErr('Forecast period is required')
      return
    }
    if (pending.to < pending.from) {
      setPeriodErr('Period end must be on or after the start')
      return
    }
    setPeriodErr('')
    setApplied(pending)
  }
  const reset = () => {
    setPending(init)
    setApplied(init)
    setPeriodErr('')
  }

  return (
    <OpsPage title="ALF Forecast (Additional Loading Funds)" crumbs={['ALF Forecast']} icon={Database} actions={<ForecastSwitch value="ALF" onChange={(k) => k !== 'ALF' && navigate('/operations/bm-cash-forecast')} />}>
      <FixedTabs<Tab>
        value={tab}
        onChange={setTab}
        width={230}
        tabs={[
          { key: 'forecast', label: 'ALF Forecast' },
          { key: 'history', label: 'ALF History' },
          { key: 'approval', label: 'ALF Approval', count: b.alf.filter((r) => r.status === 'Submitted').length },
          { key: 'report', label: 'ALF Report' },
        ]}
      />

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <FilterSelect label="ALF Type *" value={pending.type} onChange={(v) => setPending((p) => ({ ...p, type: v }))} options={['Monthly', 'Weekly']} all="All (Monthly & Weekly)" />
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">Forecast Period *</span>
          <div className="flex items-center gap-1.5">
            <input type="date" aria-label="Period from" value={pending.from} onChange={(e) => setPending((p) => ({ ...p, from: e.target.value }))} className={cn('h-8.5 rounded-lg border bg-white px-2 text-[12px]', periodErr ? 'border-brand-red' : 'border-slate-200')} />
            <span>–</span>
            <input type="date" aria-label="Period to" value={pending.to} min={pending.from} onChange={(e) => setPending((p) => ({ ...p, to: e.target.value }))} className={cn('h-8.5 rounded-lg border bg-white px-2 text-[12px]', periodErr ? 'border-brand-red' : 'border-slate-200')} />
          </div>
          {periodErr && <span className="mt-0.5 block text-[10.5px] text-brand-red">{periodErr}</span>}
        </div>
        <FilterSelect label="Bank" value={pending.bank} onChange={(v) => setPending((p) => ({ ...p, bank: v }))} options={opts.banks} all="All Banks" />
        <FilterSelect label="State" value={pending.state} onChange={(v) => setPending((p) => ({ ...p, state: v, city: 'all' }))} options={opts.states} all="All States" />
        <FilterSelect label="City" value={pending.city} onChange={(v) => setPending((p) => ({ ...p, city: v }))} options={opts.cities} all="All Cities" />
        <label className="block min-w-[140px]">
          <span className="mb-1 block text-[11px] font-semibold text-slate-700">ATM ID</span>
          <input value={pending.atm} onChange={(e) => setPending((p) => ({ ...p, atm: e.target.value }))} placeholder="Search ATM ID" className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-[#0066FF]" />
        </label>
        <div className="ml-auto flex gap-2">
          <Button icon={<Search size={14} />} onClick={search}>Search</Button>
          <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total ATM Sites" value={kpi.sites} icon={Monitor} />
        <Kpi label="Monthly ALF (₹)" value={inrP(kpi.monthly, 0)} icon={CalendarDays} />
        <Kpi label="Weekly ALF (₹)" value={inrP(kpi.weekly, 0)} icon={CalendarDays} />
        <Kpi label="Total ALF Amount (₹)" value={inrP(kpi.total, 0)} icon={Coins} tone="green" />
      </div>

      {tab === 'forecast' && <ForecastTab rows={filtered.filter((r) => r.status === 'Draft' || r.status === 'Submitted' || r.status === 'Rejected')} all={b.alf} siteOf={siteOf} locOf={locOf} />}
      {tab === 'approval' && <ApprovalTab rows={filtered.filter((r) => r.status === 'Submitted')} makerOf={(id) => metaOf(local, 'alfMeta', id).maker} />}
      {tab === 'history' && <HistoryTab rows={filtered.filter((r) => r.status !== 'Draft')} locOf={locOf} metaOf={(id) => metaOf(local, 'alfMeta', id)} />}
      {tab === 'report' && <ReportTab rows={filtered} locOf={locOf} />}
    </OpsPage>
  )
}

const typeBadge = (t: AlfRow['type']) => <Badge tone={t === 'Monthly' ? 'blue' : 'green'} dot={false}>{t}</Badge>

function ForecastTab({ rows, all, siteOf, locOf }: { rows: AlfRow[]; all: AlfRow[]; siteOf: (a: string) => Site | undefined; locOf: Map<string, Loc> }) {
  const [entry, setEntry] = useState<Entry>(EMPTY)
  const [err, setErr] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const atmList = useMemo(() => [...new Set(all.map((r) => r.atmId))], [all])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => !s || `${r.atmId} ${r.purpose} ${locOf.get(r.atmId)?.city ?? ''} ${locOf.get(r.atmId)?.bank ?? ''}`.toLowerCase().includes(s))
  }, [rows, q, locOf])
  const total = useMemo(() => sumP(list.map((r) => r.amount)), [list])

  const save = () => {
    const { err: e, amount } = validate(entry, all, siteOf, entry.id)
    setErr(e)
    if (Object.keys(e).length || !entry.type) return
    const atmId = siteOf(entry.atmId)?.atmId ?? entry.atmId
    if (entry.id) {
      const id = entry.id
      businessStore.set((s) => ({ ...s, alf: s.alf.map((r) => (r.id === id ? { ...r, atmId, type: entry.type as AlfRow['type'], start: entry.start, reversal: entry.reversal, amount, purpose: entry.purpose.trim(), status: 'Draft' } : r)) }))
      touchMeta('alfMeta', id, 'Edited', inrP(amount, 0))
      if (apiEnabled) void apiSaveAlf(id, { atmId, type: entry.type as AlfRow['type'], start: entry.start, reversal: entry.reversal, amount, purpose: entry.purpose.trim() })
      toast(`ALF for ${atmId} updated`)
    } else {
      const id = pid('ALF')
      businessStore.set((s) => ({ ...s, alf: [{ id, atmId, type: entry.type as AlfRow['type'], start: entry.start, reversal: entry.reversal, amount, purpose: entry.purpose.trim(), status: 'Draft' }, ...s.alf] }))
      touchMeta('alfMeta', id, 'Created', inrP(amount, 0))
      if (apiEnabled) void apiSaveAlf(null, { atmId, type: entry.type as AlfRow['type'], start: entry.start, reversal: entry.reversal, amount, purpose: entry.purpose.trim() })
      toast(`ALF for ${atmId} added to list (Draft)`)
    }
    setEntry(EMPTY)
  }

  const edit = (r: AlfRow) => {
    if (r.status === 'Submitted') {
      toast('Submitted ALF cannot be edited — ask the approver to reject it first', 'error')
      return
    }
    setEntry({ id: r.id, atmId: r.atmId, type: r.type, start: r.start, reversal: r.reversal, amount: rupeesInput(r.amount), purpose: r.purpose })
    setErr({})
  }
  const remove = (r: AlfRow) => {
    if (r.status === 'Submitted') {
      toast('Submitted ALF cannot be deleted', 'error')
      return
    }
    if (!window.confirm(`Delete ALF ${r.atmId} (${inrP(r.amount, 0)})?`)) return
    businessStore.set((s) => ({ ...s, alf: s.alf.filter((x) => x.id !== r.id) }))
    logPayout({ by: actor(), area: 'ALF Forecast', ref: r.atmId, action: 'Draft deleted', before: inrP(r.amount) })
    if (apiEnabled) void apiDeleteAlf(r.id)
    if (entry.id === r.id) setEntry(EMPTY)
    toast(`ALF ${r.atmId} deleted`)
  }

  const submitSelected = () => {
    const ids = new Set(list.filter((r) => sel.has(r.id) && (r.status === 'Draft' || r.status === 'Rejected')).map((r) => r.id))
    if (!ids.size) {
      toast('Select Draft / Rejected ALF rows to submit', 'error')
      return
    }
    businessStore.set((s) => ({ ...s, alf: s.alf.map((r) => (ids.has(r.id) ? { ...r, status: 'Submitted' } : r)) }))
    ids.forEach((id) => touchMeta('alfMeta', id, 'Submitted for approval'))
    if (apiEnabled) void apiAlfStatus([...ids], 'Submitted')
    logPayout({ by: actor(), area: 'ALF Forecast', ref: `${ids.size} rows`, action: 'Submitted for approval' })
    setSel(new Set())
    toast(`${ids.size} ALF row(s) submitted for approval`)
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (!/\.csv$/i.test(file.name)) {
      toast('Upload a .csv file (use the template)', 'error')
      return
    }
    const text = await file.text()
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
    const errors: string[] = []
    const added: AlfRow[] = []
    const working = [...all]
    lines.slice(1).forEach((line, i) => {
      const c = line.split(',').map((x) => x.trim().replace(/^"|"$/g, ''))
      const type = c[1] === 'Monthly' || c[1] === 'Weekly' ? c[1] : ''
      const input = { atmId: c[0] ?? '', type: type as Entry['type'], start: parseDate(c[2] ?? ''), reversal: parseDate(c[3] ?? ''), amount: c[4] ?? '', purpose: c[5] ?? '' }
      const { err: e, amount } = validate(input, working, siteOf, null)
      if (!type) e.type = `ALF type must be Monthly or Weekly`
      if (Object.keys(e).length) {
        errors.push(`Row ${i + 2}: ${Object.values(e).join('; ')}`)
        return
      }
      const row: AlfRow = { id: pid('ALF'), atmId: siteOf(input.atmId)?.atmId ?? input.atmId, type: type as AlfRow['type'], start: input.start, reversal: input.reversal, amount, purpose: input.purpose, status: 'Draft' }
      added.push(row)
      working.push(row)
    })
    if (added.length) {
      businessStore.set((s) => ({ ...s, alf: [...added, ...s.alf] }))
      added.forEach((r) => touchMeta('alfMeta', r.id, 'Created (bulk upload)', file.name))
      if (apiEnabled) added.forEach((r) => void apiSaveAlf(null, r))
      logPayout({ by: actor(), area: 'ALF Forecast', ref: file.name, action: `Bulk upload: ${added.length} added, ${errors.length} rejected` })
    }
    setUploadErrors(errors)
    toast(`${added.length} row(s) added${errors.length ? `, ${errors.length} rejected` : ''}`, errors.length && !added.length ? 'error' : 'success')
  }

  const exportCsv = () =>
    downloadCsv('alf_forecast_list', ['ATM ID', 'ALF Type', 'Funding Start Date', 'Funding Reversal Date', 'Amount (₹)', 'Remarks / Purpose', 'State', 'City', 'Bank', 'Status'],
      list.map((r) => { const l = locOf.get(r.atmId); return [r.atmId, r.type, r.start, r.reversal, String(fromPaise(r.amount)), r.purpose, l?.state ?? '', l?.city ?? '', l?.bank ?? '', r.status] }))

  const allSel = list.length > 0 && list.every((r) => sel.has(r.id))
  const cols: Col<AlfRow>[] = [
    { key: 'sel', header: <input type="checkbox" aria-label="Select all" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(list.map((r) => r.id)))} />, render: (r) => <input type="checkbox" aria-label={`Select ${r.atmId}`} checked={sel.has(r.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n })} /> },
    { key: 'atm', header: 'ATM ID', render: (r) => <b className="text-slate-900">{r.atmId}</b>, footer: `Total (${list.length} Sites)` },
    { key: 'type', header: 'ALF Type', render: (r) => typeBadge(r.type) },
    { key: 's', header: 'Funding Start Date', render: (r) => fmtDate(r.start) },
    { key: 'r', header: 'Funding Reversal Date', render: (r) => fmtDate(r.reversal) },
    { key: 'a', header: 'Amount (₹)', className: 'text-right', render: (r) => <Money p={r.amount} />, footer: <Money p={total} /> },
    { key: 'p', header: 'Remarks / Purpose', render: (r) => r.purpose || '—' },
    { key: 'st', header: 'Status', render: (r) => <Badge tone={toneFor(r.status)}>{r.status}</Badge> },
    {
      key: 'act', header: 'Action',
      render: (r) => (
        <div className="flex gap-2">
          <button type="button" aria-label="Edit" className="text-[#0066FF] disabled:text-slate-300" disabled={r.status === 'Submitted'} onClick={() => edit(r)}><Pencil size={15} /></button>
          <button type="button" aria-label="Delete" className="text-red-500 disabled:text-slate-300" disabled={r.status === 'Submitted'} onClick={() => remove(r)}><Trash2 size={15} /></button>
        </div>
      ),
    },
  ]

  const field = 'h-9 w-full rounded-md border bg-white px-2.5 text-[12.5px] outline-none focus:border-primary'
  const msg = (k: string) => err[k] && <span className="mt-0.5 block text-[10.5px] text-brand-red">{err[k]}</span>

  return (
    <>
      <Panel title={entry.id ? 'Edit ALF Forecast' : 'Add ALF Forecast'} icon={Plus}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.4fr_auto] lg:items-start">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">ATM ID *</span>
            <input list="alf-atms" value={entry.atmId} onChange={(e) => setEntry((x) => ({ ...x, atmId: e.target.value }))} placeholder="Search ATM ID" className={cn(field, err.atmId ? 'border-brand-red' : 'border-line')} />
            <datalist id="alf-atms">{atmList.map((a) => <option key={a} value={a} />)}</datalist>
            {msg('atmId')}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">ALF Type *</span>
            <select value={entry.type} onChange={(e) => setEntry((x) => ({ ...x, type: e.target.value as Entry['type'] }))} className={cn(field, err.type ? 'border-brand-red' : 'border-line')}>
              <option value="">Select ALF Type</option>
              <option>Monthly</option>
              <option>Weekly</option>
            </select>
            {msg('type')}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Funding Start Date *</span>
            <input type="date" value={entry.start} onChange={(e) => setEntry((x) => ({ ...x, start: e.target.value }))} className={cn(field, err.start ? 'border-brand-red' : 'border-line')} />
            {msg('start')}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Funding Reversal Date *</span>
            <input type="date" value={entry.reversal} min={entry.start || undefined} onChange={(e) => setEntry((x) => ({ ...x, reversal: e.target.value }))} className={cn(field, err.reversal ? 'border-brand-red' : 'border-line')} />
            {msg('reversal')}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Amount (₹) *</span>
            <input inputMode="decimal" value={entry.amount} onChange={(e) => setEntry((x) => ({ ...x, amount: e.target.value }))} placeholder="Enter Amount" className={cn(field, err.amount ? 'border-brand-red' : 'border-line')} />
            {msg('amount')}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Remarks / Purpose</span>
            <input value={entry.purpose} onChange={(e) => setEntry((x) => ({ ...x, purpose: e.target.value }))} placeholder="Enter Remarks (Optional)" className={cn(field, 'border-line')} />
          </label>
          <div className="flex gap-2 lg:pt-[22px]">
            <Button icon={<Plus size={14} />} onClick={save}>{entry.id ? 'Update' : 'Add to List'}</Button>
            {entry.id && <Button variant="secondary" onClick={() => { setEntry(EMPTY); setErr({}) }}>Cancel</Button>}
          </div>
        </div>
      </Panel>

      {uploadErrors.length > 0 && (
        <Note tone="red">
          <div className="mb-1 flex justify-between font-semibold">Bulk upload — rejected rows <button type="button" onClick={() => setUploadErrors([])} aria-label="Dismiss"><X size={14} /></button></div>
          <ul className="list-disc space-y-0.5 pl-4">{uploadErrors.slice(0, 20).map((x) => <li key={x}>{x}</li>)}</ul>
        </Note>
      )}

      <DataTable
        rows={list}
        cols={cols}
        rowKey={(r) => r.id}
        showFooter
        minWidth={1150}
        noun="records"
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="Search by ATM ID, City, Bank…" onDownload={exportCsv}
            right={
              <>
                <Button size="sm" variant="secondary" icon={<Send size={13} />} onClick={submitSelected}>Submit selected ({sel.size})</Button>
                <Button size="sm" variant="secondary" icon={<FileSpreadsheet size={13} />} onClick={() => downloadCsv('alf_bulk_upload_template', ['ATM ID', 'ALF Type', 'Funding Start Date', 'Funding Reversal Date', 'Amount', 'Remarks'], [['MPZ06423', 'Monthly', '2026-12-01', '2026-12-05', '200000', 'Monthly ALF as per request']])}>Template</Button>
                <label className="inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[11px] font-semibold text-ink hover:bg-surface">
                  <Upload size={13} /> Bulk Upload
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void upload(f) }} />
                </label>
              </>
            }>
            <span className="self-center text-[15px] font-bold text-slate-900">ALF Forecast List</span>
          </TableBar>
        }
      />
      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-5 py-4">
        <span className="flex items-center gap-2 text-[16px] font-bold text-slate-900"><Coins size={20} className="text-[#0066FF]" />Total ALF Amount (Monthly + Weekly)</span>
        <span className="rounded-lg bg-[#0B1F7A] px-5 py-2 text-[18px] font-bold text-white">{inrP(total, 0)}</span>
      </div>
    </>
  )
}

function ApprovalTab({ rows, makerOf }: { rows: AlfRow[]; makerOf: (id: string) => string }) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const list = useMemo(() => rows.filter((r) => !q.trim() || r.atmId.toLowerCase().includes(q.trim().toLowerCase())), [rows, q])
  const decide = (ids: string[], to: 'Approved' | 'Rejected') => {
    const ok = ids.filter((id) => !checkerBlock(makerOf(id)))
    const blocked = ids.length - ok.length
    if (!ok.length) {
      toast(checkerBlock(makerOf(ids[0] ?? '')) ?? 'Select rows first', 'error')
      return
    }
    const set = new Set(ok)
    const by = actor()
    businessStore.set((s) => ({ ...s, alf: s.alf.map((r) => (set.has(r.id) ? { ...r, status: to, approvedBy: to === 'Approved' ? by : r.approvedBy } : r)) }))
    ok.forEach((id) => touchMeta('alfMeta', id, to, undefined, { checker: by, checkedAt: nowIso() }))
    if (apiEnabled) void apiAlfStatus(ok, to)
    logPayout({ by, area: 'ALF Forecast', ref: `${ok.length} rows`, action: to })
    setSel(new Set())
    toast(`${ok.length} ALF row(s) ${to.toLowerCase()}${blocked ? ` · ${blocked} skipped (maker-checker)` : ''}`)
  }
  const allSel = list.length > 0 && list.every((r) => sel.has(r.id))
  const cols: Col<AlfRow>[] = [
    { key: 'sel', header: <input type="checkbox" aria-label="Select all" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(list.map((r) => r.id)))} />, render: (r) => <input type="checkbox" aria-label={`Select ${r.atmId}`} checked={sel.has(r.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n })} /> },
    { key: 'atm', header: 'ATM ID', render: (r) => <b>{r.atmId}</b>, footer: `Total (${list.length})` },
    { key: 'type', header: 'ALF Type', render: (r) => typeBadge(r.type) },
    { key: 'p', header: 'Funding Period', render: (r) => `${fmtDate(r.start)} – ${fmtDate(r.reversal)}` },
    { key: 'a', header: 'Amount (₹)', className: 'text-right', render: (r) => <Money p={r.amount} />, footer: <Money p={sumP(list.map((r) => r.amount))} /> },
    { key: 'pur', header: 'Purpose', render: (r) => r.purpose || '—' },
    { key: 'mk', header: 'Maker', render: (r) => makerOf(r.id) },
    {
      key: 'act', header: 'Action',
      render: (r) => {
        const block = checkerBlock(makerOf(r.id))
        return (
          <div className="flex items-center gap-2" title={block ?? undefined}>
            <button type="button" aria-label="Approve" disabled={!!block} className="text-emerald-600 disabled:text-slate-300" onClick={() => decide([r.id], 'Approved')}><Check size={16} /></button>
            <button type="button" aria-label="Reject" disabled={!!block} className="text-red-500 disabled:text-slate-300" onClick={() => decide([r.id], 'Rejected')}><X size={16} /></button>
          </div>
        )
      },
    },
  ]
  return (
    <>
      <Note>Maker-checker: a submitted ALF must be approved by an authorised user other than the person who created it.</Note>
      <DataTable
        rows={list}
        cols={cols}
        rowKey={(r) => r.id}
        showFooter
        noun="pending approvals"
        empty="No ALF awaiting approval."
        toolbar={
          <TableBar search={q} onSearch={setQ} placeholder="ATM ID…" onDownload={() => downloadCsv('alf_pending_approval', ['ATM ID', 'Type', 'Start', 'Reversal', 'Amount (₹)', 'Purpose', 'Maker'], list.map((r) => [r.atmId, r.type, r.start, r.reversal, String(fromPaise(r.amount)), r.purpose, makerOf(r.id)]))}
            right={
              <>
                <Button size="sm" icon={<Check size={13} />} onClick={() => decide([...sel], 'Approved')}>Approve ({sel.size})</Button>
                <Button size="sm" variant="danger" icon={<X size={13} />} onClick={() => decide([...sel], 'Rejected')}>Reject</Button>
              </>
            }
          />
        }
      />
    </>
  )
}

function HistoryTab({ rows, locOf, metaOf: meta }: { rows: AlfRow[]; locOf: Map<string, Loc>; metaOf: (id: string) => ReturnType<typeof metaOf> }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const list = useMemo(() => rows.filter((r) => (status === 'all' || r.status === status) && (!q.trim() || r.atmId.toLowerCase().includes(q.trim().toLowerCase()))).sort((a, b) => b.start.localeCompare(a.start)), [rows, q, status])
  const reverse = (r: AlfRow) => {
    if (r.reversal > today()) {
      toast(`Reversal date ${fmtDate(r.reversal)} has not been reached`, 'error')
      return
    }
    businessStore.set((s) => ({ ...s, alf: s.alf.map((x) => (x.id === r.id ? { ...x, status: 'Reversed' } : x)) }))
    touchMeta('alfMeta', r.id, 'Reversed')
    if (apiEnabled) void apiAlfStatus([r.id], 'Reversed')
    logPayout({ by: actor(), area: 'ALF Forecast', ref: r.atmId, action: 'Funds reversed', after: inrP(r.amount) })
    toast(`ALF ${r.atmId} marked Reversed`)
  }
  const cols: Col<AlfRow>[] = [
    { key: 'atm', header: 'ATM ID', render: (r) => <b>{r.atmId}</b> },
    { key: 'loc', header: 'City / Bank', render: (r) => `${locOf.get(r.atmId)?.city ?? '—'} · ${locOf.get(r.atmId)?.bank ?? '—'}` },
    { key: 'type', header: 'Type', render: (r) => typeBadge(r.type) },
    { key: 'p', header: 'Funding Period', render: (r) => `${fmtDate(r.start)} – ${fmtDate(r.reversal)}` },
    { key: 'a', header: 'Amount (₹)', className: 'text-right', render: (r) => <Money p={r.amount} /> },
    { key: 'st', header: 'Status', render: (r) => <Badge tone={r.status === 'Reversed' ? 'gray' : toneFor(r.status)}>{r.status}</Badge> },
    { key: 'mk', header: 'Maker / Checker', render: (r) => { const m = meta(r.id); return <span className="text-[11px]">{m.maker}{m.checker ? ` / ${m.checker}` : ''}</span> } },
    { key: 'last', header: 'Last Action', render: (r) => { const h = meta(r.id).history[0]; return h ? <span className="text-[11px]">{h.action} · {fmtDateTime(h.at)}</span> : '—' } },
    { key: 'act', header: 'Action', render: (r) => (r.status === 'Approved' ? <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF]" onClick={() => reverse(r)}><Undo2 size={13} />Reverse</button> : '—') },
  ]
  return (
    <DataTable rows={list} cols={cols} rowKey={(r) => r.id} minWidth={1100} noun="ALF records" empty="No ALF history for these filters."
      toolbar={
        <TableBar search={q} onSearch={setQ} placeholder="ATM ID…" onDownload={() => downloadCsv('alf_history', ['ATM ID', 'Type', 'Start', 'Reversal', 'Amount (₹)', 'Status', 'Maker', 'Checker'], list.map((r) => { const m = meta(r.id); return [r.atmId, r.type, r.start, r.reversal, String(fromPaise(r.amount)), r.status, m.maker, m.checker ?? ''] }))}>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={['Submitted', 'Approved', 'Rejected', 'Reversed']} />
        </TableBar>
      }
    />
  )
}

function ReportTab({ rows, locOf }: { rows: AlfRow[]; locOf: Map<string, Loc> }) {
  const report = useMemo(() => {
    const statuses: AlfRow['status'][] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Reversed']
    const byType = (['Monthly', 'Weekly'] as const).map((t) => ({ key: t, cells: statuses.map((s) => sumP(rows.filter((r) => r.type === t && r.status === s).map((r) => r.amount))), total: sumP(rows.filter((r) => r.type === t && r.status !== 'Rejected').map((r) => r.amount)), count: rows.filter((r) => r.type === t).length }))
    const group = (f: (r: AlfRow) => string) => {
      const m = new Map<string, AlfRow[]>()
      rows.filter((r) => r.status !== 'Rejected').forEach((r) => m.set(f(r), [...(m.get(f(r)) ?? []), r]))
      return [...m.entries()].map(([key, rs]) => ({ key, sites: new Set(rs.map((r) => r.atmId)).size, monthly: sumP(rs.filter((r) => r.type === 'Monthly').map((r) => r.amount)), weekly: sumP(rs.filter((r) => r.type === 'Weekly').map((r) => r.amount)) })).sort((a, b) => b.monthly + b.weekly - (a.monthly + a.weekly))
    }
    return { statuses, byType, byState: group((r) => locOf.get(r.atmId)?.state ?? '—'), byBank: group((r) => locOf.get(r.atmId)?.bank ?? '—') }
  }, [rows, locOf])
  const exportAll = () =>
    downloadCsv('alf_report', ['Group', 'Key', 'Sites', 'Monthly (₹)', 'Weekly (₹)', 'Total (₹)'], [
      ...report.byState.map((g) => ['State', g.key, String(g.sites), String(fromPaise(g.monthly)), String(fromPaise(g.weekly)), String(fromPaise(g.monthly + g.weekly))]),
      ...report.byBank.map((g) => ['Bank', g.key, String(g.sites), String(fromPaise(g.monthly)), String(fromPaise(g.weekly)), String(fromPaise(g.monthly + g.weekly))]),
    ])
  const grp = (title: string, data: typeof report.byState) => (
    <Panel title={title}>
      <table className="w-full text-left text-[12px]">
        <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase"><tr>{['', 'Sites', 'Monthly', 'Weekly', 'Total'].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((g) => <tr key={g.key}><td className="px-2 py-2 font-medium">{g.key}</td><td className="px-2 py-2">{g.sites}</td><td className="px-2 py-2 text-right"><Money p={g.monthly} /></td><td className="px-2 py-2 text-right"><Money p={g.weekly} /></td><td className="px-2 py-2 text-right font-semibold"><Money p={g.monthly + g.weekly} /></td></tr>)}
          {!data.length && <tr><td colSpan={5} className="py-4 text-center text-slate-500">No data</td></tr>}
        </tbody>
      </table>
    </Panel>
  )
  return (
    <div className="space-y-4">
      <Panel title="ALF by type and status" sub="Totals exclude Rejected." action={<Button variant="secondary" icon={<FileSpreadsheet size={14} />} onClick={exportAll}>Export Report</Button>}>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase"><tr><th className="px-2 py-2">Type</th><th className="px-2 py-2">Rows</th>{report.statuses.map((s) => <th key={s} className="px-2 py-2 text-right">{s}</th>)}<th className="px-2 py-2 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {report.byType.map((t) => (
                <tr key={t.key}><td className="px-2 py-2">{typeBadge(t.key)}</td><td className="px-2 py-2">{t.count}</td>{t.cells.map((c, i) => <td key={report.statuses[i]} className="px-2 py-2 text-right"><Money p={c} /></td>)}<td className="px-2 py-2 text-right font-bold"><Money p={t.total} /></td></tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50/70 font-bold"><tr><td className="px-2 py-2">Total</td><td className="px-2 py-2">{rows.length}</td>{report.statuses.map((s, i) => <td key={s} className="px-2 py-2 text-right"><Money p={sumP(report.byType.map((t) => t.cells[i]))} /></td>)}<td className="px-2 py-2 text-right"><Money p={sumP(report.byType.map((t) => t.total))} /></td></tr></tfoot>
          </table>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        {grp('By state', report.byState)}
        {grp('By bank', report.byBank)}
      </div>
    </div>
  )
}
