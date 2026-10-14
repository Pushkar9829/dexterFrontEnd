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
    <div className={cn('flex items-center gap-3 px-5 pt-5 pb-3', className)}>
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {sub && <span className="text-[12px] text-muted">{sub}</span>}
      <div className="ml-auto flex items-center gap-2">
        {action}
        {viewAll && (
          <Link to={viewAll} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1.5 text-[14px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
