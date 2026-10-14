import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowDownUp, ArrowLeft, ArrowUp, CalendarRange, ChevronDown, Columns3, Download, Info, ListFilter, Search, Table2 } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { SITES, dmy, getSite } from '@/data/cbrSites'
import { CBR_DATES, CBR_END, dailyForSite, dailyStore, reconcile, toConsolidated, type ConsolidatedRow } from '@/data/cbr'
import { rowMark, useRowNav } from '../finance/shared'
import { Amt, SiteContext } from './shared'

type Sort = { key: string; dir: 'asc' | 'desc' } | null
type HeadCtx = {
  sort: Sort
  toggle: (k: string) => void
  filters: Record<string, string>
  openFilters: () => void
}

/** Figma header cell: label left, sort (+ filter) glyphs right; state lives in the page so bands A–I and J–P never desync. */
function HeadCell({ k, label, ctx, filterable = true }: { k: string; label: string; ctx: HeadCtx; filterable?: boolean }) {
  const s = ctx.sort?.key === k ? ctx.sort.dir : null
  return (
    <span className="flex w-full items-center gap-1.5">
      <span>{label}</span>
      <span className="ml-auto flex items-center gap-1 font-normal text-ink-2">
        <button type="button" onClick={() => ctx.toggle(k)} aria-label={`Sort by ${label}`} className={cn(s && 'text-primary')}>
          {s === 'asc' ? <ArrowUp size={11} /> : s === 'desc' ? <ArrowDown size={11} /> : <ArrowDownUp size={11} />}
        </button>
        {filterable && (
          <button type="button" onClick={ctx.openFilters} aria-label={`Filter ${label}`} className={cn(ctx.filters[k]?.trim() && 'text-primary')}>
            <ListFilter size={11} />
          </button>
        )}
      </span>
    </span>
  )
}

const amt = (key: keyof ConsolidatedRow, header: string, extra: Partial<GridColumn<ConsolidatedRow>> = {}): GridColumn<ConsolidatedRow> => ({
  key,
  header,
  align: 'right',
  width: 130,
  value: (r) => r[key] as number,
  render: (r) => <Amt v={r[key] as number} />,
  ...extra,
})

type ColDef = GridColumn<ConsolidatedRow> & {
  label: string
  filterable?: boolean
}

const BAND_A: ColDef[] = [
  {
    key: 'date',
    label: 'Date',
    header: 'Date',
    width: 120,
    value: (r) => dmy(r.date),
    render: (r) => (
      <Link to={`/cbr/consolidated/daily/${r.id}`} className="font-medium text-primary hover:underline">
        {dmy(r.date)}
      </Link>
    ),
  },
  {
    key: 'atmId',
    label: 'ATM ID',
    header: 'ATM ID',
    width: 130,
    filterable: true,
  },
  {
    key: 'mfName',
    label: 'MF Name',
    header: 'MF Name',
    width: 110,
    filterable: true,
  },
  {
    key: 'indentNo',
    label: 'Indent No',
    header: 'Indent No',
    width: 150,
    filterable: true,
  },
  {
    key: 'eodTime',
    label: 'EOD Time',
    header: 'EOD Time',
    width: 110,
    align: 'right',
    filterable: true,
  },
  {
    ...amt('opening', 'Opening Balance', { width: 140 }),
    label: 'Opening Balance',
  },
  { ...amt('dispense', 'Dispense'), label: 'Dispense', filterable: true },
  {
    ...amt('purge', 'Purge Bin', { width: 130 }),
    label: 'Purge Bin',
    filterable: true,
  },
]

