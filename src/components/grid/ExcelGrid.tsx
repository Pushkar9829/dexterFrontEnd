import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDownUp, ArrowDown, ArrowUp, Columns3, Download, Filter, ListFilter, Pin, Search, Table2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Pagination } from '@/components/ui/Pagination'
import { downloadCsv } from '@/lib/export'

export type GridColumn<T> = {
  key: string
  header: ReactNode
  /** plain-text header used for exports / column picker */
  label?: string
  width?: number
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  filterable?: boolean
  pinned?: boolean
  editable?: boolean
  /** edit control: dropdown options, or input type */
  options?: string[]
  inputType?: 'text' | 'number' | 'date' | 'time'
  /** raw value for sort / search / filter / export / edit */
  value?: (row: T) => string | number | null | undefined
  render?: (row: T) => ReactNode
}

type Props<T> = {
  title: string
  countLabel?: string
  rows: T[]
  columns: GridColumn<T>[]
  rowId: (row: T) => string
  searchPlaceholder?: string
  /** Excel-style A, B, C… letters row above headers */
  letters?: boolean
  /** first letter index (band B of a wide sheet starts at e.g. 8 → "I") */
  letterOffset?: number
  /** "#" running-number column */
  rowNumbers?: boolean
  selectable?: boolean
  /** chip shown in the selection bar, e.g. "Tier: Franchise" */
  scope?: ReactNode
  /** "fx" formula bar with selected cell ref/value */
  formulaBar?: boolean
  /** cells become editable on double-click (edit mode); toolbar is hidden in this mode */
  editing?: boolean
  onCellChange?: (rowId: string, key: string, value: string) => void
  bulkActions?: (selected: string[], clear: () => void) => ReactNode
  rowClassName?: (row: T) => string | undefined
  pageSize?: number
  noun?: string
  emptyState?: ReactNode
  hideToolbar?: boolean
  /** hide the selection / scope bar even when rows are selectable */
  hideSelectionBar?: boolean
  /** hide the pagination row (cards that render their own footer) */
  hidePagination?: boolean
  exportName?: string
  /** footer note; a function receives the selected row ids (e.g. "Selected: 2 notices · …") */
  footerLeft?: ReactNode | ((selected: string[]) => ReactNode)
  footerRight?: ReactNode
  /** which toolbar buttons to show (default: all three) */
  toolbarButtons?: ('filters' | 'columns' | 'export')[]
  /** custom "N rows selected" label in the selection bar */
  selectionLabel?: (count: number) => ReactNode
  /** muted hint right-aligned in the selection bar (alias: scopeRight) */
  selectionHint?: ReactNode
  /** right side of the selection/scope bar, e.g. "Supplied master-data records only" */
  scopeRight?: ReactNode
  /** right side of the bar while rows are selected, e.g. "Double-click a cell to edit" (falls back to scopeRight) */
  bulkHint?: ReactNode
  /** header of the running-number column (default "#") */
  rowNumberLabel?: string
  /** formula bar: save time shown as "All changes saved · <savedAt>" */
  savedAt?: string
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const letter = (i: number) => (i < 26 ? LETTERS[i] : LETTERS[Math.floor(i / 26) - 1] + LETTERS[i % 26])

export function ExcelGrid<T>({
  title,
  countLabel,
  rows,
  columns,
  rowId,
  searchPlaceholder = 'Search',
  letters = false,
  letterOffset = 0,
  rowNumbers = true,
  selectable = false,
  scope,
  formulaBar = false,
  editing = false,
  onCellChange,
  bulkActions,
  rowClassName,
  pageSize: initialPageSize = 10,
  noun = 'records',
  emptyState,
  hideToolbar = false,
  hideSelectionBar = false,
  hidePagination = false,
  exportName,
  footerLeft,
  footerRight,
  toolbarButtons = ['filters', 'columns', 'export'],
  selectionLabel,
  selectionHint,
  scopeRight,
  bulkHint,
  savedAt,
  rowNumberLabel = '#',
}: Props<T>) {
  const rightHint = scopeRight ?? selectionHint
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [showColumns, setShowColumns] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [active, setActive] = useState<{ row: string; key: string } | null>(null)
  const [editingCell, setEditingCell] = useState<{ row: string; key: string } | null>(null)
  const [draft, setDraft] = useState('')

  const cols = columns.filter((c) => !hidden.has(c.key))
  const raw = (c: GridColumn<T>, r: T) => {
    const v = c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]
    return v == null ? '' : String(v)
  }

  const processed = useMemo(() => {
    let out = rows
    const q = query.trim().toLowerCase()
    if (q) out = out.filter((r) => columns.some((c) => raw(c, r).toLowerCase().includes(q)))
    for (const [k, f] of Object.entries(filters)) {
      if (!f) continue
      const c = columns.find((x) => x.key === k)
      if (c) out = out.filter((r) => raw(c, r).toLowerCase().includes(f.toLowerCase()))
    }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key)
      if (c) {
        out = [...out].sort((a, b) => {
          const av = c.value ? c.value(a) : raw(c, a)
          const bv = c.value ? c.value(b) : raw(c, b)
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''), 'en', { numeric: true })
          return sort.dir === 'asc' ? cmp : -cmp
        })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, query, filters, sort])

  const pages = Math.max(1, Math.ceil(processed.length / pageSize))
  const current = Math.min(page, pages)
  const visible = processed.slice((current - 1) * pageSize, current * pageSize)
  const allOnPage = visible.length > 0 && visible.every((r) => selected.has(rowId(r)))

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))

  const toggleRow = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const clear = () => setSelected(new Set())

  const commit = () => {
    if (editingCell) onCellChange?.(editingCell.row, editingCell.key, draft)
    setEditingCell(null)
  }

  const activeCol = active ? cols.findIndex((c) => c.key === active.key) : -1
  const activeRowIdx = active ? processed.findIndex((r) => rowId(r) === active.row) : -1
  const activeValue = active && activeCol >= 0 && activeRowIdx >= 0 ? raw(cols[activeCol], processed[activeRowIdx]) : ''

  const onExport = () =>
    downloadCsv(
      exportName ?? title,
      columns.map((c) => c.label ?? (typeof c.header === 'string' ? c.header : c.key)),
      processed.map((r) => columns.map((c) => raw(c, r))),
    )

  const pinnedLeft = (rowNumbers ? 48 : 0) + (selectable ? 36 : 0)

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      {!hideToolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <Table2 size={18} className="text-primary" />
          <span className="text-[14px] font-semibold">{title}</span>
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
          <div className="relative ml-auto flex items-center gap-2">
            {toolbarButtons.includes('filters') && (
            <button
              onClick={() => setOpenFilter(openFilter ? null : cols.find((c) => c.filterable)?.key ?? null)}
              className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold"
            >
              <ListFilter size={15} /> Filters
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="rounded bg-primary px-1.5 text-[11px] text-white">{Object.values(filters).filter(Boolean).length}</span>
              )}
            </button>
            )}
            {toolbarButtons.includes('columns') && (
              <button onClick={() => setShowColumns((s) => !s)} className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold">
                <Columns3 size={15} /> Columns
              </button>
            )}
            {toolbarButtons.includes('export') && (
              <button onClick={onExport} className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold">
                <Download size={15} /> Export .xlsx
              </button>
            )}
            {showColumns && (
              <div className="absolute top-11 right-0 z-30 max-h-72 w-56 overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-lg">
                {columns.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-surface">
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
                    {c.label ?? c.header}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!hideSelectionBar && (selectable || scope || scopeRight != null) && (
        <div className="flex flex-wrap items-center gap-4 border-b border-line bg-primary-soft/60 px-4 py-2.5 text-[12px]">
          {scope && (
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <Filter size={13} /> {scope}
            </span>
          )}
          {selectable && (
            <>
              <span className={selected.size ? 'font-semibold text-primary' : 'text-muted'}>
                {selectionLabel ? selectionLabel(selected.size) : `${selected.size} ${selected.size === 1 ? 'row' : 'rows'} selected`}
              </span>
              {selected.size > 0 ? bulkActions?.([...selected], clear) : !rightHint && <span className="text-muted">Select rows to access bulk actions</span>}
            </>
          )}
          {(() => {
            const hint = selectable && selected.size > 0 && bulkHint != null ? bulkHint : rightHint
            return hint != null ? <span className="ml-auto text-[11px] text-muted">{hint}</span> : null
          })()}
        </div>
      )}

      {formulaBar && (
        <div className="flex items-center gap-4 border-b border-line px-4 py-2 text-[12px] text-muted">
          <span className="w-10 text-center font-medium text-ink-2">{active && activeCol >= 0 ? `${letter(activeCol + letterOffset)}${activeRowIdx + 1}` : '—'}</span>
          <span className="italic">fx</span>
          <span className="flex-1 truncate text-ink-2">{active ? activeValue || '(blank)' : 'No cell selected'}</span>
          <span className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 size={14} /> All changes saved{savedAt ? ` · ${savedAt}` : ''}
          </span>
        </div>
      )}

      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            {letters && (
              <tr className="bg-surface text-[10px] text-muted">
                {rowNumbers && <th className="sticky left-0 z-10 w-12 border-r border-b border-line bg-surface" />}
                {selectable && <th className="sticky z-10 w-9 border-r border-b border-line bg-surface" style={{ left: rowNumbers ? 48 : 0 }} />}
                {cols.map((c, i) => (
                  <th key={c.key} className={cn('border-r border-b border-line py-1 font-medium', c.pinned && 'sticky z-10 bg-surface')} style={c.pinned ? { left: pinnedLeft } : undefined}>
                    {letter(i + letterOffset)}
                  </th>
                ))}
              </tr>
            )}
            <tr className="bg-surface text-left">
              {rowNumbers && <th className="sticky left-0 z-10 w-12 border-r border-b border-line bg-surface px-3 py-3 font-semibold">{rowNumberLabel}</th>}
              {selectable && (
                <th className="sticky z-10 w-9 border-r border-b border-line bg-surface px-2.5" style={{ left: rowNumbers ? 48 : 0 }}>
                  <input
                    type="checkbox"
                    className="accent-primary"
                    aria-label="Select all on page"
                    checked={allOnPage}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s)
                        visible.forEach((r) => (allOnPage ? n.delete(rowId(r)) : n.add(rowId(r))))
                        return n
                      })
                    }
                  />
                </th>
              )}
              {cols.map((c) => {
                const s = sort?.key === c.key ? sort.dir : null
                return (
                  <th
                    key={c.key}
                    className={cn('relative border-r border-b border-line px-3 py-3 font-semibold whitespace-nowrap text-ink', c.pinned && 'sticky z-10 bg-surface')}
                    style={{ minWidth: c.width, ...(c.pinned ? { left: pinnedLeft } : {}) }}
                  >
                    <div className={cn('flex items-center gap-2', c.align === 'right' && 'justify-end')}>
                      <span>{c.header}</span>
                      <span className="ml-auto flex items-center gap-1 text-muted">
                        {c.pinned && <Pin size={12} className="text-primary" />}
                        {c.sortable && (
                          <button onClick={() => toggleSort(c.key)} aria-label={`Sort by ${c.label ?? c.key}`} className={s ? 'text-primary' : ''}>
                            {s === 'asc' ? <ArrowUp size={13} /> : s === 'desc' ? <ArrowDown size={13} /> : <ArrowDownUp size={13} />}
                          </button>
                        )}
                        {c.filterable && (
                          <button onClick={() => setOpenFilter(openFilter === c.key ? null : c.key)} aria-label={`Filter ${c.label ?? c.key}`} className={filters[c.key] ? 'text-primary' : ''}>
                            <ListFilter size={13} />
                          </button>
                        )}
                      </span>
                    </div>
                    {openFilter === c.key && (
                      <div className="absolute top-full left-0 z-30 mt-1 w-56 rounded-lg border border-line bg-white p-2.5 font-normal shadow-lg">
                        <div className="mb-1.5 text-[11px] text-muted">Filter · {c.label ?? c.header}</div>
                        <input
                          autoFocus
                          value={filters[c.key] ?? ''}
                          onChange={(e) => {
                            setFilters((f) => ({ ...f, [c.key]: e.target.value }))
                            setPage(1)
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && setOpenFilter(null)}
                          placeholder="Contains…"
                          className="h-8 w-full rounded-md border border-line px-2 text-[13px] outline-none focus:border-primary"
                        />
                        <div className="mt-2 flex justify-between">
                          <button className="text-[12px] text-muted" onClick={() => setFilters((f) => ({ ...f, [c.key]: '' }))}>
                            Clear
                          </button>
                          <button className="text-[12px] font-semibold text-primary" onClick={() => setOpenFilter(null)}>
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
            {visible.map((r, ri) => {
              const id = rowId(r)
              const isSel = selected.has(id)
              const n = (current - 1) * pageSize + ri + 1
              return (
                <tr key={id} className={cn('group', isSel ? 'bg-primary-soft/50' : 'hover:bg-surface/70', rowClassName?.(r))}>
                  {rowNumbers && <td className="sticky left-0 z-[1] border-r border-b border-line-soft bg-inherit px-3 py-3 text-muted">{n}</td>}
                  {selectable && (
                    <td className="sticky z-[1] border-r border-b border-line-soft bg-inherit px-2.5" style={{ left: rowNumbers ? 48 : 0 }}>
                      <input type="checkbox" className="accent-primary" aria-label={`Select row ${n}`} checked={isSel} onChange={() => toggleRow(id)} />
                    </td>
                  )}
                  {cols.map((c) => {
                    const isActive = active?.row === id && active.key === c.key
                    const isEditing = editingCell?.row === id && editingCell.key === c.key
                    const canEdit = editing && c.editable !== false && !c.pinned
                    return (
                      <td
                        key={c.key}
                        onClick={() => setActive({ row: id, key: c.key })}
                        onDoubleClick={() => {
                          if (!canEdit) return
                          setEditingCell({ row: id, key: c.key })
                          setDraft(raw(c, r))
                        }}
                        className={cn(
                          'border-r border-b border-line-soft px-3 py-3 whitespace-nowrap',
                          c.align === 'right' && 'text-right',
                          c.pinned && 'sticky z-[1] bg-white group-hover:bg-surface',
                          isActive && 'outline-2 -outline-offset-2 outline-primary',
                          canEdit && 'bg-blue-50/30',
                        )}
                        style={c.pinned ? { left: pinnedLeft } : undefined}
                      >
                        {isEditing ? (
                          c.options ? (
                            <select
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={commit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commit()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="h-7 w-full min-w-24 rounded border border-primary bg-white px-1 outline-none"
                            >
                              <option value="">—</option>
                              {c.options.map((o) => (
                                <option key={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              autoFocus
                              type={c.inputType ?? 'text'}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={commit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commit()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="h-7 w-full min-w-24 rounded border border-primary px-1.5 outline-none"
                            />
                          )
                        ) : c.render ? (
                          c.render(r)
                        ) : (
                          raw(c, r) || <span className="text-muted">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {processed.length === 0 && (
          <div className="px-6 py-14 text-center text-[13px] text-muted">{emptyState ?? 'No matching records.'}</div>
        )}
      </div>

      {!hidePagination && (
        <div className="border-t border-line">
          <Pagination page={current} pageSize={pageSize} total={processed.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} noun={noun} />
        </div>
      )}
      {(footerLeft || footerRight) && (
        <div className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-2.5 text-[12px] text-muted">
          <span>{typeof footerLeft === 'function' ? footerLeft([...selected]) : footerLeft}</span>
          <span className="text-primary">{footerRight}</span>
        </div>
      )}
    </section>
  )
}
