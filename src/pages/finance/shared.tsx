import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronLeft, ChevronRight, Columns3, Download, Info, ListFilter, Lock, Search, Table2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'

/** Status reference entry (Figma "Source status entries"): a bordered pill, clickable as a list filter. */
export function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-[26px] items-center gap-1.5 rounded-md border px-2.5 text-[12px] whitespace-nowrap transition-colors',
        active ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-line bg-white text-ink-2 hover:border-primary/40',
      )}
    >
      {children}
      {count != null && <span className={cn('rounded px-1 text-[11px]', active ? 'bg-white text-primary' : 'bg-surface text-muted')}>{count}</span>}
    </button>
  )
}

/**
 * ExcelGrid has no row-click prop, so rows carry a marker class (`rowmark__<id>`) via rowClassName
 * (or a `data-rid` attribute in local tables) and a wrapper div resolves clicks to a route.
 */
export const rowMark = (id: string) => `cursor-pointer rowmark__${id}`

export function useRowNav(to: (id: string) => string) {
  const navigate = useNavigate()
  return (e: MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.closest('a,button,input,select,textarea,label,thead')) return
    const tr = el.closest('tr')
    const id = tr?.getAttribute('data-rid') ?? tr?.className.match(/rowmark__(\S+)/)?.[1]
    if (id) navigate(to(id))
  }
}

/* ------------------------------------------------------------------ wrapped column view (list) */

export type BandCol<T> = {
  key: string
  header: string
  width?: number
  align?: 'left' | 'right'
  sortable?: boolean
  filterable?: boolean
  value?: (r: T) => string | number
  render?: (r: T) => ReactNode
}
export type BandDef<T> = { title: string; columns: BandCol<T>[] }

const letter = (i: number) => String.fromCharCode(65 + i)

/**
 * Figma "Wrapped column view": the source columns split into lettered bands (A–F, G–L …) that share the same rows.
 * Search / filters / sort / paging are done once for all bands so the rows never desync; the toolbar sits in the first band.
 */
