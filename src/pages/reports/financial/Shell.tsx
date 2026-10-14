import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Info, Plus, SquarePen, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import type { Row } from '@/data/reportsFinancial'

export const FIN_TABS = [
  { slug: 'bs', label: 'BS' },
  { slug: 'axis-icd', label: 'Axis & ICD' },
  { slug: 'clf', label: 'CLF' },
  { slug: 'sd', label: 'SD' },
  { slug: 'ffm-eod', label: 'FFM EOD' },
  { slug: 'overage-deposit', label: 'Overage deposit' },
  { slug: 'dlr2', label: 'DLR2' },
  { slug: 'dlr3', label: 'DLR3' },
]

export const FOOTER = 'Reports respect your workspace permissions. Exports are recorded in the audit trail.'

/** view → Update → edit (Save / Cancel) state over a list of rows. */
export function useDraft(saved: Row[], persist: (rows: Row[]) => void, label: string, initialEditing = false) {
  const [draft, setDraft] = useState<Row[] | null>(initialEditing ? saved.map((r) => ({ ...r })) : null)
  const rows = draft ?? saved
  return {
    rows,
    editing: draft !== null,
    start: () => setDraft(saved.map((r) => ({ ...r }))),
    cancel: () => setDraft(null),
    save: () => {
      if (draft) persist(draft)
      setDraft(null)
      toast(`${label} saved`)
    },
    change: (id: string, key: string, value: string) => setDraft((d) => (d ?? saved).map((r) => (r.id === id ? { ...r, [key]: value } : r))),
    setRows: (fn: (rows: Row[]) => Row[]) => setDraft((d) => fn(d ?? saved)),
  }
}

let seq = 0
export const newId = (prefix: string) => `${prefix}-N${Date.now().toString(36)}${(seq++).toString(36)}`

/** Navy "Update" in view mode; Cancel + bright blue "Save" (and optional Add) in edit mode — sits at the right of the tab strip. */
export function EditActions({
  editing,
  onUpdate,
  onCancel,
  onSave,
  onAdd,
  addLabel = 'Add row',
}: {
  editing: boolean
  onUpdate: () => void
  onCancel: () => void
  onSave: () => void
  onAdd?: () => void
  addLabel?: string
}) {
  if (!editing)
    return (
      <Button icon={<SquarePen size={16} />} onClick={onUpdate}>
        Update
      </Button>
    )
  return (
    <>
      {onAdd && (
        <Button variant="secondary" icon={<Plus size={16} />} onClick={onAdd}>
          {addLabel}
        </Button>
      )}
      {/* not in the Figma edit frame (Save only) — kept as a quiet text button so an edit can be abandoned */}
      <button type="button" onClick={onCancel} className="flex h-[38px] items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-muted hover:bg-surface hover:text-ink">
        <X size={14} /> Cancel
      </button>
      <Button variant="bright" icon={<SquarePen size={16} />} onClick={onSave}>
        Save
      </Button>
    </>
  )
}

/** Figma info note: ⓘ + bold title + muted text on a soft blue card. */
export function InfoNote({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl bg-primary-soft/70 px-3.5 py-3 text-[11px]">
      <Info size={15} className="mt-px shrink-0 text-primary" />
      <div>
        <div className="font-semibold text-ink">{title}</div>
        <div className="mt-1 text-ink-2">{children}</div>
      </div>
    </div>
  )
}

/** "Source reference entries" card: allowed values shown as chips. */
export function SourceEntries({ sub, groups, foot }: { sub: string; groups: { label: string; values: string[] }[]; foot?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white px-3.5 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[13px] font-semibold text-ink">Source reference entries</h3>
        <span className="text-[11px] text-muted">{sub}</span>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-2 text-[11px] font-semibold text-ink">
              {g.label} · {g.values.length} entries
            </div>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => (
                <span key={v} className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-2">
                  {v}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {foot && <p className="mt-3 text-[10px] text-muted">{foot}</p>}
    </section>
  )
}

/**
 * "Financial Report" page frame (Figma: Reports > Financial Report).
 * Title + subtitle, sub-tab strip (all reports on a list page, only the current report on a record page) with the
 * F.Y. chip / Update / Save at its right, the report heading row (title, chip, meta, view note), content, notes and footer.
 */
export function FinancialShell({
  sub,
  only,
  tabRight,
  name,
  chip,
  meta,
  metaRight,
  banner,
  children,
  notes,
  footerLeft = FOOTER,
  footerRight,
}: {
  sub: string
  /** slug of the single tab shown on record / detail pages */
  only?: string
  tabRight?: ReactNode
  name: ReactNode
  chip?: ReactNode
  meta?: ReactNode
  metaRight?: ReactNode
  banner?: ReactNode
  children: ReactNode
  notes?: ReactNode
  footerLeft?: ReactNode
  footerRight?: ReactNode
}) {
  const tabs = only ? FIN_TABS.filter((t) => t.slug === only) : FIN_TABS
  return (
    <div className="min-w-0">
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Financial Report</h1>
      <p className="mt-1 text-[13px] text-muted">{sub}</p>

      <div className="mt-1.5 mb-[18px] flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <nav className="scroll-thin flex min-w-0 gap-6 overflow-x-auto" aria-label="Financial reports">
          {tabs.map((t) => (
            <NavLink
              key={t.slug}
              to={`/reports/financial/${t.slug}`}
              className={({ isActive }) =>
                cn(
                  '-mb-px shrink-0 border-b-2 px-4 py-3 text-[13px] whitespace-nowrap',
                  isActive ? 'border-primary font-semibold text-primary' : 'border-transparent font-medium text-ink-2 hover:text-ink',
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        {tabRight && <div className="flex flex-wrap items-center gap-2">{tabRight}</div>}
      </div>

      <div className="mb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] font-semibold text-ink">{name}</h2>
          {chip && <span className="rounded-md bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">{chip}</span>}
        </div>
        {(meta || metaRight) && (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
            <span>{meta}</span>
            {metaRight && <span className="flex items-center gap-2">{metaRight}</span>}
          </div>
        )}
      </div>

      {banner && <div className="mb-4">{banner}</div>}

      {children}

      {notes && <div className="mt-4 space-y-4">{notes}</div>}
      <div className="mt-[18px] flex flex-wrap justify-between gap-2 text-[10px] text-muted">
        <span>{footerLeft}</span>
        {footerRight && <span>{footerRight}</span>}
      </div>
    </div>
  )
}

/** compact select styled as the Figma "F.Y. Year 22-23" chip (also used for the FFM EOD month) */
export function ChipSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex h-[23px] items-center rounded-md bg-primary-soft px-2.5 text-[11px] font-semibold text-primary">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer appearance-none bg-transparent outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** compact select used for filters in report headers */
export function HeaderSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px]">
      <span className="text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-semibold text-ink outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
