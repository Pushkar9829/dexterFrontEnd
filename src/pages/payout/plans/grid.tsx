import { useState, type ReactNode } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SectionBar, tdCls, theadCls, thCls } from './ui'

export type GridCol<T> = {
  key: string
  head: string
  group?: string
  view: (r: T, i: number) => ReactNode
  edit?: (draft: T, set: (d: T) => void, i: number) => ReactNode
  width?: number
}

type Editing<T> = { i: number; draft: T; isNew: boolean; error: string | null; before?: T[] }

/**
 * Table whose rows are edited one at a time (pencil → inline inputs → ✓ / ✕), as in the slab and
 * incentive designs. Row-level checks run on ✓; table-level checks (gaps / overlaps) are passed in
 * as rowErrors and shown on the row plus under the table.
 */
export function EditableGrid<T>({
  title, icon, sub, rows, cols, onChange, makeNew, checkRow, rowErrors = {}, canAdd = true, addLabel = 'Add Slab', addHint, onEditing, readOnly, minWidth = 900,
}: {
  title: string
  icon: ReactNode
  sub?: string
  rows: T[]
  cols: GridCol<T>[]
  onChange: (rows: T[]) => void
  /** Returns the full new row list with the added row last (it may also close the previous open-ended row). */
  makeNew: (rows: T[]) => T[]
  checkRow?: (r: T, i: number, rows: T[]) => string | null
  rowErrors?: Record<number, string>
  canAdd?: boolean
  addLabel?: string
  addHint?: string
  onEditing?: (busy: boolean) => void
  readOnly?: boolean
  minWidth?: number
}) {
  const [ed, setEd] = useState<Editing<T> | null>(null)
  const grouped = cols.some((c) => c.group)

  const begin = (next: Editing<T> | null) => {
    setEd(next)
    onEditing?.(!!next)
  }
  const add = () => {
    if (ed) return
    const next = makeNew(rows)
    onChange(next)
    begin({ i: next.length - 1, draft: next[next.length - 1], isNew: true, error: null, before: rows })
  }
  const cancel = () => {
    if (!ed) return
    if (ed.isNew) onChange(ed.before ?? rows.filter((_, k) => k !== ed.i))
    begin(null)
  }
  const commit = () => {
    if (!ed) return
    const next = rows.map((r, k) => (k === ed.i ? ed.draft : r))
    const err = checkRow?.(ed.draft, ed.i, next) ?? null
    if (err) {
      setEd({ ...ed, error: err })
      return
    }
    onChange(next)
    begin(null)
  }
  const remove = (i: number) => {
    if (ed) return
    onChange(rows.filter((_, k) => k !== i))
  }

  // header rows: ungrouped columns span two rows; grouped columns share a top cell
  const top: ReactNode[] = []
  cols.forEach((c, k) => {
    if (!c.group) top.push(<th key={c.key} rowSpan={grouped ? 2 : 1} className={thCls} style={c.width ? { width: c.width } : undefined}>{c.head}</th>)
    else if (k === 0 || cols[k - 1].group !== c.group) {
      const span = cols.slice(k).findIndex((x) => x.group !== c.group)
      top.push(<th key={`g-${c.group}`} colSpan={span === -1 ? cols.length - k : span} className={cn(thCls, 'border-b border-white/15')}>{c.group}</th>)
    }
  })

  return (
    <section className="space-y-2">
      <SectionBar
        icon={icon}
        title={title}
        sub={sub}
        action={
          !readOnly && (
            <button type="button" onClick={add} disabled={!canAdd || !!ed} title={addHint} className="flex h-8 w-[118px] items-center justify-center gap-1.5 rounded-md border border-[#0066FF] bg-white text-[12px] font-semibold text-[#0066FF] hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50">
              <Plus size={14} strokeWidth={2.6} /> {addLabel}
            </button>
          )
        }
      />
      <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead>
            <tr className={theadCls}>
              <th rowSpan={grouped ? 2 : 1} className={cn(thCls, 'w-12')}>S.N.</th>
              {top}
              {!readOnly && <th rowSpan={grouped ? 2 : 1} className={cn(thCls, 'w-[88px]')}>Action</th>}
            </tr>
            {grouped && (
              <tr className={theadCls}>
                {cols.filter((c) => c.group).map((c) => <th key={c.key} className={thCls}>{c.head}</th>)}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const editing = ed?.i === i
              const err = rowErrors[i]
              return (
                <tr key={`row-${i}`} className={cn('border-t border-line-soft', err && !editing && 'bg-red-50/70', editing && 'bg-[#f3f7ff]')} title={err}>
                  <td className={tdCls}>{i + 1}</td>
                  {cols.map((c) => (
                    <td key={c.key} className={cn(tdCls, editing && 'px-1.5')}>
                      {editing && ed && c.edit ? c.edit(ed.draft, (d) => setEd({ ...ed, draft: d, error: null }), i) : c.view(editing && ed ? ed.draft : r, i)}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className={tdCls}>
                      {editing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={commit} className="text-emerald-600 hover:opacity-75" aria-label={`Save row ${i + 1}`} title="Save row"><Check size={16} strokeWidth={2.6} /></button>
                          <button type="button" onClick={cancel} className="text-muted hover:opacity-75" aria-label={`Cancel row ${i + 1}`} title="Cancel"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2.5">
                          <button type="button" disabled={!!ed} onClick={() => begin({ i, draft: r, isNew: false, error: null })} className="text-[#0066FF] hover:opacity-75 disabled:opacity-40" aria-label={`Edit row ${i + 1}`} title="Edit"><Pencil size={14} /></button>
                          <button type="button" disabled={!!ed} onClick={() => remove(i)} className="text-[#0066FF] hover:text-brand-red disabled:opacity-40" aria-label={`Delete row ${i + 1}`} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {!rows.length && (
              <tr><td colSpan={cols.length + 2} className="px-3 py-6 text-center text-[12px] text-muted">No rows yet — use “{addLabel}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {ed?.error && <p className="text-[11.5px] text-brand-red" role="alert">Row {ed.i + 1}: {ed.error}</p>}
    </section>
  )
}
