import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-xl border border-line bg-white', className)}>{children}</section>
}

export function CardHeader({
  title,
  icon,
  sub,
  viewAll,
  action,
  className,
}: {
  title: ReactNode
  icon?: ReactNode
  sub?: ReactNode
  viewAll?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5 px-4 pt-4 pb-3', className)}>
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
      <div className="ml-auto flex items-center gap-2">
        {action}
        {viewAll && (
          <Link to={viewAll} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            View all <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
