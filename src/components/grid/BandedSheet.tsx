import type { ReactNode } from 'react'
import { ExcelGrid, type GridColumn } from './ExcelGrid'

export type Band<T> = { title: string; columns: GridColumn<T>[]; note?: string }

/**
 * A wide source sheet split into column "bands" that share the same rows (Figma: SD / CLF / GST reports).
 * Letters continue across bands (A–H, I–P …). In edit mode toolbars are hidden and cells edit on double-click.
 */
export function BandedSheet<T>({
  bands,
  rows,
  rowId,
  editing,
  onCellChange,
  title,
  countLabel,
  searchPlaceholder,
  noun = 'rows',
  exportName,
  rowLabel,
}: {
  bands: Band<T>[]
  rows: T[]
  rowId: (r: T) => string
  editing: boolean
  onCellChange: (rowId: string, key: string, value: string) => void
  title: string
  countLabel?: string
  searchPlaceholder?: string
  noun?: string
  exportName?: string
  /** leading column of the first band (e.g. S.N.) */
  rowLabel?: GridColumn<T>
}) {
  let offset = 0
  return (
    <div className="space-y-4">
      {bands.map((b, i) => {
        const start = offset
        offset += b.columns.length + (rowLabel && i === 0 ? 1 : 0)
        const first = String.fromCharCode(65 + start)
        const last = String.fromCharCode(65 + offset - 1)
        const cols = rowLabel && i === 0 ? [{ ...rowLabel, editable: false }, ...b.columns] : b.columns
        return (
          <div key={b.title} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-primary-soft/60 px-4 py-2.5 text-[12px]">
              <span className="font-semibold text-primary">{b.title}</span>
              <span className="text-muted">
                Source columns {first}–{last}
                {i > 0 ? ' · Continued' : ''}
              </span>
              <span className="ml-auto text-muted">{b.note ?? (editing ? 'Double-click a cell to edit' : 'Same rows across bands')}</span>
            </div>
            <div className="[&>section]:rounded-none [&>section]:border-0">
              <ExcelGrid
                title={title}
                countLabel={countLabel}
                rows={rows}
                columns={cols}
                rowId={rowId}
                letters
                letterOffset={start}
                rowNumbers={false}
                editing={editing}
                onCellChange={onCellChange}
                hideToolbar={editing || i > 0}
                searchPlaceholder={searchPlaceholder}
                noun={noun}
                exportName={exportName}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SheetNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-primary-soft/60 px-4 py-3 text-[12px]">
      <div className="font-semibold text-primary">{title}</div>
      <div className="mt-0.5 text-ink-2">{children}</div>
    </div>
  )
}