export function WrappedBands<T>({
  bands,
  rows,
  rowId,
  onOpen,
  title,
  label,
  searchPlaceholder,
  noun,
  exportName,
  bandNote = 'Same rows in every band',
  emptyState,
  openLabel = 'Open',
}: {
  bands: BandDef<T>[]
  rows: T[]
  rowId: (r: T) => string
  onOpen: (id: string) => string
  title: string
  label: string
  searchPlaceholder: string
  noun: string
  exportName: string
  bandNote?: string
  emptyState: ReactNode
  openLabel?: string
}) {
  const navigate = useNavigate()
  const all = bands.flatMap((b) => b.columns)
  const raw = (c: BandCol<T>, r: T) => {
    const v = c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]
    return v == null ? '' : String(v)
  }
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [panel, setPanel] = useState<'filters' | 'columns' | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [page, setPage] = useState(1)
  const size = 10

  const processed = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = rows.filter((r) => !needle || all.some((c) => raw(c, r).toLowerCase().includes(needle)))
    for (const [k, f] of Object.entries(filters)) {
      const c = all.find((x) => x.key === k)
      if (c && f.trim()) out = out.filter((r) => raw(c, r).toLowerCase().includes(f.trim().toLowerCase()))
    }
    if (sort) {
      const c = all.find((x) => x.key === sort.key)
      if (c)
        out = [...out].sort((a, b) => {
          const av = c.value ? c.value(a) : raw(c, a)
          const bv = c.value ? c.value(b) : raw(c, b)
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'en', { numeric: true })
          return sort.dir === 'asc' ? cmp : -cmp
        })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, filters, sort])

  const pages = Math.max(1, Math.ceil(processed.length / size))
  const cur = Math.min(page, pages)
  const visible = processed.slice((cur - 1) * size, cur * size)
  const activeFilters = Object.values(filters).filter((v) => v.trim()).length
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))

  const go = (e: MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.closest('a,button,input,select,thead')) return
    const id = el.closest('tr')?.getAttribute('data-rid')
    if (id) navigate(onOpen(id))
  }

  let offset = 0
  return (
    <div className="space-y-4" onClick={go}>
      {bands.map((b, bi) => {
        const start = offset
        offset += b.columns.length
        const cols = b.columns.filter((c) => !hidden.has(c.key))
        const last = bi === bands.length - 1
        return (
          <section key={b.title} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-primary-soft/60 px-4 py-2.5 text-[12px]">
              <span className="font-semibold text-primary">{b.title}</span>
              <span className="text-muted">
                Source columns {letter(start)}–{letter(offset - 1)}
              </span>
              <span className="ml-auto text-muted">{bandNote}</span>
            </div>

            {bi === 0 && (
              <div className="relative flex flex-wrap items-center gap-3 border-b border-line px-4 py-1.5">
                <Table2 size={16} className="text-primary" />
                <span className="text-[13px] font-semibold">{title}</span>
                <span className="text-[11px] text-muted">{label}</span>
                <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted sm:w-[226px]">
                  <Search size={15} />
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value)
                      setPage(1)
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
                  />
                </label>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button type="button" onClick={() => setPanel(panel === 'filters' ? null : 'filters')} className="flex h-[30px] items-center gap-2 rounded-md border border-line bg-white px-2.5 text-[12px] font-semibold">
                    <ListFilter size={14} /> Filters
                    {activeFilters > 0 && <span className="rounded bg-primary px-1.5 text-[11px] text-white">{activeFilters}</span>}
                  </button>
                  <button type="button" onClick={() => setPanel(panel === 'columns' ? null : 'columns')} className="flex h-[30px] items-center gap-2 rounded-md border border-line bg-white px-2.5 text-[12px] font-semibold">
                    <Columns3 size={14} /> Columns
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCsv(exportName, all.map((c) => c.header), processed.map((r) => all.map((c) => raw(c, r))))}
                    className="flex h-[30px] items-center gap-2 rounded-md border border-line bg-white px-2.5 text-[12px] font-semibold"
                  >
                    <Download size={14} /> Export .xlsx
                  </button>
                </div>
                {panel && (
                  <div className="absolute top-full right-4 z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-line bg-white p-3 shadow-lg">
                    {panel === 'filters' ? (
                      <>
                        <div className="mb-2 text-[11px] text-muted">Filter · contains</div>
                        <div className="space-y-2">
                          {all.filter((c) => c.filterable).map((c) => (
                            <label key={c.key} className="block">
                              <span className="mb-1 block text-[12px] font-semibold">{c.header}</span>
                              <input
                                value={filters[c.key] ?? ''}
                                onChange={(e) => {
                                  setFilters((f) => ({ ...f, [c.key]: e.target.value }))
                                  setPage(1)
                                }}
                                className="h-8 w-full rounded-md border border-line px-2 text-[13px] outline-none focus:border-primary"
                              />
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-between">
                          <button type="button" className="text-[12px] text-muted" onClick={() => setFilters({})}>
                            Clear all
                          </button>
                          <button type="button" className="text-[12px] font-semibold text-primary" onClick={() => setPanel(null)}>
                            Done
                          </button>
                        </div>
                      </>
                    ) : (
                      bands.map((bb) => (
                        <div key={bb.title} className="mb-2">
                          <div className="mb-1 text-[11px] font-semibold text-muted">{bb.title}</div>
                          {bb.columns.map((c) => (
                            <label key={c.key} className="flex items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-surface">
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
                              {c.header}
                            </label>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="scroll-thin overflow-x-auto">
              {/* Figma: equal-width source columns, sort + filter glyphs in each header, 34px rows; rows open the record (click / Enter). */}
              <table className="w-full table-fixed border-collapse text-[12px]" style={{ minWidth: cols.length * 170 }}>
                <thead>
                  <tr className="bg-surface text-[10px] text-muted">
                    {b.columns.map((c, i) =>
                      hidden.has(c.key) ? null : (
                        <th key={c.key} className="border-r border-b border-line py-[3px] font-medium last:border-r-0">
                          {letter(start + i)}
                        </th>
                      ),
                    )}
                  </tr>
                  <tr className="bg-surface/60 text-left">
                    {cols.map((c) => {
                      const s = sort?.key === c.key ? sort.dir : null
                      return (
                        <th key={c.key} className="h-11 border-r border-b border-line px-3 font-semibold whitespace-nowrap text-ink last:border-r-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{c.header}</span>
                            <span className="ml-auto flex shrink-0 items-center gap-1 text-muted">
                              {c.sortable !== false && (
                                <button type="button" onClick={() => toggleSort(c.key)} aria-label={`Sort by ${c.header}`} className={cn(s && 'text-primary')}>
                                  {s === 'asc' ? <ArrowUp size={12} /> : s === 'desc' ? <ArrowDown size={12} /> : <ArrowDownUp size={12} />}
                                </button>
                              )}
                              {c.filterable && (
                                <button type="button" onClick={() => setPanel('filters')} aria-label={`Filter ${c.header}`} className={cn(filters[c.key]?.trim() && 'text-primary')}>
                                  <ListFilter size={12} />
                                </button>
                              )}
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const id = rowId(r)
                    return (
                      <tr
                        key={id}
                        data-rid={id}
                        tabIndex={bi === 0 ? 0 : -1}
                        aria-label={bi === 0 ? `${openLabel} ${id}` : undefined}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(onOpen(id))}
                        className="cursor-pointer outline-none hover:bg-surface/70 focus-visible:bg-primary-soft/50"
                      >
                        {cols.map((c) => (
                          <td key={c.key} className={cn('truncate border-r border-b border-line-soft px-3 py-2 last:border-r-0', c.align === 'right' && 'text-right')}>
                            {c.render ? c.render(r) : raw(c, r) || <span className="text-muted">—</span>}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {processed.length === 0 && <div className="px-6 py-10 text-center text-[13px] text-muted">{emptyState}</div>}
            </div>

            {last && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[11px] text-muted">
                <span>
                  {processed.length
                    ? `Showing ${(cur - 1) * size + 1}–${Math.min(processed.length, cur * size)} of ${processed.length} ${noun}`
                    : `No ${noun}`}
                  {bands.length > 1 && ' · Same rows in all bands'}
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    Page {cur} of {pages}
                  </span>
                  <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2.5 text-[11px] text-ink-2 disabled:text-muted/60">
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2.5 text-[11px] text-ink-2 disabled:text-muted/60">
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export function SourceNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-primary-soft/60 px-4 py-3.5 text-[12px]">
      <Info size={16} className="mt-0.5 shrink-0 text-primary" />
      <div>
        <div className="font-semibold text-ink">{title}</div>
        <div className="mt-1 leading-relaxed text-ink-2">{children}</div>
      </div>
    </div>
  )
}

/** List page filter bar: fields left, a context summary on the right (Figma "Yearly · F.Y. 22-23 / All months"). */
export function FilterBar({ children, ctx, ctxSub }: { children: ReactNode; ctx: ReactNode; ctxSub: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-line bg-white p-4">
      {children}
      <div className="ml-auto text-right">
        <div className="text-[13px] font-semibold text-primary">{ctx}</div>
        <div className="text-[11px] text-muted">{ctxSub}</div>
      </div>
    </div>
  )
}

/** Report heading above the wrapped bands: title + "Source template" pill, sub-line left and right. */
export function ReportHeading({ title, sub, right, pill = 'Source template' }: { title: ReactNode; sub: ReactNode; right: ReactNode; pill?: string }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
        <span className="rounded-md bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">{pill}</span>
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
        <span>{sub}</span>
        <span>{right}</span>
      </div>
    </div>
  )
}

export function PageFooter({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ record view / edit */

export function InfoBanner({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl bg-primary-soft/60 px-4 py-3.5 text-[12px]">
      <Info size={16} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="font-semibold text-ink">{title}</div>
        <div className="mt-1 text-ink-2">{children}</div>
      </div>
    </div>
  )
}

/** One section of the single record card (title, sub, "N fields"), separated by a divider. */
export function RecordSection({ title, sub, count, cols = 3, children }: { title: string; sub: string; count?: number; cols?: 2 | 3; children: ReactNode }) {
  return (
    <section className="border-b border-line px-6 py-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-[12px] text-muted">{sub}</p>
        </div>
        {count != null && <span className="mt-2 shrink-0 text-[11px] text-muted">{count} fields</span>}
      </div>
      <div className={cn('grid gap-x-6 gap-y-4', cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')}>{children}</div>
    </section>
  )
}

export function RecordFooter({ title, sub, children }: { title: ReactNode; sub: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/70 px-6 py-4">
      <div>
        <div className="text-[12px] font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}

/** Label row with an optional right-aligned note (e.g. "System-assigned", "None selected"). */
export function FLabel({ label, note, htmlFor }: { label: string; note?: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-ink">
        {label}
      </label>
      {note && <span className="text-[11px] text-muted">{note}</span>}
    </div>
  )
}

const inputBox =
  'h-10 w-full rounded-md border bg-white px-3 text-[13px] text-ink outline-none placeholder:text-muted/70 focus:border-primary focus:ring-3 focus:ring-primary/10 read-only:bg-surface/60 read-only:focus:ring-0'

export function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-[11px] text-brand-red">{msg}</p> : null
}

/** Text input; read-only in view mode (same box, no placeholder). */
export function TInput({
  label, name, value, onChange, placeholder, readOnly, error, prefix, note, mono, type = 'text', inputMode, maxLength, list,
}: {
  label: string
  name: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  error?: string
  prefix?: string
  note?: ReactNode
  mono?: boolean
  type?: string
  inputMode?: 'decimal' | 'numeric' | 'text'
  maxLength?: number
  list?: string
}) {
  return (
    <div className="min-w-0">
      <FLabel label={label} note={note} htmlFor={name} />
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted">{prefix}</span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          readOnly={readOnly}
          list={list}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={readOnly ? (value ? undefined : '—') : placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(inputBox, prefix && 'pl-7', mono && 'font-mono text-[12.5px]', error ? 'border-brand-red' : 'border-line')}
        />
      </div>
      <Err msg={error} />
    </div>
  )
}

/** System-assigned locked field (S.N.). */
export function LockedInput({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <FLabel label={label} note={note} />
      <div className="flex h-10 items-center justify-between rounded-md border border-line bg-surface px-3 text-[13px]">
        <span className={value ? 'text-ink' : 'text-muted'}>{value || 'System-assigned'}</span>
        <Lock size={14} className="text-muted" />
      </div>
    </div>
  )
}

/** Boxed radio options with "None selected" note; clicking the selected option again clears it (nullable). */
export function RadioCards({
  label, value, options, onChange, readOnly, className,
}: { label: string; value: string; options: readonly string[]; onChange?: (v: string) => void; readOnly?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <FLabel label={label} note={value ? (readOnly ? undefined : 'Click again to clear') : 'None selected'} />
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }} role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = value === o
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={readOnly && !on}
              onClick={() => !readOnly && onChange?.(on ? '' : o)}
              className={cn(
                'flex h-10 items-center gap-2.5 rounded-md border px-3 text-left text-[13px] transition-colors',
                on ? 'border-primary bg-primary-soft font-medium text-primary' : 'border-line bg-white text-ink',
                readOnly ? 'cursor-default' : 'hover:border-primary/40',
                readOnly && !on && 'text-muted',
              )}
            >
              <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', on ? 'border-primary' : 'border-muted/60')}>
                {on && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <span className="truncate">{o}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
