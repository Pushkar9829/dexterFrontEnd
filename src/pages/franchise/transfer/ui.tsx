// Small layout pieces shared by the transfer / exit pages (same look as FranchisePages.tsx).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, Download, Filter, Home, Layers, RotateCcw, Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Crumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
      <Home size={14} className="shrink-0 text-slate-400" />
      <Link to="/dashboard" className="transition-colors hover:text-[#0066FF]">Workspace</Link>
      <ChevronRight size={12} className="text-slate-400" />
      <Link to="/onboarding" className="transition-colors hover:text-[#0066FF]">Onboarding</Link>
      <ChevronRight size={12} className="text-slate-400" />
      <Link to="/franchise" className="transition-colors hover:text-[#0066FF]">Franchise Management</Link>
      {trail.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-400" />
          {c.to && i < trail.length - 1 ? (
            <Link to={c.to} className="transition-colors hover:text-[#0066FF]">{c.label}</Link>
          ) : (
            <span className="font-semibold text-slate-800">{c.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function PageTitle({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-slate-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export const btnOutline =
  'inline-flex h-9.5 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50'
export const btnPrimary =
  'inline-flex h-9.5 cursor-pointer items-center gap-2 rounded-lg bg-[#0066FF] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0052CC]'

/** Equal-size status tiles (tabs). */
export function StatusTiles<K extends string>({ tiles, value, onChange }: { tiles: { key: K; label: string; count: number; tone: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="tablist">
        {tiles.map((t) => {
          const active = value === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={cn(
                'flex h-[52px] cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3.5 text-left transition-all',
                active ? 'border-2 border-[#60A5FA] bg-[#F8FAFF] shadow-xs' : 'border border-slate-200 bg-white hover:border-[#93C5FD]',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', t.tone)} />
                <span className="truncate text-[13px] font-bold text-[#1E1B4B]">{t.label}</span>
              </span>
              <span className={cn('flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2 text-[13px] font-bold', active ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'border border-slate-200/40 bg-white text-[#1E1B4B] shadow-2xs')}>
                {t.count}
              </span>
            </button>
          )
        })}
    </div>
  )
}

export function FilterCard({ sub, children, onSearch, onReset, onDownload }: { sub: string; children: ReactNode; onSearch: () => void; onReset: () => void; onDownload: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-sm">
          <Filter size={18} />
        </div>
        <div>
          <h2 className="text-[15px] leading-tight font-bold text-slate-900">Filter</h2>
          <p className="text-[12px] text-slate-500">{sub}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">{children}</div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 pt-1">
        <button type="button" onClick={onSearch} className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 text-[12px] font-semibold text-white shadow-sm hover:bg-[#0052CC]">
          <Search size={14} /> Search
        </button>
        <button type="button" onClick={onReset} className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
          <RotateCcw size={14} /> Reset
        </button>
        <button type="button" onClick={onDownload} className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  )
}

const ctl = 'h-8.5 w-full appearance-none rounded-lg border border-slate-200 bg-white text-[12px] text-slate-800 outline-none focus:border-[#0066FF]'

export function FSearch({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#0066FF]" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(ctl, 'pr-3 pl-8 placeholder:text-slate-400')} />
      </div>
    </div>
  )
}
export function FSelect({ label, value, onChange, options, all }: { label: string; value: string; onChange: (v: string) => void; options: string[]; all: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(ctl, 'pr-7 pl-3')}>
          <option value="all">{all}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}
export function FDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cn(ctl, 'px-3')} />
    </div>
  )
}

export function TableCard({ title, total, children, footer }: { title: string; total: number; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-sm">
            <Layers size={16} />
          </div>
          <h2 className="text-[15px] leading-tight font-bold text-slate-900">{title}</h2>
        </div>
        <span className="text-[12px] font-medium text-slate-600">Total Records: {total}</span>
      </div>
      <div className="scroll-thin overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-slate-200">{footer}</div>}
    </div>
  )
}
export const thCls = 'border-r border-[#D9E5F5] px-3 py-2.5 whitespace-nowrap'
export const tdCls = 'border-r border-slate-100 px-3 py-2.5'
export const theadRow = 'border-b border-slate-200 bg-[#EEF4FC] text-center font-bold text-slate-800'
export const tbodyRow = 'border-b border-slate-100 text-center transition-colors hover:bg-blue-50/30'

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-10 text-center text-[12px] text-slate-500">{text}</td>
    </tr>
  )
}

/** Panel with a title row (used on form / detail pages). */
export function Panel({ title, sub, children, action, className }: { title: string; sub?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
          {sub && <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function InfoGrid({ items, cols = 3 }: { items: [string, ReactNode][]; cols?: 2 | 3 | 4 }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3', cols === 4 && 'lg:grid-cols-4')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-[12.5px] break-words text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Horizontal stage stepper. `current` = index of the stage awaiting action; `done` marks all complete. */
export function Stepper({ stages, current, done, failedAt }: { stages: readonly string[]; current: number; done?: boolean; failedAt?: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {stages.map((s, i) => {
        const complete = done || i < current
        const failed = failedAt === i
        const active = !done && i === current && !failed
        return (
          <li
            key={s}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11.5px] font-medium',
              complete && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              active && 'border-[#60A5FA] bg-[#F8FAFF] text-[#1D4ED8]',
              failed && 'border-red-200 bg-red-50 text-red-700',
              !complete && !active && !failed && 'border-slate-200 bg-white text-slate-500',
            )}
          >
            <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', complete ? 'bg-emerald-600 text-white' : failed ? 'bg-red-600 text-white' : active ? 'bg-[#0066FF] text-white' : 'bg-slate-100 text-slate-500')}>
              {complete ? <Check size={12} /> : i + 1}
            </span>
            <span className="leading-tight">{s}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function ActivityLog({ log }: { log: { at: string; by: string; text: string }[] }) {
  const rows = [...log].reverse()
  return (
    <ol className="space-y-3">
      {rows.map((l, i) => (
        <li key={`${l.at}-${i}`} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0066FF]" />
          <div className="min-w-0">
            <div className="text-[12.5px] text-slate-900">{l.text}</div>
            <div className="text-[11px] text-slate-500">
              {l.by} · {new Date(l.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </li>
      ))}
      {rows.length === 0 && <li className="text-[12px] text-slate-500">No activity yet.</li>}
    </ol>
  )
}

export function Check3({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn('flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px]', checked ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white', disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#0066FF]" />
      {label}
    </label>
  )
}
