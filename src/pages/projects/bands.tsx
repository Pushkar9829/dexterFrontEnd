import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowDownUp, ArrowUp, Columns3, Download, ListFilter, Pin, Search, Table2 } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { fmtDots } from '@/data/legal'
import { DONE_STATES, EQUIP_STATES, PROJECT_BANDS, type Project, type ProjectField } from '@/data/projects'

// ───────────────────────── Values ─────────────────────────

const TEXT_TONE: Record<string, string> = {
  Pending: 'text-amber-700',
  Delivered: 'text-blue-700',
  'Installation pending': 'text-violet-700',
  'Installation done': 'text-emerald-700',
  Done: 'text-emerald-700',
}

/** Figma shows status values as coloured text (Pending amber, Complete / Done green), not chips. */
export function FieldValue({ field, value }: { field: ProjectField; value: string }) {
  if (field.kind === 'pd') return value ? <span>{fmtDots(value)}</span> : <span className="font-medium text-amber-700">Pending</span>
  if (!value) return <span className="text-muted">—</span>
  if (field.kind === 'equip' || field.kind === 'done') return <span className={cn('font-medium', TEXT_TONE[value] ?? 'text-ink')}>{value}</span>
  if (/^pending$/i.test(value)) return <span className="font-medium text-amber-700">{value}</span>
  if (/^(complete|registered|verified|active|received)$/i.test(value) || /^Live · /.test(value)) return <span className="font-medium text-emerald-700">{value}</span>
  return <span className="whitespace-normal">{value}</span>
}

/** Validate one edited cell. Returns an error message or ''. */
export function validateCell(key: string, value: string) {
  if (key === 'frEmail' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'FR Email must look like name@domain.in'
  if (key === 'frContact' && value && !/^\+?[\d\s-]{10,16}$/.test(value)) return 'FR Contact Number must have 10+ digits'
  return ''
}

// ───────────────────────── Sheet state (search / sort / filters / columns) ─────────────────────────

export const STAGES: [string, string][] = [
  ['prep', 'Site preparation'],
  ['install', 'Installation in progress'],
  ['tech', 'Tech live · cash pending'],
  ['live', 'Cash live'],
]
const stageOk = (p: Project, stage: string) =>
  !stage ||
  (stage === 'live' && p.f.cashLive === 'Done') ||
  (stage === 'tech' && p.f.techLive === 'Done' && p.f.cashLive !== 'Done') ||
  (stage === 'install' && p.f.techLive !== 'Done' && p.f.atmMachine !== 'Pending') ||
  (stage === 'prep' && p.f.atmMachine === 'Pending')

export type Sheet = ReturnType<typeof useSheet>

export function useSheet(base: Project[], initialSelected: string[] = []) {
  const [q, setQ] = useState('')
  const [model, setModel] = useState('')
  const [stage, setStage] = useState('')
  const [colFilter, setColFilter] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'siteLoi', dir: 'asc' })
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = base.filter((p) => {
      if (model && p.f.model !== model) return false
      if (!stageOk(p, stage)) return false
      for (const [k, v] of Object.entries(colFilter)) if (v && !(p.f[k] ?? '').toLowerCase().includes(v.toLowerCase())) return false
      if (!needle) return true
      return [p.id, p.f.siteLoi, p.f.franchisee, p.f.model, p.f.siteLocation].some((v) => (v ?? '').toLowerCase().includes(needle))
    })
    const cmp = (a: Project, b: Project) => (a.f[sort.key] ?? '').localeCompare(b.f[sort.key] ?? '', 'en', { numeric: true })
    return [...out].sort((a, b) => (sort.dir === 'asc' ? cmp(a, b) : -cmp(a, b)))
  }, [base, q, model, stage, colFilter, sort])

  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages)
  const visible = rows.slice((current - 1) * pageSize, current * pageSize)
  const filterCount = (model ? 1 : 0) + (stage ? 1 : 0) + Object.values(colFilter).filter(Boolean).length

  return {
    q, setQ: (v: string) => { setQ(v); setPage(1) },
    model, setModel: (v: string) => { setModel(v); setPage(1) },
    stage, setStage: (v: string) => { setStage(v); setPage(1) },
    colFilter, setColFilter: (k: string, v: string) => { setColFilter((f) => ({ ...f, [k]: v })); setPage(1) },
    clearFilters: () => { setModel(''); setStage(''); setColFilter({}); setPage(1) },
    filterCount,
    sort, toggleSort: (key: string) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })),
    hidden, toggleHidden: (key: string) => setHidden((h) => { const n = new Set(h); if (n.has(key)) n.delete(key); else n.add(key); return n }),
    selected, setSelected,
    rows, visible, page: current, setPage, pageSize, setPageSize: (n: number) => { setPageSize(n); setPage(1) },
  }
}

