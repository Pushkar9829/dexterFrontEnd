import type { ReactNode } from 'react'
import { Check, Clock3 } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { slaOf, type Priority, type Task, type TaskStatus } from '@/data/tasks'

/** Navy hero banner used on CRM-06 / CRM-07 (same treatment as the dashboard banner). */
export function HeroBanner({ title, sub, code, extra }: { title: string; sub: string; code: string; extra?: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-banner px-6 py-7 text-white sm:px-7">
      <div className="pointer-events-none absolute inset-y-0 right-[22%] hidden w-64 -skew-x-[35deg] bg-white/5 md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-[18%] hidden w-3 -skew-x-[35deg] bg-brand-red md:block" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold sm:text-[30px]">{title}</h1>
          <p className="mt-1.5 text-[14px] text-white/85">{sub}</p>
          {extra}
        </div>
        <div className="sm:text-right">
          <div className="text-[14px] font-semibold">Dexter India · {code}</div>
          <div className="mt-1 text-[12px] text-white/80">Tuesday, 06 October 2026</div>
          <div className="mt-1.5 text-[10px] font-semibold tracking-wider text-white/80">INDIA OPERATIONS</div>
        </div>
      </div>
    </section>
  )
}

const PRIORITY_CLS: Record<Priority, string> = {
  Critical: 'text-red-600',
  High: 'text-amber-700',
  Medium: 'text-primary',
  Low: 'text-slate-500',
}
const PRIORITY_DOT: Record<Priority, string> = { Critical: 'bg-red-600', High: 'bg-amber-600', Medium: 'bg-primary', Low: 'bg-slate-400' }

export function PriorityLabel({ p }: { p: Priority }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold', PRIORITY_CLS[p])}>
      <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[p])} />
      {p}
    </span>
  )
}

export const PRIORITY_TONE: Record<Priority, Tone> = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'gray' }
export const STATUS_TONE: Record<TaskStatus, Tone> = {
  New: 'blue',
  Assigned: 'blue',
  'In Progress': 'blue',
  'Pending Approval': 'amber',
  'Waiting/Blocked': 'red',
  Closed: 'green',
}

export function StatusBadge({ s, label }: { s: TaskStatus; label?: string }) {
  return (
    <Badge tone={STATUS_TONE[s]} className="text-[11px]">
      {label ?? s}
    </Badge>
  )
}

export function SlaCell({ t }: { t: Task }) {
  const s = slaOf(t)
  const color = s.closed ? (s.overdue ? 'text-red-600' : 'text-emerald-700') : s.overdue || s.remainingMin <= 4 * 60 ? 'text-red-600' : s.remainingMin <= 12 * 60 ? 'text-amber-700' : 'text-emerald-700'
  return (
    <span className="block leading-tight">
      <span className={cn('text-[12px]', s.overdue || (!s.closed && s.remainingMin <= 4 * 60) ? 'text-red-600' : 'text-ink-2')}>{s.ratio}</span>
      <span className={cn('mt-0.5 flex items-center gap-1 text-[11px]', color)}>
        {s.closed && !s.overdue ? <Check size={11} /> : <Clock3 size={11} />}
        {s.line}
      </span>
    </span>
  )
}

export function Avatar({ name, initials, size = 32, className }: { name: string; initials?: string; size?: number; className?: string }) {
  const ini = initials ?? (name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—')
  return (
    <span
      title={name}
      className={cn('grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary', className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {ini}
    </span>
  )
}

/** Small select styled like the design's filter pills. */
export function PillSelect<T extends string>({
  value,
  onChange,
  options,
  icon,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  icon?: ReactNode
  label: string
  className?: string
}) {
  return (
    <label className={cn('relative flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white pr-2 pl-3 text-[13px] font-semibold text-ink hover:border-primary/40', className)}>
      {icon && <span className="text-primary">{icon}</span>}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className="h-full max-w-[220px] cursor-pointer appearance-none bg-transparent pr-4 outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-muted">▾</span>
    </label>
  )
}

export function Footer() {
  return (
    <div className="flex flex-wrap justify-between gap-2 pt-2 text-[12px] text-muted">
      <span>India operations · Tasks across active franchises</span>
      <span>Last updated 06 Oct 2026, 09:14 IST</span>
    </div>
  )
}
