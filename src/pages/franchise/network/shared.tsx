import type { ReactNode, SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Download, Filter, Home, Layers, RotateCcw, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { cn } from '@/lib/cn'

// Look & feel copied from FranchisePages.tsx (breadcrumb row, title + actions, filter card, table card).

export const TH = 'py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap'
export const TD = 'py-2.5 px-3 border-r border-slate-100 whitespace-nowrap'
export const TROW = 'border-b border-slate-100 hover:bg-blue-50/30 transition-colors'
export const BTN_SECONDARY = 'inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
export const BTN_PRIMARY = 'inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

export function Crumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
      <Home size={14} className="text-slate-400 shrink-0" />
      <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">Workspace</Link>
      <ChevronRight size={12} className="text-slate-400" />
      <Link to="/onboarding" className="hover:text-[#0066FF] transition-colors">Onboarding</Link>
      <ChevronRight size={12} className="text-slate-400" />
      <Link to="/franchise" className="hover:text-[#0066FF] transition-colors">Franchise Management</Link>
      {trail.map((t, i) => (
        <span key={`${t.label}-${i}`} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-400" />
          {t.to && i < trail.length - 1 ? (
            <Link to={t.to} className="hover:text-[#0066FF] transition-colors">{t.label}</Link>
          ) : (
            <span className={cn(i === trail.length - 1 && 'font-semibold text-slate-800')}>{t.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">{title}</h1>
        {sub && <p className="text-[13px] text-slate-500 mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

/** Filter card: search box + filter controls + Reset / Download (§22: every table has Search, Filter, Download). */
export function FilterCard({
  search, onSearch, placeholder, children, onReset, onDownload, cols = 4,
}: { search: string; onSearch: (v: string) => void; placeholder: string; children?: ReactNode; onReset: () => void; onDownload: () => void; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
          <Filter size={18} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
          <p className="text-[12px] text-slate-500">Search, filter and download the records below.</p>
        </div>
      </div>
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3.5', cols === 3 ? 'md:grid-cols-3' : cols === 5 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4')}>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>
        {children}
      </div>
      <div className="flex items-center justify-end gap-2.5 mt-4 pt-1">
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer">
          <RotateCcw size={14} /> Reset
        </button>
        <button type="button" onClick={onDownload} className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer">
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  )
}

/** Small filter select used inside FilterCard. */
export function FilterSelect({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8.5 pl-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
        >
          <option value="all">{all}</option>
          {[...new Set(options)].map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

/** Table card with header, total, page-size selector and pagination. */
export function TableCard({
  title, total, page, pageSize, onPage, onPageSize, children, noun = 'records', minWidth = 1000, action,
}: { title: string; total: number; page: number; pageSize: number; onPage: (p: number) => void; onPageSize: (n: number) => void; children: ReactNode; noun?: string; minWidth?: number; action?: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Layers size={16} />
          </div>
          <h2 className="text-[15px] font-bold text-slate-900 leading-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {action}
          <span className="text-[12px] text-slate-600 font-medium">Total Records: {total}</span>
        </div>
      </div>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-[11px] text-slate-700 border-collapse" style={{ minWidth }}>
          {children}
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPage={onPage} onPageSize={(n) => { onPageSize(n); onPage(1) }} noun={noun} />
    </div>
  )
}

export function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-left">
        {cols.map((c, i) => (
          <th key={`${c}-${i}`} className={TH}>{c}</th>
        ))}
      </tr>
    </thead>
  )
}

export function EmptyRow({ cols, text = 'No records match the filters.' }: { cols: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-10 text-center text-[12px] text-slate-400">{text}</td>
    </tr>
  )
}

/** Equal-size tabs (§22: tab size is the same everywhere; fewer tabs don't grow wider). */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={value === t}
          onClick={() => onChange(t)}
          className={cn(
            'h-9 w-[136px] shrink-0 truncate rounded-lg px-2 text-[12px] font-semibold transition-colors',
            value === t ? 'bg-[#0066FF] text-white' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

const box = 'h-9 w-full rounded-md border bg-white px-[11px] text-[12.5px] text-ink outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 disabled:bg-surface disabled:text-muted'

/** Select with value ≠ label (the shared SelectField only takes plain strings). */
export function PickField({
  label, required, error, hint, options, placeholder = 'Select', className, ...rest
}: { label: string; required?: boolean; error?: string; hint?: string; options: { value: string; label: string }[]; placeholder?: string; className?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      <label htmlFor={rest.id ?? rest.name} className="mb-1.5 block text-[11px] font-semibold text-ink">
        {label}
        {required && <span> *</span>}
      </label>
      <div className="relative">
        <select id={rest.id ?? rest.name} {...rest} className={cn(box, 'appearance-none pr-8', error ? 'border-brand-red' : 'border-line')}>
          <option value="">{placeholder}</option>
          {options.filter((o, i, a) => a.findIndex((x) => x.value === o.value) === i).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute top-2.5 right-2.5 text-muted" />
      </div>
      {error ? <p className="mt-1 text-[11px] text-brand-red">{error}</p> : hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  )
}

/** Read-only value block (system generated fields). */
export function ReadOnlyField({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold text-ink">{label}</div>
      <div className="flex h-9 items-center rounded-md border border-line bg-surface px-[11px] text-[12.5px] font-semibold text-ink">{value}</div>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

/** Compact Search + Filter + Download row for tables inside a profile tab (§22). */
export function MiniToolbar({
  title, search, onSearch, filter, onDownload, extra,
}: {
  title: string
  search: string
  onSearch: (v: string) => void
  filter?: { value: string; onChange: (v: string) => void; options: string[]; all: string }
  onDownload: () => void
  extra?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
      <h3 className="mr-auto text-[14px] font-bold text-slate-900">{title}</h3>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search" className="h-8 w-[180px] rounded-lg border border-slate-200 pl-7 pr-2 text-[12px] outline-none focus:border-[#0066FF]" />
      </div>
      {filter && (
        <select value={filter.value} onChange={(e) => filter.onChange(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-[#0066FF]">
          <option value="all">{filter.all}</option>
          {[...new Set(filter.options)].map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
      <button type="button" onClick={onDownload} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
        <Download size={13} /> Download
      </button>
      {extra}
    </div>
  )
}

/** Plain table body wrapper used inside profile tabs. */
export function Panel({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{children}</div>
}
export function PanelTable({ children, minWidth = 900 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full border-collapse text-[11px] text-slate-700" style={{ minWidth }}>{children}</table>
    </div>
  )
}
