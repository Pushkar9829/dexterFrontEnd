import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, BadgeIndianRupee, Bookmark, CalendarClock, ChevronDown, ExternalLink, FileSpreadsheet, Gauge, Search, ShieldCheck, Table2, UserPlus, Users, IdCard,
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
import { CATEGORIES, DATE_RANGES, REPORTS, getReport, savedViewStore, scheduleStore, type CategoryId, type PCol, type PRow, type ReportDef } from '@/data/reportsHub'
import { SavedReportsModal, ScheduledExportsModal } from './HubModals'
import { FOOTER } from './financial/Shell'

const ICONS: Record<CategoryId, ReactNode> = {
  financial: <BadgeIndianRupee size={20} />,
  franchise: <Users size={20} />,
  kyc: <IdCard size={20} />,
  operations: <Gauge size={20} />,
  onboarding: <UserPlus size={20} />,
  governance: <ShieldCheck size={20} />,
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
  const schedules = scheduleStore.use()
  const saved = savedViewStore.use()
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
              <span className="rounded bg-primary-soft px-1.5 text-[11px] text-primary">{schedules.filter((s) => s.active).length}</span>
            </Button>
            <Button variant="secondary" icon={<Bookmark size={16} />} onClick={() => setModal('saved')}>
              My saved reports
              <span className="rounded bg-primary-soft px-1.5 text-[11px] text-primary">{saved.length}</span>
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] text-muted sm:w-[280px]">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${REPORTS.length} reports`} className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
        </label>
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] font-medium outline-none focus:border-primary">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)} className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] font-medium outline-none focus:border-primary">
          {DATE_RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-muted sm:ml-auto">
          {q || category !== 'all' ? `${visibleCats.length} of ${CATEGORIES.length} categories · ${REPORTS.filter((r) => cats.some((c) => c.id === r.category) && matches(r)).length} of ${REPORTS.length} reports match` : `${CATEGORIES.length} categories · ${REPORTS.length} reports`} · Refreshed 09:00 IST
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCats.map((c) => {
            const all = REPORTS.filter((r) => r.category === c.id)
            const hits = all.filter(matches)
            const open = expanded.has(c.id) || !!q
            const shown = open ? hits : hits.slice(0, 3)
            return (
              <section key={c.id} className="flex flex-col rounded-xl border border-line bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">{ICONS[c.id]}</span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold">{c.name}</h3>
                    <div className="text-[12px] text-muted">{all.length} reports</div>
                  </div>
                </div>
                <p className="mt-3 text-[13px] font-medium text-ink-2">{c.kpi}</p>
                <ul className="mt-3 flex-1 space-y-1">
                  {shown.map((r) => {
                    const cls = cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                      r.id === reportId && !r.to ? 'bg-primary-soft font-semibold text-primary' : 'text-ink hover:bg-surface',
                    )
                    return (
                      <li key={r.id}>
                        {r.to ? (
                          <Link to={r.to} className={cls} title={r.desc}>
                            <FileSpreadsheet size={14} className="shrink-0 text-muted" />
                            <span className="flex-1 truncate">{r.name}</span>
                            <ExternalLink size={13} className="text-muted" />
                          </Link>
                        ) : (
                          <button className={cls} title={r.desc} onClick={() => select(r.id)}>
                            <Table2 size={14} className="shrink-0 text-muted" />
                            <span className="flex-1 truncate">{r.name}</span>
                            <ArrowRight size={13} className="text-muted" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {!q && all.length > 3 && (
                  <button
                    className="mt-3 flex items-center gap-1 self-start text-[12px] font-semibold text-primary"
                    onClick={() =>
                      setExpanded((s) => {
                        const n = new Set(s)
                        if (n.has(c.id)) n.delete(c.id)
                        else n.add(c.id)
                        return n
                      })
                    }
                  >
                    {open ? 'Show fewer' : `Show all ${all.length}`} <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
                  </button>
                )}
              </section>
            )
          })}
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-wider text-muted">SELECTED REPORT</div>
            <h2 className="text-[20px] font-semibold">{def.name}</h2>
            <p className="text-[12px] text-muted">
              {catName} / {def.name} · {rows.length.toLocaleString('en-IN')} records · {def.columns?.length ?? 0} columns · {def.source}
              {' · '}
              {def.dateKey ? `Date range: ${rangeDef.label}` : 'Date range not applicable'}
            </p>
          </div>
          <Button variant="secondary" icon={<Table2 size={16} />} onClick={() => setModal('grid')}>
            Open in data grid
          </Button>
        </div>
        <ExcelGrid
          key={def.id}
          title={def.name}
          countLabel={`${rows.length.toLocaleString('en-IN')} records`}
          rows={rows}
          columns={columns}
          rowId={(r) => String(r.__id)}
          letters
          searchPlaceholder={def.id === 'franchise-register' ? 'Search ID, name or city' : `Search ${def.name}`}
          exportName={def.id}
          emptyState={`No records in ${rangeDef.label}. Choose a wider date range.`}
          footerLeft={`Preview · ${Math.min(10, rows.length)} of ${rows.length.toLocaleString('en-IN')} records`}
          footerRight="All dates in IST · Amounts in INR"
        />
      </section>

      <p className="mt-6 border-t border-line pt-4 text-center text-[12px] text-muted">{FOOTER}</p>

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
