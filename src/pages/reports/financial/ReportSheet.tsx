import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowDownUp, ArrowUp, Columns3, Download, ListFilter, MousePointer2, Search, Table2 } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { MULTI_SEP, denoTotal, dmy, inr, type Row } from '@/data/reportsFinancial'

export type ColKind = 'text' | 'money' | 'signed' | 'number' | 'date' | 'time' | 'enum' | 'multi' | 'phone' | 'email' | 'ifsc' | 'deno'

export type SheetCol = {
  key: string
  label: string
  /** Hindi sub-label (bilingual DLR sheets) */
  hi?: string
  /** small group label above the header (e.g. "Counter", "Physical") or, with `groupRow`, a spanning group row */
  group?: string
  width?: number
  kind?: ColKind
  options?: string[]
  /** show enum values as status badges */
  badge?: boolean
  editable?: boolean
  /** not a source column (e.g. the Action column) — skipped by export / search */
  virtual?: boolean
  value?: (r: Row) => string
  render?: (r: Row) => ReactNode
}

export type SheetBand = {
  title: string
  /** text after "Source columns X–Y" in the band header (e.g. "Continued", "S.N. repeated for reference") */
  extra?: string
  /** text before "Source columns" (e.g. a date "31.07.2026") */
  pre?: string
  /** right-aligned band header text */
  note?: string
  cols: SheetCol[]
  /** render column groups as a spanning row ("Payment fields · I–K") */
  groupRow?: boolean
  /** toolbar title for this band when every band has its own toolbar */
  toolbarTitle?: string
  /** footer text for this band's card (cards layout) */
  footer?: string
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const letter = (i: number) => (i < 26 ? LETTERS[i] : LETTERS[Math.floor(i / 26) - 1] + LETTERS[i % 26])

/** Validates + normalises an edited cell. Returns an error message or the value to store. */
export function checkCell(col: SheetCol, raw: string): { error: string } | { value: string } {
  const v = raw.trim()
  if (!v) return { value: '' }
  switch (col.kind) {
    case 'money':
    case 'number':
      return /^\d+(\.\d{1,2})?$/.test(v.replace(/,/g, '')) ? { value: v.replace(/,/g, '') } : { error: `${col.label}: enter a positive amount` }
    case 'signed':
      return /^-?\d+(\.\d{1,2})?$/.test(v.replace(/,/g, '')) ? { value: v.replace(/,/g, '') } : { error: `${col.label}: enter an amount (use - for shortage)` }
    case 'phone':
      return /^[6-9]\d{9}$/.test(v.replace(/\s/g, '')) ? { value: v.replace(/\s/g, '') } : { error: `${col.label}: 10-digit mobile number starting 6–9` }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? { value: v.toLowerCase() } : { error: `${col.label}: enter a valid email address` }
    case 'ifsc':
      return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v) ? { value: v.toUpperCase() } : { error: `${col.label}: IFSC looks like HDFC0001234` }
    case 'enum':
      return !col.options || col.options.includes(v) ? { value: v } : { error: `${col.label}: choose one of ${col.options.join(', ')}` }
    case 'multi': {
      const parts = v.split(MULTI_SEP).map((x) => x.trim()).filter(Boolean)
      return !col.options || parts.every((p) => col.options!.includes(p)) ? { value: parts.join(MULTI_SEP) } : { error: `${col.label}: choose from ${col.options.join(', ')}` }
    }
    case 'deno':
      return denoTotal(v) !== null || /^\d+$/.test(v) ? { value: v.replace(/\s*[x*]\s*/gi, '×') } : { error: `${col.label}: use note × count, e.g. 100×12 / 200×5 / 500×20` }
    default:
      return { value: v }
  }
}

export const rawOf = (c: SheetCol, r: Row) => (c.value ? c.value(r) : (r[c.key] ?? ''))

/** display text used for search + export */
export const textOf = (c: SheetCol, r: Row) => {
  const v = rawOf(c, r)
  if (c.kind === 'date') return dmy(v)
  if (c.kind === 'multi') return v.split(MULTI_SEP).join(' / ')
  return v
}

const isNum = (c: SheetCol) => c.kind === 'money' || c.kind === 'signed' || c.kind === 'number'

