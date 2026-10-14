import type { ReactNode } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

// Dossier-only building blocks (Figma 56:3219 … 56:1628). View mode renders read-only boxes with
// masked / unit-formatted values; edit mode renders the same boxes as live inputs.

export type Opt = string | { value: string; label: string }
const optValue = (o: Opt) => (typeof o === 'string' ? o : o.value)
const optLabel = (o: Opt) => (typeof o === 'string' ? o : o.label)

const box = 'h-[39px] w-full rounded-md border bg-white px-3 text-[14px] text-ink outline-none transition-shadow'

/** Card with a title row, optional status chip and a divided body (e.g. "Site profile", "Masked"). */
export function SectionCard({ title, sub, badge, children, className, bodyClassName }: { title: ReactNode; sub?: ReactNode; badge?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
        </div>
        {badge && <Chip>{badge}</Chip>}
      </header>
      <div className={cn('px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Chip({ children, tone = 'navy' }: { children: ReactNode; tone?: 'navy' | 'amber' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium whitespace-nowrap',
        tone === 'navy' ? 'bg-primary-soft text-primary' : 'bg-amber-50 text-amber-700',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'navy' ? 'bg-primary' : 'bg-amber-500')} />
      {children}
    </span>
  )
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-md bg-primary-soft px-4 py-3.5 text-[12px] text-primary', className)}>
      <Info size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-[21px] text-[12px] leading-4 text-muted">{children}</div>
}

function Err({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-[11px] text-brand-red">{error}</p> : null
}

/**
 * Labelled value box. View: read-only text (already masked / formatted by the caller via `display`).
 * Edit: text input, or a select when `options` are given (the current value is always kept selectable).
 */
export function Field({
  label, value, display, readOnly, onChange, options, error, className, inputMode, placeholder, type,
}: {
  label: ReactNode
  value: string
  display?: string
  readOnly: boolean
  onChange: (v: string) => void
  options?: Opt[]
  error?: string
  className?: string
  inputMode?: 'numeric' | 'decimal' | 'email' | 'tel' | 'text'
  placeholder?: string
  type?: string
}) {
  if (readOnly)
    return (
      <div className={className}>
        <Label>{label}</Label>
        <div className={cn(box, 'flex items-center truncate border-line')}>{(display ?? value) || <span className="text-muted">—</span>}</div>
      </div>
    )
  const opts = options && value && !options.some((o) => optValue(o) === value) ? [value, ...options] : options
  return (
    <div className={className}>
      <Label>{label}</Label>
      {opts ? (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(box, 'appearance-none pr-8 focus:border-primary focus:ring-3 focus:ring-primary/10', error ? 'border-brand-red' : 'border-line')}
          >
            <option value="">Select</option>
            {opts.map((o) => (
              <option key={optValue(o)} value={optValue(o)}>
                {optLabel(o)}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute top-3 right-2.5 text-muted" />
        </div>
      ) : (
        <input
          type={type}
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(box, 'focus:border-primary focus:ring-3 focus:ring-primary/10', error ? 'border-brand-red' : 'border-line')}
        />
      )}
      <Err error={error} />
    </div>
  )
}

/** Inline radio row ("● Full Shop  ○ Shop in Shop"). */
export function Radios({
  label, value, options, readOnly, onChange, error, className,
}: { label?: ReactNode; value: string; options: string[]; readOnly: boolean; onChange: (v: string) => void; error?: string; className?: string }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div role="radiogroup" className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2">
        {options.map((o) => {
          const on = value === o
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={readOnly}
              onClick={() => onChange(o)}
              className={cn('flex items-center gap-2 text-[12px] disabled:cursor-default', on ? 'font-semibold text-primary' : 'text-muted')}
            >
              <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full border', on ? 'border-primary bg-primary' : 'border-line bg-white')}>
                {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {o}
            </button>
          )
        })}
      </div>
      <Err error={error} />
    </div>
  )
}

