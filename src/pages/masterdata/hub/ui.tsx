import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, Download, Home, Save, Search, Send, Sparkles } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

// ── Page shell: breadcrumb + title + back ────────────────────────────────
export function PageShell({ title, sub, actions, children, back = true }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode; back?: boolean }) {
  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/dashboard" className="hover:text-[#0066FF]">Workspace</Link>
        <ChevronRight size={12} className="text-slate-400" />
        {back ? (
          <>
            <Link to="/master-data" className="hover:text-[#0066FF]">Master Data</Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-800">{title}</span>
          </>
        ) : (
          <span className="font-semibold text-slate-800">Master Data</span>
        )}
      </div>
      {back && (
        <Link to="/master-data" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline">
          <ArrowLeft size={15} /> Back to Master Data
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-slate-900">{title}</h1>
          {sub && <p className="mt-1 text-[13px] text-slate-500">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

// ── Equal-size tabs (§22: tab size never grows when there are fewer tabs) ─
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div role="tablist" className="scroll-thin flex gap-2 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'flex h-10 w-[190px] shrink-0 items-center justify-between gap-2 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors',
            value === t.key ? 'border-[#0066FF] bg-[#F0F6FF] text-[#0052CC]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
          )}
        >
          <span className="truncate">{t.label}</span>
          {t.count != null && <span className={cn('rounded-md px-1.5 py-0.5 text-[11px]', value === t.key ? 'bg-[#0066FF] text-white' : 'bg-slate-100 text-slate-600')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ── Table toolbar: Search + Filter + Download (§22 standard pattern) ─────
export type Opt = string | { value: string; label: string }
export function FilterSelect({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: Opt[]; all?: string }) {
  return (
    <label className="block min-w-[150px]">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 bg-white pr-7 pl-2.5 text-[12px] text-slate-800 outline-none focus:border-[#0066FF]">
          <option value="all">{all}</option>
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value
            const l = typeof o === 'string' ? o : o.label
            return (
              <option key={v} value={v}>
                {l}
              </option>
            )
          })}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  )
}

export function TableBar({ search, onSearch, placeholder = 'Search…', children, onDownload, right }: { search: string; onSearch: (v: string) => void; placeholder?: string; children?: ReactNode; onDownload: () => void; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3">
      <label className="block min-w-[220px] flex-1 sm:max-w-[300px]">
        <span className="mb-1 block text-[11px] font-semibold text-slate-700">Search</span>
        <span className="relative block">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#0066FF]" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0066FF]" />
        </span>
      </label>
      {children}
      <div className="ml-auto flex items-center gap-2">
        {right}
        <button type="button" onClick={onDownload} className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50">
          <Download size={14} className="text-[#0066FF]" /> Download
        </button>
      </div>
    </div>
  )
}

// ── Data table with built-in pagination ─────────────────────────────────
export type Col<T> = { key: string; header: string; render: (row: T) => ReactNode; className?: string }
export function DataTable<T>({ rows, cols, rowKey, empty = 'No records match the filters.', noun = 'records', pageSize: initial = 10, toolbar }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; empty?: string; noun?: string; pageSize?: number; toolbar?: ReactNode }) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initial)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const cur = Math.min(page, pages)
  const visible = useMemo(() => rows.slice((cur - 1) * size, cur * size), [rows, cur, size])
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {toolbar}
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[12px]">
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={cn('px-3.5 py-2.5 whitespace-nowrap', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-4 py-10 text-center text-[12.5px] text-slate-500">
                  {empty}
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={rowKey(r)} className="hover:bg-slate-50/70">
                  {cols.map((c) => (
                    <td key={c.key} className={cn('px-3.5 py-2.5 align-top text-slate-700', c.className)}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100">
        <Pagination
          page={cur}
          pageSize={size}
          total={rows.length}
          onPage={setPage}
          onPageSize={(n) => {
            setSize(n)
            setPage(1)
          }}
          noun={noun}
        />
      </div>
    </section>
  )
}

// ── Form footer: Save Draft / Submit / Back (§22) ────────────────────────
export function FormActions({ onDraft, onSubmit, onBack, submitLabel = 'Submit', disabled }: { onDraft: () => void; onSubmit: () => void; onBack: () => void; submitLabel?: string; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
      <Button variant="secondary" type="button" onClick={onBack} icon={<ArrowLeft size={14} />}>
        Back
      </Button>
      <Button variant="secondary" type="button" onClick={onDraft} disabled={disabled} icon={<Save size={14} />}>
        Save Draft
      </Button>
      <Button type="button" onClick={onSubmit} disabled={disabled} icon={<Send size={14} />}>
        {submitLabel}
      </Button>
    </div>
  )
}

export function Panel({ title, sub, children, action, className }: { title: string; sub?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] leading-tight font-bold text-slate-900">{title}</h2>
          {sub && <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** One bordered strip of figures (no separate cards — §22). */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; tone?: 'red' | 'amber' | 'green' | 'blue' }[] }) {
  const tone = { red: 'text-red-600', amber: 'text-amber-600', green: 'text-emerald-600', blue: 'text-[#0066FF]' }
  return (
    <div className="grid grid-cols-2 divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-4 sm:divide-x lg:flex lg:divide-x">
      {items.map((i) => (
        <div key={i.label} className="min-w-0 flex-1 px-4 py-3">
          <div className="truncate text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{i.label}</div>
          <div className={cn('mt-1 text-[22px] font-bold text-slate-900', i.tone && tone[i.tone])}>{i.value}</div>
        </div>
      ))}
    </div>
  )
}

export function AiGuardNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
      <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <p>
        <b>AI never marks any work Approved or Completed by itself.</b> It only analyses data, identifies pendency and gives suggestions. The final status is updated only by the action and verification of the authorised user of the concerned department (§11.4).
      </p>
    </div>
  )
}

export function ReadOnlyNote({ text }: { text: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] text-slate-600">{text}</div>
}

// ── Form helpers ─────────────────────────────────────────────────────────
export function PickField({ label, required, value, onChange, options, error, placeholder = 'Select', disabled, hint }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string; placeholder?: string; disabled?: boolean; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-ink">
        {label}
        {required && ' *'}
      </span>
      <span className="relative block">
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn('h-9 w-full appearance-none rounded-md border bg-white px-[11px] pr-8 text-[12.5px] text-ink outline-none focus:border-primary disabled:bg-surface disabled:text-muted', error ? 'border-brand-red' : 'border-line')}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute top-2.5 right-2.5 text-muted" />
      </span>
      {error ? <span className="mt-1 block text-[11px] text-brand-red">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  )
}

/** Auto-fetched site details for an ATM ID (§9.3 / §22). */
export function SiteFetchBox({ site, frName, extra }: { site?: { siteId: string; atmId: string; projectId: string; frId: string; location: string; state: string }; frName: string; extra?: ReactNode }) {
  if (!site) return null
  return (
    <div className="grid gap-x-6 gap-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-[12px] sm:grid-cols-3">
      <div><span className="text-slate-500">Site ID</span><div className="font-semibold text-slate-900">{site.siteId}</div></div>
      <div><span className="text-slate-500">Project ID</span><div className="font-semibold text-slate-900">{site.projectId}</div></div>
      <div><span className="text-slate-500">Franchise</span><div className="font-semibold text-slate-900">{frName}</div></div>
      <div className="sm:col-span-2"><span className="text-slate-500">Location</span><div className="font-semibold text-slate-900">{site.location}</div></div>
      <div><span className="text-slate-500">State</span><div className="font-semibold text-slate-900">{site.state}</div></div>
      {extra}
    </div>
  )
}
