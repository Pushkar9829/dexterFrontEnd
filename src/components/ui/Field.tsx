import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Label({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-semibold text-ink">
      {children}
      {required && <span className="ml-0.5 text-brand-red">*</span>}
    </label>
  )
}

export function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="mt-1.5 text-[12px] text-brand-red">{error}</p>
  if (hint) return <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
  return null
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  leading?: ReactNode
  trailing?: ReactNode
}

export function Input({ label, required, error, hint, leading, trailing, className, id, ...rest }: InputProps) {
  const fieldId = id ?? rest.name
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      <div
        className={cn(
          'flex h-12 items-center gap-3 rounded-lg border bg-white px-3.5 transition-shadow focus-within:ring-3',
          error ? 'border-brand-red focus-within:ring-red-100' : 'border-line focus-within:border-primary focus-within:ring-primary/10',
        )}
      >
        {leading}
        <input id={fieldId} {...rest} className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70" />
        {trailing ?? (error ? <CircleAlert size={18} className="shrink-0 text-brand-red" aria-hidden /> : null)}
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  )
}

export function PasswordInput(props: Omit<InputProps, 'type' | 'trailing'>) {
  const [show, setShow] = useState(false)
  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button type="button" onClick={() => setShow((s) => !s)} className="text-primary" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  )
}

export function PhoneInput(props: Omit<InputProps, 'leading' | 'type'>) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      maxLength={11}
      leading={<span className="border-r border-line pr-3 text-[15px] font-medium text-ink">+91</span>}
    />
  )
}

/** Pill segmented control (Phone | Email, Password | OTP, Yearly | Monthly). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('grid gap-1 rounded-lg border border-line bg-surface p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 rounded-md text-[14px] transition-colors',
            value === o.value ? 'bg-white font-semibold text-primary shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; className?: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-2 select-none', className)}>
      <span
        className={cn(
          'grid h-[18px] w-[18px] place-items-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-white' : 'border-line bg-white',
        )}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

/** Six single-digit boxes with auto-advance, backspace and paste. */
export function OtpInput({ value, onChange, error, length = 6 }: { value: string; onChange: (v: string) => void; error?: boolean; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  // Cells are kept positionally (a blank box must not shift later digits), and updated
  // functionally so fast typing across boxes never works from a stale copy.
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, (_, i) => value[i] ?? ''))

  useEffect(() => {
    if (value === '' && digits.some(Boolean)) setDigits(Array(length).fill(''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const update = (fn: (prev: string[]) => string[]) =>
    setDigits((prev) => {
      const next = fn(prev)
      onChange(next.every(Boolean) ? next.join('') : next.join('').slice(0, next.indexOf('')))
      return next
    })

  const set = (i: number, d: string) =>
    update((prev) => {
      const next = prev.slice()
      next[i] = d
      return next
    })

  return (
    <div className="flex gap-2.5 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '')
            // SMS autofill / bulk input lands several digits in one box: spread them forward.
            const incoming = typed.length > 1 && d ? typed.replace(d, '') || typed.slice(-1) : typed
            if (incoming.length > 1) {
              update((prev) => {
                const next = prev.slice()
                for (let k = 0; k < incoming.length && i + k < length; k++) next[i + k] = incoming[k]
                return next
              })
              refs.current[Math.min(i + incoming.length, length - 1)]?.focus()
              return
            }
            set(i, incoming)
            if (incoming && i < length - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
            if (p) {
              e.preventDefault()
              update(() => Array.from({ length }, (_, k) => p[k] ?? ''))
              refs.current[Math.min(p.length, length - 1)]?.focus()
            }
          }}
          className={cn(
            'h-12 w-full min-w-0 rounded-lg border bg-white text-center text-[20px] font-semibold outline-none transition-shadow focus:ring-3 sm:h-14',
            error ? 'border-brand-red bg-red-50/40 focus:ring-red-100' : 'border-line focus:border-primary focus:ring-primary/10',
          )}
        />
      ))}
    </div>
  )
}
