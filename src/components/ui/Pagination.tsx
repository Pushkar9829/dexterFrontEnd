import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  noun = 'records',
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  onPageSize?: (n: number) => void
  noun?: string
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-[11px] text-muted">
      <span>
        Showing {from}–{to} of {total.toLocaleString('en-IN')} {noun}
      </span>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Rows per page</span>
        <label className="relative hidden sm:block">
          <select
            value={pageSize}
            onChange={(e) => onPageSize?.(Number(e.target.value))}
            className="h-[30px] appearance-none rounded-md border border-line bg-white pr-3 pl-7 text-[11px] font-semibold text-ink outline-none"
          >
            {[...new Set([pageSize, 10, 25, 50])].sort((x, y) => x - y).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute top-[8.5px] left-2 text-ink-2" />
        </label>
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex h-[30px] items-center gap-1.5 rounded-md border border-line bg-white px-2.5 font-semibold text-ink disabled:font-normal disabled:text-muted/60"
        >
          <ChevronLeft size={13} /> Previous
        </button>
        <span className="grid h-[30px] min-w-[30px] place-items-center rounded-md bg-primary-soft px-2 font-semibold text-primary">{page}</span>
        <span>of {pages}</span>
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="flex h-[30px] items-center gap-1.5 rounded-md border border-line bg-white px-2.5 font-semibold text-ink disabled:font-normal disabled:text-muted/60"
        >
          <ChevronRight size={13} /> Next
        </button>
      </div>
    </div>
  )
}