const BAND_B: ColDef[] = [
  {
    ...amt('overage', 'Overage', {
      render: (r) => <Amt v={r.overage} tone={r.overage ? 'text-emerald-700 font-semibold' : undefined} />,
    }),
    label: 'Overage',
  },
  {
    ...amt('shortage', 'Shortage', {
      render: (r) => <Amt v={r.shortage} tone={r.shortage ? 'text-brand-red font-semibold' : undefined} />,
    }),
    label: 'Shortage',
    filterable: true,
  },
  {
    ...amt('physical', 'Physical Cash', { width: 140 }),
    label: 'Physical Cash',
    filterable: true,
  },
  { ...amt('loading', 'Loading'), label: 'Loading', filterable: true },
  {
    ...amt('closing', 'Closing Balance', {
      width: 140,
      render: (r) => <Amt v={r.closing} strong />,
    }),
    label: 'Closing Balance',
    filterable: true,
  },
  {
    key: 'remarks',
    label: 'Remarks',
    header: 'Remarks',
    width: 260,
    render: (r) => (r.remarks ? <span className="text-ink-2">{r.remarks}</span> : <span className="text-muted">—</span>),
  },
  {
    ...amt('switchBalance', 'Switch Balance', { width: 140 }),
    label: 'Switch Balance',
    filterable: true,
  },
]
const ALL_COLS = [...BAND_A, ...BAND_B]
const cellText = (c: ColDef, r: ConsolidatedRow) => {
  const v = c.value ? c.value(r) : (r as unknown as Record<string, unknown>)[c.key]
  return v == null ? '' : String(v)
}

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
  const [sort, setSort] = useState<Sort>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState<'filters' | 'columns' | null>(null)
  const onRow = useRowNav((id) => `/cbr/consolidated/daily/${id}`)

  const daily = dailyForSite(site.siteId)
  const unbalanced = daily.filter((d) => reconcile(d).diff !== 0).length
  const all = useMemo(() => daily.map(toConsolidated), [daily])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const out = all.filter((r) => (!from || r.date >= from) && (!to || r.date <= to) && (!s || [dmy(r.date), r.date, r.atmId, r.mfName, r.indentNo].some((v) => v.toLowerCase().includes(s))))
    let res = out
    for (const [k, f] of Object.entries(filters)) {
      const c = ALL_COLS.find((x) => x.key === k)
      if (c && f.trim()) res = res.filter((r) => cellText(c, r).toLowerCase().includes(f.trim().toLowerCase()))
    }
    if (sort) {
      const c = ALL_COLS.find((x) => x.key === sort.key)
      if (c)
        res = [...res].sort((a, b) => {
          const av = c.key === 'date' ? a.date : c.value ? c.value(a) : cellText(c, a)
          const bv = c.key === 'date' ? b.date : c.value ? c.value(b) : cellText(c, b)
          const cmp =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av ?? '').localeCompare(String(bv ?? ''), 'en', {
                  numeric: true,
                })
          return sort.dir === 'asc' ? cmp : -cmp
        })
    }
    return res
  }, [all, from, to, q, filters, sort])
  const activeFilters = Object.values(filters).filter((v) => v.trim()).length
  const ctx: HeadCtx = {
    sort,
    filters,
    toggle: (k) => setSort((s) => (s?.key !== k ? { key: k, dir: 'asc' } : s.dir === 'asc' ? { key: k, dir: 'desc' } : null)),
    openFilters: () => setPanel('filters'),
  }
  const withHeads = (cols: ColDef[]): GridColumn<ConsolidatedRow>[] =>
    cols
      .filter((c) => !hidden.has(c.key))
      .map((c) => ({
        ...c,
        filterable: false,
        header: <HeadCell k={c.key} label={c.label} ctx={ctx} filterable={!!c.filterable} />,
      }))

  const rangeLabel = from || to ? `${from ? dmy(from) : '…'} – ${to ? dmy(to) : '…'}` : 'Not set'

  const exportCsv = () =>
    downloadCsv(
      `consolidated-cbr-${site.siteId}`,
      ['No', ...[...BAND_A, ...BAND_B].map((c) => String(c.header))],
      rows.map((r, i) => [
        String(i + 1),
        dmy(r.date),
        r.atmId,
        r.mfName,
        r.indentNo,
        r.eodTime,
        ...[r.opening, r.dispense, r.purge, r.overage, r.shortage, r.physical, r.loading, r.closing].map(String),
        r.remarks,
        String(r.switchBalance),
      ]),
    )

  const grid = (cols: ColDef[], offset: number, pager: boolean) => (
    <div onClick={onRow} className="[&>section]:rounded-none [&>section]:border-0 [&_thead_th>div>span:first-child]:flex-1">
      <ExcelGrid
        title="Datewise CBR register"
        rows={rows}
        columns={withHeads(cols)}
        rowId={(r) => r.id}
        letters
        letterOffset={offset}
        hideToolbar
        hidePagination={!pager}
        rowNumberLabel="No"
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
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Consolidated Datewise CBR</h1>
        <p className="mt-1 text-[13px] text-muted">Review the selected site's datewise cash balance report in one consolidated register.</p>
      </div>

      <SiteContext
        site={site}
        right={
          <label className="relative flex items-center gap-1 text-[11px] text-muted">
            <span className="sr-only">Change site</span>
            <select
              value={site.siteId}
              onChange={(e) => setParams({ site: e.target.value })}
              className="h-7 max-w-[260px] appearance-none truncate rounded-md border border-transparent bg-transparent pr-5 pl-1.5 text-right text-[11px] text-muted outline-none hover:border-line focus:border-primary"
              title="Change site"
            >
              {SITES.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  ATM {s.atmId} · {s.make}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-1" />
          </label>
        }
      />

      <div
        className={cn(
          'mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[12px]',
          unbalanced ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-100 bg-primary-soft/60 text-ink-2',
        )}
      >
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          {all.length} dated rows from {dmy(CBR_DATES[0])} to {dmy(CBR_END)}. Each row is the total of that day's denomination-wise Daily CBR — click a row to open it.{' '}
          {unbalanced ? <b>{unbalanced} day(s) do not reconcile (Opening − Dispense − Purge + Loading ± Overage/Shortage ≠ Closing).</b> : 'All days reconcile.'}
        </span>
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
                    <input
                      type="date"
                      value={from}
                      min={CBR_DATES[0]}
                      max={CBR_END}
                      onChange={(e) => setFrom(e.target.value)}
                      className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[12px] text-ink"
                    />
                  </label>
                  <label className="text-[11px] text-muted">
                    To
                    <input
                      type="date"
                      value={to}
                      min={CBR_DATES[0]}
                      max={CBR_END}
                      onChange={(e) => setTo(e.target.value)}
                      className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[12px] text-ink"
                    />
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
                  <button
                    className="text-[12px] text-muted"
                    onClick={() => {
                      setFrom('')
                      setTo('')
                    }}
                  >
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

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-soft/60 px-4 py-2 text-[11px]">
          <b className="text-primary">A–I</b> <span className="font-semibold">Date, identity &amp; cash movement</span>
          <span className="text-muted">Source columns A–I</span>
          <span className="ml-auto text-muted">
            Same {rows.length} rows · No 1–{rows.length}
          </span>
        </div>
        <div className="relative flex flex-wrap items-center gap-3 border-b border-line px-4 py-1.5">
          <Table2 size={16} className="text-primary" />
          <span className="text-[13px] font-semibold">Datewise CBR register</span>
          <span className="text-[11px] text-muted">{rows.length} rows</span>
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[12px] text-muted sm:w-[250px]">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search date, ATM ID or MF name" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" icon={<ListFilter size={14} />} onClick={() => setPanel(panel === 'filters' ? null : 'filters')}>
              Filters
              {activeFilters > 0 && <span className="ml-1 rounded bg-primary px-1.5 text-[10px] text-white">{activeFilters}</span>}
            </Button>
            <Button variant="secondary" size="sm" icon={<Columns3 size={14} />} onClick={() => setPanel(panel === 'columns' ? null : 'columns')}>
              Columns
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
              Export .xlsx
            </Button>
          </div>
          {panel && (
            <div className="absolute top-full right-4 z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-line bg-white p-3 shadow-lg">
              {panel === 'filters'
                ? ALL_COLS.filter((c) => c.filterable).map((c) => (
                    <label key={c.key} className="mb-2 block">
                      <span className="mb-1 block text-[12px] font-semibold">{c.label}</span>
                      <input
                        value={filters[c.key] ?? ''}
                        onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                        placeholder="Contains…"
                        className="h-8 w-full rounded-md border border-line px-2 text-[12px] outline-none focus:border-primary"
                      />
                    </label>
                  ))
                : ALL_COLS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-surface">
                      <input
                        type="checkbox"
                        checked={!hidden.has(c.key)}
                        onChange={() =>
                          setHidden((h) => {
                            const n = new Set(h)
                            if (n.has(c.key)) n.delete(c.key)
                            else n.add(c.key)
                            return n
                          })
                        }
                      />
                      {c.label}
                    </label>
                  ))}
              <div className="mt-2 flex justify-between">
                <button type="button" className="text-[12px] text-muted" onClick={() => (panel === 'filters' ? setFilters({}) : setHidden(new Set()))}>
                  {panel === 'filters' ? 'Clear all' : 'Show all'}
                </button>
                <button type="button" className="text-[12px] font-semibold text-primary" onClick={() => setPanel(null)}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {grid(BAND_A, 1, false)}

        <div className="flex flex-wrap items-center gap-2 border-y border-line bg-primary-soft/60 px-4 py-2 text-[11px]">
          <b className="text-primary">J–P</b> <span className="font-semibold">Reconciliation &amp; closing balances</span>
          <span className="text-muted">No repeated for row continuity</span>
          <span className="ml-auto text-muted">
            Same {rows.length} rows · No 1–{rows.length}
          </span>
        </div>
        {grid(BAND_B, 9, true)}

        <div className="flex flex-wrap justify-between gap-2 border-t border-line bg-surface/60 px-4 py-2.5 text-[11px] text-muted">
          <span>All 16 source columns shown in two bands · No repeated for continuity</span>
          <span className="text-primary">Amounts in ₹ · from Daily CBR denominations</span>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
        <span>Values from the Daily CBR records · Click a row (or its date) to open the Daily CBR</span>
        <span>Site-level report · {site.siteId}</span>
      </div>
    </div>
  )
}
