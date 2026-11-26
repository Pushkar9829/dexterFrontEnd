import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Download, Search, ShieldCheck } from 'lucide-react'
import { Badge, toneFor, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { cellCsv, cellText, isNumeric, type Cell, type ColKind, type TableData } from './compute'

const STATUS_TONE: Record<string, Tone> = {
  Profitable: 'green', 'Loss Making': 'red', 'Break-even': 'amber', Incomplete: 'gray', 'Reconciliation Pending': 'amber',
  Matched: 'green', 'Variance Found': 'amber', Variance: 'amber', 'Data Pending': 'gray',
  Paid: 'green', Pending: 'amber', Hold: 'amber', 'On Hold': 'amber', Failed: 'red', Credited: 'green',
  High: 'red', Medium: 'amber', Low: 'blue', Acknowledged: 'green', Dismissed: 'gray', Open: 'amber',
  Verified: 'green', Missing: 'red', 'Not set': 'gray', 'Pending Finance decision': 'amber',
}
export function StatusBadge({ s }: { s: string }) {
  return <Badge tone={STATUS_TONE[s] ?? toneFor(s)}>{s}</Badge>
}

/** Equal fixed-size internal section tabs (never stretched, spec §3.2). */
export function SectionTabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={value === t}
          onClick={() => onChange(t)}
          className={cn(
            'flex h-9 w-[176px] shrink-0 items-center justify-center rounded-lg border px-2 text-center text-[12px] font-semibold leading-tight transition-colors',
            value === t ? 'border-bright bg-primary-soft text-primary' : 'border-line bg-white text-ink-2 hover:border-primary/40 hover:text-primary',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

export function FSelect({ label, value, onChange, options, all = 'All', className, required }: { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; all?: string | null; className?: string; required?: boolean }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1 block text-[11px] font-semibold text-ink">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full appearance-none rounded-md border border-line bg-white pr-7 pl-2.5 text-[12px] text-ink outline-none focus:border-primary">
          {all !== null && <option value="">{all}</option>}
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value
            const l = typeof o === 'string' ? o : o.label
            return (
              <option key={v} value={v}>
                {l}
              </option>
            )
          })}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute top-2.5 right-2 text-muted" />
      </span>
    </label>
  )
}

export function FInput({ label, value, onChange, placeholder, type = 'text', className }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1 block text-[11px] font-semibold text-ink">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-[12px] text-ink outline-none focus:border-primary" />
    </label>
  )
}

