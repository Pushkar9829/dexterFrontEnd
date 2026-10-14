import type { MouseEvent, ReactNode } from 'react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, type Tone } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { fmtDots } from '@/data/legal'
import { DONE_STATES, EQUIP_STATES, PROJECT_BANDS, type Project, type ProjectField } from '@/data/projects'

const TONE: Record<string, Tone> = {
  Pending: 'amber',
  Delivered: 'blue',
  'Installation pending': 'purple',
  'Installation done': 'green',
  Done: 'green',
}

export function FieldValue({ field, value }: { field: ProjectField; value: string }) {
  if (field.kind === 'equip' || field.kind === 'done') return value ? <Badge tone={TONE[value] ?? 'gray'}>{value}</Badge> : <span className="text-muted">—</span>
  if (field.kind === 'pd') return value ? <span>{fmtDots(value)}</span> : <Badge tone="amber">Pending</Badge>
  if (!value) return <span className="text-muted">—</span>
  if (/^(complete|registered|verified|active|received)$/i.test(value) || /^Live · /.test(value)) return <span className="font-medium text-emerald-700">{value}</span>
  return <span>{value}</span>
}

function column(field: ProjectField, first: boolean, link?: (p: Project) => ReactNode): GridColumn<Project> {
  return {
    key: field.key,
    header: field.label,
    label: field.label,
    width: field.width,
    // sorting / filtering is done once for all bands by the page (per-band sorting would desync the rows)
    pinned: first,
    editable: field.key !== 'siteLoi',
    options: field.kind === 'equip' ? EQUIP_STATES : field.kind === 'done' ? DONE_STATES : undefined,
    inputType: field.kind === 'pd' ? 'date' : 'text',
    value: (p) => p.f[field.key] ?? '',
    render: (p) => <span data-pid={p.id}>{first && link ? link(p) : <FieldValue field={field} value={p.f[field.key] ?? ''} />}</span>,
  }
}

/** Validate one edited cell. Returns an error message or ''. */
export function validateCell(key: string, value: string) {
  if (key === 'frEmail' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'FR Email must look like name@domain.in'
  if (key === 'frContact' && value && !/^\+?[\d\s-]{10,16}$/.test(value)) return 'FR Contact Number must have 10+ digits'
  return ''
}

/**
 * The 26 project fields in three lettered bands (A–I, J–R, S–Z) sharing the same rows.
 * Rows are clickable in view mode (onRowClick); cells edit on double-click in edit mode.
 */
export function ProjectBands({
  rows,
  editing,
  onCellChange,
  onRowClick,
  link,
  title,
  noun = 'projects',
}: {
  rows: Project[]
  editing: boolean
  onCellChange: (id: string, key: string, value: string) => void
  onRowClick?: (id: string) => void
  link?: (p: Project) => ReactNode
  title: string
  noun?: string
}) {
  const click = (e: MouseEvent<HTMLDivElement>) => {
    if (editing || !onRowClick) return
    const t = e.target as HTMLElement
    if (t.closest('a,button,input,select,thead')) return
    const id = t.closest('tr')?.querySelector('[data-pid]')?.getAttribute('data-pid')
    if (id) onRowClick(id)
  }
  const change = (id: string, key: string, value: string) => {
    const err = validateCell(key, value)
    if (err) return toast(err, 'info')
    onCellChange(id, key, value)
  }
  const starts = PROJECT_BANDS.map((_, i) => PROJECT_BANDS.slice(0, i).reduce((n, b) => n + b.fields.length, 0))
  return (
    <div className="space-y-4" onClick={click}>
      {PROJECT_BANDS.map((b, i) => {
        const start = starts[i]
        return (
          <div key={b.title} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-primary-soft/60 px-4 py-2.5 text-[12px]">
              <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-white">{b.range}</span>
              <span className="font-semibold text-primary">{b.title}</span>
              <span className="text-muted">{b.sub}</span>
              <span className="ml-auto text-muted">{editing ? 'Double-click a cell to edit' : i === 0 ? `${rows.length} ${noun}` : 'Same rows · Continued'}</span>
            </div>
            <div className={onRowClick && !editing ? '[&>section]:rounded-none [&>section]:border-0 [&_tbody_tr]:cursor-pointer' : '[&>section]:rounded-none [&>section]:border-0'}>
              <ExcelGrid
                title={title}
                rows={rows}
                columns={b.fields.map((f, fi) => column(f, i === 0 && fi === 0, link))}
                rowId={(p) => p.id}
                letters
                letterOffset={start}
                editing={editing}
                onCellChange={change}
                hideToolbar
                pageSize={100}
                noun={noun}
                emptyState="No projects match this view."
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function StatusReference() {
  const items: [string, string, string][] = [
    ['ATM Machine · V-SAT · UPS', 'Delivery and installation states', EQUIP_STATES.join(' · ')],
    ["Grouting, Signage Board, Lollypop, Hitachi's Branding, Monkey Cage, Tech Live, Cash Live and Agreement Status", 'Site works & go-live', DONE_STATES.join(' · ')],
    ['Projection completion date', 'Target date while work is open', 'Pending · Date (DD.MM.YYYY)'],
  ]
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="text-[14px] font-semibold">Status reference</h3>
        <span className="text-[12px] text-muted">Allowed values for the status columns</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map(([title, sub, values]) => (
          <div key={title} className="rounded-lg bg-surface p-3">
            <div className="text-[12px] font-semibold text-ink">{title}</div>
            <div className="text-[11px] text-muted">{sub}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {values.split(' · ').map((v) => (
                <Badge key={v} tone={TONE[v] ?? 'gray'}>
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