// ───────────────────────── Register card ─────────────────────────

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const btn = 'flex h-[30px] items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[11px] font-semibold text-ink hover:border-primary/50'
/** running-number / checkbox column widths and the minimum data-column width (Figma: 38 / 34 / ~135 shared equally) */
const NUM_W = 38
const CHK_W = 34
const MIN_COL = 118

/**
 * Figma register card: tabs → band A–I (with the register toolbar) → J–R → S–Z → pagination → status bar.
 * The consolidated lists show band A–I only; one record shows all three bands.
 */
export function ProjectSheet({
  tabs,
  tabNote,
  bands,
  sheet,
  title,
  bandNote,
  models,
  selectable,
  editing,
  link,
  onRowClick,
  onCellChange,
  onExport,
  pagination,
  noun = 'records',
  footerLeft,
  footerRight,
}: {
  tabs: { to: string; label: string; active: boolean }[]
  tabNote: string
  bands: number[]
  sheet: Sheet
  title: string
  bandNote: string
  models: string[]
  selectable: boolean
  editing: boolean
  link?: (p: Project) => ReactNode
  onRowClick?: (id: string) => void
  onCellChange?: (id: string, key: string, value: string) => void
  onExport: (rows: Project[]) => void
  pagination: boolean
  noun?: string
  footerLeft?: ReactNode
  footerRight?: ReactNode
}) {
  const starts = PROJECT_BANDS.map((_, i) => PROJECT_BANDS.slice(0, i).reduce((n, b) => n + b.fields.length, 0))
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-x-6 border-b border-line px-4">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn('-mb-px border-b-2 py-3 text-[12px]', t.active ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink')}
          >
            {t.label}
          </Link>
        ))}
        <span className="ml-auto py-3 text-[10.5px] text-muted">{tabNote}</span>
      </div>

      {bands.map((bi, i) => {
        const b = PROJECT_BANDS[bi]
        return (
          <div key={b.title}>
            <div className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line bg-primary-soft/60 px-3.5 py-2 text-[11px]', i > 0 && 'border-t')}>
              <span className="font-semibold text-primary">{b.range}</span>
              <span className="font-semibold text-ink">{b.title}</span>
              <span className="text-[10.5px] text-muted">{b.sub}</span>
              <span className="ml-auto text-[10.5px] text-muted">{bandNote}</span>
            </div>
            {i === 0 && <Toolbar sheet={sheet} title={title} models={models} onExport={onExport} />}
            <BandGrid
              fields={b.fields}
              offset={starts[bi]}
              first={bi === 0}
              sheet={sheet}
              rows={pagination ? sheet.visible : sheet.rows}
              selectable={selectable}
              editing={editing}
              link={link}
              onRowClick={onRowClick}
              onCellChange={onCellChange}
            />
          </div>
        )
      })}

      {sheet.rows.length === 0 && <div className="border-b border-line px-6 py-12 text-center text-[13px] text-muted">No projects match this view.</div>}
      {pagination && (
        <div className="border-b border-line">
          <Pagination page={sheet.page} pageSize={sheet.pageSize} total={sheet.rows.length} onPage={sheet.setPage} onPageSize={sheet.setPageSize} noun={noun} />
        </div>
      )}
      {(footerLeft || footerRight) && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-surface/60 px-3.5 py-2 text-[10.5px] text-muted">
          <span>{footerLeft}</span>
          <span className="text-primary">{footerRight}</span>
        </div>
      )}
    </section>
  )
}

