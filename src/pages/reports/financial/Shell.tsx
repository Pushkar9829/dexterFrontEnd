import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Pencil, Plus, Save, X } from 'lucide-react'
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
export function useDraft(saved: Row[], persist: (rows: Row[]) => void, label: string) {
  const [draft, setDraft] = useState<Row[] | null>(null)
  const rows = draft ?? saved
  return {
    rows,
    editing: draft !== null,
    start: () => setDraft(saved.map((r) => ({ ...r }))),
    cancel: () => setDraft(null),
    save: () => {
      if (draft) persist(draft)
      setDraft(null)
      toast(`${label} saved · ${draft?.length ?? 0} rows`)
    },
    change: (id: string, key: string, value: string) => setDraft((d) => (d ?? saved).map((r) => (r.id === id ? { ...r, [key]: value } : r))),
    setRows: (fn: (rows: Row[]) => Row[]) => setDraft((d) => fn(d ?? saved)),
  }
}

let seq = 0
export const newId = (prefix: string) => `${prefix}-N${Date.now().toString(36)}${(seq++).toString(36)}`

/** "Financial Report" page frame: title, sub-tabs (BS … DLR3), report header with Update / Save, notes and footer. */
export function FinancialShell({
  sub,
  name,
  meta,
  chip,
  controls,
  editing,
  onUpdate,
  onCancel,
  onSave,
  onAdd,
  addLabel = 'Add row',
  back,
  children,
  notes,
}: {
  sub: string
  name: ReactNode
  meta?: ReactNode
  chip?: string
  controls?: ReactNode
  editing?: boolean
  onUpdate?: () => void
  onCancel?: () => void
  onSave?: () => void
  onAdd?: () => void
  addLabel?: string
  back?: ReactNode
  children: ReactNode
  notes?: ReactNode
}) {
  return (
    <div className="min-w-0">
      {back}
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Financial Report</h1>
      <p className="mt-1.5 text-[14px] text-muted">{sub}</p>

      <nav className="scroll-thin mt-4 mb-5 flex overflow-x-auto border-b border-line" aria-label="Financial reports">
        {FIN_TABS.map((t) => (
          <NavLink
            key={t.slug}
            to={`/reports/financial/${t.slug}`}
            className={({ isActive }) =>
              cn(
                '-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] whitespace-nowrap',
                isActive ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[20px] font-semibold text-ink">{name}</h2>
            {chip && <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">{chip}</span>}
          </div>
          {meta && <p className="mt-1 text-[12px] text-muted">{meta}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editing && controls}
          {onUpdate &&
            (editing ? (
              <>
                {onAdd && (
                  <Button variant="secondary" icon={<Plus size={16} />} onClick={onAdd}>
                    {addLabel}
                  </Button>
                )}
                <Button variant="secondary" icon={<X size={16} />} onClick={onCancel}>
                  Cancel
                </Button>
                <Button variant="bright" icon={<Save size={16} />} onClick={onSave}>
                  Save
                </Button>
              </>
            ) : (
              <Button icon={<Pencil size={16} />} onClick={onUpdate}>
                Update
              </Button>
            ))}
        </div>
      </div>

      {children}

      {notes && <div className="mt-4 grid gap-4 lg:grid-cols-2">{notes}</div>}
      <p className="mt-6 border-t border-line pt-4 text-center text-[12px] text-muted">{FOOTER}</p>
    </div>
  )
}

/** compact select used for F.Y. / month selectors in report headers */
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
