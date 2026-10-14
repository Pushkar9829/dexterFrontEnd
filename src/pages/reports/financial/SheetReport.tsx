import { useMemo, useState, type ReactNode } from 'react'
import type { Row } from '@/data/reportsFinancial'
import { ReportSheet, type SheetBand, type SheetCol } from './ReportSheet'
import { FinancialShell, newId, useDraft } from './Shell'

export type FilterDef = { key: string; label: string; options: string[] }
export type SheetCtx = { editing: boolean; change: (id: string, key: string, value: string) => void }

type Store = { use: () => Row[]; set: (rows: Row[]) => void }

/**
 * One flat financial sheet: Update → inline edit (Add row / Cancel / Save) persisted to its store,
 * optional scope (F.Y., month, date range) and allowed-value filters.
 */
export function SheetReport({
  store,
  name,
  sub,
  chip,
  title,
  bands,
  filterDefs = [],
  scope,
  controls,
  newRow,
  notes,
  meta,
  idPrefix,
  searchPlaceholder,
  noun = 'rows',
}: {
  store: Store
  name: string
  sub: string
  chip?: string
  /** sheet title shown on the toolbar */
  title: string
  bands: SheetBand[] | ((ctx: SheetCtx) => SheetBand[])
  filterDefs?: FilterDef[]
  scope?: (r: Row) => boolean
  controls?: ReactNode
  newRow: () => Omit<Row, 'id'>
  notes?: (rows: Row[]) => ReactNode
  meta?: (rows: Row[]) => ReactNode
  idPrefix: string
  searchPlaceholder?: string
  noun?: string
}) {
  const saved = store.use()
  const d = useDraft(saved, (rows) => store.set(rows), `${name} report`)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const inScope = useMemo(() => (scope ? d.rows.filter(scope) : d.rows), [d.rows, scope])
  const shown = useMemo(
    () => (d.editing ? inScope : inScope.filter((r) => filterDefs.every((f) => !filters[f.key] || r[f.key] === filters[f.key]))),
    [inScope, filters, filterDefs, d.editing],
  )

  const sn: SheetCol = { key: 'sn', label: 'S.N.', width: 64, editable: false, value: (r) => String(inScope.indexOf(r) + 1) }
  const bandList = typeof bands === 'function' ? bands({ editing: d.editing, change: d.change }) : bands
  const total = bandList.reduce((s, b) => s + b.cols.length, 1)

  return (
    <FinancialShell
      sub={sub}
      name={name}
      chip={chip ?? (bandList.length > 1 ? `Wrapped column view · All fields visible in ${bandList.length === 2 ? 'two' : 'three'} bands` : 'All source fields visible')}
      meta={meta ? meta(inScope) : `${inScope.length} ${noun} · ${total} source columns`}
      controls={controls}
      editing={d.editing}
      onUpdate={d.start}
      onCancel={d.cancel}
      onSave={d.save}
      onAdd={() => d.setRows((rows) => [...rows, { ...newRow(), id: newId(idPrefix) } as Row])}
      notes={notes?.(inScope)}
    >
      <ReportSheet
        title={title}
        countLabel={`${shown.length} ${noun}`}
        rows={shown}
        lead={[sn]}
        bands={bandList}
        editing={d.editing}
        onCellChange={d.change}
        exportName={`${idPrefix.toLowerCase()}-report`}
        searchPlaceholder={searchPlaceholder}
        noun={noun}
        filters={filterDefs.map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            value={filters[f.key] ?? ''}
            onChange={(e) => setFilters((x) => ({ ...x, [f.key]: e.target.value }))}
            className="h-9 rounded-lg border border-line bg-white px-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary"
          >
            <option value="">All {f.label}</option>
            {f.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ))}
      />
    </FinancialShell>
  )
}
