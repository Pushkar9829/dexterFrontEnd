import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge, toneFor, type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

const LEGAL_TONE: Record<string, Tone> = {
  'Action Required': 'amber',
  'Under Review': 'blue',
  Approved: 'green',
  'Resubmission Required': 'red',
  'Compliance pending': 'amber',
  'Legally cleared': 'green',
  Superseded: 'gray',
  'Current version': 'blue',
  Saved: 'blue',
  Opened: 'blue',
  Delivered: 'blue',
  Created: 'blue',
  Received: 'blue',
  Downloaded: 'blue',
  Restored: 'blue',
  Archived: 'gray',
}

export const legalTone = (s: string): Tone => LEGAL_TONE[s] ?? toneFor(s)

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={legalTone(status)} className={className}>
      {status}
    </Badge>
  )
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
      <ArrowLeft size={15} /> {children}
    </Link>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="scroll-thin mb-5 flex overflow-x-auto rounded-xl border border-line bg-white" role="tablist">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={value === t}
          onClick={() => onChange(t)}
          className={cn(
            'shrink-0 border-b-2 px-6 py-3.5 text-[13px] whitespace-nowrap transition-colors first:rounded-tl-xl',
            value === t ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-transparent text-ink-2 hover:text-ink',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/** Label / value pair used in metadata grids. */
export function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1.5 text-[14px] font-semibold break-words text-ink">{children || <span className="text-muted">—</span>}</div>
    </div>
  )
}

export function Monogram({ text, className }: { text: string; className?: string }) {
  const initials = text
    .split(/\s+/)
    .filter((p) => /^[A-Za-z]/.test(p))
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-[17px] font-semibold text-primary', className)}>{initials}</span>
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-blue-100 bg-primary-soft/60 px-4 py-3 text-[12px] text-ink-2', className)}>{children}</div>
}
