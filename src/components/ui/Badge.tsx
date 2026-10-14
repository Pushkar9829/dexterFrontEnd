import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'gray' | 'navy'

const tones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  purple: 'bg-violet-50 text-violet-700',
  gray: 'bg-slate-100 text-slate-600',
  navy: 'bg-primary-soft text-primary',
}

const dots: Record<Tone, string> = {
  green: 'bg-emerald-600',
  blue: 'bg-blue-600',
  amber: 'bg-amber-500',
  red: 'bg-red-600',
  purple: 'bg-violet-600',
  gray: 'bg-slate-400',
  navy: 'bg-primary',
}

export function Badge({ tone = 'gray', dot = true, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[12px] font-medium whitespace-nowrap', tones[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  )
}

/** Common status words → badge tone, so pages don't repeat the mapping. */
export function toneFor(status: string): Tone {
  const s = status.toLowerCase()
  if (/(complete|verified|approved|active|done|closed|uploaded|healthy|met)/.test(s)) return 'green'
  if (/(progress|review|assigned|open|scheduled|delivered)/.test(s)) return 'blue'
  if (/(pending|draft|waiting|warning|degraded|awaiting)/.test(s)) return 'amber'
  if (/(reject|breach|overdue|blocked|critical|down|inactive|failed|expired)/.test(s)) return 'red'
  return 'gray'
}
