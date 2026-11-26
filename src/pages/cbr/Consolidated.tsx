// Consolidated Datewise CBR — now a live view of the new-flow masters: the CBR Master (Full Funding) and the
// Cash Loading Master (Self Funding). Whatever is submitted / verified / approved there shows here.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowDownUp, ArrowLeft, ArrowUp, CalendarRange, ChevronDown, Columns3, Download, Info, ListFilter, Search, Table2 } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { SiteRef } from '@/lib/siteRef'
import { dmy } from '@/data/cbrSites'
import { KIND_META, type CashKind } from '@/data/cbr'
import { rowMark, useRowNav } from '../finance/shared'
import { Amt, ContextBar } from './shared'
import { StatusBadge } from './CashRecordUi'
import { formPathOf, isoAddDays, kindParam, masterOf, parseKind, toRow, type CashRow } from './cashRows'
import { useReportMode } from '@/hooks/useReportMode'

type Sort = { key: string; dir: 'asc' | 'desc' } | null
type HeadCtx = {
  sort: Sort
  toggle: (k: string) => void
  filters: Record<string, string>
  openFilters: () => void
}

/** Figma header cell: label left, sort (+ filter) glyphs right; state lives in the page so both bands never desync. */
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

const amt = (key: keyof CashRow, header: string, extra: Partial<GridColumn<CashRow>> = {}): GridColumn<CashRow> => ({
  key,
  header,
  align: 'right',
  width: 140,
  value: (r) => r[key] as number,
  render: (r) => <Amt v={r[key] as number} />,
  ...extra,
})

type ColDef = GridColumn<CashRow> & {
  label: string
  filterable?: boolean
}

const recordPath = (id: string, isReport: boolean) => `/cbr/consolidated/daily/${id}${isReport ? '?source=report' : ''}`

function DailyDateCell({ r }: { r: CashRow }) {
  const { isReport } = useReportMode()
  return (
    <Link to={recordPath(r.id, isReport)} className="font-medium text-primary hover:underline">
      {dmy(r.date)}
    </Link>
  )
}

const BAND_A: ColDef[] = [
  { key: 'date', label: 'Date', header: 'Date', width: 120, value: (r) => dmy(r.date), render: (r) => <DailyDateCell r={r} /> },
  {
    key: 'atmId',
    label: 'ATM ID',
    header: 'ATM ID',
    width: 210,
    filterable: true,
    render: (r) => (
      <span onClick={(e) => e.stopPropagation()}>
        <SiteRef id={r.atmId} />
      </span>
    ),
  },
  { key: 'id', label: 'Record ID', header: 'Record ID', width: 140, filterable: true },
  { key: 'franchiseName', label: 'Franchise', header: 'Franchise', width: 200, filterable: true },
  { key: 'formName', label: 'Form', header: 'Form', width: 170, filterable: true },
  { key: 'status', label: 'Status', header: 'Status', width: 210, filterable: true, render: (r) => <StatusBadge status={r.status} locked={r.locked} /> },
  { key: 'channel', label: 'Channel', header: 'Channel', width: 200, filterable: true },
  { key: 'docs', label: 'Docs', header: 'Docs', width: 80, align: 'right', value: (r) => r.docs },
]

const BAND_B: ColDef[] = [
  { ...amt('amount', 'Injection / Loading', { width: 150, render: (r) => <Amt v={r.amount} strong /> }), label: 'Injection / Loading', filterable: true },
  { ...amt('dailyIndent', 'Daily Indent'), label: 'Daily Indent', filterable: true },
  { ...amt('cashWithdrawal', 'Cash Withdrawal', { width: 150 }), label: 'Cash Withdrawal', filterable: true },
  { ...amt('openingBalance', 'Opening Balance', { width: 150 }), label: 'Opening Balance' },
  { ...amt('balance', 'Balance (prov.)', { width: 150 }), label: 'Balance (prov.)' },
  { key: 'lastDate', label: 'Last Date', header: 'Last Date', width: 120, value: (r) => dmy(r.lastDate) },
  { key: 'approvedBy', label: 'Approved by', header: 'Approved by', width: 140, filterable: true, render: (r) => (r.approvedBy ? r.approvedBy : <span className="text-muted">—</span>) },
  {
    key: 'remarks',
    label: 'Remarks',
    header: 'Remarks',
    width: 280,
    render: (r) => (r.remarks ? <span className="text-ink-2">{r.remarks}</span> : <span className="text-muted">—</span>),
  },
]
const ALL_COLS = [...BAND_A, ...BAND_B]
const cellText = (c: ColDef, r: CashRow) => {
  const v = c.value ? c.value(r) : (r as unknown as Record<string, unknown>)[c.key]
  return v == null ? '' : String(v)
}

const PRESETS: [string, number][] = [
  ['Last 7 days', 7],
  ['Last 14 days', 14],
  ['Last 30 days', 30],
]

