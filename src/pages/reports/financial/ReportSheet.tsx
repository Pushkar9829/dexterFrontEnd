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
  /** per-row edit guard (e.g. DLR3 Date only on the first denomination row) */
  editableRow?: (r: Row) => boolean
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
        <span className="flex flex-col gap-3 py-1.5">
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
          {t !== null && <span className="block text-[10px] text-muted">= {inr(t)}</span>}
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
  // Figma edit frames look like the view grid: cells stay plain, the input only shows a border on hover / focus.
  const base =
    '-mx-1.5 h-7 w-[calc(100%+12px)] min-w-0 rounded border border-transparent bg-transparent px-1.5 text-[11px] text-ink outline-none hover:border-blue-200 focus:border-primary focus:bg-white'
  if (col.kind === 'multi' && col.options) {
    const set = new Set(raw.split(MULTI_SEP).filter(Boolean))
    return (
      <span className="flex flex-col gap-1.5 py-1">
        {col.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-[11px]">
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

function Head({
  c,
  groupInHeader,
  sort,
  onSort,
  filter,
}: {
  c: SheetCol
  groupInHeader: boolean
  sort: 'asc' | 'desc' | null
  onSort?: () => void
  filter?: { active: boolean; open: boolean; toggle: () => void }
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="min-w-0 leading-[1.35] whitespace-normal">
        {groupInHeader && c.group && <div className="mb-0.5 text-[10px] font-semibold text-primary">{c.group}</div>}
        <div className="font-semibold text-ink">{c.label}</div>
        {c.hi && (
          <div lang="hi" className="mt-1 text-[10px] font-normal text-muted">
            {c.hi}
          </div>
        )}
      </div>
      {(onSort || filter) && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-ink-2">
          {onSort && (
            <button type="button" onClick={onSort} aria-label={`Sort by ${c.label}`} className={cn(sort && 'text-primary')}>
              {sort === 'asc' ? <ArrowUp size={11} /> : sort === 'desc' ? <ArrowDown size={11} /> : <ArrowDownUp size={11} />}
            </button>
          )}
          {filter && (
            <button type="button" onClick={filter.toggle} aria-label={`Filter ${c.label}`} aria-expanded={filter.open} className={cn(filter.active && 'text-primary')}>
              <ListFilter size={11} />
            </button>
          )}
        </span>
      )}
    </div>
  )
}

type Ctx = {
  editing: boolean
  fit: boolean
  /** DLR cards: grey, top-aligned header without sort / filter icons (Figma DLR2 / DLR3 sheets) */
  plainHeader: boolean
  rowHeight: number
  hidden: Set<string>
  sort: { key: string; dir: 'asc' | 'desc' } | null
  setSort: (s: { key: string; dir: 'asc' | 'desc' } | null) => void
  colFilters: Record<string, string>
  setColFilter: (key: string, value: string) => void
  openFilter: string | null
  setOpenFilter: (key: string | null) => void
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
  // fit: the design-width grid — fixed layout, S.N. narrow, every other column shares the card width equally
  const narrow = (c: SheetCol) => c.key === 'sn'
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className={cn('w-full border-collapse text-[11px] text-ink', ctx.fit && 'table-fixed')}>
        {ctx.fit && (
          <colgroup>
            {cols.map((x) => (
              <col key={x.c.key} style={narrow(x.c) ? { width: 40 } : undefined} />
            ))}
          </colgroup>
        )}
        <thead>
          {groups.length > 0 && (
            <tr className="text-[10px]">
              {groups.map((g, i) => (
                <th
                  key={i}
                  colSpan={g.span}
                  className={cn('border-b border-line px-2.5 py-2 text-left font-normal', i % 2 ? 'bg-primary-soft/70 text-primary' : 'bg-surface text-muted')}
                >
                  {g.label && (
                    <span className="flex justify-between gap-2">
                      <span className={i % 2 ? 'text-[11px] font-semibold' : ''}>{i % 2 ? g.label : `${g.label} · ${g.first}–${g.last}`}</span>
                      {i % 2 ? <span className="text-muted">{`${g.first}–${g.last}`}</span> : null}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          )}
          {leadLetters && (
            <tr className="bg-surface text-[9px] leading-[20px] text-muted">
              {cols.map((x) => (
                <th key={x.c.key} className="border-r border-b border-line py-0 text-center font-normal last:border-r-0">
                  {x.l}
                </th>
              ))}
            </tr>
          )}
          <tr className={cn('text-left', ctx.plainHeader ? 'bg-surface align-top' : 'bg-white')}>
            {cols.map((x) => {
              const s = ctx.sort?.key === x.c.key ? ctx.sort.dir : null
              const sortable = !ctx.plainHeader && !x.c.virtual && !narrow(x.c)
              const k = x.c.key
              return (
                <th
                  key={k}
                  className={cn('relative h-[41px] border-r border-b border-line font-semibold last:border-r-0', ctx.plainHeader ? 'py-3' : 'py-2', narrow(x.c) ? 'px-2' : 'px-2.5')}
                  style={ctx.fit ? undefined : { minWidth: x.c.width ?? 140 }}
                >
                  <Head
                    c={x.c}
                    groupInHeader={!band.groupRow}
                    sort={s}
                    onSort={sortable ? () => ctx.setSort(s === null ? { key: k, dir: 'asc' } : s === 'asc' ? { key: k, dir: 'desc' } : null) : undefined}
                    filter={
                      sortable && x.c.kind !== 'phone'
                        ? { active: !!ctx.colFilters[k], open: ctx.openFilter === k, toggle: () => ctx.setOpenFilter(ctx.openFilter === k ? null : k) }
                        : undefined
                    }
                  />
                  {ctx.openFilter === k && (
                    <div className="absolute top-full right-0 z-30 mt-1 w-56 rounded-lg border border-line bg-white p-2.5 text-left font-normal shadow-lg">
                      <div className="mb-1.5 text-[11px] text-muted">Filter · {x.c.label}</div>
                      <input
                        autoFocus
                        aria-label={`Filter ${x.c.label}`}
                        value={ctx.colFilters[k] ?? ''}
                        onChange={(e) => ctx.setColFilter(k, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && ctx.setOpenFilter(null)}
                        placeholder="Contains…"
                        className="h-8 w-full rounded-md border border-line px-2 text-[12px] outline-none focus:border-primary"
                      />
                      <div className="mt-2 flex justify-between">
                        <button type="button" className="text-[12px] text-muted" onClick={() => ctx.setColFilter(k, '')}>
                          Clear
                        </button>
                        <button type="button" className="text-[12px] font-semibold text-primary" onClick={() => ctx.setOpenFilter(null)}>
                          Done
                        </button>
                      </div>
                    </div>
                  )}
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
                  const canEdit = ctx.editing && !ro && !(x.lead && locked) && c.editable !== false && !c.virtual && (!c.editableRow || c.editableRow(r))
                  const wraps = c.kind === 'multi' || c.kind === 'deno'
                  const plain = !canEdit && !c.render && !wraps ? textOf(c, r) : undefined
                  return (
                    <td
                      key={c.key}
                      title={ctx.fit && plain ? plain : undefined}
                      style={{ height: ctx.rowHeight }}
                      className={cn(
                        'border-r border-b border-line-soft py-1.5 last:border-r-0',
                        narrow(c) ? 'px-2' : 'px-2.5',
                        wraps ? 'whitespace-normal' : 'whitespace-nowrap',
                        ctx.fit && !wraps && 'overflow-hidden text-ellipsis',
                        isNum(c) && 'text-right',
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
    <div className="flex min-h-[36px] flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-primary-soft/60 px-3.5 py-2 text-[10px]">
      <span className="text-[11px] font-semibold text-primary">{band.title}</span>
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
  strip,
  fit,
  editToolbar = false,
  rowHeight = 34,
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
  /** slim info strip under the toolbar (Figma: "Double-click a cell to edit" bar) */
  strip?: { left?: ReactNode; right?: ReactNode }
  /** fixed-layout grid that fits the card width (default: on for the single layout) */
  fit?: boolean
  /** keep the toolbar in edit mode (Figma BS / Axis & ICD edit frames) */
  editToolbar?: boolean
  /** min data-row height (34 on lists, 56 on single-record pages) */
  rowHeight?: number
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState<'filters' | 'columns' | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  const allCols = useMemo(() => [...lead, ...bands.flatMap((b) => b.cols)].filter((c) => !c.virtual), [lead, bands])

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = !q ? rows : rows.filter((r) => allCols.some((c) => textOf(c, r).toLowerCase().includes(q)))
    const active = Object.entries(colFilters).filter(([, v]) => v.trim())
    if (active.length)
      out = out.filter((r) =>
        active.every(([k, v]) => {
          const c = allCols.find((x) => x.key === k)
          return !c || textOf(c, r).toLowerCase().includes(v.trim().toLowerCase())
        }),
      )
    const c = sort ? allCols.find((x) => x.key === sort.key) : undefined
    if (c && sort) {
      out = [...out].sort((a, b) => {
        const av = rawOf(c, a)
        const bv = rawOf(c, b)
        const cmp = isNum(c) ? (Number(av) || 0) - (Number(bv) || 0) : av.localeCompare(bv, 'en', { numeric: true })
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [rows, query, allCols, sort, colFilters])

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
  const ctx: Ctx = {
    editing,
    fit: fit ?? true,
    plainHeader: layout === 'cards',
    rowHeight,
    hidden,
    sort,
    setSort,
    colFilters,
    setColFilter: (key, value) => {
      setColFilters((f) => ({ ...f, [key]: value }))
      setPage(1)
    },
    openFilter,
    setOpenFilter,
    handle,
    rowClassName,
    readOnlyRow,
  }

  const onExport = () => {
    downloadCsv(
      exportName,
      allCols.map((c) => c.label),
      processed.map((r) => allCols.map((c) => textOf(c, r))),
    )
    toast(`Exported ${processed.length} ${noun} · recorded in the audit trail`)
  }

  const btn = (on: boolean) =>
    cn('flex h-[30px] items-center gap-1.5 rounded-md border bg-white px-2.5 text-[11px] font-semibold hover:bg-surface', on ? 'border-primary text-primary' : 'border-line text-ink')
  const toolbarEl = (label: string) => (
    <div className="relative flex min-h-12 flex-wrap items-center gap-2.5 border-b border-line bg-white px-3.5 py-1.5">
      <Table2 size={16} className="text-primary" />
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      {countLabel && <span className="text-[11px] text-muted">{countLabel}</span>}
      <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[11px] text-muted sm:w-[225px]">
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
        <button type="button" onClick={() => setPanel(panel === 'filters' ? null : 'filters')} className={btn(panel === 'filters')}>
          <ListFilter size={14} /> Filters
          {filterCount > 0 && <span className="rounded bg-primary px-1.5 text-[10px] text-white">{filterCount}</span>}
        </button>
        <button type="button" onClick={() => setPanel(panel === 'columns' ? null : 'columns')} className={btn(panel === 'columns')}>
          <Columns3 size={14} /> Columns
        </button>
        <button type="button" onClick={onExport} className={btn(false)}>
          <Download size={14} /> Export .xlsx
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
      <div className="px-6 py-[88px] text-center">
        {empty && !query ? (
          <>
            <span className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-full bg-primary-soft text-primary">
              <Table2 size={19} />
            </span>
            <div className="mt-[18px] text-[16px] font-semibold text-ink">{empty.title}</div>
            <p className="mt-2.5 text-[12px] text-muted">{empty.text}</p>
          </>
        ) : (
          <p className="text-[12px] text-muted">{query || Object.values(colFilters).some(Boolean) ? 'No rows match your search.' : 'No rows yet.'}</p>
        )}
      </div>
    ) : null

  const showToolbar = (i: number) => (!editing || editToolbar) && (toolbar === 'each' || (toolbar === 'first' && i === 0))

  if (layout === 'cards')
    return (
      <div className="space-y-4">
        {bands.map((b, i) => (
          <section key={b.title} className="overflow-hidden rounded-xl border border-line bg-white">
            <BandHeader band={b} range={rangeOf(b, i)} right={bandRight?.(b, i)} />
            {showToolbar(i) && toolbarEl(b.toolbarTitle ?? title)}
            <div className="flex min-h-[33px] items-center justify-between gap-2 border-b border-line px-3.5 py-1.5 text-[10.5px] text-muted">
              <span className="text-[11px] font-semibold text-ink-2">{processed.length} {noun}</span>
              <span className="flex items-center gap-1.5">
                <MousePointer2 size={12} /> {editing ? 'Editable grid · Changes apply when you click Save' : 'Editable grid · Source values'}
              </span>
            </div>
            <BandTable band={b} lead={i === 0 || repeatLead ? lead : []} leadLetters start={starts[i]} rows={visible} ctx={ctx} locked={i > 0} />
            {emptyBlock}
            <div className="border-t border-line px-3.5 py-2.5 text-[11px] text-muted">
              All {processed.length} {noun} visible · Blank cells preserved
            </div>
            {b.footer && (
              <div className="flex flex-wrap justify-between gap-2 border-t border-line bg-surface/60 px-3.5 py-2.5 text-[10px] text-muted">
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
          {i === 0 && strip && (
            <div className="flex min-h-[33px] flex-wrap items-center justify-between gap-2 border-b border-line bg-primary-soft/60 px-3.5 py-1.5 text-[11px]">
              <span className="font-semibold text-primary">{strip.left}</span>
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted">
                <MousePointer2 size={12} /> {strip.right}
              </span>
            </div>
          )}
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
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 border-t border-line bg-surface/60 px-3.5 py-1.5 text-[10px] text-muted">
          <span>{footer.left}</span>
          <span className="text-primary">{footer.right}</span>
        </div>
      )}
    </section>
  )
}
