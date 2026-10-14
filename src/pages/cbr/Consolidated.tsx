import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, CalendarRange, Download, Info, Search, Smartphone } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { SITES, dmy, getSite, grp } from '@/data/cbrSites'
import { CBR_DATES, CBR_END, dailyForSite, dailyStore, reconcile, toConsolidated, type ConsolidatedRow } from '@/data/cbr'
import { rowMark, useRowNav } from '../finance/shared'
import { Amt, SiteContext } from './shared'

const amt = (key: keyof ConsolidatedRow, header: string, extra: Partial<GridColumn<ConsolidatedRow>> = {}): GridColumn<ConsolidatedRow> => ({
  key, header, align: 'right', width: 130, value: (r) => r[key] as number, render: (r) => <Amt v={r[key] as number} />, ...extra,
})

const BAND_A: GridColumn<ConsolidatedRow>[] = [
  {
    key: 'date', header: 'Date', width: 120, value: (r) => dmy(r.date),
    render: (r) => (
      <Link to={`/cbr/consolidated/daily/${r.id}`} className="font-medium text-primary hover:underline">
        {dmy(r.date)}
      </Link>
    ),
  },
  { key: 'atmId', header: 'ATM ID', width: 130 },
  { key: 'mfName', header: 'MF Name', width: 90 },
  { key: 'indentNo', header: 'Indent No', width: 170 },
  { key: 'eodTime', header: 'EOD Time', width: 90, align: 'right' },
  amt('opening', 'Opening Balance', { width: 140 }),
  amt('dispense', 'Dispense'),
  amt('purge', 'Purge Bin', { width: 110 }),
]

const BAND_B: GridColumn<ConsolidatedRow>[] = [
  amt('overage', 'Overage', { render: (r) => <Amt v={r.overage} tone={r.overage ? 'text-emerald-700 font-semibold' : undefined} /> }),
  amt('shortage', 'Shortage', { render: (r) => <Amt v={r.shortage} tone={r.shortage ? 'text-brand-red font-semibold' : undefined} /> }),
  amt('physical', 'Physical Cash', { width: 140 }),
  amt('loading', 'Loading'),
  amt('closing', 'Closing Balance', { width: 140, render: (r) => <Amt v={r.closing} strong /> }),
  { key: 'remarks', header: 'Remarks', width: 300, render: (r) => (r.remarks ? <span className="text-ink-2">{r.remarks}</span> : <span className="text-muted">—</span>) },
  amt('switchBalance', 'Switch Balance', { width: 140 }),
]

const PRESETS: [string, number][] = [
  ['Last 7 days', 7],
  ['Last 14 days', 14],
  ['All 20 days', 20],
]