export default function Consolidated() {
  const { isReport } = useReportMode()
  const [params, setParams] = useSearchParams()
  const kind: CashKind = parseKind(params.get('kind'))
  const master = masterOf(kind)
  const records = master.store.use()
  const m = KIND_META[kind]
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'date', dir: 'desc' })
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState<'filters' | 'columns' | null>(null)
  const onRow = useRowNav((id) => recordPath(id, isReport))

  // sites that have at least one record in this master (Site Master IDs)
  const siteOptions = useMemo(() => {
    const seen = new Map<string, { siteId: string; atmId: string }>()
    records.forEach((r) => {
      if (!seen.has(r.siteId)) seen.set(r.siteId, { siteId: r.siteId, atmId: r.atmId })
    })
    return [...seen.values()].sort((a, b) => a.atmId.localeCompare(b.atmId))
  }, [records])
  const siteParam = params.get('site') ?? ''
  const siteSel = siteOptions.find((s) => s.siteId === siteParam || s.atmId === siteParam)
  const siteRecs = useMemo(() => records.filter((r) => !siteSel || r.siteId === siteSel.siteId), [records, siteSel])
  const snap = siteSel ? siteRecs[0] : undefined
  const all = useMemo(() => siteRecs.map(toRow), [siteRecs])
  const dates = all.map((r) => r.date).sort()
  const minDate = dates[0] ?? ''
  const maxDate = dates[dates.length - 1] ?? ''
  const pending = all.filter((r) => ['Pending Verification', 'Pending Approval', 'Submitted', 'Verified'].includes(r.status)).length
  const approved = all.filter((r) => r.status === 'Approved').length
  const attention = all.filter((r) => ['Returned for Correction', 'Rejected', 'Draft'].includes(r.status)).length

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(params)
    if (v) n.set(k, v)
    else n.delete(k)
    if (k === 'kind') n.delete('site')
    setParams(n)
  }

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    let res = all.filter(
      (r) => (!from || r.date >= from) && (!to || r.date <= to) && (!s || [dmy(r.date), r.date, r.atmId, r.siteId, r.id, r.franchiseName, r.status].some((v) => v.toLowerCase().includes(s))),
    )
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
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''), 'en', { numeric: true })
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
  const withHeads = (cols: ColDef[]): GridColumn<CashRow>[] =>
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
      `consolidated-${kindParam(kind)}-${siteSel?.siteId ?? 'all-sites'}`,
      ['No', 'Date', 'ATM ID', 'Site ID', 'Record ID', 'Franchise', 'Form', 'Status', 'Channel', 'Docs', 'Injection / Loading', 'Daily Indent', 'Cash Withdrawal', 'Opening Balance', 'Balance (prov.)', 'Last Date', 'Approved by', 'Remarks'],
      rows.map((r, i) => [
        String(i + 1),
        dmy(r.date),
        r.atmId,
        r.siteId,
        r.id,
        r.franchiseName,
        r.formName,
        r.status,
        r.channel,
        String(r.docs),
        ...[r.amount, r.dailyIndent, r.cashWithdrawal, r.openingBalance, r.balance].map(String),
        dmy(r.lastDate),
        r.approvedBy,
        r.remarks,
      ]),
    )

  const grid = (cols: ColDef[], offset: number, pager: boolean) => (
    <div onClick={onRow} className="[&>section]:rounded-none [&>section]:border-0 [&_thead_th>div>span:first-child]:flex-1">
      <ExcelGrid
        title={`Datewise ${kind} register`}
        rows={rows}
        columns={withHeads(cols)}
        rowId={(r) => r.id}
        letters
        letterOffset={offset}
        hideToolbar
        hidePagination={!pager}
        rowNumberLabel="No"
        pageSize={50}
        noun="records"
        rowClassName={(r) => rowMark(r.id)}
        emptyState={records.length ? 'No records in this date range.' : `No records in the ${m.master} yet — create one from the ${kind} form.`}
      />
    </div>
  )

  const selectCls =
    'h-7 max-w-[260px] appearance-none truncate rounded-md border border-transparent bg-transparent pr-5 pl-1.5 text-right text-[11px] text-muted outline-none hover:border-line focus:border-primary'

  return (
    <div>
      <Link to="/operations/cbr" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to CBR Module
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Consolidated Datewise {kind === 'CBR' ? 'CBR' : 'Cash Loading'}</h1>
          <p className="mt-1 text-[13px] text-muted">Every record submitted, verified and approved in the {m.master} — one consolidated, datewise register.</p>
        </div>
        <div className="flex rounded-lg border border-line bg-white p-0.5 text-[12px] font-semibold">
          {(['CBR', 'Cash Loading'] as CashKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setParam('kind', kindParam(k))}
              className={cn('rounded-md px-3 py-1.5', k === kind ? 'bg-primary text-white' : 'text-ink-2 hover:text-primary')}
            >
              {k === 'CBR' ? 'CBR · Full Funding' : 'Cash Loading · Self Funding'}
            </button>
          ))}
        </div>
      </div>

      <ContextBar
        items={
          snap
            ? [
                { label: 'Site ID / ATM ID', value: <SiteRef id={snap.siteId} /> },
                { label: 'Name of Franchisee', value: `${snap.franchiseName} · ${snap.frId}` },
                { label: 'Site Location', value: snap.atmLocation },
                { label: 'Bank / WLA account', value: `${snap.bank} · ${snap.wlaAccount}` },
                { label: 'Funding', value: `${snap.fundingModel} (${snap.siteType})` },
              ]
            : [
                { label: 'Master', value: m.master },
                { label: 'Sites with records', value: siteOptions.length },
                { label: 'Records', value: records.length },
                { label: 'Funding', value: `${m.funding} (${m.siteType}) only` },
              ]
        }
        right={
          <label className="relative flex items-center gap-1 text-[11px] text-muted">
            <span className="sr-only">Change site</span>
            <select value={siteSel?.siteId ?? ''} onChange={(e) => setParam('site', e.target.value)} className={selectCls} title="Change site">
              <option value="">All sites · {siteOptions.length}</option>
              {siteOptions.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  ATM {s.atmId} · {s.siteId}
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
          attention ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-100 bg-primary-soft/60 text-ink-2',
        )}
      >
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          {all.length} record(s){minDate ? ` from ${dmy(minDate)} to ${dmy(maxDate)}` : ''} · <b>{approved}</b> approved &amp; locked · <b>{pending}</b> awaiting verification / approval
          {attention ? (
            <>
              {' '}
              · <b>{attention} need attention</b> (draft / returned / rejected)
            </>
          ) : null}
          . Click a row to open the record.{' '}
          {!isReport && (
            <Link to={formPathOf(kind)} className="font-semibold text-primary hover:underline">
              New {kind === 'CBR' ? 'CBR' : 'cash loading'} →
            </Link>
          )}
        </span>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <span className="-mb-3 border-b-2 border-primary pb-2.5 text-[13px] font-semibold text-primary">Consolidated Datewise {kind}</span>
          <span className="ml-auto hidden text-[12px] text-muted md:inline">Wrapped column view · All {ALL_COLS.length} fields visible</span>
          <div className="relative">
            <Button variant="secondary" size="sm" icon={<CalendarRange size={14} />} onClick={() => setRangeOpen((o) => !o)}>
              Date range · {rangeLabel}
            </Button>
            {rangeOpen && (
              <div className="absolute top-10 right-0 z-30 w-72 rounded-lg border border-line bg-white p-3 shadow-lg">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted">
                    From
                    <input type="date" value={from} min={minDate} max={maxDate} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[12px] text-ink" />
                  </label>
                  <label className="text-[11px] text-muted">
                    To
                    <input type="date" value={to} min={minDate} max={maxDate} onChange={(e) => setTo(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-line px-2 text-[12px] text-ink" />
                  </label>
                </div>
                {from && to && from > to && <p className="mt-1.5 text-[11px] text-brand-red">From date is after To date.</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESETS.map(([l, n]) => (
                    <button
                      key={l}
                      disabled={!maxDate}
                      onClick={() => {
                        setFrom(isoAddDays(maxDate, -(n - 1)))
                        setTo(maxDate)
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
          <b className="text-primary">A–H</b> <span className="font-semibold">Date, site identity &amp; workflow status</span>
          <span className="text-muted">From the {m.master}</span>
          <span className="ml-auto text-muted">
            Same {rows.length} rows · No 1–{rows.length}
          </span>
        </div>
        <div className="relative flex flex-wrap items-center gap-3 border-b border-line px-4 py-1.5">
          <Table2 size={16} className="text-primary" />
          <span className="text-[13px] font-semibold">Datewise {kind} register</span>
          <span className="text-[11px] text-muted">{rows.length} rows</span>
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[12px] text-muted sm:w-[250px]">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search date, ATM / Site ID, record, status" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
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
          <b className="text-primary">I–P</b> <span className="font-semibold">Amounts, balances &amp; approval</span>
          <span className="text-muted">No repeated for row continuity</span>
          <span className="ml-auto text-muted">
            Same {rows.length} rows · No 1–{rows.length}
          </span>
        </div>
        {grid(BAND_B, BAND_A.length + 1, true)}

        <div className="flex flex-wrap justify-between gap-2 border-t border-line bg-surface/60 px-4 py-2.5 text-[11px] text-muted">
          <span>All {ALL_COLS.length} fields shown in two bands · No repeated for continuity</span>
          <span className="text-primary">Amounts in ₹ · {kind === 'Cash Loading' ? 'Balance = Opening + Loading − Withdrawal (provisional)' : `from the ${m.master}`}</span>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
        <span>Live from the {m.master} · Click a row (or its date) to open the record</span>
        <span>{siteSel ? `Site-level report · ${siteSel.siteId}` : 'All sites'}</span>
      </div>
    </div>
  )
}
