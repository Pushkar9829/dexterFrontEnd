import { useRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown, FileCheck2, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/cn'

// Compact (36px) form controls used by data-entry screens. Auth screens use the larger Field.tsx.

const box = 'h-9 w-full rounded-md border bg-white px-[11px] text-[12.5px] text-ink outline-none transition-shadow placeholder:text-muted/70 focus:border-primary focus:ring-3 focus:ring-primary/10 disabled:bg-surface disabled:text-muted'

function FieldLabel({ label, required, num, htmlFor }: { label: string; required?: boolean; num?: number | string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold text-ink">
      {num != null && <span className="text-ink">{num} · </span>}
      {label}
      {required && <span className="text-ink"> *</span>}
    </label>
  )
}

function Message({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="mt-1 text-[11px] text-brand-red">{error}</p>
  if (hint) return <p className="mt-1 text-[11px] text-muted">{hint}</p>
  return null
}

type Common = { label: string; required?: boolean; num?: number | string; error?: string; hint?: string; className?: string }

export function TextField({ label, required, num, error, hint, className, id, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const fid = id ?? rest.name
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} num={num} htmlFor={fid} />
      <input id={fid} {...rest} className={cn(box, error ? 'border-brand-red' : 'border-line')} />
      <Message error={error} hint={hint} />
    </div>
  )
}

export function TextAreaField({ label, required, num, error, hint, className, id, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fid = id ?? rest.name
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} num={num} htmlFor={fid} />
      <textarea id={fid} rows={3} {...rest} className={cn(box, 'h-auto py-2', error ? 'border-brand-red' : 'border-line')} />
      <Message error={error} hint={hint} />
    </div>
  )
}

export function SelectField({
  label, required, num, error, hint, className, options, placeholder = 'Select', id, ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: string[]; placeholder?: string }) {
  const fid = id ?? rest.name
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} num={num} htmlFor={fid} />
      <div className="relative">
        <select id={fid} {...rest} className={cn(box, 'appearance-none pr-8', !rest.value && 'text-muted/80', error ? 'border-brand-red' : 'border-line')}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute top-2.5 right-2.5 text-muted" />
      </div>
      <Message error={error} hint={hint} />
    </div>
  )
}

/** Boxed radio options (Yes / No, Rented / Owned …). */
export function RadioGroup<T extends string>({
  label, num, value, onChange, options, className, error,
}: { label: string; num?: number | string; value: T | ''; onChange: (v: T) => void; options: T[]; className?: string; error?: string }) {
  return (
    <div className={className}>
      <FieldLabel label={label} num={num} />
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={cn(
              'flex h-9 items-center gap-2 rounded-md border px-3 text-[12px] transition-colors',
              value === o ? 'border-primary bg-primary-soft font-medium text-primary' : 'border-line bg-white text-ink-2 hover:border-primary/40',
            )}
          >
            <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full border', value === o ? 'border-primary' : 'border-line')}>
              {value === o && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
            {o}
          </button>
        ))}
      </div>
      <Message error={error} />
    </div>
  )
}

export type FileValue = { name: string; size: number } | null

export const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/** Dashed upload box. Keeps only file name/size (no backend yet). */
export function FileDrop({
  value, onChange, accept, maxMb = 5, hint, compact, label = 'Click to upload or drag a file', disabled,
}: { value: FileValue; onChange: (f: FileValue) => void; accept?: string; maxMb?: number; hint?: ReactNode; compact?: boolean; label?: string; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const take = (f?: File) => {
    if (!f) return
    if (f.size > maxMb * 1024 * 1024) {
      alert(`File is larger than ${maxMb} MB.`)
      return
    }
    onChange({ name: f.name, size: f.size })
  }

  if (value)
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3', compact ? 'py-2' : 'py-3')}>
        <FileCheck2 size={18} className="shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-ink">{value.name}</div>
          <div className="text-[11px] text-muted">{fmtSize(value.size)} · Uploaded</div>
        </div>
        {!disabled && (
          <button type="button" onClick={() => onChange(null)} className="text-muted hover:text-brand-red" aria-label="Remove file">
            <X size={16} />
          </button>
        )}
      </div>
    )

  return (
    <div
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (!disabled) take(e.dataTransfer.files[0])
      }}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-surface/60 px-3 hover:border-primary/50',
        compact ? 'py-2' : 'py-4',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
        <UploadCloud size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-primary">{label}</div>
        <div className="text-[11px] text-muted">{hint ?? 'No file uploaded'}</div>
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => take(e.target.files?.[0])} />
    </div>
  )
}

export function SectionTitle({ num, title, sub }: { num?: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        {num && <span className="grid h-6 min-w-6 place-items-center rounded-md bg-primary px-1 text-[11px] font-semibold text-white">{num}</span>}
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      </div>
      {sub && <p className="mt-1 text-[12px] text-muted">{sub}</p>}
    </div>
  )
}
