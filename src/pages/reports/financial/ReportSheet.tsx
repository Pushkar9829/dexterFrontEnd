import { useMemo, useState, type ReactNode } from 'react'
import { Download, PencilLine, Search, Table2 } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, toneFor } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { denoTotal, dmy, inr, type Row } from '@/data/reportsFinancial'

export type ColKind = 'text' | 'money' | 'signed' | 'number' | 'date' | 'time' | 'enum' | 'phone' | 'email' | 'ifsc' | 'deno'

export type SheetCol = {
  key: string
  label: string
  /** Hindi sub-label (bilingual DLR sheets) */
  hi?: string
  /** small group label above the header (e.g. "Counter", "Physical", "Payment fields") */
  group?: string
  width?: number
  kind?: ColKind
  options?: string[]
  /** show enum values as status badges */
  badge?: boolean
  editable?: boolean
  value?: (r: Row) => string
  render?: (r: Row) => ReactNode
}

export type SheetBand = { title: string; note?: string; cols: SheetCol[] }

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const letter = (i: number) => (i < 26 ? LETTERS[i] : LETTERS[Math.floor(i / 26) - 1] + LETTERS[i % 26])

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
    case 'deno':
      return denoTotal(v) !== null || /^\d+$/.test(v) ? { value: v.replace(/\s*[x*]\s*/gi, '×') } : { error: `${col.label}: use note × count, e.g. 100×12 / 200×5 / 500×20` }
    default:
      return { value: v }
  }
}

export const rawOf = (c: SheetCol, r: Row) => (c.value ? c.value(r) : (r[c.key] ?? ''))

/** display text used for search + export */
const textOf = (c: SheetCol, r: Row) => {
  const v = rawOf(c, r)
  if (c.kind === 'date') return dmy(v)
  return v
}

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

function Head({ c, l }: { c: SheetCol; l: string }) {
  return (
    <div className="leading-snug whitespace-normal">
      <div className="text-[10px] font-medium text-muted">{l}</div>
      {c.group && <div className="text-[11px] font-semibold text-primary">{c.group}</div>}
      <div className="font-semibold text-ink">{c.label}</div>
      {c.hi && (
        <div lang="hi" className="mt-1 text-[11px] font-normal text-muted">
          {c.hi}
        </div>
      )}
    </div>
  )
}

/**
 * Wide source sheet split into column bands that share the same (filtered) rows.
 * `lead` columns (S.N., Date, Deno …) repeat at the start of every band with their original letters, as in the source.
 * One toolbar (search, extra filters, export) drives every band so rows stay aligned.
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
  filters,
  rowClassName,
  readOnlyRow,
  emptyState,
  noun = 'rows',
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
  filters?: ReactNode
  rowClassName?: (r: Row) => string | undefined
  readOnlyRow?: (r: Row) => string | false
  emptyState?: ReactNode
  noun?: string
}) {
  const [query, setQuery] = useState('')
  const allCols = useMemo(() => [...lead, ...bands.flatMap((b) => b.cols)], [lead, bands])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || editing) return rows
    return rows.filter((r) => allCols.some((c) => textOf(c, r).toLowerCase().includes(q)))
  }, [rows, query, allCols, editing])

  const handle = (rowId: string, key: string, value: string) => {
    const row = rows.find((r) => r.id === rowId)
    const col = allCols.find((c) => c.key === key)
    if (!row || !col) return
    const ro = readOnlyRow?.(row)
    if (ro) return toast(ro, 'info')
    if (value === rawOf(col, row)) return
    const res = checkCell(col, value)
    if ('error' in res) return toast(res.error, 'info')
    onCellChange(rowId, key, res.value)
  }

  const toGrid = (c: SheetCol, l: string, locked: boolean): GridColumn<Row> => ({
    key: c.key,
    header: <Head c={c} l={l} />,
    label: c.label,
    width: c.width ?? 150,
    align: c.kind === 'money' || c.kind === 'signed' || c.kind === 'number' ? 'right' : 'left',
    editable: !locked && c.editable !== false,
    options: c.kind === 'enum' ? c.options : undefined,
    inputType: c.kind === 'date' ? 'date' : c.kind === 'time' ? 'time' : c.kind === 'money' || c.kind === 'signed' || c.kind === 'number' ? 'number' : 'text',
    value: (r) => rawOf(c, r),
    render: (r) => (c.render ? c.render(r) : defaultRender(c, r)),
  })

  const onExport = () => {
    downloadCsv(
      exportName,
      allCols.map((c) => c.label),
      visible.map((r) => allCols.map((c) => textOf(c, r))),
    )
    toast(`Exported ${visible.length} ${noun} · recorded in the audit trail`)
  }

  const starts = bands.map((_, i) => lead.length + bands.slice(0, i).reduce((n, b) => n + b.cols.length, 0))
  return (
    <div className="space-y-4">
      {editing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2.5 text-[12px] text-primary">
          <PencilLine size={15} />
          <span className="font-semibold">Editing {title}</span>
          <span className="text-ink-2">Double-click a cell to edit · dropdowns for allowed values · changes apply when you click Save</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
          <Table2 size={18} className="text-primary" />
          <span className="text-[14px] font-semibold">{title}</span>
          {countLabel && <span className="text-[12px] text-muted">{countLabel}</span>}
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted sm:w-[228px]">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {filters}
            <button onClick={onExport} className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold hover:bg-surface">
              <Download size={15} /> Export .xlsx
            </button>
          </div>
        </div>
      )}

      {bands.map((b, i) => {
        const start = starts[i]
        const leadCols = lead.map((c, li) => toGrid(c, letter(li), i > 0))
        const cols = [...leadCols, ...b.cols.map((c, ci) => toGrid(c, letter(start + ci), false))]
        const range = b.cols.length ? `${letter(i === 0 && lead.length ? 0 : start)}–${letter(start + b.cols.length - 1)}` : ''
        return (
          <div key={b.title} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-primary-soft/60 px-4 py-2.5 text-[12px]">
              <span className="font-semibold text-primary">{b.title}</span>
              <span className="text-muted">
                Source columns {range}
                {i > 0 && lead.length > 0 ? ` · ${lead.map((c) => c.label).join(', ')} repeated from ${letter(0)}${lead.length > 1 ? `–${letter(lead.length - 1)}` : ''}` : ''}
              </span>
              <span className="text-muted sm:ml-auto">{b.note ?? (editing ? 'Double-click a cell to edit' : 'Same rows across bands')}</span>
            </div>
            <div className="[&>section]:rounded-none [&>section]:border-0">
              <ExcelGrid
                title={title}
                rows={visible}
                columns={cols}
                rowId={(r) => r.id}
                rowNumbers={false}
                editing={editing}
                onCellChange={handle}
                hideToolbar
                pageSize={50}
                noun={noun}
                rowClassName={rowClassName}
                emptyState={emptyState ?? (query ? 'No rows match your search.' : 'No rows yet — click Update, then Add row.')}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