function defaultRender(c: SheetCol, r: Row): ReactNode {
  const v = rawOf(c, r)
  if (v === '') return <span className="text-muted">—</span>
  switch (c.kind) {
    case 'money':
    case 'signed': {
      const n = Number(v)
      return <span className={n < 0 ? 'font-medium text-brand-red' : 'font-medium'}>{inr(v)}</span>
    }
    case 'date':
      return dmy(v)
    case 'multi':
      return (
        <span className="flex flex-col gap-2 py-1">
          {v.split(MULTI_SEP).map((x) => (
            <span key={x}>{x}</span>
          ))}
        </span>
      )
    case 'deno': {
      const t = denoTotal(v)
      return (
        <span className="block whitespace-normal">
          {v}
          {t !== null && <span className="block text-[11px] text-muted">= {inr(t)}</span>}
        </span>
      )
    }
    case 'enum':
      return c.badge ? <Badge tone={toneFor(v) === 'gray' ? 'navy' : toneFor(v)}>{v}</Badge> : v
    default:
      return v
  }
}

/** Inline editor for one cell (edit mode). Commits on change (dropdowns) or blur (text). */
function EditCell({ col, row, onCommit }: { col: SheetCol; row: Row; onCommit: (value: string) => boolean }) {
  const raw = rawOf(col, row)
  const [v, setV] = useState(raw)
  const base = 'h-8 w-full min-w-24 rounded-md border border-blue-200 bg-white px-2 text-[13px] text-ink outline-none focus:border-primary'
  if (col.kind === 'multi' && col.options) {
    const set = new Set(raw.split(MULTI_SEP).filter(Boolean))
    return (
      <span className="flex flex-col gap-1.5 py-1">
        {col.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={set.has(o)}
              onChange={() => {
                const next = col.options!.filter((x) => (x === o ? !set.has(o) : set.has(x)))
                onCommit(next.join(MULTI_SEP))
              }}
            />
            {o}
          </label>
        ))}
      </span>
    )
  }
  if (col.options)
    return (
      <select aria-label={col.label} value={raw} onChange={(e) => onCommit(e.target.value)} className={base}>
        <option value="">—</option>
        {col.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    )
  const commit = () => {
    if (v === raw) return
    if (!onCommit(v)) setV(raw)
  }
  return (
    <input
      aria-label={col.label}
      type={col.kind === 'date' ? 'date' : col.kind === 'time' ? 'time' : 'text'}
      inputMode={isNum(col) ? 'decimal' : undefined}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cn(base, isNum(col) && 'text-right')}
    />
  )
}

function Head({ c, groupInHeader, sort, onSort }: { c: SheetCol; groupInHeader: boolean; sort: 'asc' | 'desc' | null; onSort?: () => void }) {
  return (
    <div className={cn('flex items-start gap-2', isNum(c) && 'justify-between')}>
      <div className="leading-snug whitespace-normal">
        {groupInHeader && c.group && <div className="mb-1 text-[12px] font-semibold text-primary">{c.group}</div>}
        <div className="font-semibold text-ink">{c.label}</div>
        {c.hi && (
          <div lang="hi" className="mt-1.5 text-[11px] font-normal text-muted">
            {c.hi}
          </div>
        )}
      </div>
      {onSort && (
        <button type="button" onClick={onSort} aria-label={`Sort by ${c.label}`} className={cn('mt-0.5 ml-auto shrink-0', sort ? 'text-primary' : 'text-muted')}>
          {sort === 'asc' ? <ArrowUp size={13} /> : sort === 'desc' ? <ArrowDown size={13} /> : <ArrowDownUp size={13} />}
        </button>
      )}
    </div>
  )
}

type Ctx = {
  editing: boolean
  hidden: Set<string>
  sort: { key: string; dir: 'asc' | 'desc' } | null
  setSort: (s: { key: string; dir: 'asc' | 'desc' } | null) => void
  handle: (rowId: string, col: SheetCol, value: string) => boolean
  rowClassName?: (r: Row) => string | undefined
  readOnlyRow?: (r: Row) => string | false
}