export function Panel({ title, icon, action, children, className, sub }: { title: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; sub?: ReactNode }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-3">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {sub && <span className="text-[11px] text-muted">{sub}</span>}
        {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function AiNotice({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-[11.5px] text-violet-900', className)}>
      <ShieldCheck size={15} className="mt-px shrink-0 text-violet-600" />
      <span>AI is an intelligence layer only. It never alters financial values, approves payouts, changes bank accounts or releases payments — every finding is traceable to ERP records and must be reviewed by an authorised user.</span>
    </div>
  )
}

export function ProvisionalNote({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11.5px] text-amber-900">{children}</div>
}

/** KPI tile; tone follows the spec colour rules. Clicking opens the source records. */
export function Kpi({ n, label, value, caption, tone = 'blue', to, onClick }: { n: string; label: string; value: ReactNode; caption?: ReactNode; tone?: 'blue' | 'green' | 'red' | 'amber' | 'gray' | 'purple'; to?: string; onClick?: () => void }) {
  const bar = { blue: 'bg-bright', green: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500', gray: 'bg-slate-400', purple: 'bg-violet-500' }[tone]
  const val = { blue: 'text-ink', green: 'text-emerald-700', red: 'text-red-700', amber: 'text-amber-700', gray: 'text-slate-600', purple: 'text-violet-700' }[tone]
  const body = (
    <>
      <span className={cn('absolute inset-y-3 left-0 w-1 rounded-r', bar)} />
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-[10px] text-muted/70">{n}</span>
      </div>
      <div className={cn('mt-1 truncate text-[20px] font-bold leading-tight', val)}>{value}</div>
      {caption && <div className="mt-0.5 truncate text-[10.5px] text-muted">{caption}</div>}
    </>
  )
  const cls = 'relative block h-[86px] rounded-xl border border-line bg-white py-3 pr-3 pl-4 text-left transition-colors hover:border-primary/50'
  if (to) return <Link to={to} className={cls} title="Open source records">{body}</Link>
  if (onClick) return <button onClick={onClick} className={cls} title="Open source records">{body}</button>
  return <div className={cls}>{body}</div>
}

// ── data table with Search + Filter + Download on every table ─────────────
export type DCol<T> = { label: string; value: (r: T) => Cell; kind?: ColKind; cell?: (r: T) => ReactNode; className?: string }
export type DFilter<T> = { label: string; get: (r: T) => string }

export function DataTable<T>({
  title, icon, cols, rows, filters = [], fileName, onExport, pageSize: ps = 10, rowKey, onRowClick, toolbar, totals = true, empty = 'No records for the selected filters.', chips,
}: {
  title?: ReactNode
  icon?: ReactNode
  cols: DCol<T>[]
  rows: T[]
  filters?: DFilter<T>[]
  fileName: string
  onExport?: (count: number) => void
  pageSize?: number
  rowKey: (r: T) => string
  onRowClick?: (r: T) => void
  toolbar?: ReactNode
  totals?: boolean
  empty?: string
  chips?: ReactNode
}) {
  const [q, setQ] = useState('')
  const [fv, setFv] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ps)
  const filterOpts = useMemo(() => filters.map((f) => [...new Set(rows.map(f.get).filter(Boolean))].sort()), [filters, rows])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => filters.every((f) => !fv[f.label] || f.get(r) === fv[f.label]) && (!s || cols.some((c) => String(c.value(r)).toLowerCase().includes(s))))
  }, [rows, filters, fv, q, cols])
  const pages = Math.max(1, Math.ceil(shown.length / pageSize))
  const cur = Math.min(page, pages)
  const slice = shown.slice((cur - 1) * pageSize, cur * pageSize)
  const sums = useMemo(() => cols.map((c) => (c.kind === 'money' ? shown.reduce((a, r) => a + Number(c.value(r) || 0), 0) : null)), [cols, shown])
  const download = () => {
    downloadCsv(fileName, cols.map((c) => c.label), shown.map((r) => cols.map((c) => cellCsv(c.value(r), c.kind))))
    onExport?.(shown.length)
  }
  return (
    <section className="rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-end gap-2 border-b border-line-soft px-4 py-3">
        {title && (
          <h3 className="mr-auto flex items-center gap-2 self-center text-[15px] font-semibold text-ink">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </h3>
        )}
        {chips}
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search size={14} className="pointer-events-none absolute top-2.5 left-2.5 text-muted" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search…" className="h-9 w-[190px] rounded-md border border-line bg-white pr-2.5 pl-8 text-[12px] outline-none focus:border-primary" />
        </label>
        {filters.map((f, i) => (
          <FSelect key={f.label} label="" all={`${f.label}: All`} value={fv[f.label] ?? ''} onChange={(v) => { setFv((x) => ({ ...x, [f.label]: v })); setPage(1) }} options={filterOpts[i]} className="w-[160px] [&>span:first-child]:hidden" />
        ))}
        {toolbar}
        <Button variant="secondary" icon={<Download size={14} />} onClick={download} title="Download the filtered rows as CSV">
          Download
        </Button>
      </div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-max text-[12px]">
          <thead>
            <tr className="bg-primary-soft/70 text-left text-[11px] font-semibold text-ink-2">
              {cols.map((c) => (
                <th key={c.label} className={cn('px-3 py-2.5 whitespace-nowrap', isNumeric(c.kind) && 'text-right')}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn('border-t border-line-soft', onRowClick && 'cursor-pointer hover:bg-surface')}>
                {cols.map((c) => {
                  const v = c.value(r)
                  return (
                    <td key={c.label} className={cn('px-3 py-2 whitespace-nowrap', isNumeric(c.kind) && 'text-right tabular-nums', c.kind === 'money' && Number(v) < 0 && 'text-red-600', c.className)}>
                      {c.cell ? c.cell(r) : c.kind === 'status' ? <StatusBadge s={String(v)} /> : cellText(v, c.kind)}
                    </td>
                  )
                })}
              </tr>
            ))}
            {!slice.length && (
              <tr>
                <td colSpan={cols.length} className="px-3 py-8 text-center text-muted">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
          {totals && shown.length > 0 && sums.some((x) => x !== null) && (
            <tfoot>
              <tr className="border-t border-line bg-surface font-semibold">
                {cols.map((c, i) => (
                  <td key={c.label} className={cn('px-3 py-2 whitespace-nowrap', isNumeric(c.kind) && 'text-right tabular-nums')}>
                    {i === 0 ? 'Total (filtered)' : sums[i] !== null ? cellText(sums[i], 'money') : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <Pagination page={cur} pageSize={pageSize} total={shown.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} />
    </section>
  )
}

/** Generic TableData (reports, Ask-AI answers) rendered through DataTable. */
export function ResultTable({ data, title, fileName, onExport, filterCols = [] }: { data: TableData; title?: ReactNode; fileName: string; onExport?: (n: number) => void; filterCols?: string[] }) {
  type R = { i: number; c: Cell[] }
  const rows = useMemo<R[]>(() => data.rows.map((c, i) => ({ i, c })), [data])
  const cols = useMemo<DCol<R>[]>(() => data.columns.map((col, j) => ({ label: col.label, kind: col.kind, value: (r: R) => r.c[j] })), [data])
  const filters = useMemo<DFilter<R>[]>(() => {
    const idx = data.columns.map((c, j) => ({ c, j })).filter(({ c }) => c.kind === 'status' || filterCols.includes(c.label))
    return idx.slice(0, 2).map(({ c, j }) => ({ label: c.label, get: (r: R) => String(r.c[j]) }))
  }, [data, filterCols])
  return <DataTable title={title} cols={cols} rows={rows} filters={filters} fileName={fileName} onExport={onExport} rowKey={(r) => String(r.i)} />
}

/** Simple label/value list used in drill-down modals. */
export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-line-soft py-1">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
