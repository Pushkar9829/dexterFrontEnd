// Shared layout pieces for Account Mapping + Team Leader payout screens.
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Check, Download, Filter, Search, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Equal, fixed-size sub-tabs (spec §3.2 — tabs never stretch). */
export function SubTabs({ tabs }: { tabs: { label: string; to: string; end?: boolean; count?: number }[] }) {
  return (
    <nav className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Sub sections">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              'flex h-10 w-[200px] shrink-0 items-center justify-center gap-2 rounded-lg border px-2 text-center text-[12px] font-semibold transition-colors',
              isActive ? 'border-[#0066FF] bg-[#EEF4FF] text-[#0066FF]' : 'border-line bg-white text-ink-2 hover:border-primary/40 hover:text-primary',
            )
          }
        >
          {t.label}
          {t.count != null && <span className="rounded bg-white/80 px-1.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">{t.count}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

/** Table card with the mandatory Search + Filter + Download toolbar. */
export function TableCard({
  title, sub, search, onSearch, placeholder = 'Search…', filterOpen, onToggleFilter, filterCount = 0, filters, onDownload, actions, children, footer,
}: {
  title: string
  sub?: string
  search: string
  onSearch: (v: string) => void
  placeholder?: string
  filterOpen: boolean
  onToggleFilter: () => void
  filterCount?: number
  filters: ReactNode
  onDownload: () => void
  actions?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {sub && <p className="text-[12px] text-slate-500">{sub}</p>}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#0066FF]" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              aria-label="Search"
              className="h-9 w-[230px] rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-[#0066FF]"
            />
          </div>
          <button
            type="button"
            onClick={onToggleFilter}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold', filterOpen || filterCount ? 'border-[#0066FF] bg-[#EEF4FF] text-[#0066FF]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}
          >
            <Filter size={14} /> Filter{filterCount ? ` (${filterCount})` : ''}
          </button>
          <button type="button" onClick={onDownload} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
            <Download size={14} /> Download
          </button>
          {actions}
        </div>
      </div>
      {filterOpen && <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">{filters}</div>}
      <div className="scroll-thin overflow-x-auto">{children}</div>
      {footer}
    </section>
  )
}

export const th = 'whitespace-nowrap border-b border-[#D9E5F5] bg-[#EEF4FC] px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700'
export const td = 'whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-[12px] text-slate-700'

export function EmptyRow({ cols, text = 'No records match the current search / filter.' }: { cols: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-10 text-center text-[12px] text-slate-500">
        {text}
      </td>
    </tr>
  )
}

export function FilterSelect({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-[#0066FF]">
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px]', cls)}>
      {tone === 'info' ? <Info size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export type StepState = 'done' | 'current' | 'warn' | 'todo'
/** Horizontal workflow stepper (spec §5.5). */
export function Stepper({ steps }: { steps: { label: string; state: StepState; note?: string }[] }) {
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {steps.map((s, i) => (
        <li
          key={s.label}
          className={cn(
            'flex min-h-[74px] flex-col gap-1 rounded-lg border p-2.5',
            s.state === 'done' && 'border-emerald-200 bg-emerald-50/60',
            s.state === 'current' && 'border-[#60A5FA] bg-[#F8FAFF]',
            s.state === 'warn' && 'border-amber-200 bg-amber-50/70',
            s.state === 'todo' && 'border-slate-200 bg-white',
          )}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                s.state === 'done' ? 'bg-emerald-600 text-white' : s.state === 'warn' ? 'bg-amber-500 text-white' : s.state === 'current' ? 'bg-[#0066FF] text-white' : 'bg-slate-200 text-slate-600',
              )}
            >
              {s.state === 'done' ? <Check size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className="text-[11.5px] leading-tight font-semibold text-slate-800">{s.label}</span>
          </span>
          {s.note && <span className="text-[10.5px] leading-snug text-slate-500">{s.note}</span>}
        </li>
      ))}
    </ol>
  )
}

export function DetailGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[11px] font-semibold text-slate-500">{it.label}</dt>
          <dd className="mt-0.5 text-[13px] break-words text-slate-900">{it.value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function HistoryList({ items }: { items: { at: string; by: string; action: string; detail?: string }[] }) {
  if (!items.length) return <p className="text-[12px] text-slate-500">No history yet.</p>
  return (
    <ol className="space-y-2.5">
      {items.map((h, i) => (
        <li key={`${h.at}-${i}`} className="flex gap-3 text-[12px]">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0066FF]" />
          <div>
            <div className="font-semibold text-slate-800">{h.action}</div>
            <div className="text-slate-500">
              {new Date(h.at).toLocaleString('en-IN')} · {h.by}
            </div>
            {h.detail && <div className="mt-0.5 text-slate-600">{h.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function FormActions({ onBack, onDraft, onSubmit, disabled }: { onBack: () => void; onDraft: () => void; onSubmit: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <button type="button" onClick={onBack} className="inline-flex h-9.5 items-center rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
        Back
      </button>
      <button type="button" disabled={disabled} onClick={onDraft} className="inline-flex h-9.5 items-center rounded-lg border border-[#0066FF] bg-white px-4 text-[12px] font-semibold text-[#0066FF] hover:bg-[#EEF4FF] disabled:opacity-50">
        Save Draft
      </button>
      <button type="button" disabled={disabled} onClick={onSubmit} className="inline-flex h-9.5 items-center rounded-lg bg-[#0066FF] px-4 text-[12px] font-semibold text-white hover:bg-[#0052CC] disabled:opacity-50">
        Submit for Approval
      </button>
    </div>
  )
}

export const btnPrimary = 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 text-[12px] font-semibold text-white hover:bg-[#0052CC] disabled:cursor-not-allowed disabled:opacity-50'
export const btnOutline = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
export const btnDanger = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
export const linkBtn = 'font-semibold text-[#0066FF] hover:underline'