/** One band's table: letters row, optional group row, header row, body. */
function BandTable({ band, lead, leadLetters, start, rows, ctx, locked }: { band: SheetBand; lead: SheetCol[]; leadLetters: boolean; start: number; rows: Row[]; ctx: Ctx; locked: boolean }) {
  const cols = [...lead.map((c, i) => ({ c, l: letter(i), lead: true })), ...band.cols.map((c, i) => ({ c, l: letter(start + i), lead: false }))].filter(
    (x) => !ctx.hidden.has(x.c.key),
  )
  // spanning group row (CLF: Payment fields · I–K | FR / Sender Details · L–O)
  const groups: { label: string; span: number; first: string; last: string }[] = []
  if (band.groupRow) {
    for (const x of cols) {
      const g = x.lead ? '' : (x.c.group ?? '')
      const prev = groups[groups.length - 1]
      if (prev && prev.label === g) {
        prev.span++
        prev.last = x.l
      } else groups.push({ label: g, span: 1, first: x.l, last: x.l })
    }
  }
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          {groups.length > 0 && (
            <tr className="text-[12px]">
              {groups.map((g, i) => (
                <th
                  key={i}
                  colSpan={g.span}
                  className={cn('border-b border-line px-3 py-2 text-left font-normal', i % 2 ? 'bg-primary-soft/70 text-primary' : 'bg-surface text-muted')}
                >
                  {g.label && (
                    <span className="flex justify-between gap-2">
                      <span className={i % 2 ? 'font-semibold' : ''}>{i % 2 ? g.label : `${g.label} · ${g.first}–${g.last}`}</span>
                      {i % 2 ? <span className="text-muted">{`${g.first}–${g.last}`}</span> : null}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          )}
          {leadLetters && (
            <tr className="bg-surface text-[10px] text-muted">
              {cols.map((x) => (
                <th key={x.c.key} className="border-r border-b border-line py-1 text-center font-medium last:border-r-0">
                  {x.l}
                </th>
              ))}
            </tr>
          )}
          <tr className="bg-white text-left align-top">
            {cols.map((x) => {
              const s = ctx.sort?.key === x.c.key ? ctx.sort.dir : null
              const sortable = !ctx.editing && !x.c.virtual && x.c.key !== 'sn'
              return (
                <th key={x.c.key} className="border-r border-b border-line px-3 py-3 font-semibold last:border-r-0" style={{ minWidth: x.c.width ?? 140 }}>
                  <Head
                    c={x.c}
                    groupInHeader={!band.groupRow}
                    sort={s}
                    onSort={sortable ? () => ctx.setSort(s === null ? { key: x.c.key, dir: 'asc' } : s === 'asc' ? { key: x.c.key, dir: 'desc' } : null) : undefined}
                  />
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ro = ctx.readOnlyRow?.(r)
            return (
              <tr key={r.id} className={cn('align-middle hover:bg-surface/60', ctx.rowClassName?.(r))}>
                {cols.map((x) => {
                  const c = x.c
                  const canEdit = ctx.editing && !ro && !(x.lead && locked) && c.editable !== false && !c.virtual
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        'border-r border-b border-line-soft px-3 py-3 whitespace-nowrap last:border-r-0',
                        isNum(c) && 'text-right',
                        canEdit && 'bg-blue-50/40 px-2 py-2',
                      )}
                    >
                      {canEdit ? <EditCell key={rawOf(c, r)} col={c} row={r} onCommit={(v) => ctx.handle(r.id, c, v)} /> : c.render ? c.render(r) : defaultRender(c, r)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BandHeader({ band, range, right }: { band: SheetBand; range: string; right?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-primary-soft/60 px-4 py-2.5 text-[12px]">
      <span className="font-semibold text-primary">{band.title}</span>
      <span className="text-muted">{[band.pre, `Source columns ${range}`, band.extra].filter(Boolean).join(' · ')}</span>
      {right && <span className="text-muted sm:ml-auto">{right}</span>}
    </div>
  )
}

/**
 * Wide source sheet split into column bands that share the same rows (Figma: Financial Report sheets).
 * `lead` columns (S.N., Date, Deno …) start the first band and, with `repeatLead`, repeat at the start of every band with their original letters.
 * layout "single": one card (band header → toolbar → grid → next band header → grid … → pagination), as on BS / SD / CLF / FFM EOD.
 * layout "cards": one card per band with its own footer (DLR2 / DLR3 sheets).
 * In edit mode the toolbars are hidden and every editable cell is an input.
 */
export function ReportSheet({
  title,
  countLabel,
  rows,
  lead = [],
  bands,
  editing,
  onCellChange,
  searchPlaceholder = 'Search report fields',
  exportName,
  filterPanel,
  filterCount = 0,
  toolbarExtra,
  rowClassName,
  readOnlyRow,
  empty,
  noun = 'rows',
  layout = 'single',
  toolbar = 'first',
  repeatLead = true,
  hideBandHeader = false,
  bandRight,
  paginate = true,
  footer,
}: {
  title: string
  countLabel?: string
  rows: Row[]
  lead?: SheetCol[]
  bands: SheetBand[]
  editing: boolean
  onCellChange: (rowId: string, key: string, value: string) => void
  searchPlaceholder?: string
  exportName: string
  /** content of the Filters popover (allowed-value selects) */
  filterPanel?: ReactNode
  filterCount?: number
  toolbarExtra?: ReactNode
  rowClassName?: (r: Row) => string | undefined
  readOnlyRow?: (r: Row) => string | false
  empty?: { title: string; text: string }
  noun?: string
  layout?: 'single' | 'cards'
  toolbar?: 'first' | 'each' | 'none'
  repeatLead?: boolean
  hideBandHeader?: boolean
  bandRight?: (band: SheetBand, i: number) => string | undefined
  paginate?: boolean
  /** footer line of the single-layout card */
  footer?: { left?: ReactNode; right?: ReactNode }
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState<'filters' | 'columns' | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const allCols = useMemo(() => [...lead, ...bands.flatMap((b) => b.cols)].filter((c) => !c.virtual), [lead, bands])

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = !q || editing ? rows : rows.filter((r) => allCols.some((c) => textOf(c, r).toLowerCase().includes(q)))
    const c = sort && !editing ? allCols.find((x) => x.key === sort.key) : undefined
    if (c && sort) {
      out = [...out].sort((a, b) => {
        const av = rawOf(c, a)
        const bv = rawOf(c, b)
        const cmp = isNum(c) ? (Number(av) || 0) - (Number(bv) || 0) : av.localeCompare(bv, 'en', { numeric: true })
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [rows, query, allCols, editing, sort])

  const pages = Math.max(1, Math.ceil(processed.length / pageSize))
  const current = Math.min(page, pages)
  const visible = paginate && layout === 'single' ? processed.slice((current - 1) * pageSize, current * pageSize) : processed

  const handle = (rowId: string, col: SheetCol, value: string) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row) return false
    const ro = readOnlyRow?.(row)
    if (ro) {
      toast(ro, 'info')
      return false
    }
    if (value === rawOf(col, row)) return true
    const res = checkCell(col, value)
    if ('error' in res) {
      toast(res.error, 'info')
      return false
    }
    onCellChange(rowId, col.key, res.value)
    return true
  }
  const ctx: Ctx = { editing, hidden, sort, setSort, handle, rowClassName, readOnlyRow }

  const onExport = () => {
    downloadCsv(
      exportName,
      allCols.map((c) => c.label),
      processed.map((r) => allCols.map((c) => textOf(c, r))),
    )
    toast(`Exported ${processed.length} ${noun} · recorded in the audit trail`)
  }

  const toolbarEl = (label: string) => (
    <div className="relative flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3">
      <Table2 size={18} className="text-primary" />
      <span className="text-[14px] font-semibold">{label}</span>
      {countLabel && <span className="text-[12px] text-muted">{countLabel}</span>}
      <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted sm:w-[228px]">
        <Search size={15} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {toolbarExtra}
        <button
          type="button"
          onClick={() => setPanel(panel === 'filters' ? null : 'filters')}
          className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold', panel === 'filters' ? 'border-primary text-primary' : 'border-line')}
        >
          <ListFilter size={15} /> Filters
          {filterCount > 0 && <span className="rounded bg-primary px-1.5 text-[11px] text-white">{filterCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === 'columns' ? null : 'columns')}
          className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold', panel === 'columns' ? 'border-primary text-primary' : 'border-line')}
        >
          <Columns3 size={15} /> Columns
        </button>
        <button type="button" onClick={onExport} className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold hover:bg-surface">
          <Download size={15} /> Export .xlsx
        </button>
      </div>
      {panel === 'filters' && (
        <div className="absolute top-full right-4 z-30 mt-1 w-72 rounded-lg border border-line bg-white p-3 shadow-lg">
          <div className="mb-2 text-[11px] font-semibold text-muted">Filters</div>
          {filterPanel ? <div className="flex flex-col gap-2 [&>select]:w-full">{filterPanel}</div> : <p className="text-[12px] text-muted">Use search to filter this report.</p>}
        </div>
      )}
      {panel === 'columns' && (
        <div className="absolute top-full right-4 z-30 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-lg">
          {[...lead, ...bands.flatMap((b) => b.cols)].map((c, i) => (
            <label key={c.key + i} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-surface">
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
        </div>
      )}
    </div>
  )

  const starts = bands.map((_, i) => lead.length + bands.slice(0, i).reduce((n, b) => n + b.cols.length, 0))
  const rangeOf = (b: SheetBand, i: number) => {
    const first = i === 0 && lead.length ? 0 : starts[i]
    const src = b.cols.length
    return `${letter(first)}–${letter(starts[i] + Math.max(src, 1) - 1)}`
  }
  const emptyBlock =
    processed.length === 0 ? (
      <div className="px-6 py-14 text-center">
        {empty && !query ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Table2 size={20} />
            </span>
            <div className="mt-4 text-[16px] font-semibold text-ink">{empty.title}</div>
            <p className="mt-2 text-[13px] text-muted">{empty.text}</p>
          </>
        ) : (
          <p className="text-[13px] text-muted">{query ? 'No rows match your search.' : 'No rows yet.'}</p>
        )}
      </div>
    ) : null

  const showToolbar = (i: number) => !editing && (toolbar === 'each' || (toolbar === 'first' && i === 0))

  if (layout === 'cards')
    return (
      <div className="space-y-4">
        {bands.map((b, i) => (
          <section key={b.title} className="overflow-hidden rounded-xl border border-line bg-white">
            <BandHeader band={b} range={rangeOf(b, i)} right={bandRight?.(b, i)} />
            {showToolbar(i) && toolbarEl(b.toolbarTitle ?? title)}
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 text-[12px] text-muted">
              <span className="font-semibold text-ink-2">{processed.length} {noun}</span>
              <span className="flex items-center gap-1.5">
                <MousePointer2 size={13} /> {editing ? 'Editable grid · Changes apply when you click Save' : 'Editable grid · Source values'}
              </span>
            </div>
            <BandTable band={b} lead={i === 0 || repeatLead ? lead : []} leadLetters start={starts[i]} rows={visible} ctx={ctx} locked={i > 0} />
            {emptyBlock}
            <div className="border-t border-line px-4 py-2.5 text-[12px] text-muted">
              All {processed.length} {noun} visible · Blank cells preserved
            </div>
            {b.footer && (
              <div className="flex flex-wrap justify-between gap-2 border-t border-line bg-surface/60 px-4 py-2.5 text-[11px] text-muted">
                <span>{b.footer}</span>
                <span className="text-primary">{editing ? 'Editing · Save to apply' : 'Editable grid · Update to edit'}</span>
              </div>
            )}
          </section>
        ))}
      </div>
    )

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      {bands.map((b, i) => (
        <div key={b.title}>
          {!hideBandHeader && <BandHeader band={b} range={rangeOf(b, i)} right={bandRight?.(b, i)} />}
          {showToolbar(i) && toolbarEl(b.toolbarTitle ?? title)}
          <BandTable band={b} lead={i === 0 || repeatLead ? lead : []} leadLetters start={starts[i]} rows={visible} ctx={ctx} locked={i > 0} />
          {i === 0 && bands.length === 1 && emptyBlock}
        </div>
      ))}
      {bands.length > 1 && emptyBlock}
      {paginate && (
        <div className="border-t border-line">
          <Pagination
            page={current}
            pageSize={pageSize}
            total={processed.length}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n)
              setPage(1)
            }}
            noun={noun}
          />
        </div>
      )}
      {footer && (
        <div className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-2.5 text-[12px] text-muted">
          <span>{footer.left}</span>
          <span className="text-primary">{footer.right}</span>
        </div>
      )}
    </section>
  )
}
