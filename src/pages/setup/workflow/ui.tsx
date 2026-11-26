import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, X } from 'lucide-react'
import { cn } from '@/lib/cn'

// Shared look for the Workflow & Communication setup pages. Table / filter / tab look re-used from the
// Franchise network pages so every Setup screen matches.
export { TH, TD, TROW, BTN_PRIMARY, BTN_SECONDARY, PageHead, FilterCard, FilterSelect, TableCard, THead, EmptyRow, Tabs, PickField, ReadOnlyField, MiniToolbar, Panel } from '@/pages/franchise/network/shared'

export type Crumb = { label: string; to?: string }

/** Workspace › Onboarding › Setup › … (or Work Management for the task screen). */
export function WfCrumbs({ trail, root = 'setup' }: { trail: Crumb[]; root?: 'setup' | 'work' }) {
  const base: Crumb[] = root === 'setup' ? [{ label: 'Onboarding', to: '/onboarding' }, { label: 'Setup', to: '/setup' }] : [{ label: 'Work Management', to: '/work-management' }]
  const all = [...base, ...trail]
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
      <Home size={14} className="text-slate-400 shrink-0" />
      <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">Workspace</Link>
      {all.map((t, i) => (
        <span key={`${t.label}-${i}`} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-400" />
          {t.to && i < all.length - 1 ? (
            <Link to={t.to} className="hover:text-[#0066FF] transition-colors">{t.label}</Link>
          ) : (
            <span className={cn(i === all.length - 1 && 'font-semibold text-slate-800')}>{t.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

/** Right-side drawer (task detail etc.). */
export function Drawer({ title, sub, onClose, children, footer }: { title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={title} className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold text-slate-900">{title}</h2>
            {sub && <div className="mt-0.5 text-[12px] text-slate-500">{sub}</div>}
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-slate-600" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</footer>}
      </aside>
    </div>
  )
}

export function Stat({ label, value, tone = 'text-slate-900', hint }: { label: string; value: ReactNode; tone?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="text-[12px] font-medium text-slate-500">{label}</div>
      <div className={cn('mt-1 text-2xl font-bold', tone)}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  )
}
