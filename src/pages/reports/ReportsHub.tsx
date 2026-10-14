import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, Bookmark, Building2, CalendarClock, CalendarDays, Check, ChevronDown, ChevronRight, Landmark, LockKeyhole, RefreshCw, Search, ShieldCheck, Table2, UserPlus,
} from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { franchiseStore } from '@/data/franchises'
import { CATEGORIES, DATE_RANGES, REPORTS, getReport, type CategoryId, type PCol, type PRow, type ReportDef } from '@/data/reportsHub'
import { SavedReportsModal, ScheduledExportsModal } from './HubModals'
import { FOOTER } from './financial/Shell'

const ICONS: Record<CategoryId, ReactNode> = {
  financial: <Landmark size={17} />,
  franchise: <Building2 size={17} />,
  kyc: <ShieldCheck size={17} />,
  operations: <Activity size={17} />,
  onboarding: <UserPlus size={17} />,
  governance: <LockKeyhole size={17} />,
}

const fmtDateTime = (v: string) =>
  new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
const fmtDate = (v: string) => (/^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(`${v.slice(0, 10)}T00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : v)

function cell(c: PCol, r: PRow): ReactNode {
  const v = r[c.key]
  if (v === '' || v == null) return <span className="text-muted">—</span>
  switch (c.kind) {
    case 'money': {
      const n = Number(v)
      return <span className={cn('font-medium', n < 0 && 'text-brand-red')}>₹ {n.toLocaleString('en-IN')}</span>
    }
    case 'pct':
      return `${v}%`
    case 'num':
      return Number(v).toLocaleString('en-IN')
    case 'date':
      return fmtDate(String(v))
    case 'datetime':
      return fmtDateTime(String(v))
    case 'status': {
      const t = toneFor(String(v))
      return <Badge tone={/overage|late|mismatch|reorder|due in/i.test(String(v)) ? 'amber' : /shortage/i.test(String(v)) ? 'red' : t}>{String(v)}</Badge>
    }
    default:
      return String(v)
  }
}

const toGrid = (cols: PCol[]): GridColumn<PRow>[] =>
  cols.map((c, i) => ({
    key: c.key,
    header: c.label,
    label: c.label,
    width: i === 1 ? 200 : 120,
    sortable: true,
    filterable: !c.kind || c.kind === 'status',
    align: c.kind === 'money' || c.kind === 'num' || c.kind === 'pct' ? 'right' : 'left',
    value: (r) => r[c.key],
    render: (r) => cell(c, r),
  }))

export default function ReportsHub() {
  const frs = franchiseStore.use()
  const [params, setParams] = useSearchParams()
  const fromUrl = getReport(params.get('report') ?? '')
  const reportId = fromUrl && !fromUrl.to ? fromUrl.id : 'franchise-register'
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [range, setRange] = useState('month')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<'schedules' | 'saved' | 'grid' | null>(null)

  const select = (id: string) => setParams((p) => ({ ...Object.fromEntries(p), report: id }), { replace: true })

  const q = query.trim().toLowerCase()
  const cats = CATEGORIES.filter((c) => category === 'all' || c.id === category)
  const matches = (r: ReportDef) => !q || r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
  const visibleCats = cats.filter((c) => REPORTS.some((r) => r.category === c.id && matches(r)))

  const def = getReport(reportId)!
  const rangeDef = DATE_RANGES.find((r) => r.id === range) ?? DATE_RANGES[0]
  const rows = useMemo(() => {
    const all = (def.build?.({ frs }) ?? []).map((r, i): PRow => ({ ...r, __id: `${def.id}-${i}` }))
    if (!def.dateKey || !rangeDef.from) return all
    return all.filter((r) => {
      const d = String(r[def.dateKey!] ?? '').slice(0, 10)
      return d >= rangeDef.from && (!rangeDef.to || d <= rangeDef.to)
    })
  }, [def, frs, rangeDef])
  const columns = useMemo(() => toGrid(def.columns ?? []), [def])
  const catName = CATEGORIES.find((c) => c.id === def.category)?.name ?? ''

  return (
    <div className="min-w-0">
      <PageHeader
        title="Unified Reports Hub"
        sub="Your financial, network and compliance insights. Select a report to explore its data."
        actions={
          <>
            <Button variant="secondary" icon={<CalendarClock size={16} />} onClick={() => setModal('schedules')}>
              Scheduled exports
            </Button>
            <Button variant="secondary" icon={<Bookmark size={16} />} onClick={() => setModal('saved')}>
              My saved reports
            </Button>
          </>
        }
      />

      <div className="mb-[22px] flex flex-wrap items-center gap-2.5">
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-[12px] text-muted sm:w-[296px]">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${REPORTS.length} reports`} className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
        </label>
        <label className="relative flex h-9 items-center rounded-lg border border-line bg-white text-[12px] font-semibold text-ink focus-within:border-primary">
          <ChevronDown size={14} className="pointer-events-none absolute left-3 text-ink-2" />
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-full cursor-pointer appearance-none bg-transparent pr-3 pl-8 outline-none">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink focus-within:border-primary">
          <CalendarDays size={14} className="text-ink-2" />
          <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)} className="cursor-pointer appearance-none bg-transparent outline-none">
            {DATE_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <span className="flex items-center gap-3 text-[11px] text-muted sm:ml-auto">
          <span>
            {q || category !== 'all' ? `${visibleCats.length} of ${CATEGORIES.length} categories · ${REPORTS.filter((r) => cats.some((c) => c.id === r.category) && matches(r)).length} of ${REPORTS.length} reports match` : `${CATEGORIES.length} categories · ${REPORTS.length} reports`}
          </span>
          <span className="h-4 w-px bg-line" />
          <span className="flex items-center gap-1.5">
            <RefreshCw size={13} /> Refreshed 09:00 IST
          </span>
        </span>
      </div>

      {visibleCats.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center text-[13px] text-muted">
          No reports match “{query}”.{' '}
          <button className="font-semibold text-primary" onClick={() => { setQuery(''); setCategory('all') }}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCats.map((c) => {
            const all = REPORTS.filter((r) => r.category === c.id)
            const hits = all.filter(matches)
            const open = expanded.has(c.id) || !!q
            const shown = open ? hits : hits.slice(0, 3)
            const selectedHere = all.some((r) => r.id === reportId && !r.to)
            const toggle = () =>
              setExpanded((x) => {
                const n = new Set(x)
                if (n.has(c.id)) n.delete(c.id)
                else n.add(c.id)
                return n
              })
            return (
              <section key={c.id} className={cn('flex min-h-[168px] flex-col rounded-xl border px-3.5 pt-3.5 pb-3', selectedHere ? 'border-primary bg-primary-soft/30 ring-1 ring-primary' : 'border-line bg-white')}>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-md bg-primary-soft text-primary">{ICONS[c.id]}</span>
                  <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold">{c.name}</h3>
                  <button
                    type="button"
                    onClick={toggle}
                    disabled={!!q || all.length <= 3}
                    aria-label={open ? `Show fewer ${c.name}` : `Show all ${c.name}`}
                    title={all.length > 3 ? (open ? 'Show fewer' : `Show all ${all.length}`) : undefined}
                    className="flex items-center gap-1.5 text-[10px] text-muted hover:text-primary disabled:hover:text-muted"
                  >
                    {all.length} reports <ChevronRight size={14} className={cn('text-ink transition-transform', open && all.length > 3 && 'rotate-90')} />
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-muted">{c.kpi}</p>
                <ul className="mt-2 flex-1">
                  {shown.map((r) => {
                    const active = r.id === reportId && !r.to
                    const cls = cn(
                      'flex h-[25px] w-full items-center gap-2 rounded px-1.5 text-left text-[11px] transition-colors',
                      active ? 'bg-primary-soft font-semibold text-primary' : 'text-ink-2 hover:bg-surface',
                    )
                    return (
                      <li key={r.id}>
                        {r.to ? (
                          <Link to={r.to} className={cls} title={r.desc}>
                            <Table2 size={12} className="shrink-0 text-muted" />
                            <span className="flex-1 truncate">{r.name}</span>
                            <ArrowUpRight size={12} className="text-primary" />
                          </Link>
                        ) : (
                          <button className={cls} title={r.desc} onClick={() => select(r.id)}>
                            <Table2 size={12} className={cn('shrink-0', active ? 'text-primary' : 'text-muted')} />
                            <span className="flex-1 truncate">{r.name}</span>
                            {active ? <Check size={12} /> : <ArrowUpRight size={12} className="text-primary" />}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {!q && open && all.length > 3 && (
                  <button className="mt-2 flex items-center gap-1 self-start text-[12px] font-semibold text-primary" onClick={toggle}>
                    Show fewer <ChevronDown size={14} className="rotate-180" />
                  </button>
                )}
              </section>
            )
          })}
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold">{def.name}</h2>
              <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary">SELECTED REPORT</span>
            </div>
            <p className="mt-1 text-[10px] text-muted">
              {catName} / {def.name} · {rows.length.toLocaleString('en-IN')} records · {def.columns?.length ?? 0} columns · {def.source}
              {' · '}
              {def.dateKey ? `Date range: ${rangeDef.label}` : 'Date range not applicable'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-muted">Sort, filter and export in the Excel-style view</span>
            <Button icon={<ArrowUpRight size={16} />} onClick={() => setModal('grid')}>
              Open in data grid
            </Button>
          </div>
        </div>
        <ExcelGrid
          key={def.id}
          title={def.name}
          countLabel={`${rows.length.toLocaleString('en-IN')} records`}
          rows={rows}
          columns={columns}
          rowId={(r) => String(r.__id)}
          letters
          selectable
          // Figma preview: 3 rows, no selection bar (bulk export lives in "Open in data grid")
          hideSelectionBar
          pageSize={3}
          searchPlaceholder={def.id === 'franchise-register' ? 'Search ID, name or city' : `Search ${def.name}`}
          exportName={def.id}
          emptyState={`No records in ${rangeDef.label}. Choose a wider date range.`}
        />
      </section>

      <div className="mt-[18px] flex flex-wrap justify-between gap-2 text-[10px] text-muted">
        <span>{FOOTER}</span>
        <span>All dates in IST · Amounts in INR</span>
      </div>

      {modal === 'schedules' && <ScheduledExportsModal onClose={() => setModal(null)} defaultReport={reportId} />}
      {modal === 'saved' && (
        <SavedReportsModal
          onClose={() => setModal(null)}
          current={{ reportId, category, range, query }}
          onOpen={(v) => {
            setCategory(v.category)
            setRange(v.range)
            setQuery(v.query)
            select(v.reportId)
            setModal(null)
            toast(`Opened “${v.name}”`, 'info')
          }}
        />
      )}
      {modal === 'grid' && (
        <Modal
          title={def.name}
          sub={`${catName} · ${rows.length.toLocaleString('en-IN')} records · ${def.source}`}
          onClose={() => setModal(null)}
          width={1200}
          footer={
            <>
              {def.gridTo && (
                <Link to={def.gridTo} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-[13px] font-semibold hover:bg-surface">
                  Go to module <ArrowRight size={15} />
                </Link>
              )}
              <Button onClick={() => setModal(null)}>Close</Button>
            </>
          }
        >
          <ExcelGrid
            title={def.name}
            countLabel={`${rows.length.toLocaleString('en-IN')} records`}
            rows={rows}
            columns={columns}
            rowId={(r) => String(r.__id)}
            letters
            selectable
            formulaBar
            pageSize={25}
            searchPlaceholder={`Search ${def.name}`}
            exportName={def.id}
            bulkActions={(sel, clear) => (
              <button
                className="font-semibold text-primary"
                onClick={() => {
                  const keep = new Set(sel)
                  const pickRows = rows.filter((r) => keep.has(String(r.__id)))
                  const cols = def.columns ?? []
                  downloadCsv(`${def.id}-selection`, cols.map((c) => c.label), pickRows.map((r) => cols.map((c) => String(r[c.key] ?? ''))))
                  toast(`Exported ${pickRows.length} selected rows`)
                  clear()
                }}
              >
                Export selected
              </button>
            )}
          />
        </Modal>
      )}
    </div>
  )
}