function Toolbar({ sheet, title, models, onExport }: { sheet: Sheet; title: string; models: string[]; onExport: (rows: Project[]) => void }) {
  const [panel, setPanel] = useState<null | 'filters' | 'columns'>(null)
  const sel = 'h-8 w-full rounded-md border border-line bg-white px-2.5 text-[12px] text-ink outline-none focus:border-primary'
  return (
    <div className="relative flex min-h-12 flex-wrap items-center gap-2.5 border-b border-line px-3.5 py-1.5">
      <Table2 size={15} className="text-primary" />
      <span className="text-[12px] font-semibold">{title}</span>
      <span className="text-[11px] text-muted">
        {sheet.rows.length} record{sheet.rows.length === 1 ? '' : 's'}
      </span>
      <label className="flex h-[34px] w-full items-center gap-2 rounded-md border border-line px-3 text-[11px] text-muted sm:w-[224px]">
        <Search size={14} />
        <input value={sheet.q} onChange={(e) => sheet.setQ(e.target.value)} placeholder="Search site, name or model" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
      </label>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <button className={btn} onClick={() => setPanel(panel === 'filters' ? null : 'filters')}>
          <ListFilter size={13} /> Filters
          {sheet.filterCount > 0 && <span className="rounded bg-primary px-1.5 text-[11px] text-white">{sheet.filterCount}</span>}
        </button>
        <button className={btn} onClick={() => setPanel(panel === 'columns' ? null : 'columns')}>
          <Columns3 size={13} /> Columns
        </button>
        <button
          className={btn}
          onClick={() => {
            const pick = sheet.selected.size ? sheet.rows.filter((p) => sheet.selected.has(p.id)) : sheet.rows
            onExport(pick)
          }}
        >
          <Download size={13} /> Export .xlsx
        </button>
      </div>
      {panel === 'filters' && (
        <div className="absolute top-full right-4 z-30 mt-1 w-64 space-y-2.5 rounded-lg border border-line bg-white p-3 shadow-lg">
          <label className="block text-[11px] font-medium text-muted">
            Model
            <select className={cn(sel, 'mt-1')} value={sheet.model} onChange={(e) => sheet.setModel(e.target.value)}>
              <option value="">All models</option>
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium text-muted">
            Stage
            <select className={cn(sel, 'mt-1')} value={sheet.stage} onChange={(e) => sheet.setStage(e.target.value)}>
              <option value="">All stages</option>
              {STAGES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-between pt-1">
            <button className="text-[12px] text-muted" onClick={sheet.clearFilters}>
              Clear all
            </button>
            <button className="text-[12px] font-semibold text-primary" onClick={() => setPanel(null)}>
              Done
            </button>
          </div>
        </div>
      )}
      {panel === 'columns' && (
        <div className="absolute top-full right-4 z-30 mt-1 max-h-80 w-60 overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-lg">
          {PROJECT_BANDS.flatMap((b) => b.fields).map((f) => (
            <label key={f.key} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-surface">
              <input type="checkbox" disabled={f.key === 'siteLoi'} checked={!sheet.hidden.has(f.key)} onChange={() => sheet.toggleHidden(f.key)} />
              {f.label}
            </label>
          ))}
          <button className="mt-1 w-full text-right text-[12px] font-semibold text-primary" onClick={() => setPanel(null)}>
            Done
          </button>
        </div>
      )}
    </div>
  )
}

function BandGrid({
  fields,
  offset,
  first,
  sheet,
  rows,
  selectable,
  editing,
  link,
  onRowClick,
  onCellChange,
}: {
  fields: ProjectField[]
  offset: number
  first: boolean
  sheet: Sheet
  rows: Project[]
  selectable: boolean
  editing: boolean
  link?: (p: Project) => ReactNode
  onRowClick?: (id: string) => void
  onCellChange?: (id: string, key: string, value: string) => void
}) {
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [cell, setCell] = useState<{ id: string; key: string } | null>(null)
  const [draft, setDraft] = useState('')
  const cols = fields.map((f, i) => ({ f, letter: LETTERS[offset + i] })).filter(({ f }) => !sheet.hidden.has(f.key))
  const allSel = rows.length > 0 && rows.every((p) => sheet.selected.has(p.id))
  const someSel = rows.some((p) => sheet.selected.has(p.id))
  const pinLeft = NUM_W + (selectable ? CHK_W : 0)
  const fixed = { width: NUM_W, minWidth: NUM_W, maxWidth: NUM_W }
  const fixedChk = { width: CHK_W, minWidth: CHK_W, maxWidth: CHK_W, left: NUM_W }

  const commit = () => {
    if (!cell) return
    const err = validateCell(cell.key, draft)
    if (err) toast(err, 'info')
    else onCellChange?.(cell.id, cell.key, draft)
    setCell(null)
  }

  if (!rows.length) return null
  return (
    <div className="scroll-thin overflow-x-auto">
      {/* fixed layout: data columns share the width equally, as in the Figma bands */}
      <table className="w-full table-fixed border-collapse text-[11px]" style={{ minWidth: NUM_W + (selectable ? CHK_W : 0) + cols.length * MIN_COL }}>
        <thead>
          <tr className="bg-surface text-[9px] leading-[17px] text-muted">
            <th className="sticky left-0 z-10 border-r border-b border-line bg-surface" style={fixed} />
            {selectable && <th className="sticky z-10 border-r border-b border-line bg-surface" style={fixedChk} />}
            {cols.map(({ f, letter }, i) => (
              <th key={f.key} className={cn('border-r border-b border-line py-0 font-normal', first && i === 0 && 'sticky z-10 bg-surface')} style={first && i === 0 ? { left: pinLeft } : undefined}>
                {letter}
              </th>
            ))}
          </tr>
          <tr className="bg-surface text-left">
            <th className="sticky left-0 z-10 border-r border-b border-line bg-surface px-2.5 py-2.5 font-semibold" style={fixed}>
              #
            </th>
            {selectable && (
              <th className="sticky z-10 border-r border-b border-line bg-surface px-2.5" style={fixedChk}>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSel}
                  ref={(el) => {
                    if (el) el.indeterminate = someSel && !allSel
                  }}
                  onChange={() =>
                    sheet.setSelected((s) => {
                      const n = new Set(s)
                      rows.forEach((p) => (allSel ? n.delete(p.id) : n.add(p.id)))
                      return n
                    })
                  }
                />
              </th>
            )}
            {cols.map(({ f }, i) => {
              const s = sheet.sort.key === f.key ? sheet.sort.dir : null
              const pinned = first && i === 0
              return (
                <th
                  key={f.key}
                  className={cn('relative border-r border-b border-line px-2.5 py-2.5 font-semibold text-ink', pinned && 'sticky z-10 bg-surface')}
                  style={pinned ? { left: pinLeft, width: 150 } : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn('leading-tight', pinned && 'whitespace-nowrap')}>{f.label}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1 text-ink-2">
                      {pinned && <Pin size={11} className="text-primary" />}
                      <button onClick={() => sheet.toggleSort(f.key)} aria-label={`Sort by ${f.label}`} className={s ? 'text-primary' : ''}>
                        {s === 'asc' ? <ArrowDown size={11} /> : s === 'desc' ? <ArrowUp size={11} /> : <ArrowDownUp size={11} />}
                      </button>
                      {/* pinned Site/LOI column: pin + sort only (Figma); it is covered by the register search */}
                      {!pinned && (
                        <button
                          onClick={() => setOpenFilter(openFilter === f.key ? null : f.key)}
                          aria-label={`Filter ${f.label}`}
                          className={sheet.colFilter[f.key] ? 'text-primary' : ''}
                        >
                          <ListFilter size={11} />
                        </button>
                      )}
                    </span>
                  </div>
                  {openFilter === f.key && (
                    <div className="absolute top-full left-0 z-30 mt-1 w-56 rounded-lg border border-line bg-white p-2.5 font-normal shadow-lg">
                      <div className="mb-1.5 text-[11px] text-muted">Filter · {f.label}</div>
                      <input
                        autoFocus
                        value={sheet.colFilter[f.key] ?? ''}
                        onChange={(e) => sheet.setColFilter(f.key, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setOpenFilter(null)}
                        placeholder="Contains…"
                        className="h-8 w-full rounded-md border border-line px-2 text-[13px] outline-none focus:border-primary"
                      />
                      <div className="mt-2 flex justify-between">
                        <button className="text-[12px] text-muted" onClick={() => sheet.setColFilter(f.key, '')}>
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
          {rows.map((p) => {
            const n = sheet.rows.indexOf(p) + 1
            const isSel = sheet.selected.has(p.id)
            return (
              <tr
                key={p.id}
                onClick={(e) => {
                  if (editing || !onRowClick) return
                  if ((e.target as HTMLElement).closest('a,button,input,select')) return
                  onRowClick(p.id)
                }}
                className={cn('group', isSel || editing ? 'bg-primary-soft/40' : 'hover:bg-surface/70', onRowClick && !editing && 'cursor-pointer')}
              >
                <td className="sticky left-0 z-[1] border-r border-b border-line-soft bg-white px-2.5 py-2 text-muted group-hover:bg-surface" style={fixed}>
                  {n}
                </td>
                {selectable && (
                  <td className="sticky z-[1] border-r border-b border-line-soft bg-white px-2.5 group-hover:bg-surface" style={fixedChk}>
                    <input
                      type="checkbox"
                      aria-label={`Select row ${n}`}
                      checked={isSel}
                      onChange={() =>
                        sheet.setSelected((s) => {
                          const next = new Set(s)
                          if (next.has(p.id)) next.delete(p.id)
                          else next.add(p.id)
                          return next
                        })
                      }
                    />
                  </td>
                )}
                {cols.map(({ f }, i) => {
                  const pinned = first && i === 0
                  const canEdit = editing && f.key !== 'siteLoi'
                  const isEditing = cell?.id === p.id && cell.key === f.key
                  const options = f.kind === 'equip' ? EQUIP_STATES : f.kind === 'done' ? DONE_STATES : undefined
                  return (
                    <td
                      key={f.key}
                      onDoubleClick={() => {
                        if (!canEdit) return
                        setCell({ id: p.id, key: f.key })
                        setDraft(p.f[f.key] ?? '')
                      }}
                      title={canEdit ? 'Double-click to edit' : undefined}
                      className={cn(
                        'border-r border-b border-line-soft px-2.5 py-2.5 align-middle break-words',
                        pinned && 'sticky z-[1] bg-white group-hover:bg-surface',
                        canEdit && 'cursor-cell bg-blue-50/40',
                      )}
                      style={pinned ? { left: pinLeft } : undefined}
                    >
                      {isEditing ? (
                        options ? (
                          <select
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commit()
                              if (e.key === 'Escape') setCell(null)
                            }}
                            className="h-7 w-full min-w-24 rounded border border-primary bg-white px-1 outline-none"
                          >
                            {options.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            autoFocus
                            type={f.kind === 'pd' ? 'date' : f.kind === 'email' ? 'email' : f.kind === 'tel' ? 'tel' : 'text'}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commit()
                              if (e.key === 'Escape') setCell(null)
                            }}
                            className="h-7 w-full min-w-24 rounded border border-primary px-1.5 outline-none"
                          />
                        )
                      ) : pinned && link ? (
                        link(p)
                      ) : (
                        <FieldValue field={f} value={p.f[f.key] ?? ''} />
                      )}
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

// ───────────────────────── Status reference & notes ─────────────────────────

export function StatusReference() {
  const items: [string, string, string[]][] = [
    ['ATM Machine · V-SAT · UPS', 'Delivery and installation states', EQUIP_STATES],
    ['Site works & go-live', "Grouting, Signage Board, Lollypop, Hitachi's Branding, Monkey Cage, Tech Live, Cash Live and Agreement Status", DONE_STATES],
    ['Projection completion date', 'An open project is Pending; once projected the value is a Date (DD.MM.YYYY).', ['Pending', 'Date']],
  ]
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold">Status reference</h3>
        <span className="text-[10.5px] text-muted">Examples from the spreadsheet · Not additional project records</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map(([title, sub, values]) => (
          <div key={title} className="rounded-xl border border-line bg-white px-3.5 pt-3.5 pb-4">
            <div className="text-[12px] font-semibold text-ink">{title}</div>
            <div className="mt-1.5 text-[10.5px] text-muted">{sub}</div>
            <div className="mt-2 text-[11px] text-primary">{values.join(' · ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SheetFooter({ left }: { left?: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10.5px] text-muted">
      <span>{left ?? 'Project updates respect workspace permissions. Exports are recorded in the audit trail.'}</span>
      <span>Dates preserved as supplied · DD.MM.YYYY</span>
    </div>
  )
}
