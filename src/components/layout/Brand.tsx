import { cn } from '@/lib/cn'

export function Brand({ tag = 'OPERATOR CRM', className }: { tag?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="h-[34px] w-1 rounded-full bg-brand-red" />
      <div className="leading-none">
        <div className="text-[22px] font-semibold tracking-tight text-white">Dexter India</div>
        <div className="mt-1.5 text-[9px] font-semibold tracking-wide text-white/90">{tag}</div>
      </div>
    </div>
  )
}
