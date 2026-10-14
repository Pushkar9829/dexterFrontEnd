import type { MouseEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] whitespace-nowrap transition-colors',
        active ? 'border-primary bg-primary font-semibold text-white' : 'border-line bg-white text-ink-2 hover:border-primary/40',
      )}
    >
      {children}
      {count != null && <span className={cn('rounded-full px-1.5 text-[11px]', active ? 'bg-white/20' : 'bg-surface text-muted')}>{count}</span>}
    </button>
  )
}

/**
 * ExcelGrid has no row-click prop, so rows carry a marker class (`rowmark__<id>`) via rowClassName
 * and a wrapper div resolves clicks to a route. Clicks on links / buttons / inputs are ignored.
 */
export const rowMark = (id: string) => `cursor-pointer rowmark__${id}`

export function useRowNav(to: (id: string) => string) {
  const navigate = useNavigate()
  return (e: MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.closest('a,button,input,select,textarea,label')) return
    const tr = el.closest('tr')
    const m = tr?.className.match(/rowmark__(\S+)/)
    if (m) navigate(to(m[1]))
  }
}

export function ReadField({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  const empty = children === '' || children == null
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[12px] font-semibold text-ink">{label}</div>
      <div className={cn('flex min-h-9 items-center rounded-md border border-line-soft bg-surface/60 px-3 py-1.5 text-[13px] break-words', mono && 'font-mono text-[12.5px]')}>
        {empty ? <span className="text-muted">—</span> : children}
      </div>
    </div>
  )
}

export function FormCard({ letter, title, sub, count, children }: { letter: string; title: string; sub: string; count: number; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-primary-soft/50 px-5 py-3">
        <span className="grid h-6 min-w-6 place-items-center rounded-md bg-primary px-1 text-[11px] font-semibold text-white">{letter}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
          <p className="text-[12px] text-muted">{sub}</p>
        </div>
        <span className="text-[12px] text-muted">{count} fields</span>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  )
}

/** Nullable radio: the shared RadioGroup can't un-select, so add a "Clear" link under it. */
export function ClearLink({ show, onClear }: { show: boolean; onClear: () => void }) {
  if (!show) return <p className="mt-1 text-[11px] text-muted">None selected</p>
  return (
    <button type="button" onClick={onClear} className="mt-1 text-[11px] font-medium text-primary hover:underline">
      Clear selection
    </button>
  )
}
