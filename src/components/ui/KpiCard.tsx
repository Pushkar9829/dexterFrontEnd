import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/cn'

const iconBg = {
  blue: 'bg-accent-blue',
  green: 'bg-accent-green',
  purple: 'bg-accent-purple',
  red: 'bg-brand-red',
  navy: 'bg-primary',
}

/** Icon-led KPI (dashboard style): coloured icon tile, title, big value with trend, caption. */
export function KpiCard({
  icon,
  color = 'blue',
  title,
  value,
  trend,
  up = true,
  caption,
}: {
  icon: ReactNode
  color?: keyof typeof iconBg
  title: string
  value: ReactNode
  trend?: string
  up?: boolean
  caption?: string
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-white p-4">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white', iconBg[color])}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[28px] font-semibold leading-tight text-ink">{value}</span>
          {trend && (
            <span className={cn('flex items-center text-[11px] font-medium', up ? 'text-emerald-600' : 'text-brand-red')}>
              {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {trend}
            </span>
          )}
        </div>
        {caption && <div className="mt-1 text-[12px] text-muted">{caption}</div>}
      </div>
    </div>
  )
}

/** Plain stat card (list pages): label + icon on top, value, caption. */
export function StatCard({ label, value, caption, icon }: { label: string; value: ReactNode; caption?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between text-[13px] text-muted">
        <span>{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="mt-3 text-[28px] font-semibold leading-none text-ink">{value}</div>
      {caption && <div className="mt-3 text-[12px] text-muted">{caption}</div>}
    </div>
  )
}