export default function Consolidated() {
  const [params, setParams] = useSearchParams()
  dailyStore.use()
  const site = getSite(params.get('site') ?? '') ?? SITES[0]
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [q, setQ] = useState('')
  const [desc, setDesc] = useState(false)
  const onRow = useRowNav((id) => `/cbr/consolidated/daily/${id}`)

  const daily = dailyForSite(site.siteId)
  const unbalanced = daily.filter((d) => reconcile(d).diff !== 0).length
  const all = useMemo(() => daily.map(toConsolidated), [daily])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const out = all.filter(
      (r) => (!from || r.date >= from) && (!to || r.date <= to) && (!s || [dmy(r.date), r.date, r.atmId, r.mfName, r.indentNo].some((v) => v.toLowerCase().includes(s))),
    )
    return desc ? [...out].reverse() : out
  }, [all, from, to, q, desc])

  const rangeLabel = from || to ? `${from ? dmy(from) : '…'} – ${to ? dmy(to) : '…'}` : 'Not set'
  const tot = (k: keyof ConsolidatedRow) => rows.reduce((s, r) => s + (r[k] as number), 0)

  const exportCsv = () =>
    downloadCsv(
      `consolidated-cbr-${site.siteId}`,
      ['No', ...[...BAND_A, ...BAND_B].map((c) => String(c.header))],
      rows.map((r, i) => [String(i + 1), dmy(r.date), r.atmId, r.mfName, r.indentNo, r.eodTime, ...[r.opening, r.dispense, r.purge, r.overage, r.shortage, r.physical, r.loading, r.closing].map(String), r.remarks, String(r.switchBalance)]),
    )

  const grid = (cols: GridColumn<ConsolidatedRow>[], offset: number) => (
    <div onClick={onRow} className="[&>section]:rounded-none [&>section]:border-0">
      <ExcelGrid
        title="Datewise CBR register"
        rows={rows}
        columns={cols}
        rowId={(r) => r.id}
        letters
        letterOffset={offset}
        hideToolbar
        pageSize={50}
        noun="dated rows"
        rowClassName={(r) => rowMark(r.id)}
        emptyState="No CBR rows in this date range."
      />
    </div>
  )

  return (
    <div>
      <Link to="/projects/active" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Active Projects
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Consolidated Datewise CBR</h1>
          <p className="mt-1 text-[14px] text-muted">Review the selected site's datewise cash balance report in one consolidated register.</p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <label className="block w-full sm:w-80">
            <span className="mb-1.5 block text-[12px] font-semibold">Site</span>
            <select
              value={site.siteId}
              onChange={(e) => setParams({ site: e.target.value })}
              className="h-9 w-full rounded-md border border-line bg-white px-3 text-[13px]"
            >
              {SITES.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.siteId} · {s.location}
                </option>
              ))}
            </select>
          </label>
          <Link to="/cbr/mobile">
            <Button variant="secondary" icon={<Smartphone size={15} />}>
              Mobile view
            </Button>
          </Link>
        </div>
      </div>

      <SiteContext site={site} right={<span className="text-[12px] text-muted">ATM {site.atmId} · {site.make}</span>} />

      <div className={cn('mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[12px]', unbalanced ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-100 bg-primary-soft/60 text-ink-2')}>
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          {all.length} dated rows from {dmy(CBR_DATES[0])} to {dmy(CBR_END)}. Each row is the total of that day's denomination-wise Daily CBR — click a row to open it.{' '}
          {unbalanced ? <b>{unbalanced} day(s) do not reconcile (Opening − Dispense − Purge + Loading ± Overage/Shortage ≠ Closing).</b> : 'All days reconcile.'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Total dispense', tot('dispense')],
          ['Total loading', tot('loading')],
          ['Overage', tot('overage')],
          ['Shortage', tot('shortage')],
          ['Latest closing', rows.length ? (desc ? rows[0] : rows[rows.length - 1]).closing : 0],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-line bg-white px-4 py-3">
            <div className="text-[12px] text-muted">{l}</div>
            <div className="mt-1 text-[18px] font-semibold">₹ {grp(v as number)}</div>
          </div>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <span className="-mb-3 border-b-2 border-primary pb-2.5 text-[13px] font-semibold text-primary">Consolidated Datewise CBR</span>
          <span className="ml-auto hidden text-[12px] text-muted md:inline">Wrapped column view · All 16 fields visible</span>
          <div className="relative">
            <Button variant="secondary" size="sm" icon={<CalendarRange size={14} />} onClick={() => setRangeOpen((o) => !o)}>
              Date range · {rangeLabel}
            </Button>
            {rangeOpen && (
              <div className="absolute top-10 right-0 z-30 w-72 rounded-lg border border-line bg-white p-3 shadow-lg">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted">
                    From
                    <input type="date" value={from} min={CBR_DATES[0]} max={CBR_END} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[12px] text-ink" />
                  </label>
                  <label className="text-[11px] text-muted">
                    To
                    <input type="date" value={to} min={CBR_DATES[0]} max={CBR_END} onChange={(e) => setTo(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[12px] text-ink" />
                  </label>
                </div>
                {from && to && from > to && <p className="mt-1.5 text-[11px] text-brand-red">From date is after To date.</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESETS.map(([l, n]) => (
                    <button
                      key={l}
                      onClick={() => {
                        setFrom(CBR_DATES[CBR_DATES.length - n])
                        setTo(CBR_END)
                      }}
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] hover:border-primary"
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <button className="text-[12px] text-muted" onClick={() => { setFrom(''); setTo('') }}>
                    Clear
                  </button>
                  <button className="text-[12px] font-semibold text-primary" onClick={() => setRangeOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <span className="text-[14px] font-semibold">Datewise CBR register</span>
          <span className="text-[12px] text-muted">{rows.length} rows</span>
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted sm:w-[260px]">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search date, ATM ID or MF name" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" icon={desc ? <ArrowDown size={14} /> : <ArrowUp size={14} />} onClick={() => setDesc((d) => !d)}>
              Date {desc ? 'newest first' : 'oldest first'}
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
              Export .csv
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-soft/60 px-4 py-2 text-[12px]">
          <b className="text-primary">A–I</b> <span className="font-semibold">Date, identity &amp; cash movement</span>
          <span className="text-muted">Source columns A–I</span>
          <span className="ml-auto text-muted">Same {rows.length} rows · No 1–{rows.length}</span>
        </div>
        {grid(BAND_A, 1)}

        <div className="flex flex-wrap items-center gap-2 border-y border-line bg-primary-soft/60 px-4 py-2 text-[12px]">
          <b className="text-primary">J–P</b> <span className="font-semibold">Reconciliation &amp; closing balances</span>
          <span className="text-muted">No repeated for row continuity</span>
          <span className="ml-auto text-muted">Same {rows.length} rows · No 1–{rows.length}</span>
        </div>
        {grid(BAND_B, 9)}

        <div className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-2.5 text-[12px] text-muted">
          <span>All 16 source columns shown in two bands · No repeated for continuity</span>
          <span className="text-primary">Amounts in ₹ · derived from Daily CBR denominations</span>
        </div>
      </section>
    </div>
  )
}
