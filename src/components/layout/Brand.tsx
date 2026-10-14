import { cn } from '@/lib/cn'

/** "Dexter India" wordmark with the red bar. `tone="dark"` is the navy-on-white variant (mobile auth header). */
export function Brand({ tag = 'OPERATOR CRM', className, tone = 'light' }: { tag?: string; className?: string; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark'
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="h-[34px] w-1 rounded-full bg-brand-red" />
      <div className="leading-none">
        <div className={cn('text-[22px] font-semibold tracking-tight', dark ? 'text-primary' : 'text-white')}>Dexter India</div>
        <div className={cn('mt-1.5 text-[9px] font-semibold tracking-wide', dark ? 'text-muted' : 'text-white/90')}>{tag}</div>
      </div>
    </div>
  )
}
